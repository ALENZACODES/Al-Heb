"""Check one slice of the Torah reader's Hebrew verse clips with both reviewers (run as a GitHub Actions matrix job).

Reviewer 1: ivrit-ai Whisper (words). Reviewer 2: renikud/whisper-he-ipa (sounds). Same rules as the prayer checks
(tools/audio/asr-check/scan_lines.py and phoneme_review.py). One JSON line per clip in --out.

  python tools/torah/audio/check_shard.py --shard 3 --of 20 --model phoneme-ct2 --out shard-3.jsonl
"""
import argparse, glob, hashlib, json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'audio', 'asr-check'))
import scan_lines as S, phoneme_review as P
sys.path.insert(0, os.path.dirname(__file__))
from fix_shard import spoken


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--shard', type=int, required=True)
    ap.add_argument('--of', type=int, required=True)
    ap.add_argument('--model', required=True)
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    clips = sorted(f for v in 'fm' for f in glob.glob(os.path.join(ROOT, 'audio', v, 'israeli', 'line', 'torah-*-*-*.mp3'))
                   if not os.path.basename(f).startswith(('torah-en-', 'torah-bless', 'torah-barchu')))
    mine = clips[a.shard::a.of]
    done = set()
    if os.path.exists(a.out):
        done = {json.loads(l)['file'] for l in open(a.out, encoding='utf-8')}
    with open(a.out, 'a', encoding='utf-8') as out:
        for n, f in enumerate(mine, 1):
            rel = os.path.relpath(f, ROOT).replace(os.sep, '/')
            if rel in done:
                continue
            cid = os.path.basename(f)[:-4]
            mp = f + '.meta.json'
            text = (json.load(open(mp, encoding='utf-8')).get('stitchedFromText') if os.path.exists(mp) else None) or S.torah_he(cid)
            text = spoken(text)   # as read aloud: the divine name as Adonai, maqaf as a space
            heard = S.transcribe(f)
            acc, iss, nw = S.compare(text, heard)
            ipa = P.hear(f, a.model)
            ratio, ws = P.review(text, ipa)
            weak = [w['word'] for w in ws if w['match'] < 0.6]
            r = {'file': rel, 'sha': hashlib.sha256(open(f, 'rb').read()).hexdigest(), 'text': text, 'words': nw,
                 'word_heard': heard, 'word_issues': [i['say'] for i in iss], 'sound_ipa': ipa, 'sound_ratio': ratio, 'sound_weak': weak}
            out.write(json.dumps(r, ensure_ascii=False) + '\n'); out.flush()
            if n % 25 == 0:
                print(f'{n}/{len(mine)}', flush=True)


if __name__ == '__main__':
    main()
