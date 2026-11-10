import os
import sys, json, glob
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import sources
ROOT=sources.ROOT
targets=sys.argv[1:]
def walk(o, path, out):
    if isinstance(o, str):
        toks=sources.tokens(o)
        for t in targets:
            if t in toks: out.append((t, path, o[:120]))
    elif isinstance(o, dict):
        for k,v in o.items(): walk(v, path+'.'+k, out)
    elif isinstance(o, list):
        for i,v in enumerate(o): walk(v, path+f'[{i}]', out)
out=[]
w=json.load(open(f'{ROOT}/data/vocab/words.json'))
walk(w['words'],'words',out)
for f in glob.glob(f'{ROOT}/data/corpus/*.json')+glob.glob(f'{ROOT}/data/service/*.json'):
    walk(json.load(open(f)), f.split('/')[-1], out)
seen=set()
for t,p,s in out:
    if (t,s) in seen: continue
    seen.add((t,s)); print(t,'|',p[:60],'|',s)
