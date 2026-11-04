"""Print a short skim of cleaned caption text (research aid; output is for the reader's eyes, not committed)."""
import re, sys
R = '/home/claude/research_notes/youtube/all_txt/'
KW = re.compile(r'shva|sheva|schwa|silent|final|sofit|dagesh|kamatz|qamats|patach|stress|vav|yud|mater|remember|mnemonic|looks like|shin|sin\b|trick|dot|ending|syllable|accent|ashkenaz|sephard|israeli|modern|vowel', re.I)
for vid in sys.argv[2:]:
    t = open(R + vid + '.txt').read()
    w = t.split()
    print('=====', vid, len(w), 'words')
    print(' '.join(w[:int(sys.argv[1])]))
    sents = re.split(r'(?<=[.!?])\s+|\s{2,}', t)
    # captions have no punctuation: window by 40 words around keywords
    seen = 0; i = int(sys.argv[1])
    out = []
    while i < len(w) and len(out) < 7:
        if KW.search(w[i]):
            out.append(' '.join(w[max(0, i - 12):i + 28])); i += 150
        else: i += 1
    for o in out: print('  ..', o)
