"""Replace a failing clip with a passing recording of the SAME pointed word in the SAME voice (no new audio is made).

  python tools/audio/asr-check/swap.py            # dry run
  python tools/audio/asr-check/swap.py --execute

Only failures confirmed by a one-at-a-time hearing (mode "single" in results.jsonl) are replaced, and only by a
recording that scored a full match. Every copy is logged in tools/audio/asr-check/swap-log.json.
Run scan.py first; run scan.py --report-only afterwards to refresh the report.
"""
import argparse
import collections
import csv
import hashlib
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
import check_lib as L  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
HERE = os.path.dirname(__file__)


def spoken(h):
    return re.sub(r'\s+', ' ', re.sub(r'[֑-ֽֿ֯׀׃-׆׃]', '', h.replace('־', ' '))).strip(' .:,')


def voice(p):
    return ('m' if p.endswith('_ari.mp3') else 'f') if p.startswith('audio/builder/') else p.split('/')[1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--execute', action='store_true')
    a = ap.parse_args()
    mode = {}
    for r in L.jl_read(os.path.join(HERE, 'results.jsonl')):
        if r.get('mode') == 'single' or r['file'] not in mode:
            mode[r['file']] = r.get('mode', 'fast')
    rows = list(csv.DictReader(open(os.path.join(ROOT, 'docs', 'audio', 'asr-check.csv'), encoding='utf-8')))
    groups = collections.defaultdict(list)
    for r in rows:
        groups[(voice(r['file']), spoken(r['pointed_hebrew']))].append(r)
    # Builder clips are pinned by sha256 (tools/audio/verify-builder.mjs) and the shalom copies must equal their builder
    # source; those are re-recorded by fix.py, never swapped here.
    pinned = {r['path'] for r in json.load(open(os.path.join(ROOT, 'tools', 'audio', 'builder-shalom-replacements.json'), encoding='utf-8'))}
    plan = []
    for (v, he), rs in groups.items():
        good = [r for r in rs if r['verdict'] == 'pass' and float(r['score']) >= 1.0]
        bad = [r for r in rs if r['verdict'] in ('fail', 'unheard', 'borderline') and mode.get(r['file']) == 'single']
        if good and bad:
            src = good[0]
            for b in bad:
                for p in b['same_audio_paths'].split():
                    if p.startswith('audio/builder/') or p in pinned:
                        continue
                    plan.append({'path': p, 'source': src['file'], 'hebrew': he, 'voice': v, 'was_heard': b['heard'], 'source_heard': src['heard']})
    print(f'{len(plan)} files would take a passing recording of the same word and voice')
    for x in plan[:40]:
        print(f"  {x['hebrew']:<12} {x['voice']}  heard {x['was_heard'] or '(nothing)':<14} <- {x['source']} (heard {x['source_heard']})")
    if not a.execute:
        print('dry run: add --execute to copy')
        return
    for x in plan:
        data = open(os.path.join(ROOT, x['source']), 'rb').read()
        open(os.path.join(ROOT, x['path']), 'wb').write(data)
        x['sha256'] = hashlib.sha256(data).hexdigest()
    log = os.path.join(HERE, 'swap-log.json')
    old = json.load(open(log, encoding='utf-8')) if os.path.exists(log) else []
    json.dump(old + plan, open(log, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    # results.jsonl: the replaced file now holds the passing audio, so record what that audio was heard as.
    with open(os.path.join(HERE, 'results.jsonl'), 'a', encoding='utf-8') as f:
        for x in plan:
            f.write(json.dumps({'file': x['path'], 'asr': x['source_heard'], 'mode': 'single', 'swappedFrom': x['source']}, ensure_ascii=False) + '\n')
    print(f'copied {len(plan)} files')


if __name__ == '__main__':
    main()
