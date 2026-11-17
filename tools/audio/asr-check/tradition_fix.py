"""Fix the Sephardi and Ashkenazi letter, vowel and syllable clips the three-tradition check flags (traditions-wrong.txt).

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
import argparse, json, os, shutil, sys, tempfile

sys.path.insert(0, os.path.dirname(__file__))
import numpy as np  # noqa: E402
import scan_sounds as S  # noqa: E402
import scan_traditions as T  # noqa: E402
import check_lib as L  # noqa: E402
import fix as F  # noqa: E402

ROOT = S.ROOT
VOICE = {'m': 'he-IL-Wavenet-B', 'f': 'he-IL-Wavenet-A'}
HD = {'m': 'he-IL-Chirp3-HD-Charon', 'f': 'he-IL-Chirp3-HD-Kore'}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--list', required=True)
    ap.add_argument('--model', required=True)
    ap.add_argument('--execute', action='store_true')
    ap.add_argument('--log', default=os.path.join(os.path.dirname(__file__), 'tradition-fix-log.jsonl'))
    a = ap.parse_args()
    exp = json.load(open(T.EXPECT, encoding='utf-8'))
    paths = [l.strip() for l in open(os.path.join(ROOT, a.list), encoding='utf-8') if l.strip().startswith('audio/')]
    paths = [p for p in paths if exp.get(p, {}).get('tradition') in ('sephardi', 'ashkenazi')
             and exp[p]['id'] not in ('shin-dot', 'sin-dot')]      # mark cards say the letter's name; the check expects the bare sound
    print(len(paths), 'Sephardi/Ashkenazi clips to fix', flush=True)
    key = os.environ.get('GOOGLE_TTS_API_KEY')
    if a.execute and not key:
        sys.exit('Set GOOGLE_TTS_API_KEY first.')
    from faster_whisper import WhisperModel
    hear_row = S.hearer(a.model)
    gap = np.zeros(int(S.GAP * L.SR), np.float32)
    tmp = tempfile.mkdtemp(prefix='alef-trad-')
    tally = {}
    for n, p in enumerate(paths, 1):
        e = exp[p]
        want = T.say_to_sounds(e['say'])
        rec = {'file': p, 'tradition': e['tradition'], 'text': e['text'], 'say': e['say'], 'script': e['script']}
        isr = p.replace(f"/{e['tradition']}/", '/israeli/')
        if e['say'] == e['israeliSay'] and os.path.exists(os.path.join(ROOT, isr)):
            # the tradition's reading is letter for letter the Israeli one: the checked Israeli clip of the same voice says it
            rec['outcome'] = 'copied the Israeli clip (same reading)'
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
        elif not a.execute:
            rec['outcome'] = 'would record takes'
        else:
            script = e['script']
            if e['group'] == 'letter-sound' and e['tradition'] == 'ashkenazi' and e['say'] == 's':
                script = 'סַ'                        # Ashkenazi tav without dagesh sounds "s"
            e = dict(e, script=script)
            plans = [(VOICE[e['voice']], e['script'], 1.0), (VOICE[e['voice']], e['script'] + '.', 1.0), (VOICE[e['voice']], e['script'], 0.9),
                     (HD[e['voice']], e['script'], 1.0), (HD[e['voice']], e['script'] + '.', 1.0), (VOICE[e['voice']], e['script'] + ',', 0.85)]
            tried, kept = [], None
            for i, (voice, text, rate) in enumerate(plans):
                raw, enc = os.path.join(tmp, f't{i}.mp3'), os.path.join(tmp, f't{i}e.mp3')
                try:
                    open(raw, 'wb').write(F.synth_rate(text, voice, key, rate))
                    F.encode(raw, enc, False)
                except Exception as ex:  # noqa: BLE001
                    tried.append({'voice': voice, 'text': text, 'error': str(ex)[:120]}); continue
                hs = [h for h, _ in hear_row([enc])] + [h for h, _ in hear_row([enc])] + [h for h, _ in hear_row([enc])]
                ok = sum(T.close(want, h) for h in hs)
                tried.append({'voice': voice, 'text': text, 'rate': rate, 'heard': hs, 'right': ok})
                if ok >= 2:
                    kept = (enc, voice, text, rate, hs); break
            rec['tried'] = tried
            if kept:
                shutil.copyfile(kept[0], os.path.join(ROOT, p))
                mp = os.path.join(ROOT, p) + '.meta.json'
                meta = json.load(open(mp, encoding='utf-8')) if os.path.exists(mp) else {}
                meta.update({'voiceId': kept[1], 'inputText': kept[2], 'inputTextKind': 'hebrew', 'madeFrom': 'hebrew-script',
                             'note': f"Re-recorded 17 Nov 2026: the {e['tradition']} reading \"{e['say']}\" written in pointed Hebrew ({kept[2]}) and read by the "
                                     f"Israeli voice; the sound model heard it as {' / '.join(kept[4])}. Synthetic, not a human recording."})
                meta.pop('inputSha256', None)
                with open(mp, 'w', encoding='utf-8', newline='\n') as f:
                    f.write(json.dumps(meta, ensure_ascii=False, indent=1) + '\n')
                rec['outcome'] = 'replaced'
            else:
                rec['outcome'] = 'no take heard right: needs a human voice'
        tally[rec['outcome']] = tally.get(rec['outcome'], 0) + 1
        with open(a.log, 'a', encoding='utf-8') as f:
            f.write(json.dumps(rec, ensure_ascii=False) + '\n')
        print(f"[{n}/{len(paths)}] {rec['outcome']}  {p}  {e['say']}", flush=True)
    print(tally)


if __name__ == '__main__':
    main()
