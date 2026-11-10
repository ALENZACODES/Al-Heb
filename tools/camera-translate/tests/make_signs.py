#!/usr/bin/env python3
"""Generate the 20 SYNTHETIC Hebrew sign images used by the tests and by eval.py.

Usage: python3 tools/camera-translate/tests/make_signs.py     (writes tests/signs/*.jpg|png and tests/signs/ground-truth.json)
These are rendered text with simulated wear (noise, blur, tilt, perspective), NOT photographs. Accuracy measured on them
must never be quoted as real-photo accuracy. Deterministic (fixed seed). Same method as tools/ocr-bench/gen.py.
"""
import json, random
from pathlib import Path
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = HERE / 'signs'
F = ROOT / 'assets/fonts'
FONTS = {'heebo': F / 'heebo-Heebo[wght].ttf', 'alef-bold': F / 'alef-Alef-Bold.ttf', 'alef': F / 'alef-Alef-Regular.ttf',
         'noto-sans': F / 'notosanshebrew-NotoSansHebrew[wdth,wght].ttf', 'frank-ruhl': F / 'frankruhllibre-FrankRuhlLibre[wght].ttf'}
BLUE, GREEN, RED, YELLOW, WHITE, DARK, CREAM = (20, 70, 150), (30, 110, 60), (170, 25, 30), (245, 205, 40), (255, 255, 255), (15, 15, 15), (250, 246, 232)
# (id, kind, [(hebrew, english)], font, size, fg, bg, align, variant)
SIGNS = [
 ('optical-store', 'shop', [('חנות אופטיקה', 'Optical Store')], 'heebo', 84, WHITE, BLUE, 'center', 'clean'),
 ('bakery', 'shop', [('מאפייה', 'Bakery')], 'alef-bold', 96, DARK, YELLOW, 'center', 'clean'),
 ('pharmacy', 'shop', [('בית מרקחת', 'Pharmacy')], 'noto-sans', 84, WHITE, GREEN, 'center', 'clean'),
 ('exit', 'door', [('יציאה', 'Exit')], 'alef-bold', 110, WHITE, GREEN, 'center', 'clean'),
 ('closed', 'door', [('סגור', 'Closed')], 'heebo', 120, RED, WHITE, 'center', 'clean'),
 # Two signs kept OUTSIDE the sign word list on purpose, so the set always shows what happens to an unlisted sign.
 ('shoe-shop', 'shop', [('חנות נעליים', 'Shoe Shop')], 'alef-bold', 84, DARK, CREAM, 'center', 'clean'),
 ('new-price', 'shop', [('מחיר חדש', 'New Price')], 'heebo', 84, WHITE, RED, 'center', 'clean'),
 ('no-entry', 'door', [('אין כניסה', 'No Entry')], 'alef-bold', 90, WHITE, RED, 'center', 'noise'),
 ('restrooms', 'door', [('שירותים', 'Restrooms')], 'noto-sans', 92, DARK, (235, 235, 235), 'center', 'blur'),
 ('herzl-street', 'street', [('רחוב הרצל', 'Herzl Street')], 'alef-bold', 88, WHITE, BLUE, 'center', 'clean'),
 ('ben-yehuda-blvd', 'street', [('שדרות בן יהודה', 'Ben Yehuda Boulevard')], 'heebo', 76, WHITE, BLUE, 'center', 'perspective'),
 ('dizengoff-square', 'street', [('כיכר דיזנגוף', 'Dizengoff Square')], 'alef-bold', 80, WHITE, BLUE, 'center', 'rotate'),
 ('bus-stop', 'street', [('תחנת אוטובוס', 'Bus Stop')], 'noto-sans', 80, DARK, YELLOW, 'center', 'clean'),
 ('synagogue', 'street', [('בית כנסת', 'Synagogue')], 'frank-ruhl', 92, DARK, CREAM, 'center', 'noise'),
 ('menu-drinks', 'menu', [('תפריט', 'Menu'), ('קפה 12', 'Coffee 12'), ('תה 10', 'Tea 10')], 'alef', 64, DARK, CREAM, 'right', 'clean'),
 ('menu-food', 'menu', [('חומוס 18', 'Hummus 18'), ('פלאפל 22', 'Falafel 22'), ('סלט 25', 'Salad 25')], 'heebo', 62, WHITE, (40, 40, 40), 'right', 'clean'),
 ('menu-courses', 'menu', [('מנה ראשונה', 'Starter'), ('מרק', 'Soup'), ('קינוחים', 'Desserts')], 'frank-ruhl', 64, DARK, WHITE, 'right', 'blur'),
 ('kosher-restaurant', 'shop', [('מסעדה כשרה', 'Kosher Restaurant'), ('ברוכים הבאים', 'Welcome')], 'alef-bold', 76, WHITE, (110, 20, 30), 'center', 'clean'),
 ('no-smoking', 'door', [('אסור לעשן', 'No Smoking')], 'heebo', 84, RED, WHITE, 'center', 'lowcontrast'),
 ('caution-stairs', 'door', [('זהירות', 'Caution'), ('מדרגות', 'Stairs')], 'alef-bold', 84, DARK, YELLOW, 'center', 'rotate'),
]
rng = random.Random(2026); np_rng = np.random.default_rng(2026)

VARIABLE = {'heebo', 'noto-sans', 'frank-ruhl'}

def render(lines, fname, size, fg, bg, align, weight=600, pad=70, spacing=1.5):
    f = ImageFont.truetype(str(FONTS[fname]), size, layout_engine=ImageFont.Layout.RAQM)
    if weight and fname in VARIABLE:   # variable fonts open at their thinnest weight; real signs are rarely hairline
        axes = f.get_variation_axes()
        f.set_variation_by_axes([weight if a['name'] in ('Weight', b'Weight') else a['default'] for a in axes])
    widths = [f.getlength(l, direction='rtl', language='he') for l in lines]
    W = int(max(widths)) + 2 * pad; H = int(size * spacing * len(lines)) + 2 * pad
    img = Image.new('RGB', (W, H), bg); d = ImageDraw.Draw(img)
    for i, l in enumerate(lines):
        x = W - pad - widths[i] if align == 'right' else (W - widths[i]) / 2
        d.text((x, pad + i * size * spacing), l, font=f, fill=fg, direction='rtl', language='he')
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

def v_noise(a):
    out = np.clip(a.astype(np.float32) + np_rng.normal(0, 18, a.shape), 0, 255).astype(np.uint8)
    return cv2.imdecode(cv2.imencode('.jpg', out, [cv2.IMWRITE_JPEG_QUALITY, 40])[1], 1)
def v_blur(a):
    h, w = a.shape[:2]
    s = cv2.GaussianBlur(cv2.resize(a, (int(w * .6), int(h * .6)), interpolation=cv2.INTER_AREA), (0, 0), 1.4)
    return cv2.resize(s, (w, h), interpolation=cv2.INTER_LINEAR)
def v_rotate(a):
    h, w = a.shape[:2]
    return cv2.warpAffine(a, cv2.getRotationMatrix2D((w / 2, h / 2), rng.choice([-4, 4]), 1.0), (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
def v_persp(a):
    h, w = a.shape[:2]; j = 0.05
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    dst = np.float32([[rng.uniform(0, j) * w, rng.uniform(0, j) * h], [w - rng.uniform(0, j) * w, 0], [w, h - rng.uniform(0, j) * h], [rng.uniform(0, .02) * w, h]])
    return cv2.warpPerspective(a, cv2.getPerspectiveTransform(src, dst), (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
def v_lowc(a):
    f = a.astype(np.float32); f = 120 + (f - f.min()) / max(1, f.max() - f.min()) * 90
    g = np.linspace(0.82, 1.0, a.shape[1])[None, :, None]
    return np.clip((f + np_rng.normal(0, 5, f.shape)) * g, 0, 255).astype(np.uint8)
VARIANTS = {'clean': lambda a: a, 'noise': v_noise, 'blur': v_blur, 'rotate': v_rotate, 'perspective': v_persp, 'lowcontrast': v_lowc}

def wear_set():
    """Every sign under every kind of wear (20 x 6 = 120 images), built in memory: yields (id, variant, lines, jpeg bytes)."""
    global rng, np_rng
    rng = random.Random(77); np_rng = np.random.default_rng(77)
    for sid, kind, pairs, font, size, fg, bg, align, _ in SIGNS:
        base = render([p[0] for p in pairs], font, size, fg, bg, align, 300 if sid == 'bus-stop' else 600)
        for name, fn in VARIANTS.items():
            ok, enc = cv2.imencode('.jpg', fn(base.copy()), [cv2.IMWRITE_JPEG_QUALITY, 88])
            yield sid, name, [{'he': h, 'en': e} for h, e in pairs], enc.tobytes()


def main():
    OUT.mkdir(exist_ok=True)
    items = []
    for sid, kind, pairs, font, size, fg, bg, align, variant in SIGNS:
        weight = 300 if sid == 'bus-stop' else 600   # one deliberately thin-lettered sign
        a = VARIANTS[variant](render([p[0] for p in pairs], font, size, fg, bg, align, weight))
        name = f'{sid}.jpg'
        cv2.imwrite(str(OUT / name), a, [cv2.IMWRITE_JPEG_QUALITY, 88])
        items.append({'id': sid, 'file': name, 'kind': kind, 'variant': variant, 'font': font, 'weight': weight if font in VARIABLE else None, 'align': align,
                      'lines': [{'he': h, 'en': e} for h, e in pairs], 'synthetic': True})
    json.dump({'synthetic': True, 'note': 'Rendered text with simulated wear. NOT photographs. Do not quote results as real-photo accuracy.',
               'seed': 2026, 'count': len(items), 'items': items}, open(OUT / 'ground-truth.json', 'w'), ensure_ascii=False, indent=1)
    # Signs for the browser tests that are not part of the measured set: one whose words are in the app dictionary but not in the
    # sign list (drawn word for word), kept here so the measured set stays at twenty.
    fx = HERE / 'fixtures'; fx.mkdir(exist_ok=True)
    cv2.imwrite(str(fx / 'bilingual-exit.jpg'), render(['יציאה / Exit'], 'alef-bold', 70, WHITE, GREEN, 'center'), [cv2.IMWRITE_JPEG_QUALITY, 88])
    cv2.imwrite(str(fx / 'outside-list-big-lemon.jpg'), render(['לימון גדול'], 'alef-bold', 84, WHITE, GREEN, 'center'), [cv2.IMWRITE_JPEG_QUALITY, 88])
    cv2.imwrite(str(fx / 'outside-list-salt.jpg'), render(['מלח'], 'alef-bold', 96, DARK, CREAM, 'center'), [cv2.IMWRITE_JPEG_QUALITY, 88])
    # One extra file for the metadata tests: the first sign saved the way a phone would, with camera details and a GPS position.
    phone = Image.open(OUT / 'optical-store.jpg')
    exif = Image.Exif(); exif[0x010F] = 'TestCam'; gps = exif.get_ifd(0x8825)
    gps[1] = 'N'; gps[2] = (43.0, 52.0, 0.0); gps[3] = 'W'; gps[4] = (79.0, 26.0, 0.0)
    phone.save(fx / 'phone-photo-with-exif.jpg', 'JPEG', exif=exif, quality=92)
    print(f'wrote {len(items)} sign images to {OUT}')

# ---------------------------------------------------------------- the hard set (review round 2 categories)

def h_dark(a):
    f = a.astype(np.float32); f = 18 + (f - f.min()) / max(1, f.max() - f.min()) * 55
    return np.clip(f + np_rng.normal(0, 4, f.shape), 0, 255).astype(np.uint8)
def h_bright(a):
    f = a.astype(np.float32); f = 185 + (f - f.min()) / max(1, f.max() - f.min()) * 65
    return np.clip(f + np_rng.normal(0, 4, f.shape), 0, 255).astype(np.uint8)
def h_occlude(a):
    out = a.copy(); h, w = a.shape[:2]
    bw = int(w * 0.07); x = rng.randint(int(w * 0.25), int(w * 0.7))
    cv2.rectangle(out, (x, 0), (x + bw, h), (95, 95, 95), -1)      # a pole in front of the sign
    return out
def h_tight(a):
    g = cv2.cvtColor(a, cv2.COLOR_BGR2GRAY); bgv = int(np.median(np.concatenate([g[0], g[-1]])))
    ys, xs = np.where(np.abs(g.astype(int) - bgv) > 60)
    if not len(xs): return a
    m = 5
    return a[max(0, ys.min() - m):ys.max() + m, max(0, xs.min() - m):xs.max() + m].copy()
def h_angle(a):
    h, w = a.shape[:2]
    return cv2.warpAffine(a, cv2.getRotationMatrix2D((w / 2, h / 2), rng.choice([-8, 8]), 1.0), (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
HARD = {'dark': h_dark, 'bright': h_bright, 'occlude': h_occlude, 'tight': h_tight, 'angle': h_angle}


def hard_set():
    """Every sign under the harder conditions the second review used: dark, bright, a pole in front, a tight crop, an 8-degree
    tilt, a bilingual line (Hebrew / English), and vowel-pointed lettering. 20 x 7 = 140 images, built in memory."""
    global rng, np_rng
    rng = random.Random(99); np_rng = np.random.default_rng(99)
    pointed = {}
    try:
        for e in json.load(open(ROOT / 'data/camera/sign-glossary.json', encoding='utf-8'))['entries']:
            pointed[e['he']] = e['pointed']
    except OSError:
        pass
    for sid, kind, pairs, font, size, fg, bg, align, _ in SIGNS:
        weight = 300 if sid == 'bus-stop' else 600
        lines = [{'he': h, 'en': e} for h, e in pairs]
        base = render([p[0] for p in pairs], font, size, fg, bg, align, weight)
        for name, fn in HARD.items():
            yield sid, name, lines, cv2.imencode('.jpg', fn(base.copy()), [cv2.IMWRITE_JPEG_QUALITY, 88])[1].tobytes()
        both = render([f'{h} / {e}' for h, e in pairs], font, int(size * 0.7), fg, bg, align, weight)
        yield sid, 'bilingual', lines, cv2.imencode('.jpg', both, [cv2.IMWRITE_JPEG_QUALITY, 88])[1].tobytes()
        if all(p[0] in pointed for p in pairs):
            nik = render([pointed[p[0]] for p in pairs], 'frank-ruhl' if font == 'heebo' else font, size, fg, bg, align, weight, spacing=1.9)
            yield sid, 'nikkud', lines, cv2.imencode('.jpg', nik, [cv2.IMWRITE_JPEG_QUALITY, 88])[1].tobytes()


def review_set():
    """Every distinct sign phrase named in the two review files (tests/fixtures/review-r*-fails.json), in rotating fonts and
    colours, under all eleven conditions plus clean. The phrases were chosen by the review, not by the builder of the word list."""
    global rng, np_rng
    rng = random.Random(4242); np_rng = np.random.default_rng(4242)
    pairs = {}
    for name in ('review-r1-fails.json', 'review-r2-fails.json'):
        for it in json.load(open(HERE / 'fixtures' / name, encoding='utf-8'))['items']:
            pairs.setdefault(it['he'], it['en'])
    styles = [('heebo', 84, WHITE, BLUE), ('alef-bold', 88, DARK, YELLOW), ('noto-sans', 84, WHITE, GREEN), ('frank-ruhl', 90, DARK, CREAM),
              ('heebo', 84, RED, WHITE), ('alef-bold', 84, WHITE, (110, 20, 30)), ('alef', 84, DARK, (235, 235, 235))]
    conditions = {'clean': lambda a: a, **{k: v for k, v in VARIANTS.items() if k != 'clean'}, **HARD}
    for n, (he, en) in enumerate(sorted(pairs.items())):
        font, size, fg, bg = styles[n % len(styles)]
        base = render([he], font, size, fg, bg, 'center', 600)
        lines = [{'he': he, 'en': en}]
        for name, fn in conditions.items():
            yield f'p{n:02d}', name, lines, cv2.imencode('.jpg', fn(base.copy()), [cv2.IMWRITE_JPEG_QUALITY, 88])[1].tobytes()
        both = render([f'{he} / {en}'], font, int(size * 0.7), fg, bg, 'center', 600)
        yield f'p{n:02d}', 'bilingual', lines, cv2.imencode('.jpg', both, [cv2.IMWRITE_JPEG_QUALITY, 88])[1].tobytes()


def write_set_dir(out, gen):
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    items = []
    for sid, variant, lines, data in gen():
        name = f'{sid}__{variant}.jpg'
        (out / name).write_bytes(data)
        items.append({'id': f'{sid}__{variant}', 'file': name, 'variant': variant, 'lines': lines, 'synthetic': True})
    json.dump({'synthetic': True, 'note': 'Rendered text with simulated conditions. NOT photographs.', 'count': len(items), 'items': items},
              open(out / 'ground-truth.json', 'w'), ensure_ascii=False, indent=1)
    print(f'wrote {len(items)} images to {out}')


def write_wear_dir(out):
    """Write the 120 wear images and a ground-truth.json to a folder (for tools/camera-translate/e2e-batch.mjs)."""
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    items = []
    for sid, variant, lines, data in wear_set():
        name = f'{sid}__{variant}.jpg'
        (out / name).write_bytes(data)
        items.append({'id': f'{sid}__{variant}', 'file': name, 'variant': variant, 'lines': lines, 'synthetic': True})
    json.dump({'synthetic': True, 'note': 'Rendered text with simulated wear. NOT photographs.', 'count': len(items), 'items': items},
              open(out / 'ground-truth.json', 'w'), ensure_ascii=False, indent=1)
    print(f'wrote {len(items)} images to {out}')


if __name__ == '__main__':
    import sys
    if len(sys.argv) == 3 and sys.argv[1] == '--wear-dir':
        write_wear_dir(sys.argv[2])
    elif len(sys.argv) == 3 and sys.argv[1] == '--hard-dir':
        write_set_dir(sys.argv[2], hard_set)
    elif len(sys.argv) == 3 and sys.argv[1] == '--review-dir':
        write_set_dir(sys.argv[2], review_set)
    else:
        main()
