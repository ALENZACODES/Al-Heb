"""Full word check on a GPU (Kaggle notebook): every Israeli word, builder and dictionary recording heard once, one clip at a
time, by the Hebrew speech-to-text model, and scored with the same rules as scan.py (check_lib.score).

The scan on a laptop CPU takes about a second a clip; the dictionary alone is over 7,000 recordings and had never been
checked. On a Kaggle T4 the whole set takes minutes.

Notebook cell (Internet on, GPU on):
  !git clone -q --depth 1 --filter=blob:none --sparse -b <branch> https://github.com/ALENZACODES/Al-Heb.git
  !cd Al-Heb && git sparse-checkout set tools/audio/asr-check data/vocab audio/builder audio/f/israeli/word audio/m/israeli/word audio/f/israeli/dictionary audio/m/israeli/dictionary
  !python Al-Heb/tools/audio/asr-check/kaggle_scan.py --out /kaggle/working

Model: ivrit-ai/whisper-large-v3-turbo (the same weights scan.py uses through faster-whisper, here run with transformers,
beam 5). Decoding is not bit-identical to the CPU run, so a clip near the pass mark can land on the other side.
Output: results-gpu.jsonl (file, what was heard), flagged-gpu.csv, summary-gpu.json. A machine check.
"""
import argparse, collections, csv, json, os, subprocess, sys, time

sys.path.insert(0, os.path.dirname(__file__))
import numpy as np  # noqa: E402
import check_lib as L  # noqa: E402
import scan as S  # noqa: E402


def load(path):
    a = L.load(path)
    return np.concatenate([np.zeros(L.SR // 4, np.float32), a, np.zeros(L.SR // 2, np.float32)])   # as check_lib.hear pads


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='.')
    ap.add_argument('--kinds', default='word,builder,dictionary')
    ap.add_argument('--batch', type=int, default=24)
    ap.add_argument('--limit', type=int)
    a = ap.parse_args()
    import torch
    from transformers import WhisperForConditionalGeneration, WhisperProcessor
    dev = 'cuda' if torch.cuda.is_available() else 'cpu'
    dtype = torch.float16 if dev == 'cuda' else torch.float32
    name = 'ivrit-ai/whisper-large-v3-turbo'
    proc = WhisperProcessor.from_pretrained(name)
    model = WhisperForConditionalGeneration.from_pretrained(name, torch_dtype=dtype).to(dev).eval()
    print('device', dev, flush=True)

    jobs = S.jobs(tuple(a.kinds.split(',')))
    if a.limit:
        jobs = jobs[:a.limit]
    print('recordings', len(jobs), dict(collections.Counter(j['kind'] for j in jobs)), flush=True)
    os.makedirs(a.out, exist_ok=True)
    res_path = os.path.join(a.out, 'results-gpu.jsonl')
    done = {json.loads(l)['file'] for l in open(res_path, encoding='utf-8')} if os.path.exists(res_path) else set()
    todo = [j for j in jobs if j['file'] not in done]
    t0 = time.time()
    with open(res_path, 'a', encoding='utf-8') as out:
        for i in range(0, len(todo), a.batch):
            part = todo[i:i + a.batch]
            audio = [load(os.path.join(S.ROOT, j['file'])) for j in part]
            feats = proc(audio, sampling_rate=L.SR, return_tensors='pt', return_attention_mask=True)
            with torch.no_grad():
                ids = model.generate(feats.input_features.to(dev, dtype), attention_mask=feats.attention_mask.to(dev),
                                     language='he', task='transcribe', num_beams=5, max_new_tokens=48)
            for j, text in zip(part, proc.batch_decode(ids, skip_special_tokens=True)):
                out.write(json.dumps({'file': j['file'], 'asr': text.strip(), 'mode': 'gpu'}, ensure_ascii=False) + '\n')
            out.flush()
            if (i // a.batch) % 20 == 0:
                print(f'{i + len(part)}/{len(todo)}  {time.time() - t0:.0f}s', flush=True)

    heard = {json.loads(l)['file']: json.loads(l)['asr'] for l in open(res_path, encoding='utf-8')}
    order = ['fail', 'unheard', 'borderline', 'number', 'pass']
    tab = collections.defaultdict(collections.Counter)
    flagged = []
    for j in jobs:
        s = L.score(j['he'], heard.get(j['file'], ''))
        v = 'unheard' if s is None else 'number' if s == 'digits' else 'pass' if s >= L.PASS else 'borderline' if s >= L.FLAG else 'fail'
        tab[j['kind']][v] += 1
        if v in ('fail', 'unheard', 'borderline'):
            flagged.append((v, s if isinstance(s, float) else '', j['kind'], j['he'], heard.get(j['file'], ''), j['file'], len(j['paths'])))
    flagged.sort(key=lambda r: (order.index(r[0]), r[1] if r[1] != '' else -1))
    with open(os.path.join(a.out, 'flagged-gpu.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['verdict', 'score', 'kind', 'pointed_hebrew', 'heard', 'file', 'same_audio_files'])
        w.writerows(flagged)
    summary = {k: dict(c) for k, c in tab.items()}
    commit = subprocess.run(['git', '-C', S.ROOT, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
    json.dump({'commit': commit, 'model': name, 'device': dev, 'recordings': len(jobs), 'by_kind': summary},
              open(os.path.join(a.out, 'summary-gpu.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('SUMMARY', json.dumps(summary, ensure_ascii=False))
    for k, c in sorted(tab.items()):
        n = sum(c.values())
        print(f"{k}: {n} recordings, pass {c['pass']} ({c['pass'] / max(1, n):.1%}), number {c['number']}, borderline {c['borderline']}, fail {c['fail']}, unheard {c['unheard']}")
    print('FLAGGED', len(flagged))
    for r in flagged:
        print('|'.join(str(x) for x in r))


if __name__ == '__main__':
    main()
