"""Faster version of pick_takes.py: both reviewers hear the candidates in batches (about 12 clips per 27-second window)
instead of one at a time. Same rules: a candidate passes when the sound model hears >= 80% of the word's sounds and the
word model scores it >= 0.9; the best passing candidate becomes the pick; with none passing, the current choice stays.

  python tools/audio/asr-check/pick_takes_fast.py --model /path/to/phoneme-ct2
"""
import argparse, json, os, sys
import numpy as np
HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '..'))
import phoneme_review as P, scan_lines as S, stitch_lines as ST, check_lib as L

ROOT = S.ROOT
PICK = os.path.join(HERE, 'word_pick.json')
SCORES = os.path.join(HERE, 'take-scores.jsonl')
SR = L.SR


def windows(items, gap=1.2, window=27.0):
    g = int(gap * SR); i = 0
    while i < len(items):
        buf, chunk, pos = [np.zeros(g // 2, np.float32)], [], g // 2
        while i < len(items):
            a = L.load(os.path.join(ROOT, items[i][2]))
            if chunk and pos + len(a) + g > window * SR:
                break
            chunk.append(items[i]); buf += [a, np.zeros(g, np.float32)]; pos += len(a) + g; i += 1
        yield chunk, np.concatenate(buf)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True)
    a = ap.parse_args()
    takes = json.load(open(os.path.join(ROOT, 'audio-takes', 'takes.json'), encoding='utf-8'))
    groups = {}
    for t in takes:
        groups.setdefault((t['voice'], t['word']), []).append(t['file'])
    pick = json.load(open(PICK, encoding='utf-8')) if os.path.exists(PICK) else {}
    done = {}
    if os.path.exists(SCORES):
        for l in open(SCORES, encoding='utf-8'):
            r = json.loads(l); done[(r['voice'], r['word'], r['file'])] = r
    cands = {}
    for (v, w), files in groups.items():
        k = ST.SPOKEN.get(ST.norm(w), ST.norm(w))
        cur = pick.get(f'{v}|{k}') or (ST.index(v).get(k) or [[None, None]])[0][1]
        cands[(v, w)] = (k, cur, ([cur] if cur else []) + files)
    items = [(v, w, f, k) for (v, w), (k, cur, fs) in cands.items() for f in fs if (v, w, f) not in done]
    items = [(v, w, f, k) for v, w, f, k in items]
    print(f'{len(items)} candidate clips to hear', flush=True)
    out = open(SCORES, 'a', encoding='utf-8')
    n = 0
    for chunk, audio in windows([(v, w, f, k) for v, w, f, k in items]):
        # sound model: one pass, then line the heard sounds up against the chunk's words in order
        segs, _ = P._model.transcribe(audio, language='he', task='transcribe', beam_size=1, best_of=1, temperature=0,
                                      condition_on_previous_text=False, vad_filter=False, suppress_tokens=[],
                                      without_timestamps=True) if P._model else (None, None)
        if P._model is None:
            P.hear(os.path.join(ROOT, chunk[0][2]), a.model, max_tokens=8)   # loads the model
            segs, _ = P._model.transcribe(audio, language='he', task='transcribe', beam_size=1, best_of=1, temperature=0,
                                          condition_on_previous_text=False, vad_filter=False, suppress_tokens=[],
                                          without_timestamps=True)
        raw = ' '.join(s.text.strip() for s in segs)
        for x, y in [('dZ', 'dʒ'), ('tS', 'tʃ'), ('S', 'ʃ'), ('Z', 'ʒ'), ('q', 'ʔ'), ("'", 'ˈ'), ('r', 'ʁ'), ('x', 'χ'), ('g', 'ɡ')]:
            raw = raw.replace(x, y)
        _, ws = P.review(' '.join(c[3] for c in chunk), raw)
        # word model: the existing batched hearing, words assigned back by timestamp
        heard = dict(L.hear_many([os.path.join(ROOT, c[2]) for c in chunk]))
        for (v, w, f, k), wr in zip(chunk, ws):
            h = heard.get(os.path.join(ROOT, f), '')
            r = {'voice': v, 'word': w, 'file': f, 'sound': wr['match'], 'word_score': round(L.score(k, h) or 0, 3), 'heard': h, 'batched': True}
            done[(v, w, f)] = r
            out.write(json.dumps(r, ensure_ascii=False) + '\n')
        out.flush(); n += len(chunk)
        print(f'{n}/{len(items)} heard', flush=True)
    changed = none = 0
    for (v, w), (k, cur, fs) in sorted(cands.items()):
        scored = [done[(v, w, f)] for f in fs if (v, w, f) in done]
        passing = [r for r in scored if r['sound'] >= 0.8 and r['word_score'] >= 0.9]
        if passing:
            best = max(passing, key=lambda r: (r['sound'] + r['word_score'], r['file'] == cur))
            if best['file'] != cur:
                changed += 1
            pick[f'{v}|{k}'] = best['file']
        else:
            none += 1
    json.dump(pick, open(PICK, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
    print(f'picks: {changed} words now use a new take, {none} words have no candidate both reviewers pass')


if __name__ == '__main__':
    main()
