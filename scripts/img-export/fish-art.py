# 2026-11-20 낚시 개편: 물고기 그림 + 낚시 랭킹판 그림 → webp, 물고기 표(엑셀) → assets/js/game-fish.js
# 다시 만들려면: python scripts/img-export/fish-art.py  (엑셀·그림을 바꾼 뒤)
import os, re, json
import numpy as np
from PIL import Image
import openpyxl

SRC = os.path.join('텍스쳐 템플릿', '내 디자인')
FD = os.path.join(SRC, '물고기')
OUT = os.path.join('assets', 'img', 'fish')
os.makedirs(OUT, exist_ok=True)

def trim(im):
    a = np.asarray(im)[:, :, 3]; ys, xs = np.where(a > 8)
    return im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))

# 1) 엑셀 표
wb = openpyxl.load_workbook(os.path.join(FD, '낚시게임_최종밸런스표.xlsx'), data_only=True)
rows = [r for r in list(wb.worksheets[0].iter_rows(values_only=True))[1:] if r[0]]
key = lambda s: re.sub(r'[\s\-]', '', s)
imgs = {}
for f in os.listdir(FD):
    m = re.match(r'물고기_\d+_(.+)\.png$', f)
    if m: imgs[key(m.group(1))] = f
G = {'일반': 'normal', '희귀': 'rare', '전설': 'legend'}
ICON = {'붕어': '🐟', '잉어': '🐟', '미꾸라지': '🐍', '장어': '🐍', '참게': '🦀', '꽃게': '🦀', '자라': '🐢', '바다거북': '🐢', '낡은 장화': '👢', '다슬기': '🐚', '소라': '🐚',
        '민물새우': '🦐', '대하': '🦐', '불가사리': '⭐', '복어': '🐡', '문어': '🐙', '대왕문어': '🐙', '대왕오징어': '🦑', '해파리': '🪼', '망령 해파리': '🪼',
        '상어': '🦈', '기계 상어': '🦈', '고래상어': '🦈', '돌고래': '🐬', '아기 고래': '🐋', '은하 고래': '🐋', '김치 잉어': '🥬', '강의 용': '🐉', '황금 붕어': '👑', '황금 참치': '👑',
        '수정 리바이어던': '🐉', '쏘가리': '🐠', '열목어': '🐠', '해마': '🐠', '참돔': '🐠', '쥐치': '🐠', '블루길': '🐠', '가오리': '🐟'}
out, missing = [], []
for i, r in enumerate(rows, 1):
    water, grade, name, mn, mx, p, base, rod, meas = r[:9]
    fid = f'f{i}'
    src = imgs.get(key(name)); has = 0
    if src:
        im = trim(Image.open(os.path.join(FD, src)).convert('RGBA'))
        s = 200 / max(im.size); im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        im.save(os.path.join(OUT, fid + '.webp'), 'WEBP', quality=88, method=6); has = 1
    else: missing.append(name)
    out.append([fid, 'sea' if water == '바다' else 'river', G[grade], ICON.get(name, '🐟'), name, mn, mx, round(p * 100, 5), base, rod, meas, has])
js = '// 2026-11-20 낚시 개편: 텍스쳐 템플릿/내 디자인/물고기/낚시게임_최종밸런스표.xlsx 에서 자동으로 만든 파일 (손으로 고치지 말고 fish-art.py를 다시 돌리기)\n'
js += '// [id, 물(river 민물 / sea 바다), 등급, 아이콘, 이름, 최소 cm, 최대 cm, 등장 가중치(미끼 Lv10 기준 %), 기본 판매가, 최소 낚싯대 Lv, 크기 재는 곳, 그림 있음]\n'
js += 'export const FISH_TABLE = [\n' + ',\n'.join('  ' + json.dumps(o, ensure_ascii=False) for o in out) + '\n];\n'
open(os.path.join('assets', 'js', 'game-fish.js'), 'w', encoding='utf8', newline='\n').write(js)
print('fish', len(out), 'no image:', missing)

# 2) 낚시 랭킹판 (건물 그림)
im = trim(Image.open(os.path.join(SRC, '낚시 랭킹판.png')).convert('RGBA'))
if im.width > 720: im = im.resize((720, round(im.height * 720 / im.width)), Image.LANCZOS)
im.save(os.path.join('assets', 'img', 'town', 'b-fishrank.webp'), 'WEBP', quality=90, method=6)
print('board', im.size)
