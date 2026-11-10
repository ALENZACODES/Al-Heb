from __future__ import annotations

import json
import math
import re
from collections import defaultdict
from dataclasses import dataclass, field
from functools import lru_cache

from .config import KNOWLEDGE
from .corpus import Corpus, Verse, default_corpus, en_tokens, he_root, he_tokens, norm_en
from .divine import consonants


def _load_json(name: str):
    path = KNOWLEDGE / name
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


@dataclass
class Hit:
    verse: Verse
    score: float
    reasons: list[str] = field(default_factory=list)


class Retriever:
    def __init__(self, corpus: Corpus | None = None):
        self.corpus = corpus or default_corpus()
        self.concepts = _load_json("concepts.json").get("concepts") or []
        self.tradition = _load_json("tradition.json").get("items") or []
        self._build()

    def _build(self) -> None:
        self.df_en: dict[str, int] = defaultdict(int)
        self.df_he: dict[str, int] = defaultdict(int)
        self.inv_en: dict[str, list[int]] = defaultdict(list)
        self.inv_he: dict[str, list[int]] = defaultdict(list)
        self.inv_root: dict[str, list[int]] = defaultdict(list)
        self.phrase_en: dict[str, list[int]] = defaultdict(list)
        n = len(self.corpus.verses)
        for i, v in enumerate(self.corpus.verses):
            for t in set(v.en_tokens):
                self.df_en[t] += 1
                self.inv_en[t].append(i)
            for t in set(v.he_tokens):
                self.df_he[t] += 1
                self.inv_he[t].append(i)
            for t in set(v.he_roots):
                self.inv_root[t].append(i)
            # distinctive 4+ word English phrases for exact locate
            words = re.findall(r"[a-z']+", norm_en(v.en))
            for k in range(4, min(10, len(words) + 1)):
                for j in range(0, len(words) - k + 1):
                    ph = " ".join(words[j : j + k])
                    if len(ph) >= 18:
                        self.phrase_en[ph].append(i)
        self.N = n
        self.avg_len = sum(len(v.en_tokens) + len(v.he_tokens) for v in self.corpus.verses) / max(n, 1)
        # concept term -> concept
        self.concept_by_term: list[tuple[str, dict]] = []
        for c in self.concepts:
            for t in c.get("terms") or []:
                self.concept_by_term.append((norm_en(t), c))
        self.concept_by_term.sort(key=lambda x: len(x[0]), reverse=True)
        self.trad_by_term: list[tuple[str, dict]] = []
        for it in self.tradition:
            for t in it.get("terms") or []:
                self.trad_by_term.append((norm_en(t), it))
        self.trad_by_term.sort(key=lambda x: len(x[0]), reverse=True)
        # parasha names
        self.parasha_by_term = {}
        for p in self.corpus.parshiyot:
            self.parasha_by_term[norm_en(p.get("en") or "")] = p
            self.parasha_by_term[norm_en(p.get("id") or "")] = p
            if p.get("he"):
                self.parasha_by_term[consonants(p["he"])] = p

        skip_names = {
            "And","The","Unto","For","That","This","With","From","Then","When","Where","What","Who",
            "Which","Also","Into","Upon","Thou","Thee","Thy","Ye","His","Her","Him","They","Them",
            "Shall","Hath","Have","Were","Was","Are","Not","All","Any","But","Now","Lest","Even",
            "Said","Saying","Came","Went","Behold","Therefore","Because","After","Before","Among",
            "Every","These","Those","Their","Your","Our","One","Two","Three","Four","Five","Six",
            "Seven","Eight","Nine","Ten","Day","Days","Year","Years","Land","Son","Sons","Daughter",
            "Children","House","Man","Men","Woman","Women","People","Lord","God","There","Here",
        }
        from collections import Counter
        freq = Counter()
        for v in self.corpus.verses:
            if v.corpus != "torah":
                continue
            for m in re.findall(r"\b[A-Z][a-z]{2,}\b", v.en):
                if m not in skip_names:
                    freq[m] += 1
        # High-precision names: seen often enough that they are likely proper names, not a sentence start.
        self.name_freq = dict(freq)
        self.name_set = {n for n, c in freq.items() if c >= 3} | {n.lower() for n, c in freq.items() if c >= 3}


    def _idf(self, df: int) -> float:
        return math.log(1 + (self.N - df + 0.5) / (df + 0.5))

    def match_tradition(self, question: str) -> dict | None:
        q = norm_en(question)
        q_cons = consonants(question)
        for term, it in self.trad_by_term:
            if term and (re.search(rf"\b{re.escape(term)}\b", q) or term == q):
                return it
            if term.startswith("is ") and term in q:
                return it
        # Hebrew name רבי
        if "רבי" in question.replace("רַבִּי", "רבי") or q_cons.find("רבי") >= 0:
            for it in self.tradition:
                if it["id"] == "rabbi-title":
                    return it
        return None

    def match_concepts(self, question: str) -> list[dict]:
        q = norm_en(question)
        out, seen = [], set()
        for term, c in self.concept_by_term:
            if not term or c["id"] in seen:
                continue
            if re.search(rf"\b{re.escape(term)}\b", q) or term in q and len(term) > 12:
                out.append(c)
                seen.add(c["id"])
        return out

    def match_parasha(self, question: str) -> dict | None:
        q = norm_en(question)
        # longest name first
        names = sorted(self.parasha_by_term.keys(), key=len, reverse=True)
        for name in names:
            if name and re.search(rf"\b{re.escape(name)}\b", q):
                return self.parasha_by_term[name]
        return None

    def parse_explicit_ref(self, question: str) -> list[str]:
        ids = []
        books = {
            "genesis": "genesis", "gen": "genesis", "bereshit": "genesis", "bereishit": "genesis",
            "exodus": "exodus", "exod": "exodus", "ex": "exodus", "shemot": "exodus",
            "leviticus": "leviticus", "lev": "leviticus", "vayikra": "leviticus",
            "numbers": "numbers", "num": "numbers", "bamidbar": "numbers",
            "deuteronomy": "deuteronomy", "deut": "deuteronomy", "devarim": "deuteronomy",
        }
        q = question.lower()
        for m in re.finditer(
            r"\b(genesis|gen|bereshit|bereishit|exodus|exod|ex|shemot|leviticus|lev|vayikra|numbers|num|bamidbar|deuteronomy|deut|devarim)\s+(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?",
            q,
        ):
            book = books[m.group(1)]
            ch, v1 = int(m.group(2)), int(m.group(3))
            v2 = int(m.group(4)) if m.group(4) else v1
            if v2 < v1:
                v2 = v1
            for v in range(v1, min(v2, v1 + 20) + 1):
                vid = f"{book}.{ch}.{v}"
                if vid in self.corpus.by_id:
                    ids.append(vid)
        return ids

    def search(self, question: str, k: int = 8) -> list[Hit]:
        q_en = en_tokens(question)
        q_he = he_tokens(question)
        q_roots = [he_root(w) for w in q_he]
        scores: dict[int, float] = defaultdict(float)
        reasons: dict[int, list[str]] = defaultdict(list)

        def add(i: int, w: float, why: str):
            scores[i] += w
            if why not in reasons[i]:
                reasons[i].append(why)

        if not hasattr(self, "_i"):
            self._i = {v.id: i for i, v in enumerate(self.corpus.verses)}
        for vid in self.parse_explicit_ref(question):
            i = self._i.get(vid)
            if i is not None:
                add(i, 50, "explicit-ref")

        # exact English phrase locate
        qn = norm_en(question)
        words = re.findall(r"[a-z']+", qn)
        # quoted span
        for m in re.finditer(r"[\"“”']([^\"“”']{8,80})[\"“”']", question):
            ph = " ".join(re.findall(r"[a-z']+", norm_en(m.group(1))))
            for i in self.phrase_en.get(ph, []):
                add(i, 40, "quoted-phrase")
        for length in range(min(10, len(words)), 3, -1):
            found = False
            for j in range(0, len(words) - length + 1):
                ph = " ".join(words[j : j + length])
                hits = self.phrase_en.get(ph) or []
                if hits:
                    found = True
                    for i in hits:
                        add(i, 8 + length, "en-phrase")
            if found:
                break

        # BM25-ish
        for tok in q_en:
            postings = self.inv_en.get(tok) or []
            if not postings:
                continue
            idf = self._idf(self.df_en.get(tok, 1))
            for i in postings:
                tf = self.corpus.verses[i].en_tokens.count(tok)
                dl = len(self.corpus.verses[i].en_tokens) or 1
                bm = idf * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * dl / self.avg_len))
                add(i, bm, "en-token")
        for tok in q_he:
            for i in self.inv_he.get(tok) or []:
                add(i, 4.0, "he-token")
        for tok in q_roots:
            if len(tok) < 3:
                continue
            for i in self.inv_root.get(tok) or []:
                add(i, 1.5, "he-root")

        # concepts
        for c in self.match_concepts(question):
            for gid in c.get("gold") or []:
                i = self._i.get(gid)
                if i is not None:
                    add(i, 18, "concept:" + c["id"])
            for tok in c.get("query") or []:
                for i in self.inv_en.get(norm_en(tok).split()[0] if tok else "") or []:
                    add(i, 1.2, "concept-q")

        # tradition related torah
        it = self.match_tradition(question)
        if it:
            for gid in it.get("related_torah") or []:
                i = self._i.get(gid)
                if i is not None:
                    add(i, 8, "tradition-related")

        # parasha: boost first and last verses and mid
        p = self.match_parasha(question)
        if p:
            fr, to = p["from"], p["to"]
            start = f"{fr['book']}.{fr['chapter']}.{fr['verse']}"
            end = f"{to['book']}.{to['chapter']}.{to['verse']}"
            for gid in (start, end):
                i = self._i.get(gid)
                if i is not None:
                    add(i, 12, "parasha-bound")
            # a few verses inside
            for v in self.corpus.verses:
                if v.parasha_id == p.get("id") and v.verse == 1:
                    add(self._i[v.id], 4, "parasha-ch")

        if re.search(r"\bfirst mentioned\b", question, re.I):
            skip = {"Where", "What", "Who", "When", "Which", "Tell", "About", "First", "Mentioned", "Torah", "The", "Does"}
            names = [m.group(1) for m in re.finditer(r"\b([A-Z][a-z]{2,})\b", question) if m.group(1) not in skip]
            if names:
                name = names[0]
                rx = re.compile(r"\b" + re.escape(name) + r"\b")
                for i, v in enumerate(self.corpus.verses):
                    if v.corpus == "torah" and rx.search(v.en):
                        add(i, 40, "first-mention")
                        break

        # Prefer Torah over later corpora when scores are close
        ranked = []
        for i, sc in scores.items():
            v = self.corpus.verses[i]
            if v.corpus == "torah":
                sc += 0.8
            ranked.append(Hit(verse=v, score=sc, reasons=reasons[i]))
        ranked.sort(key=lambda h: (-h.score, h.verse.corpus != "torah", h.verse.id))
        return ranked[:k]


@lru_cache(maxsize=1)
def default_retriever() -> Retriever:
    return Retriever()
