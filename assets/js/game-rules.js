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
export const needExp = L => Math.round(50 * Math.pow(L, 2));
export const GRADES = { normal: { n: '일반', c: '#6f7a8a', m: 1, o: 0 }, uncommon: { n: '고급', c: '#2f8f45', m: 1.15, o: 0 }, rare: { n: '희귀', c: '#2f6fd0', m: 1.3, o: 1 }, epic: { n: '영웅', c: '#8a48cc', m: 1.5, o: 2 }, legend: { n: '전설', c: '#e0731c', m: 1.8, o: 3 } };
export const TIERS = [{ n: '들판', req: 1, price: 100 }, { n: '숲', req: 10, price: 900 }, { n: '협곡', req: 25, price: 3500 }, { n: '공장', req: 40, price: 10000 }];
export const WTYPES = { sword: { n: '검', i: '🗡️', gap: 1.0, m: 1 }, dagger: { n: '단검', i: '🔪', gap: .7, m: .7 }, hammer: { n: '망치', i: '🔨', gap: 1.5, m: 1.5 }, staff: { n: '지팡이', i: '🪄', gap: 1.1, m: .95, sp: 1.3 } };
export const SLOTS = { weapon: { n: '무기', i: '🗡️' }, hat: { n: '모자', i: '⛑️' }, armor: { n: '갑옷', i: '🧥' }, shoes: { n: '신발', i: '👢' }, acc: { n: '장신구', i: '💍' } };
export const STATS = { str: { n: '힘', i: '💪', d: '공격력 +2 · 체력 +5 · 물리 방어 +0.5' }, dex: { n: '민첩', i: '🏃', d: '공격 속도 +0.5% · 회피 +0.2% · 이동 속도 +0.3%' }, int: { n: '지력', i: '🧠', d: '마력 +2 · 마법 방어 +0.5 · 필살기 피해 +2% · 확률 +0.1%' }, luk: { n: '운', i: '🍀', d: '치명타 +0.25% · 드랍 +0.5% · 골드 +1% · 강화 성공 +0.05%p' } };
export const BASE = { weapon: [10, 32, 70, 120], hatDef: [2, 6, 13, 22], hatHp: [10, 30, 70, 120], armorDef: [4, 12, 26, 44], armorHp: [20, 60, 140, 240], shoesDef: [1, 4, 9, 15], shoesHp: [5, 20, 45, 80], acc: [2, 5, 9, 14] };
export const PRICE_MUL = { weapon: 1, armor: .9, hat: .6, shoes: .5, acc: .8 };
export const ENH_RATE = [100, 95, 90, 80, 70, 60, 50, 40, 35, 30];
// 운이 높으면 강화 성공 확률 증가 (1포인트당 +0.05%p, 최대 +10%p)
export const enhRate = (enh, D) => Math.min(100, ENH_RATE[enh] + (D?.enhB || 0));
export const ENH_COST = [10, 20, 35, 50, 80, 120, 170, 230, 300, 400];
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
  if (it.slot === 'weapon') parts.push(`${it.wt === 'staff' ? '마력' : '공격'} ${Math.round(it.atk * m)}`, `간격 ${WTYPES[it.wt].gap}초`, ...(WTYPES[it.wt].sp ? ['필살기 +30%'] : []));
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
  const str = c.str + b.str, dex = c.dex + b.dex, int = c.int + b.int, luk = c.luk + b.luk, w = c.equip?.weapon, wt = WTYPES[w?.wt || 'sword'], staff = w?.wt === 'staff';
  const wAtk = w ? w.atk * enhMul(w) : 3;
  // 공격력(힘)은 검·단검·망치, 마력(지력)은 지팡이가 씀. 기본 공격 피해 = hit
  const atk = Math.round((staff ? 3 : wAtk) + str * 2 + c.lv), mag = Math.round((staff ? wAtk : 0) + int * 2 + c.lv);
  return { b, str, dex, int, luk, atk, mag, hit: staff ? mag : atk, magic: staff,
    def: Math.round(def + str * .5), mdef: Math.round(def * .5 + int * .5), maxHp: Math.round(100 + c.lv * 20 + str * 5 + hp),
    gap: wt.gap / Math.min(2, 1 + dex * .005), spd: Math.min(1.6, 1 + dex * .003), crit: Math.min(60, 5 + luk * .25 + b.crit), eva: Math.min(40, dex * .2), sp: 5 + int * .1, spMul: (2 + int * .02) * (wt.sp || 1), goldB: luk + b.gold, dropB: luk * .5, enhB: Math.min(10, luk * .05) };
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

// ───────── 사냥터 (기획서 4장) ─────────
export const LV_CAP = 55;            // 지금 열린 최고 레벨 (사냥터를 추가하면 올리기)
export const BAG_MAX = 40;           // 가방 칸. 가득 차면 주운 장비는 자동으로 팔림
export const HUNT = { offlineMax: 8 * 3600, offlineEff: .7, onlineGap: 90, bossEvery: 1800, deathLoss: .1, townRegen: .02, huntRegen: .02 };
export const POTS = { s: { n: '작은 음료', i: '🥤', d: '체력 +50', price: 20, heal: () => 50 }, l: { n: '큰 음료', i: '🧋', d: '체력 +200', price: 70, heal: () => 200 }, xl: { n: '특대 음료', i: '🍹', d: '최대 체력의 50%', price: 200, heal: max => Math.round(max * .5) } };
// 몬스터: n 이름, lv, hp, atk, exp, gold, c 색, s 크기, f 생김새
// mg: 마법 공격 (마법 방어력으로 막음), 없으면 물리 공격 (물리 방어력으로 막음)
const M = (n, lv, hp, atk, exp, gold, c, s, f, mg = false) => ({ n, lv, hp, atk, exp, gold, c, s, f, mg });
export const MONS = {
  rat: M('풀쥐', 1, 30, 4, 6, 3, '#c2ad92', .75, 'ears'), hen: M('성난 닭', 4, 70, 8, 14, 6, '#fff7ea', .85, 'beak'), boar: M('아기 멧돼지', 8, 150, 14, 30, 12, '#a87452', 1, 'snout'),
  wolf: M('숲 늑대', 12, 260, 22, 48, 18, '#8d97a6', 1, 'ears'), shroom: M('독버섯', 18, 420, 30, 75, 26, '#f3e6cf', .95, 'cap', true), vine: M('덩굴 괴물', 23, 640, 42, 110, 35, '#5aa04f', 1.1, 'leaf', true),
  eagle: M('협곡 독수리', 27, 900, 55, 150, 45, '#9b6a3d', 1, 'wing', true), turtle: M('돌 거북', 33, 1500, 60, 210, 60, '#a3b07a', 1.1, 'shell'), golem: M('바위 골렘', 38, 2200, 85, 280, 75, '#9a958c', 1.25, 'rock'),
  drone: M('녹슨 드론', 42, 2800, 110, 360, 95, '#b58a5a', .9, 'bot', true), guard: M('경비 로봇', 48, 4000, 140, 470, 120, '#7f8fa3', 1.15, 'bot'), fixbot: M('폭주 수리봇', 53, 5500, 170, 600, 150, '#e0a63a', 1.1, 'bot', true),
};
export const FIELDS = [
  { id: 'plain', n: '바람 들판', i: '🌾', min: 1, max: 10, tier: 0, mons: ['rat', 'hen', 'boar'], boss: M('왕 멧돼지', 12, 2000, 40, 400, 300, '#7d4f33', 2, 'snout'), g: ['#9ad27f', '#91ca75'], deco: 'flower' },
  { id: 'forest', n: '깊은 숲', i: '🌲', min: 10, max: 25, tier: 1, mons: ['wolf', 'shroom', 'vine'], boss: M('숲의 거대 곰', 27, 12000, 120, 2500, 1500, '#6b4a33', 2.2, 'ears'), g: ['#5f9e58', '#589651'], deco: 'tree' },
  { id: 'canyon', n: '바위 협곡', i: '⛰️', min: 25, max: 40, tier: 2, mons: ['eagle', 'turtle', 'golem'], boss: M('협곡의 주인', 42, 50000, 260, 9000, 4000, '#7a746b', 2.3, 'rock', true), g: ['#d2b48a', '#c9ab80'], deco: 'rock' },
  { id: 'factory', n: '고장 난 공장', i: '🏚️', min: 40, max: 55, tier: 3, mons: ['drone', 'guard', 'fixbot'], boss: M('공장장 기계', 57, 160000, 520, 25000, 10000, '#5e6b7d', 2.4, 'bot', true), g: ['#a3abb5', '#9aa2ad'], deco: 'pipe' },
];
// 내 레벨이 몬스터보다 10 이상 높으면 경험치 줄어듦
export const expPenalty = (lv, mlv) => { const d = lv - mlv; return d >= 10 ? Math.max(.2, 1 - (d - 9) * .1) : 1; };
// 레벨업 (최고 레벨에서는 경험치가 더 쌓이지 않음). 올라간 레벨 수를 돌려줌
export function addExp(c, n) {
  let up = 0; c.exp += n;
  while (c.lv < LV_CAP && c.exp >= needExp(c.lv)) { c.exp -= needExp(c.lv); c.lv++; c.points += POINTS_PER_LV; up++; if (c.lv % 10 === 0) c.title = `🏷️ Lv.${c.lv} 달성`; }
  if (c.lv >= LV_CAP) c.exp = Math.min(c.exp, needExp(c.lv) - 1);
  return up;
}
// 몬스터가 떨어뜨리는 장비 (기본 6%, 운으로 늘어남, 보스는 항상 + 좋은 등급 10배)
export function rollDrop(tier, dropB, boss) {
  const lb = 1 + dropB / 100;
  if (!boss && Math.random() * 100 >= 6 * lb) return null;
  const bm = boss ? 10 : 1, r = Math.random() * 100;
  const grade = r < .1 * lb * bm ? 'legend' : r < 1 * lb * bm ? 'epic' : r < 5 * lb * bm ? 'rare' : r < 20 * lb * bm ? 'uncommon' : 'normal';
  return makeItem(pick(Object.keys(SLOTS)), tier, { grade, wt: pick(Object.keys(WTYPES)) });
}

// 몬스터 한 번 공격의 피해 (물리/마법 방어력, 무작위 ±15%)
export const biteDmg = (mon, D) => Math.max(1, Math.round(mon.atk * 100 / (100 + (mon.mg ? D.mdef : D.def)) * (.85 + Math.random() * .3)));

// ───────── 낚시 (기획서 4-6) ─────────
// 등급: 확률(%), 미니게임 맞히는 칸 넓이(비율)와 바늘 속도(초당 왕복)
export const FISH_GRADES = {
  normal: { n: '일반', c: '#6f7a8a', p: 60, zone: .3, speed: .8 },
  uncommon: { n: '고급', c: '#2f8f45', p: 26, zone: .24, speed: 1 },
  rare: { n: '희귀', c: '#2f6fd0', p: 10, zone: .18, speed: 1.2 },
  epic: { n: '영웅', c: '#8a48cc', p: 3.5, zone: .13, speed: 1.45 },
  legend: { n: '전설', c: '#e0731c', p: .5, zone: .09, speed: 1.75 },
};
// 물고기: [아이콘, 이름, 최소 cm, 최대 cm, 기본 값(골드)]
export const FISH = {
  normal: [['🐟', '붕어', 15, 40, 10], ['🐟', '피라미', 6, 15, 6], ['🐍', '미꾸라지', 8, 20, 8], ['🐟', '송사리', 3, 6, 5], ['🐟', '잉어', 25, 70, 14], ['👢', '낡은 장화', 25, 30, 1]],
  uncommon: [['🐟', '메기', 30, 90, 30], ['🐟', '빙어', 8, 15, 24], ['🐟', '은어', 12, 30, 28], ['🐠', '쏘가리', 20, 50, 36], ['🐟', '가물치', 40, 100, 40]],
  rare: [['🌈', '무지개송어', 30, 70, 90], ['🐍', '장어', 40, 120, 110], ['🐡', '복어', 15, 40, 85], ['🐙', '문어', 30, 90, 100], ['🦀', '꽃게', 10, 25, 80]],
  epic: [['🦈', '철갑상어', 80, 200, 350], ['🐟', '참치', 100, 250, 400], ['🐢', '바다거북', 30, 80, 300], ['🦈', '상어', 150, 350, 450]],
  legend: [['🥬', '김치 잉어', 50, 120, 1500], ['🐉', '강의 용', 100, 300, 2000], ['🐋', '아기 고래', 300, 800, 1800], ['👑', '황금 붕어', 20, 50, 1200]],
};
export const FISHING = { cooldown: 10e3, waitMin: 1500, waitMax: 4500, window: 7000, perfect: 1.2 };
// 물고기 하나 정하기. 등급이 높을수록, 길이가 길수록 드물게 (운이 높으면 희귀 이상 조금 더)
export function rollFish(luk = 0) {
  const lb = 1 + luk * .005, w = Object.entries(FISH_GRADES).map(([g, x]) => [g, ['rare', 'epic', 'legend'].includes(g) ? x.p * lb : x.p]);
  let r = Math.random() * w.reduce((a, [, p]) => a + p, 0), grade = 'normal';
  for (const [g, p] of w) { if (r < p) { grade = g; break; } r -= p; }
  const [i, n, min, max, base] = pick(FISH[grade]);
  const k = Math.pow(Math.random(), 2.2);   // 긴 물고기일수록 드묾
  const len = Math.round((min + (max - min) * k) * 10) / 10;
  return { i, n, grade, len, price: Math.max(1, Math.round(base * (.6 + 1.4 * k))) };
}

// ───────── 카페 알바 ─────────
export const JOB = { sec: 60, pay: lv => 40 + lv * 5 };
