"""Re-records Hebrew Torah verse clips at one steady pace, with short pauses at the verse's main breaks.

Why: the first recordings (plan.py + render.ps1) came out at two speeds that change from verse to verse at random, about
3.3 syllables a second for two thirds of them and about 5.5 for the rest (measured 17 Nov 2026), and the verse was one
unbroken run of words with no pause at the etnachta, so a chapter played verse by verse jumped between slow and fast and
did not flow.

What this does for each verse and voice:
  - the same words and the same exact sounds as plan.py (ipa.json, customPronunciations under de-DE);
  - a comma after a word carrying a major pausing mark (etnachta, segolta, shalshelet, zaqef qatan, zaqef gadol), so the
    voice pauses where a reader does; the verse still ends with a full stop;
  - the take's speaking pace is measured (syllables per second of speech, pauses left out); a take outside the band is
    recorded again (up to --takes times), then the closest take is gently stretched or squeezed to the target pace with
    ffmpeg atempo (pitch kept), never by more than 15%;
  - the clip gets the same lead-in and tail silence, so verses follow each other evenly;
  - written as MP3, mono, 24 kHz, 32 kbps like the clips it replaces.

  python3 tools/torah/audio/ipa/pace.py --measure [paths...]          # report the pace of existing clips (no key needed)
  python3 tools/torah/audio/ipa/pace.py --book genesis --chapter 1 [--shard 0 --shards 4] --execute
  python3 tools/torah/audio/ipa/pace.py --stretch-existing [--skip ids.txt] [--shard 0 --shards 2]   # free: no new recordings
Needs GOOGLE_TTS_API_KEY and ffmpeg for --execute. Log: tools/torah/audio/ipa/pace-log.jsonl
"""
import argparse, base64, io, json, os, subprocess, sys, tempfile, time, urllib.request, wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
sys.path.insert(0, str(HERE))
import plan as P  # noqa: E402

SR = 24000
TARGET = 4.6            # syllables per second of speech (pauses left out); set from the clips heard as natural, see --measure
BAND = 0.08             # a take within 8% of the target is kept as it is
MAX_STRETCH = 0.15
LEAD, TAIL = 0.15, 0.45  # seconds of silence before and after the verse
PAUSE_MARKS = {'֑': ',', '֒': ',', '֓': ',', '֔': ',', '֕': ','}   # etnachta, segolta, shalshelet, zaqef qatan, zaqef gadol


def syllables(v):
    return sum(sum(c in 'aeiou' for c in w['ipa']) for w in v['words'])


def speech_span(a):
    """Seconds of speech in the samples: 20 ms frames above a level set from the loud part of the take, with gaps
    under 180 ms counted as speech (the closure inside a word), longer gaps left out."""
    win = SR // 50
    n = len(a) // win
    if n == 0:
        return 0.0, 0, 0
    rms = np.sqrt(np.mean(a[:n * win].reshape(n, win) ** 2, axis=1))
    loud = rms > max(0.006, 0.08 * np.percentile(rms, 95))
    idx = np.flatnonzero(loud)
    if not len(idx):
        return 0.0, 0, 0
    first, last = idx[0], idx[-1]
    speech, gap = 0, 0
    for v in loud[first:last + 1]:
        if v:
            speech += 1 + (gap if gap < 9 else 0)
            gap = 0
        else:
            gap += 1
    return speech * win / SR, first * win, (last + 1) * win


def decode(path):
    out = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(out, '<i2').astype(np.float32) / 32768


def pace_of(a, syl):
    s, _, _ = speech_span(a)
    return syl / s if s else 0.0


def request(v, voice):
    labels, prons, seen = [], [], {}
    for w in v['words']:
        spoken_words = w['ipa'].split()
        for k, spoken in enumerate(spoken_words):
            lab = P.latin(spoken)
            syl = P.for_google(P.syllabify(spoken))
            if lab in seen and seen[lab] != syl:
                lab = lab + 'h' * (1 + sum(1 for x in seen if x.rstrip('h') == lab))
            if lab not in seen:
                seen[lab] = syl
                prons.append({'phrase': lab, 'phoneticEncoding': 'PHONETIC_ENCODING_IPA', 'pronunciation': syl})
            mark = next((PAUSE_MARKS[c] for c in w['source'] if c in PAUSE_MARKS), '') if k == len(spoken_words) - 1 else ''
            labels.append(lab + mark)
    text = ' '.join(labels).rstrip(',') + '.'
    return {'input': {'text': text, 'customPronunciations': {'pronunciations': prons}},
            'voice': {'languageCode': 'de-DE', 'name': voice},
            'audioConfig': {'audioEncoding': 'LINEAR16', 'sampleRateHertz': SR}}


def synth(body, key):
    req = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize', data=json.dumps(body, ensure_ascii=False).encode(),
                                 method='POST', headers={'Content-Type': 'application/json; charset=utf-8', 'X-Goog-Api-Key': key})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                raw = base64.b64decode(json.load(r)['audioContent'])
            with wave.open(io.BytesIO(raw)) as w:
                return np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float32) / 32768
        except Exception:  # noqa: BLE001
            if attempt == 3:
                raise
            time.sleep(3 * (attempt + 1))


def finish(a, factor, dest, stretch='atempo'):
    """Trim to the speech, set the lead-in and tail, apply the tempo factor, write the MP3."""
    _, s0, s1 = speech_span(a)
    a = a[max(0, s0 - int(0.03 * SR)):min(len(a), s1 + int(0.05 * SR))]
    tmp = tempfile.mkdtemp(prefix='alef-pace-')
    src = os.path.join(tmp, 'in.wav')
    with wave.open(src, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(a, -1, 1) * 32767).astype('<i2').tobytes())
    tempo = (f'atempo={factor:.4f},' if stretch == 'atempo' else f'rubberband=tempo={factor:.4f}:transients=smooth:detector=soft:window=standard,')
    filt = (tempo if abs(factor - 1) > 0.005 else '') + f'adelay={int(LEAD * 1000)},apad=pad_dur={TAIL}'
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-i', src, '-af', filt, '-map_metadata', '-1', '-ac', '1', '-ar', str(SR),
                    '-b:a', '32k', '-codec:a', 'libmp3lame', str(dest)], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--measure', nargs='*')
    ap.add_argument('--book'); ap.add_argument('--chapter', type=int)
    ap.add_argument('--ids', help='file of verse ids (torah-genesis-1-1), one per line')
    ap.add_argument('--voices', default='mf')
    ap.add_argument('--shard', type=int, default=0); ap.add_argument('--shards', type=int, default=1)
    ap.add_argument('--takes', type=int, default=4)
    ap.add_argument('--execute', action='store_true')
    ap.add_argument('--stretch-existing', action='store_true',
                    help='no new recordings: bring each existing clip to the target pace (rubberband, pitch kept, 0.7x to 1.4x) and even its silences')
    ap.add_argument('--skip', help='file of verse ids to leave alone (already re-recorded)')
    ap.add_argument('--log', default=str(HERE / 'pace-log.jsonl'))
    a = ap.parse_args()
    verses = json.loads((HERE / 'ipa.json').read_text(encoding='utf8'))
    if a.measure is not None:
        by = {v['id']: v for v in verses}
        paths = a.measure or [str(ROOT / f"audio/{g}/israeli/line/{v['id']}.mp3") for v in verses for g in 'mf']
        for p in paths:
            vid = Path(p).stem
            if vid in by and os.path.exists(p):
                print(json.dumps({'path': os.path.relpath(p, ROOT), 'pace': round(pace_of(decode(p), syllables(by[vid])), 2)}))
        return
    ids = {l.strip() for l in open(a.ids)} if a.ids else None
    todo = [v for v in verses if (not a.book or v['book'] == a.book) and (not a.chapter or v['chapter'] == a.chapter) and (ids is None or v['id'] in ids)]
    jobs = [(v, g) for v in todo for g in a.voices]
    jobs = jobs[a.shard::a.shards]
    print(len(jobs), 'clips', flush=True)
    key = os.environ.get('GOOGLE_TTS_API_KEY')
    if not a.execute and not a.stretch_existing:
        for v, g in jobs[:3]:
            print(json.dumps(request(v, P.VOICES['ari' if g == 'm' else 'noa'][1])['input']['text'], ensure_ascii=False))
        return
    if a.stretch_existing:
        skip = {l.strip() for l in open(a.skip)} if a.skip else set()
        for n, (v, g) in enumerate(jobs, 1):
            dest = ROOT / f"audio/{g}/israeli/line/{v['id']}.mp3"
            if v['id'] in skip or not dest.exists():
                continue
            syl, audio = syllables(v), decode(dest)
            before = pace_of(audio, syl)
            factor = 1.0 if not before or abs(before / TARGET - 1) <= 0.05 else min(1.4, max(0.7, TARGET / before))
            finish(audio, factor, dest, 'rubberband')
            rec = {'id': v['id'], 'voice': g, 'syllables': syl, 'before': round(before, 2), 'tempo': round(factor, 3), 'after': round(pace_of(decode(dest), syl), 2)}
            with open(a.log, 'a', encoding='utf-8') as f:
                f.write(json.dumps(rec) + '\n')
            if n % 200 == 0:
                print(f'[{n}/{len(jobs)}]', flush=True)
        return
    if not key:
        sys.exit('Set GOOGLE_TTS_API_KEY first.')
    for n, (v, g) in enumerate(jobs, 1):
        voice = P.VOICES['ari' if g == 'm' else 'noa'][1]
        body, syl = request(v, voice), syllables(v)
        takes = []
        for t in range(a.takes):
            try:
                audio = synth(body, key)
            except Exception as ex:  # noqa: BLE001
                takes.append({'error': str(ex)[:160]}); continue
            pace = pace_of(audio, syl)
            takes.append({'pace': round(pace, 2), 'audio': audio})
            if abs(pace / TARGET - 1) <= BAND:
                break
        good = [t for t in takes if 'audio' in t and t['pace']]
        rec = {'id': v['id'], 'voice': g, 'syllables': syl, 'takes': [t.get('pace', t.get('error')) for t in takes]}
        if good:
            best = min(good, key=lambda t: abs(t['pace'] / TARGET - 1))
            factor = min(1 + MAX_STRETCH, max(1 - MAX_STRETCH, TARGET / best['pace']))
            dest = ROOT / f"audio/{g}/israeli/line/{v['id']}.mp3"
            finish(best['audio'], factor, dest)
            rec.update({'kept': best['pace'], 'tempo': round(factor, 3), 'after': round(pace_of(decode(dest), syl), 2)})
        else:
            rec['outcome'] = 'no take'
        with open(a.log, 'a', encoding='utf-8') as f:
            f.write(json.dumps(rec) + '\n')
        print(f"[{n}/{len(jobs)}] {v['id']} {g} takes {rec['takes']} -> {rec.get('after')}", flush=True)


if __name__ == '__main__':
    main()
