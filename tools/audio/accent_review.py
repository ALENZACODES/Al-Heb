"""Review the Sephardi and Ashkenazi clips one shard of tools/audio/accent_fill.mjs just rendered, with the three reviewers the rest
of the bank uses: the sound review (phoneme_review.py), the word check (scan_lines.py) and Google Speech-to-Text (review3_shard.py),
through tools/torah/audio/fix_shard.py judge(). Each clip is judged against the row's pointed Hebrew as spoken (spoken(): the
four-letter name read as Adonai), the words the tradition reading must still be heard as. A clip passes when at most one reviewer
hears a word off; a clip that fails is held: it is left out of the result branch and its row keeps playing the Israeli clip.
One JSON line per clip in --log.

  python tools/audio/accent_review.py --list tools/audio/accent-list-core.json --shard 0 --of 20 --model phoneme-ct2 --log out.jsonl
"""
import argparse, json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'torah', 'audio'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'audio', 'asr-check')); sys.path.insert(0, os.path.join(ROOT, 'tools', 'audio'))


def main():
    ap = argparse.ArgumentParser()
    for x in ('--list', '--model', '--log'):
        ap.add_argument(x, required=True)
    ap.add_argument('--shard', type=int, default=0)
    ap.add_argument('--of', type=int, default=1)
    a = ap.parse_args()
    import fix_shard as F, fill_clips as FC
    from render_word_takes import key
    k = key()
    stt = os.environ.get('GOOGLE_STT_API_KEY', '').strip() or k
    if not stt:
        print('no Speech-to-Text key'); sys.exit(2)
    rows = [r for i, r in enumerate(json.load(open(a.list, encoding='utf-8'))['rows']) if i % a.of == a.shard]
    out = open(a.log, 'a', encoding='utf-8')
    for n, r in enumerate(rows, 1):
        clip = os.path.join(ROOT, r['path'])
        if not os.path.exists(clip):
            rec = {'path': r['path'], 'decision': 'not-rendered', 'held': True}
        else:
            said = F.spoken(r['text'])
            j = F.judge(clip, said, a.model, stt)
            f = FC.fails(j)
            rec = {'path': r['path'], 'tradition': r['tradition'], 'spokenText': r['spokenText'], 'judgedAgainst': said, 'review': j,
                   'reviewersFailing': f, 'decision': 'pass' if f <= 1 else 'held', 'held': f >= 2}
        out.write(json.dumps(rec, ensure_ascii=False) + '\n'); out.flush()
        print(f"{n}/{len(rows)} {r['path']}: {rec['decision']}", flush=True)


if __name__ == '__main__':
    main()
