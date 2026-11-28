"""Accuracy by the calibrated measure: a word counts as heard right when the Hebrew-trained sound check
(renikud/whisper-he-ipa) hears at least 3/4 of its sounds in order.

Why this check alone: calib.py ran all four sound checks on 150 human Hebrew recordings with expert IPA (ILSpeech,
1,551 words). Share of correctly spoken words each check wrongly failed: renikud 0.8%, lv60 35%, xlsr53 32%,
ipa1000 50%. Under the old rule (all four, or three of four) correct human speech only reaches about 65%.
Caveat: renikud was partly trained on ILSpeech, so 0.8% flatters it.

  python accuracy_he.py <work dir with now-*, m6-*, m7-*, m9d-* hearings> [--list flagged.json]
"""
import contextlib, glob, io, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def main():
    work = sys.argv[1]
    src = open(os.path.join(HERE, 'm9_compare.py')).read()
    src = src.replace("        best = v\n", "        best = v\n        CUR[f]=v\n").replace("def main():", "CUR={}\ndef main():")
    ns = {'__name__': 'm9x', '__file__': os.path.join(HERE, 'm9_compare.py')}
    argv, sys.argv = sys.argv, ['x', work]
    with contextlib.redirect_stdout(io.StringIO()):
        exec(compile(src, 'm9x', 'exec'), ns); ns['main']()
    sys.argv = argv
    CUR, C, RR = ns['CUR'], ns['C'], ns['RR']
    q = {o['file']: o for o in json.load(open(os.path.join(HERE, 'multi4-queue.json'), encoding='utf-8'))}

    def load(pat, rescore=False):       # round 9: the haftarah lines now in use (Chirp)
        D = {}
        for fn in glob.glob(os.path.join(work, pat)):
            for l in open(fn, encoding='utf-8'):
                r = json.loads(l); f = re.match(r'takes/m9c/(.+)/[^/]+\.mp3$', r['file']).group(1) + '.mp3'
                if rescore and f in q and r.get('ipa') is not None:
                    r = C.phon4.rescore(r, q[f]['want'])
                D.setdefault(f, {})[r['model']] = r
        return D
    W, P, X = load('m9d-words-*.jsonl'), load('m9d-phon-*.jsonl', True), load('m9d-extra-*.jsonl')
    for f in P:
        if f in q:
            CUR[f] = RR.verdicts(q[f], W.get(f, {}), P.get(f, {}), X.get(f, {}), RR.PHON)
    he = lambda x: (x['matches'].get('renikud') or 0) >= 0.75
    aram = lambda f: bool(re.search('kaddish|brich', f))
    for name, sel in (('all', lambda f: True), ('Hebrew', lambda f: not aram(f)), ('Aramaic', aram)):
        vs = [x for f, v in CUR.items() if sel(f) for x in v]
        print(f"{name}: {sum(map(he, vs))}/{len(vs)} = {sum(map(he, vs)) / len(vs):.2%} by the Hebrew-trained check"
              f" (old rule {sum(x['ok'] for x in vs) / len(vs):.2%})")
    if '--list' in sys.argv:
        out = {f: [x['unit'] for x in v if not he(x)] for f, v in CUR.items()}
        json.dump({f: w for f, w in out.items() if w}, open(sys.argv[sys.argv.index('--list') + 1], 'w', encoding='utf-8'), ensure_ascii=False, indent=0)


if __name__ == '__main__':
    main()
