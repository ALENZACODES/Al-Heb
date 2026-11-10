"""Synthetic Hebrew storefront signs for the camera backtest and sample images."""
from __future__ import annotations

import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from .overlay import load_hebrew_font, save_jpeg, strip_metadata

SIGNS = [
    {"id": "optical", "he": "חנות אופטיקה", "en": "Optical store", "bg": (28, 64, 92), "ink": (245, 236, 210), "style": "fascia"},
    {"id": "bakery", "he": "מאפייה", "en": "Bakery", "bg": (122, 62, 34), "ink": (255, 236, 200), "style": "fascia"},
    {"id": "pharmacy", "he": "בית מרקחת", "en": "Pharmacy", "bg": (20, 92, 58), "ink": (250, 250, 250), "style": "fascia"},
    {"id": "exit", "he": "יציאה", "en": "Exit", "bg": (176, 28, 28), "ink": (255, 255, 255), "style": "panel"},
    {"id": "closed", "he": "סגור", "en": "Closed", "bg": (36, 36, 36), "ink": (240, 220, 80), "style": "door"},
    {"id": "open", "he": "פתוח", "en": "Open", "bg": (24, 110, 48), "ink": (255, 255, 255), "style": "door"},
    {"id": "cafe", "he": "בית קפה", "en": "Coffee shop", "bg": (92, 48, 28), "ink": (255, 230, 180), "style": "fascia"},
    {"id": "restaurant", "he": "מסעדה", "en": "Restaurant", "bg": (48, 28, 20), "ink": (232, 200, 120), "style": "fascia"},
    {"id": "grocery", "he": "מכולת", "en": "Grocery", "bg": (40, 80, 44), "ink": (255, 255, 240), "style": "fascia"},
    {"id": "bank", "he": "בנק", "en": "Bank", "bg": (20, 36, 80), "ink": (240, 240, 255), "style": "panel"},
    {"id": "post", "he": "דואר", "en": "Post office", "bg": (230, 180, 30), "ink": (30, 30, 30), "style": "panel"},
    {"id": "hospital", "he": "בית חולים", "en": "Hospital", "bg": (250, 250, 250), "ink": (180, 20, 30), "style": "panel"},
    {"id": "restroom", "he": "שירותים", "en": "Restrooms", "bg": (40, 60, 80), "ink": (255, 255, 255), "style": "door"},
    {"id": "parking", "he": "חנייה", "en": "Parking", "bg": (20, 50, 120), "ink": (255, 220, 40), "style": "panel"},
    {"id": "museum", "he": "מוזיאון", "en": "Museum", "bg": (60, 40, 30), "ink": (236, 220, 180), "style": "fascia"},
    {"id": "shul", "he": "בית כנסת", "en": "Synagogue", "bg": (40, 44, 80), "ink": (230, 210, 140), "style": "fascia"},
    {"id": "hotel", "he": "מלון", "en": "Hotel", "bg": (70, 30, 40), "ink": (245, 230, 200), "style": "fascia"},
    {"id": "supermarket", "he": "סופרמרקט", "en": "Supermarket", "bg": (200, 40, 40), "ink": (255, 255, 255), "style": "fascia"},
    {"id": "library", "he": "ספרייה", "en": "Library", "bg": (48, 32, 16), "ink": (240, 220, 170), "style": "fascia"},
    {"id": "train", "he": "תחנת רכבת", "en": "Train station", "bg": (30, 30, 30), "ink": (255, 200, 40), "style": "panel"},
    {"id": "school", "he": "בית ספר", "en": "School", "bg": (30, 70, 120), "ink": (255, 255, 255), "style": "panel"},
    {"id": "danger", "he": "סכנה", "en": "Danger", "bg": (240, 180, 20), "ink": (20, 20, 20), "style": "panel"},
    {"id": "entrance", "he": "כניסה", "en": "Entrance", "bg": (16, 90, 70), "ink": (255, 255, 255), "style": "door"},
    {"id": "special", "he": "מחיר מיוחד", "en": "Special price", "bg": (180, 20, 60), "ink": (255, 240, 200), "style": "door"},
]


def _noise(im: Image.Image, amt: int = 12) -> Image.Image:
    rnd = random.Random(7)
    pix = im.load()
    w, h = im.size
    for _ in range(w * h // 8):
        x, y = rnd.randrange(w), rnd.randrange(h)
        r, g, b = pix[x, y]
        d = rnd.randint(-amt, amt)
        pix[x, y] = (max(0, min(255, r + d)), max(0, min(255, g + d)), max(0, min(255, b + d)))
    return im


def render_sign(spec: dict, *, width: int = 960, height: int = 540) -> tuple[Image.Image, list[int]]:
    """Return (image, box [x,y,w,h] of the Hebrew lettering)."""
    rnd = random.Random(spec["id"])
    bg = tuple(spec["bg"])
    ink = tuple(spec["ink"])
    im = Image.new("RGB", (width, height), tuple(max(0, min(255, c + (height - y) // 30 - 8)) for c in bg) if False else bg)
    # subtle vertical wash
    pix = im.load()
    for y in range(height):
        shade = (y - height // 2) // 14
        for x in range(width):
            r, g, b = pix[x, y]
            pix[x, y] = (max(0, min(255, r - shade)), max(0, min(255, g - shade)), max(0, min(255, b - shade)))
    im = _noise(im, 10)
    draw = ImageDraw.Draw(im)
    # fascia bar or hanging panel
    if spec["style"] == "fascia":
        bar = (40, height // 3, width - 40, height // 3 + height // 3)
        draw.rounded_rectangle(bar, radius=8, fill=bg, outline=tuple(max(0, c - 30) for c in bg), width=4)
    elif spec["style"] == "panel":
        bar = (width // 6, height // 4, width - width // 6, height - height // 4)
        draw.rounded_rectangle(bar, radius=16, fill=bg, outline=tuple(max(0, c - 40) for c in bg), width=6)
    else:
        bar = (width // 5, height // 3, width - width // 5, height - height // 3)
        draw.rectangle(bar, fill=bg, outline=tuple(max(0, c - 25) for c in bg), width=5)

    text = spec["he"]
    # fit Hebrew in the bar
    bx0, by0, bx1, by1 = bar
    max_w, max_h = (bx1 - bx0) - 40, (by1 - by0) - 24
    lo, hi, best = 24, 160, 40
    while lo <= hi:
        mid = (lo + hi) // 2
        font = load_hebrew_font(mid)
        x0, y0, x1, y1 = draw.textbbox((0, 0), text, font=font)
        if (x1 - x0) <= max_w and (y1 - y0) <= max_h:
            best = mid
            lo = mid + 1
        else:
            hi = mid - 1
    font = load_hebrew_font(best)
    x0, y0, x1, y1 = draw.textbbox((0, 0), text, font=font)
    tw, th = x1 - x0, y1 - y0
    tx = (bx0 + bx1 - tw) // 2 - x0
    ty = (by0 + by1 - th) // 2 - y0
    draw.text((tx, ty), text, font=font, fill=ink)
    box = [tx + x0 - 6, ty + y0 - 6, tw + 12, th + 12]
    return strip_metadata(im), box


def write_sign(spec: dict, dest: Path) -> dict:
    im, box = render_sign(spec)
    dest.parent.mkdir(parents=True, exist_ok=True)
    save_jpeg(im, dest)
    return {**spec, "path": str(dest), "box": box, "width": im.width, "height": im.height}
