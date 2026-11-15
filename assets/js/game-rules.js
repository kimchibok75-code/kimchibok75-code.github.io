// 치복 타운 — 게임 규칙 (화면 game.html 과 서버 game-worker 가 같이 씀)
// 숫자는 plan/웹게임-기획서.md 3장·4장과 같아요. 여기를 고치면 화면과 서버가 함께 바뀌어요.

export const T = 32;                 // 타일 한 칸 크기 (px)
export const MW = 40, MH = 30;       // 마을 지도 칸 수
export const START = { x: 19.5 * T, y: 19.5 * T };
export const FACES = ['#ffe0c2', '#f7c9a0', '#d9a77a', '#a8754f', '#ffd4e0', '#c9f0d2', '#d6e4ff', '#fff3b0'];
export const BODIES = ['#e8553a', '#4f9d5a', '#3d7bd9', '#9a5ad6', '#e9a23b', '#2f3b4f', '#ef7fa6', '#2bb3a6'];
export const EYES = ['dot', 'happy', 'sleep', 'wow'];
export const MAX_LV = 100;
export const START_GOLD = 500;
export const POINTS_PER_LV = 4;

// ───────── 닉네임 · 비밀번호 규칙 (기획서 7-1) ─────────
export const NICK_BAN = ['김치복', '치복', '관리자', '운영자', '운영진', 'admin', 'gm'];
export const COMMON_PW = ['password1', 'qwer1234', 'abc12345', 'asdf1234', 'qwerty123', '1q2w3e4r', 'zxcv1234', 'iloveyou1', 'password123', 'a1234567', '1q2w3e4r5t', 'qwerty1234', 'asdf12345', 'abcd1234', 'aa123456', 'qwer12345'];
export function nickChecks(n = '') {
  const len = [...n].length;
  return { len: len >= 2 && len <= 10, chars: /^[가-힣a-zA-Z0-9]+$/.test(n), name: !NICK_BAN.some(b => n.toLowerCase().includes(b)) };
}
export function pwChecks(p = '', n = '') {
  return { len: p.length >= 8 && p.length <= 64, mix: /[a-zA-Z]/.test(p) && /\d/.test(p), nick: !n || !p.toLowerCase().includes(n.toLowerCase()), common: !COMMON_PW.includes(p.toLowerCase()), repeat: !/^(.)\1*(.)\2*$/.test(p) };
}
export const allOk = o => Object.values(o).every(Boolean);

// ───────── 성장 (기획서 3장) ─────────
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const needExp = L => Math.round(50 * Math.pow(L, 1.6));
export const GRADES = { normal: { n: '일반', c: '#6f7a8a', m: 1, o: 0 }, uncommon: { n: '고급', c: '#2f8f45', m: 1.15, o: 0 }, rare: { n: '희귀', c: '#2f6fd0', m: 1.3, o: 1 }, epic: { n: '영웅', c: '#8a48cc', m: 1.5, o: 2 }, legend: { n: '전설', c: '#e0731c', m: 1.8, o: 3 } };
export const TIERS = [{ n: '들판', req: 1, price: 100 }, { n: '숲', req: 10, price: 900 }, { n: '협곡', req: 25, price: 3500 }, { n: '공장', req: 40, price: 10000 }];
export const WTYPES = { sword: { n: '검', i: '🗡️', gap: 1.0, m: 1 }, dagger: { n: '단검', i: '🔪', gap: .7, m: .7 }, hammer: { n: '망치', i: '🔨', gap: 1.5, m: 1.5 }, staff: { n: '지팡이', i: '🪄', gap: 1.1, m: .95, sp: 1.3 } };
export const SLOTS = { weapon: { n: '무기', i: '🗡️' }, hat: { n: '모자', i: '⛑️' }, armor: { n: '갑옷', i: '🧥' }, shoes: { n: '신발', i: '👢' }, acc: { n: '장신구', i: '💍' } };
export const STATS = { str: { n: '힘', i: '💪', d: '공격력 +2 · 체력 +5' }, dex: { n: '민첩', i: '🏃', d: '공격 속도 +0.5% · 회피 +0.2%' }, int: { n: '지력', i: '🧠', d: '필살기 피해 +2% · 확률 +0.1%' }, luk: { n: '운', i: '🍀', d: '치명타 +0.25% · 드랍·골드 +0.5%' } };
export const BASE = { weapon: [10, 32, 70, 120], hatDef: [2, 6, 13, 22], hatHp: [10, 30, 70, 120], armorDef: [4, 12, 26, 44], armorHp: [20, 60, 140, 240], shoesDef: [1, 4, 9, 15], shoesHp: [5, 20, 45, 80], acc: [2, 5, 9, 14] };
export const PRICE_MUL = { weapon: 1, armor: .9, hat: .6, shoes: .5, acc: .8 };
export const ENH_RATE = [100, 95, 90, 80, 70, 60, 50, 40, 35, 30], ENH_COST = [10, 20, 35, 50, 80, 120, 170, 230, 300, 400];
export const HATS = [{ id: 'none', n: '없음', price: 0 }, { id: 'ribbon', n: '🎀 리본', price: 300 }, { id: 'sprout', n: '🌱 새싹', price: 500 }, { id: 'cat', n: '🐱 고양이 귀', price: 800 }, { id: 'straw', n: '👒 밀짚모자', price: 1200 }, { id: 'kimchi', n: '🥬 김치 머리띠', price: 2000 }];
export const OPT_N = { str: '힘', dex: '민첩', int: '지력', luk: '운', crit: '치명타', gold: '골드' };

let seq = 1;
const newId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID().slice(0, 8) : `i${Date.now().toString(36)}${seq++}`);
export function makeItem(slot, tier, o = {}) {
  const g = o.grade || 'normal', it = { id: o.id || newId(), slot, tier, grade: g, enh: o.enh || 0, opts: [] };
  if (slot === 'weapon') { it.wt = o.wt || 'sword'; it.atk = Math.round(BASE.weapon[tier] * WTYPES[it.wt].m); }
  else if (slot === 'acc') { it.stat = o.stat || pick(Object.keys(STATS)); it.val = BASE.acc[tier]; }
  else { it.def = BASE[slot + 'Def'][tier]; it.hp = BASE[slot + 'Hp'][tier]; }
  for (let k = 0; k < GRADES[g].o; k++) it.opts.push(randOpt(tier));
  it.price = Math.round(TIERS[tier].price * PRICE_MUL[slot] * GRADES[g].m);
  return it;
}
export function randOpt(tier) { const r = Math.random(); if (r < .6) return { k: pick(Object.keys(STATS)), v: (2 + Math.floor(Math.random() * 4)) * (tier + 1) }; if (r < .8) return { k: 'crit', v: 1 + Math.floor(Math.random() * 3) }; return { k: 'gold', v: 3 + Math.floor(Math.random() * 6) }; }
export const enhMul = it => GRADES[it.grade].m * (1 + it.enh * .08);
export const itemIcon = it => it.slot === 'weapon' ? WTYPES[it.wt].i : SLOTS[it.slot].i;
export function itemName(it) { const base = it.slot === 'weapon' ? WTYPES[it.wt].n : it.slot === 'acc' ? `${STATS[it.stat].n} 반지` : SLOTS[it.slot].n; return `${TIERS[it.tier].n} ${base}${it.enh ? ` +${it.enh}` : ''}`; }
export function itemDesc(it) {
  const m = enhMul(it), parts = [GRADES[it.grade].n];
  if (it.slot === 'weapon') parts.push(`공격 ${Math.round(it.atk * m)}`, `간격 ${WTYPES[it.wt].gap}초`, ...(WTYPES[it.wt].sp ? ['필살기 +30%'] : []));
  else if (it.slot === 'acc') parts.push(`${STATS[it.stat].n} +${Math.round(it.val * m)}`);
  else parts.push(`방어 ${Math.round(it.def * m)}`, `체력 +${Math.round(it.hp * m)}`);
  it.opts.forEach(o => parts.push(`${OPT_N[o.k]} +${o.v}${o.k === 'crit' || o.k === 'gold' ? '%' : ''}`));
  return `${parts.join(' · ')} · Lv.${TIERS[it.tier].req}+`;
}
// 능력치 → 전투 수치 (기획서 3-3 계산식)
export function derive(c) {
  const b = { str: 0, dex: 0, int: 0, luk: 0, crit: 0, gold: 0 }; let def = 0, hp = 0;
  for (const it of Object.values(c.equip || {})) {
    if (!it) continue; const m = enhMul(it);
    if (it.slot === 'acc') b[it.stat] += Math.round(it.val * m); else if (it.slot !== 'weapon') { def += it.def * m; hp += it.hp * m; }
    it.opts.forEach(o => (b[o.k] += o.v));
  }
  const str = c.str + b.str, dex = c.dex + b.dex, int = c.int + b.int, luk = c.luk + b.luk, w = c.equip?.weapon, wt = WTYPES[w?.wt || 'sword'];
  return { b, str, dex, int, luk, atk: Math.round((w ? w.atk * enhMul(w) : 3) + str * 2 + c.lv), def: Math.round(def), maxHp: Math.round(100 + c.lv * 20 + str * 5 + hp),
    gap: wt.gap / Math.min(2, 1 + dex * .005), crit: Math.min(60, 5 + luk * .25 + b.crit), eva: Math.min(40, dex * .2), sp: 5 + int * .1, spMul: (2 + int * .02) * (wt.sp || 1), goldB: luk * .5 + b.gold, dropB: luk * .5 };
}
export const tierFor = lv => TIERS.reduce((t, x, i) => (lv >= x.req ? i : t), 0);

// 새 캐릭터 기본값
export function newCharacter() {
  const c = { face: FACES[0], body: BODIES[0], eyes: 'dot', hat: 'none', intro: '', title: '🏷️ 새내기 주민', x: START.x, y: START.y,
    lv: 1, exp: 0, gold: START_GOLD, str: 5, dex: 5, int: 5, luk: 5, points: 0,
    equip: { weapon: makeItem('weapon', 0, { wt: 'sword' }), hat: null, armor: null, shoes: null, acc: null }, bag: [], hats: ['none'], pots: { s: 5, l: 0, xl: 0 }, potAt: 40 };
  c.hp = derive(c).maxHp;
  return c;
}
// 능력치에 쓴 포인트 수 (전부 5에서 시작)
export const spentPoints = c => c.str + c.dex + c.int + c.luk - 20;
