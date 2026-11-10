#!/usr/bin/env python3
"""he->en evaluation on phrasebook phrases (dev tooling). The phrasebook `en` field is only a ground-truth PROXY:
valid alternative renderings are scored as errors. Run inside a venv that has argostranslate + the he->en package.
Usage: python3 tools/ocr-bench/translate-eval.py [--mymemory] [N=30]
Scores: token F1 (lowercased words) and difflib ratio, each as the best over the ' / ' alternatives in `en`.
"""
import json, re, sys, time, difflib, urllib.request, urllib.parse
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
N = int([a for a in sys.argv[1:] if a.isdigit()][0]) if any(a.isdigit() for a in sys.argv[1:]) else 30
pb = json.load(open(ROOT / 'data/corpus/phrasebook.json'))['entries']
step = max(1, len(pb) // N)
sample = pb[::step][:N]
strip = lambda s: re.sub('[֑-ׇ]', '', s)
tok = lambda s: re.findall(r"[a-z0-9']+", s.lower())
def f1(h, r):
    h, r = tok(h), tok(r)
    if not h or not r: return 0.0
    c = sum(min(h.count(w), r.count(w)) for w in set(h))
    if c == 0: return 0.0
    p, q = c / len(h), c / len(r); return 2 * p * q / (p + q)
def score(h, ref):
    alts = [a.strip() for a in re.split(r'\s*/\s*|;', ref)] + [ref]
    return max(f1(h, a) for a in alts), max(difflib.SequenceMatcher(None, h.lower(), a.lower()).ratio() for a in alts)

engines = {}
import argostranslate.translate as T
def argos(t):
    return T.translate(t, 'he', 'en')
engines['argos-he-en-1.5'] = argos
if '--mymemory' in sys.argv:
    def mm(t):
        time.sleep(1.0)
        u = 'https://api.mymemory.translated.net/get?' + urllib.parse.urlencode({'q': t, 'langpair': 'he|en'})
        return json.loads(urllib.request.urlopen(u, timeout=30).read())['responseData']['translatedText']
    engines['mymemory-free-anon'] = mm

out = {'note': 'phrasebook en field is a proxy ground truth; phrases are project-owned public text', 'n': len(sample), 'engines': {}}
for name, fn in engines.items():
    rows = []; t0 = time.time()
    for e in sample:
        src = strip(e['he']).strip()
        s0 = time.time()
        try: hyp = fn(src)
        except Exception as ex: hyp = f'<error {ex}>'
        sf, sr = score(hyp, e['en'])
        rows.append({'id': e['id'], 'he': src, 'ref': e['en'], 'hyp': hyp, 'f1': round(sf, 3), 'ratio': round(sr, 3), 'ms': round((time.time() - s0) * 1000)})
    out['engines'][name] = {'meanF1': round(sum(r['f1'] for r in rows) / len(rows), 3), 'meanRatio': round(sum(r['ratio'] for r in rows) / len(rows), 3),
                            'share_f1_ge_0.5': round(sum(r['f1'] >= 0.5 for r in rows) / len(rows), 3), 'share_f1_eq_0': round(sum(r['f1'] == 0 for r in rows) / len(rows), 3),
                            'totalSeconds': round(time.time() - t0, 1), 'rows': rows}
    print(name, {k: v for k, v in out['engines'][name].items() if k != 'rows'})
json.dump(out, open(ROOT / 'data/photo/_benchmark/translate-results.json', 'w'), ensure_ascii=False, indent=1)
for r in out['engines']['argos-he-en-1.5']['rows']: print(r['f1'], '|', r['he'], '|', r['ref'], '|', r['hyp'])
