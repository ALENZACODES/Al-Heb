"""Re-record and re-check the Torah verse clips the check flagged (run as a GitHub Actions matrix job; needs GOOGLE_TTS_API_KEY).

For each flagged clip it records two candidates from the pointed Hebrew, with the divine name written as it is read (Adonai):
  chirp    the clip's own voice family, he-IL Chirp 3 HD (Ari: Charon, Noa: Kore)
  wavenet  the Israeli WaveNet voice used by the rest of the app (Ari: B, Noa: A)
Both reviewers hear the current clip and each candidate. A candidate replaces the clip only when neither reviewer hears it
as worse and at least one hears it as better; the best such candidate wins. One JSON line per clip in --log.

  python tools/torah/audio/fix_shard.py --list flagged.txt --shard 0 --of 10 --model phoneme-ct2 --log fix-0.jsonl
"""
import argparse, json, os, re, sys, tempfile, time, urllib.error
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'audio', 'asr-check')); sys.path.insert(0, os.path.join(ROOT, 'tools', 'audio'))
import scan_lines as S, phoneme_review as P
from render_word_takes import synth, key

VOICES = {'m': {'chirp': 'he-IL-Chirp3-HD-Charon', 'wavenet': 'he-IL-Wavenet-B'},
          'f': {'chirp': 'he-IL-Chirp3-HD-Kore', 'wavenet': 'he-IL-Wavenet-A'}}
CANT = re.compile('[֑-ֽ֯׀׃׆]')
# the divine name, alone or with a one-letter prefix, read as Adonai (Elohim where it is pointed with hiriq)
NAME = re.compile('([ולבכמש]?[ְ-ּ]*)י[ְ-ּ]*ה[ְ-ּ]*ו[ְ-ּ]*ה(?![א-ת])')


def spoken(he):
    s = CANT.sub('', he).replace('־', ' ').replace('׃', '.')
    def name(m):
        pre = m.group(1) or ''
        hiriq = 'ִ' in m.group(0)[len(pre):]
        if pre:
            cons = re.sub('[\u05B0-\u05BB]', '', pre)          # keeps the letter and its dagesh
            if hiriq:
                return cons + '\u05B5\u05D0\u05DC\u05B9\u05D4\u05B4\u05D9\u05DD'        # le-Elohim
            if '\u05B5' in pre:
                return pre + '\u05D0\u05B2\u05D3\u05B9\u05E0\u05B8\u05D9'                # me-Adonai
            return cons + '\u05B7\u05D0\u05D3\u05B9\u05E0\u05B8\u05D9'                   # la-, va-, ba-, ka-Adonai
        return 'אֱלֹהִים' if hiriq else 'אֲדֹנָי'
    return re.sub(r'\s+', ' ', NAME.sub(name, s)).strip()


def judge(path, text, model):
    ratio, ws = P.review(text, P.hear(path, model, max_tokens=300))
    _, iss, _ = S.compare(text, S.transcribe(path))
    return {'ratio': ratio, 'weak': [w['word'] for w in ws if w['match'] < 0.6], 'issues': [i['say'] for i in iss]}


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
    todo = [l.strip() for l in open(a.list, encoding='utf-8') if l.strip()][a.shard::a.of]
    done = {json.loads(l)['file'] for l in open(a.log, encoding='utf-8')} if os.path.exists(a.log) else set()
    out = open(a.log, 'a', encoding='utf-8')
    for n, rel in enumerate(todo, 1):
        if rel in done:
            continue
        v = rel.split('/')[1]
        clip = os.path.join(ROOT, rel)
        text = spoken(S.torah_he(os.path.basename(rel)[:-4]))
        cur = judge(clip, text, a.model)
        best, best_name, cands = None, None, {}
        for name, voice in VOICES[v].items():
            tmp = os.path.join(tempfile.gettempdir(), f'{name}-{os.path.basename(rel)}')
            try:
                open(tmp, 'wb').write(synth(text, voice, k))
            except urllib.error.HTTPError as e:
                cands[name] = {'error': e.code}; continue
            except Exception as e:
                cands[name] = {'error': str(e)[:80]}; continue
            j = judge(tmp, text, a.model); cands[name] = j
            no_worse = len(j['weak']) <= len(cur['weak']) and len(j['issues']) <= len(cur['issues']) and j['ratio'] >= cur['ratio'] - 0.01
            better = len(j['weak']) < len(cur['weak']) or len(j['issues']) < len(cur['issues']) or j['ratio'] > cur['ratio'] + 0.02
            if no_worse and better and (best is None or (len(j['weak']) + len(j['issues']), -j['ratio']) < (len(best['weak']) + len(best['issues']), -best['ratio'])):
                best, best_name = j, name
                os.replace(tmp, clip + '.new')
            time.sleep(0.1)
        if best_name:
            os.replace(clip + '.new', clip)
        rec = {'file': rel, 'decision': best_name or 'kept', 'current': cur, 'candidates': cands, 'spoken': text}
        out.write(json.dumps(rec, ensure_ascii=False) + '\n'); out.flush()
        print(f'{n}/{len(todo)} {rel}: {best_name or "kept"}', flush=True)


if __name__ == '__main__':
    main()
