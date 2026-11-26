"""Render fresh takes (Chirp 3 HD first, WaveNet as a fallback) for the clips the four-listener check flagged.

Runs in Google Cloud Shell with the signed-in account (no API key): the token comes from `gcloud auth print-access-token`.

  python tools/audio/asr-check/chirp_takes.py --list tools/audio/asr-check/multi4-rerecord.txt --out ~/aleph-takes
  tar czf ~/aleph-takes.tgz -C ~ aleph-takes && cloudshell download ~/aleph-takes.tgz

Takes per clip (raw 24 kHz MP3 as the API returns it; encode to the repo format only after a take is chosen):
  c-pt   Chirp 3 HD, pointed text          c-pt-90  same, 0.9 speed
  c-pl   Chirp 3 HD, unpointed text        c-pl-90  same, 0.9 speed
  w-pt   WaveNet, pointed text (the voice the clip was first made with)
"""
import argparse, base64, json, os, re, subprocess, sys, time, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
VOICES = {'m': ('he-IL-Chirp3-HD-Charon', 'he-IL-Wavenet-B'), 'f': ('he-IL-Chirp3-HD-Kore', 'he-IL-Wavenet-A')}
NIQQUD = re.compile(r'[֑-ׇ]')


def speakable(h):
    s = re.sub(r'[֑-ֽֿ֯׀׃-׆]', '', str(h).replace('־', ' '))
    return re.sub(r'\s+', ' ', s).strip(' .:')


def plain(h):
    return re.sub(r'\s+', ' ', NIQQUD.sub('', str(h).replace('־', ' '))).strip(' .:׃')


def ktiv_male(h):
    """Full spelling, the way Israelis write without points: holam and shuruk/kubbutz as ו, hiriq as י, a consonant vav
    doubled. Keeps the points too, so the voice has both the letters and the vowels."""
    out = []
    for w in str(h).split():
        # dagesh and shin/sin dots first in each letter's marks, so the vowel rules below see one order
        w = re.sub('([\u05B0-\u05BB]+)([\u05BC\u05C1\u05C2]+)', lambda m: m.group(2) + m.group(1), w)
        w = re.sub('(?<=[\u05D0-\u05EA\u05B0-\u05C2])\u05D5(?=[\u05B0-\u05B8\u05BC]*[\u05B0-\u05B8])(?!\u05B9)', '\u05D5\u05D5', w)   # consonant vav -> וו
        w = re.sub('([\u05D0-\u05D4\u05D6-\u05EA][\u05BC\u05C1\u05C2]*)\u05B9(?!\u05D5)', '\\1\u05D5\u05B9', w)   # holam -> וֹ
        w = re.sub('([\u05D0-\u05EA][\u05BC\u05C1\u05C2]*)\u05BB', '\\1\u05D5\u05BC', w)                 # kubbutz -> וּ
        w = re.sub('([\u05D0-\u05EA][\u05BC\u05C1\u05C2]*)\u05B4(?![\u05D9])', '\\1\u05B4\u05D9', w)    # hiriq -> ִי
        out.append(w)
    return ' '.join(out)


ALT = {'m': ['he-IL-Chirp3-HD-Puck', 'he-IL-Chirp3-HD-Fenrir', 'he-IL-Chirp3-HD-Orus'],
       'f': ['he-IL-Chirp3-HD-Aoede', 'he-IL-Chirp3-HD-Leda', 'he-IL-Chirp3-HD-Zephyr']}


def pieces(text, max_words=18):
    """Chirp 3 HD refuses very long sentences: split at clause marks, then into groups of at most max_words words."""
    out = []
    for part in re.split(r'(?<=[.,;:׃])\s+', text):
        w = part.split()
        out += [' '.join(w[i:i + max_words]) for i in range(0, len(w), max_words)]
    return [p for p in out if p]


class TTS:
    def __init__(self, project):
        self.project, self.tok, self.t = project, None, 0

    def token(self):
        if not self.tok or time.time() - self.t > 1800:
            self.tok = subprocess.run(['gcloud', 'auth', 'print-access-token'], capture_output=True, text=True, check=True).stdout.strip()
            self.t = time.time()
        return self.tok

    def synth(self, text, voice, rate=1.0):
        audio = {'audioEncoding': 'MP3', 'sampleRateHertz': 24000}
        if rate != 1.0:
            audio['speakingRate'] = rate
        body = json.dumps({'input': {'text': text}, 'voice': {'languageCode': 'he-IL', 'name': voice}, 'audioConfig': audio}).encode()
        for attempt in range(4):
            req = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize', data=body, method='POST',
                                         headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + self.token(),
                                                  'x-goog-user-project': self.project})
            try:
                with urllib.request.urlopen(req, timeout=120) as r:
                    return base64.b64decode(json.load(r)['audioContent'])
            except urllib.error.HTTPError as e:
                msg = e.read().decode()[:300]
                if e.code in (429, 500, 503) and attempt < 3:
                    time.sleep(5 * (attempt + 1)); continue
                raise RuntimeError(f'{e.code} {msg}')



# --- round 5: a problem word written the way it should sound, for the voice only ------------------------------------
DAGESH, KAMATZ, HOLAM = '\u05BC', '\u05B8', '\u05B9'
SAY_AS = {'מְצַוְּךָ': 'מְצַוֶּוְךָ'}


def respell(w):
    """The voices ignore the soft/hard letter rule and the kamatz katan: soft ב -> ו, soft כ (not final) -> ח,
    כָּל -> כֹּל. The clip's text stays the real word; only what is sent to the voice changes."""
    if w in SAY_AS:
        return SAY_AS[w]
    cl = re.findall(r'[\u05D0-\u05EA][\u0591-\u05C7]*|[^\u05D0-\u05EA]+', w)     # letter + its marks
    out = []
    for i, c in enumerate(cl):
        base, marks = c[0], c[1:]
        if base == 'כ' and KAMATZ in marks and i + 1 < len(cl) and cl[i + 1][0] == 'ל' and (
                i + 2 == len(cl) or not re.match(r'[\u05D0-\u05EA]', cl[i + 2][0])):
            marks = marks.replace(KAMATZ, HOLAM)                                    # כָּל, וְכָל, דְכָל: kol
        if base in 'בכ' and DAGESH not in marks and not (base == 'כ' and i == len(cl) - 1):
            base = {'ב': 'ו', 'כ': 'ח'}[base]
        out.append(base + marks)
    return ''.join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--list', required=True, help='clip paths, one per line')
    ap.add_argument('--queue', default=os.path.join(HERE, 'multi4-queue.json'))
    ap.add_argument('--out', required=True)
    ap.add_argument('--takes', default='c-pt,c-pt-90,c-pl,c-pl-90,w-pt')
    ap.add_argument('--problems', help='JSON {clip: [problem words]}: lines get those words in full spelling only (c-sel)')
    ap.add_argument('--respell', help='JSON {clip: [spellings]}: a single word Chirp misreads, written the way it should sound '
                                      '(s<i>, s<i>-90, s<i>-a other voice, s<i>-car inside the carrier phrase)')
    ap.add_argument('--respell-lines', help='JSON {clip: [problem words]}: the clip with those words respelled for the voice '
                                            '(w-rs WaveNet pointed, c-rspl-80 Chirp unpointed at 0.8, c-rs Chirp for single words)')
    ap.add_argument('--words5', help='round5-words.json: single problem words of stitched lines, in the WaveNet voice the '
                                     'lines are stitched from (w as written, w-rs respelled, w-rs-car in a carrier phrase)')
    ap.add_argument('--words6', help='round6-words.json: every word of the non-Torah lines (w/w-car/w-rs WaveNet, c/c-car/c-rs Chirp)')
    ap.add_argument('--project', default=subprocess.run(['gcloud', 'config', 'get-value', 'project'], capture_output=True, text=True).stdout.strip())
    a = ap.parse_args()
    probs = json.load(open(a.problems, encoding='utf-8')) if a.problems else {}
    resp = json.load(open(a.respell, encoding='utf-8')) if a.respell else {}
    rsl = json.load(open(a.respell_lines, encoding='utf-8')) if a.respell_lines else {}
    want = {o['file']: re.sub(r'\s*\(cut from:.*\)\s*$', '', o['want']) for o in json.load(open(a.queue, encoding='utf-8'))}
    files = [l.strip() for l in open(a.list, encoding='utf-8') if l.startswith('audio/')]
    tts = TTS(a.project)
    if a.words6:
        # round 6: every word of the non-Torah lines, in both voice families, as written and respelled
        from concurrent.futures import ThreadPoolExecutor
        items = json.load(open(a.words6, encoding='utf-8'))['items']
        jobs = []
        for key, it in sorted(items.items()):
            chirp, wavenet = VOICES[it['g']]
            w = speakable(it['word']); rs = respell(it['word'])
            d = os.path.join(a.out, 'w6', it['g'], it['slug'])
            os.makedirs(d, exist_ok=True)
            json.dump(it, open(os.path.join(d, 'want.json'), 'w', encoding='utf-8'), ensure_ascii=False)
            plan = [('w', w, wavenet), ('w-car', 'הַמִּלָּה, ' + w + '.', wavenet),
                    ('c', w, chirp), ('c-car', 'הַמִּלָּה, ' + w + '.', chirp)]
            if rs != it['word']:
                plan += [('w-rs', rs, wavenet), ('c-rs', rs, chirp)]
            jobs += [(key, os.path.join(d, tid + '.mp3'), text, v) for tid, text, v in plan]
        jobs = [j for j in jobs if not os.path.exists(j[1])]
        print(f'{len(items)} words, {len(jobs)} takes to record', flush=True)
        done = [0]

        def one(j):
            key, dst, text, voice = j
            for attempt in range(6):
                try:
                    open(dst, 'wb').write(tts.synth(text, voice)); break
                except Exception as e:
                    if attempt == 5 or not str(e).startswith(('429', '500', '503')):
                        print(f'  {key} {os.path.basename(dst)}: {e}', flush=True); break
                    time.sleep(10 * (attempt + 1))
            done[0] += 1
            if done[0] % 200 == 0:
                print(f'[{done[0]}/{len(jobs)}]', flush=True)
        tts.token()
        with ThreadPoolExecutor(8) as ex:
            list(ex.map(one, jobs))
        return
    if a.words5:
        items = json.load(open(a.words5, encoding='utf-8'))['items']
        for n, (key, it) in enumerate(sorted(items.items()), 1):
            wavenet = VOICES[it['g']][1]
            w = speakable(it['word']); rs = respell(it['word'])
            d = os.path.join(a.out, 'w5', it['g'], it['slug'])
            os.makedirs(d, exist_ok=True)
            json.dump(it, open(os.path.join(d, 'want.json'), 'w', encoding='utf-8'), ensure_ascii=False)
            plan = [('w', w, 1.0), ('w-car', 'הַמִּלָּה, ' + w + '.', 1.0)]
            if rs != it['word']:
                plan += [('w-rs', rs, 1.0), ('w-rs-car', 'הַמִּלָּה, ' + rs + '.', 1.0)]
            for tid, text, rate in plan:
                dst = os.path.join(d, tid + '.mp3')
                if not os.path.exists(dst):
                    try:
                        open(dst, 'wb').write(tts.synth(text, wavenet, rate))
                    except Exception as e:
                        print(f'  {key} {tid}: {e}', flush=True)
            print(f'[{n}/{len(items)}] {key}', flush=True)
        return
    print(f'project {a.project}: {len(files)} clips', flush=True)
    for n, f in enumerate(files, 1):
        g = f.split('/')[1]
        chirp, wavenet = VOICES[g]
        pt, pl = speakable(want[f]), plain(want[f])
        d = os.path.join(a.out, f[:-4])
        os.makedirs(d, exist_ok=True)
        json.dump({'file': f, 'want': want[f]}, open(os.path.join(d, 'want.json'), 'w', encoding='utf-8'), ensure_ascii=False)
        km = ktiv_male(speakable(want[f]))
        plan = [('c-pt', pt, chirp, 1.0), ('c-pt-90', pt, chirp, 0.9), ('c-pl', pl, chirp, 1.0), ('c-pl-90', pl, chirp, 0.9),
                ('w-pt', pt, wavenet, 1.0), ('c-km', km, chirp, 1.0), ('c-kmpl', plain(km), chirp, 1.0)]
        if len(pt.split()) <= 2:   # single words: say it inside a short carrier phrase; it is cut out afterwards (c-car)
            plan += [('c-car', 'הַמִּלָּה, ' + pt + '.', chirp, 1.0), ('c-carkm', 'הַמִּלָּה, ' + km + '.', chirp, 1.0)]
        if len(pt.split()) > 2:    # lines: Chirp reads prayers fast (5-6 syl/s); 0.8 brings them to a natural reading pace
            plan += [('c-pt-80', pt, chirp, 0.8), ('c-pl-80', pl, chirp, 0.8)]
        if len(pt.split()) <= 2:
            pass
        elif probs.get(f):         # lines: only the problem words in full spelling, the rest as pointed
            bad = {re.sub(r'[\u0591-\u05C7]', '', w) for w in probs[f]}
            sel = ' '.join(ktiv_male(w) if re.sub(r'[\u0591-\u05C7]', '', w) in bad else w for w in pt.split())
            plan += [('c-sel', sel, chirp, 1.0), ('c-sel-80', sel, chirp, 0.8)]
        if len(pt.split()) <= 2:   # single words only: other Chirp voices of the same sex
            plan += [(f'a{i}-pt', pt, v, 1.0) for i, v in enumerate(ALT[g])] + [(f'a{i}-km', km, v, 1.0) for i, v in enumerate(ALT[g])]
        if f in resp:              # respelled: only these takes for this clip
            plan = []
            for i, sp in enumerate(resp[f]):
                plan += [(f's{i}', sp, chirp, 1.0), (f's{i}-90', sp, chirp, 0.9), (f's{i}-a', sp, ALT[g][0], 1.0),
                         (f's{i}-car', 'הַמִּלָּה, ' + sp + '.', chirp, 1.0)]
        if f in rsl:               # round 5: problem words respelled, the rest as written
            bad = {re.sub(r'[\u0591-\u05C7]', '', w) for w in rsl[f]}
            rs = ' '.join(respell(w) if re.sub(r'[\u0591-\u05C7]', '', w) in bad else w for w in pt.split())
            plan = [('w-rs', rs, wavenet, 1.0), ('c-rspl-80', plain(rs), chirp, 0.8)]
            if len(pt.split()) <= 2:
                plan = [('w-rs', rs, wavenet, 1.0), ('c-rs', rs, chirp, 1.0), ('c-rs-car', 'הַמִּלָּה, ' + rs + '.', chirp, 1.0)]
        for tid, text, voice, rate in plan:
            if tid not in a.takes.split(',') and not (f in resp and tid.startswith('s')) and not (f in rsl and '-rs' in tid):
                continue
            dst = os.path.join(d, tid + '.mp3')
            if os.path.exists(dst):
                continue
            try:
                data = b''.join(tts.synth(p, voice, rate) for p in pieces(text))
                open(dst, 'wb').write(data)
            except Exception as e:
                print(f'  {f} {tid}: {e}', flush=True)
        print(f'[{n}/{len(files)}] {f}', flush=True)


if __name__ == '__main__':
    main()
