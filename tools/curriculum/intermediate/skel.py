import os
import sys,re
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import sources
toks,phr,words=sources.load()
strip=lambda t: re.sub(r'[ְ-ׇ]','',t)
idx={}
for t in toks: idx.setdefault(strip(t),set()).add(t)
for a in sys.argv[1:]:
    print(a,'->',' '.join(sorted(idx.get(a,[]))))
