#!/usr/bin/env python3
"""Small square scene pictures for game entries in lists (Home destinations, the More menu): assets/img/game-thumbs/<id>.160.webp.
Centre crop of each game's own scene (word games: assets/img/gen/<GAME_ENV>.800.webp; arcade: assets/img/arcade-thumbs/<id>.800.webp),
never flipped, WebP q78, metadata stripped. Not precached (assets/img/). Usage: python3 tools/images/game-thumbs.py <dir with assets/img/gen>"""
import os, re, subprocess, sys
from PIL import Image
gen = os.path.join(sys.argv[1] if len(sys.argv) > 1 else '.', 'assets/img/gen')
env = dict(re.findall(r"^\s+(\w+): '(GAME_\w+)'", open('src/games/engine.js').read(), re.M))
hub = dict(re.findall(r"(\w+): '(\w+)'", re.search(r'HUB_ENV_KEY = Object\.freeze\(\{([^}]*)\}', open('src/games/games.view.js').read()).group(1)))
games = re.findall(r"\['(\w+)', '[^']+', '[^']+'\]", re.search(r'export const GAMES = Object\.freeze\(\[(.*?)\]\);', open('src/games/games.view.js').read(), re.S).group(1)) + ['wordfinder']
src = {g: os.path.join(gen, env[hub.get(g, g)] + '.800.webp') for g in games if hub.get(g, g) in env}
src.update({f[:-9]: os.path.join('assets/img/arcade-thumbs', f) for f in os.listdir('assets/img/arcade-thumbs') if f.endswith('.800.webp')})
os.makedirs('assets/img/game-thumbs', exist_ok=True)
TOP = {'pinball', 'prefixblast'}  # plain backdrops whose detail (bumpers, vines and hill) is at the top: crop from the top, not the centre
for g, p in sorted(src.items()):
    if not os.path.exists(p): print('no scene for', g); continue
    im = Image.open(p).convert('RGB'); w, h = im.size; s = min(w, h) if g not in {'pinball', 'prefixblast'} else min(w, h) * 3 // 5
    y0 = 0 if g in TOP else (h - s) // 2
    im = im.crop(((w - s) // 2, y0, (w - s) // 2 + s, y0 + s)).resize((160, 160), Image.Resampling.LANCZOS)
    out = f'assets/img/game-thumbs/{g}.160.webp'; im.save(out, 'WEBP', quality=78, method=6)
    subprocess.run(['exiftool', '-all=', '-overwrite_original', '-q', out], check=True)
print(len(os.listdir('assets/img/game-thumbs')), 'game thumbs')
