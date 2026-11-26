"""Audio checks that need no model: is the recording whole and clean? One line per problem.

  truncated     too little speech for the text (more than 7 syllables a second): the voice dropped the end
  pace          outside the natural band (Torah: the verse pace; other lines: 4.14 syllables a second +-25%)
  long pause    a silence over 0.9 s inside a line
  lead / tail   more than 0.6 s of silence before the speech, or 1.5 s after it
  clipping      more than 0.1% of samples at full scale
  loudness      more than 6 dB louder or quieter than the median clip of its kind
  pair          the male and female clips of the same text differ in speech length by more than 1.6x

  python3 audio_qa.py --root . --queue tools/audio/asr-check/multi4-queue.json --out docs/audio/multi4/AUDIO-QA.md
"""
import argparse, json, os, re, statistics, sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import natural as N

SR = 24000


def measure(path, text):
    a = N.decode(path)
    speech, gaps = N.speech_and_gaps(a)
    frame = int(0.02 * SR)
    env = np.array([np.sqrt(np.mean(a[i:i + frame] ** 2)) for i in range(0, max(1, len(a) - frame), frame)]) if len(a) else np.zeros(1)
    on = env > max(env.max() * 0.03, 1e-4)
    first = int(np.argmax(on)) * 0.02 if on.any() else 0.0
    last = (len(on) - int(np.argmax(on[::-1]))) * 0.02 if on.any() else 0.0
    rms = float(np.sqrt(np.mean(a ** 2))) if len(a) else 0.0
    syl = N.syllables(text)
    return dict(dur=len(a) / SR, speech=speech, pace=syl / speech if speech else 0.0, syl=syl,
                gap=max(gaps) if gaps else 0.0, lead=first, tail=len(a) / SR - last,
                clip=float(np.mean(np.abs(a) >= 0.999)) if len(a) else 0.0, db=20 * np.log10(rms + 1e-9))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default='.')
    ap.add_argument('--queue', required=True)
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    q = json.load(open(a.queue, encoding='utf-8'))
    M = {}
    for o in q:
        p = os.path.join(a.root, o['file'])
        if os.path.exists(p):
            M[o['file']] = dict(measure(p, re.sub(r'\s*\(cut from:.*\)\s*$', '', o['want'])), kind=o['kind'], want=o['want'])
    med = {k: statistics.median([m['db'] for m in M.values() if m['kind'] == k]) for k in {m['kind'] for m in M.values()}}
    probs = []
    for f, m in sorted(M.items()):
        torah = N.is_torah(f)
        if m['kind'] == 'sentence' and m['pace'] > 7.0:
            probs.append((f, 'truncated', f"{m['speech']:.1f} s of speech for {m['syl']} syllables ({m['pace']:.1f}/s)"))
        elif m['kind'] == 'sentence' and not torah and abs(m['pace'] / N.NATURAL - 1) > N.LINE_BAND:
            probs.append((f, 'pace', f"{m['pace']:.1f} syllables/s (natural {N.NATURAL})"))
        if m['kind'] == 'sentence' and m['gap'] > N.MAX_GAP:
            probs.append((f, 'long pause', f"{m['gap']:.1f} s"))
        if m['lead'] > 0.6:
            probs.append((f, 'lead', f"{m['lead']:.1f} s of silence first"))
        if m['tail'] > 1.5:
            probs.append((f, 'tail', f"{m['tail']:.1f} s of silence at the end"))
        if m['clip'] > 0.001:
            probs.append((f, 'clipping', f"{m['clip']:.2%} of samples at full scale"))
        if abs(m['db'] - med[m['kind']]) > 6:
            probs.append((f, 'loudness', f"{m['db'] - med[m['kind']]:+.1f} dB from the median"))
    for f, m in M.items():
        if '/m/' in f:
            g = f.replace('/m/', '/f/')
            if g in M and M[g]['speech'] and m['speech']:
                r = m['speech'] / M[g]['speech']
                if not 1 / 1.6 <= r <= 1.6:
                    probs.append((f, 'pair', f"male speech {m['speech']:.1f} s vs female {M[g]['speech']:.1f} s"))
    with open(a.out, 'w', encoding='utf-8') as o:
        o.write('# Audio checks (no model): is each recording whole and clean?\n\n')
        o.write(f'Recordings: **{len(M)}**. With a problem: **{len({p[0] for p in probs})}**.\n\n')
        o.write(__doc__.split('\n\n')[1] + '\n\n')
        o.write('| clip | check | detail |\n|---|---|---|\n')
        for f, k, d in probs:
            o.write(f'| `{f}` | {k} | {d} |\n')
    print(f'{len(M)} recordings, {len({p[0] for p in probs})} with a problem, {len(probs)} problems')
    return probs


if __name__ == '__main__':
    main()
