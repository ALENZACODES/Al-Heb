"""Put Block K pictures in their places (tools/images/blockk.json, docs/images/BLOCK-K.md).

Usage: python3 tools/images/ingest_blockk.py <folder with the downloaded K-*.png files> [--dry-run]

For each item it finds <folder>/<FILENAME> (case-insensitive; .png, .webp or .jpg), then:
- crops it to the item's aspect ratio (centre crop) and resizes it to the item's size;
- for a TRANSPARENT item that came back on a cream or white background, clears the background colour that touches the edges
  (a flood fill from the border, so cream inside the picture stays);
- for a TILE item, checks how far the left edge is from the right edge and the top from the bottom, and warns when the seam shows;
- reduces it to a 96 or 128 colour palette (flat art keeps its look at a fraction of the size);
- writes a PNG to the item's destination, creating folders.
Missing files are listed and skipped. Needs Pillow.
"""
import json, os, sys
from collections import deque
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SPEC = json.load(open(os.path.join(ROOT, 'tools', 'images', 'blockk.json')))


def find(folder, name):
    stem = os.path.splitext(name)[0].lower()
    for f in os.listdir(folder):
        s, ext = os.path.splitext(f)
        if s.lower() == stem and ext.lower() in ('.png', '.webp', '.jpg', '.jpeg'):
            return os.path.join(folder, f)
    return None


def crop_to(im, w, h):
    sw, sh = im.size
    want = w / h
    if sw / sh > want:
        nw = round(sh * want); x = (sw - nw) // 2; im = im.crop((x, 0, x + nw, sh))
    elif sw / sh < want:
        nh = round(sw / want); y = (sh - nh) // 2; im = im.crop((0, y, sw, y + nh))
    return im.resize((w, h), Image.LANCZOS)


def clear_background(im, tol=28):
    """Make the border-connected background transparent when the picture has none (cream #F6F1E7 or white)."""
    im = im.convert('RGBA')
    px = im.load(); w, h = im.size
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    if all(c[3] < 10 for c in corners):
        return im, False  # already transparent
    bg = max(set(c[:3] for c in corners), key=lambda c: sum(1 for k in corners if k[:3] == c))
    near = lambda c: c[3] > 0 and all(abs(c[i] - bg[i]) <= tol for i in range(3))
    seen = bytearray(w * h); q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y * w + x]:
            continue
        seen[y * w + x] = 1
        if not near(px[x, y]):
            continue
        px[x, y] = (0, 0, 0, 0)
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return im, True


def seam(im):
    im = im.convert('RGB'); w, h = im.size; px = im.load()
    d = lambda a, b: sum(abs(a[i] - b[i]) for i in range(3)) / 3
    lr = sum(d(px[0, y], px[w - 1, y]) for y in range(h)) / h
    tb = sum(d(px[x, 0], px[x, h - 1]) for x in range(w)) / w
    return lr, tb


def main():
    if len(sys.argv) < 2:
        print(__doc__); return 2
    folder, dry = sys.argv[1], '--dry-run' in sys.argv
    done, missing = 0, []
    for c in SPEC['commands']:
        for it in c['items']:
            src = find(folder, it['name'])
            if not src:
                missing.append(it['name']); continue
            w, h = it['size']
            im = crop_to(Image.open(src).convert('RGBA'), w, h)
            note = ''
            if it.get('transparent'):
                im, cleared = clear_background(im)
                note = ' (background made transparent)' if cleared else ''
            if it.get('tile'):
                lr, tb = seam(im)
                if lr > 18 or tb > 18:
                    note += f' WARNING: the seam may show when tiled (edge difference {lr:.0f}/{tb:.0f}); ask for a seamless redo if it looks wrong'
                im = im.convert('RGB')
            # Flat vector art keeps its look with a small palette, at a fraction of the size (full-colour covers were ~900 KB each).
            colors = 128 if max(w, h) > 400 else 96
            im = im.quantize(colors=colors, method=Image.Quantize.FASTOCTREE) if im.mode == 'RGBA' else im.convert('RGB').quantize(colors=colors, method=Image.Quantize.MEDIANCUT)
            dest = os.path.join(ROOT, it['dest'])
            print(f"{it['name']} -> {it['dest']} {w}x{h}{note}")
            if not dry:
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                im.save(dest, optimize=True)
            done += 1
    print(f'{done} placed, {len(missing)} missing' + (': ' + ', '.join(missing) if missing else ''))
    if done and not dry:
        print('Next: node tools/build-precache.mjs, then npm test.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
