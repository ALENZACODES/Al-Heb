"""Word-by-word phonetic check of lines and prayers.

The phonetic checks on a whole line hear one long stream of sounds and line it up against 30-80 expected words, so a
slip in one place smears into the words around it. Here forced alignment (torchaudio MMS_FA, given the expected sounds)
finds where each word starts and ends, each word is cut out (with 60 ms either side), and the four phonetic checks hear
it alone, as they hear a single-word clip. Score: share of the word's expected sounds heard (75% = heard).

Output: seg-hearings-<shard>.jsonl, one record per clip and phonetic check, in the phon4 record shape plus 'seg': True
and per word 'span' (seconds) and 'heard'.

  python segment_checks.py --root Al-Heb --queue Al-Heb/tools/audio/asr-check/seg-queue.json --out /kaggle/working
"""
import argparse, difflib, json, os, re, sys, time

SR = 16000
PAD = 0.06


def spans(model, labels, wav, plain_words):
    """(start_s, end_s) of every word from forced alignment, None for a word with no alignable letters"""
    import torch, torchaudio.functional as F
    d = {c: i for i, c in enumerate(labels)}
    toks = [[d[c] for c in w if c in d] for w in plain_words]
    flat = [t for w in toks for t in w]
    with torch.inference_mode():
        em, _ = model(torch.tensor(wav, dtype=torch.float32)[None])
    em = torch.log_softmax(em, dim=-1)
    ratio = len(wav) / SR / em.shape[1]
    if not flat or em.shape[1] < len(flat):
        return [None] * len(plain_words)
    ali, sc = F.forced_align(em, torch.tensor([flat], dtype=torch.int32), blank=0)
    tsp = F.merge_tokens(ali[0], sc[0].exp())
    out, k = [], 0
    for w in toks:
        if not w:
            out.append(None); continue
        s = tsp[k:k + len(w)]; k += len(w)
        out.append((s[0].start * ratio, s[-1].end * ratio))
    return out


def cover(target, got):
    """share of the target sounds heard in order (Israeli R heard as g counts as r; y-glide after a vowel as i)"""
    f = lambda s: re.sub(r'(?<=[aeiou])j', 'i', s.replace('g', 'r'))
    t, g = f(target), f(got)
    if not t:
        return 1.0
    sm = difflib.SequenceMatcher(a=t, b=g, autojunk=False)
    return round(sum(n for _, _, n in sm.get_matching_blocks()) / len(t), 2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', required=True)
    ap.add_argument('--queue', required=True)
    ap.add_argument('--out', default='.')
    ap.add_argument('--models', default='renikud,lv60,xlsr53,ipa1000')
    ap.add_argument('--shard', type=int, default=0); ap.add_argument('--shards', type=int, default=1)
    a = ap.parse_args()
    sys.path.insert(0, os.path.join(a.root, 'tools', 'audio', 'asr-check'))
    import check_lib as L
    import phon4
    import torch, torchaudio
    torch.set_num_threads(os.cpu_count() or 4)
    q = [o for o in json.load(open(a.queue, encoding='utf-8')) if o['kind'] == 'sentence'][a.shard::a.shards]
    res = os.path.join(a.out, f'seg-hearings-{a.shard}.jsonl')
    done = set()
    if os.path.exists(res):
        done = {(r['file'], r['model']) for r in map(json.loads, open(res, encoding='utf-8'))}
    b = torchaudio.pipelines.MMS_FA
    fa, labels = b.get_model(with_star=False), b.get_labels(star=None)
    plan = {}
    for o in q:
        wav = L.load(os.path.join(a.root, o['file']))
        want = re.sub(r'\s*\(cut from:.*\)\s*$', '', o['want'])
        ws, exp = phon4.expected2(want)
        plain = [re.sub(r'[^a-z]', '', phon4.latin(e).lower()) for e in exp]
        sp = spans(fa, labels, wav, plain)
        segs = []
        for (w, e, s) in zip(ws, exp, sp):
            if s is None:
                segs.append((w, e, None, None)); continue
            i0, i1 = max(0, int((s[0] - PAD) * SR)), min(len(wav), int((s[1] + PAD) * SR))
            segs.append((w, e, (round(s[0], 2), round(s[1], 2)), wav[i0:i1]))
        plan[o['file']] = segs
        print(f'aligned {o["file"]}: {len(segs)} words', flush=True)
    del fa
    with open(res, 'a', encoding='utf-8') as f:
        for name in a.models.split(','):
            todo = [o for o in q if (o['file'], name) not in done]
            if not todo:
                continue
            try:
                h = phon4.Hearer(name)
            except Exception as e:
                print(f'{name} could not load: {e}', flush=True); continue
            for i, o in enumerate(todo, 1):
                t0, words = time.time(), []
                for w, e, s, seg in plan[o['file']]:
                    if seg is None or len(seg) < int(0.05 * SR):
                        words.append({'word': w, 'should': phon4.latin(e), 'match': 0.0, 'heard': '', 'span': s}); continue
                    got = phon4.fold2(h.hear(seg)).replace(' ', '')
                    words.append({'word': w, 'should': phon4.latin(e), 'match': cover(e, got), 'heard': phon4.latin(got), 'span': s})
                r = {'file': o['file'], 'model': name, 'seg': True, 'words': words}
                f.write(json.dumps(r, ensure_ascii=False) + '\n'); f.flush()
                low = sum(x['match'] < phon4.WORD_OK for x in words)
                print(f'[{name} {i}/{len(todo)}] {o["file"]} low={low}/{len(words)} {time.time() - t0:.1f}s', flush=True)
            del h
            import gc; gc.collect()


if __name__ == '__main__':
    main()
