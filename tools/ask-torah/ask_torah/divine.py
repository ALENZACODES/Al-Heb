"""Render the four-letter Name as ה׳ in Hebrew. Never spell it out; never voice it."""
from __future__ import annotations

import re

NAME_SKELETON = "יהוה"
NAME_ABBREV = "ה׳"
LORD_EN = "the LORD"
PREFIX_LETTERS = "ובלמכשה"
HEB_LETTER = re.compile(r"[א-ת]")
MAQAF = "\u05BE"
LATIN_NAME = re.compile(r"\b(?:yhwh|yhvh|yahweh|yahveh|yahwe|jehovah|yehovah|yehova|yehwah)\b", re.I)


def consonants(s: str) -> str:
    return "".join(c for c in s if "א" <= c <= "ת")


def hebrew_words(text: str) -> list[tuple[str, int]]:
    out: list[tuple[str, int]] = []
    for m in re.finditer(r"[א-ת֑-ׇ]+", text):
        run = m.group(0)
        if MAQAF not in run:
            out.append((run, m.start()))
            continue
        at = 0
        for part in run.split(MAQAF):
            if part:
                out.append((part, m.start() + at))
            at += len(part) + 1
    return out


def _kind(word: str) -> tuple[str, str] | None:
    c = consonants(word)
    if c == NAME_SKELETON:
        return ("exact", "")
    if c == "יי":
        return ("abbrev", "")
    m = re.match(rf"^([{PREFIX_LETTERS}]{{1,3}}){NAME_SKELETON}$", c)
    if m:
        return ("prefixed", m.group(1))
    return None


def display_hebrew(he: str) -> str:
    """Show the Name as ה׳. Prefixed forms keep the prefix letters, then ה׳."""
    s = str(he)
    out, last = [], 0
    for word, index in hebrew_words(s):
        k = _kind(word)
        if not k or k[0] == "abbrev":
            continue
        kind, prefix = k
        head = ""
        if kind == "prefixed":
            seen, cut = 0, len(word)
            for i, ch in enumerate(word):
                if HEB_LETTER.match(ch):
                    if seen == len(prefix):
                        cut = i
                        break
                    seen += 1
            head = word[:cut]
        out.append(s[last:index] + head + NAME_ABBREV)
        last = index + len(word)
    return "".join(out) + s[last:]


def display_english(en: str) -> str:
    """Never spell the four-letter Name in Latin letters. JPS already uses 'the LORD' or 'God'."""
    s = str(en)
    if LATIN_NAME.search(s):
        return LATIN_NAME.sub(LORD_EN, s)
    return s


def speech_blocked(text: str) -> bool:
    """The Name is never sent to a voice. This lane does not speak verses at all."""
    if LATIN_NAME.search(text):
        return True
    for word, _ in hebrew_words(text):
        k = _kind(word)
        if k and k[0] in ("exact", "prefixed"):
            return True
    return False
