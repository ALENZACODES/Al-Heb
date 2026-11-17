"""Sound check for the clips the word scan skips: letter names, letter sounds, vowels and syllables.

A speech-to-text model cannot judge a sound that is not a word, and a sound model is shaky on one half-second clip
heard alone (the same clip came back "ba" or "ma" depending on the silence around it). So each clip is heard several
times, each time in a different row of eight clips with a pause between them, by renikud/whisper-he-ipa (it writes the
sounds it hears, it does not guess words). A clip is judged on the majority of its hearings.

  python tools/audio/asr-check/scan_sounds.py --model /path/to/phoneme-ct2            # hear (3 passes), then report
  python tools/audio/asr-check/scan_sounds.py --model /path/to/phoneme-ct2 --passes 5
  python tools/audio/asr-check/scan_sounds.py --model /path/to/phoneme-ct2 --disputed --first-pass 3 --passes 2   # more hearings for unsure clips
  python tools/audio/asr-check/scan_sounds.py --report-only

The model folder is made once, as in .github/workflows/fill-clips.yml (ct2-transformers-converter, pinned revision).
Hearings: tools/audio/asr-check/sounds-heard.jsonl. Report: docs/audio/SOUNDS-CHECK.md and docs/audio/sounds-check.csv.
Clips to re-record: docs/audio/sounds-redo-israeli.txt.

A machine check. "agree" means every hearing was the sound the clip should make; it does not mean a teacher
approved the accent. "listen" rows are the ones to play by ear first.
"""
import argparse, csv, hashlib, json, os, random, re, sys, unicodedata
from collections import Counter

sys.path.insert(0, os.path.dirname(__file__))
import check_lib as L  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
HEARD = os.path.join(os.path.dirname(__file__), 'sounds-heard.jsonl')
KINDS = ('letter', 'vowel', 'syllable')
ROW, GAP = 8, 1.2


def clips():
    """One entry per distinct recording (files that are byte-for-byte copies are heard once)."""
    man = json.load(open(os.path.join(ROOT, 'data', 'audio', 'manifest.json'), encoding='utf-8'))
    by = {}
    for r in man:
        if r.get('tradition') != 'israeli' or r.get('kind') not in KINDS:
            continue
        f = os.path.join(ROOT, r['path'])
        if not os.path.exists(f):
            continue
        sha = hashlib.sha256(open(f, 'rb').read()).hexdigest()
        mp = f + '.meta.json'
        meta = json.load(open(mp, encoding='utf-8')) if os.path.exists(mp) else {}
        e = by.setdefault(sha, {'sha': sha, 'voice': r['voice'], 'files': [], 'rows': []})
        e['files'].append(r['path'])
        e['rows'].append({'kind': r['kind'], 'group': r.get('group'), 'id': r['id'], 'text': r['text'], 'ipa': r.get('ipa'),
                          'input': meta.get('inputText')})
    return list(by.values())


def hearer(model_dir):
    """Returns hear_row(paths) -> [(heard, how)]: one row of clips with pauses between; clips heard alone if the row does not split."""
    from faster_whisper import WhisperModel
    import numpy as np
    try:
        import ctranslate2
        gpu = ctranslate2.get_cuda_device_count() > 0
    except Exception:  # noqa: BLE001
        gpu = False
    m = WhisperModel(model_dir, device='cuda' if gpu else 'cpu', compute_type='int8_float16' if gpu else 'int8',
                     cpu_threads=os.cpu_count() or 2)
    if gpu:
        try:                                            # a GPU without the CUDA libraries ctranslate2 needs: use the CPU
            import numpy as _np
            list(m.transcribe(_np.zeros(L.SR, _np.float32), language='he', without_timestamps=True)[0])
        except Exception as e:  # noqa: BLE001
            print('GPU not usable, using the CPU:', str(e)[:120], flush=True)
            m = WhisperModel(model_dir, device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 2)
    gap = np.zeros(int(GAP * L.SR), np.float32)

    def tr(a, n=1):
        # the token cap stops a runaway ("hhhhh...") on a clip the model cannot place
        segs, _ = m.transcribe(a, language='he', task='transcribe', beam_size=1, best_of=1, temperature=0,
                               condition_on_previous_text=False, vad_filter=False, suppress_tokens=[], without_timestamps=True,
                               max_new_tokens=14 * n)
        return ' '.join(s.text.strip() for s in segs).split()

    def hear_row(paths):
        buf = [gap[:len(gap) // 4]]
        for f in paths:
            buf += [L.load(f), gap]
        toks = tr(np.concatenate(buf), len(paths))
        if len(toks) == len(paths):
            return [(t, 'row') for t in toks]
        return [(''.join(tr(np.concatenate([gap, L.load(f), gap]))), 'alone') for f in paths]
    return hear_row


def listen(model_dir, passes, seed0, only=None):
    hear_row = hearer(model_dir)
    all_clips = clips()
    done = Counter()
    if os.path.exists(HEARD):
        for l in open(HEARD, encoding='utf-8'):
            r = json.loads(l)
            done[(r['sha'], r['pass'])] += 1
    with open(HEARD, 'a', encoding='utf-8') as out:
        for p in range(passes):
            for v in ('f', 'm'):
                todo = [c for c in all_clips if c['voice'] == v and not done[(c['sha'], seed0 + p)] and (only is None or c['sha'] in only)]
                random.Random(seed0 + p).shuffle(todo)
                for i in range(0, len(todo), ROW):
                    row = todo[i:i + ROW]
                    got = hear_row([os.path.join(ROOT, c['files'][0]) for c in row])
                    for c, (t, how) in zip(row, got):
                        out.write(json.dumps({'sha': c['sha'], 'file': c['files'][0], 'pass': seed0 + p, 'how': how, 'heard': t},
                                             ensure_ascii=False) + '\n')
                    out.flush()
                    print(f'pass {seed0 + p} {v} {i + len(row)}/{len(todo)}', ' '.join(t for t, _ in got), flush=True)


# ---- scoring -------------------------------------------------------------------------------------------------------
# One symbol per sound; sounds an Israeli listener hears as the same are folded together.
FOLD = [('dʒ', 'J'), ('dZ', 'J'), ('tʃ', 'C'), ('tS', 'C'), ('ts', 'c'), ('ʃ', 'S'), ('ʒ', 'Z'), ('ʁ', 'r'), ('χ', 'x'), ('ħ', 'x'),
        ('ɡ', 'g'), ('j', 'y')]            # w is kept apart from v: vav read "wa" is a fault
DROP = re.compile(r"[ʔʕq'ˈˌː.\[\],?!̞ ]")       # q is how the model writes the catch in the throat before a vowel


def fold(s):
    s = unicodedata.normalize('NFD', s or '')
    for a, b in FOLD:
        s = s.replace(a, b)
    s = DROP.sub('', s).replace('ey', 'e')                # tsere said "e" or "ei" (bet / beit): both are taught
    return re.sub(r'(.)\1+', r'\1', s)                    # a letter held long is the same letter


VOWELS = set('aeiou')
VOWEL_OF = {'ַ': 'a', 'ָ': 'a', 'ֶ': 'e', 'ֵ': 'e', 'ִ': 'i', 'ֹ': 'o', 'ֻ': 'u', 'ְ': 'e'}


def should(row):
    """The sound a clip should make, folded. None when the entry names a mark with no sound of its own."""
    from phonikud import phonemize
    pointed = lambda t: bool(t and re.search('[ְ-ׇ]', t))
    if row['kind'] == 'letter' and row['group'] in ('letter', 'letter-variant', 'letter-final'):
        return fold(phonemize(row['text']))                       # a letter name is a word
    ipa = row['ipa'] if row['ipa'] and re.fullmatch(r"\[?[^\s;\]]{1,4}\]?", row['ipa']) else None
    if row['kind'] == 'syllable' and ipa:
        return fold(ipa)
    one = pointed(row['input']) and len(re.sub('[^א-ת]', '', row['input'])) == 1
    if one and ipa and not (set(fold(ipa)) & VOWELS):               # a letter sound rendered as letter + vowel
        v = next((VOWEL_OF[ch] for ch in row['input'] if ch in VOWEL_OF), '')
        return fold(ipa) + v
    if row['kind'] == 'letter' and ipa and not (set(fold(ipa)) & VOWELS) and pointed(row['input']) and not one:
        return fold(ipa) + 'a'                                    # a letter sound cut from a longer take (וָו וָ: "va")
    if pointed(row['input']) and not one:
        return fold(phonemize(row['input']))
    if ipa:
        return fold(ipa)
    if pointed(row['text']):
        return fold(phonemize(row['text']))
    return None


def judge(want, heard, mark=False):
    """agree: every pass heard it. majority: most did. split: half did. listen: most did not."""
    def ok(h):
        h = fold(h)
        if h == want:
            return True
        cons = want.rstrip('aeiou')
        if mark and want and not (set(want) & VOWELS):               # a dot or mark card may say the sound or the letter's name
            return h.startswith(want)
        if want and not (set(want) & VOWELS):                       # a bare consonant: any vowel after it is fine
            return h.startswith(want) and set(h[len(want):]) <= VOWELS and len(h) <= len(want) + 1
        if want and not cons:                                       # a bare vowel: a breathy onset is fine
            return h.lstrip('h') == want
        return False
    hits = [ok(h) for h in heard]
    n = sum(hits)
    return ('agree' if n == len(hits) else 'majority' if n * 2 > len(hits) else 'split' if n * 2 == len(hits) else 'listen'), n


def judged():
    heard = {}
    for l in open(HEARD, encoding='utf-8'):
        r = json.loads(l)
        heard.setdefault(r['sha'], []).append(r['heard'])
    rows = []
    for c in clips():
        hs = heard.get(c['sha'])
        if not hs:
            continue
        # a recording shared by several entries is judged against the first one that names a sound
        row = next((r for r in c['rows'] if should(r) is not None), None)
        if row is None:
            rows.append((c, c['rows'][0], None, 'no sound of its own', 0, hs))
            continue
        want = should(row)
        verdict, n = judge(want, hs, mark=row['group'] == 'niqqud')
        rows.append((c, row, want, verdict, n, hs))
    return rows


def report():
    rows = judged()
    order = {'listen': 0, 'split': 1, 'majority': 2, 'agree': 3, 'no sound of its own': 4}
    rows.sort(key=lambda x: (order[x[3]], x[0]['files'][0]))
    tab = {}
    for c, row, want, verdict, n, hs in rows:
        g = 'letter name' if row['group'] in ('letter', 'letter-variant', 'letter-final') else \
            'letter sound' if row['kind'] == 'letter' else row['kind']
        tab.setdefault(g, Counter())[verdict] += 1
    md = ['# Israeli letters, vowels and syllables: sound check', '',
          'Each recording was heard several times by a sound model (renikud/whisper-he-ipa), each time among different '
          'neighbouring clips, and what it heard was compared with the sound the clip should make. **agree**: every hearing '
          'matched. **majority**: most hearings matched. **split**: half did. **listen**: most did not; play these by ear. '
          'A machine check, not a teacher\'s approval.', '',
          '| kind | recordings | agree | majority | split | listen | agree or majority |', '|---|---|---|---|---|---|---|']
    tot = Counter()
    for g, cnt in sorted(tab.items()):
        scored = cnt['agree'] + cnt['majority'] + cnt['split'] + cnt['listen']
        tot.update(cnt)
        md.append(f"| {g} | {scored} | {cnt['agree']} | {cnt['majority']} | {cnt['split']} | {cnt['listen']} | {(cnt['agree'] + cnt['majority']) / max(1, scored):.1%} |")
    scored = tot['agree'] + tot['majority'] + tot['split'] + tot['listen']
    md.append(f"| **all** | **{scored}** | **{tot['agree']}** | **{tot['majority']}** | **{tot['split']}** | **{tot['listen']}** | **{(tot['agree'] + tot['majority']) / max(1, scored):.1%}** |")
    md += ['', f"Entries that name a mark with no sound of its own (not scored): {tot['no sound of its own']}.", '',
           '## Listen first', '', '| verdict | should sound | heard (each pass) | text | clip |', '|---|---|---|---|---|']
    for c, row, want, verdict, n, hs in rows:
        if verdict in ('listen', 'split', 'majority'):
            hs = [h if len(h) < 24 else h[:6] + '… (runaway)' for h in hs]
            md.append(f"| {verdict} | {want} | {' / '.join(hs)} | {row['input'] or row['text']} | `{c['files'][0]}` |")
    open(os.path.join(ROOT, 'docs', 'audio', 'SOUNDS-CHECK.md'), 'w', encoding='utf-8').write('\n'.join(md) + '\n')
    with open(os.path.join(ROOT, 'docs', 'audio', 'sounds-check.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['verdict', 'matched', 'hearings', 'should_sound', 'heard', 'kind', 'id', 'text', 'file', 'same_audio_files'])
        for c, row, want, verdict, n, hs in rows:
            w.writerow([verdict, n, len(hs), want or '', ' / '.join(hs), row['kind'], row['id'], row['input'] or row['text'],
                        c['files'][0], len(c['files'])])
    redo = sorted(f for c, row, want, verdict, n, hs in rows if verdict == 'listen' for f in c['files'])
    open(os.path.join(ROOT, 'docs', 'audio', 'sounds-redo-israeli.txt'), 'w', encoding='utf-8').write('\n'.join(redo) + ('\n' if redo else ''))
    print('\n'.join(md[:14]))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--model')
    ap.add_argument('--passes', type=int, default=3)
    ap.add_argument('--first-pass', type=int, default=0, help='number of the first pass (to add passes later)')
    ap.add_argument('--disputed', action='store_true', help='hear again only the clips not at "agree"')
    ap.add_argument('--new', action='store_true', help='hear only the recordings that have no hearing yet')
    ap.add_argument('--report-only', action='store_true')
    a = ap.parse_args()
    if not a.report_only:
        if not a.model:
            raise SystemExit('give --model (the converted renikud/whisper-he-ipa folder) or --report-only')
        only = None
        if a.disputed:                                  # more hearings, only for clips the passes so far do not agree on
            only = {c['sha'] for c, row, want, verdict, n, hs in judged() if verdict in ('listen', 'split', 'majority')}
        if a.new:                                       # only recordings with no hearing yet (clips replaced since the last run)
            seen = {json.loads(l)['sha'] for l in open(HEARD, encoding='utf-8')} if os.path.exists(HEARD) else set()
            only = {c['sha'] for c in clips() if c['sha'] not in seen}
        listen(a.model, a.passes, a.first_pass, only)
    report()
