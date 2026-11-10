"""Hebrew text helpers for the camera translator: mark stripping, the sacred-name guard, the sign word list.

The sacred-name rules mirror src/shell/names.js (the app's one convention): the four-letter name is never
sent to a translator, never drawn in an overlay and never offered for pronunciation. A region that contains
it is left exactly as photographed.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

MARKS_RE = re.compile('[֑-ׇֽֿׁׂׅׄ]')
HEB_LETTER_RE = re.compile('[א-ת]')
HEB_RUN_RE = re.compile('[א-ת֑-ׇ]+')
MAQAF = '־'
# Built from code points so the name is never spelled out in this file: yod, he, vav, he.
NAME_SKELETON = 'יהוה'
PREFIX_LETTERS = 'ובלמכשה'
_PREFIXED_RE = re.compile(f'^[{PREFIX_LETTERS}]{{1,3}}{NAME_SKELETON}$')
_LATIN_NAME_RE = re.compile(r'\b(?:yhwh|yhvh|yahweh|yahveh|yahwe|jehovah|yehovah|yehova|yehwah)\b', re.I)
TRANSLIT_SUBSTITUTE = 'Adonai'


def strip_marks(text: str) -> str:
    """Remove vowel points and cantillation; keep letters, maqaf and punctuation."""
    return MARKS_RE.sub('', str(text or ''))


def has_hebrew(text: str) -> bool:
    return bool(HEB_LETTER_RE.search(str(text or '')))


def consonants(text: str) -> str:
    return ''.join(HEB_LETTER_RE.findall(str(text or '')))


def contains_sacred_name(text: str) -> bool:
    """True when any Hebrew word in `text` is the four-letter name, alone or with attached prefix letters."""
    for run in HEB_RUN_RE.findall(str(text or '')):
        for part in run.split(MAQAF):
            c = consonants(part)
            if c == NAME_SKELETON or _PREFIXED_RE.match(c):
                return True
    return False


def has_latin_name(text: str) -> bool:
    """True when a Latin-script string spells the four-letter name."""
    return bool(_LATIN_NAME_RE.search(str(text or '')))


# ---------------------------------------------------------------- sign word list

_PUNCT_RE = re.compile('[\\s\\.,;:!\\?\\-־׳״"\'\\(\\)\\[\\]|/\\\\]+')
_NUM_RE = re.compile(r'^[0-9]+(?:[.,:][0-9]+)*%?$|^[₪$€]$')
_LATIN_RE = re.compile(r"^[A-Za-z][A-Za-z0-9'&.-]*$")


def tokens(text: str) -> list[str]:
    """Split a line into words: marks removed, punctuation dropped, numbers kept whole."""
    out = []
    for raw in strip_marks(text).split():
        raw = raw.strip('.,;:!?"\'()[]|-־׳״')
        if not raw:
            continue
        if _NUM_RE.match(raw):
            out.append(raw)
            continue
        out.extend(p for p in _PUNCT_RE.split(raw) if p)
    return out


def _substitutions(a: str, b: str) -> float:
    return sum(x != y for x, y in zip(a, b)) if len(a) == len(b) else float('inf')


def _one_added_or_removed(a: str, b: str) -> bool:
    if abs(len(a) - len(b)) != 1:
        return False
    short, long_ = (a, b) if len(a) < len(b) else (b, a)
    return any(long_[:i] + long_[i + 1:] == short for i in range(len(long_)))


LOOK_ALIKE = ['בכ', 'דר', 'הח', 'חת', 'הת', 'וז', 'וי', 'ון', 'סם', 'סט', 'גנ']
_ALIKE = {p for q in LOOK_ALIKE for p in (q, q[1] + q[0])}
_MIXED_NUM_RE = re.compile('^[0-9וןס.,:]+$')
_PLAIN_NUM_RE = re.compile('^[0-9.,:]+$')


def two_look_alikes(a: str, b: str) -> bool:
    """Same length, exactly two letters different, both of them look-alike pairs."""
    if len(a) != len(b):
        return False
    d = 0
    for x, y in zip(a, b):
        if x != y:
            if x + y not in _ALIKE:
                return False
            d += 1
    return d == 2


def repair_number(tok: str) -> str | None:
    """'2ו' -> '12': a price whose digit 1 or 0 was read as a look-alike Hebrew letter (the mixed token comes out reversed)."""
    if not re.search('[0-9]', tok) or not _MIXED_NUM_RE.match(tok) or _PLAIN_NUM_RE.match(tok):
        return None
    fixed = tok[::-1].replace('ו', '1').replace('ן', '1').replace('ס', '0')
    return fixed if _NUM_RE.match(fixed) else None


def hebrew_tokens(text: str) -> list[str]:
    """Hebrew part of a line. On a bilingual sign the reader returns both languages on one line; Latin words (and a number
    that follows one) are dropped. A line that repeats itself is halved. [] when the line has no Hebrew word."""
    all_ = tokens(text)
    if not any(has_hebrew(t) for t in all_):
        return []
    out, in_latin = [], False
    for t in all_:
        if _LATIN_RE.match(t):
            in_latin = True
            continue
        if _NUM_RE.match(t):
            if not in_latin:
                out.append(t)
            continue
        in_latin = False
        out.append(t)
    half = len(out) // 2
    if len(out) >= 2 and len(out) % 2 == 0 and out[:half] == out[half:]:
        return out[:half]
    return out


class Glossary:
    """Offline word list: whole-phrase and longest-match lookup. Every word must be known or nothing is returned.

    Same rules as createGlossary in src/camera/camera-model.js (both are held to data/camera/glossary-cases.json).
    Near matches, always marked 'near': a listed other form (variants); else exactly one listed word with one letter
    different; else exactly one with one letter added or removed; else exactly one with two letters different where both
    are look-alike pairs. A tie is broken only by a listed phrase with the word
    beside it. A real word that sits one letter from a listed word (realNeighbours) is corrected only on that same evidence.
    """

    def __init__(self, data: dict):
        self.entries = {' '.join(tokens(e['he'])): e for e in data.get('entries', [])}
        self.max_len = max((len(k.split()) for k in self.entries), default=1)
        self.patterns = {p['head']: p['en'] for p in data.get('patterns', [])}
        self.vocab = sorted({t for k in self.entries for t in k.split()})
        self._vocab_set = set(self.vocab)
        self.variants = {v['he']: v for v in data.get('variants', [])}
        self.real = set(data.get('realNeighbours', []))
        self._near_used = False

    @classmethod
    def load(cls, path: Path | None = None) -> 'Glossary':
        path = path or Path(__file__).with_name('sign-glossary.json')
        return cls(json.loads(Path(path).read_text(encoding='utf-8')))

    def _phrase_with(self, cand: str, prev: str | None, nxt: str | None) -> bool:
        return bool((prev and f'{prev} {cand}' in self.entries) or (nxt and f'{cand} {nxt}' in self.entries))

    def near(self, tok: str, prev: str | None = None, nxt: str | None = None) -> str | None:
        if len(tok) < 4:
            return None
        pool = [v for v in self.vocab if len(v) >= 3]
        for hits in ([v for v in pool if _substitutions(tok, v) == 1], [v for v in pool if _one_added_or_removed(tok, v)],
                     [v for v in pool if two_look_alikes(tok, v)]):
            fit = [h for h in hits if self._phrase_with(h, prev, nxt)]
            if tok in self.real:
                if len(fit) == 1:
                    return fit[0]
                continue
            if len(hits) == 1:
                return hits[0]
            if len(hits) > 1:
                return fit[0] if len(fit) == 1 else None
        return None

    def segments(self, text: str) -> list[dict] | None:
        """Greedy longest match. Returns [{he, en, pointed, translit, kind}] or None if any word is unknown."""
        raw = hebrew_tokens(text)
        if not raw:
            return None
        self._near_used = False
        toks = []
        for i, t in enumerate(raw):
            if t in self._vocab_set or _NUM_RE.match(t):
                toks.append(t)
                continue
            fixed = repair_number(t)
            if fixed:
                self._near_used = True
                toks.append(fixed)
                continue
            if len(t) > 3 and t[0] == '\u05d4' and t[1:] in self._vocab_set:      # "the" joined to a listed word
                toks.append(t[1:])
                continue
            v = self.variants.get(t)
            if v and v['of'] in self._vocab_set:
                self._near_used = self._near_used or not v.get('exact')
                toks.append(v['of'])
                continue
            n = self.near(t, raw[i - 1] if i else None, raw[i + 1] if i + 1 < len(raw) else None)
            if n:
                self._near_used = True
            toks.append(n or t)
        out, i = [], 0
        while i < len(toks):
            if _NUM_RE.match(toks[i]):
                out.append({'he': toks[i], 'en': toks[i], 'pointed': None, 'translit': toks[i], 'kind': 'literal'})
                i += 1
                continue
            for n in range(min(self.max_len, len(toks) - i), 0, -1):
                e = self.entries.get(' '.join(toks[i:i + n]))
                if e:
                    out.append({'he': e['he'], 'en': e['en'], 'pointed': e.get('pointed'), 'translit': e.get('translit'), 'kind': 'word',
                                'describes': bool(e.get('describes'))})
                    i += n
                    break
            else:
                return None
        return out if any(s['kind'] == 'word' for s in out) else None

    def translate(self, text: str) -> dict:
        """-> {en, status: 'full'|'near'|'none', translit, pointed}."""
        segs = self.segments(text)
        if not segs:
            return {'en': None, 'status': 'none', 'translit': None, 'pointed': None}
        head = segs[0]['he']
        words = [s for s in segs if s['kind'] == 'word']
        if head in self.patterns and len(words) >= 2:
            rest = ' '.join(s['en'] for s in segs[1:])
            en = self.patterns[head].replace('{x}', rest)
        else:
            order = [s['en'] for s in segs]       # a describing word that follows its noun in Hebrew goes before it in English
            i = 0
            while i + 1 < len(segs):
                if segs[i]['kind'] == 'word' and not segs[i].get('describes') and segs[i + 1].get('describes'):
                    order[i], order[i + 1] = order[i + 1], order[i]
                    i += 1
                i += 1
            en = ' '.join(order)
        return {'en': en, 'status': 'near' if self._near_used else 'full',
                'translit': ' '.join(s['translit'] for s in segs if s['translit']),
                'pointed': ' '.join(s['pointed'] or s['he'] for s in segs)}
