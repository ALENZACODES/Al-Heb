# Placeholder Rimon stills for tools/qa/qa-rimon-stills.mjs: the reference Rimon cut out, framed like the spec
# (docs/images/RIMON-STILLS.md) and stamped with the still number. Written OUTSIDE the repo; never committed.
#   python3 -I tools/qa/rimon-placeholders.py assets/img/gen/MASCOT_rimon.800.webp <out dir>
import sys, json
from PIL import Image, ImageDraw, ImageFont
src, out = sys.argv[1], sys.argv[2]
import os; os.makedirs(out, exist_ok=True)
ref = Image.open(src).convert('RGBA')
px = ref.load()
for y in range(ref.height):
    for x in range(ref.width):
        r, g, b, a = px[x, y]
        if abs(r - 0xFA) + abs(g - 0xF2) + abs(b - 0xE0) < 40: px[x, y] = (0, 0, 0, 0)
ref = ref.crop(ref.getbbox())
S = 512; h = int(S * 0.80); w = int(ref.width * h / ref.height)
body = ref.resize((w, h), Image.LANCZOS)
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', 64)
for n in range(1, 201):
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    im.alpha_composite(body, ((S - w) // 2, int(S * 0.08)))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((300, 380, 500, 470), 22, fill=(30, 70, 52, 235), outline=(212, 166, 71, 255), width=5)
    d.text((400, 425), f'{n:03d}', font=font, fill=(242, 210, 124, 255), anchor='mm')
    im.save(f'{out}/rimon-{n:03d}.webp', 'WEBP', quality=80)
json.dump({'ids': list(range(1, 201))}, open(f'{out}/present.json', 'w'))
print('ok')
