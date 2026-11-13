#!/usr/bin/env python3
"""Cast pictures for the 28 older Level 3–9 games: Ari, Noa and Rimon composed onto each game's
approved background. Sources are only pictures already in the app (tools/images/cast-onto-envs.json).
Never flipped or redrawn. Writes assets/games/arcade/<id>/env.webp (1600x600) and
assets/img/arcade-thumbs/<id>.{480,800}.webp; metadata stripped with exiftool. Run from the repo root.
Set ONLY=id,id to rebuild a subset. Set OUT_DIR to write somewhere else (for a preview)."""
import glob, json, os, re, subprocess
from collections import deque
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np

CFG = json.load(open('tools/images/cast-onto-envs.json'))
W, H = 1600, 600
OUT = Path(os.environ.get('OUT_DIR', '.'))

def gen_path(i):
    best = None
    for f in glob.glob(f'assets/img/gen/{i}.*webp'):
        m = re.search(r'\.(\d+)(?:x(\d+))?\.webp$', f)
        e = int(m.group(1)) if m else 0
        if best is None or e > best[0]:
            best = (e, f)
    if not best:
        raise SystemExit(f'missing picture {i}')
    return best[1]

def cutout_cream(im, tol=28, feather=4):
    im = im.convert('RGBA')
    arr = np.array(im)
    h, w = arr.shape[:2]
    border = np.concatenate([
        arr[0:12, :, :3].reshape(-1, 3),
        arr[-12:, :, :3].reshape(-1, 3),
        arr[:, 0:12, :3].reshape(-1, 3),
        arr[:, -12:, :3].reshape(-1, 3),
    ])
    paper = np.median(border, axis=0).astype(np.float32)
    rgb = arr[:, :, :3].astype(np.float32)
    dist = np.sqrt(((rgb - paper) ** 2).sum(axis=2))
    near_loose = dist < (tol + 12)
    vis = np.zeros((h, w), dtype=bool)
    q = deque()
    def try_push(y, x):
        if 0 <= y < h and 0 <= x < w and not vis[y, x] and near_loose[y, x]:
            vis[y, x] = True
            q.append((y, x))
    for x in range(w):
        try_push(0, x); try_push(h - 1, x)
    for y in range(h):
        try_push(y, 0); try_push(y, w - 1)
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            try_push(y + dy, x + dx)
    alpha = arr[:, :, 3].astype(np.float32)
    alpha[vis] = 0
    mask = Image.fromarray(alpha.astype(np.uint8), 'L')
    if feather:
        mask = mask.filter(ImageFilter.GaussianBlur(feather))
    out = im.copy()
    out.putalpha(mask)
    box = out.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    return out.crop(box) if box else out

def sheet_quad(im, which):
    w, h = im.size
    mx, my = w // 2, h // 2
    boxes = {'tl': (0, 0, mx, my), 'tr': (mx, 0, w, my), 'bl': (0, my, mx, h), 'br': (mx, my, w, h)}
    return im.crop(boxes[which])

def load_sprite(i):
    if i.startswith('rimon-'):
        im = Image.open(f'data/images/rimon/v2/{i}.webp').convert('RGBA')
        box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
        return im.crop(box)
    if ':sheet:' in i or (i.startswith('CHAR_') and ':t' in i or ':b' in i):
        # CHAR_ari_sheet:bl
        name, _, quad = i.partition(':')
        im = Image.open(gen_path(name))
        return cutout_cream(sheet_quad(im, quad))
    return cutout_cream(Image.open(gen_path(i)))

def load_bg(spec, y_align):
    if spec.startswith('arcade:'):
        gid = spec.split(':', 1)[1]
        path = f'assets/games/arcade/{gid}/env.png'
        if not os.path.exists(path):
            path = f'assets/games/arcade/{gid}/env.webp'
        im = Image.open(path)
    else:
        im = Image.open(gen_path(spec))
    im = im.convert('RGB')
    s = max(W / im.width, H / im.height)
    nw, nh = round(im.width * s), round(im.height * s)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (nw - W) // 2
    y = int((nh - H) * float(y_align))
    y = max(0, min(nh - H, y))
    return im.crop((x, y, x + W, y + H))

def paste(canvas, sprite, cx, height, yb=1.0, bottom_margin=8):
    scale = height / sprite.height
    sw, sh = max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))
    sp = sprite.resize((sw, sh), Image.Resampling.LANCZOS)
    x = int(cx * canvas.width - sw / 2)
    y = int(yb * canvas.height - sh - bottom_margin)
    x = max(0, min(canvas.width - sw, x))
    y = max(0, min(canvas.height - sh, y))
    canvas.alpha_composite(sp, (x, y))

def save(im, path, w, q):
    path = OUT / path
    path.parent.mkdir(parents=True, exist_ok=True)
    im.resize((w, w * 3 // 8), Image.Resampling.LANCZOS).save(path, 'WEBP', quality=q, method=6)
    subprocess.run(['exiftool', '-all=', '-overwrite_original', '-q', str(path)], check=True)

only = set(os.environ.get('ONLY', '').split(',')) - {''}
for gid, spec in CFG['games'].items():
    if only and gid not in only:
        continue
    bg = load_bg(spec['bg'], spec.get('y_align', 0.5)).convert('RGBA')
    for ch in spec['cast']:
        paste(bg, load_sprite(ch['id']), ch['cx'], ch['h'], ch.get('yb', 1.0), ch.get('margin', 8))
    env = bg.convert('RGB')
    save(env, f'assets/games/arcade/{gid}/env.webp', 1600, 80)
    for w in (480, 800):
        save(env, f'assets/img/arcade-thumbs/{gid}.{w}.webp', w, 74)
    print(gid, spec.get('who', ''))
print(len([g for g in CFG['games'] if not only or g in only]), 'cast pictures')
