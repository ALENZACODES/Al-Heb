from __future__ import annotations

import re
from typing import Any

from .classify import is_off_topic, wants_in_torah_verdict
from .corpus import Corpus, Verse, default_corpus
from .links import display_ref, passage_link, parse_id
from .retrieve import Retriever, default_retriever

DECLINE = (
    "This page only answers questions about the Torah, the Tanakh, and Jewish texts. "
    "Try a question such as “Is the Shema in the Torah?” or “What does Genesis 1:1 say?”"
)

VERDICT_TEXT = {
    "in_torah": "Yes. This is in the Torah.",
    "not_in_torah": "No. This is not in the written Torah.",
    "tanakh_outside_torah": "No. This is not in the Torah. It appears later in the Tanakh.",
    "off_topic": "This page only answers questions about the Torah, the Tanakh, and Jewish texts.",
}


def _has_scripture_cue(question: str, retriever: Retriever) -> bool:
    if retriever.parse_explicit_ref(question) or retriever.match_tradition(question) or retriever.match_concepts(question) or retriever.match_parasha(question):
        return True
    if any("\u0590" <= ch <= "\u05FF" for ch in question) or any("\u05D0" <= ch <= "\u05EA" for ch in question):
        return True
    skip = {"Where","What","Who","When","Which","Tell","About","First","Mentioned","Torah","The","Does","Is","In",
            "And","For","With","From","This","That","Can","You","Your","Our","How","Why","Please","Write","Good"}
    name_set = getattr(retriever, "name_set", set())
    # Prefer capitalized tokens in the question (Rachel, Pharaoh). All-lowercase questions
    # may still match a high-precision name of length 4+ (e.g. "rachel", "tzedakah" is a concept).
    caps = [m.group(1) for m in re.finditer(r"\b([A-Z][a-z]{2,})\b", question) if m.group(1) not in skip]
    for n in caps:
        if n in name_set or n.title() in name_set:
            return True
    if not caps:
        lows = [m.group(1) for m in re.finditer(r"\b([a-z]{4,})\b", question) if m.group(1).title() not in skip]
        for n in lows:
            if n in name_set or n.title() in name_set:
                return True
    # already treated as on-topic by classify.is_off_topic when a Torah cue is present;
    # this helper is only used after that function says the line is not strongly off-topic.
    # Short conceptual questions with no cue and no name are declined.
    # If classify left it undecided, require a cue.
    from .classify import IN_TORAH_PAT, IS_X_IN
    if IN_TORAH_PAT.search(question) or IS_X_IN.search(question):
        return True
    return False


NOTE_DIFFERS = (
    "Communities may explain a verse in more than one way. What follows is the wording of the verse itself, "
    "with a short plain-English note, not a ruling for any one movement."
)


def _passages(verses: list[Verse]) -> list[dict]:
    out = []
    seen = set()
    for v in verses:
        if v.id in seen:
            continue
        seen.add(v.id)
        out.append(v.as_public())
    return out


def _later_public(items: list[dict]) -> list[dict]:
    out = []
    for it in items:
        book, ch, v = it.get("book"), it.get("chapter"), it.get("verse")
        href = None
        kind = "citation"
        if book and ch and v:
            link = passage_link(book, int(ch), int(v), it.get("verse_end"))
            href, kind = link["href"], link["kind"]
            # later works should go to Sefaria even if book id looks odd
            if it.get("corpus") in {"mishnah", "talmud", "tanakh"} and kind == "alef" and book not in {
                "genesis", "exodus", "leviticus", "numbers", "deuteronomy"
            }:
                href, kind = link["href"], link["kind"]
        out.append({
            "corpus": it.get("corpus"),
            "ref": it.get("ref"),
            "note": it.get("note") or "",
            "href": href,
            "link_kind": kind if href else None,
            "text": it.get("text") or "",
        })
    return out


def verify_citation(corpus: Corpus, vid: str, quoted: str | None = None) -> bool:
    v = corpus.get(vid)
    if not v:
        return False
    if not quoted:
        return True
    # Allow divine-name display differences and whitespace.
    def slim(s: str) -> str:
        return re.sub(r"\s+", "", s.replace("ה׳", "").replace("יהוה", ""))
    q, he, en = slim(quoted), slim(v.he) + slim(v.he_source), slim(v.en) + slim(v.en_source)
    return q[:40] in he or q[:40] in en or he[:40] in q or en[:40] in q


def _template_explain(question: str, verdict: str, verses: list[Verse], tradition: dict | None) -> str:
    parts = []
    if tradition and tradition.get("explanation"):
        parts.append(tradition["explanation"].strip())
    elif verdict == "in_torah" and verses:
        v = verses[0]
        parts.append(
            f"The Torah addresses this at {v.ref}"
            + (f" in the portion {v.parasha_en}" if v.parasha_en else "")
            + "."
        )
        # one-sentence gloss from the English, already public domain JPS
        en = v.en.rstrip(" .")
        if en:
            parts.append(f"It says: {en}.")
        if len(verses) > 1:
            refs = ", ".join(x.ref for x in verses[1:4])
            parts.append(f"See also {refs}.")
    elif verdict == "tanakh_outside_torah":
        parts.append(
            "This subject is not in the Five Books of Moses. It is found in a later book of the Tanakh. "
            "The citation below leads to that book."
        )
    elif verdict == "not_in_torah":
        parts.append(
            "This subject is not found in the written Torah (the Five Books of Moses). "
            "Where a later source is known, it is named below."
        )
    parts.append(NOTE_DIFFERS)
    return " ".join(parts)


def answer_question(question: str, retriever: Retriever | None = None, use_llm: bool = False) -> dict[str, Any]:
    q = (question or "").strip()
    retriever = retriever or default_retriever()
    corpus = retriever.corpus

    if not q:
        return {
            "verdict": "off_topic",
            "verdict_text": VERDICT_TEXT["off_topic"],
            "explanation": DECLINE,
            "passages": [],
            "later_sources": [],
            "cited_ids": [],
            "declined": True,
            "question": q,
        }

    if is_off_topic(q) or not _has_scripture_cue(q, retriever):
        return {
            "verdict": "off_topic",
            "verdict_text": VERDICT_TEXT["off_topic"],
            "explanation": DECLINE,
            "passages": [],
            "later_sources": [],
            "cited_ids": [],
            "declined": True,
            "question": q,
        }

    tradition = retriever.match_tradition(q)
    hits = retriever.search(q, k=8)
    # Keep only real verses with a positive score
    hits = [h for h in hits if h.score >= 2.0]
    explicit = retriever.parse_explicit_ref(q)
    if explicit:
        # An explicit reference is decisive: do not mix in unrelated high-IDF verses.
        ordered = []
        seen = set()
        for vid in explicit:
            v = corpus.get(vid)
            if v and vid not in seen:
                ordered.append(v)
                seen.add(vid)
        hits = [h for h in hits if h.verse.id in seen] or hits
        # Rebuild hits from the explicit verses so they win downstream.
        from ask_torah.retrieve import Hit
        hits = [Hit(verse=v, score=100, reasons=["explicit-ref"]) for v in ordered]
    torah_hits = [h for h in hits if h.verse.corpus == "torah"]

    verdict = None
    later = []
    chosen: list[Verse] = []

    if tradition:
        verdict = tradition.get("verdict") or ("in_torah" if tradition.get("in_torah") else "not_in_torah")
        later = tradition.get("later") or []
        # attach related Torah verses when they help
        related = []
        for gid in tradition.get("related_torah") or []:
            v = corpus.get(gid)
            if v:
                related.append(v)
        if verdict == "in_torah":
            chosen = related or [h.verse for h in torah_hits[:5]]
        else:
            # still show related Torah verses when they clarify (e.g. Moses, Yom Teruah)
            chosen = related[:3]
    else:
        if torah_hits:
            verdict = "in_torah"
            # if the user asked "is X in the Torah" and we only have weak hits, be careful
            top = torah_hits[0]
            if wants_in_torah_verdict(q) and top.score < 6 and not retriever.match_concepts(q) and not retriever.parse_explicit_ref(q):
                # weak evidence
                if top.score < 3.5:
                    verdict = "not_in_torah"
                    chosen = []
                else:
                    chosen = [h.verse for h in torah_hits[:5]]
            else:
                chosen = [h.verse for h in torah_hits[:5]]
        elif hits:
            # only tanakh / later verses
            verdict = "tanakh_outside_torah"
            chosen = [h.verse for h in hits[:5]]
        else:
            # nothing found
            if wants_in_torah_verdict(q):
                verdict = "not_in_torah"
                chosen = []
            else:
                # no evidence — do not invent. If it still looks like a text question, say we did not find it.
                if re.search(r"\b(torah|tanakh|bible|moses|god|commandment)\b", q, re.I):
                    verdict = "not_in_torah"
                    chosen = []
                else:
                    return {
                        "verdict": "off_topic",
                        "verdict_text": VERDICT_TEXT["off_topic"],
                        "explanation": DECLINE,
                        "passages": [],
                        "later_sources": [],
                        "cited_ids": [],
                        "declined": True,
                        "question": q,
                    }

    cited_ids = [v.id for v in chosen]
    # verify every id exists
    cited_ids = [i for i in cited_ids if corpus.get(i)]
    chosen = [v for v in chosen if v.id in cited_ids]
    explanation = _template_explain(q, verdict, chosen, tradition)

    # Optional LLM polish is applied by vertex.explain_safe, if requested.
    if use_llm:
        try:
            from .vertex import explain_safe
            polished = explain_safe(q, verdict, chosen, later, explanation)
            if polished:
                explanation = polished
        except Exception:
            pass

    return {
        "verdict": verdict,
        "verdict_text": VERDICT_TEXT.get(verdict, ""),
        "explanation": explanation,
        "passages": _passages(chosen),
        "later_sources": _later_public(later),
        "cited_ids": cited_ids,
        "declined": False,
        "question": q,
        "tradition_id": tradition.get("id") if tradition else None,
    }
