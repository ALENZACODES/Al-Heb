"""Expand messy user wording (typos, nicknames, follow-ups) before retrieval."""
from __future__ import annotations

import re

# Conservative typo and nickname rewrites. Applied as whole-token replacements.
TYPOS = {
    "moruning": "mourning",
    "mouring": "mourning",
    "grieving": "mourning",
    "comandments": "commandments",
    "comandment": "commandment",
    "evle": "evil",
    "evill": "evil",
    "addam": "adam",
    "casherut": "kashrut",
    "kashrus": "kashrut",
    "teffilin": "tefillin",
    "tffilin": "tefillin",
    "tefilin": "tefillin",
    "teffillin": "tefillin",
    "shabbos": "shabbat",
    "shabbes": "shabbat",
    "shabbath": "shabbat",
    "mesiah": "messiah",
    "mashiach": "messiah",
    "moshiach": "messiah",
    "korach": "korah",
    "merivah": "meribah",
    "caff": "calf",
    "chanukah": "hanukkah",
    "chanuka": "hanukkah",
    "hanuka": "hanukkah",
    "shemot": "exodus",
    "devarim": "deuteronomy",
    "vayikra": "leviticus",
    "bamidbar": "numbers",
    "bereshit": "genesis",
    "bereishit": "genesis",
    "chumash": "torah",
    "pentateuch": "torah",
    "malachim": "angels",
    "malakhim": "angels",
    "malach": "angel",
    "gilgul": "reincarnation",
    "yevarechecha": "priestly blessing",
    "yevarechecha": "priestly blessing",
    "zelophehad": "zelophehad",
    "tzitzis": "tzitzit",
    "teffilin": "tefillin",
}

PHRASES = [
    (re.compile(r"\b5 books\b", re.I), "five books of the torah"),
    (re.compile(r"\bfive books\b", re.I), "five books of the torah"),
    (re.compile(r"\byam suf\b", re.I), "sea of reeds red sea"),
    (re.compile(r"\bolam haba\b", re.I), "afterlife world to come"),
    (re.compile(r"\bha-?satan\b", re.I), "the satan"),
    (re.compile(r"\baddam and ev\b", re.I), "adam and eve"),
    (re.compile(r"\badam and ev\b", re.I), "adam and eve"),
    (re.compile(r"\bfrontlets\b", re.I), "frontlets tefillin"),
    (re.compile(r"\bblack boxes\b", re.I), "tefillin boxes"),
    (re.compile(r"\bmilk\s*\+?\s*meat\b", re.I), "milk and meat"),
    (re.compile(r"\bsplit hooves\b", re.I), "parteth the hoof cloven-footed cheweth the cud kashrut"),
    (re.compile(r"\bbacon\b", re.I), "swine pig kashrut"),
    (re.compile(r"\bshellfish\b", re.I), "scale fins kashrut"),
    (re.compile(r"\bchew cud\b", re.I), "cheweth the cud kashrut"),
    (re.compile(r"\bhonou?r your parents\b", re.I), "honour thy father and thy mother"),
    (re.compile(r"\bthe stranger\b", re.I), "stranger sojourner"),
    (re.compile(r"\bniddah\b", re.I), "niddah issue of blood"),
    (re.compile(r"thou shalt not kill", re.I), "thou shalt not murder"),
    (re.compile(r"\bnoahs? ark\b", re.I), "noah ark flood rainbow"),
    (re.compile(r"\bwho buried him\b", re.I), "died in the land of Moab buried him"),
]


FOLLOWUP = re.compile(
    r"^(so |ok |okay |ya |yeah |and |then |wait |but |what about|how about|can i |so is |so then|sorry )",
    re.I,
)


def expand_question(question: str) -> str:
    q = question or ""
    for rx, repl in PHRASES:
        q = rx.sub(repl, q)
    def repl_tok(m):
        w = m.group(0)
        low = w.lower()
        return TYPOS.get(low, w)
    q = re.sub(r"[A-Za-z']+", repl_tok, q)
    # Disambiguate mourning from "morning" when the user is talking about grief.
    if re.search(r"\bmourn|\bgriev", q, re.I):
        q = re.sub(r"\bmorning\b", "", q, flags=re.I)
        q = re.sub(r"\s+", " ", q).strip()
    return q


def with_history(question: str, history: list[str] | None) -> str:
    """A short follow-up is searched together with the earlier user turns."""
    q = (question or "").strip()
    hist = [h.strip() for h in (history or []) if h and h.strip()]
    if not hist:
        return expand_question(q)
    short = len(q.split()) <= 12 or bool(FOLLOWUP.search(q)) or q.endswith("?") and len(q) < 80
    if short:
        prior = expand_question(" ".join(hist[-2:]))
        joined = prior + " " + q
        if re.search(r"\b(adam|eve)\b", prior, re.I) and re.search(r"\b(kids?|children|sons?|daughters?)\b", q, re.I):
            joined += " Cain Abel"
        if re.search(r"\b(shabbat|sabbath)\b", prior, re.I) and re.search(r"\b(cook|cooking|fire|drive|driving)\b", q, re.I):
            joined += " kindle fire seethe sabbath"
        if re.search(r"\b(tefillin|frontlets)\b", prior, re.I) and re.search(r"\b(boxes|box|straps?)\b", q, re.I):
            joined += " tefillin frontlets"
        if re.search(r"\bwomen\b", prior, re.I) and re.search(r"\b(lead|woman who|name one)\b", q, re.I):
            joined += " Miriam prophetess"
        return expand_question(joined)
    return expand_question(q)
