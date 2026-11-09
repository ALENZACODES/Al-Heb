"""Speech-to-text check for whole sentences and prayers (the word scan only covers single words).

For each clip it reads the Hebrew the clip was rendered from (the .meta.json inputText), lets the
Hebrew Whisper model transcribe the whole clip, lines the two up word by word, and lists every word
that was dropped, added or heard as a different word.

  python tools/audio/asr-check/scan_lines.py prayer line/bless-* line/hanukkah-*
  python tools/audio/asr-check/scan_lines.py --voices f,m --out docs/audio/ASR-LINES.md prayer

Arguments are folders under audio/<voice>/israeli/ or glob patterns inside them. Resumable:
results go to tools/audio/asr-check/lines-results.jsonl and finished clips are skipped.
"""
import argparse, difflib, glob, json, os, re, sys, time
sys.path.insert(0, os.path.dirname(__file__))
import check_lib as L

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
RES = os.path.join(os.path.dirname(__file__), 'lines-results.jsonl')
PUNCT = re.compile(r'[׃,.;:!?"\'״׳־\-–—()\[\]{}]')


def words(text):
    return [w for w in PUNCT.sub(' ', text.replace('־', ' ')).split() if w]


def key(w):
    return L.core(w, drop_silent_aleph=True)


_TORAH = None


def torah_he(cid):
    global _TORAH
    if _TORAH is None:
        _TORAH = {r['id']: r['he'] for r in json.load(open(os.path.join(ROOT, 'tools', 'torah', 'audio', 'ipa', 'ipa.json'), encoding='utf-8'))}
    return _TORAH[cid]


def transcribe(path):
    m = L.model()
    segs, _ = m.transcribe(L.load(path), language='he', beam_size=1, condition_on_previous_text=False, vad_filter=False)
    return ' '.join(s.text.strip() for s in segs)


ADONAI = {key(w) for w in ('אֲדֹנָי', 'אֲדֹנָי', 'יְהוָה', 'וַאדֹנָי', 'לַאדֹנָי', 'בַּאדֹנָי', 'כַּאדֹנָי', 'מֵאֲדֹנָי', 'הַשֵּׁם', 'יְהוָה', 'יְהוִה')}


def compare(expected, heard):
    ew, hw = words(expected), words(heard)
    ek, hk = [key(w) for w in ew], [key(w) for w in hw]
    sm = difflib.SequenceMatcher(a=ek, b=hk, autojunk=False)
    issues, ok = [], 0
    for tag, a0, a1, b0, b1 in sm.get_opcodes():
        if tag == 'equal':
            ok += a1 - a0
            continue
        if tag == 'replace' and (a1 - a0) == (b1 - b0):
            for i, j in zip(range(a0, a1), range(b0, b1)):
                s = 1.0 if (hw[j] in ('ה', 'יי', 'השם', 'אדוני', 'אדני', 'אדונאי') and key(ew[i]) in ADONAI) else L.score(ew[i], hw[j])
                if s >= L.PASS:
                    ok += 1
                else:
                    issues.append({'say': ew[i], 'heard': hw[j], 'score': round(s, 2)})
            continue
        # unequal runs: compare the joined text so a split or merged word is not a fault
        a, b = ' '.join(ew[a0:a1]), ' '.join(hw[b0:b1])
        if a and b and L.score(a.replace(' ', ''), b.replace(' ', '')) >= L.PASS:
            ok += a1 - a0
            continue
        issues.append({'say': a or '(nothing)', 'heard': b or '(nothing)', 'score': 0.0})
    return ok / max(1, len(ew)), issues, len(ew)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('targets', nargs='+')
    ap.add_argument('--voices', default='f,m')
    ap.add_argument('--out', default=os.path.join(ROOT, 'docs', 'audio', 'ASR-LINES.md'))
    args = ap.parse_args()
    done = {}
    if os.path.exists(RES):
        for l in open(RES, encoding='utf-8'):
            r = json.loads(l); done[r['file']] = r
    files = []
    for v in args.voices.split(','):
        for t in args.targets:
            base = os.path.join(ROOT, 'audio', v, 'israeli')
            pat = os.path.join(base, t, '*.mp3') if os.path.isdir(os.path.join(base, t)) else os.path.join(base, t + ('' if t.endswith('.mp3') else '.mp3'))
            files += sorted(glob.glob(pat))
    with open(RES, 'a', encoding='utf-8') as out:
        for n, f in enumerate(files, 1):
            rel = os.path.relpath(f, ROOT).replace(os.sep, '/')
            if rel in done:
                continue
            meta = json.load(open(f + '.meta.json', encoding='utf-8')) if os.path.exists(f + '.meta.json') else {'inputText': torah_he(os.path.basename(f)[:-4])}
            t0 = time.time()
            heard = transcribe(f)
            acc, issues, nw = compare(meta['inputText'], heard)
            r = {'file': rel, 'say': meta['inputText'], 'heard': heard, 'words': nw, 'acc': round(acc, 3), 'issues': issues}
            out.write(json.dumps(r, ensure_ascii=False) + '\n'); out.flush()
            done[rel] = r
            print(f'[{n}/{len(files)}] {rel} {acc:.0%} {len(issues)} issue(s) {time.time() - t0:.0f}s', flush=True)
    rows = [done[os.path.relpath(f, ROOT).replace(os.sep, '/')] for f in files if os.path.relpath(f, ROOT).replace(os.sep, '/') in done]
    rows.sort(key=lambda r: r['acc'])
    lines = ['# Sentences and prayers: speech-to-text check', '',
             'Each whole clip was transcribed by the Hebrew Whisper model and lined up word by word with the text it was rendered from. '
             'Spelling-only differences are allowed (same rules as the word check). A flagged word is one the model heard as a different word, or did not hear.', '',
             f'Clips checked: **{len(rows)}**. Clips with every word heard: **{sum(1 for r in rows if not r["issues"])}**.', '',
             '| clip | words heard right | problem words (should say → heard) |', '|---|---|---|']
    for r in rows:
        probs = '; '.join(f'{i["say"]} → {i["heard"]}' for i in r['issues'][:8]) + (' …' if len(r['issues']) > 8 else '')
        lines.append(f'| `{r["file"]}` | {r["acc"]:.0%} ({r["words"]} words) | {probs or "none"} |')
    open(args.out, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    print('wrote', args.out)


if __name__ == '__main__':
    main()
