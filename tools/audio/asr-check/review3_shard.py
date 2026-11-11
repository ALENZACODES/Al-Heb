"""Third reviewer: Google Cloud Speech-to-Text (he-IL), for clips where the two local reviewers disagree.

Clips are joined into windows of up to ~50 s (1.2 s of silence between clips) and sent as one request each, because
Google bills every request in 15-second steps. Word time offsets assign the recognised words back to their clips.
Each clip is then scored with the same word rules as the first reviewer (scan_lines.compare). Needs GOOGLE_TTS_API_KEY
with the Speech-to-Text API enabled on its project. One JSON line per clip in --out.

  python tools/audio/asr-check/review3_shard.py --list review3-list.txt --shard 0 --of 10 --out r3-0.jsonl
"""
import argparse, base64, json, os, re, subprocess, sys, time, urllib.error, urllib.request
import numpy as np
HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '..')); sys.path.insert(0, os.path.join(HERE, '..', '..', 'torah', 'audio'))
import scan_lines as S
from render_word_takes import key
from fix_shard import spoken

ROOT = S.ROOT
SR, GAP, WINDOW = 16000, 1.2, 50.0
URL = 'https://speech.googleapis.com/v1p1beta1/speech:recognize'


def pcm(path):
    raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'quiet', '-i', path, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16)


def flac(samples):
    return subprocess.run(['ffmpeg', '-nostdin', '-v', 'quiet', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-f', 'flac', '-'],
                          input=samples.tobytes(), capture_output=True, check=True).stdout


def recognize(audio, k, phrases):
    body = {'config': {'encoding': 'FLAC', 'sampleRateHertz': SR, 'languageCode': 'he-IL', 'enableWordTimeOffsets': True,
                       'model': 'default', 'speechContexts': [{'phrases': phrases[:400]}] if phrases else []},
            'audio': {'content': base64.b64encode(audio).decode()}}
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), method='POST',
                                 headers={'Content-Type': 'application/json', 'X-Goog-Api-Key': k})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def sec(t):
    return float(str(t).rstrip('s') or 0)


def text_of(rel):
    p = os.path.join(ROOT, rel)
    mp = p + '.meta.json'
    meta = json.load(open(mp, encoding='utf-8')) if os.path.exists(mp) else {}
    return spoken(meta.get('stitchedFromText') or meta.get('inputText') or S.torah_he(os.path.basename(rel)[:-4]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--list', required=True)
    ap.add_argument('--shard', type=int, default=0)
    ap.add_argument('--of', type=int, default=1)
    ap.add_argument('--out', required=True)
    ap.add_argument('--probe', action='store_true', help='one request only, to see whether the API is enabled')
    ap.add_argument('--engine', default='google', choices=['google', 'whisper'], help='whisper: OpenAI Whisper large-v3, free, on the runner')
    a = ap.parse_args()
    if a.engine == 'whisper':
        return whisper_main(a)
    k = os.environ.get('GOOGLE_STT_API_KEY', '').strip() or key()   # a separate Speech-to-Text key, if one is set
    if not k:
        sys.exit('voice key not found')
    todo = [l.strip() for l in open(a.list, encoding='utf-8') if l.strip()][a.shard::a.of]
    if a.probe:
        todo = todo[:1]
    gap = np.zeros(int(GAP * SR), np.int16)
    out = open(a.out, 'a', encoding='utf-8')
    i = n = 0
    while i < len(todo):
        chunk, parts, spans, pos = [], [gap[: len(gap) // 2]], [], len(gap) // 2
        while i < len(todo):
            x = pcm(os.path.join(ROOT, todo[i]))
            if chunk and (pos + len(x) + len(gap)) / SR > WINDOW:
                break
            spans.append((pos / SR, (pos + len(x)) / SR)); chunk.append(todo[i]); parts += [x, gap]; pos += len(x) + len(gap); i += 1
        texts = [text_of(c) for c in chunk]
        for attempt in range(4):
            try:
                res = recognize(flac(np.concatenate(parts)), k, [])
                break
            except urllib.error.HTTPError as e:
                msg = e.read().decode(errors='replace')[:400]
                if e.code in (400, 401, 403):
                    print(f'Speech-to-Text refused the request ({e.code}): {msg}', flush=True)
                    sys.exit(3)
                time.sleep(5 * (attempt + 1))
        else:
            continue
        words = [(sec(w['startTime']), sec(w['endTime']), w['word']) for r in res.get('results', []) for w in r['alternatives'][0].get('words', [])]
        for c, t, (s0, s1) in zip(chunk, texts, spans):
            heard = ' '.join(w for (a0, a1, w) in words if (a0 + a1) / 2 >= s0 - 0.3 and (a0 + a1) / 2 <= s1 + 0.3)
            acc, iss, nw = S.compare(t, heard)
            out.write(json.dumps({'file': c, 'text': t, 'heard': heard, 'acc': round(acc, 3), 'issues': [x['say'] for x in iss]}, ensure_ascii=False) + '\n')
        out.flush(); n += len(chunk)
        print(f'{n}/{len(todo)} clips', flush=True)


def whisper_main(a):
    from faster_whisper import WhisperModel
    m = WhisperModel('large-v3', device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 2)
    todo = [l.strip() for l in open(a.list, encoding='utf-8') if l.strip()][a.shard::a.of]
    done = {json.loads(l)['file'] for l in open(a.out, encoding='utf-8')} if os.path.exists(a.out) else set()
    out = open(a.out, 'a', encoding='utf-8')
    for n, c in enumerate(todo, 1):
        if c in done:
            continue
        t = text_of(c)
        x = pcm(os.path.join(ROOT, c)).astype(np.float32) / 32768
        segs, _ = m.transcribe(x, language='he', beam_size=1, temperature=0, condition_on_previous_text=False,
                               vad_filter=False, max_new_tokens=300)
        heard = ' '.join(s.text.strip() for s in segs)
        acc, iss, nw = S.compare(t, heard)
        out.write(json.dumps({'file': c, 'text': t, 'heard': heard, 'acc': round(acc, 3), 'issues': [i['say'] for i in iss], 'engine': 'whisper-large-v3'}, ensure_ascii=False) + '\n')
        out.flush()
        if n % 25 == 0:
            print(f'{n}/{len(todo)}', flush=True)


if __name__ == '__main__':
    main()
