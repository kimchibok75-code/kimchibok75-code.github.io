// 치복 타운 — 게임 규칙 (화면 game.html 과 서버 game-worker 가 같이 씀)
// 숫자는 plan/웹게임-기획서.md 3장·4장과 같아요. 여기를 고치면 화면과 서버가 함께 바뀌어요.

export const T = 32;                 // 타일 한 칸 크기 (px)
export const MW = 40, MH = 30;       // 마을 지도 칸 수
export const START = { x: 19.5 * T, y: 19.5 * T };
export const FACES = ['#ffe0c2', '#f7c9a0', '#d9a77a', '#a8754f', '#ffd4e0', '#c9f0d2', '#d6e4ff', '#fff3b0'];
export const BODIES = ['#e8553a', '#4f9d5a', '#3d7bd9', '#9a5ad6', '#e9a23b', '#2f3b4f', '#ef7fa6', '#2bb3a6'];
export const EYES = ['dot', 'happy', 'sleep', 'wow'];
// 헤어스타일 · 헤어 색 (겉모습만, 언제든 무료로 바꿈). none = 민머리(처음 모습)
export const HAIRS = [{ id: 'none', n: '민머리' }, { id: 'short', n: '짧은 머리' }, { id: 'side', n: '옆머리 대머리' }, { id: 'bowl', n: '바가지 머리' }, { id: 'spiky', n: '삐죽 머리' }, { id: 'long', n: '긴 머리' }, { id: 'pony', n: '묶은 머리' }];
export const HAIR_COLORS = ['#3a2a20', '#7a4a2a', '#e8c15a', '#d0502f', '#c9ccd4', '#f2a0c2', '#5b86e0', '#5fae5a'];
export const MAX_LV = 100;
export const START_GOLD = 500;
export const POINTS_PER_LV = 4;

// ───────── 활 · 원거리 밸런스 (시험 계산으로 맞춘 값) ─────────
export const MELEE_K = 2.6, STAFF_K = 1.6, STAFF_SP = 1, BOW_DEX = 1.3, BOW_GAP = 1.1, BOW_M = .9, FAR_LEAD = .6, FAR_WALK = .8;

// ───────── 닉네임 · 비밀번호 규칙 (기획서 7-1) ─────────
// 김치복님 본인 계정 이름은 정확히 이 이름만 가입 가능 (한 번 가입되면 다른 사람은 못 씀)
export const OWNER_NICK = '김치복';
export const NICK_BAN = ['김치복', '치복', '관리자', '운영자', '운영진', 'admin', 'gm'];
export const COMMON_PW = ['password1', 'qwer1234', 'abc12345', 'asdf1234', 'qwerty123', '1q2w3e4r', 'zxcv1234', 'iloveyou1', 'password123', 'a1234567', '1q2w3e4r5t', 'qwerty1234', 'asdf12345', 'abcd1234', 'aa123456', 'qwer12345'];
export function nickChecks(n = '') {
  const len = [...n].length;
  return { len: len >= 2 && len <= 10, chars: /^[가-힣a-zA-Z0-9]+$/.test(n), name: n === OWNER_NICK || !NICK_BAN.some(b => n.toLowerCase().includes(b)) };
}
export function pwChecks(p = '', n = '') {
  return { len: p.length >= 8 && p.length <= 64, mix: /[a-zA-Z]/.test(p) && /\d/.test(p), nick: !n || !p.toLowerCase().includes(n.toLowerCase()), common: !COMMON_PW.includes(p.toLowerCase()), repeat: !/^(.)\1*(.)\2*$/.test(p) };
}
export const allOk = o => Object.values(o).every(Boolean);

// ───────── 성장 (기획서 3장) ─────────
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const needExp = L => Math.round(50 * Math.pow(L, 2));
// ───────── 장비 (뽑기로만 얻음, 기획서 3-2) ─────────
// 등급 7개. m: 수치 배율, p: 뽑기 확률(%), d: 분해할 때 골드 배율
// 단계(1~6)가 등급보다 훨씬 중요함: 한 단계 위의 '빈약'이 아래 단계 '신화'보다 셈
export const GRADES = {
  poor: { n: '빈약', c: '#8b8f98', m: .85, p: 30, d: .8 },
  normal: { n: '일반', c: '#5d6b7e', m: 1, p: 32, d: 1 },
  uncommon: { n: '고급', c: '#2f9e4f', m: 1.1, p: 20, d: 1.3 },
  rare: { n: '희귀', c: '#2f6fd0', m: 1.2, p: 11, d: 1.7 },
  epic: { n: '영웅', c: '#8a48cc', m: 1.32, p: 5, d: 2.3 },
  legend: { n: '전설', c: '#e0731c', m: 1.45, p: 1.7, d: 3.2 },
  myth: { n: '신화', c: '#e0304a', m: 1.6, p: .3, d: 5 },
};
export const STAGES = 6;
// 사냥터 이름 (예전 장비 단계 이름. 지금은 사냥터 설명에만 씀)
export const TIERS = [{ n: '들판', req: 1 }, { n: '숲', req: 10 }, { n: '협곡', req: 25 }, { n: '공장', req: 40 }];
// 클래스 = 지금 쓰는 무기. 무기 3개는 모두 끼고 있고, 클래스는 언제든 무료로 바꿈
export const CLASSES = { sword: { n: '검사', i: '🗡️', st: 'str' }, bow: { n: '궁수', i: '🏹', st: 'dex' }, staff: { n: '마법사', i: '🪄', st: 'int' } };
// 무기 종류. st: 공격력을 올려 주는 능력치, far: 원거리 (몬스터가 다가오는 동안 먼저 때림), m: 같은 단계 무기 공격력 배율
export const WTYPES = { sword: { n: '검', i: '🗡️', gap: 1.0, m: 1, st: 'str', k: MELEE_K },
  staff: { n: '지팡이', i: '🪄', gap: 1.1, m: .95, sp: STAFF_SP, st: 'int', far: true, k: STAFF_K }, bow: { n: '활', i: '🏹', gap: BOW_GAP, m: BOW_M, st: 'dex', far: true, k: BOW_DEX } };
// 원거리 무기: 몬스터가 다가오는 시간(초)만큼 먼저 공격, 걸어가는 시간도 줄어듦 (FAR.walk 배)
export const FAR = { lead: FAR_LEAD, walk: FAR_WALK };
// 장비 칸 6개: 무기 3 + 방어구 3. k: 방어구 칸별 수치 배율
export const SLOTS = { sword: { n: '검', i: '🗡️' }, bow: { n: '활', i: '🏹' }, staff: { n: '지팡이', i: '🪄' }, hat: { n: '모자', i: '⛑️', k: .5 }, armor: { n: '갑옷', i: '🧥', k: 1 }, shoes: { n: '신발', i: '👢', k: .35 } };
export const WEAPON_SLOTS = ['sword', 'bow', 'staff'], ARMOR_SLOTS = ['hat', 'armor', 'shoes'];
export const ITEM_NAMES = {
  sword: ['나무 검', '청동 검', '강철 기사검', '룬 블레이드', '용비늘 대검', '김치 성검'],
  bow: ['나무 활', '사냥꾼 활', '강철 장궁', '바람의 활', '불사조 활', '별빛 활'],
  staff: ['나뭇가지 지팡이', '수정 지팡이', '달빛 지팡이', '번개 지팡이', '용의 눈 지팡이', '우주 지팡이'],
  hat: ['천 두건', '가죽 모자', '철 투구', '기사 투구', '용 투구', '황금 왕관 투구'],
  armor: ['천 옷', '가죽 갑옷', '사슬 갑옷', '판금 갑옷', '용비늘 갑옷', '황금 갑옷'],
  shoes: ['짚신', '가죽 신발', '철 장화', '기사 장화', '바람 장화', '황금 장화'],
};
// 단계별 기본 수치 (일반 등급 기준). 무기 공격력 · 방어구 방어 · 방어구 체력
export const W_ATK = [7, 15, 34, 72, 145, 280], A_DEF = [3, 8, 17, 36, 72, 140], A_HP = [17, 38, 85, 180, 360, 700];
export const STATS = { str: { n: '힘', i: '💪', d: `검 공격력 +${MELEE_K} · 체력 +5 · 물리 방어 +0.5` }, dex: { n: '민첩', i: '🏃', d: `활 공격력 +${BOW_DEX} · 공격 속도 +0.5% · 회피 +0.2% · 이동 속도 +0.3%` }, int: { n: '지력', i: '🧠', d: `지팡이 마력 +${STAFF_K} · 마법 방어 +0.5 · 필살기 피해 +2% · 확률 +0.1%` }, luk: { n: '운', i: '🍀', d: '치명타 +0.25% · 골드 +1% · 강화 성공 +0.05%p' } };
// 강화: 장비가 아니라 장비 칸(슬롯)을 강화. 장비를 바꿔도 강화 단계는 그대로
export const ENH_MAX = 10, ENH_STEP = .06;
export const ENH_RATE = [100, 95, 90, 80, 70, 60, 50, 40, 35, 30];
// 운이 높으면 강화 성공 확률 증가 (1포인트당 +0.05%p, 최대 +10%p)
export const enhRate = (enh, D) => Math.min(100, ENH_RATE[enh] + (D?.enhB || 0));
export const ENH_COST = [700, 1400, 2400, 3600, 5600, 8400, 12000, 17000, 22000, 30000];
export const HATS = [{ id: 'none', n: '없음', price: 0 }, { id: 'ribbon', n: '🎀 리본', price: 300 }, { id: 'sprout', n: '🌱 새싹', price: 500 }, { id: 'cat', n: '🐱 고양이 귀', price: 800 }, { id: 'straw', n: '👒 밀짚모자', price: 1200 }, { id: 'kimchi', n: '🥬 김치 머리띠', price: 2000 }];
// 눈 모양 스킨 (가진 것은 hats 목록에 'eye:별' 처럼 저장). dot은 기본
export const EYE_SKINS = [{ id: 'dot', n: '👀 기본 눈', price: 0 }, { id: 'line', n: '😑 실눈', price: 400 }, { id: 'star', n: '⭐ 별 눈', price: 700 }, { id: 'wink', n: '😉 윙크', price: 800 }, { id: 'heart', n: '💗 하트 눈', price: 1000 }, { id: 'cat', n: '🐱 고양이 눈', price: 1200 }, { id: 'big', n: '✨ 반짝 큰 눈', price: 1500 }];

let seq = 1;
const newId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID().slice(0, 8) : `i${Date.now().toString(36)}${seq++}`);
// 장비 한 개: { id, slot, st(단계 1~6), g(등급) }. 수치는 저장하지 않고 itemStats로 계산 (밸런스를 바꾸기 쉽게)
export const makeItem = (slot, st = 1, g = 'normal', id) => ({ id: id || newId(), slot, st, g });
export const isWeapon = it => WEAPON_SLOTS.includes(it.slot);
export function itemStats(it, enh = 0) {
  const m = GRADES[it.g].m * (1 + enh * ENH_STEP), i = it.st - 1;
  if (isWeapon(it)) return { atk: Math.round(W_ATK[i] * WTYPES[it.slot].m * m) };
  const k = SLOTS[it.slot].k;
  return { def: Math.round(A_DEF[i] * k * m), hp: Math.round(A_HP[i] * k * m) };
}
// 비교용 한 숫자: 무기는 공격력, 방어구는 방어×4 + 체력
export const itemPower = (it, enh = 0) => { if (!it) return 0; const x = itemStats(it, enh); return x.atk ?? x.def * 4 + x.hp; };
export const itemIcon = it => SLOTS[it.slot].i;
export const itemName = it => ITEM_NAMES[it.slot][it.st - 1];
export function itemDesc(it, enh = 0) {
  const x = itemStats(it, enh);
  return [`${it.st}단계 ${GRADES[it.g].n}`, ...(x.atk != null ? [`${it.slot === 'staff' ? '마력' : '공격력'} ${x.atk}`] : [`방어 ${x.def}`, `체력 +${x.hp}`])].join(' · ');
}
// 분해하면 받는 골드
export const DISMANTLE = [20, 45, 100, 220, 450, 900];
export const dismantle = it => Math.round(DISMANTLE[it.st - 1] * GRADES[it.g].d);

// ───────── 가챠센터 (뽑기) ─────────
// 많이 뽑을수록 뽑기 레벨이 올라 높은 단계가 나옴. 상자마다 레벨 따로
export const GACHA = { w: { n: '무기 뽑기', i: '⚔️', slots: WEAPON_SLOTS }, a: { n: '방어구 뽑기', i: '🛡️', slots: ARMOR_SLOTS } };
export const GACHA_NEED = [10, 30, 60, 100, 160, 240, 330, 440, 560];        // 다음 뽑기 레벨까지 필요한 횟수 (Lv.1→2, 2→3 …)
export const GACHA_COST = [150, 300, 500, 800, 1300, 2000, 2900, 4000, 5400, 7200];   // 레벨별 1회 가격
export const GACHA_TEN = .9;   // 10회 뽑기는 10% 할인
// 레벨별 단계 확률(%) [1단계 … 6단계]
export const GACHA_ODDS = [
  [100, 0, 0, 0, 0, 0], [70, 30, 0, 0, 0, 0], [40, 50, 10, 0, 0, 0], [15, 50, 32, 3, 0, 0], [5, 30, 50, 15, 0, 0],
  [0, 15, 50, 32, 3, 0], [0, 5, 35, 45, 14, 1], [0, 0, 20, 50, 26, 4], [0, 0, 10, 45, 37, 8], [0, 0, 5, 35, 45, 15],
];
export const GACHA_MAX = GACHA_ODDS.length;
// 뽑은 횟수 → { lv, now(이번 레벨에서 뽑은 수), need(다음 레벨까지), cost }
export function gachaInfo(n = 0) {
  let lv = 1, base = 0;
  while (lv < GACHA_MAX && n >= base + GACHA_NEED[lv - 1]) { base += GACHA_NEED[lv - 1]; lv++; }
  return { lv, now: n - base, need: lv < GACHA_MAX ? GACHA_NEED[lv - 1] : 0, cost: GACHA_COST[lv - 1] };
}
const roll = (list, w) => { let r = Math.random() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < list.length; i++) { r -= w[i]; if (r < 0) return list[i]; } return list[list.length - 1]; };
export function rollGacha(box, lv) {
  const st = roll([1, 2, 3, 4, 5, 6], GACHA_ODDS[lv - 1]), g = roll(Object.keys(GRADES), Object.values(GRADES).map(x => x.p));
  return makeItem(pick(GACHA[box].slots), st, g);
}

// ───────── 능력치 프리셋 (5개, 이름 붙이기) ─────────
export const PRESETS = 5;
export const defaultPresets = () => Array.from({ length: PRESETS }, (_, i) => ({ n: `프리셋 ${i + 1}`, s: [5, 5, 5, 5] }));
export const totalPoints = lv => (lv - 1) * POINTS_PER_LV;

// 능력치 → 전투 수치 (기획서 3-3 계산식). 공격은 지금 클래스의 무기로
export function derive(c) {
  const b = { str: 0, dex: 0, int: 0, luk: 0, crit: 0, gold: 0 }, E = c.enh || {}; let def = 0, hp = 0;
  for (const s of ARMOR_SLOTS) { const it = c.equip?.[s]; if (!it) continue; const x = itemStats(it, E[s] || 0); def += x.def; hp += x.hp; }
  const cls = CLASSES[c.cls] ? c.cls : 'sword', w = c.equip?.[cls], wt = WTYPES[cls], staff = wt.st === 'int', bow = wt.st === 'dex';
  const str = c.str, dex = c.dex, int = c.int, luk = c.luk, wAtk = w ? itemStats(w, E[cls] || 0).atk : 3;
  // 공격력: 검은 힘, 활은 민첩. 마력: 지팡이는 지력. 기본 공격 피해 = hit
  // 능력치·레벨에서 오는 피해는 공격 간격만큼 곱함 → 느린 무기는 한 방이 세고, 빠른 무기는 약하게 여러 번 (초당 피해는 비슷)
  const atk = Math.round((staff ? 3 : wAtk) + ((bow ? dex * wt.k : str * (staff ? 2 : wt.k)) + c.lv) * (staff ? 1 : wt.gap)), mag = Math.round((staff ? wAtk : 0) + (int * (staff ? wt.k : 2) + c.lv) * (staff ? wt.gap : 1));
  return { b, str, dex, int, luk, atk, mag, hit: staff ? mag : atk, magic: staff, far: !!wt.far, wt: cls, cls,
    def: Math.round(def + str * .5), mdef: Math.round(def * .5 + int * .5), maxHp: Math.round(100 + c.lv * 20 + str * 5 + hp),
    gap: wt.gap / Math.min(2, 1 + dex * .005), spd: Math.min(1.6, 1 + dex * .003), crit: Math.min(60, 5 + luk * .25), eva: Math.min(40, dex * .2), sp: 5 + int * .1, spMul: (2 + int * .02) * (wt.sp || 1), goldB: luk, enhB: Math.min(10, luk * .05) };
}

// 새 캐릭터 기본값: 무기 3개(1단계 일반) 모두 낌, 클래스는 검사
export function newCharacter() {
  const c = { face: FACES[0], body: BODIES[0], eyes: 'dot', hat: 'none', hair: 'none', hairC: HAIR_COLORS[0], intro: '', title: '🏷️ 새내기 주민', x: START.x, y: START.y,
    lv: 1, exp: 0, gold: START_GOLD, str: 5, dex: 5, int: 5, luk: 5, points: 0, cls: 'sword',
    equip: { sword: makeItem('sword'), bow: makeItem('bow'), staff: makeItem('staff'), hat: null, armor: null, shoes: null }, enh: {}, bag: [],
    presets: defaultPresets(), preset: 0, gacha: { w: 0, a: 0 }, hats: ['none'], pots: { s: 5, l: 0, xl: 0 }, potAt: 40 };
  c.hp = derive(c).maxHp;
  return c;
}
// 능력치에 쓴 포인트 수 (전부 5에서 시작)
export const spentPoints = c => c.str + c.dex + c.int + c.luk - 20;

// ───────── 사냥터 (기획서 4장) ─────────
export const LV_CAP = 55;            // 지금 열린 최고 레벨 (사냥터를 추가하면 올리기)
export const HUNT = { offlineMax: 8 * 3600, offlineEff: .7, onlineGap: 90, bossEvery: 1800, deathLoss: .1, townRegen: .02, huntRegen: .02, goldMul: 1.15 };   // goldMul: 사냥에서 장비가 안 떨어지는 대신 골드 +15%
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
