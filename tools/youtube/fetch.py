"""Download English captions (manual or auto) with yt-dlp for the ids in top100.json.
Captions only: no video or audio is downloaded. Uses the web_embedded client, which still serves captions when the default clients ask for sign-in.
Backs off and retries on 429 / bot-check; skips ids already captured under research_notes. Results: research_notes/youtube/fetch3.json"""
import json, os, glob, subprocess, time, sys
R = '/home/claude/research_notes/youtube/'
top = json.load(open(R + 'top100.json'))
log = json.load(open(R + 'fetch3.json')) if os.path.exists(R + 'fetch3.json') else {}
have = {os.path.basename(f).split('.')[0] for f in glob.glob(R + 'all_txt/*.txt')}
os.makedirs(R + 'raw3', exist_ok=True)
def one(vid):
    cmd = ['yt-dlp', '--js-runtimes', 'node', '--skip-download', '--ignore-no-formats-error', '--write-subs', '--write-auto-subs',
           '--sub-langs', 'en,en-orig', '--write-info-json', '-o', R + 'raw3/%(id)s', '--no-warnings',
           '--extractor-args', 'youtube:player_client=web_embedded', 'https://www.youtube.com/watch?v=' + vid]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=240)
    vtts = glob.glob(R + 'raw3/%s.*.vtt' % vid)
    return vtts, r.stderr[-300:]
streak = 0
passes = int(sys.argv[1]) if len(sys.argv) > 1 else 3
for ps in range(passes):
    todo = [p['id'] for p in top if p['id'] not in have and log.get(p['id'], {}).get('status') not in ('ok', 'nocaps')]
    print('pass', ps, 'todo', len(todo), flush=True)
    if not todo: break
    for vid in todo:
        try: vtts, err = one(vid)
        except Exception as e: vtts, err = [], 'EXC ' + str(e)
        if vtts: st = 'ok'
        elif 'no subtitles' in err.lower() or os.path.exists(R + 'raw3/%s.info.json' % vid) and 'Too Many' not in err and 'Sign in' not in err: st = 'nocaps'
        else: st = 'retry'
        log[vid] = dict(status=st, err=err.replace('\n', ' ')[-160:])
        json.dump(log, open(R + 'fetch3.json', 'w'))
        print(vid, st, flush=True)
        if st == 'retry' and ('Too Many' in err or '429' in err):
            streak += 1; time.sleep(min(180 * streak, 900))   # back off, longer each time
        else:
            streak = 0; time.sleep(12)
    time.sleep(60)
