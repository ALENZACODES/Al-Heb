"""Shared geometry: Catmull-Rom smoothing of authored control points -> SVG path + dense median."""

def _split(points):
    """Split at corners (3-tuples). Returns list of sub-polylines [(x,y),...]; corner point ends one and starts next."""
    parts, cur = [], []
    for p in points:
        xy = (p[0], p[1])
        if len(p) == 3:
            cur.append(xy)
            parts.append(cur); cur = [xy]
        else:
            if cur and cur[-1] == xy: continue
            cur.append(xy)
    if len(cur) > 1 or not parts: parts.append(cur)
    return [p for p in parts if len(p) >= 2]

def _bezier_segments(pts):
    """Catmull-Rom (tension 0.5) through pts -> list of cubic segments (p0,c1,c2,p1)."""
    segs = []
    n = len(pts)
    for i in range(n - 1):
        p0 = pts[max(i - 1, 0)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(i + 2, n - 1)]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6.0, p1[1] + (p2[1] - p0[1]) / 6.0)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6.0, p2[1] - (p3[1] - p1[1]) / 6.0)
        segs.append((p1, c1, c2, p2))
    return segs

def _cubic(seg, t):
    p0, c1, c2, p1 = seg; u = 1 - t
    return (u**3*p0[0] + 3*u*u*t*c1[0] + 3*u*t*t*c2[0] + t**3*p1[0],
            u**3*p0[1] + 3*u*u*t*c1[1] + 3*u*t*t*c2[1] + t**3*p1[1])

def smooth(points, samples=5):
    """Return (svg_d, median) for authored control points. median = dense integer samples."""
    d, med = [], []
    for part in _split(points):
        segs = _bezier_segments(part)
        if not d: d.append("M%d %d" % (round(part[0][0]), round(part[0][1])))
        else: d.append("L%d %d" % (round(part[0][0]), round(part[0][1])))
        for s in segs:
            d.append("C%d %d %d %d %d %d" % tuple(round(v) for v in (s[1][0], s[1][1], s[2][0], s[2][1], s[3][0], s[3][1])))
            for k in range(0, samples):
                q = _cubic(s, k / samples)
                med.append((round(q[0]), round(q[1])))
        med.append((round(part[-1][0]), round(part[-1][1])))
    out = []
    for q in med:
        if not out or out[-1] != q: out.append(q)
    return " ".join(d), [list(q) for q in out]
