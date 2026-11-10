"""Record fresh takes of the words the two reviewers flagged (tools/audio/asr-check/retake-list.json).

Four takes per word, all in the same Israeli WaveNet voice the app already uses, so a sentence joined from them
still sounds like one speaker:
  p   pointed Hebrew            u   without vowel points
  s   pointed, slower (0.85)    m   pointed, with a maqaf-free, sof-pasuq-free spelling and a full stop after it
Files go to audio-takes/<voice>/<id>-<take>.mp3 and audio-takes/takes.json. Nothing in the app changes here:
the takes are reviewed by both checkers afterwards and only the best-heard one is used.

The key is read from the GOOGLE_TTS_API_KEY environment variable (or a .env file in the repo root) and is never
printed or written anywhere.

  python tools/audio/render_word_takes.py            # all words in the list, skipping takes already made
  python tools/audio/render_word_takes.py --limit 5  # first five words only
"""
import argparse, base64, hashlib, json, os, re, sys, time, urllib.request, urllib.error

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
LIST = os.path.join(ROOT, 'tools', 'audio', 'asr-check', 'retake-list.json')
OUT = os.path.join(ROOT, 'audio-takes')
VOICE = {'m': 'he-IL-Wavenet-B', 'f': 'he-IL-Wavenet-A'}
NIQQUD = re.compile('[֑-ׇ]')


def key():
    k = os.environ.get('GOOGLE_TTS_API_KEY', '').strip()
    p = os.path.join(ROOT, '.env')
    if not k and os.path.exists(p):
        for line in open(p, encoding='utf-8'):
            m = re.match(r'\s*GOOGLE_TTS_API_KEY\s*=\s*"?([^"\s]+)"?\s*$', line)
            if m:
                k = m.group(1)
    return k


def synth(text, voice, k, rate=1.0):
    audio = {'audioEncoding': 'MP3', 'sampleRateHertz': 24000}
    if rate != 1.0:
        audio['speakingRate'] = rate
    body = json.dumps({'input': {'text': text}, 'voice': {'languageCode': 'he-IL', 'name': voice}, 'audioConfig': audio}).encode()
    req = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize', data=body, method='POST',
                                 headers={'Content-Type': 'application/json', 'X-Goog-Api-Key': k})
    with urllib.request.urlopen(req, timeout=60) as r:
        return base64.b64decode(json.load(r)['audioContent'])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int, default=0)
    a = ap.parse_args()
    k = key()
    print('voice key found:', 'yes' if k else 'NO - set GOOGLE_TTS_API_KEY in Windows or in .env', flush=True)
    if not k:
        sys.exit(2)
    words = json.load(open(LIST, encoding='utf-8'))
    if a.limit:
        words = words[:a.limit]
    idx_p = os.path.join(OUT, 'takes.json')
    idx = json.load(open(idx_p, encoding='utf-8')) if os.path.exists(idx_p) else []
    have = {(t['voice'], t['word'], t['take']) for t in idx}
    made = failed = 0
    for n, w in enumerate(words, 1):
        v, word = w['voice'], w['word']
        wid = 'w' + hashlib.sha1(word.encode()).hexdigest()[:10]
        takes = {'p': (word, 1.0), 'u': (NIQQUD.sub('', word), 1.0), 's': (word, 0.85), 'm': (word.replace('־', ' ') + '.', 1.0)}
        os.makedirs(os.path.join(OUT, v), exist_ok=True)
        for t, (text, rate) in takes.items():
            if (v, word, t) in have:
                continue
            path = os.path.join(OUT, v, f'{wid}-{t}.mp3')
            for attempt in range(3):
                try:
                    open(path, 'wb').write(synth(text, VOICE[v], k, rate))
                    idx.append({'voice': v, 'word': word, 'take': t, 'text': text, 'rate': rate, 'engine': VOICE[v],
                                'file': f'audio-takes/{v}/{wid}-{t}.mp3'})
                    made += 1
                    break
                except urllib.error.HTTPError as e:
                    if e.code in (400, 401, 403):
                        print(f'stopped: Google answered {e.code} (key not accepted or not allowed for Text-to-Speech)', flush=True)
                        json.dump(idx, open(idx_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
                        sys.exit(3)
                    time.sleep(2 + attempt * 3)
                except Exception:
                    time.sleep(2 + attempt * 3)
            else:
                failed += 1
            time.sleep(0.12)
        if n % 25 == 0:
            json.dump(idx, open(idx_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
            print(f'{n}/{len(words)} words, {made} takes made, {failed} failed', flush=True)
    json.dump(idx, open(idx_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(f'done: {len(words)} words, {made} takes made, {failed} failed', flush=True)


if __name__ == '__main__':
    main()
