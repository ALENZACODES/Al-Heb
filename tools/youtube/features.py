"""Extract simple per-video features from cleaned captions: order of first mention of letter names and vowel names, plus topic flags.
Output: research_notes/youtube/features.json (not committed). Features are keyword-detected from machine captions, so they are rough."""
import re, json, glob, os
R = os.path.expanduser('~/research_notes/youtube/')
L = {'alef':r'a?le+ph?|alef|olive|aleph','bet':r'\bbe[iy]?t\b|\bbait\b|\bbeth\b|\bbeit\b','gimel':r'gimel|gimmel','dalet':r'dalet|dalid|daleth','he':r'\bhey\b|\bhay\b|\bheh?\b','vav':r'\bvav\b|\bwaw\b','zayin':r'zayin|zion','chet':r'\bch[e]?t\b|\bhet\b|\bkhet\b|\bchat\b|\bhes\b','tet':r'\btet\b|\bteth\b','yud':r'\byud\b|\byod\b|\byood\b','kaf':r'\bka[fv]\b|\bkaph\b|\bkoff?\b','lamed':r'lamed|lamad','mem':r'\bmem\b','nun':r'\bnun\b','samech':r'samech|samekh|sameh|samek','ayin':r'\bayin\b|\bain\b|\beyin\b','pey':r'\bpey\b|\bpe\b|\bpay\b|\bfey\b','tsadi':r'tsadi|tzadi|tsade|tzaddik|sadi','kuf':r'\bku[fp]\b|\bqof\b|\bkoof\b|\bqoph\b','resh':r'\bresh\b|\brash\b','shin':r'\bshin\b|\bsheen\b','tav':r'\btav\b|\btaf\b|\btaw\b'}
V = {'kamatz':r'kamat[sz]|qamat[sz]|kamets|komets|camets','patach':r'patach|pataḥ|patakh','tzere':r'tz?ere|tsere|zeyre|tzeire','segol':r'segol|seagull','chirik':r'chirik|hirik|hiriq|chireek','cholam':r'cholam|holam|kholam','kubutz':r'kubut[sz]|qibbut[sz]|kibbut[sz]|kubbut[sz]','shuruk':r'shuruk|shurek|shoorook','shva':r'shva|sheva|shewa|schwa|shwa'}
rows = {}
for f in glob.glob(R + 'all_txt/*.txt'):
    vid = os.path.basename(f)[:-4]; t = open(f).read().lower(); n = len(t.split())
    def order(d):
        pos = {}
        for k, rx in d.items():
            m = re.search(rx, t)
            if m: pos[k] = m.start()
        return [k for k, _ in sorted(pos.items(), key=lambda x: x[1])]
    fl = {k: bool(re.search(rx, t)) for k, rx in {
        'shva': V['shva'], 'final': r'final (form|letter)|sofit|sofits|at the end of (a|the) word', 'dagesh': r'dagesh|daguesh|degesh|de guiche',
        'silent': r'silent', 'shinsin': r'\bsin\b|\bseen\b', 'stress': r'stress|accent|emphasis', 'mater': r'mater|vowel letter|letters? (as|for) (a )?vowel',
        'shortlong': r'short (e|a|i|o|u|vowel)|long (e|a|i|o|u|vowel)', 'cursive': r'cursive|handwrit', 'translit': r'transliterat', 'ashk': r'ashkenaz', 'sephard': r'sephard|sefard',
        'rtl': r'right to left|right-to-left', 'writing': r'stroke|write|writing', 'trope': r'trope|cantillat|taamim'}.items()}
    rows[vid] = dict(words=n, letters=order(L), vowels=order(V), flags=fl)
json.dump(rows, open(R + 'features.json', 'w'), indent=0)
for v, r in sorted(rows.items(), key=lambda x: -x[1]['words']):
    print(v, r['words'], ''.join(k[0] for k in r['letters'])[:0], len(r['letters']), r['vowels'], [k for k, x in r['flags'].items() if x])
