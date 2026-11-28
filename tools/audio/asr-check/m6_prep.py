"""Round 6 measurement: copy the lines r6_apply.py rebuilt into takes/m6/ (on the takes branch), write the queue
(same want text as multi4-queue.json, so the result compares with the current measurement) and 5 notebooks running the
full line checks: four word recognizers (multi4.py), four phonetic checks (phon4.py, no gate) and Hebrew wav2vec2.

  python m6_prep.py <takes root to write into>      # reads round6-relines.txt
"""
import json, os, re, shutil, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
SHARDS = 5


def main(out_root):
    lines = [l.strip() for l in open(os.path.join(HERE, 'round6-relines.txt')) if l.strip()]
    base = {o['file']: o for o in json.load(open(os.path.join(HERE, 'multi4-queue.json'), encoding='utf-8'))}
    q = []
    for f in lines:
        dst = os.path.join('takes', 'm6', f)
        os.makedirs(os.path.join(out_root, os.path.dirname(dst)), exist_ok=True)
        shutil.copy(os.path.join(ROOT, f), os.path.join(out_root, dst))
        o = dict(base[f]); o.update({'file': dst, 'orig': f, 'take': 'r6'})
        q.append(o)
    # the lines round 5 joined again were never measured as they are now: measure the version in git too
    import subprocess
    for f in sorted({l.strip() for l in open(os.path.join(HERE, 'round5-relines.txt')) if l.strip()} & set(base)):
        dst = os.path.join('takes', 'm6cur', f)
        os.makedirs(os.path.join(out_root, os.path.dirname(dst)), exist_ok=True)
        open(os.path.join(out_root, dst), 'wb').write(subprocess.run(['git', '-C', ROOT, 'show', 'HEAD:' + f],
                                                                    capture_output=True, check=True).stdout)
        o = dict(base[f]); o.update({'file': dst, 'orig': f, 'take': 'cur5'})
        q.append(o)
    # word clips from the older word-fix round 7 (john/word-fix-r7-*) that never reached this branch: candidates too
    r7 = os.path.join(HERE, 'round7-candidates.json')
    for c in (json.load(open(r7)) if os.path.exists(r7) else []):
        if c['orig'] in base:
            src = os.path.join('/home/claude/work/r7', c['file'])
            os.makedirs(os.path.join(out_root, os.path.dirname(c['file'])), exist_ok=True)
            shutil.copy(src, os.path.join(out_root, c['file']))
            o = dict(base[c['orig']]); o.update({'file': c['file'], 'orig': c['orig'], 'take': 'r7', 'branch': c['branch']})
            q.append(o)
    json.dump(q, open(os.path.join(HERE, 'measure6-queue.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    open(os.path.join(HERE, 'measure6-paths.txt'), 'w').write('tools/audio/asr-check/\n' + ''.join(o['file'] + '\n' for o in q))
    tpl = json.load(open(os.path.join(HERE, 'kaggle_stitch_s0.ipynb'), encoding='utf-8'))
    for s in range(SHARDS):
        nb = json.loads(json.dumps(tpl))
        for c in nb['cells']:
            src = ''.join(c['source']).replace('stitch-queue', 'measure6-queue').replace('stitch-paths', 'measure6-paths')
            src = src.replace('Stitched candidate lines', 'Round 6 rebuilt lines')
            src = re.sub(r'--shard 0 --shards 2', f'--shard {s} --shards {SHARDS}', src)
            c['source'] = src.splitlines(True)
            if 'outputs' in c:
                c['outputs'] = []
        json.dump(nb, open(os.path.join(HERE, f'kaggle_m6_s{s}.ipynb'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(q), 'lines to measure')


if __name__ == '__main__':
    main(sys.argv[1])
