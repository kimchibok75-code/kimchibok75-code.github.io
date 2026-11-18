// 치복 타운 아이콘 — 이모지 대신 직접 그린 그림 (게임과 같은 그림 방식: 바깥 테두리만 두꺼운 검은 선 + 색 면)
// 화면(DOM)의 이모지는 iconize()가 자동으로 그림으로 바꾸고, 캔버스는 drawIco · fillTextIco로 그림
const INK = '#22262e';
// 모양 만들기. f: '' 보통(테두리 있음) · 'f' 테두리 없음(안쪽 무늬) · 'a' 위에 한 겹 더(자기 테두리) · 'd' 맨 위 장식(테두리 없음)
const C = (cx, cy, r, c, f = '') => ({ t: 'circle', a: { cx, cy, r }, c, f });
const E = (cx, cy, rx, ry, c, f = '', tr) => ({ t: 'ellipse', a: { cx, cy, rx, ry, ...(tr ? { transform: tr } : {}) }, c, f });
const R = (x, y, w, h, c, rx = 2, f = '', tr) => ({ t: 'rect', a: { x, y, width: w, height: h, rx, ...(tr ? { transform: tr } : {}) }, c, f });
const P = (d, c, f = '', tr) => ({ t: 'path', a: { d, ...(tr ? { transform: tr } : {}) }, c, f });
const S = (d, c, w = 3, f = '', tr) => ({ t: 'path', a: { d, ...(tr ? { transform: tr } : {}) }, c, f, w });   // 굵은 선 모양 (선도 테두리를 가짐)
const L = (d, c = INK, w = 1.6) => ({ t: 'path', a: { d }, c, f: 'd', w });   // 가는 장식 선
const rot = (deg, parts, cx = 16, cy = 16) => parts.map(p => ({ ...p, a: { ...p.a, transform: `rotate(${deg} ${cx} ${cy})${p.a.transform ? ' ' + p.a.transform : ''}` } }));
const sc = (k, parts, cx = 16, cy = 16) => parts.map(p => ({ ...p, a: { ...p.a, transform: `translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})${p.a.transform ? ' ' + p.a.transform : ''}` } }));
const mv = (dx, dy, parts) => parts.map(p => ({ ...p, a: { ...p.a, transform: `translate(${dx} ${dy})${p.a.transform ? ' ' + p.a.transform : ''}` } }));

// 자주 쓰는 색
const GOLD = '#ffc83d', GOLD2 = '#f0a922', RED = '#e8553a', GREEN = '#4fb35e', LEAF = '#7cc96b', BLUE = '#4a90e2', SKY = '#8fd3ff', BROWN = '#a8693a', WOOD = '#c98a4b',
  GREY = '#9aa3ad', LIGHT = '#e9edf2', WHITE = '#ffffff', PURPLE = '#9a6ad6', PINK = '#ff8fb1', ORANGE = '#ff9f43', SKIN = '#ffd9b8', DARK = '#4a5260', YEL = '#ffd34d';

const star = (cx, cy, R1, r1, n = 5, a0 = -90) => { let d = ''; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r1 : R1, a = (a0 + i * 180 / n) * Math.PI / 180; d += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1); } return d + 'Z'; };
const gearD = (cx, cy, R1, r1, n = 8) => { let d = ''; for (let i = 0; i < n * 4; i++) { const r = (i % 4 < 2) ? R1 : r1, a = (i / (n * 4)) * Math.PI * 2 + Math.PI / (n * 4); d += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1); } return d + 'Z'; };
const heartD = 'M16 27.5 L5 16 Q1.5 11 5 7 Q10 2.5 16 9 Q22 2.5 27 7 Q30.5 11 27 16Z';
const face = (c = YEL) => [C(16, 16, 12, c)];
const sword = (blade = '#e3e9f0', guard = GOLD2) => [P('M16 2.5 L19.5 7 L19.5 19 L12.5 19 L12.5 7Z', blade), P('M16 5 L17.6 7.5 L17.6 18 L16 18Z', WHITE, 'f'), R(8.5, 18.5, 15, 3.6, guard, 1.6), R(14.2, 22, 3.6, 5.4, '#7a4a24', 1), C(16, 28, 2.2, guard)];
const fishBody = (c, c2) => [P('M21 16 L29 9.5 L28 22.5Z', c2 || c), E(14, 16, 11, 7.5, c), P('M9 11 Q14 7 19 9 Q15 10.5 13 13Z', WHITE, 'f'), C(8.5, 14.5, 1.7, INK, 'd')];
const person = (body = RED, extra = []) => [R(10.5, 16, 11, 11, body, 4), R(8, 3.5, 16, 14, '#ffe0c2', 6), ...extra, C(13, 11, 1.3, INK, 'd'), C(19, 11, 1.3, INK, 'd')];
const medal = (c, c2) => [P('M9 3 L14 3 L18 12 L13 12Z', BLUE), P('M23 3 L18 3 L14 12 L19 12Z', RED), C(16, 20.5, 8, c), C(16, 20.5, 5.4, c2, 'f'), P(star(16, 20.5, 4, 1.8), c, 'f')];
const crop = { // 작물
  lettuce: [P('M16 28 Q4.5 26 5.5 15.5 Q6.5 5.5 16 4 Q25.5 5.5 26.5 15.5 Q27.5 26 16 28Z', LEAF), P('M16 26 Q9 24 10 16 Q11 9 16 8 Q21 9 22 16 Q23 24 16 26Z', '#b4e39a', 'f'), L('M16 9 L16 25', '#5aa64a', 1.4)],
};

export const ICONS = {
  // ── 돈 · 자원 · 코인
  coin: [C(16, 16, 12, GOLD), C(16, 16, 8.2, GOLD2, 'f'), C(16, 16, 6.4, GOLD, 'f'), R(14.6, 12, 2.8, 8, GOLD2, 1, 'f'), E(11, 10.5, 2.6, 1.6, '#fff3c4', 'f', 'rotate(-30 11 10.5)')],
  money: [P('M11 9 L8.5 3.5 L13 5 L16 3 L19 5 L23.5 3.5 L21 9Z', '#d9a35b'), P('M10 12 Q4 28 16 28 Q28 28 22 12Z', '#d9a35b'), R(10, 9, 12, 4, '#b9803d', 2), C(16, 20.5, 4.6, GOLD, 'a'), R(15, 18, 2, 5, GOLD2, .8, 'd')],
  wood: [R(3.5, 10, 22, 13, '#b0703d', 6.5), E(24.5, 16.5, 4.5, 6.5, '#e7b77a'), E(24.5, 16.5, 2.4, 3.6, WOOD, 'f'), R(7, 13, 11, 2, '#c98a4b', 1, 'f')],
  stone: [P('M4.5 22 L8 12 L15 7 L24 9.5 L28.5 19.5 L22.5 26.5 L10 26.5Z', GREY), P('M10 13.5 L15 9.5 L21 11 L15.5 14Z', '#c5ccd4', 'f'), P('M20 22 L25 18.5 L23.5 23Z', '#7f8994', 'f')],
  fishcoin: [C(16, 16, 12, '#6fd0e0'), C(16, 16, 8.4, '#2f9bb0', 'f'), C(16, 16, 6.8, '#6fd0e0', 'f'), P('M10.5 16 Q14 11.5 18.5 14 L22 11.5 L21 16 L22 20.5 L18.5 18 Q14 20.5 10.5 16Z', '#ffffff', 'f'), C(13.3, 15.3, .9, '#1f5f70', 'f'), E(11, 10.5, 2.6, 1.6, '#e6fbff', 'f', 'rotate(-30 11 10.5)')],
  farmcoin: [C(16, 16, 12, '#a6dd73'), C(16, 16, 8.4, '#4f9d3a', 'f'), C(16, 16, 6.8, '#a6dd73', 'f'), ...Array.from({ length: 6 }, (_, i) => C(16 + 3.4 * Math.cos(i * 1.047), 16 + 3.4 * Math.sin(i * 1.047), 1.9, '#ffe066', 'f')), C(16, 16, 1.9, '#8a5a2b', 'f'), E(11, 10.5, 2.6, 1.6, '#f2ffe0', 'f', 'rotate(-30 11 10.5)')],
  tulip: [S('M16 29 L16 16', '#4fb35e', 2.4), P('M16 25 Q9 23 8 17 Q14 18 16 23Z', '#7cc96b'), P('M10 7 L13 10 L16 5 L19 10 L22 7 L21.5 14 Q16 19 10.5 14Z', '#ff7aa8'), P('M14 10.5 L16 6.5 L18 10.5 L16 15Z', '#ffb3cf', 'f')],
  shell: [P('M16 28 L4 14.5 Q16 -1 28 14.5Z', '#ffb38a'), P('M16 27 L10.5 9 L13.6 7.6Z', '#ffd8bf', 'f'), P('M16 27 L18.4 7.6 L21.5 9Z', '#ffd8bf', 'f'), P('M16 27 L6.5 14 L8 11.5Z', '#ffd8bf', 'f'), P('M16 27 L24 11.5 L25.5 14Z', '#ffd8bf', 'f'), R(11.5, 24, 9, 4.5, '#ff9a6b', 2)],
  sunflower: [...Array.from({ length: 10 }, (_, i) => E(16 + 8 * Math.cos(i * .628), 16 + 8 * Math.sin(i * .628), 4.6, 3, YEL, '', `rotate(${i * 36} ${16 + 8 * Math.cos(i * .628)} ${16 + 8 * Math.sin(i * .628)})`)), C(16, 16, 6.2, '#8a5a2b'), C(14, 14, 1, '#5a3a1b', 'd'), C(18, 15, 1, '#5a3a1b', 'd'), C(16, 18.5, 1, '#5a3a1b', 'd')],
  tag: [P('M4 6 Q4 4 6 4 L15 4 L28 17 Q29 18 28 19 L19 28 Q18 29 17 28 L4 15Z', '#ff9f43'), C(10, 10, 2.4, WHITE, 'f'), R(13, 15, 9, 2.2, '#ffc27a', 1, 'f', 'rotate(45 17.5 16)')],
  book: [R(6.5, 4, 19, 24, BLUE, 2.5), R(6.5, 4, 4.5, 24, '#2f6fbf', 2, 'f'), R(13.5, 9, 9, 4.5, '#cfe5ff', 1.2, 'f'), R(22, 24, 3.5, 3.5, WHITE, .5, 'f')],
  star: [P(star(16, 16.5, 13, 5.6), GOLD), P(star(16, 16.5, 6, 2.6), '#fff1b0', 'f')],
  sparkle: [P('M13 3 Q14 12 22 13 Q14 14 13 23 Q12 14 4 13 Q12 12 13 3Z', YEL), P('M24 17 Q24.6 22 29 22.5 Q24.6 23 24 28 Q23.4 23 19 22.5 Q23.4 22 24 17Z', YEL, 'a')],
  // ── 무기 · 장비 · 능력치
  sword: rot(45, sword()),
  swords: [...rot(45, sc(.86, sword())), ...rot(-45, sc(.86, sword('#e3e9f0', '#e8553a'))).map(p => (p.f ? p : { ...p, f: 'a' }))],
  bow: [S('M10 3.5 Q28 16 10 28.5', BROWN, 3.6), L('M10.3 4 L10.3 28', '#5b6573', 1.2), S('M5 16 L22 16', WOOD, 2.2), P('M21 12 L29 16 L21 20Z', LIGHT), P('M3.5 12.5 L9 16 L3.5 19.5 L6 16Z', RED)],
  staff: [S('M6 27 L19.5 13.5', '#8a5a2b', 3.6), C(22, 10, 6, PURPLE), C(20, 8, 1.8, '#e2c6ff', 'f'), P('M27 18 L28 20.5 L30.5 21.5 L28 22.5 L27 25 L26 22.5 L23.5 21.5 L26 20.5Z', YEL, 'a')],
  shield: [P('M16 3 L27.5 7 L26.5 17 Q24.5 25.5 16 29 Q7.5 25.5 5.5 17 L4.5 7Z', BLUE), P('M16 6.5 L24 9.3 L23.3 16.6 Q22 22.5 16 25.3Z', '#6fb0f5', 'f'), P(star(16, 15.5, 4.2, 1.9), GOLD, 'f')],
  helmet: [P('M5 21 Q5 5.5 16 5.5 Q27 5.5 27 21Z', RED), R(2.5, 19.5, 27, 5, '#c8432c', 2.5), R(14.4, 8.5, 3.2, 9.5, WHITE, .6, 'f'), R(11.3, 11.6, 9.4, 3.2, WHITE, .6, 'f')],
  armor: [P('M10.5 4.5 L3.5 10 L6 16.5 L9 14.5 L9 27.5 L23 27.5 L23 14.5 L26 16.5 L28.5 10 L21.5 4.5 Q16 9 10.5 4.5Z', '#4a7fbf'), P('M12 13 L20 13 L19 21 L13 21Z', '#79a8de', 'f'), R(9, 24, 14, 3.5, '#3a6aa5', 1, 'f')],
  boots: [P('M8.5 4 L18.5 4 L18.5 18 L27.5 21 Q28.5 21.5 28.5 23 L28.5 27.5 L8.5 27.5Z', BROWN), R(8.5, 24.5, 20, 3, '#5b3a1e', 1, 'f'), R(8.5, 7, 10, 3, '#c98a4b', 1, 'f')],
  hat: [E(16, 21.5, 13.5, 5, '#f1d27a'), P('M9 21 Q9 8.5 16 8.5 Q23 8.5 23 21Z', '#f1d27a'), R(9.2, 16.2, 13.6, 3.8, RED, 1, 'f')],
  ribbon: [P('M16 16 L4.5 8.5 Q2.5 16 4.5 23.5Z', '#ff7fa6'), P('M16 16 L27.5 8.5 Q29.5 16 27.5 23.5Z', '#ff7fa6'), C(16, 16, 4, '#ff5c8a')],
  crown: [P('M4.5 24 L3.5 9.5 L10.5 15.5 L16 6 L21.5 15.5 L28.5 9.5 L27.5 24Z', GOLD), R(4.5, 22, 23, 5, GOLD2, 1.5), C(16, 18.5, 2, RED, 'd'), C(9.5, 19.5, 1.4, BLUE, 'd'), C(22.5, 19.5, 1.4, GREEN, 'd')],
  hammer: rot(-35, [R(14.3, 12, 3.4, 17, BROWN, 1.5), R(6.5, 5, 19, 8.5, GREY, 2), R(6.5, 5, 19, 2.6, '#c5ccd4', 1.5, 'f')]),
  axe: rot(25, [R(14.3, 4, 3.4, 25, BROWN, 1.5), P('M17 5 Q28.5 5.5 27.5 16.5 Q22.5 14 17 14Z', LIGHT), P('M17.5 6.5 Q25 7.5 25.5 12 Q21 11 17.5 11Z', WHITE, 'f')]),
  pick: rot(25, [R(14.3, 6, 3.4, 23, BROWN, 1.5), P('M3.5 12 Q16 1 28.5 12 Q16 7 3.5 12Z', GREY)]),
  fire: [P('M16 2.5 Q25 11 24 19.5 Q23 28.5 16 28.5 Q8.5 28.5 8.5 20 Q8.5 14 13 9.5 Q13 16 16 17 Q13.5 9.5 16 2.5Z', '#ff7a3d'), P('M16 15 Q20.5 19 20 23 Q19.5 26.5 16 26.5 Q12.5 26.5 12.5 23 Q13 19 16 15Z', YEL, 'f')],
  orb: [P('M7.5 27.5 L11 21 L21 21 L24.5 27.5Z', '#8a5a2b'), C(16, 13.5, 10, '#b07ee8'), C(12.5, 10, 2.6, '#e8d6ff', 'f'), C(19, 16, 1.3, '#e8d6ff', 'f')],
  portal: [E(16, 16, 11, 13, PURPLE), E(16, 16, 7.5, 9.5, '#b994f0', 'f'), L('M16 9 Q22 11 20 17 Q18 22 13 19 Q10 16 14 14 Q17 13 17 16', '#5c3a9a', 1.8)],
  muscle: [P('M4 25.5 L7 14.5 Q9.5 6 17.5 7 L18.5 12.5 L13.5 13.5 L13.5 16.5 Q18.5 11.5 24.5 14 Q29.5 18 25.5 24 Q18.5 28.5 4 25.5Z', '#ffc9a0'), P('M17 17 Q21 15.5 24 17.5 Q21 18 18 20Z', '#ffe2cc', 'f')],
  run: [P('M4 20 Q4 15 9 15 L15 15 L19 11 L23 13 L21 17 Q28 17.5 28.5 22 L28.5 25 L4 25Z', '#4a90e2'), R(4, 23.5, 24.5, 3, WHITE, 1.4, 'f'), L('M2 9 L10 9 M4 5 L12 5', '#7fb6ef', 2)],
  brain: [C(11, 12.5, 6.2, '#ff9fb8'), C(19.5, 11, 6.2, '#ff9fb8'), C(22.5, 18.5, 6, '#ff9fb8'), C(12, 20.5, 6.2, '#ff9fb8'), C(16.5, 17, 6, '#ff9fb8'), L('M16 7 Q14 12 17 16 Q19 20 16 26', '#e06f92', 1.5), L('M9 15 Q12 16 12 19', '#e06f92', 1.3)],
  clover: [S('M16 17 Q16 25 21 29', '#3f9a55', 2.4), C(11, 11, 5.4, GREEN), C(21, 11, 5.4, GREEN), C(11, 20, 5.4, GREEN), C(21, 20, 5.4, GREEN), C(16, 15.5, 2.5, '#7cd88a', 'f')],
  heart: [P(heartD, '#ff4f6d'), E(9.5, 10, 2.6, 1.6, '#ffa3b3', 'f', 'rotate(-35 9.5 10)')],
  heartPink: [P(heartD, '#ff8fc0'), E(9.5, 10, 2.6, 1.6, '#ffd0e3', 'f', 'rotate(-35 9.5 10)'), P(star(23, 7, 3, 1.2, 4), WHITE, 'd')],
  // ── 장소 · 건물
  house: [R(6, 14, 20, 14, '#ffe8c2', 1), P('M2.5 15.5 L16 3.5 L29.5 15.5Z', RED), R(13.5, 19, 5, 9, BROWN, 1, 'f'), R(20, 17.5, 4, 4, SKY, .8, 'f'), R(8, 17.5, 4, 4, SKY, .8, 'f')],
  ruins: [P('M6 28 L6 15 L13 9 L15 13 L19 8 L26 15 L26 28Z', '#c8bfae'), P('M3.5 16 L13 8 L15 11Z', '#8f7a64'), R(13, 20, 5, 8, '#7a6450', 1, 'f'), L('M20 17 L22 21 L20.5 24', '#7a6450', 1.4)],
  town: [...mv(-6, 3, sc(.62, [R(6, 14, 20, 14, '#ffe8c2', 1), P('M2.5 15.5 L16 3.5 L29.5 15.5Z', BLUE), R(13.5, 19, 5, 9, BROWN, 1, 'f')])), ...mv(6, 3, sc(.72, [R(6, 14, 20, 14, '#ffe8c2', 1), P('M2.5 15.5 L16 3.5 L29.5 15.5Z', RED), R(13.5, 19, 5, 9, BROWN, 1, 'f')])).map(p => (p.f ? p : { ...p, f: 'a' }))],
  hall: [P('M3 11.5 L16 3.5 L29 11.5Z', LIGHT), R(4.5, 11, 23, 3, '#cfd6de', 1), R(6.5, 14, 3.4, 10, WHITE, .5), R(12, 14, 3.4, 10, WHITE, .5), R(17, 14, 3.4, 10, WHITE, .5), R(22.2, 14, 3.4, 10, WHITE, .5), R(3, 24, 26, 4.5, '#cfd6de', 1)],
  build: [R(3.5, 17, 25, 11, '#e07a4f', 1), R(3.5, 21.2, 25, 1.4, '#f2a17d', 0, 'f'), R(14, 17, 1.4, 4, '#f2a17d', 0, 'f'), R(8.5, 22.6, 1.4, 5.4, '#f2a17d', 0, 'f'), R(20.5, 22.6, 1.4, 5.4, '#f2a17d', 0, 'f'), S('M7 17 L7 4 L27 4', YEL, 3), L('M24 4 L24 10', DARK, 1.4), P('M22 10 L26 10 L24 13Z', DARK, 'd')],
  fountain: [E(16, 24.5, 13.5, 4.5, '#9fb4c4'), E(16, 23.5, 10.5, 2.6, SKY, 'f'), R(14.3, 10, 3.4, 13, '#c5d2dc', 1), E(16, 12, 6.5, 2.2, '#c5d2dc'), S('M16 8 Q8 9 7 20', '#6fc3ff', 2.4, 'a'), S('M16 8 Q24 9 25 20', '#6fc3ff', 2.4, 'a'), C(16, 7, 2.8, '#6fc3ff', 'a')],
  tree: [R(13.5, 18.5, 5, 10, BROWN, 1.2), C(16, 13, 10.5, GREEN), C(11.5, 9.5, 3.4, LEAF, 'f'), C(20.5, 15.5, 2, LEAF, 'f')],
  pine: [R(14, 22, 4, 7, BROWN, 1), P('M16 2.5 L24 12 L20.5 12 L27 21 L22 21 L28 24.5 L4 24.5 L10 21 L5 21 L11.5 12 L8 12Z', '#3f9a55'), P('M16 6 L19 10 L13 10Z', '#6cc07a', 'f')],
  mountain: [P('M1.5 27.5 L12 8.5 L17.5 16 L21.5 11 L30.5 27.5Z', '#8a9aa8'), P('M12 8.5 L15.5 13.8 L12.5 12.5 L9.4 14Z', WHITE, 'f'), P('M21.5 11 L24 15.5 L21.5 14.6 L19.5 15.8Z', WHITE, 'f')],
  door: [R(7.5, 3.5, 17, 25, BROWN, 2.5), R(10.5, 6.5, 11, 8, '#c98a4b', 1, 'f'), R(10.5, 17, 11, 8.5, '#c98a4b', 1, 'f'), C(20, 16, 1.6, GOLD, 'd')],
  pin: [P('M16 29 Q6.5 18 6.5 12 A9.5 9.5 0 0 1 25.5 12 Q25.5 18 16 29Z', RED), C(16, 12, 3.8, WHITE, 'f')],
  sofa: [R(5, 9, 22, 11, '#5b9be0', 3), R(2.5, 14, 6, 11, '#4a7fbf', 2.5), R(23.5, 14, 6, 11, '#4a7fbf', 2.5), R(7, 17, 18, 7, '#7fb6ef', 2), R(5, 25, 3, 3, BROWN, .5), R(24, 25, 3, 3, BROWN, .5)],
  chair: [R(9, 3.5, 14, 12, WOOD, 2), R(7.5, 15, 17, 4.5, '#b07a3f', 1.5), R(9, 19, 3, 9.5, BROWN, 1), R(20, 19, 3, 9.5, BROWN, 1), R(11.5, 6, 9, 2, '#e0a868', 1, 'f')],
  // ── 먹을 것 · 텃밭
  coffee: [S('M22 14 Q28.5 14 27.5 19 Q26.5 23.5 21.5 22.5', '#f4f1ea', 2.8), P('M5.5 11 L22.5 11 L21.5 24 Q21 27.5 17 27.5 L11 27.5 Q7 27.5 6.5 24Z', '#f4f1ea'), E(14, 11.2, 8.3, 2, '#7a4a24', 'f'), R(5.5, 17, 17, 3, RED, 0, 'f'), L('M11 7.5 Q10 5.5 11.5 3.5 M16 7.5 Q15 5.5 16.5 3.5', '#b8c2cc', 1.4)],
  cup: [S('M17 8 L21.5 2', BLUE, 2.2), P('M8 9.5 L24 9.5 L22 28 L10 28Z', '#ff6b6b'), R(6.5, 7, 19, 4.5, WHITE, 2), R(9.6, 15, 12.8, 4, '#ffd2d2', 0, 'f')],
  bubbletea: [S('M17.5 8 L21 2', '#ff8fb1', 2.6), P('M8 9.5 L24 9.5 L22 28 L10 28Z', '#e7c9a0'), R(6.5, 7, 19, 4.5, WHITE, 2), C(13, 24, 1.6, '#4a3020', 'd'), C(17, 25, 1.6, '#4a3020', 'd'), C(19.5, 22, 1.6, '#4a3020', 'd'), C(14.5, 21, 1.6, '#4a3020', 'd')],
  cocktail: [P('M5 7.5 L27 7.5 L17.4 18.5 L17.4 25 L22.5 27.5 L9.5 27.5 L14.6 25 L14.6 18.5Z', ORANGE), P('M9 10 L23 10 L16 17Z', '#ffc27a', 'f'), C(25, 7, 3.6, '#9be15d', 'a'), S('M19 4 L13 12', PINK, 1.8, 'a')],
  lettuce: crop.lettuce,
  carrot: [P('M21.5 8.5 Q26.5 12.5 22.5 17 L8.5 28.5 Q4.5 29.5 4.5 25.5 L15.5 12 Q18.5 7.5 21.5 8.5Z', '#ff8a3d'), P('M20.5 9.5 L22 3 L24.5 8 L29 5.5 L26 11.5Z', GREEN), L('M12 18 L15 20 M9 22 L11.5 24', '#e06a20', 1.3)],
  potato: [E(16, 17, 12, 8.5, '#c99a5b', '', 'rotate(-15 16 17)'), C(11, 15, 1.2, '#9a7040', 'd'), C(19, 13.5, 1.2, '#9a7040', 'd'), C(21, 20, 1.2, '#9a7040', 'd'), C(14, 21, 1.2, '#9a7040', 'd')],
  corn: [E(16, 13.5, 6.4, 10.5, YEL), ...[9, 13, 17].flatMap(y => [C(13.6, y, 1.3, '#f2b52a', 'f'), C(18.4, y, 1.3, '#f2b52a', 'f'), C(16, y + 2, 1.3, '#f2b52a', 'f')]), P('M16 28.5 Q5.5 25 6.5 12 Q10.5 20.5 16 22.5 Q21.5 20.5 25.5 12 Q26.5 25 16 28.5Z', LEAF)],
  pepper: [P('M24.5 8 Q26.5 18.5 18.5 25 Q12 29.5 6 27.5 Q14 24 17 17 Q19 11 24.5 8Z', '#e8433a'), P('M23.5 9 L26 3.5 L28.5 5 L25.5 10.5Z', GREEN), P('M22 12 Q22 16 19.5 19 Q20.5 15.5 22 12Z', '#ff8a7a', 'f')],
  strawberry: [P('M16 28.5 Q5.5 22.5 5.5 14 Q5.5 8.5 11 8.5 L21 8.5 Q26.5 8.5 26.5 14 Q26.5 22.5 16 28.5Z', '#ff4f6d'), P('M8.5 10 L13 5 L16 8 L19 5 L23.5 10 L16 12.5Z', GREEN), ...[[11, 15], [16, 16], [21, 15], [13, 20], [19, 20], [16, 24]].map(([x, y]) => E(x, y, .9, 1.3, '#ffe27a', 'd'))],
  watermelon: [P('M2 11 A14 14 0 0 0 30 11Z', GREEN), P('M5 11.5 A11 11 0 0 0 27 11.5Z', '#ff5c6c', 'f'), ...[[10, 15], [16, 18], [22, 15], [13, 20], [19, 20]].map(([x, y]) => E(x, y, .9, 1.4, INK, 'd'))],
  sprout: [S('M16 28.5 L16 14', GREEN, 2.8), P('M16 17 Q7.5 18 5.5 9.5 Q14 8 16 17Z', LEAF), P('M16 14.5 Q19.5 5 28.5 6.5 Q27 15.5 16 14.5Z', LEAF), R(9, 26, 14, 3, '#8a5a2b', 1.5)],
  wheat: [S('M16 29 L16 8', '#d9a535', 2.2), ...[8, 12.5, 17].flatMap(y => [E(12.5, y + 1, 2.4, 3.8, '#f2c14e', '', `rotate(-30 12.5 ${y + 1})`), E(19.5, y + 1, 2.4, 3.8, '#f2c14e', '', `rotate(30 19.5 ${y + 1})`)]), E(16, 5.5, 2.3, 3.6, '#f2c14e')],
  drop: [P('M16 2.5 Q25.5 14.5 24.5 20 A8.5 8.5 0 0 1 7.5 20 Q6.5 14.5 16 2.5Z', '#5bb8ff'), E(12.5, 19, 1.8, 3, '#bfe4ff', 'f', 'rotate(20 12.5 19)')],
  can: [S('M8.5 12.5 Q13.5 4 18.5 12.5', '#5bb8ff', 2.6), S('M19.5 21 L27 12', '#5bb8ff', 3), E(27.5, 11, 2.6, 3.4, '#5bb8ff', '', 'rotate(40 27.5 11)'), R(5.5, 12, 15, 15.5, '#5bb8ff', 3), R(8, 15, 3, 9, '#a9dbff', 1.5, 'f')],
  basket: [S('M8 14 Q16 1.5 24 14', '#b9803d', 2.6), P('M4.5 13.5 L27.5 13.5 L24.5 27.5 L7.5 27.5Z', '#d9a35b'), R(6, 17.5, 20, 1.6, '#b9803d', 0, 'f'), R(7, 22, 18, 1.6, '#b9803d', 0, 'f')],
  soil: [R(3.5, 9, 25, 17, '#8a5a2b', 4), R(3.5, 9, 25, 4, '#a8733f', 3, 'f'), C(10, 17, 1.4, '#6a4320', 'd'), C(18, 20, 1.4, '#6a4320', 'd'), C(23, 16, 1.4, '#6a4320', 'd')],
  // ── 물고기 · 낚시
  fish: fishBody('#5bb8ff', '#3d9be8'),
  tropical: [...fishBody(YEL, ORANGE).slice(0, 2), R(10, 9, 2.6, 14, '#2f7fe0', 1, 'f'), R(16, 9, 2.6, 14, '#2f7fe0', 1, 'f'), C(7.5, 14.5, 1.7, INK, 'd')],
  blowfish: [...Array.from({ length: 10 }, (_, i) => P(`M${(15 + 13 * Math.cos(i * .628)).toFixed(1)} ${(16 + 13 * Math.sin(i * .628)).toFixed(1)} L${(15 + 9 * Math.cos(i * .628 - .2)).toFixed(1)} ${(16 + 9 * Math.sin(i * .628 - .2)).toFixed(1)} L${(15 + 9 * Math.cos(i * .628 + .2)).toFixed(1)} ${(16 + 9 * Math.sin(i * .628 + .2)).toFixed(1)}Z`, '#e7c76a')), C(15, 16, 10, '#ffd977'), E(15, 20, 6.5, 4, '#fff1c4', 'f'), C(10.5, 13.5, 1.8, INK, 'd'), C(19.5, 13.5, 1.8, INK, 'd'), E(15, 18.5, 1.6, 1.1, '#e8553a', 'd')],
  crab: [S('M7 17 L2.5 13', '#e8553a', 2.4), S('M25 17 L29.5 13', '#e8553a', 2.4), C(4, 10.5, 3.6, '#e8553a'), C(28, 10.5, 3.6, '#e8553a'), S('M9 22 L4.5 27 M23 22 L27.5 27 M12 23.5 L9.5 28.5 M20 23.5 L22.5 28.5', '#e8553a', 2), E(16, 19, 10, 7, '#e8553a'), E(16, 21, 6, 3, '#ff8a6f', 'f'), C(13, 15, 1.4, INK, 'd'), C(19, 15, 1.4, INK, 'd')],
  octopus: [S('M8 19 Q5 26 3.5 23 M12.5 20 Q11 28 8.5 28 M19.5 20 Q21 28 23.5 28 M24 19 Q27 26 28.5 23', '#a77ce0', 3.2), E(16, 13.5, 10, 10, '#a77ce0'), C(12.5, 14, 1.6, INK, 'd'), C(19.5, 14, 1.6, INK, 'd'), C(11, 9, 2.4, '#c9adf0', 'f')],
  turtle: [C(6, 18, 3.6, '#7cc96b'), E(10, 25, 3, 2.4, '#7cc96b'), E(24, 25, 3, 2.4, '#7cc96b'), P('M5 22 Q5 8 17 8 Q29 8 29 22Z', '#4f9d5a'), P('M12 12 L17 10 L22 12 L22 18 L17 20 L12 18Z', '#7cc96b', 'f'), C(5, 17, 1, INK, 'd')],
  snake: [S('M6 26 Q14 29 18 24 Q21 19 14 17 Q7 15 11 10 Q14 6 21 7', '#5bbf5e', 4.2), C(23, 7, 3.6, '#5bbf5e'), C(24, 6, 1, INK, 'd'), L('M26.5 7.5 L29 8.5 M28 8 L29 7', '#e8553a', 1.1)],
  shark: [P('M16 9.5 L19 3 L21.5 10Z', '#7d8ea0'), P('M24 16 L30 9.5 L29 22.5Z', '#7d8ea0'), P('M3 17 Q8 9.5 17 9.5 Q25 9.5 26 16 Q25 23 15 23 Q7 23 3 17Z', '#8a9cb0'), P('M5 18.5 Q10 22 18 21.5 Q24 21 25.5 17 Q20 19 5 18.5Z', LIGHT, 'f'), C(9, 14.5, 1.4, INK, 'd'), L('M12 17 L12 19.5 M14 17 L14 19.5', '#5b6573', 1)],
  shrimp: [P('M25 8 Q29 15 23 22 Q17 27 9 25 L6 28 L5 22 Q11 23 15 20 Q20 15 17 9Z', '#ff9a7a'), L('M20 11 L22 15 M17 17 L20 20 M13 20 L15 23', '#e06a50', 1.2), C(23.5, 10, 1.2, INK, 'd'), L('M25 8 Q20 3 13 4 M25.5 8.5 Q22 2 17 2', '#e06a50', 1.1)],
  dragon: [   // 2026-11-18 레드 드래곤 얼굴 (사용자 그림과 같은 색: 빨간 비늘 · 크림색 뿔 · 노란 눈)
    P('M9.5 12 L5 2.5 Q9.5 4.5 12.5 10Z', '#f6d7ae'), P('M22.5 12 L27 2.5 Q22.5 4.5 19.5 10Z', '#f6d7ae'),
    P('M3 13 L8.5 11.5 L8 16Z', '#b8392f'), P('M29 13 L23.5 11.5 L24 16Z', '#b8392f'),
    P('M16 6.5 Q24.5 7 25 15 Q25 20 21.5 22 L21 27 Q16 30 11 27 L10.5 22 Q7 20 7 15 Q7.5 7 16 6.5Z', '#d9483b'),
    P('M16 6.5 L18.4 10.5 L16 9.5 L13.6 10.5Z', '#a8322a', 'f'), P('M11.5 21.5 Q16 19.5 20.5 21.5 L20 26.5 Q16 28.5 12 26.5Z', '#f6d7ae', 'f'),
    P('M9.5 15.2 L14 16.4 L12.6 18.2 Q10 17.6 9.5 15.2Z', '#ffd84a', 'f'), P('M22.5 15.2 L18 16.4 L19.4 18.2 Q22 17.6 22.5 15.2Z', '#ffd84a', 'f'),
    L('M8.8 13.8 L14.4 15.7', INK, 1.5), L('M23.2 13.8 L17.6 15.7', INK, 1.5),
    C(12.2, 16.9, .9, INK, 'd'), C(19.8, 16.9, .9, INK, 'd'), C(14.2, 24, .8, '#7a1f1a', 'd'), C(17.8, 24, .8, '#7a1f1a', 'd')],
  whale: [P('M3 17 Q4 7 15 7 Q26 7 27 16 L30.5 11 L30.5 21 L27 19 Q25 27 14 27 Q4 27 3 17Z', '#4a8fd6'), P('M5 19 Q8 25 15 25 Q22 25 25 20 Q15 23 5 19Z', '#bfe0ff', 'f'), C(9, 14, 1.5, INK, 'd'), S('M14 6 Q13 2 10 2.5 M14 6 Q15 2 18 2.5', '#8fd3ff', 1.6, 'a')],
  rod: [S('M4.5 28.5 L24 5', BROWN, 2.6), L('M24 5 L26.5 19.5', '#5b6573', 1.1), C(26.5, 21, 2.8, RED), R(24, 20.5, 5, 1.4, WHITE, .5, 'f'), C(8, 24.5, 2.6, DARK)],
  hook: [S('M16 7 L16 20 Q16 27.5 10.5 26.5 Q6.5 25.5 7 20.5', GREY, 3), P('M7 20.5 L4.5 23.5 L5.2 18.5Z', GREY), C(16, 5, 2.6, LIGHT)],
  worm: [S('M5 20 Q9 12 13 20 Q17 28 21 20 Q24 13 27.5 17', '#ff8fa6', 4.8), C(27.5, 17, 1.2, INK, 'd')],
  ruler: [R(2.5, 11, 27, 10, YEL, 1.6), L('M7 11 L7 15 M11.5 11 L11.5 17 M16 11 L16 15 M20.5 11 L20.5 17 M25 11 L25 15', '#b08a1e', 1.3)],
  // ── 화면 · 표시
  gear: [P(gearD(16, 16, 13, 9.5, 8), GREY), C(16, 16, 4.2, LIGHT, 'f')],
  pencil: rot(45, [R(12.5, 6, 7, 18, YEL, 1), R(12.5, 3, 7, 4, '#ff9fb8', 1.5), R(12.5, 6, 7, 2, GREY, 0, 'f'), P('M12.5 24 L19.5 24 L16 30Z', '#ffe0b0'), P('M15 28.3 L17 28.3 L16 30Z', INK, 'd')]),
  key: rot(35, [C(9.5, 16, 6.5, GOLD), R(14, 14.2, 15, 3.6, GOLD, 1), R(22.5, 17, 3, 4.5, GOLD, .6), R(26, 17, 2.6, 5.5, GOLD, .6), C(9.5, 16, 2.4, WHITE, 'f')]),
  receipt: [P('M7 3.5 L25 3.5 L25 28.5 L22 26.5 L19 28.5 L16 26.5 L13 28.5 L10 26.5 L7 28.5Z', WHITE), R(10, 8, 12, 2, '#b8c2cc', 1, 'f'), R(10, 12.5, 9, 2, '#b8c2cc', 1, 'f'), R(10, 17, 12, 2, '#b8c2cc', 1, 'f'), R(17, 21, 5, 2, GREEN, 1, 'f')],
  lock: [S('M10 15 L10 10.5 A6 6 0 0 1 22 10.5 L22 15', GREY, 3), R(6.5, 14, 19, 14.5, GOLD, 3), C(16, 20, 2.2, '#7a5a10', 'd'), R(15.2, 21, 1.6, 4, '#7a5a10', .5, 'd')],
  search: [S('M20 20 L27.5 27.5', DARK, 4.2), C(13, 13, 9.5, DARK), C(13, 13, 6.6, '#bfe6ff', 'f'), E(10.5, 10.5, 2.2, 1.4, WHITE, 'f', 'rotate(-40 10.5 10.5)')],
  speaker: [R(3, 12.5, 6, 7.5, RED, 1.5), P('M8 12.5 L21 5.5 L21 27 L8 20Z', YEL), L('M24.5 11.5 Q27 16 24.5 21 M27 8.5 Q31 16 27 24', '#5b6573', 1.6)],
  calendar: [R(4.5, 6, 23, 22.5, WHITE, 3), R(4.5, 6, 23, 6.5, RED, 3, 'f'), R(9, 3.5, 2.6, 5.5, DARK, 1), R(20.5, 3.5, 2.6, 5.5, DARK, 1), ...[[8, 15.5], [13.5, 15.5], [19, 15.5], [8, 21], [13.5, 21], [19, 21]].map(([x, y]) => R(x, y, 4, 3.5, '#cfd6de', .8, 'f')), R(19, 21, 4, 3.5, RED, .8, 'f')],
  clipboard: [R(5.5, 5, 21, 24, WOOD, 3), R(8.5, 9, 15, 17, WHITE, 1, 'f'), R(11.5, 2.5, 9, 5.5, GREY, 2), R(11, 13, 10, 1.8, '#b8c2cc', .8, 'f'), R(11, 17, 10, 1.8, '#b8c2cc', .8, 'f'), R(11, 21, 6, 1.8, '#b8c2cc', .8, 'f')],
  chart: [R(4, 4.5, 24, 23.5, WHITE, 3), R(8, 17, 4.2, 8, BLUE, 1, 'f'), R(14, 10.5, 4.2, 14.5, GREEN, 1, 'f'), R(20, 14, 4.2, 11, RED, 1, 'f')],
  gift: [R(5, 13, 22, 15.5, RED, 2), R(4, 9, 24, 6, '#ff6b5b', 2), R(14, 9, 4, 19.5, GOLD, 0, 'f'), P('M16 9 Q9 2.5 8 6 Q7.5 9 16 9Z', GOLD), P('M16 9 Q23 2.5 24 6 Q24.5 9 16 9Z', GOLD)],
  party: [P('M3.5 28.5 L11 9.5 L22.5 21Z', YEL), P('M6 22 L9 14.5 L13.5 19 Z', '#ff8a3d', 'f'), P('M4.5 26 L6 22.5 L9.5 26Z', '#ff8a3d', 'f'), R(20, 4, 3, 3, RED, .6, 'd', 'rotate(20 21.5 5.5)'), R(25, 10, 3, 3, BLUE, .6, 'd', 'rotate(-20 26.5 11.5)'), C(27, 4.5, 1.6, GREEN, 'd'), C(15, 4.5, 1.4, PINK, 'd'), L('M17 12 Q20 7 24 8 M20 15 Q25 13 28 16', '#9a6ad6', 1.4)],
  balloon: [L('M16 22 Q13 26 16 30', '#5b6573', 1.2), E(16, 12, 8.5, 10, '#ff4f6d'), P('M14 21.5 L18 21.5 L16 24Z', '#ff4f6d'), E(12.5, 8.5, 2, 3, '#ffa3b3', 'f', 'rotate(25 12.5 8.5)')],
  slot: [S('M26.5 14 L29 6', GREY, 2), C(29, 5.5, 2.4, RED), R(4.5, 5.5, 22, 23, RED, 3), R(7.5, 10, 16, 9, WHITE, 1.5, 'f'), P(star(11, 14.5, 2.6, 1.1), GOLD, 'd'), P(star(16, 14.5, 2.6, 1.1), GOLD, 'd'), P(star(21, 14.5, 2.6, 1.1), GOLD, 'd'), R(9, 22, 13, 3, '#b8402a', 1.5, 'f')],
  palette: [P('M16 3.5 Q29 3.5 29 15 Q29 21 23 21 Q20 21 20.5 24 Q21 28.5 15.5 28.5 Q3 28.5 3 16 Q3 3.5 16 3.5Z', '#f1d7a8'), C(10, 13, 2.4, RED, 'd'), C(15.5, 9, 2.4, YEL, 'd'), C(21.5, 10, 2.4, GREEN, 'd'), C(9.5, 20, 2.4, BLUE, 'd')],
  shirt: [P('M11 4.5 L3.5 10 L6.5 15.5 L10 13.5 L10 27.5 L22 27.5 L22 13.5 L25.5 15.5 L28.5 10 L21 4.5 Q16 9 11 4.5Z', BLUE), P('M12.5 5.5 Q16 8.5 19.5 5.5 L19 7.5 Q16 10 13 7.5Z', '#2f6fbf', 'f')],
  eyes: [E(10.5, 16, 5.5, 8, WHITE), E(21.5, 16, 5.5, 8, WHITE), C(12, 17.5, 2.4, INK, 'd'), C(23, 17.5, 2.4, INK, 'd')],
  people: [...mv(5, 1, [C(16, 9.5, 5, '#a9b6c4'), P('M7 27 Q7 16 16 16 Q25 16 25 27Z', '#a9b6c4')]), ...mv(-4, 2, [C(16, 9.5, 5, '#6b7b8c'), P('M7 27 Q7 16 16 16 Q25 16 25 27Z', '#6b7b8c')]).map(p => ({ ...p, f: 'a' }))],
  wave: [P('M8 18 L8 9 Q8 7 10 7 Q12 7 12 9 L12 15 L12 6 Q12 4 14 4 Q16 4 16 6 L16 14 L16 6.5 Q16 4.5 18 4.5 Q20 4.5 20 6.5 L20 15 L20 9 Q20 7 22 7 Q24 7 24 9 L24 20 Q24 28.5 16 28.5 Q10 28.5 7 23 L3.5 17 Q3 15 4.8 14.6 Q6.5 14.3 8 18Z', '#ffc9a0'), L('M26.5 5 Q29 8 28.5 11 M28 2.5 Q31.5 6 31 10', '#5b6573', 1.4)],
  walk: person(RED, [R(11.5, 25.5, 3.6, 4, DARK, 1), R(17, 25.5, 3.6, 4, DARK, 1)]),
  worker: person(ORANGE, [P('M7 10 Q7 2.5 16 2.5 Q25 2.5 25 10Z', YEL), R(5.5, 9, 21, 3, '#e0a800', 1.5)]),
  box: [R(5, 12, 16, 16, '#d9a35b', 1), P('M5 12 L11 6 L27 6 L21 12Z', '#e9c287'), P('M21 12 L27 6 L27 22 L21 28Z', '#b9803d'), R(11, 12, 4, 6, '#f2dbb0', 0, 'f')],
  truck: [R(2.5, 9.5, 17, 14, RED, 2), P('M19.5 13.5 L25.5 13.5 L29.5 18 L29.5 23.5 L19.5 23.5Z', YEL), R(21, 15, 4.5, 3.5, SKY, .8, 'f'), C(8.5, 24.5, 3.6, DARK), C(23.5, 24.5, 3.6, DARK), C(8.5, 24.5, 1.4, LIGHT, 'd'), C(23.5, 24.5, 1.4, LIGHT, 'd')],
  plus: [P('M12.5 4 L19.5 4 L19.5 12.5 L28 12.5 L28 19.5 L19.5 19.5 L19.5 28 L12.5 28 L12.5 19.5 L4 19.5 L4 12.5 L12.5 12.5Z', GREEN)],
  check: [R(3.5, 3.5, 25, 25, GREEN, 6.5), L('M9 16.5 L14 21.5 L23.5 10.5', WHITE, 3.6)],
  ban: [C(16, 16, 12.5, RED), C(16, 16, 8.4, WHITE, 'f'), R(5, 14, 22, 4.2, RED, 0, 'f', 'rotate(45 16 16)')],
  warn: [P('M16 3 Q17.5 3 18.5 4.8 L29.5 25 Q30.5 28 27.5 28 L4.5 28 Q1.5 28 2.5 25 L13.5 4.8 Q14.5 3 16 3Z', YEL), R(14.4, 10, 3.2, 10, INK, 1.6, 'd'), C(16, 23.6, 1.9, INK, 'd')],
  siren: [P('M7.5 24 L7.5 15 A8.5 8.5 0 0 1 24.5 15 L24.5 24Z', '#ff4d4f'), R(4.5, 23, 23, 5.5, '#5b6573', 2), E(13, 13.5, 2, 3.5, '#ffb3b3', 'f'), L('M16 2 L16 4.5 M5 6 L7 8 M27 6 L25 8', '#e8553a', 1.8)],
  exclaim: [R(12.6, 3.5, 6.8, 17, RED, 3.4), C(16, 25.5, 3.4, RED)],
  question: [S('M9.5 11 Q9.5 3.5 16.5 3.5 Q23.5 3.5 23 10 Q22.5 14.5 17 16.5 L17 19.5', BLUE, 4.6), C(17, 25.5, 3, BLUE)],
  hourglass: [P('M9 6 L23 6 Q23 13 17.6 16 Q23 19 23 26 L9 26 Q9 19 14.4 16 Q9 13 9 6Z', '#dff3ff'), P('M11 9.5 L21 9.5 Q20 13 16 15 Q12 13 11 9.5Z', GOLD, 'f'), P('M10.6 25 Q12 21 16 20 Q20 21 21.4 25Z', GOLD, 'f'), R(6.5, 2.5, 19, 4, BROWN, 1.5), R(6.5, 25.5, 19, 4, BROWN, 1.5)],
  timer: [R(13.5, 2.5, 5, 4, GREY, 1), C(16, 18, 11.5, BLUE), C(16, 18, 8.7, WHITE, 'f'), L('M16 18 L16 12 M16 18 L20 20', INK, 2)],
  zzz: [S('M3.5 12 L13.5 12 L3.5 24 L13.5 24', '#5aa9ff', 3.2), S('M17 6 L25 6 L17 15 L25 15', '#5aa9ff', 2.8), S('M24 19 L29 19 L24 25 L29 25', '#5aa9ff', 2.2)],
  wind: [S('M3 12 L19 12 Q25 12 25 7.5 Q25 3.5 21 4', '#9ad0ff', 3), S('M3 18.5 L25 18.5 Q30 18.5 29.5 23 Q29 27 25 26', '#9ad0ff', 3), S('M5 25 L14 25', '#9ad0ff', 3)],
  refresh: [S('M24.5 11 A10 10 0 0 0 6.5 13', GREEN, 3.2), P('M27.5 4.5 L27 14 L18.5 11.5Z', GREEN), S('M7.5 21 A10 10 0 0 0 25.5 19', GREEN, 3.2), P('M4.5 27.5 L5 18 L13.5 20.5Z', GREEN)],
  swap: [S('M7 16 L25 16', BLUE, 3.4), P('M2.5 16 L10 9 L10 23Z', BLUE), P('M29.5 16 L22 9 L22 23Z', BLUE)],
  full: [S('M4 11 L4 4 L11 4 M21 4 L28 4 L28 11 M28 21 L28 28 L21 28 M11 28 L4 28 L4 21', DARK, 3.2)],
  win: [R(9.5, 4, 18.5, 15, LIGHT, 2), R(4, 12, 18.5, 15.5, WHITE, 2), R(4, 12, 18.5, 4, BLUE, 2, 'f')],
  sun: [...Array.from({ length: 8 }, (_, i) => S(`M${16 + Math.cos(i * .785) * 10.5} ${16 + Math.sin(i * .785) * 10.5} L${16 + Math.cos(i * .785) * 14} ${16 + Math.sin(i * .785) * 14}`, ORANGE, 2.2)), C(16, 16, 7.5, YEL), E(13.5, 13.5, 2.4, 1.6, '#fff6c8', 'f', 'rotate(-35 13.5 13.5)')],
  blast: [P('M16 2 L19 10 L27 6 L23 13.5 L30 16 L23 18.5 L27 26 L19 22 L16 30 L13 22 L5 26 L9 18.5 L2 16 L9 13.5 L5 6 L13 10Z', ORANGE), P('M16 8 L18 13 L23 12 L20 16 L23 20 L18 19 L16 24 L14 19 L9 20 L12 16 L9 12 L14 13Z', YEL, 'f')],
  rain: [E(16, 11, 11, 7, '#c9d6e6'), C(10, 12, 5, '#c9d6e6'), C(21, 10, 6, '#dfe8f2'), S('M9 21 L7 27', '#5aa0f0', 2.6), S('M16 21 L14 28', '#5aa0f0', 2.6), S('M23 21 L21 27', '#5aa0f0', 2.6)],
  snow: [S('M16 3 L16 29', '#8fd3ff', 3.2), S('M4.7 9.5 L27.3 22.5', '#8fd3ff', 3.2), S('M4.7 22.5 L27.3 9.5', '#8fd3ff', 3.2), C(16, 16, 4, WHITE)],
  bolt: [P('M18.5 2 L7 18 L14.5 18 L12 30 L25 12.5 L17.5 12.5 L21 2Z', YEL), P('M18 5 L11.5 15.5 L15.5 15.5Z', '#fff6c8', 'f')],
  meteor: [S('M4 4 L15 15', ORANGE, 4), S('M9 2.5 L17 11', '#ffd34d', 2.6), S('M2.5 9 L11 17', '#ffd34d', 2.6), C(20, 20, 8.5, '#8a6a52'), C(17.5, 17.5, 2.4, '#6b4f3c', 'f'), C(23, 22.5, 1.8, '#6b4f3c', 'f')],
  moon: [P('M19 3.5 A12.5 12.5 0 1 0 28.5 22 A10 10 0 1 1 19 3.5Z', YEL), C(12, 17, 1.6, '#f2b52a', 'f'), C(16, 23, 1.2, '#f2b52a', 'f')],
  phone: [R(8.5, 2.5, 15, 27, DARK, 3.5), R(10.5, 6, 11, 18.5, SKY, 1, 'f'), C(16, 27, 1.2, LIGHT, 'd')],
  pc: [R(5.5, 5, 21, 15, DARK, 2), R(7.5, 7, 17, 11, SKY, 1, 'f'), P('M2.5 21.5 L29.5 21.5 L27 26.5 L5 26.5Z', GREY)],
  chat: [P('M5.5 5.5 L26.5 5.5 Q29 5.5 29 8 L29 19.5 Q29 22 26.5 22 L14 22 L7.5 27.5 L8.8 22 L5.5 22 Q3 22 3 19.5 L3 8 Q3 5.5 5.5 5.5Z', WHITE), C(10, 14, 1.7, '#8a96a3', 'd'), C(16, 14, 1.7, '#8a96a3', 'd'), C(22, 14, 1.7, '#8a96a3', 'd')],
  live: [C(16, 16, 9.5, '#ff3b3b'), C(13, 13, 2.6, '#ff9a9a', 'f')],
  tv: [S('M11 3.5 L16 8.5 L21 3.5', DARK, 2.2), R(3.5, 8, 25, 18, DARK, 4), R(6.5, 11, 15.5, 12, SKY, 2.5, 'f'), P('M8.5 20 Q12 14 15.5 18 L19 15 L20 21Z', '#c9ecff', 'f'), C(25, 14, 1.6, RED, 'f'), C(25, 19.5, 1.6, GOLD, 'f'), R(8, 26, 3, 2.5, DARK, 1), R(21, 26, 3, 2.5, DARK, 1)],
  target: [C(16, 16, 12.5, WHITE), C(16, 16, 9, RED, 'f'), C(16, 16, 5.5, WHITE, 'f'), C(16, 16, 2.5, RED, 'f'), S('M16 16 L27 5', BROWN, 2.4), P('M24 4 L28 4 L28 8Z', RED)],
  monitor: [R(3.5, 5, 25, 17, DARK, 2.5), R(6, 7.5, 20, 12, SKY, 1.5, 'f'), R(13.5, 22, 5, 4, GREY, 1), R(9, 26, 14, 2.5, DARK, 1.2)],
  paper: [R(4, 6, 24, 21, WHITE, 2.5), R(7, 9, 18, 4, DARK, 1, 'f'), R(7, 15.5, 8, 7.5, SKY, 1.2, 'f'), R(17, 15.5, 8, 1.8, GREY, .8, 'f'), R(17, 18.5, 8, 1.8, GREY, .8, 'f'), R(17, 21.5, 6, 1.8, GREY, .8, 'f')],
  thumb: [P('M11 14 L15.5 5 Q19 4.5 18.5 9 L17.5 13 L25.5 13 Q28.5 13 28 16.5 L26.5 25.5 Q26 28 23 28 L11 28Z', '#ffc9a0'), R(4, 13.5, 6.5, 14.5, BLUE, 1.5)],
  trophy: [P('M9 4 L23 4 L23 11 Q23 19 16 19.5 Q9 19 9 11Z', GOLD), S('M9 7 Q3.5 7 4.5 12 Q5.5 15.5 10 15.5 M23 7 Q28.5 7 27.5 12 Q26.5 15.5 22 15.5', GOLD2, 2.4), R(14, 19, 4, 4.5, GOLD2, .5), R(9.5, 23, 13, 5, BROWN, 1.5), P('M12.5 7 L14.5 7 L14 14 Q12.5 12 12.5 7Z', '#fff1b0', 'f')],
  gold1: medal(GOLD, GOLD2), gold2: medal('#d6dde5', '#aab4bf'), gold3: medal('#e09a5a', '#b9733a'),
  tube: [P('M11 4 L21 4 L21 22.5 A5 5 0 0 1 11 22.5Z', '#e9f6ff'), P('M11 14.5 L21 14.5 L21 22.5 A5 5 0 0 1 11 22.5Z', '#7be07b', 'f'), R(9, 2.5, 14, 3.6, '#e9f6ff', 1.5), C(14.5, 19, 1.3, '#c8f5c8', 'd'), C(17.5, 22.5, 1, '#c8f5c8', 'd')],
  angel: [...face(), S('M8.5 4.5 Q16 0.5 23.5 4.5 Q16 8.5 8.5 4.5Z', '#ffe27a', 1.8, 'a'), L('M9.5 16 Q11.5 13.5 13.5 16 M18.5 16 Q20.5 13.5 22.5 16', INK, 1.7), L('M11.5 20.5 Q16 24.5 20.5 20.5', INK, 1.7), E(9, 20, 1.8, 1.1, '#ff9aa8', 'd'), E(23, 20, 1.8, 1.1, '#ff9aa8', 'd')],
  rainbow: [S('M3.5 25 A12.5 12.5 0 0 1 28.5 25', '#ff5c5c', 3.2), S('M7 25 A9 9 0 0 1 25 25', GOLD, 3.2, 'f'), S('M10.4 25 A5.6 5.6 0 0 1 21.6 25', '#4fb35e', 3.2, 'f'), C(4.5, 26, 3.4, WHITE, 'a'), C(27.5, 26, 3.4, WHITE, 'a')],
  dizzy: [...face(), L('M9 11.5 L13.5 16 M13.5 11.5 L9 16 M18.5 11.5 L23 16 M23 11.5 L18.5 16', INK, 1.8), E(16, 22, 3, 2.2, '#8a3a2a', 'd')],
  cat: [P('M5 6.5 L12.5 11 L7 16Z', '#ffb76b'), P('M27 6.5 L19.5 11 L25 16Z', '#ffb76b'), C(16, 18, 11, '#ffb76b'), E(16, 22, 5, 3.4, '#ffe2bf', 'f'), C(11.5, 17, 1.5, INK, 'd'), C(20.5, 17, 1.5, INK, 'd'), P('M14.8 19.8 L17.2 19.8 L16 21.2Z', '#e8553a', 'd')],
  hide: [E(16, 16, 13, 8, WHITE), C(16, 16, 4.4, '#5b6573', 'f'), C(16, 16, 2, INK, 'f'), S('M5 27 L27 5', RED, 3, 'a')],
  smile: [...face(), E(11.5, 13.5, 1.6, 2.2, INK, 'd'), E(20.5, 13.5, 1.6, 2.2, INK, 'd'), P('M9.5 18.5 Q16 26 22.5 18.5Z', '#8a3a2a', 'd')],
  laugh: [...face(), L('M8.5 13.5 Q11 10.5 13.5 13.5 M18.5 13.5 Q21 10.5 23.5 13.5', INK, 1.8), P('M9 18 Q16 27 23 18Z', '#8a3a2a', 'd'), P('M6 14 Q2 17 4 21 Q6.5 19 6.5 15Z', '#7cc8ff', 'd'), P('M26 14 Q30 17 28 21 Q25.5 19 25.5 15Z', '#7cc8ff', 'd')],
  meh: [...face(), L('M9 14 L14 14 M18 14 L23 14 M11.5 21 L20.5 21', INK, 1.8)],
  wink: [...face(), E(11.5, 13.5, 1.6, 2.2, INK, 'd'), L('M18 14 Q20.5 11.5 23 14', INK, 1.8), L('M10.5 19.5 Q16 24.5 21.5 19.5', INK, 1.8)],
  person: person(),
  sad: [...face(), E(11.5, 14, 1.5, 2, INK, 'd'), E(20.5, 14, 1.5, 2, INK, 'd'), L('M11 22 Q16 18 21 22', INK, 1.8)],
};

// 이모지 → 그림 이름
export const EMOJI = {
  '🪙': 'coin', '🏷️': 'tag', '🏷': 'tag', '💰': 'money', '🪵': 'wood', '🪨': 'stone', '🐚': 'fishcoin', '🌻': 'farmcoin', '🌷': 'tulip', '📘': 'book', '📖': 'book', '⭐': 'star', '🎯': 'target', '🖥️': 'monitor', '🖥': 'monitor', '🌟': 'star', '✨': 'sparkle',
  '🗡️': 'sword', '🗡': 'sword', '⚔️': 'swords', '⚔': 'swords', '🏹': 'bow', '🪄': 'staff', '🛡️': 'shield', '🛡': 'shield', '⛑️': 'helmet', '⛑': 'helmet', '🧥': 'armor', '👢': 'boots', '👒': 'hat', '🎀': 'ribbon', '👑': 'crown',
  '🔨': 'hammer', '⚒️': 'hammer', '⚒': 'hammer', '🪓': 'axe', '⛏️': 'pick', '⛏': 'pick', '🔥': 'fire', '🔮': 'orb', '🌀': 'portal', '💪': 'muscle', '🏃': 'run', '🧠': 'brain', '🍀': 'clover',
  '❤️': 'heart', '❤': 'heart', '♥': 'heart', '💗': 'heartPink',
  '🏠': 'house', '🏚️': 'ruins', '🏚': 'ruins', '🏘️': 'town', '🏘': 'town', '🏛️': 'hall', '🏛': 'hall', '🏗️': 'build', '🏗': 'build', '⛲': 'fountain', '🌳': 'tree', '🌲': 'pine', '⛰️': 'mountain', '⛰': 'mountain', '🚪': 'door', '📍': 'pin', '🛋️': 'sofa', '🛋': 'sofa', '🪑': 'chair',
  '☕': 'coffee', '🥤': 'cup', '🧋': 'bubbletea', '🍹': 'cocktail', '🥬': 'lettuce', '🥕': 'carrot', '🥔': 'potato', '🌽': 'corn', '🌶️': 'pepper', '🌶': 'pepper', '🍓': 'strawberry', '🍉': 'watermelon',
  '🌱': 'sprout', '🌾': 'wheat', '💧': 'drop', '🚿': 'can', '🧺': 'basket', '🟫': 'soil',
  '🐟': 'fish', '🐠': 'tropical', '🐡': 'blowfish', '🦀': 'crab', '🐙': 'octopus', '🐢': 'turtle', '🐍': 'snake', '🦈': 'shark', '🦐': 'shrimp', '🐉': 'dragon', '🐋': 'whale',
  '🎣': 'rod', '🪝': 'hook', '🪱': 'worm', '📏': 'ruler',
  '⚙️': 'gear', '⚙': 'gear', '✏️': 'pencil', '✏': 'pencil', '🔑': 'key', '🧾': 'receipt', '🔒': 'lock', '🔍': 'search', '🔎': 'search', '📢': 'speaker', '📣': 'speaker', '📅': 'calendar', '📋': 'clipboard', '📊': 'chart',
  '🎁': 'gift', '🎉': 'party', '🎈': 'balloon', '🎰': 'slot', '🎨': 'palette', '👕': 'shirt', '👀': 'eyes', '👥': 'people', '👋': 'wave', '🚶': 'walk', '👷': 'worker', '📦': 'box', '🚚': 'truck',
  '➕': 'plus', '✅': 'check', '🚫': 'ban', '⚠️': 'warn', '⚠': 'warn', '🚨': 'siren', '❗': 'exclaim', '❓': 'question', '⏳': 'hourglass', '⏱️': 'timer', '⏱': 'timer', '💤': 'zzz', '💨': 'wind', '🔄': 'refresh',
  '↔️': 'swap', '↔': 'swap', '⛶': 'full', '🗗': 'win', '🌙': 'moon', '💥': 'blast', '🌧️': 'rain', '🌧': 'rain', '❄️': 'snow', '❄': 'snow', '⚡': 'bolt', '☄️': 'meteor', '☄': 'meteor', '☀️': 'sun', '☀': 'sun', '📱': 'phone', '💻': 'pc', '💬': 'chat', '🔴': 'live', '📺': 'tv', '📰': 'paper', '👍': 'thumb', '🏆': 'trophy', '🥇': 'gold1', '🥈': 'gold2', '🥉': 'gold3',
  '🧪': 'tube', '😇': 'angel', '🌈': 'rainbow', '😵': 'dizzy', '🐱': 'cat', '🙈': 'hide', '😀': 'smile', '😂': 'laugh', '😑': 'meh', '😉': 'wink', '😢': 'sad',
};

// SVG 글 만들기
const attrs = o => Object.entries(o).map(([k, v]) => `${k}="${typeof v === 'number' ? +v.toFixed(2) : v}"`).join(' ');
const OUT = 3.4;   // 바깥 테두리 두께 (32칸 기준)
function el(p, mode) {
  const a = attrs(p.a);
  if (p.w) {   // 선 모양
    if (mode === 'out') return `<path ${a} fill="none" stroke="${INK}" stroke-width="${p.w + OUT}" stroke-linecap="round" stroke-linejoin="round"/>`;
    return `<path ${a} fill="none" stroke="${p.c}" stroke-width="${p.w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (mode === 'out') return `<${p.t} ${a} fill="${INK}" stroke="${INK}" stroke-width="${OUT}" stroke-linejoin="round"/>`;
  return `<${p.t} ${a} fill="${p.c}"/>`;
}
// flat: 바깥 검은 테두리 없이 색 면만 (마을 그림과 같은 선 없는 모양, 2026-11-16 텃밭 작물)
export function iconSvg(key, flat = false) {
  const parts = ICONS[key]; if (!parts) return '';
  const base = parts.filter(p => p.f === '' || p.f === 'f'), over = parts.filter(p => p.f === 'a'), deco = parts.filter(p => p.f === 'd');
  const layer = ps => (flat ? '' : ps.filter(p => p.f !== 'f').map(p => el(p, 'out')).join('')) + ps.map(p => el(p, 'in')).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 34 34">${layer(base)}${over.length ? layer(over) : ''}${deco.map(p => el(p, 'in')).join('')}</svg>`;
}
const URL_CACHE = {};
export const iconUrl = key => URL_CACHE[key] ||= 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(iconSvg(key));
export const ico = (key, cls = '') => ICONS[key] ? `<img class="ico ${cls}" src="${iconUrl(key)}" alt="" draggable="false">` : '';

// ── 캔버스용: 그림을 미리 불러 둠
const IMG = {};
export function icoImg(key) {
  if (!ICONS[key]) return null;
  if (!IMG[key]) { const im = new Image(); im.src = iconUrl(key); IMG[key] = im; }
  return IMG[key].complete && IMG[key].naturalWidth ? IMG[key] : null;
}
const IMG_F = {};
export function icoImgFlat(key) {
  if (!ICONS[key]) return null;
  if (!IMG_F[key]) { const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(iconSvg(key, true)); IMG_F[key] = im; }
  return IMG_F[key].complete && IMG_F[key].naturalWidth ? IMG_F[key] : null;
}
export function preloadIcons() { for (const k of Object.keys(ICONS)) icoImg(k); }
// 이모지 글자 찾기 (이모지 다음의 FE0F, 피부색 등 포함)
export const EMOJI_RE = /(\p{Extended_Pictographic}|[↔⛶])(️|‍\p{Extended_Pictographic}️?)*/gu;
const keyOf = e => EMOJI[e] || EMOJI[e.replace(/️/g, '')];
export const emojiKey = keyOf;
// 그림 하나 그리기 (가운데 기준)
export function drawIco(ctx, key, x, y, size) { const im = icoImg(key); if (im) ctx.drawImage(im, x - size / 2, y - size / 2, size, size); return !!im; }
// 글 속 이모지를 그림으로 바꿔 그리기. ctx.font·textAlign·textBaseline·fillStyle을 그대로 씀. stroke: 테두리 글자도 그릴 때
export function fillTextIco(ctx, text, x, y, stroke = false) {
  text = String(text);
  if (!EMOJI_RE.test(text)) { EMOJI_RE.lastIndex = 0; if (stroke) ctx.strokeText(text, x, y); ctx.fillText(text, x, y); return; }
  EMOJI_RE.lastIndex = 0;
  const size = (parseFloat((ctx.font.match(/(\d+(?:\.\d+)?)px/) || [])[1]) || 14) * 1.15, segs = []; let last = 0, m;
  while ((m = EMOJI_RE.exec(text))) { if (m.index > last) segs.push({ t: text.slice(last, m.index) }); const k = keyOf(m[0]); segs.push(k ? { k } : { t: m[0] }); last = m.index + m[0].length; }
  if (last < text.length) segs.push({ t: text.slice(last) });
  for (const s of segs) s.w = s.k ? size + 1 : ctx.measureText(s.t).width;
  const total = segs.reduce((a, s) => a + s.w, 0), al = ctx.textAlign;
  let cx = al === 'center' ? x - total / 2 : al === 'right' || al === 'end' ? x - total : x;
  const bl = ctx.textBaseline, iy = bl === 'middle' ? y : bl === 'top' ? y + size / 2 : y - size * .38;
  ctx.textAlign = 'left';
  for (const s of segs) {
    if (s.k) { if (!drawIco(ctx, s.k, cx + s.w / 2, iy, size)) ctx.fillText(text.slice(0, 0), cx, y); }
    else { if (stroke) ctx.strokeText(s.t, cx, y); ctx.fillText(s.t, cx, y); }
    cx += s.w;
  }
  ctx.textAlign = al;
}
export function measureTextIco(ctx, text) {
  text = String(text); const size = (parseFloat((ctx.font.match(/(\d+(?:\.\d+)?)px/) || [])[1]) || 14) * 1.15;
  let w = 0, last = 0, m; EMOJI_RE.lastIndex = 0;
  while ((m = EMOJI_RE.exec(text))) { w += ctx.measureText(text.slice(last, m.index)).width + (keyOf(m[0]) ? size + 1 : ctx.measureText(m[0]).width); last = m.index + m[0].length; }
  return w + ctx.measureText(text.slice(last)).width;
}

// ── 화면(DOM): 글자 속 이모지를 자동으로 그림으로
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'OPTION', 'SELECT', 'TITLE', 'CANVAS', 'NOSCRIPT']);
function fixText(node) {
  const s = node.nodeValue; if (!s || !EMOJI_RE.test(s)) { EMOJI_RE.lastIndex = 0; return; }
  EMOJI_RE.lastIndex = 0;
  const p = node.parentNode; if (!p || SKIP.has(p.nodeName) || p.closest?.('[data-noico]')) return;
  const frag = document.createDocumentFragment(); let last = 0, m, any = false;
  while ((m = EMOJI_RE.exec(s))) {
    const k = keyOf(m[0]); if (!k) continue;
    if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
    const im = document.createElement('img'); im.className = 'ico'; im.src = iconUrl(k); im.alt = m[0]; im.draggable = false; frag.appendChild(im);
    last = m.index + m[0].length; any = true;
  }
  if (!any) return;
  if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
  p.replaceChild(frag, node);
}
function walk(root) {
  if (root.nodeType === 3) return fixText(root);
  if (root.nodeType !== 1 || SKIP.has(root.nodeName)) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = []; let n;
  while ((n = w.nextNode())) list.push(n);
  for (const t of list) fixText(t);
}
export function iconize(root = document.body) {
  walk(root);
  new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') fixText(m.target); else for (const n of m.addedNodes) walk(n); } })
    .observe(root, { childList: true, subtree: true, characterData: true });
}
