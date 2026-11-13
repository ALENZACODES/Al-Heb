"""Record fresh takes of the letter names, the V sound and the vowel names that the letter audit of 13 Nov 2026 heard wrong
(docs/letters/LETTER-AUDIT-2026-11-13.md).

Each target is recorded from a few spellings in four voices (the Israeli WaveNet pair the letter lessons use, and the
Chirp 3 HD pair the word builder uses). Files go to audio-takes/letter-audit/ with an index, takes.json.
Nothing in the app changes here: the takes are listened to afterwards and only the best one of each is used.

The key is read from the GOOGLE_TTS_API_KEY environment variable (or a .env file in the repo root) and is never
printed or written anywhere.

  python tools/audio/render_letter_takes.py
"""
import base64, json, os, re, sys, time, urllib.request, urllib.error

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'audio-takes', 'letter-audit')
VOICES = {'wm': 'he-IL-Wavenet-B', 'wf': 'he-IL-Wavenet-A', 'cm': 'he-IL-Chirp3-HD-Charon', 'cf': 'he-IL-Chirp3-HD-Kore'}

# target id -> (what it should sound like, spellings to try)
TARGETS = {
    'name-vet': ('vet', ['וֵית', 'וֵט', 'וֶת', 'בֵית', 'וֵית.']),
    'name-khaf': ('khaf', ['כָף', 'חַף', 'חָף', 'כַף.', 'כָאף']),
    'name-resh': ('resh', ['רֵישׁ', 'רֵשׁ', 'רֶשׁ', 'רֵישׁ.']),
    'name-shin': ('shin', ['שִׁין', 'שִׁין.', 'שין']),
    'name-gimel': ('GI-mel', ['גִּימֶל', 'גִּימֶל.', 'גימל']),
    'sound-va': ('va', ['וָה', 'וַא', 'בָה', 'וָא', 'וַה.']),
    'mark-sheva': ('shva', ['שְׁוָא', 'שווא', 'שְׁבָא']),
    'mark-hataf-segol': ('chataf segol', ['חֲטַף סֶגוֹל', 'חטף סגול']),
    'mark-hataf-patah': ('chataf patach', ['חֲטַף פַּתָּח', 'חטף פתח']),
    'mark-hataf-qamats': ('chataf kamats', ['חֲטַף קָמָץ', 'חטף קמץ']),
    'mark-hiriq': ('chirik', ['חִירִיק', 'חיריק']),
    'mark-tsere': ('tsere', ['צֵירֵי', 'צֵירֶה', 'צירה']),
    'mark-segol': ('segol', ['סֶגוֹל', 'סגול']),
    'mark-patah': ('patach', ['פַּתָּח', 'פתח.', 'פַּתַח']),
    'mark-qamats': ('kamats', ['קָמָץ', 'קמץ', 'קָמַץ']),
    'mark-holam': ('cholam', ['חוֹלָם', 'חולם']),
    'mark-qubuts': ('kubuts', ['קֻבּוּץ', 'קובוץ', 'קוּבּוּץ']),
    'mark-dagesh': ('dagesh', ['דָּגֵשׁ', 'דגש', 'דָגֶשׁ']),
    'mark-shin-dot': ('nekudat shin', ['נְקֻדַּת שִׁין', 'נקודת שִׁין']),
    'mark-sin-dot': ('nekudat sin', ['נְקֻדַּת שִׂין', 'נקודת שִׂין', 'נקודת סין']),
    'mark-qamats-qatan': ('kamats katan', ['קָמָץ קָטָן', 'קמץ קטן']),
    # second round: the first spellings of these were still heard wrong
    'sound-va-b': ('va', ['וַע', 'וָע', 'ואה', 'וָאה', 'וַ', 'וָו וָ']),
    'name-khaf-b': ('khaf', ['חַאף', 'חָאף', 'חַף.', 'כָף סוֹפִית']),
    'mark-sheva-b': ('shva', ['שְׁוָה', 'שְבָא', 'שְׁוַא', 'שְׁוָא.', 'הַשְּׁוָא']),
    'mark-shin-dot-b': ('nekudat shin', ['נקודת שין', 'נְקֻדַּת שין', 'נְקֻדַּת שִׁן', 'נְקֻדָּה שִׁין', 'נְקֻדַּת, שִׁין']),
}


def key():
    k = os.environ.get('GOOGLE_TTS_API_KEY', '').strip()
    p = os.path.join(ROOT, '.env')
    if not k and os.path.exists(p):
        for line in open(p, encoding='utf-8'):
            m = re.match(r'\s*GOOGLE_TTS_API_KEY\s*=\s*"?([^"\s]+)"?\s*$', line)
            if m:
                k = m.group(1)
    return k


def synth(text, voice, k):
    body = json.dumps({'input': {'text': text}, 'voice': {'languageCode': 'he-IL', 'name': voice},
                       'audioConfig': {'audioEncoding': 'MP3', 'sampleRateHertz': 24000}}).encode()
    req = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize', data=body, method='POST',
                                 headers={'Content-Type': 'application/json', 'X-Goog-Api-Key': k})
    with urllib.request.urlopen(req, timeout=60) as r:
        return base64.b64decode(json.load(r)['audioContent'])


def main():
    k = key()
    print('voice key found:', 'yes' if k else 'NO - set GOOGLE_TTS_API_KEY in Windows or in .env', flush=True)
    if not k:
        sys.exit(2)
    os.makedirs(OUT, exist_ok=True)
    idx_p = os.path.join(OUT, 'takes.json')
    idx = json.load(open(idx_p, encoding='utf-8')) if os.path.exists(idx_p) else []
    have = {t['file'] for t in idx}
    made = failed = 0
    for tid, (want, texts) in TARGETS.items():
        for n, text in enumerate(texts, 1):
            for tag, voice in VOICES.items():
                name = f'{tid}-{tag}-{n}.mp3'
                if name in have:
                    continue
                for attempt in range(3):
                    try:
                        open(os.path.join(OUT, name), 'wb').write(synth(text, voice, k))
                        idx.append({'file': name, 'target': tid, 'want': want, 'text': text, 'engine': voice})
                        made += 1
                        break
                    except urllib.error.HTTPError as e:
                        if e.code in (401, 403):
                            print(f'stopped: Google answered {e.code} (key not accepted or not allowed for Text-to-Speech)', flush=True)
                            json.dump(idx, open(idx_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
                            sys.exit(3)
                        if e.code == 400:
                            failed += 1
                            break
                        time.sleep(2 + attempt * 3)
                    except Exception:
                        time.sleep(2 + attempt * 3)
                else:
                    failed += 1
                time.sleep(0.12)
        json.dump(idx, open(idx_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
        print(f'{tid}: {made} takes made so far, {failed} failed', flush=True)
    print(f'done: {made} takes made, {failed} failed', flush=True)


if __name__ == '__main__':
    main()
