# 2026-11-21 빙고 마스터 스킨: 사용자가 한 판(내 디자인/스킨_빙고 마스터.png)에 6부위를 그려서,
# 부위마다 잘라 은은한 빛(옅은 알파)을 지우고 → 사이버 전사 템플릿 그림이 차지한 자리(크기·위치)에 맞춰 넣어
# 텍스쳐 템플릿/char·weapon/*_guide_빙고마스터.png 를 만듦. 그다음 town-art.py의 tpl_set('빙고마스터', 'bm')이 게임 그림으로 바꿈
# 실행: 프로젝트 폴더에서 PYTHONUTF8=1 python scripts/img-export/bingo-skin.py
import os
import numpy as np
from PIL import Image

SRC = '텍스쳐 템플릿/내 디자인/스킨_빙고 마스터.png'; TPL = '텍스쳐 템플릿'; REF = '사이버전사'; TAG = '빙고마스터'
CUT = 120   # 이 값보다 옅은 알파(빛 번짐)는 지움
sheet = np.asarray(Image.open(SRC).convert('RGBA')).copy()
# 판에서 부위 자리 (x0, y0, x1, y1), 어디에 넣을지, 맞추는 방법
PARTS = [
    ('hat', (20, 20, 540, 425), 'char/hat_guide', 'bottom', 1.08),
    ('suit', (535, 40, 1005, 480), 'char/suit-front_guide', 'center', 1.0),
    ('eyes', (1020, 170, 1522, 380), 'char/eyes_guide', 'center', 1.0),
    ('sword', (80, 455, 425, 1015), 'weapon/sword_guide', 'center', 1.0),
    ('bow', (465, 500, 1065, 915), 'weapon/bow_guide', 'center', 1.0),   # 판에는 가로(위가 활대) → 템플릿처럼 세움(활대가 오른쪽)
    ('staff', (1090, 445, 1430, 1015), 'weapon/staff_guide', 'center', 1.0),
]
def bbox(al, t=8):
    ys = np.where((al > t).any(1))[0]; xs = np.where((al > t).any(0))[0]
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
for n, (x0, y0, x1, y1), dst, how, grow in PARTS:
    p = sheet[y0:y1, x0:x1].copy()
    p[p[:, :, 3] < CUT] = 0; p[:, :, 3] = np.where(p[:, :, 3] > 0, 255, 0)
    bx = bbox(p[:, :, 3]); p = p[bx[1]:bx[3], bx[0]:bx[2]]
    im = Image.fromarray(p, 'RGBA')
    if n == 'bow': im = im.rotate(-90, expand=True)
    ref = Image.open(os.path.join(TPL, f'{dst}_{REF}.png')).convert('RGBA'); W, H = ref.size
    rx0, ry0, rx1, ry1 = bbox(np.asarray(ref)[:, :, 3], 140); rw, rh = (rx1 - rx0) * grow, (ry1 - ry0) * grow
    sc = min(rw / im.width, rh / im.height); im = im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS)
    a = np.asarray(im).copy(); a[:, :, 3] = np.where(a[:, :, 3] > 127, 255, 0); a[a[:, :, 3] == 0] = 0; im = Image.fromarray(a, 'RGBA')
    cx = (rx0 + rx1) / 2; px = round(cx - im.width / 2)
    py = round(ry1 - im.height) if how == 'bottom' else round((ry0 + ry1) / 2 - im.height / 2)
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0)); out.alpha_composite(im, (px, py))
    out.save(os.path.join(TPL, f'{dst}_{TAG}.png'))
    print(n, im.size, (px, py))
