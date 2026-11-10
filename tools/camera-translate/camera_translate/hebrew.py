"""Hebrew text helpers for the camera translator: mark stripping, the sacred-name guard, the sign word list.

The sacred-name rules mirror src/shell/names.js (the app's one convention): the four-letter name is never
sent to a translator, never drawn in an overlay and never offered for pronunciation. A region that contains
it is left exactly as photographed.
"""
from __future__ import annotations

import json
import re
import subprocess
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


class Glossary:
    """The sign word list. The matching rules live in ONE place, the app's own code (src/camera/camera-model.js); this
    class runs them through Node (tools/camera-translate/translate-cli.mjs), so the test rig can never drift from the app.
    Needs `node` on the PATH."""

    def __init__(self, data: dict | None = None):
        self.data = data or {}
        self._cache: dict[str, dict] = {}

    @classmethod
    def load(cls, path: Path | None = None) -> 'Glossary':
        path = path or Path(__file__).with_name('sign-glossary.json')
        return cls(json.loads(Path(path).read_text(encoding='utf-8')))

    def translate_many(self, lines: list[str]) -> list[dict]:
        todo = [l for l in dict.fromkeys(lines) if l not in self._cache]
        if todo:
            cli = Path(__file__).resolve().parents[1] / 'translate-cli.mjs'
            try:
                r = subprocess.run(['node', str(cli)], input=json.dumps(todo, ensure_ascii=False).encode('utf-8'), capture_output=True, timeout=120)
            except (OSError, subprocess.SubprocessError) as exc:
                raise RuntimeError('the word-list rules need Node.js (node) to run') from exc
            if r.returncode != 0:
                raise RuntimeError('word-list rules failed: ' + r.stderr.decode('utf-8', 'replace')[-300:])
            for line, res in zip(todo, json.loads(r.stdout.decode('utf-8'))):
                self._cache[line] = {'en': res.get('en'), 'status': res.get('status', 'none'), 'translit': res.get('translit'), 'pointed': res.get('pointed')}
        return [dict(self._cache[l]) for l in lines]

    def translate(self, text: str) -> dict:
        """-> {en, status: 'full'|'near'|'none', translit, pointed}."""
        return self.translate_many([str(text or '')])[0]
