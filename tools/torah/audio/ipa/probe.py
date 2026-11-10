"""One request that asks Google which IPA symbols its de-DE Chirp voices accept. Prints the invalid ones."""
import json, os, urllib.request, urllib.error
SYMS = ['i', 'iː', 'ɪ', 'e', 'eː', 'ɛ', 'a', 'aː', 'o', 'oː', 'ɔ', 'u', 'uː', 'ʊ', 'ə', 'ʔ', 'ts', 't͡s', 'χ', 'x', 'ç', 'ʁ', 'r', 'ʀ', 'ʃ', 'j', 'ɡ', 'g', 'v', 'f', 'z', 's', 'h', 'k', 'p', 'b', 'd', 't', 'l', 'm', 'n', 'tʃ', 't͡ʃ', 'dʒ', 'd͡ʒ', 'aj', 'aɪ', 'aɪ̯', 'ej', 'eɪ', 'oj', 'ɔɪ', 'ɔʏ', 'uj', 'ʊɪ']
phr = [{'phrase': f'wort{chr(97 + i // 26)}{chr(97 + i % 26)}', 'phoneticEncoding': 'PHONETIC_ENCODING_IPA', 'pronunciation': f'ha.ˈl{s}m' if s not in ('aj','aɪ','aɪ̯','ej','eɪ','oj','ɔɪ','ɔʏ','uj','ʊɪ') else f'ha.ˈl{s}'} for i, s in enumerate(SYMS)]
for p, s in zip(phr, SYMS):
    if s in ('i','iː','ɪ','e','eː','ɛ','a','aː','o','oː','ɔ','u','uː','ʊ','ə'):
        p['pronunciation'] = f'ha.ˈl{s}m'
    elif s not in ('aj','aɪ','aɪ̯','ej','eɪ','oj','ɔɪ','ɔʏ','uj','ʊɪ'):
        p['pronunciation'] = f'ha.ˈ{s}a'
body = {'input': {'text': ' '.join(p['phrase'] for p in phr) + '.', 'customPronunciations': {'pronunciations': phr}},
        'voice': {'languageCode': 'de-DE', 'name': 'de-DE-Chirp3-HD-Kore'}, 'audioConfig': {'audioEncoding': 'MP3'}}
req = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize', json.dumps(body).encode(),
                             {'Content-Type': 'application/json', 'X-Goog-Api-Key': os.environ['GOOGLE_TTS_API_KEY']})
try:
    urllib.request.urlopen(req, timeout=60).read()
    print('PROBE all symbols accepted')
except urllib.error.HTTPError as e:
    msg = json.loads(e.read())['error']['message']
    bad = {p['phrase']: s for p, s in zip(phr, SYMS)}
    names = [x.strip(' .') for x in msg.split(':', 1)[1].split('Please')[0].split(',')] if 'invalid' in msg else []
    print('PROBE invalid:', [bad.get(n, n) for n in names])
    print('PROBE accepted:', [s for p, s in zip(phr, SYMS) if p['phrase'] not in names])
    print('PROBE message:', msg[:300])
