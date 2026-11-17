"""Letters, vowels and syllables in all three traditions, each clip checked against the reading the app shows for its own
tradition (tradition-expect.json, written by tradition_expect.mjs from src/pronunciation/forTradition.js).

Two listeners:
  - the sound model (renikud/whisper-he-ipa) writes the sounds it hears, with stress; each clip heard --passes times, each
    time in a different row of eight clips (as scan_sounds.py does);
  - Meta MMS (facebook/mms-1b-all, Hebrew adapter, --mms) writes the letters it hears with no dictionary behind it, so it
    cannot turn a lone syllable into a word. Heard once, alone.
A clip is "wrong" when most sound hearings miss the reading. The MMS letters are reported beside it.

  python tools/audio/asr-check/scan_traditions.py --model /path/to/phoneme-ct2 [--mms] [--passes 3] --out DIR
Output in DIR: traditions-heard.jsonl, TRADITIONS-CHECK.md, traditions-wrong.txt. Runs on CPU or GPU (Kaggle).
A machine check, not a teacher's approval.
"""
import argparse, collections, difflib, json, os, random, re, sys

sys.path.insert(0, os.path.dirname(__file__))
import scan_sounds as S  # noqa: E402
import check_lib as L  # noqa: E402

ROOT = S.ROOT
EXPECT = os.path.join(os.path.dirname(__file__), 'tradition-expect.json')


def say_to_sounds(say):
    s = (say or '').lower()
    for a, b in [('tch', 'C'), ('kh', 'x'), ('ch', 'x'), ('sh', 'S'), ('tz', 'c'), ('ts', 'c'), ('zh', 'Z'), ('ei', 'e'), ('ey', 'e'),
                 ('ai', 'ay'), ('oo', 'u'), ('ee', 'i'), ('w', 'v'), ("'", ''), ('-', ''), ('.', ''), (' ', '')]:
        s = s.replace(a, b)
    return re.sub(r'(.)\1+', r'\1', s)


def close(want, heard):
    h = S.fold(heard)
    if not want:
        return True
    if not (set(want) & S.VOWELS):                    # a bare consonant: any vowel after it is fine
        return h.startswith(want) and len(h) <= len(want) + 1
    # close in sound, and no more than one extra sound: "vaveis" for "veis" is a different word, not a near miss
    return difflib.SequenceMatcher(None, want, h).ratio() >= 0.75 and len(h) <= len(want) + 1


def mms_hearer():
    import torch
    from transformers import Wav2Vec2ForCTC, AutoProcessor
    dev = 'cuda' if torch.cuda.is_available() else 'cpu'
    proc = AutoProcessor.from_pretrained('facebook/mms-1b-all', target_lang='heb')
    model = Wav2Vec2ForCTC.from_pretrained('facebook/mms-1b-all', target_lang='heb', ignore_mismatched_sizes=True).to(dev).eval()

    def hear(path):
        a = L.load(path)
        x = proc(a, sampling_rate=L.SR, return_tensors='pt').to(dev)
        with torch.no_grad():
            ids = model(**x).logits.argmax(-1)[0]
        return proc.decode(ids).strip()
    return hear


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True)
    ap.add_argument('--passes', type=int, default=3)
    ap.add_argument('--mms', action='store_true')
    ap.add_argument('--out', default=os.path.join(ROOT, 'docs', 'audio'))
    ap.add_argument('--only', help='file listing the clip paths to hear (one per line)')
    a = ap.parse_args()
    exp = json.load(open(EXPECT, encoding='utf-8'))
    rows = [dict(path=p, **v) for p, v in exp.items() if os.path.exists(os.path.join(ROOT, p))]
    if a.only:
        keep = {l.strip() for l in open(a.only, encoding='utf-8') if l.strip() and not l.startswith('#')}
        rows = [r for r in rows if r['path'] in keep]
    os.makedirs(a.out, exist_ok=True)
    heard = collections.defaultdict(list)
    hear_row = S.hearer(a.model)
    for p in range(a.passes):
        for v in ('f', 'm'):
            todo = [r for r in rows if r['voice'] == v]
            random.Random(50 + p).shuffle(todo)
            for i in range(0, len(todo), S.ROW):
                part = todo[i:i + S.ROW]
                for r, (h, _) in zip(part, hear_row([os.path.join(ROOT, r['path']) for r in part])):
                    heard[r['path']].append(h)
                print(f'pass {p} {v} {i + len(part)}/{len(todo)}', flush=True)
    letters = {}
    if a.mms:
        hm = mms_hearer()
        for n, r in enumerate(rows):
            letters[r['path']] = hm(os.path.join(ROOT, r['path']))
            if n % 100 == 0:
                print('mms', n, len(rows), flush=True)
    out, tab = [], collections.defaultdict(collections.Counter)
    with open(os.path.join(a.out, 'traditions-heard.jsonl'), 'w', encoding='utf-8') as f:
        for r in rows:
            want = say_to_sounds(r['say'])
            hs = heard[r['path']]
            n = sum(close(want, h) for h in hs)
            verdict = 'right' if n * 2 > len(hs) else 'wrong'
            rec = dict(r, should=want, heard=hs, right=n, verdict=verdict, mms=letters.get(r['path'], ''))
            f.write(json.dumps(rec, ensure_ascii=False) + '\n')
            out.append(rec)
            tab[(r['tradition'], r['kind'])][verdict] += 1
    md = ['# Letters, Vowels and Syllables in All Three Traditions', '',
          'Each clip checked against the reading the app shows for its own tradition (forTradition.js). The sound model heard each '
          f'clip {a.passes} times among different neighbours; **wrong** means most hearings missed the reading. '
          + ('MMS letters: what Meta MMS wrote, with no dictionary behind it. ' if a.mms else '') + 'A machine check.', '',
          '| tradition | kind | clips | right | wrong | right % |', '|---|---|---|---|---|---|']
    for (t, k), c in sorted(tab.items()):
        tot = c['right'] + c['wrong']
        md.append(f"| {t} | {k} | {tot} | {c['right']} | {c['wrong']} | {c['right'] / max(1, tot):.1%} |")
    tot = sum(c['right'] + c['wrong'] for c in tab.values()); ok = sum(c['right'] for c in tab.values())
    md.append(f'| **all** | | **{tot}** | **{ok}** | **{tot - ok}** | **{ok / max(1, tot):.1%}** |')
    md += ['', '## Wrong', '', '| clip | text | app shows | should sound | heard | MMS letters |', '|---|---|---|---|---|---|']
    for r in sorted(out, key=lambda r: r['path']):
        if r['verdict'] == 'wrong':
            md.append(f"| `{r['path']}` | {r['text']} | {r['say']} | {r['should']} | {' / '.join(r['heard'])} | {r['mms']} |")
    open(os.path.join(a.out, 'TRADITIONS-CHECK.md'), 'w', encoding='utf-8').write('\n'.join(md) + '\n')
    open(os.path.join(a.out, 'traditions-wrong.txt'), 'w', encoding='utf-8').write(
        '\n'.join(sorted(r['path'] for r in out if r['verdict'] == 'wrong')) + '\n')
    print('\n'.join(md[4:4 + len(tab) + 3]))


if __name__ == '__main__':
    main()
