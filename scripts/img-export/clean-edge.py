# 그림 바깥 라인 정리 (2026-11-18): 반투명 번짐·떨어진 작은 점 지우기 → 작은 홈 메우기 → 가장자리 부드럽게(안티에일리어싱)
# 쓰는 법: python scripts/img-export/clean-edge.py "원본.png" "저장할.png"
# 원본은 그대로 두고 새 파일로 저장함
import sys
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA')
a = np.asarray(im).astype(np.float32)
rgb, al = a[:, :, :3], a[:, :, 3]
H, W = al.shape

# 1) 확실히 그림인 곳 (반투명 번짐은 버림)
solid = al >= 128

# 2) 떨어진 작은 덩어리(점·부스러기) 지우기: 이어진 덩어리 중 가장 큰 것의 0.3% 보다 작으면 버림
st = 2
s2 = solid[::st, ::st]; h2, w2 = s2.shape
lab = -np.ones((h2, w2), np.int32); areas = []
for y in range(h2):
    row = s2[y]
    for x in range(w2):
        if not row[x] or lab[y, x] >= 0: continue
        k = len(areas); q = deque([(y, x)]); lab[y, x] = k; n = 0
        while q:
            cy, cx = q.popleft(); n += 1
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < h2 and 0 <= nx < w2 and s2[ny, nx] and lab[ny, nx] < 0:
                    lab[ny, nx] = k; q.append((ny, nx))
        areas.append(n)
big = max(areas)
keep = np.array([n >= big * .003 for n in areas] + [False])
km = keep[lab]
km = np.repeat(np.repeat(km, st, 0), st, 1)[:H, :W]
km = np.asarray(Image.fromarray(km.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5))) > 0   # 경계 보호
solid &= km
print('덩어리', len(areas), '→ 남김', int(keep[:-1].sum()))

# 3) 작은 홈 메우기(닫기) + 가는 털 지우기(열기)
m = Image.fromarray(solid.astype(np.uint8) * 255)
m = m.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))   # 닫기
m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))   # 열기

# 4) 부드러운 가장자리: 살짝 흐린 뒤 경계만 반투명으로 (약 1.5px 폭)
b = np.asarray(m.filter(ImageFilter.GaussianBlur(1.1))).astype(np.float32) / 255
alpha = np.clip((b - .5) * 2.6 + .5, 0, 1)

# 5) 새로 채워진 칸의 색: 가까운 원래 색으로 (번진 회색이 남지 않게)
good = al >= 200
col = rgb.copy(); filled = good.copy()
for _ in range(6):
    if filled.all(): break
    acc = np.zeros_like(col); cnt = np.zeros((H, W), np.float32)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        sh = np.roll(np.roll(col, dy, 0), dx, 1); sf = np.roll(np.roll(filled, dy, 0), dx, 1)
        acc += sh * sf[:, :, None]; cnt += sf
    new = (~filled) & (cnt > 0)
    col[new] = acc[new] / cnt[new][:, None]; filled |= new

out = np.dstack([col, alpha * 255]).round().clip(0, 255).astype(np.uint8)
out[alpha <= 0] = 0
Image.fromarray(out, 'RGBA').save(dst)
print('저장:', dst)
