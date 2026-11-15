// 자동 사냥 계산 (기획서 4장). 화면의 전투는 보여 주기용이고, 실제 결과는 여기서 정해짐.
// 흐른 시간만큼 몬스터를 한 마리씩 잡는 과정을 빠르게 흉내 냄.
import { FIELDS, MONS, HUNT, POTS, BAG_MAX, FAR, derive, expPenalty, addExp, rollDrop, pick, itemName, biteDmg } from '../../assets/js/game-rules.js';

const MAX_STEPS = 300000;   // 한 번 계산할 때 최대 반복 (안전장치)

// 몬스터 한 마리와 싸우기. 체력·물약은 st에 바로 반영. 쓰러지면 dead=true
function fight(st, D, mon, boss) {
  let t = boss ? 0 : (1 + Math.random()) / D.spd * (D.far ? FAR.walk : 1);  // 다음 몬스터까지 걸어가는 시간 (민첩이 높으면 빠름, 원거리는 멀리서 쏘니 덜 걸음)
  let hp = mon.hp, nextHit = .4, nextBite = 1.2 + (D.far ? FAR.lead : 0), steps = 0, healed = 0;   // 원거리: 몬스터가 다가오는 동안 먼저 공격
  const bite = boss ? 1.3 : 1.6, regen = D.maxHp * HUNT.huntRegen;
  const heal = () => { st.hp = Math.min(D.maxHp, st.hp + (t - healed) * regen); healed = t; };   // 사냥 중에도 체력이 천천히 참
  while (hp > 0 && steps++ < 20000) {
    if (nextHit <= nextBite) {
      t += nextHit; nextBite -= nextHit; nextHit = D.gap;
      let dmg = D.hit * (.9 + Math.random() * .2);   // 지팡이는 마력, 나머지는 공격력
      if (Math.random() * 100 < D.sp) dmg *= D.spMul;
      if (Math.random() * 100 < D.crit) dmg *= 1.5;
      hp -= Math.max(1, Math.round(dmg));
    } else {
      t += nextBite; nextHit -= nextBite; nextBite = bite; heal();
      if (Math.random() * 100 >= D.eva) st.hp -= biteDmg(mon, D);   // 물리/마법 방어력
      if (st.hp <= D.maxHp * st.potAt / 100) drink(st, D);
      if (st.hp <= 0) return { t, dead: true };
    }
  }
  heal();
  return { t, dead: hp > 0 };
}
function drink(st, D) {
  const p = st.pots, miss = D.maxHp - st.hp;
  const k = miss >= 200 && p.l ? 'l' : p.s ? 's' : p.l ? 'l' : p.xl ? 'xl' : null;
  if (!k) return;
  p[k]--; st.used++; st.hp = Math.min(D.maxHp, st.hp + POTS[k].heal(D.maxHp));
}

// 사냥 시작
export function startHunt(c, fi, at) {
  c.hunt = { f: fi, start: at, last: at, t: 0, boss: HUNT.bossEvery, kills: 0, exp: 0, gold: 0, pots: 0, drops: 0, sold: 0, bosses: 0, best: [] };
}

// 마지막 정산 뒤 흐른 시간만큼 계산. 결과(이번에 늘어난 것)를 돌려줌
export function settle(c, at) {
  const h = c.hunt; if (!h) return null;
  const gap = Math.max(0, (at - h.last) / 1000);
  const online = Math.min(gap, HUNT.onlineGap), offline = Math.min(gap - online, HUNT.offlineMax);
  // 화면을 닫은 시간은 70% 효율, 최대 8시간. debt: 지난번에 미리 당겨 쓴 시간 (자주 불러도 빨라지지 않게)
  let sec = online + offline * HUNT.offlineEff - (h.debt || 0);
  h.last = at;
  const f = FIELDS[h.f], out = { sec: gap, offline, kills: 0, exp: 0, gold: 0, drops: [], sold: 0, up: 0, pots: 0, bosses: [], bossSkip: [], died: false };
  let D = derive(c);
  const st = { hp: Math.min(c.hp, D.maxHp), pots: c.pots, potAt: c.potAt, used: 0 };
  let steps = 0;
  while (sec > 0 && steps++ < MAX_STEPS) {
    const lv0 = c.lv, isBoss = h.t >= h.boss;
    if (isBoss) {
      h.boss += HUNT.bossEvery;
      // 보스: 이길 수 있을 때만 싸움 (질 것 같으면 피해서 손해 없음)
      const test = { hp: st.hp, pots: { ...st.pots }, potAt: st.potAt, used: 0 }, r = fight(test, D, f.boss, true);
      if (r.dead) { out.bossSkip.push(f.boss.n); continue; }
      Object.assign(st, { hp: test.hp, pots: test.pots, used: st.used + test.used }); c.pots = st.pots;
      sec -= r.t; h.t += r.t;
      reward(c, h, out, f, f.boss, D, true);
      out.bosses.push(f.boss.n);
    } else {
      const mon = MONS[pick(f.mons)], r = fight(st, D, mon, false);
      sec -= r.t; h.t += r.t;
      if (r.dead) { out.died = true; break; }
      reward(c, h, out, f, mon, D, false);
    }
    if (c.lv !== lv0) { D = derive(c); st.hp = D.maxHp; }   // 레벨업하면 체력 가득
  }
  h.debt = sec < 0 ? -sec : 0;
  c.hp = Math.max(0, Math.round(st.hp)); out.pots = st.used; h.pots += st.used;
  if (out.died) {
    const lost = Math.floor(h.gold * HUNT.deathLoss);
    c.gold = Math.max(0, c.gold - lost); out.lost = lost; out.summary = summary(h, at);
    c.hunt = null; c.hp = Math.round(derive(c).maxHp * .3); c.hpAt = at;
  }
  return out;
}
function reward(c, h, out, f, mon, D, boss) {
  const e = Math.max(1, Math.round(mon.exp * expPenalty(c.lv, mon.lv)));
  const g = Math.max(1, Math.round(mon.gold * (1 + D.goldB / 100) * (.8 + Math.random() * .4)));
  out.up += addExp(c, e);
  c.gold += g; out.kills++; out.exp += e; out.gold += g; h.kills++; h.exp += e; h.gold += g;
  if (boss) h.bosses++;
  const it = rollDrop(f.tier, D.dropB, boss);
  if (!it) return;
  h.drops++;
  if (c.bag.length >= BAG_MAX) { const s = Math.round(it.price * .3); c.gold += s; out.sold += s; h.sold += s; out.gold += s; h.gold += s; return; }   // 가방이 가득 차면 자동으로 팔기
  c.bag.push(it); out.drops.push(it);
  if (['rare', 'epic', 'legend'].includes(it.grade)) { h.best.push({ g: it.grade, n: itemName(it) }); h.best = h.best.slice(-10); }
}
export function summary(h, at) {
  return { f: h.f, sec: Math.round((at - h.start) / 1000), kills: h.kills, exp: h.exp, gold: h.gold, pots: h.pots, drops: h.drops, sold: h.sold, bosses: h.bosses, best: h.best };
}
