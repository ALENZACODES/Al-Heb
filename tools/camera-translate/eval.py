#!/usr/bin/env python3
"""Measure the camera translator on the 20 SYNTHETIC sign images (tests/signs). Not photographs.

Usage (from tools/camera-translate):
  python3 eval.py                                  on-server reader (Tesseract heb) + built-in word list
  python3 eval.py --ocr vision --translate google  Cloud Vision + Cloud Translation (needs GOOGLE_APPLICATION_CREDENTIALS; sends the test images to Google)
Writes tests/signs/results-<ocr>-<translate>.json and prints a summary.

Scores
  OCR CER        character error rate = edit distance / reference length, on letters and digits only (vowel points, spaces and
                 punctuation removed), per image and pooled over all images. Lower is better.
  line exact     share of reference lines read with no error at all.
  translation    a line is right when the English drawn equals the expected English, ignoring case and punctuation.
                 "end to end" uses the text the reader produced; "given correct text" feeds the true Hebrew to the translator.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from camera_translate.hebrew import strip_marks  # noqa: E402
from camera_translate.ocr import GoogleVisionOCR, TesseractOCR  # noqa: E402
from camera_translate.pipeline import translate_photo  # noqa: E402
from camera_translate.translate import ChainTranslator, GlossaryTranslator, GoogleTranslator  # noqa: E402


def norm_he(s: str) -> str:
    return re.sub('[^א-ת0-9]', '', strip_marks(s))


def norm_en(s: str | None) -> str:
    return re.sub('[^a-z0-9]', '', (s or '').lower())


def edit_distance(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ocr', choices=['tesseract', 'vision'], default='tesseract')
    ap.add_argument('--translate', choices=['word-list', 'google'], default='word-list')
    args = ap.parse_args()
    ocr = GoogleVisionOCR() if args.ocr == 'vision' else TesseractOCR()
    words = GlossaryTranslator()
    translator = ChainTranslator([GoogleTranslator(), words]) if args.translate == 'google' else ChainTranslator([words])
    gt = json.loads((HERE / 'tests/signs/ground-truth.json').read_text(encoding='utf-8'))
    rows, tot_edits, tot_ref = [], 0, 0
    lines_total = lines_exact = tr_e2e = tr_oracle = 0
    for it in gt['items']:
        res = translate_photo((HERE / 'tests/signs' / it['file']).read_bytes(), ocr, translator)
        got = [r for r in res['regions']]
        ref_text = ''.join(norm_he(l['he']) for l in it['lines'])
        hyp_text = ''.join(norm_he(r['he'] or '') for r in got)
        edits = edit_distance(hyp_text, ref_text)
        tot_edits += edits; tot_ref += len(ref_text)
        hyp_lines = {norm_he(r['he'] or '') for r in got}
        hyp_en = {norm_en(r['en']) for r in got if r['en']}
        oracle = translator.translate([l['he'] for l in it['lines']])
        line_rows = []
        for l, o in zip(it['lines'], oracle):
            read_ok = norm_he(l['he']) in hyp_lines
            e2e_ok = norm_en(l['en']) in hyp_en
            oracle_ok = norm_en(o['en']) == norm_en(l['en'])
            lines_total += 1; lines_exact += read_ok; tr_e2e += e2e_ok; tr_oracle += oracle_ok
            line_rows.append({'he': l['he'], 'expected': l['en'], 'readExactly': read_ok, 'translatedEndToEnd': e2e_ok,
                              'translatedGivenCorrectText': oracle_ok, 'translationGivenCorrectText': o['en']})
        rows.append({'id': it['id'], 'variant': it['variant'], 'cer': round(edits / max(1, len(ref_text)), 4),
                     'read': [r['he'] for r in got], 'english': [r['en'] for r in got], 'lines': line_rows})
    summary = {
        'synthetic': True, 'note': gt['note'], 'images': len(rows), 'lines': lines_total,
        'ocr': ocr.name, 'translate': translator.name,
        'cerPooled': round(tot_edits / max(1, tot_ref), 4), 'cerMeanPerImage': round(sum(r['cer'] for r in rows) / len(rows), 4),
        'imagesReadPerfectly': sum(r['cer'] == 0 for r in rows), 'linesReadExactly': lines_exact,
        'linesTranslatedEndToEnd': tr_e2e, 'linesTranslatedGivenCorrectText': tr_oracle,
    }
    out = HERE / f'tests/signs/results-{args.ocr}-{args.translate}.json'
    out.write_text(json.dumps({'summary': summary, 'rows': rows}, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps(summary, ensure_ascii=False, indent=1))
    for r in rows:
        if r['cer']:
            print(f"  {r['id']:22s} CER {r['cer']:.2f}  read: {r['read']}")


if __name__ == '__main__':
    main()
