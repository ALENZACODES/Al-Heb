"""Copies rendered verse clips into the app and lists them in data/audio/manifest-torah.json.

Only clips whose sidecar fingerprint matches plan.json are taken. Run after listening to them.
  python install.py --book genesis --chapter 1
"""
import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
MANIFEST = ROOT / 'data/audio/manifest-torah.json'


def duration_ms(path):
    try:
        out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
                             capture_output=True, text=True, check=True).stdout
        return round(float(out) * 1000)
    except Exception:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--book')
    ap.add_argument('--chapter', type=int)
    a = ap.parse_args()
    plan = json.loads((HERE / 'plan.json').read_text(encoding='utf8'))
    words = {v['id']: v for v in json.loads((HERE / 'ipa.json').read_text(encoding='utf8'))}
    manifest = json.loads(MANIFEST.read_text(encoding='utf8'))
    added, missing = 0, 0
    for r in plan:
        if (a.book and r['book'] != a.book) or (a.chapter and r['chapter'] != a.chapter):
            continue
        clip = HERE / r['path']
        side = Path(str(clip) + '.json')
        if not clip.exists() or not side.exists() or json.loads(side.read_text(encoding='utf-8-sig'))['fingerprint'] != r['fingerprint']:
            missing += 1
            continue
        dest = ROOT / r['appPath']
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(clip, dest)
        entry = {
            'path': r['appPath'], 'voice': r['gender'], 'tradition': 'israeli', 'kind': 'line', 'id': r['verseId'],
            'text': ' '.join(w['source'] for w in words[r['verseId']]['words']), 'sourceHebrew': r['displayText'],
            'status': 'tts', 'source': 'paid-cloud', 'provider': 'google', 'providerVoice': r['voice'],
            'synthesisLocale': r['languageCode'], 'intendedLanguage': 'he',
            'speechInput': r['input']['text'], 'customPronunciations': r['input']['customPronunciations']['pronunciations'],
            'durationMs': duration_ms(dest), 'audioSha256': hashlib.sha256(dest.read_bytes()).hexdigest(),
            'verification': 'ipa-from-pointed-source; not-human-reviewed',
            'verificationEvidence': 'tools/torah/audio/ipa/README.md',
        }
        manifest = [e for e in manifest if not (e.get('kind') == 'line' and e.get('id') == r['verseId'] and e.get('voice') == r['gender'])]
        manifest.append(entry)
        added += 1
    MANIFEST.write_text('[\n' + ',\n'.join(json.dumps(e, ensure_ascii=False, separators=(',', ':')) for e in manifest) + '\n]\n', encoding='utf8')
    print(json.dumps({'installed': added, 'notRenderedYet': missing}))


if __name__ == '__main__':
    main()
