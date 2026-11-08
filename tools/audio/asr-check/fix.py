"""Re-record the Israeli clips the scan failed, keeping only a take that the speech-to-text check hears correctly.

  set GOOGLE_TTS_API_KEY=...                       (Windows: set; macOS/Linux: export)
  python tools/audio/asr-check/fix.py              # dry run: lists what it would re-record
  python tools/audio/asr-check/fix.py --execute    # renders, checks, replaces the files
  python tools/audio/asr-check/fix.py --execute --limit 20 --only shalom,barukh

For each failing recording it tries, in order, until a take scores 1.0 (it keeps the best take that reaches the pass mark):
  1. the approved WaveNet voice (Ari he-IL-Wavenet-B, Noa he-IL-Wavenet-A) reading the pointed Hebrew
  2. the same voice reading the Hebrew without vowel points
  3. the Chirp 3 HD voice (Ari Charon, Noa Kore) reading the Hebrew without vowel points
  4. the Chirp 3 HD voice reading the pointed Hebrew
A take is written over every file that shared the bad audio, in the same format as the files around it.
Nothing that fails every take is overwritten: it is listed in docs/audio/ASR-NEEDS-HUMAN.md for a real recording.
Cost: a word is under 10 characters; 1,000 words x 4 takes is under 40,000 characters (inside Google's free monthly tier).
"""
import argparse
import base64
import csv
import json
import os
import subprocess
import sys
import tempfile
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
import check_lib as L  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
LOG = os.path.join(os.path.dirname(__file__), 'fix-log.jsonl')
VOICES = {'m': ('he-IL-Wavenet-B', 'he-IL-Chirp3-HD-Charon'), 'f': ('he-IL-Wavenet-A', 'he-IL-Chirp3-HD-Kore')}


def voice_of(path):
    if path.startswith('audio/builder/'):
        return 'm' if path.endswith('_ari.mp3') else 'f'
    return path.split('/')[1]


def speakable(hebrew):
    """Pointed Hebrew minus what is never said aloud (cantillation, meteg, sof pasuq); maqaf becomes a space."""
    import re
    s = re.sub(r'[֑-ֽֿ֯׀׃-׆]', '', str(hebrew).replace('־', ' '))
    return re.sub(r'\s+', ' ', s).strip(' .:')


def synth(text, voice_name, key):
    body = json.dumps({'input': {'text': text}, 'voice': {'languageCode': 'he-IL', 'name': voice_name},
                       'audioConfig': {'audioEncoding': 'MP3', 'sampleRateHertz': 24000}}).encode()
    req = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize', data=body, method='POST',
                                 headers={'Content-Type': 'application/json', 'X-Goog-Api-Key': key})
    with urllib.request.urlopen(req, timeout=90) as r:
        return base64.b64decode(json.load(r)['audioContent'])


def encode(src, dst, builder):
    """Same format as the neighbours: builder clips 24 kHz 48 kbps; audio/ clips -16 LUFS mono 44.1 kHz 96 kbps."""
    fmt = ['-ar', '24000', '-b:a', '48k'] if builder else ['-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', '-b:a', '96k']
    subprocess.run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-i', src, '-map_metadata', '-1', '-ac', '1', *fmt,
                    '-codec:a', 'libmp3lame', dst], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--execute', action='store_true')
    ap.add_argument('--limit', type=int)
    ap.add_argument('--only', help='comma list of phonetic spellings to restrict to, e.g. shalom,barukh')
    ap.add_argument('--verdicts', default='fail,unheard,borderline')
    a = ap.parse_args()
    verdicts = set(a.verdicts.split(','))
    with open(os.path.join(ROOT, 'docs', 'audio', 'asr-check.csv'), encoding='utf-8') as f:
        rows = [r for r in csv.DictReader(f) if r['verdict'] in verdicts]
    if a.only:
        want = set(a.only.split(','))
        rows = [r for r in rows if r['phonetic'].strip().lower() in want]
    done = {r['file'] for r in L.jl_read(LOG) if r.get('kept')}
    rows = [r for r in rows if r['file'] not in done][:a.limit]
    print(f'{len(rows)} recordings to re-record ({sum(len(r["same_audio_paths"].split()) for r in rows)} files)')
    if not a.execute:
        for r in rows[:30]:
            print(f"  {r['verdict']:8} {r['pointed_hebrew']:<14} heard {r['heard'] or '(nothing)':<14} {r['file']}")
        print('dry run: add --execute to render (needs GOOGLE_TTS_API_KEY)')
        return
    key = os.environ.get('GOOGLE_TTS_API_KEY')
    if not key:
        sys.exit('Set GOOGLE_TTS_API_KEY first.')
    human = []
    tmp = tempfile.mkdtemp(prefix='alef-fix-')
    for n, r in enumerate(rows, 1):
        v = voice_of(r['file'])
        wavenet, hd = VOICES[v]
        pointed = speakable(r['pointed_hebrew'])
        takes = [(wavenet, pointed), (wavenet, L.plain(pointed)), (hd, L.plain(pointed)), (hd, pointed)]
        best = None
        tried = []
        for i, (name, text) in enumerate(takes):
            raw = os.path.join(tmp, f'take{i}.mp3')
            out = os.path.join(tmp, f'take{i}-enc.mp3')
            try:
                open(raw, 'wb').write(synth(text, name, key))
                encode(raw, out, r['file'].startswith('audio/builder/'))
            except Exception as e:  # noqa: BLE001 - one bad take must not stop the batch
                tried.append({'voice': name, 'text': text, 'error': str(e)[:200]})
                continue
            heard = L.hear(out)
            s = L.score(r['pointed_hebrew'], heard)
            tried.append({'voice': name, 'text': text, 'heard': heard, 'score': s})
            if s is not None and s >= L.PASS and (best is None or s > best[0]):
                best = (s, out, name, text, heard)
                if s >= 1.0:
                    break
        rec = {'file': r['file'], 'hebrew': r['pointed_hebrew'], 'was_heard': r['heard'], 'tried': tried}
        if best:
            data = open(best[1], 'rb').read()
            for p in r['same_audio_paths'].split():
                open(os.path.join(ROOT, p), 'wb').write(data)
            rec.update(kept=True, score=best[0], voice=best[2], spoken=best[3], heard=best[4])
            print(f"[{n}/{len(rows)}] fixed {r['pointed_hebrew']} -> heard {best[4]} ({best[2]}, score {best[0]})", flush=True)
        else:
            rec['kept'] = False
            human.append(r)
            print(f"[{n}/{len(rows)}] NO GOOD TAKE {r['pointed_hebrew']} ({r['file']})", flush=True)
        with open(LOG, 'a', encoding='utf-8') as f:
            f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    # Builder clips carry a sha256 in tools/audio/builder-manifest.json (tools/audio/verify-builder.mjs checks it): refresh it.
    import hashlib
    bm_path = os.path.join(ROOT, 'tools', 'audio', 'builder-manifest.json')
    bm = json.load(open(bm_path, encoding='utf-8'))
    changed = 0
    for c in bm['clips']:
        p = os.path.join(ROOT, c['path'])
        if os.path.exists(p):
            data = open(p, 'rb').read()
            h = hashlib.sha256(data).hexdigest()
            if h != c.get('sha256'):
                c['sha256'], c['bytes'], changed = h, len(data), changed + 1
    if changed:
        with open(bm_path, 'w', encoding='utf-8') as f:
            f.write(json.dumps(bm, ensure_ascii=False, indent=2) + '\n')
        print(f'builder-manifest.json: {changed} hashes refreshed')
    if human:
        with open(os.path.join(ROOT, 'docs', 'audio', 'ASR-NEEDS-HUMAN.md'), 'a', encoding='utf-8') as f:
            for r in human:
                f.write(f"- {r['pointed_hebrew']} ({r['phonetic']}): `{r['file']}`, no synthetic take passed\n")
    print(f'done: {len(rows) - len(human)} fixed, {len(human)} need a human recording')


if __name__ == '__main__':
    main()
