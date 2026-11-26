"""Render fresh takes (Chirp 3 HD first, WaveNet as a fallback) for the clips the four-listener check flagged.

Runs in Google Cloud Shell with the signed-in account (no API key): the token comes from `gcloud auth print-access-token`.

  python tools/audio/asr-check/chirp_takes.py --list tools/audio/asr-check/multi4-rerecord.txt --out ~/aleph-takes
  tar czf ~/aleph-takes.tgz -C ~ aleph-takes && cloudshell download ~/aleph-takes.tgz

Takes per clip (raw 24 kHz MP3 as the API returns it; encode to the repo format only after a take is chosen):
  c-pt   Chirp 3 HD, pointed text          c-pt-90  same, 0.9 speed
  c-pl   Chirp 3 HD, unpointed text        c-pl-90  same, 0.9 speed
  w-pt   WaveNet, pointed text (the voice the clip was first made with)
"""
import argparse, base64, json, os, re, subprocess, sys, time, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
VOICES = {'m': ('he-IL-Chirp3-HD-Charon', 'he-IL-Wavenet-B'), 'f': ('he-IL-Chirp3-HD-Kore', 'he-IL-Wavenet-A')}
NIQQUD = re.compile(r'[֑-ׇ]')


def speakable(h):
    s = re.sub(r'[֑-ֽֿ֯׀׃-׆]', '', str(h).replace('־', ' '))
    return re.sub(r'\s+', ' ', s).strip(' .:')


def plain(h):
    return re.sub(r'\s+', ' ', NIQQUD.sub('', str(h).replace('־', ' '))).strip(' .:׃')


def pieces(text, max_words=18):
    """Chirp 3 HD refuses very long sentences: split at clause marks, then into groups of at most max_words words."""
    out = []
    for part in re.split(r'(?<=[.,;:׃])\s+', text):
        w = part.split()
        out += [' '.join(w[i:i + max_words]) for i in range(0, len(w), max_words)]
    return [p for p in out if p]


class TTS:
    def __init__(self, project):
        self.project, self.tok, self.t = project, None, 0

    def token(self):
        if not self.tok or time.time() - self.t > 1800:
            self.tok = subprocess.run(['gcloud', 'auth', 'print-access-token'], capture_output=True, text=True, check=True).stdout.strip()
            self.t = time.time()
        return self.tok

    def synth(self, text, voice, rate=1.0):
        audio = {'audioEncoding': 'MP3', 'sampleRateHertz': 24000}
        if rate != 1.0:
            audio['speakingRate'] = rate
        body = json.dumps({'input': {'text': text}, 'voice': {'languageCode': 'he-IL', 'name': voice}, 'audioConfig': audio}).encode()
        for attempt in range(4):
            req = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize', data=body, method='POST',
                                         headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + self.token(),
                                                  'x-goog-user-project': self.project})
            try:
                with urllib.request.urlopen(req, timeout=120) as r:
                    return base64.b64decode(json.load(r)['audioContent'])
            except urllib.error.HTTPError as e:
                msg = e.read().decode()[:300]
                if e.code in (429, 500, 503) and attempt < 3:
                    time.sleep(5 * (attempt + 1)); continue
                raise RuntimeError(f'{e.code} {msg}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--list', required=True, help='clip paths, one per line')
    ap.add_argument('--queue', default=os.path.join(HERE, 'multi4-queue.json'))
    ap.add_argument('--out', required=True)
    ap.add_argument('--takes', default='c-pt,c-pt-90,c-pl,c-pl-90,w-pt')
    ap.add_argument('--project', default=subprocess.run(['gcloud', 'config', 'get-value', 'project'], capture_output=True, text=True).stdout.strip())
    a = ap.parse_args()
    want = {o['file']: re.sub(r'\s*\(cut from:.*\)\s*$', '', o['want']) for o in json.load(open(a.queue, encoding='utf-8'))}
    files = [l.strip() for l in open(a.list, encoding='utf-8') if l.startswith('audio/')]
    tts = TTS(a.project)
    print(f'project {a.project}: {len(files)} clips', flush=True)
    for n, f in enumerate(files, 1):
        g = f.split('/')[1]
        chirp, wavenet = VOICES[g]
        pt, pl = speakable(want[f]), plain(want[f])
        d = os.path.join(a.out, f[:-4])
        os.makedirs(d, exist_ok=True)
        json.dump({'file': f, 'want': want[f]}, open(os.path.join(d, 'want.json'), 'w', encoding='utf-8'), ensure_ascii=False)
        for tid, text, voice, rate in (('c-pt', pt, chirp, 1.0), ('c-pt-90', pt, chirp, 0.9), ('c-pl', pl, chirp, 1.0),
                                       ('c-pl-90', pl, chirp, 0.9), ('w-pt', pt, wavenet, 1.0)):
            if tid not in a.takes.split(','):
                continue
            dst = os.path.join(d, tid + '.mp3')
            if os.path.exists(dst):
                continue
            try:
                data = b''.join(tts.synth(p, voice, rate) for p in pieces(text))
                open(dst, 'wb').write(data)
            except Exception as e:
                print(f'  {f} {tid}: {e}', flush=True)
        print(f'[{n}/{len(files)}] {f}', flush=True)


if __name__ == '__main__':
    main()
