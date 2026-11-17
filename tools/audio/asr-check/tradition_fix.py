"""Fix the letter, vowel and syllable clips of all three traditions the three-tradition check flags (traditions-wrong.txt).

Those clips were made by the Israeli voice reading an English-letter respelling ("lamed", "beis"), which a Hebrew voice reads badly.
For each flagged clip:
  - where the app's reading for the tradition is letter for letter the Israeli one: the Israeli clip of the same voice is copied
    (owner decision A, 12 Nov 2026, for Sephardi; the same reasoning for Ashkenazi rows with the same reading; the Israeli clips
    passed the sound check);
  - otherwise new takes are read from pointed Hebrew written for that tradition (tradition-expect.json "script": Ashkenazi rules
    applied to the Hebrew itself, tools/audio/ashkenazi_script.mjs), in the same voice, and a take is kept only when the sound model
    hears the tradition's reading in at least 2 of 3 hearings.

  python tools/audio/asr-check/tradition_fix.py --list docs/audio/traditions-wrong.txt --model /path/to/phoneme-ct2 [--execute]
Needs GOOGLE_TTS_API_KEY for new takes. Log: --log (default tools/audio/asr-check/tradition-fix-log.jsonl).
"""
import argparse, json, os, re, shutil, sys, tempfile

sys.path.insert(0, os.path.dirname(__file__))
import numpy as np  # noqa: E402
import scan_sounds as S  # noqa: E402
import scan_traditions as T  # noqa: E402
import check_lib as L  # noqa: E402
import fix as F  # noqa: E402
import fix_list as FL  # noqa: E402

ROOT = S.ROOT
VOICE = {'m': 'he-IL-Wavenet-B', 'f': 'he-IL-Wavenet-A'}
HD = {'m': 'he-IL-Chirp3-HD-Charon', 'f': 'he-IL-Chirp3-HD-Kore'}
OTHER = {'m': 'he-IL-Wavenet-D', 'f': 'he-IL-Wavenet-C'}
CARRIERS = [('הַמִּלָּה', None), (None, 'וְעוֹד')]
# The voice reads letters, not the dots that soften them: a ב without dagesh is still "b" to it, a lone וּ is "va". So a take is
# also read from the same sound spelled the way the voice reads it (ו for v, ח for kh, אוּ / וּ for u, ס for the Ashkenazi s).
SPOKEN = [('בֵית', 'וֵיס'), ('בֵיס', 'וֵיס'), ('ב\u05b0', 'ו\u05b0'), ('ב\u05b7', 'ו\u05b7'), ('ב\u05b8', 'ו\u05b8'), ('ב\u05b6', 'ו\u05b6'), ('ב\u05b5', 'ו\u05b5'),
          ('ב\u05b4', 'ו\u05b4'), ('ב\u05b9', 'ו\u05b9'), ('ב\u05bb', 'וּ'), ('כ\u05b7', 'ח\u05b7'), ('כ\u05b8', 'ח\u05b8')]


TORAH = os.path.join(ROOT, 'tools', 'torah', 'audio', 'ipa')
sys.path.insert(0, TORAH)
import plan as TP  # noqa: E402  (latin labels, syllables and the de-DE IPA form, as for the Torah verses)
IPA_VOICE = {'m': 'de-DE-Chirp3-HD-Charon', 'f': 'de-DE-Chirp3-HD-Kore'}
UNITS = [('tz', 'ts'), ('ts', 'ts'), ('kh', 'χ'), ('ch', 'χ'), ('sh', 'ʃ'), ('ei', 'ej'), ('ai', 'aj'), ('oi', 'oj'), ('y', 'j'),
         ('r', 'ʁ'), ('g', 'ɡ')]


def say_to_ipa(say, tradition):
    """The app's respelling of a card ("veis", "khaf", "tz") as IPA for Google, one entry per word, with stress:
    a lone consonant gets "a" after it (the cards' sound practice says "ba"); Ashkenazi words take the stress on the
    next-to-last syllable, the others on the last."""
    out = []
    for w in re.sub(r"[^a-z ]", '', say.lower()).split():
        i, ipa = 0, ''
        while i < len(w):
            for a, b in UNITS:
                if w.startswith(a, i):
                    ipa += b; i += len(a); break
            else:
                ipa += w[i]; i += 1
        if not any(c in 'aeiou' for c in ipa):
            ipa += 'a'
        vs = [k for k, c in enumerate(ipa) if c in 'aeiou' and (k == 0 or ipa[k - 1] not in 'aeiou')]
        if len(vs) > 1:
            k = vs[-2] if tradition == 'ashkenazi' else vs[-1]
            ipa = ipa[:k] + 'ˈ' + ipa[k:]
        out.append(ipa)
    return out


def synth_ipa(words, voice, key):
    import base64, urllib.request
    labels, prons = [], []
    for k, w in enumerate(words):
        lab = TP.latin(w) + ('h' * k if TP.latin(w) in labels else '')
        labels.append(lab)
        prons.append({'phrase': lab, 'phoneticEncoding': 'PHONETIC_ENCODING_IPA', 'pronunciation': TP.for_google(TP.syllabify(w))})
    body = {'input': {'text': ' '.join(labels) + '.', 'customPronunciations': {'pronunciations': prons}},
            'voice': {'languageCode': 'de-DE', 'name': voice}, 'audioConfig': {'audioEncoding': 'MP3', 'sampleRateHertz': 24000}}
    req = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize', data=json.dumps(body, ensure_ascii=False).encode(),
                                 method='POST', headers={'Content-Type': 'application/json; charset=utf-8', 'X-Goog-Api-Key': key})
    with urllib.request.urlopen(req, timeout=90) as r:
        return base64.b64decode(json.load(r)['audioContent'])


def spoken(script, say):
    s = script
    if s in ('וּ', 'וּ.'):
        return 'אוּ'
    for a, b in SPOKEN:
        s = s.replace(a, b)
    if '\u05bb' in s:                                     # kubutz: spell the u with a vav (shuruk), which the voice reads "u"
        s = s.replace('\u05bb', '') + 'וּ'
    if say and say.startswith('s') and s.startswith('ת'):    # Ashkenazi sav
        s = 'ס' + s[1:]
    return s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--list', required=True)
    ap.add_argument('--model', required=True)
    ap.add_argument('--execute', action='store_true')
    ap.add_argument('--log', default=os.path.join(os.path.dirname(__file__), 'tradition-fix-log.jsonl'))
    a = ap.parse_args()
    exp = json.load(open(T.EXPECT, encoding='utf-8'))
    paths = [l.strip() for l in open(os.path.join(ROOT, a.list), encoding='utf-8') if l.strip().startswith('audio/')]
    paths = [p for p in paths if p in exp]
    todo = set(paths)
    paths.sort(key=lambda p: exp[p]['tradition'] != 'israeli')      # Israeli first: the other traditions may copy the fixed clip
    print(len(paths), 'clips to fix', flush=True)
    fixed, nogood = set(), set()
    # Sephardi rows the accent review held (docs/audio/fill/accent-r*.jsonl, never passed) may ship only as the Israeli copy
    # (owner decision A; tests/audit.audio-lane-2026-11-11.test.js), so they are never re-recorded here
    import glob
    held = {}
    for f in sorted(glob.glob(os.path.join(ROOT, 'docs/audio/fill/accent-r*-*.jsonl')), key=lambda f: int(os.path.basename(f).split('-')[1][1:])):
        for l in open(f, encoding='utf-8'):
            if l.strip():
                r = json.loads(l)
                if r.get('tradition') and r['tradition'] != 'israeli' and held.get(r['path']) != 'pass':
                    held[r['path']] = r.get('decision')
    held = {k for k, v in held.items() if v != 'pass'}
    key = os.environ.get('GOOGLE_TTS_API_KEY')
    if a.execute and not key:
        sys.exit('Set GOOGLE_TTS_API_KEY first.')
    from faster_whisper import WhisperModel
    from listeners import Listeners
    LS = Listeners(a.model)
    gap = np.zeros(int(S.GAP * L.SR), np.float32)
    tmp = tempfile.mkdtemp(prefix='alef-trad-')
    tally = {}
    for n, p in enumerate(paths, 1):
        e = exp[p]
        want = T.say_to_sounds(e['say'])
        rec = {'file': p, 'tradition': e['tradition'], 'text': e['text'], 'say': e['say'], 'script': e['script']}
        isr = p.replace(f"/{e['tradition']}/", '/israeli/')
        same_file = os.path.exists(os.path.join(ROOT, isr)) and open(os.path.join(ROOT, isr), 'rb').read() == open(os.path.join(ROOT, p), 'rb').read()
        isr_good = isr != p and os.path.exists(os.path.join(ROOT, isr)) and (isr not in todo or isr in fixed) and not same_file
        if e['tradition'] != 'israeli' and e['say'] == e['israeliSay'] and isr_good and isr not in nogood:
            # the tradition's reading is letter for letter the Israeli one: the checked Israeli clip of the same voice says it
            rec['outcome'] = 'copied the Israeli clip (same reading)'
            fixed.add(p)
            if a.execute:
                shutil.copyfile(os.path.join(ROOT, isr), os.path.join(ROOT, p))
                mp = os.path.join(ROOT, p) + '.meta.json'
                meta = json.load(open(mp, encoding='utf-8')) if os.path.exists(mp) else {}
                im = os.path.join(ROOT, isr) + '.meta.json'
                imeta = json.load(open(im, encoding='utf-8')) if os.path.exists(im) else {}
                meta.update({'voiceId': imeta.get('voiceId', meta.get('voiceId')), 'inputText': imeta.get('inputText', e['text']), 'madeFrom': 'israeli-clip-same-reading',
                             'note': f"Copied 17 Nov 2026 from {isr}: the app's {e['tradition']} reading \"{e['say']}\" is the Israeli reading letter for letter, "
                                     "and the earlier clip (the Israeli voice reading English letters) was heard wrong by the sound check."})
                meta.pop('inputSha256', None)
                with open(mp, 'w', encoding='utf-8', newline='\n') as f:
                    f.write(json.dumps(meta, ensure_ascii=False, indent=1) + '\n')
        elif p in held:
            rec['outcome'] = 'held by the accent review: left as it is (only the Israeli copy may ship)'
        elif not a.execute:
            rec['outcome'] = 'would record takes'
        else:
            sc, g = e['script'], e['voice']
            plans = [(VOICE[g], sc, 1.0, None), (VOICE[g], sc + '.', 1.0, None), (HD[g], sc, 1.0, None), (HD[g], sc + '.', 1.0, None),
                     (VOICE[g], sc, 0.85, None), (OTHER[g], sc, 1.0, None), (OTHER[g], sc + '.', 1.0, None)]
            alt = spoken(sc, e['say'])
            alts = [alt] if alt != sc else []
            if alt.startswith('וֵיס') or alt.startswith('וֵית'):              # read "wais" by the voice: other spellings of "veis"
                alts += ['וֵייס', 'ווֵיס', 'וֶייס', 'ווֵייס']
            for al in reversed(alts):
                plans = [(VOICE[g], al, 1.0, None), (VOICE[g], al + '.', 1.0, None), (HD[g], al, 1.0, None), (OTHER[g], al, 1.0, None)] + plans
            if e.get('taken') and e['tradition'] == 'israeli' and e['taken'] not in (sc, sc + '.'):
                plans.insert(2, (VOICE[g], e['taken'], 1.0, None))
            plans += [(v, sc, 1.0, c) for v in (VOICE[g], HD[g]) for c in CARRIERS]
            # first: the exact sounds (IPA) through the Chirp HD voices, so the voice cannot swap b for v or read a word it knows
            ipa = say_to_ipa(e['say'], e['tradition'])
            plans = [(IPA_VOICE[g], ' '.join(ipa), 1.0, 'ipa'), (IPA_VOICE[g], ' '.join(ipa), 1.0, 'ipa')] + plans
            tried, kept, best2 = [], None, None
            for i, (voice, text, rate, carrier) in enumerate(plans):
                raw, enc = os.path.join(tmp, f't{i}.' + ('wav' if carrier and carrier != 'ipa' else 'mp3')), os.path.join(tmp, f't{i}e.mp3')
                try:
                    if carrier == 'ipa':
                        open(raw, 'wb').write(synth_ipa(text.split(), voice, key))
                        text = '[' + text + '] (IPA)'
                    elif carrier:
                        open(raw, 'wb').write(FL.synth_in_carrier(text, voice, key, carrier[0], carrier[1], rate))
                        text = f'{carrier[0] or ""} [{text}] {carrier[1] or ""}'.strip()
                    else:
                        open(raw, 'wb').write(F.synth_rate(text, voice, key, rate))
                    F.encode(raw, enc, False)
                except Exception as ex:  # noqa: BLE001
                    tried.append({'voice': voice, 'text': text, 'error': str(ex)[:120]}); continue
                v = LS.verdict(enc, want)                 # three listeners (listeners.py): two of three must hear it
                hs = [f"{k}: {' / '.join(x) if isinstance(x, list) else x}" for k, x in v['heard'].items()]
                ok = sum(v['calls'].values())
                tried.append({'voice': voice, 'text': text, 'rate': rate, 'heard': v['heard'], 'calls': v['calls'], 'right': ok})
                if ok == 3:
                    kept = (enc, voice, text, rate, hs); break
                if ok == 2 and not best2:
                    best2 = (enc, voice, text, rate, hs)
            if not kept and best2:
                kept = best2
            rec['tried'] = tried
            if kept:
                shutil.copyfile(kept[0], os.path.join(ROOT, p))
                mp = os.path.join(ROOT, p) + '.meta.json'
                meta = json.load(open(mp, encoding='utf-8')) if os.path.exists(mp) else {}
                by_ipa = kept[2].endswith('(IPA)')
                meta.update({'voiceId': kept[1], 'inputText': kept[2], 'inputTextKind': 'ipa' if by_ipa else 'hebrew', 'madeFrom': 'ipa' if by_ipa else 'hebrew-script',
                             'note': (f"Re-recorded 17 Nov 2026: the {e['tradition']} reading \"{e['say']}\" given to the voice as exact sounds {kept[2]} "
                                      f"(Google Chirp HD, de-DE setting, which accepts IPA)" if by_ipa else
                                      f"Re-recorded 17 Nov 2026: the {e['tradition']} reading \"{e['say']}\" written in pointed Hebrew ({kept[2]}) and read by the Israeli voice")
                                     + f"; heard by three listeners as {'; '.join(kept[4])}. Synthetic, not a human recording."})
                meta.pop('inputSha256', None)
                with open(mp, 'w', encoding='utf-8', newline='\n') as f:
                    f.write(json.dumps(meta, ensure_ascii=False, indent=1) + '\n')
                rec['outcome'] = 'replaced'
                fixed.add(p)
            else:
                rec['outcome'] = 'no take heard right: needs a human voice'
                nogood.add(p)
        tally[rec['outcome']] = tally.get(rec['outcome'], 0) + 1
        with open(a.log, 'a', encoding='utf-8') as f:
            f.write(json.dumps(rec, ensure_ascii=False) + '\n')
        print(f"[{n}/{len(paths)}] {rec['outcome']}  {p}  {e['say']}", flush=True)
    print(tally)


if __name__ == '__main__':
    main()
