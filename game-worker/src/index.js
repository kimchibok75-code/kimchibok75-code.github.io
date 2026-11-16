// 치복 타운 서버 (Cloudflare Worker + D1) — 1단계: 계정 · 로그인 · 저장 / 2단계: 사냥 · 상점 · 강화
// 계산과 검사는 전부 서버가 함. 화면이 보낸 숫자는 믿지 않음.
import { nickChecks, pwChecks, allOk, newCharacter, derive, makeItem, FACES, BODIES, HAIRS, HAIR_COLORS, EYES, MW, MH, T, STATS, SLOTS, CLASSES, HATS, EYE_SKINS, SUITS, WSKINS, wskKey, POTS, FIELDS, ENH_COST, ENH_MAX, HUNT, spentPoints, itemName, enhRate, JOB, FISHING, rollFish, fishHit, isBigFish,
  GACHA, GACHA_TEN, gachaInfo, rollGacha, itemPower, dismantle, GRADES, PRESETS, defaultPresets, totalPoints,
  fixLife, cntAdd, checkTitles, titleOf, FISH_COIN, AUTO_FISH, FISH_SHOP, cropOf, CANS, FARM, plotGrown, farmSettle, GATHER, WORK, workSettle, HOUSE, WISH, rollWish, START, LV_CAP, TITLES, rollOpts, STAGES,
  SKILLS, SK_RARE, SK_NEED, SK_MAX, skLv, SKILL_GACHA, skGachaInfo, rollSkill,
  dayKey, dailyState, checkDaily, eventNow, worldFx, VILLAGE, giveScore, liveGift, fxText, addExp, RAID, RAID_BOSS, raidReward, raidDps, raidSet, autoSettle, lifeExp, RSK, rskCount, rskLv, HOUSE_TIERS, houseSettle, NPC_MAX, npcBlk, npcList, npcState, npcProg, npcActive, npcGold, npcExp } from '../../assets/js/game-rules.js';
import { canHouse, isSolid, NODES, BACK, tileAt, WATER, seaAt } from '../../assets/js/game-map.js';
import { scanBad } from './filter.js';
import { startHunt, settle, summary } from './hunt.js';
import { Town, MAX_CH, toRooms, lookRow } from './town.js';
export { Town };
import { Chzzk } from './chzzk.js';
export { Chzzk };
import { Raid } from './raid.js';
export { Raid };
const raidDO = env => env.RAID.get(env.RAID.idFromName('main'));   // 레이드 방은 하나

const ORIGINS = ['https://kimchibok75-code.github.io', 'http://localhost:5173', 'http://127.0.0.1:5173'];
const PBKDF2_ITER = 30000;            // 비밀번호 해시 반복 횟수 (무료 요금제 CPU 한도 안에서)
const DAY = 864e5;
const LOCK_FAILS = 5, LOCK_MS = 10 * 60e3;
const SIGNUP_PER_HOUR = 3;

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const fail = (status, msg) => { throw new HttpError(status, msg); };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export default {
  // 5분마다: 치지직 채팅 연결 담당(Chzzk)을 깨움. 그 뒤로는 Chzzk가 알아서 1분(방송 중 20초)마다 확인
  async scheduled(ev, env, ctx) { ctx.waitUntil(env.CHZZK.get(env.CHZZK.idFromName('main')).fetch('https://chzzk/tick').catch(() => {})); },
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = { 'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0], 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    // 실시간 마을 (WebSocket): 로그인 확인은 방(Durable Object)이 첫 메시지로 함
    if (new URL(req.url).pathname === '/ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426 });
      if (!ORIGINS.includes(origin)) return new Response('forbidden', { status: 403 });
      const ch = Math.min(MAX_CH, Math.max(1, parseInt(new URL(req.url).searchParams.get('ch')) || 1));
      return env.TOWN.get(env.TOWN.idFromName('town-' + ch)).fetch(req);
    }
    if (new URL(req.url).pathname === '/raid-ws') {   // 레이드 (로그인·참가자 확인은 레이드 방이 첫 메시지로 함)
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426 });
      if (!ORIGINS.includes(origin)) return new Response('forbidden', { status: 403 });
      return raidDO(env).fetch(new Request('https://raid/ws', req));
    }
    let res;
    try { res = await route(req, env, new URL(req.url)); }
    catch (e) {
      if (e instanceof HttpError) res = json({ error: e.message }, e.status);
      else { console.error(e?.stack || String(e)); res = json({ error: '서버에 문제가 생겼어요. 잠시 뒤에 다시 해 주세요' }, 500); }
    }
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  },
};

async function route(req, env, url) {
  const p = url.pathname, m = req.method;
  if (p === '/' || p === '/api/health') return json({ ok: true, name: '치복 타운 서버', stage: 4 });
  if (m === 'GET' && p === '/api/mods-order') return json(await modOrderGet(env));   // 누구나 읽기 (홈페이지 모드 추천 순서)
  if (m === 'POST' && p === '/api/signup') return signup(req, env);
  if (m === 'POST' && p === '/api/login') return login(req, env);
  if (m === 'POST' && p === '/api/recover') return recover(req, env);
  const s = await auth(req, env);
  if (m === 'GET' && p === '/api/me') return play(env, s.user, dailyBonus);
  if (m === 'POST' && p === '/api/logout') { await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(s.tokenHash).run(); return json({ ok: true }); }
  if (m === 'POST' && p === '/api/character') return saveLook(req, env, s.user);
  if (m === 'POST' && p === '/api/move') return saveMove(req, env, s.user);
  if (m === 'GET' && p === '/api/fish/rank') return fishRank(env, s.user);
  if (m === 'GET' && p === '/api/rank') return rankList(env, s.user, url.searchParams.get('k'));
  if (m === 'GET' && p === '/api/houses') return json({ houses: (await env.DB.prepare('SELECT h.user_id AS id, u.nick, h.x, h.y, h.roof, h.lv FROM houses h JOIN users u ON u.id = h.user_id WHERE u.banned = 0').all()).results });
  if (m === 'GET' && p === '/api/news') return json(await news(env));
  if (m === 'GET' && p === '/api/raid') { const j = await (await raidDO(env).fetch('https://raid/state')).json(); return json({ ...j, now: now() }); }
  if (m === 'GET' && p === '/api/whoami') return json({ nick: s.user.nick, admin: !!s.user.is_admin });   // 홈페이지(모드 추천 편집 버튼)용. 게임 정산은 안 함
  if (m === 'POST' && p === '/api/admin/mods-order') return modsOrder(req, env, s.user);
  if (p.startsWith('/api/admin/')) return admin(p, m, req, env, s.user, url);
  if (m === 'GET' && p === '/api/blocks') return json({ blocks: (await env.DB.prepare('SELECT b.target_id AS id, u.nick FROM blocks b JOIN users u ON u.id = b.target_id WHERE b.user_id = ?').bind(s.user.id).all()).results });
  if (m === 'POST' && p === '/api/block') return block(req, env, s.user);
  if (m === 'POST' && p === '/api/report') return report(req, env, s.user);
  const g = GAME[p];
  if (m === 'POST' && g) { const b = await readBody(req); return play(env, s.user, (c, at, out) => g(c, b, at, out, env, s.user)); }
  if (m === 'POST' && p === '/api/password') return changePw(req, env, s);
  if (m === 'POST' && p === '/api/recovery-code') return newRecovery(req, env, s.user);
  fail(404, '없는 주소예요');
}

// ───────── 도구 ─────────
const enc = new TextEncoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const randB64 = n => b64(crypto.getRandomValues(new Uint8Array(n)));
const sha256 = async s => b64(await crypto.subtle.digest('SHA-256', enc.encode(s)));
async function pbkdf2(pw, salt, iter) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(salt), iterations: iter }, key, 256));
}
function same(a, b) {   // 시간 차이로 정답을 알아내지 못하게 비교
  const x = enc.encode(a), y = enc.encode(b);
  return x.length === y.length && crypto.subtle.timingSafeEqual(x, y);
}
const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() { const r = crypto.getRandomValues(new Uint8Array(12)); let s = ''; r.forEach((v, i) => { if (i && i % 4 === 0) s += '-'; s += CODE_ABC[v % 32]; }); return s; }
const normCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
async function readBody(req) {
  const t = await req.text(); if (t.length > 4000) fail(413, '보낸 내용이 너무 커요');
  try { return JSON.parse(t || '{}'); } catch { fail(400, '잘못된 요청이에요'); }
}
const now = () => Date.now();
const log = (env, uid, kind, detail = '') => env.DB.prepare('INSERT INTO activity (user_id, kind, detail, at) VALUES (?, ?, ?, ?)').bind(uid, kind, detail, now()).run();

async function newSession(env, uid, keep) {
  const token = randB64(32), t = now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at < ?').bind(uid, t),
    env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').bind(await sha256(token), uid, t + (keep ? 30 * DAY : DAY), t),
  ]);
  return token;
}
async function auth(req, env) {
  const m = (req.headers.get('Authorization') || '').match(/^Bearer ([\w-]{20,})$/);
  if (!m) fail(401, '로그인이 필요해요');
  const tokenHash = await sha256(m[1]);
  const user = await env.DB.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?').bind(tokenHash, now()).first();
  if (!user) fail(401, '로그인이 끝났어요. 다시 로그인해 주세요');
  if (user.banned) fail(403, '이용이 정지된 계정이에요. 김치복 디스코드나 팬 카페로 문의해 주세요');
  return { user, tokenHash };
}
async function checkPw(user, pw) { return same(await pbkdf2(String(pw || ''), user.pw_salt, user.pw_iter), user.pw_hash); }
const ipOf = async req => sha256('login:' + (req.headers.get('CF-Connecting-IP') || 'local'));
async function lockedMsg(env, user, ip) {
  const r = await env.DB.prepare('SELECT until FROM login_fails WHERE user_id = ? AND ip_hash = ?').bind(user.id, ip).first();
  const left = (r?.until || 0) - now(); return left > 0 ? `여러 번 틀려서 잠겼어요. ${Math.ceil(left / 60e3)}분 뒤에 다시 해 주세요` : null;
}
async function countFail(env, user, ip) {
  const r = await env.DB.prepare('SELECT n FROM login_fails WHERE user_id = ? AND ip_hash = ?').bind(user.id, ip).first(), n = (r?.n || 0) + 1;
  const lock = n >= LOCK_FAILS ? now() + LOCK_MS : 0;
  await env.DB.prepare('INSERT INTO login_fails (user_id, ip_hash, n, until, at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, ip_hash) DO UPDATE SET n = excluded.n, until = excluded.until, at = excluded.at').bind(user.id, ip, lock ? 0 : n, lock, now()).run();
  if (Math.random() < .05) await env.DB.prepare('DELETE FROM login_fails WHERE at < ?').bind(now() - 864e5).run();
  return lock ? `${LOCK_FAILS}번 틀려서 10분 동안 잠겼어요` : n;
}
const clearFails = (env, user, ip) => env.DB.prepare('DELETE FROM login_fails WHERE user_id = ? AND ip_hash = ?').bind(user.id, ip).run();
const findUser = (env, nick) => env.DB.prepare('SELECT * FROM users WHERE nick_key = ?').bind(String(nick || '').trim().toLowerCase()).first();

// ───────── 가입 · 로그인 · 비밀번호 찾기 ─────────
async function signup(req, env) {
  const b = await readBody(req), nick = String(b.nick || '').trim(), pw = String(b.pw || '');
  if (!allOk(nickChecks(nick))) fail(400, '닉네임 규칙을 확인해 주세요 (2~10글자, 한글·영문·숫자)');
  if (scanBad(nick).hit) fail(400, '닉네임에 쓸 수 없는 말이 들어 있어요');
  if (!allOk(pwChecks(pw, nick))) fail(400, '비밀번호 규칙을 확인해 주세요');
  const ipHash = await sha256('signup:' + (req.headers.get('CF-Connecting-IP') || 'local'));
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM signups WHERE ip_hash = ? AND at > ?').bind(ipHash, now() - 3600e3).first();
  if (recent.n >= SIGNUP_PER_HOUR) fail(429, '같은 곳에서 가입을 너무 많이 했어요. 1시간 뒤에 다시 해 주세요');
  if (await findUser(env, nick)) fail(409, '이미 있는 닉네임이에요');
  const salt = randB64(16), code = newCode(), t = now();
  let id;
  try {
    const r = await env.DB.prepare('INSERT INTO users (nick, nick_key, pw_hash, pw_salt, pw_iter, rec_hash, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(nick, nick.toLowerCase(), await pbkdf2(pw, salt, PBKDF2_ITER), salt, PBKDF2_ITER, await sha256(normCode(code)), t, t).run();
    id = r.meta.last_row_id;
  } catch (e) { if (String(e).includes('UNIQUE')) fail(409, '이미 있는 닉네임이에요'); throw e; }
  const c = newCharacter();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO characters (user_id, face, body, eyes, hat, intro, title, x, y, lv, exp, gold, s_str, s_dex, s_int, s_luk, points, hp, equip, bag, hats, pots, pot_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, c.face, c.body, c.eyes, c.hat, c.intro, c.title, c.x, c.y, c.lv, c.exp, c.gold, c.str, c.dex, c.int, c.luk, c.points, c.hp, JSON.stringify(c.equip), JSON.stringify(c.bag), JSON.stringify(c.hats), JSON.stringify(c.pots), c.potAt, t),
    env.DB.prepare('INSERT INTO signups (ip_hash, at) VALUES (?, ?)').bind(ipHash, t),
    env.DB.prepare('INSERT INTO activity (user_id, kind, detail, at) VALUES (?, ?, ?, ?)').bind(id, 'signup', nick, t),
  ]);
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  return json({ token: await newSession(env, id, true), code, me: await loadMe(env, user) });
}
async function login(req, env) {
  const b = await readBody(req), user = await findUser(env, b.nick);
  if (!user) fail(401, '닉네임 또는 비밀번호가 맞지 않아요');
  const ip = await ipOf(req), locked = await lockedMsg(env, user, ip); if (locked) fail(429, locked);
  if (!(await checkPw(user, b.pw))) { const r = await countFail(env, user, ip); fail(401, typeof r === 'string' ? r : `닉네임 또는 비밀번호가 맞지 않아요 (${r}/${LOCK_FAILS})`); }
  if (user.banned) fail(403, '이용이 정지된 계정이에요. 김치복 디스코드나 팬 카페로 문의해 주세요');
  await env.DB.prepare('UPDATE users SET last_login = ? WHERE id = ?').bind(now(), user.id).run(); await clearFails(env, user, ip);
  await log(env, user.id, 'login');
  return json({ token: await newSession(env, user.id, !!b.keep), me: await loadMe(env, user) });
}
async function recover(req, env) {
  const b = await readBody(req), user = await findUser(env, b.nick);
  if (!user) fail(401, '닉네임 또는 복구 코드가 맞지 않아요');
  const ip = await ipOf(req), locked = await lockedMsg(env, user, ip); if (locked) fail(429, locked);
  if (normCode(b.code).length !== 12 || !same(await sha256(normCode(b.code)), user.rec_hash)) { const r = await countFail(env, user, ip); fail(401, typeof r === 'string' ? r : `닉네임 또는 복구 코드가 맞지 않아요 (${r}/${LOCK_FAILS})`); }
  const pw = String(b.pw || '');
  if (!allOk(pwChecks(pw, user.nick))) fail(400, '새 비밀번호: 영문+숫자 8글자 이상, 닉네임·흔한 비밀번호 X');
  const salt = randB64(16), code = newCode();
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ?, rec_hash = ?, fail_count = 0, lock_until = 0 WHERE id = ?').bind(await pbkdf2(pw, salt, PBKDF2_ITER), salt, PBKDF2_ITER, await sha256(normCode(code)), user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),   // 다른 곳의 로그인은 모두 끊음
    env.DB.prepare('INSERT INTO activity (user_id, kind, at) VALUES (?, ?, ?)').bind(user.id, 'recover', now()),
  ]);
  return json({ ok: true, code });
}

// ───────── 로그인한 뒤 ─────────
// DB 한 줄 ↔ 캐릭터
function toChar(r) {
  const c = { face: r.face, body: r.body, eyes: r.eyes, hat: r.hat, hair: r.hair, hairC: r.hair_c, suit: r.suit || '', wsk: jp(r.wsk, {}), intro: r.intro, title: r.title, x: r.x, y: r.y, lv: r.lv, exp: r.exp, gold: r.gold,
    str: r.s_str, dex: r.s_dex, int: r.s_int, luk: r.s_luk, points: r.points, hp: r.hp, hpAt: r.hp_at,
    equip: JSON.parse(r.equip), bag: JSON.parse(r.bag), hats: JSON.parse(r.hats), pots: JSON.parse(r.pots), potAt: r.pot_at,
    hunt: r.hunt ? JSON.parse(r.hunt) : null, bonusDay: r.bonus_day, jobAt: r.job_at, ver: r.ver,
    cls: CLASSES[r.cls] ? r.cls : 'sword', enh: jp(r.enh, {}), presets: jp(r.presets, null) || defaultPresets(), preset: r.preset || 0, gacha: { w: 0, a: 0, ...jp(r.gacha, {}) }, life: fixLife(jp(r.life, null)) };
  if ('weapon' in c.equip || 'acc' in c.equip) oldGear(c);
  if (!titleOf(c.title) || !c.life.titles.includes(c.title)) c.title = 'new';   // 예전 칭호 글자 → 새 칭호
  if (isSolid(Math.floor(c.x / T), Math.floor(c.y / T))) { c.x = START.x; c.y = START.y; }   // 지도가 바뀌어서 막힌 곳에 있으면 광장으로
  return c;
}
const jp = (s, d) => { try { return s ? JSON.parse(s) : d; } catch { return d; } };
// 예전(상점) 장비: 산 값의 절반을 골드로 돌려주고, 새 기본 무기 3개(1단계 일반)를 끼워 줌
function oldGear(c) {
  const old = [...Object.values(c.equip), ...c.bag].filter(Boolean);
  c.gold += old.reduce((a, it) => a + Math.round((it.price || 0) * .5), 0);
  const wt = c.equip.weapon?.wt; c.cls = wt === 'bow' || wt === 'staff' ? wt : 'sword';
  for (const [k, it] of Object.entries(c.equip)) if (it?.enh) { const s = k === 'weapon' ? c.cls : k; if (SLOTS[s]) c.enh[s] = Math.max(c.enh[s] || 0, it.enh); }   // 예전 강화 단계는 같은 칸으로
  c.equip = newCharacter().equip; c.bag = [];
}
function meOut(user, c) {
  const h = c.hunt;
  return {
    id: user.id, nick: user.nick, admin: !!user.is_admin, gfx: c.gfx || {}, world: c._w ? { lv: c._w.lv, live: c._w.live } : null,
    char: { face: c.face, body: c.body, eyes: c.eyes, hat: c.hat, hair: c.hair, hairC: c.hairC, suit: c.suit, wsk: c.wsk, intro: c.intro, title: c.title, x: c.x, y: c.y, lv: c.lv, exp: c.exp, gold: c.gold,
      str: c.str, dex: c.dex, int: c.int, luk: c.luk, points: c.points, hp: c.hp, equip: c.equip, bag: c.bag, hats: c.hats, pots: c.pots, potAt: c.potAt,
      cls: c.cls, enh: c.enh, gacha: c.gacha, preset: c.preset, life: c.life, presets: c.presets.map((p, i) => (i === c.preset ? { ...p, s: [c.str, c.dex, c.int, c.luk] } : p)),
      hunt: h ? { f: h.f, start: h.start, t: Math.round(h.t), boss: h.boss, kills: h.kills, exp: h.exp, gold: h.gold, drops: h.drops } : null,
      job: c.jobAt ? { left: Math.max(0, Math.ceil((c.jobAt + JOB.sec * 1000 - Date.now()) / 1000)), pay: JOB.pay(c.lv) } : null },
  };
}
async function loadMe(env, user) {
  const r = await env.DB.prepare('SELECT * FROM characters WHERE user_id = ?').bind(user.id).first();
  return meOut(user, toChar(r));
}
// ───────── 마을 전체: 공동 건설 · 방송 · 마을 소식 ─────────
let WORLD = { at: 0, v: null }, NEWS = { at: 0, v: null };
async function liveNow(env) {   // 방송 상태는 kimchibok-live Worker에게 물어봄 (서비스 연결)
  try { if (!env.LIVE) return false; const r = await env.LIVE.fetch('https://live/live'); return !!(await r.json()).open; } catch { return false; }
}
async function world(env, fresh) {
  if (!fresh && WORLD.v && Date.now() - WORLD.at < 30e3) return WORLD.v;
  const [v, live] = await Promise.all([env.DB.prepare('SELECT * FROM village WHERE id = 1').first(), liveNow(env)]);
  WORLD = { at: Date.now(), v: { lv: v?.lv || 0, wood: v?.wood || 0, stone: v?.stone || 0, gold: v?.gold || 0, live: live || (v?.live_until || 0) > Date.now(), liveUntil: v?.live_until || 0 } };
  return WORLD.v;
}
async function news(env) {
  if (NEWS.v && Date.now() - NEWS.at < 20e3) return NEWS.v;
  const [W, top, chron] = await Promise.all([world(env),
    env.DB.prepare('SELECT u.nick, g.score FROM village_give g JOIN users u ON u.id = g.user_id WHERE u.banned = 0 ORDER BY g.score DESC LIMIT 10').all(),
    env.DB.prepare('SELECT at, kind, text FROM chronicle ORDER BY id DESC LIMIT 30').all()]);
  NEWS = { at: Date.now(), v: { village: W, top: top.results.map(r => ({ nick: r.nick, score: Math.round(r.score) })), chron: chron.results } };
  return NEWS.v;
}
// 마을 연대기 (전설 물고기, 신화 장비, 공동 건설 완성 등 큰일만)
const chron = (env, kind, text) => env.DB.prepare('INSERT INTO chronicle (at, kind, text) VALUES (?, ?, ?)').bind(now(), kind, String(text).slice(0, 120)).run().then(() => { NEWS.at = 0; }).catch(() => {});

// 캐릭터를 읽고 → 사냥 정산 → 바꾸고 → 저장. 그 사이 다른 요청이 먼저 바꿨으면(ver가 다르면) 처음부터 다시
async function play(env, user, fn) {
  for (let tries = 0; tries < 4; tries++) {
    const r = await env.DB.prepare('SELECT * FROM characters WHERE user_id = ?').bind(user.id).first();
    const W = await world(env), c = toChar(r), at = now(), out = {}; c._adm = !!user.is_admin; c.gfx = worldFx(W, at); c._w = W;
    const lv0 = c.lv, g0 = c.gold; c._spent = 0; dailyState(c, at); npcState(c, at);
    if (!c.hunt) {   // 마을: 체력이 1초에 2%씩 참
      const max = derive(c).maxHp;
      c.hp = Math.min(max, Math.round(c.hp + Math.max(0, (at - (c.hpAt || at)) / 1000) * max * HUNT.townRegen)); c.hpAt = at;
    } else out.hunt = settle(c, at);
    if (c.life.auto?.on) { const g = autoSettle(c, at); if (g) out.auto = g; }   // 자동 생활
    const res = (await fn(c, at, out)) || {};
    if (c.life.auto?.on && (c.hunt || c.jobAt)) c.life.auto.on = 0;   // 사냥·알바를 시작하면 자동 생활은 꺼짐
    const dq = checkDaily(c, at); if (dq.length) out.daily = dq;   // 매일 의뢰 · 도장
    const got = checkTitles(c); if (got.length) out.newTitles = got;   // 새로 깬 칭호
    { const e = c.gold - g0 + c._spent; if (e > 0 && !c._noEarn) c.life.earn = (c.life.earn || 0) + Math.round(e); }   // 번 돈 (랭킹): 이번에 늘어난 골드 + 쓴 골드
    const w = await env.DB.prepare(`UPDATE characters SET title = ?, x = ?, y = ?, lv = ?, exp = ?, gold = ?, s_str = ?, s_dex = ?, s_int = ?, s_luk = ?, points = ?, hp = ?, hp_at = ?,
        equip = ?, bag = ?, hats = ?, hat = ?, eyes = ?, pots = ?, pot_at = ?, hunt = ?, bonus_day = ?, job_at = ?, cls = ?, enh = ?, presets = ?, preset = ?, gacha = ?, life = ?, ver = ver + 1, updated_at = ? WHERE user_id = ? AND ver = ?`)
      .bind(c.title, c.x, c.y, c.lv, c.exp, c.gold, c.str, c.dex, c.int, c.luk, c.points, c.hp, c.hpAt, JSON.stringify(c.equip), JSON.stringify(c.bag), JSON.stringify(c.hats), c.hat, c.eyes,
        JSON.stringify(c.pots), c.potAt, c.hunt ? JSON.stringify(c.hunt) : '', c.bonusDay, c.jobAt || 0, c.cls, JSON.stringify(c.enh), JSON.stringify(c.presets), c.preset, JSON.stringify(c.gacha), JSON.stringify(c.life), at, user.id, c.ver).run();
    if (w.meta.changes) {
      if (res.log) await log(env, user.id, res.log[0], res.log[1] || '');
      if (res.after) await res.after();   // 캐릭터 저장이 끝난 뒤 할 일 (낚시 기록 등)
      if (res.chron) await chron(env, res.chron[0], `${user.nick}님이 ${res.chron[1]}`);
      if (lv0 < LV_CAP && c.lv >= LV_CAP) await chron(env, 'lv', `${user.nick}님이 ${LV_CAP}레벨이 되었어요!`);
      delete res.log; delete res.after; delete res.chron;
      return json({ me: meOut(user, c), ...out, ...res });
    }
  }
  fail(409, '동시에 여러 요청이 왔어요. 잠시 뒤에 다시 해 주세요');
}
// 매일 첫 접속 보너스 (레벨 × 20), 한국 날짜 기준
function dailyBonus(c, at) {
  const day = new Date(at + 9 * 3600e3).toISOString().slice(0, 10);
  if (c.bonusDay === day) return;
  c.bonusDay = day; const g = c.lv * 20; c.gold += g; cntAdd(c, 'days');
  return { bonus: g };
}
const spend = (c, n) => { if (!Number.isFinite(n) || n < 0) fail(400, '잘못된 요청이에요'); if (c.gold < n) fail(400, '골드가 부족해요'); c.gold -= n; c._spent = (c._spent || 0) + n; };
const own = (o, k) => typeof k === 'string' && Object.hasOwn(o, k);   // "__proto__" 같은 이름으로 속이는 것 막기
const findBag = (c, id) => { const i = c.bag.findIndex(it => it.id === String(id)); if (i < 0) fail(400, '이미 고른 장비예요'); return i; };
const townOnly = c => { if (c.hunt) fail(400, '사냥 중에는 할 수 없어요. 마을로 돌아온 뒤에 해 주세요'); };
const notWorking = c => { if (c.jobAt) fail(400, '카페 알바 중이에요. 알바를 끝내거나 그만둔 뒤에 해 주세요'); };

// 2단계 기능들: (캐릭터, 보낸 내용, 지금 시각, 사냥 정산 결과) → 캐릭터를 바꾸고, 화면에 알려 줄 것을 돌려줌
const GAME = {
  // 사냥
  '/api/hunt/start'(c, b, at) {
    if (c.hunt) fail(400, '이미 사냥 중이에요');
    notWorking(c);
    const fi = Number(b.f); if (!Number.isInteger(fi) || !FIELDS[fi]) fail(400, '없는 사냥터예요');
    if (c.hp < 1) fail(400, '체력이 없어요. 잠깐 쉬었다 가세요');
    startHunt(c, fi, at);
    return { log: ['hunt-start', FIELDS[fi].n] };
  },
  '/api/hunt/sync'() {},
  '/api/hunt/leave'(c, b, at, out) {
    if (!c.hunt) return { summary: null };   // 이미 쓰러져서 마을에 있음
    if (b.died) {   // 화면에서 체력이 0이 됨 → 바로 마을로 (쓰러짐 손해는 똑같이)
      const h = c.hunt, lost = Math.floor(h.gold * HUNT.deathLoss);
      c.gold = Math.max(0, c.gold - lost); c.hunt = null; c.hp = Math.round(derive(c).maxHp * .3); c.hpAt = at; c.x = BACK.x; c.y = BACK.y; cntAdd(c, 'died');
      out.hunt = { ...(out.hunt || { kills: 0, exp: 0, gold: 0, drops: [], pots: 0 }), died: true, lost, summary: summary(h, at) };
      return { summary: null, log: ['hunt-died', `${FIELDS[h.f].n} -${lost}g`] };
    }
    const sum = summary(c.hunt, at);
    c.hunt = null; c.hpAt = at; c.x = BACK.x; c.y = BACK.y;
    return { summary: sum, log: ['hunt-end', `${FIELDS[sum.f].n} ${sum.kills}마리 +${sum.exp}exp +${sum.gold}g`] };
  },
  // 카페
  '/api/pots'(c, b) {
    const k = b.k, n = Number(b.n);
    if (!own(POTS, k) || ![1, 5, 10].includes(n)) fail(400, '잘못된 요청이에요');
    if (c.pots[k] + n > 999) fail(400, '물약은 종류마다 999개까지예요');
    spend(c, POTS[k].price * n); c.pots[k] += n;
  },
  '/api/rest'(c) { townOnly(c); c.hp = derive(c).maxHp; },
  '/api/pot-at'(c, b) { const v = Number(b.v); if (!Number.isInteger(v) || v < 10 || v > 90) fail(400, '10~90 사이로 정해 주세요'); c.potAt = v; },
  // 가챠센터: 무기 뽑기 · 방어구 뽑기 (1회 / 10회)
  // 지금 낀 것보다 좋은 장비는 칸마다 가장 좋은 것 하나만 "바꿀지 고르기"로 남기고, 나머지는 자동으로 분해(골드)
  '/api/gacha/pull'(c, b) {
    townOnly(c);
    const box = b.box, n = Number(b.n);
    if (!own(GACHA, box) || ![1, 10].includes(n)) fail(400, '잘못된 요청이에요');
    const g0 = gachaInfo(c.gacha[box]), cost = n === 10 ? Math.round(g0.cost * 10 * GACHA_TEN) : g0.cost;
    spend(c, cost);
    const items = []; let got = 0;
    for (let k = 0; k < n; k++) {
      const it = rollGacha(box, gachaInfo(c.gacha[box]).lv); c.gacha[box]++; items.push(it); cntAdd(c, 'gacha');
      if (it.g === 'legend') cntAdd(c, 'gotLegend'); if (it.g === 'myth') cntAdd(c, 'gotMyth');
      const pi = c.bag.findIndex(p => p.slot === it.slot), best = Math.max(itemPower(c.equip[it.slot]), pi >= 0 ? itemPower(c.bag[pi]) : 0);
      if (itemPower(it) > best) { if (pi >= 0) { got += dismantle(c.bag[pi]); c.bag.splice(pi, 1); } c.bag.push(it); }
      else got += dismantle(it);
    }
    c.gold += got;
    const g1 = gachaInfo(c.gacha[box]), keep = new Set(c.bag.map(p => p.id));
    const myth = items.find(it => it.g === 'myth');
    return { items: items.map(it => ({ ...it, keep: keep.has(it.id) })), got, cost, lvUp: g1.lv > g0.lv ? g1.lv : 0, chron: myth ? ['myth', `신화 장비 「${itemName(myth)}」를 뽑았어요!`] : null,
      log: ['gacha', `${GACHA[box].n} ${n}회 -${cost} +${got} ${items.filter(it => ['epic', 'legend', 'myth'].includes(it.g)).map(it => `${it.st}단계 ${GRADES[it.g].n} ${itemName(it)}`).join(', ')}`] };
  },
  // 비교 창에서 고르기: take = 바꾸기(쓰던 것은 분해) / 아니면 새 장비를 분해
  '/api/gacha/pick'(c, b) {
    const i = findBag(c, b.id), it = c.bag[i]; c.bag.splice(i, 1);
    let got;
    if (b.take) { got = c.equip[it.slot] ? dismantle(c.equip[it.slot]) : 0; c.equip[it.slot] = it; }
    else got = dismantle(it);
    c.gold += got; c.hp = Math.min(c.hp, derive(c).maxHp);
    return { got, take: !!b.take, log: ['gacha-pick', `${itemName(it)} ${b.take ? '장착' : '분해'} +${got}`] };
  },
  // 스킬 뽑기 1회·10회: 직업 상관없이 18종 중에서. 같은 스킬이 또 나오면 모은 장 수가 늘어 레벨이 자동으로 오름
  // 뽑기 레벨(뽑은 횟수)이 오르면 값이 오르고 전설 확률도 오름. 최고 레벨(10)인 스킬이 또 나오면 그 1회 값의 30%를 골드로 돌려줌
  '/api/skill/pull'(c, b) {
    townOnly(c);
    const n = Number(b.n); if (![1, 10].includes(n)) fail(400, '잘못된 요청이에요');
    const g0 = skGachaInfo(c.life.skg || 0), cost = n === 10 ? Math.round(g0.cost * 10 * SKILL_GACHA.ten) : g0.cost;
    spend(c, cost);
    const sk = c.life.sk = c.life.sk && typeof c.life.sk === 'object' ? c.life.sk : {}, out = []; let back = 0;
    for (let k = 0; k < n; k++) {
      const s = rollSkill(skGachaInfo(c.life.skg || 0).lv), had = own(sk, s.id) ? sk[s.id] : 0, lv0 = skLv(had);
      c.life.skg = (c.life.skg || 0) + 1;
      if (had >= SK_NEED[SK_MAX - 1]) { back += Math.round(g0.cost * SKILL_GACHA.back); out.push({ id: s.id, lv: SK_MAX, max: true }); continue; }
      sk[s.id] = had + 1; const lv1 = skLv(sk[s.id]);
      out.push({ id: s.id, lv: lv1, isNew: !had, up: lv1 > lv0 });
    }
    cntAdd(c, 'skillPull', n); c.gold += back;
    const g1 = skGachaInfo(c.life.skg), best = out.filter(o => SKILLS.find(s => s.id === o.id).r === 3);
    return { got: out, back, cost, lvUp: g1.lv > g0.lv ? g1.lv : 0, log: ['skill', `스킬 뽑기 ${n}회 -${cost}${back ? ` +${back}` : ''} ${best.map(o => SKILLS.find(s => s.id === o.id).n).join(', ')}`] };
  },
  // 클래스 바꾸기 (언제든 무료): 지금 쓰는 무기가 바뀜
  '/api/class'(c, b) {
    if (!own(CLASSES, b.cls)) fail(400, '없는 클래스예요');
    c.cls = b.cls; c.hp = Math.min(c.hp, derive(c).maxHp);
  },
  // 능력치 프리셋: 바꾸기 · 이름 정하기
  '/api/preset/use'(c, b) {
    const i = Number(b.i); if (!Number.isInteger(i) || i < 0 || i >= PRESETS) fail(400, '없는 프리셋이에요');
    if (i === c.preset) return;
    c.presets[c.preset].s = [c.str, c.dex, c.int, c.luk];
    [c.str, c.dex, c.int, c.luk] = c.presets[i].s; c.preset = i;
    c.points = Math.max(0, totalPoints(c.lv) - spentPoints(c)); c.hp = Math.min(c.hp, derive(c).maxHp);
  },
  '/api/preset/name'(c, b) {
    const i = Number(b.i), n = String(b.n || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 10);
    if (!Number.isInteger(i) || i < 0 || i >= PRESETS) fail(400, '없는 프리셋이에요');
    if (!n) fail(400, '이름을 적어 주세요');
    c.presets[i].n = n;
  },
  // 대장간: 장비 칸(슬롯)을 강화. 장비를 바꿔도 강화 단계는 그대로
  '/api/enhance'(c, b) {
    townOnly(c);
    const slot = String(b.slot || ''); if (!own(SLOTS, slot)) fail(400, '없는 칸이에요');
    const l = c.enh[slot] || 0; if (l >= ENH_MAX) fail(400, `이미 최대 강화(+${ENH_MAX})예요`);
    const cost = ENH_COST[l]; spend(c, cost); cntAdd(c, 'enhTry');
    const ok = Math.random() * 100 < enhRate(l, derive(c));   // 운이 높으면 성공 확률 조금 더
    if (ok) { c.enh[slot] = l + 1; cntAdd(c, 'enhOk'); c.life.cnt.enhMax = Math.max(c.life.cnt.enhMax || 0, l + 1); }   // 실패해도 단계가 떨어지지 않음 (골드만 사라짐)
    c.hp = Math.min(c.hp, derive(c).maxHp);
    return { ok, slot, lv: c.enh[slot] || 0, log: ['enhance', `${SLOTS[slot].n} 칸 +${l + 1} ${ok ? '성공' : '실패'} -${cost}`] };
  },
  '/api/reset-stats'(c) {   // 캐릭터창 → 능력치에서 (사냥 중에도 가능)
    const n = spentPoints(c); if (!n) fail(400, '찍은 포인트가 없어요');
    spend(c, c.lv * 100);
    c.points += n; c.str = c.dex = c.int = c.luk = 5; c.hp = Math.min(c.hp, derive(c).maxHp);
    return { n, log: ['reset-stats', String(n)] };
  },
  // 자동 생활 켜기 · 끄기 · 정산 (정산은 play()가 매번 함)
  '/api/auto/start'(c, b, at) { townOnly(c); notWorking(c); c.life.auto = { on: 1, at, acc: c.life.auto?.acc || {} }; return { log: ['auto', 'on'] }; },
  '/api/auto/stop'(c) { if (c.life.auto) c.life.auto.on = 0; return { log: ['auto', 'off'] }; },
  '/api/auto/sync'() {},
  // 레이드 참가 (정각 30초 모집 중에만). 체력은 가득 채워서 시작
  async '/api/raid/join'(c, b, at, out, env, user) {
    townOnly(c);
    const D = derive(c), dps = raidDps(D);
    const look = { lv: c.lv, title: c.title, face: c.face, body: c.body, eyes: c.eyes, hat: c.hat, hair: c.hair, hairC: c.hairC, suit: c.suit, wsk: c.wsk, cls: c.cls, enh: c.enh, equip: c.equip };
    const res = await raidDO(env).fetch('https://raid/join', { method: 'POST', body: JSON.stringify({ start: Number(b.start), uid: user.id, nick: user.nick, lv: c.lv, dps, maxHp: D.maxHp, look }) });
    const j = await res.json(); if (!res.ok) fail(400, j.error || '참여하지 못했어요');
    c.hp = D.maxHp;
    return { raid: { start: j.start, n: j.n, dps } };
  },
  // 레이드 보상: 레이드 방에서 기록을 읽고 → 골드·경험치 + 확률로 전용 스킨. life.raidGot 으로 한 번만
  async '/api/raid/claim'(c, b, at, out, env, user) {
    const start = Number(b.start); if (!Number.isFinite(start)) fail(400, '잘못된 요청이에요');
    if (c.life.raidGot === start) fail(400, '이미 보상을 받았어요');
    const res = await raidDO(env).fetch(`https://raid/result?start=${start}&uid=${user.id}`), j = await res.json();
    if (!res.ok) fail(res.status, j.error || '보상을 받지 못했어요');
    const D = derive(c), RW = raidReward(c.lv), m = (j.dead ? RAID.deadMul : 1) * (.85 + .3 * Math.min(1, j.share * j.n));
    let gold = Math.round(RW.gold * m * (1 + D.goldB / 100)); const exp = Math.round(RW.exp * m * (1 + D.expB / 100));
    let skin = null, skinLv = 0, skinN = 0;
    if (Math.random() < (j.dead ? RAID.dropDead : RAID.drop)) {   // 세트 6부위 중 하나. 이미 있으면 개수가 늘어 레벨이 오름
      const all = raidSet(RAID_BOSS[j.boss]?.set || 'rdragon').filter(k => rskLv(rskCount(c, k)) < RSK.max);
      if (all.length) {
        skin = all[Math.floor(Math.random() * all.length)];
        const rsk = c.life.rsk || (c.life.rsk = {});
        if (!c.hats.includes(skin)) { c.hats.push(skin); rsk[skin] = 1; } else rsk[skin] = rskCount(c, skin) + 1;
        skinN = rsk[skin]; skinLv = rskLv(skinN);
      } else gold += Math.round(RW.gold * .5);   // 전부 최고 레벨이면 골드로
    }
    c.gold += gold; const up = addExp(c, exp); c.life.raidGot = start; c.hp = D.maxHp; c.hpAt = at;
    return { raid: { gold, exp, up, skin, skinLv, skinN, dead: j.dead, rank: j.rank, n: j.n, dmg: j.dmg }, log: ['raid', `${gold} ${exp} ${skin || ''}`.trim()],
      chron: skin ? ['raid', `${RAID_BOSS[j.boss]?.n || '레이드'} 레이드에서 전용 스킨을 얻었어요!`] : null };
  },
  // 스킨샵 (겉모습만, 현금 결제 없음)
  '/api/skin'(c, b) {
    townOnly(c);
    const id = String(b.id || '');
    if (id.startsWith('eye:')) {   // 눈 모양 스킨
      const e = EYE_SKINS.find(x => 'eye:' + x.id === id && x.price); if (!e) fail(400, '없는 스킨이에요');
      if (c.hats.includes(id)) fail(400, '이미 가지고 있어요');
      spend(c, e.price); c.hats.push(id); c.eyes = e.id;
      return { log: ['skin', id] };
    }
    if (id.startsWith('suit:') || id.startsWith('wsk:')) {   // 의상 · 무기 스킨 (입기는 /api/character 로)
      const s = id.startsWith('suit:') ? SUITS.find(x => 'suit:' + x.id === id) : WSKINS.find(x => wskKey(x) === id);
      if (!s || s.raid) fail(400, s ? '레이드에서만 얻을 수 있어요' : '없는 스킨이에요');
      if (c.hats.includes(id)) fail(400, '이미 가지고 있어요');
      spend(c, s.price); c.hats.push(id);
      return { log: ['skin', id] };
    }
    const h = HATS.find(x => x.id === id && x.id !== 'none' && !x.raid); if (!h) fail(400, '없는 스킨이에요');
    if (c.hats.includes(h.id)) fail(400, '이미 가지고 있어요');
    spend(c, h.price); c.hats.push(h.id); c.hat = h.id;
    return { log: ['skin', h.id] };
  },
  // 카페 알바: 1분 기다리면 골드
  '/api/job/start'(c, b, at) {
    townOnly(c); if (c.jobAt) fail(400, '이미 알바 중이에요');
    c.jobAt = at;
  },
  '/api/job/finish'(c, b, at) {
    if (!c.jobAt) fail(400, '알바 중이 아니에요');
    const left = Math.ceil((c.jobAt + JOB.sec * 1000 - at) / 1000);
    if (left > 0) fail(400, `아직 ${left}초 남았어요`);
    const pay = JOB.pay(c.lv); c.gold += pay; c.jobAt = 0; cntAdd(c, 'job');
    const lexp = lifeExp(c, 'job'); addExp(c, lexp);
    return { pay, lexp, log: ['job', String(pay)] };
  },
  '/api/job/quit'(c) { c.jobAt = 0; },
  // 손 낚시: 물을 누르면 바로. 서버가 결과를 정하고, 화면은 wait(ms) 뒤에 입질 → 결과를 보여 줌
  '/api/fish/hand'(c, b, at, out, env, user) { return fishOnce(c, b, at, env, user, false); },
  // 자동 낚시용 미끼 사기 (골드)
  '/api/fish/pack'(c, b) {
    const p = AUTO_FISH.packs[Number(b.i)]; if (!p) fail(400, '없는 물건이에요');
    spend(c, p[1]); c.life.fish.pack = (c.life.fish.pack || 0) + p[0];
    return { log: ['fish-pack', `${p[0]}개 -${p[1]}`] };
  },
  // 자동 낚시 한 번: 미끼 1개를 씀. 낚을 확률은 손 낚시보다 조금 낮음. 쿨타임은 손 낚시와 같음 (2초, 2026-11-17)
  '/api/fish/auto'(c, b, at, out, env, user) { return fishOnce(c, b, at, env, user, true); },
  // ───── 할 이유 (기획서 4-8) ─────
  // 공동 건설에 기부: 목재·석재·골드. 모자라는 만큼만 받음. 다 모이면 다음 건물로
  async '/api/village/give'(c, b, at, out, env, user) {
    const W = await world(env, true), P = VILLAGE[W.lv]; if (!P) fail(400, '마을 공사가 모두 끝났어요. 고마워요!');
    const have = { wood: c.life.res.wood, stone: c.life.res.stone, gold: c.gold }, g = {};
    for (const k of ['wood', 'stone', 'gold']) {
      const n = Math.floor(Number(b[k]) || 0); if (!Number.isFinite(n) || n < 0) fail(400, '잘못된 숫자예요');
      g[k] = Math.max(0, Math.min(n, have[k], P.need[k] - W[k]));
    }
    if (!g.wood && !g.stone && !g.gold) fail(400, '보낼 수 있는 게 없어요 (가진 것이 없거나 이미 다 모였어요)');
    c.life.res.wood -= g.wood; c.life.res.stone -= g.stone; c.gold -= g.gold; cntAdd(c, 'give');
    const score = giveScore(g);
    return { gave: g, log: ['give', JSON.stringify(g)], after: async () => {
      const DB = env.DB;
      await DB.batch([
        DB.prepare('UPDATE village SET wood = MIN(?, wood + ?), stone = MIN(?, stone + ?), gold = MIN(?, gold + ?), at = ? WHERE id = 1 AND lv = ?').bind(P.need.wood, g.wood, P.need.stone, g.stone, P.need.gold, g.gold, at, W.lv),
        DB.prepare('INSERT INTO village_give (user_id, score, at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET score = score + excluded.score, at = excluded.at').bind(user.id, score, at)]);
      const v = await DB.prepare('SELECT * FROM village WHERE id = 1').first();
      if (v && v.lv === W.lv && v.wood >= P.need.wood && v.stone >= P.need.stone && v.gold >= P.need.gold) {
        const done = await DB.prepare('UPDATE village SET lv = lv + 1, wood = 0, stone = 0, gold = 0 WHERE id = 1 AND lv = ?').bind(W.lv).run();
        if (done.meta.changes) {
          await chron(env, 'village', `🎉 마을 사람들이 힘을 모아 「${P.n}」을(를) 완성했어요! 이제 모두 ${fxText(P.fx)}`);
          await toRooms(env, { act: 'event', e: { k: 'village', lv: W.lv + 1, n: P.n } });
        }
      }
      WORLD.at = 0; NEWS.at = 0;
    } };
  },
  // 방송 출석: 김치복님이 방송 중일 때 하루 한 번 (선물 없음, 칭호용 횟수만)
  '/api/live/checkin'(c, b, at) {
    if (!c._w?.live) fail(400, '지금은 방송 중이 아니에요');
    const day = dayKey(at); if (c.life.liveDay === day) fail(400, '오늘은 이미 출석했어요');
    c.life.liveDay = day; cntAdd(c, 'live');
    return { gift: 0 };
  },
  // ───── 4단계 ─────
  // 칭호 달기 (가진 것만)
  // 마을 주민 임무: 받기 · 안부 전하기 · 보상 받기 · 포기 (주민과 임무는 시간으로 정해짐 → npcList)
  '/api/npc/take'(c, b, at) {
    const st = npcState(c, at), p = npcList(st.blk)[Number(b.i)];
    if (!p) fail(400, '지금 마을에 없는 주민이에요');
    if (own(st.q, String(p.i))) fail(400, '이미 받은 임무예요');
    if (npcActive(st) >= NPC_MAX) fail(400, `임무는 한 번에 ${NPC_MAX}개까지 받을 수 있어요`);
    st.q[p.i] = { b: p.task.k === 'talk' ? 0 : c.life.cnt[p.task.k] || 0, s: 0 };
    return { log: ['npc-take', p.task.n] };
  },
  '/api/npc/talk'(c, b, at) {
    const st = npcState(c, at), L = npcList(st.blk), to = Number(b.i);
    const p = L.find(p => p.task.to === to && st.q[p.i]?.s === 0 && !st.q[p.i].t);
    if (!p) fail(400, '전할 안부가 없어요');
    st.q[p.i].t = 1;
    return { talked: p.i };
  },
  '/api/npc/done'(c, b, at) {
    const st = npcState(c, at), p = npcList(st.blk)[Number(b.i)], q = p && own(st.q, String(p.i)) ? st.q[p.i] : null;
    if (!q || q.s !== 0) fail(400, '받은 임무가 없어요');
    if (npcProg(c, q, p.task) < p.task.v) fail(400, '아직 임무를 다 하지 못했어요');
    q.s = 1; const gold = npcGold(c.lv), exp = Math.round(npcExp(c.lv) * (1 + (derive(c).expB || 0) / 100)), ck = Math.random() < .5 ? 'fish' : 'farm', coin = 1 + (Math.random() < .5 ? 1 : 0);
    c.gold += gold; addExp(c, exp); c.life.coins[ck] += coin; cntAdd(c, 'npc');
    return { npcDone: { i: p.i, gold, coin, ck }, lexp: exp, log: ['npc-done', p.task.n] };
  },
  '/api/npc/drop'(c, b, at) {
    const st = npcState(c, at), i = String(Number(b.i));
    if (!own(st.q, i) || st.q[i].s !== 0) fail(400, '받은 임무가 없어요');
    delete st.q[i];
  },
  '/api/title'(c, b) { const id = String(b.id || ''); if (!c.life.titles.includes(id)) fail(400, '아직 없는 칭호예요'); c.title = id; },
  // 낚시점: 낚싯대 · 미끼 올리기 (낚시 코인)
  '/api/fish/shop'(c, b) {
    const k = b.k; if (!own(FISH_SHOP, k)) fail(400, '없는 물건이에요'); const S = FISH_SHOP[k];
    const l = c.life.fish[k]; if (l >= S.cost.length) fail(400, '이미 최고 단계예요');
    if (c.life.coins.fish < S.cost[l]) fail(400, '낚시 코인이 부족해요');
    c.life.coins.fish -= S.cost[l]; c.life.fish[k] = l + 1;
    return { log: ['fish-shop', `${k} ${l + 1}`] };
  },
  // 텃밭: 심기 · 물 주기 · 수확 · 품종 열기 · 물뿌리개 · 칸 늘리기
  '/api/farm/plant'(c, b, at) {
    const f = c.life.farm, i = Number(b.i), cr = cropOf(b.crop);
    if (!Number.isInteger(i) || i < 0 || i >= f.plots.length) fail(400, '없는 칸이에요');
    if (!cr || !f.seeds.includes(cr.id)) fail(400, '아직 없는 씨앗이에요');
    if (f.plots[i]) fail(400, '이미 심은 칸이에요');
    spend(c, cr.cost); f.plots[i] = { c: cr.id, g: 0, t: at };
  },
  '/api/farm/plantall'(c, b, at) {   // 빈 칸 모두에 같은 씨앗
    const f = c.life.farm, cr = cropOf(b.crop); if (!cr || !f.seeds.includes(cr.id)) fail(400, '아직 없는 씨앗이에요');
    let n = 0; for (let i = 0; i < f.plots.length; i++) if (!f.plots[i] && c.gold >= cr.cost) { c.gold -= cr.cost; f.plots[i] = { c: cr.id, g: 0, t: at }; n++; }
    if (!n) fail(400, f.plots.every(Boolean) ? '빈 칸이 없어요' : '골드가 부족해요');
    return { n };
  },
  '/api/farm/water'(c, b, at) {
    const f = c.life.farm, left = Math.ceil((f.wetAt + FARM.cd - at) / 1000);
    if (left > 0) fail(400, `아직 ${left}초 뒤에 물을 줄 수 있어요`);
    if (!f.plots.some(Boolean)) fail(400, '심은 작물이 없어요');
    farmSettle(f, at); f.wetAt = at; f.wetM = CANS.mul[f.can]; cntAdd(c, 'water');
  },
  '/api/farm/harvest'(c, b, at) {
    const f = c.life.farm, fx = derive(c).fx; let gold = 0, coin = 0; const got = [];
    f.plots.forEach((p, i) => {
      if (!p) return; const cr = cropOf(p.c); if (!cr || plotGrown(p, f, at) < cr.sec) return;
      gold += Math.round(cr.sell * (1 + (fx.farmP || 0) / 100)); coin += cr.coin; got.push(cr.id); f.plots[i] = null; if (cr.id === 'gold') cntAdd(c, 'goldCrop');
    });
    if (!got.length) fail(400, '다 자란 작물이 없어요');
    coin = Math.round(coin * (1 + (fx.farmC || 0) / 100));
    c.gold += gold; c.life.coins.farm += coin; cntAdd(c, 'crops', got.length);
    const lexp = lifeExp(c, 'crop', got.length); addExp(c, lexp);
    return { gold, coin, got, lexp, log: ['harvest', `${got.length}개 +${gold}g +${coin}c`] };
  },
  '/api/farm/unlock'(c, b) {
    const f = c.life.farm, cr = cropOf(b.crop); if (!cr) fail(400, '없는 품종이에요'); if (f.seeds.includes(cr.id)) fail(400, '이미 가진 품종이에요');
    if (c.life.coins.farm < cr.unlock) fail(400, '텃밭 코인이 부족해요');
    c.life.coins.farm -= cr.unlock; f.seeds.push(cr.id);
  },
  '/api/farm/can'(c) {
    const f = c.life.farm; if (f.can >= CANS.cost.length) fail(400, '이미 최고 물뿌리개예요');
    if (c.life.coins.farm < CANS.cost[f.can]) fail(400, '텃밭 코인이 부족해요');
    c.life.coins.farm -= CANS.cost[f.can]; f.can++;
  },
  '/api/farm/plot'(c) {
    const f = c.life.farm, k = f.plots.length - 6; if (f.plots.length >= FARM.maxPlots) fail(400, '텃밭은 9칸까지예요');
    if (c.life.coins.farm < FARM.plotCost[k]) fail(400, '텃밭 코인이 부족해요');
    c.life.coins.farm -= FARM.plotCost[k]; f.plots.push(null);
  },
  // 채집: 마을의 나무·바위 (사람마다 따로 자람)
  '/api/gather'(c, b, at) {
    townOnly(c); notWorking(c);
    const n = NODES[Number(b.node)]; if (!n || n.off) fail(400, '없는 자원이에요');
    const L = c.life, G = GATHER[n.k];
    if (at - L.gatherAt < GATHER.gap) fail(429, '너무 빨라요');
    if ((L.nodes[n.i] || 0) > at) fail(400, `아직 자라는 중이에요 (${Math.ceil((L.nodes[n.i] - at) / 60e3)}분)`);
    const x = Number(b.x), y = Number(b.y);
    if (!(Math.abs(x - (n.x + .5) * T) < 2.6 * T && Math.abs(y - (n.y + .5) * T) < 2.6 * T)) fail(400, '조금 더 가까이 가서 해 주세요');
    const amt = G.amt[0] + Math.floor(Math.random() * (G.amt[1] - G.amt[0] + 1)) + (derive(c).fx.gather || 0);
    L.res[G.res] += amt; cntAdd(c, G.res, amt); L.gatherAt = at;
    L.nodes[n.i] = Math.round(at + G.regrow[0] + Math.random() * (G.regrow[1] - G.regrow[0]));
    for (const k of Object.keys(L.nodes)) if (L.nodes[k] < at) delete L.nodes[k];   // 다 자란 기록은 지움
    if (!isSolid(Math.floor(x / T), Math.floor(y / T))) { c.x = x; c.y = y; }
    const lexp = lifeExp(c, 'gather'); addExp(c, lexp);
    return { res: G.res, amt, until: L.nodes[n.i], lexp };
  },
  // 벌목소·채광소 알바: 고용 · 모인 것 받기
  '/api/work/hire'(c, b, at) {
    const k = b.kind; if (!own(WORK, k)) fail(400, '없는 곳이에요'); const W = WORK[k];
    const w = c.life.work[k]; if (w.n >= W.max) fail(400, `알바는 ${W.max}명까지예요`);
    const cost = W.hire(w.n + 1);
    if (c.gold < cost.gold) fail(400, '골드가 부족해요');
    for (const r of ['wood', 'stone']) if (cost[r] && c.life.res[r] < cost[r]) fail(400, `${r === 'wood' ? '목재' : '석재'}가 부족해요`);
    workSettle(w, k, at); c.gold -= cost.gold; for (const r of ['wood', 'stone']) if (cost[r]) c.life.res[r] -= cost[r];
    w.n++; cntAdd(c, 'hire');
    return { log: ['hire', `${k} ${w.n}`] };
  },
  '/api/work/collect'(c, b, at) {
    const k = b.kind; if (!own(WORK, k)) fail(400, '없는 곳이에요'); const W = WORK[k];
    const w = c.life.work[k], { have } = workSettle(w, k, at); if (have < 1) fail(400, '아직 모인 게 없어요');
    w.acc -= have; c.life.res[W.res] += have; cntAdd(c, W.res, have);
    return { res: W.res, amt: have };
  },
  // 소원 분수: 10분에 한 번, 10골드
  '/api/wish'(c, b, at) {
    townOnly(c);
    const L = c.life, left = Math.ceil((L.wishAt + WISH.cd * (eventNow(at)?.k === 'wish' ? .5 : 1) - at) / 1000);
    if (left > 0) fail(400, `분수가 아직 잔잔해요. ${Math.ceil(left / 60)}분 뒤에 다시 빌 수 있어요`);
    spend(c, WISH.cost); L.wishAt = at; cntAdd(c, 'wish');
    const o = rollWish(), r = { k: o.k };
    if (o.k === 'gold') { r.gold = o.min + Math.floor(Math.random() * (o.max - o.min + 1)); c.gold += r.gold; }
    if (o.k === 'jackpot' || o.k === 'rainbow') { r.gold = o.g; c.gold += o.g; cntAdd(c, 'jackpot'); }
    if (o.b) { L.buff = { k: o.b, until: at + o.min * 60e3 }; r.buff = o.b; r.min = o.min; }
    if (o.k === 'coin') { const k = Math.random() < .5 ? 'fish' : 'farm'; L.coins[k] += 3; r.coin = k; }
    if (o.k === 'pots') c.pots.xl = Math.min(999, c.pots.xl + 2);
    return { wish: r, log: ['wish', o.k] };
  },
  // 집: 짓기(처음) · 옮기기(이사) · 지붕 색. 집 자리는 서버가 지도로 확인
  async '/api/house/build'(c, b, at, out, env, user) {
    townOnly(c);
    const x = Number(b.x), y = Number(b.y), roof = Math.max(0, Math.min(HOUSE.roofs.length - 1, Math.trunc(Number(b.roof)) || 0)), had = !!c.life.house;
    if (!Number.isInteger(x) || !Number.isInteger(y)) fail(400, '집을 지을 수 없는 자리예요');
    const others = (await env.DB.prepare('SELECT x, y FROM houses WHERE user_id != ?').bind(user.id).all()).results;
    const why = canHouse(x, y, others); if (why) fail(400, why);
    const cost = had ? HOUSE.move : HOUSE.cost;
    if (c.gold < cost.gold) fail(400, '골드가 부족해요');
    for (const r of ['wood', 'stone']) if (c.life.res[r] < cost[r]) fail(400, `${r === 'wood' ? '목재' : '석재'}가 부족해요`);
    c.gold -= cost.gold; c.life.res.wood -= cost.wood; c.life.res.stone -= cost.stone;
    c.life.house = { ...(had ? c.life.house : { lv: 0 }), x, y, roof: had ? c.life.house.roof : roof }; if (!had) cntAdd(c, 'house');
    const h = c.life.house;
    return { moved: had, log: ['house', `${x},${y}`], chron: had ? null : ['house', '마을에 집을 지었어요'],
      after: async () => { await env.DB.prepare('INSERT INTO houses (user_id, x, y, roof, at, lv) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET x = excluded.x, y = excluded.y, roof = excluded.roof, at = excluded.at, lv = excluded.lv').bind(user.id, h.x, h.y, h.roof, at, h.lv || 0).run(); await toRooms(env, { act: 'house', h: { id: user.id, nick: user.nick, ...h } }); } };
  },
  // 집 업그레이드 (한 단계씩, 점점 비쌈). 수입이 바뀌기 전에 먼저 정산
  async '/api/house/up'(c, b, at, out, env, user) {
    townOnly(c);
    const h = c.life.house; if (!h) fail(400, '먼저 집을 지어 주세요');
    const nx = HOUSE_TIERS[(h.lv || 0) + 1]; if (!nx) fail(400, '이미 가장 높은 단계예요');
    const cost = nx.cost;
    if (c.gold < cost.gold) fail(400, '골드가 부족해요');
    for (const r of ['wood', 'stone']) if (c.life.res[r] < cost[r]) fail(400, `${r === 'wood' ? '목재' : '석재'}가 부족해요`);
    houseSettle(h, at);
    c.gold -= cost.gold; c.life.res.wood -= cost.wood; c.life.res.stone -= cost.stone; h.lv = (h.lv || 0) + 1; if (nx.inc && !h.at) h.at = at;
    return { log: ['house-up', String(h.lv)], chron: h.lv >= 3 ? ['house', `집을 ${nx.n}(으)로 올렸어요!`] : null,
      after: async () => { await env.DB.prepare('UPDATE houses SET lv = ? WHERE user_id = ?').bind(h.lv, user.id).run(); await toRooms(env, { act: 'house', h: { id: user.id, nick: user.nick, ...h } }); } };
  },
  // 임대 수입 받기 (빌라부터)
  '/api/house/collect'(c, b, at) {
    const h = c.life.house; if (!h) fail(400, '먼저 집을 지어 주세요');
    const s = houseSettle(h, at); if (!s.rate) fail(400, '빌라부터 임대 수입이 생겨요');
    if (s.have < 1) fail(400, '아직 모인 수입이 없어요');
    c.gold += s.have; h.acc -= s.have;
    return { got: s.have, log: ['house-inc', String(s.have)] };
  },
  async '/api/house/roof'(c, b, at, out, env, user) {
    if (!c.life.house) fail(400, '먼저 집을 지어 주세요');
    c.life.house.roof = Math.max(0, Math.min(HOUSE.roofs.length - 1, Math.trunc(Number(b.roof)) || 0));
    const h = c.life.house;
    return { after: async () => { await env.DB.prepare('UPDATE houses SET roof = ? WHERE user_id = ?').bind(h.roof, user.id).run(); await toRooms(env, { act: 'house', h: { id: user.id, nick: user.nick, ...h } }); } };
  },
  // 능력치 찍기 (남은 포인트 안에서)
  '/api/stats'(c, b) {
    const add = b.add || {}; let sum = 0;
    for (const k of Object.keys(STATS)) { const v = add[k] ?? 0; if (!Number.isInteger(v) || v < 0 || v > 400) fail(400, '능력치 값이 이상해요'); sum += v; }
    if (!sum) fail(400, '올릴 능력치를 골라 주세요');
    if (sum > c.points) fail(400, '남은 포인트가 부족해요');
    for (const k of Object.keys(STATS)) c[k] += add[k] ?? 0;
    c.points -= sum;
  },
};
async function saveLook(req, env, user) {
  const b = await readBody(req), c = await env.DB.prepare('SELECT hats FROM characters WHERE user_id = ?').bind(user.id).first();
  const owned = JSON.parse(c.hats);
  const face = FACES.includes(b.face) ? b.face : null, body = BODIES.includes(b.body) ? b.body : null;
  const eyes = b.eyes === 'dot' || (EYE_SKINS.some(e => e.id === b.eyes) && owned.includes('eye:' + b.eyes)) ? b.eyes : null;
  const hat = typeof b.hat === 'string' && owned.includes(b.hat) ? b.hat : null;
  const hair = HAIRS.some(h => h.id === b.hair) ? b.hair : null, hairC = HAIR_COLORS.includes(b.hairC) ? b.hairC : null;
  const suit = b.suit === '' || (typeof b.suit === 'string' && SUITS.some(s => s.id === b.suit) && owned.includes('suit:' + b.suit)) ? b.suit : null;
  let wsk = null;
  if (b.wsk && typeof b.wsk === 'object') {   // { sword, bow, staff }: 빈 값 = 기본 무기 그림
    wsk = {};
    for (const t of ['sword', 'bow', 'staff']) { const v = b.wsk[t]; if (typeof v === 'string' && v && WSKINS.some(w => w.t === t && w.id === v) && owned.includes(`wsk:${t}:${v}`)) wsk[t] = v; }
    wsk = JSON.stringify(wsk);
  }
  let intro = null;
  if (typeof b.intro === 'string') {
    intro = b.intro.replace(/\s+/g, ' ').trim();
    if ([...intro].length > 30) fail(400, '한 줄 소개는 30글자까지예요');
    const r = scanBad(intro); if (r.hard) fail(400, '한 줄 소개에 쓸 수 없는 말이 있어요'); intro = r.text;
  }
  // ver + 1: 같은 때 다른 요청(사냥 정산 등)이 옛 값으로 덮어쓰지 않게
  await env.DB.prepare('UPDATE characters SET face = COALESCE(?, face), body = COALESCE(?, body), eyes = COALESCE(?, eyes), hat = COALESCE(?, hat), hair = COALESCE(?, hair), hair_c = COALESCE(?, hair_c), suit = COALESCE(?, suit), wsk = COALESCE(?, wsk), intro = COALESCE(?, intro), ver = ver + 1, updated_at = ? WHERE user_id = ?')
    .bind(face, body, eyes, hat, hair, hairC, suit, wsk, intro, now(), user.id).run();
  return json({ me: await loadMe(env, user) });
}
async function saveMove(req, env, user) {
  const b = await readBody(req), x = Number(b.x), y = Number(b.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) fail(400, '위치가 이상해요');
  const cx = Math.max(T / 2, Math.min(MW * T - T / 2, x)), cy = Math.max(T / 2, Math.min(MH * T - T / 2, y));
  if (isSolid(Math.floor(cx / T), Math.floor(cy / T))) return json({ ok: false });
  // 사냥 중에는 마을 위치를 바꾸지 않음
  await env.DB.prepare("UPDATE characters SET x = ?, y = ?, ver = ver + 1, updated_at = ? WHERE user_id = ? AND hunt = ''").bind(cx, cy, now(), user.id).run();
  return json({ ok: true });
}
async function changePw(req, env, s) {
  const b = await readBody(req), user = s.user;
  const locked = lockedMsg(user); if (locked) fail(429, locked);
  if (!(await checkPw(user, b.old))) { const r = await countFail(env, user); fail(401, typeof r === 'string' ? r : `지금 비밀번호가 맞지 않아요 (${r}/${LOCK_FAILS})`); }
  const pw = String(b.pw || '');
  if (!allOk(pwChecks(pw, user.nick))) fail(400, '새 비밀번호: 영문+숫자 8글자 이상, 닉네임·흔한 비밀번호 X');
  const salt = randB64(16);
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ?, fail_count = 0 WHERE id = ?').bind(await pbkdf2(pw, salt, PBKDF2_ITER), salt, PBKDF2_ITER, user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').bind(user.id, s.tokenHash),   // 이 기기 말고 다른 곳은 로그아웃
    env.DB.prepare('INSERT INTO activity (user_id, kind, at) VALUES (?, ?, ?)').bind(user.id, 'password', now()),
  ]);
  return json({ ok: true });
}
async function newRecovery(req, env, user) {
  const b = await readBody(req);
  const locked = lockedMsg(user); if (locked) fail(429, locked);
  if (!(await checkPw(user, b.pw))) { const r = await countFail(env, user); fail(401, typeof r === 'string' ? r : `비밀번호가 맞지 않아요 (${r}/${LOCK_FAILS})`); }
  const code = newCode();
  await env.DB.prepare('UPDATE users SET rec_hash = ?, fail_count = 0 WHERE id = ?').bind(await sha256(normCode(code)), user.id).run();
  await log(env, user.id, 'recovery-code');
  return json({ ok: true, code });
}

// 낚시 한 번 (손·자동 같이 씀): 쿨타임 확인 → 물고기 정하기 → 낚을 확률로 성공/실패 → 바로 팔아서 골드·낚시 코인
// b.w = [x, y] 찌를 던진 물 칸 → 바다면 바다 물고기, 아니면(강·연못) 강 물고기
async function fishOnce(c, b, at, env, user, auto) {
  townOnly(c); notWorking(c);
  if (auto && !(c.life.fish.pack > 0)) fail(400, '자동 낚시용 미끼가 없어요. 낚시터에서 미끼를 사 주세요');
  const row = await env.DB.prepare('SELECT last_cast, day, day_n FROM fishing WHERE user_id = ?').bind(user.id).first();
  const left = Math.ceil(((row?.last_cast || 0) + FISHING.cooldown - at) / 1000);
  if (left > 0) fail(429, `${left}초 뒤에 다시 던질 수 있어요`);
  if (auto) c.life.fish.pack--;
  const w = Array.isArray(b.w) && b.w.length === 2 && b.w.every(Number.isInteger) ? b.w : null, sea = !!w && tileAt(w[0], w[1]) === WATER && seaAt(w[0], w[1]);
  const D = derive(c), F = c.life.fish, fish = rollFish(D.luk, F.rod, F.bait, sea), wait = Math.round(FISHING.waitMin + Math.random() * (FISHING.waitMax - FISHING.waitMin));
  const mark = () => env.DB.prepare("INSERT INTO fishing (user_id, bait, last_cast) VALUES (?, '', ?) ON CONFLICT(user_id) DO UPDATE SET bait = '', last_cast = excluded.last_cast").bind(user.id, at).run();
  const base = { wait, cooldown: FISHING.cooldown, left: F.pack, sea };
  if (Math.random() >= fishHit(F.rod, D.fx, auto)) return { ...base, caught: false, fish: { i: fish.i, n: fish.n, grade: fish.grade }, after: mark };
  const day = dayKey(at), dayN = row?.day === day ? row.day_n + 1 : 1, tired = dayN > FISHING.dayFull ? .5 : 1;   // 하루에 너무 많이 낚으면 값이 절반
  const big = isBigFish(fish), price = Math.round(fish.price * tired), info = JSON.stringify({ i: fish.i, n: fish.n, grade: fish.grade, len: fish.len, price });
  const sell = Math.round(price * (1 + (D.fx.fishP || 0) / 100)), coin = Math.round(FISH_COIN[fish.grade] * (1 + (D.fx.fishC || 0) / 100) * tired);
  c.gold += sell; c.life.coins.fish += coin; cntAdd(c, 'fish');   // 낚은 물고기는 바로 팔림
  const lexp = lifeExp(c, 'fish'); addExp(c, lexp);
  if (big) cntAdd(c, 'perfect'); if (fish.grade === 'legend') cntAdd(c, 'legendFish'); if (fish.n === '낡은 장화') cntAdd(c, 'boot');
  return { ...base, caught: true, big, lexp, fish: { ...fish, price: sell }, coin, tired: tired < 1, chron: fish.grade === 'legend' ? ['fish', `전설 물고기 ${fish.n} ${fish.len}cm를 낚았어요!`] : null,
    after: async () => { await mark(); await env.DB.prepare(`UPDATE fishing SET count = count + 1, gold = gold + ?, day = ?, day_n = ?,
        best_price_fish = CASE WHEN ? > best_price THEN ? ELSE best_price_fish END, best_price = MAX(best_price, ?),
        best_len_fish = CASE WHEN ? > best_len THEN ? ELSE best_len_fish END, best_len = MAX(best_len, ?) WHERE user_id = ?`)
      .bind(price, day, dayN, price, info, price, fish.len, info, fish.len, user.id).run(); } };
}

// ───────── 랭킹 (2026-11-17): 레벨 · 번 돈 · 낚시 · 강화 합. 상위 50명 + 내 순위. 1분 동안 기억 ─────────
const ENH_SUM = ['sword', 'bow', 'staff', 'hat', 'armor', 'shoes'].map(k => `COALESCE(json_extract(c.enh, '$.${k}'), 0)`).join(' + ');
const RANK = {
  lv: { v: 'c.lv', t: 'c.exp' },
  earn: { v: "COALESCE(json_extract(c.life, '$.earn'), 0)", t: 'c.lv' },
  fish: { v: 'COALESCE(f.count, 0)', t: 'COALESCE(f.gold, 0)' },
  enh: { v: `(${ENH_SUM})`, t: 'c.lv' },
};
const RANK_MEM = {};
async function rankList(env, user, k) {
  if (!own(RANK, k)) fail(400, '잘못된 요청이에요');
  const R = RANK[k], from = 'FROM characters c JOIN users u ON u.id = c.user_id LEFT JOIN fishing f ON f.user_id = c.user_id WHERE u.banned = 0';
  let M = RANK_MEM[k];
  if (!M || now() - M.at > 60e3) {
    const r = await env.DB.prepare(`SELECT u.id, u.nick, c.lv, c.cls, c.title, ${R.v} AS v, ${R.t} AS t ${from} AND ${R.v} > 0 ORDER BY v DESC, t DESC, u.id LIMIT 50`).all();
    M = RANK_MEM[k] = { at: now(), list: r.results.map(x => ({ id: x.id, nick: x.nick, lv: x.lv, cls: x.cls, title: x.title, v: x.v })) };
  }
  const me = await env.DB.prepare(`SELECT ${R.v} AS v, ${R.t} AS t ${from} AND u.id = ?`).bind(user.id).first();
  const rank = me && me.v > 0 ? (await env.DB.prepare(`SELECT COUNT(*) AS n ${from} AND (${R.v} > ? OR (${R.v} = ? AND ${R.t} > ?))`).bind(me.v, me.v, me.t).first()).n + 1 : 0;
  return json({ k, list: M.list, me: { v: me?.v || 0, rank }, at: M.at });
}

async function fishRank(env, user) {
  const q = (order, where) => env.DB.prepare(`SELECT u.nick, f.count, f.best_price_fish, f.best_len_fish FROM fishing f JOIN users u ON u.id = f.user_id WHERE ${where} AND u.banned = 0 ORDER BY ${order} DESC LIMIT 10`);
  const [price, len, count, mine] = await env.DB.batch([q('f.best_price', 'f.best_price > 0'), q('f.best_len', 'f.best_len > 0'), q('f.count', 'f.count > 0'),
    env.DB.prepare('SELECT count, gold, best_price_fish, best_len_fish FROM fishing WHERE user_id = ?').bind(user.id)]);
  const fish = s => (s ? JSON.parse(s) : null);
  const rows = r => r.results.map(x => ({ nick: x.nick, count: x.count, price: fish(x.best_price_fish), len: fish(x.best_len_fish) }));
  const m = mine.results[0];
  return json({ price: rows(price), len: rows(len), count: rows(count), mine: m ? { count: m.count, gold: m.gold, price: fish(m.best_price_fish), len: fish(m.best_len_fish) } : null, cooldown: FISHING.cooldown });
}

// ───────── 3단계: 차단 · 신고 · 관리자 ─────────
async function block(req, env, user) {
  const b = await readBody(req), id = Number(b.id);
  if (!Number.isInteger(id) || id === user.id) fail(400, '잘못된 요청이에요');
  if (b.off) await env.DB.prepare('DELETE FROM blocks WHERE user_id = ? AND target_id = ?').bind(user.id, id).run();
  else {
    const n = (await env.DB.prepare('SELECT COUNT(*) AS n FROM blocks WHERE user_id = ?').bind(user.id).first()).n;
    if (n >= 200) fail(400, '차단은 200명까지예요');
    await env.DB.prepare('INSERT OR IGNORE INTO blocks (user_id, target_id, at) VALUES (?, ?, ?)').bind(user.id, id, now()).run();
  }
  return json({ ok: true });
}
const REASONS = ['욕설·비하', '도배', '불쾌한 행동', '사칭', '기타'];
async function report(req, env, user) {
  const b = await readBody(req), id = Number(b.id), t = now();
  if (!Number.isInteger(id) || id === user.id || !REASONS.includes(b.reason)) fail(400, '잘못된 요청이에요');
  const target = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first(); if (!target) fail(404, '없는 사람이에요');
  if (await env.DB.prepare('SELECT id FROM reports WHERE reporter_id = ? AND target_id = ? AND at > ?').bind(user.id, id, t - DAY).first()) fail(400, '이미 신고했어요. 김치복님이 확인할 거예요');
  if ((await env.DB.prepare('SELECT COUNT(*) AS n FROM reports WHERE reporter_id = ? AND at > ?').bind(user.id, t - DAY).first()).n >= 10) fail(429, '오늘은 신고를 너무 많이 했어요');
  const lines = (await env.DB.prepare('SELECT ch, text, at FROM chat_log WHERE user_id = ? ORDER BY at DESC LIMIT 20').bind(id).all()).results.reverse();
  await env.DB.prepare('INSERT INTO reports (reporter_id, target_id, reason, lines, at) VALUES (?, ?, ?, ?, ?)').bind(user.id, id, b.reason, JSON.stringify(lines), t).run();
  // 서로 다른 3명 이상이 신고하면 확인 전까지 근처 대화만
  const n = (await env.DB.prepare('SELECT COUNT(DISTINCT reporter_id) AS n FROM reports WHERE target_id = ? AND done = 0').bind(id).first()).n;
  if (n >= 3) await toRooms(env, { act: 'limit', id, on: true });
  return json({ ok: true });
}
// 관리자 화면 (김치복님): 신고함 · 채팅 기록 · 사람 찾기(임시 비밀번호·채팅 금지·내보내기·영구 차단) · 공지
// 관리자 치트 (자기 캐릭터만). k = 종류, n = 숫자
const CHEAT_MAX = 1e9;
function cheat(c, k, b, at, env, user) {
  const n = Math.max(-CHEAT_MAX, Math.min(CHEAT_MAX, Math.round(Number(b.n) || 0))), L = c.life, add = (o, key) => { o[key] = Math.max(0, (o[key] || 0) + n); };
  if (k === 'gold') { c._noEarn = true; c.gold = Math.max(0, c.gold + n); return { msg: `골드 ${n >= 0 ? '+' : ''}${n.toLocaleString()}` }; }
  if (k === 'exp') { c.exp = Math.max(0, c.exp + n); return { msg: `경험치 +${n.toLocaleString()}` }; }
  if (k === 'lv') {
    const lv = Math.max(1, Math.min(LV_CAP, n || 1)); c.lv = lv; c.exp = 0;
    if (totalPoints(lv) < spentPoints(c)) { c.str = c.dex = c.int = c.luk = 5; c.presets = c.presets.map(p => ({ ...p, s: [5, 5, 5, 5] })); }
    c.points = totalPoints(lv) - spentPoints(c); c.hp = derive(c).maxHp; return { msg: `${lv}레벨로 바꿨어요` };
  }
  if (k === 'wood' || k === 'stone') { add(L.res, k); return { msg: `${k === 'wood' ? '목재' : '석재'} +${n}` }; }
  if (k === 'fishCoin' || k === 'farmCoin') { add(L.coins, k === 'fishCoin' ? 'fish' : 'farm'); return { msg: `${k === 'fishCoin' ? '낚시' : '텃밭'} 코인 +${n}` }; }
  if (k === 'pots') { for (const p of ['s', 'l', 'xl']) c.pots[p] = (c.pots[p] || 0) + 50; c.hp = derive(c).maxHp; return { msg: '물약 50개씩 + 체력 가득' }; }
  if (k === 'titles') { L.titles = TITLES.map(x => x.id); return { msg: `칭호 ${TITLES.length}개 모두 받음` }; }
  if (k === 'skins') { c.hats = [...new Set([...c.hats, ...HATS.map(h => h.id), ...EYE_SKINS.filter(e => e.id !== 'dot').map(e => 'eye:' + e.id), ...SUITS.map(s => 'suit:' + s.id), ...WSKINS.map(wskKey)])]; return { msg: '스킨 모두 받음' }; }
  if (k === 'gear') {   // 모든 칸에 최고 단계·최고 등급 + 최고 강화
    const g = Object.keys(GRADES).at(-1);
    for (const slot of Object.keys(SLOTS)) { c.equip[slot] = makeItem(slot, STAGES, g, null, rollOpts(slot, STAGES, g)); c.enh[slot] = ENH_MAX; }
    c.bag = []; c.hp = derive(c).maxHp; return { msg: `모든 칸에 ${STAGES}단계 ${GRADES[g].n} + 강화 ${ENH_MAX}` };
  }
  if (k === 'farm') { for (const p of L.farm.plots) if (p) p.g = 1e9; L.farm.wetAt = 0; return { msg: '텃밭 다 자람 + 물 주기 쿨 초기화' }; }
  if (k === 'work') {
    for (const [w, W] of Object.entries(WORK)) { const x = L.work[w]; if (!x.n) x.n = 1; x.acc = x.n * W.rate * W.cap; x.at = at; }
    return { msg: '벌목소·채광소 창고 가득' };
  }
  if (k === 'cool') {   // 분수·채집·나무·바위·낚시 기다리는 시간 없애기
    L.wishAt = 0; L.gatherAt = 0; L.nodes = {}; L.farm.wetAt = 0; if (c.jobAt) c.jobAt = 1;
    return { msg: '기다리는 시간 모두 없앰', after: () => env.DB.prepare('UPDATE fishing SET last_cast = 0 WHERE user_id = ?').bind(user.id).run() };
  }
  if (k === 'god') { L.god = !L.god; if (L.god) c.hp = derive(c).maxHp; return { msg: L.god ? '갓모드 켬: 안 맞고 공격력 10배' : '갓모드 끔' }; }
  fail(400, '없는 치트예요');
}
// ───────── 홈페이지 모드 추천: 순서 (김치복이 사이트에서 드래그로 바꿈) ─────────
// 저장은 D1 mod_order 표. 사이트는 GET /api/mods-order로 바로 읽어서 적용하고,
// 매일 자동 갱신(scripts/update.mjs mods)이 같은 값을 data/mods.json의 order에도 옮겨 적음
let MOD_ORDER = { at: 0, v: null };
async function modOrderGet(env) {
  if (MOD_ORDER.v && Date.now() - MOD_ORDER.at < 10e3) return MOD_ORDER.v;
  const rows = (await env.DB.prepare('SELECT cat, ids, at FROM mod_order').all()).results;
  const cats = {}; let at = 0;
  for (const r of rows) { try { cats[r.cat] = JSON.parse(r.ids); at = Math.max(at, r.at); } catch {} }
  MOD_ORDER = { at: Date.now(), v: { cats, at } };
  return MOD_ORDER.v;
}
async function modsOrder(req, env, user) {
  if (!user.is_admin) fail(403, '관리자만 쓸 수 있어요');
  const t = await req.text(); if (t.length > 30000) fail(413, '보낸 내용이 너무 커요');
  let b; try { b = JSON.parse(t); } catch { fail(400, '잘못된 요청이에요'); }
  // groups = [[소분류, [모드 id…]], …] (소분류 순서 → 그 안의 모드 순서). 다른 소분류로 옮긴 것도 여기에 담김
  const cat = String(b?.cat || '').slice(0, 40), groups = Array.isArray(b?.groups) ? b.groups : null;
  // del = 사이트에서 지운 모드 id들 (그 시각보다 나중에 다시 추가한 모드는 다시 보임)
  if (!cat || !groups || groups.length > 60) fail(400, '잘못된 요청이에요');
  const clean = groups.map(g => [String(g?.[0] || '').trim().slice(0, 60), Array.isArray(g?.[1]) ? g[1].map(x => String(x).slice(0, 80)) : []]);
  const ids = clean.flatMap(g => g[1]);
  const delIds = [...new Set((Array.isArray(b?.del) ? b.del : []).map(x => String(x).slice(0, 80)))].slice(-500);
  if (clean.some(g => !g[0] || !g[1].length) || ids.length > 500 || new Set(ids).size !== ids.length || delIds.some(id => ids.includes(id)) || !(ids.length + delIds.length)) fail(400, '잘못된 요청이에요');
  const old = await env.DB.prepare('SELECT ids FROM mod_order WHERE cat = ?').bind(cat).first();
  let oldDel = {}; try { const v = JSON.parse(old?.ids || 'null'); if (v && !Array.isArray(v) && v.del) oldDel = v.del; } catch {}
  const t0 = now(), del = Object.create(null);
  for (const id of delIds) del[id] = own(oldDel, id) ? oldDel[id] : t0;
  await env.DB.prepare('INSERT INTO mod_order (cat, ids, at) VALUES (?, ?, ?) ON CONFLICT(cat) DO UPDATE SET ids = excluded.ids, at = excluded.at').bind(cat, JSON.stringify({ g: clean, del }), t0).run();
  MOD_ORDER.at = 0;
  await log(env, user.id, 'admin-mods-order', `${cat} ${ids.length}${delIds.length ? ` 지움 ${delIds.length}` : ''}`);
  return json({ ok: true });
}

async function admin(p, m, req, env, user, url) {
  if (!user.is_admin) fail(403, '관리자만 쓸 수 있어요');
  const DB = env.DB, t = now(), q = k => url.searchParams.get(k) || '';
  const body = m === 'POST' ? await readBody(req) : {}, id = Number(body.id);
  const userOf = async uid => { const u = await DB.prepare('SELECT id, nick FROM users WHERE id = ?').bind(uid).first(); if (!u) fail(404, '없는 사람이에요'); return u; };
  const done = async (kind, detail) => DB.prepare('INSERT INTO activity (user_id, kind, detail, at) VALUES (?, ?, ?, ?)').bind(user.id, 'admin-' + kind, detail, t).run();
  if (m === 'POST' && p === '/api/admin/live') {   // 방송 보너스를 정해진 분만큼 켬 (0 = 끔)
    const min = Math.max(0, Math.min(600, Math.floor(Number(body.min) || 0)));
    await DB.prepare('UPDATE village SET live_until = ? WHERE id = 1').bind(min ? t + min * 60e3 : 0).run(); WORLD.at = 0; await done('live', String(min));
    return json({ ok: true, until: min ? t + min * 60e3 : 0 });
  }
  if (m === 'POST' && p === '/api/admin/raid') {   // 지금부터 30초 모집하는 레이드를 엶 (시험용)
    const res = await raidDO(env).fetch('https://raid/force', { method: 'POST' }), j = await res.json(); if (!res.ok) fail(400, j.error);
    await toRooms(env, { act: 'raid', start: j.start }); await done('raid', String(j.start));
    return json({ ok: true, start: j.start });
  }
  if (m === 'POST' && p === '/api/admin/cheat') {
    const k = String(body.k || ''); await done('cheat', `${k} ${body.n ?? ''}`.trim());
    return play(env, user, (c, at) => cheat(c, k, body, at, env, user));
  }
  if (m === 'GET' && p === '/api/admin/reports') {
    const rows = (await DB.prepare(`SELECT r.*, a.nick AS reporter, b.nick AS target FROM reports r JOIN users a ON a.id = r.reporter_id JOIN users b ON b.id = r.target_id
      WHERE r.done = ? ORDER BY r.at DESC LIMIT 100`).bind(q('done') === '1' ? 1 : 0).all()).results;
    return json({ reports: rows.map(r => ({ ...r, lines: JSON.parse(r.lines) })) });
  }
  if (m === 'POST' && p === '/api/admin/report-done') {
    const r = await DB.prepare('SELECT target_id FROM reports WHERE id = ?').bind(id).first(); if (!r) fail(404, '없는 신고예요');
    await DB.prepare('UPDATE reports SET done = 1, note = ? WHERE target_id = ? AND done = 0').bind(String(body.note || '').slice(0, 100), r.target_id).run();
    await toRooms(env, { act: 'limit', id: r.target_id, on: false });
    await done('report', String(r.target_id)); return json({ ok: true });
  }
  if (m === 'GET' && p === '/api/admin/chat') {
    const nick = q('nick').toLowerCase(), text = q('q');
    const u = nick ? await DB.prepare('SELECT id FROM users WHERE nick_key = ?').bind(nick).first() : null;
    if (nick && !u) return json({ lines: [] });
    const rows = (await DB.prepare(`SELECT nick, ch, text, at FROM chat_log WHERE (? = 0 OR user_id = ?) AND (? = '' OR text LIKE ?) ORDER BY at DESC LIMIT 200`)
      .bind(u ? 1 : 0, u?.id || 0, text, `%${text}%`).all()).results;
    return json({ lines: rows });
  }
  if (m === 'GET' && p === '/api/admin/user') {
    const u = await DB.prepare('SELECT u.id, u.nick, u.created_at, u.last_login, u.banned, u.mute_until, u.is_admin, c.lv FROM users u LEFT JOIN characters c ON c.user_id = u.id WHERE u.nick_key = ?').bind(q('nick').toLowerCase()).first();
    if (!u) fail(404, '그 닉네임은 없어요');
    const w = await DB.prepare('SELECT COUNT(*) AS n FROM warnings WHERE user_id = ? AND at > ?').bind(u.id, t - 7 * DAY).first();
    const r = await DB.prepare('SELECT COUNT(*) AS n FROM reports WHERE target_id = ? AND done = 0').bind(u.id).first();
    return json({ user: { ...u, warns: w.n, reports: r.n } });
  }
  if (m === 'POST' && p === '/api/admin/temp-pw') {   // 비밀번호·복구 코드를 다 잊은 사람에게 임시 비밀번호
    const u = await userOf(id), abc = 'abcdefghjkmnpqrstuvwxyz', dig = '23456789', r = crypto.getRandomValues(new Uint8Array(8));
    const pw = 'cb' + [...r.slice(0, 5)].map(x => abc[x % abc.length]).join('') + [...r.slice(5)].map(x => dig[x % dig.length]).join('');
    const salt = randB64(16);
    await DB.batch([
      DB.prepare('UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ?, fail_count = 0, lock_until = 0 WHERE id = ?').bind(await pbkdf2(pw, salt, PBKDF2_ITER), salt, PBKDF2_ITER, u.id),
      DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(u.id),
    ]);
    await done('temp-pw', u.nick); return json({ pw, nick: u.nick });
  }
  if (m === 'POST' && p === '/api/admin/mute') {
    const u = await userOf(id), min = Math.max(0, Math.min(10080, Number(body.min) || 0)), until = min ? t + min * 60e3 : 0;
    await DB.prepare('UPDATE users SET mute_until = ? WHERE id = ?').bind(until, u.id).run();
    await toRooms(env, { act: 'mute', id: u.id, until }); await done('mute', `${u.nick} ${min}`); return json({ ok: true, until });
  }
  if (m === 'POST' && p === '/api/admin/kick') { const u = await userOf(id); await toRooms(env, { act: 'kick', id: u.id }); await done('kick', u.nick); return json({ ok: true }); }
  if (m === 'POST' && p === '/api/admin/ban') {
    const u = await userOf(id), on = !!body.on; if (u.id === user.id) fail(400, '자기 자신은 막을 수 없어요');
    await DB.prepare('UPDATE users SET banned = ? WHERE id = ?').bind(on ? 1 : 0, u.id).run();
    if (on) { await DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(u.id).run(); await toRooms(env, { act: 'kick', id: u.id, why: '이용이 정지됐어요' }); }
    await done('ban', `${u.nick} ${on}`); return json({ ok: true });
  }
  if (m === 'POST' && p === '/api/admin/notice') {
    const text = String(body.text || '').trim().slice(0, 100); if (!text) fail(400, '공지 내용을 써 주세요');
    await toRooms(env, { act: 'notice', text }); await done('notice', text); return json({ ok: true });
  }
  fail(404, '없는 주소예요');
}
