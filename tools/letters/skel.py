"""Raster -> skeleton graph helpers (numpy / scikit-image / opencv). Dev tooling only (see docs/TOOLING.md)."""
import subprocess, io
import numpy as np, cv2
from skimage.morphology import skeletonize
from scipy import ndimage as ndi

N8 = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]

def raster_svg_path(d, size=1000, scale=1.0):
    """Rasterise an SVG path (nonzero fill) in a size x size box with rsvg-convert. Returns bool array."""
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}"><rect width="100%" height="100%" fill="#fff"/><path d="{d}" fill="#000" fill-rule="nonzero"/></svg>'
    png = subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size)], input=svg.encode(), capture_output=True, check=True).stdout
    img = cv2.imdecode(np.frombuffer(png, np.uint8), cv2.IMREAD_GRAYSCALE)
    return img < 128

def neighbours(sk, y, x):
    out = []
    for dy, dx in N8:
        yy, xx = y+dy, x+dx
        if 0 <= yy < sk.shape[0] and 0 <= xx < sk.shape[1] and sk[yy, xx]: out.append((yy, xx))
    return out

def skeleton_graph(mask, spur_factor=1.3, min_spur=14):
    """Skeletonise `mask`; return (skel, dt, edges, nodes) after pruning spurs shorter than max(min_spur, spur_factor*local radius).
    edges: list of dicts {a, b, pts[(y,x)...]} with node ids a,b (a==b possible for loops)."""
    dt = ndi.distance_transform_edt(mask)
    sk = skeletonize(mask)
    for _ in range(6):
        changed = prune_once(sk, dt, spur_factor, min_spur)
        if not changed: break
    return sk, dt

def deg_map(sk):
    k = np.ones((3,3)); k[1,1] = 0
    return ndi.convolve(sk.astype(int), k, mode="constant") * sk

def prune_once(sk, dt, spur_factor, min_spur):
    """Remove end branches (endpoint -> junction) shorter than threshold. In place. Returns True if changed."""
    deg = crossing_number(sk)
    ends = list(zip(*np.where(deg == 1)))
    changed = False
    for (y, x) in ends:
        if not sk[y, x]: continue
        path = [(y, x)]; prev = None; cur = (y, x)
        while True:
            nb = [p for p in neighbours(sk, *cur) if p != prev and p not in path[-3:]]
            if len(nb) != 1: break
            prev = cur; cur = nb[0]
            if deg[cur] >= 3: break
            path.append(cur)
            if len(path) > 400: break
        else:
            pass
        if deg[cur] >= 3 and len(path) < max(min_spur, spur_factor * max(dt[y, x], 1)):
            for p in path: sk[p] = False
            changed = True
    if changed:
        sk[:] = skeletonize(sk)
    return changed

def crossing_number(sk):
    """Rutovitz crossing number per skeleton pixel (count of 0->1 transitions around the 8-neighbourhood)."""
    H, W = sk.shape
    P = np.pad(sk, 1)
    ring = [(-1,0),(-1,1),(0,1),(1,1),(1,0),(1,-1),(0,-1),(-1,-1)]
    cn = np.zeros(sk.shape, int)
    sh = [P[1+dy:1+dy+H, 1+dx:1+dx+W] for dy, dx in ring]
    for i in range(8):
        cn += ((~sh[i]) & sh[(i+1) % 8]).astype(int)
    return cn * sk

def build_graph(sk):
    """Trace skeleton into edges between nodes. Nodes = endpoints (CN==1) and junction clusters (CN>=3).
    Returns nodes [{id, pts, c}], edges [{a, b, pts}] (pts include both end pixels). Pure loops get one synthetic node."""
    cn = crossing_number(sk)
    nodemask = (cn == 1) | (cn >= 3)
    lab, n = ndi.label(nodemask, structure=np.ones((3,3)))
    nodes = []; node_of = {}
    for i in range(1, n+1):
        pts = list(zip(*np.where(lab == i)))
        c = np.mean(pts, axis=0)
        nodes.append({"id": i-1, "pts": pts, "c": (float(c[0]), float(c[1]))})
        for p in pts: node_of[p] = i-1
    visited = set(); edges = []
    for nd in nodes:
        for p in nd["pts"]:
            for q in neighbours(sk, *p):
                if q in node_of or q in visited: continue
                path = [p, q]; visited.add(q); cur = q; end = None
                while True:
                    nb = [r for r in neighbours(sk, *cur) if r != path[-2] and r not in path[-3:]]
                    hit = [r for r in nb if r in node_of]
                    if hit: path.append(hit[0]); end = node_of[hit[0]]; break
                    nb = [r for r in nb if r not in visited]
                    if not nb: break
                    cur = nb[0]; visited.add(cur); path.append(cur)
                if end is not None and not (end == nd["id"] and len(path) < 6):
                    edges.append({"a": nd["id"], "b": end, "pts": path})
    covered = set(visited) | set(node_of)
    rest = sk.copy()
    for p in covered: rest[p] = False
    lab2, n2 = ndi.label(rest, structure=np.ones((3,3)))
    for i in range(1, n2+1):
        pts = list(zip(*np.where(lab2 == i)))
        if len(pts) > 20:
            nid = len(nodes); nodes.append({"id": nid, "pts": [pts[0]], "c": pts[0]})
            ordered = order_loop(sk, pts)
            edges.append({"a": nid, "b": nid, "pts": ordered + [ordered[0]]})
    return nodes, edges

def order_loop(sk, pts):
    pts = set(pts); cur = next(iter(pts)); out = [cur]; pts.discard(cur)
    while pts:
        nb = [p for p in neighbours(sk, *cur) if p in pts]
        if not nb: break
        cur = nb[0]; out.append(cur); pts.discard(cur)
    return out
