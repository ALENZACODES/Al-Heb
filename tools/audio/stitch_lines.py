"""Rebuild a sentence or prayer clip from its word clips.

The TTS voice reads single pointed words correctly far more often than it reads them inside a long
sentence (it falls back to unpointed modern guesses mid-sentence: וְצִוָּנוּ read as "vetsimanu",
חֲנֻכָּה slurred). Every word clip has passed the speech-to-text word check, so a sentence joined from
them says every word right. Pauses: a short gap between words, a longer one at a comma and at the
end of a verse (׃) so the result still breathes like a reading.

  python tools/audio/stitch_lines.py --voices f,m prayer/hanukkah-candle line/hanukkah-candle
  python tools/audio/stitch_lines.py --from-scan            # every clip the sentence scan flagged
  python tools/audio/stitch_lines.py --dry-run --from-scan

Word clips are looked up as audio/<v>/israeli/word/<id>-w<N>.mp3 and must line up one to one with
the words of the clip's inputText; a clip whose words do not line up is skipped and reported.
The rebuilt clip replaces the old one; its .meta.json records that it was stitched and from what.
"""
import argparse, glob, json, os, re, subprocess, sys
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SR = 44100
PUNCT = re.compile(r'[׃,.;:!?"\'״׳\-–—()\[\]{}]')
GAP, COMMA, VERSE = 0.09, 0.28, 0.55   # seconds
FADE = int(0.008 * SR)


CANT = re.compile('[\u0591-\u05AF\u05BD\u05C0\u05C3\u05C6]')


def words(text):
    return [w for w in text.split() if PUNCT.sub('', w)]


def norm(w):
    return CANT.sub('', PUNCT.sub('', w)).strip()


# Written forms read aloud as another word (the divine name is read Adonai).
SPOKEN = {'יְהוָה': 'אֲדֹנָי', 'יְהוִה': 'אֱלֹהִים'}

_INDEX = {}
_VERDICT = None


def verdicts():
    global _VERDICT
    if _VERDICT is None:
        import csv
        _VERDICT = {}
        p = os.path.join(ROOT, 'docs', 'audio', 'asr-check.csv')
        if os.path.exists(p):
            for r in csv.DictReader(open(p, encoding='utf-8')):
                for f in [r['file']] + [x for x in (r.get('same_audio_paths') or '').split() if x]:
                    _VERDICT[f.strip()] = r['verdict']
    return _VERDICT


def index(voice):
    """Pointed word text -> word clips for this voice, clips that passed the word check first."""
    if voice not in _INDEX:
        idx = {}
        v = verdicts()
        for mp in glob.glob(os.path.join(ROOT, 'audio', voice, 'israeli', 'word', '*.mp3.meta.json')):
            try:
                t = norm(json.load(open(mp, encoding='utf-8'))['inputText'])
            except Exception:
                continue
            rel = os.path.relpath(mp[:-10], ROOT).replace(os.sep, '/')
            idx.setdefault(t, []).append(({'pass': 0, 'number': 0, 'borderline': 1}.get(v.get(rel, 'pass'), 2), rel))
        for t in idx:
            idx[t].sort()
        _INDEX[voice] = idx
    return _INDEX[voice]


def decode(path):
    raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'quiet', '-i', path, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def trim(x, thr_db=-42, pad=0.015):
    if not len(x):
        return x
    win = int(0.01 * SR)
    n = len(x) // win
    if n == 0:
        return x
    rms = np.sqrt(np.mean(x[:n * win].reshape(n, win) ** 2, axis=1) + 1e-12)
    loud = np.where(20 * np.log10(rms) > thr_db)[0]
    if not len(loud):
        return x
    a = max(0, loud[0] * win - int(pad * SR)); b = min(len(x), (loud[-1] + 1) * win + int(pad * SR))
    y = x[a:b].copy()
    f = min(FADE, len(y) // 4)
    if f:
        y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
    return y


def encode(x, path):
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'quiet', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-codec:a', 'libmp3lame', '-b:a', '96k', path], input=pcm, check=True)


def stitch(voice, rel):
    """rel like 'prayer/hanukkah-candle' or 'line/bless-priestly-1'. Returns (ok, message)."""
    clip = os.path.join(ROOT, 'audio', voice, 'israeli', rel + '.mp3')
    meta_p = clip + '.meta.json'
    if os.path.exists(meta_p):
        meta = json.load(open(meta_p, encoding='utf-8'))
    elif re.match(r'line/torah-[a-z]+-\d+-\d+$', rel):
        sys.path.insert(0, os.path.join(ROOT, 'tools', 'audio', 'asr-check'))
        import scan_lines
        meta = {'inputText': scan_lines.torah_he(os.path.basename(rel)), 'tradition': 'israeli', 'source': 'paid-cloud'}
    else:
        return False, 'no meta'
    text = meta.get('stitchedFromText') or meta['inputText']
    ws = words(text)
    idx = index(voice)
    parts = []
    for w in ws:
        k = norm(w)
        k = SPOKEN.get(k, k)
        hits = idx.get(k)
        if not hits:
            return False, f'no word clip for {w}'
        parts.append(os.path.join(ROOT, hits[0][1]))
    out = []
    for i, (p, w) in enumerate(zip(parts, ws)):
        out.append(trim(decode(p)))
        if i < len(ws) - 1:
            g = VERSE if w.endswith('׃') else COMMA if w.endswith((',', ';', ':')) else GAP
            out.append(np.zeros(int(g * SR), np.float32))
    x = np.concatenate([np.zeros(int(0.12 * SR), np.float32)] + out + [np.zeros(int(0.2 * SR), np.float32)])
    peak = np.max(np.abs(x)) or 1
    x = x * (0.89 / peak)
    return True, (x, meta, meta_p, clip, text, [os.path.relpath(p, ROOT).replace(os.sep, '/') for p in parts])


def flagged_from_scan():
    res = os.path.join(ROOT, 'tools', 'audio', 'asr-check', 'lines-results.jsonl')
    seen = {}
    for l in open(res, encoding='utf-8'):
        r = json.loads(l)
        seen[r['file']] = r
    out = set()
    for f, r in seen.items():
        if r['issues']:
            m = re.match(r'audio/([fm])/israeli/(.+)\.mp3$', f)
            out.add((m.group(1), m.group(2)))
    return sorted(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('clips', nargs='*')
    ap.add_argument('--voices', default='f,m')
    ap.add_argument('--from-scan', action='store_true')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    jobs = flagged_from_scan() if a.from_scan else [(v, c) for v in a.voices.split(',') for c in a.clips]
    done = skipped = 0
    for v, rel in jobs:
        ok, res = stitch(v, rel)
        if not ok:
            print(f'skip {v}/{rel}: {res}'); skipped += 1; continue
        x, meta, meta_p, clip, text, parts = res
        print(f'{"would stitch" if a.dry_run else "stitched"} {v}/{rel}: {len(parts)} words, {len(x) / SR:.1f}s')
        if a.dry_run:
            continue
        encode(x, clip)
        meta.update({'engine': 'stitched-from-word-clips', 'stitchedFromText': text, 'stitchedFrom': parts,
                     'note': 'Joined from its word clips (each passed the speech-to-text word check) because the whole-sentence '
                             'render misread words; see docs/audio/ASR-LINES.md.'})
        json.dump(meta, open(meta_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        done += 1
    print(f'{done} stitched, {skipped} skipped')


if __name__ == '__main__':
    main()
