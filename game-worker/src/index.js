// 치복 타운 서버 (Cloudflare Worker + D1) — 1단계: 계정 · 로그인 · 저장 / 2단계: 사냥 · 상점 · 강화
// 계산과 검사는 전부 서버가 함. 화면이 보낸 숫자는 믿지 않음.
import { nickChecks, pwChecks, allOk, newCharacter, derive, makeItem, FACES, BODIES, EYES, MW, MH, T, STATS, SLOTS, WTYPES, TIERS, HATS, EYE_SKINS, POTS, FIELDS, BAG_MAX, ENH_COST, ENH_RATE, HUNT, spentPoints, itemName, enhRate, JOB, FISHING, FISH_GRADES, rollFish } from '../../assets/js/game-rules.js';
import { scanBad } from './filter.js';
import { startHunt, settle, summary } from './hunt.js';

const ORIGINS = ['https://kimchibok75-code.github.io', 'http://localhost:5173', 'http://127.0.0.1:5173'];
const PBKDF2_ITER = 30000;            // 비밀번호 해시 반복 횟수 (무료 요금제 CPU 한도 안에서)
const DAY = 864e5;
const LOCK_FAILS = 5, LOCK_MS = 10 * 60e3;
const SIGNUP_PER_HOUR = 3;

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const fail = (status, msg) => { throw new HttpError(status, msg); };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = { 'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0], 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
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
  if (p === '/' || p === '/api/health') return json({ ok: true, name: '치복 타운 서버', stage: 2 });
  if (m === 'POST' && p === '/api/signup') return signup(req, env);
  if (m === 'POST' && p === '/api/login') return login(req, env);
  if (m === 'POST' && p === '/api/recover') return recover(req, env);
  const s = await auth(req, env);
  if (m === 'GET' && p === '/api/me') return play(env, s.user, dailyBonus);
  if (m === 'POST' && p === '/api/logout') { await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(s.tokenHash).run(); return json({ ok: true }); }
  if (m === 'POST' && p === '/api/character') return saveLook(req, env, s.user);
  if (m === 'POST' && p === '/api/move') return saveMove(req, env, s.user);
  if (m === 'GET' && p === '/api/fish/rank') return fishRank(env, s.user);
  if (m === 'POST' && p === '/api/fish/reel') return fishReel(req, env, s.user);
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
function lockedMsg(user) { const left = user.lock_until - now(); return left > 0 ? `여러 번 틀려서 잠겼어요. ${Math.ceil(left / 60e3)}분 뒤에 다시 해 주세요` : null; }
async function countFail(env, user) {
  const n = user.fail_count + 1;
  if (n >= LOCK_FAILS) { await env.DB.prepare('UPDATE users SET fail_count = 0, lock_until = ? WHERE id = ?').bind(now() + LOCK_MS, user.id).run(); return `${LOCK_FAILS}번 틀려서 10분 동안 잠겼어요`; }
  await env.DB.prepare('UPDATE users SET fail_count = ? WHERE id = ?').bind(n, user.id).run();
  return n;
}
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
  const locked = lockedMsg(user); if (locked) fail(429, locked);
  if (!(await checkPw(user, b.pw))) { const r = await countFail(env, user); fail(401, typeof r === 'string' ? r : `닉네임 또는 비밀번호가 맞지 않아요 (${r}/${LOCK_FAILS})`); }
  if (user.banned) fail(403, '이용이 정지된 계정이에요. 김치복 디스코드나 팬 카페로 문의해 주세요');
  await env.DB.prepare('UPDATE users SET fail_count = 0, lock_until = 0, last_login = ? WHERE id = ?').bind(now(), user.id).run();
  await log(env, user.id, 'login');
  return json({ token: await newSession(env, user.id, !!b.keep), me: await loadMe(env, user) });
}
async function recover(req, env) {
  const b = await readBody(req), user = await findUser(env, b.nick);
  if (!user) fail(401, '닉네임 또는 복구 코드가 맞지 않아요');
  const locked = lockedMsg(user); if (locked) fail(429, locked);
  if (normCode(b.code).length !== 12 || !same(await sha256(normCode(b.code)), user.rec_hash)) { const r = await countFail(env, user); fail(401, typeof r === 'string' ? r : `닉네임 또는 복구 코드가 맞지 않아요 (${r}/${LOCK_FAILS})`); }
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
  return { face: r.face, body: r.body, eyes: r.eyes, hat: r.hat, intro: r.intro, title: r.title, x: r.x, y: r.y, lv: r.lv, exp: r.exp, gold: r.gold,
    str: r.s_str, dex: r.s_dex, int: r.s_int, luk: r.s_luk, points: r.points, hp: r.hp, hpAt: r.hp_at,
    equip: JSON.parse(r.equip), bag: JSON.parse(r.bag), hats: JSON.parse(r.hats), pots: JSON.parse(r.pots), potAt: r.pot_at,
    hunt: r.hunt ? JSON.parse(r.hunt) : null, bonusDay: r.bonus_day, jobAt: r.job_at, ver: r.ver };
}
function meOut(user, c) {
  const h = c.hunt;
  return {
    nick: user.nick, admin: !!user.is_admin,
    char: { face: c.face, body: c.body, eyes: c.eyes, hat: c.hat, intro: c.intro, title: c.title, x: c.x, y: c.y, lv: c.lv, exp: c.exp, gold: c.gold,
      str: c.str, dex: c.dex, int: c.int, luk: c.luk, points: c.points, hp: c.hp, equip: c.equip, bag: c.bag, hats: c.hats, pots: c.pots, potAt: c.potAt,
      hunt: h ? { f: h.f, start: h.start, t: Math.round(h.t), boss: h.boss, kills: h.kills, exp: h.exp, gold: h.gold, drops: h.drops } : null,
      job: c.jobAt ? { left: Math.max(0, Math.ceil((c.jobAt + JOB.sec * 1000 - Date.now()) / 1000)), pay: JOB.pay(c.lv) } : null },
  };
}
async function loadMe(env, user) {
  const r = await env.DB.prepare('SELECT * FROM characters WHERE user_id = ?').bind(user.id).first();
  return meOut(user, toChar(r));
}
// 캐릭터를 읽고 → 사냥 정산 → 바꾸고 → 저장. 그 사이 다른 요청이 먼저 바꿨으면(ver가 다르면) 처음부터 다시
async function play(env, user, fn) {
  for (let tries = 0; tries < 4; tries++) {
    const r = await env.DB.prepare('SELECT * FROM characters WHERE user_id = ?').bind(user.id).first();
    const c = toChar(r), at = now(), out = {};
    if (!c.hunt) {   // 마을: 체력이 1초에 2%씩 참
      const max = derive(c).maxHp;
      c.hp = Math.min(max, Math.round(c.hp + Math.max(0, (at - (c.hpAt || at)) / 1000) * max * HUNT.townRegen)); c.hpAt = at;
    } else out.hunt = settle(c, at);
    const res = (await fn(c, at, out)) || {};
    const w = await env.DB.prepare(`UPDATE characters SET title = ?, x = ?, y = ?, lv = ?, exp = ?, gold = ?, s_str = ?, s_dex = ?, s_int = ?, s_luk = ?, points = ?, hp = ?, hp_at = ?,
        equip = ?, bag = ?, hats = ?, hat = ?, eyes = ?, pots = ?, pot_at = ?, hunt = ?, bonus_day = ?, job_at = ?, ver = ver + 1, updated_at = ? WHERE user_id = ? AND ver = ?`)
      .bind(c.title, c.x, c.y, c.lv, c.exp, c.gold, c.str, c.dex, c.int, c.luk, c.points, c.hp, c.hpAt, JSON.stringify(c.equip), JSON.stringify(c.bag), JSON.stringify(c.hats), c.hat, c.eyes,
        JSON.stringify(c.pots), c.potAt, c.hunt ? JSON.stringify(c.hunt) : '', c.bonusDay, c.jobAt || 0, at, user.id, c.ver).run();
    if (w.meta.changes) {
      if (res.log) await log(env, user.id, res.log[0], res.log[1] || '');
      if (res.after) await res.after();   // 캐릭터 저장이 끝난 뒤 할 일 (낚시 기록 등)
      delete res.log; delete res.after;
      return json({ me: meOut(user, c), ...out, ...res });
    }
  }
  fail(409, '동시에 여러 요청이 왔어요. 잠시 뒤에 다시 해 주세요');
}
// 매일 첫 접속 보너스 (레벨 × 20), 한국 날짜 기준
function dailyBonus(c, at) {
  const day = new Date(at + 9 * 3600e3).toISOString().slice(0, 10);
  if (c.bonusDay === day) return;
  c.bonusDay = day; const g = c.lv * 20; c.gold += g;
  return { bonus: g };
}
const spend = (c, n) => { if (c.gold < n) fail(400, '골드가 부족해요'); c.gold -= n; };
const findBag = (c, id) => { const i = c.bag.findIndex(it => it.id === String(id)); if (i < 0) fail(400, '가방에 없는 장비예요'); return i; };
const townOnly = c => { if (c.hunt) fail(400, '사냥 중에는 할 수 없어요. 마을로 돌아온 뒤에 해 주세요'); };
const notWorking = c => { if (c.jobAt) fail(400, '카페 알바 중이에요. 알바를 끝내거나 그만둔 뒤에 해 주세요'); };
const sellPrice = it => Math.round(it.price * .3);

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
      c.gold = Math.max(0, c.gold - lost); c.hunt = null; c.hp = Math.round(derive(c).maxHp * .3); c.hpAt = at; c.x = 36.5 * T; c.y = 14.5 * T;
      out.hunt = { ...(out.hunt || { kills: 0, exp: 0, gold: 0, drops: [], pots: 0 }), died: true, lost, summary: summary(h, at) };
      return { summary: null, log: ['hunt-died', `${FIELDS[h.f].n} -${lost}g`] };
    }
    const sum = summary(c.hunt, at);
    c.hunt = null; c.hpAt = at; c.x = 36.5 * T; c.y = 14.5 * T;
    return { summary: sum, log: ['hunt-end', `${FIELDS[sum.f].n} ${sum.kills}마리 +${sum.exp}exp +${sum.gold}g`] };
  },
  // 카페
  '/api/pots'(c, b) {
    const k = b.k, n = Number(b.n);
    if (!POTS[k] || ![1, 5, 10].includes(n)) fail(400, '잘못된 요청이에요');
    if (c.pots[k] + n > 999) fail(400, '물약은 종류마다 999개까지예요');
    spend(c, POTS[k].price * n); c.pots[k] += n;
  },
  '/api/rest'(c) { townOnly(c); c.hp = derive(c).maxHp; },
  '/api/pot-at'(c, b) { const v = Number(b.v); if (!Number.isInteger(v) || v < 10 || v > 90) fail(400, '10~90 사이로 정해 주세요'); c.potAt = v; },
  // 무기점 · 방어구점: 일반 등급 장비. 사면 바로 장착, 쓰던 건 가방으로
  '/api/shop/buy'(c, b) {
    townOnly(c);
    const slot = b.slot, tier = Number(b.tier);
    if (!SLOTS[slot] || !Number.isInteger(tier) || !TIERS[tier]) fail(400, '없는 물건이에요');
    if (c.lv < TIERS[tier].req) fail(400, `Lv.${TIERS[tier].req}부터 살 수 있어요`);
    if (slot === 'weapon' && !WTYPES[b.wt]) fail(400, '없는 무기예요');
    if (slot === 'acc' && !STATS[b.stat]) fail(400, '없는 반지예요');
    const it = makeItem(slot, tier, { wt: b.wt, stat: b.stat });
    if (c.equip[slot] && c.bag.length >= BAG_MAX) fail(400, '가방이 가득 찼어요. 먼저 장비를 팔아 주세요');
    spend(c, it.price);
    if (c.equip[slot]) c.bag.push(c.equip[slot]);
    c.equip[slot] = it; c.hp = Math.min(c.hp, derive(c).maxHp);
    return { item: it, log: ['buy', `${itemName(it)} -${it.price}`] };
  },
  '/api/sell'(c, b) {
    townOnly(c);
    const ids = Array.isArray(b.ids) ? b.ids.slice(0, BAG_MAX).map(String) : [];
    if (!ids.length) fail(400, '팔 장비를 골라 주세요');
    let got = 0, n = 0;
    for (const id of new Set(ids)) { const i = c.bag.findIndex(it => it.id === id); if (i < 0) continue; got += sellPrice(c.bag[i]); c.bag.splice(i, 1); n++; }
    if (!n) fail(400, '가방에 없는 장비예요');
    c.gold += got;
    return { got, n, log: ['sell', `${n}개 +${got}`] };
  },
  '/api/equip'(c, b) {
    const i = findBag(c, b.id), it = c.bag[i];
    if (c.lv < TIERS[it.tier].req) fail(400, `Lv.${TIERS[it.tier].req}부터 낄 수 있어요`);
    c.bag.splice(i, 1);
    if (c.equip[it.slot]) c.bag.push(c.equip[it.slot]);
    c.equip[it.slot] = it; c.hp = Math.min(c.hp, derive(c).maxHp);
  },
  '/api/unequip'(c, b) {
    if (!SLOTS[b.slot] || !c.equip[b.slot]) fail(400, '빈 칸이에요');
    if (c.bag.length >= BAG_MAX) fail(400, '가방이 가득 찼어요');
    c.bag.push(c.equip[b.slot]); c.equip[b.slot] = null; c.hp = Math.min(c.hp, derive(c).maxHp);
  },
  // 대장간
  '/api/enhance'(c, b) {
    townOnly(c);
    const slot = Object.keys(c.equip).find(k => c.equip[k]?.id === String(b.id));
    const it = slot ? c.equip[slot] : c.bag[findBag(c, b.id)];
    if (it.enh >= 10) fail(400, '이미 최대 강화(+10)예요');
    const cost = TIERS[it.tier].req * ENH_COST[it.enh];
    spend(c, cost);
    const ok = Math.random() * 100 < enhRate(it.enh, derive(c));   // 운이 높으면 성공 확률 조금 더
    if (ok) it.enh++;   // 실패해도 단계가 떨어지거나 부서지지 않음 (골드만 사라짐)
    return { ok, item: it, log: ['enhance', `${itemName(it)} ${ok ? '성공' : '실패'} -${cost}`] };
  },
  '/api/reset-stats'(c) {   // 캐릭터창 → 능력치에서 (사냥 중에도 가능)
    const n = spentPoints(c); if (!n) fail(400, '찍은 포인트가 없어요');
    spend(c, c.lv * 100);
    c.points += n; c.str = c.dex = c.int = c.luk = 5; c.hp = Math.min(c.hp, derive(c).maxHp);
    return { n, log: ['reset-stats', String(n)] };
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
    const h = HATS.find(x => x.id === id && x.id !== 'none'); if (!h) fail(400, '없는 스킨이에요');
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
    const pay = JOB.pay(c.lv); c.gold += pay; c.jobAt = 0;
    return { pay, log: ['job', String(pay)] };
  },
  '/api/job/quit'(c) { c.jobAt = 0; },
  // 낚시: 던질 때 서버가 어떤 물고기가 물지 미리 정해 둠 (화면은 등급에 맞는 미니게임만 받음)
  async '/api/fish/cast'(c, b, at, out, env, user) {
    townOnly(c); notWorking(c);
    const row = await env.DB.prepare('SELECT last_cast FROM fishing WHERE user_id = ?').bind(user.id).first();
    const left = Math.ceil(((row?.last_cast || 0) + FISHING.cooldown - at) / 1000);
    if (left > 0) fail(429, `너무 빨라요. ${left}초 뒤에 다시 던질 수 있어요`);
    const fish = rollFish(derive(c).luk), wait = Math.round(FISHING.waitMin + Math.random() * (FISHING.waitMax - FISHING.waitMin)), gd = FISH_GRADES[fish.grade];
    const cast = JSON.stringify({ fish, biteAt: at + wait });
    return { wait, zone: gd.zone, speed: gd.speed, strong: ['rare', 'epic', 'legend'].includes(fish.grade), cooldown: FISHING.cooldown,
      after: () => env.DB.prepare('INSERT INTO fishing (user_id, bait, last_cast) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET bait = excluded.bait, last_cast = excluded.last_cast').bind(user.id, cast, at).run() };
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
  let intro = null;
  if (typeof b.intro === 'string') {
    intro = b.intro.replace(/\s+/g, ' ').trim();
    if ([...intro].length > 30) fail(400, '한 줄 소개는 30글자까지예요');
    const r = scanBad(intro); if (r.hard) fail(400, '한 줄 소개에 쓸 수 없는 말이 있어요'); intro = r.text;
  }
  // ver + 1: 같은 때 다른 요청(사냥 정산 등)이 옛 값으로 덮어쓰지 않게
  await env.DB.prepare('UPDATE characters SET face = COALESCE(?, face), body = COALESCE(?, body), eyes = COALESCE(?, eyes), hat = COALESCE(?, hat), intro = COALESCE(?, intro), ver = ver + 1, updated_at = ? WHERE user_id = ?')
    .bind(face, body, eyes, hat, intro, now(), user.id).run();
  return json({ me: await loadMe(env, user) });
}
async function saveMove(req, env, user) {
  const b = await readBody(req), x = Number(b.x), y = Number(b.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) fail(400, '위치가 이상해요');
  const cx = Math.max(T / 2, Math.min(MW * T - T / 2, x)), cy = Math.max(T / 2, Math.min(MH * T - T / 2, y));
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

// 낚시: 당기기. 던진 기록을 먼저 지워서(한 번만 쓸 수 있게) 같은 물고기를 두 번 받지 못하게 함
async function fishReel(req, env, user) {
  const b = await readBody(req), at = now();
  // RETURNING은 바뀐 뒤 값(빈칸)을 돌려주므로, 먼저 읽고 → 그 값일 때만 지우기 (동시에 두 번 오면 하나만 성공)
  const row = await env.DB.prepare('SELECT bait FROM fishing WHERE user_id = ?').bind(user.id).first();
  if (!row?.bait) fail(400, '먼저 낚싯대를 던져 주세요');
  const del = await env.DB.prepare("UPDATE fishing SET bait = '' WHERE user_id = ? AND bait = ?").bind(user.id, row.bait).run();
  if (!del.meta.changes) fail(400, '먼저 낚싯대를 던져 주세요');
  const { fish, biteAt } = JSON.parse(row.bait);
  let why = null;
  if (at < biteAt) why = 'early';                                  // 입질 전에 당김
  else if (at > biteAt + FISHING.window) why = 'late';             // 너무 늦음
  else if (!b.hit) why = 'miss';                                   // 타이밍을 못 맞춤
  if (why) return play(env, user, () => ({ caught: false, why, fish: { i: fish.i, n: fish.n, grade: fish.grade } }));
  const price = Math.round(fish.price * (b.perfect ? FISHING.perfect : 1)), info = JSON.stringify({ i: fish.i, n: fish.n, grade: fish.grade, len: fish.len, price });
  return play(env, user, c => {
    c.gold += price;   // 낚은 물고기는 바로 팔림
    return { caught: true, fish: { ...fish, price }, perfect: !!b.perfect,
      after: () => env.DB.prepare(`UPDATE fishing SET count = count + 1, gold = gold + ?,
          best_price_fish = CASE WHEN ? > best_price THEN ? ELSE best_price_fish END, best_price = MAX(best_price, ?),
          best_len_fish = CASE WHEN ? > best_len THEN ? ELSE best_len_fish END, best_len = MAX(best_len, ?) WHERE user_id = ?`)
        .bind(price, price, info, price, fish.len, info, fish.len, user.id).run() };
  });
}
// 낚시 순위: 제일 비싼 물고기 · 제일 큰 물고기 · 제일 많이 낚은 사람 (각 10명)
async function fishRank(env, user) {
  const q = (order, where) => env.DB.prepare(`SELECT u.nick, f.count, f.best_price_fish, f.best_len_fish FROM fishing f JOIN users u ON u.id = f.user_id WHERE ${where} AND u.banned = 0 ORDER BY ${order} DESC LIMIT 10`);
  const [price, len, count, mine] = await env.DB.batch([q('f.best_price', 'f.best_price > 0'), q('f.best_len', 'f.best_len > 0'), q('f.count', 'f.count > 0'),
    env.DB.prepare('SELECT count, gold, best_price_fish, best_len_fish FROM fishing WHERE user_id = ?').bind(user.id)]);
  const fish = s => (s ? JSON.parse(s) : null);
  const rows = r => r.results.map(x => ({ nick: x.nick, count: x.count, price: fish(x.best_price_fish), len: fish(x.best_len_fish) }));
  const m = mine.results[0];
  return json({ price: rows(price), len: rows(len), count: rows(count), mine: m ? { count: m.count, gold: m.gold, price: fish(m.best_price_fish), len: fish(m.best_len_fish) } : null, cooldown: FISHING.cooldown });
}
