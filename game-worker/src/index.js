// 치복 타운 서버 (Cloudflare Worker + D1) — 1단계: 계정 · 로그인 · 저장 / 2단계: 사냥 · 상점 · 강화
// 계산과 검사는 전부 서버가 함. 화면이 보낸 숫자는 믿지 않음.
import { INCENSE, SAVER, saverLife, jobGuests, CAFE, cafeLv, cafeGain, GUIDE_Q, GUIDE_MARKS, guideQ, guideProg, guideInit, guideNext, npcExp as guideExp, TAG_COLORS, RODS, BAITS, KINGS, kingNext, kingNeed, kingGoal, kingReady, hasBadge, fkItem, OWNER_NICK, jobTips, nickChecks, pwChecks, allOk, newCharacter, derive, makeItem, FACES, BODIES, HAIRS, hairId, HAIR_COLORS, EYES, MW, MH, T, STATS, SLOTS, CLASSES, HATS, EYE_SKINS, SUITS, WSKINS, wskKey, POTS, FIELDS, ENH_COST, ENH_MAX, HUNT, spentPoints, itemName, enhRate, JOB, FISHING, rollFish, fishHit, isBigFish,
  GACHA, GACHA_TEN, gachaInfo, rollGacha, itemPower, dismantle, GRADES, PRESETS, defaultPresets, totalPoints,
  fixLife, cntAdd, checkTitles, titleOf, FISH_SHOP, FISH_BY, FISH_BAG, FISH_COIN_GOLD, FISH_PRICE_MAX, FG_KEYS, CROP_BY, HOES, FERTS, FARM, farmPlots, rollCrop, isBigCrop, FARM_COIN_GOLD, GATHER, WORK, workSettle, HOUSE, WISH, rollWish, wishGold, wishExp, START, LV_CAP, TITLES, rollOpts, STAGES,
  SKILLS, SK_RARE, SK_NEED, SK_MAX, skLv, SKILL_GACHA, skGachaInfo, rollSkill,
  offlineLife, offlineHuntAway, PRESET_CD, dayKey, dailyState, checkDaily, eventNow, worldFx, VILLAGE, giveScore, liveGift, fxText, addExp, RAID, RAID_BOSS, raidReward, raidCrowd, raidDps, raidSet, autoSettle, lifeExp, RSK, rskCount, rskLv, HOUSE_TIERS, houseSettle, NPC_MAX, npcBlk, npcList, npcState, npcProg, npcActive, npcGold, npcExp, fishWait, fishCasts } from '../../assets/js/game-rules.js';
import { isSolid, NODES, BACK, tileAt, WATER, waterIn, seaAt, shadowAt, FSHADOW } from '../../assets/js/game-map.js';
import { canHouseD } from '../../assets/js/game-dong.js';
import { scanBad } from './filter.js';
import { startHunt, settle, summary } from './hunt.js';
import { Town, MAX_CH, toRooms, lookRow } from './town.js';
export { Town };
import { Chzzk } from './chzzk.js';
export { Chzzk };
import { Raid } from './raid.js';
import { maintGet, maintSet, MAINT_MSG } from './maint.js';
import { track, bumpReject, scan, snapAll, restore, groups, hash as gHash, devOf } from './guard.js';
export { Raid };
const raidDO = env => env.RAID.get(env.RAID.idFromName('main'));   // 레이드 방은 하나

const ORIGINS = ['https://kimchibok75-code.github.io', 'https://kimchibok.com', 'https://www.kimchibok.com', 'http://localhost:5173', 'http://127.0.0.1:5173'];
const TERMS_VER = '2026-11-18';   // 가입 안내(개인 팬 게임·수익 없음·언제든 바뀜·운영 미흡) 판. 화면 game.html의 TERMS_VER와 같게
const PBKDF2_ITER = 30000;            // 비밀번호 해시 반복 횟수 (무료 요금제 CPU 한도 안에서)
const DAY = 864e5;
const LOCK_FAILS = 5, LOCK_MS = 10 * 60e3;
const SIGNUP_IP_DAY = 3, SIGNUP_DEV_WEEK = 1;   // 2026-11-20 가입 제한: 같은 IP 하루 3개 · 같은 기기(브라우저) 일주일 1개
const kTime = t => { const d = new Date(t + 9 * 3600e3); return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const fail = (status, msg) => { throw new HttpError(status, msg); };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export default {
  // 5분마다: 치지직 채팅 연결 담당(Chzzk)을 깨움. 그 뒤로는 Chzzk가 알아서 1분(방송 중 20초)마다 확인
  async scheduled(ev, env, ctx) {
    ctx.waitUntil(env.CHZZK.get(env.CHZZK.idFromName('main')).fetch('https://chzzk/tick').catch(() => {}));
    // 2026-11-20 한 시간에 한 번 (정각 뒤 첫 5분): 오래된 기록 지우기 (활동 90일 · 연대기 60일 · 끝난 로그인 · 가입 기록 3일)
    if (new Date(ev.scheduledTime || Date.now()).getUTCMinutes() < 5) {
      const t = Date.now(), d = 864e5;
      ctx.waitUntil(env.DB.batch([
        env.DB.prepare('DELETE FROM activity WHERE at < ?').bind(t - 90 * d),
        env.DB.prepare('DELETE FROM chronicle WHERE at < ?').bind(t - 60 * d),
        env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(t),
        env.DB.prepare('DELETE FROM signups WHERE at < ?').bind(t - 8 * d),   // 기기 가입 제한(일주일) 때문에 8일 보관
        env.DB.prepare('DELETE FROM access WHERE last_at < ?').bind(t - 60 * d),
      ]).catch(() => {}));
      ctx.waitUntil(scan(env).catch(e => console.error('scan', e?.stack || e)));   // 2026-11-20 어뷰징 감시 (한 시간마다)
      if (new Date(t + 9 * 3600e3).getUTCHours() === 4) ctx.waitUntil(snapAll(env, dayKey(t)).catch(e => console.error('snap', e?.stack || e)));   // 매일 새벽 4시 캐릭터 사본
    }
  },
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = { 'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0], 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Dev', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
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
      else if (/exceeded D1's free tier|free tier daily/i.test(String(e))) { D1_FULL = Date.now(); res = json({ error: '오늘 무료 서버를 다 썼어요. 오전 9시에 다시 열려요', limit: 1 }, 429); }   // 2026-11-21 D1 무료 한도(하루 쓰기) 초과 → 화면이 한도 안내를 띄움
      else { console.error(e?.stack || String(e)); res = json({ error: '서버에 문제가 생겼어요. 잠시 뒤에 다시 해 주세요' }, 500); }
    }
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  },
};

async function route(req, env, url) {
  const p = url.pathname, m = req.method;
  if (p === '/' || p === '/api/health') { const M = await maintGet(env); return json({ ok: true, name: '치복 타운 서버', stage: 4, maint: M.on ? (M.msg || MAINT_MSG) : '', full: Date.now() - D1_FULL < 10 * 60e3 ? 1 : 0 }); }   // full = 최근 10분 안에 D1 한도 초과를 봄
  if (m === 'GET' && p === '/api/mods-order') return json(await modOrderGet(env));   // 누구나 읽기 (홈페이지 모드 추천 순서)
  if (m === 'POST' && p === '/api/signup') return signup(req, env);
  if (m === 'POST' && p === '/api/login') return login(req, env);
  if (m === 'POST' && p === '/api/recover') return recover(req, env);
  const s = await auth(req, env);
  if (!s.user.is_admin) { const M = await maintGet(env); if (M.on) fail(503, M.msg || MAINT_MSG); }   // 2026-11-20 점검 중(관리자만 접속 가능)
  if (m === 'GET' && p === '/api/me') { await track(env, s.user.id, req); return play(env, s.user, async (c, at, out) => { const r = dailyBonus(c, at); if (s.user.is_admin) out.adm = await admCounts(env); return r; }); }
  if (m === 'POST' && p === '/api/logout') { await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(s.tokenHash).run(); return json({ ok: true }); }
  if (m === 'POST' && p === '/api/character') return saveLook(req, env, s.user);
  if (m === 'POST' && p === '/api/move') return saveMove(req, env, s.user);
  if (m === 'GET' && p === '/api/fish/rank') return fishRank(env, s.user);
  if (m === 'GET' && p === '/api/farm/rank') return farmRank(env, s.user);
  if (m === 'GET' && p === '/api/chzzk/check') return chzzkCheck(env, s.user);
  if (m === 'GET' && p === '/api/rank') return rankList(env, s.user, url.searchParams.get('k'));
  if (m === 'GET' && p === '/api/houses') return json({ houses: (await env.DB.prepare('SELECT h.user_id AS id, u.nick, h.x, h.y, h.roof, h.lv FROM houses h JOIN users u ON u.id = h.user_id WHERE u.banned = 0').all()).results });
  if (m === 'GET' && p === '/api/news') return json(await news(env));
  if (m === 'GET' && p === '/api/fountain') return json(await fountain(env));   // 2026-11-21 분수 잭팟 금액 · 역대 당첨자
  if (m === 'GET' && p === '/api/raid') { const j = await (await raidDO(env).fetch('https://raid/state')).json(); return json({ ...j, now: now() }); }
  if (m === 'GET' && p === '/api/whoami') return json({ nick: s.user.nick, admin: !!s.user.is_admin });   // 홈페이지(모드 추천 편집 버튼)용. 게임 정산은 안 함
  if (m === 'POST' && p === '/api/admin/mods-order') return modsOrder(req, env, s.user);
  if (p.startsWith('/api/admin/')) return admin(p, m, req, env, s.user, url);
  if (m === 'GET' && p === '/api/blocks') return json({ blocks: (await env.DB.prepare('SELECT b.target_id AS id, u.nick FROM blocks b JOIN users u ON u.id = b.target_id WHERE b.user_id = ?').bind(s.user.id).all()).results });
  if (m === 'POST' && p === '/api/block') return block(req, env, s.user);
  if (m === 'POST' && p === '/api/report') return report(req, env, s.user);
  if (m === 'GET' && p === '/api/suggest') return suggestList(env, s.user);
  if (m === 'POST' && p === '/api/suggest') return suggestWrite(req, env, s.user);
  if (m === 'POST' && p === '/api/suggest/del') return suggestDel(req, env, s.user);
  const g = GAME[p];
  if (m === 'POST' && g) { const b = await readBody(req); if (b && typeof b === 'object') for (const k of Object.keys(b)) if (k[0] === '_') delete b[k];   // 2026-11-21 _로 시작하는 값은 서버 안에서만 씀 (예: 분수 _o를 보내 잭팟을 고르는 것 막기)
    try { return await play(env, s.user, (c, at, out) => g(c, b, at, out, env, s.user)); } catch (e) { if (e instanceof HttpError && e.status === 400) await bumpReject(env, s.user.id); throw e; } }
  if (m === 'POST' && p === '/api/password') return changePw(req, env, s);
  if (m === 'POST' && p === '/api/nick') return changeNick(req, env, s);
  if (m === 'POST' && p === '/api/recovery-code') return newRecovery(req, env, s.user);
  if (m === 'POST' && p === '/api/reset') return resetAccount(req, env, s.user);
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
  if (!allOk(nickChecks(nick))) fail(400, '닉네임 규칙을 확인해 주세요 (띄어쓰기 포함 2~10글자, 한글·영문·숫자·띄어쓰기)');
  if (scanBad(nick).hit) fail(400, '닉네임에 쓸 수 없는 말이 들어 있어요');
  if (!allOk(pwChecks(pw, nick))) fail(400, '비밀번호 규칙을 확인해 주세요');
  if (b.agree !== TERMS_VER) fail(400, '가입 안내를 읽고 동의해 주세요');   // 2026-11-18 개인 팬 게임 안내 동의 (가입 화면 체크)
  const M = await maintGet(env); if (M.on) fail(503, M.msg || MAINT_MSG);
  const ipHash = await sha256('signup:' + (req.headers.get('CF-Connecting-IP') || 'local')), dev = devOf(req) || String(b.dev || ''), devHash = /^[\w-]{4,40}$/.test(dev) ? await gHash('dev:' + dev) : '';
  {   // 2026-11-20 가입 제한: 막히면 언제부터 다시 되는지 알려 줌
    const ipR = (await env.DB.prepare('SELECT at FROM signups WHERE ip_hash = ? AND at > ? ORDER BY at').bind(ipHash, now() - DAY).all()).results;
    if (ipR.length >= SIGNUP_IP_DAY) fail(429, `같은 인터넷(IP)에서는 하루에 ${SIGNUP_IP_DAY}개까지만 가입할 수 있어요. ${kTime(ipR[ipR.length - SIGNUP_IP_DAY].at + DAY)}부터 다시 가입할 수 있어요`);
    const devR = devHash ? (await env.DB.prepare('SELECT at FROM signups WHERE dev_hash = ? AND at > ? ORDER BY at').bind(devHash, now() - 7 * DAY).all()).results : [];
    if (devR.length >= SIGNUP_DEV_WEEK) fail(429, `이 기기(브라우저)에서는 일주일에 ${SIGNUP_DEV_WEEK}번만 가입할 수 있어요. ${kTime(devR[devR.length - SIGNUP_DEV_WEEK].at + 7 * DAY)}부터 다시 가입할 수 있어요. 이미 만든 계정이 있다면 로그인해 주세요`);
  }
  if (await findUser(env, nick)) fail(409, '이미 있는 닉네임이에요');
  const salt = randB64(16), code = newCode(), t = now();
  let id;
  try {
    const r = await env.DB.prepare('INSERT INTO users (nick, nick_key, pw_hash, pw_salt, pw_iter, rec_hash, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(nick, nick.toLowerCase(), await pbkdf2(pw, salt, PBKDF2_ITER), salt, PBKDF2_ITER, await sha256(normCode(code)), t, t).run();
    id = r.meta.last_row_id;
  } catch (e) { if (String(e).includes('UNIQUE')) fail(409, '이미 있는 닉네임이에요'); throw e; }
  await env.DB.batch([
    charInsert(env, id, t),
    env.DB.prepare('INSERT INTO signups (ip_hash, dev_hash, at) VALUES (?, ?, ?)').bind(ipHash, devHash, t),
    env.DB.prepare('INSERT INTO activity (user_id, kind, detail, at) VALUES (?, ?, ?, ?)').bind(id, 'signup', `${nick} · 안내 동의 ${TERMS_VER}`, t),
  ]);
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first(); await track(env, id, req);
  return json({ token: await newSession(env, id, true), code, me: await loadMe(env, user) });
}
// 새 캐릭터 한 줄 (가입·계정 초기화 같이 씀)
function charInsert(env, id, t) {
  const c = newCharacter();
  return env.DB.prepare(`INSERT INTO characters (user_id, face, body, eyes, hat, intro, title, x, y, lv, exp, gold, s_str, s_dex, s_int, s_luk, points, hp, equip, bag, hats, pots, pot_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, c.face, c.body, c.eyes, c.hat, c.intro, c.title, c.x, c.y, c.lv, c.exp, c.gold, c.str, c.dex, c.int, c.luk, c.points, c.hp, JSON.stringify(c.equip), JSON.stringify(c.bag), JSON.stringify(c.hats), JSON.stringify(c.pots), c.potAt, t);
}
// 계정 초기화: 닉네임·비밀번호는 그대로, 게임 기록(캐릭터·집·낚시 기록·공동 건설 기여)은 처음으로
async function resetAccount(req, env, user) {
  const b = await readBody(req);
  if (String(b.ok || '').trim() !== '동의합니다') fail(400, "'동의합니다'를 정확히 입력해 주세요");
  const t = now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM characters WHERE user_id = ?').bind(user.id),
    charInsert(env, user.id, t),
    env.DB.prepare('DELETE FROM houses WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM fishing WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM farming WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM village_give WHERE user_id = ?').bind(user.id),
    env.DB.prepare('INSERT INTO activity (user_id, kind, detail, at) VALUES (?, ?, ?, ?)').bind(user.id, 'reset', '계정 초기화', t),
  ]);
  RANK_MEM_CLEAR();   // 2026-11-20 초기화하면 랭킹 기록도 바로 사라지게 (레벨·번 돈·강화는 캐릭터와 같이, 낚시·농사·기여도는 위에서 지움)
  return json({ ok: true });
}
async function login(req, env) {
  const b = await readBody(req), user = await findUser(env, b.nick);
  if (!user) fail(401, '닉네임 또는 비밀번호가 맞지 않아요');
  const ip = await ipOf(req), locked = await lockedMsg(env, user, ip); if (locked) fail(429, locked);
  if (!(await checkPw(user, b.pw))) { const r = await countFail(env, user, ip); fail(401, typeof r === 'string' ? r : `닉네임 또는 비밀번호가 맞지 않아요 (${r}/${LOCK_FAILS})`); }
  if (user.banned) fail(403, '이용이 정지된 계정이에요. 김치복 디스코드나 팬 카페로 문의해 주세요');
  if (!user.is_admin) { const M = await maintGet(env); if (M.on) fail(503, M.msg || MAINT_MSG); }
  await env.DB.prepare('UPDATE users SET last_login = ? WHERE id = ?').bind(now(), user.id).run(); await clearFails(env, user, ip); await track(env, user.id, req);
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
  const c = { face: r.face, body: r.body, eyes: r.eyes, hat: r.hat, hair: r.hair, hairC: r.hair_c, hatHair: r.hat_hair !== 0, suit: r.suit || '', wsk: jp(r.wsk, {}), intro: r.intro, title: r.title, x: r.x, y: r.y, lv: r.lv, exp: r.exp, gold: r.gold,
    str: r.s_str, dex: r.s_dex, int: r.s_int, luk: r.s_luk, points: r.points, hp: r.hp, hpAt: r.hp_at,
    equip: JSON.parse(r.equip), bag: JSON.parse(r.bag), hats: JSON.parse(r.hats), pots: JSON.parse(r.pots), potAt: r.pot_at,
    hunt: r.hunt ? JSON.parse(r.hunt) : null, bonusDay: r.bonus_day, jobAt: r.job_at, ver: r.ver,
    cls: CLASSES[r.cls] ? r.cls : 'sword', enh: jp(r.enh, {}), presets: jp(r.presets, null) || defaultPresets(), preset: r.preset || 0, gacha: { w: 0, a: 0, ...jp(r.gacha, {}) }, life: fixLife(jp(r.life, null)) };
  if ('weapon' in c.equip || 'acc' in c.equip) oldGear(c);
  if (!titleOf(c.title) || !c.life.titles.includes(c.title)) c.title = 'new';   // 예전 칭호 글자 → 새 칭호
  if (walkSolid(Math.floor(c.x / T), Math.floor(c.y / T))) { c.x = START.x; c.y = START.y; }   // 지도가 바뀌어서 막힌 곳에 있으면 광장으로
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
// 텃밭 칸은 심은 시각·다 자라는 시각만 (작물·무게·값은 수확할 때 공개, 규칙 1-(3))
const lifeOut = L => (L?.farm ? { ...L, farm: { ...L.farm, plots: L.farm.plots.map(p => (p ? { at: p.at, r: p.r } : null)) } } : L);
function meOut(user, c) {
  const h = c.hunt;
  return {
    id: user.id, nick: user.nick, nickAt: user.nick_at || 0, admin: !!user.is_admin, gfx: c.gfx || {}, world: c._w ? { lv: c._w.lv, live: c._w.live } : null,
    char: { face: c.face, body: c.body, eyes: c.eyes, hat: c.hat, hair: c.hair, hairC: c.hairC, hatHair: c.hatHair, suit: c.suit, wsk: c.wsk, intro: c.intro, title: c.title, x: c.x, y: c.y, lv: c.lv, exp: c.exp, gold: c.gold,
      str: c.str, dex: c.dex, int: c.int, luk: c.luk, points: c.points, hp: c.hp, equip: c.equip, bag: c.bag, hats: c.hats, pots: c.pots, potAt: c.potAt,
      cls: c.cls, enh: c.enh, gacha: c.gacha, preset: c.preset, life: lifeOut(c.life), presets: c.presets.map((p, i) => (i === c.preset ? { ...p, s: [c.str, c.dex, c.int, c.luk] } : p)),
      hunt: h ? { f: h.f, start: h.start, t: Math.round(h.t), boss: h.boss, kills: h.kills, exp: h.exp, gold: h.gold, drops: h.drops } : null,
      job: c.jobAt ? { at: c.jobAt, left: Math.max(0, Math.ceil((c.jobAt + JOB.sec * 1000 - Date.now()) / 1000)), pay: JOB.pay(cafeLv(c)) } : null },
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
    env.DB.prepare('SELECT at, kind, text FROM chronicle ORDER BY id DESC LIMIT 200').all()]);
  NEWS = { at: Date.now(), v: { village: W, top: top.results.map(r => ({ nick: r.nick, score: Math.round(r.score) })), chron: raidGroup(chron.results).slice(0, 30) } };
  return NEWS.v;
}
// 2026-11-20 레이드 소식은 한 레이드(같은 보스 · 같은 30분)를 한 줄로: '○○님 외 N명이 레드 드래곤 레이드에 성공했어요!' (예전 '전용 스킨을 얻었어요' 줄도 같이 묶음)
function raidGroup(rows) {
  const out = [], grp = new Map();
  for (const r of rows) {
    const m = r.kind === 'raid' && /^(.+?)님이 (.+?) 레이드(?:에서|에) /.exec(r.text);
    if (!m) { out.push(r); continue; }
    const key = m[2] + ':' + Math.floor(r.at / 1800e3); let g = grp.get(key);
    if (!g) { g = { at: r.at, kind: 'raid', boss: m[2], who: [] }; grp.set(key, g); out.push(g); }
    if (!g.who.includes(m[1])) g.who.push(m[1]);
  }
  for (const g of grp.values()) { const n = g.who.length; g.text = `${g.who[n - 1]}님${n > 1 ? ` 외 ${n - 1}명` : ''}이 ${g.boss} 레이드에 성공했어요!`; delete g.who; delete g.boss; }
  return out;
}
// 소원 분수 잭팟 (2026-11-21): 모인 돈(pool)을 한 번에 0으로 바꾸며 그 값을 읽음 → × 1.5. 당첨자는 최근 10명만 남김
let FOUNT = { at: 0, v: null };
let D1_FULL = 0;   // 이 서버가 마지막으로 D1 무료 한도 초과를 본 때
async function fountain(env) {
  if (FOUNT.v && Date.now() - FOUNT.at < 15e3) return FOUNT.v;
  const [f, w] = await Promise.all([env.DB.prepare('SELECT pool, since FROM fountain WHERE id = 1').first(), env.DB.prepare('SELECT nick, gold, at, wait, n FROM fountain_win ORDER BY id DESC LIMIT 10').all()]);
  const pool = f?.pool || 0; FOUNT = { at: Date.now(), v: { pool, prize: Math.round(pool * WISH.jpMul), since: f?.since || 0, wins: w.results } };   // since = 지금 돈이 모이기 시작한 때
  return FOUNT.v;
}
async function jackpot(env, user) {
  const t = now(), r = await env.DB.prepare('UPDATE fountain SET last = pool, pool = 0, prev = since, since = ? WHERE id = 1 RETURNING last, prev').bind(t).first();   // SET 오른쪽은 바꾸기 전 값 → prev = 지난 잭팟 시각
  const g = Math.max(Math.round(WISH.cost * WISH.jpMul), Math.round((r?.last || 0) * WISH.jpMul)), wait = r?.prev ? t - r.prev : 0, n = Math.round((r?.last || 0) / WISH.cost) + 1;   // n = 몇 번째 소원에서 (당첨된 소원 포함)
  await env.DB.batch([env.DB.prepare('INSERT INTO fountain_win (user_id, nick, gold, at, wait, n) VALUES (?, ?, ?, ?, ?, ?)').bind(user.id, user.nick, g, t, wait, n),
    env.DB.prepare('DELETE FROM fountain_win WHERE id NOT IN (SELECT id FROM fountain_win ORDER BY id DESC LIMIT 10)')]);
  FOUNT.at = 0; return g;
}
// 마을 연대기 (전설 물고기, 신화 장비, 공동 건설 완성 등 큰일만)
const chron = (env, kind, text) => env.DB.prepare('INSERT INTO chronicle (at, kind, text) VALUES (?, ?, ?)').bind(now(), kind, String(text).slice(0, 120)).run().then(() => { NEWS.at = 0; }).catch(() => {});

// 캐릭터를 읽고 → 사냥 정산 → 바꾸고 → 저장. 그 사이 다른 요청이 먼저 바꿨으면(ver가 다르면) 처음부터 다시
async function play(env, user, fn) {
  for (let tries = 0; tries < 4; tries++) {
    const r = await env.DB.prepare('SELECT * FROM characters WHERE user_id = ?').bind(user.id).first();
    const W = await world(env), c = toChar(r), at = now(), out = {}; c._adm = !!user.is_admin; c.gfx = worldFx(W, at); c._w = W;
    const lv0 = c.lv, g0 = c.gold; c._spent = 0; dailyState(c, at); npcState(c, at); guideInit(c);
    if (guideQ(c)?.[0] === 'wish' && c.life.gq.wr !== c.life.gq.i) { c.life.wishAt = 0; c.life.gq.wr = c.life.gq.i; }   // 2026-11-20 가이드가 분수 단계가 되면 소원 쿨타임 한 번 없앰
    if (!c.hunt) {   // 마을: 체력이 1초에 2%씩 참
      const max = derive(c).maxHp;
      c.hp = Math.min(max, Math.round(c.hp + Math.max(0, (at - (c.hpAt || at)) / 1000) * max * HUNT.townRegen)); c.hpAt = at;
    } else out.hunt = settle(c, at, svLive(c, at) ? SAVER.gap : undefined);   // 화면 보호기 신호가 오는 동안은 100% 구간이 더 김
    // 2026-11-18 마을에서 화면을 닫아도 자리 비움: 마지막 접속 신호(life.seen) 뒤 5분 넘게 비었으면 효율 50%(경험치 10%)로 마을 일 + 사냥 반반 (최대 4시간)
    if (!c.hunt && !out.hunt) { const gap = c.life.seen ? (at - c.life.seen) / 1000 : 0;
      if (gap >= AWAY_MIN) { const off = Math.min(gap - HUNT.onlineGap, HUNT.offlineMax), eff = off * HUNT.offlineEff, life = offlineLife(c, eff * (1 - HUNT.offlineHunt)), hunt = offlineHuntAway(c, eff * HUNT.offlineHunt); if (life || hunt) out.away = { sec: Math.round(gap), off: Math.round(off), life, hunt }; } }   // 절반은 마을 일, 절반은 사냥
    c.life.seen = at;
    if (c.life.fish?.pack > 0) { const g = c.life.fish.pack * 9; c.gold += g; out.refund = g; c._noEarn = 1; c.life.fish.pack = 0; }   // 2026-11-18 자동 낚시 삭제: 남은 자동 미끼 1개 = 9골드
    if (c.life.auto?.on) { const g = autoSettle(c, at); if (g) out.auto = g; c.life.auto.on = 0; }   // 예전 자동 생활(시간으로 계산): 2026-11-17 마지막 정산 후 끔. 새 자동 생활은 화면이 직접 함
    const res = (await fn(c, at, out)) || {};
    if (c.life.coins?.fish > 0) { const g = c.life.coins.fish * FISH_COIN_GOLD; c.gold += g; c.life.coins.fish = 0; out.fishCoin = (out.fishCoin || 0) + g; }
    if (c.life.coins?.farm > 0) { const g = c.life.coins.farm * FARM_COIN_GOLD; c.gold += g; c.life.coins.farm = 0; out.farmCoin = (out.farmCoin || 0) + g; c._noEarn = 1; }   // 2026-11-20 텃밭 코인도 1개 = 100골드   // 2026-11-20 낚시 코인은 쓸 곳이 없어져서 1개 = 100골드로 바꿈
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
const svLive = (c, at) => !!c.life?.sv && at - c.life.sv.last <= (SAVER.gap + 10) * 1000;   // 2026-11-20 화면 보호기 신호가 아직 오는 중
const AWAY_MIN = 300;   // 화면이 켜져 있으면 2분마다 /api/seen 신호가 옴
// '왕' 세트 보상 받기: 아직 없는 첫 부위를 찾아 (순서 + 1) × every 만큼 셌으면 hats에 넣음
function kingClaim(c, kind, b) {
  const K = KINGS[kind]; if (!kingNext(K, c.hats)) fail(400, `${K.n} 보상을 모두 받았어요`);
  const ready = kingReady(K, c.hats, c.life.cnt || {}), next = typeof b?.k === 'string' && ready.includes(b.k) ? b.k : ready[0];
  if (!next) { const k = typeof b?.k === 'string' && K.keys.includes(b.k) ? b.k : kingNext(K, c.hats), g = kingGoal(K, k, c.life.cnt || {}); fail(400, `아직이에요: ${g.t} (지금 ${g.now}${g.u})`); }
  c.hats.push(next);
  return { fk: next, log: [kind + '-king', next], chron: !kingNext(K, c.hats) ? [kind, `${K.n} 세트를 모두 모았어요!`] : null };
}
const GAME = {
  '/api/seen'() {},
  // 화면 보호기 (2026-11-20): on 1 = 시작·4분마다 신호, on 0 = 돌아옴. 자동 생활이면 신호 사이 시간만큼 서버가 계산 (효율 100%, 최대 SAVER.gap초씩)
  '/api/saver'(c, b, at) {
    const L = c.life, k = ['hunt', 'life', 'idle'].includes(b.k) ? b.k : 'idle', sv = L.sv, live = svLive(c, at);
    if (live && sv.k === 'life' && !c.hunt && !c.jobAt) { const g = saverLife(c, Math.min((at - sv.last) / 1000, SAVER.gap)); if (g) for (const x in g) sv.got[x] = (sv.got[x] || 0) + g[x]; }
    if (b.on) { L.sv = live ? { ...sv, k, last: at } : { k, at, last: at, got: {} }; return { saver: { k, sec: Math.round((at - L.sv.at) / 1000), got: L.sv.got } }; }
    delete L.sv; return { saver: live ? { k: sv.k, sec: Math.round((at - sv.at) / 1000), got: sv.got || {} } : null };
  },   // 화면이 켜져 있다는 신호 (자리 비움 계산용)
  // 사냥
  '/api/hunt/start'(c, b, at) {
    if (c.hunt) fail(400, '이미 사냥 중이에요');
    notWorking(c);
    const fi = Number(b.f); if (!Number.isInteger(fi) || !FIELDS[fi]) fail(400, '없는 사냥터예요');
    if (c.lv < FIELDS[fi].min) fail(400, `Lv.${FIELDS[fi].min}부터 들어갈 수 있어요`);   // 2026-11-20 최소 레벨
    if (c.hp < 1) fail(400, '체력이 없어요. 잠깐 쉬었다 가세요');
    cntAdd(c, 'huntGo');   // 가이드용
    startHunt(c, fi, at);
    return { log: ['hunt-start', FIELDS[fi].n] };
  },
  '/api/hunt/sync'() {},
  '/api/hunt/bossf'(c, b) { c.life.bossF = b.on ? 1 : 0; },   // 2026-11-21 '강한 보스도 싸우기' 체크 (기본 꺼짐 = 질 것 같으면 피함)
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
  '/api/pot-at'(c, b) { const v = Number(b.v); if (!Number.isInteger(v) || v < 10 || v > 90) fail(400, '10~90 사이로 정해 주세요'); c.potAt = v; },
  // 가챠센터: 무기 뽑기 · 방어구 뽑기 (1회 / 10회)
  // 2026-11-20 리뉴얼: 뽑은 장비는 모두 가방(c.bag)에 남음 → 화면에서 칸마다 착용을 고르고 /api/gacha/done
  '/api/gacha/pull'(c, b) {
    townOnly(c);
    if (c.bag.length) fail(400, '먼저 지난 뽑기 결과를 골라 주세요');
    const box = b.box, n = Number(b.n);
    if (!own(GACHA, box) || ![1, 10].includes(n)) fail(400, '잘못된 요청이에요');
    const g0 = gachaInfo(c.gacha[box]), cost = n === 10 ? Math.round(g0.cost * 10 * GACHA_TEN) : g0.cost;
    spend(c, cost);
    const items = []; let got = 0;
    for (let k = 0; k < n; k++) {
      const it = rollGacha(box, gachaInfo(c.gacha[box]).lv); c.gacha[box]++; items.push(it); cntAdd(c, 'gacha');
      if (it.g === 'legend') cntAdd(c, 'gotLegend'); if (it.g === 'myth') cntAdd(c, 'gotMyth');
      c.bag.push(it);
    }
    const g1 = gachaInfo(c.gacha[box]), keep = new Set(c.bag.map(p => p.id));
    const myth = items.find(it => it.g === 'myth');
    return { items: items.map(it => ({ ...it, keep: keep.has(it.id) })), got, cost, lvUp: g1.lv > g0.lv ? g1.lv : 0, chron: myth ? ['myth', `신화 장비 「${itemName(myth)}」를 뽑았어요!`] : null,
      log: ['gacha', `${GACHA[box].n} ${n}회 -${cost} +${got} ${items.filter(it => ['epic', 'legend', 'myth'].includes(it.g)).map(it => `${it.st}단계 ${GRADES[it.g].n} ${itemName(it)}`).join(', ')}`] };
  },
  // 선택 완료: take = 착용할 장비 id 목록 (칸마다 첫 번째 하나만). 고른 것은 끼고(쓰던 것은 분해), 나머지는 모두 분해
  '/api/gacha/done'(c, b) {
    const take = Array.isArray(b.take) ? b.take.slice(0, 20).map(String) : [], done = new Set(), on = [];
    let got = 0;
    for (const it of c.bag) {
      if (take.includes(it.id) && !done.has(it.slot)) { done.add(it.slot); if (c.equip[it.slot]) got += dismantle(c.equip[it.slot]); c.equip[it.slot] = it; on.push(itemName(it)); }
      else got += dismantle(it);
    }
    const n = c.bag.length; c.bag = []; c.gold += got; c.hp = Math.min(c.hp, derive(c).maxHp);
    return { got, on: on.length, log: ['gacha-done', `${n}개 중 ${on.join(', ') || '없음'} 장착, 나머지 분해 +${got}`] };
  },
  // (예전 화면용) 비교 창에서 고르기: take = 바꾸기(쓰던 것은 분해) / 아니면 새 장비를 분해
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
    const left = (c.life.pAt || 0) + PRESET_CD - Date.now();   // 2026-11-20 10분에 한 번
    if (left > 0) fail(400, `프리셋은 10분에 한 번 바꿀 수 있어요 (${Math.ceil(left / 60e3)}분 뒤)`);
    c.life.pAt = Date.now();
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
  '/api/auto/start'() {},   // 예전 자동 생활 (더는 시간으로 쌓지 않음)
  '/api/auto/stop'(c) { if (c.life.auto) c.life.auto.on = 0; return { log: ['auto', 'off'] }; },
  '/api/auto/sync'() {},
  // 레이드 참가 (정각 30초 모집 중에만). 체력은 가득 채워서 시작
  async '/api/raid/join'(c, b, at, out, env, user) {
    townOnly(c);
    const D = derive(c), dps = raidDps(D);
    const look = { lv: c.lv, title: c.title, face: c.face, body: c.body, eyes: c.eyes, hat: c.hat, hair: c.hair, hairC: c.hairC, hatHair: c.hatHair, suit: c.suit, wsk: c.wsk, cls: c.cls, enh: c.enh, equip: c.equip };
    const res = await raidDO(env).fetch('https://raid/join', { method: 'POST', body: JSON.stringify({ start: Number(b.start), uid: user.id, nick: user.nick, lv: c.lv, dps, maxHp: D.maxHp, look }) });
    const j = await res.json(); if (!res.ok) fail(400, j.error || '참여하지 못했어요');
    c.hp = D.maxHp;
    return { raid: { start: j.start, n: j.n, dps, boss: j.boss } };
  },
  // 레이드 보상: 레이드 방에서 기록을 읽고 → 골드·경험치 + 확률로 전용 스킨. life.raidGot 으로 한 번만
  async '/api/raid/claim'(c, b, at, out, env, user) {
    const start = Number(b.start); if (!Number.isFinite(start)) fail(400, '잘못된 요청이에요');
    if (c.life.raidGot === start) fail(400, '이미 보상을 받았어요');
    const res = await raidDO(env).fetch(`https://raid/result?start=${start}&uid=${user.id}`), j = await res.json();
    if (!res.ok) fail(res.status, j.error || '보상을 받지 못했어요');
    const D = derive(c), RW = raidReward(c.lv), m = (j.dead ? RAID.deadMul : 1) * (.85 + .3 * Math.min(1, j.share * j.n)) * raidCrowd(j.n10 ?? j.n);
    let gold = Math.round(RW.gold * m * (1 + D.goldB / 100)); const exp = Math.round(RW.exp * m * (1 + D.expB / 100));
    let skin = null, skinLv = 0, skinN = 0; const skins = [];
    // 2026-11-18 전용 스킨은 무조건 1개, RAID.drop2 확률로 2개. 세트 6부위 중 하나씩. 이미 있으면 개수가 늘어 레벨이 오름
    const nDrop = 1 + (Math.random() < RAID.drop2 ? 1 : 0);
    for (let i = 0; i < nDrop; i++) {
      const all = raidSet(RAID_BOSS[j.boss]?.set || 'rdragon').filter(k => rskLv(rskCount(c, k)) < RSK.max);
      if (!all.length) { gold += Math.round(RW.gold * .5); continue; }   // 전부 최고 레벨이면 골드로
      const k = all[Math.floor(Math.random() * all.length)], rsk = c.life.rsk || (c.life.rsk = {});
      if (!c.hats.includes(k)) { c.hats.push(k); rsk[k] = 1; } else rsk[k] = rskCount(c, k) + 1;
      skins.push({ skin: k, lv: rskLv(rsk[k]), n: rsk[k] });
    }
    if (skins[0]) ({ skin, lv: skinLv, n: skinN } = skins[0]);
    c.gold += gold; const up = addExp(c, exp); c.life.raidGot = start; cntAdd(c, 'raid'); c.hp = D.maxHp; c.hpAt = at;
    return { raid: { boss: j.boss, gold, exp, up, skin, skinLv, skinN, skins, crowd: Math.round((raidCrowd(j.n10 ?? j.n) - 1) * 100), dead: j.dead, rank: j.rank, n: j.n, dmg: j.dmg }, log: ['raid', `${gold} ${exp} ${skins.map(x => x.skin).join(' ')}`.trim()],
      chron: ['raid', `${RAID_BOSS[j.boss]?.n || '레이드'} 레이드에 성공했어요!`] };   // 2026-11-20 마을 소식에서는 한 레이드를 한 줄로 묶어 보여 줌 (news)
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
      if (!s || s.raid || s.fk) fail(400, s ? (s.fk ? '낚시점 낚시왕 보상이에요' : '레이드에서만 얻을 수 있어요') : '없는 스킨이에요');
      if (c.hats.includes(id)) fail(400, '이미 가지고 있어요');
      spend(c, s.price); c.hats.push(id);
      return { log: ['skin', id] };
    }
    const h = HATS.find(x => x.id === id && x.id !== 'none' && !x.raid && !x.free && !x.fk); if (!h) fail(400, '없는 스킨이에요');
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
    const cl = cafeLv(c), tips = jobTips(c.jobAt, cl), pay = JOB.pay(cl), guests = jobGuests(c.jobAt, cl).length; c.gold += pay + tips; c.jobAt = 0; cntAdd(c, 'job');
    const lexp = lifeExp(c, 'job'); addExp(c, lexp);
    const cx = CAFE.xp(guests), up = cafeGain(c, cx);   // 알바 경험치 (2026-11-20)
    return { pay, tips, lexp, cafe: { xp: cx, up, lv: cafeLv(c) }, log: ['job', String(pay + tips)] };
  },
  // 그만두면 알바비는 없고, 그때까지 온 손님 팁만 받음
  '/api/job/quit'(c, b, at) { const cl = cafeLv(c), tips = c.jobAt ? jobTips(c.jobAt, cl, at) : 0, n = c.jobAt ? jobGuests(c.jobAt, cl).filter(g => c.jobAt + g.t <= at).length : 0; c.gold += tips; c.jobAt = 0; const cx = n * 3, up = cx ? cafeGain(c, cx) : 0; return { tips, cafe: { xp: cx, up, lv: cafeLv(c) } }; },   // 그만두면 손님 경험치만
  // 손 낚시: 물을 누르면 바로. 서버가 결과를 정하고, 화면은 wait(ms) 뒤에 입질 → 결과를 보여 줌
  // 손 낚시 (2026-11-19 나눔): 던지기(hand) → 입질 시간(wait) 뒤 당기기(reel). 자리를 떠나면 화면이 cancel → 아무것도 안 낚임
  '/api/fish/hand'(c, b, at, out, env, user) { return fishCast(c, b, at, env, user); },
  '/api/fish/reel'(c, b, at, out, env, user) { return fishReel(c, at, env, user); },
  '/api/fish/cancel'(c) { delete c.life.fcast; },
  // 자동 낚시용 미끼 사기 (골드)
  // 자동 낚시 한 번: 미끼 1개를 씀. 낚을 확률은 손 낚시보다 조금 낮음. 쿨타임은 손 낚시와 같음 (2초, 2026-11-17)
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
    if (b.blk != null && Number(b.blk) !== npcBlk(at)) fail(409, '마을 주민이 바뀌었어요. 화면을 새로 고침해 주세요');   // 2026-11-20 화면과 서버가 다른 주민을 보고 있으면 거절 (예전엔 다른 주민 임무가 받아졌음)
    const st = npcState(c, at), p = npcList(st.blk)[Number(b.i)];
    if (!p) fail(400, '지금 마을에 없는 주민이에요');
    if (own(st.q, String(p.i))) fail(400, '이미 받은 임무예요');
    if (npcActive(st) >= NPC_MAX) fail(400, `임무는 한 번에 ${NPC_MAX}개까지 받을 수 있어요`);
    st.q[p.i] = { b: p.task.k === 'talk' ? 0 : c.life.cnt[p.task.k] || 0, s: 0 }; cntAdd(c, 'npcTake');
    return { log: ['npc-take', p.task.n] };
  },
  '/api/npc/talk'(c, b, at) {
    if (b.blk != null && Number(b.blk) !== npcBlk(at)) fail(409, '마을 주민이 바뀌었어요. 화면을 새로 고침해 주세요');   // 2026-11-20 화면과 서버가 다른 주민을 보고 있으면 거절 (예전엔 다른 주민 임무가 받아졌음)
    const st = npcState(c, at), L = npcList(st.blk), to = Number(b.i);
    const p = L.find(p => p.task.to === to && st.q[p.i]?.s === 0 && !st.q[p.i].t);
    if (!p) fail(400, '전할 안부가 없어요');
    st.q[p.i].t = 1;
    return { talked: p.i };
  },
  '/api/npc/done'(c, b, at) {
    if (b.blk != null && Number(b.blk) !== npcBlk(at)) fail(409, '마을 주민이 바뀌었어요. 화면을 새로 고침해 주세요');   // 2026-11-20 화면과 서버가 다른 주민을 보고 있으면 거절 (예전엔 다른 주민 임무가 받아졌음)
    const st = npcState(c, at), p = npcList(st.blk)[Number(b.i)], q = p && own(st.q, String(p.i)) ? st.q[p.i] : null;
    if (!q || q.s !== 0) fail(400, '받은 임무가 없어요');
    if (npcProg(c, q, p.task) < p.task.v) fail(400, '아직 임무를 다 하지 못했어요');
    q.s = 1; const gold = npcGold(c.lv) + 150, exp = Math.round(npcExp(c.lv) * (1 + (derive(c).expB || 0) / 100));   // 2026-11-20 코인 없앰 → 골드 +150
    c.gold += gold; addExp(c, exp); cntAdd(c, 'npc');
    return { npcDone: { i: p.i, gold, coin: 0 }, lexp: exp, log: ['npc-done', p.task.n] };
  },
  '/api/npc/drop'(c, b, at) {
    const st = npcState(c, at), i = String(Number(b.i));
    if (!own(st.q, i) || st.q[i].s !== 0) fail(400, '받은 임무가 없어요');
    delete st.q[i];
  },
  // 낚시왕 보상 (2026-11-19): 물고기 50마리마다 다음 부위 하나. 받은 것은 hats에 들어감 (순서대로라서 '몇 개 받았나'는 hats로 셈)
  '/api/fish/king'(c, b) { return kingClaim(c, 'fish', b); },
  '/api/mine/king'(c, b) { return kingClaim(c, 'mine', b); },   // 채굴왕 (2026-11-19): 손으로 캔 석재 100개마다
  '/api/title'(c, b) { const id = String(b.id || ''); if (!c.life.titles.includes(id)) fail(400, '아직 없는 칭호예요'); c.title = id; },
  // 뱃지 달기 (2026-11-20 도감 센터). id = '' 이면 떼기
  // 📘 가이드 퀘스트 (2026-11-20): 다 하면 보상 받고 다음 단계로 (건너뛰기는 2026-11-20 없앰)
  '/api/guide/mark'(c, b) {   // 화면에서만 알 수 있는 행동 (걷기·건물 누르기·바로가기 등). 지금 단계일 때만 셈
    const k = String(b.k || ''), q = guideQ(c); if (!q || q[4] !== k || !GUIDE_MARKS.includes(k)) fail(400, '지금 가이드 단계가 아니에요'); cntAdd(c, k);
  },
  '/api/guide/claim'(c) {
    const P = guideProg(c); if (!P) fail(400, '가이드 퀘스트를 모두 끝냈어요'); if (!P.ok) fail(400, `아직 다 못 했어요 (${P.n} / ${P.v})`);
    const r = P.q[8], exp = guideExp(c.lv); c.gold += r.gold || 0; c.life.res.wood += r.wood || 0; c.life.res.stone += r.stone || 0; addExp(c, exp);
    const nx = guideNext(c); if (!nx) cntAdd(c, 'guideDone'); c._noEarn = 1;
    return { guide: { done: P.q[0], r, exp, end: !nx }, lexp: exp, log: ['guide', P.q[0]] };
  },
  '/api/tagc'(c, b) { const v = String(b.c || ''); if (!TAG_COLORS.includes(v)) fail(400, '없는 색이에요'); c.life.tagc = v; },   // 이름표 배경색
  '/api/badge'(c, b) { const id = String(b.id || ''); if (id && !hasBadge(c, id)) fail(400, '아직 없는 뱃지예요'); c.life.badge = id; },
  // 낚시점: 낚싯대 · 미끼 올리기 (2026-11-20부터 골드, 한 단계씩)
  '/api/fish/shop'(c, b) {
    const k = b.k; if (!own(FISH_SHOP, k)) fail(400, '없는 물건이에요'); const S = FISH_SHOP[k];
    const l = c.life.fish[k] || 0; if (l >= S.cost.length) fail(400, '이미 최고 단계예요');
    const n = fishCasts(c.life.cnt); if (n < S.need[l]) fail(400, `낚시를 ${S.need[l] - n}번 더 해야 해요 (낚시 ${S.need[l]}번 필요)`);   // 2026-11-20 낚시 횟수 조건
    spend(c, S.cost[l]); c.life.fish[k] = l + 1;
    return { log: ['fish-shop', `${k} Lv${l + 2}`] };
  },
  // 물고기 가방 팔기 (낚시점): ks = 팔 물고기 번호들. 확인 창의 값(want)과 다르면 거절 (그 사이 바뀐 경우)
  '/api/fish/sell'(c, b) {
    townOnly(c); const bag = fishBag(c), ks = Array.isArray(b.ks) ? new Set(b.ks.map(Number).filter(Number.isInteger)) : null;
    if (!ks || !ks.size) fail(400, '팔 물고기를 골라 주세요');
    const sold = bag.filter(f => ks.has(f.k)); if (sold.length !== ks.size) fail(400, '가방에 없는 물고기가 있어요. 다시 열어 주세요');
    const gold = sold.reduce((a, f) => a + f.p, 0); if (Number.isFinite(b.want) && b.want !== gold) fail(400, '값이 바뀌었어요. 다시 확인해 주세요');
    c.life.fbag = bag.filter(f => !ks.has(f.k)); c.gold += gold; cntAdd(c, 'fishSold', sold.length);
    return { sold: sold.length, gold, log: ['fish-sell', `${sold.length}마리 ${gold}`] };
  },
  // 등급별 자동 판매 (낚자마자 팔기): g = { normal: 1, rare: 0, legend: 0 }
  '/api/fish/autosell'(c, b) { const g = b?.g || {}; c.life.fsell = Object.fromEntries(FG_KEYS.map(k => [k, g[k] ? 1 : 0])); },
  // ───── 🌱 텃밭 (2026-11-20 개편): 수수께끼 씨앗 심기 · 수확(작물 가방으로) · 팔기 · 호미/비료 · 농사왕 ─────
  // 심는 순간 작물·무게·값·다 자라는 시각을 정해서 저장 (그 뒤 장비를 바꿔도 안 바뀜). 화면에는 수확 전까지 작물을 안 알려 줌(meOut)
  '/api/farm/plant'(c, b, at) {   // i = 칸 번호 · all = 빈 칸 모두
    const f = c.life.farm, n = farmPlots(f.hoe);
    let idx;
    if (b.all) { idx = []; for (let i = 0; i < n; i++) if (!f.plots[i]) idx.push(i); if (!idx.length) fail(400, '빈 밭이 없어요'); }
    else { const i = Number(b.i); if (!Number.isInteger(i) || i < 0 || i >= FARM.maxPlots) fail(400, '없는 밭이에요'); if (i >= n) fail(400, '아직 잠긴 밭이에요. 호미를 올리면 열려요'); if (f.plots[i]) fail(400, '이미 심은 밭이에요'); idx = [i]; }
    for (const i of idx) { let r = rollCrop(f.hoe, f.fert); if (!r) fail(500, '씨앗을 심을 수 없어요 (설정 오류)');
      if (c.life.lgCrop) for (let k = 0; k < 400 && CROP_BY[r.id]?.grade !== 'legend'; k++) r = rollCrop(9, 9) || r;   /* 관리자 치트: 전설 작물만 */
      f.plots[i] = { at, r: at + r.sec * 1000, id: r.id, g: r.g, p: r.p }; }
    cntAdd(c, 'plant', idx.length);
    return { planted: idx.length, log: ['plant', `${idx.length}칸`] };
  },
  '/api/farm/harvest'(c, b, at, out, env, user) {   // i = 칸 번호 · all = 다 자란 칸 모두
    const f = c.life.farm, mul = 1 + (derive(c).fx.farmP || 0) / 100, cn = c.life.cnt, best = c.life.cbest ||= {}, got = []; let full = 0;
    const idx = b.all ? f.plots.map((_, i) => i) : [Number(b.i)];
    for (const i of idx) {
      const p = f.plots[i];
      if (!p || at < p.r) { if (!b.all) fail(400, p ? '아직 자라는 중이에요' : '빈 밭이에요'); continue; }
      const x = CROP_BY[p.id]; if (!x) { f.plots[i] = null; continue; }
      const sellNow = !!f.sell?.[x.grade];   // 2026-11-20 '수확하자마자 팔기'로 해 둔 등급은 가방에 안 넣고 바로 골드
      if (!sellNow && f.bag.length >= FARM.bag) { full = 1; continue; }
      f.plots[i] = null;
      const it = { k: (f.seq = (f.seq || 0) + 1), id: x.id, g: p.g, p: Math.min(FARM.priceMax, Math.round(p.p * mul)), at }, big = isBigCrop(x.id, p.g);
      if (sellNow) { c.gold += it.p; cntAdd(c, 'cropSold'); } else f.bag.push(it);
      got.push({ ...it, i, big, grade: x.grade, sold: sellNow ? 1 : 0 });
      cntAdd(c, 'cc_' + x.id); if (!best[x.id] || p.g > best[x.id]) best[x.id] = p.g;
      if (x.grade === 'rare') cntAdd(c, 'rareCrop'); if (x.grade === 'legend') cntAdd(c, 'legendCrop'); if (big) cntAdd(c, 'bigCrop');
    }
    if (!got.length) fail(400, full ? `작물 가방이 꽉 찼어요 (${FARM.bag}개). 텃밭 창고에서 팔아 주세요` : '다 자란 작물이 없어요');
    cntAdd(c, 'crops', got.length); const lexp = lifeExp(c, 'crop', got.length); addExp(c, lexp);
    // 농사 랭킹판 기록 (제일 비싼 · 제일 무거운 · 수확 수)
    const info = x => JSON.stringify({ id: x.id, g: x.g, p: x.p }), bp = got.reduce((a, x) => (x.p > a.p ? x : a)), bw = got.reduce((a, x) => (x.g > a.g ? x : a));
    const after = () => env.DB.prepare(`INSERT INTO farming (user_id, count, best_price, best_price_crop, best_w, best_w_crop) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET count = count + excluded.count,
        best_price_crop = CASE WHEN excluded.best_price > best_price THEN excluded.best_price_crop ELSE best_price_crop END, best_price = MAX(best_price, excluded.best_price),
        best_w_crop = CASE WHEN excluded.best_w > best_w THEN excluded.best_w_crop ELSE best_w_crop END, best_w = MAX(best_w, excluded.best_w)`)
      .bind(user.id, got.length, bp.p, info(bp), bw.g, info(bw)).run();
    return { got, lexp, after, log: ['harvest', `${got.length}개`], chron: got.some(g => g.grade === 'legend') ? ['farm', `전설 작물 ${got.filter(g => g.grade === 'legend').map(g => CROP_BY[g.id].n).join(', ')}을(를) 수확했어요!`] : null };
  },
  // 작물 가방 팔기: ks = 팔 작물 번호들. 확인 창의 합계(want)와 다르면 거절
  '/api/farm/sell'(c, b) {
    const f = c.life.farm, ks = Array.isArray(b.ks) ? new Set(b.ks.map(Number).filter(Number.isInteger)) : null;
    if (!ks || !ks.size) fail(400, '팔 작물을 골라 주세요');
    const sold = f.bag.filter(x => ks.has(x.k)); if (sold.length !== ks.size) fail(400, '가방에 없는 작물이 있어요. 다시 열어 주세요');
    const gold = sold.reduce((a, x) => a + x.p, 0); if (Number.isFinite(b.want) && b.want !== gold) fail(400, '값이 바뀌었어요. 다시 확인해 주세요');
    f.bag = f.bag.filter(x => !ks.has(x.k)); c.gold += gold; cntAdd(c, 'cropSold', sold.length);
    return { sold: sold.length, gold, log: ['crop-sell', `${sold.length}개 ${gold}`] };
  },
  // 호미 · 비료 올리기 (한 단계씩): 골드 + 누적 수확 횟수 조건
  '/api/farm/shop'(c, b) {
    const f = c.life.farm, k = b.k === 'hoe' ? 'hoe' : b.k === 'fert' ? 'fert' : null; if (!k) fail(400, '없는 물건이에요');
    const T = k === 'hoe' ? HOES : FERTS, l = f[k] || 0; if (l >= T.length - 1) fail(400, '이미 최고 단계예요');
    const nx = T[l + 1], have = c.life.cnt.crops || 0; if (have < nx[5]) fail(400, `수확을 ${nx[5] - have}번 더 해야 해요 (누적 수확 ${nx[5]}번 필요)`);
    spend(c, nx[4]); f[k] = l + 1;
    return { log: ['farm-shop', `${k} Lv${l + 2}`] };
  },
  '/api/farm/autosell'(c, b) { const g = b?.g || {}; c.life.farm.sell = Object.fromEntries(FG_KEYS.map(k => [k, g[k] ? 1 : 0])); },   // 수확하자마자 팔기 (등급별)
  '/api/farm/king'(c, b) { return kingClaim(c, 'farm', b); },
  '/api/hunt/king'(c, b) { return kingClaim(c, 'hunt', b); },   // 2026-11-21 사냥왕 세트 (사냥꾼 쉼터)
  '/api/hunt/incense'(c) {   // 2026-11-21 사냥꾼 쉼터 향로 올리기 (사냥터 몬스터 +1마리)
    if (c.hunt) fail(400, '사냥 중에는 올릴 수 없어요');
    const l = c.life.inc || 0; if (l >= INCENSE.max) fail(400, '이미 최고 단계예요');
    const [gold, need] = INCENSE.lv[l], have = c.life.cnt?.kills || 0; if (have < need) fail(400, `몬스터를 ${(need - have).toLocaleString()}마리 더 잡아야 해요 (누적 ${need.toLocaleString()}마리 필요)`);
    spend(c, gold); c.life.inc = l + 1;
    return { log: ['incense', `Lv${l + 1}`] };
  },   // 농사왕 세트 (텃밭 창고 '농사왕' 탭)
  // 채집: 마을의 나무·바위 (사람마다 따로 자람)
  async '/api/gather'(c, b, at, out, env) {
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
  // 벌목소·채석장 알바: 고용 · 모인 것 받기
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
  // 소원 분수: 5분에 한 번, 100골드 (2026-11-21 개편: 꽝 30%, 사냥 N분어치 골드·경험치, 버프 60분, 잭팟 = 모인 돈 × 1.5)
  // play()가 다시 시도해도 같은 결과가 나오게 굴린 값·잭팟 금액은 b에 기억 (잭팟을 두 번 받지 않게)
  async '/api/wish'(c, b, at, out, env, user) {
    townOnly(c);
    const L = c.life, left = Math.ceil((L.wishAt + WISH.cd * (eventNow(at)?.k === 'wish' ? .5 : 1) - at) / 1000);
    if (left > 0) fail(400, `분수가 아직 잔잔해요. ${Math.ceil(left / 60)}분 뒤에 다시 빌 수 있어요`);
    spend(c, WISH.cost); L.wishAt = at; cntAdd(c, 'wish');
    const o = b._o ||= rollWish(), r = { k: o.k };
    if (o.k === 'gold' || o.k === 'rainbow') { r.gold = wishGold(c.lv, o.m); c.gold += r.gold; }
    if (o.k === 'exp') { r.exp = wishExp(c.lv, o.m); r.up = addExp(c, r.exp); }
    if (o.k === 'jackpot') { b._jp ??= await jackpot(env, user); r.gold = b._jp; c.gold += r.gold; c._noEarn = 1; }
    if (o.k === 'jackpot' || o.k === 'rainbow') cntAdd(c, 'jackpot');
    if (o.b) { L.buff = { k: o.b, until: at + o.min * 60e3 }; r.buff = o.b; r.min = o.min; }
    if (o.k === 'pots') { r.n = o.n; c.pots.xl = Math.min(999, c.pots.xl + o.n); }
    return { wish: r, log: ['wish', o.k], chron: o.k === 'jackpot' ? ['wish', `소원 분수에서 💰 잭팟! 🪙 ${r.gold.toLocaleString()}골드를 받았어요`] : null,
      after: () => env.DB.prepare('UPDATE fountain SET pool = pool + ? WHERE id = 1').bind(WISH.cost).run().then(() => { FOUNT.at = 0; }).catch(() => {}) };   // 던진 골드는 분수에 모임
  },
  // 집: 짓기(처음) · 옮기기(이사) · 지붕 색. 집 자리는 서버가 지도로 확인
  async '/api/house/build'(c, b, at, out, env, user) {
    townOnly(c);
    const x = Number(b.x), y = Number(b.y), roof = Math.max(0, Math.min(HOUSE.roofs.length - 1, Math.trunc(Number(b.roof)) || 0)), had = !!c.life.house;
    if (!Number.isInteger(x) || !Number.isInteger(y)) fail(400, '집을 지을 수 없는 자리예요');
    const others = (await env.DB.prepare('SELECT x, y FROM houses WHERE user_id != ?').bind(user.id).all()).results;
    const why = canHouseD(x, y, others); if (why) fail(400, why);
    // 집은 치복동 A동에 (2026-11-19). 타운에 있던 집(d 없음)은 처음 한 번 무료로 다시 놓음
    const cost = !had ? HOUSE.cost : c.life.house.d ? HOUSE.move : { gold: 0, wood: 0, stone: 0 };
    if (c.gold < cost.gold) fail(400, '골드가 부족해요');
    for (const r of ['wood', 'stone']) if (c.life.res[r] < cost[r]) fail(400, `${r === 'wood' ? '목재' : '석재'}가 부족해요`);
    c.gold -= cost.gold; c.life.res.wood -= cost.wood; c.life.res.stone -= cost.stone;
    c.life.house = { ...(had ? c.life.house : { lv: 0 }), x, y, d: 1, roof: had ? c.life.house.roof : roof }; if (!had) cntAdd(c, 'house');
    const h = c.life.house;
    return { moved: had, log: ['house', `${x},${y}`], chron: had ? null : ['house', '치복동에 집을 지었어요'],
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
    c.points -= sum; cntAdd(c, 'statUp');
  },
};
async function saveLook(req, env, user) {
  const b = await readBody(req), c = await env.DB.prepare('SELECT hats FROM characters WHERE user_id = ?').bind(user.id).first();
  const owned = JSON.parse(c.hats);
  const face = FACES.includes(b.face) ? b.face : null, body = BODIES.includes(b.body) ? b.body : null;
  const eyes = b.eyes === 'dot' || (EYE_SKINS.some(e => e.id === b.eyes) && owned.includes('eye:' + b.eyes)) ? b.eyes : null;
  const hat = typeof b.hat === 'string' && (owned.includes(b.hat) || HATS.some(h => h.free && h.id === b.hat)) ? b.hat : null;
  const hair = HAIRS.some(h => h.id === hairId(b.hair)) ? hairId(b.hair) : null, hairC = HAIR_COLORS.includes(b.hairC) ? b.hairC : null, hh = typeof b.hatHair === 'boolean' ? (b.hatHair ? 1 : 0) : null;
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
  await env.DB.prepare('UPDATE characters SET face = COALESCE(?, face), body = COALESCE(?, body), eyes = COALESCE(?, eyes), hat = COALESCE(?, hat), hair = COALESCE(?, hair), hair_c = COALESCE(?, hair_c), hat_hair = COALESCE(?, hat_hair), suit = COALESCE(?, suit), wsk = COALESCE(?, wsk), intro = COALESCE(?, intro), ver = ver + 1, updated_at = ? WHERE user_id = ?')
    .bind(face, body, eyes, hat, hair, hairC, hh, suit, wsk, intro, now(), user.id).run();
  return json({ me: await loadMe(env, user) });
}
// 나무·바위 자리는 캐고 나면(그루터기·돌 흔적) 지나갈 수 있음 (2026-11-20) → 위치 저장은 그 칸도 허락
const NODE_T = new Set(NODES.map(n => n.y * MW + n.x)), walkSolid = (x, y) => isSolid(x, y) && !NODE_T.has(y * MW + x);
async function saveMove(req, env, user) {
  const b = await readBody(req), x = Number(b.x), y = Number(b.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) fail(400, '위치가 이상해요');
  const cx = Math.max(T / 2, Math.min(MW * T - T / 2, x)), cy = Math.max(T / 2, Math.min(MH * T - T / 2, y));
  if (walkSolid(Math.floor(cx / T), Math.floor(cy / T))) return json({ ok: false });
  // 사냥 중에는 마을 위치를 바꾸지 않음
  // 2026-11-20 위치 저장이 '화면 켜짐' 신호도 겸함 (life.seen). ver는 안 올림 → 다른 저장과 부딪혀 다시 하는 일이 줄어듦
  const t = now();
  await env.DB.prepare("UPDATE characters SET x = ?, y = ?, life = CASE WHEN json_valid(life) THEN json_set(life, '$.seen', ?) ELSE life END, updated_at = ? WHERE user_id = ? AND hunt = ''").bind(cx, cy, t, t, user.id).run();
  return json({ ok: true });
}
// 닉네임 바꾸기 (2026-11-18): 일주일에 한 번. 로그인 아이디도 새 닉네임으로 바뀜
const NICK_GAP = 7 * 864e5;
async function changeNick(req, env, s) {
  const b = await readBody(req), user = s.user, nick = String(b.nick || '').trim(), t = now();
  if (user.nick_at && t - user.nick_at < NICK_GAP) { const d = Math.ceil((user.nick_at + NICK_GAP - t) / 864e5); fail(429, `닉네임은 일주일에 한 번만 바꿀 수 있어요 (${d}일 남음)`); }
  if (nick === user.nick) fail(400, '지금 닉네임과 같아요');
  if (!allOk(nickChecks(nick))) fail(400, '닉네임 규칙을 확인해 주세요 (띄어쓰기 포함 2~10글자, 한글·영문·숫자·띄어쓰기)');
  if (nick === OWNER_NICK && !user.is_admin) fail(400, '쓸 수 없는 닉네임이에요');
  if (scanBad(nick).hit) fail(400, '닉네임에 쓸 수 없는 말이 들어 있어요');
  const same = await findUser(env, nick); if (same && same.id !== user.id) fail(409, '이미 있는 닉네임이에요');
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET nick = ?, nick_key = ?, nick_at = ? WHERE id = ?').bind(nick, nick.toLowerCase(), t, user.id),
    env.DB.prepare('INSERT INTO activity (user_id, kind, detail, at) VALUES (?, ?, ?, ?)').bind(user.id, 'nick', `${user.nick} → ${nick}`, t),
  ]);
  RANK_MEM_CLEAR();
  await toRooms(env, { act: 'nick', id: user.id, n: nick });   // 마을에 있는 사람들 화면의 이름표도 바로
  try { await env.CHZZK.get(env.CHZZK.idFromName('main')).fetch('https://chzzk/nick'); } catch {}   // 치지직 채팅 연동도 새 닉네임으로 바로 (예전엔 30초 기억 때문에 늦었음)
  return json({ ok: true, nick, nickAt: t });
}
// 2026-11-20 치지직 연동 확인 (닉네임 창 버튼 · 닉네임 바꾼 뒤): 방송 중인지 · 이번 방송 채팅에 이 닉네임이 있었는지 · 지금 마을에서 연동되는 자리인지
async function chzzkCheck(env, user) {
  let cz = { live: false, at: 0 }; try { cz = await (await env.CHZZK.get(env.CHZZK.idFromName('main')).fetch('https://chzzk/seen?n=' + encodeURIComponent(user.nick))).json(); } catch {}
  let town = null;
  for (let ch = 1; ch <= MAX_CH && !town; ch++) try { town = await (await env.TOWN.get(env.TOWN.idFromName('town-' + ch)).fetch('https://town/where?id=' + user.id)).json(); } catch {}
  return json({ nick: user.nick, live: !!cz.live, seen: cz.at || 0, town });
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
// 던지기: 쿨타임 확인 후 던진 자리·시각만 기억 (life.fcast). 결과는 당길 때 정함
async function fishCast(c, b, at, env, user) {
  townOnly(c); notWorking(c);
  // 2026-11-20 마지막으로 던진 시각은 캐릭터(life.fcAt)에 같이 저장 → 낚시 기록표를 읽고 쓰지 않음 (DB 쓰기 줄이기)
  const left = Math.ceil(((c.life.fcAt || 0) + FISHING.cooldown - at) / 1000);
  if (left > 0) fail(429, `${left}초 뒤에 다시 던질 수 있어요`);
  if (fishBag(c).length >= FISH_BAG && !FG_KEYS.every(g => c.life.fsell?.[g])) fail(400, `물고기 가방이 꽉 찼어요 (${FISH_BAG}마리). 낚시점에서 팔아 주세요`);
  const w = Array.isArray(b.w) && b.w.length === 2 && b.w.every(Number.isInteger) ? b.w : null;
  if (!w || !waterIn(w[0], w[1])) fail(400, '물에만 낚싯대를 던질 수 있어요');   // 2026-11-20 지도 밖(가장자리 바깥)이나 땅에 던진 건 거절
  // 찌 자리는 던진 물 칸에서 2칸 안이어야 함 (멀리서 물고기 그림자만 노리지 못하게)
  const p = w && Array.isArray(b.p) && b.p.length === 2 && b.p.every(Number.isFinite) && Math.hypot(b.p[0] - (w[0] + .5) * T, b.p[1] - (w[1] + .5) * T) < 2 * T ? b.p : null;
  const q = Array.isArray(b?.q) && b.q.length === 2 && Number.isFinite(+b.q[0]) && Number.isFinite(+b.q[1]) ? [+b.q[0], +b.q[1]] : null, wait = fishWait();
  c.life.fcast = { at, wait, w, p, q }; c.life.fcAt = at;
  return { wait, cooldown: FISHING.cooldown, cast: 1 };
}
// 당기기: 던진 지 wait가 지났을 때만 (조금 일찍은 봐줌). 너무 오래 지나면 놓침
async function fishReel(c, now, env, user) {
  townOnly(c); notWorking(c);
  const fc = c.life.fcast; if (!fc) fail(400, '던진 낚싯대가 없어요');
  if (now < fc.at + fc.wait - 1500) fail(400, '아직 입질이 없어요');
  delete c.life.fcast;
  const cn = c.life.cnt || (c.life.cnt = {}); cn.cast = fishCasts(cn) + 1;   // 낚시 횟수 (낚든 놓치든 당기면 1번)
  if (now > fc.at + fc.wait + 30e3) return { caught: false, gone: 1, cooldown: FISHING.cooldown, fish: { i: '💨', n: '물고기', grade: 'common' } };
  return fishOnce(c, fc, fc.at, env, user, now);
}
const fishBag = c => (Array.isArray(c.life.fbag) ? c.life.fbag : (c.life.fbag = []));
async function fishOnce(c, b, at, env, user, now) {
  const fd = Array.isArray(c.life.fday) ? c.life.fday : [];   // [날짜, 그날 낚은 수] (2026-11-20 기록표 대신 캐릭터에)
  const w = Array.isArray(b.w) && b.w.length === 2 && b.w.every(Number.isInteger) ? b.w : null, sea = !!w && tileAt(w[0], w[1]) === WATER && seaAt(w[0], w[1]);
  // 물고기 그림자 근처에 던지면 좋은 물고기 (미끼 +3단계로 두 번 굴려 비싼 것, 낚을 확률 +12%p)
  const gone = Array.isArray(c.life.fsh) ? c.life.fsh : (c.life.fsh = []), p = Array.isArray(b.p) && b.p.length === 2 && b.p.every(Number.isFinite) ? b.p : null;
  // 그림자 판정 (2026-11-18 후하게): 찌 자리 또는 누른 자리(찌에서 5칸 안) · 지금/3초 전/6초 전 그림자 위치
  const q = Array.isArray(b?.q) && p && Number.isFinite(+b.q[0]) && Number.isFinite(+b.q[1]) && Math.hypot(b.q[0] - p[0], b.q[1] - p[1]) < 5 * T ? [+b.q[0], +b.q[1]] : null;
  let sh = null; if (p) for (const dt of [0, 3000, 6000]) { sh = shadowAt(at - dt, p[0], p[1], gone) || (q && shadowAt(at - dt, q[0], q[1], gone)); if (sh) break; }
  const D = derive(c), F = c.life.fish, wait = 0;
  // 2026-11-20 새 규칙: 먼저 낚을 확률(낚싯대) → 낚았으면 물고기 정하기(미끼·낚싯대). 그림자 근처면 미끼 +3단계로 두 번 굴려 비싼 것
  let fish = rollFish(F.rod, F.bait, sea);
  if (sh) { const b2 = Math.min(9, F.bait + FSHADOW.bait), f2 = rollFish(F.rod, b2, sea), f3 = rollFish(F.rod, b2, sea); fish = f2.price >= f3.price ? f2 : f3; }
  const lgOnly = !!c.life.lgOnly;   // 관리자 치트: 전설만 + 늘 낚임
  if (lgOnly) for (let i = 0; i < 400 && fish.grade !== 'legend'; i++) fish = rollFish(RODS.length - 1, BAITS.length - 1, sea);
  const base = { wait, cooldown: FISHING.cooldown, sea, sh: sh ? sh.id : 0 };
  if (!lgOnly && Math.random() >= Math.min(.99, fishHit(F.rod, D.fx) + (sh ? FSHADOW.hit : 0))) return { ...base, caught: false, fish: { i: fish.i, n: fish.n, grade: fish.grade, id: fish.id } };
  const day = dayKey(now), dayN = fd[0] === day ? fd[1] + 1 : 1; c.life.fday = [day, dayN]; const tired = 1;   // 2026-11-21 사용자 요청: '하루 400마리 넘으면 값 절반' 없앰 (원래 매크로 대비용) // 하루에 너무 많이 낚으면 값이 절반
  const big = isBigFish(fish), price = Math.round(fish.price * tired), info = JSON.stringify({ id: fish.id, i: fish.i, n: fish.n, grade: fish.grade, len: fish.len, price });
  const sell = Math.min(FISH_PRICE_MAX, Math.round(price * (1 + ((D.fx.fishP || 0) + (D.fx.fishC || 0)) / 100)));
  const info2 = JSON.stringify({ id: fish.id, i: fish.i, n: fish.n, grade: fish.grade, len: fish.len, price: sell });
  // 물고기 가방에 넣음 (최대 50). 그 등급을 '낚자마자 팔기'로 해 두었거나 가방이 꽉 찼으면 바로 팔림
  const bag = fishBag(c), auto = !!c.life.fsell?.[fish.grade] || bag.length >= FISH_BAG;
  if (auto) c.gold += sell; else { const k = c.life.fbk = (c.life.fbk || 0) + 1; bag.push({ k, id: fish.id, len: fish.len, p: sell, at: now }); }
  cntAdd(c, 'fish'); cntAdd(c, 'fc_' + fish.id); if (fish.grade === 'legend') cntAdd(c, 'lf_' + fish.id);   // fc_ = 도감용 어종별 수, lf_ = 전설 칭호
  if (sh) { const old = (Math.floor(at / FSHADOW.slot) - 8) * 10; c.life.fsh = [...gone.filter(id => id >= old), sh.id]; }   // 낚은 그림자는 사라짐
  const lexp = lifeExp(c, 'fish'); addExp(c, lexp);
  if (big) cntAdd(c, 'perfect'); if (fish.grade === 'legend') cntAdd(c, 'legendFish'); if (fish.n === '낡은 장화') cntAdd(c, 'boot');
  return { ...base, caught: true, big, lexp, fish: { ...fish, price: sell }, sold: auto ? 1 : 0, bagN: bag.length, tired: tired < 1, chron: fish.grade === 'legend' ? ['fish', `전설 물고기 ${fish.n} ${fish.len}cm를 낚았어요!`] : null,
    after: async () => { await env.DB.prepare(`INSERT INTO fishing (user_id, bait, count, gold, day, day_n, best_price, best_price_fish, best_len, best_len_fish) VALUES (?, '', 1, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET count = count + 1, gold = gold + excluded.gold, day = excluded.day, day_n = excluded.day_n,
        best_price_fish = CASE WHEN excluded.best_price > best_price THEN excluded.best_price_fish ELSE best_price_fish END, best_price = MAX(best_price, excluded.best_price),
        best_len_fish = CASE WHEN excluded.best_len > best_len THEN excluded.best_len_fish ELSE best_len_fish END, best_len = MAX(best_len, excluded.best_len)`)
      .bind(user.id, sell, day, dayN, sell, info2, fish.len, info2).run(); delete RANK_MEM._fish; delete RANK_MEM.fishp; delete RANK_MEM.fishl; delete RANK_MEM.fishn; } };   // 낚았을 때만 한 번 씀 (없으면 새로). 2026-11-21 낚은 순간의 값(효과 포함)으로 기록하고 랭킹 기억을 비움 → 바로 반영
}

// ───────── 랭킹 (2026-11-17): 레벨 · 번 돈 · 낚시 · 강화 합 · 기여도. 상위 50명 + 내 순위. 1분 동안 기억 ─────────
// json 칸이 비었거나 깨진 계정이 하나라도 있으면 json_extract가 검색 전체를 실패시킴 → json_valid로 먼저 확인 (2026-11-17)
const jx = (col, path) => `COALESCE(CASE WHEN json_valid(${col}) THEN json_extract(${col}, '${path}') END, 0)`;
const ENH_SUM = ['sword', 'bow', 'staff', 'hat', 'armor', 'shoes'].map(k => jx('c.enh', '$.' + k)).join(' + ');
const RANK = {
  lv: { v: 'c.lv', t: 'c.exp', min: 10 },   // 2026-11-20 사용자 요청: 레벨 랭킹은 Lv.10부터
  earn: { v: jx('c.life', '$.earn'), t: 'c.lv' },
  kills: { v: jx('c.life', '$.cnt.kills'), t: 'c.lv' },   // 2026-11-21 사냥 랭킹: 잡은 몬스터 수
  fishp: { v: 'COALESCE(f.best_price, 0)', t: 'COALESCE(f.count, 0)', i: 'f.best_price_fish' },   // 제일 비싼 물고기
  fishl: { v: 'COALESCE(f.best_len, 0)', t: 'COALESCE(f.count, 0)', i: 'f.best_len_fish' },       // 제일 큰 물고기
  fishn: { v: 'COALESCE(f.count, 0)', t: 'COALESCE(f.best_price, 0)' },                              // 제일 많이 잡은 (2026-11-20)
  enh: { v: `(${ENH_SUM})`, t: 'c.lv' },
  give: { v: 'ROUND(COALESCE(g.score, 0))', t: 'c.lv' },   // 기여도: 공동 건설에 기부한 점수
};
const RANK_MEM = {};
const rankFish = s => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
// 랭킹에 안 나오는 계정 (2026-11-17 사용자 요청: 김치복 · 테스트, 그리고 시험용 zz 계정)
const RANK_MEM_CLEAR = () => { for (const k in RANK_MEM) delete RANK_MEM[k]; };
const TEST_NICK = '테스트';   // 관리자 화면 '테스트 계정으로 전환' 계정 (랭킹 · 어뷰징 검사에서 빠짐)
const RANK_HIDE = "u.nick <> '테스트' AND u.nick NOT LIKE 'zz%'";   // 2026-11-20 김치복도 랭킹에 들어감
async function rankList(env, user, k) {
  if (!own(RANK, k)) fail(400, '잘못된 요청이에요');
  // 2026-11-20 그 종목에 필요한 표만 이어 붙이고, 순위 전체(최대 3000명)를 1분 기억 → 내 순위도 기억한 목록에서 찾음 (예전엔 열 때마다 모든 계정을 다시 셌음)
  const R = RANK[k], from = 'FROM characters c JOIN users u ON u.id = c.user_id' + (k.startsWith('fish') ? ' LEFT JOIN fishing f ON f.user_id = c.user_id' : '') + (k === 'give' ? ' LEFT JOIN village_give g ON g.user_id = c.user_id' : '') + ' WHERE u.banned = 0 AND ' + RANK_HIDE;
  let M = RANK_MEM[k];
  if (!M || now() - M.at > 60e3) {
    const r = await env.DB.prepare(`SELECT u.id, u.nick, c.lv, c.cls, c.title, ${R.v} AS v, ${R.t} AS t, ${R.i || 'NULL'} AS i ${from} AND ${R.min ? `${R.v} >= ${R.min}` : `${R.v} > 0`} ORDER BY v DESC, t DESC, u.id LIMIT 3000`).all();
    const all = r.results; M = RANK_MEM[k] = { at: now(), all, pos: new Map(all.map((x, i) => [x.id, i])), list: all.slice(0, 50).map(x => ({ id: x.id, nick: x.nick, lv: x.lv, cls: x.cls, title: x.title, v: x.v, f: rankFish(x.i) })) };
  }
  const i = M.pos.get(user.id), mine = i === undefined ? null : M.all[i];
  return json({ k, list: M.list, me: { v: mine?.v || 0, rank: mine ? i + 1 : 0, f: rankFish(mine?.i) }, at: M.at });
}

async function fishRank(env, user) {
  const q = (order, where) => env.DB.prepare(`SELECT u.nick, f.count, f.best_price_fish, f.best_len_fish FROM fishing f JOIN users u ON u.id = f.user_id WHERE ${where} AND u.banned = 0 AND ${RANK_HIDE} ORDER BY ${order} DESC LIMIT 10`);
  let B = RANK_MEM._fish; if (!B || now() - B.at > 30e3) { const [a, b2, c2] = await env.DB.batch([q('f.best_price', 'f.best_price > 0'), q('f.best_len', 'f.best_len > 0'), q('f.count', 'f.count > 0')]); B = RANK_MEM._fish = { at: now(), r: [a, b2, c2] }; }   // 2026-11-20 30초 기억
  const [price, len, count] = B.r, mine = await env.DB.prepare('SELECT count, gold, best_price_fish, best_len_fish FROM fishing WHERE user_id = ?').bind(user.id).all();
  const fish = s => (s ? JSON.parse(s) : null);
  const rows = r => r.results.map(x => ({ nick: x.nick, count: x.count, price: fish(x.best_price_fish), len: fish(x.best_len_fish) }));
  const m = mine.results[0];
  return json({ price: rows(price), len: rows(len), count: rows(count), mine: m ? { count: m.count, gold: m.gold, price: fish(m.best_price_fish), len: fish(m.best_len_fish) } : null, cooldown: FISHING.cooldown });
}

// 농사 랭킹판 (2026-11-20): 제일 비싼 작물 · 제일 무거운 작물 · 수확 수, 상위 10명
async function farmRank(env, user) {
  const q = order => env.DB.prepare(`SELECT u.nick, f.count, f.best_price_crop, f.best_w_crop FROM farming f JOIN users u ON u.id = f.user_id WHERE ${order} > 0 AND u.banned = 0 AND ${RANK_HIDE} ORDER BY ${order} DESC LIMIT 10`);
  let B = RANK_MEM._farm; if (!B || now() - B.at > 30e3) B = RANK_MEM._farm = { at: now(), r: await env.DB.batch([q('f.best_price'), q('f.best_w'), q('f.count')]) };   // 2026-11-20 30초 기억
  const [price, w, count] = B.r, mine = await env.DB.prepare('SELECT count, best_price_crop, best_w_crop FROM farming WHERE user_id = ?').bind(user.id).all();
  const cr = s => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
  const rows = r => r.results.map(x => ({ nick: x.nick, count: x.count, price: cr(x.best_price_crop), w: cr(x.best_w_crop) }));
  const m = mine.results[0];
  return json({ price: rows(price), w: rows(w), count: rows(count), mine: m ? { count: m.count, price: cr(m.best_price_crop), w: cr(m.best_w_crop) } : null });
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
// ───── 건의 게시판 (2026-11-20): 공개 글은 모두가, 비공개(priv) 글은 쓴 사람과 김치복(관리자)만 봄 ─────
const SUGGEST_MAX = 500;
async function suggestList(env, user) {
  const adm = !!user.is_admin;
  const rows = (await env.DB.prepare(`SELECT s.id, s.user_id AS uid, u.nick, s.body, s.priv, s.at FROM suggestions s JOIN users u ON u.id = s.user_id
    WHERE u.banned = 0 AND (s.priv = 0 OR s.user_id = ? OR ?) ORDER BY s.at DESC LIMIT 60`).bind(user.id, adm ? 1 : 0).all()).results;
  return json({ list: rows.map(r => ({ ...r, mine: r.uid === user.id })), max: SUGGEST_MAX, admin: adm });
}
async function suggestWrite(req, env, user) {
  const b = await readBody(req), t = now();
  let body = String(b.body || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (body.length < 5) fail(400, '5글자 이상 써 주세요');
  if ([...body].length > SUGGEST_MAX) fail(400, `${SUGGEST_MAX}글자까지 쓸 수 있어요`);
  const r = scanBad(body); if (r.hard) fail(400, '쓸 수 없는 말이 들어 있어요'); body = r.text;
  const last = await env.DB.prepare('SELECT at FROM suggestions WHERE user_id = ? ORDER BY at DESC LIMIT 1').bind(user.id).first();
  if (last && t - last.at < 60e3) fail(429, '1분 뒤에 다시 쓸 수 있어요');
  if ((await env.DB.prepare('SELECT COUNT(*) AS n FROM suggestions WHERE user_id = ? AND at > ?').bind(user.id, t - DAY).first()).n >= 5) fail(429, '건의 글은 하루 5개까지예요');
  await env.DB.prepare('INSERT INTO suggestions (user_id, body, priv, at) VALUES (?, ?, ?, ?)').bind(user.id, body, b.priv ? 1 : 0, t).run();
  return suggestList(env, user);
}
async function suggestDel(req, env, user) {
  const b = await readBody(req), id = Number(b.id);
  const r = await env.DB.prepare('SELECT user_id FROM suggestions WHERE id = ?').bind(id).first(); if (!r) fail(404, '없는 글이에요');
  if (r.user_id !== user.id && !user.is_admin) fail(403, '내 글만 지울 수 있어요');
  await env.DB.prepare('DELETE FROM suggestions WHERE id = ?').bind(id).run();
  return suggestList(env, user);
}
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
  if (k === 'skmax') { L.sk = L.sk || {}; for (const x of SKILLS) L.sk[x.id] = Math.max(L.sk[x.id] || 0, SK_NEED[SK_MAX - 1]); return { msg: `스킬 ${SKILLS.length}개 모두 Lv.${SK_MAX}` }; }   // 2026-11-20 모든 스킬 최고 레벨
  if (k === 'rskmax') {   // 레이드 스킨 모두 + 최고 레벨 (2026-11-18)
    const keys = Object.values(RAID_BOSS).flatMap(b => raidSet(b.set)), need = 2 ** (RSK.max - 1);
    c.hats = [...new Set([...c.hats, ...keys])]; L.rsk = L.rsk || {}; for (const key of keys) L.rsk[key] = Math.max(L.rsk[key] || 0, need);
    return { msg: `레이드 스킨 ${keys.length}개 모두 Lv.${RSK.max}` };
  }
  if (k === 'gear') {   // 모든 칸에 최고 단계·최고 등급 + 최고 강화
    const g = Object.keys(GRADES).at(-1);
    for (const slot of Object.keys(SLOTS)) { c.equip[slot] = makeItem(slot, STAGES, g, null, rollOpts(slot, STAGES, g)); c.enh[slot] = ENH_MAX; }
    c.bag = []; c.hp = derive(c).maxHp; return { msg: `모든 칸에 ${STAGES}단계 ${GRADES[g].n} + 강화 ${ENH_MAX}` };
  }
  if (k === 'farm') { for (const p of L.farm.plots) if (p) p.r = at; return { msg: '텃밭 다 자람' }; }
  if (k === 'fishmax') { L.fish.rod = RODS.length - 1; L.fish.bait = BAITS.length - 1; return { msg: '낚싯대 · 미끼 최고 단계' }; }   // 2026-11-20
  if (k === 'lgcrop') { L.lgCrop = !L.lgCrop; return { msg: L.lgCrop ? '전설 작물만 심기 켬 (지금부터 심는 씨앗)' : '전설 작물만 심기 끔' }; }
  if (k === 'lgonly') { L.lgOnly = !L.lgOnly; return { msg: L.lgOnly ? '전설 물고기만 낚이기 켬' : '전설 물고기만 낚이기 끔' }; }
  if (k === 'farmmax') { L.farm.hoe = 9; L.farm.fert = 9; return { msg: '호미 · 비료 최고 단계' }; }
  if (k === 'work') {
    for (const [w, W] of Object.entries(WORK)) { const x = L.work[w]; if (!x.n) x.n = 1; x.acc = x.n * W.rate * W.cap; x.at = at; }
    return { msg: '벌목소·채석장 창고 가득' };
  }
  if (k === 'cool') {   // 분수·채집·나무·바위·낚시 기다리는 시간 없애기
    L.wishAt = 0; L.gatherAt = 0; L.nodes = {}; for (const p of L.farm.plots) if (p) p.r = at; if (c.jobAt) c.jobAt = 1;
    L.fcAt = 0; return { msg: '기다리는 시간 모두 없앰' };
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

// 관리자 버튼 숫자: 처리 안 한 신고 · 의심 계정
async function admCounts(env) {
  const t = now(), [r, f] = await env.DB.batch([
    env.DB.prepare('SELECT COUNT(DISTINCT target_id) AS n FROM reports WHERE done = 0'),
    env.DB.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM flags WHERE ok_until < ?').bind(t)]);
  return { reports: r.results[0].n, flags: f.results[0].n };
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
    const res = await raidDO(env).fetch('https://raid/force', { method: 'POST', body: JSON.stringify({ boss: body?.boss }) }), j = await res.json(); if (!res.ok) fail(400, j.error);
    await toRooms(env, { act: 'raid', start: j.start }); await done('raid', String(j.start));
    return json({ ok: true, start: j.start });
  }
  if (m === 'POST' && p === '/api/admin/cheat') {
    if (user.nick !== TEST_NICK) fail(403, '치트는 테스트 계정에서만 쓸 수 있어요 (관리자 화면 → 테스트 계정으로 전환)');   // 2026-11-20 김치복은 플레이어 캐릭터
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
  if (m === 'GET' && p === '/api/admin/user') {   // 닉네임 또는 id로 찾기 (2026-11-20 같은 IP·기기 계정 · 의심 · 사본 같이)
    const sel = 'SELECT u.id, u.nick, u.created_at, u.last_login, u.banned, u.mute_until, u.is_admin, c.lv, c.gold FROM users u LEFT JOIN characters c ON c.user_id = u.id WHERE ';
    const u = q('id') ? await DB.prepare(sel + 'u.id = ?').bind(Number(q('id'))).first() : await DB.prepare(sel + 'u.nick_key = ?').bind(q('nick').trim().toLowerCase()).first();
    if (!u) fail(404, '그 닉네임은 없어요');
    const [w, r, links, fl, snaps, acc] = await DB.batch([
      DB.prepare('SELECT COUNT(*) AS n FROM warnings WHERE user_id = ? AND at > ?').bind(u.id, t - 7 * DAY),
      DB.prepare('SELECT COUNT(*) AS n FROM reports WHERE target_id = ? AND done = 0').bind(u.id),
      DB.prepare(`SELECT b.user_id AS id, x.nick, x.banned, c.lv, GROUP_CONCAT(DISTINCT a.kind) AS kinds, MAX(b.last_at) AS last FROM access a JOIN access b ON b.kind = a.kind AND b.h = a.h AND b.user_id <> a.user_id
        JOIN users x ON x.id = b.user_id LEFT JOIN characters c ON c.user_id = b.user_id WHERE a.user_id = ? GROUP BY b.user_id ORDER BY last DESC LIMIT 30`).bind(u.id),
      DB.prepare('SELECT k, why, score, at, ok_until FROM flags WHERE user_id = ? ORDER BY score DESC').bind(u.id),
      DB.prepare('SELECT day, lv, gold, at FROM char_snap WHERE user_id = ? ORDER BY at DESC').bind(u.id),
      DB.prepare("SELECT COUNT(CASE WHEN kind = 'ip' THEN 1 END) AS ip, COUNT(CASE WHEN kind = 'dev' THEN 1 END) AS dev FROM access WHERE user_id = ?").bind(u.id)]);
    return json({ user: { ...u, warns: w.results[0].n, reports: r.results[0].n, ips: acc.results[0].ip, devs: acc.results[0].dev }, links: links.results, flags: fl.results, snaps: snaps.results });
  }
  if (m === 'GET' && p === '/api/admin/overview') {   // 관리자 화면 맨 위 요약
    const [users, sign, act, rep, fl] = await DB.batch([
      DB.prepare('SELECT COUNT(*) AS n FROM users'),
      DB.prepare('SELECT COUNT(*) AS n FROM users WHERE created_at > ?').bind(t - DAY),
      DB.prepare('SELECT COUNT(*) AS n FROM characters WHERE updated_at > ?').bind(t - DAY),
      DB.prepare('SELECT COUNT(DISTINCT target_id) AS n FROM reports WHERE done = 0'),
      DB.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM flags WHERE ok_until < ?').bind(t)]);
    return json({ users: users.results[0].n, signups: sign.results[0].n, active: act.results[0].n, reports: rep.results[0].n, flags: fl.results[0].n, maint: await maintGet(env, true) });
  }
  if (m === 'GET' && p === '/api/admin/flags') {   // 의심 계정 (점수 높은 순)
    const rows = (await DB.prepare(`SELECT f.user_id AS id, u.nick, u.created_at, u.banned, c.lv, f.k, f.why, f.score, f.at FROM flags f JOIN users u ON u.id = f.user_id LEFT JOIN characters c ON c.user_id = f.user_id
      WHERE f.ok_until < ? ORDER BY f.at DESC LIMIT 400`).bind(t).all()).results, by = new Map();
    for (const r of rows) { let x = by.get(r.id); if (!x) by.set(r.id, x = { id: r.id, nick: r.nick, lv: r.lv, created_at: r.created_at, banned: r.banned, score: 0, list: [] }); x.score += r.score; x.list.push({ k: r.k, why: r.why, at: r.at }); }
    return json({ users: [...by.values()].sort((a, b) => b.score - a.score), groups: (await groups(env, t)).filter(g => g.ids.length >= 2).length });
  }
  if (m === 'POST' && p === '/api/admin/flag-ok') {   // 문제 없음 → 그 기간 동안 의심 목록에서 숨김
    const u = await userOf(id), days = Math.max(1, Math.min(365, Number(body.days) || 30));
    await DB.prepare('UPDATE flags SET ok_until = ? WHERE user_id = ?').bind(t + days * DAY, u.id).run(); await done('flag-ok', `${u.nick} ${days}일`); return json({ ok: true });
  }
  if (m === 'POST' && p === '/api/admin/scan') { const n = await scan(env); await done('scan', String(n)); return json({ ok: true, n }); }   // 지금 바로 다시 검사
  if (m === 'POST' && p === '/api/admin/snap-now') { await snapAll(env, dayKey(t)); await done('snap', dayKey(t)); return json({ ok: true }); }
  if (m === 'POST' && p === '/api/admin/restore') {   // 이 계정 되돌리기 (사본 날짜)
    const u = await userOf(id), day = String(body.day || '');
    if (!(await restore(env, u.id, day, '되돌리기 전 ' + new Date(t + 9 * 3600e3).toISOString().slice(5, 16).replace('T', ' ')))) fail(404, '그 날짜 사본이 없어요');
    await toRooms(env, { act: 'kick', id: u.id, why: '관리자가 계정을 예전 상태로 되돌렸어요. 다시 들어와 주세요' });
    await done('restore', `${u.nick} ${day}`); return json({ ok: true });
  }
  if (m === 'POST' && p === '/api/admin/switch') {   // 2026-11-20 김치복 → 테스트 계정으로 바로 전환 (없으면 만듦, 치트를 쓰게 관리자로). 돌아오기는 화면이 김치복 토큰을 기억해 둠
    if (user.nick === TEST_NICK) fail(400, '이미 테스트 계정이에요');
    let u = await findUser(env, TEST_NICK);
    if (!u) {
      const salt = randB64(16), r = await DB.prepare('INSERT INTO users (nick, nick_key, pw_hash, pw_salt, pw_iter, rec_hash, created_at, last_login, is_admin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)')
        .bind(TEST_NICK, TEST_NICK.toLowerCase(), await pbkdf2(randB64(18), salt, PBKDF2_ITER), salt, PBKDF2_ITER, await sha256(newCode()), t, t).run();
      await charInsert(env, r.meta.last_row_id, t).run(); u = await findUser(env, TEST_NICK);
    }
    if (u.banned) fail(400, '테스트 계정이 차단돼 있어요');
    await DB.prepare('UPDATE users SET is_admin = 1, last_login = ? WHERE id = ?').bind(t, u.id).run();
    await done('switch', TEST_NICK); return json({ token: await newSession(env, u.id, true), nick: u.nick });
  }
  if (m === 'POST' && p === '/api/admin/maint') {   // 관리자만 접속 가능 (점검 모드)
    const v = { on: !!body.on, msg: String(body.msg || '').trim().slice(0, 100) };
    await DB.prepare("INSERT OR REPLACE INTO settings (k, v) VALUES ('maint', ?)").bind(JSON.stringify(v)).run(); maintSet(v);
    if (v.on) await toRooms(env, { act: 'maint', msg: v.msg || MAINT_MSG });
    await done('maint', `${v.on ? '켬' : '끔'} ${v.msg}`); return json({ ok: true, maint: v });
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
