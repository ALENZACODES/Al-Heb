"""Builds plan.json for render.ps1: one Google Chirp request per verse and voice.

Each request carries a plain Latin label per word and, for every label, the exact IPA from ipa.json
(customPronunciations). Chirp takes IPA only in some locales and not in he-IL, so the request uses the
same Ari (Charon) and Noa (Kore) voices under de-DE, as the Deuteronomy 6:4 pilot did
(docs/torah/audio-verification/noa-shema-pilot/).

  python plan.py                       # every verse, both voices
  python plan.py --book genesis --chapter 1
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
VOWEL = set('aeiou')
UNITS = ['ts', 'tʃ', 'dʒ']
VOICES = {'ari': ('m', 'de-DE-Chirp3-HD-Charon'), 'noa': ('f', 'de-DE-Chirp3-HD-Kore')}
LATIN = [('tʃ', 'tsh'), ('dʒ', 'j'), ('ʃ', 'sh'), ('χ', 'ch'), ('ʁ', 'r'), ('ʔ', ''), ('ɡ', 'g'), ('j', 'y'), ('ˈ', '')]


def segments(ipa):
    out, i = [], 0
    while i < len(ipa):
        u = next((x for x in UNITS if ipa.startswith(x, i)), None)
        if u:
            out.append(u)
            i += len(u)
        else:
            out.append(ipa[i])
            i += 1
    return out


def syllabify(word):
    """'beʁeʃˈit' -> 'be.ʁe.ˈʃit' (stress mark at the start of the stressed syllable)."""
    segs = segments(word)
    stressed = set()
    clean = []
    for s in segs:
        if s == 'ˈ':
            stressed.add(len(clean))
        else:
            clean.append(s)
    vowels = [i for i, s in enumerate(clean) if s in VOWEL]
    if not vowels:
        return word.replace('ˈ', '')
    starts = [0]
    for a, b in zip(vowels, vowels[1:]):
        between = b - a - 1
        starts.append(b if between == 0 else (b - 1 if between == 1 else a + 2))
    # the stressed vowel is the first vowel at or after a stress mark
    stress_v = set()
    for p in stressed:
        v = next((k for k, vi in enumerate(vowels) if vi >= p), None)
        if v is not None:
            stress_v.add(v)
    parts = []
    for k, st in enumerate(starts):
        end = starts[k + 1] if k + 1 < len(starts) else len(clean)
        parts.append(('ˈ' if k in stress_v else '') + ''.join(clean[st:end]))
    return '.'.join(parts)


def latin(ipa):
    s = ipa
    for a, b in LATIN:
        s = s.replace(a, b)
    s = re.sub('[^a-z]', '', s)
    return s or 'a'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--book')
    ap.add_argument('--chapter', type=int)
    a = ap.parse_args()
    verses = json.loads((HERE / 'ipa.json').read_text(encoding='utf8'))
    rows, conflicts, chars = [], 0, 0
    for v in verses:
        if a.book and v['book'] != a.book or a.chapter and v['chapter'] != a.chapter:
            continue
        labels, prons, seen = [], [], {}
        for w in v['words']:
            for spoken in w['ipa'].split():
                lab = latin(spoken)
                syl = syllabify(spoken)
                if lab in seen and seen[lab] != syl:
                    conflicts += 1                 # same label, different sound: keep the label unique
                    lab = lab + 'h' * (1 + sum(1 for x in seen if x.rstrip('h') == lab))
                if lab not in seen:
                    seen[lab] = syl
                    prons.append({'phrase': lab, 'phoneticEncoding': 'PHONETIC_ENCODING_IPA', 'pronunciation': syl})
                labels.append(lab)
        text = ' '.join(labels) + '.'
        for speaker, (gender, voice) in VOICES.items():
            fid = f"{v['id']}-{speaker}"
            body = {'text': text, 'customPronunciations': {'pronunciations': prons}}
            fp = hashlib.sha256(json.dumps({'input': body, 'voice': voice, 'enc': 'MP3', 'rate': 24000}, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
            rows.append({'id': fid, 'verseId': v['id'], 'book': v['book'], 'chapter': v['chapter'], 'verse': v['verse'], 'speaker': speaker,
                         'gender': gender, 'languageCode': 'de-DE', 'voice': voice, 'input': body, 'displayText': v['he'],
                         'fingerprint': fp, 'path': f'clips/{fid}.mp3', 'appPath': f"audio/{gender}/israeli/line/{v['id']}.mp3"})
            chars += len(text) + sum(len(p['phrase']) + len(p['pronunciation']) for p in prons)
    (HERE / 'plan.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf8')
    print(json.dumps({'requests': len(rows), 'labelConflicts': conflicts, 'characters': chars, 'nominalUSD': round(chars * 30 / 1e6, 2)}))


if __name__ == '__main__':
    main()
