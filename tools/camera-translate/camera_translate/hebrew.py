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


def _one_edit_apart(a: str, b: str) -> bool:
    """True when a and b differ by exactly one substituted, missing or extra letter."""
    if a == b or abs(len(a) - len(b)) > 1:
        return False
    if len(a) == len(b):
        return sum(x != y for x, y in zip(a, b)) == 1
    short, long_ = (a, b) if len(a) < len(b) else (b, a)
    return any(long_[:i] + long_[i + 1:] == short for i in range(len(long_)))


class Glossary:
    """Offline word list: whole-phrase and longest-match lookup. Every word must be known or nothing is returned.

    A word of four or more letters that is not in the list but is exactly one letter away from exactly one listed word
    is treated as that word (OCR often confuses look-alike letters); the result is then marked 'near', never 'full'.
    """

    def __init__(self, data: dict):
        self.entries = {' '.join(tokens(e['he'])): e for e in data.get('entries', [])}
        self.max_len = max((len(k.split()) for k in self.entries), default=1)
        self.patterns = {p['head']: p['en'] for p in data.get('patterns', [])}
        self.vocab = sorted({t for k in self.entries for t in k.split()})

    def near(self, tok: str) -> str | None:
        if len(tok) < 4:
            return None
        hits = [v for v in self.vocab if len(v) >= 3 and _one_edit_apart(tok, v)]
        return hits[0] if len(hits) == 1 else None

    @classmethod
    def load(cls, path: Path | None = None) -> 'Glossary':
        path = path or Path(__file__).with_name('sign-glossary.json')
        return cls(json.loads(Path(path).read_text(encoding='utf-8')))

    def segments(self, text: str) -> list[dict] | None:
        """Greedy longest match. Returns [{he, en, pointed, translit, kind}] or None if any word is unknown."""
        toks = tokens(text)
        if not toks:
            return None
        self._near_used = False
        fixed = []
        for t in toks:
            if t in self.vocab or _NUM_RE.match(t) or _LATIN_RE.match(t):
                fixed.append(t)
                continue
            n = self.near(t)
            if n:
                self._near_used = True
            fixed.append(n or t)
        toks = fixed
        out, i = [], 0
        while i < len(toks):
            if _NUM_RE.match(toks[i]) or _LATIN_RE.match(toks[i]):
                out.append({'he': toks[i], 'en': toks[i], 'pointed': None, 'translit': toks[i], 'kind': 'literal'})
                i += 1
                continue
            for n in range(min(self.max_len, len(toks) - i), 0, -1):
                e = self.entries.get(' '.join(toks[i:i + n]))
                if e:
                    out.append({'he': e['he'], 'en': e['en'], 'pointed': e.get('pointed'), 'translit': e.get('translit'), 'kind': 'word'})
                    i += n
                    break
            else:
                return None
        return out

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
            en = ' '.join(s['en'] for s in segs)
        return {'en': en, 'status': 'near' if self._near_used else 'full',
                'translit': ' '.join(s['translit'] for s in segs if s['translit']),
                'pointed': ' '.join(s['pointed'] or s['he'] for s in segs)}
