"""Make every Sephardi and Ashkenazi letter, vowel and syllable sidecar say how its clip was really made, from the bytes:
  - a byte copy of the Israeli clip of the same voice: Sephardi -> source israeli-clip-same-reading with copyOf (owner decision A);
    Ashkenazi -> source tts-respelled-israeli-voice, madeFrom israeli-clip-same-reading (decision A covers Sephardi only);
  - anything else still marked as a copy -> source tts-respelled-israeli-voice, copyOf dropped (it was re-recorded since).
Usage: python fix_sidecars.py docs/audio/tradition-fix-r1.jsonl docs/audio/tradition-fix-r3.jsonl
Then run node tools/audio/summary.mjs to carry the sources into the manifest."""
import glob, json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
changed = 0
# rows a reviewed accent run passed (docs/audio/fill/accent-r*.jsonl) must keep the accent label (tests/audit.audio-lane-2026-11-11.test.js)
accent_passed = {json.loads(l)['path'] for f in glob.glob(os.path.join(ROOT, 'docs/audio/fill/accent-r*-*.jsonl')) for l in open(f, encoding='utf-8')
                 if l.strip() and json.loads(l).get('decision') == 'pass'}
# a copy follows its Israeli source: where the Israeli clip was replaced since, the copy is made again from the new clip
recopied = 0
for mp in glob.glob(os.path.join(ROOT, 'audio/*/*/*/*.mp3.meta.json')):
    m = json.load(open(mp, encoding='utf-8'))
    src = m.get('copyOf')
    clip = mp[:-len('.meta.json')]
    if src and '/israeli/' in src and os.path.exists(os.path.join(ROOT, src)) and open(clip, 'rb').read() != open(os.path.join(ROOT, src), 'rb').read():
        import shutil
        shutil.copyfile(os.path.join(ROOT, src), clip)
        recopied += 1
        touched_extra = True
print(recopied, 'copies made again from their replaced Israeli clip')
# only the clips a fix run touched (logs given on the command line), so older audited clips keep their records
touched = {json.loads(l)['file'] for f in sys.argv[1:] for l in open(f, encoding='utf-8') if l.strip()}
for mp in glob.glob(os.path.join(ROOT, 'audio/*/[sa][es]*/[lsv]*/*.mp3.meta.json')):
    clip = mp[:-len('.meta.json')]
    rel = os.path.relpath(clip, ROOT)
    parts = rel.split('/')
    if rel not in touched or parts[2] not in ('sephardi', 'ashkenazi') or parts[3] not in ('letter', 'syllable', 'vowel'):
        continue
    twin = '/'.join(parts[:2] + ['israeli'] + parts[3:])
    m = json.load(open(mp, encoding='utf-8'))
    old = json.dumps(m, sort_keys=True)
    same = os.path.exists(os.path.join(ROOT, twin)) and open(clip, 'rb').read() == open(os.path.join(ROOT, twin), 'rb').read()
    if same and parts[2] == 'sephardi' and rel not in accent_passed:
        m.update(source='israeli-clip-same-reading', copyOf=twin, madeFrom='israeli-clip')
    elif same:
        m.update(source='tts-respelled-israeli-voice', madeFrom='israeli-clip-same-reading')   # Ashkenazi, or a reviewed accent row
        m.pop('copyOf', None)
    elif m.get('source') == 'israeli-clip-same-reading' or m.get('copyOf'):
        m['source'] = 'tts-respelled-israeli-voice'
        m.pop('copyOf', None); m.pop('copiedAt', None)
    if json.dumps(m, sort_keys=True) != old:
        changed += 1
        with open(mp, 'w', encoding='utf-8', newline='\n') as f:
            f.write(json.dumps(m, ensure_ascii=False, indent=1) + '\n')
print(changed, 'sidecars corrected')
