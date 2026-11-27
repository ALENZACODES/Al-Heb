"""Round 7: per word slot, keep whichever clip the line checks confirmed IN THE LINE.

Round 6 rebuilt whole lines from the best single-word takes; measured as lines, about a third came out better and the
rest worse (a word that every check hears alone is not always heard in the line). Here each stitched line is merged
word by word from its two measured versions (the one in git, and the round 6 rebuild, same voice family): a word slot
takes the round 6 clip only where the line in use has it unconfirmed and the rebuilt line has it confirmed. Everything
else stays as it is. The merged lines are joined again (natural pace band) and measured again before they are kept.

  python3 r7_merge.py --r6-meta r6-metas.json --now-* .. --new-* ..   # writes round7-lines.txt, changes audio/
"""
import argparse, difflib, json, os, re, shutil, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '..'))
import round_report as RR, scan_lines as S, multi4_merge as M, stitch_lines as ST, natural as N
import m6_compare as C

NIQ = re.compile(r'[֑-ׇ]')


def token_ok(text, verdicts):
    """Map the verdict units (words split at maqaf) onto the stitch tokens (one clip each): a token is confirmed when
    all its units are."""
    toks = [ST.norm(w) for w in ST.words(text)]
    subs, owner = [], []
    for i, t in enumerate(toks):
        for p in [p for p in t.split('־') if p]:
            subs.append(NIQ.sub('', p)); owner.append(i)
    units = [NIQ.sub('', v['unit']) for v in verdicts]
    ok = [True] * len(toks)
    seen = [False] * len(toks)
    sm = difflib.SequenceMatcher(a=units, b=subs, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            for k in range(i2 - i1):
                o = owner[j1 + k]; seen[o] = True; ok[o] = ok[o] and verdicts[i1 + k]['ok']
    return [ok[i] and seen[i] for i in range(len(toks))]


def stitch_parts(parts, text):
    ws = ST.words(text)
    out = []
    for i, (p, w) in enumerate(zip(parts, ws)):
        out.append(ST.trim(ST.decode(os.path.join(ROOT, p))))
        if i < len(ws) - 1:
            g = ST.VERSE if w.endswith('׃') else ST.COMMA if w.endswith((',', ';', ':')) else ST.GAP
            out.append(ST.np.zeros(int(g * ST.SR), ST.np.float32))
    x = ST.np.concatenate([ST.np.zeros(int(0.12 * ST.SR), ST.np.float32)] + out + [ST.np.zeros(int(0.2 * ST.SR), ST.np.float32)])
    return x * (0.89 / (ST.np.max(ST.np.abs(x)) or 1))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--r6-meta', required=True, help='json {line: meta of its round 6 rebuild}')
    for k in ('now-words', 'now-phon', 'now-extra', 'new-words', 'new-phon', 'new-extra'):
        ap.add_argument('--' + k, nargs='*', default=[])
    a = ap.parse_args()
    q = {o['file']: o for o in json.load(open(os.path.join(HERE, 'multi4-queue.json'), encoding='utf-8'))}
    old = [C.load(a.now_words, q), C.load(a.now_phon, q, True), C.load(a.now_extra, q)]
    new = [C.load(a.new_words, q), C.load(a.new_phon, q, True), C.load(a.new_extra, q)]
    r6 = json.load(open(a.r6_meta, encoding='utf-8'))
    done, report = [], []
    for f, m6 in sorted(r6.items()):
        o = q.get(f)
        if not o or f not in new[1]:
            continue
        mh = json.load(open(os.path.join(ROOT, f + '.meta.json'), encoding='utf-8'))   # the version kept after round 6
        if 'Round 6' in mh.get('note', ''):
            continue
        if mh.get('engine') != 'stitched-from-word-clips' or m6.get('voiceFamily', 'WaveNet') != 'WaveNet' or 'Chirp' in (mh.get('voiceId') or ''):
            continue
        vo = RR.verdicts(o, old[0].get(f, {}), old[1].get(f, {}), old[2].get(f, {}), RR.PHON)
        if 'cur5:' + f in new[1]:
            v5 = RR.verdicts(o, new[0].get('cur5:' + f, {}), new[1].get('cur5:' + f, {}), new[2].get('cur5:' + f, {}), RR.PHON)
            if sum(not v['ok'] for v in v5) <= sum(not v['ok'] for v in vo):
                vo = v5
        vn = RR.verdicts(o, new[0].get(f, {}), new[1].get(f, {}), new[2].get(f, {}), RR.PHON)
        text = mh['stitchedFromText']
        if text != m6['stitchedFromText'] or len(mh['stitchedFrom']) != len(m6['stitchedFrom']):
            continue
        ko, kn = token_ok(text, vo), token_ok(text, vn)
        parts = list(mh['stitchedFrom'])
        swaps = [i for i in range(len(parts)) if not ko[i] and kn[i] and parts[i] != m6['stitchedFrom'][i]]
        if not swaps:
            continue
        for i in swaps:
            parts[i] = m6['stitchedFrom'][i]
        clip = os.path.join(ROOT, f)
        x = stitch_parts(parts, text)
        ST.encode(x, clip)
        meta = dict(mh)
        meta.update({'stitchedFrom': parts, 'note': f'Round 7: {len(swaps)} word clips swapped for ones the line checks confirmed in the round 6 rebuild.'})
        meta.pop('tempo', None)
        a_ = N.decode(clip); s_, _ = N.speech_and_gaps(a_)
        p = N.syllables(re.sub(r'\s*\(cut from:.*\)\s*$', '', meta.get('inputText', text))) / s_ if s_ else N.NATURAL
        lo, hi = N.NATURAL * (1 - N.LINE_BAND) * 1.01, N.NATURAL * (1 + N.LINE_BAND) * 0.99
        if not lo <= p <= hi:
            fac = (lo if p < lo else hi) / p
            tmp = clip + '.tmp.mp3'; N.write_mp3(a_, tmp, False, fac); shutil.move(tmp, clip); meta['tempo'] = round(fac, 3)
        json.dump(meta, open(clip + '.meta.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        done.append(f); report.append((f, len(swaps), sum(not k for k in ko)))
    open(os.path.join(HERE, 'round7-lines.txt'), 'w').write('\n'.join(done) + '\n')
    for f, n, u in report:
        print(f'{f}: {n} of {u} unconfirmed words swapped')
    print(len(done), 'lines merged')


if __name__ == '__main__':
    main()
