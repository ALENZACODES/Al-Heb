#!/usr/bin/env python3
"""Restore the Sacred Listen recordings for clearer, crisper playback. Free tools only: ffmpeg (LGPL) filters.

Source: audio/listen/originals/ (untouched downloads). Output: audio/listen/<name>.ogg and .mp3 (what the app plays).
  python3 tools/audio/cantorial_restore.py            # all files
  python3 tools/audio/cantorial_restore.py --check    # measure only, write nothing

Chains
  historic (pd_*, 1902-1908 discs): mono, rumble cut 90 Hz, de-click, FFT denoise (tracks the noise),
    -2.5 dB at 250 Hz (horn boxiness), +2.5 dB at 2.8 kHz (consonants and voice presence), 6.8 kHz low-pass
    (the discs hold nothing above this but surface hiss), level to -18 LUFS, a gentle downward expander that
    lowers hiss between phrases by at most 9 dB, then -16 LUFS with a -1.5 dBTP limiter.
  modern (cc_*): rumble cut 60 Hz, de-click, light denoise, +1.5 dB presence, same loudness step. No low-pass.
After a run, copy the printed hashes into src/listen/catalog.js (sha256_16).
"""
import hashlib, json, os, subprocess, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SRC = os.path.join(ROOT, 'audio', 'listen', 'originals')
OUT = os.path.join(ROOT, 'audio', 'listen')
MONO = 'pan=mono|c0=0.5*c0+0.5*c1'
CHAINS = {
  'historic': [MONO, 'highpass=f=90:p=2', 'adeclick=w=55:o=75:t=2', 'afftdn=nr=18:nf=-36:tn=1:bm=3',
               'equalizer=f=250:t=q:w=1.2:g=-2.5', 'equalizer=f=2800:t=q:w=1:g=2.5', 'lowpass=f=6800:p=2', 'lowpass=f=6800:p=2'],
  'modern': ['highpass=f=60:p=2', 'adeclick=w=55:o=75:t=2', 'afftdn=nr=8:nf=-45:tn=1', 'equalizer=f=3000:t=q:w=1:g=1.5'],
}
GATE = 'agate=range=0.35:threshold=0.012:ratio=1.6:attack=15:release=350:knee=4'

def run(args): return subprocess.run(args, capture_output=True, text=True)
def loudness(path, af=None):
    a = ['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', (af + ',' if af else '') + 'loudnorm=print_format=json', '-f', 'null', '-']
    e = run(a).stderr; j = json.loads(e[e.rindex('{'):e.rindex('}') + 1]); return float(j['input_i']), float(j['input_tp'])
def sha16(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()[:16]

def render(name, check=False):
    src = os.path.join(SRC, name)
    kind = 'historic' if name.startswith('pd_') else 'modern'
    chain = ','.join(CHAINS[kind])
    i1, _ = loudness(src, chain)
    pre = f'volume={-18 - i1:.2f}dB'
    full = chain + ',' + pre + (',' + GATE if kind == 'historic' else '')
    i2, tp2 = loudness(src, full)
    gain = min(-16 - i2, -1.5 - tp2 + 4.0)  # the limiter may shave up to 4 dB off rare sharp peaks
    final = f'{full},volume={gain:.2f}dB,alimiter=limit=0.84:attack=5:release=50:level=disabled'
    i3, tp3 = loudness(src, final)
    base = os.path.splitext(name)[0]
    if check:
        return dict(file=name, kind=kind, I=i3, TP=tp3)
    ogg, mp3 = os.path.join(OUT, base + '.ogg'), os.path.join(OUT, base + '.mp3')
    for out, codec in ((ogg, ['-c:a', 'libvorbis', '-q:a', '6']), (mp3, ['-c:a', 'libmp3lame', '-q:a', '2'])):
        r = run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', final, '-ar', '44100', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', *codec, out])
        if r.returncode: raise SystemExit(r.stderr)
    if name.endswith('.oga'):
        os.replace(ogg, os.path.join(OUT, base + '.oga')); import shutil; shutil.copyfile(os.path.join(OUT, base + '.oga'), ogg)
    return dict(file=name, kind=kind, I=i3, TP=tp3, sha256_16=sha16(ogg))

if __name__ == '__main__':
    check = '--check' in sys.argv
    names = sorted(n for n in os.listdir(SRC) if n.endswith(('.ogg', '.oga')))
    # the .oga and .ogg originals of the Noah reading are the same recording: render it once from the .oga
    names = [n for n in names if not (n == 'cc_asael_genesis_noah_ashkenaz.ogg')]
    for n in names: print(json.dumps(render(n, check)))
