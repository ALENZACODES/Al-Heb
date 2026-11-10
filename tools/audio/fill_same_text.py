"""Give a clip to every Israeli word that has none, when another word with the SAME pointed Hebrew already has a good clip.

  python tools/audio/fill_same_text.py            # dry run: what it would copy, and what still needs recording
  python tools/audio/fill_same_text.py --execute  # copy the files and update the manifests

Covers:
  - word rows already in data/audio/manifest-kind-word.json and data/audio/manifest-words-israeli.json with status "missing"
    (vocabulary screens, word themes, Listen, review)
  - screen words that had no manifest row at all, so their buttons fell back to the phone's own voice:
      Sound Gap pairs     word/soundgap-<gap>-<n>-a|b   (data/pronunciation/soundgap.json)
      Vowel Board         word/plene-<family>-defective|plene (data/pronunciation/plene.json)
      Niqqud Dial         word/dial-<id>                 (data/pronunciation/dial-words.json)
      Tug of War          word/tug-<key>-1|2             (src/games/tugowar.bank.js, when the bank gives no audio id)
    and Dot Tile syllable/dot-<pair>-0|1, which play the letter sound clips (letter/bet-sound, letter/vet-sound, ...).
Same text means the same pointed spelling after dropping cantillation marks, meteg and sof pasuq. A source clip on the
needs-a-human list (still failing the speech-to-text check) is never copied. Each copy keeps the source's status and source and records
"copyOf": "<kind>/<id>". A screen word with no match gets a "missing" row and is listed in docs/audio/screen-words-to-record.txt
for tools/audio/render_tts.mjs --ids.
"""
import argparse
import json
import os
import re
import shutil
import unicodedata

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CORE = 'data/audio/manifest.json'
KINDWORD = 'data/audio/manifest-kind-word.json'
SHARD = 'data/audio/manifest-words-israeli.json'
TODO = 'docs/audio/screen-words-to-record.txt'
VOICES = ['m', 'f']
GROUP = 'screen-word'


def rp(rel):
    return os.path.join(ROOT, rel)


def load(rel):
    with open(rp(rel), encoding='utf8') as f:
        return json.load(f)


def save(rel, rows):
    # same layout as tools/audio/manifest_io.mjs manifestText: one row per line
    with open(rp(rel), 'w', encoding='utf8') as f:
        f.write('[\n' + ',\n'.join(json.dumps(r, ensure_ascii=False, separators=(',', ':')) for r in rows) + '\n]\n')


def detect_style(rel):
    with open(rp(rel), encoding='utf8') as f:
        f.readline()
        return f.readline()


def save_like(rel, rows):
    line = detect_style(rel)
    seps = (', ', ': ') if '", "' in line or '": ' in line else (',', ':')
    with open(rp(rel), 'w', encoding='utf8') as f:
        f.write('[\n' + ',\n'.join(json.dumps(r, ensure_ascii=False, separators=seps) for r in rows) + '\n]\n')


def norm(text):
    t = unicodedata.normalize('NFC', str(text or ''))
    t = re.sub('[֑-ֽ֯׃׀]', '', t)  # cantillation, meteg, sof pasuq, paseq
    t = t.replace('־', '-').strip(' .,;:!?׃"\'')
    return t


def bad_files():
    """Clips still failing the speech-to-text check (docs/audio/ASR-NEEDS-HUMAN.md), and every file with the same bytes.
    (docs/audio/asr-redo-israeli.txt is the list from BEFORE fix.py/retry.py re-recorded them, so it is not used.)"""
    import hashlib
    rel = 'docs/audio/ASR-NEEDS-HUMAN.md'
    listed = set(re.findall(r'audio/[mf]/israeli/word/[\w.-]+\.mp3', open(rp(rel), encoding='utf8').read())) if os.path.exists(rp(rel)) else set()
    md5 = lambda f: hashlib.md5(open(rp(f), 'rb').read()).hexdigest()
    sums = {md5(f) for f in listed if os.path.exists(rp(f))}
    out = set(listed)
    for v in ('m', 'f'):
        d = rp(f'audio/{v}/israeli/word')
        for name in os.listdir(d):
            if name.endswith('.mp3') and os.path.getsize(os.path.join(d, name)) and md5(f'audio/{v}/israeli/word/{name}') in sums:
                out.add(f'audio/{v}/israeli/word/{name}')
    return out


def screen_words():
    """(id, pointed text, english) the screens ask for with no manifest row of their own."""
    out = []
    sg = load('data/pronunciation/soundgap.json')
    for g in sg['gaps']:
        for i, p in enumerate(g.get('pairs', [])):
            for side in ('a', 'b'):
                w = p.get(side) or {}
                if w.get('he'):
                    out.append((f"soundgap-{g['id']}-{i}-{side}", w['he'], w.get('gloss', '')))
    pl = load('data/pronunciation/plene.json')
    for fam, v in pl['families'].items():
        pair = (v or {}).get('pair')
        if pair:
            out.append((f'plene-{fam}-defective', pair['defective'], pair.get('gloss', '')))
            out.append((f'plene-{fam}-plene', pair['plene'], pair.get('gloss', '')))
    for w in load('data/pronunciation/dial-words.json')['words']:
        out.append((f"dial-{w['id']}", w['full'], w.get('gloss', '')))
    bank = open(rp('src/games/tugowar.bank.js'), encoding='utf8').read()
    for row in re.findall(r'^\s*(\[".*\]),?\s*$', bank, re.M):
        r = json.loads(row)
        key, he1, en1, he2, en2, a1, a2 = r[0], r[1], r[3], r[4], r[6], r[9], r[10]
        if not a1:
            out.append((f'tug-{key}-1', he1, en1))
        if not a2:
            out.append((f'tug-{key}-2', he2, en2))
    return out


DOT_TILE = {  # dot-<pair>-0 is the dotted / right-dot letter, -1 the plain / left-dot one (src/pronunciation/boards.model.js)
    'bet-vet': ('bet-sound', 'vet-sound'), 'kaf-khaf': ('kaf-sound', 'khaf-sound'),
    'pe-fe': ('pe-sound', 'fe-sound'), 'shin-sin': ('shin-sound', 'sin-sound'),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--execute', action='store_true')
    a = ap.parse_args()
    bad = bad_files()
    core, kindword, shard = load(CORE), load(KINDWORD), load(SHARD)
    rank = {'recorded': 0, 'tts': 1, 'synthetic-unreviewed': 2}
    have = {}
    for r in kindword + shard + [x for x in core if x['kind'] == 'word']:
        if r.get('tradition') != 'israeli' or r.get('status') == 'missing' or r['path'] in bad or not os.path.exists(rp(r['path'])):
            continue
        k = (r['voice'], norm(r['text']))
        if k not in have or rank.get(r['status'], 9) < rank.get(have[k]['status'], 9):
            have[k] = r

    copies = []  # (row, source)

    def fill(row):
        src = have.get((row['voice'], norm(row['text'])))
        if not src or src['path'] == row['path']:
            return False
        copies.append((row, src))
        return True

    # 1. existing missing rows (a row whose alias already reaches a good clip plays already; leave it)
    good = {(r['voice'], r['kind'], r['id']) for r in kindword + shard + core
            if r.get('tradition') == 'israeli' and r.get('status') != 'missing' and r['path'] not in bad and os.path.exists(rp(r['path']))}

    def alias_ok(r):
        if not r.get('aliasOf'):
            return False
        k, _, i = r['aliasOf'].partition('/')
        return (r['voice'], k, i) in good

    filled_existing = 0
    for rows in (kindword, shard):
        for r in rows:
            if r.get('tradition') == 'israeli' and r['kind'] == 'word' and r.get('status') == 'missing' and not alias_ok(r) and fill(r):
                filled_existing += 1

    # 2. screen words with no row
    known = {(r['voice'], r['id']) for r in kindword + shard if r['kind'] == 'word' and r.get('tradition') == 'israeli'}
    new_rows, todo = [], []
    for wid, he, en in screen_words():
        for v in VOICES:
            if (v, wid) in known:
                continue
            row = {'path': f'audio/{v}/israeli/word/{wid}.mp3', 'voice': v, 'tradition': 'israeli', 'kind': 'word', 'id': wid,
                   'text': he, 'status': 'missing', 'source': 'none', 'group': GROUP, 'english': en}
            known.add((v, wid))
            new_rows.append(row)
            if not fill(row):
                todo.append(wid)

    # 3. Dot Tile rows: aliases of the letter sound clips (core manifest, loaded first)
    core_ids = {(r['voice'], r['tradition'], r['kind'], r['id']) for r in core}
    dot_rows = []
    for pair, targets in DOT_TILE.items():
        for i, letter in enumerate(targets):
            for v in VOICES:
                if (v, 'israeli', 'syllable', f'dot-{pair}-{i}') in core_ids:
                    continue
                tgt = next((r for r in core if r['voice'] == v and r['tradition'] == 'israeli' and r['kind'] == 'letter' and r['id'] == letter), None)
                if not tgt or tgt.get('status') == 'missing':
                    continue
                dot_rows.append({'path': f'audio/{v}/israeli/syllable/dot-{pair}-{i}.mp3', 'voice': v, 'tradition': 'israeli',
                                 'kind': 'syllable', 'id': f'dot-{pair}-{i}', 'text': tgt['text'], 'status': 'missing',
                                 'source': 'none', 'group': 'dot-tile', 'aliasOf': f'letter/{letter}',
                                 'english': tgt.get('english', '')})

    copied_rows = {id(c[0]) for c in copies}
    todo = sorted({r['id'] for r in kindword + new_rows if r.get('group') == GROUP and r.get('status') == 'missing' and id(r) not in copied_rows})
    print(f'existing rows filled by same text: {filled_existing}')
    copied = {id(c[0]) for c in copies}
    print(f'new screen-word rows: {len(new_rows)} ({sum(1 for r in new_rows if id(r) in copied)} filled by same text, {sum(1 for r in new_rows if id(r) not in copied)} still need recording)')
    print(f'Dot Tile alias rows: {len(dot_rows)}')
    print(f'screen word ids still needing a recording: {len(todo)}')
    if not a.execute:
        for row, src in copies[:15]:
            print(f"  {row['id']:34s} {row['text']:14s} <- {src['kind']}/{src['id']} ({src['status']})")
        print('dry run; add --execute')
        return
    for row, src in copies:
        dst = rp(row['path'])
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(rp(src['path']), dst)
        row['status'], row['source'], row['copyOf'] = src['status'], src['source'], f"{src['kind']}/{src['id']}"
    kindword.extend(new_rows)
    core.extend(dot_rows)
    save_like(KINDWORD, kindword)
    save_like(SHARD, shard)
    save_like(CORE, core)
    os.makedirs(os.path.dirname(rp(TODO)), exist_ok=True)
    with open(rp(TODO), 'w', encoding='utf8') as f:
        f.write('# Screen words with no clip of the same spelling anywhere. Record with:\n'
                '#   node tools/audio/render_tts.mjs --provider google --voice both --kinds word --ids docs/audio/screen-words-to-record.txt --execute\n')
        f.write('\n'.join(todo) + '\n')
    print(f'wrote {len(copies)} files, {TODO}')


if __name__ == '__main__':
    main()
