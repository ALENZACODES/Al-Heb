#!/usr/bin/env python3
"""Real per-word times for the Torah verse clips, for the reading follower (src/torahreader/finger-follow.js).

NOT YET RUN. Written 2026-11-25; needs a machine that can download the model (about 1.6 GB) and ideally a GPU.

What it does: for each verse clip audio/<voice>/israeli/line/torah-<book>-<chapter>-<verse>.mp3 it asks a Hebrew speech
recogniser for word timestamps, lines its words up with the verse's own words by consonant skeleton (the recogniser
writes unpointed modern spelling, so letters are compared without vowels or accents), fills any word it could not match
by sharing out the gap between its matched neighbours, and writes
    verses[i].wordMs = { "<voice>": [[startMs, endMs], ...] }      (one pair per follower word)
into data/corpus/torah/<book>/<NN>.json, plus verses[i].durMs[<voice>] from the clip's real length.
The app uses wordMs in place of its estimate only when it has exactly one pair per word (word-timing.js, verseTimes).

Commercial-use licences (checked 2026-11-25, see docs/photo/COMMERCIAL-LICENSES.md):
  faster-whisper (SYSTRAN)                 MIT
  ivrit-ai/whisper-large-v3-turbo-ct2      Apache-2.0 (Hebrew fine-tune of OpenAI Whisper, itself MIT)
Do NOT swap in torchaudio's MMS_FA aligner: its weights are CC-BY-NC 4.0 (non-commercial).

Usage:
  pip install faster-whisper
  python3 tools/torah/audio/align_words.py --voice m --book genesis --chapter 1 [--dry] [--model ivrit-ai/whisper-large-v3-turbo-ct2]
  python3 tools/torah/audio/align_words.py --voice m --book genesis            # every chapter of the book
Report: how many words were matched directly per verse; a verse under --min-match (default 0.6) is left without wordMs.
"""
import argparse, difflib, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
HEB = re.compile(r'[א-ת]')
FINAL = str.maketrans('ךםןףץ', 'כמנפצ')


def follower_words(text):
    """Exactly the words finger-follow.js counts: white-space parts that hold a Hebrew letter."""
    return [p for p in re.split(r'\s+', text or '') if HEB.search(p)]


def skeleton(word):
    """Consonants only, final forms folded, maqaf-joined words kept as one string."""
    return ''.join(HEB.findall(word or '')).translate(FINAL)


def align(text_words, asr_words):
    """asr_words: [(word, start_s, end_s)]. Returns ([[startMs, endMs]] or None per text word, matched count)."""
    a = [skeleton(w) for w in text_words]
    # The recogniser may split a maqaf group or join two words; compare letter streams, then map back to words.
    a_chars, a_owner = [], []
    for i, s in enumerate(a):
        a_chars.extend(s); a_owner.extend([i] * len(s))
    b_chars, b_time, b_end = [], [], []
    for w, s, e in asr_words:
        sk = skeleton(w)
        n = max(1, len(sk))
        for k, ch in enumerate(sk):
            b_chars.append(ch)
            b_time.append(s + (e - s) * k / n)
            b_end.append(s + (e - s) * (k + 1) / n)
    out = [None] * len(text_words)
    sm = difflib.SequenceMatcher(a=a_chars, b=b_chars, autojunk=False)
    first, last = {}, {}
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            i = a_owner[blk.a + k]
            first.setdefault(i, b_time[blk.b + k]); last[i] = b_end[blk.b + k]
    matched = 0
    for i in range(len(text_words)):
        if i in first:
            out[i] = [first[i], last[i]]; matched += 1
    return out, matched


def fill(spans, dur_s):
    """Give unmatched words a share of the gap between their matched neighbours; make ends meet the next start."""
    n = len(spans)
    i = 0
    while i < n:
        if spans[i] is not None:
            i += 1; continue
        j = i
        while j < n and spans[j] is None:
            j += 1
        lo = spans[i - 1][1] if i > 0 else 0.0
        hi = spans[j][0] if j < n else dur_s
        step = max(0.0, hi - lo) / (j - i)
        for k in range(i, j):
            spans[k] = [lo + step * (k - i), lo + step * (k - i + 1)]
        i = j
    for k in range(n - 1):
        # A word lasts until the next one starts (the follower highlights through pauses), never past it.
        spans[k][1] = max(spans[k][0], spans[k + 1][0])
    return [[round(s * 1000), round(e * 1000)] for s, e in spans]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--voice', choices=['m', 'f'], required=True)
    ap.add_argument('--book', required=True)
    ap.add_argument('--chapter', type=int)
    ap.add_argument('--model', default='ivrit-ai/whisper-large-v3-turbo-ct2')
    ap.add_argument('--min-match', type=float, default=0.6)
    ap.add_argument('--dry', action='store_true')
    a = ap.parse_args()
    from faster_whisper import WhisperModel  # MIT
    model = WhisperModel(a.model, device='auto', compute_type='auto')
    folder = os.path.join(ROOT, 'data', 'corpus', 'torah', a.book)
    files = sorted(f for f in os.listdir(folder) if f.endswith('.json'))
    if a.chapter:
        files = [f for f in files if int(f.split('.')[0]) == a.chapter]
    for f in files:
        path = os.path.join(folder, f)
        data = json.load(open(path, encoding='utf8'))
        ch = int(data['chapter']); changed = 0
        for v in data['verses']:
            clip = os.path.join(ROOT, 'audio', a.voice, 'israeli', 'line', f"torah-{a.book}-{ch}-{v['n']}.mp3")
            if not os.path.exists(clip):
                continue
            words = follower_words(v.get('heTrope') or v.get('he'))
            segs, info = model.transcribe(clip, language='he', word_timestamps=True, beam_size=5,
                                          initial_prompt=re.sub(r'[֑-ׇ]', '', v.get('he', '')))
            asr = [(w.word, w.start, w.end) for s in segs for w in (s.words or [])]
            spans, matched = align(words, asr)
            share = matched / max(1, len(words))
            print(f"{a.book} {ch}:{v['n']}  {matched}/{len(words)} words matched ({share:.0%})")
            if share < a.min_match:
                continue
            v.setdefault('wordMs', {})[a.voice] = fill(spans, info.duration)
            v.setdefault('durMs', {})[a.voice] = round(info.duration * 1000)
            changed += 1
        if changed and not a.dry:
            with open(path, 'w', encoding='utf8') as fh:
                json.dump(data, fh, ensure_ascii=False, indent=1)
                fh.write('\n')
            print(f'wrote {path}: {changed} verses')


if __name__ == '__main__':
    sys.exit(main())
