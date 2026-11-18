import sys, json
from PIL import ImageFont
src = open(sys.argv[1], encoding='utf8').read()
chars = sorted(set(src) | set(chr(i) for i in range(32, 127)) | set('●•·×≈…—–：，。？（）%'))
out = {}
for w in (400, 500, 700):
    f = ImageFont.truetype('/workspace/fonts/NotoSansSC.ttf', 100)
    f.set_variation_by_axes([w])
    out[w] = {c: round(f.getlength(c) / 100, 4) for c in chars if c not in '\n\r\t'}
json.dump(out, open(sys.argv[2], 'w', encoding='utf8'), ensure_ascii=False)
