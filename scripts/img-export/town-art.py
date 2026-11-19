# 텍스쳐 템플릿/내 디자인 그림 → assets/img/town/*.webp (2026-11-18)
# 흰 배경 지우기(가장자리에서 이어진 흰색만) → 한 장에 여러 개면 나누기 → 크기 줄이기
# 다시 만들려면: python scripts/img-export/town-art.py
import json, os, sys
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

SRC = os.path.join('텍스쳐 템플릿', '내 디자인')
OUT = os.path.join('assets', 'img', 'town')
os.makedirs(OUT, exist_ok=True)
META = {}

def load(name):
    return np.asarray(Image.open(os.path.join(SRC, name + '.png')).convert('RGB')).astype(np.int16)

def cut_bg(a, lim=250, spread=6, holes=False):
    """가장자리와 이어진 흰 배경만 투명하게. lim 이상 밝고 색이 거의 없는 칸"""
    mn = a.min(2); mx = a.max(2)
    cand = (mn >= lim) & ((mx - mn) <= spread)
    h, w = cand.shape
    bg = np.zeros_like(cand)
    bg[0, :] = cand[0, :]; bg[-1, :] = cand[-1, :]; bg[:, 0] = cand[:, 0]; bg[:, -1] = cand[:, -1]
    # 4방향 번지기 (반복)
    while True:
        n = bg.copy()
        n[1:, :] |= bg[:-1, :]; n[:-1, :] |= bg[1:, :]; n[:, 1:] |= bg[:, :-1]; n[:, :-1] |= bg[:, 1:]
        n &= cand
        if (n == bg).all(): break
        bg = n
    if holes:   # 둘러싸인 흰 칸(활 시위 안쪽 등)도: 큰 흰 덩어리만
        st = 2; c2 = (cand & ~bg)[::st, ::st]; hh, ww = c2.shape; seen = np.zeros_like(c2)
        for y in range(hh):
            for x in range(ww):
                if not c2[y, x] or seen[y, x]: continue
                q = deque([(y, x)]); seen[y, x] = True; pts = []
                while q:
                    cy, cx = q.popleft(); pts.append((cy, cx))
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < hh and 0 <= nx < ww and c2[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True; q.append((ny, nx))
                if len(pts) * st * st >= 900:
                    for cy, cx in pts: bg[cy * st:(cy + 1) * st, cx * st:(cx + 1) * st] |= cand[cy * st:(cy + 1) * st, cx * st:(cx + 1) * st]
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    # 경계 1칸 부드럽게: 배경 옆에 붙은 아주 밝은 칸은 반투명
    ring = ~bg & (np.roll(bg, 1, 0) | np.roll(bg, -1, 0) | np.roll(bg, 1, 1) | np.roll(bg, -1, 1))
    soft = ring & (mn >= 236) & ((mx - mn) <= 14)
    alpha[soft] = np.clip((255 - mn[soft]) * 255 // 19, 60, 255).astype(np.uint8)
    rgba = np.dstack([a.astype(np.uint8), alpha])
    return rgba

def bbox(al, pad=2):
    ys, xs = np.where(al > 8)
    return max(0, xs.min() - pad), max(0, ys.min() - pad), min(al.shape[1], xs.max() + 1 + pad), min(al.shape[0], ys.max() + 1 + pad)

def col_segments(rgba, n):
    """세로로 빈 줄을 찾아 왼쪽부터 n개로 나눔"""
    al = rgba[:, :, 3]
    used = (al > 8).sum(0) > 0
    segs = []; on = False
    for x, u in enumerate(used):
        if u and not on: s = x; on = True
        if not u and on: segs.append([s, x]); on = False
    if on: segs.append([s, len(used)])
    # 작은 조각은 가장 가까운 큰 조각에 붙임
    while len(segs) > n:
        k = min(range(len(segs)), key=lambda i: segs[i][1] - segs[i][0])
        if k == 0: segs[1][0] = segs[0][0]
        elif k == len(segs) - 1: segs[-2][1] = segs[-1][1]
        else:
            if segs[k][0] - segs[k - 1][1] < segs[k + 1][0] - segs[k][1]: segs[k - 1][1] = segs[k][1]
            else: segs[k + 1][0] = segs[k][0]
        segs.pop(k)
    return segs

def split_n(rgba, n):
    """n개가 가로로 늘어선 그림: 예상 경계(폭/n) 근처에서 불투명 칸이 가장 적은 세로줄로 자름"""
    al = rgba[:, :, 3] > 8; w = al.shape[1]
    cnt = np.convolve(al.sum(0), np.ones(5), 'same')
    cuts = [0]
    for k in range(1, n):
        c = w * k // n; r = int(w / n * .35)
        lo, hi = max(1, c - r), min(w - 1, c + r)
        cuts.append(lo + int(np.argmin(cnt[lo:hi])))
    cuts.append(w)
    return [(cuts[i], cuts[i + 1]) for i in range(n)]

def components(rgba, min_area=4000, step=4):
    """알파로 이어진 덩어리 (작은 덩어리는 가까운 큰 덩어리에 붙임). 돌려줌: [(x0,y0,x1,y1), ...] 원본 좌표"""
    al = rgba[::step, ::step, 3] > 8
    h, w = al.shape; lab = -np.ones((h, w), int); boxes = []
    for y in range(h):
        for x in range(w):
            if not al[y, x] or lab[y, x] >= 0: continue
            k = len(boxes); q = deque([(y, x)]); lab[y, x] = k; b = [x, y, x, y, 0]
            while q:
                cy, cx = q.popleft(); b[4] += 1
                b[0] = min(b[0], cx); b[1] = min(b[1], cy); b[2] = max(b[2], cx); b[3] = max(b[3], cy)
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and al[ny, nx] and lab[ny, nx] < 0:
                        lab[ny, nx] = k; q.append((ny, nx))
            boxes.append(b)
    big = [b for b in boxes if b[4] * step * step >= min_area]
    for b in boxes:
        if b in big: continue
        cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
        t = min(big, key=lambda B: max(B[0] - cx, 0, cx - B[2]) + max(B[1] - cy, 0, cy - B[3]))
        t[0] = min(t[0], b[0]); t[1] = min(t[1], b[1]); t[2] = max(t[2], b[2]); t[3] = max(t[3], b[3])
    return [(b[0] * step, b[1] * step, (b[2] + 1) * step, (b[3] + 1) * step) for b in big]

def save(name, rgba, width=None, q=90, height=None):
    im = Image.fromarray(rgba, 'RGBA')
    if width and im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    if height and im.height > height:
        im = im.resize((round(im.width * height / im.height), height), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=q, method=6)
    META[name] = [im.width, im.height]
    return im

def clean(t, rel=.04, step=2):
    """큰 덩어리만 남김 (옆 그림에서 딸려 온 조각 지우기)"""
    al = t[:, :, 3][::step, ::step] > 8; h, w = al.shape; lab = -np.ones((h, w), int); areas = []
    for y in range(h):
        for x in range(w):
            if not al[y, x] or lab[y, x] >= 0: continue
            k = len(areas); q = deque([(y, x)]); lab[y, x] = k; n = 0
            while q:
                cy, cx = q.popleft(); n += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and al[ny, nx] and lab[ny, nx] < 0:
                        lab[ny, nx] = k; q.append((ny, nx))
            areas.append(n)
    if not areas: return t
    big = max(areas); keepk = np.array([a >= big * rel for a in areas] + [False])
    m = keepk[lab]   # lab -1 → 마지막(False)
    m = np.repeat(np.repeat(m, step, 0), step, 1)[:t.shape[0], :t.shape[1]]
    # 경계 칸 보호: 1칸 넓힘
    m = m | np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)
    t = t.copy(); t[:, :, 3] = np.where(m, t[:, :, 3], 0)
    b = bbox(t[:, :, 3]); return t[b[1]:b[3], b[0]:b[2]]

def crop(rgba, b):
    x0, y0, x1, y1 = b
    sub = rgba[y0:y1, x0:x1]
    bx = bbox(sub[:, :, 3])
    return sub[bx[1]:bx[3], bx[0]:bx[2]]

def load_rgba(name):
    return np.asarray(Image.open(os.path.join(SRC, name + '.png')).convert('RGBA'))

def keep_rgba(name):
    """이미 배경이 투명한 그림 (2026-11-18 새 그림): 투명 칸 색은 0으로"""
    a = load_rgba(name).copy(); a[a[:, :, 3] == 0] = 0; return a

# 1) 가게 건물 (한 장에 하나). 2026-11-19 새 그림은 배경이 투명 → keep_rgba
for src, key in [('건물_가챠센터', 'gacha'), ('건물_카페', 'cafe'), ('건물_스킨샵', 'skin'), ('건물_마을회관', 'hall'), ('건물_대장간', 'smith'),
                 ('건물_낚시점', 'fishshop'), ('건물_벌목소', 'lumber'), ('건물_채석장', 'quarry'), ('건물_텃밭 창고', 'farmshed'),
                 ('건물_무한의탑', 'tower'), ('건물_김치볶음밥 전문점', 'kfr'), ('건물_도감센터', 'dex'), ('건물_게시판_건의', 'suggest'), ('건물_게시판_초보자 가이드', 'beginner')]:   # 2026-11-19 무한의 탑 · 김치볶음밥 전문점
    r = keep_rgba(src)
    b = bbox(r[:, :, 3]); save('b-' + key, r[b[1]:b[3], b[0]:b[2]], width=720)

# 2) 텃밭 (울타리 + 흙). 두둑 줄 위치도 기록 (0~1)
r = keep_rgba('건물_텃밭'); b = bbox(r[:, :, 3]); f = r[b[1]:b[3], b[0]:b[2]]
im = save('farm', f, width=900)
# 두둑(밝은 갈색 줄) 가운데: 원본 그림에서 잰 y (215, 335, 460, 580, 695)
META['farmRows'] = [round((y - b[1]) / (b[3] - b[1]), 4) for y in (215, 335, 460, 580, 695)]
# 밭 안쪽(흙) 가로 범위
row = f[int(f.shape[0] * .5), :, :3].astype(int)
soil = np.where((row[:, 0] < 180) & (row[:, 0] > 110) & (row[:, 1] < 110))[0]
META['farmIn'] = [round(soil.min() / f.shape[1], 4), round(soil.max() / f.shape[1], 4)]

# 3) 나무 5그루 (2026-11-18 새 그림, 배경 투명)
r = keep_rgba('풍경_나무')
for i, (x0, x1) in enumerate(split_n(r, 5)):
    save('tree-%d' % (i + 1), clean(crop(r, (x0, 0, x1, r.shape[0]))), width=240)

# 4) 집 4 + 빌라 4 (2026-11-18 새 그림): 지붕 칸은 사용자가 그린 마스킹 그림(빨간 칸)으로 떼어서 색을 입힘
k = 0
for src, msk in [('건물_집', '건물_집_지붕색마스킹'), ('건물_빌라_리뉴얼', '건물_빌라_지붕색 마스킹')]:
    r = keep_rgba(src); M = load_rgba(msk)[:, :, 3].astype(np.float32) / 255
    for (x0, x1) in col_segments(r, 4):
        k += 1
        sub = r[:, x0:x1]; bx = bbox(sub[:, :, 3]); X0, Y0, X1, Y1 = bx[0] + x0, bx[1], bx[2] + x0, bx[3]
        t = r[Y0:Y1, X0:X1]; m = M[Y0:Y1, X0:X1]
        save('house-%d' % k, t, width=360)
        roof = t.copy(); roof[:, :, 3] = (t[:, :, 3] * m).round().astype(np.uint8)
        # 지붕 칸은 밝기만 남김 (회색조) → 화면에서 색을 곱함 (그림의 음영은 살림)
        g = roof[:, :, :3].astype(int).mean(2)
        g = np.clip((g - 170) * 255 / 85, 0, 255) * .45 + 255 * .55
        roof[:, :, 0] = roof[:, :, 1] = roof[:, :, 2] = g.astype(np.uint8)
        save('house-%d-roof' % k, roof, width=360)

# 5) 레이드 배경 (그대로, 크기만)
bg = Image.open(os.path.join(SRC, '배경_드래곤.png')).convert('RGB')
bg.resize((1344, round(1344 * bg.height / bg.width)), Image.LANCZOS).save(os.path.join(OUT, 'raid-bg.webp'), 'WEBP', quality=86, method=6)
META['raid-bg'] = [bg.width, bg.height]

# 6) 드래곤 조각 (2026-11-18 새로): 사용자가 1182×1024 판 하나에 위치까지 맞춰 그린 조각 5장 (왼쪽만 → 오른쪽은 좌우로 뒤집음)
#    meta 'dragon' = { 이름: [x, y, w, h] } 판 좌표 (원점은 화면이 정함: 가운데 x = 591, 바닥 = 가장 아래 칸)
PART = {}; FW = 1182; bottom = 0
for src, n in [('드래곤_날개', 'wing'), ('드래곤_뒷다리', 'leg'), ('드래곤_몸통', 'body'), ('드래곤_앞발', 'arm'), ('드래곤_머리', 'head')]:
    a = load_rgba(src); b = bbox(a[:, :, 3], pad=1); t = a[b[1]:b[3], b[0]:b[2]]
    save('d-' + n, t.copy(), width=round(t.shape[1] * .5))
    PART[n] = [int(b[0]), int(b[1]), int(t.shape[1]), int(t.shape[0])]; bottom = max(bottom, int(b[3]))
META['dragon'] = {'parts': PART, 'W': FW, 'cx': FW / 2, 'floor': bottom}

# 7) 레이드 스킨 (2026-11-18 새로): 텍스쳐 템플릿 틀 그대로 그림 → 잘라서 저장 + 틀 안 위치(meta 'rd')
#    모자·갑옷 = char 틀 (384×384, 발 (192,336), 4배) · 검·활·지팡이 = weapon 틀 (384×544, 손잡이 (192,368), 8배)
RD = {}
for src, n, ox, oy, k in [('스킨_드래곤_모자', 'hat', 192, 336, 4), ('스킨_드래곤_갑옷', 'suit', 192, 336, 4),
                          ('스킨_드래곤_검', 'sword', 192, 368, 8), ('스킨_드래곤_활', 'bow', 192, 368, 8), ('스킨_드래곤_지팡이', 'staff', 192, 368, 8)]:
    a = load_rgba(src); b = bbox(a[:, :, 3], pad=1); t = a[b[1]:b[3], b[0]:b[2]]
    save('rd-' + n, t.copy())
    RD[n] = [round((b[0] - ox) / k, 3), round((b[1] - oy) / k, 3), round(t.shape[1] / k, 3), round(t.shape[0] / k, 3)]   # 게임 단위 x, y, w, h (기준점에서)
META['rd'] = RD

# 8) 사냥터 포탈 (2026-11-18): 그림 + 가운데 소용돌이 칸(파란 칸) 위치 → 화면이 그 칸만 돌림
r = keep_rgba('건물_사냥터 포탈'); b = bbox(r[:, :, 3]); t = r[b[1]:b[3], b[0]:b[2]]
save('portal', t, width=480)
c = t[:, :, :3].astype(int); hole = (t[:, :, 3] > 200) & (c[:, :, 2] > c[:, :, 0] + 70) & (c[:, :, 2] > 150)
# 큰 덩어리만 (깃발 등 파란 점 빼기) → 구멍 메우기
hm = Image.fromarray(hole.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
ha = np.asarray(hm) > 0; ys, xs = np.where(ha)
hb = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
hole_img = t.copy(); hole_img[:, :, 3] = np.where(ha, 255, 0); hole_img = hole_img[hb[1]:hb[3], hb[0]:hb[2]]
im = Image.fromarray(hole_img, 'RGBA'); sc = 480 / t.shape[1]
im = im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS); im.save(os.path.join(OUT, 'portal-hole.webp'), 'WEBP', quality=92, method=6)
H, W = t.shape[:2]
META['portal'] = {'hole': [round(hb[0] / W, 4), round(hb[1] / H, 4), round((hb[2] - hb[0]) / W, 4), round((hb[3] - hb[1]) / H, 4)]}
print('portal hole', hb, t.shape)

# 9) 오우거 레이드 (2026-11-18): 2078×1199 판 하나에 위치까지 맞춰 그린 조각 5장 + 배경 + 스킨 5개(템플릿 틀 그대로)
OG = {}; obottom = 0
for src, n in [('오우거_다리', 'leg'), ('오우거_몸통', 'body'), ('오우거_오른팔', 'rarm'), ('오우거_왼팔', 'larm'), ('오우거_머리', 'head')]:
    a = keep_rgba(src); b = bbox(a[:, :, 3], pad=1); t = a[b[1]:b[3], b[0]:b[2]]
    save('og-' + n, t.copy(), width=round(t.shape[1] * .5))
    OG[n] = [int(b[0]), int(b[1]), int(t.shape[1]), int(t.shape[0])]; obottom = max(obottom, int(b[3]))
META['ogre'] = {'parts': OG, 'floor': obottom}
bg = Image.open(os.path.join(SRC, '배경_오우거.png')).convert('RGB')
bg.resize((1344, round(1344 * bg.height / bg.width)), Image.LANCZOS).save(os.path.join(OUT, 'ogre-bg.webp'), 'WEBP', quality=86, method=6)
META['ogre-bg'] = [bg.width, bg.height]
TPL = os.path.join('텍스쳐 템플릿')
# 템플릿 틀 그대로 그린 스킨 세트 → <prefix>-<부위>.webp + META[prefix] = {부위: [x, y, w, h]} (게임 단위, 발/손잡이 기준)
def tpl_set(tag, prefix):
    OS = {}
    for src, n, ox, oy, k in [('char/hat_guide_' + tag, 'hat', 192, 336, 4), ('char/suit-front_guide_' + tag, 'suit', 192, 336, 4), ('char/eyes_guide_' + tag, 'eyes', 192, 336, 4),
                              ('weapon/sword_guide_' + tag, 'sword', 192, 368, 8), ('weapon/bow_guide_' + tag, 'bow', 192, 368, 8), ('weapon/staff_guide_' + tag, 'staff', 192, 368, 8)]:
        if not os.path.exists(os.path.join(TPL, src + '.png')): continue
        a = np.asarray(Image.open(os.path.join(TPL, src + '.png')).convert('RGBA')).copy(); a[a[:, :, 3] == 0] = 0
        if n == 'eyes':   # 눈은 두 덩어리라 clean(가장 큰 덩어리만)을 쓰지 않음
            b0 = bbox(a[:, :, 3], pad=1); full = a[b0[1]:b0[3], b0[0]:b0[2]]; best = (b0[0], b0[1]); H0, W0 = full.shape[:2]
        else:
            full = clean(a, rel=.03); b0 = bbox(a[:, :, 3], pad=1); H0, W0 = full.shape[:2]; best = None
            for y in range(b0[1], b0[3] - H0 + 2):
                for x in range(b0[0], b0[2] - W0 + 2):
                    if np.array_equal(a[y:y + H0, x:x + W0, 3] > 8, full[:, :, 3] > 8): best = (x, y); break
                if best: break
            if not best: best = (b0[0], b0[1])
        save(prefix + '-' + n, full.copy())
        OS[n] = [round((best[0] - ox) / k, 3), round((best[1] - oy) / k, 3), round(W0 / k, 3), round(H0 / k, 3)]
    return OS
META['og'] = tpl_set('오우거', 'og')
META['mg'] = tpl_set('마법소녀', 'mg')   # 2026-11-18 마법소녀 스킨 (스킨샵)
META['fk'] = tpl_set('낚시왕', 'fk')   # 2026-11-19 낚시왕 스킨 (낚시점 보상)
META['mk'] = tpl_set('채굴왕', 'mk')   # 2026-11-19 채굴왕 스킨 (채광소 보상)
META['fa'] = tpl_set('농사왕', 'fa')   # 2026-11-20 농사왕 스킨 (텃밭 창고 보상)

# 10) 소원 분수 (2026-11-18 새 그림, 흰 배경): 그림 + 물 칸만 뗀 그림(물결·반짝임을 물 안에만 그리려고) + 위치(비율)
r = cut_bg(load('건물_분수')); b = bbox(r[:, :, 3]); t = r[b[1]:b[3], b[0]:b[2]]
save('fountain', t, width=420)
c = t[:, :, :3].astype(int); wm = (t[:, :, 3] > 200) & (c[:, :, 2] > c[:, :, 0] + 60) & (c[:, :, 2] > 150)
wm = np.asarray(Image.fromarray(wm.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))) > 0
w = t.copy(); w[:, :, 3] = np.where(wm, 255, 0); w[~wm] = 0
save('fountain-water', w, width=420)
H, W = t.shape[:2]; ys, xs = np.where(wm)
META['fountainAt'] = {'water': [round(xs.min() / W, 4), round(ys.min() / H, 4), round((xs.max() + 1) / W, 4), round((ys.max() + 1) / H, 4)],
  'spout': [round((765 - b[0]) / W, 4), round((375 - b[1]) / H, 4)], 'spoutR': [round(113 / W, 4), round(76 / H, 4)]}
print('fountain', META['fountainAt'], t.shape)

# 11) 헤어 8종 (2026-11-18): 템플릿 char/hair-front_guide_머리N.png (384×384, 발 (192,336), 1칸 4px) 흰색 → 게임이 머리 색을 곱해 입힘
HR = {}
for i in range(1, 9):
    a = np.asarray(Image.open(os.path.join('텍스쳐 템플릿', 'char', 'hair-front_guide_머리%d.png' % i)).convert('RGBA')).copy(); a[a[:, :, 3] == 0] = 0
    b = bbox(a[:, :, 3], pad=1); save('hair-%d' % i, a[b[1]:b[3], b[0]:b[2]], q=92)
    HR['h%d' % i] = [(b[0] - 192) / 4, (b[1] - 336) / 4, (b[2] - b[0]) / 4, (b[3] - b[1]) / 4]
META['hair'] = HR

# 12) 치복동 포탈 (2026-11-19): 사냥터 포탈처럼 그림 + 가운데 소용돌이 칸(가장 큰 파란 덩어리)
def _label(m):   # 4방향 덩어리 번호 (scipy 없이)
    h, w = m.shape; lab = np.zeros((h, w), np.int32); n = 0
    for y0, x0 in zip(*np.where(m)):
        if lab[y0, x0]: continue
        n += 1; q = deque([(y0, x0)]); lab[y0, x0] = n
        while q:
            y, x = q.popleft()
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not lab[ny, nx]: lab[ny, nx] = n; q.append((ny, nx))
    return lab, n
r = keep_rgba('A동 포탈'); b = bbox(r[:, :, 3]); t = r[b[1]:b[3], b[0]:b[2]]
save('dportal', t, width=480)
c = t[:, :, :3].astype(int); hole = (t[:, :, 3] > 200) & (c[:, :, 2] > c[:, :, 0] + 50) & (c[:, :, 2] > 170)
hm = np.asarray(Image.fromarray(hole.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))) > 0
lab, nlab = _label(hm); big = np.argmax(np.bincount(lab.ravel())[1:]) + 1; bl = lab == big
ol, _ = _label(~bl); edge = set(np.unique(np.concatenate([ol[0], ol[-1], ol[:, 0], ol[:, -1]]))) - {0}; ha = bl | ~np.isin(ol, list(edge)) & (ol > 0)
ys, xs = np.where(ha); hb = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
hole_img = t.copy(); hole_img[:, :, 3] = np.where(ha, 255, 0); hole_img = hole_img[hb[1]:hb[3], hb[0]:hb[2]]
im = Image.fromarray(hole_img, 'RGBA'); sc = 480 / t.shape[1]
im = im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS); im.save(os.path.join(OUT, 'dportal-hole.webp'), 'WEBP', quality=92, method=6)
H, W = t.shape[:2]
META['dportal'] = {'hole': [round(hb[0] / W, 4), round(hb[1] / H, 4), round((hb[2] - hb[0]) / W, 4), round((hb[3] - hb[1]) / H, 4)]}
print('dportal hole', hb, t.shape)

# 13) 벤치 (2026-11-20 새 그림, 배경 투명)
r = keep_rgba('벤치'); b = bbox(r[:, :, 3]); save('bench', r[b[1]:b[3], b[0]:b[2]], width=240)

json.dump(META, open(os.path.join(OUT, 'meta.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps(META, ensure_ascii=False))
