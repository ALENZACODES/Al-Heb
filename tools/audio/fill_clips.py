"""Record the clips listed in tools/audio/fill-list.json and review each one with the repo's three reviewers.
Run as a GitHub Actions matrix job (.github/workflows/fill-clips.yml); needs GOOGLE_TTS_API_KEY.

Each job row: {"path", "text", "voice": "m"|"f", "family": "wavenet"|"chirp", "mode": "new"|"replace"}.
  new      the row has no clip. Takes are made in order (the row's family at normal pace, then words apart at 0.9, then the
           other family) until one passes; the best-heard take is written either way. A take "fails" a reviewer when that
           reviewer hears a word off: the sound review (phoneme_review.py) has a weak word, the word check (scan_lines.py)
           has an issue, or Google Speech-to-Text (review3_shard.py) has an issue. A clip that still fails 2 of the 3 is
           listed with "held": true, for data/lab/clip-holds.json, so no screen plays it before a person listens.
  replace  the row has a clip (a prayer line the owner wants in a Chirp 3 HD voice). One Chirp take at normal pace; it
           replaces the clip only when no reviewer hears it as worse (the torah-fix rule without "and one hears it better").
The text is spoken exactly as the Torah clips are (tools/torah/audio/fix_shard.py spoken(): the four-letter name read as
Adonai, Elohim where it is pointed with hiriq; everything else as written). Rows that need any other divine-name decision are
never put in the list (tools/audio/fill_list.mjs holds them).
The new clip is loudness-normalised like every clip in audio/ (two-pass EBU R128 to -16 LUFS, mono 44.1 kHz 96 kbps) and gets
a full sidecar (tools/audio/sidecar.mjs fields). One JSON line per row in --log.

  python tools/audio/fill_clips.py --list tools/audio/fill-list.json --shard 0 --of 10 --model phoneme-ct2 --log fill-0.jsonl
"""
import argparse, datetime, hashlib, json, os, re, shutil, subprocess, sys, tempfile, time, urllib.error
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'torah', 'audio'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'audio', 'asr-check')); sys.path.insert(0, os.path.join(ROOT, 'tools', 'audio'))
import fix_shard as F
from render_word_takes import synth, key

VOICES = F.VOICES   # Ari: Wavenet-B / Chirp3-HD-Charon; Noa: Wavenet-A / Chirp3-HD-Kore
NOTE = 'Synthetic voice; licence customer-owned under the vendor terms (docs/audio/CONTRACT.md); redistribution clearance still needs counsel'


def normalize(src, dst):
    """Two-pass loudnorm to the repo delivery format (same filter as tools/audio/render_tts.mjs normalizeClip)."""
    f = 'loudnorm=I=-16:TP=-1.5:LRA=11'
    p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', src, '-af', f + ':print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True)
    m = re.search(r'\{[\s\S]*\}', p.stderr or '')
    if m:
        try:
            s = json.loads(m.group(0))
            f += (f":measured_I={s['input_i']}:measured_TP={s['input_tp']}:measured_LRA={s['input_lra']}"
                  f":measured_thresh={s['input_thresh']}:offset={s['target_offset']}:linear=true")
        except Exception:
            pass
    r = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-af', f, '-ac', '1', '-ar', '44100',
                        '-c:a', 'libmp3lame', '-b:a', '96k', dst])
    if r.returncode != 0:
        shutil.copyfile(src, dst)
        return False
    return True


def fails(j):
    """How many of the three reviewers hear a word off (a reviewer that could not answer does not count as a pass)."""
    g = j.get('google') or {}
    return int(bool(j['weak'])) + int(bool(j['issues'])) + int(('issues' not in g) or bool(g['issues']))


def score(j):
    return (fails(j), len(j['weak']) + len(j['issues']) + len((j.get('google') or {}).get('issues', [])), -j['ratio'])


def takes(row, text):
    v, fam = row['voice'], row['family']
    other = 'chirp' if fam == 'wavenet' else 'wavenet'
    apart = ', '.join(text.replace('.', '').split()) + '.'
    if row['mode'] == 'replace':
        return [('chirp', VOICES[v]['chirp'], text, 1.0)]
    out = [(fam, VOICES[v][fam], text, 1.0)]
    if len(text.split()) > 1:
        out.append((fam + '-apart', VOICES[v][fam], apart, 0.9))
    else:
        out.append((fam + '-0.9', VOICES[v][fam], text, 0.9))
    out.append((other, VOICES[v][other], text, 1.0))
    return out


def sidecar(row, voice, said, rate, j, prev=None):
    now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    m = {'status': 'tts', 'source': 'tts:google', 'engine': 'google', 'voiceId': voice, 'tradition': 'israeli',
         'inputText': row['text'], 'inputSha256': hashlib.sha256(row['text'].encode('utf-8')).hexdigest(), 'ingestedAt': now,
         'licence': 'customer-owned', 'note': NOTE, 'renderedAt': now, 'redistributionCleared': False,
         'spokenText': said, 'normalized': True, 'inputTextKind': 'hebrew'}
    if rate != 1.0:
        m['speakingRate'] = rate
    m['review'] = {'phonemeWeak': j['weak'], 'wordIssues': j['issues'], 'google': j.get('google'), 'reviewersFailing': fails(j)}
    if prev:
        m['replaced'] = {'voiceId': prev.get('voiceId'), 'engine': prev.get('engine'), 'renderedAt': prev.get('renderedAt')}
    return m


def main():
    ap = argparse.ArgumentParser()
    for x in ('--list', '--model', '--log'):
        ap.add_argument(x, required=True)
    ap.add_argument('--shard', type=int, default=0)
    ap.add_argument('--of', type=int, default=1)
    a = ap.parse_args()
    k = key()
    print('voice key found:', 'yes' if k else 'NO', flush=True)
    if not k:
        sys.exit(2)
    stt = os.environ.get('GOOGLE_STT_API_KEY', '').strip() or k
    rows = json.load(open(a.list, encoding='utf-8'))['rows'][a.shard::a.of]
    done = {json.loads(l)['path'] for l in open(a.log, encoding='utf-8')} if os.path.exists(a.log) else set()
    out = open(a.log, 'a', encoding='utf-8')
    tmpd = tempfile.mkdtemp()
    for n, row in enumerate(rows, 1):
        if row['path'] in done:
            continue
        clip = os.path.join(ROOT, row['path'])
        said = F.spoken(row['text'])
        cur = F.judge(clip, said, a.model, stt) if row['mode'] == 'replace' and os.path.exists(clip) else None
        best = None
        cands = {}
        for name, voice, say, rate in takes(row, said):
            raw, norm = os.path.join(tmpd, name + '.raw.mp3'), os.path.join(tmpd, name + '.mp3')
            try:
                open(raw, 'wb').write(synth(say, voice, k, rate))
            except urllib.error.HTTPError as e:
                cands[name] = {'error': e.code}
                if e.code in (401, 403):
                    print('stopped: Google answered', e.code, flush=True); sys.exit(3)
                continue
            except Exception as e:
                cands[name] = {'error': str(e)[:80]}; continue
            normalize(raw, norm)
            j = F.judge(norm, said, a.model, stt); cands[name] = j
            if cur is not None:
                gc, gj = cur.get('google') or {}, j.get('google') or {}
                ok = (len(j['weak']) <= len(cur['weak']) and len(j['issues']) <= len(cur['issues']) and j['ratio'] >= cur['ratio'] - 0.01
                      and 'issues' in gc and 'issues' in gj and len(gj['issues']) <= len(gc['issues']) and gj['acc'] >= gc['acc'] - 0.01)
                if ok:
                    best = (name, voice, say, rate, j, norm)
            elif best is None or score(j) < score(best[4]):
                best = (name, voice, say, rate, j, os.path.join(tmpd, 'best.mp3'))
                shutil.copyfile(norm, best[5])
            if cur is None and best and fails(best[4]) < 2:
                break
            time.sleep(0.1)
        rec = {'path': row['path'], 'mode': row['mode'], 'spoken': said, 'candidates': cands}
        if cur is not None:
            rec['current'] = cur
        if best:
            name, voice, say, rate, j, f = best
            prev = None
            mp = clip + '.meta.json'
            if os.path.exists(mp):
                try:
                    prev = json.load(open(mp, encoding='utf-8'))
                except Exception:
                    prev = None
            os.makedirs(os.path.dirname(clip), exist_ok=True)
            shutil.copyfile(f, clip)
            json.dump(sidecar(row, voice, say, rate, j, prev if cur is not None else None), open(mp, 'w', encoding='utf-8'),
                      ensure_ascii=False, indent=1)
            open(mp, 'a', encoding='utf-8').write('\n')
            rec.update({'decision': name, 'voiceId': voice, 'reviewersFailing': fails(j), 'held': cur is None and fails(j) >= 2})
        else:
            rec.update({'decision': 'kept' if cur is not None else 'none', 'held': False})
        out.write(json.dumps(rec, ensure_ascii=False) + '\n'); out.flush()
        print(f"{n}/{len(rows)} {row['path']}: {rec['decision']}{' HELD' if rec['held'] else ''}", flush=True)


if __name__ == '__main__':
    main()
