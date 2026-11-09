"""Re-record letter names that sound wrong (for example Shin heard as "shit"), listen, then keep the best take.

  set GOOGLE_TTS_API_KEY=...
  python tools/audio/asr-check/letter_takes.py shin            # makes takes in audio/_review/letters/shin/
  python tools/audio/asr-check/letter_takes.py shin yod        # several letters
  (listen to the takes, then:)
  python tools/audio/asr-check/letter_takes.py --pick shin=3   # copies take 3 over the Shin name, man and woman

Takes, per voice (Ari = m, Noa = f):
  1 WaveNet, pointed name      2 WaveNet, name with the vowel letter spelled out and a trailing pause
  3 Chirp 3 HD, pointed name   4 Chirp 3 HD, name said inside a short phrase, then trimmed to the name
  5 WaveNet, slower (0.85)
  6+ extra spellings for letters listed in EXTRA (vav, shin, yod), WaveNet then Chirp 3 HD
If faster-whisper is installed, each take is also checked by the speech-to-text model and its score is printed.
The pick overwrites audio/{m,f}/israeli/letter/<id>.mp3 and audio/{m,f}/israeli/letter-lecture/<id>-name.mp3.
"""
import json
import os
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
from fix import ROOT, VOICES, synth_rate, encode  # noqa: E402

REVIEW = os.path.join(ROOT, 'audio', '_review', 'letters')
# Extra spellings for names the voice misreads. Each gives takes 6 and up (WaveNet, then Chirp 3 HD).
# Vav: "ואו" is how Israelis write the name; "וָב" can only be read "vav" (bet without a dot is v).
EXTRA = {'vav': ['וָאו', 'וָב'], 'shin': ['שִׁין.'], 'yod': ['יוּד']}


def letter_name(lid):
    for r in json.load(open(os.path.join(ROOT, 'data', 'audio', 'manifest.json'), encoding='utf-8')):
        if r.get('kind') == 'letter' and r.get('id') == lid and r.get('tradition') == 'israeli':
            return r['text']
    raise SystemExit(f'no letter "{lid}" in data/audio/manifest.json')


def trim_last_word(src, dst):
    """Keep only the last spoken word of a short phrase (split at the longest pause)."""
    out = subprocess.run(['ffmpeg', '-nostdin', '-i', src, '-af', 'silencedetect=n=-35dB:d=0.12', '-f', 'null', '-'], capture_output=True, text=True).stderr
    ends = [float(l.split('silence_end: ')[1].split()[0]) for l in out.splitlines() if 'silence_end' in l]
    start = max(0.0, ends[-2] - 0.05) if len(ends) >= 2 else 0.0
    subprocess.run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-ss', f'{start:.3f}', '-i', src, dst], check=True)


def make(lid, key):
    he = letter_name(lid)
    import re
    plain = re.sub(r'[֑-ׇ]', '', he)
    os.makedirs(os.path.join(REVIEW, lid), exist_ok=True)
    try:
        import check_lib as L
        L.model()
    except Exception:
        L = None
    for v, (wavenet, hd) in VOICES.items():
        takes = [(wavenet, he, 1.0, False), (wavenet, plain + ',', 1.0, False), (hd, he, 1.0, False),
                 (hd, 'האות ' + he, 1.0, True), (wavenet, he, 0.85, False)]
        for alt in EXTRA.get(lid, []):
            takes += [(wavenet, alt, 1.0, False), (hd, alt, 1.0, False)]
        for i, (voice, text, rate, phrase) in enumerate(takes, 1):
            raw = os.path.join(REVIEW, lid, f'raw-{v}-{i}.mp3')
            out = os.path.join(REVIEW, lid, f'take-{i}-{"ari" if v == "m" else "noa"}.mp3')
            try:
                open(raw, 'wb').write(synth_rate(text, voice, key, rate))
                if phrase:
                    t = raw.replace('.mp3', '-trim.mp3'); trim_last_word(raw, t); raw = t
                encode(raw, out, False)
            except Exception as e:  # keep going with the other takes
                print(f'{lid} take {i} {v}: failed ({e})'); continue
            note = ''
            if L:
                heard = L.hear(out); note = f'  heard "{heard}" score {L.score(he, heard):.2f}'
            print(f'{out}{note}')
    for f in os.listdir(os.path.join(REVIEW, lid)):
        if f.startswith('raw-'):
            os.remove(os.path.join(REVIEW, lid, f))
    print(f'Listen to the takes in {os.path.join(REVIEW, lid)}, then run: python tools/audio/asr-check/letter_takes.py --pick {lid}=N')


def pick(spec):
    lid, n = spec.split('=')
    for v, who in (('m', 'ari'), ('f', 'noa')):
        src = os.path.join(REVIEW, lid, f'take-{n}-{who}.mp3')
        if not os.path.exists(src):
            raise SystemExit(f'missing {src}: make the takes first')
        for dst in (f'audio/{v}/israeli/letter/{lid}.mp3', f'audio/{v}/israeli/letter-lecture/{lid}-name.mp3'):
            full = os.path.join(ROOT, dst)
            if os.path.exists(full) or dst.endswith(f'/letter/{lid}.mp3'):
                shutil.copyfile(src, full); print('replaced', dst)
    print('Now: node tools/build-precache.mjs, then git add -A, git commit -m "Letter name fix", git push')


if __name__ == '__main__':
    args = sys.argv[1:]
    if args and args[0] == '--pick':
        for s in args[1:]:
            pick(s)
    else:
        key = os.environ.get('GOOGLE_TTS_API_KEY')
        if not key:
            raise SystemExit('Set GOOGLE_TTS_API_KEY first.')
        for lid in args or ['shin']:
            make(lid, key)
