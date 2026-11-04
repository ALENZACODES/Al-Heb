"""Pick the top ~100 instructional Hebrew-learning videos from the earlier candidate pool.
Reads /home/claude/research_notes/youtube/ranked_cand.json (made by an earlier search pass with yt-dlp ytsearch).
Writes research_notes/youtube/top100.json. Songs, kids' letter clips, Bible-commentary and pure vlogs are dropped by hand-list below."""
import json, re
R = '/home/claude/research_notes/youtube/'
c = json.load(open(R + 'ranked_cand.json'))
drop_ids = set('d57jv2bvyj8 wxO09BUrkMk Njv3SsfLVEw oDerYmk3SJ0 XX5578jAZv0 BK6kOipwljw --fU9qnMT6c 8XzixYmtKYI 8fHNPNViTpM E-GI7prZGnI qm1ShHOVbog rfRwuOSsw68 BUJ1qDGbelQ 5vGQfacLLsQ r961X6FXwpw Q_h541RkCTI lqIYu1us_zg CzsUzCpMqfg W1K1-JY6hXc 1iwUJEFEI9A r69c84WjzDc M7HNWJE_O2Y PoGL0dpUbCc kz-y5oV6_-Q pW-E4aFAA0o'.split())
drop_re = re.compile(r'hebrews|culture test|vlog', re.I)
sel = [p for p in c if p['id'] not in drop_ids and not drop_re.search(p['title'])]
sel = sel[:100]
def kind(p):
    t = p['title'].lower()
    if re.search(r'shema|kaddish|aleinu|ashrei|amidah|modeh|ve.ahavta|prayer|trope|cantillation|torah|chant', t): return 'prayer'
    if re.search(r'alphabet|alef|letters|vowel|nikud|sheva|dagesh|cursive|handwrit|read|writ|resh|final|pronunc|syllable', t): return 'reading'
    return 'israeli'
for p in sel: p['kind'] = kind(p)
json.dump(sel, open(R + 'top100.json', 'w'), ensure_ascii=False, indent=1)
print(len(sel), {k: sum(1 for p in sel if p['kind'] == k) for k in ('reading', 'prayer', 'israeli')})
