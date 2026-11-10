"""Append I-01..I-50 to data/curriculum/lessons.json (idempotent: replaces any existing I-NN entries)."""
import json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
LJ = os.path.join(ROOT, 'data/curriculum/lessons.json')
d = json.load(open(LJ))
d['lessons'] = [l for l in d['lessons'] if not l['id'].startswith('I-')]
src = os.path.join(ROOT, 'data/curriculum/lessons-intermediate')
for i in range(1, 51):
    l = json.load(open(os.path.join(src, f'I-{i:02d}.json')))
    d['lessons'].append(l)
text = json.dumps(d, ensure_ascii=False, indent=1)
open(LJ, 'w').write(text + '\n')
print('lessons', len(d['lessons']))
