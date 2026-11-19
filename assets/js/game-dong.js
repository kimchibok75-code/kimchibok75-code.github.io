// 치복동 A동 — 집을 짓는 동네 지도 (2026-11-19). 화면(game.html)과 서버(game-worker)가 같이 씀
// 타운(80×72)보다 작은 46×34칸. 서쪽은 나무 많은 숲, 북동쪽은 호수 공원, 남쪽 가운데에 타운으로 가는 포탈
// 바닥 종류 번호는 game-map.js와 같음 (그림도 같은 방식으로 그림)
import { G, PATH, WATER, STONE, SAND, FOREST, noise2, HOUSE_W, HOUSE_H } from './game-map.js';
const T = 32;
export const DW = 46, DH = 34;
export const DONG_NAME = '치복동 A동';
const tiles = new Uint8Array(DW * DH), solid = new Uint8Array(DW * DH);
export const dTileAt = (x, y) => (x < 0 || y < 0 || x >= DW || y >= DH ? G : tiles[y * DW + x]);
export const dSolid = (x, y) => x < 0 || y < 0 || x >= DW || y >= DH || solid[y * DW + x] === 1;
const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < DW && y < DH) tiles[y * DW + x] = v; };
const block = (x, y) => { if (x >= 0 && y >= 0 && x < DW && y < DH) solid[y * DW + x] = 1; };
function rng(s) { return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = rng(20261119);

// 호수 공원 (북동쪽): 호수 · 모래 둘레 · 산책길 고리. 공원 안에는 집을 못 지음
export const LAKE = { x: 33, y: 11, rx: 6.2, ry: 4 };
const lakeD = (x, y) => ((x + .5 - LAKE.x) / LAKE.rx) ** 2 + ((y + .5 - LAKE.y) / LAKE.ry) ** 2 + .18 * (noise2(x / 3, y / 3, 71) - .5);
const loopD = (x, y) => ((x + .5 - LAKE.x) / (LAKE.rx + 3)) ** 2 + ((y + .5 - LAKE.y) / (LAKE.ry + 2.6)) ** 2;
export const inPark = (x, y) => ((x + .5 - LAKE.x) / (LAKE.rx + 4.6)) ** 2 + ((y + .5 - LAKE.y) / (LAKE.ry + 4)) ** 2 < 1;
// 숲 (서쪽 + 북쪽 가장자리, 동쪽으로 갈수록 얇아짐). 2026-11-19 사용자 요청으로 서쪽 숲을 넓힘
const forestZ = (x, y) => x + 2.4 * (noise2(x / 6, y / 6, 72) - .5) < 14 || y + 1.6 * (noise2(x / 6, y / 6, 73) - .5) < 5.5 - Math.max(0, x - 16) * .3;

// 1) 바닥
for (let y = 0; y < DH; y++) for (let x = 0; x < DW; x++) {
  const d = lakeD(x, y);
  if (d < 1) set(x, y, WATER);
  else if (d < 1.42) set(x, y, SAND);
  else if (forestZ(x, y)) set(x, y, FOREST);
}
// 2) 길 (2차 곡선, 둥글게)
function road(pts, r0 = 1, s = 1) {
  for (let k = 0; k + 2 < pts.length; k += 2) {
    const [a, b, c] = [pts[k], pts[k + 1], pts[k + 2]];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60, u = 1 - t, px = u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], py = u * u * a[1] + 2 * u * t * b[1] + t * t * c[1];
      const r = r0 + .25 * (noise2((k * 60 + i) / 9, s, 74) - .5), Rr = Math.ceil(r);
      for (let y = Math.floor(py) - Rr; y <= Math.floor(py) + Rr; y++) for (let x = Math.floor(px) - Rr; x <= Math.floor(px) + Rr; x++) {
        if ((x + .5 - px) ** 2 + (y + .5 - py) ** 2 > r * r) continue;
        const v = dTileAt(x, y); if (v === G || v === FOREST) set(x, y, PATH);
      }
    }
  }
}
// 포탈 앞 작은 마당 (돌바닥)
export const DGATE = { x: 23, y: 30.6 };   // 타운으로 가는 포탈 (칸, 발 위치)
for (let y = 27; y <= 32; y++) for (let x = 19; x <= 27; x++) if (((x + .5 - 23) / 4.3) ** 2 + ((y + .5 - 30) / 2.8) ** 2 < 1) set(x, y, STONE);
// 2026-11-19 정리: 길이 중간에서 끊기지 않게 큰길은 숲·가장자리까지 쭉 이어짐
road([[23, 27.5], [23, 22], [23, 16.5]], 1.05, 1);                // 포탈 → 북쪽 (큰길)
road([[8, 22.2], [23, 21.8], [46, 22.2]], 1, 4);                  // 동서 큰길 (숲 → 동쪽 끝)
road([[8, 16.6], [16, 16.4], [23, 16.5]], .95, 3);                // 북쪽 골목 → 숲
road([[23, 16.5], [24.5, 12], [LAKE.x - LAKE.rx - 2.6, LAKE.y]], .95, 2);   // → 호수 공원
// 호수 둘레 산책길 (고리)
for (let y = 0; y < DH; y++) for (let x = 0; x < DW; x++) { const d = loopD(x, y); if (d > .86 && d < 1.12 && dTileAt(x, y) !== WATER && dTileAt(x, y) !== SAND) set(x, y, PATH); }
for (let i = 0; i < DW * DH; i++) if (tiles[i] === WATER) solid[i] = 1;

// 3) 공원 벤치 · 꽃밭 (산책길 바깥쪽)
export const DBENCH = [];
for (const a of [.35, 1.25, 2.2, 3.3, 4.1, 5.3]) {
  const x = Math.round(LAKE.x + Math.cos(a) * (LAKE.rx + 4.2) - .5), y = Math.round(LAKE.y + Math.sin(a) * (LAKE.ry + 3.6) - .5);
  if (dTileAt(x, y) === G && !dSolid(x, y)) { DBENCH.push({ x, y }); block(x, y); }
}
// 4) 나무 (꾸밈, 못 캠). 가장자리 2칸은 빽빽하게, 숲은 많이, 풀밭은 드문드문. 집을 지으면 그 자리 나무는 없어짐
export const DTREES = [];
const near = (x, y, d) => DTREES.some(p => Math.abs(p.x - x) < d && Math.abs(p.y - y) < d);
for (let y = 0; y < DH; y++) for (let x = 0; x < DW; x++) {
  const v = dTileAt(x, y), edge = Math.min(x, y, DW - 1 - x, DH - 1 - y);
  if (v !== G && v !== FOREST) continue;
  if (Math.abs(x + .5 - DGATE.x) < 4 && y > 25) continue;   // 포탈 앞은 비움
  const park = inPark(x, y), p = edge < 2 ? .75 : v === FOREST ? .5 : park ? .1 : .012;
  const r = R(), r2 = R();
  if (r >= p || near(x, y, edge < 2 ? 1 : 2) || (edge >= 2 && [[0, 1], [0, 2], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]].some(([a, b]) => dTileAt(x + a, y + b) === PATH || dTileAt(x + a, y + b) === SAND))) continue;   // 길·물가 바로 옆은 비움
  const k = v === FOREST ? (r2 < .6 ? 'pine' : 'round') : park ? ['cherry', 'round', 'maple'][(x * 7 + y * 3) % 3] : ['round', 'birch', 'cherry', 'maple', 'pine'][(x * 7 + y * 13) % 5];
  DTREES.push({ i: DTREES.length, x, y, k, s: .85 + R() * .35, edge: edge < 2 }); block(x, y);
}
const TREE_AT = new Map(); for (const t of DTREES) TREE_AT.set(t.y * DW + t.x, t);
export const dTreeAt = (x, y) => TREE_AT.get(y * DW + x) || null;

// 바닥 부드러운 경계 (game-map.js soft와 같은 방식)
const sm = f => f * f * (3 - 2 * f);
const memOf = { [PATH]: v => v === PATH || v === STONE, [SAND]: v => v === SAND || v === WATER, [WATER]: v => v === WATER, [FOREST]: v => v === FOREST, 7: () => false };
const NOISE = { [PATH]: .1, [SAND]: .12, [WATER]: .08, [FOREST]: .22, 7: 0 };
export function dSoft(t, fx, fy) {
  const m = memOf[t] || (() => false), x = fx - .5, y = fy - .5, i = Math.floor(x), j = Math.floor(y), u = sm(x - i), v = sm(y - j);
  const a = (X, Y) => (m(tiles[Math.min(DH - 1, Math.max(0, Y)) * DW + Math.min(DW - 1, Math.max(0, X))]) ? 1 : 0);
  return (a(i, j) * (1 - u) + a(i + 1, j) * u) * (1 - v) + (a(i, j + 1) * (1 - u) + a(i + 1, j + 1) * u) * v + (NOISE[t] || 0) * noise2(fx * .9, fy * .9, 40 + t);
}
// 들어왔을 때 서는 자리 (포탈 바로 위, 픽셀)
export const DSPAWN = { x: DGATE.x * T, y: (DGATE.y - 1.6) * T };

// ───── 집 자리 (치복동) ─────
// 붙여 지어도 됨(겹치기·다른 집 문 앞 막기만 X). 풀밭·숲에, 나무 위에도(그 나무는 없어짐). 길·물·공원·포탈 앞·가장자리 X
const inHouse = (x, y, h) => x >= h.x && x < h.x + HOUSE_W && y >= h.y && y < h.y + HOUSE_H;
export const treeUnderHouse = (t, houses) => houses.some(h => inHouse(t.x, t.y, h));
export function canHouseD(x, y, houses = []) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 2 || y < 2 || x + HOUSE_W > DW - 2 || y + HOUSE_H > DH - 3) return '동네 가장자리에는 지을 수 없어요';
  for (let ty = y; ty < y + HOUSE_H; ty++) for (let tx = x; tx < x + HOUSE_W; tx++) {
    if (inPark(tx, ty)) return '호수 공원에는 집을 지을 수 없어요';
    if (Math.abs(tx + .5 - DGATE.x) < 5 && ty > 24) return '포탈 앞 마당에는 지을 수 없어요';
    const v = dTileAt(tx, ty); if (v !== G && v !== FOREST) return '풀밭·숲에만 지을 수 있어요 (길·물 X)';
    if (dSolid(tx, ty) && !dTreeAt(tx, ty)) return '벤치가 있어서 지을 수 없어요';
    for (const h of houses) if (inHouse(tx, ty, h)) return '다른 집과 겹쳐요';
  }
  for (let fy = y + .1; fy < y + HOUSE_H; fy += .2) for (let fx = x + .1; fx < x + HOUSE_W; fx += .2) {
    if (dSoft(PATH, fx, fy) > .45) return '길 위에는 집을 지을 수 없어요';
    if (dSoft(SAND, fx, fy) > .45) return '물가에는 집을 지을 수 없어요';
  }
  const dx = x + 1, dy = y + HOUSE_H;   // 내 집 문 앞
  if (dSolid(dx, dy) || dTileAt(dx, dy) === WATER || houses.some(h => inHouse(dx, dy, h))) return '문 앞이 막혀 있어요';
  for (const h of houses) if (inHouse(h.x + 1, h.y + HOUSE_H, { x, y })) return '다른 집 문 앞을 막아요';
  return '';
}
