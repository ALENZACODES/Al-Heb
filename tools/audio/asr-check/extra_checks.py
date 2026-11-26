"""Two more kinds of check for Kaggle CPU, unlike the eight already run:

  mms-align  Forced alignment (torchaudio MMS_FA, the aligner of Meta's MMS project). It is GIVEN the expected sounds
             of every word (the same corrected Israeli pronunciation the phonetic checks use, in plain letters) and
             says how well each word fits the audio: the mean probability of the word's letters along the best path.
             A recognizer can guess its way to a familiar word; a forced aligner cannot hide a wrong sound.
  w2v-he     A Hebrew-trained wav2vec2 recognizer (CTC, no language model): a word check of a different design from
             the Whisper family, scored like the other word checks.

  python extra_checks.py --root Al-Heb --queue Al-Heb/tools/audio/asr-check/extra-queue.json --out /kaggle/working
"""
import argparse, json, os, re, sys, time

W2V = ['imvladikon/wav2vec2-xls-r-300m-hebrew', 'imvladikon/wav2vec2-large-xlsr-53-hebrew']


def align_scores(model, labels, wave, words):
    """per word: mean probability of its letters on the forced path (None if the word has no alignable letters)"""
    import torch, torchaudio.functional as F
    d = {c: i for i, c in enumerate(labels)}
    toks = [[d[c] for c in w if c in d] for w in words]
    flat = [t for w in toks for t in w]
    if not flat:
        return [None] * len(words)
    with torch.inference_mode():
        em, _ = model(wave)
    em = torch.log_softmax(em, dim=-1)
    if em.shape[1] < len(flat):
        return [0.0] * len(words)
    ali, sc = F.forced_align(em, torch.tensor([flat], dtype=torch.int32), blank=0)
    spans = F.merge_tokens(ali[0], sc[0].exp())
    out, k = [], 0
    for w in toks:
        if not w:
            out.append(None); continue
        s = spans[k:k + len(w)]; k += len(w)
        out.append(round(float(sum(x.score for x in s) / len(s)), 3))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', required=True)
    ap.add_argument('--queue', required=True)
    ap.add_argument('--out', default='.')
    ap.add_argument('--models', default='mms-align,w2v-he')
    ap.add_argument('--shard', type=int, default=0); ap.add_argument('--shards', type=int, default=1)
    a = ap.parse_args()
    sys.path.insert(0, os.path.join(a.root, 'tools', 'audio', 'asr-check'))
    import check_lib as L
    import phon4
    import torch
    torch.set_num_threads(os.cpu_count() or 4)
    q = json.load(open(a.queue, encoding='utf-8'))[a.shard::a.shards]
    res = os.path.join(a.out, f'extra-hearings-{a.shard}.jsonl')
    done = set()
    if os.path.exists(res):
        done = {(r['file'], r['model']) for r in map(json.loads, open(res, encoding='utf-8'))}
    audio = {o['file']: L.load(os.path.join(a.root, o['file'])) for o in q}      # 16 kHz mono float
    with open(res, 'a', encoding='utf-8') as f:
        for name in a.models.split(','):
            todo = [o for o in q if (o['file'], name) not in done]
            if not todo:
                continue
            if name == 'mms-align':
                import torchaudio
                b = torchaudio.pipelines.MMS_FA
                model, labels = b.get_model(with_star=False), b.get_labels(star=None)
            else:
                from transformers import AutoProcessor, AutoModelForCTC
                model = None
                for mid in W2V:
                    try:
                        proc, model = AutoProcessor.from_pretrained(mid), AutoModelForCTC.from_pretrained(mid).eval()
                        print('w2v-he =', mid, flush=True); break
                    except Exception as e:
                        print(mid, 'could not load:', str(e)[:200], flush=True)
                if model is None:
                    continue
            for i, o in enumerate(todo, 1):
                t0 = time.time()
                wav = torch.tensor(audio[o['file']], dtype=torch.float32)[None]
                want = re.sub(r'\s*\(cut from:.*\)\s*$', '', o['want'])
                if name == 'mms-align':
                    ws, exp = phon4.expected2(want)
                    plain = [re.sub(r'[^a-z]', '', phon4.latin(e).lower()) for e in exp]
                    sc = align_scores(model, labels, wav, plain)
                    r = {'file': o['file'], 'model': name,
                         'words': [{'word': w, 'should': p, 'fit': s} for w, p, s in zip(ws, plain, sc)]}
                    low = [w for w, s in zip(ws, sc) if s is not None and s < 0.5]
                    print(f'[{name} {i}/{len(todo)}] {o["file"]} low={len(low)} {time.time() - t0:.1f}s', flush=True)
                else:
                    heard = []
                    for c in phon4.chunks(audio[o['file']]):          # 20 s pieces
                        x = proc(c, sampling_rate=16000, return_tensors='pt')
                        with torch.inference_mode():
                            ids = model(**x).logits.argmax(-1)
                        heard.append(proc.batch_decode(ids)[0])
                    r = {'file': o['file'], 'model': name, 'heard': ' '.join(heard).strip()}
                    print(f'[{name} {i}/{len(todo)}] {o["file"]} {r["heard"][:50]} {time.time() - t0:.1f}s', flush=True)
                f.write(json.dumps(r, ensure_ascii=False) + '\n'); f.flush()
            del model
            import gc; gc.collect()


if __name__ == '__main__':
    main()
