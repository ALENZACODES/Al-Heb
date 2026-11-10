"""One list, one row per sentence/prayer clip, with what both reviewers say about the audio that is in the repo now.

Reviewer 1: the Hebrew word model (scan_lines.py / fix_lines.py / the cross-checks). Reviewer 2: the sound model
(phoneme_review.py). A row is matched to a review only when the review heard the same audio (sha256).
Writes docs/audio/REVIEW-STATUS.md.
"""
import glob, hashlib, json, os, re, sys
HERE = os.path.dirname(__file__); sys.path.insert(0, HERE)
import scan_lines as S
ROOT = S.ROOT
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()

snd = {}
for l in open(os.path.join(HERE, 'phoneme-review.jsonl'), encoding='utf-8'):
    r = json.loads(l); snd[(r['file'], r['sha'])] = r
# word-model results on audio as it is now: newest wins, keyed by the clip; trusted only if the clip has not changed since
word = {}
for l in open(S.RES, encoding='utf-8'):
    r = json.loads(l); word[r['file']] = [i['say'] for i in S.compare(r['say'], r['heard'])[1]]
for name, key in (('lines-fix-log.jsonl', None), ('word-pick-crosscheck.jsonl', 'issues')):
    p = os.path.join(HERE, name)
    if not os.path.exists(p):
        continue
    for l in open(p, encoding='utf-8'):
        r = json.loads(l)
        if key:
            word[r['file']] = [i['say'] for i in r[key]]
        elif r['decision'] == 'joined':
            word[r['file']] = [i['say'] for i in r['after']]
rows = []
for f in sorted({k[0] for k in snd}):
    p = os.path.join(ROOT, f)
    if not os.path.exists(p):
        continue
    s = snd.get((f, sha(p)))
    mp = p + '.meta.json'
    src = json.load(open(mp, encoding='utf-8')).get('copiedFrom') if os.path.exists(mp) else None
    w = word.get(src or f)
    weak = [x['word'] for x in s['weak']] if s else None
    if s is None:
        status = 'not reviewed by sound (audio changed after the review)'
    elif not weak and not w:
        status = 'clean (both)'
    elif weak and w and set(S.PUNCT.sub('', x) for x in weak) & set(S.PUNCT.sub('', y) for y in ' '.join(w).split()):
        status = 'both flag the same word: re-record'
    elif weak and w:
        status = 'both flag it, on different words: listen'
    else:
        status = 'one reviewer flags it: listen'
    rows.append((f, status, s['ratio'] if s else None, weak or [], w or []))
order = {'both flag the same word: re-record': 0, 'both flag it, on different words: listen': 1, 'one reviewer flags it: listen': 2}
rows.sort(key=lambda r: (order.get(r[1], 3), r[2] or 0))
from collections import Counter
c = Counter(r[1] for r in rows)
L = ['# Sentence and prayer audio: review status', '',
     'Every sentence and prayer clip was checked by two different machine reviewers: a Hebrew word model (what words it hears) '
     'and a sound model (what sounds it hears, no word guessing). This list is about the audio in the repo now. '
     'Machine reviewers can be wrong both ways; a teacher or cantor should still listen to the rows at the top.', '',
     '| status | clips |', '|---|---|'] + [f'| {k} | {v} |' for k, v in c.most_common()] + ['',
     '| clip | status | sounds matched | weak by sound | wrong by word model |', '|---|---|---|---|---|']
for f, st, ratio, weak, w in rows:
    L.append(f'| `{f}` | {st} | {"" if ratio is None else f"{ratio:.0%}"} | {" ".join(weak)} | {" ".join(w)} |')
open(os.path.join(ROOT, 'docs', 'audio', 'REVIEW-STATUS.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print(dict(c))
