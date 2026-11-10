#!/usr/bin/env python3
"""Download the raw vocabulary sources into tools/vocab/.cache and record sha256 + size + date.

Run:  python3 -I tools/vocab/fetch.py
Uses curl (honours the HTTPS proxy settings of the environment) and the stdlib only.
Output: tools/vocab/.cache/* (git-ignored) and data/vocab/sources.lock.json (committed).
Licences of each source: docs/vocab/SOURCES.md.
"""
import bz2, datetime, hashlib, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CACHE = os.path.join(HERE, '.cache')

FILES = [
    # (local name, url, role)
    ('kaikki-hebrew.jsonl', 'https://kaikki.org/dictionary/Hebrew/kaikki.org-dictionary-Hebrew.jsonl', 'dictionary'),
    ('he_full.txt', 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/he/he_full.txt', 'frequency'),
    ('he_50k.txt', 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/he/he_50k.txt', 'frequency'),
    ('FrequencyWords-LICENSE', 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/LICENSE', 'licence'),
    ('FrequencyWords-README.md', 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/README.md', 'licence'),
    ('heb_sentences_detailed.tsv.bz2', 'https://downloads.tatoeba.org/exports/per_language/heb/heb_sentences_detailed.tsv.bz2', 'examples'),
    ('eng_sentences_detailed.tsv.bz2', 'https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences_detailed.tsv.bz2', 'examples'),
    ('heb-eng_links.tsv.bz2', 'https://downloads.tatoeba.org/exports/per_language/heb/heb-eng_links.tsv.bz2', 'examples'),
]
TANAKH = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Samuel_1', 'Samuel_2',
          'Kings_1', 'Kings_2', 'Isaiah', 'Jeremiah', 'Ezekiel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah',
          'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Psalms', 'Proverbs', 'Job',
          'Song_of_Songs', 'Ruth', 'Lamentations', 'Ecclesiastes', 'Esther', 'Daniel', 'Ezra', 'Nehemiah',
          'Chronicles_1', 'Chronicles_2']
for b in TANAKH:
    FILES.append(('tanach/%s.xml' % b, 'https://tanach.us/Books/%s.xml' % b, 'tanakh'))


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for ch in iter(lambda: f.read(1 << 20), b''):
            h.update(ch)
    return h.hexdigest()


def main():
    os.makedirs(os.path.join(CACHE, 'tanach'), exist_ok=True)
    lock = {'fetched': datetime.date.today().isoformat(), 'files': []}
    for name, url, role in FILES:
        dest = os.path.join(CACHE, name)
        if not os.path.exists(dest) or '--force' in sys.argv:
            r = subprocess.run(['curl', '-sSfL', '--retry', '3', '-o', dest, url])
            if r.returncode:
                sys.exit('download failed: %s' % url)
        if name.endswith('.bz2'):
            out = dest[:-4]
            if not os.path.exists(out):
                with bz2.open(dest, 'rb') as src, open(out, 'wb') as dst:
                    for ch in iter(lambda: src.read(1 << 20), b''):
                        dst.write(ch)
        lock['files'].append({'name': name, 'url': url, 'role': role, 'bytes': os.path.getsize(dest), 'sha256': sha(dest)})
        print('ok', name, os.path.getsize(dest))
    with open(os.path.join(ROOT, 'data', 'vocab', 'sources.lock.json'), 'w', encoding='utf8') as f:
        json.dump(lock, f, indent=1)
        f.write('\n')


if __name__ == '__main__':
    main()
