"""Round report: every problem word, how it should sound (Phonikud, plain Latin letters) and what each check heard.

Word checks (Whisper v3, ivrit-ai, MMS, Seamless): the word each one wrote down where the expected word is.
Phonetic checks (renikud he-ipa, wav2vec2 lv60, xlsr53, ipa1000): the share of the word's sounds heard, and for single
words the sounds themselves.

A word is CONFIRMED when at least 3 of the phonetic checks hear 75% or more of its sounds AND at most one word check
mishears it, or (a single word said alone) when all four phonetic checks hear it. Accuracy = confirmed words / all words of the clips.

  python round_report.py --words W.jsonl ... --phon P.jsonl ... --queue multi4-queue.json --out ROUND1.md
"""
import argparse, collections, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import multi4_merge as M
import scan_lines as S
import phon4

WORD = ['ivrit-turbo', 'whisper-v3', 'mms-1b', 'seamless-v2']
PHON = ['renikud', 'lv60', 'xlsr53', 'ipa1000']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--words', nargs='+', required=True)
    ap.add_argument('--phon', nargs='+', required=True)
    ap.add_argument('--queue', required=True)
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
    phon_models = [m for m in PHON if any(m in v for v in P.values())]
    files = [f for f in q if (keep is None or f in keep) and f in W]
    total = confirmed = 0
    rows = []
    for f in files:
        o = q[f]
        want = M.clean(o['want'])
        words = S.words(want)
        # word checks: which expected words each model got wrong, and what it heard there
        wrong = collections.defaultdict(dict)
        for m in WORD:
            h = W[f].get(m)
            if not h:
                continue
            if o['kind'] == 'word':
                s = M.score(want, h['heard'])
                s = 1.0 if s == 'digits' else (s or 0.0)
                if s < M.L.PASS:
                    wrong[' '.join(words)][m] = h['heard'] or '(nothing)'
            else:
                _, issues, _ = S.compare(want, h['heard'])
                for i in issues:
                    for w in i['say'].split():
                        wrong[w][m] = i['heard']
        # phonetic checks: per-word share of sounds heard
        pm = collections.defaultdict(dict)
        should = {}
        for m in phon_models:
            h = P[f].get(m)
            if not h:
                continue
            for wd in h['words']:
                pm[wd['word']].setdefault(m, wd['match'])
                should.setdefault(wd['word'], wd['should'])
        units = [' '.join(words)] if o['kind'] == 'word' else words
        for u in units:
            total += 1
            parts = u.split()
            matches = {m: min(pm[p].get(m, 0) for p in parts) for m in phon_models if all(m in pm[p] for p in parts)}
            n_phon = sum(v >= phon4.WORD_OK for v in matches.values())
            n_wrong = len(wrong.get(u, {})) if o['kind'] == 'word' else len(wrong.get(u, {}))
            # a single word said alone: the word checks are language models with no sentence to lean on, so all
            # four phonetic checks agreeing is enough on its own
            alone = o['kind'] == 'word' and len(matches) >= 4 and n_phon == len(matches)
            ok = matches and (alone or (n_phon >= min(3, len(matches)) and n_wrong <= 1))
            confirmed += bool(ok)
            if not ok:
                rows.append({'file': f, 'word': u, 'should': ' '.join(should.get(p, '?') for p in parts),
                             'words': wrong.get(u, {}), 'phon': matches,
                             'heard_sounds': {m: P[f][m]['heard'] for m in phon_models if m in P[f]} if o['kind'] == 'word' else {}})
    L = [f'# {a.title}: problem words, written by sound', '',
         f'Checks: 4 word checks ({", ".join(WORD)}) and {len(phon_models)} phonetic checks ({", ".join(phon_models)}).',
         'A word is confirmed when at least 3 phonetic checks hear 75% or more of its sounds (all of them if fewer than 3 ran) '
         'and at most one word check mishears it; a single word said alone is also confirmed when all four phonetic checks hear it. '
         'Expected sounds corrected where the converter is wrong (כָּל = kol, dropped syllables), and the Israeli R counts as r. Sounds in plain letters: sh, kh (ח/כ), ts (צ), ch.', '',
         f'Recordings: **{len(files)}**. Words: **{total}**. Confirmed: **{confirmed}** (**{100 * confirmed / max(1, total):.2f}%**). '
         f'Problem words: **{len(rows)}**.', '',
         '| clip | word | should sound | word checks that misheard it (what they wrote) | phonetic checks (share of sounds heard) |',
         '|---|---|---|---|---|']
    for r in rows:
        wtxt = '; '.join(f'{m}: {h}' for m, h in r['words'].items()) or 'none'
        ptxt = '; '.join(f'{m} {v:.0%}' for m, v in r['phon'].items()) or 'no data'
        if r['heard_sounds']:
            ptxt += ' — heard: ' + '; '.join(f'{m} "{h}"' for m, h in r['heard_sounds'].items())
        L.append(f"| `{r['file'].split('/israeli/')[-1]}` | {r['word']} | {r['should']} | {wtxt} | {ptxt} |")
    open(a.out, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print('\n'.join(L[:6]))


if __name__ == '__main__':
    main()
