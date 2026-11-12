#!/usr/bin/env python3
"""Backdrops + card pictures for the games that had none, made only from pictures already in the app (tools/images/lane-envs.json).
assets/img/gen/<ID>.*.webp (approved art) and data/images/rimon/v2/<still>.webp (Rimon, clear background) are laid side by side on the
same cream paper (or one wide scene is cropped to 8:3). Never flipped or redrawn. Writes assets/games/arcade/<id>/env.webp (1600x600)
and assets/img/arcade-thumbs/<id>.{480,800}.webp; all metadata stripped with exiftool. Run from the repo root."""
import glob, json, os, re, subprocess
from PIL import Image

CFG = json.load(open('tools/images/lane-envs.json'))
W, H = 1600, 600
CREAM = (246, 241, 231)

def gen_path(i):
    best = None
    for f in glob.glob(f'assets/img/gen/{i}.*webp') + glob.glob(f'assets/img/gen/{i}.webp'):
        m = re.search(r'\.(\d+)(?:x(\d+))?\.webp$', f)
        e = int(m.group(1)) if m else 1024
        if os.path.basename(f) not in (f'{i}.webp',) and not re.match(re.escape(i) + r'\.\d+(x\d+)?\.webp$', os.path.basename(f)): continue
        if best is None or e > best[0]: best = (e, f)
    if not best: raise SystemExit(f'missing picture {i}')
    return best[1]

def load(i):
    if i.startswith('rimon-'):
        im = Image.open(f'data/images/rimon/v2/{i}.webp').convert('RGBA')
        return im.crop(im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()), True
    im = Image.open(gen_path(i)).convert('RGBA')
    corners = [im.getpixel(p)[:3] for p in [(2, 2), (im.width - 3, 2), (2, im.height - 3), (im.width - 3, im.height - 3)]]
    if all(min(c) > 200 for c in corners):  # cream paper: trim the empty margin, then fade the edge so the square does not show as a box
        from PIL import ImageChops, ImageDraw, ImageFilter
        ref = Image.new('RGB', im.size, corners[0])
        box = ImageChops.difference(im.convert('RGB'), ref).convert('L').point(lambda v: 255 if v > 28 else 0).getbbox()
        if box:
            pad = min(im.size) // 20
            im = im.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad)))
        b = max(8, min(im.size) // 14); m = Image.new('L', im.size, 0)
        ImageDraw.Draw(m).rectangle((b, b, im.width - b, im.height - b), fill=255)
        im.putalpha(m.filter(ImageFilter.GaussianBlur(b / 2)))
    return im, False

def compose(ids):
    items = [load(i) for i in ids]
    bg = CREAM
    for im, is_rimon in items:
        if not is_rimon:
            px = [im.getpixel(p)[:3] for p in [(2, 2), (im.width - 3, 2)]]
            if all(min(c) > 200 for c in px): bg = tuple(sum(c[k] for c in px) // len(px) for k in range(3))
            break
    canvas = Image.new('RGB', (W, H), bg)
    if len(items) == 1 and items[0][0].width / items[0][0].height >= 2.0:
        im = items[0][0].convert('RGB'); s = max(W / im.width, H / im.height)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.Resampling.LANCZOS)
        x, y = (im.width - W) // 2, (im.height - H) // 2
        return im.crop((x, y, x + W, y + H))
    th = 540; gap = 40
    sized = []
    for im, is_rimon in items:
        h = th - (40 if is_rimon else 0)
        sized.append((im.resize((max(1, round(im.width * h / im.height)), h), Image.Resampling.LANCZOS), is_rimon))
    total = sum(im.width for im, _ in sized) + gap * (len(sized) - 1)
    if total > W - 60:
        f = (W - 60) / total
        sized = [(im.resize((max(1, round(im.width * f)), max(1, round(im.height * f))), Image.Resampling.LANCZOS), r) for im, r in sized]
        total = sum(im.width for im, _ in sized) + round(gap * f) * (len(sized) - 1); gap = round(gap * f)
    x = (W - total) // 2
    for im, is_rimon in sized:
        y = (H - im.height) // 2 + (20 if is_rimon else 0)
        canvas.paste(im, (x, y), im)
        x += im.width + gap
    return canvas

def save(im, path, w, q):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.resize((w, w * 3 // 8), Image.Resampling.LANCZOS).save(path, 'WEBP', quality=q, method=6)
    subprocess.run(['exiftool', '-all=', '-overwrite_original', '-q', path], check=True)

only = set(os.environ.get('ONLY', '').split(',')) - {''}
for gid, ids in CFG['games'].items():
    if only and gid not in only: continue
    env = compose(ids)
    save(env, f'assets/games/arcade/{gid}/env.webp', 1600, 80)
    for w in (480, 800): save(env, f'assets/img/arcade-thumbs/{gid}.{w}.webp', w, 74)
for gid, ids in CFG['cardOnly'].items():  # games that have their own backdrop already; only the card picture was missing
    if only and gid not in only: continue
    env = compose(ids)
    for w in (480, 800): save(env, f'assets/img/arcade-thumbs/{gid}.{w}.webp', w, 74)
print(len(CFG['games']), 'backdrops,', len(CFG['cardOnly']), 'card-only pictures')
