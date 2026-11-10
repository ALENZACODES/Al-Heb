#!/usr/bin/env python3
"""Rasterise every page of a PDF (pdftoppm) and build contact sheets (Pillow) for visual QA.
  contact_sheets.py FILE.pdf OUT_DIR [--per 6] [--cols 3] [--dpi 60] [--full-dpi 0]
Writes OUT_DIR/pages/p-NNN.png (low dpi) and OUT_DIR/sheet-NNN.png (labelled with PDF page numbers). With --full-dpi N also writes OUT_DIR/full/p-NNN.png at N dpi."""
import sys, os, subprocess, glob, argparse
from PIL import Image, ImageDraw
ap = argparse.ArgumentParser(); ap.add_argument('pdf'); ap.add_argument('out')
ap.add_argument('--per', type=int, default=6); ap.add_argument('--cols', type=int, default=3); ap.add_argument('--dpi', type=int, default=60); ap.add_argument('--full-dpi', type=int, default=0)
a = ap.parse_args()
os.makedirs(a.out + '/pages', exist_ok=True)
for f in glob.glob(a.out + '/pages/*.png') + glob.glob(a.out + '/sheet-*.png'): os.remove(f)
subprocess.run(['pdftoppm', '-r', str(a.dpi), '-png', a.pdf, a.out + '/pages/p'], check=True)
if a.full_dpi:
    os.makedirs(a.out + '/full', exist_ok=True)
    subprocess.run(['pdftoppm', '-r', str(a.full_dpi), '-png', a.pdf, a.out + '/full/p'], check=True)
files = sorted(glob.glob(a.out + '/pages/p-*.png'))
for s in range(0, len(files), a.per):
    chunk = files[s:s + a.per]; ims = [Image.open(f).convert('RGB') for f in chunk]
    w, h = ims[0].size; rows = (len(ims) + a.cols - 1) // a.cols
    sheet = Image.new('RGB', (a.cols * (w + 8) + 8, rows * (h + 22) + 8), '#888')
    d = ImageDraw.Draw(sheet)
    for i, im in enumerate(ims):
        x, y = 8 + (i % a.cols) * (w + 8), 8 + (i // a.cols) * (h + 22)
        sheet.paste(im, (x, y + 14)); d.text((x, y), 'PDF page ' + str(s + i + 1), fill='white')
    sheet.save(f'{a.out}/sheet-{s // a.per + 1:03d}.png')
print(len(files), 'pages,', (len(files) + a.per - 1) // a.per, 'sheets')
