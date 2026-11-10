"""Writes data/audio/manifest-torah-he.json from the Hebrew verse clips on disk, and takes the per-clip Hebrew verse
entries out of data/audio/manifest-torah.json (the app reads the small index instead; src/shell/torah-he-index.js).
Clip provenance (sounds sent to Google, voice) is reproducible from ipa.json and plan.py; hashes go to installed.json here.
  python build_index.py
"""
import hashlib
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
INDEX = ROOT / 'data/audio/manifest-torah-he.json'
MANIFEST = ROOT / 'data/audio/manifest-torah.json'
VOICES = {'m': 'de-DE-Chirp3-HD-Charon', 'f': 'de-DE-Chirp3-HD-Kore'}
ORDER = ['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy']
CLIP = re.compile(r'^torah-([a-z]+)-(\d+)-(\d+)\.mp3$')


def ranges(nums):
    nums = sorted(set(nums))
    out, start = [], None
    for i, n in enumerate(nums):
        if start is None:
            start = n
        if i == len(nums) - 1 or nums[i + 1] != n + 1:
            out.append(str(start) if start == n else f'{start}-{n}')
            start = None
    return ','.join(out)


def main():
    known = {v['id'] for v in json.loads((HERE / 'ipa.json').read_text(encoding='utf8'))}
    verses, hashes = {}, {}
    for voice in VOICES:
        d = ROOT / f'audio/{voice}/israeli/line'
        books = {}
        for f in sorted(d.glob('torah-*.mp3')) if d.exists() else []:
            m = CLIP.match(f.name)
            if not m or f.stem not in known or f.stat().st_size < 100:
                continue
            books.setdefault(m[1], {}).setdefault(int(m[2]), []).append(int(m[3]))
            hashes[f'{voice}/{f.stem}'] = hashlib.sha256(f.read_bytes()).hexdigest()
        verses[voice] = {b: {str(c): ranges(books[b][c]) for c in sorted(books[b])} for b in ORDER if b in books}
    index = {'schema': 'alef-torah-he/1', 'status': 'tts', 'source': 'paid-cloud', 'provider': 'google', 'voices': VOICES,
             'verification': 'ipa-from-pointed-source; not-human-reviewed (tools/torah/audio/ipa/README.md)', 'verses': verses}
    INDEX.write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf8')
    manifest = json.loads(MANIFEST.read_text(encoding='utf8'))
    keep = [e for e in manifest if not (e.get('kind') == 'line' and e.get('tradition') == 'israeli' and str(e.get('id', '')).startswith('torah-')
                                         and e.get('id') in known)]
    MANIFEST.write_text('[\n' + ',\n'.join(json.dumps(e, ensure_ascii=False, separators=(',', ':')) for e in keep) + '\n]\n', encoding='utf8')
    (HERE / 'installed.json').write_text(json.dumps(hashes, separators=(',', ':'), sort_keys=True) + '\n', encoding='utf8')
    print(json.dumps({'clips': len(hashes), 'indexBytes': INDEX.stat().st_size, 'manifestEntriesRemoved': len(manifest) - len(keep)}))


if __name__ == '__main__':
    main()
