import os
import sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import sources
toks,phr,words=sources.load()
for line in sys.stdin:
    s=line.strip()
    if not s: continue
    if sources.phrase_key(s) in phr: print('PHRASE ', s); continue
    miss=[t for t in sources.tokens(s) if t not in toks]
    print(('ok      ' if not miss else 'MISSING '+' '.join(miss)+'  <- '), s)
