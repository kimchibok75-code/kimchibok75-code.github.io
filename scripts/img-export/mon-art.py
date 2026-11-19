# 2026-11-20 사냥터 몬스터 그림: 텍스쳐 템플릿/내 디자인/몬스터_*.png (4칸 × 2줄 한 판, 배경 투명) → assets/img/town/mon-<종류>.webp
# 다시 만들려면 (프로젝트 폴더에서): PYTHONUTF8=1 python scripts/img-export/mon-art.py
# 덩어리(이어진 부분)를 찾아 가운데가 속한 칸으로 묶음 → 옆 칸으로 삐져나온 날개도 그 몬스터 것으로, 옆 몬스터 조각은 안 섞임
import os, json
from collections import deque
import numpy as np
from PIL import Image

SRC = os.path.join('텍스쳐 템플릿', '내 디자인')
OUT = os.path.join('assets', 'img', 'town')
SHEETS = [
    ('몬스터_풀쥐, 성난 닭, 아기 멧돼지, 숲 늑대, 독버섯, 덩굴 괴물, 협곡 독수리, 돌 거북.png', ['rat', 'hen', 'boar', 'wolf', 'shroom', 'vine', 'eagle', 'turtle']),
    ('몬스터_바위 골렘, 녹슨 드론, 경비 로봇, 폭주 수리봇, 왕 멧돼지, 숲의 거대 곰, 협곡의 주인, 공장장 기계.png', ['golem', 'drone', 'guard', 'fixbot', 'kingboar', 'bear', 'lord', 'boss']),
    # 2026-11-20 폐광·늪지 (한 줄에 4마리)
    ('몬스터 폐광 박쥐 폐광 거미 광석 골렘 거대 두더지.png', ['bat', 'spider', 'ogolem', 'mole']),
    ('몬스터 독 뱀 늪지 악어 독성 슬라임 거대 코브라.png', ['snake', 'croc', 'slime', 'cobra']),
]
D = 4   # 덩어리 찾기는 1/4 크기로
meta = {}
for fn, ids in SHEETS:
    im = Image.open(os.path.join(SRC, fn)).convert('RGBA'); W, H = im.size
    W, H = W // D * D, H // D * D; im = im.crop((0, 0, W, H)); ROWS = len(ids) // 4
    A = np.asarray(im)[:, :, 3]
    small = A.reshape(H // D, D, W // D, D).max(axis=(1, 3)) > 24
    h, w = small.shape; lab = np.zeros((h, w), np.int32); comps = []
    for y in range(h):
        for x in range(w):
            if small[y, x] and not lab[y, x]:
                n = len(comps) + 1; lab[y, x] = n; q = deque([(y, x)]); pts = []
                while q:
                    cy, cx = q.popleft(); pts.append((cy, cx))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and small[ny, nx] and not lab[ny, nx]: lab[ny, nx] = n; q.append((ny, nx))
                p = np.array(pts); comps.append((n, len(pts), p[:, 0].mean(), p[:, 1].mean()))
    cell = {}
    for n, size, cy, cx in comps:
        if size < 6: continue   # 먼지
        k = int(cy * D // (H / ROWS)) * 4 + int(cx * D // (W / 4)); cell.setdefault(k, []).append(n)
    for k, mid in enumerate(ids):
        m = np.isin(lab, cell.get(k, [])); m = np.kron(m, np.ones((D, D), bool))
        # 경계 한 칸 넓혀서 가장자리 번짐이 안 잘리게
        mm = m.copy(); mm[1:] |= m[:-1]; mm[:-1] |= m[1:]; mm[:, 1:] |= m[:, :-1]; mm[:, :-1] |= m[:, 1:]
        arr = np.asarray(im).copy(); arr[~mm, 3] = 0
        ys, xs = np.where(arr[:, :, 3] > 8)
        c = Image.fromarray(arr).crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
        s = 256 / max(c.size); c = c.resize((round(c.width * s), round(c.height * s)), Image.LANCZOS)
        c.save(os.path.join(OUT, f'mon-{mid}.webp'), 'WEBP', quality=90, method=6)
        meta[mid] = [c.width, c.height]; print(mid, c.size)
old = json.load(open(os.path.join(OUT, 'mon-meta.json'))) if os.path.exists(os.path.join(OUT, 'mon-meta.json')) else {}
old.update(meta); meta = old
json.dump(meta, open(os.path.join(OUT, 'mon-meta.json'), 'w'), ensure_ascii=False)
