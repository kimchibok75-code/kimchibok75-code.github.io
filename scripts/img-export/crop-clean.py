# 2026-11-21 작물 그림 둘레의 옅은 번짐(반투명 얼룩)을 지워 다시 만듦 → 테두리가 깔끔하게
# 실행: PYTHONUTF8=1 python scripts/img-export/crop-clean.py c31=작물_0030_인삼.png c34=작물_0001_산삼.png
import os, sys
import numpy as np
from PIL import Image
CD = os.path.join('텍스쳐 템플릿', '내 디자인', '작물'); OUT = os.path.join('assets', 'img', 'crop'); CUT = 110
for arg in sys.argv[1:]:
    cid, f = arg.split('=', 1)
    a = np.asarray(Image.open(os.path.join(CD, f)).convert('RGBA')).copy()
    al = a[:, :, 3].astype(float)
    al = np.clip((al - CUT) / (230 - CUT) * 255, 0, 255)   # 옅은 건 지우고, 가장자리는 부드럽게 남김
    a[:, :, 3] = al.astype(np.uint8); a[al == 0] = 0
    im = Image.fromarray(a, 'RGBA'); ys, xs = np.where(al > 8); im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    s = 200 / max(im.size); im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    im.save(os.path.join(OUT, cid + '.webp'), 'WEBP', quality=88, method=6); print(cid, im.size)
