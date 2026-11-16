"""Fresh takes for the letter sounds, syllables and letter names the sound check says to listen to
(docs/audio/SOUNDS-CHECK.md, verdict "listen"), and a machine pick of the best take of each.

Step 1, record (needs the voice key; about 2 minutes):
  set GOOGLE_TTS_API_KEY=...            (macOS/Linux: export GOOGLE_TTS_API_KEY=...)
  python tools/audio/asr-check/sound_takes.py --record
Each clip is read from several spellings in its own WaveNet voice (Ari he-IL-Wavenet-B, Noa he-IL-Wavenet-A): the
pointed text, the same with a full stop, and the vowel written with its helper letter (סֻ also as סוּ, יֶ as יֶה),
which is what stops the voice reading a lone kubutz as "u-yi" or a lone יֶ as the word "yihye".
Takes go to audio-takes/sound-check/ with an index, takes.json. Nothing in the app changes.

Step 2, pick (no key; needs the sound model, see scan_sounds.py):
  python tools/audio/asr-check/sound_takes.py --pick --model /path/to/phoneme-ct2
Every take is heard five times among different neighbours. The pick for a clip is the take heard right most often;
a clip with no take heard right at least 4 times in 5 gets no pick. Result: audio-takes/sound-check/picks.json and a
printed table. Listen to the picks, then:

Step 3, use the picks:
  python tools/audio/asr-check/sound_takes.py --apply
copies each pick over its clip (loudness and format as the neighbours: -16 LUFS, mono, 44.1 kHz, 96 kbps) and
writes the sidecar. Then run scan_sounds.py again, and tools/deploy/media-hosts.mjs if a letter or vowel clip changed
(those folders are also served from the media repositories).

--list prints what would be recorded, without a key.
"""
import csv, json, os, random, re, sys
from collections import Counter

sys.path.insert(0, os.path.dirname(__file__))
import scan_sounds as S  # noqa: E402

ROOT = S.ROOT
OUT = os.path.join(ROOT, 'audio-takes', 'sound-check')
VOICE = {'m': 'he-IL-Wavenet-B', 'f': 'he-IL-Wavenet-A'}
HELPER = {'ַ': ['ָה', 'ַא'], 'ָ': ['ָה'], 'ֶ': ['ֶה'], 'ֵ': ['ֵה', 'ֵי'], 'ִ': ['ִי'], 'ֹ': ['וֹ'], 'ֻ': ['וּ']}
# Letter names and other clips that are not one letter plus one vowel: spellings to try, by clip id.
NAMED = {'he': ['הֵא', 'הֵא.', 'הֵי', 'הֶא'], 'pe-final': ['פֵּא סוֹפִית', 'פֵּה סוֹפִית', 'פֵּי סוֹפִית', 'פֵּא, סוֹפִית'],
         'segol': ['אֶ', 'אֶה', 'אֶ.', 'אֶה.']}
# Fixed already on the letter audit branch (claude/letter-audit-2026-11-13), or waiting for a decision on what the clip should say.
SKIP = {'khaf', 'vet', 'vav-sound', 'vet-sound', 'vav-a', 'resh', 'shin', 'dagesh', 'shva'}


def spellings(row):
    text = row['input'] or row['text']
    if row['id'] in NAMED:
        return NAMED[row['id']]
    letters = re.sub('[^א-ת]', '', text)
    out = [text, text + '.']
    if len(letters) == 1:
        marks = [ch for ch in text if ch in HELPER]
        if not marks and row['kind'] == 'letter':               # a bare letter sound: letter + a
            text = text + 'ַ'
            marks = ['ַ']
            out = [text, text + '.']
        for mk in marks[:1]:
            base = text.replace(mk, '')                           # the letter with its dagesh or shin/sin dot
            for h in HELPER[mk]:
                out += [base + h, base + h + '.']
    seen = []
    for t in out:
        if t not in seen:
            seen.append(t)
    return seen


def targets():
    out = []
    for c, row, want, verdict, n, hs in S.judged():
        if verdict == 'listen' and row['id'] not in SKIP:
            if not (set(want) & S.VOWELS):
                want = want + 'a'
            out.append({'voice': c['voice'], 'id': row['id'], 'kind': row['kind'], 'want': want, 'files': c['files'], 'spellings': spellings(row)})
    return sorted(out, key=lambda t: (t['voice'], t['kind'], t['id']))


def record():
    import fix as F
    key = os.environ.get('GOOGLE_TTS_API_KEY')
    if not key:
        raise SystemExit('set GOOGLE_TTS_API_KEY first')
    os.makedirs(OUT, exist_ok=True)
    index = []
    for t in targets():
        for i, text in enumerate(t['spellings'], 1):
            name = f"{t['voice']}-{t['kind']}-{t['id']}-{i}.mp3"
            dst = os.path.join(OUT, name)
            if not os.path.exists(dst):
                open(dst, 'wb').write(F.synth_rate(text, VOICE[t['voice']], key))
            index.append({'take': 'audio-takes/sound-check/' + name, 'voice': t['voice'], 'kind': t['kind'], 'id': t['id'], 'text': text,
                          'engine': VOICE[t['voice']], 'want': t['want'], 'files': t['files']})
            print(name, text, flush=True)
    with open(os.path.join(OUT, 'takes.json'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(index, ensure_ascii=False, indent=1) + '\n')
    print(f'{len(index)} takes in audio-takes/sound-check/')


def pick(model_dir, passes=5):
    index = json.load(open(os.path.join(OUT, 'takes.json'), encoding='utf-8'))
    hear_row = S.hearer(model_dir)
    heard = {t['take']: [] for t in index}
    for p in range(passes):
        for v in ('f', 'm'):
            todo = [t for t in index if t['voice'] == v]
            random.Random(100 + p).shuffle(todo)
            for i in range(0, len(todo), S.ROW):
                row = todo[i:i + S.ROW]
                for t, (h, _) in zip(row, hear_row([os.path.join(ROOT, t['take']) for t in row])):
                    heard[t['take']].append(h)
                print(f'pass {p} {v} {i + len(row)}/{len(todo)}', flush=True)
    picks, by = [], {}
    for t in index:
        _, n = S.judge(t['want'], heard[t['take']])
        t['heard'], t['right'] = heard[t['take']], n
        by.setdefault((t['voice'], t['kind'], t['id']), []).append(t)
    for k, ts in sorted(by.items()):
        best = max(ts, key=lambda t: (t['right'], -ts.index(t)))
        ok = best['right'] >= passes - 1
        picks.append({'voice': k[0], 'kind': k[1], 'id': k[2], 'want': best['want'], 'pick': best['take'] if ok else None,
                      'text': best['text'], 'right': best['right'], 'of': passes, 'heard': best['heard'], 'files': best['files']})
        print(f"{'pick   ' if ok else 'no pick'} {k[0]} {k[1]}/{k[2]}  should {best['want']}  best {best['text']}  {best['right']}/{passes}  {' / '.join(best['heard'])}")
    with open(os.path.join(OUT, 'picks.json'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(picks, ensure_ascii=False, indent=1) + '\n')
    print(f"{sum(1 for p in picks if p['pick'])} of {len(picks)} clips have a pick")


def apply():
    import fix as F
    takes = {t['take']: t for t in json.load(open(os.path.join(OUT, 'takes.json'), encoding='utf-8'))}
    for p in json.load(open(os.path.join(OUT, 'picks.json'), encoding='utf-8')):
        if not p['pick']:
            continue
        for rel in p['files']:
            dst = os.path.join(ROOT, rel)
            F.encode(os.path.join(ROOT, p['pick']), dst, builder=False)
            mp = dst + '.meta.json'
            meta = json.load(open(mp, encoding='utf-8')) if os.path.exists(mp) else {}
            meta.update({'status': 'tts', 'source': 'paid-cloud', 'engine': 'google-cloud-tts', 'voiceId': takes[p['pick']]['engine'],
                         'inputText': p['text'], 'inputTextKind': 'hebrew',
                         'note': f"Re-recorded after the sound check (docs/audio/SOUNDS-CHECK.md): read from {p['text']}, heard right "
                                 f"{p['right']} times in {p['of']} by tools/audio/asr-check/sound_takes.py."})
            meta.pop('inputSha256', None)
            with open(mp, 'w', encoding='utf-8', newline='\n') as f:
                f.write(json.dumps(meta, ensure_ascii=False, indent=1) + '\n')
            print('replaced', rel)


if __name__ == '__main__':
    a = sys.argv[1:]
    if '--record' in a:
        record()
    elif '--pick' in a:
        if '--model' not in a:
            raise SystemExit('give --model (the converted renikud/whisper-he-ipa folder)')
        pick(a[a.index('--model') + 1])
    elif '--apply' in a:
        apply()
    else:
        ts = targets()
        for t in ts:
            print(t['voice'], f"{t['kind']}/{t['id']}", 'should', t['want'], '|', '  '.join(t['spellings']), '|', len(t['files']), 'file(s)')
        print(f"{len(ts)} clips, {sum(len(t['spellings']) for t in ts)} takes to record")
