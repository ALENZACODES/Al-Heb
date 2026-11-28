"""Book picture focus boxes: where the drawing is inside each page picture.

Many book pictures put the subject at one side of a wide sheet of blank paper (25 Nov 2026 audit: on first view the page looked
like an empty beige wall). This finds the drawn area of every assets/books/*/*.jpg and writes data/books/focus.json:
{ "BOOK53_p01": [x0, y0, x1, y1], ... } as fractions of the picture (0..1), padded a little. src/books/book.view.js crops the
picture to that box. A picture whose drawing already fills the sheet is left out (nothing to crop).

Run: python3 tools/books/focus.py   (needs Pillow; re-run when book pictures change)
"""
import json, os, sys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC, OUT = os.path.join(ROOT, 'assets', 'books'), os.path.join(ROOT, 'data', 'books', 'focus.json')
W = 240           # analysis width
PAD = 0.04        # padding around the drawing, fraction of the picture
KEEP = 0.86       # a box covering at least this share of both sides is "already full"

def ink_box(path):
    im = Image.open(path).convert('RGB'); im.thumbnail((W, W * 2))
    hsv = im.convert('HSV'); w, h = im.size
    px, hv = im.load(), hsv.load()
    # paper: light and nearly grey. Anything else (colour, line work, shading) is drawing.
    ink = [[(hv[x, y][1] > 34 or sum(px[x, y]) < 3 * 196) for x in range(w)] for y in range(h)]
    cols = [sum(ink[y][x] for y in range(h)) / h for x in range(w)]
    rows = [sum(ink[y]) / w for y in range(h)]
    def span(v, n):
        on = [i for i, f in enumerate(v) if f > 0.03]
        return (on[0] / n, (on[-1] + 1) / n) if on else (0, 1)
    (x0, x1), (y0, y1) = span(cols, w), span(rows, h)
    x0, y0, x1, y1 = max(0, x0 - PAD), max(0, y0 - PAD), min(1, x1 + PAD), min(1, y1 + PAD)
    return [round(x0, 3), round(y0, 3), round(x1, 3), round(y1, 3)]

def main():
    out = {}
    for d in sorted(os.listdir(SRC)):
        p = os.path.join(SRC, d)
        if not os.path.isdir(p): continue
        for f in sorted(os.listdir(p)):
            if not f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')): continue
            b = ink_box(os.path.join(p, f))
            if (b[2] - b[0]) >= KEEP and (b[3] - b[1]) >= KEEP: continue
            out[os.path.splitext(f)[0]] = b
    with open(OUT, 'w') as fh:
        fh.write('{\n' + ',\n'.join(f' {json.dumps(k)}: {json.dumps(v)}' for k, v in out.items()) + '\n}\n')
    print(f'{len(out)} pictures get a focus box -> {os.path.relpath(OUT, ROOT)}')

if __name__ == '__main__':
    sys.exit(main())
