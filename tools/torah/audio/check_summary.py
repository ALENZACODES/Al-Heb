"""Three checks on every Hebrew Torah verse clip, from the check_shard.py results:
  1 words   ivrit-ai Whisper hears every word of the verse (no word issues)
  2 sounds  the sound model (renikud/whisper-he-ipa) hears every word's sounds (no word under 0.6)
  3 pace    the speech runs within 12% of the target pace (pace.py TARGET, syllables a second of speech)
A clip passes only when all three pass. Writes the failing clip paths to --fails and prints the counts.
  python tools/torah/audio/check_summary.py shard-*.jsonl --fails fails.txt [--md report.md]
"""
import argparse, collections, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ipa'))
import pace as PACE

BAND = 0.12


def judge(r):
    c = {'words': not r.get('word_issues'), 'sounds': not r.get('sound_weak'),
         'pace': r.get('pace') is not None and abs(r['pace'] / PACE.TARGET - 1) <= BAND}
    return c, all(c.values())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('files', nargs='+')
    ap.add_argument('--fails', required=True)
    ap.add_argument('--md')
    a = ap.parse_args()
    rows = {}
    for f in a.files:
        for l in open(f, encoding='utf-8'):
            if l.strip():
                r = json.loads(l); rows[r['file']] = r
    tally, fails, by = collections.Counter(), [], collections.defaultdict(lambda: [0, 0])
    for p, r in sorted(rows.items()):
        c, ok = judge(r)
        for k, v in c.items():
            tally[k] += v
        book = p.split('/')[-1].split('-')[1]
        by[book][0] += 1; by[book][1] += ok
        if not ok:
            fails.append((p, c, r))
    n = len(rows)
    lines = [f'clips checked: {n}', f"words right: {tally['words']}", f"sounds right: {tally['sounds']}", f"pace right: {tally['pace']}",
             f'all three right: {n - len(fails)} ({(n - len(fails)) / max(1, n) * 100:.2f}%)']
    lines += [f'  {b}: {ok} of {t}' for b, (t, ok) in sorted(by.items())]
    print('\n'.join(lines))
    open(a.fails, 'w', encoding='utf-8').write('\n'.join(p for p, _, _ in fails) + ('\n' if fails else ''))
    if a.md:
        md = ['| clip | words | sounds | pace | heard | weak |', '|---|---|---|---|---|---|']
        for p, c, r in fails:
            mk = lambda x: '✓' if x else '✗'
            md.append(f"| `{p}` | {mk(c['words'])} | {mk(c['sounds'])} | {mk(c['pace'])} {r.get('pace')} | {', '.join(r.get('word_issues', []))[:80]} | {', '.join(r.get('sound_weak', []))[:80]} |")
        open(a.md, 'w', encoding='utf-8').write('\n'.join(lines) + '\n\n' + '\n'.join(md) + '\n')


if __name__ == '__main__':
    main()
