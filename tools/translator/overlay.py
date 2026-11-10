"""Lens-style inpaint + typeset overlay for camera translation. See docs/camera/OVERLAY-STYLE.md."""
from __future__ import annotations

import io
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

NOTO = Path("/usr/share/fonts/truetype/sand-box/google/Noto Sans/NotoSans-VariableFont_wdth,wght.ttf")
INTER = Path("/usr/share/fonts/truetype/sand-box/google/Inter/Inter-VariableFont_opsz,wght.ttf")
LIB_BOLD = Path("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf")
HEB_BOLD = Path("/usr/share/fonts/truetype/sand-box/google/IBM Plex Sans Hebrew/IBMPlexSansHebrew-Bold.ttf")
HEB_REG = Path("/usr/share/fonts/truetype/sand-box/google/IBM Plex Sans Hebrew/IBMPlexSansHebrew-Regular.ttf")
GOLD = (201, 162, 39)
CREAM = (255, 246, 228)


def strip_metadata(im: Image.Image) -> Image.Image:
    """Return a copy with no EXIF, ICC, or other metadata."""
    mode = "RGB" if im.mode not in ("RGB", "L") else im.mode
    if im.mode != mode:
        im = im.convert(mode)
    out = Image.new(im.mode, im.size)
    out.putdata(list(im.getdata()))
    return out


def save_jpeg(im: Image.Image, dest, quality: int = 92) -> bytes:
    im = strip_metadata(im.convert("RGB"))
    buf = io.BytesIO()
    im.save(buf, format="JPEG", quality=quality, optimize=True)
    data = buf.getvalue()
    if dest is not None:
        Path(dest).write_bytes(data)
    return data


def _luminance(rgb) -> float:
    def f(c):
        x = c / 255.0
        return x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4
    r, g, b = f(rgb[0]), f(rgb[1]), f(rgb[2])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(a, b) -> float:
    l1, l2 = _luminance(a), _luminance(b)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def boost_ink(ink, paint, target: float = 4.5) -> tuple:
    ink = tuple(int(max(0, min(255, c))) for c in ink[:3])
    paint = tuple(int(max(0, min(255, c))) for c in paint[:3])
    if contrast_ratio(ink, paint) >= target:
        return ink
    toward_black = contrast_ratio((0, 0, 0), paint)
    toward_white = contrast_ratio((255, 255, 255), paint)
    end = (0, 0, 0) if toward_black >= toward_white else (255, 255, 255)
    lo, hi = 0.0, 1.0
    best = end
    for _ in range(12):
        t = (lo + hi) / 2
        cand = tuple(int(ink[i] + t * (end[i] - ink[i])) for i in range(3))
        if contrast_ratio(cand, paint) >= target:
            best = cand
            hi = t
        else:
            lo = t
    return best if contrast_ratio(best, paint) >= min(target, 3.0) else end


def _clamp_box(box, w, h, pad=0):
    x, y, bw, bh = [int(v) for v in box]
    x = max(0, x - pad); y = max(0, y - pad)
    bw = min(w - x, bw + 2 * pad); bh = min(h - y, bh + 2 * pad)
    return x, y, max(1, bw), max(1, bh)


def sample_paint(im: Image.Image, box, ring: int = 8):
    x, y, bw, bh = _clamp_box(box, im.width, im.height)
    px = im.convert("RGB").load()
    cols = []
    for yy in range(max(0, y - ring), min(im.height, y + bh + ring)):
        for xx in range(max(0, x - ring), min(im.width, x + bw + ring)):
            inside = (x <= xx < x + bw) and (y <= yy < y + bh)
            if not inside:
                cols.append(px[xx, yy])
    if not cols:
        return (240, 240, 240)
    # median per channel
    rs, gs, bs = zip(*cols)
    mid = len(cols) // 2
    return (sorted(rs)[mid], sorted(gs)[mid], sorted(bs)[mid])


def sample_ink(im: Image.Image, box):
    x, y, bw, bh = _clamp_box(box, im.width, im.height)
    paint = sample_paint(im, box)
    px = im.convert("RGB").load()
    far = []
    for yy in range(y, y + bh):
        for xx in range(x, x + bw):
            c = px[xx, yy]
            dist = sum(abs(c[i] - paint[i]) for i in range(3))
            if dist >= 60:
                far.append(c)
    if not far:
        # fall back to darker or lighter extreme in the box
        pix = [px[xx, yy] for yy in range(y, y + bh) for xx in range(x, x + bw)]
        if not pix:
            return (20, 20, 20)
        return min(pix, key=lambda c: _luminance(c)) if _luminance(paint) > 0.5 else max(pix, key=lambda c: _luminance(c))
    mid = len(far) // 2
    rs, gs, bs = zip(*far)
    return (sorted(rs)[mid], sorted(gs)[mid], sorted(bs)[mid])


def inpaint_box(im: Image.Image, box, dilate: int = 5) -> Image.Image:
    """Fill a dilated box with sampled paint and feather the edge (flat-fascia TELEA stand-in)."""
    im = im.convert("RGB")
    paint = sample_paint(im, box)
    x, y, bw, bh = _clamp_box(box, im.width, im.height, pad=dilate)
    layer = Image.new("RGB", im.size, paint)
    mask = Image.new("L", im.size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([x, y, x + bw, y + bh], radius=min(12, bh // 3), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=max(1, dilate // 2)))
    return Image.composite(layer, im, mask)


def _font(path: Path, size: int, weight: int = 700):
    font = ImageFont.truetype(str(path), size=size)
    try:
        axes = font.get_variation_axes() if hasattr(font, "get_variation_axes") else []
        names = {a["name"]: a for a in axes} if axes else {}
        if "wght" in names and hasattr(font, "set_variation_by_axes"):
            # preserve default width if present
            vals = []
            for a in axes:
                if a["name"] == "wght":
                    vals.append(max(a["minimum"], min(a["maximum"], weight)))
                else:
                    # default-ish mid or 100 for width
                    default = a.get("default") or 100
                    vals.append(default)
            font.set_variation_by_axes(vals)
    except Exception:
        pass
    return font


def load_latin_font(size: int, weight: int = 700):
    for path in (NOTO, INTER, LIB_BOLD):
        if path.exists():
            try:
                return _font(path, size, weight)
            except Exception:
                continue
    return ImageFont.load_default()


def load_hebrew_font(size: int):
    for path in (HEB_BOLD, HEB_REG):
        if path.exists():
            try:
                return ImageFont.truetype(str(path), size=size)
            except Exception:
                continue
    return load_latin_font(size)


def _fits(draw, text, font, max_w, max_h) -> bool:
    x0, y0, x1, y1 = draw.textbbox((0, 0), text, font=font)
    return (x1 - x0) <= max_w and (y1 - y0) <= max_h


def fit_and_draw_text(im: Image.Image, box, text: str, *, ink, gold: bool = False, hebrew: bool = False, align: str = "center"):
    """Binary-search a font size; grow the box slightly if we would drop below 14px."""
    im = im.convert("RGB")
    draw = ImageDraw.Draw(im)
    x, y, bw, bh = _clamp_box(box, im.width, im.height)
    pad = max(4, min(bw, bh) // 12)
    max_w, max_h = max(8, bw - 2 * pad), max(8, bh - 2 * pad)
    lo, hi = 8, max(14, int(bh * 0.9))
    best = 14
    loader = load_hebrew_font if hebrew else (lambda s: load_latin_font(s, 700))
    font = loader(best)
    while lo <= hi:
        mid = (lo + hi) // 2
        font = loader(mid)
        if _fits(draw, text, font, max_w, max_h):
            best = mid
            lo = mid + 1
        else:
            hi = mid - 1
    if best < 14:
        # grow the plate inside the image rather than shrink into mud
        extra = 10
        x, y, bw, bh = _clamp_box((x - extra, y - extra // 2, bw + 2 * extra, bh + extra), im.width, im.height)
        pad = max(4, min(bw, bh) // 12)
        max_w, max_h = max(8, bw - 2 * pad), max(8, bh - 2 * pad)
        lo, hi = 8, max(14, int(bh * 0.9))
        while lo <= hi:
            mid = (lo + hi) // 2
            font = loader(mid)
            if _fits(draw, text, font, max_w, max_h):
                best = mid
                lo = mid + 1
            else:
                hi = mid - 1
        font = loader(best)
    font = loader(best)
    x0, y0, x1, y1 = draw.textbbox((0, 0), text, font=font)
    tw, th = x1 - x0, y1 - y0
    if align == "left":
        tx = x + pad - x0
    elif align == "right":
        tx = x + bw - pad - tw - x0
    else:
        tx = x + (bw - tw) // 2 - x0
    ty = y + (bh - th) // 2 - y0
    fill = ink
    if gold:
        # cream letters, thin gold hairline (not a gold fill)
        fill = CREAM if _luminance(ink) > 0.45 or contrast_ratio(CREAM, sample_paint(im, box)) >= 3 else ink
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            draw.text((tx + dx, ty + dy), text, font=font, fill=GOLD)
    draw.text((tx, ty), text, font=font, fill=fill)
    return im


def overlay_regions(im: Image.Image, regions: list[dict], *, gold: bool = False, show_original: bool = False) -> Image.Image:
    """regions: {box:[x,y,w,h], text, translation, held?, align?}"""
    out = im.convert("RGB")
    for r in regions:
        if r.get("held"):
            continue
        box = r["box"]
        text = (r.get("text") if show_original else (r.get("translation") or r.get("text") or "")).strip()
        if not text:
            continue
        out = inpaint_box(out, box)
        paint = sample_paint(out, box)
        if show_original:
            ink = boost_ink(sample_ink(im, box), paint, 4.5)
            heb = True
        else:
            ink = boost_ink(sample_ink(im, box), paint, 4.5)
            heb = False
        if gold and not show_original:
            # still inpaint; gold hairline is applied in fit_and_draw_text
            pass
        out = fit_and_draw_text(
            out, box, text, ink=ink, gold=gold and not show_original,
            hebrew=heb, align=r.get("align") or "center",
        )
    return strip_metadata(out)
