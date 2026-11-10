"""Build docs/youtube/top100.md from research_notes/youtube/top100.json + caption files + fetch log.
Re-run after any new captions arrive (run sync.py first). READ lists the ids whose captions the author actually read (see docs/youtube/notes.md)."""
import json, os, collections
R = os.path.expanduser('~/research_notes/youtube/')
top = json.load(open(R + 'top100.json'))
have = {f[:-4] for f in os.listdir(R + 'all_txt')}
log = json.load(open(R + 'fetch3.json')) if os.path.exists(R + 'fetch3.json') else {}
old = json.load(open(R + 'fetch_log.json')) if os.path.exists(R + 'fetch_log.json') else {}
kind = json.load(open(R + 'caption_kind.json')) if os.path.exists(R + 'caption_kind.json') else {}
READ = set(open(os.path.expanduser('~/alef/tools/youtube/read-ids.txt')).read().split())
UNUSABLE = {'luk85AVuHCg': 'captions exist but hold about 13 words (the video is mostly sung)', 'Lf0ZDAvYInU': 'captions hold about 14 words'}
def status(i):
    if i in UNUSABLE: return 'unusable'
    if i in have and i in READ: return 'read'
    if i in have: return 'fetched, not read'
    f = R + 'raw3/%s.info.json' % i
    if os.path.exists(f):
        d = json.load(open(f))
        if not any(k.startswith('en') for k in list((d.get('subtitles') or {}).keys()) + list((d.get('automatic_captions') or {}).keys())): return 'no captions'
    return 'blocked'
def mmss(s): return '%d:%02d' % (s // 60, s % 60) if s < 3600 else '%d:%02d:%02d' % (s // 3600, s % 3600 // 60, s % 60)
esc = lambda s: s.replace('|', '/')
rows = []
cnt = collections.Counter()
for n, p in enumerate(top, 1):
    st = status(p['id']); cnt[st] += 1
    ck = kind.get(p['id'], '')
    stx = st + (' (%s)' % ck if st == 'read' and ck else '')
    rows.append('| %d | %s | %s | %s | %s | %s | https://www.youtube.com/watch?v=%s | %s |' % (n, esc(p['title'][:90]), esc(p['channel'][:30]), mmss(p['dur']), format(p['views'], ','), p['kind'], p['id'], stx))
k = collections.Counter(p['kind'] for p in top)
out = ['# Top 100 Hebrew-learning videos on YouTube: candidate list and caption coverage', '',
 'Status: research notes, 2026-11-03. Scores elsewhere in `docs/youtube/` are judgement, not outcomes.', '',
 '## How I read these videos (and what I did not do)', '',
 '- I did not watch any video and did not listen to any audio. I read English captions downloaded with `yt-dlp` (manual captions where the uploader supplied them, otherwise YouTube auto-captions, which are noisy and often garble Hebrew words). `youtube-transcript-api` is IP-blocked from this machine and was not used.',
 '- What a teacher shows on screen (arrows, colours, writing) is invisible to me unless they say it aloud. Notes below describe what is said, not what is displayed.',
 '- No caption text is stored in the repo. Raw captions stay in `~/research_notes/youtube/`. Notes are in my own words; quotes are 12 words or fewer.',
 '- Candidates came from `yt-dlp ytsearch` over 32 queries (alphabet, nikud, cursive, siddur and Torah reading, Shema and other prayers, pronunciation traditions, Israeli slang, travel and ordering phrases, ulpan, grammar basics) plus one WebSearch pass for channel round-ups, which added nothing the search pass had not found. The pool held 1,033 videos; I dropped songs, kids\' letter clips, Bible commentary, vlogs and off-topic hits by hand-list (`tools/youtube/select.py`), ranked the rest by log(views) plus a relevance bonus for reading and Israeli-conversation keywords, and took the first 100.',
 '- View counts are as captured by the search pass on 2026-11-03 and will have moved.', '',
 '## Coverage', '',
 '| Status | Videos |', '|---|---|']
for s in ('read', 'fetched, not read', 'unusable', 'no captions', 'blocked'):
    out.append('| %s | %d |' % (s, cnt[s]))
out += ['| total | %d |' % len(top), '',
 'Mix by kind: %d reading/alphabet/vowels, %d prayer/Torah reading, %d Israeli conversation and vocabulary.' % (k['reading'], k['prayer'], k['israeli']), '',
 '- read: captions downloaded and read by me; notes in `notes.md`.',
 '- blocked: YouTube answered HTTP 429 (too many requests) or a sign-in bot check to every caption request after the first few. `tools/youtube/fetch.py` backs off (3 to 15 minutes, growing) and retries; whatever it could not fetch inside this session is listed as blocked, which says nothing about whether the video has captions.',
 '- no captions: yt-dlp reported no English captions for the video.',
 '- The three Hebrew For Beginners playlists (alphabet, vowels, handwriting) were read in an earlier pass and are written up in `docs/resources/youtube-hfb-playlists.md`; they are not counted in the 100 above except where an individual lesson ranked in it.', '',
 '## The table', '',
 'Rank is the order from the relevance-and-views score, not a quality ranking.', '',
 '| # | Title | Channel | Length | Views | Kind | URL | Captions |', '|---|---|---|---|---|---|---|---|'] + rows + ['']
open(os.path.expanduser('~/alef/docs/youtube/top100.md'), 'w').write('\n'.join(out))
print(dict(cnt))
