#!/usr/bin/env python3
"""Generate the SYNTHETIC Hebrew OCR benchmark (rendered text, NOT photographs).

Usage: python3 tools/ocr-bench/gen.py [outdir]   (default data/photo/_benchmark)
Needs Pillow (with raqm) + numpy + opencv. Deterministic (fixed seed).
Output: <outdir>/images/*.png and <outdir>/ground-truth.json
Every image is rendered text + simulated degradation. Real phone photos behave differently; accuracy measured
here must never be quoted as real-photo accuracy.
"""
import json, random, re, sys, unicodedata
from pathlib import Path
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'data/photo/_benchmark'
(OUT / 'images').mkdir(parents=True, exist_ok=True)
F = ROOT / 'assets/fonts'
FONTS = {
    'frank-ruhl': F / 'frankruhllibre-FrankRuhlLibre[wght].ttf',
    'noto-serif': F / 'notoserifhebrew-NotoSerifHebrew[wdth,wght].ttf',
    'heebo': F / 'heebo-Heebo[wght].ttf',
    'alef-bold': F / 'alef-Alef-Bold.ttf',
    'noto-sans': F / 'notosanshebrew-NotoSansHebrew[wdth,wght].ttf',
    'freeserif': Path('/usr/share/fonts/truetype/freefont/FreeSerif.ttf'),
    'dejavu': Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'),
}
rng = random.Random(1234)
np_rng = np.random.default_rng(1234)

def font(name, size):
    return ImageFont.truetype(str(FONTS[name]), size, layout_engine=ImageFont.Layout.RAQM)

def strip_marks(s):
    return re.sub('[֑-ׇֽֿׁׂׅׄ]', '', s)

def render(lines, fname, size, fg=(15, 15, 15), bg=(250, 248, 240), pad=36, spacing=1.45, align='right'):
    f = font(fname, size)
    widths = [f.getlength(l, direction='rtl', language='he') for l in lines]
    if max(widths) > 1500:  # keep files small: shrink long lines
        size = int(size * 1500 / max(widths)); f = font(fname, size)
        widths = [f.getlength(l, direction='rtl', language='he') for l in lines]
    W = int(max(widths)) + 2 * pad
    H = int(size * spacing * len(lines)) + 2 * pad
    img = Image.new('RGB', (W, H), bg)
    d = ImageDraw.Draw(img)
    for i, l in enumerate(lines):
        w = f.getlength(l, direction='rtl', language='he')
        x = W - pad - w if align == 'right' else (W - w) / 2
        d.text((x, pad + i * size * spacing), l, font=f, fill=fg, direction='rtl', language='he')
    return img

# ---------------- degradations (cv2 / numpy) ----------------
def to_cv(img): return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
def from_cv(a): return Image.fromarray(cv2.cvtColor(a, cv2.COLOR_BGR2RGB))
def border(a): return tuple(int(v) for v in a[0, 0])

def v_clean(a): return a
def v_noise(a):
    n = np_rng.normal(0, 22, a.shape)
    out = np.clip(a.astype(np.float32) + n, 0, 255).astype(np.uint8)
    ok, enc = cv2.imencode('.jpg', out, [cv2.IMWRITE_JPEG_QUALITY, 35])
    return cv2.imdecode(enc, 1)
def v_blur(a):
    h, w = a.shape[:2]
    s = cv2.resize(a, (int(w * 0.6), int(h * 0.6)), interpolation=cv2.INTER_AREA)
    s = cv2.GaussianBlur(s, (0, 0), 1.6)
    return cv2.resize(s, (w, h), interpolation=cv2.INTER_LINEAR)
def v_rotate(a):
    ang = rng.choice([-6, -4, 4, 6])
    h, w = a.shape[:2]
    M = cv2.getRotationMatrix2D((w / 2, h / 2), ang, 1.0)
    return cv2.warpAffine(a, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
def v_persp(a):
    h, w = a.shape[:2]
    j = 0.07
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    dst = np.float32([[rng.uniform(0, j) * w, rng.uniform(0, j) * h], [w - rng.uniform(0, j) * w, rng.uniform(0, 0.02) * h],
                      [w - rng.uniform(0, j / 2) * w, h - rng.uniform(0, j) * h], [rng.uniform(0, 0.02) * w, h - rng.uniform(0, j) * h]])
    M = cv2.getPerspectiveTransform(src, dst)
    return cv2.warpPerspective(a, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
def v_lowc(a):
    f = a.astype(np.float32)
    f = 140 + (f - f.min()) / max(1, f.max() - f.min()) * 55   # squeeze into 140..195
    f += np_rng.normal(0, 6, f.shape)
    # uneven lighting gradient
    h, w = a.shape[:2]
    g = np.linspace(0.8, 1.0, w)[None, :, None]
    return np.clip(f * g, 0, 255).astype(np.uint8)
VARIANTS = {'clean': v_clean, 'noise': v_noise, 'blur': v_blur, 'rotate': v_rotate, 'perspective': v_persp, 'lowcontrast': v_lowc}

# ---------------- text sources ----------------
reg = json.load(open(ROOT / 'data/corpus/registry.json'))['entries']
byid = {e['id']: e for e in reg}
pb = json.load(open(ROOT / 'data/corpus/phrasebook.json'))['entries']

SIDDUR = [('bless-priestly-1', 'frank-ruhl'), ('bless-priestly-2', 'frank-ruhl'), ('bless-priestly-3', 'noto-serif'),
          ('shema-1', 'frank-ruhl'), ('shema-2', 'noto-serif'), ('mah-tovu-1', 'freeserif'), ('modeh-ani-1', 'frank-ruhl'),
          ('mi-chamocha-1', 'noto-serif')]
PAGES = [('bless-priestly-1', 'bless-priestly-2', 'bless-priestly-3'), ('shema-1', 'shema-2', 'vahavta-1'), ('mah-tovu-1', 'modeh-ani-1', 'mi-chamocha-1')]

# unpointed sign/menu items; ground truth = phrasebook Hebrew with points removed. Short ones only.
cands = [e for e in pb if 1 <= len(strip_marks(e['he']).split()) <= 3 and len(strip_marks(e['he'])) <= 22 and '?' not in e['he']]
rng.shuffle(cands)
SIGNS = cands[:12]
EXTRA_SIGNS = ['קפה 12.50', 'חלב 8.90', 'פיתה 5', 'מסעדה כשרה']   # menu-style with digits (hand-written here)
SIGN_STYLES = [  # (font, size, fg, bg)
    ('heebo', 74, (255, 255, 255), (20, 70, 150)), ('alef-bold', 80, (10, 10, 10), (245, 205, 40)),
    ('noto-sans', 70, (255, 255, 255), (30, 110, 60)), ('dejavu', 66, (20, 20, 20), (235, 235, 235)),
    ('heebo', 72, (200, 30, 30), (255, 255, 255)), ('alef-bold', 76, (255, 255, 255), (110, 20, 30)),
]

gt = []
def add(img, base_id, kind, fontname, lines, source, variants):
    a = to_cv(img)
    for vn in variants:
        out = VARIANTS[vn](a.copy())
        ext = 'jpg' if vn in ('noise', 'lowcontrast') else 'png'  # keeps repo size down
        name = f'{base_id}__{vn}.{ext}'
        cv2.imwrite(str(OUT / 'images' / name), out, [cv2.IMWRITE_JPEG_QUALITY, 85] if ext == 'jpg' else [])
        gt.append({'id': f'{base_id}__{vn}', 'file': f'images/{name}', 'kind': kind, 'variant': vn, 'base': base_id, 'font': fontname,
                   'lines': lines, 'consonantLines': [strip_marks(l) for l in lines], 'source': source,
                   'synthetic': True})

ALLV = list(VARIANTS)
for rid, fn in SIDDUR:
    line = byid[rid]['he']
    add(render([line], fn, 60), f'siddur-{rid}', 'siddur-line', fn, [line], f'registry:{rid}', ALLV)
for ids in PAGES:
    lines = [byid[i]['he'] for i in ids]
    add(render(lines, 'frank-ruhl', 52), f'page-{ids[0]}', 'siddur-page', 'frank-ruhl', lines, 'registry:' + '+'.join(ids), ['clean', 'rotate', 'noise'])
for i, e in enumerate(SIGNS):
    txt = strip_marks(e['he']).strip()
    fn, sz, fg, bg = SIGN_STYLES[i % len(SIGN_STYLES)]
    add(render([txt], fn, sz, fg, bg, pad=40, align='center'), f'sign-{e["id"]}', 'sign', fn, [txt], f'phrasebook:{e["id"]}', ALLV)
for i, txt in enumerate(EXTRA_SIGNS):
    fn, sz, fg, bg = SIGN_STYLES[(i + 2) % len(SIGN_STYLES)]
    add(render([txt], fn, sz, fg, bg, pad=40, align='center'), f'menu-{i+1}', 'sign', fn, [txt], 'hand-written for this benchmark', ['clean', 'noise', 'blur', 'perspective'])

json.dump({'synthetic': True, 'note': 'Rendered text with simulated degradation. NOT real photographs. Do not quote as real-photo accuracy.',
           'built_with': 'tools/ocr-bench/gen.py', 'seed': 1234, 'count': len(gt), 'items': gt},
          open(OUT / 'ground-truth.json', 'w'), ensure_ascii=False, indent=1)
print(f'wrote {len(gt)} images to {OUT}')
from collections import Counter
print(Counter(g['kind'] for g in gt), Counter(g['variant'] for g in gt))
