// 치복 타운 실시간 방 (Cloudflare Durable Object). 마을 채널 하나 = 방 하나, 최대 50명
// - 위치는 "어디서 어디로 걷기 시작"만 주고받음 (길은 각자 화면이 똑같이 계산) → 메시지가 아주 적음
// - 채팅 규칙(기획서 8-1)은 여기서 검사. 금칙어 목록은 서버에만 있음
import { DurableObject } from 'cloudflare:workers';
import { cleanChat } from './chat.js';
import { T, MW, MH } from '../../assets/js/game-rules.js';

export const MAX_CH = 3;              // 마을 채널 수 (채널마다 50명)
const MAX = 50, NEAR = 9 * T, DAY = 864e5;
const RATE = { cap: 12, per: 6 };     // 한 연결에서 1초에 6개(순간 12개)까지만. 넘으면 끊음 (도배·과부하 방지)
const CHAT_DAY = 1500;                // 한 사람이 하루에 보낼 수 있는 채팅 수 (DB 쓰기 한도 지키기)
const EMOTES = ['👋', '❤️', '😂', '🎉', '💤', '❓', '✨'];
const now = () => Date.now();
const left = ms => ms >= 3600e3 ? `${Math.floor(ms / 3600e3)}시간 ${Math.ceil(ms % 3600e3 / 60e3)}분` : ms >= 60e3 ? `${Math.ceil(ms / 60e3)}분` : `${Math.ceil(ms / 1000)}초`;
async function sha256(s) {   // index.js 와 같은 방식 (base64url)
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  return btoa(String.fromCharCode(...d)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// 다른 사람에게 보이는 겉모습
export const lookRow = r => ({ lv: r.lv, title: r.title, intro: r.intro, face: r.face, body: r.body, eyes: r.eyes, hat: r.hat, hair: r.hair || 'none', hairC: r.hair_c, cls: r.cls || 'sword', enh: JSON.parse(r.enh || '{}'), equip: (e => ('weapon' in e ? {} : e))(JSON.parse(r.equip || '{}')) });
// 모든 채널에 알리기 (관리자: 공지·내보내기·채팅 금지 등). skip = 지금 방(자기 자신은 부르지 않음)
export async function toRooms(env, body, skip) {
  await Promise.all(Array.from({ length: MAX_CH }, (_, i) => i + 1).filter(ch => ch !== skip).map(ch =>
    env.TOWN.get(env.TOWN.idFromName('town-' + ch)).fetch('https://town/admin', { method: 'POST', body: JSON.stringify(body) }).catch(() => {})));
}

export class Town extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));   // 연결 유지용 (방을 깨우지 않음)
    this.cache = new Map(); this.rate = new Map(); this.talk = new Map();   // 연결 정보 캐시 · 메시지 속도 · 사람별 채팅 기록 (다시 접속해도 이어짐)
  }
  info(ws) { let a = this.cache.get(ws); if (!a) { a = ws.deserializeAttachment() || {}; this.cache.set(ws, a); } return a; }
  save(ws, a) { this.cache.set(ws, a); ws.serializeAttachment(a); }
  // 로그인 안 한 채 10초 넘게 붙어 있는 연결은 끊음
  sweep() { const t = now(); for (const w of this.ctx.getWebSockets()) { const a = this.info(w); if (a.pending && t - (a.at || 0) > 10e3) { a.pending = false; a.gone = true; this.save(w, a); try { w.close(4401, 'auth'); } catch {} } } }
  async alarm() { this.sweep(); if (this.ctx.getWebSockets().some(w => this.info(w).pending)) await this.ctx.storage.setAlarm(now() + 15e3); }
  // 사람별 채팅 기록 (sent: 최근 10초, last: 최근 3개, cool: 쉬는 시간 끝, day/n: 오늘 보낸 수)
  talkOf(id) { let k = this.talk.get(id); if (!k) { k = { sent: [], last: [], cool: 0, day: '', n: 0 }; this.talk.set(id, k); if (this.talk.size > 500) this.talk.delete(this.talk.keys().next().value); } return k; }
  members(except) { return this.ctx.getWebSockets().filter(w => w !== except && this.info(w).id && !this.info(w).gone); }
  pub(a) { return { id: a.id, n: a.n, adm: a.adm, ...a.look, x: a.x, y: a.y, tx: a.tx, ty: a.ty, hunt: a.hunt, sit: a.sit ?? -1, room: a.room2 || 0 }; }
  send(ws, o) { try { ws.send(JSON.stringify(o)); } catch {} }
  all(o, except) { const s = JSON.stringify(o); for (const w of this.members(except)) try { w.send(s); } catch {} }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/admin') return this.admin(await req.json());
    if (url.pathname === '/has') {   // 다른 채널에서 물어봄: 이 사람이 여기 접속해 있나? (어느 기기인지)
      const id = Number(url.searchParams.get('id')), w = this.members().find(w => this.info(w).id === id);
      return Response.json(w ? { dev: this.info(w).dev, kind: this.info(w).kind } : null);
    }
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    this.sweep(); if (this.ctx.getWebSockets().length > MAX + 30) return new Response('busy', { status: 503 });
    this.ctx.acceptWebSocket(server);
    this.save(server, { pending: true, room: Math.min(MAX_CH, Math.max(1, Number(url.searchParams.get('ch')) | 0 || 1)), at: now() });   // 첫 메시지로 로그인 확인
    if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(now() + 15e3);
    return new Response(null, { status: 101, webSocket: client });
  }

  // 첫 메시지 {t:'auth', token}: 로그인 확인 → 방에 들어감
  async join(ws, a, token, m = {}) {
    const DB = this.env.DB;
    if (!/^[\w-]{20,}$/.test(String(token || ''))) return ws.close(4401, 'auth');
    const u = await DB.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?').bind(await sha256(token), now()).first();
    if (!u || u.banned) { this.send(ws, { t: 'bye', why: u ? '이용이 정지된 계정이에요' : '로그인이 끝났어요' }); return ws.close(4401, 'auth'); }
    const c = await DB.prepare('SELECT * FROM characters WHERE user_id = ?').bind(u.id).first();
    if (!c) return ws.close(4401, 'auth');
    const rep = await DB.prepare('SELECT COUNT(DISTINCT reporter_id) AS n FROM reports WHERE target_id = ? AND done = 0').bind(u.id).first();
    // 같은 사람이 이미 접속해 있으면: 같은 기기(새로고침 등)는 바로 바꿔 줌, 다른 기기는 먼저 물어봄 (take: "여기서 이어서 하기"를 누름)
    const dev = String(m.dev || '').slice(0, 40), kind = m.kind === 'mobile' ? 'mobile' : 'pc';
    const here = this.members(ws).map(w => this.info(w)).find(b => b.id === u.id), far = here ? null : await this.elsewhere(u.id, a.room), old = here || far;
    if (old && old.dev !== dev && !m.take) { this.send(ws, { t: 'busy', kind: old.kind || 'pc' }); return ws.close(4009, 'busy'); }
    if (far) await toRooms(this.env, { act: 'dup', id: u.id }, a.room);
    for (const w of this.members(ws)) { const b = this.info(w); if (b.id === u.id) { b.gone = true; b.dup = true; this.save(w, b); this.send(w, { t: 'dup' }); try { w.close(4002, 'dup'); } catch {} this.all({ t: 'leave', id: u.id }, w); } }
    const others = this.members(ws);
    if (others.length >= MAX) { this.send(ws, { t: 'full' }); return ws.close(4001, 'full'); }
    Object.assign(a, { pending: false, dev, kind, id: u.id, n: u.nick, adm: !!u.is_admin, joined: u.created_at, mute: u.mute_until || 0, limited: (rep?.n || 0) >= 3,
      look: lookRow(c), x: c.x, y: c.y, tx: c.x, ty: c.y, hunt: !!c.hunt, sit: -1, room2: 0, sent: [], last: [], cool: 0, lookAt: 0, emoAt: 0, houseAt: 0 });
    this.save(ws, a);
    this.send(ws, { t: 'hi', id: a.id, ch: a.room, list: others.map(w => this.pub(this.info(w))) });
    this.all({ t: 'join', p: this.pub(a) }, ws);
  }

  async webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > 600) return;
    let m; try { m = JSON.parse(msg); } catch { return; }
    const t0 = now(), r = this.rate.get(ws) || { tok: RATE.cap, at: t0 };
    r.tok = Math.min(RATE.cap, r.tok + (t0 - r.at) / 1000 * RATE.per); r.at = t0; r.tok -= 1; this.rate.set(ws, r);
    if (r.tok < 0) { try { ws.close(4008, 'too fast'); } catch {} return this.webSocketClose(ws); }
    const a = this.info(ws);
    if (a.pending) return m.t === 'auth' ? this.join(ws, a, m.token, m) : ws.close(4401, 'auth');
    if (!a.id || a.gone) return;
    const t = now(), num = (v, max) => Number.isFinite(v) && v >= 0 && v <= max;
    if (m.t === 'go') {   // 걷기 시작 (x,y → tx,ty). 순간 이동은 tx=x
      if (![m.x, m.tx].every(v => num(v, MW * T)) || ![m.y, m.ty].every(v => num(v, MH * T))) return;
      Object.assign(a, { x: m.x, y: m.y, tx: m.tx, ty: m.ty, sit: -1 }); this.save(ws, a);
      return this.all({ t: 'go', id: a.id, x: m.x, y: m.y, tx: m.tx, ty: m.ty }, ws);
    }
    if (m.t === 'sit') {   // 벤치에 앉기 (b = 벤치 번호 0~7, -1 = 일어남)
      const b = Number.isInteger(m.b) && m.b >= -1 && m.b < 8 ? m.b : -1;
      if (b >= 0 && this.members(ws).some(w => { const o = this.info(w); return o.id !== a.id && o.sit === b; })) return;   // 이미 누가 앉아 있음
      a.sit = b; this.save(ws, a); return this.all({ t: 'sit', id: a.id, b }, ws);
    }
    // 집 안에 들어감 (r = 집 주인 id, 0 = 마을). 같은 방에 있는 사람끼리만 보임
    if (m.t === 'room') {
      if (!num(m.x, MW * T) || !num(m.y, MH * T)) return;
      const r = Number.isInteger(m.r) && m.r >= 0 && m.r < 1e9 ? m.r : 0; Object.assign(a, { room2: r, sit: -1, x: m.x | 0, y: m.y | 0, tx: m.x | 0, ty: m.y | 0 }); this.save(ws, a); return this.all({ t: 'room', id: a.id, r, x: a.x, y: a.y }, ws);
    }
    if (m.t === 'hunt') { a.hunt = !!m.on; a.sit = -1; this.save(ws, a); return this.all({ t: 'hunt', id: a.id, on: a.hunt }, ws); }
    if (m.t === 'emo') { if (!EMOTES.includes(m.e) || t - a.emoAt < 800) return; a.emoAt = t; this.save(ws, a); return this.all({ t: 'emo', id: a.id, e: m.e }, ws); }
    if (m.t === 'look') {   // 겉모습·레벨이 바뀜 → 저장된 값을 다시 읽어서 알림
      if (t - a.lookAt < 1500) return; a.lookAt = t;
      const c = await this.env.DB.prepare('SELECT * FROM characters WHERE user_id = ?').bind(a.id).first(); if (!c) return;
      const b = this.info(ws); b.look = lookRow(c); b.lookAt = t; this.save(ws, b);
      return this.all({ t: 'look', p: this.pub(b) }, ws);
    }
    if (m.t === 'say') return this.say(ws, a, m);
  }
  async webSocketClose(ws) {
    const a = this.info(ws); this.rate.delete(ws);
    if (a.id && !a.dup) this.all({ t: 'leave', id: a.id }, ws);
    a.gone = true; this.save(ws, a); this.cache.delete(ws);
    try { ws.close(); } catch {}
  }
  async webSocketError(ws) { return this.webSocketClose(ws); }

  // ───── 채팅 ─────
  async say(ws, a, m) {
    const t = now(), ch = 'all', no = why => this.send(ws, { t: 'nope', why });
    const raw = String(m.text || '');
    if (raw.startsWith('/') && a.adm) return this.command(ws, a, raw);
    if (a.mute > t) return no(`채팅 금지 중이에요 (남은 시간 ${left(a.mute - t)})`);
    const k = this.talkOf(a.id), day = new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
    if (k.day !== day) { k.day = day; k.n = 0; }
    if (k.cool > t) return no(`잠깐 쉬어 가요. ${Math.ceil((k.cool - t) / 1000)}초 뒤에 다시 말할 수 있어요`);
    if (k.n >= CHAT_DAY) return no('오늘은 채팅을 너무 많이 했어요. 내일 다시 이야기해요');
    k.sent = k.sent.filter(x => t - x < 10e3);
    if (k.sent.length && t - k.sent[k.sent.length - 1] < 1000) return no('천천히 말해 주세요 (1초에 1번)');
    if (k.sent.length >= 5) { k.cool = t + 30e3; k.sent = []; return no('10초 안에 너무 많이 보냈어요. 30초 동안 채팅을 쉬어요 (도배 방지)'); }
    if (t - a.joined < 300e3) return no(`가입하고 5분이 지나면 채팅할 수 있어요 (남은 시간 ${left(300e3 - (t - a.joined))})`);
    if (a.limited) return no('신고가 여러 번 들어와서, 김치복님이 확인할 때까지 채팅을 할 수 없어요');
    const r = cleanChat(raw);
    if (!r.ok) return r.warn ? this.warn(ws, a, r.why) : r.why && no(r.why);
    if (k.last.length >= 2 && k.last.slice(-2).every(x => x === r.text)) return no('같은 말을 3번 연속 보낼 수 없어요');
    k.last = [...k.last, r.text].slice(-3); k.sent.push(t); k.n++;
    const out = JSON.stringify({ t: 'say', id: a.id, n: a.n, adm: a.adm ? 1 : 0, text: r.text, ch });
    for (const w of this.members()) {
      try { w.send(out); } catch {}
    }
    if (r.notes.length) this.send(ws, { t: 'note', notes: r.notes });
    const DB = this.env.DB;
    await DB.prepare('INSERT INTO chat_log (user_id, nick, ch, text, at) VALUES (?, ?, ?, ?, ?)').bind(a.id, a.n, ch, r.text, t).run();
    if (Math.random() < .02)   // 채팅 기록은 30일 보관 (처리 안 된 신고 대상은 남겨 둠)
      await DB.prepare('DELETE FROM chat_log WHERE at < ? AND user_id NOT IN (SELECT target_id FROM reports WHERE done = 0)').bind(t - 30 * DAY).run();
  }
  // 아주 심한 말: 안 보내지고 경고. 7일 안 경고 3번 → 10분, 6번 → 1시간, 9번 → 24시간 채팅 금지
  async warn(ws, a, why) {
    const t = now(), DB = this.env.DB;
    await DB.prepare('INSERT INTO warnings (user_id, reason, at) VALUES (?, ?, ?)').bind(a.id, 'chat', t).run();
    const n = (await DB.prepare('SELECT COUNT(*) AS n FROM warnings WHERE user_id = ? AND at > ?').bind(a.id, t - 7 * DAY).first())?.n || 1;
    let extra = `경고 ${(n - 1) % 3 + 1}/3`;
    if (n % 3 === 0) {
      const min = n >= 9 ? 1440 : n >= 6 ? 60 : 10, b = this.info(ws); b.mute = t + min * 60e3; this.save(ws, b);
      await DB.prepare('UPDATE users SET mute_until = ? WHERE id = ?').bind(b.mute, a.id).run();
      extra = `경고 3번: ${left(min * 60e3)} 동안 채팅 금지`;
    }
    this.send(ws, { t: 'nope', why: `${why}. ${extra} (경고는 7일 지나면 하나씩 사라져요)`, warn: true });
  }
  // 관리자 채팅 명령어: /공지 내용 · /조용 닉네임 10분 · /내보내기 닉네임
  async command(ws, a, raw) {
    const [cmd, ...rest] = raw.slice(1).trim().split(/\s+/), sys = text => this.send(ws, { t: 'sys', text });
    if (cmd === '공지') {
      const text = raw.slice(raw.indexOf('공지') + 2).trim().slice(0, 100); if (!text) return sys('사용법: /공지 내용');
      await this.admin({ act: 'notice', text }); await toRooms(this.env, { act: 'notice', text }, a.room); return;
    }
    if (cmd === '조용' || cmd === '내보내기') {
      const u = rest[0] && await this.env.DB.prepare('SELECT id, nick FROM users WHERE nick_key = ?').bind(rest[0].toLowerCase()).first();
      if (!u) return sys(`닉네임을 찾을 수 없어요: ${rest[0] || '(없음)'}`);
      if (cmd === '내보내기') { await this.admin({ act: 'kick', id: u.id }); await toRooms(this.env, { act: 'kick', id: u.id }, a.room); return sys(`${u.nick}님을 내보냈어요 (다시 들어올 수는 있어요)`); }
      const mm = (rest[1] || '10분').match(/^(\d+)\s*(분|시간)?$/); if (!mm) return sys('사용법: /조용 닉네임 10분 (또는 1시간, 0분 = 풀기)');
      const until = +mm[1] ? now() + +mm[1] * (mm[2] === '시간' ? 3600e3 : 60e3) : 0;
      await this.env.DB.prepare('UPDATE users SET mute_until = ? WHERE id = ?').bind(until, u.id).run();
      await this.admin({ act: 'mute', id: u.id, until }); await toRooms(this.env, { act: 'mute', id: u.id, until }, a.room);
      return sys(until ? `${u.nick}님 채팅 금지 ${left(until - now())}` : `${u.nick}님 채팅 금지를 풀었어요`);
    }
    sys('관리자 명령어: /공지 내용 · /조용 닉네임 10분 · /내보내기 닉네임');
  }
  // 다른 채널에 같은 사람이 접속해 있는지 (있으면 {dev, kind})
  async elsewhere(id, skip) {
    for (let ch = 1; ch <= MAX_CH; ch++) {
      if (ch === skip) continue;
      try { const r = await this.env.TOWN.get(this.env.TOWN.idFromName('town-' + ch)).fetch('https://town/has?id=' + id); const j = await r.json(); if (j) return j; } catch {}
    }
    return null;
  }
  // 관리자 기능 (서버 안에서만 부름)
  async admin(b) {
    if (b.act === 'notice') this.all({ t: 'notice', text: b.text });
    if (b.act === 'house') this.all({ t: 'house', h: b.h });   // 누가 집을 짓거나 옮김 → 그 집만 고쳐 그림
    if (b.act === 'event') this.all({ t: 'event', e: b.e });   // 마을 사건·공동 건설 소식
    for (const w of this.members()) {
      const a = this.info(w); if (a.id !== b.id) continue;
      if (b.act === 'dup') { a.gone = true; a.dup = true; this.save(w, a); this.send(w, { t: 'dup' }); try { w.close(4002, 'dup'); } catch {} this.all({ t: 'leave', id: a.id }, w); }
      if (b.act === 'kick') { a.gone = true; this.save(w, a); this.send(w, { t: 'kick', why: b.why || '관리자가 마을에서 내보냈어요' }); try { w.close(4003, 'kick'); } catch {} this.all({ t: 'leave', id: a.id }, w); }
      if (b.act === 'mute') { a.mute = b.until; this.save(w, a); this.send(w, { t: 'sys', text: b.until > now() ? `관리자가 채팅을 막았어요 (남은 시간 ${left(b.until - now())})` : '채팅 금지가 풀렸어요' }); }
      if (b.act === 'limit') { a.limited = !!b.on; this.save(w, a); }
    }
    return new Response('ok');
  }
}
