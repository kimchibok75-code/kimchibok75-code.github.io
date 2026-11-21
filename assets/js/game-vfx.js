// 치복 타운 스킬 이펙트 (2026-11-21, 사용자 요청: 모든 스킬 이펙트를 더 화려하고 진짜 게임 이펙트처럼)
// 사냥터·레이드가 같이 씀. 위치는 월드 좌표 → 각 장면의 카메라 변환 안에서 vfxDraw(ctx)
// 빛은 미리 그려 둔 부드러운 빛 점(glow)을 'lighter'(더하기)로 겹쳐 그림 → 화려하지만 가벼움 (shadowBlur·filter 안 씀)
// vfxCast(스킬 id, {x, y: 발, tx, ty: 목표, dir}) : 쓰는 순간 / vfxHit(스킬 id, {x, y: 손, tx, ty, i: 몇 번째 타격, px, py: 앞 목표}) : 맞는 순간
const PHONE = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const MAXP = PHONE ? 240 : 520, MAXS = PHONE ? 50 : 110;
const P = [], S = [], Q = [];   // P = 알갱이, S = 모양(고리·줄기·번개·마법진…), Q = 시간 예약
let last = 0, T0 = 0;
const rnd = (a, b) => a + Math.random() * (b - a);
const GL = new Map();
function glow(c) {   // 가운데가 하얗고 바깥으로 그 색 → 투명. 색마다 한 번만 만듦
  let g = GL.get(c); if (g) return g;
  g = document.createElement('canvas'); g.width = g.height = 64; const x = g.getContext('2d'), r = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.22, c); r.addColorStop(.55, c + '55'); r.addColorStop(1, c + '00'); x.fillStyle = r; x.fillRect(0, 0, 64, 64); GL.set(c, g); return g;
}
const part = o => { if (P.length < MAXP) P.push({ t: 0, life: .6, vx: 0, vy: 0, g: 0, drag: 2.2, s: 6, c: '#ffffff', ...o }); };
const shape = o => { if (S.length < MAXS) S.push({ t: 0, life: .5, ...o }); };
const later = (t, f) => Q.push({ t, f });
function burst(x, y, c, n, sp, o = {}) {
  if (PHONE) n = Math.ceil(n * .6);
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = sp * rnd(.3, 1); part({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .75, c, life: rnd(.3, .7), s: rnd(3, 8), ...o }); }
}
const ring = (x, y, c, r0, r1, life = .45, w = 8, sy = .55) => shape({ k: 'ring', x, y, c, r0, r1, life, w, sy });
const flash = (x, y, c, r, life = .25) => shape({ k: 'flash', x, y, c, r, life });
const streak = (x0, y0, x1, y1, c, w = 10, life = .3, grow = .25) => shape({ k: 'streak', x0, y0, x1, y1, c, w, life, grow });
const bolt = (x0, y0, x1, y1, c, life = .3, w = 5) => shape({ k: 'bolt', x0, y0, x1, y1, c, life, w, pts: null, rt: 0 });
const slash = (x, y, r, a, c, life = .28, span = 1.4, flip = 1) => shape({ k: 'slash', x, y, r, a, c, life, span, flip });
const circle = (x, y, r, c, life = .8, sy = .5) => shape({ k: 'circle', x, y, r, c, life, sy, rot: Math.random() * 6 });
const pillar = (x, y, w, h, c, life = .7) => shape({ k: 'pillar', x, y, w, h, c, life });
function crack(x, y, r, c, n = 8, life = 1) {
  const lines = []; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + rnd(-.25, .25), L = r * rnd(.55, 1); let px = 0, py = 0; const pts = [[0, 0]]; for (let k = 1; k <= 5; k++) { const d = L * k / 5, b = a + rnd(-.35, .35); px = Math.cos(b) * d; py = Math.sin(b) * d * .5; pts.push([px, py]); } lines.push(pts); }
  shape({ k: 'crack', x, y, c, life, lines });
}
// 날아가는 것 (불덩이·얼음 창·화살·운석): 머리 빛 + 꼬리 알갱이, 도착하면 hit()
function proj(o) { shape({ k: 'proj', life: o.dur + .02, arc: 0, size: 14, trail: 2, tc: o.c, ...o }); }

// ───── 쓰는 순간 ─────
export function vfxCast(id, o) {
  const { x, y } = o, tx = o.tx ?? x, ty = o.ty ?? y - 22, hy = y - 24;
  switch (id) {
    case 's_bash': {   // 돌진 베기: 지나간 길에 빛 줄기 + 먼지
      streak(x, hy, tx, ty, '#ffe08a', 16, .32, .15); streak(x, hy, tx, ty, '#ffffff', 5, .22, .15);
      for (let k = 0; k < 8; k++) { const f = k / 8; part({ x: x + (tx - x) * f, y: y + (ty + 22 - y) * f, vx: rnd(-40, 40), vy: rnd(-60, -10), c: '#e8d7b0', s: rnd(5, 9), life: rnd(.3, .5) }); }
      break;
    }
    case 's_whirl':   // 회오리 베기: 몸 둘레를 도는 빛 고리 3개 + 바람
      shape({ k: 'spin', x, y: y - 16, r: 62, c: '#ffe7a0', n: 3, life: .55, sp: 16 }); ring(x, y - 4, '#fff3c4', 20, 90, .5, 7);
      for (let k = 0; k < 18; k++) { const a = Math.random() * 6.283, r = rnd(30, 70); part({ x: x + Math.cos(a) * r, y: y - 16 + Math.sin(a) * r * .55, vx: -Math.sin(a) * 260, vy: Math.cos(a) * 140, c: '#fff8dc', s: rnd(3, 6), life: rnd(.25, .45), drag: 4 }); }
      break;
    case 's_guard':   // 철벽 방패: 금빛 육각 방패 + 빛 기둥
      shape({ k: 'hex', x, y: y - 26, r: 44, c: '#ffd35a', life: .7 }); pillar(x, y, 60, 150, '#ffd35a', .55); ring(x, y, '#ffe9a0', 18, 70, .45, 6); flash(x, y - 26, '#ffe9a0', 70, .3);
      break;
    case 's_roar':   // 전투 함성: 붉은 충격파 세 겹 + 솟구치는 불꽃
      for (let k = 0; k < 3; k++) later(k * .12, () => ring(x, y - 10, k ? '#ff7a3a' : '#ffd0a0', 20, 150 + k * 30, .5, 10 - k * 2));
      flash(x, y - 30, '#ff5a3a', 90, .35);
      for (let k = 0; k < 26; k++) part({ x: x + rnd(-26, 26), y: y - rnd(0, 20), vx: rnd(-50, 50), vy: rnd(-320, -140), g: 260, c: k % 3 ? '#ff6a3a' : '#ffd35a', s: rnd(4, 8), life: rnd(.45, .8), drag: 1.5 });
      break;
    case 's_will': {   // 검기 날리기: 손에서 시작하는 큰 초승달 + 날아가는 길을 따라 빛 가루
      const a = Math.atan2(ty - hy, tx - x); slash(x + Math.cos(a) * 20, hy + Math.sin(a) * 20, 46, a, '#fff3c4', .3, 1.5);
      shape({ k: 'emit', x0: x, y0: hy, a, sp: o.sp || 900, life: o.life || .5, c: '#ffe8a0' }); flash(x, hy, '#fff3c4', 60, .25);
      break;
    }
    case 'b_roll':   // 뒤로 구르기: 먼지 + 잔상 줄기
      for (let k = 0; k < 16; k++) part({ x: x + rnd(-20, 20), y: y - rnd(0, 8), vx: rnd(-150, 150), vy: rnd(-90, -10), g: 200, c: '#d9d2c4', s: rnd(5, 10), life: rnd(.35, .6) });
      streak(x - (o.dir || 1) * 50, y - 20, x, y - 20, '#e7eef5', 14, .3, 0);
      break;
    case 'b_eye':   // 매의 눈: 목표에 금빛 조준선 + 머리에 번쩍
      shape({ k: 'reticle', x: tx, y: ty, r: 30, c: '#ffd35a', life: .8 }); flash(x, y - 48, '#ffe28a', 50, .35);
      for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283; part({ x: x + Math.cos(a) * 40, y: y - 40 + Math.sin(a) * 40, vx: -Math.cos(a) * 120, vy: -Math.sin(a) * 120, c: '#ffe28a', s: 4, life: .35, drag: 0 }); }
      break;
    case 'b_pierce':   // 관통 화살: 활에 빛이 모임
      for (let k = 0; k < 16; k++) { const a = Math.random() * 6.283, r = rnd(30, 60); part({ x: x + Math.cos(a) * r, y: hy + Math.sin(a) * r, vx: -Math.cos(a) * r * 4, vy: -Math.sin(a) * r * 4, c: '#9fe8ff', s: rnd(3, 6), life: .25, drag: 0 }); }
      flash(x, hy, '#bff0ff', 50, .3);
      break;
    case 'b_rain':   // 화살비: 목표 위 하늘에 파란 마법진
      circle(tx, ty - 120, 70, '#7fd0ff', 1.1, .35); flash(tx, ty - 120, '#9fdcff', 80, .4);
      break;
    case 'm_fire': case 'm_ice': case 'm_bolt':   // 마법사 공통: 발밑 마법진
      circle(x, y, 34, { m_fire: '#ff8a3a', m_ice: '#8fe0ff', m_bolt: '#c9a8ff' }[id], .55);
      break;
    case 'm_shield':   // 마법 보호막: 발밑 큰 마법진 + 파란 육각 방패 + 떠오르는 빛
      circle(x, y, 50, '#7fc8ff', .9); shape({ k: 'hex', x, y: y - 26, r: 46, c: '#7fc8ff', life: .8 }); flash(x, y - 26, '#bfe4ff', 70, .3);
      for (let k = 0; k < 14; k++) part({ x: x + rnd(-40, 40), y: y - rnd(0, 10), vx: 0, vy: rnd(-120, -50), c: '#bfe4ff', s: rnd(3, 6), life: rnd(.5, .9), drag: .5 });
      break;
    case 'm_heal':   // 치유의 빛: 하늘에서 빛 기둥 + 초록·금빛 가루가 솟아오름
      pillar(x, y, 80, 260, '#a8ffb8', .9); pillar(x, y, 30, 260, '#ffffff', .6); ring(x, y, '#8af0a0', 16, 80, .6, 6); circle(x, y, 40, '#8af0a0', .9);
      for (let k = 0; k < 30; k++) part({ x: x + rnd(-34, 34), y: y - rnd(0, 30), vx: rnd(-20, 20), vy: rnd(-200, -70), c: k % 3 ? '#8af0a0' : '#fff2a8', s: rnd(3, 7), life: rnd(.6, 1.1), drag: .6 });
      break;
    case 'm_meteor': {   // 메테오: 목표 바닥에 붉은 마법진 → 왼쪽 위에서 운석이 불꼬리를 끌며 떨어짐 (맞는 순간 vfxHit에서 폭발)
      circle(tx, ty + 18, 70, '#ff7a3a', .95); circle(tx, ty + 18, 44, '#ffd35a', .95);
      proj({ x0: tx - 190, y0: ty - 420, x1: tx, y1: ty, dur: o.dur ?? .35, c: '#ff8a3a', size: 34, trail: 5, tc: '#ffb35a', fire: 1 });
      break;
    }
  }
}

// ───── 맞는 순간 ─────
export function vfxHit(id, o) {
  const { x, y, tx, ty } = o, i = o.i || 0, a = Math.atan2(ty - y, tx - x), d = Math.hypot(tx - x, ty - y), dur = o.dur ?? Math.min(.35, d / 620);
  const sparks = (c, n = 14, sp = 260) => burst(tx, ty, c, n, sp);
  switch (id) {
    case 's_bash':   // X자 두 번 베기 + 번쩍
      slash(tx, ty, 34, -.8, '#fff3c4', .25, 1.2); later(.05, () => slash(tx, ty, 34, .8 + Math.PI, '#ffd35a', .25, 1.2, -1));
      flash(tx, ty, '#ffe08a', 70, .22); ring(tx, ty + 14, '#fff3c4', 10, 60, .35, 6); sparks('#ffe9a0', 18, 320);
      break;
    case 's_whirl': slash(tx, ty, 30, rnd(0, 6.28), i % 2 ? '#ffd35a' : '#fff3c4', .22, 1.3, i % 2 ? -1 : 1); sparks('#fff3c4', 8, 220); flash(tx, ty, '#fff3c4', 40, .15); break;
    case 's_quake':   // 대지 가르기: 갈라지는 땅(빛나는 금) + 튀는 돌 + 큰 먼지 고리
      if (i) break;
      crack(tx, ty + 18, 120, '#ffae4a', 9, 1.1); flash(tx, ty + 10, '#ff9a3a', 110, .35); ring(tx, ty + 18, '#ffcf8a', 20, 160, .6, 12); ring(tx, ty + 18, '#ffffff', 10, 90, .35, 5);
      for (let k = 0; k < 26; k++) part({ x: tx + rnd(-30, 30), y: ty + 14, vx: rnd(-220, 220), vy: rnd(-420, -160), g: 900, c: k % 2 ? '#c9a06a' : '#ffb35a', s: rnd(4, 9), life: rnd(.5, .9), drag: .4 });
      break;
    case 's_will': slash(tx, ty, 30, a, '#fff3c4', .22, 1.2); sparks('#ffe8a0', 12, 260); flash(tx, ty, '#fff3c4', 50, .18); break;
    case 'b_multi':   // 빛 화살 + 맞으면 하늘색 불꽃
      proj({ x0: x, y0: y, x1: tx, y1: ty, dur, c: '#bfe8ff', size: 10, trail: 2, tc: '#9fdcff', streak: 1, hit: () => { sparks('#bfe8ff', 10, 240); ring(tx, ty, '#dff4ff', 6, 34, .25, 4, 1); } });
      break;
    case 'b_poison':   // 초록 화살 → 독구름이 퍼지고 거품이 올라옴
      proj({ x0: x, y0: y, x1: tx, y1: ty, dur, c: '#9be86a', size: 11, trail: 2, tc: '#7ed957', streak: 1, hit: () => {
        for (let k = 0; k < 7; k++) part({ x: tx + rnd(-20, 20), y: ty + rnd(-10, 10), vx: rnd(-40, 40), vy: rnd(-30, 10), c: '#6fd34a', s: rnd(18, 30), life: rnd(.8, 1.3), drag: 1.5, grow: 1 });
        for (let k = 0; k < 12; k++) part({ x: tx + rnd(-22, 22), y: ty + rnd(-6, 12), vx: rnd(-10, 10), vy: rnd(-90, -30), c: '#c8ff9a', s: rnd(3, 5), life: rnd(.6, 1), drag: .3 });
        flash(tx, ty, '#9be86a', 60, .25); } });
      break;
    case 'b_pierce': {   // 관통 화살: 목표를 뚫고 지나가는 굵은 빛줄기 + 충격 고리 + 나선 빛
      const ex = x + Math.cos(a) * (d + 160), ey = y + Math.sin(a) * (d + 160);
      streak(x, y, ex, ey, '#7fd8ff', 22, .4, .12); streak(x, y, ex, ey, '#ffffff', 7, .3, .12);
      later(.05, () => { ring(tx, ty, '#bff0ff', 8, 70, .4, 8, 1); flash(tx, ty, '#bff0ff', 90, .25); sparks('#bff0ff', 20, 340); });
      for (let k = 0; k < 18; k++) { const f = k / 18, px = x + (ex - x) * f, py = y + (ey - y) * f, n = Math.sin(f * 18) * 10; part({ x: px - Math.sin(a) * n, y: py + Math.cos(a) * n, vx: 0, vy: 0, c: '#9fe8ff', s: rnd(3, 5), life: rnd(.25, .45) }); }
      break;
    }
    case 'b_rain':   // 하늘에서 빛 화살 세 줄기씩 쏟아짐
      for (let k = 0; k < 3; k++) later(k * .04, () => { const ox = rnd(-36, 36); proj({ x0: tx + ox + 40, y0: ty - 260, x1: tx + ox, y1: ty + rnd(-6, 10), dur: .16, c: '#a8e0ff', size: 8, trail: 1, tc: '#7fd0ff', streak: 1, hit: () => { burst(tx + ox, ty, '#bfe8ff', 6, 160); ring(tx + ox, ty + 12, '#dff4ff', 4, 22, .25, 3); } }); });
      break;
    case 'm_fire':   // 불덩이: 불꼬리를 끄는 불덩이 → 폭발
      proj({ x0: x, y0: y, x1: tx, y1: ty, dur, c: '#ff8a3a', size: 20, trail: 3, tc: '#ffb35a', fire: 1, hit: () => {
        flash(tx, ty, '#ff7a2a', 90, .3); ring(tx, ty, '#ffcf8a', 10, 80, .4, 8, 1); burst(tx, ty, '#ff8a3a', 24, 300, { g: -60 }); burst(tx, ty, '#ffe08a', 12, 200);
        for (let k = 0; k < 8; k++) part({ x: tx + rnd(-16, 16), y: ty + rnd(-10, 10), vx: rnd(-30, 30), vy: rnd(-120, -60), c: '#ff6a2a', s: rnd(10, 16), life: rnd(.4, .6), drag: 1, grow: 1 }); } });
      break;
    case 'm_ice':   // 얼음 창: 빛나는 창 → 얼음 조각이 튀고 서리 고리 + 얼음 가시
      proj({ x0: x, y0: y, x1: tx, y1: ty, dur: Math.min(dur, .2), c: '#bff0ff', size: 12, trail: 2, tc: '#8fe0ff', streak: 1, hit: () => {
        flash(tx, ty, '#bff0ff', 80, .3); ring(tx, ty + 14, '#dff8ff', 10, 70, .5, 6); crack(tx, ty + 16, 50, '#9fe8ff', 7, .7);
        for (let k = 0; k < 18; k++) part({ x: tx, y: ty, vx: rnd(-260, 260), vy: rnd(-300, -40), g: 700, c: k % 2 ? '#dff8ff' : '#8fe0ff', s: rnd(3, 6), life: rnd(.4, .7), drag: .5, sq: 1 }); } });
      break;
    case 'm_bolt': {   // 번개 사슬: 굵은 번개 + 번쩍 + 튀는 전기
      const fx = i && o.px != null ? o.px : x, fy = i && o.px != null ? o.py : y;
      bolt(fx, fy, tx, ty, '#c9a8ff', .3, 7); bolt(fx, fy, tx, ty, '#ffffff', .2, 2.5); flash(tx, ty, '#d8c4ff', 70, .2); sparks('#e6d8ff', 10, 300);
      break;
    }
    case 'm_meteor':   // 운석이 떨어진 순간: 큰 폭발 + 충격파 두 겹 + 돌 파편 + 남는 불씨
      if (i) break;
      flash(tx, ty, '#ff9a3a', 170, .45); flash(tx, ty, '#ffffff', 80, .18); ring(tx, ty + 16, '#ffcf8a', 20, 200, .6, 14); later(.08, () => ring(tx, ty + 16, '#ff7a3a', 10, 140, .5, 8));
      crack(tx, ty + 18, 110, '#ff8a3a', 10, 1.2); burst(tx, ty, '#ff8a3a', 40, 420, { g: -40 }); burst(tx, ty, '#ffe08a', 20, 260);
      for (let k = 0; k < 18; k++) part({ x: tx + rnd(-20, 20), y: ty, vx: rnd(-260, 260), vy: rnd(-460, -180), g: 900, c: '#a07850', s: rnd(4, 8), life: rnd(.5, .9), drag: .3 });
      for (let k = 0; k < 16; k++) later(rnd(.1, .6), () => part({ x: tx + rnd(-60, 60), y: ty + rnd(-10, 20), vx: rnd(-20, 20), vy: rnd(-70, -30), c: '#ffb35a', s: rnd(3, 5), life: rnd(.6, 1), drag: .2 }));
      break;
  }
}

// ───── 그리기 (각 장면의 카메라 변환 안에서, 매 장면 한 번) ─────
export function vfxClear() { P.length = 0; S.length = 0; Q.length = 0; }
export function vfxBusy() { return P.length + S.length + Q.length > 0; }
export function vfxDraw(g) {
  const now = performance.now() / 1000; let dt = last ? now - last : 0; last = now; if (dt > .05) dt = .05; if (dt <= 0 && !T0) { T0 = 1; }
  if (!P.length && !S.length && !Q.length) return;
  for (let k = Q.length - 1; k >= 0; k--) { const q = Q[k]; q.t -= dt; if (q.t <= 0) { Q.splice(k, 1); q.f(); } }
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
  for (let k = S.length - 1; k >= 0; k--) {
    const s = S[k]; s.t += dt; if (s.t >= s.life) { if (s.k === 'proj' && s.hit) s.hit(); S.splice(k, 1); continue; }
    drawShape(g, s, s.t / s.life, dt);
  }
  for (let k = P.length - 1; k >= 0; k--) {
    const p = P[k]; p.t += dt; if (p.t >= p.life) { P.splice(k, 1); continue; }
    const f = Math.exp(-p.drag * dt); p.vx *= f; p.vy *= f; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    const kk = p.t / p.life, s = p.grow ? p.s * (.6 + kk * .9) : p.s * (1 - kk * .6), al = p.grow ? (1 - kk) * .45 : 1 - kk * kk;
    g.globalAlpha = al; const im = glow(p.c); if (p.sq) g.drawImage(im, p.x - s * .6, p.y - s * 1.6, s * 1.2, s * 3.2); else g.drawImage(im, p.x - s * 2, p.y - s * 2, s * 4, s * 4);
  }
  g.restore();
}
function drawShape(g, s, k, dt) {
  const fade = 1 - k;
  switch (s.k) {
    case 'flash': { const r = s.r * (.7 + k * .6); g.globalAlpha = fade * fade; g.drawImage(glow(s.c), s.x - r, s.y - r, r * 2, r * 2); break; }
    case 'ring': {
      const r = s.r0 + (s.r1 - s.r0) * (1 - (1 - k) * (1 - k)); g.save(); g.translate(s.x, s.y); g.scale(1, s.sy);
      g.globalAlpha = fade * .35; g.strokeStyle = s.c; g.lineWidth = s.w * 2.4 * fade + 1; g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.stroke();
      g.globalAlpha = fade; g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1, s.w * .45 * fade); g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.stroke(); g.restore(); break;
    }
    case 'streak': {
      const h = s.grow ? Math.min(1, k / s.grow) : 1, t0 = Math.max(0, (k - .35) / .65), x0 = s.x0 + (s.x1 - s.x0) * t0, y0 = s.y0 + (s.y1 - s.y0) * t0, x1 = s.x0 + (s.x1 - s.x0) * h, y1 = s.y0 + (s.y1 - s.y0) * h;
      for (const [w, al, c] of [[s.w * 2.2, .28, s.c], [s.w, .7, s.c], [s.w * .35, 1, '#ffffff']]) { g.globalAlpha = al * fade; g.strokeStyle = c; g.lineWidth = Math.max(1, w * (.5 + fade * .5)); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
      break;
    }
    case 'bolt': {
      if (!s.pts || (s.rt -= dt) <= 0) {   // 0.05초마다 다시 꺾음 (지지직)
        s.rt = .05; const n = 9, dx = s.x1 - s.x0, dy = s.y1 - s.y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L; s.pts = [];
        for (let i = 0; i <= n; i++) { const f = i / n, o = i && i < n ? rnd(-1, 1) * Math.min(26, L * .12) : 0; s.pts.push([s.x0 + dx * f + nx * o, s.y0 + dy * f + ny * o]); }
        const b = s.pts[3 + Math.floor(Math.random() * 4)]; s.br = [b, [b[0] + rnd(-40, 40), b[1] + rnd(-40, 40)]];
      }
      for (const [w, al, c] of [[s.w * 3, .3, s.c], [s.w, 1, s.c]]) { g.globalAlpha = al * fade; g.strokeStyle = c; g.lineWidth = w; g.beginPath(); s.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.moveTo(...s.br[0]); g.lineTo(...s.br[1]); g.stroke(); }
      break;
    }
    case 'slash': {   // 초승달 베기: 휘두르는 방향으로 펼쳐지며 사라짐
      const sw = Math.min(1, k / .35), a0 = s.a - s.span / 2 * s.flip, a1 = a0 + s.span * sw * s.flip, r = s.r * (1 + k * .25), n = 14;
      g.save(); g.translate(s.x, s.y);
      for (const [rr, w, al, c] of [[r, .3, .45, s.c], [r, .14, 1, '#ffffff']]) {
        g.globalAlpha = al * fade; g.fillStyle = c; g.beginPath();
        for (let i = 0; i <= n; i++) { const t = a0 + (a1 - a0) * i / n; g.lineTo(Math.cos(t) * rr, Math.sin(t) * rr * .8); }
        for (let i = n; i >= 0; i--) { const t = a0 + (a1 - a0) * i / n, th = Math.sin(i / n * Math.PI) * rr * w; g.lineTo(Math.cos(t) * (rr - th), Math.sin(t) * (rr - th) * .8); }
        g.fill();
      }
      g.restore(); break;
    }
    case 'circle': {   // 마법진: 두 겹 원 + 도는 눈금 + 육망성. 나타날 때 커지며, 끝에 흐려짐
      const inA = Math.min(1, k / .15), outA = k > .7 ? (1 - k) / .3 : 1, sc = .6 + .4 * Math.min(1, k / .2); s.rot += dt * 1.6;
      g.save(); g.translate(s.x, s.y); g.scale(sc, sc * s.sy); g.globalAlpha = inA * outA; g.strokeStyle = s.c;
      g.lineWidth = 3; g.beginPath(); g.arc(0, 0, s.r, 0, 6.283); g.stroke(); g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, s.r * .78, 0, 6.283); g.stroke();
      g.save(); g.rotate(s.rot); g.beginPath(); for (let i = 0; i < 16; i++) { const t = i / 16 * 6.283; g.moveTo(Math.cos(t) * s.r * .8, Math.sin(t) * s.r * .8); g.lineTo(Math.cos(t) * s.r * .94, Math.sin(t) * s.r * .94); } g.stroke(); g.restore();
      g.save(); g.rotate(-s.rot * .7); g.lineWidth = 2; for (const o of [0, Math.PI / 3]) { g.beginPath(); for (let i = 0; i <= 3; i++) { const t = o + i / 3 * 6.283 - Math.PI / 2; g.lineTo(Math.cos(t) * s.r * .74, Math.sin(t) * s.r * .74); } g.stroke(); } g.restore();
      g.globalAlpha = inA * outA * .5; g.drawImage(glow(s.c), -s.r, -s.r, s.r * 2, s.r * 2); g.restore(); break;
    }
    case 'pillar': {   // 빛 기둥: 늘인 빛 점 (위에서 내려와 사라짐)
      const inA = Math.min(1, k / .15), h = s.h * Math.min(1, k / .2); g.globalAlpha = inA * fade; g.drawImage(glow(s.c), s.x - s.w / 2, s.y - h, s.w, h + s.w * .3); break;
    }
    case 'crack': {   // 갈라지는 땅: 금이 퍼져 나가며(처음 25%) 빛나다 사라짐
      const rev = Math.min(1, k / .25); g.save(); g.translate(s.x, s.y);
      for (const [w, al, c] of [[7, .35, s.c], [2.5, 1, '#fff0c8']]) {
        g.globalAlpha = al * fade; g.strokeStyle = c; g.lineWidth = w; g.beginPath();
        for (const L of s.lines) { const m = Math.max(1, Math.round((L.length - 1) * rev)); g.moveTo(L[0][0], L[0][1]); for (let i = 1; i <= m; i++) g.lineTo(L[i][0], L[i][1]); }
        g.stroke();
      }
      g.restore(); break;
    }
    case 'spin': {   // 몸 둘레를 도는 빛 고리
      g.save(); g.translate(s.x, s.y); g.scale(1, .55); const r = s.r * (.8 + k * .4);
      for (let i = 0; i < s.n; i++) { const a = s.t * s.sp + i / s.n * 6.283; for (const [w, al, c] of [[12, .35, s.c], [4, 1, '#ffffff']]) { g.globalAlpha = al * fade; g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, a, a + 1.3); g.stroke(); } }
      g.restore(); break;
    }
    case 'hex': {   // 육각 방패: 튀어나오듯 커졌다가 자리 잡고 흐려짐
      const sc = k < .15 ? .6 + k / .15 * .55 : 1.15 - Math.min(.15, (k - .15) * .6); g.save(); g.translate(s.x, s.y); g.scale(sc, sc);
      const hx = () => { g.beginPath(); for (let i = 0; i <= 6; i++) { const t = i / 6 * 6.283 + Math.PI / 6; g.lineTo(Math.cos(t) * s.r, Math.sin(t) * s.r); } };
      g.globalAlpha = fade * .25; g.fillStyle = s.c; hx(); g.fill(); g.globalAlpha = fade; g.strokeStyle = s.c; g.lineWidth = 5; hx(); g.stroke(); g.strokeStyle = '#ffffff'; g.lineWidth = 1.6; hx(); g.stroke();
      g.globalAlpha = fade * .6; g.lineWidth = 1.2; g.beginPath(); for (let i = 0; i < 6; i++) { const t = i / 6 * 6.283 + Math.PI / 6; g.moveTo(0, 0); g.lineTo(Math.cos(t) * s.r, Math.sin(t) * s.r); } g.stroke(); g.restore(); break;
    }
    case 'reticle': {   // 조준선: 크게 나타나 목표로 조여 듦
      const r = s.r * (1.8 - Math.min(1, k / .3) * .8); g.save(); g.translate(s.x, s.y); g.rotate(k * 3); g.globalAlpha = fade; g.strokeStyle = s.c; g.lineWidth = 3;
      g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.stroke(); g.beginPath(); for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2; g.moveTo(Math.cos(t) * r * .55, Math.sin(t) * r * .55); g.lineTo(Math.cos(t) * r * 1.3, Math.sin(t) * r * 1.3); } g.stroke(); g.restore(); break;
    }
    case 'emit': {   // 검기 길: 머리 자리에 빛 가루를 뿌림
      const d = s.sp * s.t, hx = s.x0 + Math.cos(s.a) * d, hy = s.y0 + Math.sin(s.a) * d;
      for (let i = 0; i < 2; i++) part({ x: hx + rnd(-10, 10), y: hy + rnd(-16, 16), vx: rnd(-30, 30), vy: rnd(-40, 10), c: s.c, s: rnd(3, 6), life: rnd(.25, .45) });
      g.globalAlpha = .5 * fade; g.drawImage(glow(s.c), hx - 40, hy - 40, 80, 80); break;
    }
    case 'proj': {   // 날아가는 것: 머리 빛 + 꼬리
      const f = Math.min(1, s.t / s.dur), ee = s.fire ? f * f : f, px = s.x0 + (s.x1 - s.x0) * ee, py = s.y0 + (s.y1 - s.y0) * ee - Math.sin(f * Math.PI) * (s.arc || 0);
      if (s.lx != null && s.streak) { for (const [w, al, c] of [[s.size * 1.2, .35, s.c], [s.size * .35, 1, '#ffffff']]) { g.globalAlpha = al; g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(s.lx, s.ly); g.lineTo(px, py); g.stroke(); } }
      for (let i = 0; i < s.trail; i++) part({ x: px + rnd(-4, 4), y: py + rnd(-4, 4), vx: rnd(-30, 30), vy: s.fire ? rnd(-90, -20) : rnd(-20, 20), c: s.tc, s: s.size * rnd(.25, .5), life: rnd(.18, .35), drag: 2 });
      g.globalAlpha = 1; g.drawImage(glow(s.c), px - s.size * 1.6, py - s.size * 1.6, s.size * 3.2, s.size * 3.2);
      if (s.lx == null || s.streak) { s.lx = s.streak && s.lx != null ? s.lx + (px - s.lx) * .5 : px; s.ly = s.streak && s.ly != null ? s.ly + (py - s.ly) * .5 : py; }
      if (s.t >= s.dur) { s.t = s.life; }   // 도착 → 다음 장면에서 hit()
      break;
    }
  }
}
