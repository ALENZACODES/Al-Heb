#!/usr/bin/env python3
"""Local overlay tests: EXIF strip, contrast, held regions. No network."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from PIL import Image
from tools.translator.overlay import boost_ink, contrast_ratio, overlay_regions, save_jpeg
from tools.translator.signs import SIGNS, render_sign

def main():
    im = Image.new("RGB", (80, 40), (10, 20, 30))
    p = Path("/tmp/alef-overlay-test.jpg")
    save_jpeg(im, p)
    data = p.read_bytes()
    assert data[:2] == b"\xff\xd8"
    assert b"Exif" not in data and b"EXIF" not in data
    assert contrast_ratio((0, 0, 0), (255, 255, 255)) > 20
    ink = boost_ink((200, 200, 200), (220, 220, 220), 4.5)
    assert contrast_ratio(ink, (220, 220, 220)) >= 3.0
    spec = next(s for s in SIGNS if s["id"] == "exit")
    sign, box = render_sign(spec)
    out = overlay_regions(sign, [{"box": box, "text": spec["he"], "translation": spec["en"], "held": False}], gold=False)
    assert out.size == sign.size
    overlay_regions(sign, [{"box": box, "text": "יהוה", "translation": "X", "held": True}], gold=False)
    print("LOCAL_OVERLAY_TESTS_PASSED")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
