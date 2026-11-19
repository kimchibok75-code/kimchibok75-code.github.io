// 치복 타운 레이드 방 (Cloudflare Durable Object, 하나만 씀)
// - 30분마다 2분 모집 (정각 = 레드 드래곤, 30분 = 오우거) → 신청한 사람만 웹소켓으로 들어옴 → 1초마다 보스 체력·모두의 위치를 알려 줌
// - 보스는 무조건 잡힘: 1초마다 최대 체력의 1/RAID.drain 만큼 저절로 깎임 + 참가자가 보낸 피해 (초당 피해로 막음)
// - 보상은 끝난 뒤 각자 /api/raid/claim 으로 받음 (여기서는 누가 얼마나 때렸는지만 기억)
import { DurableObject } from 'cloudflare:workers';
import { RAID, RAID_BOSS, isHourlyRaid, raidBossOf } from '../../assets/js/game-rules.js';

const now = () => Date.now();
const J = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
async function sha256(s) {   // index.js 와 같은 방식 (base64url)
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  return btoa(String.fromCharCode(...d)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export class Raid extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.r = undefined; }
  async load() { if (this.r === undefined) this.r = (await this.ctx.storage.get('r')) || null; return this.r; }
  async keep() { await this.ctx.storage.put('r', this.r); }
  // 지금 들어갈 수 있는 레이드의 시작 시각 (매시 정각 + 관리자가 연 것)
  open(r, t) {
    const hourly = Math.floor(t / RAID.every) * RAID.every + RAID.recruit;
    if (t < hourly) return hourly;
    if (r?.forced && t < r.start && t >= r.start - RAID.recruit) return r.start;
    return 0;
  }

  async fetch(req) {
    const url = new URL(req.url), p = url.pathname, t = now(), r = await this.load();
    if (p === '/force') {   // 관리자: 지금부터 모집 (보스를 고를 수 있음)
      if (r && !r.done && r.start > t - RAID.max) return J({ error: '이미 레이드가 진행 중이에요' }, 400);
      let fb = 'rdragon'; try { const q = await req.json(); if (RAID_BOSS[q?.boss]) fb = q.boss; } catch {}
      this.r = { start: t + RAID.recruit, boss: fb, forced: true, players: {}, hp: 0, max: 0, done: false, endAt: 0, last: 0 };
      await this.keep(); await this.ctx.storage.setAlarm(this.r.start);
      return J({ start: this.r.start, boss: fb });
    }
    if (p === '/join') {
      const b = await req.json(), st = this.open(r, t);
      if (!st || b.start !== st) return J({ error: '레이드 모집 시간이 아니에요' }, 400);
      if (!r || r.start !== st) this.r = { start: st, boss: raidBossOf(st), forced: !isHourlyRaid(st), players: {}, hp: 0, max: 0, done: false, endAt: 0, last: 0 };
      const R = this.r;
      if (!R.players[b.uid] && Object.keys(R.players).length >= RAID.cap) return J({ error: '이번 레이드는 자리가 꽉 찼어요' }, 400);
      R.players[b.uid] = { n: b.nick, look: b.look, dps: b.dps, maxHp: b.maxHp, lv: b.lv, dmg: 0, dead: false, x: (RAID.W / 2 + (Math.random() - .5) * 8) * 32, y: (RAID.H - 3) * 32, at: 0, claimed: false };
      await this.keep(); await this.ctx.storage.setAlarm(st);
      return J({ start: st, n: Object.keys(R.players).length, boss: R.boss });
    }
    if (p === '/state') {   // 지금 모집 중인 레이드 (화면이 정각 창을 띄울 때 확인)
      const st = this.open(r, t);
      const ob = st ? (r?.start === st ? r.boss : raidBossOf(st)) : '';   // 모집 중인 레이드의 보스
      return J({ open: st, boss: ob, joined: st && r?.start === st ? Object.keys(r.players).length : 0, run: r && !r.done ? r.start : 0, rboss: r?.boss || 'rdragon', last: r?.done ? r.start : 0 });   // run = 진행 중인 레이드 (새로고침하면 다시 들어감)
    }
    if (p === '/result') {   // 보상 받기 전 확인 (한 번만)
      const st = Number(url.searchParams.get('start')), uid = Number(url.searchParams.get('uid'));
      if (!r || r.start !== st) return J({ error: '레이드 기록이 없어요' }, 404);
      if (!r.done) return J({ error: '레이드가 아직 끝나지 않았어요' }, 400);
      const me = r.players[uid]; if (!me) return J({ error: '이 레이드에 참여하지 않았어요' }, 404);
      // 2026-11-20 여기서 '받음'을 적지 않음: 캐릭터 저장이 겹쳐 다시 시도하면 '이미 받았어요'로 보상이 사라졌음. 한 번만 받기는 캐릭터의 life.raidGot(저장할 때 ver 확인)이 지킴
      const list = Object.values(r.players), total = list.reduce((a, b) => a + b.dmg, 0) || 1;
      return J({ dead: me.dead, dmg: Math.round(me.dmg), share: me.dmg / total, n: list.length, rank: 1 + list.filter(o => o.dmg > me.dmg).length, boss: r.boss });
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
  pub(R, full) { return { start: R.start, boss: R.boss, hp: Math.max(0, Math.round(R.hp)), max: R.max, done: R.done, ps: Object.entries(R.players).map(([id, p]) => full ? { id: +id, n: p.n, look: p.look, x: Math.round(p.x), y: Math.round(p.y), dead: p.dead } : [+id, Math.round(p.x), Math.round(p.y), p.dead ? 1 : 0]) }; }   // full: 겉모습까지 (처음 한 번)

  async webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > 300) return;
    let m; try { m = JSON.parse(msg); } catch { return; }
    const a = ws.deserializeAttachment() || {}, R = await this.load(), t = now();
    if (a.pending) {   // 첫 메시지 {t:'auth', token}: 로그인 확인 + 이 레이드 참가자인지
      if (m.t !== 'auth' || !/^[\w-]{20,}$/.test(String(m.token || ''))) return ws.close(4401, 'auth');
      const u = await this.env.DB.prepare('SELECT u.id FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?').bind(await sha256(m.token), t).first();
      if (!u || !R || !R.players[u.id] || R.done) { this.send(ws, { t: 'gone' }); return ws.close(4403, 'not in raid'); }
      for (const w of this.ctx.getWebSockets()) if (w !== ws && w.deserializeAttachment()?.uid === u.id) try { w.close(4002, 'dup'); } catch {}
      ws.serializeAttachment({ uid: u.id });
      return this.send(ws, { t: 'hi', id: u.id, ...this.pub(R, true), now: t });
    }
    if (!a.uid || !R || R.done) return;
    const P = R.players[a.uid]; if (!P) return;
    if (m.t === 'p') {   // 내 위치 + 지난번 뒤로 준 피해 + 쓰러짐
      if (Number.isFinite(m.x) && Number.isFinite(m.y)) { P.x = Math.max(0, Math.min(RAID.W * 32, m.x)); P.y = Math.max(0, Math.min(RAID.H * 32, m.y)); }
      if (m.dead) P.dead = true;
      // 2026-11-20 화면은 1초마다 보고. 0.7초 안에 또 온 보고는 피해를 안 셈 (예전엔 메시지마다 최소 0.2초어치 한도를 줘서 빨리 보내면 피해가 부풀었음)
      if (P.at && t - P.at < 700) return;
      if (t >= R.start && !P.dead && Number.isFinite(m.d) && m.d > 0) {
        const sec = Math.min(3, Math.max(0, (t - (P.at || R.start)) / 1000));
        // 스킬은 한 번에 크게 들어가니까, 안 쓴 한도를 8초어치까지 모아 둠
        const allow = P.dps * 2.5 * sec + (P.spare || 0), d = Math.min(m.d, allow); P.spare = Math.min(P.dps * 8, allow - d); P.dmg += d; R.hp -= d;
      }
      P.at = t;
    }
  }
  async webSocketClose(ws) { try { ws.close(); } catch {} }

  // 시작 시각에 한 번 → 그 뒤 1초마다: 보스 체력 깎기 · 모두에게 상황 알림 · 끝나면 멈춤
  async alarm() {
    const R = await this.load(), t = now(); if (!R || R.done) return;
    if (t < R.start - 50) return this.ctx.storage.setAlarm(R.start);
    if (!R.max) {   // 시작: 보스 체력 = 참가자 초당 피해 합 × hpSec
      const list = Object.values(R.players);
      if (!list.length) { R.done = true; R.endAt = t; return this.keep(); }
      R.max = R.hp = Math.round(list.reduce((a, p) => a + p.dps, 0) * RAID.hpSec); R.last = t;
    }
    R.hp -= R.max / RAID.drain * Math.min(3, (t - R.last) / 1000); R.last = t;
    if (R.hp <= 0 || t >= R.start + RAID.max) { R.hp = 0; R.done = true; R.endAt = t; await this.keep(); this.all({ t: 'end', ...this.pub(R) }); return; }
    this.all({ t: 's', ...this.pub(R), now: t });
    if ((t - R.start) % 10e3 < 1000) await this.keep();   // 10초마다 저장 (방이 잠깐 내려가도 이어지게)
    await this.ctx.storage.setAlarm(t + 1000);
  }
}
