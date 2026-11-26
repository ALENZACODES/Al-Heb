"""Cut the word out of a carrier-phrase take ('הַמִּלָּה, X.'): keep the last stretch of speech after the longest pause.

  python carrier_cut.py takes_root     # every */c-car.mp3 and */c-carkm.mp3 -> c-car-cut.mp3 / c-carkm-cut.mp3
"""
import glob, os, subprocess, sys
import numpy as np
SR = 24000


def decode(p):
    raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, '<i2').astype(np.float32) / 32768


def cut(a):
    win = SR // 100
    n = len(a) // win
    rms = np.sqrt(np.mean(a[:n * win].reshape(n, win) ** 2, axis=1))
    loud = rms > max(0.006, 0.08 * np.percentile(rms, 95))
    idx = np.flatnonzero(loud)
    best, start = 0, None
    for i in range(1, len(idx)):           # longest pause between two loud frames = the comma
        g = idx[i] - idx[i - 1]
        if g > best:
            best, start = g, idx[i]
    if start is None or best < 8:          # no clear pause (< 80 ms): give up
        return None
    s0 = max(0, (start - 3) * win)
    s1 = min(len(a), (idx[-1] + 8) * win)
    return a[s0:s1]


def main(root):
    for p in [q for q in glob.glob(os.path.join(root, '**', '*.mp3'), recursive=True) if os.path.basename(q).startswith('c-car') or q.endswith('-car.mp3')]:
        if p.endswith('-cut.mp3'):
            continue
        w = cut(decode(p))
        if w is None:
            print('no pause:', p); continue
        dst = p[:-4] + '-cut.mp3'
        z = np.zeros(int(0.15 * SR), np.float32)
        pcm = (np.clip(np.concatenate([z, w, z]), -1, 1) * 32767).astype('<i2').tobytes()
        subprocess.run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-',
                        '-codec:a', 'libmp3lame', '-b:a', '64k', dst], input=pcm, check=True)
        print('cut', dst, f'{len(w) / SR:.2f}s')


if __name__ == '__main__':
    main(sys.argv[1])
