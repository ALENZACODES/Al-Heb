#!/usr/bin/env python3
"""PDF helpers for the ALEF book (pypdf; pip install pypdf, BSD-3).
  pdf_tools.py dests FILE.pdf              -> JSON {anchor-id: 1-based page} from the PDF's named destinations
  pdf_tools.py pad-even FILE.pdf           -> append a blank page (same size) if the page count is odd (in place)
  pdf_tools.py reverse IN.pdf OUT.pdf      -> reversed page order (for IngramSpark/Lulu right-to-left bound books); pads to even first
  pdf_tools.py finalize FILE.pdf TRIM_W_IN TRIM_H_IN BLEED_IN ltr|rtl  -> force exact page size (trim + KDP-style bleed on top/bottom/outer only) and set TrimBox/BleedBox per page parity
  pdf_tools.py info FILE.pdf               -> JSON page count and page boxes of page 1
"""
import sys, json
from pypdf import PdfReader, PdfWriter

def dests(path):
    r = PdfReader(path)
    return {k.lstrip('/'): r.get_destination_page_number(v) + 1 for k, v in r.named_destinations.items()}

def pad_even(path, out=None):
    r = PdfReader(path); w = PdfWriter()
    for p in r.pages: w.add_page(p)
    if len(r.pages) % 2:
        b = r.pages[-1].mediabox
        w.add_blank_page(float(b.width), float(b.height))
    w.write(out or path)

def reverse(src, out):
    r = PdfReader(src); w = PdfWriter()
    pages = list(r.pages)
    for p in reversed(pages): w.add_page(p)
    if len(pages) % 2:
        raise SystemExit('odd page count: run pad-even first (the reversed file must have an even count)')
    w.write(out)

def finalize(path, tw, th, b, binding):
    """Chromium rounds the page size by ~0.1pt; set MediaBox exactly and write TrimBox/BleedBox.
    Bleed on top, bottom and OUTER edge only. LTR: odd pages are recto (outer = right), even verso (outer = left). RTL-spreads build: swapped."""
    from pypdf.generic import RectangleObject
    r = PdfReader(path); w = PdfWriter()
    for i, page in enumerate(r.pages):
        odd = (i % 2 == 0)
        outer_right = odd if binding == 'ltr' else not odd
        W = (tw + b) * 72 if b else tw * 72; H = (th + 2 * b) * 72
        # content was laid out with the left edge at x=0; shift nothing, only set boxes
        x0 = 0 if (outer_right or not b) else b * 72
        trim = RectangleObject([x0, b * 72, x0 + tw * 72, b * 72 + th * 72])
        page.mediabox = RectangleObject([0, 0, W, H]); page.cropbox = RectangleObject([0, 0, W, H])
        page.bleedbox = RectangleObject([0, 0, W, H]); page.trimbox = trim
        w.add_page(page)
    w.write(path)

if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'dests': print(json.dumps(dests(sys.argv[2])))
    elif cmd == 'pad-even': pad_even(sys.argv[2])
    elif cmd == 'reverse': reverse(sys.argv[2], sys.argv[3])
    elif cmd == 'finalize': finalize(sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), sys.argv[6])
    elif cmd == 'info':
        r = PdfReader(sys.argv[2]); b = r.pages[0].mediabox
        print(json.dumps({'pages': len(r.pages), 'w_in': float(b.width) / 72, 'h_in': float(b.height) / 72}))
    else: raise SystemExit(__doc__)
