#!/usr/bin/env python3
"""Deterministic refinement rules for vocab5000 (imported by build_vocab5k.py; no I/O of its own except load_overrides).

Order of application (see docs/vocab/METHOD.md):
  1. normalise glosses (markup, verb 'to', leading article, capital)
  2. function-word typing: POS fixes for a few closed-class items, `fn` subtype, tag 'function'
  3. noun re-topic by the head noun of the first gloss clause (HEAD_TOPIC), only for plain nouns
  4. tags from gloss keywords ('jewish-life', 'prayer', 'biblical')
  5. data/vocab/overrides.json (hand judgement; wins over everything above; still proofread:false)
Nothing here is a native-speaker review.
"""
import json, os, re

TOPICS_PROTECTED = {'Days', 'Months', 'Seasons', 'Colours', 'Directions', 'Numbers', 'Pronouns', 'Verbs'}
FN_POS = {'prep': 'preposition', 'conj': 'conjunction', 'particle': 'particle', 'det': 'determiner', 'pron': 'pronoun',
          'intj': 'interjection'}
# closed-class adverbs (unpointed lemma). Manner adverbs (beautifully, mercifully ...) stay content words.
FN_ADV = set('לא כן גם רק אז אולי עוד כבר שוב מאוד ממש עדיין כה נא אנא איך מדוע לאן איפה כאן פה שם היכן איה כיצד כמעט טרם אכן '
             'אי תמיד אפשר כלל יחד לבד בלתי מתי'.split())
FN_ADJ_MODAL = set('צריך חיב כדאי אמור עלול מותר'.split())
FN_VERB_AUX = {'היה': 'auxiliary', 'יכל': 'modal'}
FN_KEEP_TOPIC = {'Time', 'Location', 'Directions', 'Pronouns', 'Numbers'}
MODAL_VERB_START = ('can', 'must', 'may', 'should')

# ---- noun re-topic: exact head word (last word before 'of/for/in/with/...') of the first gloss clause -> topic
_H = {
    'Animals': 'animal dog cat bird horse cow sheep goat lion snake donkey camel wolf bear fox rabbit mouse rat pig monkey elephant deer '
               'tiger leopard eagle dove pigeon owl bee ant fly spider scorpion frog turtle tortoise whale dolphin shark lamb calf ox bull '
               'rooster hen duck goose cattle poultry worm locust mosquito butterfly crocodile lizard ram ewe ibex fish insect fowl bat '
               'wing paw tail hoof horn feather',
    'Transportation': 'road car bus train plane aeroplane airplane ship boat taxi truck bicycle bike motorcycle vehicle flight ticket passport '
                      'airport railway highway helicopter tractor ferry subway tram ambulance chariot',
    'Clothing': 'clothes clothing shirt pants trousers dress skirt coat jacket hat cap shoe boot sandal sock glove scarf belt sweater '
                'underwear robe garment suit uniform necklace bracelet earring veil cloak apron costume sleeve collar pocket wig',
    'People': 'mother father son daughter brother sister husband wife child children baby boy girl man woman men women grandfather '
              'grandmother uncle aunt cousin friend neighbor neighbour parent kid teenager guest stranger couple bride groom relative '
              'colleague student enemy lover widow orphan youth adult elder king queen prince princess lord master slave servant '
              'maidservant maid citizen jew israeli arab nation tribe people crowd idiot boss fool infant',
    'Professions': 'teacher doctor nurse lawyer engineer manager employee waiter cook chef baker butcher farmer shepherd fisherman '
                   'carpenter builder plumber electrician mechanic tailor pilot sailor soldier officer policeman judge clerk secretary '
                   'accountant banker merchant seller vendor craftsman scientist professor journalist reporter editor photographer '
                   'programmer designer architect dentist surgeon pharmacist guard barber singer actor actress musician painter author '
                   'writer poet priest rabbi cantor scribe minister president mayor ambassador diplomat spy detective attorney '
                   'consultant technician instructor coach athlete referee translator therapist psychologist cashier broker agent '
                   'captain general commander',
    'Home': 'house home room kitchen bedroom bathroom door window chair table bed sofa couch lamp key lock box bag bottle cup plate knife '
            'fork spoon pot pan clock mirror towel soap curtain carpet rug wall floor ceiling roof stairs staircase refrigerator fridge '
            'oven stove garden yard courtyard gate fence balcony shelf drawer cabinet closet cupboard blanket pillow mattress bucket '
            'broom hammer ladder candle vase jar tray bowl kettle tent apartment container hook doorway cushion vessel tool utensil '
            'basket rope',
    'Food': 'food meal bread cheese egg meat chicken rice soup salad fruit vegetable apple banana tomato cucumber potato onion garlic '
            'sugar salt cake cookie chocolate honey nut bean pepper flour dough sauce dessert breakfast lunch dinner grape olive fig '
            'pomegranate lemon melon carrot cabbage lentil noodle sandwich pizza snack candy butter yogurt cream spice steak beef '
            'sausage dish porridge',
    'Beverages': 'beverage drink coffee tea juice beer wine milk soda liquor vodka whisky cocktail lemonade water',
    'Body': 'head hand arm leg foot eye ear nose mouth tooth hair face neck back heart blood bone skin finger toe stomach belly brain '
            'lung liver kidney muscle lip tongue throat chest shoulder knee elbow nail beard forehead cheek chin vein limb '
            'palate rib wrist ankle thumb palm waist hip health illness disease fever cough wound injury medicine medication drug '
            'saliva gene hunger smell',
    'Nature': 'tree flower plant grass leaf forest mountain hill river sea lake desert sun moon star sky rain snow wind cloud storm '
              'earth soil island valley weather fire seed branch root bush shrub cave cliff coast shore wave ocean stream spring '
              'pond well planet universe thunder lightning fog mist dew ice frost flood horizon darkness dust field air vapour '
              'reed',
    'Materials': 'gold metal iron steel silver copper bronze brass tin lead aluminum zinc stone rock brick concrete cement glass wood timber '
                 'plastic rubber leather cardboard clay sand marble diamond gem pearl crystal chemical element substance mineral '
                 'alloy resin wax oil gas liquid powder coal glue dye ink fiber thread plank board myrrh',
    'Math/Measurements': 'number digit equation sum total percent percentage fraction half quarter zero meter metre kilometer '
                         'centimeter mile inch gram kilogram ton liter litre gallon weight length width height depth distance '
                         'size area volume speed temperature degree angle circle square triangle rectangle cube sphere shape ratio '
                         'average amount quantity dozen unit measurement shekel dollar euro currency coin currency',
    'Time': 'day week month year hour minute second moment morning evening night noon afternoon century decade era period '
            'calendar birthday weekend holiday festival',
    'Location': 'city town village street building market shop store bank school university synagogue church mosque temple '
                'hotel border country capital region district neighborhood neighbourhood beach park place location site '
                'address map office factory restaurant cafe prison cemetery embassy ministry palace castle fortress tower bridge '
                'tunnel harbor harbour camp zone territory kingdom continent hall entrance corner edge suburb outskirts exterior '
                'outside',
    'Art': 'art painting drawing sculpture poem poetry novel theater theatre film movie cinema concert orchestra instrument guitar piano '
           'violin drum flute harp trumpet melody song opera museum gallery exhibition performance game sport football soccer '
           'basketball tennis hobby chess puzzle cartoon music dance ball',
    'Electronics': 'computer phone telephone smartphone internet email website software hardware screen monitor camera television radio '
                   'battery laptop keyboard printer network password app application chip circuit cable antenna satellite server '
                   'database robot sensor microphone speaker headphones charger bulb socket plug',
}
HEAD_TOPIC = {w: t for t, ws in _H.items() for w in ws.split()}

_H2 = {  # extension after sampling the words still in Misc Nouns
    'Animals': 'beaver beetle bulbul dinosaur fawn gazelle gorilla greenfinch hawk jenny louse mole mule panda peacock penguin raven seagull skink squirrel viper wasp serpent claw bacterium',
    'People': 'alien captive cowboy dean detainee drunkard duke dwarf fianc firstborn foreigner founder geisha goy governor heir hunter hypocrite inhabitant killer lady leader lesbian lieutenant loser nephew nerd nomad opponent pickpocket pope prisoner racist ruler schmuck sheikh seer suspect tenant thief tourist traveler virgin walker client collector combatant expert goddess stripper shooter native spaniard candidate',
    'Professions': 'babysitter bartender biologist magician violinist watchmaker watchman newscaster pathologist seaman birdwatcher',
    'Food': 'hamburger spaghetti sushi waffle peanut peach cinnamon coriander jam mustard vanilla vinegar stew mushroom caper cracker spelt challah',
    'Beverages': 'tequila',
    'Home': 'bathtub bedsheet bench dustpan goblet scissors shovel manger briefcase',
    'Clothing': 'diaper necktie lipstick makeup outfit pigtail',
    'Body': 'biceps bosom bottom buttocks blister bruise eyelid fist foreskin freckle hymen nape pharynx torso tendon vulva skull spasm thirst appetite heartburn haircut hairstyle shiver syndrome antibiotics aspirin orgasm poison',
    'Nature': 'avalanche bud iceberg lowland oasis ridge twilight atmosphere mound mud cypress hyssop jasmine juniper laurel myrtle oak rose lycium balsam thorn stem straw hay fountain',
    'Transportation': 'jet glider rocket spacecraft mast fleet transport axle',
    'Location': 'academy alley citadel circus club inn pub hostel stadium studio pier quay platform',
    'Art': 'album audio choir comedy drama magazine meme picnic script scroll subtitle tragedy hockey',
    'Electronics': 'disk folder laser wiki update',
    'Materials': 'bitumen byssus felt fleece fur goatskin gum plaster papyrus ruby flint',
    'Math/Measurements': 'centimetre kilometre diameter minimum optimum range value tens quota penny cash',
    'Society': 'cult regime republic congress cartel amulet talisman relic navy tobacco marijuana hashish cigarette cigar bomb arrow spear shield breastplate armour blade handgun scythe slingshot whip',
}
for _t, _ws in _H2.items():
    for _w in _ws.split():
        HEAD_TOPIC.setdefault(_w, _t)
_CUT = {'of', 'for', 'in', 'with', 'to', 'on', 'that', 'which', 'used', 'as', 'from', 'who', 'at', 'by', 'whose', 'where', 'when', 'or', 'and'}


def head_noun(gloss):
    g = re.sub(r'\([^)]*\)', ' ', gloss.lower())
    g = re.split(r'[;,]', g)[0]
    toks = [t for t in re.findall(r"[a-z'-]+", g) if t not in ('a', 'an', 'the')]
    out = []
    for t in toks:
        if t in _CUT:
            break
        out.append(t)
    return out[-1] if out else ''


def singular(w):
    for suf, rep in (('ies', 'y'), ('es', ''), ('s', '')):
        if w.endswith(suf) and len(w) > len(suf) + 2:
            return w[:-len(suf)] + rep
    return w


# ---- tags from gloss keywords (heuristic; a human must proofread). Words are matched whole.
_W = lambda s: re.compile(r'\b(' + s + r')s?\b', re.I)
TAG_RX = [
    ('prayer', _W(r'bless\w*|prayer|pray|amen|praise|psalm|hallelujah|supplicat\w*|worship|atone\w*|sanctif\w+|hallow\w*')),
    ('jewish-life', _W(r'god|lord|priest|levite|kohen|cohen|offering|sacrific\w+|altar|temple|tabernacle|holy|sacred|sanct\w+|torah|mitzvah|commandment|sabbath|shabbat|synagogue|rabbi|kosher|mikveh|messiah|angel|covenant|incense|libation|mishnah?|talmud|passover|seder|purim|ritual\w*|ritually|unclean|tithe|sin|sinner|iniquity|abomination|righteous\w*|pious|saintly|prophet\w*|soul|heaven|charity|jewish|jew|gentile|israelite')),
    ('biblical', _W(r'pharaoh|philistine|canaanite|egyptian|cubit|ephah|homer|omer|biblical|cairn|chariot|tribe|israelite|levite|manna|myrrh')),
]


def tags_for(e):
    g = e['gloss']
    t = []
    for name, rx in TAG_RX:
        if rx.search(g):
            t.append(name)
    return t


# ---- gloss normalisation
_PROPER = set('sunday monday tuesday wednesday thursday friday saturday january february march april may june july august september '
              'october november december tishrei cheshvan kislev tevet shevat adar nisan iyar sivan tammuz av elul shabbat sabbath '
              'levite egyptian philistine canaanite kodashim pharaoh israel jewish jew jews zion torah hebrew israeli arab tchelet god '
              'ok okay i sh chinese english american russian satan german gaon hasid chaldean spaniard nazarite greek aramean italian ammonite british christian '
              'yemenite hivite cushite turkish nazi sunni karaite easter armenian roman maariv african gypsy tyrian debir noah\'s japanese'.split())


def clean_markup(g):
    g = re.sub(r'\[\[+(?:[^\]|]*\|)?([^\]]*)\]+', r'\1', g)
    g = re.sub(r'\s*\[with [^\]]*\]', '', g)
    g = re.sub(r'\s+', ' ', g).strip(' .;,')
    return g


def norm_gloss(e, lower_ok):
    g = clean_markup(e['gloss'])
    pos = e['pos']
    if pos == 'verb' and not g.lower().startswith(('to ',) + MODAL_VERB_START):
        g = 'to ' + (g[0].lower() + g[1:] if g[:1].isupper() and g.split()[0].lower() not in _PROPER else g)
    elif pos in ('noun', 'adj'):
        m = re.match(r'^(a|an|the) (?=[a-z])', g, re.I)
        if m and not re.match(r'^(a|an|the) (?:\(|few|little|lot)', g, re.I):
            g = g[m.end():]
    m = re.match(r"[A-Za-z']+", g)
    if m and m.group(0)[0].isupper() and m.group(0).lower() not in _PROPER and not m.group(0).isupper():
        g = m.group(0).lower() + g[m.end():]
    return g.strip(' .;,')


def fn_subtype(e):
    pos, l = e['pos'], e['lemma']
    if pos in FN_POS:
        return FN_POS[pos]
    if pos == 'adv' and l in FN_ADV:
        return 'adverb'
    if pos == 'adj' and l in FN_ADJ_MODAL:
        return 'modal'
    if pos == 'verb' and l in FN_VERB_AUX and e['gloss'].startswith(('to be', 'can', 'to be able')):
        return FN_VERB_AUX[l]
    return None


def refine(entries, lower_ok):
    """In-place deterministic pass. Returns a Counter-like dict of what changed."""
    log = {'gloss': 0, 'function': 0, 'topic': 0, 'tags': 0}
    for e in entries:
        g2 = norm_gloss(e, lower_ok)
        if g2 and g2 != e['gloss']:
            e['gloss'] = g2
            log['gloss'] += 1
        tg = []
        fn = fn_subtype(e)
        if fn:
            e['fn'] = fn
            tg.append('function')
            log['function'] += 1
            if e['topic'] not in FN_KEEP_TOPIC and e['pos'] != 'adj':
                if e['topic'] != 'Misc Nouns':
                    log['topic'] += 1
                e['topic'] = 'Misc Nouns'  # compatibility placeholder; consumers should group by tag 'function'
        elif e['pos'] == 'noun' and not e.get('curatedCore') and e['topic'] not in TOPICS_PROTECTED:
            h = singular(head_noun(e['gloss']))
            t = HEAD_TOPIC.get(h) or HEAD_TOPIC.get(head_noun(e['gloss']))
            if t and t != e['topic']:
                e['topic'] = t
                log['topic'] += 1
        for t in tags_for(e):
            if t not in tg:
                tg.append(t)
        if tg:
            e['tags'] = tg
            log['tags'] += 1
    return log


def load_overrides(root):
    p = os.path.join(root, 'data/vocab/overrides.json')
    return json.load(open(p, encoding='utf8')) if os.path.exists(p) else {'overrides': {}, 'additions': []}
