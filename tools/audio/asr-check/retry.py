"""Keep re-recording the clips listed in docs/audio/ASR-NEEDS-HUMAN.md until a take passes the speech-to-text check.

  set GOOGLE_TTS_API_KEY=...
  py tools/audio/asr-check/retry.py            # dry run: how many tries per word
  py tools/audio/asr-check/retry.py --execute

Google returns the same audio for the same request, so each try changes something. Per clip, in this order:
  voices  the character's own voice first (Ari: Wavenet-B, Chirp3-HD-Charon; Noa: Wavenet-A, Chirp3-HD-Kore),
          then the other Google Hebrew voices of the same gender
  speeds  1.0, 0.9, 0.8
  text    pointed; unpointed; full spelling (vowel letters written in: holam and qubutz as ו, hiriq as י)
It stops at the first take that scores a full match, else keeps the best take that reaches the pass mark.
A clip that passes is written over every file sharing its audio and removed from ASR-NEEDS-HUMAN.md.
A take in another voice than the character's own is logged (voice name in fix-log.jsonl) so it can be swapped later.
"""
import argparse
import json
import os
import re
import sys
import tempfile

sys.path.insert(0, os.path.dirname(__file__))
import check_lib as L  # noqa: E402
from fix import ROOT, LOG, synth_rate, encode, speakable, voice_of, rows_by_file  # noqa: E402

# A letter's "sound" clip is the letter with patah (שַׁ sha): a voice handed a bare letter says a clipped letter name.
SOUND_TEXT = {'alef': 'אַ', 'bet': 'בַּ', 'vet': 'בַ', 'gimel': 'גַּ', 'dalet': 'דַּ', 'he': 'הַ', 'vav': 'וַ', 'zayin': 'זַ',
              'chet': 'חַ', 'tet': 'טַ', 'yod': 'יַ', 'kaf': 'כַּ', 'khaf': 'כַ', 'lamed': 'לַ', 'mem': 'מַ', 'nun': 'נַ',
              'samekh': 'סַ', 'ayin': 'עַ', 'pe': 'פַּ', 'fe': 'פַ', 'tsadi': 'צַ', 'qof': 'קַ', 'resh': 'רַ', 'shin': 'שַׁ',
              'sin': 'שַׂ', 'tav': 'תַּ'}


def index_row(path):
    """Any clip listed in audio/INDEX.csv (letters were not in the scan report)."""
    import csv
    with open(os.path.join(ROOT, 'audio', 'INDEX.csv'), encoding='utf-8') as f:
        for r in csv.DictReader(f):
            if r['file'] == path:
                return {'pointed_hebrew': r['pointed_hebrew'], 'file': path, 'same_audio_paths': path}
    return None


def sound_row(path):
    m = re.search(r'/letter/([a-z]+)-sound\.mp3$', path)
    if m and m.group(1) in SOUND_TEXT:
        return {'pointed_hebrew': SOUND_TEXT[m.group(1)], 'file': path, 'same_audio_paths': path}
    return None


VOICES = {
    'm': ['he-IL-Wavenet-B', 'he-IL-Chirp3-HD-Charon', 'he-IL-Wavenet-D', 'he-IL-Standard-B', 'he-IL-Standard-D',
          'he-IL-Chirp3-HD-Puck', 'he-IL-Chirp3-HD-Orus', 'he-IL-Chirp3-HD-Fenrir'],
    'f': ['he-IL-Wavenet-A', 'he-IL-Chirp3-HD-Kore', 'he-IL-Wavenet-C', 'he-IL-Standard-A', 'he-IL-Standard-C',
          'he-IL-Chirp3-HD-Aoede', 'he-IL-Chirp3-HD-Leda', 'he-IL-Chirp3-HD-Zephyr'],
}
RATES = [1.0, 0.9, 0.8]


_latin = None


def latin_hear(path):
    """What a general (not Hebrew-tuned) Whisper writes in English letters: 'va' vs 'ba', 'pa' vs 'fa'.
    Model: Systran/faster-whisper-medium, about 1.5 GB, downloaded on first use (ALEF_LATIN_MODEL to use a local copy)."""
    global _latin
    import numpy as np
    if _latin is None:
        from faster_whisper import WhisperModel
        _latin = WhisperModel(os.environ.get('ALEF_LATIN_MODEL', 'Systran/faster-whisper-medium'), device='cpu', compute_type='int8')
    au = L.load(path)
    au = np.concatenate([np.zeros(4000, np.float32), au, np.zeros(8000, np.float32)])
    segs, _ = _latin.transcribe(au, language='en', beam_size=5, without_timestamps=True, condition_on_previous_text=False,
                                max_new_tokens=10, initial_prompt='Hebrew syllables: ba, va, pa, fa, ka, kha.')
    return ' '.join(x.text.strip() for x in segs)


def full_spelling(pointed):
    """Write the vowels in as letters (ktiv male) so a voice that guesses vowels has less to guess."""
    s = speakable(pointed)
    s = re.sub('([א-ת][ְ-ׇ]*?)ֻ', '\\1ו', s)            # qubutz -> vav
    s = re.sub('([\u05D0-\u05D4\u05D6-\u05EA][\u05B0-\u05C7]*?)\u05B9(?!\u05D5)', '\\1\u05D5', s)  # holam not on a vav -> vav
    s = re.sub('([\u05D0-\u05D8\u05DA-\u05EA][\u05B0-\u05C7]*?)\u05B4(?![\u05D9\u05D5])', '\\1\u05D9', s)  # hiriq not on a yod -> yod
    return L.plain(s)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--execute', action='store_true')
    ap.add_argument('--paths', help='comma list of clip paths to redo instead of the ones in ASR-NEEDS-HUMAN.md')
    ap.add_argument('--latin', help="also require an English-letters hearing to match this regex, e.g. '^[vw]ah?$' for va: "
                    "Hebrew spells b and v (and p/f) with one letter, so only Latin letters can tell them apart")
    a = ap.parse_args()
    need = os.path.join(ROOT, 'docs', 'audio', 'ASR-NEEDS-HUMAN.md')
    lines = open(need, encoding='utf-8').read().splitlines()
    todo = [(ln, re.search(r'`([^`]+)`', ln).group(1)) for ln in lines if re.search(r'`([^`]+)`', ln)]
    if a.paths:
        want = [p.strip() for p in a.paths.split(',') if p.strip()]
        todo = [(next((ln for ln, p in todo if p == w), None), w) for w in want]
    rows = rows_by_file()
    plan = []
    for ln, path in todo:
        r = rows.get(path) or sound_row(path) or index_row(path)
        if not r:
            print('not in asr-check.csv, skipped:', path)
            continue
        is_sound = r.get('same_audio_paths') == path and sound_row(path) is not None
        if is_sound:  # never the bare letter (that is what read as a clipped name); patah, then qamats + he ('פָה')
            base = r['pointed_hebrew'][0] + re.sub('[\u05B7]', '', r['pointed_hebrew'][1:])
            texts = [r['pointed_hebrew'], base + '\u05B8' + 'ה']
        else:
            texts = list(dict.fromkeys([speakable(r['pointed_hebrew']), L.plain(r['pointed_hebrew']), full_spelling(r['pointed_hebrew'])]))
        takes = [(v, t, rate) for v in VOICES[voice_of(path)] for rate in RATES for t in texts]
        plan.append((ln, r, takes, is_sound))
        print(f"{r['pointed_hebrew']:<16} {path}  up to {len(takes)} takes; spellings: {' | '.join(texts)}")
    if not a.execute:
        print('dry run: add --execute (needs GOOGLE_TTS_API_KEY)')
        return
    key = os.environ.get('GOOGLE_TTS_API_KEY') or sys.exit('Set GOOGLE_TTS_API_KEY first.')
    tmp = tempfile.mkdtemp(prefix='alef-retry-')
    passed = set()
    n_passed = 0
    for n, (ln, r, takes, is_sound) in enumerate(plan, 1):
        best, tried = None, []
        for i, (name, text, rate) in enumerate(takes):
            raw, out = os.path.join(tmp, f't{i}.mp3'), os.path.join(tmp, f't{i}-enc.mp3')
            try:
                open(raw, 'wb').write(synth_rate(text, name, key, rate))
                encode(raw, out, r['file'].startswith('audio/builder/'))
            except Exception as e:  # noqa: BLE001 - a voice that refuses a rate just skips that take
                tried.append({'voice': name, 'rate': rate, 'text': text, 'error': str(e)[:120]})
                continue
            heard = L.hear(out)
            s = L.score(r['pointed_hebrew'], heard)
            if is_sound and len(re.sub('[^\u05D0-\u05EA]', '', heard or '')) < 2:
                s = 0.0  # heard as a lone letter = the voice said the letter's NAME, not its sound
            if a.latin and isinstance(s, float) and s >= L.PASS:
                lat = latin_hear(out)
                heard = f'{heard} / {lat}'
                if not re.search(a.latin, re.sub(r'[^a-z]', '', lat.lower())):
                    s = 0.0  # right letters, wrong sound (b for v, p for f...)
            tried.append({'voice': name, 'rate': rate, 'text': text, 'heard': heard, 'score': s})
            print(f"   try {i + 1}/{len(takes)} {name} x{rate} '{text}' -> {heard or '(nothing)'} {s}", flush=True)
            if isinstance(s, float) and s >= L.PASS and (best is None or s > best[0]):
                best = (s, open(out, 'rb').read(), name, text, rate, heard)
                if s >= 1.0:
                    break
        rec = {'file': r['file'], 'hebrew': r['pointed_hebrew'], 'retry': True, 'tried': tried}
        if best:
            for p in r['same_audio_paths'].split():
                open(os.path.join(ROOT, p), 'wb').write(best[1])
            rec.update(kept=True, score=best[0], voice=best[2], spoken=best[3], rate=best[4], heard=best[5])
            passed.add(ln)
            n_passed += 1
            print(f"[{n}/{len(plan)}] PASSED {r['pointed_hebrew']} -> {best[5]} ({best[2]} x{best[4]}, '{best[3]}')", flush=True)
        else:
            rec['kept'] = False
            print(f"[{n}/{len(plan)}] still no passing take for {r['pointed_hebrew']} after {len(tried)} tries", flush=True)
        with open(LOG, 'a', encoding='utf-8') as f:
            f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    with open(need, 'w', encoding='utf-8') as f:
        f.write('\n'.join(ln for ln in lines if ln not in passed) + '\n')
    from fix import refresh_builder_manifest
    refresh_builder_manifest()
    print(f'done: {n_passed} passed, {len(plan) - n_passed} still need a human recording')


if __name__ == '__main__':
    main()
