import json, unicodedata, re, glob
import os
ROOT=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','..'))
PUNCT = re.compile(r"[,\.\?\!:;\"'()\[\]׃׀׀׃…\-–—״]+")
TAAM = re.compile(r"[֑-ֽֿׅ֯ׄ]")
def norm(s):
    s = unicodedata.normalize('NFC', s)
    s = TAAM.sub('', s)
    return s
def tokens(s):
    s = norm(s).replace('־',' ')
    s = PUNCT.sub(' ', s)
    return [t for t in s.split() if re.search(r'[א-ת]', t)]
def phrase_key(s):
    return ' '.join(tokens(s))
def walk(o, out):
    if isinstance(o, str):
        if re.search(r'[א-ת]', o): out.append(o)
    elif isinstance(o, dict):
        for v in o.values(): walk(v, out)
    elif isinstance(o, list):
        for v in o: walk(v, out)
def load():
    strings = []
    w = json.load(open(f'{ROOT}/data/vocab/words.json'))
    walk(w['words'], strings)
    for f in glob.glob(f'{ROOT}/data/corpus/*.json') + glob.glob(f'{ROOT}/data/service/*.json'):
        walk(json.load(open(f)), strings)
    toks = set(); phrases = set()
    for s in strings:
        for t in tokens(s): toks.add(t)
        phrases.add(phrase_key(s))
    return toks, phrases, w['words']
