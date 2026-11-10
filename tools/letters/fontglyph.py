"""Shared helpers: load an OFL font, get a glyph as an SVG path (y-down) in a font-units frame, and map it into the 0..1000 box."""
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

IDS = {
 "alef":0x5d0,"bet":0x5d1,"gimel":0x5d2,"dalet":0x5d3,"he":0x5d4,"vav":0x5d5,"zayin":0x5d6,"chet":0x5d7,
 "tet":0x5d8,"yod":0x5d9,"kaf":0x5db,"lamed":0x5dc,"mem":0x5de,"nun":0x5e0,"samekh":0x5e1,"ayin":0x5e2,
 "pe":0x5e4,"tsadi":0x5e6,"qof":0x5e7,"resh":0x5e8,"shin":0x5e9,"tav":0x5ea,
 "kaf-final":0x5da,"mem-final":0x5dd,"nun-final":0x5df,"pe-final":0x5e3,"tsadi-final":0x5e5,
}

class Face:
    def __init__(self, path):
        self.font = TTFont(path); self.cmap = self.font.getBestCmap(); self.gs = self.font.getGlyphSet()
    def bounds(self, cp):
        bp = BoundsPen(self.gs); self.gs[self.cmap[cp]].draw(bp); return bp.bounds
    def path(self, cp, t):
        """t = (a,b,c,d,e,f) affine applied to font coords (y up) giving SVG coords."""
        sp = SVGPathPen(self.gs, ntos=lambda v: "%.1f" % v)
        self.gs[self.cmap[cp]].draw(TransformPen(sp, t)); return sp.getCommands()
