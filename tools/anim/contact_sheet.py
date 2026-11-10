#!/usr/bin/env python3
"""DRAFT helper: before/after contact sheet SVG (old k1 on the left, candidate k1 on the right).
Usage: contact_sheet.py SRC_DIR V2_DIR OUT_PREFIX   (writes OUT_PREFIX-1.svg, -2.svg; render with rsvg-convert)"""
import glob, os, re, sys
src, v2, pre = sys.argv[1:4]
items = sorted([os.path.basename(f)[:-7] for f in glob.glob(v2 + '/*-k1.svg')],
               key=lambda n: ['shin','bet','alef','mem','lamed','resh','vav','tav','yod','dalet','he','kaf','nun','samech','ayin','pe','tsadi','qof','gimel','zayin','chet','tet','final-kaf','final-mem','final-nun','final-pe','final-tsadi'].index(n))
def inner(svg):
    svg = re.sub(r'var\(--m-ink, currentColor\)', '#111', svg)
    svg = re.sub(r'var\(--m-\d, (#[0-9a-f]{6})\)', r'\1', svg)
    svg = svg.replace('fill="white"', 'fill="#fff"')
    body = re.search(r'</desc>(.*)</svg>', svg, re.S).group(1)
    return re.sub(r'<path [^>]*opacity="0.000"/>', '', body)
def cell(name, x, y, which):
    svg = open(which, encoding='utf-8').read()
    return f'<g transform="translate({x},{y}) scale(1.1)" >{inner(svg)}</g>'
per = 14
for n in range(2):
    chunk = items[n*per:(n+1)*per]
    cols = 4; w = cols * 480; rows = (len(chunk)+cols-1)//cols; h = rows * 250 + 10
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><rect width="{w}" height="{h}" fill="#fafafa"/>']
    for i, it in enumerate(chunk):
        cx, cy = (i % cols) * 480, (i // cols) * 250
        old = glob.glob(f'{src}/batch-*/{it}-k1.svg')[0]
        out.append(f'<rect x="{cx+4}" y="{cy+4}" width="472" height="242" fill="none" stroke="#bbb"/>')
        out.append(cell(it, cx+5, cy+20, old)); out.append(cell(it, cx+245, cy+20, f'{v2}/{it}-k1.svg'))
        out.append(f'<text x="{cx+10}" y="{cy+18}" font-family="sans-serif" font-size="14" fill="#333">{it}: old | new</text>')
    out.append('</svg>')
    open(f'{pre}-{n+1}.svg', 'w').write('\n'.join(out))
