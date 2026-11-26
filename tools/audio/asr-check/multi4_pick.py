"""Pick a re-recorded take for each flagged clip from the four-listener hearings, and put it in place.

A take replaces the clip only when the four listeners do better on it than on the clip:
  word      the take is heard right by at least 3 of 4 listeners (and by more than the clip was);
  sentence  fewer words misheard by 3+ listeners than in the clip (then fewer by 2+); never more of either.
Torah lines (torah-*) must also be read at normal pace: only 1.0-speed takes, and within 15% of the clip's length.
Among takes that qualify, the best by the listeners wins; on a tie, Chirp with vowel points first, WaveNet last.

  python multi4_pick.py --clips docs/audio/multi4/multi4-hearings.jsonl --takes t1.jsonl t2.jsonl ... \
      --takes-root /path/with/takes [--apply]
"""
import argparse, collections, datetime, json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import multi4_merge as M   # rescoring (also patches check_lib.score)
import scan_lines as S
import chirp_takes as C
import natural as N
import phon4

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
ORDER = ['c-pt', 'c-pt-ph', 'c-pl', 'c-pl-ph', 'c-pt-90', 'c-pl-90', 'w-pt', 'w-pt-ph']
NAMES = ['ivrit-turbo', 'whisper-v3', 'mms-1b', 'seamless-v2']


def stats(kind, want, hearings):
    """(rank key, summary) for one recording heard by the four listeners; lower key is better."""
    if kind == 'word':
        sc = [M.score(want, h['heard']) for h in hearings]
        sc = [1.0 if s == 'digits' else (s or 0.0) for s in sc]
        n_ok = sum(s >= M.L.PASS for s in sc)
        return (-n_ok, -sum(sc) / max(1, len(sc))), {'ok': n_ok}
    c, accs = collections.Counter(), []
    for h in hearings:
        acc, issues, _ = S.compare(M.clean(want), h['heard'])
        accs.append(acc)
        for w in {i['say'] for i in issues}:
            c[w] += 1
    b3 = sorted(w for w, n in c.items() if n >= 3)
    b2 = sorted(w for w, n in c.items() if n == 2)
    return (len(b3), len(b2), -sum(accs) / max(1, len(accs))), {'b3': b3, 'b2': b2}


def dur(path):
    return float(subprocess.run(['ffprobe', '-v', '0', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                                capture_output=True, text=True).stdout or 0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--clips', default=os.path.join(ROOT, 'docs', 'audio', 'multi4', 'multi4-hearings.jsonl'))
    ap.add_argument('--flagged', default=os.path.join(ROOT, 'docs', 'audio', 'multi4', 'multi4-rerecord.txt'))
    ap.add_argument('--queue', default=os.path.join(HERE, 'multi4-queue.json'))
    ap.add_argument('--takes', nargs='+', required=True)
    ap.add_argument('--takes-root', required=True)
    ap.add_argument('--out', default=os.path.join(ROOT, 'docs', 'audio', 'multi4', 'REPLACEMENTS.md'))
    ap.add_argument('--phon', nargs='*', default=[], help='phon4 hearings (originals and takes): adds the phonetic gate')
    ap.add_argument('--apply', action='store_true')
    a = ap.parse_args()
    q = {o['file']: o for o in json.load(open(a.queue, encoding='utf-8'))}
    flagged = [l.strip() for l in open(a.flagged, encoding='utf-8') if l.startswith('audio/')]
    H = collections.defaultdict(list)
    for l in open(a.clips, encoding='utf-8'):
        r = json.loads(l); H[r['file']].append(r)
    T = collections.defaultdict(lambda: collections.defaultdict(list))
    for fn in a.takes:
        for l in open(fn, encoding='utf-8'):
            r = json.loads(l)
            m = re.match(r'takes/(.+)/([^/]+)\.mp3$', r['file'])
            T[m.group(1) + '.mp3'][m.group(2)].append(r)
    ref = {}
    for g in ('f', 'm'):
        ps = [N.pace(os.path.join(ROOT, k), v['want']) for k, v in q.items() if v['kind'] == 'sentence' and k.split('/')[1] == g and k not in flagged and not N.is_torah(k)]
        ref[g] = N.line_reference([x for x in ps if x])
    PH = collections.defaultdict(dict)
    for fn in a.phon:
        for l in open(fn, encoding='utf-8'):
            r = json.loads(l)
            orig = re.sub(r'^takes/(.+)/[^/]+\.mp3$', r'\1.mp3', r['file'])
            if orig in q and r.get('ipa') is not None:
                r = phon4.rescore(r, q[orig]['want'])          # corrected expected sounds, Israeli R
            PH[r['file']][r['model']] = {w['word']: w['match'] for w in r['words']}

    def phon_ok(path):
        """{word: number of phonetic checks hearing >=75% of its sounds}, or None without data"""
        d = PH.get(path)
        if not d:
            return None
        out = collections.Counter()
        for m, ws in d.items():
            for w, v in ws.items():
                out[w] += v >= 0.75
        return out, len(d)
    rows, now = [], datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    for f in flagged:
        o = q[f]
        key0, s0 = stats(o['kind'], o['want'], H[f])
        torah = '/torah-' in f or os.path.basename(f).startswith('torah-')
        d0 = dur(os.path.join(ROOT, f)) if torah else 0
        cands, notes = [], []
        for tid, hs in T[f].items():
            if len({h['model'] for h in hs}) < 4:
                notes.append(f'{tid}: not heard by all four'); continue
            key, s = stats(o['kind'], o['want'], hs)
            src = os.path.join(a.takes_root, 'takes', f[:-4], tid + '.mp3')
            if torah and tid.endswith('-90'):
                notes.append(f'{tid}: slowed, not used for Torah'); continue
            ok_nat, why, _, prep, factor = N.judge(o['kind'], f, o['want'], src, ref.get(f.split('/')[1]))
            if not ok_nat:
                notes.append(f'{tid}: {why}'); continue
            if o['kind'] == 'word':
                good = s['ok'] >= 3 and s['ok'] > s0['ok']
                pt4 = phon_ok('takes/' + f[:-4] + '/' + tid + '.mp3') if PH else None
                po4 = phon_ok(f) if PH else None
                # said alone, a word the word checks cannot place: all four phonetic checks hearing it is enough,
                # if they did not all hear the clip it replaces
                if not good and pt4 and pt4[1] >= 4 and all(v == pt4[1] for v in pt4[0].values()) and not (
                        po4 and po4[1] >= 4 and all(v == po4[1] for v in po4[0].values())):
                    good = True
            else:
                good = key[:2] < key0[:2] and len(s['b3']) <= len(s0['b3']) and len(s['b2']) <= len(s0['b2']) + len(s0['b3'])
            if good and PH:
                po, pt_ = phon_ok(f), phon_ok('takes/' + f[:-4] + '/' + tid + '.mp3')
                if pt_ is None:
                    good = False; notes.append(f'{tid}: no phonetic hearing yet')
                else:
                    cnt, n = pt_
                    need = min(3, n)
                    probs = set(s0.get('b3', []) + s0.get('b2', [])) if o['kind'] == 'sentence' else set(cnt)
                    probs = {w for w in probs if not w.startswith('(')}     # '(nothing)': an extra word heard, not a word of the text
                    weak = [w for w in probs if cnt.get(w, 0) < need]
                    tot_t = sum(v >= need for v in cnt.values())
                    tot_o = sum(v >= min(3, po[1]) for v in po[0].values()) if po else 0
                    if weak or tot_t < tot_o:
                        good = False
                        notes.append(f'{tid}: phonetic checks: ' + (('weak ' + ' '.join(sorted(weak))) if weak else f'{tot_t} words heard vs {tot_o} in the clip'))
                    else:
                        s = dict(s, phon=f'{tot_t}/{len(cnt)} words by >={need} of {n} phonetic checks')
            if good:
                cands.append((key, ORDER.index(tid) if tid in ORDER else 99, tid, s, src, prep, factor))
        cands.sort()
        row = {'file': f, 'kind': o['kind'], 'before': s0, 'notes': notes}
        if cands:
            key, _, tid, s, src, prep, factor = cands[0]
            row.update(take=tid, after=s)
            if a.apply:
                dst = os.path.join(ROOT, f)
                N.write_mp3(prep, dst, torah, factor)   # Torah: verse format at the verse pace; others: lesson format
                mp = dst + '.meta.json'
                meta = json.load(open(mp, encoding='utf-8')) if os.path.exists(mp) else {}
                g = f.split('/')[1]
                chirp, wavenet = C.VOICES[g]
                voice = wavenet if tid.startswith('w-') else chirp if tid.startswith('c-') else C.ALT[g][int(tid[1])]
                text = {'c-km': C.ktiv_male(C.speakable(M.clean(o['want']))), 'c-kmpl': C.plain(C.ktiv_male(C.speakable(M.clean(o['want']))))}.get(tid) or (C.plain(M.clean(o['want'])) if '-pl' in tid else C.ktiv_male(C.speakable(M.clean(o['want']))) if tid.endswith('-km') else C.speakable(M.clean(o['want'])))
                meta.update(status='tts', source='tts:google', engine='google', voiceId=voice,
                            tradition='israeli', inputText=M.clean(o['want']), spokenText=text, renderedAt=now,
                            speakingRate=0.9 if tid.endswith('-90') else 1.0,
                            checkedBy='four-listener ASR check (docs/audio/multi4), machine check only')
                json.dump(meta, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        rows.append(row)

    def fmt(kind, s):
        ph = f" ({s['phon']})" if s.get('phon') else ''
        return (f"{s['ok']}/4 heard right" + ph) if kind == 'word' else ph + (
            ('3+ mishear: ' + ' '.join(s['b3']) if s['b3'] else 'none 3+') + ('; 2 mishear: ' + ' '.join(s['b2']) if s['b2'] else ''))
    rep = [r for r in rows if 'take' in r]
    L = ['# Re-recorded clips (four-listener check)', '',
         f'Flagged for re-record: **{len(rows)}**. Replaced with a take the four listeners heard better: **{len(rep)}**. '
         f'Left as they were (no take did better): **{len(rows) - len(rep)}**.', '',
         'Takes: Chirp 3 HD (Kore female, Charon male) with and without vowel points, 0.9 speed for single words, and WaveNet as a fallback. '
         'Torah lines only at normal speed and within 15% of the original length. A machine check, not a teacher\'s approval.', '',
         '| clip | take | before | after |', '|---|---|---|---|']
    for r in rows:
        L.append(f"| `{r['file']}` | {r.get('take', 'kept')} | {fmt(r['kind'], r['before'])} | "
                 f"{fmt(r['kind'], r['after']) if 'after' in r else '; '.join(r['notes'][:3]) or 'no take did better'} |")
    open(a.out, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print('\n'.join(L[:4]))


if __name__ == '__main__':
    main()
