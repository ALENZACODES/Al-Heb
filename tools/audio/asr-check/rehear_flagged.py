"""Hear again, one at a time, every word and builder clip the stored scan result does not pass, and store what is heard now.

results.jsonl is keyed by file, so a clip re-recorded after the scan keeps its old verdict until it is heard again.
Run this before reading docs/audio/ASR-CHECK.md as the current state, then `scan.py --report-only`.

  python tools/audio/asr-check/rehear_flagged.py            # word and builder clips
"""
import os, sys

sys.path.insert(0, os.path.dirname(__file__))
import check_lib as L  # noqa: E402
import scan as S  # noqa: E402


def main():
    stored = {}
    for r in L.jl_read(S.RESULTS):
        if r.get('mode') == 'single' or r['file'] not in stored:
            stored[r['file']] = r
    todo = []
    for j in S.jobs(('word', 'builder')):
        r = stored.get(j['file'])
        s = L.score(j['he'], r['asr']) if r else None
        if r and not (s == 'digits' or (isinstance(s, float) and s >= L.PASS)):
            todo.append((j, r['asr'], s))
    changed = 0
    for n, (j, old, s_old) in enumerate(todo, 1):
        now = L.hear(os.path.join(S.ROOT, j['file']))
        s_now = L.score(j['he'], now)
        S.save({'file': j['file'], 'asr': now, 'mode': 'single'})
        better = isinstance(s_now, float) and s_now >= L.PASS
        changed += better
        print(f"[{n}/{len(todo)}] {'now passes' if better else 'still flagged'}  {j['he']}  {j['file']}  was {old!r} ({s_old})  now {now!r} ({s_now})", flush=True)
    print(f'{changed} of {len(todo)} flagged clips pass when heard again')


if __name__ == '__main__':
    main()
