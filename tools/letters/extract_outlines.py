#!/usr/bin/env python3
"""Extract print-letter outlines from DejaVu Sans into the ALEF 0..1000 box.

Output: data/letters/_build/print_outlines.json  {id: {"cp": int, "outline": svg-d, "bbox": [x0,y0,x1,y1]}}
Uniform scale for all letters (so relative sizes, ascenders and descenders are preserved);
y is flipped (SVG y-down); each glyph is centred horizontally on x=500.

Font: DejaVu Sans (Bitstream Vera license + public-domain DejaVu changes). See data/letters/SOURCES.md.
Usage: python3 tools/letters/extract_outlines.py [font.ttf]
"""
import json, os, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

FONT = sys.argv[1] if len(sys.argv) > 1 else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCALE = 0.48      # font units -> box units (lamed ascender 1493 -> y=40, final descender -426 -> y~960)
BASELINE = 756    # y of the Hebrew baseline in the box

IDS = {  # id -> code point
 "alef":0x5d0,"bet":0x5d1,"gimel":0x5d2,"dalet":0x5d3,"he":0x5d4,"vav":0x5d5,"zayin":0x5d6,"chet":0x5d7,
 "tet":0x5d8,"yod":0x5d9,"kaf":0x5db,"lamed":0x5dc,"mem":0x5de,"nun":0x5e0,"samekh":0x5e1,"ayin":0x5e2,
 "pe":0x5e4,"tsadi":0x5e6,"qof":0x5e7,"resh":0x5e8,"shin":0x5e9,"tav":0x5ea,
 "kaf-final":0x5da,"mem-final":0x5dd,"nun-final":0x5df,"pe-final":0x5e3,"tsadi-final":0x5e5,
}

def main():
    font = TTFont(FONT); cmap = font.getBestCmap(); gs = font.getGlyphSet()
    out = {}
    for lid, cp in IDS.items():
        g = gs[cmap[cp]]
        bp = BoundsPen(gs); g.draw(bp); x0, y0, x1, y1 = bp.bounds
        cx = (x0 + x1) / 2
        t = (SCALE, 0, 0, -SCALE, 500 - cx * SCALE, BASELINE)
        sp = SVGPathPen(gs, ntos=lambda v: str(int(round(v))))
        g.draw(TransformPen(sp, t))
        bx0, bx1 = 500 + (x0 - cx) * SCALE, 500 + (x1 - cx) * SCALE
        by0, by1 = BASELINE - y1 * SCALE, BASELINE - y0 * SCALE
        out[lid] = {"cp": cp, "outline": sp.getCommands(),
                    "bbox": [round(bx0), round(by0), round(bx1), round(by1)]}
    d = os.path.join(ROOT, "data", "letters", "_build"); os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "print_outlines.json"), "w") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
    for k, v in out.items(): print(k, v["bbox"])

main()
