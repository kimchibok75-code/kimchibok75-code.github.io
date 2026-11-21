// 1→100레벨 실제 플레이 흉내: 사냥으로 번 골드를 뽑기·강화·스킬·물약에 씀 (2026-11-20)
// node full.mjs <cls> <run번호>  → JSON 한 줄
const R = 'file:///C:/Users/bigib/Desktop/%EA%B9%80%EC%B9%98%EB%B3%B5%20%ED%99%88%ED%8E%98%EC%9D%B4%EC%A7%80/';
const G = await import(R + 'assets/js/game-rules.js');
const H = await import(R + 'game-worker/src/hunt.js');
const { newCharacter, derive, FIELDS, POTS, rollGacha, gachaInfo, GACHA_TEN, itemPower, dismantle, ENH_COST, ENH_MAX, enhRate,
  SKILL_GACHA, skGachaInfo, rollSkill, SK_NEED, SKILLS, raidDps, totalPoints, needExp, expPenalty } = G;

const cls = process.argv[2] || 'sword', RUN = process.argv[3] || '1', TARGET = +(process.argv[4] || 100);
const MAIN = { sword: 'str', bow: 'dex', staff: 'int' }[cls];
const c = newCharacter(); c.cls = cls; c.gold = 500;
const ARM = ['hat', 'armor', 'shoes'];
const setStats = () => { c.str = c.dex = c.int = c.luk = 5; c[MAIN] += totalPoints(c.lv); };
setStats();

// 지출 기록
const spent = { gacha: 0, enh: 0, skill: 0, pot: 0 }; let earned = 0, dis = 0;
const want = { gacha: .45, enh: .25, skill: .30 };   // 물약값 빼고 남은 돈을 이 비율로
const pickField = lv => { let f = 0; FIELDS.forEach((F, i) => { if (lv >= F.min) f = i; }); return f; };

function equipBetter(it) {
  const cur = c.equip[it.slot];
  if (!cur || itemPower(it) > itemPower(cur)) { if (cur) { c.gold += dismantle(cur); dis += dismantle(cur); } c.equip[it.slot] = it; }
  else { c.gold += dismantle(it); dis += dismantle(it); }
}
function doGacha() {
  // 무기 상자·방어구 상자 번갈아 (방어구가 없으면 방어구 먼저)
  c.gacha ||= { w: 0, a: 0 };
  const box = ARM.some(s => !c.equip[s]) ? 'a' : (c.gacha.w <= c.gacha.a ? 'w' : 'a');
  const g = gachaInfo(c.gacha[box]); const ten = Math.round(g.cost * 10 * GACHA_TEN);
  const n = c.gold >= ten * 1.2 ? 10 : 1, cost = n === 10 ? ten : g.cost; if (c.gold < cost) return false;
  c.gold -= cost; spent.gacha += cost;
  for (let k = 0; k < n; k++) { const lv = gachaInfo(c.gacha[box]).lv; c.gacha[box]++; equipBetter(rollGacha(box, lv)); }
  return true;
}
function doEnh() {
  // 지금 클래스 무기를 먼저, 방어구는 무기보다 2 낮게까지
  const w = c.enh[cls] || 0; let slot = cls;
  for (const s of ARM) if (c.equip[s] && (c.enh[s] || 0) < w - 2) { slot = s; break; }
  const l = c.enh[slot] || 0; if (l >= ENH_MAX) { const s2 = ARM.find(s => c.equip[s] && (c.enh[s] || 0) < ENH_MAX); if (!s2) return false; slot = s2; }
  const L = c.enh[slot] || 0, cost = ENH_COST[L]; if (c.gold < cost) return false;
  c.gold -= cost; spent.enh += cost;
  if (Math.random() * 100 < enhRate(L, derive(c))) c.enh[slot] = L + 1;
  return true;
}
function doSkill() {
  const g = skGachaInfo(c.life.skg || 0), ten = Math.round(g.cost * 10 * SKILL_GACHA.ten);
  const n = c.gold >= ten * 1.2 ? 10 : 1, cost = n === 10 ? ten : g.cost; if (c.gold < cost) return false;
  c.gold -= cost; spent.skill += cost; const sk = c.life.sk ||= {};
  for (let k = 0; k < n; k++) {
    const s = rollSkill(skGachaInfo(c.life.skg || 0).lv); c.life.skg = (c.life.skg || 0) + 1;
    if ((sk[s.id] || 0) >= SK_NEED[SK_NEED.length - 1]) { const b = Math.round(g.cost * SKILL_GACHA.back); c.gold += b; spent.skill -= b; continue; }
    sk[s.id] = (sk[s.id] || 0) + 1;
  }
  return true;
}
function shop() {
  for (let guard = 0; guard < 400; guard++) {
    const tot = spent.gacha + spent.enh + spent.skill + 1;
    // 비율이 가장 모자란 것부터. 20레벨 전엔 스킬 안 뽑음
    const order = Object.keys(want).filter(k => k !== 'skill' || c.lv >= 15).sort((a, b) => spent[a] / tot - want[a] - (spent[b] / tot - want[b]));
    let did = false; for (const k of order) { if ((k === 'gacha' ? doGacha : k === 'enh' ? doEnh : doSkill)()) { did = true; break; } }
    if (!did) break;
  }
}

// 사냥
let t = 0, at = 1e12, fi = -1, deaths = 0, kills = 0, bosses = 0;
const lvAt = { 1: 0 }, snap = {}, perLv = {};
const POT_KEEP = { s: 40, l: 20, xl: 10 };
c.pots = { s: 5, l: 0, xl: 0 };
function buyPots() { for (const k of ['s', 'l', 'xl']) { const need = Math.min(POT_KEEP[k] - (c.pots[k] || 0), Math.floor(Math.max(0, c.gold) / POTS[k].price)); if (need > 0) { const p = need * POTS[k].price; c.gold -= p; spent.pot += p; c.pots[k] += need; } } }
function snapshot() {
  const D = derive(c), w = c.equip[cls];
  return { h: +(t / 3600).toFixed(1), field: FIELDS[fi].id, wpn: `${w.st}${w.g[0]}+${c.enh[cls] || 0}`, arm: ARM.map(s => c.equip[s] ? `${c.equip[s].st}${c.equip[s].g[0]}+${c.enh[s] || 0}` : '-').join(' '),
    gG: gachaInfo(c.gacha?.w || 0).lv + '/' + gachaInfo(c.gacha?.a || 0).lv,
    sk: SKILLS.filter(s => s.cls === cls).map(s => G.skLv(c.life.sk?.[s.id] || 0)).join(''), dps: Math.round(raidDps(D)), hp: D.maxHp, gold: Math.round(c.gold) };
}
let lastShop = 0, lvStart = 0, lvDeaths = 0;
const MIX = (process.argv[5] || 'hunt') === 'mix';
const src = { hunt: 0, raid: 0, life: 0, npc: 0 }, gsrc = { hunt: 0, raid: 0, life: 0, npc: 0, daily: 0 };
function lvCheck(lv0) {
  if (c.lv === lv0) return;
  setStats(); c.hp = derive(c).maxHp;
  for (let L = lv0 + 1; L <= c.lv; L++) { lvAt[L] = t; perLv[L - 1] = { h: +((t - lvStart) / 3600).toFixed(2), d: lvDeaths }; lvStart = t; lvDeaths = 0; if (L % 10 === 0 || L === 55 || L === 85) snap[L] = snapshot(); }
}
function give(k, exp, gold) { const lv0 = c.lv, D = derive(c); exp = Math.round(exp * (1 + (D.expB || 0) / 100)); gold = Math.round(gold * (1 + (D.goldB || 0) / 100)); src[k] = (src[k] || 0) + exp; gsrc[k] += gold; c.gold += gold; earned += gold; G.addExp(c, exp); lvCheck(lv0); }
// 복합: 1시간 = 사냥 36분 → 생활 15분 → 레이드 2번(모집 대기 포함 9분). 주민 임무 1시간에 1개, 하루(=4시간 플레이) 의뢰 4개, 20시간마다 도장 상자
let playH = 0;
while (c.lv < TARGET && t < 600 * 3600) {
  const nf = pickField(c.lv);
  if (nf !== fi || !c.hunt) { fi = nf; buyPots(); c.hp = derive(c).maxHp; H.startHunt(c, fi, at); }
  at += 30000; t += 30;
  const lv0 = c.lv, g0 = c.gold, e0 = c.exp;
  const o = H.settle(c, at);
  kills += o.kills; bosses += o.bosses.length; earned += Math.max(0, c.gold - g0); gsrc.hunt += Math.max(0, c.gold - g0); src.hunt += o.exp || 0;
  if (o.died) { deaths++; lvDeaths++; buyPots(); c.hp = derive(c).maxHp; H.startHunt(c, fi, at); }
  lvCheck(lv0);
  if (t - lastShop >= 600) { lastShop = t; buyPots(); shop(); }
  if (MIX && t % 3600 === 36 * 60) {
    // 생활 15분 (낚시·텃밭·채집·알바): 자동 생활 1시간 경험치 × 0.25, 골드도 생활 1시간 어림값 × 0.25
    give('life', G.lifeExpHour(c.lv) * .25, ((1500 * c.lv + 8000) * .3 + 1100) * .25);
    // 레이드 2번: 10레벨 이상 10명 참가 가정 (인원 보너스 +27%), 기여도 보통(×1)
    if (c.lv >= 10) for (let r = 0; r < 2; r++) { const RW = G.raidReward(c.lv), m = G.raidCrowd(10); give('raid', RW.exp * m, RW.gold * m); }
    // 주민 임무 1개
    give('npc', G.npcExp(c.lv), G.npcGold(c.lv));
    playH++;
    if (playH % 4 === 0) { const g = 4 * G.dailyGold(c.lv); c.gold += g; earned += g; gsrc.daily += g; }
    if (playH % 20 === 0) { const g = G.weekBox(c.lv).gold; c.gold += g; earned += g; gsrc.daily += g; }
    t += 24 * 60; at += 24 * 60e3; buyPots(); shop(); c.hp = derive(c).maxHp; H.startHunt(c, fi, at);
  }
}
const band = {}; for (let L = 1; L < c.lv; L++) { const b = Math.floor(L / 10) * 10; band[b] = +((band[b] || 0) + perLv[L].h).toFixed(1); }
const deathsBand = {}; for (let L = 1; L < c.lv; L++) { const b = Math.floor(L / 10) * 10; deathsBand[b] = (deathsBand[b] || 0) + perLv[L].d; }
console.log(JSON.stringify({ cls, run: RUN, mode: MIX ? 'mix' : 'hunt', src, gsrc, lv: c.lv, hours: +(t / 3600).toFixed(1), band, deathsBand, kills, bosses, deaths,
  earned: Math.round(earned), dis: Math.round(dis), spent: Object.fromEntries(Object.entries(spent).map(([k, v]) => [k, Math.round(v)])),
  lvAt: Object.fromEntries([10, 20, 30, 40, 50, 55, 60, 70, 80, 85, 90, 100].filter(L => lvAt[L] != null).map(L => [L, +(lvAt[L] / 3600).toFixed(1)])),
  perLv: Object.fromEntries([5, 15, 25, 35, 45, 54, 56, 60, 65, 69, 71, 75, 80, 84, 86, 90, 95, 99].filter(L => perLv[L]).map(L => [L, perLv[L].h])), snap }));
