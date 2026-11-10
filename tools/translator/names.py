"""Divine-name hold. Mirror of src/shell/names.js speechSafeText. Never speak the four-letter Name."""
from __future__ import annotations
import re

NAME_SKELETON = "יהוה"
SPOKEN_NAME = "אֲדֹנָי"
ELOHIM_QERE = "אֱלֹהִים"
NAME_ABBREV = "ה׳"
TRANSLIT_SUBSTITUTE = "Adonai"
HEB_LETTER = re.compile(r"[א-ת]")
LATIN_NAME = re.compile(r"\b(?:yhwh|yhvh|yahweh|yahveh|yahwe|jehovah|yehovah|yehova|yehwah)\b", re.I)
PREFIX_LETTERS = "ובלמכשה"
TRAILING_PUNCT = re.compile(r"[\u05C0\u05C3\u05C6]+$")
HIRIQ_ON_VAV = re.compile(r"ו[\u0591-\u05C7]*\u05B4[\u0591-\u05C7]*ה")
WORD_RE = re.compile(r"[א-ת֑-ׇ]+")
MAQAF = "\u05BE"


def consonants(s: str) -> str:
    return "".join(c for c in s if HEB_LETTER.match(c))


def spoken_name_for(word: str) -> str:
    return ELOHIM_QERE if HIRIQ_ON_VAV.search(word) else SPOKEN_NAME


def classify_name_word(word: str):
    c = consonants(word)
    if c == NAME_SKELETON:
        return {"kind": "exact", "prefix": ""}
    if c == "יי" and re.fullmatch(r"[א-ת֑-ׇ]+", word):
        return {"kind": "abbrev", "prefix": ""}
    m = re.fullmatch(rf"([{PREFIX_LETTERS}]{{1,3}}){NAME_SKELETON}", c)
    if m:
        return {"kind": "prefixed", "prefix": m.group(1)}
    return None


def hebrew_words(text: str):
    out = []
    for m in WORD_RE.finditer(text or ""):
        run = m.group(0)
        if MAQAF not in run:
            out.append({"word": run, "index": m.start(), "compound": False})
            continue
        at = 0
        for part in run.split(MAQAF):
            if part:
                out.append({"word": part, "index": m.start() + at, "compound": True})
            at += len(part) + 1
    return out


def find_name(text: str):
    out = []
    for w in hebrew_words(text or ""):
        k = classify_name_word(w["word"])
        if k:
            out.append({**w, **k})
    return out


def has_latin_name(s: str) -> bool:
    return bool(LATIN_NAME.search(s or ""))


def speech_text(he: str) -> str:
    s = str(he or "")
    out = []
    last = 0
    for w in find_name(s):
        if w["kind"] == "abbrev":
            continue
        head = ""
        if w["kind"] == "prefixed":
            seen = 0
            cut = len(w["word"])
            for i, ch in enumerate(w["word"]):
                if HEB_LETTER.match(ch):
                    if seen == len(w["prefix"]):
                        cut = i
                        break
                    seen += 1
            head = w["word"][:cut]
        tail_m = TRAILING_PUNCT.search(w["word"])
        tail = tail_m.group(0) if tail_m else ""
        out.append(s[last:w["index"]] + head + spoken_name_for(w["word"]) + tail)
        last = w["index"] + len(w["word"])
    return "".join(out) + s[last:]


def speech_safe_text(he: str) -> dict:
    s = str(he or "")
    if has_latin_name(s):
        return {"ok": False, "reason": "unresolved-liturgical-name", "text": ""}
    text = speech_text(s)
    if any(h["kind"] in ("exact", "prefixed") for h in find_name(text)):
        return {"ok": False, "reason": "unresolved-liturgical-name", "text": ""}
    return {"ok": True, "text": text}


def holds_divine_name(text: str) -> bool:
    if has_latin_name(text):
        return True
    return any(True for _ in find_name(text or ""))
