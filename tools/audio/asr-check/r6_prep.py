"""Round 6 after recording: cut the carrier takes, write the Kaggle queue (every take plus the clip in use now) and
5 notebooks (phonetic checks + Hebrew wav2vec2, sharded 5 ways).

  python r6_prep.py <dir holding takes/w6>      # e.g. /home/claude/work/r6x (with takes/w6/<g>/<slug>/*.mp3)
"""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
SHARDS = 5


def main(root):
    subprocess.run([sys.executable, os.path.join(HERE, 'carrier_cut.py'), os.path.join(root, 'takes', 'w6')], check=True,
                   stdout=subprocess.DEVNULL)
    items = json.load(open(os.path.join(HERE, 'round6-words.json'), encoding='utf-8'))['items']
    q, seen = [], set()
    for key, it in sorted(items.items()):
        d = os.path.join(root, 'takes', 'w6', it['g'], it['slug'])
        for tid in ('w', 'w-car-cut', 'w-rs', 'c', 'c-car-cut', 'c-rs'):
            p = os.path.join(d, tid + '.mp3')
            if os.path.exists(p) and os.path.getsize(p) > 1500:
                q.append({'file': f'takes/w6/{it["g"]}/{it["slug"]}/{tid}.mp3', 'kind': 'word', 'want': it['word'], 'key': key, 'take': tid})
        cur = it.get('current')
        if cur and cur not in seen:   # the clip the lines use now, heard alone
            seen.add(cur)
            q.append({'file': cur, 'kind': 'word', 'want': it['word'], 'key': key, 'take': 'cur'})
    json.dump(q, open(os.path.join(HERE, 'round6w-queue.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    open(os.path.join(HERE, 'round6w-paths.txt'), 'w', encoding='utf-8').write(
        'tools/audio/asr-check/\n' + ''.join(o['file'] + '\n' for o in q))
    tpl = json.load(open(os.path.join(HERE, 'kaggle_r5w_s0.ipynb'), encoding='utf-8'))
    for s in range(SHARDS):
        nb = json.loads(json.dumps(tpl))
        for c in nb['cells']:
            src = ''.join(c['source']).replace('round5w', 'round6w').replace('Round 5', 'Round 6')
            src = re.sub(r'--shard 0 --shards 3', f'--shard {s} --shards {SHARDS}', src)
            c['source'] = src.splitlines(True)
            if 'outputs' in c:
                c['outputs'] = []
        json.dump(nb, open(os.path.join(HERE, f'kaggle_r6w_s{s}.ipynb'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(q), 'clips to check;', sum(o['take'] == 'cur' for o in q), 'of them in use now')


if __name__ == '__main__':
    main(sys.argv[1])
