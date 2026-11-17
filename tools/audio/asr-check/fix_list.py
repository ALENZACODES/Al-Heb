"""Re-record the word, builder and dictionary clips on a list (docs/audio/gpu-flagged-*.json), keeping a new take only
when it is heard right twice.

One hearing by a speech-to-text model is not steady: the same clip can pass one hearing and fail the next. So here a clip,
old or new, counts as right only when two hearings (with different silence around it) both pass.

For each listed recording:
  1. the clip as it stands is heard twice. Both pass: left alone (the hearing that flagged it was the odd one out).
  2. otherwise takes are recorded until one is heard right twice: the lesson voice (WaveNet) with vowel points, without,
     with a full stop, slower; then the Chirp 3 HD voice without and with points. That take replaces the clip and every
     file that shared its audio.
  3. no take passes twice: the clip is left as it is and listed for a human voice.

  python tools/audio/asr-check/fix_list.py --list docs/audio/gpu-flagged-2026-11-16.json                    # dry run
  python tools/audio/asr-check/fix_list.py --list ... --execute --shard 0 --of 4                           # needs GOOGLE_TTS_API_KEY
  python tools/audio/asr-check/fix_list.py --files <paths.txt> --sound-model /path/to/phoneme-ct2 --execute   # round 2:
      pointed-text takes only, and a take must also match by sound (85% of its sounds) to be kept
Log: one line per recording in --log (default tools/audio/asr-check/fix-list-log.jsonl).
"""
import argparse, json, os, sys, tempfile

sys.path.insert(0, os.path.dirname(__file__))
import numpy as np  # noqa: E402
import check_lib as L  # noqa: E402
import scan as S  # noqa: E402
import fix as F  # noqa: E402

ROOT = S.ROOT


def hear_twice(path):
    """Two hearings: the usual one, and one with more silence before the clip. Returns [(heard, score), (heard, score)]."""
    out = [L.hear(path)]
    a = L.load(path)
    if len(a):
        a = np.concatenate([np.zeros(L.SR * 3 // 4, np.float32), a, np.zeros(L.SR // 4, np.float32)])
        segs, _ = L.model().transcribe(a, language='he', beam_size=5, vad_filter=False, condition_on_previous_text=False,
                                       without_timestamps=True, max_new_tokens=48)
        out.append(' '.join(s.text.strip() for s in segs).strip())
    else:
        out.append('')
    return out


def sound_ratio(hebrew, path, model_dir):
    import phoneme_review as P
    try:
        return P.review(hebrew, P.hear(path, model_dir, max_tokens=40))[0]
    except Exception:  # noqa: BLE001 - a word the converter cannot read gets no sound score
        return None


def right(hebrew, heards):
    return all(isinstance(s, float) and s >= L.PASS for s in (L.score(hebrew, h) for h in heards))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--list')
    ap.add_argument('--execute', action='store_true')
    ap.add_argument('--shard', type=int, default=0)
    ap.add_argument('--of', type=int, default=1)
    ap.add_argument('--log', default=os.path.join(os.path.dirname(__file__), 'fix-list-log.jsonl'))
    ap.add_argument('--limit', type=int)
    ap.add_argument('--files', help='a text file of clip paths, one per line, instead of the groups in --list')
    ap.add_argument('--sound-model', help='converted renikud/whisper-he-ipa folder: every take must also match by sound')
    ap.add_argument('--sound-keep', type=float, default=0.85)
    ap.add_argument('--always-retake', action='store_true', help='record takes even when the clip passes this hearing (the GPU hearing flagged it)')
    a = ap.parse_args()
    if a.files:
        want = {l.strip() for l in open(os.path.join(ROOT, a.files), encoding='utf-8') if l.strip() and not l.startswith('#')}
    else:
        listed = json.load(open(os.path.join(ROOT, a.list) if not os.path.isabs(a.list) else a.list, encoding='utf-8'))
        want = {folder + i + '.mp3' for group in ('fail', 'borderline', 'unsure') for folder, ids in listed.get(group, {}).items() for i in ids.split()}
    jobs = [j for j in S.jobs(('word', 'builder', 'dictionary')) if set(j['paths']) & want]
    jobs.sort(key=lambda j: j['file'])
    jobs = [j for n, j in enumerate(jobs) if n % a.of == a.shard][:a.limit]
    done = {r['file'] for r in L.jl_read(a.log)}
    jobs = [j for j in jobs if j['file'] not in done]
    print(f'{len(jobs)} recordings in this slice ({len(want)} files listed)', flush=True)
    if not a.execute:
        for j in jobs[:20]:
            print(' ', j['kind'], j['he'], j['file'], len(j['paths']), 'file(s)')
        print('dry run: add --execute (needs GOOGLE_TTS_API_KEY)')
        return
    key = os.environ.get('GOOGLE_TTS_API_KEY')
    if not key:
        sys.exit('Set GOOGLE_TTS_API_KEY first.')
    tmp = tempfile.mkdtemp(prefix='alef-fixlist-')
    tally = {'left': 0, 'replaced': 0, 'human': 0}
    for n, j in enumerate(jobs, 1):
        now = hear_twice(os.path.join(ROOT, j['file']))
        rec = {'file': j['file'], 'paths': j['paths'], 'kind': j['kind'], 'hebrew': j['he'], 'heard_now': now}
        if right(j['he'], now) and not a.always_retake:
            rec['outcome'] = 'left: heard right twice'
            tally['left'] += 1
        else:
            wavenet, hd = F.VOICES[F.voice_of(j['file'])]
            pointed = F.speakable(j['he'])
            plain = L.plain(pointed)
            if a.sound_model:          # round 2: pointed text only (unpointed takes came back with wrong vowels)
                takes = [(wavenet, pointed, 1.0), (wavenet, pointed + '.', 1.0), (wavenet, pointed, 0.9), (wavenet, pointed, 0.8),
                         (wavenet, pointed + ',', 0.9), (hd, pointed, 1.0), (hd, pointed + '.', 0.9),
                         (wavenet, pointed + '.', 0.85), (wavenet, pointed, 0.75), (hd, pointed, 0.85), (hd, pointed + ',', 1.0)]
            else:
                takes = [(wavenet, pointed, 1.0), (wavenet, plain, 1.0), (wavenet, pointed + '.', 1.0), (wavenet, pointed, 0.9),
                         (hd, plain, 1.0), (hd, pointed, 1.0)]
            tried, kept = [], None
            for i, (voice, text, rate) in enumerate(takes):
                raw, enc = os.path.join(tmp, f't{i}.mp3'), os.path.join(tmp, f't{i}-enc.mp3')
                try:
                    open(raw, 'wb').write(F.synth_rate(text, voice, key, rate))
                    F.encode(raw, enc, j['file'].startswith('audio/builder/'))
                except Exception as e:  # noqa: BLE001 - one bad take must not stop the batch
                    tried.append({'voice': voice, 'text': text, 'rate': rate, 'error': str(e)[:160]})
                    continue
                heard = hear_twice(enc)
                snd = sound_ratio(j['he'], enc, a.sound_model) if a.sound_model else None
                tried.append({'voice': voice, 'text': text, 'rate': rate, 'heard': heard, 'sound': snd})
                if right(j['he'], heard) and (not a.sound_model or snd is None or snd >= a.sound_keep):
                    kept = (enc, voice, text, rate, heard)
                    break
            rec['tried'] = tried
            if kept:
                data = open(kept[0], 'rb').read()
                for p in j['paths']:
                    open(os.path.join(ROOT, p), 'wb').write(data)
                rec.update(outcome='replaced', voice=kept[1], spoken=kept[2], rate=kept[3], heard_new=kept[4], sound_new=tried[-1].get('sound'))
                tally['replaced'] += 1
            else:
                rec['outcome'] = 'no take heard right twice' + (' and by sound' if a.sound_model else '') + ': needs a human voice'
                tally['human'] += 1
        with open(a.log, 'a', encoding='utf-8') as f:
            f.write(json.dumps(rec, ensure_ascii=False) + '\n')
        print(f"[{n}/{len(jobs)}] {rec['outcome'].split(':')[0]}  {j['he']}  {j['file']}  now {now}", flush=True)
    print('done', tally)


if __name__ == '__main__':
    main()
