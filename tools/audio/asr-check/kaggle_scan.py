"""Full word check on a GPU (Kaggle notebook): every Israeli word, builder and dictionary recording heard twice (with different
silence around it), by the Hebrew speech-to-text model, and scored with the same rules as scan.py (check_lib.score).

The scan on a laptop CPU takes about a second a clip; the dictionary alone is over 7,000 recordings and had never been
checked. On a Kaggle T4 the whole set takes minutes.

Notebook cell (Internet on, GPU on):
  !git clone -q --depth 1 --filter=blob:none --sparse -b <branch> https://github.com/ALENZACODES/Al-Heb.git
  !cd Al-Heb && git sparse-checkout set tools/audio/asr-check data/vocab audio/builder audio/f/israeli/word audio/m/israeli/word audio/f/israeli/dictionary audio/m/israeli/dictionary
  !python Al-Heb/tools/audio/asr-check/kaggle_scan.py --out /kaggle/working

Model: ivrit-ai/whisper-large-v3-turbo (the same weights scan.py uses through faster-whisper, here run with transformers,
beam 5). Decoding is not bit-identical to the CPU run, so a clip near the pass mark can land on the other side.
A recording counts as right only when both hearings pass. Two GPUs: run one process per GPU with --shard 0 --of 2 and
--shard 1 --of 2, then --report. Output: results-gpu-<n>.jsonl, flagged-gpu.csv, summary-gpu.json. A machine check.
"""
import argparse, collections, csv, json, os, subprocess, sys, time

sys.path.insert(0, os.path.dirname(__file__))
import numpy as np  # noqa: E402
import check_lib as L  # noqa: E402
import scan as S  # noqa: E402


PADS = [(L.SR // 4, L.SR // 2), (L.SR * 3 // 4, L.SR // 4)]   # silence before and after: as check_lib.hear, and as fix_list's second hearing


def load(path, pad=0):
    a = L.load(path)
    return np.concatenate([np.zeros(PADS[pad][0], np.float32), a, np.zeros(PADS[pad][1], np.float32)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='.')
    ap.add_argument('--kinds', default='word,builder,dictionary')
    ap.add_argument('--batch', type=int, default=24)
    ap.add_argument('--limit', type=int)
    ap.add_argument('--shard', type=int, default=0)
    ap.add_argument('--of', type=int, default=1)
    ap.add_argument('--report', action='store_true', help='no hearing: write the summary from every results-gpu*.jsonl in --out')
    a = ap.parse_args()
    jobs = S.jobs(tuple(a.kinds.split(',')))
    if a.limit:
        jobs = jobs[:a.limit]
    print('recordings', len(jobs), dict(collections.Counter(j['kind'] for j in jobs)), flush=True)
    jobs.sort(key=lambda j: j['file'])
    os.makedirs(a.out, exist_ok=True)
    if not a.report:
        import torch
        from transformers import WhisperForConditionalGeneration, WhisperProcessor
        dev = 'cuda' if torch.cuda.is_available() else 'cpu'
        dtype = torch.float16 if dev == 'cuda' else torch.float32
        name = 'ivrit-ai/whisper-large-v3-turbo'
        proc = WhisperProcessor.from_pretrained(name)
        model = WhisperForConditionalGeneration.from_pretrained(name, torch_dtype=dtype).to(dev).eval()
        print('device', dev, flush=True)
        res_path = os.path.join(a.out, f'results-gpu-{a.shard}.jsonl')
        done = {json.loads(l)['file'] for l in open(res_path, encoding='utf-8')} if os.path.exists(res_path) else set()
        todo = [j for n, j in enumerate(jobs) if n % a.of == a.shard and j['file'] not in done]
        t0 = time.time()
        with open(res_path, 'a', encoding='utf-8') as out:
            for i in range(0, len(todo), a.batch):
                part = todo[i:i + a.batch]
                texts = []
                for pad in (0, 1):                      # two hearings of every clip, with different silence around it
                    audio = [load(os.path.join(S.ROOT, j['file']), pad) for j in part]
                    feats = proc(audio, sampling_rate=L.SR, return_tensors='pt', return_attention_mask=True)
                    with torch.no_grad():
                        ids = model.generate(feats.input_features.to(dev, dtype), attention_mask=feats.attention_mask.to(dev),
                                             language='he', task='transcribe', num_beams=5, max_new_tokens=48)
                    texts.append([t.strip() for t in proc.batch_decode(ids, skip_special_tokens=True)])
                for j, t1, t2 in zip(part, *texts):
                    out.write(json.dumps({'file': j['file'], 'asr': t1, 'asr2': t2, 'mode': 'gpu'}, ensure_ascii=False) + '\n')
                out.flush()
                if (i // a.batch) % 20 == 0:
                    print(f'shard {a.shard}: {i + len(part)}/{len(todo)}  {time.time() - t0:.0f}s', flush=True)
        return

    import glob
    heard = {}
    for f in sorted(glob.glob(os.path.join(a.out, 'results-gpu*.jsonl'))):
        for l in open(f, encoding='utf-8'):
            r = json.loads(l)
            heard[r['file']] = (r['asr'], r.get('asr2', r['asr']))
    order = ['fail', 'unsure', 'number', 'pass']
    tab = collections.defaultdict(collections.Counter)
    flagged = []
    def verdict(he, h):
        s = L.score(he, h)
        return 'number' if s == 'digits' else 'pass' if isinstance(s, float) and s >= L.PASS else 'fail'
    for j in jobs:
        if j['file'] not in heard:
            continue
        h1, h2 = heard[j['file']]
        v1, v2 = verdict(j['he'], h1), verdict(j['he'], h2)
        v = 'pass' if v1 == v2 == 'pass' else 'number' if 'number' in (v1, v2) and 'fail' not in (v1, v2) else 'fail' if v1 == v2 == 'fail' else 'unsure'
        tab[j['kind']][v] += 1
        if v in ('fail', 'unsure'):
            flagged.append((v, j['kind'], j['he'], h1, h2, j['file'], len(j['paths'])))
    flagged.sort(key=lambda r: (order.index(r[0]), r[5]))
    with open(os.path.join(a.out, 'flagged-gpu.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['verdict', 'kind', 'pointed_hebrew', 'heard_1', 'heard_2', 'file', 'same_audio_files'])
        w.writerows(flagged)
    summary = {k: dict(c) for k, c in tab.items()}
    commit = subprocess.run(['git', '-C', S.ROOT, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
    json.dump({'commit': commit, 'model': 'ivrit-ai/whisper-large-v3-turbo', 'recordings': len(heard), 'by_kind': summary},
              open(os.path.join(a.out, 'summary-gpu.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('SUMMARY', json.dumps(summary, ensure_ascii=False))
    for k, c in sorted(tab.items()):
        n = sum(c.values())
        print(f"{k}: {n} recordings, heard right twice {c['pass']} ({c['pass'] / max(1, n):.1%}), number {c['number']}, once of two {c['unsure']}, neither {c['fail']}")
    print('FLAGGED', len(flagged))
    for r in flagged:
        print('|'.join(str(x) for x in (r[0], r[5])))


if __name__ == '__main__':
    main()
