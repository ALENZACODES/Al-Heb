#!/usr/bin/env python3
"""Quality report for data/vocab/vocab5000.json: counts of suspicious items, before and after the round-2 refinement.

  python3 tools/vocab/quality.py                 # table (before = tools/vocab/.cache/vocab5000.pre-refine.json if present,
                                                 #           else the recorded data/vocab/quality-baseline.json)
  python3 tools/vocab/quality.py --examples 5    # also print up to N example entries per check
  python3 tools/vocab/quality.py --write-baseline   # (re)record the 'before' counts from the pre-refine cache
  python3 tools/vocab/quality.py --strict        # exit 1 if a check marked [gate] is above zero in the current file

These are heuristics. A count of zero means "no match for this rule", NOT "correct". The topic-keyword table below is a small,
high-precision list written independently of the rules in refine.py, and it only covers words it lists. Nothing here replaces
a proofread by a Hebrew educator.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import refine  # noqa: E402

DATA = os.path.join(ROOT, 'data/vocab/vocab5000.json')
PRE = os.path.join(HERE, '.cache', 'vocab5000.pre-refine.json')
BASE = os.path.join(ROOT, 'data/vocab/quality-baseline.json')

FORM_RX = re.compile(r'\b(form of|spelling of|plural of|singular of|inflection|participle of|imperative of|alternative|variant of|construct state|abbreviation of)\b', re.I)
RELIGION_RX = re.compile(r'\b(god|gods|lord|priest|levite|kohen|cohen|offering|sacrifice|altar|temple|tabernacle|holy|sacred|sanctity|torah|commandment|sabbath|shabbat|synagogue|rabbi|kosher|mikveh|messiah|angel|covenant|incense|bless\w*|prayer|pray|amen|psalm|passover|seder|ritual\w*|unclean|iniquity|abomination|righteous\w*|mishna)\b', re.I)
NEG_PARTICLE_GLOSS = {'yes', 'no', 'not', 'do not', 'yes; so, thus', 'not, no'}
FN_ADV_OK = refine.FN_ADV

# independent strict table: if one of these words is the HEAD word of the first gloss clause, the topic must be in the set
_S = {
    'house': 'Home', 'room': 'Home', 'door': 'Home', 'chair': 'Home', 'bed': 'Home', 'window': 'Home', 'kitchen': 'Home', 'wall': 'Home',
    'dog': 'Animals', 'cat': 'Animals', 'horse': 'Animals', 'cow': 'Animals', 'sheep': 'Animals', 'lion': 'Animals', 'bird': 'Animals', 'fish': 'Animals', 'snake': 'Animals', 'camel': 'Animals', 'donkey': 'Animals',
    'bread': 'Food', 'cheese': 'Food', 'egg': 'Food', 'rice': 'Food', 'sugar': 'Food', 'fruit': 'Food', 'meal': 'Food',
    'wine': 'Beverages', 'coffee': 'Beverages', 'tea': 'Beverages', 'milk': 'Beverages', 'water': 'Beverages', 'juice': 'Beverages',
    'hand': 'Body', 'eye': 'Body', 'ear': 'Body', 'nose': 'Body', 'mouth': 'Body', 'tooth': 'Body', 'heart': 'Body', 'blood': 'Body', 'bone': 'Body', 'head': 'Body', 'skin': 'Body', 'finger': 'Body',
    'mother': 'People', 'father': 'People', 'son': 'People', 'daughter': 'People', 'brother': 'People', 'sister': 'People', 'king': 'People', 'child': 'People', 'woman': 'People', 'man': 'People', 'friend': 'People',
    'teacher': 'Professions', 'doctor': 'Professions', 'soldier': 'Professions', 'lawyer': 'Professions', 'farmer': 'Professions',
    'sea': 'Nature', 'tree': 'Nature', 'river': 'Nature', 'mountain': 'Nature', 'sun': 'Nature', 'moon': 'Nature', 'star': 'Nature', 'rain': 'Nature', 'wind': 'Nature', 'flower': 'Nature',
    'city': 'Location', 'street': 'Location', 'village': 'Location', 'school': 'Location', 'country': 'Location',
    'car': 'Transportation', 'bus': 'Transportation', 'train': 'Transportation', 'ship': 'Transportation', 'boat': 'Transportation', 'airplane': 'Transportation',
    'shirt': 'Clothing', 'dress': 'Clothing', 'shoe': 'Clothing', 'hat': 'Clothing', 'coat': 'Clothing',
    'gold': 'Materials', 'iron': 'Materials', 'glass': 'Materials', 'wood': 'Materials', 'stone': 'Materials',
    'computer': 'Electronics', 'telephone': 'Electronics', 'phone': 'Electronics',
    'day': 'Time', 'week': 'Time', 'year': 'Time', 'hour': 'Time', 'minute': 'Time', 'night': 'Time',
}
STRICT = {k: v for k, v in _S.items()}


def strict_head(gloss):
    return refine.head_noun(gloss)


def checks(entries):
    R = {}
    def add(name, pred, gate=False):
        hits = [e for e in entries if pred(e)]
        R[name] = {'n': len(hits), 'ex': [(e['rank'], e['lemma'], e['pos'], e['topic'], e['gloss'][:50]) for e in hits[:40]], 'gate': gate}
    tags = lambda e: e.get('tags') or []
    add("gloss says 'form of' / spelling / alternative (entries already marked as forms excluded)", lambda e: FORM_RX.search(e['gloss']) is not None and 'form' not in tags(e), True)
    add('gloss has wiki markup', lambda e: re.search(r'\[\[|\]\]', e['gloss']) is not None, True)
    add('gloss contains Hebrew letters (informational: prefixes and cross-references)', lambda e: re.search(r'[א-ת]', e['gloss']) is not None)
    add('gloss starts with a capital (not a proper noun)', lambda e: e['gloss'][:1].isupper() and e['gloss'].split()[0].strip(',;!').lower() not in refine._PROPER and len(e['gloss'].split()[0]) > 1)
    add("verb gloss not of the form 'to ...' (modals excluded)", lambda e: e['pos'] == 'verb' and not e['gloss'].lower().startswith(('to ', 'can', 'must', 'may', 'should')))
    add("non-verb gloss starting 'to '", lambda e: e['pos'] not in ('verb', 'prep') and e['gloss'].lower().startswith('to '))
    add("yes/no/not typed as adverb, adjective or noun (should be particle)", lambda e: e['pos'] in ('adv', 'adj', 'noun') and e['gloss'].lower().strip() in NEG_PARTICLE_GLOSS)
    add('closed-class word (prep/conj/particle/det/intj/listed adverb) not marked as function', lambda e: (e['pos'] in refine.FN_POS or (e['pos'] == 'adv' and e['lemma'] in FN_ADV_OK)) and 'function' not in tags(e), True)
    add('function word filed under Misc Nouns / Adjectives with no function mark', lambda e: (e['pos'] in refine.FN_POS or (e['pos'] == 'adv' and e['lemma'] in FN_ADV_OK)) and e['topic'] in ('Misc Nouns', 'Adjectives') and 'function' not in tags(e))
    add('topic contradicts strict head-word table', lambda e: e['pos'] == 'noun' and not e.get('curatedCore') and STRICT.get(strict_head(e['gloss'])) not in (None, e['topic']))
    add('POS vs topic: verb not in Verbs / non-verb in Verbs', lambda e: (e['pos'] == 'verb') != (e['topic'] == 'Verbs'))
    add('religion / Jewish-life gloss with no tag', lambda e: RELIGION_RX.search(e['gloss']) is not None and not ({'jewish-life', 'prayer', 'biblical'} & set(tags(e))))
    add('noun in Misc Nouns (not function)', lambda e: e['pos'] == 'noun' and e['topic'] == 'Misc Nouns')
    add('any entry in Misc Nouns', lambda e: e['topic'] == 'Misc Nouns')
    lemmas = {}
    for e in entries:
        lemmas.setdefault(e['lemma'], []).append(e)
    add('same unpointed spelling shared by several entries', lambda e: len(lemmas[e['lemma']]) > 1)
    add('...of which not cross-referenced (no sameSpelling)', lambda e: len(lemmas[e['lemma']]) > 1 and not e.get('sameSpelling'))
    fw = lambda e: re.split(r'[,;( ]', e['gloss'].strip())[0].lower()
    firsts = {fw(e) for e in entries if e['pos'] == 'noun' and not e.get('isForm')}
    IRR = {'women', 'men', 'children', 'teeth', 'feet', 'mice', 'people'}
    def plural_like(e):
        if e['pos'] != 'noun' or e.get('isForm'):
            return False
        w = fw(e)
        return w in IRR - {'people'} or (len(w) > 3 and w.endswith('s') and not w.endswith(('ss', 'us', 'is')) and (w[:-1] in firsts or (w.endswith('ies') and w[:-3] + 'y' in firsts)))
    add('noun whose gloss is the English plural of another noun entry, not marked isForm', plural_like)
    add('verb glossed as a passive/stative sense only (to be + participle)', lambda e: e['pos'] == 'verb' and re.match(r'^to be \w+ed\b', e['gloss']) is not None)
    add('no vowel points (needsPointing)', lambda e: e.get('needsPointing'))
    add('marked isForm (kept for rank stability)', lambda e: e.get('isForm'))
    add("tagged 'rare-sense' / 'needs-check' by the curator", lambda e: bool({'rare-sense', 'needs-check'} & set(tags(e))))
    add('hand-overridden (proofread still false)', lambda e: e.get('overridden'))
    return R


def load_before():
    if os.path.exists(PRE):
        return {'source': 'pre-refine cache', 'counts': {k: v['n'] for k, v in checks(json.load(open(PRE, encoding='utf8'))['entries']).items()}}
    if os.path.exists(BASE):
        b = json.load(open(BASE, encoding='utf8'))
        return {'source': 'data/vocab/quality-baseline.json', 'counts': b['counts']}
    return None


def main(argv):
    after = json.load(open(DATA, encoding='utf8'))['entries']
    A = checks(after)
    if '--write-baseline' in argv:
        if not os.path.exists(PRE):
            sys.exit('run tools/vocab/build_vocab5k.py first (needs the pre-refine cache)')
        pre = json.load(open(PRE, encoding='utf8'))['entries']
        json.dump({'note': 'counts of tools/vocab/quality.py checks on the vocab5000 build BEFORE the round-2 refinement (same ranking pool, no overrides)', 'entries': len(pre),
                   'counts': {k: v['n'] for k, v in checks(pre).items()}}, open(BASE, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
        print('wrote', BASE)
        return 0
    B = load_before()
    nex = int(argv[argv.index('--examples') + 1]) if '--examples' in argv else 0
    print('entries: %d   function-flagged: %d   with tags: %d   isForm: %d' % (len(after), sum(1 for e in after if 'function' in (e.get('tags') or [])), sum(1 for e in after if e.get('tags')), sum(1 for e in after if e.get('isForm'))))
    print('before: %s\n' % (B['source'] if B else 'not available'))
    print('%-92s %7s %7s' % ('check', 'before', 'after'))
    for k, v in A.items():
        b = B['counts'].get(k, '') if B else ''
        print('%-92s %7s %7d%s' % (k + (' [gate]' if v['gate'] else ''), b, v['n'], ''))
        for ex in v['ex'][:nex]:
            print('      %s' % (ex,))
    bad = [k for k, v in A.items() if v['gate'] and v['n']]
    if '--strict' in argv and bad:
        print('\nFAILED gates:', bad)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
