"""Re-record and re-check the Torah verse clips the check flagged (run as a GitHub Actions matrix job; needs GOOGLE_TTS_API_KEY).

For each flagged clip it records two candidates from the pointed Hebrew, with the divine name written as it is read (Adonai):
  chirp    the clip's own voice family, he-IL Chirp 3 HD (Ari: Charon, Noa: Kore)
  wavenet  the Israeli WaveNet voice used by the rest of the app (Ari: B, Noa: A)
Both reviewers hear the current clip and each candidate (from round 9 also Google Speech-to-Text, one clip per request). A candidate replaces the clip only when neither reviewer hears it
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
STANDARD = {'m': 'he-IL-Standard-B', 'f': 'he-IL-Standard-A'}
NIQQUD = re.compile('[\u0591-\u05C7]')


def candidates(v, text, rnd, fam='chirp'):
    """(name, voice, text to speak, speaking rate)"""
    if rnd == 9:   # Google heard two or more words off: the family the clip has not had, words apart, plus Chirp 3 HD normal
        apart = ', '.join(text.replace('.', '').split()) + '.'
        other = 'chirp' if fam == 'wavenet' else 'wavenet'
        return [(other + '-apart', VOICES[v][other], apart, 0.9), ('chirp', VOICES[v]['chirp'], text, 1.0)]
    if rnd == 7:   # the four kinds that fixed most
        apart = ', '.join(text.replace('.', '').split()) + '.'
        return [('wavenet-apart', VOICES[v]['wavenet'], apart, 0.9), ('chirp-apart', VOICES[v]['chirp'], apart, 0.9),
                ('wavenet', VOICES[v]['wavenet'], text, 1.0), ('chirp', VOICES[v]['chirp'], text, 1.0)]
    if rnd == 5:   # one take only: the kind that fixed most in rounds 3 and 4
        apart = ', '.join(text.replace('.', '').split()) + '.'
        return [('wavenet-apart', VOICES[v]['wavenet'], apart, 0.9)]
    if rnd == 4:
        apart = ', '.join(text.replace('.', '').split()) + '.'
        return [('wavenet-apart-0.8', VOICES[v]['wavenet'], apart, 0.8), ('standard-apart', STANDARD[v], apart, 0.9),
                ('wavenet-apart-plain', VOICES[v]['wavenet'], NIQQUD.sub('', apart), 0.9), ('chirp-apart-0.75', VOICES[v]['chirp'], apart, 0.75)]
    if rnd == 3:
        apart = ', '.join(text.replace('.', '').split()) + '.'
        return [('wavenet-apart', VOICES[v]['wavenet'], apart, 0.9), ('chirp-apart', VOICES[v]['chirp'], apart, 0.9),
                ('wavenet-0.75', VOICES[v]['wavenet'], text, 0.75), ('chirp-0.75', VOICES[v]['chirp'], text, 0.75)]
    if rnd == 1:
        return [(n, voice, text, 1.0) for n, voice in VOICES[v].items()]
    return [('wavenet-slow', VOICES[v]['wavenet'], text, 0.85), ('chirp-slow', VOICES[v]['chirp'], text, 0.85),
            ('wavenet-plain', VOICES[v]['wavenet'], NIQQUD.sub('', text), 1.0), ('standard', STANDARD[v], text, 1.0)]
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


def judge(path, text, model, stt=None):
    ratio, ws = P.review(text, P.hear(path, model, max_tokens=300))
    _, iss, _ = S.compare(text, S.transcribe(path))
    j = {'ratio': ratio, 'weak': [w['word'] for w in ws if w['match'] < 0.6], 'issues': [i['say'] for i in iss]}
    if stt:
        j['google'] = google(path, text, stt)
    return j


def google(path, text, k):
    """Third reviewer: Google Speech-to-Text (he-IL), one clip per request, same call and word rules as review3_shard.py.
    Returns {'heard', 'acc', 'issues'} or {'error'}."""
    import review3_shard as G
    import numpy as np
    x = G.pcm(path)
    if len(x) / G.SR > 55:
        return {'error': 'longer than 55 s'}
    pad = np.zeros(int(G.GAP * G.SR) // 2, np.int16)
    for attempt in range(4):
        try:
            res = G.recognize(G.flac(np.concatenate([pad, x, pad])), k, [])
            break
        except urllib.error.HTTPError as e:
            if e.code in (400, 401, 403):
                return {'error': e.code}
            time.sleep(5 * (attempt + 1))
        except Exception:
            time.sleep(5 * (attempt + 1))
    else:
        return {'error': 'no answer'}
    heard = ' '.join(w['word'] for r in res.get('results', []) for w in r['alternatives'][0].get('words', []))
    acc, iss, _ = S.compare(text, heard)
    return {'heard': heard, 'acc': round(acc, 3), 'issues': [i['say'] for i in iss]}


def family(rel):
    """The voice family a clip has now: the last take that replaced it in the fix logs, else its meta voice, else Chirp
    (the original Torah renders are Chirp 3 HD)."""
    global _LAST
    if _LAST is None:
        _LAST = {}
        d = os.path.join(ROOT, 'docs', 'torah', 'audio-verification', 'fix')
        logs = [f for f in os.listdir(d) if re.fullmatch(r'fix-r?\d+-\d+\.jsonl', f)] if os.path.isdir(d) else []
        for f in sorted(logs, key=lambda f: int(re.match(r'fix-r?(\d+)', f).group(1))):
            for l in open(os.path.join(d, f), encoding='utf-8'):
                r = json.loads(l)
                if r.get('decision', 'kept') != 'kept':
                    _LAST[r['file']] = r['decision']
    dec = _LAST.get(rel)
    if dec is None:
        mp = os.path.join(ROOT, rel) + '.meta.json'
        dec = json.load(open(mp, encoding='utf-8')).get('voiceId') or '' if os.path.exists(mp) else ''
    dec = dec.lower()
    return 'wavenet' if 'wavenet' in dec else 'standard' if 'standard' in dec else 'chirp'


_LAST = None


def main():
    ap = argparse.ArgumentParser()
    for x in ('--list', '--model', '--log'):
        ap.add_argument(x, required=True)
    ap.add_argument('--shard', type=int, default=0)
    ap.add_argument('--of', type=int, default=1)
    ap.add_argument('--round', type=int, default=1)
    a = ap.parse_args()
    k = key()
    print('voice key found:', 'yes' if k else 'NO', flush=True)
    if not k:
        sys.exit(2)
    stt = (os.environ.get('GOOGLE_STT_API_KEY', '').strip() or k) if a.round >= 9 else None   # Google judges from round 9
    todo = [l.strip() for l in open(a.list, encoding='utf-8') if l.strip()][a.shard::a.of]
    done = {json.loads(l)['file'] for l in open(a.log, encoding='utf-8')} if os.path.exists(a.log) else set()
    out = open(a.log, 'a', encoding='utf-8')
    for n, rel in enumerate(todo, 1):
        if rel in done:
            continue
        v = rel.split('/')[1]
        clip = os.path.join(ROOT, rel)
        mp = clip + '.meta.json'
        meta = json.load(open(mp, encoding='utf-8')) if os.path.exists(mp) else {}
        text = spoken(meta.get('stitchedFromText') or meta.get('inputText') or S.torah_he(os.path.basename(rel)[:-4]))
        cur = judge(clip, text, a.model, stt)
        fam = family(rel)
        best, best_name, cands = None, None, {}
        for name, voice, say, rate in candidates(v, text, a.round, fam):
            tmp = os.path.join(tempfile.gettempdir(), f'{name}-{os.path.basename(rel)}')
            try:
                open(tmp, 'wb').write(synth(say, voice, k, rate))
            except urllib.error.HTTPError as e:
                cands[name] = {'error': e.code}; continue
            except Exception as e:
                cands[name] = {'error': str(e)[:80]}; continue
            j = judge(tmp, text, a.model, stt); cands[name] = j
            no_worse = len(j['weak']) <= len(cur['weak']) and len(j['issues']) <= len(cur['issues']) and j['ratio'] >= cur['ratio'] - 0.01
            better = len(j['weak']) < len(cur['weak']) or len(j['issues']) < len(cur['issues']) or j['ratio'] > cur['ratio'] + 0.02
            gc, gj = cur.get('google'), j.get('google')
            if stt:   # Google must have heard both, must not hear the take as worse, and counts as a third vote for better
                if 'issues' not in (gc or {}) or 'issues' not in (gj or {}):
                    no_worse = False
                else:
                    no_worse = no_worse and len(gj['issues']) <= len(gc['issues']) and gj['acc'] >= gc['acc'] - 0.01
                    better = better or len(gj['issues']) < len(gc['issues'])
            score = lambda x: (len(x['weak']) + len(x['issues']) + len((x.get('google') or {}).get('issues', [])), -x['ratio'])
            if no_worse and better and (best is None or score(j) < score(best)):
                best, best_name = j, name
                os.replace(tmp, clip + '.new')
            time.sleep(0.1)
        if best_name:
            os.replace(clip + '.new', clip)
        rec = {'file': rel, 'decision': best_name or 'kept', 'current': cur, 'candidates': cands, 'spoken': text, 'family': fam, 'round': a.round}
        out.write(json.dumps(rec, ensure_ascii=False) + '\n'); out.flush()
        print(f'{n}/{len(todo)} {rel}: {best_name or "kept"}', flush=True)


if __name__ == '__main__':
    main()
