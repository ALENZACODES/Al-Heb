"""Round report: every problem word, how it should sound (Phonikud, plain Latin letters) and what each check heard.

Word checks (Whisper v3, ivrit-ai, MMS, Seamless): the word each one wrote down where the expected word is.
Phonetic checks (renikud he-ipa, wav2vec2 lv60, xlsr53, ipa1000): the share of the word's sounds heard, and for single
words the sounds themselves.

A word is CONFIRMED when at least 3 of the phonetic checks hear 75% or more of its sounds AND at most one word check
mishears it, or when all four phonetic checks hear it. Accuracy = confirmed words / all words of the clips.

  python round_report.py --words W.jsonl ... --phon P.jsonl ... --queue multi4-queue.json --out ROUND1.md
"""
import argparse, collections, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import multi4_merge as M
import scan_lines as S
import phon4

WORD = ['ivrit-turbo', 'whisper-v3', 'mms-1b', 'seamless-v2']
PHON = ['renikud', 'lv60', 'xlsr53', 'ipa1000']



FIT_OK = 0.5        # forced alignment: mean probability of the word's letters along the path (set from the data)
EXTRA_WORD = ('w2v-he', 'google-chirp_3', 'google-chirp')


def verdicts(o, Wf, Pf, Xf=None, phon_models=None):
    """One verdict per word of the clip (one for a single-word clip), from every check that heard it.

    sound checks  the phonetic checks (75% of the word's sounds) and, when run, forced alignment (fit >= FIT_OK)
    word checks   the four word checks and, when run, the Hebrew wav2vec2 and Google recognizers

    A word is confirmed when every sound check (at least four) hears it, or when all but one of the sound checks hear
    it (at least three) and no more than a third of the word checks (at least one) mishear it."""
    Xf = Xf or {}
    phon_models = phon_models or [m for m in PHON if m in Pf]
    want = M.clean(o['want'])
    words = S.words(want)
    wrong = collections.defaultdict(dict)
    word_models = [m for m in WORD if Wf.get(m)] + [m for m in EXTRA_WORD if Xf.get(m)]
    for m in word_models:
        h = Wf.get(m) or Xf.get(m)
        if o['kind'] == 'word':
            sc = M.score(want, h['heard'])
            sc = 1.0 if sc == 'digits' else (sc or 0.0)
            if sc < M.L.PASS:
                wrong[' '.join(words)][m] = h['heard'] or '(nothing)'
        else:
            _, issues, _ = S.compare(want, h['heard'])
            for i in issues:
                for w in i['say'].split():
                    wrong[w][m] = i['heard']
    pm, should = collections.defaultdict(dict), {}
    for m in phon_models:
        for wd in (Pf.get(m) or {}).get('words', []):
            pm[wd['word']].setdefault(m, wd['match'])
            should.setdefault(wd['word'], wd['should'])
    fit = collections.defaultdict(list)
    for wd in (Xf.get('mms-align') or {}).get('words', []):
        if wd.get('fit') is not None:
            fit[wd['word']].append(wd['fit'])
    out = []
    for u in ([' '.join(words)] if o['kind'] == 'word' else words):
        parts = u.split()
        matches = {m: min(pm[p].get(m, 0) for p in parts) for m in phon_models if all(m in pm[p] for p in parts)}
        votes = [v >= phon4.WORD_OK for v in matches.values()]
        fu = [fit[p].pop(0) for p in parts if fit.get(p)]
        if fu:
            votes.append(min(fu) >= FIT_OK)
        n_s, n_ok = len(votes), sum(votes)
        n_w, n_wrong = len(word_models), len(wrong.get(u, {}))
        ok = bool(votes) and ((n_s >= 4 and n_ok == n_s) or
                              (n_ok >= max(min(3, n_s), n_s - 1) and n_wrong <= max(1, n_w // 3)))
        out.append({'unit': u, 'ok': ok, 'wrong': wrong.get(u, {}), 'matches': matches,
                    'fit': round(min(fu), 2) if fu else None, 'should': ' '.join(should.get(p, '?') for p in parts)})
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--words', nargs='+', required=True)
    ap.add_argument('--phon', nargs='+', required=True)
    ap.add_argument('--queue', required=True)
    ap.add_argument('--extra', nargs='*', default=[], help='extra checks: mms-align, w2v-he, google (extra_checks.py, google_stt.py)')
    ap.add_argument('--files', help='only these recordings (one per line)')
    ap.add_argument('--out', required=True)
    ap.add_argument('--title', default='Round 1')
    a = ap.parse_args()
    q = {o['file']: o for o in json.load(open(a.queue, encoding='utf-8'))}
    keep = None
    if a.files:
        keep = {l.strip() for l in open(a.files, encoding='utf-8') if l.strip().startswith(('audio/', 'takes/'))}
    W = collections.defaultdict(dict)
    for fn in a.words:
        for l in open(fn, encoding='utf-8'):
            r = json.loads(l); W[r['file']][r['model']] = r
    P = collections.defaultdict(dict)
    for fn in a.phon:
        for l in open(fn, encoding='utf-8'):
            r = json.loads(l)
            orig = re.sub(r'^takes/(.+)/[^/]+\.mp3$', r'\1.mp3', r['file'])
            if orig in q and r.get('ipa') is not None:
                r = phon4.rescore(r, q[orig]['want'])          # corrected expected sounds, Israeli R
            P[r['file']][r['model']] = r
    X = collections.defaultdict(dict)
    for fn in a.extra:
        for l in open(fn, encoding='utf-8'):
            r = json.loads(l); X[r['file']][r['model']] = r
    phon_models = [m for m in PHON if any(m in v for v in P.values())]
    files = [f for f in q if (keep is None or f in keep) and f in W]
    total = confirmed = 0
    rows = []
    for f in files:
        o = q[f]
        for v in verdicts(o, W[f], P[f], X.get(f, {}), phon_models):
            total += 1
            confirmed += bool(v['ok'])
            if not v['ok']:
                rows.append({'file': f, 'word': v['unit'], 'should': v['should'], 'words': v['wrong'], 'phon': v['matches'],
                             'fit': v['fit'],
                             'heard_sounds': {m: P[f][m]['heard'] for m in phon_models if m in P[f]} if o['kind'] == 'word' else {}})
    L = [f'# {a.title}: problem words, written by sound', '',
         f'Checks: 4 word checks ({", ".join(WORD)}) and {len(phon_models)} phonetic checks ({", ".join(phon_models)}).',
         'A word is confirmed when at least 3 phonetic checks hear 75% or more of its sounds (all of them if fewer than 3 ran) '
         'and at most one word check mishears it; or when all four phonetic checks hear it (the word checks cannot spell Aramaic or a lone word). '
         'Expected sounds corrected where the converter is wrong (כָּל = kol, dropped syllables), and the Israeli R counts as r. Sounds in plain letters: sh, kh (ח/כ), ts (צ), ch.', '',
         f'Recordings: **{len(files)}**. Words: **{total}**. Confirmed: **{confirmed}** (**{100 * confirmed / max(1, total):.2f}%**). '
         f'Problem words: **{len(rows)}**.', '',
         '| clip | word | should sound | word checks that misheard it (what they wrote) | phonetic checks (share of sounds heard) |',
         '|---|---|---|---|---|']
    for r in rows:
        wtxt = '; '.join(f'{m}: {h}' for m, h in r['words'].items()) or 'none'
        ptxt = '; '.join(f'{m} {v:.0%}' for m, v in r['phon'].items()) or 'no data'
        if r.get('fit') is not None:
            ptxt += f'; mms-align fit {r["fit"]:.2f}'
        if r['heard_sounds']:
            ptxt += ' — heard: ' + '; '.join(f'{m} "{h}"' for m, h in r['heard_sounds'].items())
        L.append(f"| `{r['file'].split('audio/', 1)[-1].replace('/israeli/', '/')}` | {r['word']} | {r['should']} | {wtxt} | {ptxt} |")
    open(a.out, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print('\n'.join(L[:6]))


if __name__ == '__main__':
    main()
