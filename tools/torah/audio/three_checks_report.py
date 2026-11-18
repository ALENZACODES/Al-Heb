"""Full report of the three checks (words, sounds, pace) on every Hebrew Torah verse clip, from check_shard.py slice files.

The sound model (renikud/whisper-he-ipa) writes the divine Name as "hˈ" (the abbreviation ה׳) instead of its sounds, so a clip
whose only weak sound is the Name (read Adonai) is heard again by a word-free phoneme model (wav2vec2-xlsr-53-espeak); if that
model hears "adonai" there, the sound check counts as passed and the report says so.

  python tools/torah/audio/three_checks_report.py slices/*.jsonl --md report.md --fails fails.txt
"""
import argparse, collections, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', '..', 'audio', 'asr-check'))
import check_summary as CS

NAME = {'אֲדֹנָי', 'לַאדֹנָי', 'וַאדֹנָי', 'בַּאדֹנָי', 'מֵאֲדֹנָי', 'כַּאדֹנָי'}
strip = lambda s: re.sub(r'[֑-ׇ]', '', s)


def name_heard(paths):
    """Paths whose clip the phoneme model hears with 'donai' (adonai, ladonai...)."""
    import numpy as np, torch
    from transformers import AutoProcessor, Wav2Vec2ForCTC
    from listeners import load
    proc = AutoProcessor.from_pretrained('facebook/wav2vec2-xlsr-53-espeak-cv-ft')
    m = Wav2Vec2ForCTC.from_pretrained('facebook/wav2vec2-xlsr-53-espeak-cv-ft').eval()
    ok = set()
    root = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
    for p in paths:
        a = load(os.path.join(root, p))
        with torch.no_grad():
            h = proc.batch_decode(m(proc(a, sampling_rate=16000, return_tensors='pt').input_values).logits.argmax(-1))[0].replace(' ', '')
        if re.search(r'don[aɑ]ɪ|don[aɑ]j|donaɪ', h):
            ok.add(p)
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('files', nargs='+')
    ap.add_argument('--md', required=True)
    ap.add_argument('--fails', required=True)
    a = ap.parse_args()
    rows = {}
    for f in a.files:
        for l in open(f, encoding='utf-8'):
            if l.strip():
                r = json.loads(l); rows[r['file']] = r
    name_only = [p for p, r in rows.items() if r.get('sound_weak') and all(w in NAME for w in r['sound_weak'])]
    confirmed = name_heard(name_only) if name_only else set()
    tally, by, real, wordsonly = collections.Counter(), collections.defaultdict(lambda: [0, 0]), [], []
    for p, r in sorted(rows.items()):
        c, _ = CS.judge(r)
        if not c['sounds'] and p in confirmed:
            c['sounds'] = True
        ok = all(c.values())
        for k, v in c.items():
            tally[k] += v
        book = p.split('torah-')[1].split('-')[0]
        by[book][0] += 1; by[book][1] += ok
        if not ok:
            (real if not (c['sounds'] and c['pace']) else wordsonly).append((p, c, r))
    n = len(rows); good = n - len(real) - len(wordsonly)
    pc = lambda x: f'{x / max(1, n) * 100:.1f}%'
    md = ['# Hebrew Torah Verses: Three Checks (18 Nov 2026)', '',
          'Every Hebrew Torah verse clip the app plays (both voices), heard by machines: **words** (ivrit-ai Whisper hears every word of the verse), '
          '**sounds** (renikud/whisper-he-ipa hears every word\'s sounds, 0.6 or better), **pace** (speech within 12% of 4.6 syllables a second). '
          'These are the steady-pace clips of 17 Nov, plus Genesis 1 re-recorded with pauses. No person has listened.', '',
          '| | clips | share |', '|---|---|---|',
          f'| checked | {n} | |', f'| **all three right** | **{good}** | **{pc(good)}** |',
          f"| words right | {tally['words']} | {pc(tally['words'])} |", f"| sounds right | {tally['sounds']} | {pc(tally['sounds'])} |",
          f"| pace right | {tally['pace']} | {pc(tally['pace'])} |",
          f'| fail sounds or pace (likely a real fault) | {len(real)} | {pc(len(real))} |',
          f'| fail words only (often the recognizer\'s spelling) | {len(wordsonly)} | {pc(len(wordsonly))} |', '',
          f'The Name: in {len(name_only)} clips the only weak sound was the Name; the phoneme model heard "adonai" in {len(confirmed)} of them, so those count as right.', '',
          '| book | clips | all three right |', '|---|---|---|']
    md += [f'| {b} | {t} | {ok} ({ok / t * 100:.1f}%) |' for b, (t, ok) in sorted(by.items())]
    md += ['', '## Fail sounds or pace (likely real)', '', '| verse | voice | sounds | pace | weak sounds | words the recognizer missed |', '|---|---|---|---|---|---|']
    for p, c, r in real:
        v = p.split('torah-')[1][:-4]; g = 'Ari (m)' if p.startswith('audio/m/') else 'Noa (f)'
        md.append(f"| {v} | {g} | {'✓' if c['sounds'] else '✗'} | {'✓' if c['pace'] else '✗'} {r.get('pace')} | {', '.join(r.get('sound_weak', []))} | {', '.join(r.get('word_issues', []))} |")
    md += ['', '## Fail words only', '', 'The sound and pace checks pass; the word recognizer wrote some words differently. Most are spelling: '
           'כָּל written כול, אַבְרָם written אברהם, the Torah\'s הִוא (read "hi") written היא. Some may be real.', '',
           '| verse | voice | words |', '|---|---|---|']
    for p, c, r in wordsonly:
        v = p.split('torah-')[1][:-4]; g = 'Ari (m)' if p.startswith('audio/m/') else 'Noa (f)'
        md.append(f"| {v} | {g} | {', '.join(r.get('word_issues', []))} |")
    open(a.md, 'w', encoding='utf-8').write('\n'.join(md) + '\n')
    open(a.fails, 'w', encoding='utf-8').write(''.join(f"{p}\t{'real' if (p, c, r) in real else 'words-only'}\n" for p, c, r in real + wordsonly))
    print('\n'.join(md[6:16]))


if __name__ == '__main__':
    main()
