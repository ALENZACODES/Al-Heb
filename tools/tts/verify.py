#!/usr/bin/env python3
"""Acceptance gate: transcribe each post-processed MP3 (Hebrew), strip niqqud, compute character error rate against the target text,
reject if CER > --max-cer (default 0.10). Writes tools/tts/verify-report.csv (override --report).

  python3 tools/tts/verify.py --plan tools/tts/plan.json --work ~/alef-tts-work [--model large-v3] [--device cuda|cpu]
  python3 tools/tts/verify.py --engine mock ...    # stdlib only; "transcribes" the mock tone back to the plan text it encodes

What the gate does and does NOT prove: it catches clips where the speech is missing, truncated, repeated or says something else.
It does NOT prove the vowels are right (the transcript has no niqqud) and it does not judge accent or voice quality; a speech
recogniser also errs on short isolated words. Anything accepted still needs a human listening sample (docs/voices/tts-evaluation-protocol.md).
"""
import argparse, csv, json, os, re, subprocess, sys

STRIP = re.compile('[֑-ׇ]')
NONHEB = re.compile('[^א-ת ]')
FINALS = str.maketrans('ךםןףץ', 'כמנפצ')
MOCK_SR = 24000


def strip_niqqud(s):
    s = STRIP.sub('', s or '').replace('־', ' ')
    return re.sub(r'\s+', ' ', NONHEB.sub(' ', s)).strip()


def norm(s):
    """Compare on consonants only, final letters folded, spaces removed (ASR word-splitting is not an error we care about)."""
    return strip_niqqud(s).translate(FINALS).replace(' ', '')


def edit_distance(a, b):
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def cer(ref, hyp):
    r, h = norm(ref), norm(hyp)
    if not r:
        return 1.0 if h else 0.0
    return edit_distance(r, h) / len(r)


def decode_pcm(path):
    p = subprocess.run([os.environ.get('FFMPEG', 'ffmpeg'), '-v', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', str(MOCK_SR), '-'], capture_output=True)
    if p.returncode != 0:
        raise RuntimeError(p.stderr.decode()[:200])
    import array
    a = array.array('h'); a.frombytes(p.stdout[: len(p.stdout) // 2 * 2])
    return a


def mock_freq_of(path):
    """Dominant frequency by zero-crossing rate over the non-silent part."""
    a = decode_pcm(path)
    loud = [i for i, v in enumerate(a) if abs(v) > 800]
    if len(loud) < 200:
        return None, 0.0
    seg = a[loud[0]: loud[-1] + 1]
    zc = sum(1 for i in range(1, len(seg)) if (seg[i - 1] < 0) != (seg[i] < 0))
    return zc / 2 / (len(seg) / MOCK_SR), len(a) / MOCK_SR


def mock_transcribe(path, plan_by_freq):
    f, dur = mock_freq_of(path)
    if f is None:
        return '', dur
    best = min(plan_by_freq, key=lambda k: abs(k - f))
    return (plan_by_freq[best] if abs(best - f) <= 12 else ''), dur


def duration_of(path):
    p = subprocess.run([os.environ.get('FFPROBE', 'ffprobe'), '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True)
    try:
        return float(p.stdout.strip())
    except ValueError:
        return 0.0


def main(argv=None):
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--plan', default=os.path.join(here, 'plan.json'))
    ap.add_argument('--work', default=os.environ.get('ALEF_TTS_WORK') or os.path.expanduser('~/alef-tts-work'))
    ap.add_argument('--report', default=os.path.join(here, 'verify-report.csv'))
    ap.add_argument('--engine', choices=['faster-whisper', 'mock'], default='faster-whisper')
    ap.add_argument('--mock', action='store_true')
    ap.add_argument('--model', default='large-v3'); ap.add_argument('--device', default='auto'); ap.add_argument('--compute-type', default='default')
    ap.add_argument('--max-cer', type=float, default=0.10)
    ap.add_argument('--min-seconds', type=float, default=0.2); ap.add_argument('--max-seconds', type=float, default=20.0)
    a = ap.parse_args(argv)
    engine = 'mock' if a.mock else a.engine
    plan = json.load(open(a.plan, encoding='utf-8'))
    items = plan['items']
    model = None
    plan_by_freq = {}
    if engine == 'mock':
        sys.path.insert(0, here)
        from render_chatterbox import mock_freq  # same mapping the mock renderer used
        for it in items:
            plan_by_freq[mock_freq(it['order'])] = it['text']
    else:
        from faster_whisper import WhisperModel  # MIT; model weights downloaded on first use
        model = WhisperModel(a.model, device=a.device, compute_type=a.compute_type)
    rows, acc, rej, none = [], 0, 0, 0
    for it in items:
        mp3 = os.path.join(a.work, 'mp3', 'audio', it['voice'], it['tradition'], it['kind'], it['id'] + '.mp3')
        if not os.path.exists(mp3):
            none += 1; continue
        try:
            if engine == 'mock':
                hyp, dur = mock_transcribe(mp3, plan_by_freq)
            else:
                dur = duration_of(mp3)
                segs, _ = model.transcribe(mp3, language='he', beam_size=5, vad_filter=False, condition_on_previous_text=False)
                hyp = ' '.join(s.text.strip() for s in segs)
            c = cer(it['text'], hyp)
            reason = ''
            if dur < a.min_seconds: reason = f'too short ({dur:.2f}s)'
            elif dur > a.max_seconds: reason = f'too long ({dur:.2f}s)'
            elif not norm(hyp): reason = 'no speech recognised'
            elif c > a.max_cer: reason = f'CER {c:.3f} > {a.max_cer}'
            verdict = 'reject' if reason else 'accept'
        except Exception as e:  # a clip that cannot be decoded or transcribed is rejected, never silently accepted
            hyp, c, dur, reason, verdict = '', 1.0, 0.0, f'error: {e}', 'reject'
        acc += verdict == 'accept'; rej += verdict == 'reject'
        rows.append({'voice': it['voice'], 'tradition': it['tradition'], 'kind': it['kind'], 'id': it['id'], 'path': it['path'], 'target': it['text'],
                     'target_unpointed': strip_niqqud(it['text']), 'transcript': hyp, 'cer': f'{c:.4f}', 'seconds': f'{dur:.2f}',
                     'verdict': verdict, 'reason': reason, 'engine': engine if engine == 'mock' else f'faster-whisper:{a.model}', 'max_cer': a.max_cer})
    os.makedirs(os.path.dirname(os.path.abspath(a.report)), exist_ok=True)
    cols = ['voice', 'tradition', 'kind', 'id', 'path', 'target', 'target_unpointed', 'transcript', 'cer', 'seconds', 'verdict', 'reason', 'engine', 'max_cer']
    with open(a.report, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, cols); w.writeheader(); w.writerows(rows)
    print(f'verify: {acc} accepted, {rej} rejected, {none} without an MP3 -> {a.report} (engine={engine})')


if __name__ == '__main__':
    main()
