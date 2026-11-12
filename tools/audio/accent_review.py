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


SHORT = {'letter', 'vowel', 'syllable'}


def judge_script(F, path, script, original, model, stt):
    """Judge a clip made from the Ashkenazi reading in Hebrew letters (tools/audio/ashkenazi_script.mjs). The sound reviewer compares
    what it hears with the sounds of that reading (Phonikud on the Hebrew-letter text: o for kamatz, s for tav without dagesh, ei for
    tzere), so it is the reviewer that checks the Ashkenazi sounds. The two word reviewers are speech-to-text models trained on
    Israeli Hebrew: they write the word they recognise, often in its Israeli spelling, so each heard word may match either the
    Ashkenazi spelling or the original word; whichever comparison finds fewer faults counts. They still catch a wrong or garbled word."""
    import phoneme_review as P, scan_lines as S
    ratio, ws = P.review(script, P.hear(path, model, max_tokens=300))
    heard = S.transcribe(path)
    iss = min((S.compare(t, heard)[1] for t in (script, original)), key=len)
    j = {'ratio': ratio, 'weak': [w['word'] for w in ws if w['match'] < 0.6], 'issues': [i['say'] for i in iss], 'judgedBy': 'ashkenazi-script'}
    if stt:
        g = F.google(path, script, stt)
        if 'heard' in g:
            alt = S.compare(original, g['heard'])[1]
            if len(alt) < len(g['issues']):
                g['issues'] = [i['say'] for i in alt]; g['matchedOriginal'] = True
        j['google'] = g
    return j


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
            if r.get('scriptText'):
                said = F.spoken(r['scriptText'])
                j = judge_script(F, clip, said, F.spoken(r['text']), a.model, stt)
            else:
                j = F.judge(clip, said, a.model, stt)
            f = FC.fails(j)
            if r.get('kind') in SHORT:
                # Owner decision B (12 Nov 2026): a letter, vowel or syllable passes on the sound reviewer alone. Calibration (run 4) on the
                # app's own Israeli short clips: Google passed 13-40% of them and the word reviewer 33-72%, the sound reviewer 80-85%.
                ok = not j['weak'] and j.get('ratio') is not None
                rule = 'sound-only-short'
            else:
                ok, rule = f <= 1, '2-of-3'
            rec = {'path': r['path'], 'tradition': r['tradition'], 'spokenText': r['spokenText'], 'judgedAgainst': said, 'review': j,
                   'reviewersFailing': f, 'rule': rule, 'decision': 'pass' if ok else 'held', 'held': not ok}
        out.write(json.dumps(rec, ensure_ascii=False) + '\n'); out.flush()
        print(f"{n}/{len(rows)} {r['path']}: {rec['decision']}", flush=True)


if __name__ == '__main__':
    main()
