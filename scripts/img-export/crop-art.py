# 2026-11-20 텃밭 개편: 작물 그림 → assets/img/crop/c번호.webp, 작물 표(엑셀) → assets/js/game-crop.js
# 다시 만들려면 (프로젝트 폴더에서): PYTHONUTF8=1 python scripts/img-export/crop-art.py  (엑셀·그림을 바꾼 뒤)
import os, re, json
import numpy as np
from PIL import Image
import openpyxl

SRC = os.path.join('텍스쳐 템플릿', '내 디자인')
CD = os.path.join(SRC, '작물')
OUT = os.path.join('assets', 'img', 'crop')
os.makedirs(OUT, exist_ok=True)

def trim(im):
    a = np.asarray(im)[:, :, 3]; ys, xs = np.where(a > 8)
    return im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))

wb = openpyxl.load_workbook(os.path.join(CD, '텃밭게임_최종기획_밸런스.xlsx'), data_only=True)
rows = [r for r in list(wb['작물40종'].iter_rows(values_only=True))[1:] if r[0]]
hoes = [r for r in list(wb['농기구10단계'].iter_rows(values_only=True))[1:] if r[0]]
ferts = [r for r in list(wb['비료10단계'].iter_rows(values_only=True))[1:] if r[0]]
key = lambda s: re.sub(r'[\s\-]', '', s)
imgs = {}
for f in os.listdir(CD):
    m = re.match(r'작물_\d+_(.+)\.png$', f)
    if m: imgs[key(m.group(1))] = f
G = {'일반': 'normal', '희귀': 'rare', '전설': 'legend'}
ICON = {'콩나물': '🌱', '상추': '🥬', '시금치': '🥬', '쪽파': '🧅', '당근': '🥕', '무': '🥕', '감자': '🥔', '고구마': '🍠', '양파': '🧅', '마늘': '🧄', '오이': '🥒',
        '가지': '🍆', '토마토': '🍅', '고추': '🌶️', '옥수수': '🌽', '양배추': '🥬', '배추': '🥬', '브로콜리': '🥦', '딸기': '🍓', '수박': '🍉', '참외': '🍈', '호박': '🎃',
        '파프리카': '🫑', '땅콩': '🥜', '블루베리': '🫐', '라즈베리': '🍓', '아스파라거스': '🌱', '황금향': '🍊', '멜론': '🍈', '샤인머스캣': '🍇', '인삼': '🌿',
        '송로버섯': '🍄', '거대 호박': '🎃', '산삼': '🌿', '황금 당근': '🥕', '루비 딸기': '🍓', '무지개 배추': '🥬', '다이아몬드 호박': '🎃', '은하 수박': '🍉', '세계수의 열매': '🌳'}
out, missing = [], []
for i, r in enumerate(rows, 1):
    grade, name, mn, mx, base, hoe, lp = r[:7]
    cid = f'c{i}'
    src = imgs.get(key(name)); has = 0
    if src:
        im = trim(Image.open(os.path.join(CD, src)).convert('RGBA'))
        s = 200 / max(im.size); im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        im.save(os.path.join(OUT, cid + '.webp'), 'WEBP', quality=88, method=6); has = 1
    else: missing.append(name)
    out.append([cid, G[grade], ICON.get(name, '🌱'), name, mn, mx, base, hoe, round((lp or 0) * 1000), has])
js = '// 2026-11-20 텃밭 개편: 텍스쳐 템플릿/내 디자인/작물/텃밭게임_최종기획_밸런스.xlsx 에서 자동으로 만든 파일 (손으로 고치지 말고 crop-art.py를 다시 돌리기)\n'
js += '// [id, 등급, 아이콘, 이름, 최소 g, 최대 g, 기본가, 최소 호미 Lv, 전설 가중치(Lv10 절대확률 × 1000), 그림 있음]\n'
js += 'export const CROP_TABLE = [\n' + ',\n'.join('  ' + json.dumps(o, ensure_ascii=False) for o in out) + '\n];\n'
js += '// 호미 [이름, 최대 무게 g, 밭 칸 수, 성장 시간 감소율, 값, 필요 누적 수확]\n'
js += 'export const HOE_TABLE = [\n' + ',\n'.join('  ' + json.dumps([h[1], h[2], h[3], h[4], h[5], h[6]], ensure_ascii=False) for h in hoes) + '\n];\n'
js += '// 비료 [이름, 일반 %, 희귀 %, 전설 %, 값, 필요 누적 수확]\n'
js += 'export const FERT_TABLE = [\n' + ',\n'.join('  ' + json.dumps([f[1], round(f[2] * 100, 3), round(f[3] * 100, 3), round(f[4] * 100, 3), f[5], f[6]], ensure_ascii=False) for f in ferts) + '\n];\n'
open(os.path.join('assets', 'js', 'game-crop.js'), 'w', encoding='utf8', newline='\n').write(js)
print('crops', len(out), 'no image:', missing)

# 2) 농사 랭킹판 (건물 그림, 텃밭 창고 옆)
im = trim(Image.open(os.path.join(SRC, '농사 랭킹판.png')).convert('RGBA'))
if im.width > 720: im = im.resize((720, round(im.height * 720 / im.width)), Image.LANCZOS)
im.save(os.path.join('assets', 'img', 'town', 'b-farmrank.webp'), 'WEBP', quality=90, method=6)
print('board', im.size)
