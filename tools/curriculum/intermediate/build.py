import os, tempfile
import sys, json, re, subprocess, unicodedata, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sources
from syn import SYN
from isr import ISR
from syn2 import SYN2
from isr2 import ISR2

ROOT = sources.ROOT
OUT = f'{ROOT}/data/curriculum/lessons-intermediate'
toks, phrases, words = sources.load()

# ---- source lookup for whole strings
registry = json.load(open(f'{ROOT}/data/corpus/registry.json'))['entries']
phrasebook = json.load(open(f'{ROOT}/data/corpus/phrasebook.json'))['entries']
reg_by_id = {e['id']: e for e in registry}
by_key = {}
for w in words:
    by_key.setdefault(sources.phrase_key(w['he']), []).append(('data/vocab/words.json', w['id']))
    for k, v in (w.get('forms') or {}).items():
        if isinstance(v, str): by_key.setdefault(sources.phrase_key(v), []).append(('data/vocab/words.json', w['id'] + '#forms.' + k))
for e in phrasebook:
    by_key.setdefault(sources.phrase_key(e['he']), []).append(('data/corpus/phrasebook.json', e['id']))
for e in registry:
    for i, line in enumerate(e['he'].split('\n'), 1):
        by_key.setdefault(sources.phrase_key(line), []).append(('data/corpus/registry.json', e['id'] + ('' if e['lines'] == 1 else f'#l{i}')))

MISSES = []
def source_of(he):
    k = sources.phrase_key(he)
    if k in by_key:
        f, i = by_key[k][0]
        return {"file": f, "id": i}
    miss = [t for t in sources.tokens(he) if t not in toks]
    if miss: MISSES.append((miss, he)); return {"file": "composed", "tokens": sources.tokens(he)}
    return {"file": "composed", "tokens": sources.tokens(he)}

# ---- transliteration via the project's own transliterator
def translits(strings):
    js = """
import { transliterate } from "%s/src/pronunciation/transliterate.js";
const xs = JSON.parse(await (async()=>{let s='';for await (const c of process.stdin) s+=c; return s;})());
const out = xs.map((s) => ({israeli: transliterate(s,{scheme:'siddur',tradition:'israeli'}), sephardi: transliterate(s,{scheme:'siddur',tradition:'sephardi'}), ashkenazi: transliterate(s,{scheme:'siddur',tradition:'ashkenazi'})}));
process.stdout.write(JSON.stringify(out));
""" % ROOT
    TRP = os.path.join(tempfile.gettempdir(), 'alef-intermediate-tr.mjs')
    open(TRP, 'w').write(js)
    r = subprocess.run(['node', TRP], input=json.dumps(strings), capture_output=True, text=True, check=True)
    return json.loads(r.stdout)

HEB = re.compile(r'[א-ת]')
def he_strings(ex):
    out = []
    def walk(o):
        if isinstance(o, str):
            if HEB.search(o): out.append(o)
        elif isinstance(o, dict):
            for k, v in o.items():
                if k in ('line',): continue
                walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    walk(ex)
    return out

# auto-fill: recall / produce from words not yet used, until 14
def autofill(les):
    used = set(sources.phrase_key(s) for ex in les['exercises'] for s in he_strings(ex))
    pool = [w for w in les['words'] if sources.phrase_key(w['he']) not in used]
    i = 0
    while len(les['exercises']) < 14 and pool:
        w = pool.pop(0)
        if i % 2 == 0:
            les['exercises'].append({"type": "recall", "he": w['he'], "en": w['en']})
        else:
            others = [x['he'] for x in les['words'] if x['he'] != w['he']][:2]
            if len(others) < 2: continue
            les['exercises'].append({"type": "produce", "en": w['en'], "options": [w['he'], *others], "answer": 0})
        i += 1

def finish(les):
    autofill(les)
    assert 12 <= len(les['exercises']) <= 20, (les['id'], len(les['exercises']))
    for p in les['prayerLines']:
        assert p in reg_by_id, (les['id'], p)
    hes = [w['he'] for w in les['words']]
    tr = translits(hes)
    for w, t in zip(les['words'], tr):
        w['translit'] = None
        w['pronunciation'] = t if les['unit'] == 'synagogue' else {"israeli": t['israeli']}
        w['source'] = source_of(w['he'])
    for n, ex in enumerate(les['exercises'], 1):
        ex_id = f"{les['id']}-e{n:02d}"
        ex = {"id": ex_id, **ex}
        for s in he_strings(ex): source_of(s)  # validates
        if ex['type'] in ('fade', 'spot'):
            e = reg_by_id[ex['line']]
            lines = e['he'].split('\n')
            li = ex.get('lineIndex', 1)
            if not 1 <= li <= len(lines): MISSES.append(([li], f'{ex_id} bad lineIndex')); continue
            if ex['type'] == 'spot':
                if ex['target'] not in sources.tokens(lines[li - 1]): MISSES.append(([ex['target']], f'{ex_id} spot target not in {ex["line"]} line {li}'))
        if ex['type'] == 'order':
            if len(sources.tokens(ex['he'])) < 3: MISSES.append(([], f'{ex_id} order needs 3+ tokens: {ex["he"]}'))
        les['exercises'][n - 1] = ex
    out = {
        "id": les['id'], "track": les['track'], "level": les['level'], "unit": les['unit'], "title": les['title'],
        "status": "draft", "proofread": False, "needsNativeReview": True,
        "letters": [], "vowels": [],
        "words": les['words'], "prayerLines": les['prayerLines'], "goals": les['goals'],
        "estMinutes": les['estMinutes'], "prerequisites": les['prerequisites'],
        "pronunciation": ({"traditions": ["israeli", "sephardi", "ashkenazi"], "scheme": "siddur",
                           "generatedBy": "src/pronunciation/transliterate.js", "note": "Latin forms are machine output of the project's transliterator, not a native speaker's; israeli and sephardi are identical in that scheme."}
                          if les['unit'] == 'synagogue' else
                          {"traditions": ["israeli"], "scheme": "siddur", "generatedBy": "src/pronunciation/transliterate.js",
                           "note": "Modern spoken Hebrew: only the Israeli value is given. Latin forms are machine output of the project's transliterator, not a native speaker's."}),
        "exercises": les['exercises'],
    }
    if les.get('note'): out['note'] = les['note']
    return out

os.makedirs(OUT, exist_ok=True)
index = []
all_les = SYN + ISR + SYN2 + ISR2
ids = [l['id'] for l in all_les]
assert len(set(ids)) == 50 and sorted(ids) == [f'I-{i:02d}' for i in range(1, 51)]
all_les = sorted(all_les, key=lambda l: l['id'])
for les in all_les:
    o = finish(les)
    path = f"{OUT}/{o['id']}.json"
    json.dump(o, open(path, 'w'), ensure_ascii=False, indent=1)
    open(path, 'a').write('\n')
    index.append({"id": o['id'], "file": f"lessons-intermediate/{o['id']}.json", "unit": o['unit'], "track": o['track'], "level": o['level'],
                  "title": o['title'], "prerequisites": o['prerequisites'], "estMinutes": o['estMinutes'],
                  "words": len(o['words']), "exercises": len(o['exercises']), "prayerLines": o['prayerLines']})
    print(o['id'], o['unit'], len(o['words']), 'words', len(o['exercises']), 'exercises')

idx = {
    "schema": "alef-intermediate-index/1",
    "version": 1,
    "status": "draft",
    "proofread": False,
    "needsNativeReview": True,
    "note": "Intermediate lessons I-01..I-25, kept out of lessons.json until main registers them (see docs/curriculum/INTERMEDIATE.md). Every Hebrew string is a whole entry of, or a composition of whitespace tokens found in, data/vocab/words.json, data/corpus/*.json or data/service/*.json; tests/curriculum.intermediate.test.js enforces this. Glosses, exercise cues and notes are original English and unreviewed. No audio exists for any item.",
    "sources": ["data/vocab/words.json", "data/corpus/registry.json", "data/corpus/phrasebook.json", "data/corpus/source-snapshot.json", "data/corpus/prayer-meta.json", "data/corpus/torah-service-guide.json", "data/corpus/gaps.json", "data/service/orders.json"],
    "exerciseTypes": {
        "recall": "Show he, learner recalls en (maps to a word: SRS card).",
        "produce": "Show en, pick the Hebrew among options (answer is the index of the correct option).",
        "match": "Match 3 to 5 he/en pairs.",
        "order": "Put the whitespace tokens of he back in order; en is the gloss.",
        "respond": "Call and response: cue (English situation), optional prompt {he,en}, learner says answer {he,en}.",
        "gender": "Man/woman forms m and f of the same line (maps to gender pair cards).",
        "dialogue": "2 to 5 lines {speaker, he, en}; task says which speaker the learner voices.",
        "fade": "Fade-out recall of a registry line (line id; lineIndex for multi-line entries; maps to line: SRS cards).",
        "spot": "Find target (a token of the registry line) in the line.",
        "register": "Pick the register (formal/neutral/casual/slang) of a phrasebook line.",
    },
    "units": {"synagogue": [i for i in index if i['unit'] == 'synagogue'], "israel": [i for i in index if i['unit'] == 'israel']},
    "lessons": index,
}
json.dump(idx, open(f'{ROOT}/data/curriculum/intermediate-index.json', 'w'), ensure_ascii=False, indent=1)
open(f'{ROOT}/data/curriculum/intermediate-index.json', 'a').write('\n')
for m in MISSES: print('MISSING', m[0], '<-', m[1])
print('ok', len(index), 'misses', len(MISSES))
