"""usage: grep.py REGEX VIDEO_ID... : print 36-word windows around matches (max 5 per video)."""
import re, sys
R = '/home/claude/research_notes/youtube/all_txt/'
rx = re.compile(sys.argv[1], re.I)
for vid in sys.argv[2:]:
    w = open(R + vid + '.txt').read().split(); print('==', vid, len(w))
    n = 0; i = 0
    while i < len(w) and n < 5:
        if rx.search(w[i]): print('  ..', ' '.join(w[max(0, i - 14):i + 26])); n += 1; i += 60
        else: i += 1
