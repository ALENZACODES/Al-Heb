"""Chirp 3 HD clips for the whole prayers that are too long for one Chirp 3 HD request (.github/workflows/chirp-long.yml).

Fill-clips run 5 found that Chirp 3 HD refuses (HTTP 400) every take whose text is longer than about 900 bytes (the longest text it
took was 840 bytes, the shortest it refused 966), so these prayers are recorded in parts and joined:
  adon-olam-1, kaddish-1, haftarah-after (prayer clips) and aleinu-1, amidah-elohai-netzor (line clips the prayer rows alias).
Parts come from the app's own text (data/corpus/registry.json): its lines, then its sentence breaks (sof pasuq); a sentence still
longer than MAX_BYTES is cut at a word boundary, before the joining word nearest its middle (ve-, she-, ki, baruch, ...). Nothing is
retyped. Each part is spoken as the Torah clips are (tools/torah/audio/fix_shard.py spoken(): the four-letter name read as Adonai).
One voice for the whole prayer: for each narrator, three Chirp 3 HD voices x rates 1.0, 0.9 and 0.85 are tried; each try records
every part and every part is judged by the three reviewers on its own (the joined clip of a long prayer is over Google
Speech-to-Text's 55-second limit, so the judgement is per part). A try passes when every part passes at least 2 of 3 reviewers;
the best passing try is joined (pauses of 0.45 s at line and sentence breaks, 0.3 s at a cut inside a sentence), loudness-normalised
to the repo format (mono 44.1 kHz 96 kbps, -16 LUFS) with all metadata stripped, and replaces the clip. No passing try: the clip
is left as it is and the log says "chirpHeld" with the reason.

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
MAX_BYTES = 400
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
        tries, best = [], None
        for voice in CHIRP[row['voice']]:
            if have and voice not in have:
                tries.append({'voice': voice, 'error': 'voice not offered'}); continue
            for rate in RATES:
                t = {'voice': voice, 'rate': rate, 'parts': []}
                files = []
                for i, p in enumerate(row['parts']):
                    raw, norm = os.path.join(tmpd, f'{voice[-6:]}-{rate}-{i}.raw.mp3'), os.path.join(tmpd, f'{voice[-6:]}-{rate}-{i}.mp3')
                    try:
                        open(raw, 'wb').write(synth(p['spoken'], voice, k, rate))
                    except urllib.error.HTTPError as e:
                        t['parts'].append({'error': e.code, 'body': e.read().decode('utf-8', 'replace')[:300]}); break
                    FC.normalize(raw, norm)
                    j = F.judge(norm, p['spoken'], a.model, stt)
                    j['reviewersFailing'] = FC.fails(j)
                    t['parts'].append(j); files.append(norm)
                    if j['reviewersFailing'] >= 2:
                        break   # this try cannot pass; do not spend more requests on it
                    time.sleep(0.1)
                t['passed'] = len(files) == len(row['parts']) and all(x.get('reviewersFailing', 3) <= 1 for x in t['parts'])
                t['score'] = sum(FC.score(x)[1] for x in t['parts'] if 'ratio' in x)
                tries.append(t)
                if t['passed'] and (best is None or t['score'] < best[0]['score']):
                    best = (t, files)
                print(row['path'], voice, rate, 'pass' if t['passed'] else 'fail', flush=True)
        rec = {'path': row['path'], 'id': row['id'], 'parts': len(row['parts']), 'tries': tries}
        if best:
            t, files = best
            clip = os.path.join(ROOT, row['path'])
            join(files, [p['pause'] for p in row['parts']], clip)
            mp = clip + '.meta.json'
            prev = json.load(open(mp, encoding='utf-8')) if os.path.exists(mp) else {}
            full = ' '.join(p['text'] for p in row['parts'])
            j = {'weak': [w for x in t['parts'] for w in x['weak']], 'issues': [w for x in t['parts'] for w in x['issues']],
                 'google': {'issues': [w for x in t['parts'] for w in (x.get('google') or {}).get('issues', [])]}, 'ratio': 0}
            meta = FC.sidecar({'text': full}, t['voice'], ' '.join(p['spoken'] for p in row['parts']), t['rate'], j,
                              {'voiceId': prev.get('voiceId'), 'engine': prev.get('engine'), 'renderedAt': prev.get('renderedAt')})
            meta['review'] = {'judged': 'per part (the joined clip is longer than Google Speech-to-Text takes in one request)',
                              'parts': [{'text': p['text'], 'phonemeWeak': x['weak'], 'wordIssues': x['issues'], 'google': x.get('google'),
                                         'reviewersFailing': x['reviewersFailing']} for p, x in zip(row['parts'], t['parts'])]}
            meta['joinedFrom'] = {'parts': len(row['parts']), 'pauses': [p['pause'] for p in row['parts']], 'source': 'data/corpus/registry.json lines and sentence breaks'}
            json.dump(meta, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); open(mp, 'a').write('\n')
            rec.update({'decision': f"{t['voice']}@{t['rate']}", 'voiceId': t['voice'], 'rate': t['rate']})
        else:
            reasons = []
            for t in tries:
                if 'error' in t: reasons.append(f"{t['voice']}: {t['error']}"); continue
                bad = next((i for i, x in enumerate(t['parts']) if 'error' in x or x.get('reviewersFailing', 0) >= 2), None)
                reasons.append(f"{t['voice'].split('-')[-1]} {t['rate']}: part {bad + 1 if bad is not None else '?'} " +
                               ('refused' if bad is not None and 'error' in t['parts'][bad] else 'failed 2 of 3 reviewers'))
            rec.update({'decision': 'kept', 'chirpHeld': True, 'reason': '; '.join(reasons)})
        out.write(json.dumps(rec, ensure_ascii=False) + '\n'); out.flush()
        print(row['path'], rec['decision'], flush=True)
        shutil.rmtree(tmpd, ignore_errors=True)


if __name__ == '__main__':
    main()
