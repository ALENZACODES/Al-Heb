"""Fifth kind of check: Google Cloud Speech-to-Text (a commercial Hebrew recognizer, trained apart from the open
models), with a confidence for every word. Runs in Cloud Shell with the gcloud login; no key is stored anywhere.

It tries Chirp 3 first (Hebrew is in preview there), then the first Chirp model. Clips over 55 s are split at the
longest pause near the middle (the API's quick method takes under a minute of audio).

  python3 google_stt.py --root . --queue tools/audio/asr-check/stt-queue.json --out stt-hearings.jsonl
"""
import argparse, base64, json, os, subprocess, sys, time, urllib.request, urllib.error

TRY = [('chirp_3', 'us', True), ('chirp_3', 'us', False), ('chirp_2', 'us-central1', False), ('chirp', 'us-central1', False)]
# (model, region, word confidence): Hebrew does not offer word confidence on every model; without it the transcript is
# scored like the other word checks
MAX_S = 55.0


def token():
    return subprocess.check_output(['gcloud', 'auth', 'print-access-token'], text=True).strip()


def project():
    return subprocess.check_output(['gcloud', 'config', 'get-value', 'project'], text=True).strip()


def pieces(path):
    """the clip as one or more mp3 byte strings of at most MAX_S seconds, cut in pauses"""
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0',
                                          path], text=True).strip() or 0)
    if dur <= MAX_S:
        return [open(path, 'rb').read()]
    n = int(dur // MAX_S) + 1
    # silences from ffmpeg, cut at the one nearest each even split point
    log = subprocess.run(['ffmpeg', '-i', path, '-af', 'silencedetect=n=-35dB:d=0.25', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    mids = [float(l.split('silence_end: ')[1].split()[0]) - float(l.split('silence_duration: ')[1]) / 2
            for l in log.splitlines() if 'silence_end' in l]
    cuts = []
    for k in range(1, n):
        want = dur * k / n
        cuts.append(min(mids, key=lambda m: abs(m - want)) if mids else want)
    edges = [0.0] + sorted(set(cuts)) + [dur]
    out = []
    for s, e in zip(edges, edges[1:]):
        out.append(subprocess.check_output(['ffmpeg', '-v', 'error', '-ss', f'{s:.3f}', '-to', f'{e:.3f}', '-i', path,
                                            '-ac', '1', '-ar', '16000', '-f', 'mp3', '-'], ))
    return out


def recognize(audio, model, loc, proj, tok, conf=True):
    host = 'speech.googleapis.com' if loc == 'global' else f'{loc}-speech.googleapis.com'
    url = f'https://{host}/v2/projects/{proj}/locations/{loc}/recognizers/_:recognize'
    body = {'config': {'autoDecodingConfig': {}, 'languageCodes': ['iw-IL'], 'model': model,
                       **({'features': {'enableWordConfidence': True}} if conf else {})},
            'content': base64.b64encode(audio).decode()}
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method='POST',
                                 headers={'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json',
                                          'x-goog-user-project': proj})
    with urllib.request.urlopen(req, timeout=120) as r:
        res = json.load(r)
    text, words = [], []
    for part in res.get('results', []):
        alts = part.get('alternatives') or []
        if alts:
            text.append(alts[0].get('transcript', ''))
            words += [{'word': w.get('word', ''), 'confidence': w.get('confidence')} for w in alts[0].get('words', [])]
    return ' '.join(t.strip() for t in text if t.strip()), words


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default='.')
    ap.add_argument('--queue', required=True)
    ap.add_argument('--out', default='stt-hearings.jsonl')
    a = ap.parse_args()
    q = json.load(open(a.queue, encoding='utf-8'))
    done = set()
    if os.path.exists(a.out):
        done = {json.loads(l)['file'] for l in open(a.out, encoding='utf-8')}
    proj, tok, t_tok = project(), token(), time.time()
    model = None
    with open(a.out, 'a', encoding='utf-8') as f:
        for i, o in enumerate(q, 1):
            if o['file'] in done:
                continue
            if time.time() - t_tok > 1800:
                tok, t_tok = token(), time.time()
            parts = pieces(os.path.join(a.root, o['file']))
            for m, loc, conf in ([model] if model else TRY):
                try:
                    got = [recognize(p, m, loc, proj, tok, conf) for p in parts]
                    model = (m, loc, conf)
                    break
                except urllib.error.HTTPError as e:
                    print(f'{m}@{loc}: {e.code} {e.read()[:300]!r}', flush=True)
            else:
                print('no Google model answered; stopping', flush=True); sys.exit(1)
            heard = ' '.join(t for t, _ in got).strip()
            words = [w for _, ws in got for w in ws]
            f.write(json.dumps({'file': o['file'], 'model': 'google-' + model[0], 'heard': heard, 'words': words},
                               ensure_ascii=False) + '\n'); f.flush()
            print(f'[{i}/{len(q)}] {o["file"]} {model[0]}: {heard[:60]}', flush=True)


if __name__ == '__main__':
    main()
