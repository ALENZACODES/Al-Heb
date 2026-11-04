"""Slow, polite caption fetch for the remaining top-100 ids. Captions only, no cookies, no media.
Per video: one yt-dlp call (rotating player_client, rotating sub format), then a 20-40 s jittered pause.
On HTTP 429 or bot check: exponential back-off (5, 10, 20, 40 min, capped), and the video is retried later.
Gives up after --max-block consecutive blocked attempts or --budget-min minutes in total and says so. Log: research_notes/youtube/fetch4.json
Usage: python3 fetch-slow.py [--max-block 3] [--budget-min 25] [--limit N]"""
import json, os, glob, subprocess, time, random, sys
R = '/home/claude/research_notes/youtube/'
top = json.load(open(R + 'top100.json'))
LOG = R + 'fetch4.json'
log = json.load(open(LOG)) if os.path.exists(LOG) else {}
maxb = int(sys.argv[sys.argv.index('--max-block') + 1]) if '--max-block' in sys.argv else 6
budget = int(sys.argv[sys.argv.index('--budget-min') + 1]) * 60 if '--budget-min' in sys.argv else 25 * 60
T0 = time.time()
limit = int(sys.argv[sys.argv.index('--limit') + 1]) if '--limit' in sys.argv else 10**9
CLIENTS = ['tv_embedded', 'default', 'ios', 'web_safari']
FMTS = ['vtt', 'srv1', 'json3']
os.makedirs(R + 'raw4', exist_ok=True)
def have(v):
    return glob.glob(R + 'all_txt/%s.*' % v) or glob.glob(R + 'raw4/%s.*.*' % v) and any(not f.endswith('.json') for f in glob.glob(R + 'raw4/%s.*.*' % v))
def one(vid, n):
    c = CLIENTS[n % len(CLIENTS)]; f = FMTS[n % len(FMTS)]
    cmd = ['yt-dlp', '--skip-download', '--ignore-no-formats-error', '--write-subs', '--write-auto-subs', '--sub-langs', 'en,en-orig',
           '--sub-format', f, '--sleep-subtitles', '5', '--write-info-json', '--no-warnings', '-o', R + 'raw4/%(id)s',
           '--extractor-args', 'youtube:player_client=' + c, 'https://www.youtube.com/watch?v=' + vid]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    out = (r.stdout + r.stderr)
    files = [x for x in glob.glob(R + 'raw4/%s.*' % vid) if x.endswith(('.vtt', '.srv1', '.json3'))]
    return c, f, files, out
def no_en_listed(vid):
    # trust 'no captions' only if the info json from this call lists no English track at all
    try: j = json.load(open(R + 'raw4/%s.info.json' % vid))
    except Exception: return False
    tracks = list(j.get('subtitles', {})) + list(j.get('automatic_captions', {}))
    return not any(t.startswith('en') for t in tracks)
blocked_streak = 0; done = 0; attempt = 0
while blocked_streak < maxb and done < limit and time.time() - T0 < budget:
    todo = [p['id'] for p in top if not glob.glob(R + 'all_txt/%s.*' % p['id']) and log.get(p['id'], {}).get('status') not in ('ok', 'nocaps')]
    todo = sorted(todo, key=lambda v: log.get(v, {}).get('t', ''))
    if not todo: print('all done'); break
    vid = todo[0]
    c, f, files, out = one(vid, attempt); attempt += 1
    low = out.lower()
    if files: st = 'ok'
    elif 'too many requests' in low or '429' in low or 'confirm you' in low: st = 'blocked'
    elif 'no subtitles' in low: st = 'nocaps' if no_en_listed(vid) else 'unclear'
    else: st = 'blocked'
    log[vid] = dict(status=st, client=c, fmt=f, t=time.strftime('%H:%M:%S'), note=out.strip().replace('\n', ' ')[-140:])
    json.dump(log, open(LOG, 'w'), indent=0)
    print(time.strftime('%H:%M:%S'), vid, st, c, f, flush=True)
    if st == 'blocked':
        blocked_streak += 1
        w = min(min(300 * 2 ** (blocked_streak - 1), 2400) * random.uniform(0.9, 1.2), max(0, budget - (time.time() - T0)))
        print('  back-off %.0f s' % w, flush=True); time.sleep(w)
    elif st == 'unclear':
        time.sleep(random.uniform(22, 40))
    else:
        blocked_streak = 0; done += 1
        time.sleep(random.uniform(22, 40))
print('stopped; blocked_streak', blocked_streak, flush=True)
