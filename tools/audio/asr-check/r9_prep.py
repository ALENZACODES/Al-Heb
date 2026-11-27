"""Round 9: the Torah-service (haftarah blessing) lines recorded whole in Chirp only (chirp_takes.py --lines9).
Each take is judged and paced like any other line (natural.judge: brought to the natural pace, pitch kept), written into
<takes root>/takes/m9c/<file w/o .mp3>/<take>.mp3, and a phonetic queue (measure9c) + 5 notebooks are written.

  python r9_prep.py <raw takes dir (aleph-takes-r9)> <takes root>
"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import natural as N
SHARDS = 5


def main(raw, out_root):
    base = {o['file']: o for o in json.load(open(os.path.join(HERE, 'multi4-queue.json'), encoding='utf-8'))}
    q, notes = [], []
    for it in json.load(open(os.path.join(HERE, 'round9-lines.json'), encoding='utf-8')):
        d = os.path.join(raw, 'l9', it['file'][:-4])
        for tid in ('c9', 'c9-rs', 'c9b', 'c9b-rs'):
            src = os.path.join(d, tid + '.mp3')
            if not os.path.exists(src):
                notes.append(f"{it['file']} {tid}: missing"); continue
            ok, note, p, a, factor = N.judge('line', it['file'], it['text'], src)
            notes.append(f"{it['file']} {tid}: {note}")
            if not ok:
                continue
            rel = os.path.join('takes', 'm9c', it['file'][:-4], tid + '.mp3')
            os.makedirs(os.path.join(out_root, os.path.dirname(rel)), exist_ok=True)
            N.write_mp3(a, os.path.join(out_root, rel), False, factor)
            o = dict(base.get(it['file']) or {'kind': 'sentence', 'want': it['text'], 'voice': None, 'spoken': None,
                                              'prior': 'Torah service, Chirp only'})
            o.update({'file': rel, 'orig': it['file'], 'take': tid})
            q.append(o)
    json.dump(q, open(os.path.join(HERE, 'measure9c-queue.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    open(os.path.join(HERE, 'measure9c-paths.txt'), 'w').write('tools/audio/asr-check/\n' + ''.join(o['file'] + '\n' for o in q))
    for s in range(SHARDS):   # phonetic checks only, like round 8's first pass
        t = open(os.path.join(HERE, f'kaggle_m8p_s{s}.ipynb'), encoding='utf-8').read().replace('measure8', 'measure9c')
        open(os.path.join(HERE, f'kaggle_m9cp_s{s}.ipynb'), 'w', encoding='utf-8').write(t)
    print('\n'.join(notes)); print(len(q), 'takes queued')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
