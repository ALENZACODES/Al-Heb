#!/usr/bin/env python3
"""Rebuild `realNeighbours` in data/camera/sign-glossary.json (and the service copy).

A reader that misreads one letter can turn a sign word into something one letter away from a listed word, and the
translator accepts that as a "closest match". But some real Hebrew words are also one letter away from a listed word
(for example the word for "where" and the city Haifa). Those must never be "corrected". This script lists every word
from the app's own dictionary (data/vocab/index.json) and phrasebook (data/corpus/phrasebook.json) that is not in the sign
list yet sits one letter (changed, added or removed), or two look-alike letters, from a listed word.

Run from the repo root after editing the sign list:  python3 tools/camera-translate/build_real_neighbours.py
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from camera_translate.hebrew import tokens, two_look_alikes  # noqa: E402


def one_apart(a, b):
    if a == b or abs(len(a) - len(b)) > 1:
        return False
    if len(a) == len(b):
        return sum(x != y for x, y in zip(a, b)) == 1
    s, l = (a, b) if len(a) < len(b) else (b, a)
    return any(l[:i] + l[i + 1:] == s for i in range(len(l)))


def main():
    path = ROOT / 'data/camera/sign-glossary.json'
    g = json.loads(path.read_text(encoding='utf-8'))
    vocab = sorted({t for e in g['entries'] for t in tokens(e['he'])})
    idx = json.loads((ROOT / 'data/vocab/index.json').read_text(encoding='utf-8'))
    key = idx['fields'].index('heUnpointed')
    real = {r[key].strip() for r in idx['rows'] if r[key] and ' ' not in r[key].strip()}
    for e in json.loads((ROOT / 'data/corpus/phrasebook.json').read_text(encoding='utf-8'))['entries']:
        real.update(tokens(e['he']))
    real = {w for w in real if len(w) >= 4 and re.fullmatch('[א-ת]+', w)} - set(vocab)
    out = sorted(w for w in real if any(len(v) >= 3 and (one_apart(w, v) or two_look_alikes(w, v)) for v in vocab))
    g['realNeighbours'] = out
    text = json.dumps(g, ensure_ascii=False, indent=1)
    path.write_text(text, encoding='utf-8')
    (ROOT / 'tools/camera-translate/camera_translate/sign-glossary.json').write_text(text, encoding='utf-8')
    print(f'{len(out)} real words sit one letter from a listed word; written to realNeighbours')


if __name__ == '__main__':
    main()
