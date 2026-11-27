"""How often does each sound check wrongly fail a word a person said correctly?
Runs the sound checks on human Hebrew speech with expert IPA (the ILSpeech corpus, Phonikud/ILSpeech on Hugging Face,
used here only to measure the checks; nothing from it is shipped) and scores every word against the expert sounds, the
same way phon4.review2 scores a clip against the expected sounds.

  python calib.py --root Al-Heb --out /kaggle/working --n 150 [--shard i --shards n] [--models renikud,aunikud,lv60,xlsr53,ipa1000]
Writes calib-hearings-<shard>.jsonl: {id, model, ipa, words: [{word, should, match}]} and prints the per-check rates.
"""
import argparse, collections, difflib, glob, json, os, random, re, sys, time


def find_corpus(dest):
    from huggingface_hub import snapshot_download
    d = snapshot_download(repo_id='Phonikud/ILSpeech', repo_type='dataset', local_dir=dest)
    for f in glob.glob(os.path.join(d, '**', '*'), recursive=True):
        if os.path.isfile(f):
            print('corpus file', os.path.relpath(f, d), os.path.getsize(f), flush=True)
    for arc in glob.glob(os.path.join(d, '**', '*.7z'), recursive=True):
        import py7zr
        with py7zr.SevenZipFile(arc) as z:
            z.extractall(os.path.dirname(arc))
    for arc in glob.glob(os.path.join(d, '**', '*.zip'), recursive=True):
        import zipfile
        zipfile.ZipFile(arc).extractall(os.path.dirname(arc))
    for arc in glob.glob(os.path.join(d, '**', '*.tar*'), recursive=True) + glob.glob(os.path.join(d, '**', '*.tgz'), recursive=True):
        import tarfile
        tarfile.open(arc).extractall(os.path.dirname(arc))
    wavs = {os.path.splitext(os.path.basename(f))[0]: f for f in glob.glob(os.path.join(d, '**', '*.wav'), recursive=True)}
    rows = {}
    for f in glob.glob(os.path.join(d, '**', '*'), recursive=True):
        if not os.path.isfile(f) or os.path.getsize(f) > 5e6 or f.endswith('.wav'):
            continue
        try:
            for l in open(f, encoding='utf-8'):
                p = l.rstrip('\n').split('|')
                if len(p) >= 2 and p[0] in wavs and p[0] not in rows:
                    rows[p[0]] = p[1]
        except Exception:
            pass
    print(len(wavs), 'wavs,', len(rows), 'with expert IPA', flush=True)
    return [(i, wavs[i], ipa) for i, ipa in sorted(rows.items())]


def score(gold_ipa, heard_ipa, fold):
    """Per word of the expert transcription: the share of its sounds heard in order (as phon4.review2)."""
    ws = [w for w in gold_ipa.split() if fold(w)]
    exp = [fold(w) for w in ws]
    r_as = lambda s: re.sub(r'(?<=[aeiou])j', 'i', s.replace('g', 'r'))
    got = r_as(fold(heard_ipa).replace(' ', ''))
    exp = [r_as(e) for e in exp]
    target = ''.join(exp)
    sm = difflib.SequenceMatcher(a=target, b=got, autojunk=False)
    hit = [False] * len(target)
    for a0, b0, n in sm.get_matching_blocks():
        for k in range(a0, a0 + n):
            hit[k] = True
    out, pos = [], 0
    for w, e in zip(ws, exp):
        seg = hit[pos:pos + len(e)]; pos += len(e)
        out.append({'word': w, 'should': e, 'match': round(sum(seg) / max(1, len(seg)), 2)})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', required=True); ap.add_argument('--out', default='.')
    ap.add_argument('--n', type=int, default=150)
    ap.add_argument('--models', default='renikud,aunikud,lv60,xlsr53,ipa1000')
    ap.add_argument('--shard', type=int, default=0); ap.add_argument('--shards', type=int, default=1)
    a = ap.parse_args()
    sys.path.insert(0, os.path.join(a.root, 'tools', 'audio', 'asr-check'))
    import phon4, check_lib as L
    rows = find_corpus('/kaggle/temp/ilspeech' if os.path.isdir('/kaggle') else os.path.join(a.out, 'ilspeech'))
    random.Random(7).shuffle(rows)
    rows = rows[:a.n][a.shard::a.shards]
    audio = {i: L.load(w) for i, w, _ in rows}
    res = os.path.join(a.out, f'calib-hearings-{a.shard}.jsonl')
    stats = collections.defaultdict(lambda: [0, 0])
    with open(res, 'a', encoding='utf-8') as f:
        for name in a.models.split(','):
            try:
                h = phon4.Hearer(name)
            except Exception as e:
                print(f'{name} could not load: {e}', flush=True); continue
            for k, (i, _, gold) in enumerate(rows, 1):
                t0 = time.time()
                ipa = h.hear(audio[i])
                ws = score(gold, ipa, phon4.fold2)
                f.write(json.dumps({'id': i, 'model': name, 'ipa': ipa, 'gold': gold, 'words': ws}, ensure_ascii=False) + '\n'); f.flush()
                bad = sum(w['match'] < phon4.WORD_OK for w in ws)
                stats[name][0] += bad; stats[name][1] += len(ws)
                print(f'[{name} {k}/{len(rows)}] {i} words={len(ws)} failed={bad} {time.time() - t0:.1f}s', flush=True)
            del h
            b, n = stats[name]
            print(f'== {name}: wrongly fails {b}/{n} = {b / max(1, n):.1%} of correctly spoken words', flush=True)


if __name__ == '__main__':
    main()
