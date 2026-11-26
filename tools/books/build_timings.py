"""Measured read-along timings for the story books (25 Nov 2026 critique, item 13: "measure real word timing for the books or drop
the highlight-follow claim").

For every book page clip (both voices) it decodes the recording, finds where speech starts and ends, and places each word boundary
at the quietest moment near where the word-length estimate puts it (the dips between words in the voice). The result is written to
data/books/timings/<book id>.json as { "v": 1, "pages": { "<n>": { "f": [[start, end], ...], "m": [...] } } }, one [start, end] in
seconds per word, words split on spaces exactly as the reader splits them (src/books/book.view.js).

A page is left out (the reader then falls back to the estimate and says so) when the clip is missing, the speech span cannot be
found, or fewer than half the boundaries land in a real dip.

Run: python3 tools/books/build_timings.py          (needs ffmpeg and numpy; about two minutes)
     python3 tools/books/build_timings.py --check  (exit 1 when a file would change)
"""
import json, os, re, subprocess, sys
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'data', 'books', 'timings')
SR, HOP = 16000, 160  # 10 ms frames


def envelope(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    n = len(x) // HOP
    if n < 5:
        return None
    rms = np.sqrt((x[: n * HOP].reshape(n, HOP) ** 2).mean(axis=1) + 1e-12)
    k = np.ones(3) / 3
    return np.convolve(rms, k, mode='same')


def weights(words):
    out = []
    for w in words:
        letters = len(re.findall('[א-ת]', w)) or 1
        out.append(letters + (1.5 if re.search(r'[.,!?;:׃]$', w) else 0))
    return out


def align(env, words):
    peak = float(env.max())
    if peak <= 0:
        return None, 0
    on = np.where(env > peak * 0.06)[0]
    if len(on) < 3:
        return None, 0
    s0, s1 = int(on[0]), int(on[-1]) + 1
    w = weights(words); total = sum(w)
    if len(words) == 1:
        return [[s0 / 100, s1 / 100]], 1.0
    span = s1 - s0
    prior, acc = [], 0.0
    for x in w[:-1]:
        acc += x; prior.append(s0 + span * acc / total)
    speech = env[s0:s1]; med = float(np.median(speech)) or 1e-6
    bounds, good, last = [], 0, s0
    avg = span / len(words)
    for i, p in enumerate(prior):
        win = max(12, int(avg * 0.35))
        lo = max(last + 8, int(p - win)); hi = min(s1 - 8 * (len(prior) - i), int(p + win))
        if hi <= lo:
            b = max(last + 1, int(round(p)))
        else:
            seg = env[lo:hi]
            b = lo + int(np.argmin(seg))
            if env[b] < med * 0.5:
                good += 1
        bounds.append(b); last = b
    edges = [s0] + bounds + [s1]
    return [[round(edges[i] / 100, 2), round(edges[i + 1] / 100, 2)] for i in range(len(words))], good / len(prior)


def build():
    shelf = json.load(open(os.path.join(ROOT, 'data', 'books', 'index.json')))['books']
    files, kept, dropped = {}, 0, 0
    for b in shelf:
        book = json.load(open(os.path.join(ROOT, 'data', 'books', f"{b['id']}.json")))
        pages = {}
        for p in book.get('pages', []):
            words = [w for w in re.split(r'\s+', str(p.get('he', ''))) if w]
            if not words or p.get('audioHeld'):
                continue
            row = {}
            for v in ('f', 'm'):
                rel = (p.get('audio') or {}).get(v)
                path = os.path.join(ROOT, rel) if rel else ''
                if not rel or not os.path.exists(path):
                    continue
                try:
                    env = envelope(path)
                except subprocess.CalledProcessError:
                    env = None
                if env is None:
                    dropped += 1; continue
                t, q = align(env, words)
                if t is None or (len(words) > 1 and q < 0.5):
                    dropped += 1; continue
                row[v] = t; kept += 1
            if row:
                pages[str(p['n'])] = row
        if pages:
            files[b['id']] = json.dumps({'v': 1, 'pages': pages}, separators=(',', ':')) + '\n'
    return files, kept, dropped


def main():
    files, kept, dropped = build()
    if '--check' in sys.argv:
        stale = [k for k, t in files.items() if not os.path.exists(os.path.join(OUT, k + '.json')) or open(os.path.join(OUT, k + '.json')).read() != t]
        if stale:
            print('stale:', ', '.join(stale)); return 1
        print('timings are current'); return 0
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.json') and f[:-5] not in files:
            os.remove(os.path.join(OUT, f))
    for k, t in files.items():
        open(os.path.join(OUT, k + '.json'), 'w').write(t)
    print(f'{kept} page clips measured, {dropped} left to the estimate, {len(files)} books')
    return 0


if __name__ == '__main__':
    sys.exit(main())
