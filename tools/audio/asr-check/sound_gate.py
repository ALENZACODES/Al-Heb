"""Second opinion, by sound, on the clips a word-fix run replaced.

The word check ignores vowels (it compares letters), and a take read from unpointed text, or by the Chirp voice, can come
back as the right letters with the wrong vowels. So each replaced clip is also heard by the sound model
(renikud/whisper-he-ipa), and what it wrote is compared with the sounds the pointed word should make (Phonikud), as
phoneme_review.py does for lines. A replacement stays only if at least --keep of its sounds were heard (default 0.75);
otherwise the earlier clip is put back and the word is listed for a human voice.

  python tools/audio/asr-check/sound_gate.py --model /path/to/phoneme-ct2 docs/audio/word-fix/r2-*.jsonl
Run after the slices are copied into the working tree and before apply_word_fix.py. Resumable.
Log: tools/audio/asr-check/sound-gate-log.jsonl.
"""
import argparse, glob, json, os, subprocess, sys

sys.path.insert(0, os.path.dirname(__file__))
import phoneme_review as P  # noqa: E402

ROOT = P.ROOT
LOG = os.path.join(os.path.dirname(__file__), 'sound-gate-log.jsonl')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('logs', nargs='+')
    ap.add_argument('--model', required=True)
    ap.add_argument('--keep', type=float, default=0.75)
    a = ap.parse_args()
    done = {json.loads(l)['file'] for l in open(LOG, encoding='utf-8')} if os.path.exists(LOG) else set()
    rows = [json.loads(l) for f in sorted(g for x in a.logs for g in glob.glob(x)) for l in open(f, encoding='utf-8')]
    rows = [r for r in rows if r['outcome'] == 'replaced' and r['file'] not in done]
    kept = back = 0
    for n, r in enumerate(rows, 1):
        full = os.path.join(ROOT, r['file'])
        ipa = P.hear(full, a.model, max_tokens=40)
        try:
            ratio, words = P.review(r['hebrew'], ipa)
        except Exception as e:  # noqa: BLE001 - a word the converter cannot read is kept out of the gate, not failed
            ratio, words = None, [{'error': str(e)[:120]}]
        ok = ratio is None or ratio >= a.keep
        if not ok:
            for p in r['paths']:                         # put the earlier clip back
                old = subprocess.run(['git', '-C', ROOT, 'show', 'HEAD:' + p], capture_output=True).stdout
                if old:
                    open(os.path.join(ROOT, p), 'wb').write(old)
            back += 1
        else:
            kept += 1
        with open(LOG, 'a', encoding='utf-8') as f:
            f.write(json.dumps({'file': r['file'], 'paths': r['paths'], 'hebrew': r['hebrew'], 'voice': r['voice'], 'spoken': r['spoken'],
                                'heard_ipa': ipa, 'should': ' '.join(w.get('should', '') for w in words), 'ratio': ratio,
                                'decision': 'kept' if ok else 'earlier clip put back'}, ensure_ascii=False) + '\n')
        print(f"[{n}/{len(rows)}] {'kept' if ok else 'BACK'} {r['hebrew']} heard {ipa} ratio {ratio}", flush=True)
    print('kept', kept, 'put back', back)


if __name__ == '__main__':
    main()
