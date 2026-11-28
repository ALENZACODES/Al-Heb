"""Round 8 (measure9): per line, the best whole-line take against the version in use, by the same rule as the accuracy
figure (round_report.verdicts). The version in use is measured as rounds 6 and 7 left it (now -> round 5 -> round 6 rebuild
or round 7 clip -> round 7 merge). A take replaces a line only when fewer of its words are unconfirmed.
Torah-service lines (torah-*, haftarah-*) are never given a WaveNet take.

  python m9_compare.py <work dir with now-*, m6-*, m7-*, m9-*> [--apply <takes root>]
"""
import argparse, glob, json, os, re, shutil, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
import round_report as RR, m6_compare as C


def bad(v):
    return sum(not x['ok'] for x in v)


def torah_service(f):
    b = os.path.basename(f)
    return b.startswith('torah-') or b.startswith('haftarah')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('work')
    ap.add_argument('--apply', help='takes root holding takes/m8/...: copy the better takes into audio/ and update meta')
    a = ap.parse_args()
    W = lambda p: sorted(glob.glob(os.path.join(a.work, p)))
    q = {o['file']: o for o in json.load(open(os.path.join(HERE, 'multi4-queue.json'), encoding='utf-8'))}
    now = [C.load(W('now-words*.jsonl'), q), C.load(W('now-phon*.jsonl'), q, True), C.load(W('now-extra*.jsonl'), q)]
    m6 = [C.load(W('m6-words-*.jsonl'), q), C.load(W('m6-phon-*.jsonl'), q, True), C.load(W('m6-extra-*.jsonl'), q)]

    def load7(fns, rescore=False):
        D = {}
        for fn in fns:
            for l in open(fn, encoding='utf-8'):
                r = json.loads(l); f = r['file'][len('takes/m7/'):]
                if rescore and f in q and r.get('ipa') is not None:
                    r = C.phon4.rescore(r, q[f]['want'])
                D.setdefault(f, {})[r['model']] = r
        return D
    m7 = [load7(W('m7-words-*.jsonl')), load7(W('m7-phon-*.jsonl'), True), load7(W('m7-extra-*.jsonl'))]
    r7kept = [f for f in q if os.path.exists(os.path.join(ROOT, f + '.meta.json')) and
              'Round 7' in json.load(open(os.path.join(ROOT, f + '.meta.json'), encoding='utf-8')).get('note', '')]

    def load9(fns, rescore=False):
        D = {}
        for fn in fns:
            for l in open(fn, encoding='utf-8'):
                r = json.loads(l)
                m = re.match(r'takes/m8/(.+)/([^/]+)\.mp3$', r['file'])
                f, tid = m.group(1) + '.mp3', m.group(2)
                if rescore and f in q and r.get('ipa') is not None:
                    r = C.phon4.rescore(r, q[f]['want'])
                D.setdefault(f, {})[r['model']] = r; D[f]['_take'] = tid
        return D
    m9 = [load9(W('m9-words-*.jsonl')), load9(W('m9-phon-*.jsonl'), True), load9(W('m9-extra-*.jsonl'))]

    V = lambda S, k, o: RR.verdicts(o, {m: r for m, r in S[0].get(k, {}).items() if m != '_take'},
                                    {m: r for m, r in S[1].get(k, {}).items() if m != '_take'},
                                    {m: r for m, r in S[2].get(k, {}).items() if m != '_take'}, RR.PHON)
    tot = cur_ok = new_ok = 0; rows = []; wins = []
    for f, o in q.items():
        v = V(now, f, o)
        if 'cur5:' + f in m6[1]:
            v5 = V(m6, 'cur5:' + f, o)
            if bad(v5) <= bad(v): v = v5
        if f in m6[1]:
            vn = V(m6, f, o)
            if bad(vn) < bad(v): v = vn
        if 'r7:' + f in m6[1]:
            vr = V(m6, 'r7:' + f, o)
            if bad(vr) < bad(v): v = vr
        if f in r7kept and f in m7[1]:
            v = V(m7, f, o)
        best = v
        if f in m9[1]:
            tid = m9[1][f]['_take']
            v9 = V(m9, f, o)
            ok = bad(v9) < bad(v) and not (torah_service(f) and tid.startswith('w'))
            rows.append((f, tid, len(v), bad(v), bad(v9), 'replaced' if ok else 'kept'))
            if ok: best = v9; wins.append((f, tid))
        tot += len(v); cur_ok += len(v) - bad(v); new_ok += len(best) - bad(best)
    for r in rows: print(*r)
    print(f'measured lines {len(rows)}; replaced {len(wins)}')
    print(f'in use {cur_ok}/{tot} = {cur_ok / tot:.2%}; with round 8 {new_ok}/{tot} = {new_ok / tot:.2%}')
    if a.apply:
        for f, tid in wins:
            src = os.path.join(a.apply, 'takes', 'm8', f[:-4], tid + '.mp3')
            shutil.copy(src, os.path.join(ROOT, f))
            mp = os.path.join(ROOT, f + '.meta.json')
            mh = json.load(open(mp, encoding='utf-8'))
            voice = {'m': ('he-IL-Wavenet-B', 'he-IL-Chirp3-HD-Charon'), 'f': ('he-IL-Wavenet-A', 'he-IL-Chirp3-HD-Kore')}[f.split('/')[1]]
            for k in ('stitchedFrom', 'stitchedFromText', 'tempo'):
                mh.pop(k, None)
            mh.update({'engine': 'google', 'voiceId': voice[0] if tid.startswith('w') else voice[1],
                       'note': f'Round 8: read whole in one voice ({tid}: pointed{", respelled" if tid.endswith("-rs") else ""}), '
                               f'paced to the natural rate; fewer unconfirmed words in the line checks than the version before.'})
            json.dump(mh, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(len(wins), 'lines replaced')


if __name__ == '__main__':
    main()
