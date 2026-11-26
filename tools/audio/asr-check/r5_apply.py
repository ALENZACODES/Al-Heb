"""Round 5: put the best checked take of each problem word into the lines stitched from it.

For every (voice, word) in round5-words.json, the takes (w as written, w-rs respelled, w-car-cut / w-rs-car-cut said in
a carrier phrase) and the word clip the lines use now were heard by the four phonetic checks (and the Hebrew wav2vec2
recognizer). A take replaces the word clip only when all four phonetic checks hear it (75% of its sounds, extra sounds
counting against it) and they hear it better on average than the clip it replaces (by 0.10 when that clip already
passes). The winner is saved as a word clip, word_pick.json points the stitcher at it, and every line that uses the
word is joined again from its word clips, then brought into the natural pace band.

  python3 r5_apply.py --phon r5w-phon-*.jsonl --extra r5w-extra-*.jsonl --takes-root <dir with takes/w5> [--apply]
"""
import argparse, collections, json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '..'))
import phon4, natural as N, check_lib as L
import multi4_merge as M
import stitch_lines as ST

PHON = ['renikud', 'lv60', 'xlsr53', 'ipa1000']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--phon', nargs='+', required=True)
    ap.add_argument('--extra', nargs='*', default=[])
    ap.add_argument('--takes-root', required=True)
    ap.add_argument('--out', default=os.path.join(ROOT, 'docs', 'audio', 'multi4', 'ROUND5-WORDS.md'))
    ap.add_argument('--apply', action='store_true')
    a = ap.parse_args()
    d = json.load(open(os.path.join(HERE, 'round5-words.json'), encoding='utf-8'))
    q = json.load(open(os.path.join(HERE, 'round5w-queue.json'), encoding='utf-8'))
    want = {o['file']: o['want'] for o in q}
    S = collections.defaultdict(dict)                     # path -> model -> match (single word, strict)
    for fn in a.phon:
        for l in open(fn, encoding='utf-8'):
            r = json.loads(l)
            if r['file'] in want and r.get('ipa') is not None:
                S[r['file']][r['model']] = phon4.review2(want[r['file']], r['ipa'])[1][0]['match']
    W = {}
    for fn in a.extra:
        for l in open(fn, encoding='utf-8'):
            r = json.loads(l)
            if r['model'] == 'w2v-he' and r['file'] in want:
                sc = M.score(want[r['file']], r['heard']); W[r['file']] = (1.0 if sc == 'digits' else (sc or 0.0)) >= M.L.PASS
    by = collections.defaultdict(list)
    for o in q:
        by[o['key']].append(o)
    rows, picks = [], {}
    for key, it in sorted(d['items'].items()):
        def stat(p):
            m = S.get(p, {})
            if len(m) < 4:
                return None
            return sum(v >= phon4.WORD_OK for v in m.values()), sum(m.values()) / len(m), m
        base = next((o for o in by[key] if o['take'] == 'current'), None)
        b = stat(base['file']) if base else None
        best = None
        for o in by[key]:
            if o['take'] == 'current':
                continue
            s = stat(o['file'])
            if not s or s[0] < 4:
                continue
            need = (b[1] + (0.1 if b[0] >= 4 else 0)) if b else 0
            if s[1] > need and (best is None or (s[1], W.get(o['file'], False)) > (best[1][1], W.get(best[0]['file'], False))):
                best = (o, s)
        rows.append((key, it, b, best))
        if best:
            picks[key] = best[0]
    lines_to_redo = sorted({l for k in picks for l in d['lines'][k]})
    L_ = [f'# Round 5: problem words of stitched lines, re-recorded one word at a time', '',
          f'Words: **{len(rows)}**. Replaced by a take all four phonetic checks hear, and hear better than the clip: '
          f'**{len(picks)}**. Lines joined again: **{len(lines_to_redo)}**.', '',
          '| voice | word | clip now (phonetic checks hearing it, mean) | chosen take | take (checks, mean) |', '|---|---|---|---|---|']
    for key, it, b, best in rows:
        bt = f'{b[0]}/4, {b[1]:.2f}' if b else 'no clip / not heard'
        L_.append(f"| {it['g']} | {it['word']} | {bt} | {best[0]['take'] if best else 'kept'} | "
                  f"{f'{best[1][0]}/4, {best[1][1]:.2f}' if best else ''} |")
    open(a.out, 'w', encoding='utf-8').write('\n'.join(L_) + '\n')
    print(f'{len(picks)} of {len(rows)} words replaced; {len(lines_to_redo)} lines to join again')
    if not a.apply:
        return
    wp_path = os.path.join(HERE, 'word_pick.json')
    wp = json.load(open(wp_path, encoding='utf-8'))
    for key, o in picks.items():
        it = d['items'][key]
        rel = f"audio/{it['g']}/israeli/word/{it['slug']}.mp3"
        src = os.path.join(a.takes_root, o['file'])
        x = ST.trim(ST.decode(src))
        ST.encode(x, os.path.join(ROOT, rel))
        json.dump({'status': 'tts', 'source': 'tts:google', 'engine': 'google-cloud-tts', 'tradition': 'israeli',
                   'voiceId': N.__dict__.get('WAVENET', {}).get(it['g']) or {'f': 'he-IL-Wavenet-A', 'm': 'he-IL-Wavenet-B'}[it['g']],
                   'inputText': it['word'], 'take': o['take'],
                   'spokenText': (__import__('chirp_takes').respell(it['word']) if '-rs' in o['take'] else it['word']),
                   'checkedBy': 'four phonetic checks (renikud, lv60, xlsr53, ipa1000) + Hebrew wav2vec2; round 5'},
                  open(os.path.join(ROOT, rel) + '.meta.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        wp[key] = rel
    json.dump(wp, open(wp_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ST.PREFER = {(k.split('|')[0], k.split('|')[1]): v for k, v in wp.items()}
    for f in lines_to_redo:
        g, rel = re.match(r'audio/([fm])/israeli/(.+)\.mp3$', f).groups()
        ok, res = ST.stitch(g, rel)
        if not ok:
            print('skip', f, res); continue
        x, meta, meta_p, clip, text, parts = res
        ST.encode(x, clip)
        meta.update({'engine': 'stitched-from-word-clips', 'stitchedFromText': text, 'stitchedFrom': parts,
                     'note': 'Joined from its word clips; round 5 replaced problem words with takes all four phonetic checks hear.'})
        # into the natural pace band (pitch kept), as audio_qa.py checks
        a_ = N.decode(clip); s_, _ = N.speech_and_gaps(a_)
        p = N.syllables(re.sub(r'\s*\(cut from:.*\)\s*$', '', meta.get('inputText', text))) / s_ if s_ else N.NATURAL
        lo, hi = N.NATURAL * (1 - N.LINE_BAND) * 1.01, N.NATURAL * (1 + N.LINE_BAND) * 0.99
        if not N.is_torah(f) and not lo <= p <= hi:
            fac = (lo if p < lo else hi) / p
            tmp = clip + '.tmp.mp3'; N.write_mp3(a_, tmp, False, fac); shutil.move(tmp, clip); meta['tempo'] = round(fac, 3)
        json.dump(meta, open(meta_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('joined again', f)
    open(os.path.join(HERE, 'round5-relines.txt'), 'w').write('\n'.join(lines_to_redo) + '\n')


if __name__ == '__main__':
    main()
