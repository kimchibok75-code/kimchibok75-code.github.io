// 치복 타운 빙고 방 (Cloudflare Durable Object, 하나만 씀) — 2026-11-21 (OX 퀴즈 대신. 클래스 이름 Quiz 는 그대로)
// - 관리자가 열면 2분 모집 → 신청한 사람마다 5×5 숫자판(1~50 중 25개)을 만들어 둠 → 웹소켓으로 들어옴
// - 시작 뒤 BINGO.every초마다 숫자 하나씩 부름 (순서는 이 방만 앎). 화면은 내 판에서 그 숫자를 직접 눌러 지움 ({t:'mk', i})
// - '빙고!' ({t:'bingo'}): 지운 칸으로 한 줄이 되면 누른 순서대로 순위. 아니면 BINGO.penalty초 동안 못 누름
// - 보상은 끝난 뒤 각자 /api/bingo/claim 으로 받음 (여기서는 순위만 기억)
import { DurableObject } from 'cloudflare:workers';
import { BINGO, bingoCallAt, bingoLastAt, bingoLines, bingoNeed } from '../../assets/js/game-rules.js';

const now = () => Date.now();
const J = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
async function sha256(s) {   // index.js 와 같은 방식 (base64url)
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  return btoa(String.fromCharCode(...d)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const MW = BINGO.W * 32, MH = BINGO.H * 32;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const nums = () => shuffle(Array.from({ length: BINGO.max }, (_, i) => i + 1));

export class Quiz extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.r = undefined; }
  async load() { if (this.r === undefined) this.r = (await this.ctx.storage.get('r')) || null; return this.r; }
  async keep() { await this.ctx.storage.put('r', this.r); }
  ended(R, t) { return !!R.endAt && t >= R.endAt; }

  async fetch(req) {
    const url = new URL(req.url), p = url.pathname, t = now(), R = await this.load();
    await this.kick(R, t);
    if (p === '/force') {   // 관리자: 지금부터 2분 모집. 부를 숫자 순서는 여기서 정해 둠
      if (R && !R.done) return J({ error: '이미 빙고가 진행 중이에요' }, 400);
      const b = await req.json().catch(() => ({}));
      this.r = { start: t + BINGO.recruit, need: bingoNeed(b.need), seq: nums().slice(0, BINGO.maxCalls), host: b.host || null, players: {}, ci: -1, wins: [], endAt: 0, done: false };
      await this.keep(); await this.ctx.storage.setAlarm(this.r.start);
      return J({ start: this.r.start, need: this.r.need });
    }
    if (p === '/state') return J({ need: bingoNeed(R?.need), open: R && !R.done && t < R.start ? R.start : 0, joined: R && t < R.start ? Object.keys(R.players).length : 0, run: R && !R.done ? R.start : 0, last: R?.done ? R.start : 0 });
    if (p === '/join') {
      const b = await req.json();
      if (!R || R.done || b.start !== R.start || t >= R.start) return J({ error: '빙고 모집 시간이 아니에요' }, 400);
      if (!R.players[b.uid] && Object.keys(R.players).length >= BINGO.cap) return J({ error: '이번 빙고는 자리가 꽉 찼어요' }, 400);
      if (!R.players[b.uid]) {
        R.rv = (R.rv || 0) + 1;
        R.players[b.uid] = { n: b.nick, look: b.look, x: Math.round(MW * (.2 + Math.random() * .6)), y: Math.round(MH * (.84 + Math.random() * .08)), at: 0, b: nums().slice(0, 25), m: 0, rank: 0, pen: 0 };
      }
      await this.keep();
      return J({ start: R.start, n: Object.keys(R.players).length });
    }
    if (p === '/result') {   // 보상 받기 전 확인 (받았는지는 캐릭터의 life.bgGot 이 지킴)
      const st = Number(url.searchParams.get('start')), uid = Number(url.searchParams.get('uid'));
      if (!R || R.start !== st) return J({ error: '빙고 기록이 없어요' }, 404);
      if (!R.done) return J({ error: '빙고가 아직 끝나지 않았어요' }, 400);
      const me = R.players[uid]; if (!me) return J({ error: '이 빙고에 참여하지 않았어요' }, 404);
      return J({ need: bingoNeed(R.need), rank: me.rank, lines: bingoLines(me.m), n: Object.keys(R.players).length, wins: R.wins.length, calls: R.ci + 1 });
    }
    if (p === '/ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426 });
      const [client, server] = Object.values(new WebSocketPair());
      this.ctx.acceptWebSocket(server); server.serializeAttachment({ pending: true, at: t });
      return new Response(null, { status: 101, webSocket: client });
    }
    return J({ error: 'not found' }, 404);
  }

  send(ws, o) { try { ws.send(JSON.stringify(o)); } catch {} }
  all(o) { const s = JSON.stringify(o); for (const w of this.ctx.getWebSockets()) { const a = w.deserializeAttachment(); if (a?.uid) try { w.send(s); } catch {} } }
  calls(R) { return R.seq.slice(0, R.ci + 1); }
  pub(R, full) { return { start: R.start, host: full ? R.host : undefined, ps: Object.entries(R.players).map(([id, p]) => full ? { id: +id, n: p.n, look: p.look, x: p.x, y: p.y, rank: p.rank } : [+id, p.x, p.y, p.rank]) }; }
  tell(R, t) { const full = R.rv && R.rv !== R.rvSent; if (full) R.rvSent = R.rv; this.all({ t: 's', ...this.pub(R, full), full: full ? 1 : 0, now: t }); R.bAt = t; }

  async webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > 200) return;
    let m; try { m = JSON.parse(msg); } catch { return; }
    const a = ws.deserializeAttachment() || {}, R = await this.load(), t = now();
    await this.kick(R, t);
    if (a.pending) {   // 첫 메시지 {t:'auth', token}: 로그인 확인 + 참가자인지
      if (m.t !== 'auth' || !/^[\w-]{20,}$/.test(String(m.token || ''))) return ws.close(4401, 'auth');
      const u = await this.env.DB.prepare('SELECT u.id FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?').bind(await sha256(m.token), t).first();
      if (!u || !R || !R.players[u.id] || R.done) { this.send(ws, { t: 'gone' }); return ws.close(4403, 'not in bingo'); }
      for (const w of this.ctx.getWebSockets()) if (w !== ws && w.deserializeAttachment()?.uid === u.id) try { w.close(4002, 'dup'); } catch {}
      ws.serializeAttachment({ uid: u.id }); R.rvSent = 0;
      const P = R.players[u.id];
      return this.send(ws, { t: 'hi', id: u.id, need: bingoNeed(R.need), mpen: P.mpen || 0, ...this.pub(R, true), board: P.b, m: P.m, rank: P.rank, pen: P.pen, calls: this.calls(R), wins: R.wins, endAt: R.endAt, now: t });
    }
    if (!a.uid || !R || R.done) return;
    const P = R.players[a.uid]; if (!P) return;
    if (m.t === 'p' && Number.isFinite(m.x) && Number.isFinite(m.y)) {   // 내 자리 (다른 사람 화면에 보이게만. 놀이에는 상관없음)
      if (P.at && t - P.at < 150) return;
      P.x = Math.max(0, Math.min(MW, Math.round(m.x))); P.y = Math.max(0, Math.min(MH, Math.round(m.y))); P.at = t;
      if (t - (R.bAt || 0) > 500) this.tell(R, t);
      return;
    }
    if (m.t === 'mk' && Number.isInteger(m.i) && m.i >= 0 && m.i < 25) {   // 칸 지우기: 이미 부른 숫자만
      if (this.ended(R, t) || P.mpen > t) return;
      if (!this.calls(R).includes(P.b[m.i])) { P.mpen = t + BINGO.markPen * 1000; R.dirty = true; return this.send(ws, { t: 'mx', pen: P.mpen, now: t }); }   // 안 나온 숫자 → 1초 못 누름
      P.m |= 1 << m.i; R.dirty = true;
      return;
    }
    if (m.t === 'bingo') {
      if (P.rank || this.ended(R, t) || R.ci < 0) return;
      if (P.pen > t) return this.send(ws, { t: 'no', pen: P.pen, now: t });
      if (bingoLines(P.m) < bingoNeed(R.need)) { P.pen = t + BINGO.penalty * 1000; await this.keep(); return this.send(ws, { t: 'no', pen: P.pen, now: t }); }
      P.rank = R.wins.length + 1;
      const w = { id: a.uid, n: P.n, r: P.rank, at: t - bingoCallAt(R.start, 0) };
      R.wins.push(w);
      if (R.wins.length >= Object.keys(R.players).length && !R.endAt) R.endAt = t + BINGO.outro * 1000;   // 모두 빙고 → 끝
      await this.keep();
      this.all({ t: 'win', ...w, endAt: R.endAt, now: t });
      if (R.endAt) await this.ctx.storage.setAlarm(Math.min(R.endAt, t + 500));
    }
  }
  async webSocketClose(ws) { try { ws.close(); } catch {} }
  // 진행 타이머(alarm)가 끊겼으면 다시 켬 (서버를 다시 배포하거나 다시 시작했을 때)
  async kick(R, t) {
    if (!R || R.done || t < R.start) return;
    const al = await this.ctx.storage.getAlarm();
    if (!al) await this.ctx.storage.setAlarm(t + 50);
    else if (al < t - 2000) await this.alarm();   // 걸려 있는데 2초 넘게 안 울렸으면 여기서 직접 진행
  }

  // 시작 시각부터 0.5초마다: 숫자 부르기 · 위치 알림 · 끝
  async alarm() {
    const R = await this.load(), t = now(); if (!R || R.done) return;
    if (t < R.start - 50) return this.ctx.storage.setAlarm(R.start);
    if (!Object.keys(R.players).length) { R.done = true; return this.keep(); }
    let changed = R.dirty; R.dirty = false;
    while (!R.endAt && R.ci + 1 < R.seq.length && t >= bingoCallAt(R.start, R.ci + 1)) {
      R.ci++; changed = true;
      this.all({ t: 'c', i: R.ci, v: R.seq[R.ci], now: t });
    }
    if (!R.endAt && t >= bingoLastAt(R.start)) { R.endAt = t + BINGO.outro * 1000; changed = true; this.all({ t: 'last', endAt: R.endAt, now: t }); }   // 숫자를 다 부름
    if (R.endAt && t >= R.endAt) { R.done = true; await this.keep(); this.all({ t: 'end', now: t }); return; }
    this.tell(R, t);
    if (changed) await this.keep();
    await this.ctx.storage.setAlarm(t + 500);
  }
}
