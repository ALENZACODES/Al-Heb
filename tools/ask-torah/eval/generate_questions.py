#!/usr/bin/env python3
"""Build 10,000 distinct questions from real Torah verses and curated later sources."""
from __future__ import annotations

import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ask_torah.corpus import default_corpus, norm_en  # noqa: E402
from ask_torah.links import display_ref  # noqa: E402
from ask_torah.retrieve import Retriever  # noqa: E402

OUT = Path(__file__).resolve().parent / "questions-10k.jsonl"
TARGET = 10000


def jacc(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def tokens(q: str) -> set[str]:
    return set(re.findall(r"[a-z0-9']+", norm_en(q)))


def distinctive_phrase(en: str) -> str | None:
    words = re.findall(r"[A-Za-z']+", en)
    if len(words) < 6:
        return en.strip() if 4 <= len(words) <= 14 else None
    # take a mid-sentence window of 7-9 words without leading 'and' only
    best = " ".join(words[:8])
    if len(best) >= 20:
        return best
    return " ".join(words[: min(12, len(words))])


JOHN = [
    {
        "id": "john-morning",
        "question": "morning in the Torah",
        "category": "concepts",
        "verdict": "in_torah",
        "gold": ["genesis.1.5", "exodus.29.39", "exodus.16.21"],
        "source": "user-example",
    },
    {
        "id": "john-mourning",
        "question": "mourning in the Torah",
        "category": "concepts",
        "verdict": "in_torah",
        "gold": ["genesis.23.2", "genesis.37.34", "deuteronomy.34.8"],
        "source": "user-example",
    },
    {
        "id": "john-rituals",
        "question": "rituals in the Torah",
        "category": "laws",
        "verdict": "in_torah",
        "gold": ["leviticus.1.2", "leviticus.1.3", "exodus.29.18"],
        "source": "user-example",
    },
    {
        "id": "john-commandments",
        "question": "God's commandments",
        "category": "laws",
        "verdict": "in_torah",
        "gold": ["exodus.20.1", "deuteronomy.6.1", "deuteronomy.5.1"],
        "source": "user-example",
    },
    {
        "id": "john-what-evil",
        "question": "what is evil",
        "category": "concepts",
        "verdict": "in_torah",
        "gold": ["genesis.2.9", "genesis.2.17", "genesis.6.5", "deuteronomy.30.15"],
        "source": "user-example",
    },
    {
        "id": "john-evil-mentioned",
        "question": "is evil mentioned",
        "category": "is_in_torah",
        "verdict": "in_torah",
        "gold": ["genesis.2.9", "genesis.6.5", "genesis.8.21"],
        "source": "user-example",
    },
    {
        "id": "john-adam-eve",
        "question": "Adam and Eve",
        "category": "people",
        "verdict": "in_torah",
        "gold": ["genesis.2.7", "genesis.2.22", "genesis.3.20"],
        "source": "user-example",
    },
    {
        "id": "john-what-rabbi",
        "question": "what is a rabbi",
        "category": "tradition_origin",
        "verdict": "not_in_torah",
        "gold": [],
        "later": ["Pirkei Avot 1:1"],
        "source": "user-example",
    },
    {
        "id": "john-is-rabbi",
        "question": "is rabbi in torah",
        "category": "is_in_torah",
        "verdict": "not_in_torah",
        "gold": [],
        "later": ["Pirkei Avot 1:1"],
        "source": "user-example",
    },
    {
        "id": "john-is-rabbi-the",
        "question": "is rabbi in the Torah",
        "category": "is_in_torah",
        "verdict": "not_in_torah",
        "gold": [],
        "later": ["Pirkei Avot 1:1"],
        "source": "user-example",
    },
]


OFF_TOPIC = [
    "What's the weather in Toronto today?",
    "Who won the Super Bowl last year?",
    "Write a Python function to sort a list.",
    "How do I bake sourdough pizza?",
    "What is the capital of France?",
    "Best restaurants near me",
    "How do I reset my email password?",
    "Explain quantum entanglement for a physics exam",
    "What time is the next train to Montreal?",
    "Recommend a Netflix series",
    "How do I change a flat tire?",
    "What's the score of the hockey game?",
    "Help me debug this JavaScript error",
    "How much does a used Toyota cost?",
    "Translate this menu into Spanish",
    "What's a good running plan for a marathon?",
    "Stock price of a tech company",
    "How do I potty train a puppy?",
    "Which camera should I buy?",
    "Write a cover letter for a bank job",
]


def main() -> None:
    rng = random.Random(42)
    corpus = default_corpus()
    retr = Retriever(corpus)
    rows: list[dict] = []
    seen_norm: set[str] = set()
    seen_tok: list[set[str]] = []

    def add(row: dict) -> bool:
        q = " ".join((row["question"] or "").split())
        if not q or len(q) < 4:
            return False
        row["question"] = q
        key = norm_en(q)
        if key in seen_norm:
            return False
        tok = tokens(q)
        # embedding-style dedupe without a paid API: high token overlap of long questions
        if len(tok) >= 5:
            for prev in seen_tok[-400:]:  # window for speed
                if jacc(tok, prev) >= 0.92:
                    return False
        # gold refs must exist when claimed
        gold = []
        for gid in row.get("gold") or []:
            if gid in corpus.by_id:
                gold.append(gid)
            # later / tanakh ids may not be in corpus; keep them only if marked later
        if row.get("verdict") == "in_torah" and not gold and not row.get("allow_empty_gold"):
            return False
        row["gold"] = gold
        row.setdefault("later", [])
        row.setdefault("source", "generated")
        seen_norm.add(key)
        seen_tok.append(tok)
        rows.append(row)
        return True

    for r in JOHN:
        add(dict(r))

    # concept questions
    for c in retr.concepts:
        terms = [t for t in (c.get("terms") or []) if t]
        gold = list(c.get("gold") or [])
        if not gold:
            continue
        templates = [
            "{t}",
            "What does the Torah say about {t}?",
            "Where is {t} in the Torah?",
            "Tell me about {t} in the Torah",
            "Is {t} in the Torah?",
            "Find verses about {t}",
        ]
        for t in terms:
            for tmpl in templates:
                add({
                    "id": f"concept-{c['id']}-{len(rows)}",
                    "question": tmpl.format(t=t),
                    "category": "concepts" if "is " not in tmpl.lower() else "is_in_torah",
                    "verdict": "in_torah",
                    "gold": gold,
                    "concept_id": c["id"],
                })

    # tradition / origin / is-in-torah negatives
    for it in retr.tradition:
        terms = it.get("terms") or []
        later_refs = [x.get("ref") for x in (it.get("later") or []) if x.get("ref")]
        gold = list(it.get("related_torah") or []) if it.get("in_torah") else []
        verdict = it.get("verdict") or "not_in_torah"
        for t in terms:
            add({
                "id": f"trad-{it['id']}-{len(rows)}",
                "question": t if t.endswith("?") or t.lower().startswith(("what", "is", "where")) else f"What is {t}?",
                "category": "tradition_origin",
                "verdict": verdict,
                "gold": gold,
                "later": later_refs,
                "tradition_id": it["id"],
                "allow_empty_gold": not bool(gold),
            })
            add({
                "id": f"trad-is-{it['id']}-{len(rows)}",
                "question": f"Is {t} in the Torah?" if not t.lower().startswith("is ") else t,
                "category": "is_in_torah",
                "verdict": verdict,
                "gold": gold,
                "later": later_refs,
                "tradition_id": it["id"],
                "allow_empty_gold": not bool(gold),
            })
            add({
                "id": f"trad-where-{it['id']}-{len(rows)}",
                "question": f"Where does {t} come from?",
                "category": "tradition_origin",
                "verdict": verdict,
                "gold": gold,
                "later": later_refs,
                "tradition_id": it["id"],
                "allow_empty_gold": not bool(gold),
            })

    # parashiyot
    for p in corpus.parshiyot:
        fr, to = p["from"], p["to"]
        start = f"{fr['book']}.{fr['chapter']}.{fr['verse']}"
        end = f"{to['book']}.{to['chapter']}.{to['verse']}"
        gold = [g for g in (start, end) if g in corpus.by_id]
        name, hid = p.get("en") or p["id"], p.get("id")
        for q, cat in (
            (f"What happens in parashat {name}?", "parasha"),
            (f"Where does the portion {name} begin?", "parasha"),
            (f"What is the Torah portion {name} about?", "parasha"),
            (f"Is {name} a weekly Torah portion?", "parasha"),
            (f"Tell me about parasha {name}", "parasha"),
            (f"What is in {hid}?", "parasha"),
        ):
            add({"id": f"parasha-{hid}-{len(rows)}", "question": q, "category": "parasha", "verdict": "in_torah", "gold": gold, "parasha_id": hid})

    # people / places: scan English for known proper names that appear often
    name_index: dict[str, list[str]] = {}
    # collect capitalized words that appear in multiple verses — too noisy.
    # Use a curated list and verify they occur.
    names = """Adam Eve Cain Abel Noah Abram Abraham Sarai Sarah Isaac Rebekah Rebecca Jacob Esau
    Rachel Leah Laban Joseph Judah Benjamin Moses Aaron Miriam Pharaoh Jethro Zipporah Joshua Caleb
    Korah Balaam Balak Nadab Abihu Eleazar Phinehas Miriam Lot Melchizedek Hagar Ishmael Isaac
    Dinah Simeon Levi Reuben Gad Asher Naphtali Zebulun Issachar Ephraim Manasseh Amram Jochebed
    Bezalel Oholiab Hur Joshua Miriam Serah Eliezer Gershom Kohath Merari Izhar Hebron Uzziel
    Dathan Abiram On Aaron Miriam Jethro Hobab Zipporah Miriam Sihon Og Midian Moab Edom
    Egypt Canaan Goshen Sinai Horeb Moriah Hebron Beersheba Bethel Shechem Jordan Jericho
    Shinar Babel Ur Haran Padan Egypt Goshen Pithom Rameses Yam Suph Elim Rephidim Kadesh
    Nebo Moab Edom Midian Amalek Philistines Hittites Girgashites Amorites Canaanites Jebusites
    """.split()
    places_set = set(
        """Egypt Canaan Goshen Sinai Horeb Moriah Hebron Beersheba Bethel Shechem Jordan Jericho
        Shinar Babel Ur Haran Midian Moab Edom Elim Rephidim Kadesh Nebo Pithom""".lower().split()
    )
    for name in names:
        key = name.lower()
        ids = []
        for v in corpus.verses:
            if re.search(rf"\b{re.escape(name)}\b", v.en):
                ids.append(v.id)
                if len(ids) >= 8:
                    break
        if not ids:
            continue
        name_index[name] = ids
        cat = "places" if key in places_set else "people"
        for q in (
            f"Who is {name} in the Torah?" if cat == "people" else f"Where is {name} in the Torah?",
            f"Is {name} in the Torah?",
            f"What does the Torah say about {name}?",
            f"Where is {name} first mentioned in the Torah?",
            f"Tell me about {name}",
        ):
            add({"id": f"{cat}-{name}-{len(rows)}", "question": q, "category": cat, "verdict": "in_torah", "gold": ids[:5]})

    # laws from verses with statute/command language
    law_verses = [
        v for v in corpus.verses
        if re.search(r"\b(thou shalt|ye shall|it shall be a statute|commandment|statute forever|holy convocation)\b", v.en, re.I)
    ]
    rng.shuffle(law_verses)
    for v in law_verses:
        phrase = distinctive_phrase(v.en)
        add({
            "id": f"law-{v.id}-{len(rows)}",
            "question": f"Where does the Torah say “{phrase}”?" if phrase else f"What does {v.ref} command?",
            "category": "laws",
            "verdict": "in_torah",
            "gold": [v.id],
        })
        add({
            "id": f"lawref-{v.id}",
            "question": f"What does {v.ref} say?",
            "category": "laws",
            "verdict": "in_torah",
            "gold": [v.id],
        })
        if len([r for r in rows if r["category"] == "laws"]) > 1800:
            break

    # Hebrew word questions: pick a content word from the verse
    rng.shuffle_is = None
    verses = list(corpus.verses)
    rng.shuffle(verses)
    count_he = 0
    for v in verses:
        words = v.he_tokens
        if not words:
            continue
        # prefer mid-length words
        cands = [w for w in words if 3 <= len(w) <= 8]
        if not cands:
            continue
        w = cands[len(cands) // 2]
        add({
            "id": f"he-{v.id}-{w}",
            "question": f"What does the Hebrew word {w} mean in {v.ref}?",
            "category": "hebrew_words",
            "verdict": "in_torah",
            "gold": [v.id],
        })
        add({
            "id": f"hewhere-{v.id}-{w}",
            "question": f"Where in the Torah does the word {w} appear in {v.ref}?",
            "category": "hebrew_words",
            "verdict": "in_torah",
            "gold": [v.id],
        })
        count_he += 1
        if count_he >= 900:
            break

    # verse locate from distinctive English
    rng.shuffle(verses)
    for v in verses:
        ph = distinctive_phrase(v.en)
        if not ph or len(ph) < 18:
            continue
        add({
            "id": f"locate-{v.id}",
            "question": f"Where does the Torah say “{ph}”?",
            "category": "concepts",
            "verdict": "in_torah",
            "gold": [v.id],
        })
        add({
            "id": f"whatref-{v.id}",
            "question": f"What does {v.ref} say?",
            "category": "concepts",
            "verdict": "in_torah",
            "gold": [v.id],
        })
        add({
            "id": f"isin-{v.id}",
            "question": f"Is this in the Torah: “{ph}”?",
            "category": "is_in_torah",
            "verdict": "in_torah",
            "gold": [v.id],
        })
        if len(rows) >= TARGET - 600:
            break

    # holidays already partly in concepts; add more framings
    holidays = [
        ("Shabbat", ["genesis.2.3", "exodus.20.8", "deuteronomy.5.12"]),
        ("Passover", ["exodus.12.14", "leviticus.23.5", "deuteronomy.16.1"]),
        ("the Feast of Weeks", ["exodus.34.22", "deuteronomy.16.10"]),
        ("the Feast of Booths", ["leviticus.23.34", "leviticus.23.42"]),
        ("the Day of Atonement", ["leviticus.16.30", "leviticus.23.27"]),
        ("the day of blowing the horn", ["leviticus.23.24", "numbers.29.1"]),
    ]
    for name, gold in holidays:
        for q in (
            f"What does the Torah say about {name}?",
            f"Is {name} in the Torah?",
            f"Where are the laws of {name}?",
            f"Which verses command {name}?",
        ):
            add({"id": f"hol-{name}-{len(rows)}", "question": q, "category": "holidays", "verdict": "in_torah", "gold": gold})

    # off-topic ~5%
    extra_ot = []
    bases = OFF_TOPIC
    fillers = [
        "Please help with this.",
        "I need this urgently.",
        "Can you look it up?",
        "For a school project that is not about religion.",
        "Just curious about current events.",
    ]
    topics = [
        "gardening tips for tomatoes",
        "how to tune a guitar",
        "the population of Japan",
        "installing a dishwasher",
        "rules of basketball",
        "buying concert tickets",
        "my printer will not connect",
        "best hiking boots",
        "how to fold a fitted sheet",
        "compound interest on a savings account",
        "identify this bird in my backyard",
        "fix a leaking faucet",
        "plan a weekend in Vancouver",
        "what is an NFT",
        "how to play chess openings",
        "calorie count of oatmeal",
        "change the oil in a sedan",
        "learn to juggle",
        "the latest smartphone reviews",
        "how to unclog a drain",
    ]
    for i, q in enumerate(bases + [f"How do I handle {t}?" for t in topics] + [f"{b} {f}" for b in bases for f in fillers]):
        extra_ot.append(q)
    rng.shuffle(extra_ot)
    for i, q in enumerate(extra_ot):
        add({"id": f"off-{i}", "question": q, "category": "off_topic", "verdict": "off_topic", "gold": [], "allow_empty_gold": True})
        if sum(1 for r in rows if r["category"] == "off_topic") >= 500:
            break

    # pad with more unique verse questions if needed
    if len(rows) < TARGET:
        for v in verses:
            if len(rows) >= TARGET:
                break
            add({
                "id": f"pad-ref-{v.id}-{len(rows)}",
                "question": f"Quote {v.ref} in Hebrew and English.",
                "category": "concepts",
                "verdict": "in_torah",
                "gold": [v.id],
            })
            if len(rows) >= TARGET:
                break
            he_bit = " ".join(v.he.split()[:4])
            add({
                "id": f"pad-he-{v.id}-{len(rows)}",
                "question": f"Which verse begins {he_bit}?",
                "category": "hebrew_words",
                "verdict": "in_torah",
                "gold": [v.id],
            })

    # If we somehow went over, keep first TARGET but always keep JOHN
    john_ids = {r["id"] for r in JOHN}
    if len(rows) > TARGET:
        keep = [r for r in rows if r["id"] in john_ids]
        rest = [r for r in rows if r["id"] not in john_ids]
        rows = keep + rest[: TARGET - len(keep)]

    # held-out split: shuffle, 2000 tune, rest test (target 8000)
    rng2 = random.Random(42)
    # pin john examples into test? Better: stratified-ish by shuffling then prefix 2000 tune
    # Keep john in both? They're few; put them in TEST so reported accuracy includes his examples.
    john_rows = [r for r in rows if r.get("source") == "user-example"]
    other = [r for r in rows if r.get("source") != "user-example"]
    rng2.shuffle(other)
    tune_n = 2000
    # if off_topic would be missing from tune, we already shuffled mixed
    for i, r in enumerate(other):
        r["split"] = "tune" if i < tune_n else "test"
    for r in john_rows:
        r["split"] = "test"
    rows = john_rows + other

    # assign sequential stable ids already set
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    from collections import Counter
    cats = Counter(r["category"] for r in rows)
    splits = Counter(r["split"] for r in rows)
    verdicts = Counter(r["verdict"] for r in rows)
    print(f"wrote {len(rows)} to {OUT}")
    print("categories", dict(cats))
    print("splits", dict(splits))
    print("verdicts", dict(verdicts))


if __name__ == "__main__":
    main()
