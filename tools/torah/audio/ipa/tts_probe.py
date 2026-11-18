"""One small Google Text-to-Speech request with the repo's key, printing only the HTTP status and Google's error message
(never the key), to see why requests are refused."""
import json, os, urllib.error, urllib.request
key = os.environ.get('GOOGLE_TTS_API_KEY', '')
for name, lang in (('de-DE-Chirp3-HD-Charon', 'de-DE'), ('he-IL-Wavenet-B', 'he-IL')):
    body = {'input': {'text': 'shalom.'}, 'voice': {'languageCode': lang, 'name': name}, 'audioConfig': {'audioEncoding': 'MP3'}}
    req = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize', data=json.dumps(body).encode(), method='POST',
                                 headers={'Content-Type': 'application/json', 'X-Goog-Api-Key': key})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            print(name, r.status, 'ok')
    except urllib.error.HTTPError as e:
        print(name, e.code, e.read().decode()[:1500])
