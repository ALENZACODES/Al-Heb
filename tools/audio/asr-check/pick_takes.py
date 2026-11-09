"""Choose, word by word, between the current recording of a flagged word and its fresh takes (audio-takes/), using both reviewers.

For each (voice, word) in audio-takes/takes.json: the sound model (renikud IPA) and the word model (ivrit-ai Whisper) hear every
candidate on its own. A candidate passes when the sound model hears at least 80% of the word's sounds and the word model scores it
at least 0.9. The winner is the passing candidate with the highest combined score; with no passing candidate, the current choice
stays. Winners go to word_pick.json (used by stitch_lines.py); every score goes to take-scores.jsonl.

  python tools/audio/asr-check/pick_takes.py --model /path/to/phoneme-ct2 [--first priority-words.txt]
"""
import argparse, json, os, sys
HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '..'))
import phoneme_review as P, scan_lines as S, stitch_lines as ST, check_lib as L

ROOT = S.ROOT
PICK = os.path.join(HERE, 'word_pick.json')
SCORES = os.path.join(HERE, 'take-scores.jsonl')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True)
    ap.add_argument('--first', help='file with one word per line to do first')
    a = ap.parse_args()
    takes = json.load(open(os.path.join(ROOT, 'audio-takes', 'takes.json'), encoding='utf-8'))
    groups = {}
    for t in takes:
        groups.setdefault((t['voice'], t['word']), []).append(t['file'])
    first = set(open(a.first, encoding='utf-8').read().split()) if a.first else set()
    order = sorted(groups, key=lambda k: (k[1] not in first, k))
    pick = json.load(open(PICK, encoding='utf-8')) if os.path.exists(PICK) else {}
    done = {}
    if os.path.exists(SCORES):
        for l in open(SCORES, encoding='utf-8'):
            r = json.loads(l); done[(r['voice'], r['word'], r['file'])] = r
    out = open(SCORES, 'a', encoding='utf-8')
    for n, (v, w) in enumerate(order, 1):
        k = ST.norm(w); k = ST.SPOKEN.get(k, k)
        current = pick.get(f'{v}|{k}') or (ST.index(v).get(k) or [[None, None]])[0][1]
        cands = ([current] if current else []) + groups[(v, w)]
        scored = []
        for f in cands:
            key = (v, w, f)
            if key not in done:
                p = os.path.join(ROOT, f)
                _, ws = P.review(k, P.hear(p, a.model))
                snd = ws[0]['match'] if ws else 0.0
                heard = S.transcribe(p)
                wrd = L.score(k, heard)
                done[key] = {'voice': v, 'word': w, 'file': f, 'sound': snd, 'word_score': round(wrd, 3), 'heard': heard}
                out.write(json.dumps(done[key], ensure_ascii=False) + '\n'); out.flush()
            scored.append(done[key])
        passing = [r for r in scored if r['sound'] >= 0.8 and r['word_score'] >= 0.9]
        if passing:
            best = max(passing, key=lambda r: (r['sound'] + r['word_score'], r['file'] == current))
            pick[f'{v}|{k}'] = best['file']
            msg = f'{best["file"]} (sound {best["sound"]:.0%}, word {best["word_score"]:.2f})' + (' = current' if best['file'] == current else ' NEW')
        else:
            msg = 'no candidate passes both; kept ' + str(current)
        print(f'[{n}/{len(order)}] {v} {w}: {msg}', flush=True)
        if n % 20 == 0:
            json.dump(pick, open(PICK, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
    json.dump(pick, open(PICK, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)


if __name__ == '__main__':
    main()
