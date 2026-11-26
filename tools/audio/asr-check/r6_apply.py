"""Round 6: rebuild every non-Torah stitched line from checked single-word clips, one voice family per line.

Every word of those lines was recorded in WaveNet (w as written, w-car-cut said in a carrier phrase, w-rs respelled)
and in Chirp 3 HD (c, c-car-cut, c-rs). Each take, and the clip the lines use now ('cur'), was heard alone by the four
phonetic checks and the Hebrew wav2vec2 recognizer. Per word and family the best take is the one most phonetic checks
hear (75% of its sounds), then the higher mean match, then wav2vec2. A word counts as confirmed in a family when all
four phonetic checks hear its best take. Each line takes the family with more confirmed words (ties stay WaveNet, the
voice the prayers already use) and is joined again from that family's best takes, then put in the natural pace band.

  python3 r6_apply.py --phon r6w-phon-*.jsonl --extra r6w-extra-*.jsonl --takes-root <dir with takes/w6> [--apply]
"""
import argparse, collections, json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '..'))
import phon4, natural as N
import multi4_merge as M
import stitch_lines as ST
import chirp_takes as CT

FAM = {'W': ('w', 'w-car-cut', 'w-rs'), 'C': ('c', 'c-car-cut', 'c-rs')}


def load(a, want):
    S = collections.defaultdict(dict)
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
    return S, W


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--phon', nargs='+', required=True)
    ap.add_argument('--extra', nargs='*', default=[])
    ap.add_argument('--takes-root', required=True)
    ap.add_argument('--out', default=os.path.join(ROOT, 'docs', 'audio', 'multi4', 'ROUND6-LINES.md'))
    ap.add_argument('--apply', action='store_true')
    a = ap.parse_args()
    d = json.load(open(os.path.join(HERE, 'round6-words.json'), encoding='utf-8'))
    q = json.load(open(os.path.join(HERE, 'round6w-queue.json'), encoding='utf-8'))
    want = {o['file']: o['want'] for o in q}
    S, W = load(a, want)

    def stat(f):
        m = S.get(f, {})
        if len(m) < 4:
            return None
        return (sum(v >= phon4.WORD_OK for v in m.values()), round(sum(m.values()) / 4, 3), W.get(f, False))

    by = collections.defaultdict(list)
    for o in q:
        by[o['key']].append(o)
    cur_of = {}                                          # key -> stat of the clip in use, by its own voice family
    best = {}                                            # (key, fam) -> (stat, take obj)
    for key, it in d['items'].items():
        cur = it.get('current')
        cs = stat(cur) if cur else None
        cfam = None
        if cur:
            mp = os.path.join(ROOT, cur + '.meta.json')
            v = json.load(open(mp, encoding='utf-8')).get('voiceId', '') if os.path.exists(mp) else ''
            cfam = 'C' if 'Chirp' in v else 'W'
        cur_of[key] = (cs, cfam)
        for fam, tids in FAM.items():
            cands = [(stat(o['file']), o) for o in by[key] if o['take'] in tids]
            if cur and cs and cfam == fam:
                cands.append((cs, {'file': cur, 'take': 'cur'}))
            cands = [c for c in cands if c[0]]
            if cands:
                best[(key, fam)] = max(cands, key=lambda c: (c[0], c[1]['take'] == 'cur'))

    def ok(key, fam):
        b = best.get((key, fam))
        return bool(b) and b[0][0] == 4

    lines = collections.defaultdict(list)
    for key, ls in d['lines'].items():
        for f in ls:
            lines[f].append(key)
    choice, rows = {}, []
    for f, keys in sorted(lines.items()):
        nw = sum(ok(k, 'W') for k in keys); nc = sum(ok(k, 'C') for k in keys)
        missing = {fam: [k for k in keys if (k, fam) not in best] for fam in FAM}
        fam = 'C' if nc > nw and not missing['C'] else 'W'
        if missing[fam]:
            fam = None
        now = sum(1 for k in keys if cur_of[k][0] and cur_of[k][0][0] == 4)
        choice[f] = fam
        rows.append((f, len(keys), now, nw, nc, fam, [d['items'][k]['word'] for k in keys if fam and not ok(k, fam)]))
    fixed_words = sum(r[3] if r[5] == 'W' else r[4] if r[5] == 'C' else r[2] for r in rows)
    total = sum(r[1] for r in rows)
    out = ['# Round 6: every non-Torah line joined again from single-word clips, one voice per line', '',
           'Each word was recorded alone in WaveNet and in Chirp 3 HD (as written, in a carrier phrase, respelled) and '
           'heard alone by the four phonetic checks and the Hebrew wav2vec2 recognizer. A line takes the voice family '
           'with more words all four phonetic checks hear; ties stay WaveNet.', '',
           f'Word slots heard 4/4 alone: now **{sum(r[2] for r in rows)}/{total}**, after this round **{fixed_words}/{total}**.', '',
           '| line | words | 4/4 now | WaveNet 4/4 | Chirp 4/4 | voice | words still not heard by all four |', '|---|---|---|---|---|---|---|']
    for f, n, now, nw, nc, fam, bad in rows:
        out.append(f"| {f.replace('audio/', '')} | {n} | {now} | {nw} | {nc} | {({'W': 'WaveNet', 'C': 'Chirp'}).get(fam, 'kept')} | {' '.join(bad)} |")
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    open(a.out, 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    print(f'{len(rows)} lines; word slots 4/4 alone: now {sum(r[2] for r in rows)}/{total} -> {fixed_words}/{total}; '
          f'Chirp lines {sum(r[5] == "C" for r in rows)}, kept {sum(r[5] is None for r in rows)}')
    json.dump({'choice': choice, 'best': {f'{k}|{fam}': [v[0], v[1]['file'], v[1]['take']] for (k, fam), v in best.items()}},
              open(os.path.join(HERE, 'round6-choice.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    if not a.apply:
        return
    voice = {('W', 'f'): 'he-IL-Wavenet-A', ('W', 'm'): 'he-IL-Wavenet-B', ('C', 'f'): 'he-IL-Chirp3-HD-Kore', ('C', 'm'): 'he-IL-Chirp3-HD-Charon'}
    picks = {'W': {}, 'C': {}}
    for (key, fam), (st, o) in best.items():
        it = d['items'][key]
        if o['take'] == 'cur':
            picks[fam][key] = o['file']; continue
        if not any(choice.get(f) == fam for f in d['lines'][key]):
            continue
        rel = f"audio/{it['g']}/israeli/word/{it['slug']}{'-c' if fam == 'C' else ''}.mp3"
        ST.encode(ST.trim(ST.decode(os.path.join(a.takes_root, o['file']))), os.path.join(ROOT, rel))
        json.dump({'status': 'tts', 'source': 'tts:google', 'engine': 'google-cloud-tts', 'tradition': 'israeli',
                   'voiceId': voice[(fam, it['g'])], 'inputText': it['word'], 'take': o['take'],
                   'spokenText': CT.respell(it['word']) if o['take'].endswith('-rs') else it['word'],
                   'checks': {'phonetic_heard_of_4': st[0], 'phonetic_mean': st[1], 'w2v_he': st[2]},
                   'checkedBy': 'four phonetic checks (renikud, lv60, xlsr53, ipa1000) + Hebrew wav2vec2; round 6'},
                  open(os.path.join(ROOT, rel) + '.meta.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        picks[fam][key] = rel
    wp_path = os.path.join(HERE, 'word_pick.json')
    wp = json.load(open(wp_path, encoding='utf-8'))
    wp.update(picks['W'])
    json.dump(wp, open(wp_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(picks['C'], open(os.path.join(HERE, 'word_pick_chirp.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    redo = []
    for f, fam in choice.items():
        if not fam:
            continue
        g, rel = re.match(r'audio/([fm])/israeli/(.+)\.mp3$', f).groups()
        ST.PREFER = {(k.split('|')[0], k.split('|')[1]): v for k, v in picks[fam].items()}
        if fam == 'W':
            ST.PREFER = {**{(k.split('|')[0], k.split('|')[1]): v for k, v in wp.items()}, **ST.PREFER}
        ok_, res = ST.stitch(g, rel)
        if not ok_:
            print('skip', f, res); continue
        x, meta, meta_p, clip, text, parts = res
        ST.encode(x, clip)
        meta.update({'engine': 'stitched-from-word-clips', 'stitchedFromText': text, 'stitchedFrom': parts,
                     'voiceFamily': {'W': 'WaveNet', 'C': 'Chirp 3 HD'}[fam], 'voiceId': voice[(fam, g)],
                     'note': 'Round 6: joined from single-word clips of one voice, each heard alone by four phonetic checks.'})
        meta.pop('tempo', None)
        a_ = N.decode(clip); s_, _ = N.speech_and_gaps(a_)
        p = N.syllables(re.sub(r'\s*\(cut from:.*\)\s*$', '', meta.get('inputText', text))) / s_ if s_ else N.NATURAL
        lo, hi = N.NATURAL * (1 - N.LINE_BAND) * 1.01, N.NATURAL * (1 + N.LINE_BAND) * 0.99
        if not lo <= p <= hi:
            fac = (lo if p < lo else hi) / p
            tmp = clip + '.tmp.mp3'; N.write_mp3(a_, tmp, False, fac); shutil.move(tmp, clip); meta['tempo'] = round(fac, 3)
        json.dump(meta, open(meta_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        redo.append(f)
    open(os.path.join(HERE, 'round6-relines.txt'), 'w').write('\n'.join(redo) + '\n')
    print(len(redo), 'lines joined again')


if __name__ == '__main__':
    main()
