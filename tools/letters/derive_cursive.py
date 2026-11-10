#!/usr/bin/env python3
"""Derive cursive stroke centrelines from the OFL font Gveret Levin (assets/fonts).

Pipeline per letter (see docs/letters/STROKE-RULES.md, section "Cursive derivation"):
 1. glyph outline (fontTools) -> SVG path mapped into the 0..1000 box (per-letter uniform scale, bbox centred) -> rasterise (rsvg-convert)
 2. skeletonise (scikit-image), prune short spurs, build a pixel graph (nodes = endpoints / junctions)
 3. contract junction clusters joined by short edges; pair edges through each junction by straightest continuation -> chains
 4. orient + order chains by the handwriting rules (R1..R5) unless OVERRIDES says otherwise
 5. smooth (moving average), simplify (Ramer-Douglas-Peucker), resample -> median + Catmull-Rom path
Output: data/letters/_build/cursive_derived.json  {id: {strokes:[{median,path}], scale, strokeWidth, note}}
Derived data is a derivative of the OFL font Gveret Levin (see data/letters/SOURCES.md).
Usage: python3 tools/letters/derive_cursive.py [--debug out.png]
"""
import json, os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, cv2
from fontglyph import Face, IDS
from skel import raster_svg_path, skeleton_graph, build_graph
from geom import smooth
from cursive_overrides import OVERRIDES, CUSTOM

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONT = os.path.join(ROOT, "assets", "fonts", "gveretlevin-GveretLevin-Regular.ttf")
MAXDIM = 760     # the letter's longer side is scaled to at most this many box units (scale capped at 1.0)
SHORT_EDGE = 45  # junction-to-junction edges shorter than this are contracted into one junction

def tangent(pts, from_start, L=40):
    """unit vector pointing away from the node along the edge"""
    seq = pts if from_start else pts[::-1]
    acc = 0; prev = seq[0]; tgt = seq[min(len(seq)-1, 1)]
    for p in seq[1:]:
        acc += math.hypot(p[0]-prev[0], p[1]-prev[1]); prev = p; tgt = p
        if acc >= L: break
    v = (tgt[0]-seq[0][0], tgt[1]-seq[0][1]); n = math.hypot(*v) or 1
    return (v[0]/n, v[1]/n)

def assemble(nodes, edges):
    """Return list of chains; each chain is a list of (y,x) pixels. Greedy straightest-continuation pairing at junctions."""
    # union-find to contract junctions across short edges
    parent = list(range(len(nodes)))
    def find(a):
        while parent[a] != a: parent[a] = parent[parent[a]]; a = parent[a]
        return a
    deg = {}
    for e in edges:
        deg[e["a"]] = deg.get(e["a"], 0) + 1; deg[e["b"]] = deg.get(e["b"], 0) + 1
    keep = []
    for e in edges:
        if e["a"] != e["b"] and len(e["pts"]) < SHORT_EDGE and deg[e["a"]] >= 3 and deg[e["b"]] >= 3:
            parent[find(e["a"])] = find(e["b"])  # contract
        else: keep.append(e)
    ends = []  # (edge index, side, node)
    for i, e in enumerate(keep):
        ends.append((i, 0, find(e["a"]))); ends.append((i, 1, find(e["b"])))
    by_node = {}
    for i, s, nd in ends: by_node.setdefault(nd, []).append((i, s))
    link = {}  # (edge, side) -> (edge, side) paired
    for nd, lst in by_node.items():
        if len(lst) < 3 and len(lst) != 2: continue
        if len(lst) == 2 and keep[lst[0][0]] is keep[lst[1][0]]: continue
        vecs = {(i, s): tangent(keep[i]["pts"], s == 0) for i, s in lst}
        cand = []
        for x in range(len(lst)):
            for y in range(x+1, len(lst)):
                a, b = lst[x], lst[y]
                if a[0] == b[0]: continue
                va, vb = vecs[a], vecs[b]
                dot = va[0]*vb[0] + va[1]*vb[1]   # -1 = perfectly straight continuation
                cand.append((dot, a, b))
        cand.sort(key=lambda c: c[0])
        used = set()
        for dot, a, b in cand:
            if dot > -0.35: break   # turn sharper than ~110 degrees from straight: do not join
            if a in used or b in used: continue
            link[a] = b; link[b] = a; used.add(a); used.add(b)
    # build chains
    seen = set(); chains = []
    for i in range(len(keep)):
        if i in seen: continue
        # walk back to chain start
        cur = (i, 0); guard = 0
        while cur in link and guard < 50:
            nxt = link[cur]; cur = (nxt[0], 1 - nxt[1]); guard += 1
            if cur[0] == i: break
        # cur = (edge, side) where chain starts at side 'side'
        chain = []; e, s = cur; guard = 0
        while guard < 50:
            seen.add(e); pts = keep[e]["pts"] if s == 0 else keep[e]["pts"][::-1]
            chain.extend(pts if not chain else pts[1:])
            out = (e, 1 - s)
            if out in link and link[out][0] not in seen:
                e, s = link[out]
            else: break
            guard += 1
        chains.append(chain)
    return chains

def smooth_poly(pts, win=15):
    a = np.array(pts, float)
    if len(a) < win + 2: return a
    k = np.ones(win) / win
    pad = win // 2
    ap = np.vstack([np.repeat(a[:1], pad, 0), a, np.repeat(a[-1:], pad, 0)])
    # keep exact endpoints by reflecting (extrapolating) instead of repeating
    ap[:pad] = 2*a[0] - a[1:pad+1][::-1]; ap[-pad:] = 2*a[-1] - a[-pad-1:-1][::-1]
    out = np.stack([np.convolve(ap[:, 0], k, "valid"), np.stack([np.convolve(ap[:, 1], k, "valid")])[0]], 1)
    return out

def rdp(pts, eps):
    pts = np.asarray(pts); 
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; ab = b - a; n = np.hypot(*ab)
    if n == 0: d = np.hypot(*(pts - a).T)
    else: d = np.abs(ab[0]*(pts[:, 1]-a[1]) - ab[1]*(pts[:, 0]-a[0])) / n
    i = int(np.argmax(d))
    if d[i] > eps: return np.vstack([rdp(pts[:i+1], eps)[:-1], rdp(pts[i:], eps)])
    return np.vstack([a, b])

def orient_and_order(chains, lid):
    """Apply the handwriting rules: start from the top (tall chains) or the right (flat chains); order right-to-left by chain start x
    unless a chain is clearly the 'body' - see OVERRIDES for per-letter corrections."""
    out = []
    for c in chains:
        a = np.array(c, float)  # (y,x)
        h = a[:, 0].max() - a[:, 0].min(); w = a[:, 1].max() - a[:, 1].min()
        s, e = a[0], a[-1]
        flat = w > 1.6 * h
        if flat: first_is_start = s[1] >= e[1]   # right end first (R1)
        else: first_is_start = s[0] <= e[0]       # top end first (R2/R3)
        out.append(c if first_is_start else c[::-1])
    out.sort(key=lambda c: (-round(np.mean([p[1] for p in c]) / 120), np.mean([p[0] for p in c])))
    return out

def to_stroke(chain, dt_mean, S_dummy=None):
    a = smooth_poly([(p[1], p[0]) for p in chain], win=21)       # to (x,y)
    simp = rdp(a, 6.0)
    # Catmull-Rom smooth() wants control points; keep ~ every simplified vertex
    ctrl = [(float(x), float(y)) for x, y in simp]
    d, med = smooth(ctrl, samples=6)
    med = [[min(1000, max(0, x)), min(1000, max(0, y))] for x, y in med]
    return {"path": d, "median": med}

def fix_loop(c):
    """Closed chains (samekh): start at the topmost point and go counter-clockwise on screen (left first)."""
    a = np.array(c, float)
    if np.hypot(*(a[0] - a[-1])) > 3: return c
    i = int(np.argmin(a[:, 0])); a = np.vstack([a[i:], a[1:i+1]])
    # screen orientation: signed area in (x, y-down)
    x, y = a[:, 1], a[:, 0]
    area = 0.5 * np.sum(x[:-1] * y[1:] - x[1:] * y[:-1])  # >0 = clockwise on screen (y down)
    if area > 0: a = a[::-1].copy(); a = np.vstack([a[-1:], a[:-1]]) if False else a
    return [tuple(map(int, p)) for p in (a if area <= 0 else a[::-1])]

def derive(F, lid, cp, debug=None):
    x0, y0, x1, y1 = F.bounds(cp); w, h = x1-x0, y1-y0
    S = min(1.0, MAXDIM / max(w, h)); cx, cy = (x0+x1)/2, (y0+y1)/2
    ov = OVERRIDES.get(lid, {})
    dy = ov.get("dy", 0)
    d = F.path(cp, (S, 0, 0, -S, 500 - cx*S, 500 + cy*S + dy))
    mask = raster_svg_path(d)
    sk, dt = skeleton_graph(mask)
    nodes, edges = build_graph(sk)
    for idx in sorted(ov.get("drop_edges", []), reverse=True):
        pass
    chains = assemble(nodes, edges)
    min_len = ov.get("min_len", 60)
    chains = [c for c in chains if len(c) >= min_len]
    chains = orient_and_order(chains, lid)
    if lid in CUSTOM: chains = CUSTOM[lid](chains)
    for (i, j) in ov.get("join", []):
        chains[i] = chains[i] + chains[j][1:]; chains[j] = None
    chains = [c for c in chains if c is not None] if "join" in ov else chains
    chains = [fix_loop(c) for c in chains]
    if "flip" in ov:
        for i in ov["flip"]: chains[i] = chains[i][::-1]
    if "order" in ov: chains = [chains[i] for i in ov["order"]]
    strokes = [to_stroke(c, 0) for c in chains]
    wid = float(np.mean([2 * dt[p] for c in chains for p in c[::7]])) if chains else 0
    import re
    outline = re.sub(r"-?\d+\.\d+", lambda m: str(int(round(float(m.group())))), d)
    rec = {"strokes": strokes, "scale": round(S, 4), "strokeWidth": int(round(wid)), "outline": outline}
    if debug is not None:
        debug.append((lid, mask, chains))
    return rec

def main():
    F = Face(FONT); out = {}; dbg = []
    for lid, cp in IDS.items():
        out[lid] = derive(F, lid, cp, dbg)
        print(lid, "strokes", len(out[lid]["strokes"]), "scale", out[lid]["scale"], "width", out[lid]["strokeWidth"])
    os.makedirs(os.path.join(ROOT, "data", "letters", "_build"), exist_ok=True)
    with open(os.path.join(ROOT, "data", "letters", "_build", "cursive_derived.json"), "w") as fh:
        json.dump(out, fh, ensure_ascii=False)
if __name__ == "__main__": main()
