"""Draw the English over the Hebrew, on the photo itself.

For every region: estimate the sign's background and letter colours, remove the Hebrew letters (OpenCV inpainting,
or a strong blur when letters cannot be told apart from a busy background), then draw the English sized to the box.
Hebrew lines that were right-aligned in a block become left-aligned English; everything else is centred on its box.
"""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FONT_PATH = Path(__file__).with_name('fonts') / 'alef-Alef-Bold.ttf'
MIN_FONT = 9
LINE_HEIGHT = 1.12


def _font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_PATH), max(1, int(size)))


def _luminance(c) -> float:
    def ch(v):
        v = v / 255.0
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(float(x)) for x in c[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(a, b) -> float:
    la, lb = _luminance(a), _luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def _clip_box(box, W, H, pad=0):
    x, y, w, h = box
    x0 = int(max(0, np.floor(x - pad))); y0 = int(max(0, np.floor(y - pad)))
    x1 = int(min(W, np.ceil(x + w + pad))); y1 = int(min(H, np.ceil(y + h + pad)))
    return x0, y0, x1, y1


def analyse_region(arr: np.ndarray, box) -> dict:
    """-> {bg, fg, mask (uint8 over the padded box), roi:(x0,y0,x1,y1), coverage}. `arr` is RGB uint8."""
    H, W = arr.shape[:2]
    pad = max(2, int(round(box[3] * 0.14)))
    x0, y0, x1, y1 = _clip_box(box, W, H, pad)
    ring = max(3, int(round(box[3] * 0.18)))
    ox0, oy0, ox1, oy1 = _clip_box(box, W, H, pad + ring)
    outer = arr[oy0:oy1, ox0:ox1].reshape(-1, 3)
    inner_mask = np.zeros((oy1 - oy0, ox1 - ox0), bool)
    inner_mask[y0 - oy0:y1 - oy0, x0 - ox0:x1 - ox0] = True
    ring_px = outer[~inner_mask.reshape(-1)]
    roi = arr[y0:y1, x0:x1]
    if len(ring_px) < 12:   # the box touches every edge: use the box's own border pixels
        ring_px = np.concatenate([roi[0], roi[-1], roi[:, 0], roi[:, -1]])
    bg = np.median(ring_px, axis=0)
    dist = np.sqrt(((roi.astype(np.float32) - bg.astype(np.float32)) ** 2).sum(axis=2))
    d8 = np.clip(dist, 0, 255).astype(np.uint8)
    thr, _ = cv2.threshold(d8, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    thr = max(18.0, float(thr) * 0.6)     # below Otsu on purpose: soft letter edges must be erased too
    mask = (dist > thr).astype(np.uint8) * 255
    coverage = float((mask > 0).mean()) if mask.size else 0.0
    fg = np.median(roi[mask > 0], axis=0) if (mask > 0).sum() >= 8 else None
    flat = bool(len(ring_px) >= 12 and float(ring_px.astype(np.float32).std(axis=0).max()) < 9.0)
    return {'bg': bg, 'fg': fg, 'mask': mask, 'roi': (x0, y0, x1, y1), 'coverage': coverage, 'flat': flat}


def erase_text(arr: np.ndarray, info: dict, box_h: float) -> str:
    """Remove the letters inside info['roi'] in place. Returns the method used: 'fill', 'inpaint' or 'blur'."""
    x0, y0, x1, y1 = info['roi']
    if x1 <= x0 or y1 <= y0:
        return 'none'
    roi = arr[y0:y1, x0:x1]
    if info.get('flat') and info['coverage'] <= 0.55:   # a plain painted sign: its own colour is the cleanest eraser
        arr[y0:y1, x0:x1] = np.round(info['bg']).astype(np.uint8)
        return 'fill'
    if info['coverage'] > 0.55 or info['coverage'] < 0.002:
        k = max(9, int(box_h * 0.9) | 1)
        blurred = cv2.GaussianBlur(roi, (k, k), 0)
        blurred = cv2.GaussianBlur(blurred, (k, k), 0)
        arr[y0:y1, x0:x1] = blurred
        return 'blur'
    k = max(5, int(round(box_h * 0.14)) | 1)
    grown = cv2.dilate(info['mask'], cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    bgr = cv2.cvtColor(roi, cv2.COLOR_RGB2BGR)
    fixed = cv2.inpaint(bgr, grown, 3, cv2.INPAINT_TELEA)
    arr[y0:y1, x0:x1] = cv2.cvtColor(fixed, cv2.COLOR_BGR2RGB)
    return 'inpaint'


def text_colour(info: dict) -> tuple[int, int, int]:
    bg = info['bg']
    if info['fg'] is not None and contrast_ratio(info['fg'], bg) >= 3.0:
        return tuple(int(v) for v in info['fg'])
    return (255, 255, 255) if _luminance(bg) < 0.4 else (17, 17, 17)


def _wrap(words: list[str], n: int) -> list[str]:
    """Split words into n lines of roughly equal length (in characters)."""
    if n <= 1 or len(words) <= 1:
        return [' '.join(words)]
    n = min(n, len(words))
    total = sum(len(w) for w in words) + len(words) - 1
    lines, cur, used = [], [], 0
    for i, w in enumerate(words):
        cur.append(w); used += len(w) + 1
        left_words = len(words) - i - 1
        left_lines = n - len(lines) - 1
        if left_lines > 0 and (used >= total / n * (len(lines) + 1) or left_words == left_lines):
            lines.append(' '.join(cur)); cur = []
    if cur:
        lines.append(' '.join(cur))
    return lines


def _measure(lines: list[str], size: int) -> tuple[int, int]:
    f = _font(size)
    width = max(int(np.ceil(f.getlength(l))) for l in lines)
    return width, int(np.ceil(len(lines) * size * LINE_HEIGHT))


def fit_text(text: str, box_w: float, box_h: float, max_lines: int = 3) -> dict:
    """Largest font size (and line split) at which `text` fits inside box_w x box_h. -> {size, lines, fits}."""
    words = text.split()
    best = None
    # The Hebrew box hugs the letters; Latin lower-case letters sit smaller in their line, so one line may be up to 1.3x the box height.
    avail_w, avail_h = max(4.0, box_w * 0.96), max(4.0, box_h * 1.3)
    for n in range(1, min(max_lines, max(1, len(words))) + 1):
        lines = _wrap(words, n)
        lo, hi = MIN_FONT, max(MIN_FONT, int(avail_h / (len(lines) * LINE_HEIGHT)))
        ok = None
        while lo <= hi:
            mid = (lo + hi) // 2
            w, h = _measure(lines, mid)
            if w <= avail_w and h <= avail_h:
                ok = mid; lo = mid + 1
            else:
                hi = mid - 1
        if ok is not None and (best is None or ok > best['size']):
            best = {'size': ok, 'lines': lines, 'fits': True}
    if best is None:   # nothing fits even at the smallest size: draw small anyway and say so
        best = {'size': MIN_FONT, 'lines': _wrap(words, min(max_lines, max(1, len(words)))), 'fits': False}
    return best


def group_blocks(regions: list[dict]) -> list[list[dict]]:
    """Group lines that sit under one another (a menu, a two-line sign) by geometry, not by the OCR engine's block ids."""
    groups: list[list[dict]] = []
    for r in sorted(regions, key=lambda r: r['box'][1]):
        x, y, w, h = r['box']
        home = None
        for g in groups:
            px, py, pw, ph = g[-1]['box']
            gap = y - (py + ph)
            overlap = min(x + w, px + pw) - max(x, px)
            if -0.3 * h <= gap <= 1.6 * max(h, ph) and overlap > 0.2 * min(w, pw) and 0.5 <= h / max(1.0, ph) <= 2.0:
                home = g
                break
        if home is None:
            groups.append([r])
        else:
            home.append(r)
    return groups


def choose_alignment(regions: list[dict], image_w: float | None = None) -> list[list[dict]]:
    """Sets r['align'] ('center' or 'left') and r['fit_box'] for every region. Returns the line groups."""
    groups = group_blocks(regions)
    for rs in groups:
        for r in rs:
            x, y, w, h = r['box']
            grow = 0.15 * w                      # English is often longer than the Hebrew it replaces: allow a little sideways room
            if image_w:
                grow = max(0.0, min(grow, x - 2, image_w - (x + w) - 2))
            r['align'] = 'center'
            r['fit_box'] = (x - grow, y, w + 2 * grow, h)
        if len(rs) < 2:
            continue
        lefts = [r['box'][0] for r in rs]; rights = [r['box'][0] + r['box'][2] for r in rs]
        width = max(rights) - min(lefts)
        if width > 0 and (max(rights) - min(rights)) <= 0.06 * width and (max(lefts) - min(lefts)) >= 0.12 * width:
            for r in rs:   # Hebrew set flush right: put the English flush left across the group's width
                r['align'] = 'left'
                r['fit_box'] = (min(lefts), r['box'][1], width, r['box'][3])
    return groups


def render_overlay(img: Image.Image, regions: list[dict]) -> Image.Image:
    """Returns a new image. Regions without `en` (or with `held`) are left untouched. Adds r['drawn'], r['erase'], r['font_px']."""
    arr = np.array(img.convert('RGB'))
    todo = [r for r in regions if r.get('en') and not r.get('held')]
    for r in regions:
        r['drawn'] = False
    groups = choose_alignment(todo, arr.shape[1])
    plans = []
    for r in todo:
        x, y, w, h = r['box']
        lift = abs(np.sin(np.radians(float(r.get('angle') or 0)))) * w / 2   # a tilted line climbs above and below its level box
        info = analyse_region(arr, (x, y - lift, w, h + 2 * lift) if lift >= 1 else r['box'])
        plans.append((r, info, text_colour(info)))
    for r, info, _ in plans:           # erase everything first so one region's text never bleeds into another's analysis
        r['erase'] = erase_text(arr, info, r['box'][3])
    for r, _, _ in plans:
        r['_fit'] = fit_text(r['en'], r['fit_box'][2], r['fit_box'][3])
    for rs in groups:                  # lines of similar height in one group share the smallest size, like the original sign
        for r in rs:
            peers = [p for p in rs if 0.8 <= p['box'][3] / max(1, r['box'][3]) <= 1.25]
            r['_size'] = min(p['_fit']['size'] for p in peers)
    out = Image.fromarray(arr)
    for r, _, colour in plans:
        fit, size = r['_fit'], r.pop('_size')
        f = _font(size)
        x, y, w, h = r['fit_box']
        text_h = len(fit['lines']) * size * LINE_HEIGHT
        layer = Image.new('RGBA', (max(1, int(np.ceil(w))), max(1, int(np.ceil(max(h, text_h))))), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        top = (layer.height - text_h) / 2
        for i, line in enumerate(fit['lines']):
            lw = f.getlength(line)
            lx = 0.01 * w if r['align'] == 'left' else (layer.width - lw) / 2
            d.text((lx, top + i * size * LINE_HEIGHT + size * LINE_HEIGHT / 2), line, font=f, fill=colour + (255,), anchor='lm')
        angle = float(r.get('angle') or 0)
        if abs(angle) >= 1.5:
            layer = layer.rotate(-angle, resample=Image.BICUBIC, expand=True)
        cx, cy = x + w / 2, y + h / 2
        out.paste(layer, (int(round(cx - layer.width / 2)), int(round(cy - layer.height / 2))), layer)
        r['drawn'] = True
        r['font_px'] = size
        r['fits'] = fit['fits']
        del r['_fit']
    return out
