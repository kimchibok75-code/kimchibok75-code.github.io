// 치복 타운 마을 지도 — 화면(game.html)과 서버(game-worker)가 같이 씀
// 삼각함수(sin·cos) 없이 정수 계산 + 곱셈·제곱근만으로 만들어서, 어느 브라우저·서버에서나 똑같은 지도가 나와요.
// 지도를 바꾸면 화면과 서버가 함께 바뀌어요 (집 자리 검사도 이 지도로 함).
const T = 32, MW = 80, MH = 60;   // game-rules.js 의 T · MW · MH 와 꼭 같게 (화면이 규칙 파일을 두 번 불러오지 않게 여기 따로 적음)

export const G = 0, PATH = 1, WATER = 2, STONE = 3, SOIL = 4, DOCK = 5, SAND = 6, GRAVEL = 7, FOREST = 8;
export const tiles = new Uint8Array(MW * MH);      // 바닥 종류
export const solid = new Uint8Array(MW * MH);      // 못 지나가는 칸 (물·건물·나무·바위·벤치)
export const tileAt = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH ? WATER : tiles[y * MW + x]);
export const isSolid = (x, y) => x < 0 || y < 0 || x >= MW || y >= MH || solid[y * MW + x] === 1;
const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < MW && y < MH) tiles[y * MW + x] = v; };
const block = (x, y) => { if (x >= 0 && y >= 0 && x < MW && y < MH) solid[y * MW + x] = 1; };

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
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
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
road([[45, 26], [53, 17], [63, 15.5]], 1.05, 13);                     // 북동: 채광소
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
  { id: 'quarry', name: '채광소', icon: '⛏️', x: 61, y: 11, w: 5, h: 4 },
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
export const PLOTS = Array.from({ length: 9 }, (_, i) => ({ x: (53.2 + (i % 3) * 2.8) * T, y: (46.15 + Math.floor(i / 3) * 1.85) * T }));
// 벤치 (광장 가장자리)
export const BENCHES = [{ x: 35, y: 28 }, { x: 45, y: 28 }, { x: 34, y: 33 }, { x: 46, y: 33 }, { x: 36, y: 25 }, { x: 44, y: 25 }];
for (const b of BENCHES) { set(b.x, b.y, STONE); block(b.x, b.y); }
for (let y = 29; y <= 32; y++) for (let x = 38; x <= 41; x++) if (tileAt(x, y) !== STONE) set(x, y, STONE);
for (let y = 30; y <= 31; y++) for (let x = 39; x <= 40; x++) block(x, y);
// 물은 못 들어감
for (let i = 0; i < MW * MH; i++) if (tiles[i] === WATER) solid[i] = 1;

// 4) 채집 자원 (나무·바위). 사람마다 따로 자라요. 항상 막힌 칸 (베면 그루터기·돌무더기)
const R = rng(20261116);
const near = (list, x, y, d) => list.some(p => Math.abs(p.x - x) < d && Math.abs(p.y - y) < d);
const freeFor = (x, y) => !isSolid(x, y) && !isSolid(x, y + 1) && tileAt(x, y + 1) !== PATH && ![PATH, WATER, DOCK, STONE, SOIL].includes(tileAt(x, y))
  && !BUILDINGS.some(b => x >= b.x - 1 && x <= b.x + b.w && y >= b.y - 2 && y <= b.y + b.h + 1);
export const NODES = [];
function addNodes(k, n, test, gap) {
  for (let tries = 0; tries < 4000 && n > 0; tries++) {
    const x = 1 + Math.floor(R() * (MW - 2)), y = 1 + Math.floor(R() * (MH - 2));
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
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
  const v = tileAt(x, y), edge = Math.min(x, y, MW - 1 - x, MH - 1 - y);
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
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const v = tileAt(x, y);
    if (inP(x, y)) { if (v === G || v === PATH) set(x, y, STONE); }
    else if (v === STONE && !BENCHES.some(b => b.x === x && b.y === y)) set(x, y, G);
  }
  ROADS.splice(0).forEach(([p, r, k]) => road(p, r, k)); ROADS.length = 0;
  for (const b of BUILDINGS) if (tileAt(b.door.x, b.door.y) === G) set(b.door.x, b.door.y, PATH);
}

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

// ───── 집 (언제나 모두 공개, 핵심 구역 밖 빈 풀밭 어디든) ─────
export const HOUSE_W = 3, HOUSE_H = 2;
// 집 자리 검사. houses = [{x, y}] (다른 사람 집). 문은 아래쪽 가운데 (x+1, y+2)
export function canHouse(x, y, houses = []) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 2 || y < 3 || x + HOUSE_W > MW - 2 || y + HOUSE_H > MH - 3) return '지도 가장자리에는 지을 수 없어요';
  for (let j = -1; j <= HOUSE_H; j++) for (let i = -1; i <= HOUSE_W; i++) {
    const tx = x + i, ty = y + j, inside = i >= 0 && j >= 0 && i < HOUSE_W && j < HOUSE_H;
    if (inside) { if (inCore(tx, ty)) return '마을 가운데(핵심 구역)에는 집을 지을 수 없어요'; if (tileAt(tx, ty) !== G) return '풀밭에만 지을 수 있어요 (길·물·숲·밭 X)'; if (isSolid(tx, ty)) return '나무나 건물이 있어서 지을 수 없어요'; }
  }
  // 그림으로 보이는 길·물·광장이 집 자리에 조금이라도 걸치면 안 됨
  for (let fy = y + .1; fy < y + HOUSE_H; fy += .2) for (let fx = x + .1; fx < x + HOUSE_W; fx += .2) {
    if (soft(PATH, fx, fy) > .45) return '길 위에는 집을 지을 수 없어요';
    if (soft(SAND, fx, fy) > .45) return '물가에는 집을 지을 수 없어요';
  }
  if (isSolid(x + 1, y + HOUSE_H) || tileAt(x + 1, y + HOUSE_H) === WATER) return '문 앞이 막혀 있어요';
  for (const h of houses) if (x < h.x + HOUSE_W + 1 && x + HOUSE_W + 1 > h.x && y < h.y + HOUSE_H + 1 && y + HOUSE_H + 1 > h.y) return '다른 집과 너무 가까워요';
  return '';
}
// 집 안 (방 하나). 위쪽 2줄은 벽
export const ROOM_W = 11, ROOM_H = 8, ROOM_DOOR = { x: 5, y: 7 };
// 물가: 이 칸 둘레(8방향)에 물이 있으면 낚시할 수 있음
export const nearWater = (tx, ty) => tileAt(tx, ty) !== WATER && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([a, b]) => tileAt(tx + a, ty + b) === WATER);
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
