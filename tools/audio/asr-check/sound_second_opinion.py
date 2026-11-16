"""Clips the word check still does not pass after a word-fix run: what does the sound model say about the clip in place?

The word model knows common modern words best; a rare or biblical word (עָלַז, אָרַג) can be said right and still come back
as a commoner word. The sound model does not guess words. Each clip left in place (replacement sent back, or no take
passed) is heard by it once and compared with the sounds the pointed word should make.

  python tools/audio/asr-check/sound_second_opinion.py --model /path/to/phoneme-ct2 docs/audio/word-fix/r2-*.jsonl
Output: docs/audio/word-fix/second-opinion.csv (sounds matched per clip) and a printed tally. Resumable.
A machine opinion: "sounds match" means both models would have to be wrong the same way for the clip to be wrong.
"""
import argparse, csv, glob, json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
import phoneme_review as P  # noqa: E402

ROOT = P.ROOT
OUT = os.path.join(ROOT, 'docs', 'audio', 'word-fix', 'second-opinion.csv')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('logs', nargs='+')
    ap.add_argument('--model', required=True)
    a = ap.parse_args()
    gate = os.path.join(os.path.dirname(__file__), 'sound-gate-log.jsonl')
    back = {r['file'] for r in map(json.loads, open(gate, encoding='utf-8')) if r['decision'] != 'kept'}
    rows = [json.loads(l) for f in sorted(g for x in a.logs for g in glob.glob(x)) for l in open(f, encoding='utf-8')]
    rows = [r for r in rows if r['outcome'].startswith('no take') or (r['outcome'] == 'replaced' and r['file'] in back)]
    done = {}
    if os.path.exists(OUT):
        done = {r['file']: r for r in csv.DictReader(open(OUT, encoding='utf-8'))}
    with open(OUT, 'a', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        if not done:
            w.writerow(['file', 'pointed_hebrew', 'word_model_heard', 'sound_model_heard', 'should_sound', 'sounds_matched', 'same_audio_files'])
        for n, r in enumerate(rows, 1):
            if r['file'] in done:
                continue
            ipa = P.hear(os.path.join(ROOT, r['file']), a.model, max_tokens=40)
            try:
                ratio, words = P.review(r['hebrew'], ipa)
            except Exception:  # noqa: BLE001
                ratio, words = '', []
            w.writerow([r['file'], r['hebrew'], ' / '.join(r['heard_now']), ipa, ' '.join(x.get('should', '') for x in words), ratio, len(r['paths'])])
            f.flush()
            print(f'[{n}/{len(rows)}] {r["hebrew"]} {ipa} {ratio}', flush=True)
    rs = list(csv.DictReader(open(OUT, encoding='utf-8')))
    hi = sum(1 for r in rs if r['sounds_matched'] and float(r['sounds_matched']) >= 0.85)
    mid = sum(1 for r in rs if r['sounds_matched'] and 0.75 <= float(r['sounds_matched']) < 0.85)
    print(f'{len(rs)} clips: sounds match (0.85 or more) {hi}; close (0.75 to 0.85) {mid}; neither model hears the word {len(rs) - hi - mid}')


if __name__ == '__main__':
    main()
