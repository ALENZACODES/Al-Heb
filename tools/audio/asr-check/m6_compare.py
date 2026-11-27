"""Round 6: per line, the rebuilt clip against the one in use, by the same rule as the accuracy figure (round_report.verdicts).
A rebuilt line is kept only when fewer of its words are unconfirmed; otherwise the line in use is put back (git).
Prints the accuracy over every clip of multi4-queue.json with the better of the two for each line.

  python m6_compare.py --now-words .. --now-phon .. --now-extra .. --new-words .. --new-phon .. --new-extra .. [--revert]
"""
import argparse, collections, json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
import round_report as RR, phon4


def load(fns, q, rescore=False):
    D = collections.defaultdict(dict)
    for fn in fns:
        for l in open(fn, encoding='utf-8'):
            r = json.loads(l)
            f = re.sub(r'^takes/m6/', '', r['file'])
            if r['file'].startswith('takes/r7/'):
                f = 'r7:' + r['file'][len('takes/r7/'):]
            if r['file'].startswith('takes/m6cur/'):
                f = 'cur5:' + r['file'][len('takes/m6cur/'):]
            g = f.split(':', 1)[-1]
            if rescore and g in q and r.get('ipa') is not None:
                r = phon4.rescore(r, q[g]['want'])
            D[f][r['model']] = r
    return D


def main():
    ap = argparse.ArgumentParser()
    for k in ('now-words', 'now-phon', 'now-extra', 'new-words', 'new-phon', 'new-extra'):
        ap.add_argument('--' + k, nargs='*', default=[])
    ap.add_argument('--revert', action='store_true', help='put back (git checkout) the lines whose rebuild is not better')
    ap.add_argument('--out', default=os.path.join(ROOT, 'docs', 'audio', 'multi4', 'ROUND6-MEASURE.md'))
    a = ap.parse_args()
    q = {o['file']: o for o in json.load(open(os.path.join(HERE, 'multi4-queue.json'), encoding='utf-8'))}
    old = [load(a.now_words, q), load(a.now_phon, q, True), load(a.now_extra, q)]
    new = [load(a.new_words, q), load(a.new_phon, q, True), load(a.new_extra, q)]
    models = [m for m in RR.PHON]
    tot = conf_old = conf_best = 0
    rows, revert, use_r7 = [], [], []
    for f, o in q.items():
        src = old
        if 'cur5:' + f in new[1]:
            src = [{f: new[i].get('cur5:' + f, {})} for i in range(3)]
        vo = RR.verdicts(o, src[0].get(f, {}), src[1].get(f, {}), src[2].get(f, {}), models)
        uo = sum(not v['ok'] for v in vo)
        best = vo
        if f in new[1]:
            vn = RR.verdicts(o, new[0].get(f, {}), new[1].get(f, {}), new[2].get(f, {}), models)
            un = sum(not v['ok'] for v in vn)
            keep = un < uo
            rows.append((f, len(vo), uo, un, 'rebuilt' if keep else 'kept as was'))
            if keep:
                best = vn
            else:
                revert.append(f)
        if 'r7:' + f in new[1]:           # older round 7 word clip
            vr = RR.verdicts(o, new[0].get('r7:' + f, {}), new[1].get('r7:' + f, {}), new[2].get('r7:' + f, {}), models)
            ur = sum(not v['ok'] for v in vr)
            ub = sum(not v['ok'] for v in best)
            rows.append((f + ' (round 7 clip)', len(vr), ub, ur, 'round 7 clip used' if ur < ub else 'not better'))
            if ur < ub:
                best = vr; use_r7.append(f)
        tot += len(vo); conf_old += len(vo) - uo; conf_best += sum(v['ok'] for v in best)
    L = ['# Round 6: rebuilt lines measured', '',
         f'All words of the {len(q)} checked clips: confirmed before **{conf_old}/{tot} ({conf_old / tot:.2%})**, '
         f'after **{conf_best}/{tot} ({conf_best / tot:.2%})**.', '',
         '| line | words | unconfirmed before | unconfirmed rebuilt | result |', '|---|---|---|---|---|']
    L += [f'| {f.replace("audio/", "")} | {n} | {uo} | {un} | {r} |' for f, n, uo, un, r in rows]
    open(a.out, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print(f'before {conf_old}/{tot} = {conf_old / tot:.2%}; after {conf_best}/{tot} = {conf_best / tot:.2%}; '
          f'{len(rows) - len(revert)} lines rebuilt, {len(revert)} put back')
    if a.revert:
        r7 = {c['orig']: c['branch'] for c in json.load(open(os.path.join(HERE, 'round7-candidates.json')))}
        for f in use_r7:
            for p in (f, f + '.meta.json'):
                data = subprocess.run(['git', '-C', ROOT, 'show', f'origin/{r7[f]}:{p}'], capture_output=True).stdout
                if data:
                    open(os.path.join(ROOT, p), 'wb').write(data)
        print(len(use_r7), 'round 7 clips put in')
    if a.revert and revert:
        subprocess.run(['git', '-C', ROOT, 'checkout', 'HEAD', '--'] + [p for f in revert for p in (f, f + '.meta.json')], check=True)


if __name__ == '__main__':
    main()
