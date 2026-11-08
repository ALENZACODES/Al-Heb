"""Round-trip pronunciation check: speech-to-text on a clip, then compare what was heard with the Hebrew it should say.

Model: ivrit-ai/whisper-large-v3-turbo-ct2 (Whisper fine-tuned on Hebrew), run with faster-whisper on the CPU.
It downloads itself (about 1.6 GB) the first time. Set ALEF_ASR_MODEL to a local folder to use a copy you already have.
"""
import difflib
import json
import os
import re
import subprocess

import numpy as np

SR = 16000
MODEL_ID = os.environ.get('ALEF_ASR_MODEL', 'ivrit-ai/whisper-large-v3-turbo-ct2')
PASS = 0.9       # a clip passes at or above this score (one added or wrong letter in a short word fails)
FLAG = 0.75      # the scan flags a clip below this score (between FLAG and PASS is "borderline")

_model = None


def model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        _model = WhisperModel(MODEL_ID, device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 2)
    return _model


def load(path):
    raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'quiet', '-i', str(path), '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def hear(path, max_tokens=48):
    """Transcribe one clip on its own (most reliable). Returns the Hebrew the model heard, without vowel points."""
    a = load(path)
    if not len(a):
        return ''
    a = np.concatenate([np.zeros(SR // 4, np.float32), a, np.zeros(SR // 2, np.float32)])
    segs, _ = model().transcribe(a, language='he', beam_size=5, vad_filter=False,
                                 condition_on_previous_text=False, without_timestamps=True,
                                 max_new_tokens=max_tokens)
    return ' '.join(s.text.strip() for s in segs).strip()


def hear_many(paths, gap=1.2, window=27.0):
    """Fast pass: clips joined with silence into ~27 s windows, words assigned back by timestamp.
    About 6x faster than hear(); a clip it gets wrong or misses must be re-checked with hear()."""
    out = {}
    i = 0
    g = int(gap * SR)
    while i < len(paths):
        buf, spans, pos = [np.zeros(g // 2, np.float32)], [], g // 2
        while i < len(paths):
            a = load(paths[i])
            if spans and pos + len(a) + g > window * SR:
                break
            spans.append((pos / SR, (pos + len(a)) / SR, paths[i]))
            buf += [a, np.zeros(g, np.float32)]
            pos += len(a) + g
            i += 1
        segs, _ = model().transcribe(np.concatenate(buf), language='he', beam_size=5, vad_filter=False,
                                     condition_on_previous_text=False, word_timestamps=True)
        words = [w for s in segs for w in s.words]
        for a, b, p in spans:
            out[p] = ' '.join(w.word.strip() for w in words if a - 0.35 <= (w.start + w.end) / 2 <= b + 0.35)
        yield from ((p, out.pop(p)) for _, _, p in spans)


NIQQUD = re.compile(r'[֑-ׇ]')
FINALS = str.maketrans('ךםןףץ', 'כמנפצ')
# Letters that sound the same in Israeli Hebrew (ח and a soft כ are both 'kh'), and the vowel letters (ו, י) that
# spelling adds or drops. ש and ס are NOT treated as the same (the model spells a sin word the standard way, with ש),
# so שָׁלוֹם heard as 'שסלום' (sh-salom) fails.
SAME = str.maketrans({'ע': 'א', 'ט': 'ת', 'ו': '', 'י': ''})


V = '\u05D5'
# A vav carrying its own vowel inside a word is the consonant v (אִוָּה iva, מִצְוָה): mark it 'ב' (b/v are one letter).
CONS_VAV_DOUBLED = re.compile('(?<=[\u05D0-\u05EA\u0591-\u05C7])' + V + '(?=\u05BC[\u05B0-\u05B8\u05BB]|[\u05B0-\u05B8\u05BB]\u05BC)')  # אִוָּה: always v
CONS_VAV = re.compile('(?<=[\u05D0-\u05EA\u0591-\u05C7])' + V + '(?=[\u05B0-\u05B8\u05BB])')  # לֵוִי: v, but the model may spell it ו
# An aleph with no vowel of its own inside a word is silent (בֵּאלָהָא be-la-ha): drop it.
SILENT_ALEPH = re.compile('(?<=[\u05B0-\u05C7])\u05D0(?=[\u05D0-\u05EA])')


KAF_HARD = re.compile('[\u05DB\u05DA](?=[\u05B0-\u05BB\u05C1\u05C2\u05C7]*\u05BC)')
KAF_SOFT = re.compile('[\u05DB\u05DA](?![\u05B0-\u05BB\u05C1\u05C2\u05C7]*\u05BC)')
SIN = re.compile('\u05E9(?=[\u05B0-\u05C7]*\u05C2)')  # ש carrying the sin dot


def core(s, drop_silent_aleph=False, sin_as_samekh=False, single_vav_as_v=True):
    s = str(s)
    if re.search('[\u05B0-\u05BC]', s):  # pointed text (the expected word): apply the sound rules above
        s = CONS_VAV_DOUBLED.sub('ב', s)
        if single_vav_as_v:
            s = CONS_VAV.sub('ב', s)
        s = KAF_HARD.sub('ק', s)   # כּ is k
        s = KAF_SOFT.sub('ח', s)   # כ / ך without dagesh is kh, like ח
        if sin_as_samekh:  # sin sounds like samekh, so the model may spell it ס (שַׂ heard as 'סה')
            s = SIN.sub('ס', s)
        if drop_silent_aleph:
            s = SILENT_ALEPH.sub('', s)
    else:  # what the model heard: a doubled vav is the consonant v
        s = s.replace(V + V, 'ב')  # a heard ך, like כ, may be k or kh: kaf_readings decides
    s = NIQQUD.sub('', s.replace('־', ' ')).translate(FINALS)
    s = re.sub(r'[^א-ת\s]', '', s)
    return ''.join(re.sub(r'[אה]$', '', w.translate(SAME)) for w in s.split())


def kaf_readings(heard_core, expected_core):
    """The model spells both k and kh with כ. Read each heard כ as whatever the expected word has at the matching
    place (ק or ח), else as either; ק and ח the model wrote itself stay as they are."""
    if 'כ' not in heard_core:
        return {heard_core}
    out = {heard_core.replace('כ', 'ק'), heard_core.replace('כ', 'ח')}
    sm = difflib.SequenceMatcher(None, expected_core, heard_core.replace('כ', '\x00'), autojunk=False)
    h = list(heard_core)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'replace' and i2 - i1 == j2 - j1:
            for k in range(i2 - i1):
                if h[j1 + k] == 'כ' and expected_core[i1 + k] in 'קח':
                    h[j1 + k] = expected_core[i1 + k]
    out.add(''.join(h).replace('כ', 'ק'))
    return out


def score(expected_hebrew, heard):
    """1.0 = heard exactly the expected word (allowing spelling-only differences); None = nothing heard."""
    if not str(heard).strip():
        return None
    if re.fullmatch(r'[\d\s.,:-]+', str(heard).strip()):
        return 'digits'  # the model wrote a number as digits: not checkable by spelling
    b0 = core(heard)
    best = 0.0
    alts = {core(expected_hebrew, drop_silent_aleph=d, sin_as_samekh=z, single_vav_as_v=w)
            for d in (False, True) for z in (False, True) for w in (True, False)}
    for a in alts:  # a silent aleph may be written or not; a sin may be spelled ש or ס
        for b in kaf_readings(b0, a):
            r = (1.0 if a == b else 0.0) if not a or not b else difflib.SequenceMatcher(None, a, b).ratio()
            best = max(best, r)
    return round(best, 3)


def plain(hebrew):
    """Pointed Hebrew with every vowel point and mark removed (what an Israeli reads in a newspaper)."""
    return re.sub(r'\s+', ' ', NIQQUD.sub('', str(hebrew).replace('־', ' ').replace('׃', ''))).strip()


def jl_read(path):
    if not os.path.exists(path):
        return []
    with open(path, encoding='utf-8') as f:
        return [json.loads(l) for l in f if l.strip()]
