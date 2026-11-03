#!/usr/bin/env python3
"""Render every letter's stroke data to an SVG contact sheet for human eyeballing.

Usage: python3 tools/letters/render_preview.py [letters.json] [outdir]
Writes docs/letters/preview-print.svg and preview-cursive.svg. For each letter: grid, (print) font outline in grey,
numbered strokes (colour-coded, start dot = green, arrow at end), stroke order digits at stroke starts.
"""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "data", "letters", "letters.json")
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "docs", "letters")
COLORS = ["#d62728", "#1f77b4", "#2ca02c", "#9467bd", "#ff7f0e", "#8c564b"]
COLS, T = 6, 220

def tile(letter, script, i):
    s = letter[script]
    x, y = (i % COLS) * T, (i // COLS) * (T + 24)
    g = [f'<g transform="translate({x},{y})">',
         f'<rect x="0" y="0" width="{T}" height="{T+24}" fill="#fff" stroke="#bbb"/>',
         f'<g transform="translate(0,22) scale({T/1000})">']
    for k in range(100, 1000, 100):
        g.append(f'<line x1="{k}" y1="0" x2="{k}" y2="1000" stroke="#eef" stroke-width="3"/><line x1="0" y1="{k}" x2="1000" y2="{k}" stroke="#eef" stroke-width="3"/>')
    g.append('<line x1="0" y1="756" x2="1000" y2="756" stroke="#cdd" stroke-width="3" stroke-dasharray="20 14"/>' if script == "print" else '<line x1="0" y1="700" x2="1000" y2="700" stroke="#cdd" stroke-width="3" stroke-dasharray="20 14"/>')
    if s.get("outline"):
        g.append(f'<path d="{s["outline"]}" fill="#e6e6e6" stroke="none"/>')
    for n, st in enumerate(s["strokes"]):
        col = COLORS[n % len(COLORS)]
        g.append(f'<path d="{st["path"]}" fill="none" stroke="{col}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>')
        m = st["median"]
        (sx, sy), (ex, ey) = m[0], m[-1]
        px, py = m[-2]
        import math
        a = math.atan2(ey - py, ex - px)
        ah = 46
        g.append(f'<polygon points="{ex},{ey} {ex-ah*math.cos(a-0.45):.0f},{ey-ah*math.sin(a-0.45):.0f} {ex-ah*math.cos(a+0.45):.0f},{ey-ah*math.sin(a+0.45):.0f}" fill="{col}"/>')
        g.append(f'<circle cx="{sx}" cy="{sy}" r="26" fill="#fff" stroke="{col}" stroke-width="8"/><text x="{sx}" y="{sy+14}" font-size="40" text-anchor="middle" fill="{col}" font-family="sans-serif" font-weight="bold">{n+1}</text>')
    g.append('</g>')
    g.append(f'<text x="6" y="16" font-size="14" font-family="sans-serif" fill="#000">{letter["id"]} {letter["he"]}  ({len(s["strokes"])})</text>')
    g.append('</g>')
    return "".join(g)

def main():
    letters = json.load(open(SRC, encoding="utf-8"))
    os.makedirs(OUT, exist_ok=True)
    for script in ("print", "cursive"):
        rows = (len(letters) + COLS - 1) // COLS
        h = rows * (T + 24) + 30
        parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{COLS*T}" height="{h}" viewBox="0 0 {COLS*T} {h}">',
                 '<rect width="100%" height="100%" fill="#fff"/>']
        parts.append(f'<g transform="translate(0,0)">')
        for i, l in enumerate(letters):
            parts.append(tile(l, script, i))
        parts.append('</g>')
        parts.append(f'<text x="6" y="{h-10}" font-size="13" font-family="sans-serif" fill="#a00">DRAFT {script} stroke data - not validated by a native Israeli teacher. Circle = start (numbered), arrow = end.</text>')
        parts.append('</svg>')
        with open(os.path.join(OUT, f"preview-{script}.svg"), "w", encoding="utf-8") as fh:
            fh.write("".join(parts))
        print("wrote", f"preview-{script}.svg")
main()
