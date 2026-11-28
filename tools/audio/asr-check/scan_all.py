"""The Hebrew-trained sound check (renikud/whisper-he-ipa) over every clip of a queue, on a GPU, in batches.
Writes scan-<shard>.jsonl: {file, ipa}. Scoring is done afterwards (phon4.rescore against the wanted text).

  python scan_all.py --root Al-Heb --queue <queue.json> --out /kaggle/working [--shard i --shards n] [--batch 24]
"""
import argparse, json, os, sys, time
import numpy as np


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', required=True); ap.add_argument('--queue', required=True); ap.add_argument('--out', default='.')
    ap.add_argument('--shard', type=int, default=0); ap.add_argument('--shards', type=int, default=1)
    ap.add_argument('--batch', type=int, default=24)
    a = ap.parse_args()
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import torch, phon4, check_lib as L
    from transformers import WhisperProcessor, WhisperForConditionalGeneration
    dev = 'cuda' if torch.cuda.is_available() else 'cpu'
    mid = phon4.WHISPER_IPA['renikud'][0]
    p = WhisperProcessor.from_pretrained(mid)
    m = WhisperForConditionalGeneration.from_pretrained(mid, torch_dtype=torch.float16 if dev == 'cuda' else torch.float32).to(dev).eval()
    print('device', dev, flush=True)
    q = json.load(open(a.queue, encoding='utf-8'))[a.shard::a.shards]
    res = os.path.join(a.out, f'scan-{a.shard}.jsonl')
    done = {json.loads(l)['file'] for l in open(res, encoding='utf-8')} if os.path.exists(res) else set()
    q = [o for o in q if o['file'] not in done]
    fix = lambda t: [t := t.replace(s, d) for s, d in [('dZ', 'dʒ'), ('tS', 'tʃ'), ('S', 'ʃ'), ('Z', 'ʒ'), ('q', 'ʔ'), ("'", 'ˈ'), ('r', 'ʁ'), ('x', 'χ'), ('g', 'ɡ')]][-1]

    def hear(waves, cap):
        x = p(waves, sampling_rate=16000, return_tensors='pt').input_features.to(dev, m.dtype)
        with torch.inference_mode():
            ids = m.generate(x, max_new_tokens=cap)
        return [fix(t).strip() for t in p.batch_decode(ids, skip_special_tokens=True)]
    pad = lambda w: np.concatenate([np.zeros(4000, np.float32), w, np.zeros(8000, np.float32)])
    t0 = time.time(); n = 0
    with open(res, 'a', encoding='utf-8') as f:
        for i in range(0, len(q), a.batch):
            items = []
            for o in q[i:i + a.batch]:
                try:
                    items.append((o, pad(L.load(os.path.join(a.root, o['file'])))))
                except Exception as e:
                    print('  cannot read', o['file'], str(e)[:80], flush=True)
            short = [(o, w) for o, w in items if len(w) <= 28 * 16000]
            if short:
                cap = min(440, int(12 + 22 * max(len(w) for _, w in short) / 16000))
                for (o, _), t in zip(short, hear([w for _, w in short], cap)):
                    f.write(json.dumps({'file': o['file'], 'ipa': t}, ensure_ascii=False) + '\n')
            for o, w in items:
                if len(w) > 28 * 16000:
                    t = ' '.join(hear([c], 440)[0] for c in phon4.chunks(w))
                    f.write(json.dumps({'file': o['file'], 'ipa': t}, ensure_ascii=False) + '\n')
            f.flush(); n += len(items)
            if (i // a.batch) % 20 == 0:
                print(f'[scan {n}/{len(q)}] {time.time() - t0:.0f}s', flush=True)
    print('scan done', n, flush=True)


if __name__ == '__main__':
    main()
