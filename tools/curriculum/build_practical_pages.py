#!/usr/bin/env python3
"""Build data/curriculum/practical/*.json from phrasebook, lessons and dialogues only."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data/curriculum/practical"
PER_PAGE = 5

NAME_OR_GOY = re.compile(
    r"יְהוָה|יהוה|הַשֵּׁם|אֲדֹנָי|אֱלֹהִים|אֱלֹהֵינוּ|אֱלֹהַי|"
    r"הַלְלוּ[־\s]?יָהּ|בְּעֶזְרַת הַשֵּׁם|גּוֹי|גּוֹיָה"
)

LEVELS = [
    {"id": "L0", "title": "First conversations", "order": 0},
    {"id": "L1", "title": "Town and table", "order": 1},
    {"id": "L2", "title": "Daily life", "order": 2},
    {"id": "L3", "title": "Work and services", "order": 3},
    {"id": "L4", "title": "Shabbat and holiday conversation", "order": 4},
]

# phrasebook ids for the restaurant grouping (already used in pu-restaurant)
RESTAURANT_IDS = [
    "cafe-01", "cafe-02", "cafe-14", "cafe-16", "cafe-17", "cafe-20", "cafe-21",
    "cafe-22", "cafe-25", "cafe-26", "cafe-27", "cafe-10", "cafe-18", "cafe-19",
    "cafe-11", "cafe-12", "cafe-13", "cafe-15", "cafe-23", "cafe-24", "cafe-03",
    "cafe-08", "cafe-09",
]

UNITS = [
    # L0
    dict(id="pu-greetings", title="Greetings and courtesy", level="L0",
         lessons=["il01"], situation="greetings", speak="speak-survival-greetings-1",
         grammar="Everyday hellos and goodbyes already in the phrasebook: שָׁלוֹם, time-of-day greetings, and לְהִתְרָאוֹת. How-are-you uses מַה שְׁלוֹמְךָ (to a man on greetings-11). These notes only name forms already in the sources."),
    dict(id="pu-politeness", title="Please, sorry and being polite", level="L0",
         lessons=["il01"], situation="politeness", speak="speak-survival-politeness-1",
         grammar="בְּבַקָּשָׁה softens a request or answers thanks. סְלִיחָה opens an interruption or an apology. These notes only name forms already in the phrasebook."),
    dict(id="pu-fillers", title="Sounding local: fillers", level="L0",
         lessons=["il02", "il23"], situation="fillers", speak="speak-survival-fillers-1",
         grammar="Fillers already stored in the phrasebook (יָעַנִי, כְּאִלּוּ and the rest of the situation) are frozen phrases, not a new grammar lesson. Register is unreviewed."),
    dict(id="pu-numbers", title="Numbers, prices and shekels", level="L0",
         lessons=["il04", "il05"], situation="numbers", speak="speak-time-numbers-2",
         grammar="Cardinal numbers and שֶׁקֶל already appear in the phrasebook and in il04–il05. These notes only name forms already in those sources."),
    dict(id="pu-introducing", title="Introducing yourself", level="L0",
         lessons=["il03"], situation=None, speak="speak-people-family-2",
         grammar="il03 already stores שְׁמִי, מַה שְׁמֶךָ / מַה שְׁמֵךְ, אֲנִי מִ... and נָעִים מְאֹד. These notes only name forms already in that lesson."),
    # L1 (existing units, now paged)
    dict(id="pu-cafe", title="Ordering at a cafe", level="L1",
         lessons=["il06", "il07", "I-13"], situation="cafe", speak="speak-survival-cafe-1",
         dialogues=["d-cafe"],
         grammar="A polite request often starts with אֶפְשָׁר plus an infinitive: אֶפְשָׁר לְהַזְמִין, אֶפְשָׁר לִרְאוֹת, אֶפְשָׁר לְשַׁלֵּם. Wants use רוֹצֶה / רוֹצָה. These notes only name forms already in the sources."),
    dict(id="pu-restaurant", title="Ordering at a restaurant", level="L1",
         lessons=["il06", "il07", "I-13", "I-38"], situation=None, speak="speak-survival-cafe-1",
         phrasebook_ids=RESTAURANT_IDS, dialogues=["d-restaurant"],
         grammar="The same אֶפְשָׁר + infinitive used at a cafe also opens a restaurant request. ALEF has no separate restaurant phrasebook: every Hebrew line here is copied from the cafe situation, from I-13 / I-38, or from the existing restaurant dialogue.",
         note="There is no separate restaurant phrasebook; these lines come from the cafe situation, I-38 מִסְעָדָה, and dialogue d-restaurant. No new Hebrew was composed."),
    dict(id="pu-shop", title="Shopping and paying", level="L1",
         lessons=["il08", "il09", "I-12", "I-43"], situation="shop", speak="speak-survival-shop-1",
         dialogues=["d-shop"],
         grammar="Price questions use כַּמָּה זֶה עוֹלֶה or מָה הַמְּחִיר. אֶפְשָׁר + infinitive makes a polite request. These notes only name forms already in the sources."),
    dict(id="pu-directions", title="Asking for and following directions", level="L1",
         lessons=["il11", "I-15"], situation="directions", speak="speak-survival-directions-1",
         dialogues=["d-directions"],
         grammar="Location questions use אֵיפֹה or אֵיךְ מַגִּיעִים לְ… Directional adverbs already in the phrasebook include יָמִינָה, שְׂמֹאלָה and יָשָׁר. These notes only name forms already in the sources."),
    dict(id="pu-transport", title="Transport: taxi, bus and train", level="L1",
         lessons=["il10", "I-11", "I-23"], situation="taxi", speak="speak-survival-taxi-1",
         dialogues=["d-taxi"],
         grammar="Destinations after לְ or לַ are already frozen in the phrasebook. Which-bus and next-train questions use אֵיזֶה and מָתַי. These notes only name forms already in the sources."),
    dict(id="pu-small-talk", title="Small talk", level="L1",
         lessons=["il13", "I-25", "I-36"], situation="small-talk", speak="speak-survival-small-talk-1",
         dialogues=["d-smalltalk"],
         grammar="Name questions use מַה שִּׁמְךָ and קוֹרְאִים לִי. Feeling phrases often put the adjective first: חַם לִי, קַר לִי. These notes only name forms already in the sources."),
    # L2
    dict(id="pu-family", title="Family and who you are", level="L2",
         lessons=["il14", "I-42"], situation=None, speak="speak-people-family-1",
         grammar="Family nouns already in il14 and I-42 (אָח, אָחוֹת, יֶלֶד, יַלְדָּה) and the construct used to ask a child's age in I-42. These notes only name forms already in those lessons."),
    dict(id="pu-home", title="Home, repairs and the landlord", level="L2",
         lessons=["I-44"], situation=None, speak="speak-home-things-1",
         grammar="I-44 already stores שָׁבוּר, names of parts of a flat, and בַּעַל הַבַּיִת. מָתַי and דָּחוּף are used to ask when someone can come. These notes only name forms already in that lesson."),
    dict(id="pu-time", title="Days, time and dates", level="L2",
         lessons=["il12"], situation=None, speak="speak-time-numbers-2",
         grammar="il12 already stores הַיּוֹם, מָחָר, אֶתְמוֹל, שָׁעָה, the weekday יוֹם רִאשׁוֹן, and שַׁבָּת as the seventh day. These notes only name forms already in that lesson."),
    dict(id="pu-weather", title="Weather and what to take", level="L2",
         lessons=["il15", "I-24"], situation=None, speak="speak-nature-animals-3",
         grammar="il15 and I-24 already store חַם, קַר, גֶּשֶׁם, שֶׁמֶשׁ and מֶזֶג אֲוִיר. These notes only name forms already in those lessons."),
    dict(id="pu-hotel", title="Hotel and booking", level="L2",
         lessons=["il17"], situation=None, speak="speak-places-travel-1",
         dialogues=["d-hotel"],
         grammar="il17 and the checking-in dialogue already stored in dialogues.json cover booking language. These notes only name forms already in those sources."),
    dict(id="pu-phone", title="Phone, SIM and messages", level="L2",
         lessons=["il22", "I-16"], situation=None, speak="speak-tech-media-1",
         grammar="il22 and I-16 already store phone, SIM, message and battery words, including מַטְעֵן (charger). These notes only name forms already in those lessons."),
    dict(id="pu-apartment", title="Looking at an apartment", level="L2",
         lessons=["I-17"], situation=None, speak="speak-home-things-2",
         grammar="I-17 already stores דִּירָה, חֶדֶר, קוֹמָה, מִרְפֶּסֶת, חוֹזֶה, בַּעַל הַבַּיִת and וַעַד בַּיִת. These notes only name forms already in that lesson."),
    dict(id="pu-plans", title="Making plans", level="L2",
         lessons=["il20"], situation=None, speak="speak-time-numbers-2",
         grammar="il20 already stores אֲנִי אֵלֵךְ, אֲנִי אֹכַל, נִתְרָאֶה, אוּלַי and בְּעוֹד שָׁבוּעַ. These notes only name forms already in that lesson."),
    dict(id="pu-opinions", title="Opinions and preferences", level="L2",
         lessons=["il21"], situation=None, speak="speak-survival-small-talk-1",
         grammar="il21 already stores אֲנִי חוֹשֵׁב שֶׁ..., לְדַעְתִּי, אֲנִי מַעֲדִיף, מַסְכִּים and לֹא מַסְכִּים. These notes only name forms already in that lesson."),
    dict(id="pu-driving", title="Driving and the road", level="L2",
         lessons=["I-39"], situation=None, speak="speak-places-travel-2",
         grammar="I-39 already stores מְכוֹנִית, כְּבִישׁ, תַּמְרוּר, דֶּלֶק, חֲנָיָה, רִמְזוּר, יָשָׁר, עֲצֹר and לְאַט. These notes only name forms already in that lesson."),
    dict(id="pu-hiking", title="Hiking and the trail", level="L2",
         lessons=["I-40"], situation=None, speak="speak-nature-animals-1",
         grammar="I-40 already stores טִיּוּל, מַסְלוּל, הַר, נַחַל, שְׁבִיל, מַפָּה, כּוֹבַע and רָחוֹק / קָרוֹב. These notes only name forms already in that lesson."),
    dict(id="pu-beach", title="At the beach", level="L2",
         lessons=["I-41"], situation=None, speak="speak-nature-animals-2",
         grammar="I-41 already stores חוֹף, יָם, חוֹל, גַּל, מַגֶּבֶת, כּוֹבַע, בֶּגֶד and סַכָּנָה. These notes only name forms already in that lesson."),
    # L3
    dict(id="pu-work", title="Work, office and a course", level="L3",
         lessons=["I-36", "I-37"], situation=None, speak="speak-society-work-law-1",
         grammar="I-36 already stores office and meeting words; I-37 already stores קוּרְס (a course). These notes only name forms already in those lessons."),
    dict(id="pu-health", title="Doctor, clinic and pharmacy", level="L3",
         lessons=["il18", "I-14", "I-20"], situation=None, speak="speak-body-health-2",
         grammar="il18, I-14 and I-20 already store רוֹפֵא / רוֹפְאָה, בֵּית מֶרְקַחַת, מִרְשָׁם, and how-often phrases such as פַּעַם בְּיוֹם. These notes only name forms already in those lessons."),
    dict(id="pu-bank", title="Bank, cash and forms", level="L3",
         lessons=["I-21", "I-48"], situation=None, speak="speak-society-work-law-2",
         grammar="I-21 and I-48 already store account, cash-machine and form-signing words. These notes only name forms already in those lessons."),
    dict(id="pu-post", title="Post office and parcels", level="L3",
         lessons=["I-22"], situation=None, speak="speak-society-work-law-2",
         grammar="I-22 already stores parcel, letter, stamp and queue words. These notes only name forms already in that lesson."),
    dict(id="pu-emergencies", title="Emergencies and calling for help", level="L3",
         lessons=["I-46", "il18"], situation="help", speak="speak-survival-help-1",
         grammar="The help phrasebook and I-46 already store עֶזְרָה, מִשְׁטָרָה, אַמְבּוּלַנְס and אָבַד לִי. These notes only name forms already in those sources."),
    dict(id="pu-delivery", title="Ordering delivery", level="L3",
         lessons=["I-45"], situation=None, speak="speak-food-drink-1",
         grammar="I-45 already stores מִשְׁלוֹחַ, הַזְמָנָה, שָׁלִיחַ, כְּתֹבֶת and קוֹמָה. These notes only name forms already in that lesson."),
    dict(id="pu-social", title="Messages, photos and social media", level="L3",
         lessons=["I-49"], situation=None, speak="speak-tech-media-2",
         grammar="I-49 already stores הוֹדָעָה, תְּמוּנָה, פְּרוֹפִיל, סִיסְמָה, אִינְטֶרְנֶט, אֶפְשָׁר לִשְׁלֹחַ and שׁוֹלֵחַ. These notes only name forms already in that lesson."),
    dict(id="pu-news", title="Reading a headline", level="L3",
         lessons=["I-47"], situation=None, speak="speak-society-work-law-3",
         grammar="I-47 already stores חֲדָשׁוֹת and everyday headline words also found in that lesson (prices, today / tomorrow / yesterday, יֵשׁ / אֵין). These notes only name forms already in that lesson. This is vocabulary for reading a headline, not a news lesson."),
    dict(id="pu-verbs-now", title="What I do now", level="L2",
         lessons=["il16"], situation=None, speak="speak-doing-verbs-1",
         grammar="il16 already stores present-tense phrases such as אֲנִי הוֹלֵךְ, אֲנִי אוֹכֵל and אֲנִי מְדַבֵּר. These are the masculine forms in that lesson; the lesson itself does not store the feminine partners here. These notes only name forms already in il16."),
    dict(id="pu-past", title="What I did", level="L2",
         lessons=["il19"], situation=None, speak="speak-doing-verbs-2",
         grammar="il19 already stores past-tense forms such as הָלַכְתִּי, אָכַלְתִּי and אָמַרְתִּי, and הָיָה. The ending ־תִּי is 'I' in those stored forms. These notes only name forms already in il19."),
    dict(id="pu-decide", title="What happened, and deciding", level="L2",
         lessons=["il24"], situation=None, speak="speak-survival-small-talk-1",
         grammar="il24 already stores מַה קָרָה, תַּסְבִּיר לִי and בּוֹא נַחֲלִיט as capstone conversation lines. These notes only name forms already in that lesson."),
    # L4
    dict(id="pu-shabbat", title="Being invited for Shabbat", level="L4",
         lessons=["I-19"], situation=None, speak="speak-religion-prayer-2",
         grammar="I-19 already stores invitation language: שַׁבָּת שָׁלוֹם, בְּשִׂמְחָה, לְהָבִיא, מָתַי לָבוֹא and תּוֹדָה רַבָּה. This unit is conversation around a meal invitation, not a liturgy lesson. These notes only name forms already in that lesson."),
    dict(id="pu-holidays", title="Holiday greetings and everyday wishes", level="L4",
         lessons=["I-50"], situation=None, speak="speak-religion-prayer-2",
         grammar="I-50 already stores חַג שָׂמֵחַ, שָׁנָה טוֹבָה, גְּמַר חֲתִימָה טוֹבָה and everyday wishes. Name-bearing lines from that lesson are not copied here. These notes only name forms already in that lesson."),
]


def load():
    lessons = {l["id"]: l for l in json.loads((ROOT / "data/curriculum/lessons.json").read_text())["lessons"]}
    pb = {e["id"]: e for e in json.loads((ROOT / "data/corpus/phrasebook.json").read_text())["entries"]}
    dialogues = {d["id"]: d for d in json.loads((ROOT / "data/curriculum/dialogues.json").read_text())["dialogues"]}
    return lessons, pb, dialogues


def held(he: str) -> bool:
    return bool(NAME_OR_GOY.search(he or ""))


def kind_of(he: str) -> str:
    if any(ch in he for ch in "?!,;") or " " in he or "\n" in he:
        return "line"
    return "word"


def item_pb(e: dict) -> dict:
    k = kind_of(e["he"])
    return {
        "id": e["id"],
        "source": "data/corpus/phrasebook.json",
        "he": e["he"],
        "en": e["en"],
        "translit": e.get("translit"),
        "review": e.get("review") or "native-speaker-needed: pointing and register",
        "listen": {"kind": k, "id": e["id"]},
    }


def item_lesson(lid: str, idx: int, w: dict) -> dict:
    wid = f"{lid.lower()}-w{idx}"
    return {
        "id": wid,
        "source": f"data/curriculum/lessons.json#{lid}.words[{idx-1}]",
        "he": w["he"],
        "en": w["en"],
        "translit": w.get("translit") or (w.get("pronunciation") or {}).get("israeli"),
        "review": "needs-native-review: lesson word, not native-checked",
        "listen": {"kind": "word", "id": wid},
    }


def item_dialogue(did: str, line: dict) -> dict:
    return {
        "id": line["id"],
        "source": f"data/curriculum/dialogues.json#{did}",
        "he": line["he"],
        "en": line["en"],
        "translit": line.get("translit"),
        "review": "needs-native-review: dialogue line, not native-checked",
        "listen": {"kind": "line", "id": line["id"]},
        "speaker": line.get("speaker"),
    }


def chunks(items: list, n: int = PER_PAGE) -> list:
    if not items:
        return []
    out = []
    i = 0
    while i < len(items):
        out.append(items[i:i + n])
        i += n
    # don't leave a 1-item tail if we can fold it into the previous page when previous would stay <= n+1
    if len(out) >= 2 and len(out[-1]) == 1 and len(out[-2]) < n:
        out[-2].extend(out[-1])
        out.pop()
    return out


def srs_for(items: list) -> list:
    q = []
    for i, it in enumerate(items, 1):
        k = it["listen"]["kind"]
        q.append({
            "position": i,
            "kind": k,
            "id": it["id"],
            "source": "item",
            "srsKind": "word" if k == "word" else "prayerLine",
            "band": "core" if i <= 12 else "extend",
        })
    return q


def page_title(items: list, fallback: str) -> str:
    if not items:
        return fallback
    en = (items[0].get("en") or "").strip()
    if en:
        # keep it short
        return en[0].upper() + en[1:56]
    return fallback


def page_note(items: list, unit_grammar: str) -> str:
    # short, no invented Hebrew; point at the first line
    first = items[0]["he"] if items else ""
    srcs = sorted({it["source"].split("#")[0] for it in items})
    return (
        f"This page uses only Hebrew already stored in {', '.join(srcs)}. "
        f"First line: {first}. " + unit_grammar.split(".")[0] + "."
    )


def gather(spec, lessons, pb, dialogues):
    items = []
    seen_he = set()

    def add(it):
        he = (it["he"] or "").strip()
        if not he or held(he):
            return
        key = he
        if key in seen_he:
            return
        seen_he.add(key)
        items.append(it)

    ids = list(spec.get("phrasebook_ids") or [])
    sit = spec.get("situation")
    if sit:
        ids = ids + [e["id"] for e in pb.values() if e.get("situation") == sit and e["id"] not in ids]
    for eid in ids:
        if eid in pb:
            add(item_pb(pb[eid]))
    for lid in spec.get("lessons") or []:
        l = lessons[lid]
        for i, w in enumerate(l.get("words") or [], 1):
            add(item_lesson(lid, i, w))
    for did in spec.get("dialogues") or []:
        d = dialogues[did]
        for line in d.get("lines") or []:
            add(item_dialogue(did, line))
    return items


def lesson_refs(spec, lessons):
    out = []
    for lid in spec.get("lessons") or []:
        l = lessons[lid]
        out.append({"id": lid, "title": l["title"], "track": l.get("track") or "israel", "wordCount": len(l.get("words") or [])})
    return out


def build_unit(spec, lessons, pb, dialogues):
    items = gather(spec, lessons, pb, dialogues)
    pages = []
    for n, chunk in enumerate(chunks(items), 1):
        pid = f"{spec['id']}-p{n:02d}"
        pages.append({
            "id": pid,
            "title": page_title(chunk, f"{spec['title']} ({n})"),
            "order": n,
            "grammarNote": page_note(chunk, spec["grammar"]),
            "items": chunk,
            "srsQueue": srs_for(chunk),
            "listenIds": [it["listen"]["id"] for it in chunk],
            "speakSet": spec["speak"],
        })
    unit = {
        "id": spec["id"],
        "title": spec["title"],
        "level": spec["level"],
        "status": "built-draft",
        "proofread": False,
        "nativeReview": True,
        "lessons": lesson_refs(spec, lessons),
        "phrasebookSituation": spec.get("situation"),
        "speakSets": [spec["speak"]],
        "grammarNote": spec["grammar"],
        "items": items,
        "srsQueue": srs_for(items),
        "listenDrills": [
            {"goal": "Hear the sourced lines and words already in the audio manifest.", "items": [it["listen"]["id"] for it in items], "source": "audio manifest, phrasebook and lesson-word ids"}
        ],
        "speakDrills": [{
            "goal": f"Repeat the existing set data/speak/sets/{spec['speak']}.json.",
            "set": spec["speak"],
            "note": "That set is machine-built and also unverified.",
        }],
        "pages": pages,
    }
    if spec.get("note"):
        unit["note"] = spec["note"]
    # drop null situation
    if unit["phrasebookSituation"] is None:
        del unit["phrasebookSituation"]
    return unit


def main():
    lessons, pb, dialogues = load()
    OUT.mkdir(parents=True, exist_ok=True)
    # remove stale generated unit files we own (keep nothing unexpected)
    for old in OUT.glob("pu-*.json"):
        old.unlink()
    units = []
    for spec in UNITS:
        # speak file must exist
        speak = ROOT / "data/speak/sets" / f"{spec['speak']}.json"
        if not speak.exists():
            raise SystemExit(f"missing speak set {spec['speak']}")
        for lid in spec.get("lessons") or []:
            if lid not in lessons:
                raise SystemExit(f"missing lesson {lid}")
        u = build_unit(spec, lessons, pb, dialogues)
        path = OUT / f"{u['id']}.json"
        path.write_text(json.dumps(u, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        units.append(u)
        print(f"{u['id']:18} pages={len(u['pages']):3} items={len(u['items']):3}  {path.relative_to(ROOT)}")

    index = {
        "schema": "alef-practical-curriculum/2",
        "generated": "2026-11-10",
        "proofread": False,
        "nativeReview": "required",
        "note": "Draft Babbel-style practical curriculum. Every Hebrew line is copied from the phrasebook, lessons.json, or dialogues.json. No new Hebrew was composed. Native review required. Not a 126th lesson. Name-bearing and goy lines were left out of these pages.",
        "levels": LEVELS,
        "units": [{
            "id": u["id"],
            "title": u["title"],
            "level": u["level"],
            "file": f"data/curriculum/practical/{u['id']}.json",
            "pageCount": len(u["pages"]),
            "itemCount": len(u["items"]),
            "status": "built-draft",
            "nativeReview": True,
        } for u in units],
        "totals": {
            "units": len(units),
            "pages": sum(len(u["pages"]) for u in units),
            "items": sum(len(u["items"]) for u in units),
        },
    }
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # slim compat pointer (no bulky item copies)
    compat = {
        "schema": "alef-practical-units/2",
        "generated": "2026-11-10",
        "proofread": False,
        "nativeReview": "required",
        "index": "data/curriculum/practical/index.json",
        "note": "Unit bodies and pages live in data/curriculum/practical/<id>.json so the first-install precache stays small. This file is a pointer for older tools.",
        "srs": {"module": "src/curriculum/srs.js", "storeKey": "srs.practical"},
        "units": index["units"],
        "totals": index["totals"],
    }
    (ROOT / "data/curriculum/practical-units.json").write_text(json.dumps(compat, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("TOTAL", index["totals"])


if __name__ == "__main__":
    main()
