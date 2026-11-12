"""Chirp 3 HD clips for the whole prayers that are too long for one Chirp 3 HD request (.github/workflows/chirp-long.yml).

Fill-clips run 5 found that Chirp 3 HD refuses (HTTP 400) every take whose text is longer than about 900 bytes (the longest text it
took was 840 bytes, the shortest it refused 966), so these prayers are recorded in parts and joined:
  adon-olam-1, kaddish-1, haftarah-after (prayer clips) and aleinu-1, amidah-elohai-netzor (line clips the prayer rows alias).
Parts come from the app's own text (data/corpus/registry.json): its lines, then its sentence breaks (sof pasuq); a sentence still
longer than MAX_BYTES is cut at a word boundary, before the joining word nearest its middle (ve-, she-, ki, baruch, ...). Nothing is
retyped. Each part is spoken as the Torah clips are (tools/torah/audio/fix_shard.py spoken(): the four-letter name read as Adonai).
One voice for the whole prayer (never mixed): the narrator's three Chirp 3 HD voices are tried in turn. With a voice, each part is
recorded at rate 1.0 and judged by the three reviewers on its own; a part that fails is retried at 0.9, then 0.85 (the rate may
differ from part to part, the voice may not). The first voice with which every part passes at least 2 of 3 reviewers is joined
(pauses of 0.45 s at line and sentence breaks, 0.3 s at a cut inside a sentence), loudness-normalised to the repo format (mono
44.1 kHz 96 kbps, -16 LUFS) with all metadata stripped, and checked as a whole: its length is the parts plus the pauses (within
0.15 s), it starts and ends quietly and does not clip, and Google Speech-to-Text hears each chunk of it (whole parts, under 50 s)
no worse than it heard those parts alone (at most one more word off per chunk). Only then does it replace the clip. Otherwise
the clip is left as it is and the log says "chirpHeld" with the reason (the part that failed).

  python tools/audio/chirp_long.py --build                       write tools/audio/chirp-long-list.json (no network)
  python tools/audio/chirp_long.py --list tools/audio/chirp-long-list.json --shard 0 --of 10 --model phoneme-ct2 --log out.jsonl
"""
import argparse, json, os, re, shutil, subprocess, sys, tempfile, time, urllib.error
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'torah', 'audio'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'audio', 'asr-check')); sys.path.insert(0, os.path.join(ROOT, 'tools', 'audio'))

PRAYERS = {'adon-olam-1': 'prayer', 'kaddish-1': 'prayer', 'haftarah-after': 'prayer', 'aleinu-1': 'line', 'amidah-elohai-netzor': 'line'}
CHIRP = {'m': ['he-IL-Chirp3-HD-Charon', 'he-IL-Chirp3-HD-Orus', 'he-IL-Chirp3-HD-Fenrir'],
         'f': ['he-IL-Chirp3-HD-Kore', 'he-IL-Chirp3-HD-Aoede', 'he-IL-Chirp3-HD-Leda']}
RATES = [1.0, 0.9, 0.85]
MAX_BYTES = 150   # run 1 used 400; parts that size kept failing review, run 2 cuts to verse lines or about 150 bytes
OPENERS = re.compile(r'^(שֶׁ|וְ|וּ|וַ|וָ|וֶ|וֶא|כִּי|בָּרוּךְ|לְמַעַן|עֲשֵׂה|יְהֵא|יִתְבָּרַךְ)')
CLERGY = ('gadlu', 'kiddush-zachor', 'ashrei-144-15', 'havdalah-opening', 'kedushah-baruch', 'hallel-117')
UNCOVERED = re.compile(r'(^|[^א-ת])יְיָ|(^|[^א-ת])ה[׳\']')
TETRA_LEFT = re.compile('י[֑-ׇ]*ה[֑-ׇ]*ו[֑-ׇ]*ה')


def cut(words):
    """Word lists of at most MAX_BYTES each, cut before the joining word nearest the middle."""
    if len(' '.join(words).encode()) <= MAX_BYTES or len(words) < 4:
        return [words]
    mid = len(words) / 2
    cands = [i for i in range(2, len(words) - 1) if OPENERS.match(words[i])] or list(range(2, len(words) - 1))
    i = min(cands, key=lambda i: abs(i - mid))
    return cut(words[:i]) + cut(words[i:])


def build():
    import fix_shard as F
    reg = json.load(open(os.path.join(ROOT, 'data/corpus/registry.json'), encoding='utf-8'))
    lst = reg if isinstance(reg, list) else (reg.get('entries') or reg.get('texts') or next(v for v in reg.values() if isinstance(v, list)))
    by = {e['id']: e for e in lst}
    rows, held = [], []
    for pid, kind in PRAYERS.items():
        he = by[pid]['he']
        if pid.startswith(CLERGY) or UNCOVERED.search(he):
            held.append({'id': pid, 'why': 'clergy list or a divine-name form outside the Torah clip convention'}); continue
        parts = []
        for line in [l.strip() for l in he.split('\n') if l.strip()]:
            sents = [s.strip() for s in re.split('(?<=׃)', line) if s.strip()]
            for si, s in enumerate(sents):
                pieces = cut(s.split())
                for pi, w in enumerate(pieces):
                    text = ' '.join(w)
                    said = F.spoken(text)
                    assert not TETRA_LEFT.search(said), (pid, said)
                    parts.append({'text': text, 'spoken': said, 'pause': 0.3 if pi < len(pieces) - 1 else 0.45})
        parts[-1]['pause'] = 0
        for v in ('m', 'f'):
            rows.append({'id': pid, 'path': f'audio/{v}/israeli/{kind}/{pid}.mp3', 'voice': v, 'parts': parts})
    est_chars = sum(len(p['spoken']) for r in rows for p in r['parts']) * len(RATES) * 3
    est_req = sum(len(r['parts']) for r in rows) * len(RATES) * 3
    est = {'rows': len(rows), 'parts': sum(len(r['parts']) for r in rows), 'chars': est_chars, 'ttsUsd': round(est_chars * 30 / 1e6, 2),
           'sttRequests': est_req, 'sttUsd': round(est_req * 0.006, 2), 'worstCaseUsd': round(est_chars * 30 / 1e6 + est_req * 0.006, 2)}
    out = os.path.join(ROOT, 'tools/audio/chirp-long-list.json')
    json.dump({'schema': 'alef-chirp-long/1', 'estimate': est, 'rows': rows, 'held': held}, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(out, 'a').write('\n')
    print(json.dumps(est), [(r['id'], len(r['parts']), max(len(p['spoken'].encode()) for p in r['parts'])) for r in rows if r['voice'] == 'm'])


def join(files, pauses, dst):
    """Concatenate parts with silences, normalise like every clip, strip metadata."""
    import fill_clips as FC
    tmp = tempfile.mkdtemp()
    sil = {}
    ins, filt = [], []
    for i, (f, p) in enumerate(zip(files, pauses)):
        ins += ['-i', f]
        filt.append(f'[{len(filt)}:a]aresample=44100,aformat=channel_layouts=mono[a{i}]')
    seq = []
    n = len(files)
    for i, p in enumerate(pauses):
        seq.append(f'[a{i}]')
        if p > 0:
            if p not in sil:
                sil[p] = os.path.join(tmp, f'sil{p}.wav')
                subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', str(p), sil[p]], check=True)
            ins += ['-i', sil[p]]
            filt.append(f'[{n}:a]aformat=channel_layouts=mono[s{i}]'); seq.append(f'[s{i}]'); n += 1
    graph = ';'.join(filt) + ';' + ''.join(seq) + f'concat=n={len(seq)}:v=0:a=1[out]'
    raw = os.path.join(tmp, 'joined.wav')
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *ins, '-filter_complex', graph, '-map', '[out]', raw], check=True)
    mid = os.path.join(tmp, 'joined.mp3')
    FC.normalize(raw, mid)
    # strip every tag: no ID3, no encoder string (repo rule: no metadata in media)
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', mid, '-map_metadata', '-1', '-id3v2_version', '0', '-write_id3v1', '0',
                    '-fflags', '+bitexact', '-flags:a', '+bitexact', '-c:a', 'copy', dst], check=True)


def duration(f):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout.strip() or 0)


def level(f, start=None, length=None):
    """Peak level (dBFS) of the whole file, or of a window of it."""
    args = ['ffmpeg', '-hide_banner', '-nostats']
    if start is not None:
        args += ['-ss', f'{max(start, 0):.3f}', '-t', f'{length:.3f}']
    r = subprocess.run(args + ['-i', f, '-af', 'astats=metadata=0:reset=0', '-f', 'null', '-'], capture_output=True, text=True)
    m = re.findall(r'Peak level dB: (-?[0-9.]+|-inf)', r.stderr)
    return float(m[-1]) if m and m[-1] != '-inf' else -120.0


def final_check(clip, files, pauses, parts, judged, stt):
    """Length, edges, clipping, and Google on chunks of whole parts under 50 s, compared with the parts alone."""
    import fix_shard as F
    got = duration(clip)
    lens = [duration(f) for f in files]
    want = sum(lens) + sum(pauses)
    out = {'seconds': round(got, 2), 'expected': round(want, 2)}
    problems = []
    if abs(got - want) > 0.15:
        problems.append(f'length {got:.2f} s, expected {want:.2f} s')
    head, tail, peak = level(clip, 0, 0.02), level(clip, got - 0.02, 0.02), level(clip)
    out.update({'edgeStartDb': head, 'edgeEndDb': tail, 'peakDb': peak})
    if head > -20 or tail > -20:
        problems.append(f'loud edge (start {head} dB, end {tail} dB)')
    if peak > -0.5:
        problems.append(f'peak {peak} dB')
    chunks, cur, t = [], [], 0.0
    for i, (L, P) in enumerate(zip(lens, pauses)):
        if cur and sum(lens[j] + pauses[j] for j in cur) + L > 50:
            chunks.append(cur); cur = []
        cur.append(i)
    if cur:
        chunks.append(cur)
    starts = [sum(lens[j] + pauses[j] for j in range(i)) for i in range(len(lens))]
    out['chunks'] = []
    tmp = tempfile.mkdtemp()
    for c in chunks:
        a, b = starts[c[0]], starts[c[-1]] + lens[c[-1]]
        f = os.path.join(tmp, f'chunk{c[0]}.wav')
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', f'{max(a - 0.1, 0):.3f}', '-to', f'{min(b + 0.1, got):.3f}', '-i', clip, f], check=True)
        text = ' '.join(parts[j]['spoken'] for j in c)
        g = F.google(f, text, stt)
        alone = sum(len((judged[j].get('google') or {}).get('issues', [])) for j in c)
        rec = {'parts': [j + 1 for j in c], 'google': g, 'issuesAlone': alone}
        out['chunks'].append(rec)
        if 'issues' not in g:
            problems.append(f"Google could not judge parts {c[0] + 1}-{c[-1] + 1}")
        elif len(g['issues']) > alone + 1:
            problems.append(f"Google heard parts {c[0] + 1}-{c[-1] + 1} worse joined ({len(g['issues'])} off, {alone} alone)")
    shutil.rmtree(tmp, ignore_errors=True)
    out['problems'] = problems
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--build', action='store_true')
    for x in ('--list', '--model', '--log'):
        ap.add_argument(x)
    ap.add_argument('--shard', type=int, default=0)
    ap.add_argument('--of', type=int, default=1)
    a = ap.parse_args()
    if a.build:
        return build()
    import fix_shard as F, fill_clips as FC
    from render_word_takes import synth, key
    k = key()
    print('voice key found:', 'yes' if k else 'NO', flush=True)
    if not k:
        sys.exit(2)
    stt = os.environ.get('GOOGLE_STT_API_KEY', '').strip() or k
    have = FC.available(k)
    rows = json.load(open(a.list, encoding='utf-8'))['rows'][a.shard::a.of]
    out = open(a.log, 'a', encoding='utf-8')
    for row in rows:
        tmpd = tempfile.mkdtemp()
        parts = row['parts']
        voices, chosen = [], None
        for voice in CHIRP[row['voice']]:
            if have and voice not in have:
                voices.append({'voice': voice, 'error': 'voice not offered'}); continue
            vr = {'voice': voice, 'parts': []}
            files, judged, rates = [], [], []
            for i, p in enumerate(parts):
                takes, ok = [], None
                for rate in RATES:
                    f = os.path.join(tmpd, f'{voice[-6:]}-{i}-{rate}.mp3'); raw = f + '.raw.mp3'
                    try:
                        open(raw, 'wb').write(synth(p['spoken'], voice, k, rate))
                    except urllib.error.HTTPError as e:
                        takes.append({'rate': rate, 'error': e.code}); continue
                    FC.normalize(raw, f)
                    j = F.judge(f, p['spoken'], a.model, stt); j['reviewersFailing'] = FC.fails(j); j['rate'] = rate
                    takes.append(j)
                    time.sleep(0.1)
                    if j['reviewersFailing'] <= 1:
                        ok = (f, j); break
                vr['parts'].append({'part': i + 1, 'takes': takes, 'passed': bool(ok)})
                if not ok:
                    vr['failedPart'] = i + 1
                    break
                files.append(ok[0]); judged.append(ok[1]); rates.append(ok[1]['rate'])
            voices.append(vr)
            print(row['path'], voice, 'all parts pass' if len(files) == len(parts) else f"part {vr.get('failedPart')} failed", flush=True)
            if len(files) == len(parts):
                chosen = (voice, files, judged, rates)
                break
        rec = {'path': row['path'], 'id': row['id'], 'parts': len(parts), 'voices': voices}
        if chosen:
            voice, files, judged, rates = chosen
            pauses = [p['pause'] for p in parts]
            joined = os.path.join(tmpd, 'joined-final.mp3')
            join(files, pauses, joined)
            check = final_check(joined, files, pauses, parts, judged, stt)
            rec['finalCheck'] = check
            if not check['problems']:
                clip = os.path.join(ROOT, row['path'])
                shutil.copyfile(joined, clip)
                mp = clip + '.meta.json'
                prev = json.load(open(mp, encoding='utf-8')) if os.path.exists(mp) else {}
                full = ' '.join(p['text'] for p in parts)
                j = {'weak': [w for x in judged for w in x['weak']], 'issues': [w for x in judged for w in x['issues']],
                     'google': {'issues': [w for x in judged for w in (x.get('google') or {}).get('issues', [])]}, 'ratio': 0}
                meta = FC.sidecar({'text': full}, voice, ' '.join(p['spoken'] for p in parts), 1.0, j,
                                  {'voiceId': prev.get('voiceId'), 'engine': prev.get('engine'), 'renderedAt': prev.get('renderedAt')})
                meta.pop('speakingRate', None)
                meta['review'] = {'judged': 'per part, then the joined clip in chunks under 50 s (Google Speech-to-Text) plus length, edge and peak checks',
                                  'parts': [{'text': p['text'], 'speakingRate': r, 'phonemeWeak': x['weak'], 'wordIssues': x['issues'], 'google': x.get('google'),
                                             'reviewersFailing': x['reviewersFailing']} for p, x, r in zip(parts, judged, rates)],
                                  'joined': check}
                meta['joinedFrom'] = {'parts': len(parts), 'pauses': pauses, 'source': 'data/corpus/registry.json lines and sentence breaks, cut at word boundaries'}
                json.dump(meta, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); open(mp, 'a').write('\n')
                rec.update({'decision': voice, 'voiceId': voice, 'rates': rates})
            else:
                rec.update({'decision': 'kept', 'chirpHeld': True, 'reason': f"{voice.split('-')[-1]}: every part passed, the joined clip did not: " + '; '.join(check['problems'])})
        else:
            rec.update({'decision': 'kept', 'chirpHeld': True,
                        'reason': '; '.join(f"{v['voice'].split('-')[-1]}: " + (v['error'] if 'error' in v else f"part {v.get('failedPart')} failed 2 of 3 reviewers at rates 1.0, 0.9 and 0.85") for v in voices)})
        out.write(json.dumps(rec, ensure_ascii=False) + '\n'); out.flush()
        print(row['path'], rec['decision'], rec.get('reason', ''), flush=True)
        shutil.rmtree(tmpd, ignore_errors=True)


if __name__ == '__main__':
    main()
