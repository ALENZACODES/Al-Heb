"""Home-page word builder: replace a word clip the speech-to-text check does not recognise with the checked
recording of the same word in the same voice (Ari stays Ari, Noa stays Noa).

The builder words were read by the Chirp 3 HD voices, which often mangle a single short word ("sham" heard as
"shsam", "pe" heard as two other words). The lesson word clips (audio/{m,f}/israeli/word) were read by the WaveNet
voices and checked one by one. Where the lesson library already holds the same pointed word, heard correctly, the
builder can play that recording.

  python tools/audio/asr-check/builder_swap.py              # dry run: what it would replace
  python tools/audio/asr-check/builder_swap.py --execute    # replace, update tools/audio/builder-manifest.json

Nothing is replaced on the old scan result alone. Both clips are heard again now: the builder clip must still be
below the pass mark and the replacement, after it is shrunk to builder size (48 kbps), must pass.
Log: tools/audio/asr-check/builder-swap-log.json. No key and no network needed (the model is downloaded once).
"""
import collections, hashlib, json, os, re, subprocess, sys, tempfile

sys.path.insert(0, os.path.dirname(__file__))
import check_lib as L  # noqa: E402
import scan as S  # noqa: E402

ROOT = S.ROOT
LOG = os.path.join(os.path.dirname(__file__), 'builder-swap-log.json')
MANIFEST = os.path.join(ROOT, 'tools', 'audio', 'builder-manifest.json')


def voice(path):
    return 'm' if '/m/' in path or path.endswith('_ari.mp3') else 'f'


def norm(text):
    return re.sub(r'[׃־\s]', '', text)


def shrink(src, dst):
    """Builder size, like the rendered builder clips: mono, 44.1 kHz, 48 kbps, no tags."""
    subprocess.run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-i', src, '-map_metadata', '-1', '-ac', '1', '-ar', '44100',
                    '-b:a', '48k', '-codec:a', 'libmp3lame', '-write_xing', '0', '-id3v2_version', '0', '-bitexact', dst], check=True)


def main():
    execute = '--execute' in sys.argv
    stored = {}
    for r in L.jl_read(S.RESULTS):
        if r.get('mode') == 'single' or r['file'] not in stored:
            stored[r['file']] = r
    good = collections.defaultdict(list)
    builder = []
    for j in S.jobs(('word', 'builder')):
        r = stored.get(j['file'])
        s = L.score(j['he'], r['asr']) if r else None
        if j['kind'] == 'word' and isinstance(s, float) and s >= L.PASS:
            good[(voice(j['file']), norm(j['he']))].append((s, j['file']))
        elif j['kind'] == 'builder' and not (isinstance(s, float) and s >= L.PASS):
            builder.append(j)
    manifest = json.load(open(MANIFEST, encoding='utf-8'))
    by_path = {c['path']: c for c in manifest['clips']}
    log = json.load(open(LOG, encoding='utf-8')) if os.path.exists(LOG) else []
    logged = {e['path'] for e in log}
    tmp = tempfile.mkdtemp()
    for j in sorted(builder, key=lambda j: j['file']):
        if j['file'] in logged:
            continue
        cands = sorted(good.get((voice(j['file']), norm(j['he'])), []), reverse=True)
        if not cands:
            print(f"no checked recording   {j['he']}  {j['file']}")
            continue
        now = L.hear(os.path.join(ROOT, j['file']))
        s_now = L.score(j['he'], now)
        if isinstance(s_now, float) and s_now >= L.PASS:
            print(f"passes when heard again, left alone   {j['he']}  {j['file']}  heard {now}")
            continue
        for _, src in cands[:3]:
            small = os.path.join(tmp, 'c.mp3')
            shrink(os.path.join(ROOT, src), small)
            got = L.hear(small)
            s_new = L.score(j['he'], got)
            if isinstance(s_new, float) and s_new >= L.PASS:
                break
        else:
            print(f"replacement did not pass at builder size   {j['he']}  {j['file']}")
            continue
        print(f"{'replace' if execute else 'would replace'}   {j['he']}  {j['file']}  heard {now!r} ({s_now})  <-  {src}  heard {got!r} ({s_new})")
        if not execute:
            continue
        data = open(small, 'rb').read()
        open(os.path.join(ROOT, j['file']), 'wb').write(data)
        meta = json.load(open(os.path.join(ROOT, src) + '.meta.json', encoding='utf-8')) if os.path.exists(os.path.join(ROOT, src) + '.meta.json') else {}
        c = by_path.get(j['file'])
        if c:                      # fingerprint is kept, so render-builder.mjs sees the clip as present and does not re-render it
            c.update({'voice': meta.get('voiceId') or c['voice'], 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'source': src})
        log.append({'path': j['file'], 'word': j['he'], 'source': src, 'heard_before': now, 'score_before': s_now,
                    'heard_after': got, 'score_after': s_new})
        with open(LOG, 'w', encoding='utf-8', newline='\n') as f:
            f.write(json.dumps(log, ensure_ascii=False, indent=1) + '\n')
        with open(MANIFEST, 'w', encoding='utf-8', newline='\n') as f:
            f.write(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
