from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

from .config import DEFAULT_CORPUS, KNOWLEDGE
from .divine import consonants, display_english, display_hebrew
from .links import TORAH_BOOKS, display_ref, passage_link, verse_id

EN_STOP = set(
    """a an the of and to in on for with from by is are was were be been being this that these those it its as at or nor not but if then so than into over after before upon also he she they them his her their you your we our i me my unto thee thou thy thine ye hath shall should would will can may there here which who whom whose what when where why how all any each every some no nor such own same both few more most other another very just only than too very one two three four five six seven eight nine ten""".split()
)
HE_PREFIXES = "בדהוכלמשה"


@dataclass
class Verse:
    id: str
    book: str
    chapter: int
    verse: int
    he: str
    he_source: str
    en: str
    en_source: str
    parasha_id: str | None
    parasha_en: str | None
    corpus: str = "torah"  # torah | tanakh | later
    en_tokens: list[str] = field(default_factory=list)
    he_tokens: list[str] = field(default_factory=list)
    he_roots: list[str] = field(default_factory=list)

    @property
    def ref(self) -> str:
        return display_ref(self.book, self.chapter, self.verse)

    def link(self) -> dict:
        return passage_link(self.book, self.chapter, self.verse)

    def as_public(self) -> dict:
        link = self.link()
        return {
            "id": self.id,
            "ref": self.ref,
            "book": self.book,
            "chapter": self.chapter,
            "verse": self.verse,
            "he": self.he,
            "en": self.en,
            "parasha": self.parasha_en,
            "parasha_id": self.parasha_id,
            "corpus": self.corpus,
            "href": link["href"],
            "link_kind": link["kind"],
            "link_label": link["label"],
        }


def norm_en(s: str) -> str:
    s = s.lower().replace("'", "'")
    s = re.sub(r"[^a-z0-9\s'-]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def en_tokens(s: str) -> list[str]:
    return [t for t in re.findall(r"[a-z0-9']+", norm_en(s)) if t not in EN_STOP and len(t) > 1]


def strip_niqqud(s: str) -> str:
    return "".join(ch for ch in s if not ("\u0591" <= ch <= "\u05C7"))


def he_tokens(s: str) -> list[str]:
    cons = consonants(s)
    # split on anything already non-letter; consonants() already dropped those, so whole verse is one string
    # Use original letters with niqqud stripped, split on spaces/punct
    raw = strip_niqqud(s)
    words = re.findall(r"[א-ת]+", raw)
    return [w for w in words if len(w) >= 2]


def he_root(word: str) -> str:
    w = word
    if len(w) >= 4 and w[0] in HE_PREFIXES:
        w = w[1:]
    if len(w) >= 4 and w[-1] in "םןךףיוה":
        w = w[:-1]
    return w


@dataclass
class Corpus:
    verses: list[Verse]
    by_id: dict[str, Verse]
    parshiyot: list[dict]
    books: list[dict]

    def get(self, vid: str) -> Verse | None:
        return self.by_id.get(vid)


def _parasha_for(parshiyot: list[dict], book: str, chapter: int, verse: int) -> tuple[str | None, str | None]:
    for p in parshiyot:
        fr, to = p["from"], p["to"]
        def key(b, c, v, order=("genesis", "exodus", "leviticus", "numbers", "deuteronomy")):
            return (order.index(b) if b in order else 99, c, v)
        k = key(book, chapter, verse)
        if key(fr["book"], fr["chapter"], fr["verse"]) <= k <= key(to["book"], to["chapter"], to["verse"]):
            return p.get("id"), p.get("en")
    return None, None


def load_torah(root: Path | None = None) -> Corpus:
    root = Path(root or DEFAULT_CORPUS)
    index = json.loads((root / "index.json").read_text(encoding="utf-8"))
    parshiyot = index.get("parshiyot") or []
    verses: list[Verse] = []
    for book in index["books"]:
        bid = book["id"]
        for ch in range(1, int(book["chapters"]) + 1):
            path = root / bid / f"{ch:02d}.json"
            if not path.exists():
                continue
            data = json.loads(path.read_text(encoding="utf-8"))
            for v in data.get("verses") or []:
                n = int(v["n"])
                he_src = v.get("he") or ""
                en_src = v.get("en") or ""
                pid, pen = _parasha_for(parshiyot, bid, data["chapter"], n)
                he = display_hebrew(he_src)
                en = display_english(en_src)
                et, ht = en_tokens(en), he_tokens(he_src)
                verses.append(
                    Verse(
                        id=verse_id(bid, data["chapter"], n),
                        book=bid,
                        chapter=int(data["chapter"]),
                        verse=n,
                        he=he,
                        he_source=he_src,
                        en=en,
                        en_source=en_src,
                        parasha_id=pid,
                        parasha_en=pen,
                        corpus="torah",
                        en_tokens=et,
                        he_tokens=ht,
                        he_roots=[he_root(w) for w in ht],
                    )
                )
    # optional extra tanakh / later verses
    extra = KNOWLEDGE / "extra-verses.jsonl"
    if extra.exists():
        for line in extra.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            row = json.loads(line)
            he_src, en_src = row.get("he") or "", row.get("en") or ""
            et, ht = en_tokens(en_src), he_tokens(he_src)
            verses.append(
                Verse(
                    id=row["id"],
                    book=row["book"],
                    chapter=int(row["chapter"]),
                    verse=int(row["verse"]),
                    he=display_hebrew(he_src),
                    he_source=he_src,
                    en=display_english(en_src),
                    en_source=en_src,
                    parasha_id=None,
                    parasha_en=None,
                    corpus=row.get("corpus", "tanakh"),
                    en_tokens=et,
                    he_tokens=ht,
                    he_roots=[he_root(w) for w in ht],
                )
            )
    by_id = {v.id: v for v in verses}
    return Corpus(verses=verses, by_id=by_id, parshiyot=parshiyot, books=index.get("books") or [])


@lru_cache(maxsize=1)
def default_corpus() -> Corpus:
    return load_torah()
