// 텍스쳐 템플릿 만들기 (게임 화면 안에서 돌림)
// 쓰는 법은 "텍스쳐 템플릿/README.md" 맨 아래 참고.
// X = game.html이 window.__tplCtx로 넘겨 주는 그림 함수 모음
export async function run(X) {
  const SRV = 'http://localhost:5199/save?p=', out = [], bad = [];
  const save = async (p, c) => { try { await fetch(SRV + encodeURIComponent(p), { method: 'POST', body: c.toDataURL('image/png') }); out.push(p); } catch (e) { bad.push(p + ' ' + e.message); } };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return [c, c.getContext('2d')]; };
  // 틀 F = { W, H (픽셀), k (1단위 = k픽셀), ox, oy (기준점 픽셀) }
  const layer = (F, draw) => { const [c, g] = mk(F.W, F.H); g.translate(F.ox, F.oy); g.scale(F.k, F.k); draw(g); return c; };

  // 가이드 그림: 연한 바탕 + 격자 + 참고 그림(흐리게) + 기본 그림 + 기준점 + 설명
  function guide(F, art, o = {}) {
    const [c, g] = mk(F.W, F.H), fs = Math.max(12, Math.min(22, Math.round(Math.min(F.W, F.H) / 24)));
    g.fillStyle = '#eef1f5'; g.fillRect(0, 0, F.W, F.H);
    const minor = (o.minor || 4) * F.k, major = (o.major || 16) * F.k;
    for (const [step, col] of [[minor, '#dfe5ec'], [major, '#bcc7d4']]) {
      g.strokeStyle = col; g.lineWidth = 1; g.beginPath();
      for (let x = F.ox % step; x <= F.W; x += step) { g.moveTo(Math.round(x) + .5, 0); g.lineTo(Math.round(x) + .5, F.H); }
      for (let y = F.oy % step; y <= F.H; y += step) { g.moveTo(0, Math.round(y) + .5); g.lineTo(F.W, Math.round(y) + .5); }
      g.stroke();
    }
    if (o.ref) { g.globalAlpha = .22; g.drawImage(o.ref, 0, 0); g.globalAlpha = 1; }
    const L = (x, y) => [F.ox + x * F.k, F.oy + y * F.k];
    for (const b of o.boxes || []) {
      const [x, y] = L(b.x, b.y); g.save(); g.setLineDash(b.dash || [8, 6]); g.strokeStyle = b.c || '#2f6fdb'; g.lineWidth = 2;
      if (b.fill) { g.fillStyle = b.fill; g.fillRect(x, y, b.w * F.k, b.h * F.k); }
      g.strokeRect(x + 1, y + 1, b.w * F.k - 2, b.h * F.k - 2); g.restore();
      if (b.t) text(g, b.t, x + 6, y + (b.below ? b.h * F.k + fs + 4 : fs + 4), b.c || '#2f6fdb', fs * .8);
    }
    for (const s of o.shapes || []) { g.save(); g.translate(F.ox, F.oy); g.scale(F.k, F.k); g.strokeStyle = s.c || '#2f6fdb'; g.lineWidth = 2 / F.k; g.setLineDash([6 / F.k, 5 / F.k]); s.path(g); g.stroke(); g.restore(); }
    g.globalAlpha = o.artAlpha ?? .6; g.drawImage(art, 0, 0); g.globalAlpha = 1;
    // 기준점 (빨간 십자)
    g.save(); g.strokeStyle = 'rgba(229,56,59,.55)'; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.beginPath();
    g.moveTo(F.ox + .5, 0); g.lineTo(F.ox + .5, F.H); g.moveTo(0, F.oy + .5); g.lineTo(F.W, F.oy + .5); g.stroke(); g.restore();
    dot(g, F.ox, F.oy, '#e5383b', 7);
    if (o.anchor) text(g, o.anchor, F.ox + 12, F.oy - 10, '#e5383b', fs * .85);
    for (const n of o.notes || []) { const [x, y] = L(n.x, n.y); if (!n.nodot) dot(g, x, y, n.c || '#7a3fc4', 5); text(g, n.t, x + (n.left ? -10 : 10), y + (n.dy || 4), n.c || '#7a3fc4', fs * .75, n.left); }
    let y = fs + 6; for (const t of o.title || []) { text(g, t, 8, y, '#1f2a3a', y === fs + 6 ? fs : fs * .72); y += (y === fs + 6 ? fs : fs * .72) + 6; }
    return c;
  }
  function dot(g, x, y, c, r) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r + 2, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  function text(g, t, x, y, c, s, right) {
    g.font = `700 ${Math.round(s)}px "IBM Plex Sans KR", "Malgun Gothic", sans-serif`; g.textAlign = right ? 'right' : 'left'; g.textBaseline = 'alphabetic';
    g.lineJoin = 'round'; g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = Math.max(3, s / 4); g.strokeText(t, x, y); g.fillStyle = c; g.fillText(t, x, y);
  }
  // 한 쌍 저장: 이름.png (바꿀 그림, 투명 배경) + 이름_guide.png (밑그림용 안내)
  async function pair(p, F, draw, o) { const art = layer(F, draw); await save(p + '.png', art); await save(p + '_guide.png', guide(F, art, o)); }

  const { R, E, inkDraw, flatInk } = X, INKW = 2.2;
  const SIZE = (F, u) => `크기 ${F.W}×${F.H}px · 게임 1칸(32) = ${32 * F.k}px · ${u}`;

  // ───────── 캐릭터 (발 = 기준점) ─────────
  const CF = { k: 4, W: 384, H: 384, ox: 192, oy: 336 };   // 가로 -48~48, 세로 -84~12 (게임 단위)
  const base = { face: '#ffe0c2', body: '#e8553a', eyes: 'dot', hat: 'none', hair: 'none', hairC: X.HAIR_COLORS[0], suit: '', wsk: {}, equip: {}, cls: 'sword', dir: 1, still: true, moving: false, sit: -1, swing: 0 };
  const hy = -45;
  const charRef = (c = {}) => layer(CF, g => X.drawChar(g, 0, 0, { ...base, ...c }, 0, 1));
  const noArm = layer(CF, g => {   // 의상용 참고: 머리·다리만 (몸은 의상이 그림)
    const P = [{ path: R(-6, -8, 5, 8, 2.5), c: '#3a4456' }, { path: R(1, -8, 5, 8, 2.5), c: '#3a4456' }, { path: R(-14, hy, 28, 26, 9), c: base.face }];
    inkDraw(g, P, INKW);
  });
  const bare = charRef();
  const headBox = { x: -14, y: hy, w: 28, h: 26, t: '얼굴 (28×26)', c: '#d08a2e', below: true };
  await save('char/_base-ref.png', bare);

  await pair('char/eyes', CF, g => X.drawEyes(g, { eyes: 'dot', still: true }, hy + 16, 0), {
    ref: bare, artAlpha: 1, boxes: [headBox], anchor: '발 (기준점)',
    notes: [{ x: -9, y: hy + 16, t: '왼눈 중심 (-6, -29)', left: true, nodot: 1 }, { x: 9, y: hy + 16, t: '오른눈 (6, -29)', nodot: 1 }],
    title: ['눈 템플릿', SIZE(CF, '두 눈을 한 장에'), '왼쪽을 볼 때는 캐릭터 전체가 좌우로 뒤집혀요'],
  });
  const hp = X.hairParts('long', X.HAIR_COLORS[0], hy);
  const hairNote = { title: null, ref: bare, boxes: [headBox], anchor: '발 (기준점)' };
  await pair('char/hair-back', CF, g => inkDraw(g, hp.back, INKW), { ...hairNote, notes: [{ x: 0, y: hy, t: '머리 꼭대기 (0, -45)', dy: -10 }],
    title: ['헤어 템플릿 ① 뒷머리 (얼굴·몸 뒤)', SIZE(CF, '긴 머리 예시'), '뒷머리가 없는 머리 모양이면 빈 그림으로'] });
  await pair('char/hair-front', CF, g => inkDraw(g, hp.front, INKW), { ...hairNote, notes: [{ x: 0, y: hy, t: '머리 꼭대기 (0, -45)', dy: -10 }],
    title: ['헤어 템플릿 ② 앞머리 (얼굴 위)', SIZE(CF, '긴 머리 예시'), '머리 색 8가지를 쓰려면 흰색·회색으로 그리기'] });
  await pair('char/hat', CF, g => inkDraw(g, X.hatParts('straw', hy, base.face), INKW), {
    ref: charRef({ hair: 'short' }), boxes: [headBox], anchor: '발 (기준점)', notes: [{ x: 0, y: hy, t: '머리 꼭대기 (0, -45)', dy: -14 }],
    title: ['모자 템플릿 (모자 스킨 · 모자 장비 같이)', SIZE(CF, '밀짚모자 예시'), '머리 위쪽은 넉넉하게 비워 둠'] });
  const su = X.suitParts('knight', 0, hy);
  const suitNote = { ref: noArm, anchor: '발 (기준점)', boxes: [{ x: -9, y: -20, w: 18, h: 14, c: '#d08a2e' }],
    notes: [{ x: -10, y: -9, t: '몸통 (18×14)', left: true, nodot: 1, c: '#d08a2e' }, { x: -9, y: -17, t: '왼팔 어깨', left: true }, { x: 9, y: -17, t: '오른팔 어깨' }] };
  await pair('char/suit-back', CF, g => inkDraw(g, su.back, INKW), { ...suitNote, title: ['의상 템플릿 ① 뒤 (망토·날개, 몸 뒤)', SIZE(CF, '기사 갑옷 예시'), '없으면 빈 그림으로'] });
  await pair('char/suit-front', CF, g => inkDraw(g, su.front, INKW), { ...suitNote, title: ['의상 템플릿 ② 몸 (의상 스킨 · 갑옷 장비 같이)', SIZE(CF, '기사 갑옷 예시'), '팔은 따로 (suit-sleeve)'] });
  const SF = { k: 8, W: 256, H: 256, ox: 128, oy: 112 };   // 팔: 어깨가 기준점, 아래로 늘어짐
  await pair('char/suit-sleeve', SF, g => inkDraw(g, [{ path: R(-2.5, 0, 5, 10, 2.5), c: su.sleeve }], INKW), {
    ref: layer(SF, g => inkDraw(g, [{ path: E(0, 9, 3.1, 3.1), c: base.face }], INKW)), minor: 2, major: 8, anchor: '어깨 (돌아가는 축)',
    notes: [{ x: 0, y: 9, t: '손 (코드가 그림)', dy: 30 }],
    title: ['의상 ③ 소매', `${SF.W}×${SF.H}px · 1단위=8px`, '양팔에 같이 씀, 걸을 때 흔들림'] });

  // ───────── 무기 (손잡이 = 기준점, 날은 위로) ─────────
  const WF = { k: 8, W: 384, H: 544, ox: 192, oy: 368 };   // 가로 -24~24, 세로 -46~22
  const hand = layer(WF, g => inkDraw(g, [{ path: E(0, 0, 3.1, 3.1), c: base.face }], INKW));
  const WN = { sword: '검', bow: '활', staff: '지팡이' };
  for (const t of ['sword', 'bow', 'staff']) await pair('weapon/' + t, WF, g => inkDraw(g, X.weaponParts({ slot: t, st: 3, g: 'normal' }), INKW), {
    ref: hand, minor: 2, major: 8, anchor: '손이 쥐는 곳 (기준점)',
    title: [`${WN[t]} 템플릿`, SIZE(WF, '3단계 예시'), t === 'bow' ? '활대는 앞(오른쪽)으로 휘고, 시위는 손 뒤' : '날(끝)은 위쪽으로 · 캐릭터가 각도를 돌려서 들어요', '단계별·스킨별로 같은 틀에 그리면 됨 (가방 아이콘도 이 그림)'] });

  // ───────── 물고기 (아이콘 하나) ─────────
  const FF = { k: 128 / 34, W: 128, H: 128, ox: 64, oy: 64 };
  const GI = await import(location.origin + '/assets/js/game-icons.js?v=' + Date.now());
  const fishIm = new Image(); fishIm.src = GI.iconUrl('fish'); await fishIm.decode();
  const fishArt = (() => { const [c, g] = mk(512, 512); g.drawImage(fishIm, 0, 0, 512, 512); return c; })();
  await save('fish/fish.png', fishArt);
  {
    const BF = { k: 4, W: 512, H: 512, ox: 256, oy: 256 }, c = fishArt;
    const gd = guide(BF, c, { minor: 4, major: 16, anchor: '가운데', boxes: [{ x: -60, y: -46, w: 120, h: 106, c: '#2f6fdb' }],
      title: ['물고기 템플릿', '크기 512×512px (게임에서 줄여 씀)', '파란 점선 안에 꽉 차게 · 머리는 왼쪽', '물고기마다 같은 틀에 한 장씩'] });
    await save('fish/fish_guide.png', gd);
  }

  // ───────── 몬스터 (발 = 기준점) ─────────
  const MF = { k: 4, W: 360, H: 320, ox: 180, oy: 264 };   // 게임 단위 90×80, 발 (45, 66)
  await pair('monster/monster', MF, g => inkDraw(g, X.MON_ART.boar(X.MONS.boar.c), 2), {
    anchor: '발 (기준점)', shapes: [{ path: g => { g.beginPath(); g.ellipse(0, 0, 15, 4.5, 0, 0, 7); }, c: '#7a3fc4' }],
    boxes: [{ x: -20, y: -40, w: 40, h: 40, t: '보통 크기 (40×40)', c: '#2f6fdb' }],
    title: ['몬스터 템플릿', SIZE(MF, '멧돼지 예시'), '정면을 보게 · 보스는 게임이 크게 키움', '보라 점선 = 그림자 (코드가 그림)'] });

  // ───────── 건물 (차지하는 칸의 왼쪽 위 = 기준점) ─────────
  const T = X.T, BK = 2;
  const fx = { smith: [['굴뚝 연기', -46, 8, 1]], cafe: [['커피 김', .5, 20]], gacha: [['반짝이 불빛 줄', .5, 114]], hall: [['깃발', .5, -44]] };
  for (const b of X.BUILDINGS) {
    if (!X.BLD[b.id]) continue;
    const Wd = b.w * T, Hh = b.h * T, F = { k: BK, W: (Wd + 40) * BK, H: (Hh + 100) * BK, ox: 20 * BK, oy: 90 * BK };
    const dx = Math.floor(b.w / 2) * T;
    await pair('building/' + b.id, F, g => flatInk(g, X.BLD[b.id](Wd, Hh)), {
      minor: 8, major: 32, anchor: '기준점 (차지하는 칸 왼쪽 위)',
      boxes: [{ x: 0, y: 0, w: Wd, h: Hh, t: `차지하는 칸 ${b.w}×${b.h}`, c: '#2f6fdb', fill: 'rgba(47,111,219,.06)' },
        { x: dx, y: Hh, w: T, h: 10, t: '문 앞 (여기로 들어감)', c: '#1f9d55', below: true }],
      notes: [{ x: Wd / 2, y: X.LAB[b.id] ?? 30, t: '이름표 (코드가 그림)', c: '#c2410c' },
        ...(fx[b.id] || []).map(([t, x, y, fromRight]) => ({ x: fromRight ? Wd + x : x <= 1 ? Wd * x : x, y, t: t + ' (코드가 그림)', c: '#c2410c' }))],
      title: [`${b.name} 템플릿`, SIZE(F, `칸 ${b.w}×${b.h}`), '위에서 내려다본 3/4 시점, 테두리 없이'] });
  }
  for (let lv = 0; lv < 6; lv++) {
    const ex = X.HOUSE_EX[lv], Wd = X.HOUSE_W * T, Hh = X.HOUSE_H * T, F = { k: BK, W: (Wd + 40) * BK, H: (Hh + 50 + ex) * BK, ox: 20 * BK, oy: (40 + ex) * BK };
    await pair('building/house-lv' + lv, F, g => flatInk(g, X.houseTop(lv, X.HOUSE.roofs[0])), {
      minor: 8, major: 32, anchor: '기준점 (차지하는 칸 왼쪽 위)',
      boxes: [{ x: 0, y: 0, w: Wd, h: Hh, t: `차지하는 칸 ${X.HOUSE_W}×${X.HOUSE_H}`, c: '#2f6fdb', fill: 'rgba(47,111,219,.06)' }],
      title: [`집 ${lv + 1}단계 (${['일반 집', '2층 집', '큰 집', '빌라', '4층 건물', '빌딩'][lv]})`, SIZE(F, '지붕 색 1번 예시'), '지붕 색 8가지를 쓰려면 지붕을 따로 (말해 주세요)'] });
  }
  return { n: out.length, bad };
}
