// 2026-11-20 어뷰징 감시 · 매일 사본
// - 접속 기록(access): 계정마다 들어온 IP·기기의 해시만 (원래 IP는 저장 안 함)
// - 한 시간마다 scan(): 6가지 이상 징후를 flags 표에 적음 (자동으로 막지는 않음, 관리자가 보고 판단)
// - 하루 한 번 snapAll(): 최근 8일 안에 움직인 캐릭터를 통째로 사본 (7일 보관) → 관리자 '이 계정 되돌리기'
import { needExp, huntIdleExp } from '../../assets/js/game-rules.js';

const H = 3600e3, D = 864e5;
const enc = new TextEncoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const hash = async s => b64(await crypto.subtle.digest('SHA-256', enc.encode(s)));
export const devOf = req => { const d = String(req.headers.get('X-Dev') || ''); return /^[\w-]{4,40}$/.test(d) ? d : ''; };
export const ipHashOf = req => hash('acc:' + (req.headers.get('CF-Connecting-IP') || 'local'));
export const devHashOf = req => { const d = devOf(req); return d ? hash('dev:' + d) : Promise.resolve(''); };

// 접속 기록: 로그인 · 가입 · 게임 화면 열기(/api/me) 때
export async function track(env, uid, req) {
  const t = Date.now(), ip = await ipHashOf(req), dev = await devHashOf(req);
  const up = (k, h) => env.DB.prepare(`INSERT INTO access (user_id, kind, h, first_at, last_at, n) VALUES (?, ?, ?, ?, ?, 1)
    ON CONFLICT(user_id, kind, h) DO UPDATE SET last_at = excluded.last_at, n = n + 1`).bind(uid, k, h, t, t);
  await env.DB.batch([up('ip', ip), ...(dev ? [up('dev', dev)] : [])]).catch(() => {});
}
// 서버가 거절한 요청 수 (한 시간 단위)
export const bumpReject = (env, uid) => env.DB.prepare(`INSERT INTO rejects (user_id, hr, n) VALUES (?, ?, 1) ON CONFLICT(user_id, hr) DO UPDATE SET n = n + 1`)
  .bind(uid, Math.floor(Date.now() / H)).run().catch(() => {});

const cumExp = (lv, exp) => { let s = exp || 0; for (let l = 1; l < lv; l++) s += needExp(l); return s; };
const HIDE = "u.is_admin = 0 AND u.nick <> '테스트' AND u.nick NOT LIKE 'zz%'";

// 같은 IP·기기를 쓴 계정 묶음 (최근 30일). 같은 집 와이파이·같은 통신사(휴대폰)는 IP가 같을 수 있음
export async function groups(env, t = Date.now()) {
  const rows = (await env.DB.prepare(`SELECT a.kind, a.h, GROUP_CONCAT(a.user_id) AS ids, COUNT(*) AS cnt FROM access a JOIN users u ON u.id = a.user_id
    WHERE a.last_at > ? AND u.is_admin = 0 GROUP BY a.kind, a.h HAVING cnt >= 2`).bind(t - 30 * D).all()).results;
  return rows.map(r => ({ kind: r.kind, h: r.h, ids: String(r.ids).split(',').map(Number) }));
}

// 한 시간마다: 이상 징후 6가지
export async function scan(env) {
  const DB = env.DB, t = Date.now(), out = [], flag = (uid, k, why, score = 1) => out.push([uid, k, why, score]);
  const nick = new Map((await DB.prepare('SELECT id, nick FROM users').all()).results.map(r => [r.id, r.nick]));
  const nm = ids => ids.map(i => nick.get(i) || '#' + i).join(', ');

  // 1) 다중 계정: 같은 IP 또는 같은 기기에서 3개 넘게 (기기는 2개부터)
  const G = await groups(env, t), mates = new Map();   // 계정 → 같은 묶음 사람들
  for (const g of G) {
    for (const id of g.ids) { if (!mates.has(id)) mates.set(id, new Set()); for (const o of g.ids) if (o !== id) mates.get(id).add(o); }
    if (g.kind === 'dev' || g.ids.length >= 3) for (const id of g.ids)
      flag(id, 'multi-' + g.kind, `같은 ${g.kind === 'ip' ? 'IP(인터넷)' : '기기(브라우저)'}에서 ${g.ids.length}개 계정: ${nm(g.ids)}`, g.ids.length - 1);
  }

  // 2) 너무 빠른 성장: 지난 기록보다 경험치·번 돈이 보통의 몇 배로 늘었으면
  const chars = (await DB.prepare(`SELECT c.user_id AS id, c.lv, c.exp, CASE WHEN json_valid(c.life) THEN json_extract(c.life, '$.earn') END AS earn
    FROM characters c JOIN users u ON u.id = c.user_id WHERE c.updated_at > ? AND ${HIDE}`).bind(t - 2 * H).all()).results;
  const old = new Map((await DB.prepare('SELECT * FROM growth').all()).results.map(r => [r.user_id, r]));
  const saveG = [];
  for (const c of chars) {
    const xp = cumExp(c.lv, c.exp), earn = Number(c.earn) || 0, g = old.get(c.id), hr = g ? (t - g.at) / H : 0;
    if (g && hr >= .5 && hr <= 3) {
      const xr = (xp - g.xp) / hr, er = (earn - g.earn) / hr, xNorm = huntIdleExp(c.lv) / .7, gNorm = 1500 * c.lv + 8000;
      if (xr > xNorm * 4) flag(c.id, 'fast-exp', `경험치가 시간당 ${Math.round(xr).toLocaleString()} (보통의 ${(xr / xNorm).toFixed(1)}배)`, Math.min(5, Math.floor(xr / xNorm / 2)));
      if (er > Math.max(gNorm * 10, 5e5)) flag(c.id, 'fast-gold', `번 돈이 시간당 ${Math.round(er).toLocaleString()}골드 (보통의 ${(er / gNorm).toFixed(1)}배)`, Math.min(5, Math.floor(er / gNorm / 5)));
    }
    saveG.push(DB.prepare('INSERT OR REPLACE INTO growth (user_id, at, xp, earn) VALUES (?, ?, ?, ?)').bind(c.id, t, xp, earn));
  }

  // 3) 매크로·봇 의심: 하루 24시간 중 20시간 넘게 활동, 또는 6시간 동안 같은 일을 1,500번 넘게
  for (const r of (await DB.prepare(`SELECT a.user_id AS id, COUNT(DISTINCT a.at / 3600000) AS hrs FROM activity a JOIN users u ON u.id = a.user_id
      WHERE a.at > ? AND ${HIDE} GROUP BY a.user_id HAVING hrs >= 20`).bind(t - D).all()).results)
    flag(r.id, 'bot-hours', `24시간 중 ${r.hrs}시간 동안 쉬지 않고 활동 (자동 생활을 켜 둔 것일 수도 있어요)`, 2);
  for (const r of (await DB.prepare(`SELECT a.user_id AS id, a.kind, COUNT(*) AS n FROM activity a JOIN users u ON u.id = a.user_id
      WHERE a.at > ? AND a.kind NOT IN ('login', 'move') AND ${HIDE} GROUP BY a.user_id, a.kind HAVING n >= 1500`).bind(t - 6 * H).all()).results)
    flag(r.id, 'bot-repeat', `6시간 동안 '${r.kind}'만 ${r.n.toLocaleString()}번 반복`, 2);

  // 4) 짧은 시간에 서버가 거절한 요청이 많음 (조작한 요청을 보내 보는 것일 수 있음)
  for (const r of (await DB.prepare(`SELECT r.user_id AS id, SUM(r.n) AS tot FROM rejects r JOIN users u ON u.id = r.user_id
      WHERE r.hr >= ? AND ${HIDE} GROUP BY r.user_id HAVING tot >= 60`).bind(Math.floor(t / H) - 1).all()).results)
    flag(r.id, 'rejects', `최근 2시간 동안 서버가 거절한 요청 ${r.tot}번`, r.tot >= 200 ? 3 : 1);

  // 5) 짜고 하기: 같은 묶음 계정끼리 같은 사람을 신고 / 같은 레이드에 자주 같이
  for (const r of (await DB.prepare('SELECT target_id, GROUP_CONCAT(DISTINCT reporter_id) AS ids FROM reports WHERE at > ? GROUP BY target_id HAVING COUNT(DISTINCT reporter_id) >= 2').bind(t - 7 * D).all()).results) {
    const ids = String(r.ids).split(',').map(Number), bad = ids.filter(i => ids.some(o => o !== i && mates.get(i)?.has(o)));
    for (const id of bad) flag(id, 'report-ring', `같은 IP·기기 계정끼리 ${nick.get(r.target_id) || '#' + r.target_id}님을 같이 신고: ${nm(bad)}`, 2);
  }
  const raidB = new Map();   // 30분 칸 → 그 레이드 참여자
  for (const r of (await DB.prepare("SELECT user_id, at FROM activity WHERE kind = 'raid' AND at > ?").bind(t - 7 * D).all()).results) {
    const k = Math.floor(r.at / 1800e3); if (!raidB.has(k)) raidB.set(k, new Set()); raidB.get(k).add(r.user_id);
  }
  const together = new Map();
  for (const ps of raidB.values()) for (const id of ps) { const n = [...ps].filter(o => o !== id && mates.get(id)?.has(o)).length; if (n) together.set(id, (together.get(id) || 0) + 1); }
  for (const [id, n] of together) if (n >= 5) flag(id, 'raid-ring', `같은 IP·기기 계정과 같은 레이드에 ${n}번 같이 참여 (일주일)`, 1);

  // 6) 만든 지 7일 안 된 계정이 레벨·번 돈 순위 10위 안
  const top = async ord => (await DB.prepare(`SELECT u.id, u.created_at FROM characters c JOIN users u ON u.id = c.user_id WHERE ${HIDE} AND u.banned = 0 ORDER BY ${ord} LIMIT 10`).all()).results;
  for (const [n, ord] of [['레벨', 'c.lv DESC, c.exp DESC'], ['번 돈', "CASE WHEN json_valid(c.life) THEN json_extract(c.life, '$.earn') ELSE 0 END DESC"]])
    for (const [i, r] of (await top(ord)).entries()) if (t - r.created_at < 7 * D)
      flag(r.id, 'new-top', `만든 지 ${Math.max(1, Math.round((t - r.created_at) / D))}일 된 계정이 ${n} ${i + 1}위`, 2);

  const st = out.map(([uid, k, why, score]) => DB.prepare(`INSERT INTO flags (user_id, k, why, score, at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, k) DO UPDATE SET why = excluded.why, score = excluded.score, at = excluded.at`).bind(uid, k, why.slice(0, 300), score, t));
  const all = [...saveG, ...st,
    DB.prepare('DELETE FROM flags WHERE at < ? AND ok_until < ?').bind(t - 25 * H, t),   // 하루 넘게 다시 안 잡히면 지움
    DB.prepare('DELETE FROM growth WHERE at < ?').bind(t - 6 * H),
    DB.prepare('DELETE FROM rejects WHERE hr < ?').bind(Math.floor(t / H) - 48)];
  for (let i = 0; i < all.length; i += 80) await DB.batch(all.slice(i, i + 80));
  return out.length;
}

// 하루 한 번 캐릭터 사본 (최근 8일 안에 움직인 캐릭터만). 열 목록은 표에서 읽어서 → 나중에 열이 늘어도 그대로 됨
export async function charCols(env) { return (await env.DB.prepare("SELECT name FROM pragma_table_info('characters')").all()).results.map(r => r.name); }
export async function snapAll(env, day, uid) {
  const cols = await charCols(env), obj = `json_object(${cols.map(c => `'${c}', ${c}`).join(', ')})`, t = Date.now();
  await env.DB.batch([
    env.DB.prepare(`INSERT OR REPLACE INTO char_snap (user_id, day, lv, gold, data, at) SELECT user_id, ?, lv, gold, ${obj}, ? FROM characters WHERE ${uid ? 'user_id = ?' : 'updated_at > ?'}`).bind(day, t, uid || t - 8 * D),
    env.DB.prepare('DELETE FROM char_snap WHERE at < ?').bind(t - 7.5 * D),
  ]);
}
// 사본으로 되돌리기 (되돌리기 전 모습도 사본으로 남김 → 잘못 눌러도 다시 돌아갈 수 있음)
export async function restore(env, uid, day, stamp) {
  const r = await env.DB.prepare('SELECT data FROM char_snap WHERE user_id = ? AND day = ?').bind(uid, day).first(); if (!r) return false;
  await snapAll(env, stamp, uid);
  const cols = new Set(await charCols(env)), d = JSON.parse(r.data), keys = Object.keys(d).filter(k => cols.has(k) && k !== 'user_id' && k !== 'ver');
  await env.DB.prepare(`UPDATE characters SET ${keys.map(k => `${k} = ?`).join(', ')}, ver = ver + 1 WHERE user_id = ?`).bind(...keys.map(k => d[k]), uid).run();
  return true;
}
