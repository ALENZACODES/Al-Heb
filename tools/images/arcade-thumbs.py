#!/usr/bin/env python3
"""Card thumbnails for the arcade games: assets/games/arcade/<id>/env.png (1600x600, ~850 KB PNG) -> assets/img/arcade-thumbs/<id>.{480,800}.webp.
Same picture, same orientation (never flipped or cropped), 8:3, WebP q74, all metadata stripped with exiftool. assets/img/ is not precached.
Run from the repo root: python3 tools/images/arcade-thumbs.py   (reads the PNGs from git, so a sparse checkout works too)."""
import io, os, subprocess
from PIL import Image

ids = [p.split('/')[3] for p in subprocess.run(['git', 'ls-tree', '-r', '--name-only', 'HEAD', 'assets/games/arcade'], capture_output=True, text=True, check=True).stdout.split() if p.endswith('/env.png')]
os.makedirs('assets/img/arcade-thumbs', exist_ok=True)
for i in ids:
    im = Image.open(io.BytesIO(subprocess.run(['git', 'cat-file', 'blob', f'HEAD:assets/games/arcade/{i}/env.png'], capture_output=True, check=True).stdout)).convert('RGB')
    for w in (480, 800):
        p = f'assets/img/arcade-thumbs/{i}.{w}.webp'
        im.resize((w, w * 3 // 8), Image.Resampling.LANCZOS).save(p, 'WEBP', quality=74, method=6)
        subprocess.run(['exiftool', '-all=', '-overwrite_original', '-q', p], check=True)
print(len(ids), 'arcade thumbnails')
