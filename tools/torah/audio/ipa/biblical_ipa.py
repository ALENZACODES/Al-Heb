"""Pointed Torah text -> IPA, one entry per spoken word.

The pointed source decides the sounds; this file only adds the two things the points leave open:
  stress   read from the chanting mark on each word (pre- and postpositive marks are skipped,
           a doubled pashta uses the first one); words with no usable mark keep the default
  sheva    vocal at the start of a word, under a doubled (dagesh) letter after a vowel, after a
           silent sheva, before an identical letter, and after a vowel the source marks with meteg
It also reads qamats as "o" in a closed unstressed syllable (and before hataf qamats), and drops a
consonant with no points in the middle of a word (a written-only letter, such as the second shin of
Issachar). The divine name has already been replaced by its spoken form (spoken.mjs).

Phonikud turns the marked text into IPA: https://github.com/thewh1teagle/phonikud
Convention: contemporary Israeli/Sephardi five vowels, as the opening prayer and the word clips use.

  python biblical_ipa.py              # writes ipa.json next to this file and prints a summary
"""
import json
import re
import sys
from pathlib import Path

from phonikud import phonemize

HERE = Path(__file__).resolve().parent

LETTER = re.compile('[א-ת]')
ACCENTS = {chr(c) for c in range(0x0591, 0x05AF + 1)}
PREPOSITIVE = {'֠', '֭', '֚'}            # telisha gedola, dehi, yetiv
POSTPOSITIVE = {'֒', '֙', '֩', '֮'}  # segol, pashta, telisha qetana, zarqa
PASHTA = '֙'
SHEVA, HATAF_QAMATS, QAMATS, QAMATS_QATAN = 'ְ', 'ֳ', 'ָ', 'ׇ'
DAGESH, METEG, MAQAF = 'ּ', 'ֽ', '־'
VOWELS = set('ֱֲֳִֵֶַָׇֹֺֻ')
LONG = set('ֵָֹ')                         # qamats, tsere, holam
KEEP = VOWELS | {SHEVA, DAGESH, 'ׁ', 'ׂ'}      # what survives into the phonemizer
HATAMA, VOCAL = '֫', 'ֽ'                       # phonikud's own stress and vocal-sheva marks
UNSTRESSED = '\u2063'  # internal tag: a maqaf part with no stress of its own
MATRES = set('אהוי')
FINAL = str.maketrans('ךםןףץ', 'כמנפצ')
BGDKPT = set('בגדכפת')


def letters(segment):
    """[(letter, set_of_marks)] for one maqaf-free segment."""
    out = []
    for ch in segment:
        if LETTER.match(ch):
            out.append([ch, []])
        elif out:
            out[-1][1].append(ch)
    return out


def has_vowel(marks):
    return any(m in VOWELS for m in marks)


def is_shuruq(lt):
    return lt[0] == 'ו' and DAGESH in lt[1] and not has_vowel(lt[1]) and SHEVA not in lt[1]


def vowel_bearing(lt):
    return has_vowel(lt[1]) or is_shuruq(lt)


def is_holam_vav(lt):
    return lt[0] == 'ו' and '\u05b9' in lt[1] and not any(m in VOWELS for m in lt[1] if m != '\u05b9')


def stress_index(ls, final_word=False):
    """Index of the stressed letter from the chanting marks, or None. The last word of a verse
    carries silluq, which is the same character as meteg, so there the last meteg marks the stress."""
    hits = []
    for i, (_, marks) in enumerate(ls):
        for m in marks:
            if m in ACCENTS:
                hits.append((i, m))
    usable = [i for i, m in hits if m not in PREPOSITIVE and m not in POSTPOSITIVE]
    pashtas = [i for i, m in hits if m == PASHTA]
    if len(pashtas) >= 2:
        usable.append(pashtas[0])
    if not usable and any(m == '\u059a' for _, m in hits):
        usable = [next((j for j, lt in enumerate(ls) if vowel_bearing(lt) or (j + 1 < len(ls) and (is_shuruq(ls[j + 1]) or is_holam_vav(ls[j + 1])))), 0)]
    if not usable and final_word:
        usable = [i for i, (_, marks) in enumerate(ls) if METEG in marks][-1:]
    if not usable:
        return None
    i = max(usable)
    # the mark sits on the consonant of the stressed syllable; a mark on a vowel-less letter (a mater
    # such as the vav of holam) belongs to the nearest earlier letter that carries the vowel
    # a consonant whose vowel is the following shuruq or holam vav keeps the mark (phonikud reads it there)
    while i > 0 and not vowel_bearing(ls[i]) and not (i + 1 < len(ls) and (is_shuruq(ls[i + 1]) or is_holam_vav(ls[i + 1]))):
        i -= 1
    return i


def nuclei(ls):
    """Letters that start a full syllable (vowel on the letter, or carried by the next shuruq / holam vav)."""
    out = []
    for i, lt in enumerate(ls):
        carrier = is_shuruq(lt) or is_holam_vav(lt)
        if carrier and i > 0 and not vowel_bearing(ls[i - 1]) and SHEVA not in ls[i - 1][1]:
            continue
        nxt = ls[i + 1] if i + 1 < len(ls) else None
        if vowel_bearing(lt) or (nxt and (is_shuruq(nxt) or is_holam_vav(nxt)) and SHEVA not in lt[1]):
            out.append(i)
    return out


def word_key(ls):
    return ''.join(ch + ''.join(m for m in marks if m in KEEP) for ch, marks in ls)


LEXICON = {}  # pointed word -> syllables after the stressed one, learned from words whose marks show it


def learn(segment, final_word=False):
    ls = letters(segment)
    if not ls:
        return
    i = stress_index(ls, final_word)
    nu = nuclei(ls)
    if i is None:
        marks = {m for _, ms in ls for m in ms}
        if PASHTA not in marks:
            return
        k = 0                                   # a single pashta: stress on the last syllable
    elif i in nu:
        k = len(nu) - 1 - nu.index(i)
    else:
        return
    LEXICON.setdefault(word_key(ls), {}).setdefault(k, 0)
    LEXICON[word_key(ls)][k] += 1


def lexicon_stress(ls):
    seen = LEXICON.get(word_key(ls))
    nu = nuclei(ls)
    if not seen or not nu:
        return None
    k = max(seen, key=seen.get)
    return nu[-1 - k] if k < len(nu) else None


def mark_word(segment, unstressed=False, final_word=False):
    """Phonikud-ready text for one segment, plus notes on anything it had to guess."""
    ls = letters(segment)
    notes = []
    if not ls:
        return '', notes
    s = None if unstressed else stress_index(ls, final_word)
    if s is None and not unstressed and PASHTA not in {m for _, ms in ls for m in ms}:
        s = lexicon_stress(ls)
        notes.append('stress-default' if s is None else 'stress-lexicon')
        nu = nuclei(ls)
        if s is None and len(nu) >= 2 and ls[-1][0] in 'חעה' and '\u05b7' in ls[-1][1] and nu[-1] == len(ls) - 1:
            s = nu[-2]                          # furtive patah (רוּחַ, הָרָקִיעַ): stress stays before it
    n = len(ls)
    key = word_key(ls)
    if 'אֲדֹנָי' in key or 'אֱלֹהִים' in key:
        s = nuclei(ls)[-1]                      # the spoken divine name keeps its own final stress
    # drop written-only consonants: no points at all, not a vowel letter, not word-final
    keep = []
    for i, (ch, marks) in enumerate(ls):
        bare = not any(m in KEEP for m in marks)
        carried = i + 1 < n and (is_shuruq(ls[i + 1]) or is_holam_vav(ls[i + 1]))
        if bare and not carried and i not in (0, n - 1) and ch not in MATRES and ch != 'ש':
            notes.append('dropped-unpointed-' + ch)
            continue
        keep.append(i)
    meteg = [METEG in m for _, m in ls]
    vocal = [False] * n
    silent_prev = False
    for i, (ch, marks) in enumerate(ls):
        if SHEVA not in marks:
            silent_prev = False
            continue
        last = i == n - 1 or all(not vowel_bearing(ls[j]) and SHEVA not in ls[j][1] for j in range(i + 1, n))
        if last:
            silent_prev = False
            continue
        prev = ls[i - 1] if i > 0 else None
        v = (
            i == 0
            or (prev and silent_prev)
            or (prev and DAGESH in marks and vowel_bearing(prev))
            or (i + 1 < n and ls[i + 1][0].translate(FINAL) == ch.translate(FINAL))
            or (prev and meteg[i - 1] and (set(prev[1]) & LONG or is_shuruq(prev)))
        )
        vocal[i] = bool(v)
        silent_prev = not v
    qatan = [False] * n
    if key in ('כָּל', 'כָל'):
        qatan[0] = True                         # כָּל before maqaf is always "kol"
    for i, (ch, marks) in enumerate(ls):
        if qatan[i] or QAMATS not in marks or i == s or meteg[i]:
            continue
        nxt = ls[i + 1] if i + 1 < n else None
        if nxt and HATAF_QAMATS in nxt[1]:
            qatan[i] = True
        elif nxt and SHEVA in nxt[1] and i + 2 < n and ls[i + 2][0] in BGDKPT and DAGESH in ls[i + 2][1]:
            qatan[i] = True                   # closed syllable: the dagesh after the sheva proves it silent (קָרְבָּן)
        elif unstressed and nxt and i + 1 == n - 1 and not vowel_bearing(nxt) and nxt[0] not in 'אה':
            qatan[i] = True                   # כָּל־ and the like: closed, unstressed, before maqaf
    out = []
    for i in keep:
        ch, marks = ls[i]
        kept = [m for m in marks if m in KEEP]
        if qatan[i]:
            kept = [QAMATS_QATAN if m == QAMATS else m for m in kept]
            notes.append('qamats-qatan')
        if vocal[i]:
            kept.append(VOCAL)
        if i == s:
            kept.append(HATAMA)
        out.append(ch + ''.join(kept))
    return ''.join(out) + (UNSTRESSED if unstressed else ''), notes


def verse_words(spoken):
    """Split a verse into spoken words; a maqaf-joined word is one word whose earlier parts are unstressed."""
    text = re.sub('[׀׃ֿׄ׀]', ' ', spoken)
    words = []
    tokens = text.split()
    for t_i, token in enumerate(tokens):
        parts = [p for p in token.split(MAQAF) if LETTER.search(p)]
        if not parts:
            continue
        marked, notes = [], []
        for k, p in enumerate(parts):
            # an earlier maqaf part keeps its own stress only when it carries a real chanting mark
            ls = letters(p)
            last = t_i == len(tokens) - 1 and k == len(parts) - 1
            own = stress_index(ls, last) is not None
            m, nt = mark_word(p, unstressed=(k < len(parts) - 1 and not own), final_word=last)
            marked.append(m)
            notes += nt
        words.append({'source': token, 'marked': marked, 'notes': notes})
    return words


def build_lexicon(rows):
    for r in rows:
        text = re.sub('[\u05bf\u05c4]', '', r['spoken'])
        tokens = re.sub('[\u05c0\u05c3׀]', ' ', text).split()
        for t_i, token in enumerate(tokens):
            parts = [p for p in token.split(MAQAF) if LETTER.search(p)]
            for k, p in enumerate(parts):
                learn(p, final_word=(t_i == len(tokens) - 1 and k == len(parts) - 1))


OVERRIDES = {  # written-only letters the general rule cannot read; spoken as the reading tradition has it
    ('torah-exodus-14-5', 'וַיֹּֽאמרוּ֙'): 'vajomʁˈu',
    ('torah-numbers-34-14', 'הָראוּבֵנִי֙'): 'haʁeʔuvenˈi',
    ('torah-deuteronomy-7-8', 'וּמִשָּׁמְר֤ו'): 'umiʃomʁˈo',
    ('torah-deuteronomy-29-7', 'לָרֽאוּבֵנִ֖י'): 'laʁeʔuvenˈi',
}


def ipa_of(marked_parts):
    out = []
    for m in marked_parts:
        tag = m.endswith(UNSTRESSED)
        m = m.rstrip(UNSTRESSED)
        p = phonemize(m, predict_vocal_shva=False, predict_stress=HATAMA in m or not tag, use_expander=False)
        out.append(p.strip())
    return ' '.join(x for x in out if x)


def main():
    rows = json.loads((HERE / 'spoken.json').read_text(encoding='utf8'))
    build_lexicon(rows)
    out, counts, total = [], {}, 0
    for r in rows:
        words = verse_words(r['spoken'])
        vid = f"torah-{r['book']}-{r['chapter']}-{r['verse']}"
        for w in words:
            w['ipa'] = OVERRIDES.get((vid, w['source'])) or ipa_of(w['marked'])
            if (vid, w['source']) in OVERRIDES:
                w['notes'] = [n for n in w['notes'] if not n.startswith('dropped')] + ['override']
            for nt in w['notes']:
                key = nt if not nt.startswith('dropped') else 'dropped-unpointed'
                counts[key] = counts.get(key, 0) + 1
            total += 1
        out.append({'id': f"torah-{r['book']}-{r['chapter']}-{r['verse']}", 'book': r['book'], 'chapter': r['chapter'], 'verse': r['verse'],
                    'he': r['he'], 'words': [{'source': w['source'], 'ipa': w['ipa'], 'notes': w['notes']} for w in words],
                    'ipa': ' '.join(w['ipa'] for w in words)})
    (HERE / 'ipa.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
    print(json.dumps({'verses': len(out), 'words': total, 'notes': counts}, ensure_ascii=False))


if __name__ == '__main__':
    if len(sys.argv) > 1:
        for v in sys.argv[1:]:
            print(v, '->', ipa_of(verse_words(v)[0]['marked']))
    else:
        main()
