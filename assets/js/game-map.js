// 치복 타운 마을 지도 — 화면(game.html)과 서버(game-worker)가 같이 씀
// 삼각함수(sin·cos) 없이 정수 계산 + 곱셈·제곱근만으로 만들어서, 어느 브라우저·서버에서나 똑같은 지도가 나와요.
// 지도를 바꾸면 화면과 서버가 함께 바뀌어요 (집 자리 검사도 이 지도로 함).
const T = 32, MW = 80, MH = 72;   // game-rules.js 의 T · MW · MH 와 꼭 같게 (화면이 규칙 파일을 두 번 불러오지 않게 여기 따로 적음)
// 예전 지도 높이. 1)~7)은 이 높이로 똑같이 만들어서 나무·돌·건물 자리와 자원 번호가 그대로 (8)에서 아래에 바다를 붙임)
const OMH = 60;
let LIM = OMH;   // 만드는 동안은 예전 높이까지만 지도로 봄 (8)에서 MH로)

export const G = 0, PATH = 1, WATER = 2, STONE = 3, SOIL = 4, DOCK = 5, SAND = 6, GRAVEL = 7, FOREST = 8;
export const tiles = new Uint8Array(MW * MH);      // 바닥 종류
export const solid = new Uint8Array(MW * MH);      // 못 지나가는 칸 (물·건물·나무·바위·벤치)
export const tileAt = (x, y) => (x < 0 || y < 0 || x >= MW || y >= LIM ? WATER : tiles[y * MW + x]);
export const isSolid = (x, y) => x < 0 || y < 0 || x >= MW || y >= LIM || solid[y * MW + x] === 1;
const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < MW && y < LIM) tiles[y * MW + x] = v; };
const block = (x, y) => { if (x >= 0 && y >= 0 && x < MW && y < LIM) solid[y * MW + x] = 1; };

// ───── 똑같이 나오는 난수 · 잡음 ─────
function rng(s) { return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const h1 = (i, s) => { let x = Math.imul(i ^ Math.imul(s, 0x9E3779B1), 0x27d4eb2d); x ^= x >>> 15; x = Math.imul(x, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296 * 2 - 1; };
const sm = f => f * f * (3 - 2 * f);
const n1 = (v, s) => { const i = Math.floor(v), u = sm(v - i); return h1(i, s) * (1 - u) + h1(i + 1, s) * u; };
const h2 = (i, j, s) => h1(Math.imul(i, 73856093) ^ Math.imul(j, 19349663), s);
const n2 = (x, y, s) => { const i = Math.floor(x), j = Math.floor(y), u = sm(x - i), v = sm(y - j); return (h2(i, j, s) * (1 - u) + h2(i + 1, j, s) * u) * (1 - v) + (h2(i, j + 1, s) * (1 - u) + h2(i + 1, j + 1, s) * u) * v; };
export const noise2 = n2;

// ───── 지역 ─────
export const PLAZA = { x: 40, y: 31 };                     // 광장 한가운데 (분수)
export const PLAZA_C = { x: 40, y: 31.3 }, PLAZA_R = 7.4;   // 분수 그림의 가운데와 같게   // 둥근 광장 (칸 단위 가운데·반지름)
// 핵심 구역 (집을 지을 수 없는 곳): 광장 둘레 타원
export const inCore = (x, y) => ((x + .5 - 40) / 18) ** 2 + ((y + .5 - 31) / 15) ** 2 < 1;
const forestZ = (x, y) => ((x + .5 - 21) / 14) ** 2 + ((y + .5 - 9) / 8) ** 2 + .28 * n2(x / 5, y / 5, 3) < 1;
const quarryZ = (x, y) => ((x + .5 - 64) / 13) ** 2 + ((y + .5 - 9) / 7.5) ** 2 + .28 * n2(x / 5, y / 5, 4) < 1;
// 강: 위에서 아래로 굽이쳐 흐름
export const riverX = y => 9 + 3.4 * n1(y / 11, 5) + 1.2 * n1(y / 4.3, 6);
const riverHalf = y => 1.7 + .5 * n1(y / 7, 9);

// 1) 바닥
for (let y = 0; y < OMH; y++) for (let x = 0; x < MW; x++) {
  if (forestZ(x, y)) set(x, y, FOREST);
  else if (quarryZ(x, y)) set(x, y, GRAVEL);
  const d = Math.abs(x + .5 - riverX(y)), hw = riverHalf(y);
  if (d < hw) set(x, y, WATER); else if (d < hw + 1.05) set(x, y, SAND);
  // 연못 (강 옆)
  const pd = Math.sqrt(((x + .5 - 17) / 5.6) ** 2 + ((y + .5 - 47) / 4.4) ** 2) + .22 * n2(x / 3, y / 3, 7);
  if (pd < 1) set(x, y, WATER); else if (pd < 1.22 && tileAt(x, y) !== WATER) set(x, y, SAND);
  // 광장
  const qd = Math.sqrt((x + .5 - 40.5) ** 2 + ((y + .5 - 31.5) * 1.18) ** 2) + 1.1 * n2(x / 3.2, y / 3.2, 8);
  if (qd < 7.2) set(x, y, STONE);   // (예전 모양 — 아래 6)에서 둥글게 바꿈)
}
// 텃밭 (반듯한 밭)
for (let y = 45; y <= 50; y++) for (let x = 51; x <= 60; x++) set(x, y, SOIL);

// 2) 꼬불꼬불한 길 (2차 곡선을 따라 둥글게 찍음)
const ROADS = [];
function road(pts, r0 = 1.05, s = 1) {
  ROADS.push([pts, r0, s]);
  for (let k = 0; k + 2 < pts.length; k += 2) {
    const [a, b, c] = [pts[k], pts[k + 1], pts[k + 2]];
    for (let i = 0; i <= 70; i++) {
      const t = i / 70, u = 1 - t, px = u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], py = u * u * a[1] + 2 * u * t * b[1] + t * t * c[1];
      const r = r0 + .32 * n1((k * 70 + i) / 9, s), R = Math.ceil(r);
      for (let y = Math.floor(py) - R; y <= Math.floor(py) + R; y++) for (let x = Math.floor(px) - R; x <= Math.floor(px) + R; x++) {
        if ((x + .5 - px) ** 2 + (y + .5 - py) ** 2 > r * r) continue;
        const v = tileAt(x, y); if (v === G || v === FOREST || v === GRAVEL || v === SAND) set(x, y, PATH);
      }
    }
  }
}
const DOCK_Y = 29, dockBank = Math.ceil(riverX(DOCK_Y) + riverHalf(DOCK_Y));
road([[34, 31], [26, 26.5], [dockBank + 1, 29.5]], 1.1, 11);           // 서쪽: 강가 선착장
road([[36, 26], [30, 18], [25, 15.5]], 1.05, 12);                     // 북서: 벌목소
road([[45, 26], [53, 17], [63, 15.5]], 1.05, 13);                     // 북동: 채석장
road([[47, 32], [61, 36], [75, 32]], 1.15, 14);                       // 동쪽: 사냥터 포탈
road([[45, 36], [49, 44], [57, 43.5]], 1.05, 15);                     // 남동: 텃밭
road([[40, 37], [36, 47], [41, 58.5]], 1.05, 16);                     // 남쪽: 집 동네
road([[34, 35], [27, 44], [26, 55]], 1, 17);                          // 남서
road([[25, 15.5], [24, 6], [30, 2]], .9, 18);                         // 숲 속 오솔길
road([[63, 15.5], [70, 22], [77, 22]], .9, 19);                       // 동쪽 언덕길
road([[40, 24], [40, 25], [40, 26]], 1, 20);                          // 가챠센터 앞
road([[29, 27], [31, 29], [34, 30]], .9, 21); road([[51, 27], [48, 29], [46, 30]], .9, 22);
road([[29, 43], [32, 40], [35, 37]], .9, 23); road([[51, 43], [48, 40], [45, 37]], .9, 24);
// 선착장: 강 위로 나무 다리
for (let y = DOCK_Y; y <= DOCK_Y + 1; y++) for (let x = Math.floor(riverX(y)) - 1; x < dockBank; x++) set(x, y, DOCK);

// 3) 건물 (칸 위치 x,y,w,h — 그림은 칸 위로 지붕이 올라감). 문은 아래쪽 가운데
export const BUILDINGS = [
  { id: 'gacha', name: '가챠센터', icon: '🎰', x: 36, y: 19, w: 8, h: 5 },
  { id: 'cafe', name: '카페', icon: '☕', x: 26, y: 23, w: 6, h: 4 },
  { id: 'skin', name: '스킨샵', icon: '👕', x: 49, y: 23, w: 5, h: 4 },
  { id: 'hall', name: '마을회관', icon: '🏛️', x: 26, y: 38, w: 6, h: 5 },
  { id: 'smith', name: '대장간', icon: '🔨', x: 48, y: 38, w: 6, h: 5 },
  { id: 'fishshop', name: '낚시점', icon: '🎣', x: dockBank + 2, y: DOCK_Y - 4, w: 3, h: 3 },
  { id: 'lumber', name: '벌목소', icon: '🪓', x: 22, y: 11, w: 5, h: 4 },
  { id: 'quarry', name: '채석장', icon: '⛏️', x: 61, y: 11, w: 5, h: 4 },
  { id: 'farmshed', name: '텃밭 창고', icon: '🧺', x: 62, y: 44, w: 4, h: 3 },
];
for (const b of BUILDINGS) { b.door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h }; for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) block(x, y); if (tileAt(b.door.x, b.door.y) !== WATER) set(b.door.x, b.door.y, PATH); }
// 누르는 곳 (건물이 아닌 장소)
export const SPOTS = [
  { id: 'fountain', name: '소원 분수', icon: '⛲', x: 39, y: 30, w: 2, h: 2 },
  { id: 'board', name: '광장 전광판', icon: '📣', x: 37, y: 36, w: 6, h: 1 },
  { id: 'river', name: '강가 선착장', icon: '🎣', x: Math.floor(riverX(DOCK_Y)) - 1, y: DOCK_Y, w: dockBank - Math.floor(riverX(DOCK_Y)) + 1, h: 2, walk: true },
  { id: 'farm', name: '텃밭', icon: '🌾', x: 51, y: 45, w: 10, h: 6, walk: true },
];
for (const s of SPOTS) if (!s.walk) for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) block(x, y);
export const PORTAL = { x: 76 * T, y: 32.6 * T };            // 사냥터 포탈 (발 위치, 픽셀)
export const BACK = { x: 73.5 * T, y: 32.5 * T };            // 사냥에서 돌아오면 서는 곳
export const FISH_AT = { x: (Math.floor(riverX(DOCK_Y)) + .3) * T, y: (DOCK_Y + 1) * T };   // 낚시하는 자리
// 텃밭 칸 9개 (3줄 × 3칸, 픽셀 가운데)
// 2026-11-18 텃밭 그림(333×157px, 가운데 (56, 48)칸)의 1·3·5번째 고랑에 3칸씩
export const PLOTS = Array.from({ length: 9 }, (_, i) => ({ x: (52.9 + (i % 3) * 3.1) * T, y: [46.48, 48.11, 49.58][Math.floor(i / 3)] * T }));   // 2026-11-18 텃밭 그림 세로 1.08배에 맞춤
// 벤치 (광장 가장자리)
export const BENCHES = [{ x: 35, y: 28 }, { x: 45, y: 28 }, { x: 34, y: 33 }, { x: 46, y: 33 }, { x: 36, y: 25 }, { x: 44, y: 25 }];
for (const b of BENCHES) { set(b.x, b.y, STONE); block(b.x, b.y); }
for (let y = 29; y <= 32; y++) for (let x = 38; x <= 41; x++) if (tileAt(x, y) !== STONE) set(x, y, STONE);
for (let y = 30; y <= 31; y++) for (let x = 39; x <= 40; x++) block(x, y);
// 물은 못 들어감
for (let i = 0; i < MW * OMH; i++) if (tiles[i] === WATER) solid[i] = 1;

// 4) 채집 자원 (나무·바위). 사람마다 따로 자라요. 항상 막힌 칸 (베면 그루터기·돌무더기)
const R = rng(20261116);
const near = (list, x, y, d) => list.some(p => Math.abs(p.x - x) < d && Math.abs(p.y - y) < d);
const freeFor = (x, y) => !isSolid(x, y) && !isSolid(x, y + 1) && tileAt(x, y + 1) !== PATH && ![PATH, WATER, DOCK, STONE, SOIL].includes(tileAt(x, y))
  && !BUILDINGS.some(b => x >= b.x - 1 && x <= b.x + b.w && y >= b.y - 2 && y <= b.y + b.h + 1);
export const NODES = [];
function addNodes(k, n, test, gap) {
  for (let tries = 0; tries < 4000 && n > 0; tries++) {
    const x = 1 + Math.floor(R() * (MW - 2)), y = 1 + Math.floor(R() * (OMH - 2));
    if (!test(x, y) || !freeFor(x, y) || near(NODES, x, y, gap)) continue;
    NODES.push({ i: NODES.length, k, x, y }); block(x, y); n--;
  }
}
addNodes('tree', 26, (x, y) => tileAt(x, y) === FOREST, 2.5);
addNodes('rock', 20, (x, y) => tileAt(x, y) === GRAVEL, 2.5);
addNodes('tree', 8, (x, y) => tileAt(x, y) === G && !inCore(x, y), 5);
addNodes('rock', 5, (x, y) => tileAt(x, y) === G && !inCore(x, y), 5);

// 5) 나머지 나무·돌. 지도 가장자리(2칸)는 꾸밈(못 캠), 그 안쪽은 모두 캘 수 있는 자원 (v = 그림 종류, s = 크기)
//    번호(i)는 위의 자원 뒤로 이어 붙여서, 예전 자원 번호는 그대로
export const DECO = [];
for (let y = 0; y < OMH; y++) for (let x = 0; x < MW; x++) {
  const v = tileAt(x, y), edge = Math.min(x, y, MW - 1 - x, OMH - 1 - y);
  if (v !== G && v !== FOREST && v !== GRAVEL) continue;
  const p = edge < 2 ? .7 : v === FOREST ? .2 : v === GRAVEL ? .06 : inCore(x, y) ? .015 : .035;
  const r = R(), r2 = R();
  if (r >= p || !freeFor(x, y) || near(DECO, x, y, edge < 2 ? 1 : 2) || near(NODES, x, y, 2)) continue;
  let k = v === GRAVEL ? 'stone' : r2 < (v === FOREST ? .55 : .25) ? 'pine' : 'round';
  // 둥근 나무 일부를 자작나무·벚나무·단풍나무로 (좌표로 정해서 난수 순서는 그대로 → 자원·집 자리 안 바뀜)
  if (k === 'round') k = ['round', 'round', 'birch', 'cherry', 'maple'][(x * 7 + y * 13) % 5];
  if (v === G && (x * 11 + y * 17) % 5 === 0) k = 'stone';   // 풀밭에도 돌
  const d = { x, y, k, s: .85 + R() * .35 }; block(x, y);
  if (edge < 2) DECO.push(d); else NODES.push({ i: NODES.length, k: d.k === 'stone' ? 'rock' : 'tree', x, y, v: d.k, s: d.s });
}

// 6) 둥근 광장: 원 안은 돌바닥, 예전 울퉁불퉁한 가장자리는 풀밭으로 → 그 자리를 지나던 길은 다시 이어 줌
{
  const inP = (x, y) => Math.hypot(x + .5 - PLAZA_C.x, y + .5 - PLAZA_C.y) < PLAZA_R;
  for (let y = 0; y < OMH; y++) for (let x = 0; x < MW; x++) {
    const v = tileAt(x, y);
    if (inP(x, y)) { if (v === G || v === PATH) set(x, y, STONE); }
    else if (v === STONE && !BENCHES.some(b => b.x === x && b.y === y)) set(x, y, G);
  }
  ROADS.splice(0).forEach(([p, r, k]) => road(p, r, k)); ROADS.length = 0;
  for (const b of BUILDINGS) if (tileAt(b.door.x, b.door.y) === G) set(b.door.x, b.door.y, PATH);
}

// 7) 가챠센터는 광장 서쪽(카페·마을회관 사이)으로 옮기고, 원래 자리(광장 북쪽)에는 큰 전광판
//    (나무·돌 자리와 자원 번호가 안 바뀌게 자원을 다 놓은 뒤에 옮김)
{
  const g = BUILDINGS.find(b => b.id === 'gacha');
  for (let y = g.y; y < g.y + g.h; y++) for (let x = g.x; x < g.x + g.w; x++) solid[y * MW + x] = 0;
  g.x = 23; g.y = 30; g.door = { x: g.x + Math.floor(g.w / 2), y: g.y + g.h };
  for (let y = g.y; y < g.y + g.h; y++) for (let x = g.x; x < g.x + g.w; x++) block(x, y);
  set(g.door.x, g.door.y, PATH);
  road([[27, 35.6], [29.5, 36.7], [32.6, 36.2]], .95, 25);              // 가챠센터 문 → 광장 남서쪽 길
  const sc = { id: 'screen', name: '광장 대형 전광판', icon: '📺', x: 35, y: 22, w: 10, h: 2 };
  SPOTS.push(sc); for (let y = sc.y; y < sc.y + sc.h; y++) for (let x = sc.x; x < sc.x + sc.w; x++) block(x, y);
  const bi = SPOTS.findIndex(s => s.id === 'board');   // 작은 광장 전광판은 없앰 (큰 전광판이 대신함)
  if (bi >= 0) { const s = SPOTS[bi]; for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) solid[y * MW + x] = 0; SPOTS.splice(bi, 1); }
  // 벤치: 광장 가장자리 6개 → 전광판 앞 4×2 (가운데는 지나다니는 길). 다 지은 뒤에 옮겨서 나무·돌 번호는 그대로
  for (const b of BENCHES) solid[b.y * MW + b.x] = 0;
  BENCHES.splice(0, BENCHES.length, ...[25, 27].flatMap(y => [36, 38, 41, 43].map(x => ({ x, y }))));
  for (const b of BENCHES) { set(b.x, b.y, STONE); block(b.x, b.y); }
}

// 8) 남쪽 바다 (2026-11-16): 지도를 아래로 12칸 넓히고, 굽이진 해안선 + 모래사장. 강은 그대로 흘러 내려가 하구에서 넓어지며 바다와 만남
//    예전 지도(위 1~7)는 그대로라 나무·돌·건물·집 자리와 자원 번호가 안 바뀜. 바뀌는 곳은 맨 아래 꾸밈 나무 줄(58~59)뿐
const COAST_NONE = 3, COAST_FADE = 13;
const bump = (x, c, w) => Math.max(0, 1 - ((x - c) / w) ** 2);
// 해안선 (칸 단위 y). 이 아래는 바다. 동쪽에 오목한 만, 강 하구 쪽은 조금 들어감
export const coastY = x => 62 + 1.7 * n1(x / 10, 51) + .8 * n1(x / 4.1, 52) - 1.6 * bump(x, 50, 11) - .9 * bump(x, 12, 6);
const beachTop = x => Math.max(59, coastY(x) - 1.7 - .8 * n1(x / 6, 53));
export const SEA = new Uint8Array(MW * MH);   // 1 = 바다 (강·연못과 다른 물고기)
{
  LIM = MH;
  const nodeAt = (x, y) => NODES.some(n => n.x === x && n.y === y);
  // 바닷가로 가는 길 (남쪽 · 남서쪽 길을 이어 줌)
  road([[41, 58.5], [41.4, 60], [42, 61.5]], 1.0, 26);
  road([[26, 55], [25.2, 57.5], [24.6, 60.5]], .95, 27);
  for (let y = OMH - 2; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (nodeAt(x, y)) continue;   // 캘 수 있는 나무·돌은 그대로
    const c = coastY(x);
    // 강: 같은 식으로 계속 흐르고, 바다에 가까울수록 넓어짐 (하구)
    const wide = 1 + Math.max(0, y - (OMH - 1)) * .22, d = Math.abs(x + .5 - riverX(y)), hw = riverHalf(y) * wide;
    if (y + .5 >= c) { set(x, y, WATER); SEA[y * MW + x] = 1; }
    else if ((y >= OMH || tileAt(x, y) === WATER) && d < hw) set(x, y, WATER);   // 2026-11-16: 58~59줄 강물이 모래로 덮여 바다와 끊겼던 것 고침
    else if (y + .5 >= beachTop(x) || (y >= OMH && d < hw + 1.05)) { if (tileAt(x, y) !== PATH || y + .5 >= c - .6) set(x, y, SAND); }
    else if (y >= OMH) set(x, y, G);
  }
  // 바다와 이어진 강 하구 물도 바다 쪽 아래 절반은 바다로 (해안선보다 아래면 이미 바다)
  for (let i = MW * (OMH - 2); i < MW * MH; i++) solid[i] = tiles[i] === WATER ? 1 : 0;
  for (const n of NODES) block(n.x, n.y);
  // 해안에 가까울수록 나무·돌을 줄임: 해안선에서 COAST_NONE칸 안은 없음, COAST_FADE칸까지 점점 늘어남
  // (예전 지도 맨 아래 가장자리 나무 줄도 이걸로 사라짐)
  const keepAt = (x, y, salt) => { const dc = coastY(x + .5) - (y + .5); if (dc >= COAST_FADE) return true; if (dc < COAST_NONE) return false; return (h1(x * 31 + y * 7, salt) + 1) / 2 < (dc - COAST_NONE) / (COAST_FADE - COAST_NONE); };
  const unblock = (x, y) => { if (tileAt(x, y) !== WATER) solid[y * MW + x] = 0; };
  for (let k = DECO.length - 1; k >= 0; k--) {
    const d = DECO[k], v = tileAt(d.x, d.y);
    if ((v === G || v === FOREST || v === GRAVEL) && keepAt(d.x, d.y, 54)) block(d.x, d.y); else { DECO.splice(k, 1); unblock(d.x, d.y); }
  }
  // 캘 수 있는 나무·돌은 번호(i)가 저장돼 있어서 빼지 않고 off 표시만 (화면·서버가 건너뜀)
  for (const n of NODES) if (!keepAt(n.x, n.y, 58) || tileAt(n.x, n.y) === SAND || tileAt(n.x, n.y) === WATER) { n.off = true; unblock(n.x, n.y); }
}
// 9) 2026-11-16 가챠센터·마을회관 자리 옮김 (사용자 요청). 맨 마지막에 옮겨서 나무·돌 번호는 그대로
//    새 자리(둘레 1칸 포함)에 있던 꾸밈 나무는 빼고, 캘 수 있는 자원은 off
{
  const move = (id, nx, ny) => {
    const b = BUILDINGS.find(q => q.id === id);
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) solid[y * MW + x] = 0;
    b.x = nx; b.y = ny; b.door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h };
    const near = (x, y) => x >= b.x - 1 && x <= b.x + b.w && y >= b.y - 1 && y <= b.y + b.h;
    for (let k = DECO.length - 1; k >= 0; k--) { const d = DECO[k]; if (near(d.x, d.y)) { if (tileAt(d.x, d.y) !== WATER) solid[d.y * MW + d.x] = 0; DECO.splice(k, 1); } }
    for (const n of NODES) if (!n.off && near(n.x, n.y)) { n.off = true; if (tileAt(n.x, n.y) !== WATER) solid[n.y * MW + n.x] = 0; }
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) solid[y * MW + x] = 1;
    if (tileAt(b.door.x, b.door.y) !== WATER) { tiles[b.door.y * MW + b.door.x] = PATH; solid[b.door.y * MW + b.door.x] = 0; }
  };
  move('gacha', 21, 32);
  move('hall', 30, 41);
  road([[25, 37.4], [27.5, 38.2], [29.4, 39.4]], .95, 28);   // 가챠센터 문 → 남서쪽 길
  road([[33, 46.4], [35.5, 46], [37.2, 44.2]], .95, 29);     // 마을회관 문 → 남쪽 길
  for (let k = DECO.length - 1; k >= 0; k--) { const d = DECO[k]; if (d.x >= 22 && d.x <= 38 && d.y >= 36 && d.y <= 48 && tileAt(d.x, d.y) === PATH) { solid[d.y * MW + d.x] = 0; DECO.splice(k, 1); } }   // 새 길 위 나무 빼기
}
// 10) 2026-11-18 텃밭 그림이 가로로 길어서 밭 칸을 4줄(46~49)로 줄임. 맨 위·아래 줄은 풀밭
for (let x = 51; x <= 60; x++) { set(x, 45, G); set(x, 50, G); }
// 11) 2026-11-19: 무한의 탑(사냥터 포탈 위) · 김치볶음밥 전문점(스킨샵과 대장간 사이) 추가, 사냥터 포탈은 남쪽으로, 치복동 포탈(광장 남쪽)
//     맨 마지막에 놓아서 나무·돌 번호 그대로. 새 자리(둘레 1칸 포함)의 꾸밈 나무는 빼고, 캘 수 있는 자원은 off
{
  const clearAt = (x0, y0, x1, y1) => {
    for (let k = DECO.length - 1; k >= 0; k--) { const d = DECO[k]; if (d.x >= x0 && d.x <= x1 && d.y >= y0 && d.y <= y1) { if (tileAt(d.x, d.y) !== WATER) solid[d.y * MW + d.x] = 0; DECO.splice(k, 1); } }
    for (const n of NODES) if (!n.off && n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1) { n.off = true; if (tileAt(n.x, n.y) !== WATER) solid[n.y * MW + n.x] = 0; }
  };
  const add = b => {
    clearAt(b.x - 1, b.y - 1, b.x + b.w, b.y + b.h);
    b.door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h }; BUILDINGS.push(b);
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) block(x, y);
    set(b.door.x, b.door.y, PATH);
  };
  add({ id: 'tower', name: '무한의 탑', icon: '🗼', x: 69, y: 24, w: 4, h: 3, soon: 1 });
  add({ id: 'kfr', name: '김치볶음밥 전문점', icon: '🍳', x: 52, y: 29, w: 6, h: 4, soon: 1 });
  road([[71, 27.5], [71.5, 30], [72.5, 32.6]], .8, 30);                // 탑 문 → 동쪽 길
  // 사냥터 포탈: (76, 32.6) → (74, 37.6)
  PORTAL.x = 74 * T; PORTAL.y = 37.6 * T; BACK.x = 71.6 * T; BACK.y = 37.9 * T;
  clearAt(71, 35, 76, 39);
  road([[71, 34], [71.6, 36.6], [74, 38.3]], .95, 31);                 // 동쪽 길 → 새 포탈
  for (let y = 35; y <= 39; y++) for (let x = 70; x <= 76; x++) if (tileAt(x, y) !== WATER) solid[y * MW + x] = 0;
  clearAt(39, 45, 43, 48);
  for (let y = 45; y <= 48; y++) for (let x = 39; x <= 43; x++) if (tileAt(x, y) !== WATER) solid[y * MW + x] = 0;
}
// 12) 2026-11-20: 낚시 랭킹판 (낚시점 오른쪽 옆). 맨 마지막에 놓아서 나무·돌 번호 그대로
{
  const b = { id: 'fishrank', name: '낚시 랭킹판', icon: '🏆', x: 19, y: 25, w: 2, h: 2 };
  for (let k = DECO.length - 1; k >= 0; k--) { const d = DECO[k]; if (d.x >= b.x - 1 && d.x <= b.x + b.w && d.y >= b.y - 1 && d.y <= b.y + b.h) { if (tileAt(d.x, d.y) !== WATER) solid[d.y * MW + d.x] = 0; DECO.splice(k, 1); } }
  for (const n of NODES) if (!n.off && n.x >= b.x - 1 && n.x <= b.x + b.w && n.y >= b.y - 1 && n.y <= b.y + b.h) { n.off = true; if (tileAt(n.x, n.y) !== WATER) solid[n.y * MW + n.x] = 0; }
  b.door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h }; BUILDINGS.push(b);
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) block(x, y);
  set(b.door.x, b.door.y, PATH);
}
// 13) 2026-11-20: 도감 센터 (가챠센터 서쪽 풀밭, 사용자 요청으로 대장간 동쪽에서 옮김). 칭호·뱃지·물고기·스킨 도감. 맨 마지막에 놓아서 나무·돌 번호 그대로
{
  const b = { id: 'dex', name: '도감 센터', icon: '📚', x: 15, y: 35, w: 5, h: 4 };
  for (let k = DECO.length - 1; k >= 0; k--) { const d = DECO[k]; if (d.x >= b.x - 1 && d.x <= b.x + b.w && d.y >= b.y - 1 && d.y <= b.y + b.h + 1) { if (tileAt(d.x, d.y) !== WATER) solid[d.y * MW + d.x] = 0; DECO.splice(k, 1); } }
  for (const n of NODES) if (!n.off && n.x >= b.x - 1 && n.x <= b.x + b.w && n.y >= b.y - 1 && n.y <= b.y + b.h + 1) { n.off = true; if (tileAt(n.x, n.y) !== WATER) solid[n.y * MW + n.x] = 0; }
  b.door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h }; BUILDINGS.push(b);
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) block(x, y);
  set(b.door.x, b.door.y, PATH);
  road([[17.5, 39.6], [21.5, 39.4], [25, 37.6]], .85, 32);   // 문 → 가챠센터 앞 길
}
// 14) 2026-11-20: 대형 전광판 뒤(위쪽 2줄)에 사람이 못 서게 막음 (화면 그림에 가려 보이지 않던 자리)
{ const sc = SPOTS.find(s => s.id === 'screen'); if (sc) for (let y = sc.y - 2; y < sc.y; y++) for (let x = sc.x; x < sc.x + sc.w; x++) if (tileAt(x, y) !== WATER) block(x, y); }
// 15) 2026-11-20: 가챠센터를 조금 작게(8×5 → 7×4) 해서 동쪽(광장 쪽)으로 옮김 (사용자 요청)
{
  const b = BUILDINGS.find(q => q.id === 'gacha');
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) solid[y * MW + x] = 0;
  set(b.door.x, b.door.y, G);
  Object.assign(b, { x: 24, y: 32, w: 7, h: 4 }); b.door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h };
  for (let k = DECO.length - 1; k >= 0; k--) { const d = DECO[k]; if (d.x >= b.x - 1 && d.x <= b.x + b.w && d.y >= b.y - 1 && d.y <= b.y + b.h) { solid[d.y * MW + d.x] = 0; DECO.splice(k, 1); } }
  for (const n of NODES) if (!n.off && n.x >= b.x - 1 && n.x <= b.x + b.w && n.y >= b.y - 1 && n.y <= b.y + b.h) { n.off = true; solid[n.y * MW + n.x] = 0; }
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) block(x, y);
  set(b.door.x, b.door.y, PATH);
  road([[b.door.x + .5, b.door.y + .5], [26.5, 37.2], [25, 37.6]], .8, 33);   // 새 문 → 예전 길
}
// 16) 2026-11-20: 광장 남쪽에 건의 게시판 · 초보자 가이드 나란히 (가운데 2칸은 남쪽 길로 비워 둠)
for (const b of [{ id: 'suggest', name: '건의 게시판', icon: '📮', x: 37, y: 37, w: 2, h: 1 }, { id: 'beginner', name: '초보자 가이드', icon: '🔰', x: 41, y: 37, w: 2, h: 1 }]) {
  for (let k = DECO.length - 1; k >= 0; k--) { const d = DECO[k]; if (d.x >= b.x - 1 && d.x <= b.x + b.w && d.y >= b.y - 1 && d.y <= b.y + b.h) { if (tileAt(d.x, d.y) !== WATER) solid[d.y * MW + d.x] = 0; DECO.splice(k, 1); } }
  b.door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h }; BUILDINGS.push(b);
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) block(x, y);
}
// 치복동 포탈 (집 동네로 가는 문, 발 위치 픽셀) — 광장 남쪽 길 옆
export const DPORTAL = { x: 41.4 * T, y: 47.4 * T };

// 바다인지 (칸). 강·연못 물은 0
export const seaAt = (tx, ty) => tx >= 0 && ty >= 0 && tx < MW && ty < MH && SEA[ty * MW + tx] === 1;
// 바다 낚시하기 좋은 자리 (만 안쪽 모래사장, 발 위치 픽셀)
export const SEA_AT = (() => { const x = 49; let y = Math.floor(coastY(x)); while (y > 0 && tileAt(x, y) === WATER) y--; return { x: (x + .5) * T, y: (y + .6) * T }; })();

// ───── 부드러운 바닥 ─────
// 바닥 종류는 1×1 칸 그대로(집 짓기·길 찾기는 칸으로). 그림만 칸 경계를 둥글게 이은 모양으로 그림.
// soft(종류, x, y) > .5 이면 그 자리(칸 단위 소수 좌표)에 그 바닥이 그려져 있음. 집 자리 검사도 같은 값을 씀
const memOf = { [PATH]: v => v === PATH || v === STONE, [SAND]: v => v === SAND || v === WATER, [WATER]: v => v === WATER, [FOREST]: v => v === FOREST, [GRAVEL]: v => v === GRAVEL };
const NOISE = { [PATH]: .1, [SAND]: .12, [WATER]: .08, [FOREST]: .22, [GRAVEL]: .2 };
export function soft(t, fx, fy) {
  const m = memOf[t], x = fx - .5, y = fy - .5, i = Math.floor(x), j = Math.floor(y), u = sm(x - i), v = sm(y - j);
  const a = (X, Y) => (m(tiles[Math.min(MH - 1, Math.max(0, Y)) * MW + Math.min(MW - 1, Math.max(0, X))]) ? 1 : 0);
  return (a(i, j) * (1 - u) + a(i + 1, j) * u) * (1 - v) + (a(i, j + 1) * (1 - u) + a(i + 1, j + 1) * u) * v + NOISE[t] * n2(fx * .9, fy * .9, 40 + t);
}

// ───── 집: 2026-11-19부터 치복동 A동에 지음 (자리 규칙은 game-dong.js canHouseD). 문은 아래쪽 가운데 (x+1, y+2) ─────
export const HOUSE_W = 3, HOUSE_H = 2;
// 집 안 (방 하나). 위쪽 2줄은 벽
export const ROOM_W = 11, ROOM_H = 8, ROOM_DOOR = { x: 5, y: 7 };
// 물가: 이 칸 둘레(8방향)에 물이 있으면 낚시할 수 있음
// 2026-11-20 지도 안의 진짜 물만 (tileAt은 지도 밖을 물로 쳐서, 맵 가장자리에서 바깥을 눌러 낚시가 됐음)
export const waterIn = (tx, ty) => tx >= 0 && ty >= 0 && tx < MW && ty < MH && tileAt(tx, ty) === WATER;
export const nearWater = (tx, ty) => tileAt(tx, ty) !== WATER && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([a, b]) => waterIn(tx + a, ty + b));
// 물을 누른 자리(픽셀)에서 가장 가까운, 걸을 수 있는 물가 칸
export function shoreNear(px, py, r = 9) {
  const cx = px / T, cy = py / T; let best = null, bd = 1e9;
  for (let y = Math.floor(cy) - r; y <= Math.floor(cy) + r; y++) for (let x = Math.floor(cx) - r; x <= Math.floor(cx) + r; x++) {
    if (isSolid(x, y) || !nearWater(x, y)) continue;
    const d = Math.hypot(x + .5 - cx, y + .5 - cy); if (d < bd) { bd = d; best = { x, y }; }
  }
  return best;
}
// 걸을 수 있는 곳인지 (픽셀 좌표)
export const walkablePx = (px, py) => !isSolid(Math.floor(px / T), Math.floor(py / T));

// ───────── 물고기 그림자 (2026-11-18): 좋은 물고기가 나오는 명당. 시간으로 정해져서 화면·서버가 같은 자리를 계산 ─────────
// slot마다 n마리가 새로 나타나 life 동안 헤엄침. 찌가 그림자에서 range칸 안에 떨어지면 좋은 물고기(미끼 +bait단계, 두 번 굴려 비싼 것)
// 한 번 낚으면 그 사람에게는 사라짐 (life.fsh에 번호 저장), 같은 채널 사람들 화면에서도 지움
export const FSHADOW = { slot: 45e3, n: 2, life: 150e3, range: 2.8,   /* 2026-11-18 판정 넓힘 1.7 → 2.8칸 */ bait: 3, hit: .12, swim: .7 };
let SH_SPOTS = null;
function shSpots() {   // 사방이 물이고, 3칸 안에 걸어갈 수 있는 땅이 있는 칸 (물가에서 던져 닿는 곳)
  if (SH_SPOTS) return SH_SPOTS; SH_SPOTS = [];
  for (let y = 2; y < MH - 2; y++) for (let x = 2; x < MW - 2; x++) {
    let ok = true; for (let b = -1; b <= 1 && ok; b++) for (let a = -1; a <= 1; a++) if (tileAt(x + a, y + b) !== WATER) { ok = false; break; }
    if (!ok) continue;
    let land = false; for (let b = -3; b <= 3 && !land; b++) for (let a = -3; a <= 3; a++) if (a * a + b * b <= 9 && tileAt(x + a, y + b) !== WATER && !isSolid(x + a, y + b)) { land = true; break; }
    if (land) SH_SPOTS.push([x, y]);
  }
  return SH_SPOTS;
}
const shRand = (k, j, s) => { const h = Math.sin(k * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); };
// 지금 보이는 그림자들: { id, x, y (칸 단위, 소수), a (0~1 나타남/사라짐), sea }
export function fishShadows(now) {
  const S = FSHADOW, sp = shSpots(), out = []; if (!sp.length) return out;
  const k1 = Math.floor(now / S.slot), back = Math.ceil(S.life / S.slot);
  for (let k = k1 - back; k <= k1; k++) for (let j = 0; j < S.n; j++) {
    const born = k * S.slot + shRand(k, j, 1) * S.slot * .5, age = now - born; if (age < 0 || age > S.life) continue;
    const [ax, ay] = sp[Math.floor(shRand(k, j, 2) * sp.length)], ph = shRand(k, j, 3) * 6.28, t = age / 1000, w = .35 + shRand(k, j, 4) * .25;
    const x = ax + .5 + Math.cos(t * w + ph) * S.swim, y = ay + .5 + Math.sin(t * w * 1.4 + ph) * S.swim * .6;
    const a = Math.min(1, age / 4000, (S.life - age) / 4000);
    out.push({ id: k * 10 + j, x, y, a, dir: -Math.sin(t * w + ph) >= 0 ? 1 : -1, sea: seaAt(ax, ay) });
  }
  return out;
}
// 찌 자리(픽셀)에서 가까운 그림자 (없으면 null). gone = 이미 낚은 번호들
export function shadowAt(now, px, py, gone = []) {
  let best = null, bd = FSHADOW.range;
  for (const s of fishShadows(now)) { if (s.a < .3 || gone.includes(s.id)) continue; const d = Math.hypot(px / T - s.x, py / T - s.y); if (d < bd) { bd = d; best = s; } }
  return best;
}
// 17) 2026-11-20: 농사 랭킹판 (텃밭 창고 오른쪽 옆). 맨 마지막에 놓아서 나무·돌 번호 그대로
{
  const b = { id: 'farmrank', name: '농사 랭킹판', icon: '🏆', x: 68, y: 46, w: 2, h: 2 };   // 2026-11-20 사용자 요청으로 2칸 아래 · 1칸 오른쪽
  for (let k = DECO.length - 1; k >= 0; k--) { const d = DECO[k]; if (d.x >= b.x - 1 && d.x <= b.x + b.w && d.y >= b.y - 1 && d.y <= b.y + b.h) { if (tileAt(d.x, d.y) !== WATER) solid[d.y * MW + d.x] = 0; DECO.splice(k, 1); } }
  for (const n of NODES) if (!n.off && n.x >= b.x - 1 && n.x <= b.x + b.w && n.y >= b.y - 1 && n.y <= b.y + b.h) { n.off = true; if (tileAt(n.x, n.y) !== WATER) solid[n.y * MW + n.x] = 0; }
  b.door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h }; BUILDINGS.push(b);
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) block(x, y);
  set(b.door.x, b.door.y, PATH);
}
// 18) 2026-11-21: 사냥터 포탈 아래 사냥꾼 쉼터(향로 · 사냥왕) · 그 왼쪽 사냥 랭킹판. 맨 마지막에 놓아서 나무·돌 번호 그대로
for (const b of [{ id: 'hrest', name: '사냥꾼 쉼터', icon: '🔥', x: 71, y: 40, w: 4, h: 3 }, { id: 'huntrank', name: '사냥 랭킹판', icon: '🏆', x: 68, y: 40, w: 2, h: 2 }]) {
  for (let k = DECO.length - 1; k >= 0; k--) { const d = DECO[k]; if (d.x >= b.x - 1 && d.x <= b.x + b.w && d.y >= b.y - 1 && d.y <= b.y + b.h) { if (tileAt(d.x, d.y) !== WATER) solid[d.y * MW + d.x] = 0; DECO.splice(k, 1); } }
  for (const n of NODES) if (!n.off && n.x >= b.x - 1 && n.x <= b.x + b.w && n.y >= b.y - 1 && n.y <= b.y + b.h) { n.off = true; if (tileAt(n.x, n.y) !== WATER) solid[n.y * MW + n.x] = 0; }
  b.door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h }; BUILDINGS.push(b);
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) block(x, y);
  set(b.door.x, b.door.y, PATH);
}
// 19) 2026-11-21: 스킨샵 오른쪽 이벤트 상점 (빙고코인샵). 맨 마지막에 놓아서 나무·돌 번호 그대로
{
  const b = { id: 'event', name: '이벤트 상점', icon: '🎁', x: 55, y: 24, w: 4, h: 3 };
  for (let k = DECO.length - 1; k >= 0; k--) { const d = DECO[k]; if (d.x >= b.x - 1 && d.x <= b.x + b.w && d.y >= b.y - 1 && d.y <= b.y + b.h) { if (tileAt(d.x, d.y) !== WATER) solid[d.y * MW + d.x] = 0; DECO.splice(k, 1); } }
  for (const n of NODES) if (!n.off && n.x >= b.x - 1 && n.x <= b.x + b.w && n.y >= b.y - 1 && n.y <= b.y + b.h) { n.off = true; if (tileAt(n.x, n.y) !== WATER) solid[n.y * MW + n.x] = 0; }
  b.door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h }; BUILDINGS.push(b);
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) block(x, y);
  for (let x = 52; x <= b.door.x; x++) if (!solid[b.door.y * MW + x]) set(x, b.door.y, PATH);   // 스킨샵 앞 길과 이어 줌
}
// 20) 2026-11-22: 무한의 탑을 동쪽(숲 가장자리)으로 옮기고, 그 자리 아래(동쪽 길 왼쪽)에 던전 입구 (사용자 요청). 맨 마지막이라 나무·돌 번호 그대로
{
  const near = (b, x, y) => x >= b.x - 1 && x <= b.x + b.w && y >= b.y - 1 && y <= b.y + b.h;
  const clear = b => {
    for (let k = DECO.length - 1; k >= 0; k--) { const d = DECO[k]; if (near(b, d.x, d.y)) { if (tileAt(d.x, d.y) !== WATER) solid[d.y * MW + d.x] = 0; DECO.splice(k, 1); } }
    for (const n of NODES) if (!n.off && near(b, n.x, n.y)) { n.off = true; if (tileAt(n.x, n.y) !== WATER) solid[n.y * MW + n.x] = 0; }
  };
  const place = b => { clear(b); b.door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h }; for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) block(x, y); set(b.door.x, b.door.y, PATH); };
  const t = BUILDINGS.find(q => q.id === 'tower');
  for (let y = t.y; y < t.y + t.h; y++) for (let x = t.x; x < t.x + t.w; x++) { solid[y * MW + x] = 0; set(x, y, G); }
  set(t.door.x, t.door.y, G);
  for (let y = 24; y <= 29; y++) for (let x = 69; x <= 72; x++) if (tileAt(x, y) === PATH) set(x, y, G);   // 예전 탑 문에서 내려오던 길 윗부분 지움
  t.x = 73; t.y = 24; place(t);
  road([[75, 27.5], [74, 30], [72.6, 32.6]], .8, 32);                  // 탑 문 → 동쪽 길
  const d = { id: 'dungeon', name: '던전 입구', icon: '⚔️', x: 65, y: 29, w: 4, h: 3, soon: 1 };
  BUILDINGS.push(d); place(d);
  road([[67, 32.4], [67.4, 33.8]], .8, 33);                             // 던전 문 → 아래 길
}
// 21) 2026-11-22: 광장 남쪽 게시판 3개를 나란히 (건의 · 공략 · 초보자 가이드, 1칸씩 띄움 → 사이로 지나갈 수 있음). 맨 마지막이라 나무·돌 번호 그대로
{
  const sg = BUILDINGS.find(q => q.id === 'suggest'), bg = BUILDINGS.find(q => q.id === 'beginner');
  for (const b of [sg, bg]) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) solid[y * MW + x] = 0;   // 예전 자리 풀기
  const tips = { id: 'tips', name: '공략 게시판', icon: '📖', x: 39, y: 37, w: 2, h: 1 }; BUILDINGS.push(tips);
  sg.x = 36; bg.x = 42;
  for (const b of [sg, tips, bg]) {
    for (let k = DECO.length - 1; k >= 0; k--) { const d = DECO[k]; if (d.x >= b.x - 1 && d.x <= b.x + b.w && d.y >= b.y - 1 && d.y <= b.y + b.h) { if (tileAt(d.x, d.y) !== WATER) solid[d.y * MW + d.x] = 0; DECO.splice(k, 1); } }
    b.door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h };
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) block(x, y);
  }
}
