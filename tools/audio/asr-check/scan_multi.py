"""Hear every letter, vowel and syllable clip of the three traditions with three listeners (listeners.py) against the card's own
sound (tradition-expect.json); a clip is right when two of the three hear it. Writes, under --out:
  traditions-multi.jsonl (every hearing), TRADITIONS-MULTI.md (the table and the wrong ones), traditions-multi-wrong.txt.

  python tools/audio/asr-check/scan_multi.py --model /path/to/phoneme-ct2 [--only list.txt] [--out docs/audio]
"""
import argparse, collections, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import scan_traditions as T  # noqa: E402
from listeners import Listeners  # noqa: E402

ROOT = T.S.ROOT


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True)
    ap.add_argument('--only')
    ap.add_argument('--shard', type=int, default=0); ap.add_argument('--shards', type=int, default=1)
    ap.add_argument('--report', nargs='*', help='only build the report from these traditions-multi*.jsonl files')
    ap.add_argument('--out', default=os.path.join(ROOT, 'docs', 'audio'))
    a = ap.parse_args()
    exp = json.load(open(T.EXPECT, encoding='utf-8'))
    paths = sorted(p for p in exp if os.path.exists(os.path.join(ROOT, p)))
    if a.only:
        keep = {l.strip() for l in open(a.only, encoding='utf-8') if l.startswith('audio/')}
        paths = [p for p in paths if p in keep]
    paths = paths[a.shard::a.shards]
    os.makedirs(a.out, exist_ok=True)
    rows = []
    if a.report:
        rows = [json.loads(l) for f in a.report for l in open(f, encoding='utf-8') if l.strip()]
        paths = []
    else:
        L = Listeners(a.model)
    name = 'traditions-multi.jsonl' if a.shards == 1 else f'traditions-multi-{a.shard}.jsonl'
    with open(os.path.join(a.out, name), 'w' if paths else 'a', encoding='utf-8') as f:
        for n, p in enumerate(paths, 1):
            e = exp[p]
            v = L.verdict(os.path.join(ROOT, p), T.say_to_sounds(e['say']))
            r = {'path': p, 'tradition': e['tradition'], 'kind': e['kind'], 'say': e['say'], **v}
            rows.append(r)
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
            if n % 50 == 0:
                print(f'{n}/{len(paths)}', flush=True)
    if a.shards > 1 and not a.report:
        return
    rows.sort(key=lambda r: r['path'])
    t = collections.defaultdict(lambda: [0, 0])
    for r in rows:
        t[(r['tradition'], r['kind'])][0] += 1
        t[(r['tradition'], r['kind'])][1] += r['right']
    md = ['# Letters, Vowels and Syllables: Three Listeners', '',
          'Each clip heard by the Whisper sound model (renikud/whisper-he-ipa), the phoneme model wav2vec2-espeak (three hearings, '
          'majority) and wav2vec2-xlsr-53-espeak (the same); right when two of the three hear the card\'s own sound. A machine check; no person has listened.', '',
          '| tradition | kind | clips | right | wrong | right % |', '|---|---|---|---|---|---|']
    for (tr, k), (n, ok) in sorted(t.items()):
        md.append(f'| {tr} | {k} | {n} | {ok} | {n - ok} | {ok / n * 100:.1f}% |')
    N, OK = len(rows), sum(r['right'] for r in rows)
    md += [f'| **all** | | **{N}** | **{OK}** | **{N - OK}** | **{OK / max(1, N) * 100:.1f}%** |', '', '## Wrong', '',
           '| clip | should say | whisper | wav2vec2 | xlsr-53 |', '|---|---|---|---|---|']
    for r in rows:
        if not r['right']:
            h, c = r['heard'], r['calls']
            mk = lambda ok: '✓' if ok else '✗'
            md.append(f"| `{r['path']}` | {r['say']} | {mk(c['whisper'])} {' / '.join(h['whisper'])} | {mk(c['w2v'])} {' / '.join(h['w2v'])} | {mk(c['xlsr'])} {' / '.join(h['xlsr'])} |")
    open(os.path.join(a.out, 'TRADITIONS-MULTI.md'), 'w', encoding='utf-8').write('\n'.join(md) + '\n')
    open(os.path.join(a.out, 'traditions-multi-wrong.txt'), 'w', encoding='utf-8').write(
        '\n'.join(r['path'] for r in rows if not r['right']) + '\n')
    print('\n'.join(md[:20]))


if __name__ == '__main__':
    main()
