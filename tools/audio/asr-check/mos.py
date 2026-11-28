"""How natural does a clip sound? A predicted listener score (1-5) from UTMOS (tarepan/SpeechMOS, utmos22_strong).
The model was trained on English and other listening tests, not Hebrew: use it to rank takes, not as an absolute.

  python mos.py --root Al-Heb --queue <queue.json> --out /kaggle/working [--shard i --shards n]
Writes mos-<shard>.jsonl: {file, mos}
"""
import argparse, json, os, sys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', required=True); ap.add_argument('--queue', required=True); ap.add_argument('--out', default='.')
    ap.add_argument('--shard', type=int, default=0); ap.add_argument('--shards', type=int, default=1)
    a = ap.parse_args()
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import torch, check_lib as L
    m = torch.hub.load('tarepan/SpeechMOS:v1.2.0', 'utmos22_strong', trust_repo=True).eval()
    q = json.load(open(a.queue, encoding='utf-8'))[a.shard::a.shards]
    with open(os.path.join(a.out, f'mos-{a.shard}.jsonl'), 'a', encoding='utf-8') as f:
        for i, o in enumerate(q, 1):
            w = L.load(os.path.join(a.root, o['file']))
            if len(w) < 1600:
                continue
            with torch.no_grad():
                s = float(m(torch.from_numpy(w.copy()).unsqueeze(0), 16000)[0])
            f.write(json.dumps({'file': o['file'], 'mos': round(s, 3)}) + '\n'); f.flush()
            if i % 50 == 0:
                print(f'[mos {i}/{len(q)}]', flush=True)
    print('mos done', flush=True)


if __name__ == '__main__':
    main()
