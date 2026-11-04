#!/usr/bin/env python3
"""Build data/vocab/vocab5000.json: the 5,000-word, 27-topic, SRS-tiered vocabulary.

Inputs (all already in the repo / the git-ignored cache from tools/vocab/fetch.py):
  data/vocab/words.json                 lemmatised, ranked, Wiktionary-pointed lexicon (stage 2 output)
  tools/vocab/.cache/kaikki-hebrew.jsonl  Wiktionary dump (Wiktextract), only for category hints
Rank = the existing blended priority (OpenSubtitles spoken frequency, boosted for Tanakh/prayer words
from data/corpus); this script does not re-count frequencies. It filters, re-ranks 1..5000, assigns the 27
topics by heuristics (Wiktionary categories first, then gloss keywords) and the SRS tiers.
Run: python3 -I tools/vocab/build_vocab5k.py
"""
import collections, hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CACHE = os.path.join(HERE, '.cache')
N = 5000
NIQ = re.compile('[֑-ׇ]')
TOPICS = ['Animals', 'Transportation', 'Location', 'Clothing', 'Colours', 'People', 'Professions', 'Society',
          'Art', 'Beverages', 'Food', 'Home', 'Electronics', 'Body', 'Nature', 'Materials', 'Math/Measurements',
          'Misc Nouns', 'Directions', 'Seasons', 'Months', 'Days', 'Time', 'Verbs', 'Adjectives', 'Pronouns', 'Numbers']
TIERS = [500, 1000, 2000, 5000]


def strip(s):
    return NIQ.sub('', s).replace('־', '').replace('׳', "'")


# ---------------------------------------------------------------- Wiktionary category hints
def load_cats():
    idx = collections.defaultdict(list)  # (unpointed, pos) -> [(glosses, cats)]
    posmap = {'noun': 'noun', 'verb': 'verb', 'adj': 'adj', 'adv': 'adv', 'prep': 'prep', 'pron': 'pron',
              'num': 'num', 'conj': 'conj', 'intj': 'intj', 'det': 'det', 'particle': 'particle', 'name': 'noun'}
    p = os.path.join(CACHE, 'kaikki-hebrew.jsonl')
    if not os.path.exists(p):
        print('WARNING: kaikki cache missing; category hints disabled (topics fall back to gloss keywords)')
        return idx
    for line in open(p, encoding='utf8'):
        d = json.loads(line)
        if d.get('lang_code') != 'he':
            continue
        pos = posmap.get(d.get('pos'))
        if not pos:
            continue
        cats, glosses = set(), []
        for s in d.get('senses', []):
            glosses += [g.lower() for g in s.get('glosses', [])[:1]]
            for c in s.get('categories', []):
                cats.add(c['name'])
            for t in s.get('topics', []):
                cats.add('topic:' + t)
        idx[(strip(d['word']), pos)].append((glosses, cats))
    return idx


def cats_for(idx, unp, pos, gloss):
    cand = idx.get((unp, pos), [])
    if not cand:
        return set()
    g = gloss.lower()[:14]
    hit = [c for gl, c in cand if any(x.startswith(g) or g.startswith(x[:14]) for x in gl if x)]
    if hit:
        return set().union(*hit)
    return cand[0][1] if len(cand) == 1 else set()


# ---------------------------------------------------------------- topic rules
R = lambda s: re.compile(s, re.I)
CAT_RULES = [  # (regex over category names, topic) for NOUNS only, first match wins
    (R(r'^Colors$'), 'Colours'),
    (R(r'^(Hebrew calendar months|Months)$'), 'Months'),
    (R(r'^Days of the week$'), 'Days'),
    (R(r'^Seasons$'), 'Seasons'),
    (R(r'^(Beverages|Wines|Drinks|Alcoholic beverages|Teas|Coffee)$'), 'Beverages'),
    (R(r'^(Foods|Fruits|Vegetables|Breads|Spices|Dishes|Meat|Dairy|Cooking|Food and drink|Cereals|Nuts|Herbs)$|^topic:(food|cooking|cuisine)'), 'Food'),
    (R(r'^(Anatomy|Hair|Bodily fluids|Genitalia|Body parts|Pathology|Diseases|Medicine)$|^topic:(anatomy|medicine|pathology)'), 'Body'),
    (R(r'^(Occupations|Military ranks)$'), 'Professions'),
    (R(r'^(Male family members|Female family members|Family|People|Nationalities|Individuals|Kinship)$'), 'People'),
    (R(r'^(Clothing|Headwear|Footwear|Jewelry)$|^topic:(clothing|fashion|textiles)'), 'Clothing'),
    (R(r'^(Birds|Baby animals|Mammals|Insects|Fish|Reptiles|Panthers|Eagles|Animals|Dogs|Cats|Livestock)$|^topic:zoology'), 'Animals'),
    (R(r'^(Time)$'), 'Time'),
    (R(r'^(Vehicles|Watercraft|Transport|Aircraft)$|^topic:(transport|nautical|aviation)'), 'Transportation'),
    (R(r'^(Mathematics|Geometry|Units of measure|Units of time|Measurement|Weights and measures|Statistics)$|^topic:(mathematics|geometry|statistics)'), 'Math/Measurements'),
    (R(r'^(Computing|Electronics|Internet|Electricity|Electrical engineering|Electromagnetism|Telecommunications|Television)$|^topic:(computing|electrical-engineering|electromagnetism|electricity|broadcasting|television|communications|electronics)'), 'Electronics'),
    (R(r'^(Music|Musical instruments|Games|Card games|Photography|Literature|Painting|Theater|Theatre|Film|Writing|Arts|Hobbies)$|^topic:(music|arts|entertainment|film|literature|photography|hobbies|games|card-games|poetry)'), 'Art'),
    (R(r'^(Furniture|Rooms|Containers|Light sources|Tools|Kitchenware|Household|Appliances)$'), 'Home'),
    (R(r'^(Plants|Flowers|Trees|Landforms|Bodies of water|Geology|Astronomy|Fire|Weather|Botany|Constellations in the zodiac|Celery family plants)$|^topic:(botany|geology|astronomy|meteorology|biology|natural-sciences)'), 'Nature'),
    (R(r'^(Gems|Liquids|Chemical elements|P-block elements|Period \d elements|Metals|Minerals|Materials|Chemistry)$|^topic:chemistry'), 'Materials'),
    (R(r'^(Countries|Cities|Places|National capitals|Islands|Continents|Geography|Buildings|Architecture|Regions|Geographic|Former capitals|States of)|^(Countries|Cities|Places|Regions) in|^topic:geography'), 'Location'),
    (R(r'^(Law|Politics|Government|Military|Economics|Banking|Crime|Judaism|Religion|Bible|Biblical|Jewish law|Christianity|Islam|Education|Marriage|Death|Monarchy|War|God|Business|Abrahamism|Nationalism|Holidays|Mysticism)|^topic:(law|politics|government|military|war|business|economics|religion|biblical|mysticism|education|Christianity|Islam|history|psychology|philosophy|human-sciences|sciences)'), 'Society'),
]
KW_RULES = [  # (regex over the head of the gloss, topic) for NOUNS, first match wins
    ('Days', R(r'\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sabbath|weekday)\b')),
    ('Months', R(r'\b(january|february|march|april|june|july|august|september|october|november|december|nisan|iyar|sivan|tammuz|av|elul|tishrei|cheshvan|kislev|tevet|shevat|adar)\b|month of')),
    ('Seasons', R(r'\b(spring|summer|autumn|fall|winter)\b|season')),
    ('Colours', R(r'^(a )?(the )?colou?r|\b(red|blue|green|yellow|black|white|brown|grey|gray|pink|purple|orange)\b(?! (tape|cross))')),
    ('Beverages', R(r'\b(beverage|drink|coffee|tea|juice|beer|wine|milk|soda|liquor|alcohol|vodka|whisk\w+|cocktail|lemonade|brandy)\b')),
    ('Food', R(r'\b(food|meal|bread|cheese|egg|meat|chicken|fish|rice|soup|salad|fruit|vegetable|apple|banana|tomato|cucumber|potato|onion|garlic|sugar|salt|oil|cake|cookie|chocolate|honey|nut|bean|pepper|flour|pasta|dough|pie|sauce|dessert|breakfast|lunch|dinner|grape|olive|fig|date|pomegranate|lemon|melon|carrot|cabbage|lentil|noodle|sandwich|pizza|kebab|snack|candy|ice cream|butter|yogurt|cream|spice|herb|steak|beef|lamb|sausage|dish|cuisine|recipe|menu)s?\b')),
    ('Animals', R(r'\b(animal|dog|cat|bird|horse|cow|sheep|goat|lion|snake|donkey|camel|insect|wolf|bear|fox|rabbit|mouse|rat|pig|monkey|ape|elephant|deer|tiger|leopard|eagle|dove|owl|bee|ant|fly|spider|scorpion|frog|turtle|whale|dolphin|shark|lamb|calf|ox|bull|rooster|hen|duck|goose|beast|cattle|livestock|fowl|worm|locust|mosquito|butterfly|crocodile|lizard)s?\b')),
    ('Transportation', R(r'\b(car|bus|train|plane|aeroplane|airplane|ship|boat|taxi|truck|bicycle|bike|motorcycle|vehicle|flight|ticket|passport|airport|station|railway|road|highway|traffic|driver|helicopter|tractor|engine|fuel|gasoline|petrol|wheel|tire|tyre|ferry|subway|tram|harbou?r|port|sail|cruise|voyage|journey|trip|route|ambulance)s?\b')),
    ('Clothing', R(r'\b(clothes|clothing|shirt|pants|trousers|dress|skirt|coat|jacket|hat|cap|shoe|boot|sandal|sock|glove|scarf|tie|belt|sweater|underwear|robe|garment|suit|uniform|jewel\w*|ring|necklace|bracelet|earring|veil|cloak|apron|costume|wardrobe|sleeve|collar|pocket|zipper|button|cloth|fabric|textile|wool|cotton|linen|silk)s?\b')),
    ('Professions', R(r'\b(profession|occupation|worker|teacher|doctor|nurse|lawyer|engineer|manager|boss|employee|employer|driver|waiter|cook|chef|baker|butcher|farmer|shepherd|fisherman|carpenter|builder|plumber|electrician|mechanic|tailor|pilot|sailor|captain|soldier|officer|policeman|police officer|judge|clerk|secretary|accountant|banker|merchant|salesperson|seller|vendor|artisan|craftsman|scientist|researcher|professor|lecturer|journalist|reporter|editor|photographer|programmer|developer|designer|architect|dentist|surgeon|pharmacist|guard|janitor|cleaner|barber|singer|actor|actress|musician|painter|author|writer|poet|priest|rabbi|cantor|prophet|scribe|minister|president|mayor|ambassador|diplomat|spy|detective|attorney|consultant|technician|operator|instructor|trainer|coach|athlete|player|referee|guide|translator|interpreter|therapist|psychologist|veterinarian|cashier|clerk|broker|agent)s?\b')),
    ('People', R(r'\b(mother|father|son|daughter|brother|sister|husband|wife|child|children|baby|boy|girl|man|woman|men|women|grand\w+|uncle|aunt|cousin|friend|family|neighbo\w+|person|people|parent\w*|kid|teenager|guest|stranger|couple|bride|groom|relative|colleague|student|enemy|lover|widow|orphan|youth|adult|elder|king|queen|prince|princess|lord|master|slave|servant|member|crowd|population|generation|human|humanity|citizen|jew|israeli|arab|christian|muslim|nation|tribe|clan|folk|public|audience|team|group|community)s?\b')),
    ('Body', R(r'\b(head|hand|arm|leg|foot|feet|eye|ear|nose|mouth|tooth|teeth|hair|face|neck|back|heart|blood|bone|skin|finger|toe|stomach|belly|body|brain|lung|liver|kidney|muscle|nerve|lip|tongue|throat|chest|breast|shoulder|knee|elbow|nail|beard|forehead|cheek|chin|womb|vein|organ|limb|spine|rib|health|sick\w*|ill\w*|pain|disease|cure|medic\w+|hospital|pharmacy|fever|cough|surgery|wound|injury|illness|cancer|virus|infection|pill|drug|therapy|symptom|diagnosis|clinic|vaccine|sleep|breath|sweat|saliva|urine|pulse|wrist|ankle|thumb|palm|waist|hip)s?\b')),
    ('Electronics', R(r'\b(computer|phone|telephone|mobile|smartphone|internet|email|e-mail|website|software|hardware|screen|monitor|camera|video|television|tv|radio|electric\w*|battery|signal|laptop|keyboard|mouse|printer|network|online|digital|data|file|password|app|application|program|chip|circuit|cable|wire|antenna|satellite|server|database|code|device|machine|robot|sensor|microphone|speaker|headphones|remote|charger|lamp|bulb|switch|socket|plug|electron\w*|technology|tech|media|channel|broadcast)s?\b')),
    ('Home', R(r'\b(table|chair|bed|sofa|couch|lamp|key|lock|box|bag|bottle|glass|cup|plate|dish|knife|fork|spoon|pot|pan|tool|clock|watch|mirror|towel|soap|paper|pen|pencil|book|notebook|newspaper|picture|photo|toy|ball|basket|rope|furniture|carpet|rug|curtain|wall|floor|ceiling|roof|stairs|staircase|refrigerator|fridge|oven|stove|bathroom|bedroom|kitchen|room|house|home|apartment|flat|garden|yard|door|window|gate|fence|chimney|balcony|shelf|drawer|cabinet|closet|blanket|pillow|mattress|bucket|broom|brush|hammer|nail|screw|ladder|candle|vase|jar|tray|bowl|kettle|tent|hut|cottage|villa|attic|cellar|basement|lobby)s?\b')),
    ('Art', R(r'\b(art|artist|music|musical|song|sing|dance|painting|paint|drawing|sculpture|poem|poetry|literature|novel|story|tale|theat(er|re)|play|film|movie|cinema|concert|orchestra|band|instrument|guitar|piano|violin|drum|flute|harp|trumpet|melody|rhythm|tune|opera|museum|gallery|exhibition|performance|show|game|sport|football|soccer|basketball|tennis|swimming|race|match|tournament|champion|hobby|chess|cards|puzzle|toy|cartoon|comic|photograph)s?\b')),
    ('Math/Measurements', R(r'\b(number|digit|math\w*|geometry|equation|sum|total|percent|percentage|fraction|half|quarter|third|double|triple|zero|plus|minus|multiply|divide|measure\w*|meter|metre|kilometer|centimeter|mile|inch|foot|yard|gram|kilogram|kilo|ton|liter|litre|gallon|weight|length|width|height|depth|distance|size|area|volume|speed|temperature|degree|angle|line|circle|square|triangle|rectangle|cube|sphere|shape|point|ratio|average|statistic\w*|calculation|arithmetic|algebra|formula|unit|scale|amount|quantity|dozen|pair|several)s?\b')),
    ('Materials', R(r'\b(metal|iron|steel|gold|silver|copper|bronze|brass|tin|lead|aluminum|aluminium|zinc|stone|rock|brick|concrete|cement|glass|wood|timber|plastic|rubber|leather|paper|cardboard|fabric|cloth|wool|cotton|silk|clay|sand|gravel|marble|granite|diamond|gem|pearl|crystal|chemical|element|substance|material|mineral|ore|alloy|resin|wax|oil|gas|liquid|powder|dust|ash|coal|glue|paint|dye|ink|fiber|fibre|thread|salt)s?\b')),
    ('Nature', R(r'\b(tree|flower|plant|grass|leaf|forest|field|mountain|hill|river|sea|lake|desert|sun|moon|star|sky|rain|snow|wind|cloud|storm|earth|ground|island|valley|weather|fire|nature|seed|wheat|vine|fruit tree|branch|root|bush|shrub|jungle|cave|cliff|coast|shore|wave|ocean|spring|stream|pond|well|swamp|volcano|planet|galaxy|universe|world|environment|climate|thunder|lightning|rainbow|fog|mist|dew|ice|frost|hail|flood|drought|earthquake|horizon|dawn|dusk|sunset|sunrise|light|darkness|shade|shadow|crop|harvest|orchard|vineyard|meadow|pasture|wilderness|plain|plateau|slope|peak|summit|bank|bay|gulf|stream)s?\b')),
    ('Location', R(r'\b(city|town|village|street|road|building|market|shop|store|bank|school|university|synagogue|church|mosque|temple|airport|station|hotel|border|country|state|capital|region|district|area|neighbou?rhood|square|beach|park|place|location|site|address|map|center|centre|office|factory|restaurant|cafe|bar|prison|cemetery|court|embassy|ministry|palace|castle|fortress|tower|bridge|tunnel|harbou?r|port|camp|base|zone|territory|land|kingdom|continent|abroad|world|room|hall|yard|entrance|exit|corner|edge|border|surroundings|outskirts|suburb|downtown|city center|israel|jerusalem)s?\b')),
    ('Time', R(r'\b(day|week|month|year|hour|minute|second|moment|morning|evening|night|noon|today|tomorrow|yesterday|time|date|calendar|period|era|age|century|decade|season|holiday|festival|birthday|past|future|present|history|beginning|end|duration|deadline|schedule|appointment|delay|while|instant|dawn|midnight|afternoon|weekend)s?\b')),
    ('Society', R(r'\b(work|job|career|salary|wage|income|office|company|business|trade|industry|economy|tax|law|court|judge|crime|police|army|military|war|peace|weapon|government|ministry|president|parliament|election|vote|party|politic\w*|citizen|right|rule|regulation|contract|loan|mortgage|debt|credit|money|rich|poor|profit|budget|insurance|license|society|public|official|authority|nation|national|god|lord|pray\w*|bless\w*|holy|sacred|sin|angel|heaven|torah|rabbi|jewish|covenant|altar|sacrifice|offering|priest|festival|worship|faith|soul|spirit|mercy|salvation|praise|psalm|commandment|kosher|messiah|righteous|iniquity|wicked|glory|congregation|religion|religious|belief|ritual|custom|tradition|culture|language|idea|thought|opinion|question|answer|problem|solution|reason|cause|result|effect|goal|plan|project|decision|choice|freedom|justice|truth|lie|secret|story|news|information|knowledge|science|education|lesson|exam|study|research|theory|system|method|process|policy|strategy|campaign|movement|organization|institution|association|union|committee|council|agency|service|market|price|cost|payment|bill|check|fee|fine|prize|gift|donation|charity)s?\b')),
]
SPATIAL_PREP = R(r'\b(above|under|below|beneath|near|next to|between|behind|in front|inside|outside|among|opposite|beside|around|over|across|toward|along|within|beyond|here|there|nearby|far)\b')
DIRECTION = R(r'^(the )?(north|south|east|west|left|right|straight|forward|backward|up|down|upward|downward|ahead|northern|southern|eastern|western)\b|\b(northward|southward|eastward|westward|to the (left|right)|on the (left|right)|direction)\b')
TIMEWORD = R(r'\b(today|tomorrow|yesterday|now|then|soon|later|early|late|always|never|often|sometimes|once|twice|already|still|yet|ago|before|after|while|during|until|since|tonight|daily|weekly|monthly|yearly|usually|immediately|suddenly|forever|recently|previously|finally|again)\b')
PLACEADV = R(r'\b(here|there|where|inside|outside|nearby|far|close|everywhere|somewhere|nowhere|abroad|home|away)\b')
COLOUR_ADJ = R(r'^(a |the )?(red|blue|green|yellow|black|white|brown|grey|gray|pink|purple|orange|golden|silver|violet|beige|turquoise|navy)\b|^colou?r')
NUM_ADJ = R(r'^(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b')

BAD_GLOSS = R(r'^(alternative|alternate|obsolete|misspelling|plural of|feminine of|masculine of|defective|dated form|archaic form|form of|nonstandard|abbreviation of|acronym of|initialism|a (male|female|unisex)? ?given name|.*\bsurname\b|.*\bgiven name\b|romanization)')


def head_of(gloss):
    g = re.sub(r'\([^)]*\)', ' ', gloss.lower())
    g = g.split(';')[0]
    return ' '.join(g.replace(',', ' , ').split()[:9])


def classify(e, cats, gloss):
    pos, h = e['pos'], head_of(gloss)
    first = h.split(' , ')[0]
    if pos == 'pron':
        return 'Pronouns'
    if pos == 'num':
        return 'Numbers'
    if pos == 'verb':
        return 'Verbs'
    if pos == 'adj':
        if COLOUR_ADJ.search(first) or 'Colors' in cats:
            return 'Colours'
        if NUM_ADJ.search(first):
            return 'Numbers'
        return 'Adjectives'
    if pos in ('adv', 'prep', 'conj', 'det', 'particle', 'intj'):
        if DIRECTION.search(first):
            return 'Directions'
        if pos in ('adv', 'prep') and TIMEWORD.search(first):
            return 'Time'
        if pos in ('adv', 'prep') and (SPATIAL_PREP.search(first) or PLACEADV.search(first)):
            return 'Location'
        return 'Adjectives' if pos == 'adv' else 'Misc Nouns'
    # nouns
    if DIRECTION.search(first):
        return 'Directions'
    for rx, topic in CAT_RULES:
        if any(rx.search(c) for c in cats):
            return topic
    for topic, rx in KW_RULES:
        # the defining noun is usually in the first comma group; test it before the alternates
        if rx.search(first):
            return topic
    for topic, rx in KW_RULES:
        if rx.search(h):
            return topic
    return 'Misc Nouns'


# ---------------------------------------------------------------- gloss clean-up
def clean_gloss(en, lower_ok):
    g = re.sub(r'\s*\((?:see|cf\.?|compare)[^)]*\)\.?', '', en, flags=re.I)
    g = re.sub(r'\s*\([^)]{28,}\)', '', g)
    g = re.sub(r'\s+', ' ', g).strip(' .;,')
    if len(g) > 90:
        cut = max(g.rfind(';', 0, 90), g.rfind(',', 0, 90))
        g = g[:cut] if cut > 20 else g[:90].rsplit(' ', 1)[0]
    m = re.match(r"[A-Za-z']+", g)
    if m:
        w = m.group(0)
        if w[0].isupper() and w.lower() in lower_ok and not (len(w) > 1 and w[1:].isupper()):
            g = w.lower() + g[len(w):]
    return g.strip(' .;,')



# ---------------------------------------------------------------- curated core (own list of ordinary words)
# (unpointed lemma, expected gloss regex, topic, priority-if-not-already-ranked)
CORE = [(l, g, t, p) for t, p, items in [
    ('Days', 700, [('יום ראשון', r'^Sunday'), ('יום שני', r'^Monday'), ('יום שלישי', r'^Tuesday'), ('יום רביעי', r'^Wednesday'),
                   ('יום חמישי', r'^Thursday'), ('יום שישי', r'^Friday'), ('שבת', r'^(Shabbat|Sabbath|Saturday)')]),
    ('Months', 900, [('ינואר', r'^January'), ('פברואר', r'^February'), ('מרץ', r'^March'), ('אפריל', r'^April'), ('מאי', r'^May'),
                     ('יוני', r'^June'), ('יולי', r'^July'), ('אוגוסט', r'^August'), ('ספטמבר', r'^September'),
                     ('אוקטובר', r'^October'), ('נובמבר', r'^November'), ('דצמבר', r'^December')]),
    ('Months', 2600, [('תשרי', r'^Tishrei'), ('חשוון', r'^Cheshvan|^Marcheshvan'), ('כסלו', r'^Kislev'), ('טבת', r'^Tevet'),
                      ('שבט', r'^Shevat'), ('אדר', r'^Adar'), ('ניסן', r'^Nisan'), ('אייר', r'^Iyar'), ('סיוון', r'^Sivan'),
                      ('תמוז', r'^Tammuz'), ('אב', r'^Av\b'), ('אלול', r'^Elul')]),
    ('Seasons', 800, [('אביב', r'^spring'), ('קיץ', r'^summer'), ('סתיו', r'^autumn|^fall'), ('חורף', r'^winter')]),
    ('Colours', 800, [('אדום', r'^red'), ('כחול', r'^blue'), ('ירוק', r'^green'), ('צהוב', r'^yellow'), ('שחור', r'^black'),
                      ('לבן', r'^white'), ('חום', r'^brown'), ('אפור', r'^gr[ae]y'), ('כתום', r'^orange'), ('סגול', r'^(purple|violet)'),
                      ('ורוד', r'^pink'), ('צבע', r'^colou?r')]),
    ('Directions', 800, [('ימין', r'^right'), ('שמאל', r'^left'), ('ישר', r'straight'), ('צפון', r'^north'), ('דרום', r'^south'),
                         ('מזרח', r'^east'), ('מערב', r'^west'), ('קדימה', r'^forward'), ('אחורה', r'^back'), ('למעלה', r'^(up|above)'),
                         ('למטה', r'^(down|below)'), ('כיוון', r'^(direction|a direction)')]),
    ('Time', 600, [('שעה', r'^hour'), ('דקה', r'^minute'), ('שנייה', r'second'), ('שבוע', r'^week'), ('חודש', r'^month'),
                   ('בוקר', r'morning'), ('צהריים', r'^(noon|midday|afternoon)'), ('ערב', r'^evening'), ('לילה', r'^night'),
                   ('היום', r'^today'), ('מחר', r'^tomorrow'), ('אתמול', r'^yesterday'), ('עכשיו', r'^now')]),
    ('Numbers', 700, [('אפס', r'^(zero|nothing)'), ('שלושה', r'^three'), ('ארבעה', r'^four'), ('חמישה', r'^five'), ('שישה', r'^six'), ('שמונה', r'^eight'),
                      ('תשעה', r'^nine'), ('עשרה', r'^ten'), ('מאה', r'^hundred|^one hundred'), ('אלף', r'^thousand|^one thousand')]),
] for (l, g) in items]


def kaikki_index(lemmas):
    """One pass over the dump: lemma -> list of (pos, pointed, first gloss, cats)."""
    got = collections.defaultdict(list)
    p = os.path.join(CACHE, 'kaikki-hebrew.jsonl')
    if not os.path.exists(p):
        return got
    for line in open(p, encoding='utf8'):
        d = json.loads(line)
        if d.get('lang_code') != 'he' or d['word'] not in lemmas or d.get('pos') not in ('noun', 'name', 'num', 'adj', 'adv'):
            continue
        ht = (d.get('head_templates') or [{}])[0].get('args', {})
        pt = ht.get('wv') or ht.get('dwv') or ht.get('head')
        if pt and not NIQ.search(pt):
            pt = None
        for s in d.get('senses', []):
            gl = (s.get('glosses') or [''])[0]
            got[d['word']].append({'pointed': pt, 'pos': {'name': 'noun'}.get(d['pos'], d['pos']), 'en': gl,
                                   'cats': {c['name'] for c in s.get('categories', [])}})
    return got


def main():
    words = json.load(open(os.path.join(ROOT, 'data/vocab/words.json'), encoding='utf8'))['words']
    pool = sorted([x for x in words if x['kind'] == 'word' and x['frequencyRank']], key=lambda x: x['frequencyRank'])
    lower_ok = set()
    for x in pool:
        for m in re.finditer(r"(?<![A-Za-z'])[a-z][a-z']+", x['en']):
            lower_ok.add(m.group(0))
    idx = load_cats()
    cand, dropped, seen = [], collections.Counter(), set()
    byunp = collections.defaultdict(list)
    for x in pool:
        byunp[x['heUnpointed']].append(x)
    for x in pool:
        pointed, unp = x['he'], x['heUnpointed']
        if not pointed or not NIQ.search(pointed):
            pointed = None
        if BAD_GLOSS.search(x['en']):
            dropped['non-lemma-or-name-gloss'] += 1
            continue
        cats = cats_for(idx, unp, x['pos'], x['en'])
        if cats & {'Hebrew given names', 'Hebrew surnames', 'Hebrew male given names', 'Hebrew female given names',
                   'Hebrew unisex given names', 'Hebrew letter names', 'Greek letter names', 'Hebrew onomatopoeias', 'Hebrew symbols', 'Hebrew diacritical marks', 'Punctuation marks', 'Diacritical marks'}:
            dropped['name-letter-symbol-or-sound'] += 1
            continue
        gloss = clean_gloss(x['en'], lower_ok)
        if len(gloss) <= 1 or gloss.lower() in ('an', 'the', 'to'):  # upstream gloss lost its content in parenthesis stripping
            alt = [g for k in idx.get((unp, x['pos']), []) for g in k[0] if g]
            if alt:
                g2 = re.sub(r'\s+', ' ', re.sub(r'\s*\([^)]*\)', '', alt[0])).strip(' .;,')
                g2 = re.sub(r'^(a|an|the) ', '', g2)
                gloss = g2[:90]
            dropped['gloss-repaired'] += 1
        topic = classify(x, cats, gloss)
        cand.append({'lemma': unp, 'pointed': pointed, 'pos': x['pos'], 'gloss': gloss, 'topic': topic,
                     'prio': x['frequencyRank'], 'core': False, 'sourceRank': x['frequencyRank'],
                     'readList': bool(x['readRank'] and x['readRank'] <= 3100)})
    # curated core: override topic when already ranked, else add from Wiktionary with a fixed priority
    kk = kaikki_index({c[0] for c in CORE})
    added, core_missing = 0, []
    for lemma, gre, topic, prio in CORE:
        rx = re.compile(gre, re.I)
        hits = [c for c in cand if c['lemma'] == lemma and rx.search(c['gloss'])]
        if hits:
            hits[0]['topic'] = topic
            hits[0]['core'] = True
            continue
        ks = [k for k in kk.get(lemma, []) if rx.search(k['en'])]
        if not ks:
            core_missing.append(lemma)
            continue
        k = ks[0]
        cand.append({'lemma': lemma, 'pointed': k['pointed'], 'pos': k['pos'], 'gloss': clean_gloss(k['en'], lower_ok),
                     'topic': topic, 'prio': prio, 'core': True, 'sourceRank': None, 'readList': False})
        added += 1
    cand.sort(key=lambda c: (c['prio'], c['lemma']))
    out = []
    for c in cand:
        if len(out) == N:
            break
        key = (c['pointed'] or c['lemma'], c['pos'])
        if key in seen:
            dropped['duplicate-lemma-pos'] += 1
            continue
        seen.add(key)
        r = len(out) + 1
        out.append({
            'rank': r, 'lemma': c['lemma'], 'pointed': c['pointed'], 'needsPointing': c['pointed'] is None,
            'pos': c['pos'], 'topic': c['topic'], 'gloss': c['gloss'], 'tier': next(t for t in TIERS if r <= t),
            'id': 'v' + hashlib.sha1(('%s|%s' % (c['pointed'] or c['lemma'], c['pos'])).encode('utf8')).hexdigest()[:8],
            'proofread': False, 'pointedSource': 'wiktionary' if c['pointed'] else None,
            'readList': c['readList'], 'curatedCore': c['core'], 'sourceRank': c['sourceRank'],
        })
    print('core added from Wiktionary:', added, '; core lemmas not found/pointed:', core_missing)
    if len(out) < N:
        sys.exit('only %d entries' % len(out))
    top = collections.Counter(o['topic'] for o in out)
    doc = {
        'schema': 'alef-vocab5k/1',
        'generated': '2026-11-03',
        'count': len(out),
        'topics': TOPICS,
        'tiers': {str(t): sum(1 for o in out if o['tier'] <= t) for t in TIERS},
        'licence': 'Entries derived from Wiktionary (CC BY-SA 4.0 + GFDL) and OpenSubtitles frequencies (hermitdave/FrequencyWords, CC BY-SA 4.0). See docs/vocab/LICENSES.md.',
        'entries': out,
    }
    with open(os.path.join(ROOT, 'data/vocab/vocab5000.json'), 'w', encoding='utf8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=0, separators=(',', ':'))
    print('wrote', len(out), 'entries; dropped', dict(dropped))
    print({t: top.get(t, 0) for t in TOPICS})


if __name__ == '__main__':
    main()
