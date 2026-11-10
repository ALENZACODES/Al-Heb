#!/usr/bin/env python3
"""
resample_path.py - DRAFT tool: real Hebrew glyph outline -> pose-contract k1 path.

What it does (deterministic: no randomness, same input gives byte-identical output):
  1. Reads one glyph outline from a TTF (fontTools), flattens every curve to a
     polyline (16 steps per curve segment) and flips y (font y is up, SVG y is down).
  2. Scales by ONE uniform factor for all letters (so a yod stays small and a
     lamed stays tall) and centres each glyph on the centre of the bounding box of
     the existing hand-traced k1 outline.
  3. Resamples to EXACTLY the point counts of the existing k1 path, sub-path by
     sub-path, so the new path has the same command sequence (M, L x n, Z per
     sub-path). Reduction removes, one at a time, the vertex whose triangle with
     its two neighbours has the smallest area (Visvalingam), so corners survive;
     if a contour has too few points, the midpoint of the longest edge is split.
  4. If the glyph has more contours than the old path has sub-paths, the smaller
     contour is joined to the larger by a zero-width bridge (two duplicate points).
     A floating island (shin's middle prong) is first slid straight down until it
     touches the bowl, so the bridge is not a visible bar.
  5. Each new sub-path starts at the vertex nearest the old sub-path start and runs
     in the old winding direction, to keep the later morph as calm as possible.
  6. Rounds to whole numbers (contract: M/L/Z, absolute integers) and replaces only
     the d= of path p1 in a copy of the old k1 file. Nothing else in the file changes
     (letters that were fill none stay fill none and render as an outlined glyph).

Usage:
  python3 tools/anim/resample_path.py --font assets/fonts/alef-Alef-Regular.ttf \
      --src docs/drafts/animation-poses --out docs/drafts/animation-poses-v2
The font is read in place; no font data is written to the output.
"""
import argparse, glob, json, math, os, re, sys
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

ITEMS = {
 'shin':0x5E9,'bet':0x5D1,'alef':0x5D0,'mem':0x5DE,'lamed':0x5DC,'resh':0x5E8,'vav':0x5D5,
 'tav':0x5EA,'yod':0x5D9,'dalet':0x5D3,'he':0x5D4,'kaf':0x5DB,'nun':0x5E0,'samech':0x5E1,
 'ayin':0x5E2,'pe':0x5E4,'tsadi':0x5E6,'qof':0x5E7,'gimel':0x5D2,'zayin':0x5D6,'chet':0x5D7,
 'tet':0x5D8,'final-kaf':0x5DA,'final-mem':0x5DD,'final-nun':0x5DF,'final-pe':0x5E3,
 'final-tsadi':0x5E5}
STEPS = 16

class FlatPen(BasePen):
    def __init__(s, gs):
        super().__init__(gs); s.contours = []; s.cur = None
    def _moveTo(s, p): s.cur = [p]
    def _lineTo(s, p): s.cur.append(p)
    def _curveToOne(s, a, b, c):
        p0 = s._getCurrentPoint()
        for i in range(1, STEPS + 1):
            t = i / STEPS; u = 1 - t
            s.cur.append((u**3*p0[0]+3*u*u*t*a[0]+3*u*t*t*b[0]+t**3*c[0],
                          u**3*p0[1]+3*u*u*t*a[1]+3*u*t*t*b[1]+t**3*c[1]))
    def _qCurveToOne(s, a, b):
        p0 = s._getCurrentPoint()
        for i in range(1, STEPS + 1):
            t = i / STEPS; u = 1 - t
            s.cur.append((u*u*p0[0]+2*u*t*a[0]+t*t*b[0], u*u*p0[1]+2*u*t*a[1]+t*t*b[1]))
    def _closePath(s):
        c = s.cur
        if len(c) > 1 and c[0] == c[-1]: c = c[:-1]
        s.contours.append(c); s.cur = None
    _endPath = _closePath

def glyph_contours(font, cp):
    gs = font.getGlyphSet(); name = font.getBestCmap()[cp]
    pen = FlatPen(gs); gs[name].draw(pen)
    return [[(x, -y) for x, y in c] for c in pen.contours]

def area(c):
    return 0.5 * sum(c[i][0]*c[(i+1) % len(c)][1] - c[(i+1) % len(c)][0]*c[i][1] for i in range(len(c)))

def dedupe(c):
    out = []
    for p in c:
        if not out or math.hypot(p[0]-out[-1][0], p[1]-out[-1][1]) > 1e-6: out.append(p)
    if len(out) > 1 and math.hypot(out[0][0]-out[-1][0], out[0][1]-out[-1][1]) < 1e-6: out.pop()
    return out

def tri(a, b, c):
    return abs((b[0]-a[0])*(c[1]-a[1]) - (c[0]-a[0])*(b[1]-a[1])) / 2

def cost(a, b, c):
    """Visvalingam area, x40 for a vertex that turns more than 45 degrees (a real corner)."""
    v1 = (b[0]-a[0], b[1]-a[1]); v2 = (c[0]-b[0], c[1]-b[1])
    n = math.hypot(*v1) * math.hypot(*v2)
    if n == 0: return 0.0
    cs = (v1[0]*v2[0] + v1[1]*v2[1]) / n
    return tri(a, b, c) * (40 if cs < 0.7071 else 1)

def resample(c, n):
    """closed polygon -> exactly n vertices (see module doc)."""
    c = dedupe(c); c = list(c)
    while len(c) > n:  # Visvalingam with a corner penalty, ties broken by lowest index
        m = len(c)
        best = min(range(m), key=lambda i: (cost(c[i-1], c[i], c[(i+1) % m]), i))
        del c[best]
    while len(c) < n:  # split the longest edge
        m = len(c)
        i = max(range(m), key=lambda i: (math.hypot(c[(i+1) % m][0]-c[i][0], c[(i+1) % m][1]-c[i][1]), -i))
        a, b = c[i], c[(i+1) % m]
        c.insert(i+1, ((a[0]+b[0])/2, (a[1]+b[1])/2))
    return c

def perimeter(c):
    return sum(math.hypot(c[(i+1) % len(c)][0]-c[i][0], c[(i+1) % len(c)][1]-c[i][1]) for i in range(len(c)))

def bridge(a, b):
    """join polygon b into polygon a with a zero-width bridge; adds 2 duplicate points."""
    best = None
    for i, p in enumerate(a):
        for j, q in enumerate(b):
            d = (p[0]-q[0])**2 + (p[1]-q[1])**2
            if best is None or d < best[0]: best = (d, i, j)
    _, i, j = best
    if (area(a) > 0) == (area(b) > 0): b = b[::-1]; j = len(b) - 1 - j
    bb = b[j:] + b[:j]
    return a[:i+1] + bb + [bb[0]] + a[i:]

def inside(pt, poly):
    x, y = pt; r = False
    for i in range(len(poly)):
        (x1, y1), (x2, y2) = poly[i], poly[(i+1) % len(poly)]
        if (y1 > y) != (y2 > y) and x < (x2-x1)*(y-y1)/(y2-y1)+x1: r = not r
    return r

def drop_gap(small, big):
    """smallest straight-down distance from the island 'small' to an edge of 'big' (None if none)."""
    best = None
    for (px, py) in small:
        for i in range(len(big)):
            (x1, y1), (x2, y2) = big[i], big[(i+1) % len(big)]
            if x1 == x2 or (px < min(x1, x2) or px > max(x1, x2)): continue
            yy = y1 + (y2-y1)*(px-x1)/(x2-x1)
            if yy > py and (best is None or yy-py < best): best = yy - py
    return best

def parse_old(d):
    subs = []
    for part in re.split(r'(?=M)', d):
        pts = [(float(x), float(y)) for x, y in re.findall(r'[ML]\s+(-?[\d.]+)\s+(-?[\d.]+)', part)]
        if pts: subs.append(pts)
    return subs

def fit_to_old(contours, old_subs, S, cx, cy):
    allp = [p for c in contours for p in c]
    gx = (min(p[0] for p in allp) + max(p[0] for p in allp)) / 2
    gy = (min(p[1] for p in allp) + max(p[1] for p in allp)) / 2
    return [[((x-gx)*S+cx, (y-gy)*S+cy) for x, y in c] for c in contours]

def build_subpaths(contours, old_subs):
    k = len(old_subs); counts = [len(s) for s in old_subs]
    cs = sorted([dedupe(c) for c in contours], key=lambda c: -abs(area(c)))
    # merge extra contours into the biggest until we have k
    while len(cs) > k:
        small = cs.pop(); big = cs[0]
        if not inside(small[0], big):  # an island (e.g. the middle prong of shin), not a hole:
            g = drop_gap(small, big)   # slide it straight down until it touches, then bridge it
            if g is not None: small = [(x, y + g + 1.0) for x, y in small]
        tb = counts[0] if k == 1 else None
        total = sum(counts) if k == 1 else None
        if k == 1:
            share = len(cs) + 1  # contours still to merge after this one (rough split)
        pa, pb = perimeter(big), perimeter(small)
        N = counts[0] if k == 1 else None
        if k != 1: raise SystemExit('merge into several sub-paths not supported')
        # budget: N - 2 points shared by perimeter (a bridge adds 2)
        na = max(4, round((N - 2) * pa / (pa + pb))); nb = (N - 2) - na
        if nb < 3: nb = 3; na = N - 2 - nb
        cs[0] = bridge(resample(big, na), resample(small, nb))
        if cs: continue
    if len(cs) < k: raise SystemExit('glyph has fewer contours than old path')
    # pair contours with old sub-paths by nearest centroid (greedy, deterministic)
    def cen(c): return (sum(p[0] for p in c)/len(c), sum(p[1] for p in c)/len(c))
    out = [None]*k; used = set()
    order = sorted(range(k), key=lambda i: -counts[i])
    for oi in range(k):
        oc = cen(old_subs[oi])
        cand = [j for j in range(len(cs)) if j not in used]
        j = min(cand, key=lambda j: (math.hypot(cen(cs[j])[0]-oc[0], cen(cs[j])[1]-oc[1]), j))
        used.add(j); out[oi] = cs[j]
    res = []
    for oi in range(k):
        c = out[oi]
        if len(c) != counts[oi]: c = resample(c, counts[oi])
        if (area(c) > 0) != (area(old_subs[oi]) > 0): c = c[::-1]
        s0 = old_subs[oi][0]
        st = min(range(len(c)), key=lambda i: ((c[i][0]-s0[0])**2 + (c[i][1]-s0[1])**2, i))
        res.append(c[st:] + c[:st])
    return res

def path_d(subs):
    return ' '.join('M ' + ' L '.join(f'{round(x)} {round(y)}' for x, y in s) + ' Z' for s in subs)

def self_intersections(subs):
    # count crossings between non-adjacent edges of rounded polygons (diagnostic only)
    def segs(s): return [(s[i], s[(i+1) % len(s)]) for i in range(len(s))]
    def ccw(a, b, c): return (c[1]-a[1])*(b[0]-a[0]) - (b[1]-a[1])*(c[0]-a[0])
    n = 0
    for s in subs:
        sg = segs(s); m = len(sg)
        for i in range(m):
            for j in range(i+2, m):
                if i == 0 and j == m-1: continue
                a, b = sg[i]; c, d = sg[j]
                if ccw(a,c,d)*ccw(b,c,d) < 0 and ccw(a,b,c)*ccw(a,b,d) < 0: n += 1
    return n

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--font', required=True); ap.add_argument('--src', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--scale', type=float, default=None, help='units per font unit (default: auto)')
    a = ap.parse_args()
    font = TTFont(a.font); os.makedirs(a.out, exist_ok=True)
    data = {}
    for it, cp in ITEMS.items():
        f = glob.glob(os.path.join(a.src, 'batch-*', it + '-k1.svg'))[0]
        svg = open(f, encoding='utf-8').read()
        m = re.search(r'(<path id="p1" d=")([^"]*)(")', svg)
        old = parse_old(m.group(2)); cs = glyph_contours(font, cp)
        allp = [p for c in cs for p in c]; ox = [p for s in old for p in s]
        data[it] = (f, svg, m, old, cs, allp, ox)
    if a.scale is None:
        # one scale for all: tallest glyph (lamed) gets 104 units, everything else keeps true proportion
        hs = {it: max(p[1] for p in d[5]) - min(p[1] for p in d[5]) for it, d in data.items()}
        S = 104.0 / max(hs.values())
    else: S = a.scale
    report = {}
    for it, (f, svg, m, old, cs, allp, ox) in data.items():
        cx = (min(p[0] for p in ox) + max(p[0] for p in ox)) / 2
        cy = (min(p[1] for p in ox) + max(p[1] for p in ox)) / 2
        fitted = fit_to_old(cs, old, S, cx, cy)
        new = build_subpaths(fitted, old)
        d = path_d(new)
        out = svg[:m.start(2)] + d + svg[m.end(2):]
        open(os.path.join(a.out, it + '-k1.svg'), 'w', encoding='utf-8').write(out)
        ncmd = len(re.findall('[MLCZ]', d)); ocmd = len(re.findall('[MLCZ]', m.group(2)))
        xs = [p[0] for s in new for p in s]; ys = [p[1] for s in new for p in s]
        report[it] = {'glyph_contours': len(cs), 'old_subpaths': len(old), 'new_subpaths': len(new),
            'old_commands': ocmd, 'new_commands': ncmd, 'same_count': ncmd == ocmd,
            'self_intersections_after_rounding': self_intersections([[(round(x), round(y)) for x, y in s] for s in new]),
            'bbox': [round(min(xs)), round(min(ys)), round(max(xs)), round(max(ys))]}
    json.dump({'scale_svg_units_per_font_unit': S, 'items': report}, open(os.path.join(a.out, 'candidates.json'), 'w'), indent=1)
    bad = [k for k, v in report.items() if not v['same_count']]
    print('items', len(report), 'count mismatches', bad, 'scale', round(S, 5))

if __name__ == '__main__': main()
