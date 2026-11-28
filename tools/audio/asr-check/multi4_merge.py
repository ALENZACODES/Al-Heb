"""Merge multi4 hearings from several Kaggle runs and score them again from the saved transcripts.

Rescoring, on top of check_lib.score:
  - the expected text drops a trailing "(cut from: ...)" note (some word clips carry it in their source text);
  - a heard ו may be the consonant v (the scorer spells v as ב), so a heard spelling with ו read as ב also counts.

  python multi4_merge.py --out DIR hearings1.jsonl hearings2.jsonl ...
"""
import argparse, collections, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_lib as L
import scan_lines as S
import multi4

NOTE = re.compile(r'\s*\(cut from:.*\)\s*$')
_score = L.score


def clean(want):
    return NOTE.sub('', want)


def score(expected, heard):
    s = _score(clean(expected), heard)
    if s in (None, 'digits'):
        return s
    h = str(heard).replace('וו', 'ב')
    v = _score(clean(expected), re.sub(r'(?<=[א-ת])ו(?=[א-ת])', 'ב', h))  # ו inside a word read as v
    return max(s, v if isinstance(v, float) else 0.0)


L.score = score  # scan_lines.compare scores each word through L.score


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('files', nargs='+')
    ap.add_argument('--queue', default=os.path.join(os.path.dirname(__file__), 'multi4-queue.json'))
    ap.add_argument('--out', required=True)
    ap.add_argument('--models', default='ivrit-turbo,whisper-v3,mms-1b,seamless-v2')
    a = ap.parse_args()
    q = json.load(open(a.queue, encoding='utf-8'))
    want = {o['file']: o for o in q}
    os.makedirs(a.out, exist_ok=True)
    merged = os.path.join(a.out, 'multi4-hearings.jsonl')
    seen = {}
    for fn in a.files:
        for l in open(fn, encoding='utf-8'):
            r = json.loads(l)
            o = want[r['file']]
            if o['kind'] == 'word':
                s = score(o['want'], r['heard'])
                r['score'] = 1.0 if s == 'digits' else (s or 0.0)
                r['ok'] = r['score'] >= L.PASS
            else:
                acc, issues, nw = S.compare(clean(o['want']), r['heard'])
                r.update(acc=round(acc, 3), issues=issues, ok=not issues)
            seen[(r['file'], r['model'])] = r
    with open(merged, 'w', encoding='utf-8') as f:
        for r in seen.values():
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    names = [m for m in a.models.split(',') if any(k[1] == m for k in seen)]
    multi4.report(q, merged, names, a.out)


if __name__ == '__main__':
    main()
