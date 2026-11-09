"""Second, independent review of sentence and prayer clips: by sound, not by word.

The word checker (scan_lines.py) is a Hebrew speech-to-text model; it guesses spellings and can "correct"
a mispronounced word into the right one, or the other way round. This review uses a different model,
renikud/whisper-he-ipa, which writes down the sounds it hears (IPA) without choosing words, and compares
them, word by word, with the sounds the pointed text should make (Phonikud). It never saw the fixes.

  python tools/audio/asr-check/phoneme_review.py --model /path/to/phoneme-ct2 prayer line/bless-priestly-1
Results: tools/audio/asr-check/phoneme-review.jsonl and docs/audio/PHONEME-REVIEW.md.
"""
import argparse, difflib, glob, json, os, re, sys, unicodedata
sys.path.insert(0, os.path.dirname(__file__))
import scan_lines as S, check_lib as L

ROOT = S.ROOT
RES = os.path.join(os.path.dirname(__file__), 'phoneme-review.jsonl')
DIVINE = {'יְהוָה': 'אֲדֹנָי', 'יְהוִה': 'אֱלֹהִים'}
# sounds the model and the converter write differently but a listener hears as the same
FOLD = str.maketrans({'ʁ': 'r', 'χ': 'x', 'ħ': 'x', 'ɡ': 'g', 'ʃ': 'S', 'ʒ': 'Z', 'ʔ': '', 'ˈ': '', 'ˌ': '', 'ː': '', 'ʕ': '', 'h': 'h'})


def fold(ipa):
    s = unicodedata.normalize('NFC', ipa).translate(FOLD).lower()
    s = s.replace('ts', 'c').replace('tʃ', 'C').replace('dʒ', 'J')
    return re.sub(r'[^a-zA-Z ]', '', s)


_model = None


def hear(path, model_dir):
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        _model = WhisperModel(model_dir, device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 2)
    segs, _ = _model.transcribe(L.load(path), language='he', task='transcribe', beam_size=1, best_of=1, temperature=0,
                                condition_on_previous_text=False, vad_filter=False, suppress_tokens=[], without_timestamps=True)
    raw = ' '.join(s.text.strip() for s in segs)
    for a, b in [('dZ', 'dʒ'), ('tS', 'tʃ'), ('S', 'ʃ'), ('Z', 'ʒ'), ('q', 'ʔ'), ("'", 'ˈ'), ('r', 'ʁ'), ('x', 'χ'), ('g', 'ɡ')]:
        raw = raw.replace(a, b)
    return raw


def expected(text):
    from phonikud import phonemize
    ws = [w for w in S.words(text)]
    clean = lambda w: S.PUNCT.sub('', w)
    return ws, [fold(phonemize(DIVINE.get(clean(w), clean(w)))) for w in ws]


def review(text, heard_ipa):
    ws, exp = expected(text)
    got = fold(heard_ipa).replace(' ', '')
    target = ''.join(exp)
    sm = difflib.SequenceMatcher(a=target, b=got, autojunk=False)
    # mark which target characters were matched
    hit = [False] * len(target)
    for a0, b0, n in sm.get_matching_blocks():
        for k in range(a0, a0 + n):
            hit[k] = True
    out, pos = [], 0
    for w, e in zip(ws, exp):
        seg = hit[pos:pos + len(e)]; pos += len(e)
        r = sum(seg) / max(1, len(seg))
        out.append({'word': w, 'should': e, 'match': round(r, 2)})
    return round(sm.ratio(), 3), out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('targets', nargs='+')
    ap.add_argument('--voices', default='f,m')
    ap.add_argument('--model', required=True)
    ap.add_argument('--weak', type=float, default=0.6, help='a word with fewer of its sounds heard than this is flagged')
    a = ap.parse_args()
    done = {}
    if os.path.exists(RES):
        for l in open(RES, encoding='utf-8'):
            r = json.loads(l); done[r['file']] = r
    files = []
    for v in a.voices.split(','):
        for t in a.targets:
            base = os.path.join(ROOT, 'audio', v, 'israeli')
            pat = os.path.join(base, t, '*.mp3') if os.path.isdir(os.path.join(base, t)) else os.path.join(base, t + '.mp3')
            files += sorted(glob.glob(pat))
    with open(RES, 'a', encoding='utf-8') as out:
        for n, f in enumerate(files, 1):
            rel = os.path.relpath(f, ROOT).replace(os.sep, '/')
            mp = f + '.meta.json'
            meta = json.load(open(mp, encoding='utf-8')) if os.path.exists(mp) else {'inputText': S.torah_he(os.path.basename(f)[:-4])}
            text = meta.get('stitchedFromText') or meta['inputText']
            sha = __import__('hashlib').sha256(open(f, 'rb').read()).hexdigest()
            if rel in done and done[rel].get('sha') == sha:
                continue
            ipa = hear(f, a.model)
            ratio, ws = review(text, ipa)
            weak = [w for w in ws if w['match'] < a.weak]
            r = {'file': rel, 'sha': sha, 'text': text, 'heard_ipa': ipa, 'ratio': ratio, 'weak': weak}
            out.write(json.dumps(r, ensure_ascii=False) + '\n'); out.flush(); done[rel] = r
            print(f'[{n}/{len(files)}] {rel} {ratio:.0%} weak: {" ".join(w["word"] for w in weak) or "none"}', flush=True)
    rows = sorted((r for r in done.values()), key=lambda r: r['ratio'])
    L2 = ['# Second review by sound (independent model)', '',
          'renikud/whisper-he-ipa wrote down the sounds in each clip; they were compared with the sounds the pointed text should make '
          '(Phonikud, Israeli pronunciation, the divine name read Adonai). A **weak** word is one where fewer than '
          f'{int(a.weak * 100)}% of its sounds were heard. Machine review, not a teacher\'s: a weak word is a word to listen to.', '',
          f'Clips reviewed: **{len(rows)}**. Clips with no weak word: **{sum(1 for r in rows if not r["weak"])}**.', '',
          '| clip | sounds matched | weak words |', '|---|---|---|']
    for r in rows:
        L2.append(f'| `{r["file"]}` | {r["ratio"]:.0%} | {" ".join(w["word"] for w in r["weak"]) or "none"} |')
    open(os.path.join(ROOT, 'docs', 'audio', 'PHONEME-REVIEW.md'), 'w', encoding='utf-8').write('\n'.join(L2) + '\n')


if __name__ == '__main__':
    main()
