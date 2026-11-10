"""OCR providers. Each returns line regions: [{text, box:(x,y,w,h), polygon:[(x,y)x4], angle, block, conf}].

  GoogleVisionOCR   Cloud Vision DOCUMENT_TEXT_DETECTION with language hint "he" (needs credentials; sends the photo to Google).
  TesseractOCR      on-device fallback: the Tesseract CLI with the `heb` model, image passed on stdin (no temp file).

Reading order for the Tesseract path is rebuilt from word boxes the same way src/photo/order-lines.js does it
(lines by vertical overlap, words right-to-left, Latin/digit runs left-to-right).
"""
from __future__ import annotations

import math
import re
import shutil
import subprocess
from io import BytesIO

import cv2
import numpy as np
from PIL import Image

from .hebrew import has_hebrew
from .intake import encode_jpeg


class OCRError(RuntimeError):
    pass


# ---------------------------------------------------------------- shared geometry

def _bbox(points):
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return (min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys))


def _angle(poly) -> float:
    """Baseline angle in degrees from a 4-point polygon given as top-left, top-right, bottom-right, bottom-left."""
    (x0, y0), (x1, y1) = poly[0], poly[1]
    if x1 == x0 and y1 == y0:
        return 0.0
    a = math.degrees(math.atan2(y1 - y0, x1 - x0))
    return a if -45 <= a <= 45 else 0.0


_LTR_RE = re.compile('[A-Za-z0-9]')


def order_words(words: list[dict], min_overlap: float = 0.5) -> list[list[dict]]:
    """Word boxes -> lines in reading order (port of src/photo/order-lines.js)."""
    clean = [w for w in words if str(w.get('text', '')).strip()]
    lines: list[list[dict]] = []
    for box in sorted(clean, key=lambda b: b['y'] + b['h'] / 2):
        best, best_score = -1, 0.0
        bcx = box['x'] + box['w'] / 2
        for i, line in enumerate(lines):
            nearest = min(line, key=lambda m: abs(m['x'] + m['w'] / 2 - bcx))
            ov = max(0, min(box['y'] + box['h'], nearest['y'] + nearest['h']) - max(box['y'], nearest['y']))
            m = min(box['h'], nearest['h'])
            s = ov / m if m > 0 else 0
            if s >= min_overlap and s > best_score:
                best, best_score = i, s
        if best >= 0:
            lines[best].append(box)
        else:
            lines.append([box])
    lines.sort(key=lambda l: sum(b['y'] + b['h'] / 2 for b in l) / len(l))
    out = []
    for line in lines:
        rtl = sorted(line, key=lambda b: -(b['x'] + b['w']))
        fixed, i = [], 0
        while i < len(rtl):
            is_ltr = lambda t: bool(_LTR_RE.search(t)) and not has_hebrew(t)
            if not is_ltr(rtl[i]['text']):
                fixed.append(rtl[i]); i += 1; continue
            j = i
            while j < len(rtl) and is_ltr(rtl[j]['text']):
                j += 1
            fixed.extend(reversed(rtl[i:j])); i = j
        out.append(fixed)
    return out


def lines_to_regions(lines: list[list[dict]]) -> list[dict]:
    regions = []
    for n, line in enumerate(lines):
        x0 = min(w['x'] for w in line); y0 = min(w['y'] for w in line)
        x1 = max(w['x'] + w['w'] for w in line); y1 = max(w['y'] + w['h'] for w in line)
        confs = [w['conf'] for w in line if w.get('conf') is not None and w['conf'] >= 0]
        regions.append({'text': ' '.join(w['text'] for w in line), 'box': (x0, y0, x1 - x0, y1 - y0),
                        'polygon': [(x0, y0), (x1, y0), (x1, y1), (x0, y1)], 'angle': 0.0,
                        'block': line[0].get('block', n), 'conf': round(sum(confs) / len(confs), 1) if confs else None})
    return regions


# ---------------------------------------------------------------- Google Cloud Vision

BREAK_SPACE = {'SPACE', 'SURE_SPACE'}
BREAK_LINE = {'EOL_SURE_SPACE', 'LINE_BREAK', 'HYPHEN'}


def _break_name(symbol) -> str | None:
    prop = getattr(symbol, 'property', None)
    brk = getattr(prop, 'detected_break', None) if prop is not None else None
    t = getattr(brk, 'type_', None) if brk is not None else None
    if t is None or not t:
        return None
    return getattr(t, 'name', str(t))


def regions_from_vision(annotation) -> list[dict]:
    """fullTextAnnotation -> line regions. Lines end at Vision's detected line breaks; one region per line."""
    regions = []
    for page in getattr(annotation, 'pages', []) or []:
        for b_index, block in enumerate(page.blocks):
            for paragraph in block.paragraphs:
                text, polys, confs = '', [], []

                def flush():
                    nonlocal text, polys, confs
                    t = text.strip()
                    if t and polys:
                        pts = [p for poly in polys for p in poly]
                        regions.append({'text': t, 'box': _bbox(pts), 'polygon': _line_polygon(polys),
                                        'angle': round(_angle(polys[0]), 2), 'block': b_index,
                                        'conf': round(100 * sum(confs) / len(confs), 1) if confs else None})
                    text, polys, confs = '', [], []

                for word in paragraph.words:
                    poly = [(v.x, v.y) for v in word.bounding_box.vertices]
                    if len(poly) == 4:
                        polys.append(poly)
                    if getattr(word, 'confidence', 0):
                        confs.append(word.confidence)
                    end = None
                    for symbol in word.symbols:
                        text += symbol.text
                        end = _break_name(symbol) or end
                    if end in BREAK_LINE:
                        flush()
                    elif end in BREAK_SPACE:
                        text += ' '
                flush()
    return regions


def _line_polygon(polys):
    """Union of word polygons as an axis-aligned quad (the overlay rotates by `angle` when a line is tilted)."""
    x, y, w, h = _bbox([p for poly in polys for p in poly])
    return [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]


class GoogleVisionOCR:
    name = 'Google Cloud Vision DOCUMENT_TEXT_DETECTION (language hint he)'
    sends_image_off_server = True

    def __init__(self, client=None):
        self._client = client

    def _get(self):
        if self._client is None:
            from google.cloud import vision  # imported late so the fallback works without the library
            self._client = vision.ImageAnnotatorClient()
        return self._client

    def detect(self, img: Image.Image) -> list[dict]:
        from google.cloud import vision
        try:
            response = self._get().document_text_detection(
                image=vision.Image(content=encode_jpeg(img, 92)),
                image_context=vision.ImageContext(language_hints=['he']))
        except Exception as exc:  # network, quota, credentials
            raise OCRError(f'cloud text detection failed: {type(exc).__name__}') from exc
        err = getattr(getattr(response, 'error', None), 'message', '')
        if err:
            raise OCRError('cloud text detection returned an error')
        return regions_from_vision(response.full_text_annotation)


# ---------------------------------------------------------------- Tesseract fallback

def parse_tsv(tsv: str, scale: float = 1.0) -> list[dict]:
    words = []
    for row in tsv.split('\n')[1:]:
        c = row.split('\t')
        if len(c) < 12 or c[0] != '5':
            continue
        text = '\t'.join(c[11:]).strip()
        if not text:
            continue
        words.append({'text': text, 'x': int(c[6]) / scale, 'y': int(c[7]) / scale, 'w': int(c[8]) / scale, 'h': int(c[9]) / scale,
                      'conf': float(c[10]), 'block': int(c[2])})
    return words


def prepare_for_tesseract(img: Image.Image, target_side: int = 1800) -> tuple[bytes, float]:
    """Grey, upscale small photos, even out lighting, make the text dark on light. Returns PNG bytes and the scale used."""
    a = cv2.cvtColor(np.asarray(img.convert('RGB')), cv2.COLOR_RGB2GRAY)
    h, w = a.shape
    scale = min(3.0, max(1.0, target_side / max(h, w)))
    if scale > 1.0:
        a = cv2.resize(a, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)
    a = cv2.GaussianBlur(a, (3, 3), 0)
    _, binary = cv2.threshold(a, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    border = np.concatenate([binary[0, :], binary[-1, :], binary[:, 0], binary[:, -1]])
    if border.mean() < 127:          # dark background (white letters on a blue sign): invert
        binary = 255 - binary
    binary = cv2.copyMakeBorder(binary, 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=255)
    ok, enc = cv2.imencode('.png', binary)
    if not ok:
        raise OCRError('could not prepare the image')
    return enc.tobytes(), scale


class TesseractOCR:
    name = 'Tesseract heb (on this server, no cloud)'
    sends_image_off_server = False

    def __init__(self, binary: str = 'tesseract', lang: str = 'heb', psms: tuple[int, ...] = (6, 11), timeout: int = 60):
        self.binary, self.lang, self.psms, self.timeout = binary, lang, psms, timeout

    def available(self) -> bool:
        if not shutil.which(self.binary):
            return False
        try:
            r = subprocess.run([self.binary, '--list-langs'], capture_output=True, text=True, timeout=10)
        except (OSError, subprocess.SubprocessError):
            return False
        return self.lang in (r.stdout + r.stderr).split()

    def _run(self, png: bytes, psm: int) -> str:
        try:
            r = subprocess.run([self.binary, 'stdin', 'stdout', '-l', self.lang, '--psm', str(psm), 'tsv'],
                               input=png, capture_output=True, timeout=self.timeout)
        except (OSError, subprocess.SubprocessError) as exc:
            raise OCRError('the on-device reader could not run') from exc
        if r.returncode != 0:
            raise OCRError('the on-device reader failed')
        return r.stdout.decode('utf-8', 'replace')

    def detect(self, img: Image.Image) -> list[dict]:
        png, scale = prepare_for_tesseract(img)
        best, best_score = [], -1.0
        for psm in self.psms:
            words = [w for w in parse_tsv(self._run(png, psm), scale) if w['conf'] >= 0]
            for w in words:      # undo the 20 px white border added in prepare_for_tesseract
                w['x'] -= 20 / scale; w['y'] -= 20 / scale
            heb = [w for w in words if has_hebrew(w['text'])]
            score = sum(w['conf'] * len(w['text']) for w in heb)
            if score > best_score:
                best, best_score = words, score
        W, H = img.size
        for w in best:
            w['x'] = max(0, min(W - 1, w['x'])); w['y'] = max(0, min(H - 1, w['y']))
            w['w'] = max(1, min(W - w['x'], w['w'])); w['h'] = max(1, min(H - w['y'], w['h']))
        return lines_to_regions(order_words(best))
