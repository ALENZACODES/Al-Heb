"""Four phonetic listeners: they write down the SOUNDS in a clip (IPA), with no words, and every word of the expected
text is scored by how many of its sounds were heard (Phonikud gives the Israeli pronunciation of the pointed text).

  renikud    renikud/whisper-he-ipa                              Hebrew-trained, writes IPA
  lv60       facebook/wav2vec2-lv-60-espeak-cv-ft                phoneme model, no words at all
  xlsr53     facebook/wav2vec2-xlsr-53-espeak-cv-ft              phoneme model, trained differently
  ipa1000    ctaguchi/wav2vec2-large-xlsr-japlmthufielta-ipa1000-ns  IPA from about 1,000 languages

A word is heard right by one listener when at least 75% of its sounds are matched in order.

  python phon4.py --root Al-Heb --queue phon-queue.json --out /kaggle/working [--shard i --shards n]
"""
import argparse, collections, json, os, re, sys, time

import numpy as np

WORD_OK = 0.75
MODELS = ['renikud', 'lv60', 'xlsr53', 'ipa1000']


def chunks(a, sr=16000, win=20.0):
    n = int(win * sr)
    return [a[i:i + n] for i in range(0, len(a), n)] or [a]


class Hearer:
    def __init__(self, name):
        import torch
        torch.set_num_threads(os.cpu_count() or 4)
        self.torch, self.name = torch, name
        t0 = time.time()
        if name == 'renikud':
            ct2 = os.environ.get('RENIKUD_CT2', '/kaggle/temp/phoneme-ct2')
            if os.path.isdir(ct2):   # converted once (as in the 17 Nov notebooks): much faster on CPU
                from faster_whisper import WhisperModel
                self.fw = WhisperModel(ct2, device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 4)
            else:
                from transformers import WhisperProcessor, WhisperForConditionalGeneration
                self.fw = None
                self.p = WhisperProcessor.from_pretrained('renikud/whisper-he-ipa')
                self.m = WhisperForConditionalGeneration.from_pretrained('renikud/whisper-he-ipa').eval()
        else:
            from transformers import AutoProcessor, Wav2Vec2ForCTC
            mid = {'lv60': 'facebook/wav2vec2-lv-60-espeak-cv-ft', 'xlsr53': 'facebook/wav2vec2-xlsr-53-espeak-cv-ft',
                   'ipa1000': 'ctaguchi/wav2vec2-large-xlsr-japlmthufielta-ipa1000-ns'}[name]
            self.p = AutoProcessor.from_pretrained(mid)
            self.m = Wav2Vec2ForCTC.from_pretrained(mid).eval()
        print(f'loaded {name} in {time.time() - t0:.0f}s', flush=True)

    def hear(self, a):
        a = np.concatenate([np.zeros(4000, np.float32), a, np.zeros(8000, np.float32)])
        out = []
        if self.name == 'renikud' and self.fw is not None:
            segs, _ = self.fw.transcribe(a, language='he', task='transcribe', beam_size=1, best_of=1, temperature=0,
                                         condition_on_previous_text=False, vad_filter=False, suppress_tokens=[], without_timestamps=True,
                                         max_new_tokens=int(12 + 22 * len(a) / 16000))   # no runaway repeats on short clips
            t = ' '.join(s.text.strip() for s in segs)
            for s_, d in [('dZ', 'dʒ'), ('tS', 'tʃ'), ('S', 'ʃ'), ('Z', 'ʒ'), ('q', 'ʔ'), ("'", 'ˈ'), ('r', 'ʁ'), ('x', 'χ'), ('g', 'ɡ')]:
                t = t.replace(s_, d)
            return t
        with self.torch.inference_mode():
            for c in chunks(a):
                if self.name == 'renikud':
                    x = self.p(c, sampling_rate=16000, return_tensors='pt').input_features
                    ids = self.m.generate(x, max_new_tokens=440)
                    t = self.p.batch_decode(ids, skip_special_tokens=True)[0]
                    for s, d in [('dZ', 'dʒ'), ('tS', 'tʃ'), ('S', 'ʃ'), ('Z', 'ʒ'), ('q', 'ʔ'), ("'", 'ˈ'), ('r', 'ʁ'), ('x', 'χ'), ('g', 'ɡ')]:
                        t = t.replace(s, d)
                    out.append(t)
                else:
                    x = self.p(c, sampling_rate=16000, return_tensors='pt').input_values
                    out.append(self.p.batch_decode(self.m(x).logits.argmax(-1))[0])
        return ' '.join(o.strip() for o in out)


def fold2(ipa):
    """As phoneme_review.fold, but lower-case first (that one lower-cases after mapping sh/zh to S/Z and loses them),
    and doubled sounds count once."""
    import unicodedata
    s = unicodedata.normalize('NFC', ipa).lower()
    s = s.translate(str.maketrans({'ʁ': 'r', 'χ': 'x', 'ħ': 'x', 'ɡ': 'g', 'ʃ': 'S', 'ʒ': 'Z', 'ʔ': '', 'ˈ': '', 'ˌ': '', 'ː': '', 'ʕ': '',
                                   'ɛ': 'e', 'ɔ': 'o', 'ɪ': 'i', 'ʊ': 'u', 'ɑ': 'a', 'ɐ': 'a', 'ə': 'e', 'æ': 'a', 'β': 'v', 'ʋ': 'v',
                                   'ɾ': 'r', 'ɹ': 'r', 'ɫ': 'l', 'ç': 'x', 'ɦ': 'h', 'ʝ': 'j', 'ɕ': 'S', 'ʂ': 'S', 'ʐ': 'Z', 'ɣ': 'g',
                                   'ʀ': 'r', 'q': 'k', 'y': 'j'}))
    s = s.replace('ts', 'c').replace('tS', 'C').replace('dZ', 'J')
    s = re.sub(r'[^a-zA-Z ]', '', s)
    return re.sub(r'([a-zA-Z])\1+', r'\1', s)


def latin(folded):
    """Folded sounds in plain Latin letters for the report (S=sh, x=kh, c=ts, C=ch, Z=zh)."""
    return folded.replace('S', 'sh').replace('C', 'ch').replace('c', 'ts').replace('x', 'kh').replace('Z', 'zh')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', required=True)
    ap.add_argument('--queue', required=True)
    ap.add_argument('--out', default='.')
    ap.add_argument('--models', default=','.join(MODELS))
    ap.add_argument('--shard', type=int, default=0); ap.add_argument('--shards', type=int, default=1)
    a = ap.parse_args()
    sys.path.insert(0, os.path.join(a.root, 'tools', 'audio', 'asr-check'))
    import check_lib as L
    import phoneme_review as P
    P.fold = fold2
    q = json.load(open(a.queue, encoding='utf-8'))[a.shard::a.shards]
    res = os.path.join(a.out, f'phon4-hearings-{a.shard}.jsonl')
    done = set()
    if os.path.exists(res):
        done = {(r['file'], r['model']) for r in map(json.loads, open(res, encoding='utf-8'))}
    audio = {o['file']: L.load(os.path.join(a.root, o['file'])) for o in q}
    with open(res, 'a', encoding='utf-8') as f:
        for name in a.models.split(','):
            todo = [o for o in q if (o['file'], name) not in done]
            if not todo:
                continue
            try:
                h = Hearer(name)
            except Exception as e:
                print(f'{name} could not load: {e}', flush=True); continue
            for i, o in enumerate(todo, 1):
                t0 = time.time()
                ipa = h.hear(audio[o['file']])
                ratio, ws = P.review(re.sub(r'\s*\(cut from:.*\)\s*$', '', o['want']), ipa)
                r = {'file': o['file'], 'model': name, 'ipa': ipa, 'heard': latin(fold2(ipa)), 'ratio': ratio,
                     'words': [{'word': w['word'], 'should': latin(w['should']), 'match': w['match']} for w in ws]}
                f.write(json.dumps(r, ensure_ascii=False) + '\n'); f.flush()
                weak = [w['word'] for w in ws if w['match'] < WORD_OK]
                print(f'[{name} {i}/{len(todo)}] {o["file"]} {ratio:.0%} weak={len(weak)} {time.time() - t0:.1f}s', flush=True)
            del h
            import gc; gc.collect()


# --- corrections to the expected sounds (Phonikud's base model gets these wrong) -----------------------------------
# kamatz katan in כל (kol, not kal), the word written without points, and syllables it drops. Folded letters:
# x = kh, S = sh, c = ts. Applied when hearings are scored again (rescore), so no model has to listen twice.
SAY = {
    'כָּל': 'kol', 'כׇּל': 'kol', 'בְּכָל': 'bexol', 'וְכָל': 'vexol', 'לְכָל': 'lexol', 'מִכָּל': 'mikol', 'דְכָל': 'dexol',
    'כָּל־': 'kol', 'בְּכָל־': 'bexol', 'וְכָל־': 'vexol', 'לְכָל־': 'lexol',
    'ברוך': 'barux', 'יְבָרֶכְךָ': 'jevarexexa', 'שְׁעוּעִית': 'Seuit',
}


def expected2(text):
    import phoneme_review as P
    P.fold = fold2
    ws, exp = P.expected(text)
    clean = lambda w: P.S.PUNCT.sub('', w)
    return ws, [SAY.get(clean(w), e) for w, e in zip(ws, exp)]


def review2(text, heard_ipa):
    """As phoneme_review.review, with the corrected expected sounds, and the Israeli R (uvular, which the
    English-trained phoneme models write as g or a gh sound) counted as r."""
    import difflib
    ws, exp = expected2(text)
    # Israeli R heard as g; the y-glide after a vowel written as a vowel by English-trained models (adonai / adonaj)
    r_as = lambda s: re.sub(r'(?<=[aeiou])j', 'i', s.replace('g', 'r'))
    got = r_as(fold2(heard_ipa).replace(' ', ''))
    target = r_as(''.join(exp))
    sm = difflib.SequenceMatcher(a=target, b=got, autojunk=False)
    hit = [False] * len(target)
    for a0, b0, n in sm.get_matching_blocks():
        for k in range(a0, a0 + n):
            hit[k] = True
    out, pos = [], 0
    for w, e in zip(ws, exp):
        seg = hit[pos:pos + len(e)]; pos += len(e)
        out.append({'word': w, 'should': latin(e), 'match': round(sum(seg) / max(1, len(seg)), 2)})
    if len(out) == 1:      # a single word: extra sounds count against it too ('shisuit' is not 'sheuit')
        out[0]['match'] = round(min(out[0]['match'], sm.ratio()), 2)
        if sm.ratio() < 0.8:                       # more than a fifth of what was heard is not in the word
            out[0]['match'] = min(out[0]['match'], 0.74)
    return round(sm.ratio(), 3), out


def rescore(rec, want):
    """A stored hearing scored again against the corrected expected sounds."""
    ratio, ws = review2(re.sub(r'\s*\(cut from:.*\)\s*$', '', want), rec['ipa'])
    return dict(rec, ratio=ratio, words=ws)


if __name__ == '__main__':
    main()
