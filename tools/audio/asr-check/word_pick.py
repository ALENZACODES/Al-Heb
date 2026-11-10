"""Pick, word by word, the best-sounding take for every weak word the sound review found, then rebuild and re-review.

For each weak word in phoneme-review.jsonl it lets the sound model hear every recording of that word (same voice),
scores how many of the expected sounds it hears, and records the best take in word_pick.json. Each sentence that had
a weak word is then joined again with the picked takes and reviewed again; the new version is kept only when more of
its sounds match than before. Every decision goes to word-pick-log.jsonl.

  python tools/audio/asr-check/word_pick.py --model /path/to/phoneme-ct2 [--execute]
"""
import argparse, json, os, re, sys, tempfile, hashlib
HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '..'))
import phoneme_review as P, scan_lines as S, stitch_lines as ST

ROOT = S.ROOT
PICK = os.path.join(HERE, 'word_pick.json')
LOG = os.path.join(HERE, 'word-pick-log.jsonl')


def word_score(path, word, model):
    ipa = P.hear(path, model)
    _, ws = P.review(word, ipa)
    return ws[0]['match'] if ws else 0.0, ipa


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True)
    ap.add_argument('--execute', action='store_true')
    ap.add_argument('--match', default='', help='only clips whose path matches this regular expression')
    a = ap.parse_args()
    rows = {}
    for l in open(P.RES, encoding='utf-8'):
        r = json.loads(l)
        if re.search(a.match, r['file']):
            rows[r['file']] = r
    pick = json.load(open(PICK, encoding='utf-8')) if os.path.exists(PICK) else {}
    tried = {}
    # 1. best take per weak word
    for f, r in sorted(rows.items()):
        v = f.split('/')[1]
        for w in r['weak']:
            k = ST.norm(w['word']); k = ST.SPOKEN.get(k, k)
            key = f'{v}|{k}'
            if key in tried or key in pick:
                continue
            cands = ST.index(v).get(k, [])
            best = None
            for _, rel in cands[:8]:
                sc, ipa = word_score(os.path.join(ROOT, rel), k, a.model)
                if best is None or sc > best[0]:
                    best = (sc, rel, ipa)
            tried[key] = best
            if best:
                pick[key] = best[1]
                print(f'{key}: {len(cands)} take(s), best {best[1]} ({best[0]:.0%}, heard {best[2]})', flush=True)
            else:
                print(f'{key}: no take', flush=True)
    json.dump(pick, open(PICK, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
    ST.PREFER.clear(); ST.PREFER.update({(k.split('|')[0], k.split('|')[1]): p for k, p in pick.items()})
    # 2. rebuild and re-review each sentence that had a weak word
    log = open(LOG, 'a', encoding='utf-8')
    for f, r in sorted(rows.items()):
        if not r['weak']:
            continue
        m = re.match(r'audio/([fm])/israeli/(.+)\.mp3$', f)
        v, rel = m.groups()
        ok, res = ST.stitch(v, rel)
        if not ok:
            rec = {'file': f, 'decision': 'kept (cannot join: ' + res + ')', 'ratio_before': r['ratio'], 'weak_before': [w['word'] for w in r['weak']]}
        else:
            x, meta, meta_p, clip, text, parts = res
            tmp = os.path.join(tempfile.gettempdir(), 'pick-' + os.path.basename(clip))
            ST.encode(x, tmp)
            ipa = P.hear(tmp, a.model)
            ratio, ws = P.review(text, ipa)
            weak = [w for w in ws if w['match'] < 0.6]
            better = (len(weak), -ratio) < (len(r['weak']), -r['ratio'])
            rec = {'file': f, 'decision': 'rebuilt' if better else 'kept (rebuilt was not better)', 'ratio_before': r['ratio'], 'ratio_after': ratio,
                   'weak_before': [w['word'] for w in r['weak']], 'weak_after': [w['word'] for w in weak]}
            if better and a.execute:
                os.replace(tmp, clip)
                meta.update({'engine': 'stitched-from-word-clips', 'stitchedFromText': text, 'stitchedFrom': parts,
                             'note': 'Joined from word clips; weak words swapped for the take the sound review heard best '
                                     '(docs/audio/PHONEME-REVIEW.md, tools/audio/asr-check/word-pick-log.jsonl).'})
                json.dump(meta, open(meta_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
                rr = {'file': f, 'sha': hashlib.sha256(open(clip, 'rb').read()).hexdigest(), 'text': text, 'heard_ipa': ipa, 'ratio': ratio, 'weak': weak}
                open(P.RES, 'a', encoding='utf-8').write(json.dumps(rr, ensure_ascii=False) + '\n')
        print(f'{f}: {rec["decision"]} weak {rec["weak_before"]} -> {rec.get("weak_after", rec["weak_before"])}', flush=True)
        if a.execute:
            log.write(json.dumps(rec, ensure_ascii=False) + '\n'); log.flush()


if __name__ == '__main__':
    main()
