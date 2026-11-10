"""Photo bytes -> regions + translated photo. Everything stays in memory; nothing is written to disk or kept after the call."""
from __future__ import annotations

from .hebrew import Glossary, consonants, contains_sacred_name, has_hebrew, has_latin_name
from .intake import encode_jpeg, load_clean
from .ocr import OCRError
from .overlay import render_overlay

HELD_NOTE = 'Sacred text: left exactly as written.'


def translate_photo(data: bytes, ocr, translator, glossary: Glossary | None = None, fallback_ocr=None) -> dict:
    """-> {width, height, regions, image_jpeg, engines:{ocr, translate}, notices}."""
    glossary = glossary or Glossary.load()
    img = load_clean(data)
    notices: list[str] = []
    used_ocr = ocr
    try:
        raw = ocr.detect(img)
    except OCRError:
        if fallback_ocr is None:
            raise
        used_ocr = fallback_ocr
        raw = fallback_ocr.detect(img)
        notices.append('The main text reader did not answer, so the simpler on-server reader was used.')

    regions = []
    for r in raw:
        text = str(r.get('text') or '').strip()
        if not has_hebrew(text):
            continue                       # Latin text, prices on their own, stray marks: leave the photo alone there
        held = contains_sacred_name(text)
        if not held and len(consonants(text)) < 2 and not glossary.translate(text)['en']:
            continue                       # a lone letter is almost always OCR noise
        x, y, w, h = r['box']
        regions.append({'id': f'r{len(regions) + 1}', 'box': (float(x), float(y), float(w), float(h)), 'angle': float(r.get('angle') or 0),
                        'block': r.get('block'), 'conf': r.get('conf'), 'he': text, 'held': held,
                        'en': None, 'source': None, 'translit': None, 'pointed': None})

    open_regions = [r for r in regions if not r['held']]
    if open_regions:
        results = translator.translate([r['he'] for r in open_regions])
        for r, t in zip(open_regions, results):
            en = (t.get('en') or '').strip() or None
            if en and has_latin_name(en):
                r['held'] = True           # never draw or return a spelled-out form of the name
                continue
            r['en'], r['source'] = en, (t.get('source') if en else None)
            known = glossary.translate(r['he'])
            r['translit'] = t.get('translit') or known['translit']
            r['pointed'] = t.get('pointed') or known['pointed']
        for msg in getattr(translator, 'errors', []) or []:
            notices.append('The translation service did not answer for some lines; the built-in word list was used where it could.')
            break

    out_img = render_overlay(img, regions)
    public = []
    for r in regions:
        x, y, w, h = r['box']
        item = {'id': r['id'], 'box': {'x': round(x, 1), 'y': round(y, 1), 'w': round(w, 1), 'h': round(h, 1)},
                'held': bool(r['held']), 'drawn': bool(r.get('drawn')), 'conf': r.get('conf')}
        if r['held']:
            item.update({'he': None, 'en': None, 'translationSource': None, 'translit': None, 'pointed': None, 'note': HELD_NOTE})
        else:
            item.update({'he': r['he'], 'en': r['en'], 'translationSource': r['source'], 'translit': r['translit'], 'pointed': r['pointed'],
                         'eraseMethod': r.get('erase'), 'fontPx': r.get('font_px'), 'fits': r.get('fits')})
        public.append(item)
    if regions and not any(r.get('drawn') for r in regions):
        notices.append('Hebrew was found, but none of it could be translated here.')
    if not regions:
        notices.append('No Hebrew text was found in this photo.')
    return {'width': img.width, 'height': img.height, 'regions': public, 'image_jpeg': encode_jpeg(out_img),
            'engines': {'ocr': used_ocr.name, 'translate': translator.name}, 'notices': notices}
