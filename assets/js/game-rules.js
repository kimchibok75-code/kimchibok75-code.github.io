// 치복 타운 — 게임 규칙 (화면 game.html 과 서버 game-worker 가 같이 씀)
// 숫자는 plan/웹게임-기획서.md 3장·4장과 같아요. 여기를 고치면 화면과 서버가 함께 바뀌어요.

export const T = 32;                 // 타일 한 칸 크기 (px)
export const MW = 80, MH = 60;       // 마을 지도 칸 수 (지도 모양은 game-map.js)
export const START = { x: 40.5 * T, y: 34.5 * T };   // 광장 분수 아래
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
// 원거리 거리 유지: 몬스터에게 맞은 뒤 kite 확률(민첩 1당 +0.08%p, 최대 kiteMax)로 뒤로 물러나서 back초 동안 안 맞음
export const FAR_KITE = .2, FAR_KITE_MAX = .4, FAR_BACK = .7;

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
export const FAR = { lead: FAR_LEAD, walk: FAR_WALK, kite: FAR_KITE, kiteMax: FAR_KITE_MAX, back: FAR_BACK };
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
export const makeItem = (slot, st = 1, g = 'normal', id, o) => ({ id: id || newId(), slot, st, g, o: o || [] });
export const isWeapon = it => WEAPON_SLOTS.includes(it.slot);
export function itemStats(it, enh = 0) {
  const m = GRADES[it.g].m * (1 + enh * ENH_STEP), i = it.st - 1;
  if (isWeapon(it)) return { atk: Math.round(W_ATK[i] * WTYPES[it.slot].m * m) };
  const k = SLOTS[it.slot].k;
  return { def: Math.round(A_DEF[i] * k * m), hp: Math.round(A_HP[i] * k * m) };
}
// 비교용 한 숫자: 무기는 공격력, 방어구는 방어×4 + 체력
// 랜덤 옵션도 조금 반영 (옵션 점수 1 = 1%)
export const itemPower = (it, enh = 0) => { if (!it) return 0; const x = itemStats(it, enh); return Math.round((x.atk ?? x.def * 4 + x.hp) * (1 + optScore(it) / 100)); };
export const itemIcon = it => SLOTS[it.slot].i;
export const itemName = it => ITEM_NAMES[it.slot][it.st - 1];
export function itemDesc(it, enh = 0) {
  const x = itemStats(it, enh);
  return [`${it.st}단계 ${GRADES[it.g].n}`, ...(x.atk != null ? [`${it.slot === 'staff' ? '마력' : '공격력'} ${x.atk}`] : [`방어 ${x.def}`, `체력 +${x.hp}`]), ...(it.o || []).map(optText)].join(' · ');
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
  const slot = pick(GACHA[box].slots);
  return makeItem(slot, st, g, null, rollOpts(slot, st, g));
}

// ───────── 능력치 프리셋 (5개, 이름 붙이기) ─────────
export const PRESETS = 5;
export const defaultPresets = () => Array.from({ length: PRESETS }, (_, i) => ({ n: `프리셋 ${i + 1}`, s: [5, 5, 5, 5] }));
export const totalPoints = lv => (lv - 1) * POINTS_PER_LV;

// 능력치 → 전투 수치 (기획서 3-3 계산식). 공격은 지금 클래스의 무기로
export function derive(c) {
  const b = { str: 0, dex: 0, int: 0, luk: 0, crit: 0, gold: 0 }, E = c.enh || {}, fx = statFx(c); let def = 0, hp = 0;
  for (const s of ARMOR_SLOTS) { const it = c.equip?.[s]; if (!it) continue; const x = itemStats(it, E[s] || 0); def += x.def; hp += x.hp; }
  const cls = CLASSES[c.cls] ? c.cls : 'sword', w = c.equip?.[cls], wt = WTYPES[cls], staff = wt.st === 'int', bow = wt.st === 'dex';
  const str = c.str, dex = c.dex, int = c.int, luk = c.luk, wAtk = w ? itemStats(w, E[cls] || 0).atk : 3;
  // 공격력: 검은 힘, 활은 민첩. 마력: 지팡이는 지력. 기본 공격 피해 = hit
  // 능력치·레벨에서 오는 피해는 공격 간격만큼 곱함 → 느린 무기는 한 방이 세고, 빠른 무기는 약하게 여러 번 (초당 피해는 비슷)
  const god = !!c.life?.god, am = (1 + (fx.atkP || 0) / 100) * (god ? 10 : 1);   // god: 관리자 갓모드 (안 맞음 + 공격력 10배)
  const atk = Math.round(((staff ? 3 : wAtk) + ((bow ? dex * wt.k : str * (staff ? 2 : wt.k)) + c.lv) * (staff ? 1 : wt.gap)) * am), mag = Math.round(((staff ? wAtk : 0) + (int * (staff ? wt.k : 2) + c.lv) * (staff ? wt.gap : 1)) * am);
  return { god, b, str, dex, int, luk, atk, mag, hit: staff ? mag : atk, magic: staff, far: !!wt.far, wt: cls, cls, fx,
    def: Math.round((def + str * .5) * (1 + (fx.defP || 0) / 100)), mdef: Math.round((def * .5 + int * .5) * (1 + ((fx.defP || 0) + (fx.mdefP || 0)) / 100)), maxHp: Math.round((100 + c.lv * 20 + str * 5 + hp) * (1 + (fx.hpP || 0) / 100)),
    gap: wt.gap / Math.min(2, 1 + dex * .005) / (1 + (fx.aspd || 0) / 100), spd: Math.min(1.8, (1 + dex * .003) * (1 + (fx.spdP || 0) / 100)), crit: Math.min(70, 5 + luk * .25 + (fx.crit || 0)), critM: 1.5 + (fx.critD || 0) / 100,
    eva: Math.min(45, dex * .2 + (fx.eva || 0)), sp: 5 + int * .1 + (fx.sp || 0), spMul: (2 + int * .02) * (wt.sp || 1), goldB: luk + (fx.goldP || 0), expB: fx.expP || 0, enhB: Math.min(15, luk * .05 + (fx.enhB || 0)),
    bossP: fx.bossP || 0, steal: fx.steal || 0, regen: HUNT.huntRegen + (fx.regen || 0) / 100, potP: fx.potP || 0 };
}

// 새 캐릭터 기본값: 무기 3개(1단계 일반) 모두 낌, 클래스는 검사
export function newCharacter() {
  const c = { face: FACES[0], body: BODIES[0], eyes: 'dot', hat: 'none', hair: 'none', hairC: HAIR_COLORS[0], intro: '', title: 'new', life: newLife(), x: START.x, y: START.y,
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
const M = (n, lv, hp, atk, exp, gold, c, s, f, mg = false, k = '') => ({ n, lv, hp, atk, exp, gold, c, s, f, mg, k });
export const MONS = {
  rat: M('풀쥐', 1, 30, 4, 6, 3, '#c2ad92', .75, 'ears', false, 'rat'), hen: M('성난 닭', 4, 70, 8, 14, 6, '#fff7ea', .85, 'beak', false, 'hen'), boar: M('아기 멧돼지', 8, 150, 14, 30, 12, '#a87452', 1, 'snout', false, 'boar'),
  wolf: M('숲 늑대', 12, 260, 22, 48, 18, '#8d97a6', 1, 'ears', false, 'wolf'), shroom: M('독버섯', 18, 420, 30, 75, 26, '#f3e6cf', .95, 'cap', true, 'shroom'), vine: M('덩굴 괴물', 23, 640, 42, 110, 35, '#5aa04f', 1.1, 'leaf', true, 'vine'),
  eagle: M('협곡 독수리', 27, 900, 55, 150, 45, '#9b6a3d', 1, 'wing', true, 'eagle'), turtle: M('돌 거북', 33, 1500, 60, 210, 60, '#a3b07a', 1.1, 'shell', false, 'turtle'), golem: M('바위 골렘', 38, 2200, 85, 280, 75, '#9a958c', 1.25, 'rock', false, 'golem'),
  drone: M('녹슨 드론', 42, 2800, 110, 360, 95, '#b58a5a', .9, 'bot', true, 'drone'), guard: M('경비 로봇', 48, 4000, 140, 470, 120, '#7f8fa3', 1.15, 'bot', false, 'guard'), fixbot: M('폭주 수리봇', 53, 5500, 170, 600, 150, '#e0a63a', 1.1, 'bot', true, 'fixbot'),
};
export const FIELDS = [
  { id: 'plain', n: '바람 들판', i: '🌾', min: 1, max: 10, tier: 0, mons: ['rat', 'hen', 'boar'], boss: M('왕 멧돼지', 12, 2000, 40, 400, 300, '#7d4f33', 2, 'snout', false, 'kingboar'), g: ['#9ad27f', '#91ca75'], deco: 'flower' },
  { id: 'forest', n: '깊은 숲', i: '🌲', min: 10, max: 25, tier: 1, mons: ['wolf', 'shroom', 'vine'], boss: M('숲의 거대 곰', 27, 12000, 120, 2500, 1500, '#6b4a33', 2.2, 'ears', false, 'bear'), g: ['#5f9e58', '#589651'], deco: 'tree' },
  { id: 'canyon', n: '바위 협곡', i: '⛰️', min: 25, max: 40, tier: 2, mons: ['eagle', 'turtle', 'golem'], boss: M('협곡의 주인', 42, 50000, 260, 9000, 4000, '#7a746b', 2.3, 'rock', true, 'lord'), g: ['#d2b48a', '#c9ab80'], deco: 'rock' },
  { id: 'factory', n: '고장 난 공장', i: '🏚️', min: 40, max: 55, tier: 3, mons: ['drone', 'guard', 'fixbot'], boss: M('공장장 기계', 57, 160000, 520, 25000, 10000, '#5e6b7d', 2.4, 'bot', true, 'boss'), g: ['#a3abb5', '#9aa2ad'], deco: 'pipe' },
];
// 내 레벨이 몬스터보다 10 이상 높으면 경험치 줄어듦
export const expPenalty = (lv, mlv) => { const d = lv - mlv; return d >= 10 ? Math.max(.2, 1 - (d - 9) * .1) : 1; };
// 레벨업 (최고 레벨에서는 경험치가 더 쌓이지 않음). 올라간 레벨 수를 돌려줌
export function addExp(c, n) {
  let up = 0; c.exp += n;
  while (c.lv < LV_CAP && c.exp >= needExp(c.lv)) { c.exp -= needExp(c.lv); c.lv++; c.points += POINTS_PER_LV; up++; }
  if (c.lv >= LV_CAP) c.exp = Math.min(c.exp, needExp(c.lv) - 1);
  return up;
}
// 몬스터 한 번 공격의 피해 (물리/마법 방어력, 무작위 ±15%)
export const biteDmg = (mon, D) => D.god ? 0 : Math.max(1, Math.round(mon.atk * 100 / (100 + (mon.mg ? D.mdef : D.def)) * (.85 + Math.random() * .3)));

// ───────── 낚시 (기획서 4-6) ─────────
// 등급: 확률(%), 미니게임 맞히는 칸 넓이(비율)와 바늘 속도(초당 왕복)
export const FISH_GRADES = {   // 미니게임 난이도를 낮춤 (칸 넓게, 바늘 느리게)
  normal: { n: '일반', c: '#6f7a8a', p: 60, zone: .38, speed: .6 },
  uncommon: { n: '고급', c: '#2f8f45', p: 26, zone: .32, speed: .75 },
  rare: { n: '희귀', c: '#2f6fd0', p: 10, zone: .26, speed: .9 },
  epic: { n: '영웅', c: '#8a48cc', p: 3.5, zone: .21, speed: 1.05 },
  legend: { n: '전설', c: '#e0731c', p: .5, zone: .17, speed: 1.2 },
};
// 물고기: [아이콘, 이름, 최소 cm, 최대 cm, 기본 값(골드)]
export const FISH = {
  normal: [['🐟', '붕어', 15, 40, 10], ['🐟', '피라미', 6, 15, 6], ['🐍', '미꾸라지', 8, 20, 8], ['🐟', '송사리', 3, 6, 5], ['🐟', '잉어', 25, 70, 14], ['👢', '낡은 장화', 25, 30, 1]],
  uncommon: [['🐟', '메기', 30, 90, 30], ['🐟', '빙어', 8, 15, 24], ['🐟', '은어', 12, 30, 28], ['🐠', '쏘가리', 20, 50, 36], ['🐟', '가물치', 40, 100, 40]],
  rare: [['🌈', '무지개송어', 30, 70, 90], ['🐍', '장어', 40, 120, 110], ['🐡', '복어', 15, 40, 85], ['🐙', '문어', 30, 90, 100], ['🦀', '꽃게', 10, 25, 80]],
  epic: [['🦈', '철갑상어', 80, 200, 350], ['🐟', '참치', 100, 250, 400], ['🐢', '바다거북', 30, 80, 300], ['🦈', '상어', 150, 350, 450]],
  legend: [['🥬', '김치 잉어', 50, 120, 1500], ['🐉', '강의 용', 100, 300, 2000], ['🐋', '아기 고래', 300, 800, 1800], ['👑', '황금 붕어', 20, 50, 1200]],
};
export const FISHING = { cooldown: 10e3, waitMin: 1500, waitMax: 4500, window: 7000, perfect: 1.2, dayFull: 400 };   // dayFull: 하루에 이만큼 넘게 낚으면 값·코인 절반
// 등급별 확률(%) — 운 · 낚싯대(rod) · 미끼(bait)가 높을수록 좋은 등급이 잘 나옴
export function fishOdds(luk = 0, rod = 0, bait = 0) {
  const lb = 1 + luk * .005, m = { normal: 1, uncommon: 1 + .12 * bait + .04 * rod, rare: (1 + .22 * bait + .1 * rod) * lb, epic: (1 + .35 * bait + .15 * rod) * lb, legend: (1 + .5 * bait + .2 * rod) * lb };
  const w = Object.entries(FISH_GRADES).map(([g, x]) => [g, x.p * m[g]]), sum = w.reduce((a, [, p]) => a + p, 0);
  return Object.fromEntries(w.map(([g, p]) => [g, p / sum * 100]));
}
// 물고기 하나 정하기. 길이가 길수록 드물게
export function rollFish(luk = 0, rod = 0, bait = 0) {
  let r = Math.random() * 100, grade = 'normal';
  for (const [g, p] of Object.entries(fishOdds(luk, rod, bait))) { if (r < p) { grade = g; break; } r -= p; }
  const [i, n, min, max, base] = pick(FISH[grade]);
  const k = Math.pow(Math.random(), 2.2);   // 긴 물고기일수록 드묾
  const len = Math.round((min + (max - min) * k) * 10) / 10;
  return { i, n, grade, len, price: Math.max(1, Math.round(base * (.6 + 1.4 * k))) };
}

// 낚시 코인: 낚을 때마다 등급만큼 (완벽하면 +1)
export const FISH_COIN = { normal: 1, uncommon: 2, rare: 4, epic: 8, legend: 20 };
// 낚시점 (낚시 코인으로 삼). 낚싯대: 판정 칸 +6%/단계 + 좋은 등급 조금 / 미끼: 좋은 등급이 훨씬 잘 나옴
export const FISH_SHOP = {
  rod: { n: '낚싯대', i: '🎣', names: ['나무 낚싯대', '대나무 낚싯대', '카본 낚싯대', '은빛 낚싯대', '황금 낚싯대', '용의 낚싯대'], cost: [20, 50, 110, 220, 400], d: '판정 칸 +6% · 희귀 이상 확률 ↑' },
  bait: { n: '미끼', i: '🪱', names: ['지렁이', '새우 미끼', '반짝 루어', '황금 떡밥', '전설의 미끼', '김치 미끼'], cost: [15, 40, 90, 180, 350], d: '고급 이상 확률 크게 ↑' },
};
export const fishZone = (grade, rod = 0, fx = {}) => Math.min(.6, FISH_GRADES[grade].zone * (1 + .06 * rod + (fx.fishZ || 0) / 100));

// ───────── 카페 알바 ─────────
export const JOB = { sec: 60, pay: lv => 40 + lv * 5 };

// ═════════════════════ 4단계: 생활 (텃밭 · 채집 · 알바 고용 · 집 · 칭호 · 분수) ═════════════════════
const HOUR = 3600e3, MIN = 60e3;
// 캐릭터의 생활 정보 (DB characters.life 한 칸에 JSON으로)
export const newLife = () => ({ coins: { fish: 0, farm: 0 }, res: { wood: 0, stone: 0 }, fish: { rod: 0, bait: 0 },
  farm: { plots: [null, null, null, null, null, null], can: 0, seeds: ['lettuce', 'carrot'], wetAt: 0, wetM: 1 }, cnt: {}, titles: ['new'], buff: null, wishAt: 0,
  nodes: {}, gatherAt: 0, work: { lumber: { n: 0, at: 0, acc: 0 }, quarry: { n: 0, at: 0, acc: 0 } } });
export function fixLife(l) {
  const d = newLife(); if (!l || typeof l !== 'object') return d;
  for (const k of Object.keys(d)) if (l[k] === undefined || l[k] === null && k !== 'buff') l[k] = d[k];
  for (const k of ['coins', 'res', 'fish', 'farm']) l[k] = { ...d[k], ...l[k] };
  l.work = { lumber: { ...d.work.lumber, ...l.work?.lumber }, quarry: { ...d.work.quarry, ...l.work?.quarry } };
  if (!Array.isArray(l.titles)) l.titles = ['new']; if (!l.titles.includes('new')) l.titles.unshift('new');
  return l;
}
export const cntAdd = (c, k, n = 1) => { const t = c.life.cnt; t[k] = (t[k] || 0) + n; };

// ───────── 텃밭 ─────────
// sec: 자라는 시간 · cost: 씨앗 값(골드) · sell: 팔면 골드 · coin: 텃밭 코인 · unlock: 품종 여는 데 드는 텃밭 코인
export const CROPS = [
  { id: 'lettuce', n: '상추', i: '🥬', sec: 120, cost: 10, sell: 24, coin: 1, unlock: 0 },
  { id: 'carrot', n: '당근', i: '🥕', sec: 300, cost: 30, sell: 75, coin: 1, unlock: 0 },
  { id: 'potato', n: '감자', i: '🥔', sec: 900, cost: 80, sell: 210, coin: 2, unlock: 10 },
  { id: 'corn', n: '옥수수', i: '🌽', sec: 1800, cost: 150, sell: 420, coin: 3, unlock: 30 },
  { id: 'pepper', n: '고추', i: '🌶️', sec: 3600, cost: 300, sell: 880, coin: 4, unlock: 70 },
  { id: 'berry', n: '딸기', i: '🍓', sec: 7200, cost: 550, sell: 1700, coin: 6, unlock: 140 },
  { id: 'melon', n: '수박', i: '🍉', sec: 14400, cost: 1000, sell: 3300, coin: 9, unlock: 260 },
  { id: 'gold', n: '황금 배추', i: '🌟', sec: 28800, cost: 2000, sell: 7000, coin: 15, unlock: 450 },
];
export const cropOf = id => CROPS.find(x => x.id === id);
// 물뿌리개: 물을 주면 5분 동안 mul배 빨리 자람. 5분에 한 번
export const CANS = { names: ['낡은 물뿌리개', '양철 물뿌리개', '구리 물뿌리개', '은 물뿌리개', '금 물뿌리개', '무지개 물뿌리개'], mul: [3, 3.5, 4, 4.5, 5, 6], cost: [20, 50, 100, 200, 380] };
export const FARM = { cd: 5 * MIN, dur: 5 * MIN, maxPlots: 9, plotCost: [40, 120, 300] };   // plotCost: 7·8·9번째 칸 (텃밭 코인)
// 칸 하나가 지금까지 자란 초 (물 준 5분 동안은 빨리)
export function plotGrown(p, f, now) {
  if (!p) return 0;
  const s = f.wetAt, e = f.wetAt + FARM.dur, ov = Math.max(0, Math.min(now, e) - Math.max(p.t, s));
  return p.g + ((now - p.t) + (f.wetM - 1) * ov) / 1000;
}
// 모든 칸을 지금 시각으로 맞춤 (물 주기 전에 꼭)
export function farmSettle(f, now) { for (const p of f.plots) if (p) { p.g = plotGrown(p, f, now); p.t = now; } }

// ───────── 채집 (마을의 나무 · 바위) · 알바 고용 ─────────
export const GATHER = { tree: { n: '나무', res: 'wood', amt: [2, 4], regrow: [3 * MIN, 6 * MIN], sec: 1.6 }, rock: { n: '바위', res: 'stone', amt: [1, 3], regrow: [4 * MIN, 8 * MIN], sec: 2 }, gap: 1200 };
export const RES = { wood: { n: '목재', i: '🪵' }, stone: { n: '석재', i: '🪨' } };
// rate: 알바 1명이 1시간에 모으는 양 · cap: 쌓이는 최대 시간 · hire(k): k번째 알바 비용
export const WORK = {
  lumber: { n: '벌목소', res: 'wood', rate: 8, cap: 8, max: 5, hire: k => ({ gold: 1500 * k, wood: 20 * k }) },
  quarry: { n: '채광소', res: 'stone', rate: 6, cap: 8, max: 5, hire: k => ({ gold: 1500 * k, stone: 15 * k }) },
};
export function workSettle(w, kind, now) {
  const W = WORK[kind], cap = w.n * W.rate * W.cap;
  if (w.n && w.at) w.acc = Math.min(cap, w.acc + w.n * W.rate * (now - w.at) / HOUR);
  w.at = now; return { have: Math.floor(w.acc), cap };
}

// ───────── 집 ─────────
export const HOUSE = { cost: { gold: 3000, wood: 60, stone: 40 }, move: { gold: 500, wood: 10, stone: 10 },
  roofs: ['#4f9d5a', '#2bb3a6', '#3d7bd9', '#9a5ad6', '#e8553a', '#e9a23b', '#ef7fa6', '#5d6b7e'] };
export const costText = o => Object.entries(o).map(([k, v]) => `${k === 'gold' ? '🪙' : RES[k].i} ${v.toLocaleString()}`).join(' · ');

// ───────── 소원 분수: 10분에 한 번, 10골드 ─────────
export const WISH = { cost: 10, cd: 10 * MIN };
// 버프 (하나만, 새로 받으면 바뀜)
export const BUFFS = { gold: { n: '반짝이는 물보라', i: '💰', d: '골드 +15%', fx: { goldP: 15 } }, exp: { n: '맑은 물결', i: '📘', d: '경험치 +15%', fx: { expP: 15 } },
  atk: { n: '용기의 물방울', i: '⚔️', d: '공격력 +10%', fx: { atkP: 10 } }, luck: { n: '무지개 축복', i: '🌈', d: '골드 +20% · 경험치 +20% · 치명타 +5%p', fx: { goldP: 20, expP: 20, crit: 5 } } };
// [무게, 결과]
export const WISH_TABLE = [[55, { k: 'none' }], [18, { k: 'gold', min: 20, max: 60 }], [8, { k: 'buff', b: 'gold', min: 30 }], [8, { k: 'buff', b: 'exp', min: 30 }],
  [5, { k: 'coin' }], [3, { k: 'pots' }], [2, { k: 'buff', b: 'atk', min: 60 }], [.7, { k: 'jackpot', g: 1000 }], [.3, { k: 'rainbow', g: 3000, b: 'luck', min: 60 }]];
export function rollWish() { let r = Math.random() * WISH_TABLE.reduce((a, [w]) => a + w, 0); for (const [w, o] of WISH_TABLE) { if ((r -= w) < 0) return o; } return WISH_TABLE[0][1]; }

// ───────── 장비 랜덤 옵션 (뽑을 때 붙음) ─────────
// w: 1단계 일반 기준 범위 · s: 비교 점수 배율 · u: 단위
export const OPTS = {
  atkP: { n: '공격력', u: '%', w: [2, 5], s: 1 }, crit: { n: '치명타', u: '%p', w: [1, 3], s: 1 }, critD: { n: '치명타 피해', u: '%', w: [5, 12], s: .4 }, aspd: { n: '공격 속도', u: '%', w: [2, 5], s: 1 },
  sp: { n: '필살기 확률', u: '%p', w: [1, 2.5], s: 1 }, bossP: { n: '보스 피해', u: '%', w: [4, 10], s: .3 }, steal: { n: '흡혈', u: '%', w: [.5, 1.5], s: 2 },
  goldP: { n: '골드 획득', u: '%', w: [2, 6], s: .3 }, expP: { n: '경험치', u: '%', w: [2, 5], s: .3 }, hpP: { n: '최대 체력', u: '%', w: [2, 6], s: .7 }, defP: { n: '물리 방어', u: '%', w: [3, 7], s: .7 },
  mdefP: { n: '마법 방어', u: '%', w: [3, 7], s: .5 }, eva: { n: '회피', u: '%p', w: [.5, 2], s: 1.2 }, regen: { n: '사냥 중 회복', u: '%p/초', w: [.2, .5], s: 3 }, potP: { n: '물약 회복', u: '%', w: [5, 15], s: .2 }, spdP: { n: '이동 속도', u: '%', w: [2, 5], s: .3 },
};
export const W_OPTS = ['atkP', 'crit', 'critD', 'aspd', 'sp', 'bossP', 'steal', 'goldP', 'expP'], A_OPTS = ['hpP', 'defP', 'mdefP', 'eva', 'regen', 'potP', 'goldP', 'expP', 'spdP'];
export const OPT_N = { poor: 0, normal: 1, uncommon: 1, rare: 2, epic: 2, legend: 3, myth: 3 };
const OPT_G = { poor: .8, normal: 1, uncommon: 1.1, rare: 1.25, epic: 1.4, legend: 1.6, myth: 1.85 };
export function rollOpts(slot, st, g) {
  const pool = [...(WEAPON_SLOTS.includes(slot) ? W_OPTS : A_OPTS)], out = [];
  for (let k = 0; k < OPT_N[g] && pool.length; k++) {
    const key = pool.splice(Math.floor(Math.random() * pool.length), 1)[0], [a, b] = OPTS[key].w;
    out.push([key, Math.round((a + Math.random() * (b - a)) * (1 + .2 * (st - 1)) * OPT_G[g] * 10) / 10]);
  }
  return out;
}
export const optText = ([k, v]) => `${OPTS[k]?.n || k} +${v}${OPTS[k]?.u || ''}`;
export function optScore(it) { return (it?.o || []).reduce((a, [k, v]) => a + v * (OPTS[k]?.s || 0), 0); }

// ───────── 칭호 (도전 과제를 깨면 생김. 갖고만 있어도 효과) ─────────
// k: 세는 것 (lv·str·dex·int·luk = 캐릭터 값, 나머지 = life.cnt) · v: 목표 · fx: 보유 효과
export const FX_N = { atkP: ['공격력', '%'], defP: ['방어', '%'], hpP: ['최대 체력', '%'], crit: ['치명타', '%p'], eva: ['회피', '%p'], goldP: ['골드', '%'], expP: ['경험치', '%'], spdP: ['이동 속도', '%'],
  fishC: ['낚시 코인', '%'], fishZ: ['낚시 판정 칸', '%'], farmP: ['작물 골드', '%'], farmC: ['텃밭 코인', '%'], gather: ['채집량', '개'], fishP: ['물고기 값', '%'], enhB: ['강화 확률', '%p'], bossP: ['보스 피해', '%'], regen: ['사냥 중 회복', '%p/초'] };
const tt = (id, n, g, k, v, fx, d) => ({ id, n, g, k, v, fx, d });
export const TITLE_GROUPS = ['마을', '성장', '사냥', '낚시', '텃밭', '채집', '장비'];
export const TITLES = [
  tt('new', '새로 온', '마을', 'lv', 1, {}, '치복 타운에 처음 왔어요'),
  tt('lv5', '첫발을 뗀', '성장', 'lv', 5, { hpP: 1 }, '5레벨 달성'), tt('lv10', '10레벨을 달성한', '성장', 'lv', 10, { atkP: 1 }, '10레벨 달성'),
  tt('lv20', '20레벨을 달성한', '성장', 'lv', 20, { hpP: 2 }, '20레벨 달성'), tt('lv30', '30레벨을 달성한', '성장', 'lv', 30, { atkP: 2 }, '30레벨 달성'),
  tt('lv40', '40레벨을 달성한', '성장', 'lv', 40, { defP: 2 }, '40레벨 달성'), tt('lv50', '50레벨을 달성한', '성장', 'lv', 50, { atkP: 3 }, '50레벨 달성'),
  tt('lv55', '마을에서 제일 센', '성장', 'lv', 55, { crit: 2, hpP: 2 }, '지금 열린 최고 레벨(55) 달성'),
  tt('str100', '힘이 넘치는', '성장', 'str', 100, { hpP: 2 }, '힘 100'), tt('dex100', '날렵한', '성장', 'dex', 100, { eva: 1 }, '민첩 100'),
  tt('int100', '똑똑한', '성장', 'int', 100, { defP: 2 }, '지력 100'), tt('luk100', '운이 좋은', '성장', 'luk', 100, { goldP: 2 }, '운 100'),
  tt('k100', '사냥을 시작한', '사냥', 'kills', 100, { goldP: 1 }, '몬스터 100마리'), tt('k1000', '몬스터를 잡는', '사냥', 'kills', 1000, { atkP: 1 }, '몬스터 1,000마리'),
  tt('k10000', '전투에 익숙한', '사냥', 'kills', 10000, { atkP: 2 }, '몬스터 10,000마리'), tt('k50000', '몬스터가 무서워하는', '사냥', 'kills', 50000, { atkP: 3, crit: 1 }, '몬스터 50,000마리'),
  tt('b1', '첫 보스를 쓰러뜨린', '사냥', 'boss', 1, { bossP: 3 }, '보스 처치 1번'), tt('b10', '보스를 사냥하는', '사냥', 'boss', 10, { bossP: 5 }, '보스 처치 10번'),
  tt('b50', '보스도 겁내는', '사냥', 'boss', 50, { bossP: 8, atkP: 1 }, '보스 처치 50번'),
  tt('d1', '한 번 쓰러져 본', '사냥', 'died', 1, { hpP: 1 }, '사냥터에서 쓰러지기 1번'), tt('d10', '포기를 모르는', '사냥', 'died', 10, { hpP: 2, regen: .1 }, '사냥터에서 쓰러지기 10번'),
  tt('f1', '첫 물고기를 낚은', '낚시', 'fish', 1, { fishZ: 2 }, '물고기 1마리'), tt('f50', '낚시를 좋아하는', '낚시', 'fish', 50, { fishC: 5 }, '물고기 50마리'),
  tt('f300', '강가의 단골인', '낚시', 'fish', 300, { fishC: 10, fishZ: 3 }, '물고기 300마리'), tt('f1000', '물고기와 친한', '낚시', 'fish', 1000, { fishC: 15, goldP: 1 }, '물고기 1,000마리'),
  tt('fp30', '손맛을 아는', '낚시', 'perfect', 30, { fishZ: 4 }, '완벽하게 낚기 30번'), tt('fl1', '전설을 낚은', '낚시', 'legendFish', 1, { fishC: 10 }, '전설 물고기 1마리'),
  tt('boot', '낡은 장화를 건진', '낚시', 'boot', 1, { spdP: 1 }, '낡은 장화 낚기 (?)'),
  tt('c1', '첫 수확을 한', '텃밭', 'crops', 1, { farmP: 2 }, '작물 수확 1번'), tt('c100', '텃밭을 가꾸는', '텃밭', 'crops', 100, { farmP: 5, farmC: 5 }, '작물 수확 100번'),
  tt('c500', '농사의 달인인', '텃밭', 'crops', 500, { farmP: 10, farmC: 10 }, '작물 수확 500번'), tt('w100', '물 주기를 잊지 않는', '텃밭', 'water', 100, { farmC: 5 }, '물 주기 100번'),
  tt('gold1', '황금 배추를 키운', '텃밭', 'goldCrop', 1, { goldP: 2 }, '황금 배추 수확'),
  tt('wd100', '나무를 베는', '채집', 'wood', 100, { gather: 1 }, '목재 100개'), tt('wd1000', '숲을 아는', '채집', 'wood', 1000, { gather: 1, hpP: 1 }, '목재 1,000개'),
  tt('st100', '돌을 캐는', '채집', 'stone', 100, { gather: 1 }, '석재 100개'), tt('st1000', '바위를 부수는', '채집', 'stone', 1000, { gather: 1, defP: 1 }, '석재 1,000개'),
  tt('hire1', '알바를 고용한', '채집', 'hire', 1, { goldP: 1 }, '알바 1명 고용'), tt('hire10', '사장님 소리를 듣는', '채집', 'hire', 10, { goldP: 3 }, '알바 10명 고용 (벌목소+채광소)'),
  tt('home', '내 집을 마련한', '마을', 'house', 1, { hpP: 2 }, '집 짓기'),
  tt('g100', '뽑기를 좋아하는', '장비', 'gacha', 100, { goldP: 1 }, '뽑기 100번'), tt('g1000', '뽑기에 진심인', '장비', 'gacha', 1000, { goldP: 2, crit: 1 }, '뽑기 1,000번'),
  tt('gl', '전설을 뽑은', '장비', 'gotLegend', 1, { crit: 1 }, '전설 등급 장비 뽑기'), tt('gm', '신화를 손에 넣은', '장비', 'gotMyth', 1, { atkP: 2 }, '신화 등급 장비 뽑기'),
  tt('e10', '망치질을 배운', '장비', 'enhOk', 10, { enhB: .5 }, '강화 성공 10번'), tt('e10max', '+10을 해낸', '장비', 'enhMax', 10, { atkP: 2, enhB: .5 }, '아무 칸이나 +10 강화'),
  tt('wi10', '소원을 비는', '마을', 'wish', 10, { goldP: 1 }, '소원 10번'), tt('wi100', '분수의 단골인', '마을', 'wish', 100, { goldP: 2, expP: 1 }, '소원 100번'),
  tt('jack', '대박이 난', '마을', 'jackpot', 1, { goldP: 3 }, '분수에서 대박 (아주 드묾)'),
  tt('dq10', '의뢰를 해결하는', '마을', 'daily', 10, { goldP: 1 }, '매일 의뢰 10개'), tt('dq100', '마을의 해결사인', '마을', 'daily', 100, { goldP: 2, expP: 2 }, '매일 의뢰 100개'),
  tt('wb1', '도장을 다 모은', '마을', 'weekBox', 1, { expP: 1 }, '한 주에 도장 5개'), tt('wb8', '두 달을 성실하게 보낸', '마을', 'weekBox', 8, { expP: 2, hpP: 2 }, '도장 상자 8번'),
  tt('give1', '마을을 함께 짓는', '마을', 'give', 1, { hpP: 1 }, '공동 건설에 기부'), tt('give50', '마을의 기둥인', '마을', 'give', 50, { goldP: 2, hpP: 2 }, '공동 건설 기부 50번'),
  tt('live1', '방송을 함께 본', '마을', 'live', 1, { expP: 1 }, '방송 중에 출석'), tt('live10', '방송의 단골인', '마을', 'live', 10, { expP: 2, goldP: 2 }, '방송 출석 10번'),
  tt('day7', '일주일을 함께한', '마을', 'days', 7, { expP: 1 }, '7일 접속'), tt('day30', '한 달을 함께한', '마을', 'days', 30, { expP: 3 }, '30일 접속'),
  tt('job10', '카페에서 일하는', '마을', 'job', 10, { goldP: 1 }, '카페 알바 10번'), tt('job100', '바리스타가 된', '마을', 'job', 100, { goldP: 2, spdP: 2 }, '카페 알바 100번'),
  tt('chief', '마을을 지키는', '마을', 'adm', 1, { hpP: 3 }, '치복 타운 관리자'),
];
export const titleOf = id => TITLES.find(x => x.id === id);
export const titleName = id => titleOf(id)?.n || '';
export const titleProg = (c, x) => (['lv', 'str', 'dex', 'int', 'luk'].includes(x.k) ? c[x.k] : x.k === 'adm' ? (c._adm ? 1 : 0) : c.life?.cnt?.[x.k] || 0);
// 새로 깬 칭호를 life.titles 에 넣고, 새로 생긴 것 목록을 돌려줌
export function checkTitles(c) {
  const got = []; for (const x of TITLES) if (!c.life.titles.includes(x.id) && titleProg(c, x) >= x.v) { c.life.titles.push(x.id); got.push(x.id); }
  return got;
}
const addFx = (fx, o) => { for (const [k, v] of Object.entries(o)) fx[k] = Math.round(((fx[k] || 0) + v) * 100) / 100; };
export function titleFx(c) { const fx = {}; for (const id of c.life?.titles || []) addFx(fx, titleOf(id)?.fx || {}); return fx; }
// 효과 합계: 가진 칭호 전부 + 지금 버프 + 장비 옵션(방어구 3칸 + 지금 클래스 무기)
export function statFx(c) {
  const fx = titleFx(c), b = c.life?.buff;
  if (c.gfx) addFx(fx, c.gfx);   // 마을 전체 효과 (사건 · 방송 · 공동 건설)
  if (b && b.until > Date.now() && BUFFS[b.k]) addFx(fx, BUFFS[b.k].fx);
  for (const s of [...ARMOR_SLOTS, CLASSES[c.cls] ? c.cls : 'sword']) addFx(fx, Object.fromEntries(c.equip?.[s]?.o || []));
  return fx;
}
export const fxText = fx => Object.entries(fx).map(([k, v]) => `${FX_N[k]?.[0] || OPTS[k]?.n || k} +${v}${FX_N[k]?.[1] ?? OPTS[k]?.u ?? ''}`).join(' · ');

// ───────── 할 이유 (기획서 4-8): 매일 의뢰 · 주간 도장 · 마을 사건 · 공동 건설 · 방송 보너스 ─────────
export const dayKey = t => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);   // 한국 날짜
export const weekKey = t => { const d = new Date(t + 9 * 3600e3); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return d.toISOString().slice(0, 10); };   // 그 주 월요일
const hash = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const seeded = s => { let x = hash(s) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };

// 매일 의뢰: 날마다 4개 (모두 같은 의뢰). k = 세는 기록(cnt), v = 목표
export const DAILY_POOL = [
  { k: 'kills', n: '몬스터 잡기', v: 80, i: '⚔️' }, { k: 'fish', n: '물고기 낚기', v: 8, i: '🎣' }, { k: 'crops', n: '작물 수확하기', v: 6, i: '🌾' },
  { k: 'water', n: '텃밭에 물 주기', v: 3, i: '💧' }, { k: 'wood', n: '목재 모으기', v: 20, i: '🪵' }, { k: 'stone', n: '석재 모으기', v: 15, i: '🪨' },
  { k: 'wish', n: '분수에 소원 빌기', v: 2, i: '⛲' }, { k: 'gacha', n: '장비 뽑기', v: 10, i: '🎰' }, { k: 'enhTry', n: '장비 칸 강화하기', v: 3, i: '🔨' },
  { k: 'give', n: '공동 건설에 기부하기', v: 1, i: '🏗️' }, { k: 'job', n: '카페 알바 하기', v: 1, i: '☕' }, { k: 'perfect', n: '완벽하게 낚기', v: 2, i: '🌟' },
];
export const DAILY_N = 4, STAMP_GOAL = 5;
export const dailyGold = lv => 500 + lv * 100;               // 의뢰 하나 보상 (사냥 약 4분어치)
export const weekBox = lv => ({ gold: 5000 + lv * 1500, fish: 15, farm: 15 });   // 도장 5개 상자 (사냥 약 1시간어치)
export function dailyTasks(day) {
  const r = seeded('daily' + day), pool = [...DAILY_POOL], out = [];
  while (out.length < DAILY_N) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
}
const cntOf = (c, k) => c.life.cnt[k] || 0;
export function dailyState(c, t) {
  const L = c.life, day = dayKey(t);
  if (!L.daily || L.daily.day !== day) L.daily = { day, base: Object.fromEntries(DAILY_POOL.map(q => [q.k, cntOf(c, q.k)])), done: [] };
  if (!L.stamp || L.stamp.week !== weekKey(t)) L.stamp = { week: weekKey(t), n: 0, box: false };
  return L.daily;
}
export const dailyProg = (c, q) => q.k === 'give' && ((c._w || c.world)?.lv || 0) >= VILLAGE.length ? q.v : Math.max(0, cntOf(c, q.k) - (c.life.daily?.base?.[q.k] ?? cntOf(c, q.k)));
// 다 한 의뢰는 바로 보상. 4개 다 하면 도장 1개, 그 주 도장 5개면 상자
export function checkDaily(c, t) {
  const d = dailyState(c, t), tasks = dailyTasks(d.day), got = [];
  tasks.forEach((q, i) => {
    if (d.done.includes(i) || dailyProg(c, q) < q.v) return;
    d.done.push(i); const g = dailyGold(c.lv); c.gold += g; cntAdd(c, 'daily'); got.push({ n: q.n, i: q.i, gold: g });
  });
  if (got.length && d.done.length >= tasks.length && !d.stamped) {
    d.stamped = true; const s = c.life.stamp; s.n++; c.life.coins.fish += 3; c.life.coins.farm += 3; got.push({ stamp: s.n });
    if (s.n >= STAMP_GOAL && !s.box) { s.box = true; const b = weekBox(c.lv); c.gold += b.gold; c.life.coins.fish += b.fish; c.life.coins.farm += b.farm; cntAdd(c, 'weekBox'); got.push({ box: b }); }
  }
  return got;
}

// 마을 사건: 2시간마다 한 번, 40분 동안. 시간으로 정해져서 화면·서버가 똑같이 계산 (저장할 것 없음)
export const EVENT_BLOCK = 2 * 3600e3, EVENT_LEN = 40 * 60e3;
export const EVENTS = [
  { k: 'fish', n: '황금 물때', i: '🐟', d: '물고기 값 +50% · 낚시 코인 +30%', fx: { fishP: 50, fishC: 30 } },
  { k: 'farm', n: '풍년 잔치', i: '🌾', d: '작물 골드 +50% · 텃밭 코인 +50%', fx: { farmP: 50, farmC: 50 } },
  { k: 'wind', n: '바람 부는 날', i: '🌳', d: '나무·바위 채집량 +2', fx: { gather: 2 } },
  { k: 'mons', n: '몬스터 대이동', i: '⚔️', d: '사냥 경험치 +25%', fx: { expP: 25 } },
  { k: 'market', n: '반짝 장날', i: '💰', d: '골드 +20%', fx: { goldP: 20 } },
  { k: 'smith', n: '대장장이 축제', i: '🔨', d: '강화 확률 +3%p', fx: { enhB: 3 } },
  { k: 'wish', n: '별이 빛나는 분수', i: '⛲', d: '소원 대기 시간 절반', fx: {} },
];
export function eventAt(t) {
  const b = Math.floor(t / EVENT_BLOCK), r = seeded('ev' + b), start = b * EVENT_BLOCK + Math.floor(r() * (EVENT_BLOCK - EVENT_LEN) / 60e3) * 60e3;
  return { ...EVENTS[Math.floor(r() * EVENTS.length)], start, end: start + EVENT_LEN };
}
export const eventNow = t => { const e = eventAt(t); return t >= e.start && t < e.end ? e : null; };
export function nextEvent(t) { const e = eventAt(t); return t < e.start ? e : eventAt((Math.floor(t / EVENT_BLOCK) + 1) * EVENT_BLOCK); }

// 방송 보너스: 김치복님이 방송 중이면 마을 모두
export const LIVE_FX = { expP: 30, goldP: 20 };
export const liveGift = lv => 1000 + lv * 200;               // 방송 출석 보상 (하루 한 번, 사냥 약 8분어치)

// 마을 공동 건설: 모두가 목재·석재·골드를 모아 하나씩 지음. 다 지으면 마을 모두에게 영원히 효과
export const VILLAGE = [
  { id: 'flower', n: '광장 꽃밭', i: '🌻', need: { wood: 1500, stone: 800, gold: 300000 }, fx: { expP: 3 } },
  { id: 'light', n: '강가 등대', i: '🏛️', need: { wood: 3500, stone: 3500, gold: 1000000 }, fx: { fishC: 10, fishZ: 5 } },
  { id: 'stage', n: '축제 무대', i: '🎉', need: { wood: 6000, stone: 4000, gold: 2500000 }, fx: { goldP: 5 } },
  { id: 'spa', n: '마을 온천', i: '💧', need: { wood: 6000, stone: 10000, gold: 5000000 }, fx: { hpP: 5, regen: .5 } },
  { id: 'bridge', n: '무지개 다리', i: '🌈', need: { wood: 14000, stone: 14000, gold: 10000000 }, fx: { atkP: 5 } },
  { id: 'tower', n: '김치복 기념탑', i: '👑', need: { wood: 25000, stone: 25000, gold: 25000000 }, fx: { expP: 5, goldP: 5 } },
];
export const giveScore = g => (g.wood || 0) + (g.stone || 0) * 1.2 + (g.gold || 0) / 500;   // 골드는 벌기 쉬워서 낮게
// 마을 전체 효과 합계 (사건 + 방송 + 다 지은 건물)
export function worldFx(w, t) {
  const fx = {}; const add = o => { for (const [k, v] of Object.entries(o)) fx[k] = Math.round(((fx[k] || 0) + v) * 100) / 100; };
  const e = eventNow(t); if (e) add(e.fx);
  if (w?.live) add(LIVE_FX);
  for (let i = 0; i < Math.min(w?.lv || 0, VILLAGE.length); i++) add(VILLAGE[i].fx);
  return fx;
}
