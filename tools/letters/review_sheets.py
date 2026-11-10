#!/usr/bin/env python3
"""Teacher review sheets for the DRAFT stroke data (print + cursive side by side).

Usage: python3 tools/letters/review_sheets.py [--check-only] [letters.json] [outdir]

Writes, per letter, docs/letters/review-sheets/<id>.png (print panel | cursive panel; grey outline, numbered
colour-coded strokes, start dot, direction arrows along and at the end of each stroke) and one printable
docs/letters/REVIEW-SHEET.html with 54 rows (27 letters x print/cursive) a teacher can tick in one sitting.

It also runs a mechanical check: every median point of every stroke is tested against the glyph outline (rasterised
with rsvg-convert, dilated by half the stroke width) and the share of points OUTSIDE the outline is reported per stroke
("coverage"). It never changes stroke order or direction; it only reports.

Requires rsvg-convert (SVG -> PNG) and Pillow (PNG re-save without metadata, outline mask).
"""
import json, math, os, re, subprocess, sys, tempfile
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
args = [a for a in sys.argv[1:] if not a.startswith('--')]
CHECK_ONLY = '--check-only' in sys.argv
SRC = args[0] if len(args) > 0 else os.path.join(ROOT, 'data', 'letters', 'letters.json')
OUT = args[1] if len(args) > 1 else os.path.join(ROOT, 'docs', 'letters')
SHEETS = os.path.join(OUT, 'review-sheets')
REVIEW_LIST = os.path.join(ROOT, 'docs', 'letters', 'REVIEW-LIST.md')
COLORS = ['#d62728', '#1f77b4', '#2ca02c', '#9467bd', '#ff7f0e', '#8c564b']
HIGH_DOUBT = {('pe-final', 'cursive'), ('tsadi-final', 'cursive')}  # docs/letters/REVIEW-LIST.md: DOUBT (HIGH)
PANEL = 400   # px per panel (1000 box units)
PAD = 16
BASELINE = 756


def esc(s):
    return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def arrow(x, y, a, size, col):
    return (f'<polygon points="{x:.0f},{y:.0f} {x - size * math.cos(a - 0.5):.0f},{y - size * math.sin(a - 0.5):.0f} '
            f'{x - size * math.cos(a + 0.5):.0f},{y - size * math.sin(a + 0.5):.0f}" fill="{col}" stroke="#fff" stroke-width="3"/>')


def stroke_svg(st, n, col, taken=None):
    """One stroke: path, mid-path direction arrows, end arrow, numbered start dot.
    taken: list of earlier start points; a start within 60 units of one is drawn offset so both numbers stay readable."""
    m = st['median']
    g = [f'<path d="{st["path"]}" fill="none" stroke="{col}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" opacity="0.75"/>']
    # arrows roughly every 180 units along the median
    total = sum(math.dist(m[i], m[i + 1]) for i in range(len(m) - 1))
    step = 180.0
    nxt = step
    acc = 0.0
    for i in range(len(m) - 1):
        seg = math.dist(m[i], m[i + 1])
        while seg > 0 and acc + seg >= nxt and nxt < total - 60:
            f = (nxt - acc) / seg
            x = m[i][0] + (m[i + 1][0] - m[i][0]) * f
            y = m[i][1] + (m[i + 1][1] - m[i][1]) * f
            a = math.atan2(m[i + 1][1] - m[i][1], m[i + 1][0] - m[i][0])
            g.append(arrow(x, y, a, 34, col))
            nxt += step
        acc += seg
    (ex, ey), (px, py) = m[-1], m[-2]
    a = math.atan2(ey - py, ex - px)
    g.append(arrow(ex, ey, a, 50, col))
    sx, sy = m[0]
    if taken is not None:
        while any(math.dist((sx, sy), t) < 60 for t in taken):
            sx, sy = sx + 48, sy - 48
        taken.append((sx, sy))
    g.append(f'<circle cx="{sx}" cy="{sy}" r="30" fill="#fff" stroke="{col}" stroke-width="8"/>'
             f'<text x="{sx}" y="{sy + 15}" font-size="44" text-anchor="middle" fill="{col}" font-family="DejaVu Sans, sans-serif" font-weight="bold">{n}</text>')
    return ''.join(g)


def panel_svg(letter, script, x0, y0, coverage=None):
    s = letter[script]
    g = [f'<g transform="translate({x0},{y0})">',
         f'<rect x="0" y="0" width="{PANEL}" height="{PANEL + 46}" fill="#fff" stroke="#888"/>',
         f'<text x="8" y="18" font-size="15" font-family="DejaVu Sans, sans-serif" font-weight="bold" fill="#000">{script.upper()}  {len(s["strokes"])} stroke{"s" if len(s["strokes"]) != 1 else ""}</text>',
         f'<g transform="translate(0,24) scale({PANEL / 1000})">']
    for k in range(100, 1000, 100):
        g.append(f'<line x1="{k}" y1="0" x2="{k}" y2="1000" stroke="#eef" stroke-width="3"/><line x1="0" y1="{k}" x2="1000" y2="{k}" stroke="#eef" stroke-width="3"/>')
    if script == 'print':
        g.append(f'<line x1="0" y1="{BASELINE}" x2="1000" y2="{BASELINE}" stroke="#cdd" stroke-width="3" stroke-dasharray="20 14"/>')
    if s.get('outline'):
        g.append(f'<path d="{s["outline"]}" fill="#e2e2e2" stroke="#b0b0b0" stroke-width="2"/>')
    taken = []
    for n, st in enumerate(s['strokes']):
        g.append(stroke_svg(st, n + 1, COLORS[n % len(COLORS)], taken))
    g.append('</g>')
    legend = '  '.join(f'{i + 1}={"%.0f" % (100 * c)}% in' for i, c in enumerate(coverage)) if coverage else ''
    g.append(f'<text x="8" y="{PANEL + 40}" font-size="12" font-family="DejaVu Sans, sans-serif" fill="#444">{esc(legend)}</text>')
    g.append('</g>')
    return ''.join(g)


def letter_svg(letter, cov):
    w = PANEL * 2 + PAD * 3
    h = PANEL + 46 + 60
    doubt = letter.get('_doubt', '')
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">',
             '<rect width="100%" height="100%" fill="#fff"/>',
             f'<text x="{PAD}" y="26" font-size="20" font-family="DejaVu Sans, sans-serif" font-weight="bold" fill="#000">{esc(letter["id"])}  {esc(letter["name"])}'
             f'<tspan dx="24" font-size="26" font-weight="normal" font-family="Alef, Heebo, DejaVu Sans, sans-serif">{esc(letter["he"])}</tspan></text>',
             f'<text x="{w - PAD}" y="26" text-anchor="end" font-size="13" font-family="DejaVu Sans, sans-serif" fill="#a00">DRAFT: not validated by a native Israeli teacher</text>',
             panel_svg(letter, 'print', PAD, 38, cov.get('print')),
             panel_svg(letter, 'cursive', PAD * 2 + PANEL, 38, cov.get('cursive')),
             f'<text x="{PAD}" y="{h - 10}" font-size="11" font-family="DejaVu Sans, sans-serif" fill="#333">Numbered dot = stroke start; arrows = pen direction; grey = glyph outline. '
             f'{esc(doubt[:150])}</text>',
             '</svg>']
    return ''.join(parts)


def rsvg(svg_text, png_path, width=None):
    with tempfile.NamedTemporaryFile('w', suffix='.svg', delete=False, encoding='utf-8') as fh:
        fh.write(svg_text)
        tmp = fh.name
    try:
        cmd = ['rsvg-convert', '-f', 'png', '-o', png_path]
        if width:
            cmd += ['-w', str(width)]
        subprocess.run(cmd + [tmp], check=True)
    finally:
        os.unlink(tmp)


def strip_png(path):
    """Re-save through Pillow so only IHDR/IDAT/IEND (plus palette) remain: no text, time or XMP chunks."""
    im = Image.open(path)
    im.load()
    clean = Image.new(im.mode, im.size)
    clean.paste(im)
    clean.save(path, format='PNG', optimize=True)


def outline_mask(s, size=320):
    """Raster of the glyph outline, dilated by half the stroke width, as a 0/255 image (size x size for the 1000 box)."""
    if not s.get('outline'):
        return None
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 1000 1000">'
           f'<rect width="1000" height="1000" fill="#000"/><path d="{s["outline"]}" fill="#fff"/></svg>')
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as fh:
        tmp = fh.name
    try:
        rsvg(svg, tmp)
        im = Image.open(tmp).convert('L')
        im.load()
    finally:
        os.unlink(tmp)
    r = max(1, int(round(s.get('strokeWidth', 80) / 2 * size / 1000)))
    return im.filter(ImageFilter.MaxFilter(2 * r + 1)), size


def coverage(s):
    """Per stroke: fraction of median points inside the dilated outline (1.0 = fully inside). None if no outline."""
    mk = outline_mask(s)
    if mk is None:
        return None
    mask, size = mk
    out = []
    for st in s['strokes']:
        pts = st['median']
        inside = 0
        for x, y in pts:
            px, py = min(size - 1, max(0, int(x * size / 1000))), min(size - 1, max(0, int(y * size / 1000)))
            if mask.getpixel((px, py)) > 127:
                inside += 1
        out.append(inside / max(1, len(pts)))
    return out


def parse_doubts():
    """Letter -> doubt text from docs/letters/REVIEW-LIST.md (table column 4)."""
    d = {}
    if not os.path.exists(REVIEW_LIST):
        return d
    for line in open(REVIEW_LIST, encoding='utf-8'):
        m = re.match(r'\|\s*- \[ \]\s*\|\s*- \[ \]\s*\|\s*`([a-z-]+)`\s*\|\s*(.*?)\s*\|\s*$', line)
        if m:
            d[m.group(1)] = m.group(2)
    return d


def html_sheet(letters, covs, svgs):
    rows = []
    for L in letters:
        for script in ('print', 'cursive'):
            s = L[script]
            cov = (covs.get(L['id']) or {}).get(script)
            worst = min(cov) if cov else None
            high = (L['id'], script) in HIGH_DOUBT
            taken = []
            flag = 'DOUBT (HIGH)' if high else ('builder doubt' if re.search(r'\b' + ('P' if script == 'print' else 'C') + r':[^.]*DOUBT', L.get('_doubt', '')) else '')
            rows.append(
                f'<tr class="{"high" if high else ""}"><td class="tick" data-l="OK?"><span class="box"></span></td>'
                f'<td data-l="Letter"><b>{esc(L["id"])}</b><br>{esc(L["name"])} <span lang="he" dir="rtl">{esc(L["he"])}</span></td>'
                f'<td data-l="Script">{script}</td><td data-l="Strokes">{len(s["strokes"])}</td>'
                f'<td class="pic" data-l="Draft"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="150" height="150">'
                + (f'<path d="{s["outline"]}" fill="#e2e2e2" stroke="#b0b0b0" stroke-width="2"/>' if s.get('outline') else '')
                + ''.join(stroke_svg(st, n + 1, COLORS[n % len(COLORS)], taken) for n, st in enumerate(s['strokes']))
                + '</svg></td>'
                f'<td class="cov" data-l="Mechanical check">{("" if worst is None else ("%.0f%% of points inside outline (worst stroke)" % (100 * worst)))}</td>'
                f'<td class="doubt" data-l="Builder doubt">{("<b>" + flag + "</b><br>") if flag else ""}{esc(L.get("_doubt", ""))}</td>'
                f'<td class="fix" data-l="Correction"></td></tr>')
    style = """
body{font-family:system-ui,sans-serif;margin:16px;color:#111}
h1{font-size:1.3rem;margin:0 0 4px}p{margin:4px 0;font-size:.9rem}
table{border-collapse:collapse;width:100%;font-size:.8rem}
th,td{border:1px solid #999;padding:4px 6px;vertical-align:top}
th{background:#eee}
tr.high td{background:#fff0f0}
.box{display:inline-block;width:18px;height:18px;border:2px solid #000;border-radius:3px}
.tick{text-align:center;width:28px}.pic{width:150px}.fix{min-width:180px}.doubt{max-width:300px}
tr{page-break-inside:avoid}
@media screen and (max-width:700px){
body{margin:10px}
table,thead,tbody,tr,td{display:block;width:auto}
thead{position:absolute;left:-9999px}
tr{border:1px solid #999;margin:0 0 10px;padding:4px 6px}
td{border:0;border-bottom:1px solid #ddd;padding:4px 0;max-width:none;min-width:0}
td:last-child{border-bottom:0}
td[data-l]:before{content:attr(data-l);display:block;font-size:.7rem;color:#555;text-transform:uppercase}
.tick{text-align:left;width:auto}.pic{width:auto}.pic svg{width:150px;height:150px}
.fix{min-height:48px}
}
@media print{body{margin:6mm}table{font-size:.7rem}}
"""
    body = (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aleph stroke-order review sheet (draft)</title><style>{style}</style></head><body>'
            '<h1>Hebrew letter stroke order: teacher review sheet (DRAFT)</h1>'
            '<p>54 records: 27 letters x print (block) and cursive (ktav yad). None is validated. Please tick the box if the shape AND the stroke count, order and direction are what Israeli school handwriting teaches; otherwise write the correction in the last column (for example "2 strokes: bar right-to-left, then stem top-down").</p>'
            '<p>Numbered dot = where the stroke starts; arrows = pen direction; grey = the glyph outline the strokes should follow. '
            'Rows with a pink background are the two cursive finals whose letterform the builder doubts most (see docs/letters/REVIEW-LIST.md). '
            'Rules the builder used: docs/letters/STROKE-RULES.md. Per-letter PNGs: docs/letters/review-sheets/.</p>'
            '<p>Reviewer: ______________________   Date: ____________   Signature: ______________________</p>'
            '<table><thead><tr><th>OK?</th><th>Letter</th><th>Script</th><th>Strokes</th><th>Draft</th><th>Mechanical check</th><th>Builder doubt</th><th>Correction</th></tr></thead><tbody>'
            + ''.join(rows) + '</tbody></table></body></html>')
    return body


def main():
    letters = json.load(open(SRC, encoding='utf-8'))
    doubts = parse_doubts()
    for L in letters:
        L['_doubt'] = doubts.get(L['id'], '')
    covs = {}
    problems = []
    for L in letters:
        covs[L['id']] = {}
        for script in ('print', 'cursive'):
            c = coverage(L[script])
            covs[L['id']][script] = c
            if c:
                for i, v in enumerate(c):
                    if v < 0.9:
                        problems.append((L['id'], script, i + 1, v))
    report = {'records': sum(2 for _ in letters), 'coverage': covs,
              'belowNinetyPercent': [{'id': a, 'script': b, 'stroke': c, 'inside': round(d, 3)} for a, b, c, d in problems]}
    if CHECK_ONLY:
        print(json.dumps(report, indent=1))
        return
    os.makedirs(SHEETS, exist_ok=True)
    svgs = {}
    for L in letters:
        svg = letter_svg(L, covs[L['id']])
        svgs[L['id']] = svg
        png = os.path.join(SHEETS, f'{L["id"]}.png')
        rsvg(svg, png)
        strip_png(png)
    with open(os.path.join(OUT, 'REVIEW-SHEET.html'), 'w', encoding='utf-8') as fh:
        fh.write(html_sheet(letters, covs, svgs))
    with open(os.path.join(SHEETS, 'coverage.json'), 'w', encoding='utf-8') as fh:
        json.dump(report, fh, indent=1)
    print(f'wrote {len(letters)} PNGs to {SHEETS}, REVIEW-SHEET.html, coverage.json')
    for p in problems:
        print('BELOW 90%% inside outline: %s %s stroke %d (%.0f%%)' % (p[0], p[1], p[2], 100 * p[3]))


if __name__ == '__main__':
    main()
