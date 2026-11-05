#!/usr/bin/env python3
"""Batch renderer: plan.json -> WAV files in a work dir OUTSIDE the repo. Resumable.

  python3 tools/tts/render_chatterbox.py --plan tools/tts/plan.json --work ~/alef-tts-work \
      --ref-m ref/m.wav --ref-f ref/f.wav [--limit N] [--device cuda|cpu|mps] [--vocalize]
  python3 tools/tts/render_chatterbox.py --engine mock ...      # sine tones, stdlib only, for testing the pipeline

Engines
  chatterbox  Chatterbox Multilingual (open weights, Hebrew 'he'). Needs: pip install chatterbox-tts (see docs/tts/README.md).
  mock        Writes a short sine tone per clip. NOT speech. Its frequency encodes the plan position so verify.py --engine mock can
              check that the right audio reached the right file. Proves the plumbing only, not voice quality or Hebrew accuracy.

Voice: Chatterbox clones the voice of a reference WAV (--ref-m / --ref-f). Use only a voice you own or a donor who signed the
rights grant (docs/voices/donor-rights-grant.md). Without refs the model's built-in voice is used for both m and f (refused
unless --allow-default-voice, because m/f would then sound the same).

What is spoken (plan schema 2): each item carries `speak` (the text to speak) and `language` (the language token given to the model).
  source tts-hebrew     Israeli only: `speak` is the pointed Hebrew, language 'he'.
  source tts-respelled  Sephardi / Ashkenazi: `speak` is a "sound word", a Latin-letter respelling of the Hebrew, spoken with the configured
                        language token (plan --lang-tokens, or --lang-token here). Whether that sounds like Sephardi or Ashkenazi Hebrew is
                        UNKNOWN: nobody has listened. Every clip is logged as synthetic and unreviewed.
Letters, vowels and syllables are never in a plan. Every render-log.jsonl line records source, speak, sound word, language, model name and
version, voice-reference digest, so manifest_update.mjs can say how each clip was made.

Hebrew text: the manifest text is already pointed (niqqud). Chatterbox's own Hebrew pre-processing may call an optional
diacritizer (dicta_onnx) that would silently rewrite our pointing; this script switches that off unless --internal-diacritizer.
--vocalize runs Nakdimon only on text that has NO niqqud.
"""
import argparse, hashlib, json, math, os, re, struct, sys, time, wave, zlib

NIQQUD = re.compile('[ְ-ׇּׁׂ]')
HEBREW_LETTER = re.compile('[\u05d0-\u05ea]')
TRADITIONS = ('israeli', 'sephardi', 'ashkenazi')
SR_MOCK = 24000


def load_plan(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def speak_text(it):
    """The text handed to the model. Schema 1 plans (Israeli only) have no `speak`; they speak `text`."""
    return it.get('speak') if it.get('speak') is not None else it['text']


def check_item(i):
    """Refuse anything the factory is not allowed to synthesise. Returns the source ('tts-hebrew' or 'tts-respelled')."""
    name = f"{i.get('voice')}/{i.get('tradition')}/{i.get('kind')}/{i.get('id')}"
    if i.get('route') != 'tts':
        raise SystemExit(f"refusing non-TTS item {name}: only items routed 'tts' by plan.mjs may be synthesised")
    if i.get('voice') not in ('m', 'f') or i.get('tradition') not in TRADITIONS:
        raise SystemExit(f"refusing item {name}: unknown voice or tradition")
    if i.get('kind') in ('letter', 'vowel', 'syllable'):
        raise SystemExit(f"refusing {name}: letters, vowels and syllables are human-only in every tradition")
    src = i.get('source') or ('tts-hebrew' if i['tradition'] == 'israeli' else None)
    if i['tradition'] == 'israeli':
        if src != 'tts-hebrew' or (i.get('language') or 'he') != 'he':
            raise SystemExit(f"refusing {name}: Israeli items must be tts-hebrew with language 'he'")
        if HEBREW_LETTER.search(speak_text(i)) is None:
            raise SystemExit(f"refusing {name}: Israeli item has no Hebrew text to speak")
    else:
        if src != 'tts-respelled':
            raise SystemExit(f"refusing {name}: {i['tradition']} items must be tts-respelled (a sound word), never Hebrew text")
        sw = (i.get('sound_word') or '').strip()
        if not sw or sw != (i.get('speak') or '').strip() or HEBREW_LETTER.search(sw):
            raise SystemExit(f"refusing {name}: tts-respelled needs a Latin-letter sound_word equal to speak")
        if not re.fullmatch('[a-z]{2}', i.get('language') or ''):
            raise SystemExit(f"refusing {name}: missing or malformed language token")
    return src


def ref_digest(path):
    """First 12 hex of the SHA-256 of a reference WAV: identifies WHICH reference was used without recording its path or name."""
    if not path:
        return None
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()[:12]


def raw_path(work, it):
    return os.path.join(work, 'raw', it['voice'], it['tradition'], it['kind'], it['id'] + '.wav')


def write_wav(path, samples, sr):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.part'
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(b''.join(struct.pack('<h', max(-32768, min(32767, int(s * 32767)))) for s in samples))
    os.replace(tmp, path)


def mock_freq(order):
    return 300 + (order % 150) * 25


def mock_render(it, wrong_order=None):
    """0.1 s silence + tone (0.5 s + 0.01 s per character) + 0.1 s silence, quiet on purpose so loudness normalisation has work to do."""
    f = mock_freq(wrong_order if wrong_order is not None else it['order'])
    n = int(SR_MOCK * (0.5 + 0.01 * len(it['text'])))
    pad = [0.0] * int(SR_MOCK * 0.1)
    tone = [0.12 * math.sin(2 * math.pi * f * i / SR_MOCK) for i in range(n)]
    return pad + tone + pad, SR_MOCK


class Chatterbox:
    def __init__(self, device, internal_diacritizer, refs, allow_default, seed_base):
        import torch  # noqa: imported lazily so --engine mock needs nothing
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        import inspect
        self.torch = torch
        if not internal_diacritizer:
            import chatterbox.models.tokenizers.tokenizer as tk
            tk.add_hebrew_diacritics = lambda text: text  # keep OUR pointing
        kw = {}
        if 't3_model' in inspect.signature(ChatterboxMultilingualTTS.from_pretrained).parameters:
            kw['t3_model'] = 'v3'  # newer releases; older pip releases only have the v2 checkpoint
            self.model_tag = 'chatterbox-multilingual-v3'
            self.model_version = 'v3'
        else:
            self.model_tag = 'chatterbox-multilingual-v2'
            self.model_version = 'v2'
        try:
            from importlib.metadata import version as _v
            self.package_version = 'chatterbox-tts ' + _v('chatterbox-tts')
        except Exception:
            self.package_version = None
        try:
            from chatterbox.mtl_tts import SUPPORTED_LANGUAGES
            self.languages = set(SUPPORTED_LANGUAGES)
        except Exception:
            self.languages = None  # cannot check; the model will raise on an unknown token
        self.model = ChatterboxMultilingualTTS.from_pretrained(device=device, **kw)
        self.refs, self.allow_default, self.seed_base = refs, allow_default, seed_base
        self.cur = None

    def render(self, it):
        ref = self.refs.get(it['voice'])
        if ref is None and not self.allow_default:
            raise SystemExit(f"no reference WAV for voice '{it['voice']}': pass --ref-{it['voice']} (or --allow-default-voice)")
        lang = it.get('language') or 'he'
        if self.languages is not None and lang not in self.languages:
            raise SystemExit(f"language token '{lang}' is not supported by the installed model (supported: {', '.join(sorted(self.languages))})")
        kw = {'language_id': lang}
        if ref:
            kw['audio_prompt_path'] = ref
        seed = (zlib.crc32(f"{it['voice']}/{it['tradition']}/{it['kind']}/{it['id']}".encode()) + self.seed_base) & 0x7FFFFFFF
        self.torch.manual_seed(seed)
        wav = self.model.generate(it['_text'], **kw)
        arr = wav.squeeze().detach().cpu().float().numpy().tolist()
        return arr, self.model.sr, seed


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--plan', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'plan.json'))
    ap.add_argument('--work', default=os.environ.get('ALEF_TTS_WORK') or os.path.expanduser('~/alef-tts-work'))
    ap.add_argument('--engine', choices=['chatterbox', 'mock'], default='chatterbox')
    ap.add_argument('--mock', action='store_true', help='same as --engine mock')
    ap.add_argument('--mock-wrong', default='', help='mock only: comma-separated clip ids rendered with the wrong tone (to test the gate)')
    ap.add_argument('--ref-m'); ap.add_argument('--ref-f')
    ap.add_argument('--allow-default-voice', action='store_true')
    ap.add_argument('--device', default=None, help='cuda, cpu or mps (default: cuda if available else cpu)')
    ap.add_argument('--vocalize', action='store_true', help='add niqqud with Nakdimon to text that has none')
    ap.add_argument('--internal-diacritizer', action='store_true', help="let Chatterbox call its optional dicta_onnx diacritizer (rewrites our pointing; licence unverified)")
    ap.add_argument('--seed', type=int, default=0)
    ap.add_argument('--limit', type=int); ap.add_argument('--tier', type=int, help='only items up to this tier')
    ap.add_argument('--voice', choices=['m', 'f'])
    ap.add_argument('--tradition', help='only these traditions (comma list or all); default: every tradition in the plan')
    ap.add_argument('--confidence', choices=['high', 'all'], default='all', help='high: only items the plan marked high-confidence')
    ap.add_argument('--lang-token', help='override the language token of every tts-respelled item (default: the plan\'s)')
    a = ap.parse_args(argv)
    engine = 'mock' if a.mock else a.engine
    plan = load_plan(a.plan)
    wanted = None if not a.tradition or a.tradition == 'all' else set(x.strip() for x in a.tradition.split(',') if x.strip())
    if wanted and not wanted <= set(TRADITIONS):
        raise SystemExit(f"unknown tradition in --tradition: {sorted(wanted - set(TRADITIONS))}")
    items = [i for i in plan['items'] if (not a.voice or i['voice'] == a.voice) and (not a.tier or i['tier'] <= a.tier)
             and (wanted is None or i['tradition'] in wanted) and (a.confidence == 'all' or i.get('confidence') == 'high')]
    if a.limit:
        items = items[:a.limit]
    for i in items:
        i['source'] = check_item(i)
        if a.lang_token and i['source'] == 'tts-respelled':
            i['language'] = a.lang_token
    if engine == 'chatterbox' and a.ref_m and a.ref_f and ref_digest(a.ref_m) == ref_digest(a.ref_f) and not a.allow_default_voice:
        raise SystemExit('--ref-m and --ref-f are the same audio: the man and woman voices must differ (use two different voices you own or whose donor signed docs/voices/donor-rights-grant.md)')
    os.makedirs(a.work, exist_ok=True)
    nak = None
    if a.vocalize and any(i['source'] == 'tts-hebrew' and not NIQQUD.search(speak_text(i)) for i in items):
        from nakdimon import diacritize as nak  # pip install nakdimon (MIT licence file seen; see docs/tts/README.md)
    eng = None
    if engine == 'chatterbox':
        device = a.device
        if device is None:
            import torch
            device = 'cuda' if torch.cuda.is_available() else 'cpu'
        eng = Chatterbox(device, a.internal_diacritizer, {'m': a.ref_m, 'f': a.ref_f}, a.allow_default_voice, a.seed)
        print(f'engine=chatterbox model={eng.model_tag} device={device}')
    wrong = {x for x in a.mock_wrong.split(',') if x}
    log = open(os.path.join(a.work, 'render-log.jsonl'), 'a', encoding='utf-8')
    done = skipped = 0
    t0 = time.time()
    for n, it in enumerate(items, 1):
        out = raw_path(a.work, it)
        if os.path.exists(out) and os.path.getsize(out) > 44:
            skipped += 1; continue  # resumable: a finished WAV is never redone
        text = speak_text(it)
        vocalized = False
        if nak and it['source'] == 'tts-hebrew' and not NIQQUD.search(text):
            text = nak(text); vocalized = True
        it = dict(it, _text=text)
        seed = None
        if engine == 'mock':
            wo = None
            if it['id'] in wrong:
                wo = (it['order'] + 7)
            samples, sr = mock_render(it, wo)
        else:
            samples, sr, seed = eng.render(it)
        write_wav(out, samples, sr)
        rec = {'voice': it['voice'], 'tradition': it['tradition'], 'kind': it['kind'], 'id': it['id'], 'path': it.get('path'), 'engine': engine,
               'source': it['source'] + (':mock' if engine == 'mock' else ''), 'sound_word': it.get('sound_word'), 'sound_model': it.get('sound_model'), 'language': it.get('language') or 'he',
               'confidence': it.get('confidence'), 'flags': it.get('flags') or [],
               'model_name': 'mock' if engine == 'mock' else 'chatterbox-multilingual', 'model_version': 'mock' if engine == 'mock' else eng.model_version,
               'package': None if engine == 'mock' else eng.package_version,
               'ref_digest': None if engine == 'mock' else ref_digest(eng.refs.get(it['voice']))}
        log.write(json.dumps({**rec,
                              'model': getattr(eng, 'model_tag', 'mock'), 'rendered_text': text, 'vocalized': vocalized, 'seed': seed,
                              'sr': sr, 'seconds': round(len(samples) / sr, 3), 'at': time.strftime('%Y-%m-%dT%H:%M:%S%z')}, ensure_ascii=False) + '\n')
        log.flush(); done += 1
        if n % 25 == 0 or n == len(items):
            rate = done / max(time.time() - t0, 1e-6)
            print(f'{n}/{len(items)} done={done} skipped={skipped} {rate:.2f} clips/s')
    print(f'rendered {done}, already present {skipped}, engine={engine}, work={a.work}')


if __name__ == '__main__':
    main()
