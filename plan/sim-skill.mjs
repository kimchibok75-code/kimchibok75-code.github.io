// 고렙 직업 비교 시험 (2026-11-22, 요정 소환 밸런스용)
// node plan/sim-skill.mjs <레벨> <시간> <반복> [요정 m] [heal]
//   같은 레벨·같은 장비(6단계, 등급·강화 고정, 옵션 없음)·같은 스킬 레벨로 직업 셋을 늪지에서 사냥시켜 비교
//   heal을 붙이면 마법사 6번째 스킬을 예전 치유의 빛으로 바꿔서 비교
//   DOPE=1 (환경 변수): 풀 도핑 — 모든 스킨 · 레이드 스킨 Lv10 · 물고기·작물·스킨 도감 완성 · 테마 전부 · 칭호 전부 · 마을 공동 건설 완성 · 장비 옵션(무작위)
//   DOPE=2: 위 + 분수 공격 버프(+20%) + 경험치·골드 쿠폰
const R = 'file:///C:/Users/bigib/Desktop/%EA%B9%80%EC%B9%98%EB%B3%B5%20%ED%99%88%ED%8E%98%EC%9D%B4%EC%A7%80/';
const G = await import(R + 'assets/js/game-rules.js');
const H = await import(R + 'game-worker/src/hunt.js');
const { newCharacter, derive, FIELDS, SKILLS, SK_NEED, raidDps, totalPoints, makeItem, rollOpts, HATS, EYE_SKINS, SUITS, WSKINS, wskKey, RAID_BOSS, raidSet, RSK, TITLES, FISH_LIST, CROP_LIST, VILLAGE, worldFx } = G;
const DOPE = +(process.env.DOPE || 0);

const L = +(process.argv[2] || 100), HOURS = +(process.argv[3] || 1), RUNS = +(process.argv[4] || 3), FM = process.argv[5], OLD = process.argv[6] === 'heal';
const fairy = SKILLS.find(s => s.id === 'm_heal');
if (OLD) Object.assign(fairy, { n: '치유의 빛', k: 'heal', v: 25, cd: 22, m: 0, dur: 0, fr: 0 });
else if (FM) fairy.m = +FM;
const SET = L >= 200 ? { g: 'myth', enh: 20, sk: 10 } : L >= 150 ? { g: 'legend', enh: 17, sk: 9 } : { g: 'epic', enh: 13, sk: 7 };
const MAIN = { sword: 'str', bow: 'dex', staff: 'int' };

function make(cls) {
  const c = newCharacter(); c.cls = cls; c.lv = L; c.exp = 0;
  c.str = c.dex = c.int = c.luk = 5; c[MAIN[cls]] += totalPoints(L);
  for (const s of ['sword', 'bow', 'staff', 'hat', 'armor', 'shoes']) { c.equip[s] = makeItem(s, 6, SET.g, null, DOPE ? rollOpts(s, 6, SET.g) : []); c.enh[s] = SET.enh; }
  if (DOPE) {
    const raidKeys = Object.values(RAID_BOSS).flatMap(b => raidSet(b.set));
    c.hats = [...new Set([...HATS.map(h => h.id), ...EYE_SKINS.map(e => 'eye:' + e.id), ...SUITS.map(s => 'suit:' + s.id), ...WSKINS.map(wskKey), ...raidKeys])];
    c.life.rsk = Object.fromEntries(raidKeys.map(k => [k, 2 ** (RSK.max - 1)]));
    c.life.titles = TITLES.map(x => x.id);
    for (const f of FISH_LIST) c.life.cnt['fc_' + f.id] = 1;
    for (const x of CROP_LIST) c.life.cnt['cc_' + x.id] = 1;
    c.gfx = worldFx({ lv: VILLAGE.length, live: false }, 0);   // 공동 건설 완성 (시각 0 = 마을 사건 없음)
    if (DOPE >= 2) { c.life.buff = { k: 'atk', until: 9e15 }; c.life.cpn = { exp: 9e15, gold: 9e15 }; }
  }
  c.life.sk = {}; for (const s of SKILLS) if (s.cls === cls) c.life.sk[s.id] = SK_NEED[SET.sk - 1];
  c.potAt = 40; c.hp = derive(c).maxHp; return c;
}
function run(cls) {
  const c = make(cls), fi = FIELDS.length - 1; let at = 1e12, exp = 0, kills = 0, deaths = 0, pots = 0, bosses = 0, skip = 0;
  const fill = () => { c.pots = { s: 40, l: 20, xl: 10 }; };
  fill(); H.startHunt(c, fi, at);
  for (let t = 0; t < HOURS * 3600; t += 30) {
    at += 30000; const o = H.settle(c, at);
    exp += o.exp || 0; kills += o.kills; pots += o.pots; bosses += o.bosses.length; skip += o.bossSkip.length;
    c.lv = L; c.exp = 0;   // 레벨 고정
    if (o.died) { deaths++; c.hp = derive(c).maxHp; H.startHunt(c, fi, at); }
    if (t % 600 === 0) fill();
  }
  return { exp: exp / HOURS, kills: kills / HOURS, deaths, pots: pots / HOURS, bosses, skip, dps: raidDps(derive(c)) };
}
const out = {};
for (const cls of ['sword', 'bow', 'staff']) {
  const rs = Array.from({ length: RUNS }, () => run(cls)), avg = k => Math.round(rs.reduce((a, r) => a + r[k], 0) / RUNS);
  out[cls] = { expH: avg('exp'), killsH: avg('kills'), deaths: rs.map(r => r.deaths).join('/'), potsH: avg('pots'), boss: avg('bosses'), skip: avg('skip'), dps: avg('dps'),
    spread: Math.round((Math.max(...rs.map(r => r.exp)) - Math.min(...rs.map(r => r.exp))) / avg('exp') * 100) + '%' };
}
console.log(JSON.stringify({ L, dope: DOPE, hours: HOURS, runs: RUNS, staff6: OLD ? '치유의 빛' : `요정 m=${fairy.m}`, set: SET, ...out }));
