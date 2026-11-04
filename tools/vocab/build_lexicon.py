#!/usr/bin/env python3
"""Stage 1 of the ALEF vocabulary pipeline (stdlib only).

Reads the cached raw sources (tools/vocab/fetch.py) and writes tools/vocab/.cache/stage.json:
the selected lemma entries with dictionary data (pointed form, glosses, pos, gender, forms, root, ipa),
modern (OpenSubtitles) and biblical/liturgical (UXLC + prayer registry) frequency scores,
topic tags and a Tatoeba / UXLC example candidate.  Stage 2 (build_words.mjs) adds transliteration,
levels, ids, unlock lessons and writes data/vocab/*.

Run:  python3 -I tools/vocab/build_lexicon.py
Every heuristic here is documented in docs/vocab/METHOD.md.  Nothing is invented: pointing, glosses,
gender, root and IPA are copied from the Wiktionary extract (CC BY-SA); a word with no pointing in the
extract is dropped (it is NOT auto-vowelized in this build).
"""
import collections, json, os, re, sys, unicodedata
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CACHE = os.path.join(HERE, '.cache')

N_MODERN = int(os.environ.get('N_MODERN', 4300))     # top lemmas by modern frequency
N_READ = int(os.environ.get('N_READ', 2000))         # top lemmas by biblical/liturgical score

NIQ = re.compile('[֑-ׇ]')
HEBLET = re.compile('^[א-ת]+$')
ACCENTS = re.compile('[֑-ֽֿ֯׀ׅׄ͏​-‏⁠﻿]')


def strip(s):
    return NIQ.sub('', s).replace('־', '').replace('ֽ', '')


def clean_pointed(s):
    s = ACCENTS.sub('', s)
    s = s.replace('ֺ', 'ֹ').replace('־', '').replace('־', '')
    s = s.replace('׃', '')
    return unicodedata.normalize('NFC', s.strip())


def skeleton(s):
    # consonants minus matres lectionis, for a coarse pointed/unpointed consistency check
    return ''.join(c for c in strip(s) if c not in 'וי' and c not in 'ךםןףץ' or c in 'ךםןףץ').translate(
        str.maketrans('ךםןףץ', 'כמנפצ'))


# ------------------------------------------------------------------ dictionary
SKIP_POS = {'name', 'root', 'character', 'symbol', 'suffix', 'prefix', 'infix', 'punct', 'circumfix', 'contraction',
            'abbrev', 'article', 'postp', 'combining_form', 'interfix', 'affix'}
POS_MAP = {'noun': 'noun', 'verb': 'verb', 'adj': 'adj', 'adv': 'adv', 'prep': 'prep', 'conj': 'conj', 'pron': 'pron',
           'num': 'num', 'intj': 'intj', 'particle': 'particle', 'det': 'det', 'phrase': 'phrase',
           'prep_phrase': 'phrase', 'proverb': 'phrase'}
BAD_GLOSS = re.compile(r'^(alternative|defective|plene|obsolete|dated|archaic|nonstandard|misspelling|eye dialect|'
                       r'informal spelling|romanization|abbreviation of|acronym of|initialism of|clipping of|'
                       r'pronunciation spelling|synonym of|apocopic|short for|contraction of|form of|inflection of|'
                       r'masculine singular|feminine singular|plural of|singular of|construct)', re.I)
DROP_SENSE_TAGS = {'misspelling', 'alt-of', 'form-of', 'obsolete', 'nonstandard', 'error-lexical-entry',
                   'no-gloss', 'vulgar', 'offensive', 'derogatory', 'ethnic-slur'}
TAG_REG = {'colloquial': 'colloquial', 'slang': 'slang', 'literary': 'literary', 'Biblical': 'biblical',
           'archaic': 'archaic', 'dated': 'dated', 'Mishnaic': 'mishnaic', 'formal': 'formal', 'rare': 'rare',
           'poetic': 'poetic', 'Modern-Israeli': None}


COMMON_START = {'Not', 'To', 'A', 'An', 'The', 'Used', 'Of', 'With', 'On', 'In', 'If', 'Or', 'Either', 'You', 'Thou',
                'We', 'She', 'He', 'It', 'This', 'That', 'No', 'Yes', 'Who', 'What', 'Which', 'Be', 'Such', 'So', 'Then',
                'Because', 'And', 'But', 'At', 'By', 'For', 'From', 'Into', 'Out', 'Up', 'Down', 'About', 'Near', 'Like',
                'Here', 'There', 'Now', 'Very', 'More', 'Most', 'Much', 'Many', 'Some', 'Any', 'All', 'Each', 'Every',
                'Only', 'Also', 'Even', 'Just', 'Still', 'Already', 'Again', 'Away', 'After', 'Before', 'Between',
                'Under', 'Over', 'Without', 'Within', 'During', 'Until', 'Since', 'Whether', 'Whoever', 'Whatever',
                'Something', 'Someone', 'Nothing', 'Anything', 'Everything', 'Everyone', 'My', 'Your', 'His', 'Her',
                'Our', 'Their', 'I', 'They', 'Them', 'Me', 'Him', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
                'Eight', 'Nine', 'Ten', 'Not', 'Do', 'Make', 'Take', 'Give', 'Go', 'Come', 'Have', 'Get', 'Put', 'Let'}


PROPER = re.compile(r'^(Israel|Jew|Hebrew|Arab|Torah|Shabbat|Sabbath|Passover|Pesach|God|Lord|Jerusalem|Christ|Muslim|Islam|Moses|Abraham|Isaac|Jacob|Egypt|Sinai|Zion|Messiah|Levit|Hanukkah|Purim|Sukkot|Shavuot|Rosh|Yom|Tel|Haifa|Palestin|Judah|Juda|Talmud|Mishna|Bible|Biblic|Yiddish|Ladino|Aramaic|Greek|English|French|German|Russian|Spanish|American|Europe|Asia|Afric|Canad|Turk|Pers|Roman|Latin|Ottoman|Sephard|Ashkenaz|Mizrah|Ethiop|Iran|Iraq|Syria|Leban|Jordan|Gaza|Sodom|Babylon|Assyria|Philistin|Canaan|Edom|Moab|Ammon|January|February|March|April|May|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Adam|Eve|Noah|David|Solomon|Samuel|Elijah|Satan|Amen|Cheshvan|Marcheshvan|Kislev|Tevet|Shevat|Adar|Nisan|Iyar|Sivan|Tammuz|Av|Elul|Tishrei|Hasid|Kabbal|Zohar|Sefer|Halakh|Kaddish|Kiddush|Havdalah|Seder|Haggadah|Kosher|Kasher|Mitzv|Rabbi|Cohen|Kohen|Goy|Gentile|Christian|Catholic|Orthodox|Reform|Conservative|Zionis|Kibbutz|Moshav|Knesset|Tanakh|Tanach|Pentateuch|Genesis|Exodus|Leviticus|Numbers|Deuteronomy)')


def clean_gloss(g):
    """-> (gloss, note).  Keeps the first clause; long parentheticals and later clauses go to the note."""
    g = re.sub(r'\s+', ' ', g.strip())
    note = None
    m = re.match(r'^(.*?)\s*\((.{26,})\)\s*$', g)
    if m:
        g, note = m.group(1), m.group(2)
    parts = re.split(r'\s*;\s+|:\s+', g, maxsplit=1)
    if len(parts) == 2 and len(parts[0]) >= 2:
        g, note = parts[0], (parts[1] if not note else note)
    g = g.rstrip(' .:;,')
    first = g.split(' ')[0].rstrip(',')
    if len(g) > 1 and g[0].isupper() and g[1].islower() and not PROPER.match(first):
        g = g[0].lower() + g[1:]
    return g, note


def has_niq(s):
    return bool(s and NIQ.search(s))


def tags_of(f):
    return set(f.get('tags', []))


def first_form(d, need, forbid=(), pointed=True):
    for f in d.get('forms', []):
        t = tags_of(f)
        if need <= t and not (t & set(forbid)) and (has_niq(f['form']) or not pointed):
            return f['form']
    return None


def load_dictionary():
    ents = []                      # selectable entities
    formof = collections.defaultdict(set)   # unpointed form -> {target unpointed headword}
    nsense = 0
    path = os.path.join(CACHE, 'kaikki-hebrew.jsonl')
    order = 0
    for line in open(path, encoding='utf8'):
        d = json.loads(line)
        order += 1
        pos = d.get('pos')
        w = d.get('word', '')
        bound = w.endswith('־') and pos in ('prep', 'conj', 'particle', 'det')
        if bound:
            w = w[:-1]
        if pos in SKIP_POS or not HEBLET.match(w):
            continue
        senses = d.get('senses', [])
        # inflected-form / alternative-spelling entries only feed the form -> lemma map
        real = []
        for s in senses:
            if 'form_of' in s or 'alt_of' in s:
                for k in ('form_of', 'alt_of'):
                    for t in s.get(k, []):
                        tw = strip(t.get('word', ''))
                        if HEBLET.match(tw) and tw != w:
                            formof[w].add(tw)
                continue
            if not s.get('glosses'):
                continue
            tg = set(s.get('tags', [])) | set(s.get('raw_tags', []))
            if tg & DROP_SENSE_TAGS:
                continue
            real.append(s)
        if not real:
            continue
        if pos not in POS_MAP:
            continue
        ht = (d.get('head_templates') or [{}])[0].get('args', {})
        pointed = None
        cands = [ht.get('wv'), ht.get('dwv'), ht.get('head')]
        for f in d.get('forms', []):
            if 'canonical' in tags_of(f):
                cands.append(f['form'])
        for c in cands:
            if c and has_niq(c) and ' ' not in c.strip():
                c = clean_pointed(c)
                if skeleton(c) == skeleton(w):
                    pointed = c
                    break
        glosses = []
        regs = []
        sense_tags = set()
        primary_tags = None
        for s in real:
            tg = set(s.get('tags', [])) | set(s.get('raw_tags', []))
            sense_tags |= tg
            if primary_tags is None:
                primary_tags = set(tg)
            g0 = s['glosses'][0].strip()
            if (not g0 or BAD_GLOSS.match(g0) or len(g0) > 140 or re.search(r'\b(of|for|to) [\u0590-\u05FF]', g0)
                    or re.search(r'(infinitive|imperative|participle|tense|conjugation|form|plural|singular|construct state|possessive)\b.* of\b', g0)):
                continue
            g, note = clean_gloss(g0)
            if not g or len(g) > 80 or g.startswith('('):
                continue
            glosses.append((g, sorted(tg), note))
        if not glosses:
            continue
        e = {
            'order': order,
            'word': w, 'pointed': pointed, 'pos': POS_MAP[pos], 'kpos': pos,
            'glosses': glosses,
            'ety': d.get('etymology_number'), 'bound': bound,
            'primaryTags': sorted(primary_tags or []),
        }
        # gender / number (nouns)
        g = ht.get('g', '')
        if pos == 'noun':
            gm = ('m' in g.replace('mf', 'm-f')) if g else False
            gf = ('f' in g) if g else False
            e['gender'] = 'mf' if (gm and gf) else ('m' if gm else ('f' if gf else None))
            if '-p' in g or g.endswith('p') and len(g) > 1:
                e['plural_only'] = True
            if any('pluralia tantum' in c.get('name', '') for s in real for c in s.get('categories', [])):
                e['plural_only'] = True
        # root
        for t in d.get('etymology_templates', []):
            if t.get('name') == 'he-rootbox' and t.get('args', {}).get('1'):
                e['root'] = unicodedata.normalize('NFC', t['args']['1'])
                break
        # binyan
        for tg in sense_tags:
            if tg.startswith('construction-'):
                e['binyan'] = tg[len('construction-'):]
        # morphological forms (pointed, copied from the extract)
        fm = {}
        if pos == 'noun':
            fm['plural'] = first_form(d, {'indefinite', 'plural'}, ['possessed-form', 'construct']) or None
            fm['feminine'] = first_form(d, {'feminine'}, ['possessed-form', 'plural', 'construct', 'singular',
                                                          'indefinite', 'definite', 'masculine'])
        elif pos == 'adj':
            fm['feminine'] = first_form(d, {'feminine', 'singular'}, ['construct', 'possessed-form', 'definite'])
            fm['plural'] = first_form(d, {'masculine', 'plural'}, ['construct', 'possessed-form', 'feminine', 'definite'])
        elif pos == 'verb':
            fm['present'] = first_form(d, {'present', 'masculine', 'singular'}, ['participle-passive'])
            fm['future'] = first_form(d, {'future', 'third-person', 'masculine', 'singular'}) or (
                clean_pointed(ht['futdwv']) if ht.get('futdwv') else None)
            inf = None
            for f in d.get('forms', []):
                t = tags_of(f)
                if ('infinitive' in t or 'error-unrecognized-form' in t) and has_niq(f['form']) and f['form'].startswith('ל'):
                    inf = f['form']
                    break
            fm['infinitive'] = inf
        fm = {k: clean_pointed(v) for k, v in fm.items() if v and has_niq(v) and ' ' not in v.strip()}
        if fm:
            e['forms'] = fm
        # IPA (Modern Israeli) and Wiktionary romanisation (kept for the consistency check only)
        for sd in d.get('sounds', []):
            if 'Modern-Israeli' in (sd.get('tags') or []) and sd.get('ipa'):
                e['ipa'] = sd['ipa']
                break
        tr = ht.get('tr')
        if tr:
            e['wikiTr'] = tr
        # topical hints from Wiktionary categories/topics
        cats = set()
        for s in real:
            for c in s.get('categories', []):
                cats.add(c['name'])
            for tp in s.get('topics', []):
                cats.add('topic:' + tp)
        e['cats'] = sorted(cats)
        e['senseTags'] = sorted(sense_tags)
        # surface forms (unpointed) of this entity for frequency attribution
        forms = {w}
        pforms = set()
        for f in d.get('forms', []):
            t = tags_of(f)
            if t & {'romanization', 'table-tags', 'inflection-template', 'class'}:
                continue
            fs = f['form'].replace('־', '')
            if has_niq(fs):
                pforms.add(clean_pointed(fs))
            u = strip(fs)
            if HEBLET.match(u):
                forms.add(u)
        e['forms_u'] = sorted(forms)
        e['forms_p'] = sorted(pforms | ({pointed} if pointed else set()))
        ents.append(e)
    return ents, formof


def merge_entities(ents):
    """Merge entries with identical (word, pointed, pos): union glosses/forms."""
    by = collections.OrderedDict()
    for e in ents:
        k = (e['word'], e['pointed'], e['pos'], e.get('bound', False))
        if k in by:
            m = by[k]
            m['glosses'] += e['glosses']
            m['forms_u'] = sorted(set(m['forms_u']) | set(e['forms_u']))
            m['forms_p'] = sorted(set(m['forms_p']) | set(e['forms_p']))
            m['cats'] = sorted(set(m['cats']) | set(e['cats']))
            m['senseTags'] = sorted(set(m['senseTags']) | set(e['senseTags']))
            m['primaryTags'] = sorted(set(m.get('primaryTags', [])) & set(e.get('primaryTags', [])))
            for kk in ('gender', 'root', 'ipa', 'wikiTr', 'binyan', 'forms', 'plural_only'):
                if kk not in m and kk in e:
                    m[kk] = e[kk]
        else:
            by[k] = dict(e)
    out = list(by.values())
    for i, e in enumerate(out):
        e['eid'] = i
    return out


# ------------------------------------------------------------------ attribution of tokens to entities
PREFIX = set('והבכלמש')


POS_PRIOR = {'pron': 3.0, 'prep': 3.0, 'conj': 3.0, 'det': 3.0, 'particle': 3.0, 'adv': 2.5, 'num': 1.5,
             'verb': 1.2, 'adj': 1.0, 'noun': 1.0, 'intj': 0.4, 'phrase': 0.7}


def prior(e):
    """Prior weight of an entity when a token is ambiguous (documented in METHOD.md)."""
    p = POS_PRIOR.get(e['pos'], 1.0) * (1 + 0.15 * min(len(e['glosses']), 6))
    st = set(e.get('primaryTags', e['senseTags']))
    if st & {'archaic', 'rare', 'dated', 'Biblical', 'literary', 'poetic', 'Mishnaic'}:
        p *= 0.25
    if 'slang' in st:
        p *= 0.6
    return p


class Index:
    def __init__(self, ents, formof):
        self.ents = ents
        self.byform = collections.defaultdict(list)   # unpointed form -> [(eid, isHeadword)]
        self.byhead = collections.defaultdict(list)
        self.bypform = collections.defaultdict(list)  # pointed form -> [eid]
        seen = set()
        for e in ents:
            if ' ' in e['word']:
                continue
            self.byhead[e['word']].append(e['eid'])
            for f in e['forms_u']:
                if (f, e['eid']) in seen:
                    continue
                seen.add((f, e['eid']))
                self.byform[f].append((e['eid'], f == e['word']))
            for f in e['forms_p']:
                self.bypform[f].append(e['eid'])
        self.formof = formof

    def candidates(self, tok):
        """-> list of (eid, weight) for an unpointed token (no prefix handling)."""
        out = {}
        for eid, ishead in self.byform.get(tok, []):
            e = self.ents[eid]
            w = (1.5 if ishead else 1.0) * prior(e)
            out[eid] = out.get(eid, 0) + w
        if not out:
            for tw in self.formof.get(tok, ()):
                for eid in self.byhead.get(tw, []):
                    out[eid] = out.get(eid, 0) + 0.7 * prior(self.ents[eid])
        return list(out.items())

    def resolve(self, tok):
        """Direct reading plus prefix-peeled readings (ve-, ha-, be-, le-, me-, she-, ke-), pooled; the EM step
        decides between them (e.g. 'hazeh' = ha + zeh rather than the verb hizah).  -> (candidates, how)"""
        pool = {}
        how = 'none'
        for eid, w in self.candidates(tok):
            pool[eid] = pool.get(eid, 0) + w
            how = 'direct'
        t = tok
        for lvl in range(1, 4):
            if len(t) > 2 and t[0] in PREFIX:
                t = t[1:]
                for eid, w in self.candidates(t):
                    pool[eid] = pool.get(eid, 0) + w * (0.6 ** lvl)
                    if how == 'none':
                        how = 'prefix'
            else:
                break
        return list(pool.items()), how


# ------------------------------------------------------------------ EM attribution
def em(tokcands, counts, iters=10):
    """Leave-one-out EM of ambiguous token counts over candidate entities.
    pi(E) = smoothed mass of E.  A token's count is split over its candidates in proportion to
    w * pi_without_this_token(E): each token is judged by the evidence of the OTHER forms of each candidate
    (e.g. the object marker et has otí/otcha/..., the homograph 'shovel' has nothing), so an entity cannot
    capture a token just by already holding it."""
    shares = {}
    for k, cs in tokcands.items():
        if len(cs) > 1:
            z = sum(w for _, w in cs)
            shares[k] = [w / z for _, w in cs]
    score = {}
    for it in range(iters):
        score = collections.defaultdict(float)
        for k, cs in tokcands.items():
            c = counts[k]
            if len(cs) == 1:
                score[cs[0][0]] += c
            else:
                for (e, _), sh in zip(cs, shares[k]):
                    score[e] += c * sh
        new = {}
        for k, sh in shares.items():
            cs = tokcands[k]
            c = counts[k]
            raw = [w * (max(0.0, score.get(e, 0.0) - c * s_) + 1.0) for (e, w), s_ in zip(cs, sh)]
            z = sum(raw)
            new[k] = [0.5 * s_ + 0.5 * r / z for s_, r in zip(sh, raw)]   # damped
        shares = new
    pi = {e: v + 1.0 for e, v in score.items()}
    return score, (pi, shares)


def share_of(key, cs, state):
    """posterior share of each candidate for a token key (uses the final EM state)."""
    pi, shares = state
    if key in shares:
        return {e: s_ for (e, _), s_ in zip(cs, shares[key])}
    z = sum(w for _, w in cs)
    return {e: w / z for e, w in cs}


def modern_scores(idx):
    tokcands, counts = {}, {}
    covered = total = 0
    path = os.path.join(CACHE, 'he_full.txt')
    for line in open(path, encoding='utf8'):
        parts = line.split()
        if len(parts) != 2:
            continue
        tok, cnt = parts[0], int(parts[1])
        total += cnt
        if not HEBLET.match(tok):
            continue
        c, how = idx.resolve(tok)
        if not c:
            continue
        covered += cnt
        tokcands[tok] = c
        counts[tok] = cnt
    score, pi = em(tokcands, counts)
    nforms = collections.Counter()
    for k, cs in tokcands.items():
        for e, _ in cs:
            nforms[e] += 1
    return score, nforms, covered, total, pi


# ------------------------------------------------------------------ biblical / liturgical
PRE_RE = re.compile('^([ובכלמהש])([ְ-ּׁׂ]*)')
BOOKS_TORAH = {'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'}


def node_text(el):
    t = el.text or ''
    for ch in el:
        if ch.tag == 'x':
            t += ch.tail or ''
        else:
            t += node_text(ch) + (ch.tail or '')
    return t


def parse_tanakh():
    """-> list of (book, chapter, verse, [pointed words])"""
    out = []
    d = os.path.join(CACHE, 'tanach')
    for fn in sorted(os.listdir(d)):
        book = fn[:-4]
        root = ET.parse(os.path.join(d, fn)).getroot()
        for c in root.iter('c'):
            for v in c.iter('v'):
                ws = []
                for ch in v:
                    if ch.tag == 'w' or ch.tag == 'q':
                        t = clean_pointed(node_text(ch))
                        if t:
                            ws.append(t)
                out.append((book, c.get('n'), v.get('n'), ws))
    return out


def peel_pointed(word):
    """yield the word and then progressively prefix-peeled remainders (pointed)."""
    yield word, 0
    w = word
    for k in range(1, 4):
        m = PRE_RE.match(w)
        if not m or len(w) <= len(m.group(0)) + 1:
            return
        # a prefix cluster must carry a vowel/shva (not a bare root letter followed directly by next letter)
        if not m.group(2):
            return
        w = w[len(m.group(0)):]
        yield w, k


def biblical_scores(idx, registry):
    btok = {}   # resolved pointed key -> info
    unresolved = collections.Counter()
    state = {'resolved': 0.0, 'total': 0.0}

    def attribute(word, kind, weight, ref=None, vtext=None, vlen=None):
        state['total'] += weight
        if word in btok:
            t = btok[word]
        else:
            pool = {}
            for cand, k in peel_pointed(word):
                hits = idx.bypform.get(cand)
                if hits:
                    cs = [(eid, 1.5 * prior(idx.ents[eid])) for eid in sorted(set(hits))]
                else:
                    cs = idx.candidates(strip(cand))
                for eid, w in cs:
                    pool[eid] = pool.get(eid, 0) + w * (0.6 ** k)
            if not pool:
                unresolved[word] += weight
                return
            t = btok[word] = {'cands': list(pool.items()), 'torah': 0.0, 'other': 0.0, 'prayer': 0.0, 'verses': []}
        t[kind] += weight
        if ref and vlen is not None and vlen <= 8:
            t['verses'].append((vlen, ref, vtext))
            t['verses'] = sorted(t['verses'])[:3]
        state['resolved'] += weight

    for book, c, v, ws in parse_tanakh():
        kind = 'torah' if book in BOOKS_TORAH else 'other'
        wt = 1.2 if (book == 'Psalms') else 1.0
        ref = '%s %s:%s' % (book.replace('_1', ' 1').replace('_2', ' 2').replace('_', ' '), c, v)
        vtext = ' '.join(ws)
        for w in ws:
            attribute(w, kind, wt, ref, vtext, len(ws))
    for r in registry:
        for w in r['he'].replace('\u05BE', ' ').replace('\u05C3', ' ').split():
            w = clean_pointed(w)
            if w:
                attribute(w, 'prayer', 1.0)
    tokcands = {k: t['cands'] for k, t in btok.items()}
    counts = {k: 2.0 * t['torah'] + 0.6 * t['other'] + 9.0 * t['prayer'] for k, t in btok.items()}
    _, pi = em(tokcands, counts)
    torah = collections.defaultdict(float)
    other = collections.defaultdict(float)
    prayer = collections.defaultdict(float)
    best_verse = {}
    for k, t in btok.items():
        sh = share_of(k, t['cands'], pi)
        for e, p in sh.items():
            torah[e] += t['torah'] * p
            other[e] += t['other'] * p
            prayer[e] += t['prayer'] * p
            if t['verses'] and p >= 0.5:
                vl, ref, vt = t['verses'][0]
                bv = best_verse.get(e)
                if bv is None or vl < bv[0]:
                    best_verse[e] = (vl, ref, vt, k, p)
    return torah, other, prayer, best_verse, state['resolved'], state['total'], unresolved


# ------------------------------------------------------------------ topics
TOPIC_CAT = [
    (r'^(Anatomy|Body parts|Medicine|Pathology|Diseases|Health)', 'body-health'),
    (r'^(Fruits|Vegetables|Foods|Food and drink|Beverages|Cooking|Spices|Drinks|Dishes|Meat|Dairy|Baking)', 'food-drink'),
    (r'^(Animals|Birds|Fish|Mammals|Insects|Plants|Trees|Flowers|Reptiles|Botany|Zoology|Landforms|Geology|Weather)', 'nature-animals'),
    (r'^(Family|Kinship|People|Occupations|Relationships)', 'people-family'),
    (r'^(Judaism|Bible|Biblical characters|Books of the Bible|Jewish law|Hebrew terms in Judaism|Prayer|Religion|Christianity|Islam|Mysticism)|^topic:(religion|biblical|mysticism)', 'religion-prayer'),
    (r'^(Colors|Clothing|Fashion|Textiles|Jewelry)|^topic:(clothing|fashion)', 'clothes-shopping'),
    (r'^(Time|Days of the week|Months|Seasons|Hebrew cardinal numbers|Hebrew ordinal numbers|Numbers|Units of time)', 'time-numbers'),
    (r'^(Countries|Cities|National capitals|Places in Israel|Geography|Transport|Vehicles|Buildings|Architecture)|^topic:(geography|transport|nautical)', 'places-travel'),
    (r'^(Computing|Computer|Internet|Electronics|Telecommunications|Media|Broadcasting|Publishing)|^topic:(computing|media|broadcasting|communications|publishing)', 'tech-media'),
    (r'^(Business|Economics|Finance|Money|Banking|Law|Politics|Government|Military|War)|^topic:(business|law|government|politics|military|war)', 'society-work-law'),
    (r'^(Mathematics|Geometry|Physics|Chemistry|Chemical elements|Astronomy|Biology|Engineering|Science|Linguistics|Grammar|Philosophy|Psychology)|^topic:(mathematics|physics|chemistry|astronomy|biology|engineering|sciences|natural-sciences|physical-sciences|geometry|linguistics|grammar|philosophy|psychology|electricity|energy|taxonomy)', 'science-ideas'),
    (r'^(Music|Sports|Games|Arts|Entertainment|Hobbies|Literature|Theatre)|^topic:(music|sports|games|arts|entertainment|hobbies)', 'arts-sports'),
    (r'^(Education|Schools)|^topic:education', 'school-learning'),
    (r'^(Tools|Furniture|Household|Containers|Kitchenware|Materials)', 'home-things'),
]
TOPIC_KW = [
    ('time-numbers', r'\b(day|week|month|year|hour|minute|second|morning|evening|night|today|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|sunday|saturday|january|february|spring|summer|autumn|winter|once|twice|time|early|late|always|never|often|ago|zero|one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|first|second|third|number|half|quarter|date|calendar|period)\b'),
    ('people-family', r'\b(mother|father|son|daughter|brother|sister|husband|wife|child|children|baby|boy|girl|man|woman|grand\w+|uncle|aunt|cousin|friend|family|neighbo\w+|person|people|parent\w*|kid|teenager|guest|stranger|couple|bride|groom|relative|colleague|student|teacher|doctor|nurse|worker|soldier|officer|driver|waiter|lawyer|engineer|manager|boss|employee|owner|policeman|singer|actor|author|writer|artist|king|queen|prince)\b'),
    ('body-health', r'\b(head|hand|arm|leg|foot|eye|ear|nose|mouth|tooth|teeth|hair|face|neck|back|heart|blood|bone|skin|finger|stomach|body|brain|lung|health|sick|ill|pain|hurt|medicine|disease|cure|hospital|doctor|pharmacy|fever|cough|surgery|wound|sleep|tired|healthy|dizzy)\b'),
    ('food-drink', r'\b(eat|drink|food|meal|breakfast|lunch|dinner|bread|water|milk|cheese|egg|meat|chicken|fish|rice|soup|salad|fruit|vegetable|apple|orange|banana|tomato|cucumber|potato|onion|garlic|sugar|salt|oil|wine|beer|coffee|tea|juice|cake|cookie|chocolate|restaurant|menu|cook|bake|kitchen|hungry|thirsty|taste|delicious|sweet|sour|spicy|hummus|falafel|olive|honey|nut|bean|pepper)\b'),
    ('nature-animals', r'\b(animal|dog|cat|bird|horse|cow|sheep|goat|lion|snake|donkey|camel|fish|insect|tree|flower|plant|grass|leaf|forest|field|mountain|hill|river|sea|lake|desert|sun|moon|star|sky|rain|snow|wind|cloud|storm|earth|ground|stone|rock|sand|island|valley|weather|hot|cold|warm|cool|fire|nature|garden|seed|wheat|vine)\b'),
    ('places-travel', r'\b(city|town|village|street|road|house|home|building|room|door|window|bridge|market|shop|store|bank|school|hospital|synagogue|church|mosque|airport|station|bus|train|car|plane|flight|taxi|ticket|passport|border|visa|hotel|trip|travel|journey|map|north|south|east|west|left|right|straight|near|far|country|israel|jerusalem|tel aviv|capital|abroad|tourist|luggage|suitcase|address|neighbourhood|neighborhood|square|beach|port|park)\b'),
    ('home-things', r'\b(table|chair|bed|sofa|lamp|light|key|lock|box|bag|bottle|glass|cup|plate|knife|fork|spoon|pot|pan|tool|clock|watch|mirror|towel|soap|paper|pen|pencil|book|notebook|newspaper|picture|photo|gift|toy|ball|basket|rope|machine|device|furniture|carpet|curtain|wall|floor|ceiling|roof|stairs|refrigerator|oven|bathroom|bedroom|garden|object|thing)\b'),
    ('clothes-shopping', r'\b(shirt|pants|trousers|dress|skirt|coat|jacket|hat|shoe|sock|glove|clothes|clothing|wear|size|color|colour|red|blue|green|yellow|black|white|brown|grey|gray|pink|purple|orange|buy|sell|price|cheap|expensive|pay|cash|receipt|discount|sale|shop|customer|bag|change|shekel|coin)\b'),
    ('religion-prayer', r'\b(god|lord|pray\w*|bless\w*|holy|sacred|sin|prophet|angel|heaven|sabbath|shabbat|torah|synagogue|rabbi|jewish|jew|israelite|covenant|temple|altar|sacrifice|offering|priest|levite|festival|holiday|passover|purim|hanukkah|worship|faith|soul|spirit|mercy|redeem\w*|salvation|praise|psalm|commandment|kosher|blessing|amen|messiah|eternal|righteous|iniquity|wicked|glory|congregation)\b'),
    ('feelings-mind', r'\b(love|hate|fear|joy|happy|sad|angry|anger|worry|hope|wish|want|need|like|dislike|think|believe|know|understand|remember|forget|dream|feel|feeling|mind|thought|idea|opinion|doubt|surprise|shame|proud|bored|lonely|jealous|trust|care|miss|enjoy|prefer|decide|choose|imagine|wonder|guess|sure|certain|afraid|nervous|calm|excited|memory)\b'),
    ('school-learning', r'\b(learn|study|teach|lesson|class|exam|test|grade|read|write|language|word|letter|sentence|question|answer|school|university|student|lecture|homework|knowledge|science|history|geography|math|subject|course|degree|alphabet|vocabulary|grammar|dictionary|translate|explain|example)\b'),
    ('tech-media', r'\b(computer|phone|telephone|internet|email|message|website|program|software|screen|camera|video|film|movie|television|radio|news|media|channel|network|online|data|file|password|app|application|digital|electric\w*|battery|signal|call|text|print|record|broadcast|journalist|article)\b'),
    ('society-work-law', r'\b(work|job|career|salary|wage|office|company|business|profession|employ\w*|boss|trade|industry|factory|economy|market|tax|law|court|judge|crime|police|prison|army|military|war|peace|soldier|weapon|government|state|minister|president|parliament|election|vote|party|politic\w*|citizen|right|rule|regulation|contract|loan|mortgage|debt|credit|bank|money|rich|poor|profit|budget|insurance|license|society|public|official|authority|nation|national)\b'),
    ('science-ideas', r'\b(science|scientific|physics|chemistry|biology|math\w*|number|geometry|equation|theory|research|experiment|measure|energy|atom|molecule|element|metal|gas|liquid|temperature|speed|weight|length|area|volume|percent|statistic\w*|logic|system|process|structure|function|method|concept|philosoph\w*|psycholog\w*|culture|history|literature|poem|poetry|art|music|song|sing|dance|play|game|sport|football|soccer|basketball|swim|run|race|team|match)\b'),
]
VERB_MOTION = r'\b(go|come|walk|run|travel|arrive|leave|enter|exit|return|climb|fall|fly|drive|ride|swim|jump|cross|follow|escape|move|turn|stand|sit|lie down|rise|descend|ascend|bring|carry|send|take|put|throw|push|pull|open|close)\b'
VERB_COMM = r'\b(say|speak|tell|ask|answer|call|shout|whisper|talk|discuss|explain|announce|reply|argue|promise|swear|greet|thank|apologi[sz]e|invite|suggest|offer|request|demand|order|complain|mention|declare|report|write|read)\b'


def topic_of(e, gloss):
    if e['pos'] in ('pron', 'prep', 'conj', 'det', 'particle'):
        return 'small-words'
    if e['pos'] == 'intj':
        return 'talking-asking'
    cats = e['cats']
    for pat, topic in TOPIC_CAT:
        r = re.compile(pat)
        if any(r.search(c) for c in cats):
            return topic
    g = gloss.lower()
    first = ' '.join(re.sub(r'^\(.*?\)\s*', '', g).split(' ')[:7])
    if e['pos'] == 'verb':
        if re.search(VERB_COMM, first):
            return 'talking-asking'
        if re.search(VERB_MOTION, first):
            return 'moving-doing'
    for topic, pat in TOPIC_KW:
        if re.search(pat, first):
            return topic
    return {
        'verb': 'doing-verbs', 'adj': 'describing-words', 'adv': 'describing-words', 'num': 'time-numbers',
    }.get(e['pos'], 'general-things')


# ------------------------------------------------------------------ Tatoeba examples
def load_tatoeba():
    heb = {}
    for line in open(os.path.join(CACHE, 'heb_sentences_detailed.tsv'), encoding='utf8'):
        p = line.rstrip('\n').split('\t')
        if len(p) >= 4:
            heb[p[0]] = (p[2], p[3])
    links = collections.defaultdict(list)
    for line in open(os.path.join(CACHE, 'heb-eng_links.tsv'), encoding='utf8'):
        a, b = line.split()[:2]
        if a in heb:
            links[a].append(b)
    need = {b for v in links.values() for b in v}
    eng = {}
    for line in open(os.path.join(CACHE, 'eng_sentences_detailed.tsv'), encoding='utf8'):
        i = line.split('\t', 1)[0]
        if i in need:
            p = line.rstrip('\n').split('\t')
            eng[i] = (p[2], p[3])
    out = []
    for hid, (htxt, hauth) in heb.items():
        if hid not in links:
            continue
        toks = [t for t in re.split(r'[\s]+', re.sub(r'[־.,!?;:"“”()\-–—…׃]', ' ', htxt)) if t]
        if not (3 <= len(toks) <= 8):
            continue
        if NIQ.search(htxt) or not all(HEBLET.match(t.replace("'", '').replace('׳', '').replace('"', '')) or t.isdigit() for t in toks):
            continue
        for eid_ in links[hid]:
            if eid_ in eng:
                etxt, eauth = eng[eid_]
                if 8 <= len(etxt) <= 80 and hauth and hauth != '\\N' and eauth and eauth != '\\N':
                    out.append({'hid': hid, 'he': htxt, 'hauth': hauth, 'toks': toks, 'eid': eid_, 'en': etxt, 'eauth': eauth})
                    break
    return out


def main():
    print('loading dictionary ...')
    ents, formof = load_dictionary()
    ents = merge_entities(ents)
    print('entities (pos-level, with glosses):', len(ents), 'pointed:', sum(1 for e in ents if e['pointed']))
    idx = Index(ents, formof)

    print('modern frequency ...')
    mscore, mforms, cov, total, pi_m = modern_scores(idx)
    unresolved = collections.Counter()
    print('  tokens covered by lemma map: %.1f%%' % (100 * cov / total))

    reg = json.load(open(os.path.join(ROOT, 'data/corpus/registry.json'), encoding='utf8'))['entries']
    print('biblical / liturgical ...')
    torah, other, prayer, best_verse, resolved, btotal, bunres = biblical_scores(idx, reg)
    print('  tanakh+prayer tokens resolved: %.1f%%' % (100 * resolved / btotal))

    rscore = {}
    for e in ents:
        i = e['eid']
        s = 2.0 * torah.get(i, 0) + 0.6 * other.get(i, 0) + 9.0 * prayer.get(i, 0)
        if s > 0:
            rscore[i] = s
    for e in ents:
        i = e['eid']
        e['mscore'] = round(mscore.get(i, 0.0), 2)
        e['rscore'] = round(rscore.get(i, 0.0), 2)
        e['torah'] = round(torah.get(i, 0.0), 1)
        e['tanakh_other'] = round(other.get(i, 0.0), 1)
        e['prayer'] = round(prayer.get(i, 0.0), 1)

    # merge entities with the same word + pointing but different POS (e.g. zeh pron/det)
    groups = collections.defaultdict(list)
    for e in ents:
        if e['pointed'] and ' ' not in e['word']:
            groups[(e['word'], e['pointed'].replace('\u05C7', '\u05B8'))].append(e)
    for g in groups.values():
        if len(g) < 2:
            continue
        g.sort(key=lambda x: -(x['mscore'] + 5 * x['rscore']))
        rep = g[0]
        rep['posAlt'] = []
        FUNC = {'pron', 'det', 'prep', 'conj', 'particle', 'adv', 'intj'}
        for o in g[1:]:
            if not ((o['pos'] in FUNC and rep['pos'] in FUNC) or ({o['pos'], rep['pos']} == {'noun', 'adj'})):
                continue
            rep['mscore'] = round(rep['mscore'] + o['mscore'], 2)
            rep['rscore'] = round(rep['rscore'] + o['rscore'], 2)
            for k in ('torah', 'tanakh_other', 'prayer'):
                rep[k] = round(rep[k] + o[k], 1)
            rep['glosses'] = rep['glosses'] + o['glosses']
            rep['posAlt'].append(o['pos'])
            o['merged'] = True
    ok = [e for e in ents if e['pointed'] and ' ' not in e['word'] and e['pos'] != 'phrase' and not e.get('merged')]
    mrank = {e['eid']: r + 1 for r, e in enumerate(sorted([x for x in ok if x['mscore'] > 0], key=lambda x: -x['mscore']))}
    rrank = {e['eid']: r + 1 for r, e in enumerate(sorted([x for x in ok if x['rscore'] > 0], key=lambda x: -x['rscore']))}
    sel = set()
    for i, r in mrank.items():
        if r <= N_MODERN:
            sel.add(i)
    for i, r in rrank.items():
        if r <= N_READ:
            sel.add(i)
    print('selected: modern<=%d: %d, read<=%d: %d, union %d' % (
        N_MODERN, sum(1 for r in mrank.values() if r <= N_MODERN), N_READ,
        sum(1 for r in rrank.values() if r <= N_READ), len(sel)))
    print('pointing-less lemmas with modern score>0 (dropped):',
          sum(1 for e in ents if not e['pointed'] and e['mscore'] > 0 and ' ' not in e['word']))

    # ambiguity: how much of the token mass is shared with another entity
    chosen = [e for e in ents if e['eid'] in sel]
    # examples
    print('tatoeba ...')
    sents = load_tatoeba()
    print('  usable heb-eng sentence pairs (3-8 tokens):', len(sents))
    rank_for_easy = {}
    for e in sorted(ok, key=lambda x: -x['mscore'])[:3000]:
        for f in e['forms_u']:
            rank_for_easy.setdefault(f, 1)
    # entity -> list of sentence indexes
    by_ent = collections.defaultdict(list)
    for si, s in enumerate(sents):
        seen = set()
        s['hard'] = sum(1 for t in s['toks'] if strip(t) not in rank_for_easy and t.lstrip('והבכלמש') not in rank_for_easy)
        for t in s['toks']:
            t = t.replace("'", '').replace('׳', '')
            c, how = idx.resolve(t)
            if not c:
                continue
            sh = share_of(t, c, pi_m)
            for eid, w in c:
                if eid in sel and eid not in seen:
                    seen.add(eid)
                    by_ent[eid].append((si, t, how, sh[eid]))
    used = collections.Counter()
    examples = {}
    for e in sorted(chosen, key=lambda x: -(x['mscore'] + x['rscore'])):
        best = None
        for si, tok, how, share in by_ent.get(e['eid'], []):
            s = sents[si]
            if used[si] >= 2:
                continue
            L = len(s['toks'])
            sc = (s['hard'] * 3 + abs(L - 5) * 0.7 + (0 if tok in e['forms_u'] else 2.0)
                  + (0 if how == 'direct' else 1.5) + (1 - share) * 4 + (0 if s['he'].rstrip()[-1] in '.?!' else 1))
            if best is None or sc < best[0]:
                best = (sc, si, tok, how, share)
        if best:
            sc, si, tok, how, share = best
            used[si] += 1
            s = sents[si]
            examples[e['eid']] = {
                'he': s['he'].strip(), 'en': s['en'].strip(), 'hePointed': False,
                'match': tok, 'matchHow': how, 'matchShare': round(share, 2),
                'source': {'type': 'tatoeba', 'heId': int(s['hid']), 'enId': int(s['eid']), 'heAuthor': s['hauth'],
                           'enAuthor': s['eauth'], 'license': 'CC BY 2.0 FR', 'url': 'https://tatoeba.org/en/sentences/show/' + s['hid']},
            }

    out = []
    for e in chosen:
        i = e['eid']
                # drop duplicates, keep order; primary prefers a non-archaic/biblical sense for modern words
        seen = set()
        uniq = []
        notes_by = {}
        for g, tg, note in e['glosses']:
            k = g.lower()
            if k in seen:
                continue
            seen.add(k)
            uniq.append((g, tg))
            notes_by[g] = note
        modern_first = [x for x in uniq if not (set(x[1]) & {'archaic', 'Biblical', 'dated', 'rare', 'obsolete', 'literary'})]
        ordered = (modern_first + [x for x in uniq if x not in modern_first]) if mrank.get(i, 99999) <= N_MODERN else uniq
        primary = ordered[0][0]
        alts = [g for g, _ in ordered[1:3]]
        enNote = notes_by.get(primary)
        reg_ = None
        for tg in ordered[0][1]:
            if tg in TAG_REG and TAG_REG[tg]:
                reg_ = TAG_REG[tg]
        rec = {
            'eid': i, 'posAlt': e.get('posAlt', []), 'bound': e.get('bound', False), 'word': e['word'], 'pointed': e['pointed'], 'pos': e['pos'], 'kpos': e['kpos'],
            'en': primary, 'alts': alts, 'enNote': enNote, 'register': reg_,
            'gender': e.get('gender'), 'plural_only': e.get('plural_only', False),
            'root': e.get('root'), 'binyan': e.get('binyan'), 'forms': e.get('forms'),
            'ipa': e.get('ipa'), 'wikiTr': e.get('wikiTr'),
            'mscore': e['mscore'], 'rscore': e['rscore'], 'torah': e['torah'], 'tanakh_other': e['tanakh_other'],
            'prayer': e['prayer'],
            'mrank': mrank.get(i), 'rrank': rrank.get(i),
            'topic': topic_of(e, primary),
            'senseTags': e['senseTags'], 'nforms': mforms.get(i, 0),
            'homographs': len(idx.byhead.get(e['word'], [])),
            'example': examples.get(i),
        }
        bv = best_verse.get(i)
        if bv:
            rec['verse'] = {'len': bv[0], 'ref': bv[1], 'he': bv[2], 'match': bv[3], 'share': round(bv[4], 2)}
        out.append(rec)
    json.dump({'meta': {'n_modern': N_MODERN, 'n_read': N_READ, 'dictEntities': len(ents),
                        'tokenCoverageModern': round(cov / total, 4), 'tanakhResolved': round(resolved / btotal, 4)},
               'entries': out},
              open(os.path.join(CACHE, 'stage.json'), 'w', encoding='utf8'), ensure_ascii=False)
    print('wrote stage.json:', len(out), 'entries;', sum(1 for r in out if r['example']), 'with tatoeba example;',
          sum(1 for r in out if r.get('verse')), 'with verse candidate')
    # also dump a small unresolved list for the method doc
    top_unres = unresolved.most_common(40)
    json.dump(top_unres, open(os.path.join(CACHE, 'unresolved_top.json'), 'w', encoding='utf8'), ensure_ascii=False)


if __name__ == '__main__':
    main()
