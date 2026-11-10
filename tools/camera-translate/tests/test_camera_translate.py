"""Tests for the camera translator service. Run: python3 -m pytest tools/camera-translate/tests -q

Cloud calls are never made here: the Google clients are replaced by fakes, and the Vision response parser is fed
response objects built from the real google-cloud-vision types (skipped when that library is not installed).
"""
import base64
import io
import json
import os
import tempfile
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from camera_translate import intake, overlay
from camera_translate.hebrew import NAME_SKELETON, Glossary, contains_sacred_name, has_latin_name, strip_marks, tokens
from camera_translate.ocr import GoogleVisionOCR, OCRError, TesseractOCR, estimate_skew, order_words, lines_to_regions, parse_tsv, prepare_for_tesseract, regions_from_vision
from camera_translate.pipeline import translate_photo
from camera_translate.translate import ChainTranslator, GlossaryTranslator, GoogleTranslator, TranslateError

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SIGNS = HERE / 'signs'


def jpeg_with_exif(size=(320, 200), orientation=None, colour=(20, 70, 150)):
    img = Image.new('RGB', size, colour)
    exif = Image.Exif()
    exif[0x010F] = 'TestCam'                    # Make
    exif[0x0132] = '2026:11:10 02:00:00'        # DateTime
    if orientation:
        exif[0x0112] = orientation
    gps = exif.get_ifd(0x8825)
    gps[1] = 'N'; gps[2] = (43.0, 52.0, 0.0); gps[3] = 'W'; gps[4] = (79.0, 26.0, 0.0)
    buf = io.BytesIO()
    img.save(buf, 'JPEG', exif=exif, comment=b'private note')
    return buf.getvalue()


class FakeOCR:
    name = 'fake reader'
    sends_image_off_server = False

    def __init__(self, regions):
        self.regions, self.seen = regions, []

    def detect(self, img):
        self.seen.append(img.size)
        return [dict(r) for r in self.regions]


def region(text, box, block=0):
    x, y, w, h = box
    return {'text': text, 'box': box, 'polygon': [(x, y), (x + w, y), (x + w, y + h), (x, y + h)], 'angle': 0.0, 'block': block, 'conf': 90.0}


# ------------------------------------------------------------------ intake / metadata

def test_upload_metadata_is_stripped_and_rotation_applied():
    raw = jpeg_with_exif(orientation=6)
    assert intake.metadata_keys(raw), 'the fixture must really carry metadata'
    clean = intake.load_clean(raw)
    assert clean.size == (200, 320)             # orientation 6 = rotate: the tag is applied, then dropped
    assert clean.getexif() == {} and not clean.info
    for encoded in (intake.encode_jpeg(clean), intake.encode_png(clean)):
        assert intake.metadata_keys(encoded) == []
        assert b'TestCam' not in encoded and b'private note' not in encoded


def test_intake_limits():
    with pytest.raises(intake.IntakeError) as e:
        intake.load_clean(b'GIF89a' + b'\x00' * 64)
    assert e.value.status == 415
    with pytest.raises(intake.IntakeError) as e:
        intake.load_clean(b'\xff\xd8\xff' + b'\x00' * (intake.MAX_BYTES + 1))
    assert e.value.status == 413
    with pytest.raises(intake.IntakeError):
        intake.load_clean(b'\xff\xd8\xff not really a jpeg')
    with pytest.raises(intake.IntakeError):
        intake.load_clean(b'')
    big = io.BytesIO(); Image.new('RGB', (4200, 300), 'white').save(big, 'PNG')
    assert max(intake.load_clean(big.getvalue()).size) == intake.MAX_SIDE


# ------------------------------------------------------------------ Hebrew helpers, word list, sacred-name guard

def test_word_list_matches_the_shared_cases_and_the_app_copy():
    shared = ROOT / 'data/camera/sign-glossary.json'
    mine = HERE.parent / 'camera_translate/sign-glossary.json'
    assert shared.read_bytes() == mine.read_bytes(), 'run: cp data/camera/sign-glossary.json tools/camera-translate/camera_translate/'
    g = Glossary.load()
    for case in json.loads((ROOT / 'data/camera/glossary-cases.json').read_text(encoding='utf-8'))['cases']:
        r = g.translate(case['he'])
        assert (r['en'], r['status']) == (case['en'], case['status']), case
    assert g.translate('חנות אופטיקה')['translit'] == 'chanut optika'
    assert tokens('קפה 12.50!') == ['קפה', '12.50']


def test_sacred_name_guard():
    assert contains_sacred_name('ברוך ' + NAME_SKELETON)
    assert contains_sacred_name('ל' + NAME_SKELETON)                       # with a prefix letter
    assert contains_sacred_name('שם־' + NAME_SKELETON)                # after a maqaf
    assert not contains_sacred_name('יהודה') and not contains_sacred_name('חנות אופטיקה')
    assert has_latin_name('Blessed is Jehovah') and has_latin_name('YHWH') and not has_latin_name('the Lord our God')
    assert strip_marks('שָׁלוֹם') == 'שלום'


def test_region_with_the_name_is_left_untouched_and_never_returned(tmp_path):
    img = Image.new('RGB', (600, 300), (250, 246, 232))
    buf = io.BytesIO(); img.save(buf, 'PNG')
    sent = []

    class Spy(GlossaryTranslator):
        def translate(self, lines):
            sent.extend(lines)
            return super().translate(lines)

    ocr = FakeOCR([region('ברוך ' + NAME_SKELETON, (100, 40, 400, 60)), region('יציאה', (200, 180, 200, 60), 1)])
    res = translate_photo(buf.getvalue(), ocr, ChainTranslator([Spy()]))
    held, normal = res['regions']
    assert held['held'] and held['he'] is None and held['en'] is None and held['drawn'] is False
    assert normal['en'] == 'Exit' and normal['drawn']
    assert all(NAME_SKELETON not in s for s in sent), 'the name must never be sent to a translator'
    assert NAME_SKELETON not in json.dumps(res['regions'], ensure_ascii=False)
    out = np.array(Image.open(io.BytesIO(res['image_jpeg'])))
    assert np.abs(out[40:100, 100:500].astype(int) - 239).max() < 30      # that band is still plain background: nothing was drawn there


def test_english_spelling_of_the_name_is_blocked():
    class Bad:
        name = 'bad'
        def translate(self, lines):
            return [{'en': 'Yahweh is good', 'source': 'machine', 'translit': None, 'pointed': None} for _ in lines]
    img = io.BytesIO(); Image.new('RGB', (400, 200), 'white').save(img, 'PNG')
    res = translate_photo(img.getvalue(), FakeOCR([region('טוב מאוד', (50, 50, 300, 60))]), Bad())
    r = res['regions'][0]
    assert r['held'] and r['en'] is None and not r['drawn']


# ------------------------------------------------------------------ OCR adapters

def test_reading_order_is_right_to_left_with_numbers_left_to_right():
    words = [{'text': 'קפה', 'x': 300, 'y': 10, 'w': 80, 'h': 40, 'conf': 90}, {'text': '12', 'x': 200, 'y': 12, 'w': 40, 'h': 38, 'conf': 90},
             {'text': 'תה', 'x': 320, 'y': 80, 'w': 60, 'h': 40, 'conf': 80}]
    regs = lines_to_regions(order_words(words))
    assert [r['text'] for r in regs] == ['קפה 12', 'תה']
    assert regs[0]['box'] == (200, 10, 180, 40)


def test_tesseract_tsv_parser():
    head = 'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n'
    tsv = head + '4\t1\t1\t1\t1\t0\t0\t0\t10\t10\t-1\t\n5\t1\t1\t1\t1\t1\t100\t20\t60\t30\t91.5\tיציאה\n'
    assert parse_tsv(tsv, scale=2.0) == [{'text': 'יציאה', 'x': 50.0, 'y': 10.0, 'w': 30.0, 'h': 15.0, 'conf': 91.5, 'block': 1}]


def test_tilted_text_is_levelled_and_untilted_text_is_left_alone():
    import cv2
    from make_signs import render, DARK, CREAM
    flat = render(['מנה ראשונה', 'קינוחים'], 'alef-bold', 70, DARK, CREAM, 'center')
    h, w = flat.shape[:2]
    tilted = cv2.warpAffine(flat, cv2.getRotationMatrix2D((w / 2, h / 2), 5, 1.0), (w, h), borderMode=cv2.BORDER_REPLICATE)
    to_binary = lambda a: cv2.threshold(cv2.cvtColor(a, cv2.COLOR_BGR2GRAY), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
    assert estimate_skew(to_binary(flat)) == 0.0
    assert abs(estimate_skew(to_binary(tilted)) + 5) <= 0.5          # the levelling turn is the opposite of the tilt
    assert estimate_skew(np.full((200, 300), 255, np.uint8)) == 0.0   # a blank page has no tilt
    _, _, back_flat = prepare_for_tesseract(Image.fromarray(cv2.cvtColor(flat, cv2.COLOR_BGR2RGB)))
    _, _, back_tilt = prepare_for_tesseract(Image.fromarray(cv2.cvtColor(tilted, cv2.COLOR_BGR2RGB)))
    assert back_flat is None and back_tilt is not None and back_tilt.shape == (2, 3)


@pytest.mark.skipif(not TesseractOCR().available(), reason='Tesseract with the heb model is not installed')
def test_tilted_sign_is_read_and_its_line_keeps_the_tilt_for_drawing():
    regs = TesseractOCR().detect(Image.open(SIGNS / 'caution-stairs.jpg'))    # the stored sign is tilted by 4 degrees
    assert [r['text'] for r in regs] == ['זהירות', 'מדרגות']
    assert all(3 <= abs(r['angle']) <= 5 for r in regs)
    img = Image.open(SIGNS / 'caution-stairs.jpg')
    for r in regs:
        x, y, w, h = r['box']
        assert 0 <= x and 0 <= y and x + w <= img.width and y + h <= img.height


def test_vision_request_uses_document_text_detection_with_hebrew_hint_and_parses_lines():
    vision = pytest.importorskip('google.cloud.vision')

    def word(text, x0, y0, x1, y1, brk=None):
        syms = [vision.Symbol(text=c) for c in text]
        if brk:
            syms[-1].property = vision.TextAnnotation.TextProperty(
                detected_break=vision.TextAnnotation.DetectedBreak(type_=getattr(vision.TextAnnotation.DetectedBreak.BreakType, brk)))
        box = vision.BoundingPoly(vertices=[vision.Vertex(x=x0, y=y0), vision.Vertex(x=x1, y=y0), vision.Vertex(x=x1, y=y1), vision.Vertex(x=x0, y=y1)])
        return vision.Word(symbols=syms, bounding_box=box, confidence=0.97)

    para = vision.Paragraph(words=[word('חנות', 300, 40, 420, 90, 'SPACE'), word('אופטיקה', 100, 40, 280, 90, 'LINE_BREAK'),
                                   word('פתוח', 250, 120, 420, 170, 'EOL_SURE_SPACE')])
    annotation = vision.TextAnnotation(pages=[vision.Page(blocks=[vision.Block(paragraphs=[para])])])
    regs = regions_from_vision(annotation)
    assert [r['text'] for r in regs] == ['חנות אופטיקה', 'פתוח']
    assert regs[0]['box'] == (100, 40, 320, 50) and regs[0]['conf'] == 97.0

    calls = {}

    class FakeClient:
        def document_text_detection(self, image, image_context):
            calls['image'], calls['context'] = image, image_context
            return vision.AnnotateImageResponse(full_text_annotation=annotation)

    out = GoogleVisionOCR(client=FakeClient()).detect(Image.new('RGB', (500, 200), 'white'))
    assert [r['text'] for r in out] == ['חנות אופטיקה', 'פתוח']
    assert list(calls['context'].language_hints) == ['he']
    assert intake.metadata_keys(calls['image'].content) == []     # what would go to the cloud carries no metadata

    class Broken:
        def document_text_detection(self, **_):
            raise RuntimeError('quota')
    with pytest.raises(OCRError):
        GoogleVisionOCR(client=Broken()).detect(Image.new('RGB', (100, 100)))


def test_cloud_translator_adapter_and_fallback_chain():
    class FakeClient:
        def __init__(self): self.calls = []
        def translate(self, values, source_language, target_language, format_):
            self.calls.append((values, source_language, target_language, format_))
            return [{'translatedText': 'Book &amp; Gift Shop', 'input': v} for v in values]
    fake = FakeClient()
    out = GoogleTranslator(client=fake).translate(['חֲנוּת ספרים', ''])
    assert fake.calls == [(['חנות ספרים'], 'he', 'en', 'text')]
    assert out[0] == {'en': 'Book & Gift Shop', 'source': 'machine', 'translit': None, 'pointed': None} and out[1]['en'] is None

    class Down:
        name = 'down'
        def translate(self, lines): raise TranslateError('cloud translation failed')
    chain = ChainTranslator([Down(), GlossaryTranslator()])
    got = chain.translate(['יציאה', 'חנות ספרים'])
    assert got[0]['en'] == 'Exit' and got[0]['source'] == 'word-list' and got[1]['en'] is None and chain.errors


# ------------------------------------------------------------------ overlay

def test_text_fits_its_box_and_long_text_wraps():
    one = overlay.fit_text('Exit', 300, 80)
    assert one['fits'] and len(one['lines']) == 1
    w, h = overlay._measure(one['lines'], one['size'])
    assert w <= 300 and h <= 80 * 1.3
    long_ = overlay.fit_text('Ben Yehuda Boulevard Pedestrian Mall', 260, 200)
    assert long_['fits'] and len(long_['lines']) >= 2
    assert overlay._measure(long_['lines'], long_['size'])[0] <= 260
    assert overlay.fit_text('Ben Yehuda Boulevard', 30, 10)['fits'] is False


def test_overlay_erases_hebrew_draws_english_and_aligns_menus_left():
    from make_signs import render, DARK, CREAM
    import cv2
    a = cv2.cvtColor(render(['מנה ראשונה', 'מרק'], 'alef', 64, DARK, CREAM, 'right'), cv2.COLOR_BGR2RGB)
    img = Image.fromarray(a)
    ys = np.where((a.sum(axis=2) < 300).any(axis=1))[0]; xs = np.where((a.sum(axis=2) < 300).any(axis=0))[0]
    mid = (ys[0] + ys[-1]) // 2
    rows1 = ys[ys < mid]; rows2 = ys[ys >= mid]
    def tight(rows):
        cols = np.where((a[rows[0]:rows[-1] + 1].sum(axis=2) < 300).any(axis=0))[0]
        return (int(cols[0]), int(rows[0]), int(cols[-1] - cols[0] + 1), int(rows[-1] - rows[0] + 1))
    regs = [{'box': tight(rows1), 'en': 'Starter', 'block': 0, 'angle': 0}, {'box': tight(rows2), 'en': 'Soup', 'block': 0, 'angle': 0},
            {'box': (5, 5, 20, 10), 'en': None, 'block': 1, 'angle': 0}]
    out = np.array(overlay.render_overlay(img, regs))
    assert regs[0]['drawn'] and regs[1]['drawn'] and regs[2]['drawn'] is False
    assert regs[0]['align'] == regs[1]['align'] == 'left'            # Hebrew was flush right, so English is flush left
    assert regs[0]['erase'] in ('fill', 'inpaint')
    dark_before = (a.sum(axis=2) < 300); dark_after = (out.sum(axis=2) < 300)
    left_edge = min(regs[0]['box'][0], regs[1]['box'][0])
    first_dark_col = np.where(dark_after.any(axis=0))[0][0]
    assert abs(first_dark_col - left_edge) <= 12                      # English starts at the block's left edge
    assert dark_after.sum() > 0 and (dark_before != dark_after).mean() > 0.005
    assert overlay.contrast_ratio((255, 255, 255), (20, 70, 150)) > 4.5


# ------------------------------------------------------------------ the HTTP service

@pytest.fixture()
def client():
    pytest.importorskip('fastapi')
    from fastapi.testclient import TestClient
    from camera_translate.app import create_app
    ocr = FakeOCR([region('חנות אופטיקה', (40, 60, 240, 60))])
    app = create_app(ocr=ocr, translator=ChainTranslator([GlossaryTranslator()]), allowed_origins=['https://alef.example'], rate_per_min=3)
    return TestClient(app), ocr


def test_service_translates_returns_clean_image_and_stores_nothing(client, tmp_path, monkeypatch):
    c, ocr = client
    monkeypatch.setattr(tempfile, 'tempdir', str(tmp_path / 'tmp')); (tmp_path / 'tmp').mkdir()
    work = tmp_path / 'cwd'; work.mkdir(); monkeypatch.chdir(work)
    r = c.post('/translate-image', content=jpeg_with_exif(), headers={'content-type': 'image/jpeg', 'origin': 'https://alef.example'})
    assert r.status_code == 200, r.text
    assert r.headers['cache-control'] == 'no-store' and r.headers['access-control-allow-origin'] == 'https://alef.example'
    body = r.json()
    assert body['storesPhotos'] is False and (body['width'], body['height']) == (320, 200)
    reg = body['regions'][0]
    assert reg['he'] == 'חנות אופטיקה' and reg['en'] == 'Optical Store' and reg['translationSource'] == 'word-list' and reg['drawn']
    assert reg['translit'] == 'chanut optika' and reg['box'] == {'x': 40.0, 'y': 60.0, 'w': 240.0, 'h': 60.0}
    assert body['image'].startswith('data:image/jpeg;base64,')
    returned = base64.b64decode(body['image'].split(',', 1)[1])
    assert intake.metadata_keys(returned) == [] and b'TestCam' not in returned
    assert Image.open(io.BytesIO(returned)).size == (320, 200)
    assert list((tmp_path / 'tmp').iterdir()) == [] and list(work.iterdir()) == [], 'no file may be written while handling a photo'
    assert c.get('/health').json()['storesPhotos'] is False


def test_service_rejects_bad_uploads_other_origins_and_floods(client):
    c, _ = client
    assert c.post('/translate-image', content=b'hello', headers={'content-type': 'text/plain'}).status_code == 415
    assert c.post('/translate-image', content=b'', headers={'content-type': 'image/jpeg'}).status_code == 400
    r = c.post('/translate-image', content=jpeg_with_exif(), headers={'origin': 'https://elsewhere.example'})
    assert 'access-control-allow-origin' not in r.headers
    r = c.options('/translate-image', headers={'origin': 'http://127.0.0.1:8080', 'access-control-request-method': 'POST'})
    assert r.headers.get('access-control-allow-origin') == 'http://127.0.0.1:8080'
    codes = [c.post('/translate-image', content=jpeg_with_exif()).status_code for _ in range(4)]
    assert 429 in codes


def test_service_refuses_oversized_bodies():
    pytest.importorskip('fastapi')
    from fastapi.testclient import TestClient
    from camera_translate.app import create_app
    c = TestClient(create_app(ocr=FakeOCR([]), translator=ChainTranslator([GlossaryTranslator()]), allowed_origins=[]))
    r = c.post('/translate-image', content=b'\xff\xd8\xff' + b'0' * (intake.MAX_BYTES + 10))
    assert r.status_code == 413


# ------------------------------------------------------------------ the 20 synthetic signs

def test_twenty_synthetic_signs_exist_and_are_labelled_synthetic():
    gt = json.loads((SIGNS / 'ground-truth.json').read_text(encoding='utf-8'))
    assert gt['synthetic'] is True and gt['count'] == len(gt['items']) == 20
    for it in gt['items']:
        data = (SIGNS / it['file']).read_bytes()
        assert intake.metadata_keys(data) == [] and it['lines'] and all(l['he'] and l['en'] for l in it['lines'])
        assert not contains_sacred_name(' '.join(l['he'] for l in it['lines']))


@pytest.mark.skipif(not TesseractOCR().available(), reason='Tesseract with the heb model is not installed')
def test_on_server_reader_and_word_list_on_the_synthetic_signs():
    """Regression floor only (measured 2026-11-10: pooled CER 0.029, 24 of 28 lines translated end to end). Synthetic images, not photos."""
    import subprocess, sys
    r = subprocess.run([sys.executable, str(HERE.parent / 'eval.py')], capture_output=True, text=True, timeout=600)
    assert r.returncode == 0, r.stderr[-800:]
    s = json.loads((SIGNS / 'results-tesseract-word-list.json').read_text(encoding='utf-8'))['summary']
    assert s['images'] == 20 and s['lines'] == 28
    assert s['cerPooled'] <= 0.06, s
    assert s['linesTranslatedEndToEnd'] >= 22, s
    assert s['linesTranslatedGivenCorrectText'] == 26, s       # the two signs outside the word list stay untranslated on purpose
