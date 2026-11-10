"""Fix the sentences and prayers the sentence scan flagged, keeping a change only when it is better.

For every clip in lines-results.jsonl with at least one problem word, it joins the clip again from
word clips (tools/audio/stitch_lines.py), lets the same speech-to-text model hear the joined version,
and keeps it only if fewer words are wrong than in the old clip. Otherwise the old clip stays.
Writes docs/audio/ASR-LINES-FIX.md with every decision and the words that were wrong before and after.

  python tools/audio/asr-check/fix_lines.py            # dry run: hears the joined versions, changes nothing
  python tools/audio/asr-check/fix_lines.py --execute
"""
import argparse, json, os, re, sys, tempfile
HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '..'))
import scan_lines as S
import stitch_lines as ST

ROOT = S.ROOT
LOG = os.path.join(HERE, 'lines-fix-log.jsonl')


def latest():
    rows = {}
    for l in open(S.RES, encoding='utf-8'):
        r = json.loads(l); rows[r['file']] = r
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--execute', action='store_true')
    a = ap.parse_args()
    rows = latest()
    done = {}
    if os.path.exists(LOG):
        for l in open(LOG, encoding='utf-8'):
            r = json.loads(l); done[r['file']] = r
    out = open(LOG, 'a', encoding='utf-8')
    for f, r in sorted(rows.items()):
        m = re.match(r'audio/([fm])/israeli/(.+)\.mp3$', f)
        if not m or f in done:
            continue
        acc0, iss0, n = S.compare(r['say'], r['heard'])   # re-scored with the current rules
        if not iss0:
            continue
        v, rel = m.groups()
        ok, res = ST.stitch(v, rel)
        if not ok:
            rec = {'file': f, 'decision': 'kept (cannot join: ' + res + ')', 'before': iss0}
        else:
            x, meta, meta_p, clip, text, parts = res
            tmp = os.path.join(tempfile.gettempdir(), 'fixlines-' + os.path.basename(clip))
            ST.encode(x, tmp)
            heard = S.transcribe(tmp)
            acc1, iss1, _ = S.compare(text, heard)
            better = len(iss1) < len(iss0)
            rec = {'file': f, 'decision': 'joined' if better else 'kept (joined was not better)', 'before': iss0, 'after': iss1,
                   'acc_before': round(acc0, 3), 'acc_after': round(acc1, 3), 'heard_after': heard}
            if better and a.execute:
                os.replace(tmp, clip)
                meta.update({'engine': 'stitched-from-word-clips', 'stitchedFromText': text, 'stitchedFrom': parts,
                             'note': 'Joined from its word clips because the whole-sentence render misread words; the joined version '
                                     'had fewer misheard words in the speech-to-text check (docs/audio/ASR-LINES-FIX.md).'})
                json.dump(meta, open(meta_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f'{f}: {rec["decision"]} ({len(rec["before"])} -> {len(rec.get("after", rec["before"]))} problem words)', flush=True)
        if a.execute:
            out.write(json.dumps(rec, ensure_ascii=False) + '\n'); out.flush()
        done[f] = rec
    recs = sorted(done.values(), key=lambda r: r['file'])
    L = ['# Sentences and prayers: fixes from the speech-to-text check', '',
         'A clip the sentence check flagged was joined again from its word clips. The joined version was kept only when the '
         'speech-to-text model heard fewer wrong words in it than in the old clip. A machine check, not a teacher\'s approval.', '',
         f'Joined: **{sum(1 for r in recs if r["decision"] == "joined")}**. Kept as it was: **{sum(1 for r in recs if r["decision"] != "joined")}**.', '',
         '| clip | decision | wrong before | wrong after |', '|---|---|---|---|']
    fmt = lambda xs: '; '.join(f'{i["say"]} → {i["heard"]}' for i in xs[:6]) + (' …' if len(xs) > 6 else '') if xs else 'none'
    for r in recs:
        L.append(f'| `{r["file"]}` | {r["decision"]} | {fmt(r["before"])} | {fmt(r["after"]) if "after" in r else "—"} |')
    open(os.path.join(ROOT, 'docs', 'audio', 'ASR-LINES-FIX.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')


if __name__ == '__main__':
    main()
