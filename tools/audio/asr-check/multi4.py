"""Four-listener check of the uncertain Israeli word and sentence clips (Kaggle, CPU).

Listeners: openai Whisper large-v3, ivrit-ai Whisper large-v3-turbo (Hebrew fine-tune), Meta MMS-1B-all (Hebrew adapter),
Meta SeamlessM4T v2 large. Scoring is the repo's own: check_lib.score for single words, scan_lines.compare for sentences
(spelling-only differences allowed, the divine name accepted).

Verdict, word clip:     3-4 listeners hear it right -> correct; 2 -> listen; 0-1 -> re-record
Verdict, sentence clip: a word 3-4 listeners mishear -> re-record; a word only 2 mishear -> listen; otherwise correct

  python multi4.py --root Al-Heb --queue queue.json --out /kaggle/working
"""
import argparse, collections, json, os, sys, time

import numpy as np


def chunks(a, sr=16000, win=25.0):
    n = int(win * sr)
    if len(a) <= n:
        return [a]
    out, i = [], 0
    while i < len(a):  # cut at the quietest 0.1 s in the last 5 s of each window, so a word is not split
        end = min(len(a), i + n)
        if end < len(a):
            lo = end - 5 * sr
            frames = a[lo:end][: (end - lo) // 1600 * 1600].reshape(-1, 1600)
            end = lo + int(np.argmin((frames ** 2).mean(1))) * 1600 + 800
        out.append(a[i:end]); i = end
    return out


class Listeners:
    def __init__(self, names):
        import torch
        torch.set_num_threads(os.cpu_count() or 4)
        self.torch, self.m = torch, {}
        for n in names:
            t0 = time.time()
            if n == 'whisper-v3':
                from faster_whisper import WhisperModel
                self.m[n] = WhisperModel('large-v3', device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 4)
            elif n == 'ivrit-turbo':
                from faster_whisper import WhisperModel
                self.m[n] = WhisperModel('ivrit-ai/whisper-large-v3-turbo-ct2', device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 4)
            elif n == 'mms-1b':
                from transformers import AutoProcessor, Wav2Vec2ForCTC
                p = AutoProcessor.from_pretrained('facebook/mms-1b-all', target_lang='heb')
                m = Wav2Vec2ForCTC.from_pretrained('facebook/mms-1b-all', target_lang='heb', ignore_mismatched_sizes=True).eval()
                self.m[n] = (p, m)
            elif n == 'seamless-v2':
                from transformers import AutoProcessor, SeamlessM4Tv2ForSpeechToText
                p = AutoProcessor.from_pretrained('facebook/seamless-m4t-v2-large')
                m = SeamlessM4Tv2ForSpeechToText.from_pretrained('facebook/seamless-m4t-v2-large').eval()
                self.m[n] = (p, m)
            print(f'loaded {n} in {time.time() - t0:.0f}s', flush=True)

    def hear(self, name, a, short=False):
        m = self.m[name]
        a = np.concatenate([np.zeros(4000, np.float32), a, np.zeros(8000, np.float32)])  # as check_lib.hear: a little silence around
        if name in ('whisper-v3', 'ivrit-turbo'):
            kw = dict(max_new_tokens=48) if short else {}
            segs, _ = m.transcribe(a, language='he', beam_size=5, vad_filter=False, condition_on_previous_text=False,
                                   without_timestamps=True, **kw)
            return ' '.join(s.text.strip() for s in segs).strip()
        p, model = m
        out = []
        with self.torch.inference_mode():
            for c in chunks(a):
                if name == 'mms-1b':
                    x = p(c, sampling_rate=16000, return_tensors='pt')
                    ids = model(**x).logits.argmax(-1)[0]
                    out.append(p.decode(ids))
                else:
                    x = p(audios=c, sampling_rate=16000, return_tensors='pt')
                    ids = model.generate(**x, tgt_lang='heb', num_beams=3, max_new_tokens=40 if short else 400)[0]
                    out.append(p.decode(ids, skip_special_tokens=True))
        return ' '.join(o.strip() for o in out).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', required=True)
    ap.add_argument('--queue', required=True)
    ap.add_argument('--out', default='.')
    ap.add_argument('--models', default='ivrit-turbo,whisper-v3,mms-1b,seamless-v2')
    a = ap.parse_args()
    sys.path.insert(0, os.path.join(a.root, 'tools', 'audio', 'asr-check'))
    import check_lib as L
    import scan_lines as S
    q = json.load(open(a.queue, encoding='utf-8'))
    names = a.models.split(',')
    res_path = os.path.join(a.out, 'multi4-hearings.jsonl')
    done = set()
    if os.path.exists(res_path):
        done = {(r['file'], r['model']) for r in map(json.loads, open(res_path, encoding='utf-8'))}
    audio = {o['file']: L.load(os.path.join(a.root, o['file'])) for o in q}
    with open(res_path, 'a', encoding='utf-8') as f:
        for name in names:  # one model at a time, then free it: four large models do not fit in RAM together
            todo = [o for o in q if (o['file'], name) not in done]
            if not todo:
                continue
            lis = Listeners([name])
            for i, o in enumerate(todo, 1):
                t0 = time.time()
                heard = lis.hear(name, audio[o['file']], short=o['kind'] == 'word')
                r = {'file': o['file'], 'model': name, 'heard': heard}
                if o['kind'] == 'word':
                    s = L.score(o['want'], heard)
                    r['score'] = 1.0 if s == 'digits' else (s or 0.0)
                    r['ok'] = r['score'] >= L.PASS
                else:
                    acc, issues, nw = S.compare(o['want'], heard)
                    r.update(acc=round(acc, 3), issues=issues, ok=not issues)
                f.write(json.dumps(r, ensure_ascii=False) + '\n'); f.flush()
                print(f'[{name} {i}/{len(todo)}] {o["file"]} ok={r["ok"]} {time.time() - t0:.1f}s', flush=True)
            del lis
            import gc; gc.collect()
    report(q, res_path, names, a.out)


def report(q, res_path, names, out):
    H = collections.defaultdict(dict)
    for r in map(json.loads, open(res_path, encoding='utf-8')):
        H[r['file']][r['model']] = r
    rows = []
    for o in q:
        h = H[o['file']]
        if o['kind'] == 'word':
            n_ok = sum(1 for m in names if h.get(m, {}).get('ok'))
            verdict = 'correct' if n_ok >= 3 else 'listen' if n_ok == 2 else 're-record'
            bad = [] if verdict == 'correct' else [o['want']]
        else:
            c = collections.Counter()
            for m in names:
                for w in {i['say'] for i in h.get(m, {}).get('issues', [])}:
                    c[w] += 1
            rr = [w for w, n in c.items() if n >= 3]
            ls = [w for w, n in c.items() if n == 2]
            verdict = 're-record' if rr else 'listen' if ls else 'correct'
            n_ok = sum(1 for m in names if h.get(m, {}).get('ok'))
            bad = rr or ls
        rows.append(dict(o, verdict=verdict, listeners_ok=n_ok, words=bad,
                         heard={m: h.get(m, {}).get('heard', '') for m in names}))
    json.dump(rows, open(os.path.join(out, 'multi4-verdicts.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(os.path.join(out, 'multi4-rerecord.txt'), 'w', encoding='utf-8').write(
        '\n'.join(r['file'] for r in rows if r['verdict'] == 're-record') + '\n')
    order = {'re-record': 0, 'listen': 1, 'correct': 2}
    rows.sort(key=lambda r: (order[r['verdict']], r['kind'], r['file']))
    cnt = collections.Counter((r['kind'], r['verdict']) for r in rows)
    L = ['# Uncertain clips: four-listener check', '',
         'Listeners: ' + ', '.join(names) + '. Word clip: right if 3 of 4 hear it. Sentence: a word 3 of 4 mishear means re-record.', '',
         '| kind | correct | listen | re-record |', '|---|---|---|---|']
    for k in ('word', 'sentence'):
        L.append(f'| {k} | {cnt[(k, "correct")]} | {cnt[(k, "listen")]} | {cnt[(k, "re-record")]} |')
    L += ['', '| clip | kind | verdict | listeners right | problem words | ' + ' | '.join(names) + ' |',
          '|---|---|---|---|---|' + '---|' * len(names)]
    for r in rows:
        hd = ' | '.join((r['heard'][m] if r['kind'] == 'word' else ('✓' if H[r['file']].get(m, {}).get('ok') else '✗')) for m in names)
        L.append(f'| `{r["file"]}` | {r["kind"]} | {r["verdict"]} | {r["listeners_ok"]}/{len(names)} | {" ".join(r["words"][:8]) + (" …" if len(r["words"]) > 8 else "")} | {hd} |')
    open(os.path.join(out, 'MULTI4-CHECK.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print('\n'.join(L[:8]))


if __name__ == '__main__':
    main()
