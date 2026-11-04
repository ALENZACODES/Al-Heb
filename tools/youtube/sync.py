"""Clean every downloaded .vtt under research_notes into plain text (research_notes/youtube/all_txt/<id>.txt, never committed).
Keeps the longer of the en / en-orig tracks. Also records whether captions are manual or automatic (from info.json) in caption_kind.json."""
import re, glob, os, json
R = os.path.expanduser('~/research_notes/')
def clean(path):
    out = []; prev = ''
    for ln in open(path, encoding='utf-8'):
        ln = ln.strip()
        if not ln or ln.startswith(('WEBVTT', 'Kind:', 'Language:', 'NOTE')) or '-->' in ln or re.fullmatch(r'\d+', ln): continue
        ln = re.sub(r'<[^>]+>', '', ln); ln = re.sub(r'\[[^\]]*\]', '', ln).strip()
        for a, b in (('&nbsp;', ' '), ('&amp;', '&'), ('&gt;', '>'), ('&lt;', '<'), ('&#39;', "'"), ('&quot;', '"')): ln = ln.replace(a, b)
        if not ln or ln == prev: continue
        out.append(ln); prev = ln
    res = []
    for i, l in enumerate(out):
        if i + 1 < len(out) and out[i + 1].startswith(l): continue
        if res and l in res[-1]: continue
        res.append(l)
    return ' '.join(res)
got = {}
for f in glob.glob(R + '**/*.vtt', recursive=True) + glob.glob('/tmp/yt/*.vtt'):
    vid = os.path.basename(f).split('.')[0]; t = clean(f)
    if vid not in got or len(t) > len(got[vid]): got[vid] = t
os.makedirs(R + 'youtube/all_txt', exist_ok=True)
for v, t in got.items(): open(R + 'youtube/all_txt/%s.txt' % v, 'w').write(t)
kind = {}
for f in glob.glob(R + 'youtube/raw*/*.info.json'):
    try: d = json.load(open(f))
    except Exception: continue
    vid = d.get('id'); subs = d.get('subtitles') or {}
    kind[vid] = 'manual' if any(k.startswith('en') for k in subs) else 'auto'
json.dump(kind, open(R + 'youtube/caption_kind.json', 'w'))
print(len(got), 'caption sets cleaned;', len(kind), 'with info.json')
