"""Scan the Israeli clips: speech-to-text on every clip, compare with its Hebrew, write a report and a redo list.

  python tools/audio/asr-check/scan.py                      # words, lines, prayers, front-page builder words
  python tools/audio/asr-check/scan.py --kinds word --limit 200
  python tools/audio/asr-check/scan.py --report-only        # rebuild the report from results already saved
  python tools/audio/asr-check/scan.py --kinds dictionary   # only the dictionary words from render_dictionary.mjs

Resumable: results go to tools/audio/asr-check/results.jsonl as they come in; a rerun skips clips already heard.
Identical files (same bytes under several ids) are heard once and reported under every path.
Outputs: docs/audio/ASR-CHECK.md, docs/audio/asr-check.csv, docs/audio/asr-redo-israeli.txt (one clip path per line).
"""
import argparse
import csv
import hashlib
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
import check_lib as L  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
RESULTS = os.path.join(os.path.dirname(__file__), 'results.jsonl')


def jobs(kinds):
    by_hash = {}

    def add(path, hebrew, phonetic, kind, english=''):
        full = os.path.join(ROOT, path)
        if not os.path.exists(full):
            return
        h = hashlib.md5(open(full, 'rb').read()).hexdigest()
        j = by_hash.setdefault(h, {'file': path, 'he': hebrew, 'ph': phonetic, 'en': english, 'kind': kind, 'paths': []})
        if path not in j['paths']:
            j['paths'].append(path)

    with open(os.path.join(ROOT, 'audio', 'INDEX.csv'), encoding='utf-8') as f:
        for r in csv.DictReader(f):
            if r['tradition'] == 'israeli' and r['kind'] in kinds:
                add(r['file'], r['pointed_hebrew'], r['phonetic'], r['kind'], r['english'])
    if 'dictionary' in kinds:
        # Dictionary words recorded by tools/audio/render_dictionary.mjs (rows with group "dictionary-word").
        shard = os.path.join(ROOT, 'data', 'vocab', 'audio-dictionary.json')
        if os.path.exists(shard):
            for r in json.load(open(shard, encoding='utf-8')):
                add(r['path'], r['text'], '', 'dictionary', '')
    if 'builder' in kinds:
        words = json.load(open(os.path.join(ROOT, 'data', 'builder_words.json'), encoding='utf-8'))
        for w in words:
            for v in ('ari', 'noa'):
                add(w['audio_' + v], w['nikud'], w.get('translit_israeli', ''), 'builder', w.get('meaning_en', ''))
    return list(by_hash.values())


def save(rec):
    with open(RESULTS, 'a', encoding='utf-8') as f:
        f.write(json.dumps(rec, ensure_ascii=False) + '\n')


def report(all_jobs):
    heard = {}
    for r in L.jl_read(RESULTS):
        if r.get('mode') == 'single' or r['file'] not in heard:
            heard[r['file']] = r
    rows = []
    for j in all_jobs:
        r = heard.get(j['file'])
        if not r:
            continue
        s = L.score(j['he'], r['asr'])
        verdict = 'unheard' if s is None else 'number' if s == 'digits' else 'pass' if s >= L.PASS else 'borderline' if s >= L.FLAG else 'fail'
        rows.append({**j, 'asr': r['asr'], 'score': s, 'verdict': verdict, 'mode': r.get('mode', 'fast')})
    order = {'fail': 0, 'unheard': 1, 'borderline': 2, 'number': 3, 'pass': 4}
    rows.sort(key=lambda r: (order[r['verdict']], r['score'] if isinstance(r['score'], float) else -1))
    docs = os.path.join(ROOT, 'docs', 'audio')
    with open(os.path.join(docs, 'asr-check.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['verdict', 'score', 'kind', 'pointed_hebrew', 'heard', 'phonetic', 'english', 'file', 'same_audio_paths'])
        for r in rows:
            w.writerow([r['verdict'], r['score'], r['kind'], r['he'], r['asr'], r['ph'], r['en'], r['file'], ' '.join(r['paths'])])
    redo = [p for r in rows if r['verdict'] in ('fail', 'unheard', 'borderline') for p in r['paths']]
    with open(os.path.join(docs, 'asr-redo-israeli.txt'), 'w', encoding='utf-8') as f:
        f.write('# Israeli clips whose speech-to-text did not match their Hebrew (tools/audio/asr-check/scan.py)\n')
        f.write(''.join(p + '\n' for p in redo))
    count = {k: sum(r['verdict'] == k for r in rows) for k in order}
    by_kind = {}
    for r in rows:
        by_kind.setdefault(r['kind'], {k: 0 for k in order})[r['verdict']] += 1
    with open(os.path.join(docs, 'ASR-CHECK.md'), 'w', encoding='utf-8') as f:
        f.write('# Israeli audio: speech-to-text check\n\n')
        f.write('Each clip was played to a Hebrew speech-to-text model (ivrit-ai Whisper large-v3-turbo) and what it heard was '
                'compared with the Hebrew the clip should say. Spelling-only differences are allowed (ו/י vowel letters, '
                'ט/ת, כ/ק, ע/א, ס/ש, a final א/ה). A machine check: a **fail** is strong evidence the clip is wrong; a '
                '**pass** means it is recognisable, not that a teacher has approved it.\n\n')
        f.write(f'Unique recordings checked: **{len(rows)}** (identical files under several ids are counted once).\n\n')
        f.write('| kind | fail | unheard | borderline | number | pass |\n|---|---|---|---|---|---|\n')
        for k, c in sorted(by_kind.items()):
            f.write(f"| {k} | {c['fail']} | {c['unheard']} | {c['borderline']} | {c['number']} | {c['pass']} |\n")
        f.write(f"| **all** | **{count['fail']}** | **{count['unheard']}** | **{count['borderline']}** | **{count['number']}** | **{count['pass']}** |\n\n")
        f.write(f'Clip files to re-record (fail + unheard + borderline, every path sharing the audio): **{len(redo)}**, listed in '
                '[asr-redo-israeli.txt](asr-redo-israeli.txt). Full table: [asr-check.csv](asr-check.csv).\n\n')
        f.write('Fix them with `python tools/audio/asr-check/fix.py` (needs GOOGLE_TTS_API_KEY).\n\n')
        f.write('## Worst 150\n\n| verdict | score | should say | heard | phonetic | clip |\n|---|---|---|---|---|---|\n')
        for r in rows[:150]:
            if r['verdict'] in ('pass', 'number'):
                break
            f.write(f"| {r['verdict']} | {r['score']} | {r['he']} | {r['asr'] or '(nothing)'} | {r['ph']} | `{r['file']}` |\n")
    return count, len(redo)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--kinds', default='word,line,prayer,builder,dictionary')
    ap.add_argument('--limit', type=int)
    ap.add_argument('--report-only', action='store_true')
    ap.add_argument('--no-recheck', action='store_true', help='skip re-hearing flagged clips one at a time')
    ap.add_argument('--shard', type=int, default=0, help='with --of: hear only this slice of the clips still to do (for parallel runs)')
    ap.add_argument('--of', type=int, default=1)
    ap.add_argument('--no-report', action='store_true', help='hear only; leave the report files alone (parallel runs write the report once, at the end)')
    ap.add_argument('--rehear-kept', action='store_true', help='hear again, one at a time, every clip fix.py replaced (fix-log.jsonl, kept) whose saved result still fails: the saved result is from before the retake')
    a = ap.parse_args()
    kinds = a.kinds.split(',')
    all_jobs = jobs(kinds)
    if a.rehear_kept:
        fixlog = os.path.join(os.path.dirname(__file__), 'fix-log.jsonl')
        kept = {r['file'] for r in L.jl_read(fixlog) if r.get('kept')}
        latest = {}
        for r in L.jl_read(RESULTS):
            if r.get('mode') == 'single' or r['file'] not in latest:
                latest[r['file']] = r
        stale = []
        for j in all_jobs:
            r = latest.get(j['file'])
            sc = L.score(j['he'], r['asr']) if r else None
            if j['file'] in kept and r and not isinstance(sc, str) and (sc or 0) < L.PASS:
                stale.append(j)
        print(f're-hearing {len(stale)} replaced clips whose saved result is from before the retake', flush=True)
        for n, j in enumerate(stale, 1):
            save({'file': j['file'], 'asr': L.hear(os.path.join(ROOT, j['file'])), 'mode': 'single'})
            if n % 25 == 0:
                print(f'{n}/{len(stale)}', flush=True)
    elif not a.report_only:
        done = {r['file'] for r in L.jl_read(RESULTS)}
        todo = sorted((j for j in all_jobs if j['file'] not in done), key=lambda j: j['file'])
        todo = [j for i, j in enumerate(todo) if i % a.of == a.shard][:a.limit]
        by_file = {j['file']: j for j in todo}
        t0 = time.time()
        short = [j['file'] for j in todo if j['kind'] in ('word', 'builder')]
        for n, (p, heard) in enumerate(L.hear_many([os.path.join(ROOT, p) for p in short]), 1):
            rel = os.path.relpath(p, ROOT).replace(os.sep, '/')
            save({'file': rel, 'asr': heard, 'mode': 'fast'})
            if n % 50 == 0:
                print(f'{n}/{len(short)} words heard, {time.time() - t0:.0f}s', flush=True)
        for j in todo:
            if j['kind'] not in ('word', 'builder'):
                save({'file': j['file'], 'asr': L.hear(os.path.join(ROOT, j['file']), max_tokens=200), 'mode': 'single'})
        if not a.no_recheck:
            heard = {r['file']: r for r in L.jl_read(RESULTS)}
            again = [j for j in all_jobs if j['file'] in heard and heard[j['file']].get('mode') == 'fast'
                     and not isinstance(L.score(j['he'], heard[j['file']]['asr']), str)
                     and (L.score(j['he'], heard[j['file']]['asr']) or 0) < L.PASS]
            print(f're-hearing {len(again)} flagged clips one at a time', flush=True)
            for j in again:
                save({'file': j['file'], 'asr': L.hear(os.path.join(ROOT, j['file'])), 'mode': 'single'})
        del by_file
    if a.no_report:
        return
    count, redo = report(all_jobs)
    print(json.dumps({**count, 'redo_files': redo}))


if __name__ == '__main__':
    main()
