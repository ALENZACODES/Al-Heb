import re, unicodedata

def normalize(text):
    text=unicodedata.normalize('NFD',text).lower()
    text=''.join(c for c in text if unicodedata.category(c)!='Mn')
    return re.sub(r'[^\u05d0-\u05ea a-z0-9]', ' ',text).split()

def distance(a,b):
    row=list(range(len(b)+1))
    for i,x in enumerate(a,1):
        nxt=[i]
        for j,y in enumerate(b,1):nxt.append(min(nxt[-1]+1,row[j]+1,row[j-1]+(x!=y)))
        row=nxt
    return row[-1]
