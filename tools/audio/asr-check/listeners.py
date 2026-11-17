"""Three listeners for letter, vowel and syllable clips, so no one model decides alone.

  - whisper-ipa: renikud/whisper-he-ipa (scan_sounds.hearer). Hears Hebrew sounds well, but it was trained on words and can
    pull a short sound toward a word it knows (יֶ heard as "yihye").
  - w2v: facebook/wav2vec2-lv-60-espeak-cv-ft, a phoneme model with no words at all (espeak IPA). Very short clips can come
    back empty, so each clip is heard three times with 0.25, 0.6 and 1.0 s of silence around it, majority wins.
  - xlsr: facebook/wav2vec2-xlsr-53-espeak-cv-ft, a second phoneme model trained differently (same three hearings).
    Allosaurus was tried first (17 Nov) and dropped: it heard "he" as "tʰɨ" and "bi" as "t-mi-z".

A clip is right when at least two of the three listeners hear its reading (scan_traditions.close on the folded sounds).

  from listeners import Listeners; L = Listeners(whisper_model_dir); L.verdict(path, want_folded) -> dict
"""
import os, re, subprocess, sys, tempfile, unicodedata, wave

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import scan_sounds as S  # noqa: E402
import scan_traditions as T  # noqa: E402

SR = 16000
EXTRA = [('ɛ', 'e'), ('ɔ', 'o'), ('ɪ', 'i'), ('ʊ', 'u'), ('æ', 'a'), ('ɑ', 'a'), ('ɐ', 'a'), ('ə', 'e'), ('β', 'v'), ('ʋ', 'v'),
         ('ɣ', 'g'), ('ɾ', 'r'), ('ɹ', 'r'), ('ɫ', 'l'), ('ç', 'x'), ('ɦ', 'h'), ('ʝ', 'y'), ('ɕ', 'ʃ'), ('ʂ', 'ʃ'), ('ʐ', 'ʒ'),
         ('œ', 'e'), ('ø', 'e'), ('y', 'i'), ('ɨ', 'i'), ('ʉ', 'u'), ('ɵ', 'o'), ('ɒ', 'o'), ('ʌ', 'a'), ('ɯ', 'u'), ('ɘ', 'e'),
         ('ɜ', 'e'), ('ɞ', 'e')]


def fold(s):
    """Phone strings from any listener to the folded sounds scan_sounds uses (marks, length and spaces dropped)."""
    s = unicodedata.normalize('NFD', s or '')
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn' and c not in 'ʰʲʷˠˤ')
    s = s.replace(' ', '')
    for a, b in EXTRA:                                  # espeak and Allosaurus write y for the vowel ü; the consonant is j
        s = s.replace(a, b)
    return S.fold(s)


ONSETS = 'pthkq'
R_LIKE = 'rɹʁɣʀðvbwʋβʉ'


def phone_close(want, heard):
    """scan_traditions.close for a phoneme model's hearing, allowing only what these models cannot write or tell apart:
    tone digits; ɑ written for o as well as a; ts heard as plain s; a catch before a first vowel written as p, t, h or k;
    y before a vowel written as i; and the Hebrew r (ʁ), which these mostly-English models hear as ð, b, v, ɹ...: for a card
    with r they check everything else and leave the r itself to the Hebrew-trained Whisper model."""
    if not want:                                         # a silent letter card (alef, ayin) has no sound of its own to check
        return True
    raw = re.sub(r'[0-9]', '', heard or '')
    raws = {raw}
    wants = {want, want.replace('c', 's')}
    if 'r' in want and not set(want) & set('vbw'):
        raws.add(''.join(c for c in raw if c not in R_LIKE))
        wants |= {w.replace('r', '') for w in wants}
    out = set()
    for r in raws:
        for x in (r.replace('ɑ', 'a'), r.replace('ɑ', 'o')):
            f = fold(x)
            out.add(f)
            if len(f) > 1 and f[0] in ONSETS and f[1] in 'aeiou':
                out.add(f[1:])
            if f[:1] == 'i' and f[1:2] in 'aeou':
                out.add('y' + f[1:])
    return any(T.close(w, f) for w in wants if w for f in out if f) or ('' in wants and any(not f for f in out))


def load(path):
    raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(raw, '<i2').astype(np.float32) / 32768
    return a / max(1e-3, float(np.abs(a).max())) * 0.7


class Listeners:
    def __init__(self, whisper_model_dir):
        import torch
        from transformers import AutoProcessor, Wav2Vec2ForCTC
        self.torch = torch
        self.dev = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.proc = AutoProcessor.from_pretrained('facebook/wav2vec2-lv-60-espeak-cv-ft')
        self.w2v = Wav2Vec2ForCTC.from_pretrained('facebook/wav2vec2-lv-60-espeak-cv-ft').to(self.dev).eval()
        self.xproc = AutoProcessor.from_pretrained('facebook/wav2vec2-xlsr-53-espeak-cv-ft')
        self.xlsr = Wav2Vec2ForCTC.from_pretrained('facebook/wav2vec2-xlsr-53-espeak-cv-ft').to(self.dev).eval()
        self.whisper = S.hearer(whisper_model_dir)
        self.tmp = tempfile.mkdtemp(prefix='alef-listen-')

    def hear_w2v(self, a, proc=None, model=None):
        proc, model = proc or self.proc, model or self.w2v
        out = []
        for pad in (0.25, 0.6, 1.0):
            z = np.zeros(int(pad * SR), np.float32)
            x = proc(np.concatenate([z, a, z]), sampling_rate=SR, return_tensors='pt').input_values.to(self.dev)
            with self.torch.no_grad():
                out.append(proc.batch_decode(model(x).logits.argmax(-1))[0])
        return out


    def verdict(self, path, want):
        """want: the folded sounds (scan_traditions.say_to_sounds). Returns heard strings, per-listener calls and the decision."""
        a = load(path)
        wh = [h for h, _ in self.whisper([path])]
        w2 = self.hear_w2v(a)
        xl = self.hear_w2v(a, self.xproc, self.xlsr)
        call = {
            'whisper': sum(T.close(want, h) for h in wh) * 2 > len(wh),
            'w2v': sum(phone_close(want, h) for h in w2 if h) >= 2,
            'xlsr': sum(phone_close(want, h) for h in xl if h) >= 2,
        }
        return {'heard': {'whisper': wh, 'w2v': w2, 'xlsr': xl}, 'calls': call, 'right': sum(call.values()) >= 2}
