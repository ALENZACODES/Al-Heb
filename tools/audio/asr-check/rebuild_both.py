"""Rebuild every sentence/prayer clip that is not clean in docs/audio/REVIEW-STATUS.md, using the current word picks
(word_pick.json, which can now point at fresh takes in audio-takes/), and keep a rebuilt clip only when BOTH reviewers
say it is no worse and at least one says it is better.

  python tools/audio/asr-check/rebuild_both.py --model /path/to/phoneme-ct2 [--execute]
Writes rebuild-both-log.jsonl, appends the new reviews, then rerun review_status.py.
"""
import argparse, hashlib, json, os, re, sys, tempfile
HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '..'))
import phoneme_review as P, scan_lines as S, stitch_lines as ST

ROOT = S.ROOT
LOG = os.path.join(HERE, 'rebuild-both-log.jsonl')
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()


def judge(path, text, model):
    ipa = P.hear(path, model)
    ratio, ws = P.review(text, ipa)
    heard = S.transcribe(path)
    _, iss, _ = S.compare(text, heard)
    return {'ratio': ratio, 'weak': [w for w in ws if w['match'] < 0.6], 'ipa': ipa, 'heard': heard, 'issues': iss}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True)
    ap.add_argument('--execute', action='store_true')
    a = ap.parse_args()
    todo = []
    for l in open(os.path.join(ROOT, 'docs', 'audio', 'REVIEW-STATUS.md'), encoding='utf-8'):
        if l.startswith('| `') and 'clean (both)' not in l:
            todo.append(l.split('|')[1].strip().strip('`'))
    seen = {json.loads(l)['file'] for l in open(LOG, encoding='utf-8')} if os.path.exists(LOG) else set()
    todo = [f for f in todo if f not in seen]
    log = open(LOG, 'a', encoding='utf-8')
    kept = changed = 0
    for n, f in enumerate(todo, 1):
        v, rel = re.match(r'audio/([fm])/israeli/(.+)\.mp3$', f).groups()
        ok, res = ST.stitch(v, rel)
        if not ok:
            print(f'[{n}/{len(todo)}] {f}: cannot join ({res})', flush=True); continue
        x, meta, meta_p, clip, text, parts = res
        tmp = os.path.join(tempfile.gettempdir(), 'rb-' + os.path.basename(clip))
        ST.encode(x, tmp)
        old = judge(clip, text, a.model)
        new = judge(tmp, text, a.model)
        no_worse = len(new['weak']) <= len(old['weak']) and new['ratio'] >= old['ratio'] - 0.01 and len(new['issues']) <= len(old['issues'])
        better = len(new['weak']) < len(old['weak']) or len(new['issues']) < len(old['issues']) or new['ratio'] > old['ratio'] + 0.02
        use = no_worse and better
        rec = {'file': f, 'decision': 'rebuilt' if use else 'kept', 'sound_before': old['ratio'], 'sound_after': new['ratio'],
               'weak_before': [w['word'] for w in old['weak']], 'weak_after': [w['word'] for w in new['weak']],
               'word_before': [i['say'] for i in old['issues']], 'word_after': [i['say'] for i in new['issues']],
               'takes_used': [p for p in parts if p.startswith('audio-takes/')]}
        print(f'[{n}/{len(todo)}] {f}: {rec["decision"]}  sound {old["ratio"]:.0%}->{new["ratio"]:.0%}  weak {len(old["weak"])}->{len(new["weak"])}  word {len(old["issues"])}->{len(new["issues"])}', flush=True)
        if a.execute:
            log.write(json.dumps(rec, ensure_ascii=False) + '\n'); log.flush()
            if use:
                os.replace(tmp, clip)
                meta.update({'engine': 'stitched-from-word-clips', 'stitchedFromText': text, 'stitchedFrom': parts,
                             'note': 'Joined from word clips; flagged words replaced by fresh takes that both reviewers heard best '
                                     '(tools/audio/asr-check/take-scores.jsonl, rebuild-both-log.jsonl).'})
                meta.pop('copiedFrom', None)
                json.dump(meta, open(meta_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
                h = sha(clip)
                open(P.RES, 'a', encoding='utf-8').write(json.dumps({'file': f, 'sha': h, 'text': text, 'heard_ipa': new['ipa'], 'ratio': new['ratio'], 'weak': new['weak']}, ensure_ascii=False) + '\n')
                with open(os.path.join(HERE, 'word-pick-crosscheck.jsonl'), 'a', encoding='utf-8') as c:
                    c.write(json.dumps({'file': f, 'before': len(old['issues']), 'after': len(new['issues']), 'issues': new['issues']}, ensure_ascii=False) + '\n')
                changed += 1
            else:
                kept += 1
    print(f'{changed} rebuilt, {kept} kept')


if __name__ == '__main__':
    main()
