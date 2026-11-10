#!/usr/bin/env python3
"""Rebuild data/camera/real-neighbours.json: real Hebrew words the Camera Translator must never "correct".

A reader that misreads one letter can turn a sign word into something one letter away from a listed word, and the
translator accepts that as a "closest match". But many real Hebrew words are also one letter away from a listed word
(the word for "where" and the city Haifa; "push" and Haifa; "hotel" and "window"). This script lists every real word form
it knows that is not in the sign list yet sits one letter (changed, added or removed), or two look-alike letters, from a
listed word.

Real word forms come from:
  1. the app dictionary            data/vocab/index.json
  2. the app phrasebook            data/corpus/phrasebook.json
  3. the dictionary's example sentences   data/vocab/words.json
  4. a 50,000-form frequency list  FrequencyWords 2018 Hebrew (he_50k.txt), the same file data/vocab/sources.lock.json pins.
     It is not kept in the repo. Pass it with --frequency PATH, or --download to fetch it; its SHA-256 is checked.

  python3 tools/camera-translate/build_real_neighbours.py --download      full rebuild (run after editing the sign list)
  python3 tools/camera-translate/build_real_neighbours.py --check         no network: verify the stored file still fits the list

The output is derived from CC BY-SA 4.0 data (see data/vocab/LICENSE-NOTES.md), so it lives in its own file, not in the
project-owned sign list.
"""
import argparse, hashlib, json, re, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from camera_translate.hebrew import tokens, two_look_alikes  # noqa: E402

OUT = ROOT / 'data/camera/real-neighbours.json'
HEB_WORD = re.compile('[א-ת]{2,}')
MARKS = re.compile('[֑-ׇ]')


def one_apart(a, b):
    if a == b or abs(len(a) - len(b)) > 1:
        return False
    if len(a) == len(b):
        return sum(x != y for x, y in zip(a, b)) == 1
    s, l = (a, b) if len(a) < len(b) else (b, a)
    return any(l[:i] + l[i + 1:] == s for i in range(len(l)))


def sign_vocab():
    g = json.loads((ROOT / 'data/camera/sign-glossary.json').read_text(encoding='utf-8'))
    return sorted({t for e in g['entries'] for t in tokens(e['he'])})


def repo_words():
    real = set()
    idx = json.loads((ROOT / 'data/vocab/index.json').read_text(encoding='utf-8'))
    key = idx['fields'].index('heUnpointed')
    real.update(r[key].strip() for r in idx['rows'] if r[key] and ' ' not in r[key].strip())
    for e in json.loads((ROOT / 'data/corpus/phrasebook.json').read_text(encoding='utf-8'))['entries']:
        real.update(tokens(e['he']))
    for w in json.loads((ROOT / 'data/vocab/words.json').read_text(encoding='utf-8'))['words']:
        real.update(HEB_WORD.findall(MARKS.sub('', (w.get('example') or {}).get('he') or '')))
    return real


def frequency_words(path):
    lock = json.loads((ROOT / 'data/vocab/sources.lock.json').read_text(encoding='utf-8'))
    pinned = next((s for s in (lock.get('sources') or lock.get('files') or []) if s.get('name') == 'he_50k.txt'), None) if isinstance(lock, dict) else None
    data = Path(path).read_bytes()
    sha = hashlib.sha256(data).hexdigest()
    if pinned and pinned.get('sha256') and pinned['sha256'] != sha:
        sys.exit(f'he_50k.txt does not match the SHA-256 pinned in data/vocab/sources.lock.json ({sha})')
    forms = {line.split(' ')[0] for line in data.decode('utf-8').splitlines() if line.strip()}
    # The list comes from film subtitles and holds typos and clipped words. Two kinds are certainly not Hebrew words: a form
    # ending in a letter that must take its final shape (kaf, mem, nun, pe, tsadi), and a final-shape letter in mid-word.
    ok = re.compile('^[\u05d0-\u05ea]*[^\u05db\u05de\u05e0\u05e4\u05e6]$')
    mid_final = re.compile('[\u05da\u05dd\u05df\u05e3\u05e5].')
    return {w for w in forms if ok.match(w) and not mid_final.search(w)}, sha


def neighbours(real, vocab):
    vs = set(vocab)
    real = {w for w in real if len(w) >= 2 and re.fullmatch('[\u05d0-\u05ea]+', w)} - vs
    by_len = {}
    for v in vocab:
        if len(v) >= 2:
            by_len.setdefault(len(v), []).append(v)
    out = []
    for w in real:
        cands = [v for n in (len(w) - 1, len(w), len(w) + 1) for v in by_len.get(n, [])]
        if any(one_apart(w, v) or two_look_alikes(w, v) for v in cands):
            out.append(w)
    return sorted(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--frequency'); ap.add_argument('--download', action='store_true'); ap.add_argument('--check', action='store_true')
    args = ap.parse_args()
    vocab = sign_vocab()
    vocab_sha = hashlib.sha256('\n'.join(vocab).encode('utf-8')).hexdigest()[:16]
    if args.check:
        stored = json.loads(OUT.read_text(encoding='utf-8'))
        problems = []
        if stored.get('signVocabularySha') != vocab_sha:
            problems.append('the sign list changed since this file was built: run with --download')
        missing = [w for w in neighbours(repo_words(), vocab) if w not in set(stored['words'])]
        if missing:
            problems.append(f'{len(missing)} dictionary or phrasebook words are missing, e.g. {missing[:5]}')
        listed = [w for w in stored['words'] if w in set(vocab)]
        if listed:
            problems.append(f'listed words in the guard file: {listed[:5]}')
        if problems:
            sys.exit('real-neighbours.json is stale: ' + '; '.join(problems))
        print(f'real-neighbours.json fits the sign list ({len(stored["words"])} words)')
        return
    real = repo_words(); repo_count = len(neighbours(real, vocab)); freq_sha = None
    path = args.frequency
    if args.download and not path:
        path = '/tmp/he_50k.txt'
        urllib.request.urlretrieve('https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/he/he_50k.txt', path)
    if path:
        more, freq_sha = frequency_words(path)
        real |= more
    elif OUT.exists():
        sys.exit('refusing to rebuild without the frequency list (it would shrink the guard): pass --frequency PATH or --download')
    words = neighbours(real, vocab)
    OUT.write_text(json.dumps({
        'schema': 1,
        'note': 'Real Hebrew word forms that sit one letter (or two look-alike letters) from a word in the sign list. The Camera Translator never treats one of these as a misreading of a listed word unless the result forms a listed phrase with the word beside it. Built by tools/camera-translate/build_real_neighbours.py; do not edit by hand.',
        'licence': 'Derived from data/vocab (Wiktionary via kaikki.org, Tatoeba examples) and from FrequencyWords 2018 Hebrew (hermitdave, from OpenSubtitles2018). CC BY-SA 4.0. See data/vocab/LICENSE-NOTES.md.',
        'signVocabularySha': vocab_sha, 'frequencyListSha256': freq_sha, 'fromRepoDataOnly': repo_count, 'count': len(words), 'words': words,
    }, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'{len(words)} real word forms sit beside a listed word ({repo_count} from the repo data alone); written to {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
