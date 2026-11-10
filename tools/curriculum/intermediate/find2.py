import sys,os,re
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import sources
toks,phr,words=sources.load()
strip=lambda t: re.sub(r'[ְ-ׇ]','',t)
idx={}
for t in toks: idx.setdefault(strip(t),set()).add(t)
gl={}
for w in words: gl.setdefault(strip(sources.tokens(w['he'])[0]) if sources.tokens(w['he']) else '',[]).append(w['en'][:25])
for a in sys.argv[1:]:
    print(a,'->',' '.join(sorted(idx.get(a,[]))), '|', '; '.join(gl.get(a,[])[:2]))
