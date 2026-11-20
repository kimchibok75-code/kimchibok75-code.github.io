// 자동 사냥 계산 (기획서 4장). 화면의 전투는 보여 주기용이고, 실제 결과는 여기서 정해짐.
// 흐른 시간만큼 몬스터를 한 마리씩 잡는 과정을 빠르게 흉내 냄.
import { CHAIN, FIELDS, MONS, HUNT, POTS, FAR, derive, expPenalty, addExp, pick, biteDmg, cntAdd, gimOf, gimDmg, potPick, offlineLife, OFF_XP } from '../../assets/js/game-rules.js';

const MAX_STEPS = 300000;   // 한 번 계산할 때 최대 반복 (안전장치)

// 몬스터 한 마리와 싸우기. 체력·물약은 st에 바로 반영. 쓰러지면 dead=true
// 스킬: 쿨타임(st.cd)은 몬스터 사이를 걸을 때도 줄어듦. 다 차면 싸우는 중에 바로 씀 (마나 없음)
function fight(st, D, mon, boss) {
  let t = boss ? 0 : (1 + Math.random()) / D.spd * (D.far ? FAR.walk : 1) * (D.walkM || 1);  // 다음 몬스터까지 걸어가는 시간 (민첩이 높으면 빠름, 원거리는 멀리서 쏘니 덜 걸음)
  let hp = mon.hp, nextHit = .4, nextBite = 1.2 + (D.far ? FAR.lead : 0), steps = 0, healed = 0;   // 원거리: 몬스터가 다가오는 동안 먼저 공격
  const bite = boss ? 1.3 : 1.6, regen = D.maxHp * D.regen, sk = D.skills || [];
  const gm = gimOf(mon, boss);   // 기믹: 쿨타임마다 큰 공격 (첫 번째는 조금 뒤에)
  let nextGim = gm ? (D.far ? FAR.lead : 0) + 1.5 + Math.random() * gm.cd * .6 : Infinity;
  const cd = st.cd ||= {};
  const tick = dt => { for (const k of sk) cd[k.s.id] = (cd[k.s.id] || 0) - dt; if (st.bt > 0) st.bt -= dt; };
  tick(t);
  if (!boss && st.pre > 0) hp -= Math.min(st.pre, mon.hp);   // 2026-11-20 검사 다수 타격: 앞 싸움에서 주변 몬스터가 이미 맞은 피해
  st.pre = 0;
  const heal = () => { st.hp = Math.min(D.maxHp, st.hp + (t - healed) * regen); healed = t; };   // 사냥 중에도 체력이 천천히 참
  const roll = (m = 1, side) => {   // 피해 한 번 (스킬은 m 배). side: 번개 사슬이 옆 몬스터로 튐 → 다음 몬스터에 미리 들어감
    let dmg = D.hit * m * (.9 + Math.random() * .2) * (1 + (st.bt > 0 ? st.batk : 0) / 100);
    if (m === 1 && Math.random() * 100 < D.sp) dmg *= D.spMul;
    if (Math.random() * 100 < D.crit + (st.bt > 0 ? st.bcrit : 0)) dmg *= D.critM;
    if (boss) dmg *= 1 + D.bossP / 100;
    dmg = Math.max(1, Math.round(dmg));
    if (side) { st.pre = (st.pre || 0) + dmg * CHAIN.k; return; }
    hp -= dmg;
    if (!boss && D.cleave) st.pre = (st.pre || 0) + dmg * (m === 1 ? D.cleave : D.cleaveSk);   // 주변 몬스터도 같이 맞음
    else if (!boss && D.pierce) st.pre = (st.pre || 0) + dmg * D.pierce;   // 궁수: 화살이 뒤 몬스터까지 뚫음
    if (D.steal) st.hp = Math.min(D.maxHp, st.hp + dmg * D.steal / 100);   // 흡혈
  };
  while (hp > 0 && steps++ < 20000) {
    // 쿨타임이 다 찬 스킬이 있으면 먼저 씀
    let ready = null; for (const k of sk) if ((cd[k.s.id] || 0) <= 0 && (!ready || k.p.cd > ready.p.cd)) ready = k;
    if (ready) {
      const { s: S, p: P } = ready; cd[S.id] = P.cd; st.casts = (st.casts || 0) + 1;
      if (S.k === 'hit') { for (let i = 0; i < P.n; i++) { if (P.chain && i > 0 && !boss) roll(P.m, true); else if (hp > 0) roll(P.m); } if (P.dot && hp > 0) hp -= Math.round(D.hit * P.dot); if (P.stun) { nextBite += P.stun; nextGim += P.stun; } }
      else if (S.k === 'heal') { heal(); st.hp = Math.min(D.maxHp, st.hp + D.maxHp * P.v / 100); }
      else if (S.k === 'shield') st.sh = Math.max(st.sh || 0, P.sh);
      else { st.bt = P.dur; st.batk = P.atk; st.bcrit = P.crit; }
      continue;
    }
    let nextSk = Infinity; for (const k of sk) nextSk = Math.min(nextSk, cd[k.s.id]);
    if (nextSk < nextHit && nextSk < nextBite && nextSk < nextGim) { t += nextSk; nextHit -= nextSk; nextBite -= nextSk; nextGim -= nextSk; tick(nextSk); continue; }
    if (nextGim < nextHit && nextGim <= nextBite) {   // 기믹 큰 공격 (막기·회피는 보통 공격과 같음)
      const dt = nextGim; t += dt; nextHit -= dt; nextBite = bite; nextGim = gm.cd; tick(dt); heal();
      if (st.sh > 0) { st.sh--; continue; }
      if (Math.random() * 100 >= D.eva) { st.hp -= gimDmg(mon, D, gm); if (gm.slow) nextHit += gm.slow; }   // 거미줄·점액: 맞으면 내 공격이 늦어짐
      if (st.hp <= D.maxHp * st.potAt / 100) drink(st, D);
      if (st.hp <= D.maxHp * st.potAt / 100) drink(st, D);   // 크게 맞으면 한 번 더 마실 수 있음
      if (st.hp <= 0) return { t, dead: true };
      continue;
    }
    if (nextHit <= nextBite) {
      const dt = nextHit; t += dt; nextBite -= dt; nextGim -= dt; nextHit = D.gap; tick(dt);
      roll(1);   // 지팡이는 마력, 나머지는 공격력
    } else {
      const dt = nextBite; t += dt; nextHit -= dt; nextGim -= dt; nextBite = bite; tick(dt); heal();
      // 원거리(궁수·마법사): 거리를 유지하며 싸움 → 몬스터가 다시 붙을 때까지 한 번 더 쏠 시간이 생김
      if (D.far && Math.random() < Math.min(FAR.kiteMax, FAR.kite + D.dex * .0008)) nextBite += FAR.back;
      if (st.sh > 0) { st.sh--; continue; }   // 방패·구르기·보호막
      if (Math.random() * 100 >= D.eva) st.hp -= biteDmg(mon, D);   // 물리/마법 방어력
      if (st.hp <= D.maxHp * st.potAt / 100) drink(st, D);
      if (st.hp <= 0) return { t, dead: true };
    }
  }
  heal();
  return { t, dead: hp > 0 };
}
function drink(st, D) {
  const p = st.pots, k = potPick(p, D.maxHp, st.hp);   // 화면(usePotion)과 같은 규칙
  if (!k) return;
  p[k]--; st.used++; st.hp = Math.min(D.maxHp, st.hp + POTS[k].heal(D.maxHp) * (1 + D.potP / 100));
}

// 사냥 시작
export function startHunt(c, fi, at) {
  c.hunt = { f: fi, start: at, last: at, t: 0, boss: HUNT.bossEvery, kills: 0, exp: 0, gold: 0, pots: 0, drops: 0, sold: 0, bosses: 0, best: [] };
}

// 마지막 정산 뒤 흐른 시간만큼 계산. 결과(이번에 늘어난 것)를 돌려줌
export function settle(c, at, onGap = HUNT.onlineGap) {   // onGap: 100%로 쳐 주는 시간 (화면 보호기 중이면 더 김)
  const h = c.hunt; if (!h) return null;
  const gap = Math.max(0, (at - h.last) / 1000);
  const online = Math.min(gap, onGap), offline = Math.min(gap - online, HUNT.offlineMax);
  // 화면을 닫은 시간은 50% 효율(경험치만 10%), 최대 4시간. 그중 절반(offlineHunt)은 사냥, 나머지는 마을 일(offlineLife: 생활 경험치·골드·자원)
  // debt: 지난번에 미리 당겨 쓴 시간 (자주 불러도 빨라지지 않게)
  const offEff = offline * HUNT.offlineEff;
  let sec = online + offEff * HUNT.offlineHunt - (h.debt || 0), offLeft = offEff * HUNT.offlineHunt;   // offLeft: 화면을 닫은 몫을 먼저 계산 (그동안 경험치는 OFF_XP배)
  h.last = at;
  const f = FIELDS[h.f], out = { sec: gap, offline, kills: 0, exp: 0, gold: 0, drops: [], sold: 0, up: 0, pots: 0, bosses: [], bossSkip: [], died: false };
  let D = derive(c);
  const st = { hp: Math.min(c.hp, D.maxHp), pots: c.pots, potAt: c.potAt, used: 0, cd: h.cd || {}, sh: 0, bt: 0 };
  let steps = 0;
  while (sec > 0 && steps++ < MAX_STEPS) {
    const lv0 = c.lv, isBoss = h.t >= h.boss;
    if (isBoss) {
      h.boss += HUNT.bossEvery;
      // 보스: 이길 수 있을 때만 싸움 (질 것 같으면 피해서 손해 없음)
      const test = { ...st, pots: { ...st.pots }, cd: { ...st.cd }, used: 0 }, r = fight(test, D, f.boss, true);
      if (r.dead) { out.bossSkip.push(f.boss.n); continue; }
      Object.assign(st, { ...test, used: st.used + test.used }); c.pots = st.pots;
      sec -= r.t; h.t += r.t;
      reward(c, h, out, f, f.boss, D, true, offLeft > 0 ? OFF_XP() : 1); offLeft -= r.t;
      out.bosses.push(f.boss.n);
    } else {
      const mon = MONS[pick(f.mons)], r = fight(st, D, mon, false);
      sec -= r.t; h.t += r.t;
      if (r.dead) { out.died = true; break; }
      reward(c, h, out, f, mon, D, false, offLeft > 0 ? OFF_XP() : 1); offLeft -= r.t;
    }
    if (c.lv !== lv0) { D = derive(c); st.hp = D.maxHp; }   // 레벨업하면 체력 가득
  }
  h.debt = sec < 0 ? -sec : 0; h.cd = Object.fromEntries(Object.entries(st.cd).map(([k, v]) => [k, Math.max(0, +v.toFixed(2))]));
  c.hp = Math.max(0, Math.round(st.hp)); out.pots = st.used; h.pots += st.used;
  cntAdd(c, 'kills', out.kills); if (out.bosses.length) cntAdd(c, 'boss', out.bosses.length);
  if (offline >= 60 && !out.died) out.life = offlineLife(c, offEff * (1 - HUNT.offlineHunt));
  if (out.died) {
    cntAdd(c, 'died');
    const lost = Math.floor(h.gold * HUNT.deathLoss);
    c.gold = Math.max(0, c.gold - lost); out.lost = lost; out.summary = summary(h, at);
    c.hunt = null; c.hp = Math.round(derive(c).maxHp * .3); c.hpAt = at;
  }
  return out;
}
function reward(c, h, out, f, mon, D, boss, xm = 1) {
  const e = Math.max(1, Math.round(mon.exp * expPenalty(c.lv, mon.lv) * (1 + D.expB / 100) * xm));
  const g = Math.max(1, Math.round(mon.gold * HUNT.goldMul * (1 + D.goldB / 100) * (.8 + Math.random() * .4)));
  out.up += addExp(c, e);
  c.gold += g; out.kills++; out.exp += e; out.gold += g; h.kills++; h.exp += e; h.gold += g;
  if (boss) h.bosses++;
}
export function summary(h, at) {
  return { f: h.f, sec: Math.round((at - h.start) / 1000), kills: h.kills, exp: h.exp, gold: h.gold, pots: h.pots, drops: h.drops, sold: h.sold, bosses: h.bosses, best: h.best };
}
