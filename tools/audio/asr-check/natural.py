"""Does a take sound natural next to its neighbours? Pace and pauses, measured the same way as the Torah pace work
(tools/torah/audio/ipa/pace.py: syllables per second of speech, pauses left out).

  Torah verse   pace within reach of the verse clip it replaces (speed factor 0.7-1.4) (all set to 4.6 syl/s by pace.py), then brought to that pace (atempo, pitch kept) and written
                like the other verse clips: 24 kHz, 32 kbps, 0.15 s before and 0.45 s after.
  other lines   pace within 25% of a natural reading pace (the Torah verse pace, 4.14 as measured here), or else stretched to
                that pace (atempo, pitch kept, speed factor 0.7-1.4); no pause longer than
                0.9 s inside the line (a take joined from several requests has its joins shortened to 0.3 s first).
  single words  no pace rule; a 0.9-speed take is only used when no normal-speed take passes.
"""
import os, re, statistics, subprocess, sys, tempfile, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'torah', 'audio', 'ipa'))
sys.path.insert(0, HERE)
SR = 24000
TORAH_PACE, TORAH_BAND, LINE_BAND, MAX_GAP = 4.6, 0.15, 0.25, 0.9
# natural reading pace as this file measures it: the median of the Torah verse clips (set to 4.6 syl/s by pace.py,
# which counts syllables a little differently) is 4.14 here. Many prayer lines were joined from word clips and run slow,
# so they are not the reference.
NATURAL = 4.14
LEAD, TAIL = 0.15, 0.45
# a take that reads too fast or too slow is brought to the natural pace with atempo (pitch kept), within these speed factors
STRETCH_MIN, STRETCH_MAX = 0.7, 1.4
_syl_cache = {}


def is_torah(f):
    return os.path.basename(f).startswith('torah-')


def decode(path):
    out = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(out, '<i2').astype(np.float32) / 32768


def frames(a):
    win = SR // 50
    n = len(a) // win
    rms = np.sqrt(np.mean(a[:n * win].reshape(n, win) ** 2, axis=1)) if n else np.zeros(0)
    return rms > max(0.006, 0.08 * np.percentile(rms, 95)) if n else rms.astype(bool), win


def speech_and_gaps(a):
    """(seconds of speech, list of pause lengths inside the speech), 20 ms frames; gaps under 180 ms count as speech."""
    loud, win = frames(a)
    idx = np.flatnonzero(loud)
    if not len(idx):
        return 0.0, []
    speech, gap, gaps = 0, 0, []
    for v in loud[idx[0]:idx[-1] + 1]:
        if v:
            if gap >= 9:
                gaps.append(gap * win / SR)
            speech += 1 + (gap if gap < 9 else 0)
            gap = 0
        else:
            gap += 1
    return speech * win / SR, gaps


def syllables(text):
    if text not in _syl_cache:
        import phoneme_review as P
        import phon4
        P.fold = phon4.fold2
        _, exp = P.expected(re.sub(r'\s*\(cut from:.*\)\s*$', '', text))
        _syl_cache[text] = sum(sum(c in 'aeiou' for c in e) for e in exp)
    return _syl_cache[text]


def pace(path, text):
    s, _ = speech_and_gaps(decode(path))
    return syllables(text) / s if s else 0.0


def tighten(a, longest=0.5, to=0.3):
    """Shorten every pause inside the speech longer than `longest` seconds to `to` seconds (joins between requests)."""
    loud, win = frames(a)
    idx = np.flatnonzero(loud)
    if not len(idx):
        return a
    keep, i, n = [], 0, len(loud)
    out = [a[:idx[0] * win]]
    run_start = idx[0]
    k = idx[0]
    while k <= idx[-1]:
        if loud[k]:
            k += 1; continue
        j = k
        while j <= idx[-1] and not loud[j]:
            j += 1
        if (j - k) * win / SR > longest:
            out.append(a[run_start * win:k * win])
            out.append(np.zeros(int(to * SR), np.float32))
            run_start = j
        k = j
    out.append(a[run_start * win:])
    return np.concatenate(out)


def write_mp3(a, dest, torah, factor=1.0):
    tmp = tempfile.mkdtemp(prefix='alef-nat-')
    src = os.path.join(tmp, 'in.wav')
    with wave.open(src, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(a, -1, 1) * 32767).astype('<i2').tobytes())
    # every clip: cut the silence the voice left around the speech, then the same short lead and tail
    loud, win = frames(a)
    idx = np.flatnonzero(loud)
    a0, a1 = (idx[0] * win, (idx[-1] + 1) * win) if len(idx) else (0, len(a))
    filt = f'atrim=start_sample={max(0, a0 - int(0.03 * SR))}:end_sample={min(len(a), a1 + int(0.05 * SR))},asetpts=N/SR/TB,'
    filt += (f'atempo={factor:.4f},' if abs(factor - 1) > 0.005 else '') + f'adelay={int(LEAD * 1000)},apad=pad_dur={TAIL}'
    if torah:
        args = ['-af', filt, '-ar', str(SR), '-b:a', '32k']
    else:
        args = ['-af', filt + ',loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', '-b:a', '96k']
    subprocess.run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-i', src, '-map_metadata', '-1', '-ac', '1', *args,
                    '-codec:a', 'libmp3lame', dest], check=True)


def line_reference(paces=None):
    return NATURAL


def judge(kind, clip, text, take_path, ref_pace=None):
    """(ok, note, pace, prepared samples, tempo factor) for one take."""
    if kind == 'word':
        return True, '', None, decode(take_path), 1.0
    a = decode(take_path)
    joined = len(text.split()) > 18          # long prayers were requested in pieces
    if joined:
        a = tighten(a)
    s, gaps = speech_and_gaps(a)
    p = syllables(text) / s if s else 0.0
    if gaps and max(gaps) > MAX_GAP:              # a long pause inside the line: shorten it rather than drop the take
        a = tighten(a, longest=MAX_GAP, to=0.5)
        s, gaps = speech_and_gaps(a)
        p = syllables(text) / s if s else 0.0
    if is_torah(clip):
        # the verse clips were all set to one pace (4.6 syl/s by pace.py); match the clip's own pace, so the take
        # reads at the same speed as every other verse (same text, so the syllable count cancels out)
        p0 = pace(os.path.join(ROOT, clip), text)
        if not p0 or not (1 / STRETCH_MAX <= p / p0 <= 1 / STRETCH_MIN):
            return False, f'pace {p / p0:.2f}x the Torah pace (too far to stretch)', p, a, 1.0
        return True, f'pace {p / p0:.2f}x -> 1.00x the Torah pace', p, a, p0 / p
    ref_pace = ref_pace or NATURAL
    if abs(p / ref_pace - 1) <= LINE_BAND:
        return True, f'pace {p:.1f} syl/s', p, a, 1.0
    factor = ref_pace / p                    # atempo speed factor that brings the take to the natural pace
    if not STRETCH_MIN <= factor <= STRETCH_MAX:
        return False, f'pace {p:.1f} syl/s (natural is {ref_pace:.1f}; too far to stretch)', p, a, 1.0
    return True, f'pace {p:.1f} -> {ref_pace:.1f} syl/s (stretched, pitch kept)', p, a, factor
