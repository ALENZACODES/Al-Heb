#!/usr/bin/env python3
"""Write remaining Practical v3 pages into written.json and mark the outline written.

Every Hebrew string is copied from phrasebook, lessons, dialogues, gender-pairs or
audio manifests. This script is the page builder for levels 2–4 (97 pages).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PAGES_DIR = ROOT / "data/curriculum/practical-pages"
REVIEW_DAYS = [1, 3, 7, 14, 30]
NAME_OR_GOY = re.compile(
    r"יְהוָה|יהוה|הַשֵּׁם|אֲדֹנָי|אֱלֹהִים|אֱלֹהֵינוּ|אֱלֹהַי|"
    r"הַלְלוּ[־\s]?יָהּ|בְּעֶזְרַת הַשֵּׁם|גּוֹי|גּוֹיָה"
)

# Spoken-style translit when the source has none, or the clip phonetic is wrong.
TRANSLIT_FIX = {
    "i-16-w5": "internet",
    "i-16-w6": "sisma",
    "i-16-w7": "solela",
    "i-16-w8": "mat'en",
    "i-18-w10": "yalla",
    "i-18-w11": "sababa",
    "i-37-w3": "meratze",
    "i-37-w4": "profesor",
    "i-49-w3": "profil",
    "i-49-w5": "internet",
    "i-49-w4": "sisma",
    "i-14-w15": "antibiotika",
    "i-50-w13": "gemar chatima tova",
    "i-29-w13": "chag kasher ve-sameach",
    "i-28-w13": "gemar chatima tova",
    "il12-w6": "shabbat",
    "i-19-w1": "shabbat shalom",
    "i-50-w1": "shabbat shalom",
}


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def nfc(s: str) -> str:
    import unicodedata
    return unicodedata.normalize("NFC", s or "")


def hidden_item_ids(root: Path) -> set[str]:
    path = root / "data/curriculum/practical/hidden-items.json"
    if not path.exists():
        return set()
    data = load_json(path)
    return {h["item"] for h in data.get("items") or []}


class Sources:
    def __init__(self, root: Path):
        self.lessons = {l["id"]: l for l in load_json(root / "data/curriculum/lessons.json")["lessons"]}
        self.pb = {e["id"]: e for e in load_json(root / "data/corpus/phrasebook.json")["entries"]}
        dialogues = load_json(root / "data/curriculum/dialogues.json")["dialogues"]
        self.dialogues = {d["id"]: d for d in dialogues}
        self.dlg_lines = {}
        self.dlg_speaker_name = {}
        for d in dialogues:
            names = {s["id"]: s["name"] for s in d.get("speakers") or []}
            for line in d.get("lines") or []:
                self.dlg_lines[line["id"]] = line
                sid = line.get("speaker")
                self.dlg_speaker_name[line["id"]] = names.get(sid, sid)
        gp = load_json(root / "data/curriculum/gender-pairs.json")
        self.gp = {p["id"]: p for p in gp["pairs"]}
        word_rows = load_json(root / "data/audio/manifest-kind-word.json")
        line_rows = load_json(root / "data/audio/manifest.json")
        self.word_by_id: dict[str, list] = {}
        self.line_by_id: dict[str, list] = {}
        self.phonetic: dict[str, str] = {}
        for row in word_rows:
            self.word_by_id.setdefault(row["id"], []).append(row)
            if row.get("tradition") == "israeli" and row.get("phonetic"):
                self.phonetic[row["id"]] = row["phonetic"]
        for row in line_rows:
            self.line_by_id.setdefault(row["id"], []).append(row)
            if row.get("tradition") == "israeli" and row.get("phonetic") and row["id"] not in self.phonetic:
                self.phonetic[row["id"]] = row["phonetic"]

    def resolve_clip(self, clip_id: str) -> str:
        if clip_id in self.word_by_id or clip_id in self.line_by_id:
            return clip_id
        # Some phrasebook ids store the masculine line; clips are id-m / id-f.
        alt = f"{clip_id}-m"
        if alt in self.word_by_id or alt in self.line_by_id:
            return alt
        return clip_id

    def audio_for(self, clip_id: str, allow_gap: bool) -> dict:
        clip_id = self.resolve_clip(clip_id)
        rows = self.word_by_id.get(clip_id) or self.line_by_id.get(clip_id) or []
        israeli = [r for r in rows if r.get("tradition") == "israeli"] or rows
        voices = sorted({r.get("voice") for r in israeli if r.get("voice") in ("f", "m")})
        if voices == ["f", "m"] or voices == ["m", "f"]:
            status = "tts"
            if any(r.get("status") == "recorded" for r in israeli):
                status = "recorded"
            return {"clipId": clip_id, "status": status, "voices": ["f", "m"], "tradition": "israeli"}
        if allow_gap:
            return {"clipId": clip_id, "status": "gap", "voices": []}
        raise KeyError(f"no both-voice clip for {clip_id}")

    def has_clip(self, clip_id: str) -> bool:
        resolved = self.resolve_clip(clip_id)
        return resolved in self.word_by_id or resolved in self.line_by_id


LESSON_ID_RE = re.compile(r"^(il\d+|i-\d+)-w(\d+)$", re.I)
GP_RE = re.compile(r"^(gp-\d+)-(m|f)$")


def lesson_source(lid: str, idx: int) -> str:
    return f"data/curriculum/lessons.json#{lid}.words[{idx - 1}]"


def kind_of(he: str, force: str | None = None) -> str:
    if force:
        return force
    if any(ch in he for ch in "?!,;") or " " in he or "\n" in he:
        return "line"
    return "word"


def item_from(src: Sources, item_id: str) -> dict:
    it = _item_from(src, item_id)
    it["listen"]["id"] = it["audio"]["clipId"]
    return it


def _item_from(src: Sources, item_id: str) -> dict:
    if item_id in src.pb:
        e = src.pb[item_id]
        k = kind_of(e["he"])
        it = {
            "id": item_id,
            "source": "data/corpus/phrasebook.json",
            "he": e["he"],
            "en": e["en"],
            "translit": e["translit"],
            "review": e.get("review") or "native-speaker-needed: pointing and register",
            "listen": {"kind": k, "id": item_id},
            "audio": src.audio_for(item_id, allow_gap=False),
        }
        reg = e.get("register")
        if reg in ("slang", "formal"):
            it["register"] = reg
        if item_id.endswith("-m"):
            it["form"] = "to or by a man"
        elif item_id.endswith("-f"):
            it["form"] = "to or by a woman"
        return it

    m = GP_RE.match(item_id)
    if m:
        gid, g = m.group(1), m.group(2)
        pair = src.gp[gid]
        form = pair["forms"][g]
        k = "line"
        it = {
            "id": item_id,
            "source": f"data/curriculum/gender-pairs.json#{gid}.{g}",
            "he": form["he"],
            "en": pair["en"].rstrip(".") + ".",
            "translit": form["translit"],
            "review": "native-speaker-needed: gender pair",
            "listen": {"kind": k, "id": item_id},
            "audio": src.audio_for(item_id, allow_gap=True),
            "form": "to or by a man" if g == "m" else "to or by a woman",
        }
        return it

    if item_id in src.dlg_lines:
        line = src.dlg_lines[item_id]
        it = {
            "id": item_id,
            "source": "data/curriculum/dialogues.json",
            "he": line["he"],
            "en": line["en"],
            "translit": line["translit"],
            "review": "native-speaker-needed: dialogue line",
            "listen": {"kind": "line", "id": item_id},
            "audio": src.audio_for(item_id, allow_gap=True),
            "speaker": src.dlg_speaker_name.get(item_id),
        }
        return it

    m = LESSON_ID_RE.match(item_id)
    if m:
        raw, idx = m.group(1), int(m.group(2))
        lid = raw if raw.startswith("il") else "I-" + raw.split("-", 1)[1]
        lesson = src.lessons[lid]
        w = lesson["words"][idx - 1]
        he = w["he"]
        # Lesson nouns stay "word" even when they contain a space (בֵּית מֶרְקַחַת).
        k = "word" if not any(ch in he for ch in "?!") else "line"
        if " " in he and any(tok.startswith(("אֲנִי", "מָה", "מַה", "אֶפְשָׁר", "תַּ")) for tok in [he]):
            k = "line"
        # phrases that are clearly sentences
        if any(ch in he for ch in "?!") or he.startswith("אֲנִי ") or he.startswith("אֶפְשָׁר ") or " " in he and any(
            he.startswith(p) for p in ("מָה ", "מַה ", "תַּ", "בּוֹא ", "אָבַד ", "כַּמָּה ")
        ):
            k = "line"
        tr = TRANSLIT_FIX.get(item_id) or w.get("translit") or (w.get("pronunciation") or {}).get("israeli") or src.phonetic.get(item_id)
        if not tr:
            raise KeyError(f"no translit for {item_id} {he}")
        if item_id in TRANSLIT_FIX or not w.get("translit"):
            tr_source = "spoken style written for this page; native check"
        else:
            tr_source = "lesson"
        it = {
            "id": item_id,
            "source": lesson_source(lid, idx),
            "he": he,
            "en": w["en"],
            "translit": tr,
            "translitSource": tr_source,
            "review": "native-speaker-needed: lesson word",
            "listen": {"kind": k, "id": item_id},
            "audio": src.audio_for(item_id, allow_gap=False),
        }
        if item_id.endswith("-m") or (w["en"].endswith("(m.)") or w["en"].endswith("(m)") or "said to a man" in w["en"] or "to a man" in w["en"]):
            if re.search(r"\((m\.?|said to a man|to a man)", w["en"]) or "to a man" in w["en"]:
                it["form"] = "to or by a man"
        if "to a woman" in w["en"] or w["en"].endswith("(f)") or w["en"].endswith("(f.)") or "said to a woman" in w["en"]:
            it["form"] = "to or by a woman"
        return it

    raise KeyError(f"unknown item id {item_id}")


def srs_entry(pos: int, it: dict, band: str, source: str) -> dict:
    k = it["listen"]["kind"]
    return {
        "position": pos,
        "kind": k,
        "id": it["id"],
        "source": source,
        "srsKind": "word" if k == "word" else "prayerLine",
        "band": band,
    }


def listen_rounds(items: list[dict], src: Sources) -> list[dict]:
    usable = [it for it in items if src.has_clip(it["listen"]["id"]) and not it.get("heldForJohn")]
    out = []
    ids = [it["id"] for it in usable]
    for i, it in enumerate(usable):
        distractors = [x for x in ids if x != it["id"]]
        # rotate so options vary
        opt = []
        if distractors:
            opt.append(distractors[i % len(distractors)])
        if len(distractors) > 1:
            opt.append(distractors[(i + 1) % len(distractors)])
        # unique, include answer last (existing pages often put answer last)
        options = []
        for x in opt + [it["id"]]:
            if x not in options:
                options.append(x)
        if len(options) < 2 and len(ids) == 1:
            # single-item page: still one option (allowed minItems 1)
            options = [it["id"]]
        out.append({
            "type": "pick-meaning",
            "clip": {"kind": it["listen"]["kind"], "id": it["listen"]["id"]},
            "answer": it["id"],
            "options": options,
        })
    return out


def speak_entries(spec_speak: list, by_id: dict[str, dict]) -> list[dict]:
    out = []
    for prompt, answer in spec_speak:
        it = by_id[answer]
        out.append({
            "prompt": prompt,
            "answer": answer,
            "he": it["he"],
            "translit": it["translit"],
            "en": it["en"],
            "audio": it["audio"],
        })
    return out


def build_page(spec: dict, src: Sources, earlier_items: dict[str, dict]) -> dict:
    items = []
    for iid in spec["items"]:
        it = item_from(src, iid)
        if iid in spec.get("held", []):
            it["heldForJohn"] = True
        items.append(it)
    by_id = {it["id"]: it for it in items}
    # review/check speak+examples may use earlier items
    mine = dict(by_id)
    if spec["kind"] in ("review", "check"):
        for r in spec.get("reviewOf") or []:
            if r not in mine:
                mine[r] = earlier_items[r]
    examples = []
    for eid in spec["examples"]:
        it = mine[eid]
        examples.append({"itemId": eid, "he": it["he"], "en": it["en"]})
    point = spec["point"]
    body = spec["body"]
    page = {
        "id": spec["id"],
        "title": spec["title"],
        "order": spec["order"],
        "kind": spec["kind"],
        "can": spec["can"],
        "grammar": {"point": point, "body": body, "examples": examples},
        "grammarNote": f"{point}. {body}",
        "items": items,
        "listen": listen_rounds(items, src) if spec.get("listen", True) else [],
        "speak": speak_entries(spec["speak"], mine),
        "reviewDays": REVIEW_DAYS,
        "reviewOf": list(spec.get("reviewOf") or []),
        "listenIds": [it["listen"]["id"] for it in items],
        "srsQueue": [],
    }
    if spec.get("culture"):
        page["culture"] = spec["culture"]
    if spec.get("dialogue"):
        page["dialogue"] = spec["dialogue"]
    if spec.get("held"):
        page["heldForJohn"] = list(spec["held"])
    # For dialogue pages, existing ones often have empty listen (gap clips).
    if spec["kind"] == "dialogue" and not any(src.has_clip(it["listen"]["id"]) for it in items if not it.get("heldForJohn")):
        page["listen"] = []
    q = []
    pos = 1
    for it in items:
        q.append(srs_entry(pos, it, "core", "item"))
        pos += 1
    for rid in page["reviewOf"]:
        rit = earlier_items[rid]
        q.append(srs_entry(pos, rit, "review", "review"))
        pos += 1
    page["srsQueue"] = q
    return page


def pick_reviews(earlier: list[str], n: int, exclude: set[str], held: set[str]) -> list[str]:
    out = []
    for iid in reversed(earlier):
        if iid in exclude or iid in held or iid in out:
            continue
        out.append(iid)
        if len(out) >= n:
            break
    out.reverse()
    return out


def render_md(written: dict) -> str:
    lines = []
    n = len(written["pages"])
    lines.append(f"# Practical Hebrew: The Written Pages ({n})")
    lines.append("")
    lines.append("Generated from `data/curriculum/practical-pages/written.json` by the page builder. Do not edit by hand.")
    lines.append("")
    lines.append("Every Hebrew line is copied from the repo's phrasebook, audio manifests, lessons or dialogues. Nothing here has had a native-speaker read yet; transliteration marked \\* was written for these pages in the phrasebook's spoken style and needs a native check.")
    lines.append("")
    lines.append("Spaced review: each page queues its new items, plus earlier items marked review. Intervals: 1, 3, 7, 14, 30 days.")
    lines.append("")
    kind_label = {
        "learn": "Learn page",
        "grammar": "Grammar page",
        "dialogue": "Dialogue page",
        "listen": "Listen page",
        "speak": "Speak page",
        "review": "Review page",
        "check": "Check page",
    }
    for p in written["pages"]:
        lines.append(f"## {p['id']}: {p['title']}")
        lines.append("")
        lines.append(f"*{kind_label.get(p['kind'], p['kind'])}.* {p['can']}")
        lines.append("")
        lines.append(f"**Grammar: {p['grammar']['point']}.** {p['grammar']['body']}")
        lines.append("")
        if p.get("culture"):
            lines.append(f"**Culture.** {p['culture']}")
            lines.append("")
        if p.get("dialogue"):
            lines.append(f"**Dialogue setting.** {p['dialogue']['setting']}")
            lines.append("")
        lines.append("| Hebrew | Transliteration | English | Audio |")
        lines.append("|---|---|---|---|")
        for it in p["items"]:
            star = " \\*" if it.get("translitSource", "").startswith("spoken") else ""
            form = f" ({it['form']})" if it.get("form") else ""
            speaker = f"{it['speaker']}: " if it.get("speaker") else ""
            held = " — held for John" if it.get("heldForJohn") else ""
            aud = it["audio"]
            if aud["status"] == "gap":
                audio = f"`{aud['clipId']}` gap"
            else:
                voices = "+".join(aud.get("voices") or [])
                audio = f"`{aud['clipId']}` {aud['status']}, {voices}"
            lines.append(f"| {speaker}{it['he']} | {it['translit']}{star} | {it['en']}{form}{held} | {audio} |")
        lines.append("")
        if p.get("speak"):
            lines.append("**Speak.**")
            lines.append("")
            for s in p["speak"]:
                lines.append(f"- {s['prompt']} → {s['he']} ({s['translit']}) · audio `{s['audio']['clipId']}`")
            lines.append("")
        if p.get("reviewOf"):
            queued = ", ".join(f"`{r}`" for r in p["reviewOf"])
            lines.append(f"**Review queue from earlier pages:** {queued}")
            lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def validate_grammar_hebrew(pages: list[dict]) -> list[str]:
    errors = []
    seen = []
    for p in pages:
        seen.extend(nfc(it["he"]) for it in p["items"])
        pool = " ".join(seen)
        for run in re.findall(r"[֐-׿]+", p["grammar"]["body"]):
            if nfc(run) not in pool and not any(nfc(run) in s for s in seen):
                errors.append(f"{p['id']} grammar: {run}")
        if len(p["grammar"]["body"]) <= 40:
            errors.append(f"{p['id']}: grammar body too short")
        if re.search(r"data/|phrasebook|stored|json", p["grammarNote"], re.I):
            errors.append(f"{p['id']}: grammar note mentions files")
    return errors


def level_of_page(pid: str, outline: dict) -> str | None:
    for u in outline["units"]:
        if any(p["id"] == pid for p in u["pages"]):
            return u["level"]
    return None


def unit_of_page(pid: str) -> str:
    return pid.rsplit("-p", 1)[0]


def pick_level_reviews(pages: list[dict], outline: dict, level: str, n: int, exclude: set[str]) -> list[str]:
    if level == "FINAL":
        want = {u["id"] for u in outline["units"]}
    elif level == "L2":
        want = {u["id"] for u in outline["units"] if u["level"] == "L2" and u["id"] != "pu-decide"}
    elif level == "L3":
        want = {u["id"] for u in outline["units"] if u["level"] == "L3" and u["id"] != "pu-news"}
    else:
        want = set()
    # prefer one from each unit, walking backwards
    chosen = []
    seen_unit = set()
    held = set()
    earlier = []
    for p in pages:
        for it in p["items"]:
            if it.get("heldForJohn"):
                held.add(it["id"])
            else:
                earlier.append((p["id"], it["id"]))
    for pid, iid in reversed(earlier):
        u = unit_of_page(pid)
        if u not in want or iid in exclude or iid in held or iid in chosen:
            continue
        if u in seen_unit and len(chosen) + (len(want) - len(seen_unit)) >= n:
            # still allow more from same unit later if we need fill
            continue
        if u not in seen_unit or len(chosen) < n:
            if u not in seen_unit or len(chosen) < n:
                chosen.append(iid)
                seen_unit.add(u)
        if len(chosen) >= n and len(seen_unit) >= min(n, len(want)):
            break
    if len(chosen) < n:
        for pid, iid in reversed(earlier):
            if iid in exclude or iid in held or iid in chosen:
                continue
            if unit_of_page(pid) in want or level == "FINAL":
                chosen.append(iid)
            if len(chosen) >= n:
                break
    chosen.reverse()
    return chosen[:n]


def unhold_politeness(pages: list[dict]) -> None:
    for p in pages:
        if p["id"] != "pu-politeness-p05":
            continue
        for it in p["items"]:
            if it["id"] == "politeness-21":
                it.pop("heldForJohn", None)
        p["heldForJohn"] = [x for x in p.get("heldForJohn") or [] if x != "politeness-21"]
        if not p["heldForJohn"]:
            p.pop("heldForJohn", None)


def write_army_unit(src: Sources, root: Path) -> dict:
    lesson = src.lessons["I-18"]
    items = []
    # family-friendly: skip i-18-w7 weapon
    for i, w in enumerate(lesson["words"], 1):
        if i == 7:
            continue
        items.append(item_from(src, f"i-18-w{i}"))
    pages = []
    # draft pages are placeholders; written v3 pages replace them
    chunks = [items[0:5], items[5:10], items[10:]]
    for n, chunk in enumerate(chunks, 1):
        if not chunk:
            continue
        pages.append({
            "id": f"pu-army-p{n:02d}",
            "title": chunk[0]["en"][:56],
            "order": n,
            "grammarNote": "Draft page; the written v3 page replaces this.",
            "items": chunk,
            "srsQueue": [srs_entry(i, it, "core", "item") for i, it in enumerate(chunk, 1)],
            "listenIds": [it["listen"]["id"] for it in chunk],
            "speakSet": "speak-survival-small-talk-1",
        })
    unit = {
        "id": "pu-army",
        "title": "Army slang basics",
        "level": "L3",
        "status": "built-draft",
        "proofread": False,
        "nativeReview": True,
        "lessons": [{"id": "I-18", "title": lesson["title"], "track": "israel", "wordCount": len(lesson.get("words") or [])}],
        "speakSets": ["speak-survival-small-talk-1"],
        "grammarNote": "I-18 already stores service and everyday reply words. Weapon vocabulary is kept in the lesson and left off the live Practical pages so the unit stays family-friendly.",
        "items": items,
        "srsQueue": [srs_entry(i, it, "core", "item") for i, it in enumerate(items, 1)],
        "listenDrills": [{"goal": "Hear the sourced service and reply words.", "items": [it["listen"]["id"] for it in items], "source": "lesson-word ids"}],
        "speakDrills": [{"goal": "Repeat the existing set data/speak/sets/speak-survival-small-talk-1.json.", "set": "speak-survival-small-talk-1", "note": "That set is machine-built and also unverified."}],
        "pages": pages,
        "note": "Live Practical unit for I-18, family-friendly sourced slang. The written v3 pages replace these drafts.",
    }
    path = root / "data/curriculum/practical/pu-army.json"
    path.write_text(json.dumps(unit, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return unit


def insert_army_in_index(root: Path, army_pages: int, army_items: int) -> None:
    row = {
        "id": "pu-army",
        "title": "Army slang basics",
        "level": "L3",
        "file": "data/curriculum/practical/pu-army.json",
        "pageCount": army_pages,
        "itemCount": army_items,
        "status": "built-draft",
        "nativeReview": True,
    }
    for rel in ("data/curriculum/practical/index.json", "data/curriculum/practical-units.json"):
        path = root / rel
        data = json.loads(path.read_text(encoding="utf-8"))
        units = data["units"]
        if any(u["id"] == "pu-army" for u in units):
            data["units"] = [row if u["id"] == "pu-army" else u for u in units]
        else:
            ids = [u["id"] for u in units]
            if "pu-news" in ids:
                at = ids.index("pu-news")
            elif "pu-social" in ids:
                at = ids.index("pu-social") + 1
            else:
                at = len(units)
            units.insert(at, row)
        data["totals"] = {
            "units": len(data["units"]),
            "pages": sum(u.get("pageCount") or 0 for u in data["units"]),
            "items": sum(u.get("itemCount") or 0 for u in data["units"]),
        }
        path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def main() -> int:
    # Allow running from a worktree whose tools path is imported as a sibling.
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from written_page_specs import SPECS

    src = Sources(ROOT)
    hidden = hidden_item_ids(ROOT)
    outline = load_json(PAGES_DIR / "outline.json")
    written = load_json(PAGES_DIR / "written.json")
    existing = list(written["pages"])
    unhold_politeness(existing)

    taught = {}
    earlier_ids = []
    held = set()
    for p in existing:
        for it in p["items"]:
            taught[it["id"]] = it
            if it.get("heldForJohn"):
                held.add(it["id"])
            else:
                earlier_ids.append(it["id"])
    held |= hidden

    all_outline = [p for u in outline["units"] for p in u["pages"]]
    planned = [p for p in all_outline if p.get("status") != "written"]
    if not planned:
        # Rebuild the pages this script owns (from the first spec id onward).
        start = next(i for i, p in enumerate(all_outline) if p["id"] == SPECS[0]["id"])
        planned = all_outline[start:]
        existing[:] = [p for p in existing if p["id"] not in {x["id"] for x in planned}]
        taught.clear(); earlier_ids.clear()
        # Recompute taught from the kept prefix (held already includes hidden).
        # held currently includes hidden; rebuild live earlier ids only.
        live_held = set(held)
        earlier_ids[:] = []
        for p in existing:
            for it in p["items"]:
                taught[it["id"]] = it
                if it.get("heldForJohn") or it["id"] in live_held:
                    held.add(it["id"])
                else:
                    earlier_ids.append(it["id"])
    if len(SPECS) != len(planned):
        print(f"spec count {len(SPECS)} != planned {len(planned)}", file=sys.stderr)
        return 1
    for spec, plan in zip(SPECS, planned):
        if spec["id"] != plan["id"] or spec["kind"] != plan["kind"] or spec["title"] != plan["title"]:
            print(f"spec mismatch {spec['id']} vs {plan['id']} {plan['kind']} {plan['title']}", file=sys.stderr)
            return 1

    new_pages = []
    for spec in SPECS:
        exclude = set(spec["items"]) | set(spec.get("held") or [])
        n = spec.get("review_n") or 0
        if spec.get("reviewOf") is None:
            if spec.get("reviewOf_level"):
                pool_pages = existing + new_pages
                spec["reviewOf"] = pick_level_reviews(pool_pages, outline, spec["reviewOf_level"], n, exclude)
            elif n:
                spec["reviewOf"] = pick_reviews(earlier_ids, n, exclude, held)
            else:
                spec["reviewOf"] = []
        # Review/check speak answers and grammar examples must be on the page or in reviewOf.
        if spec["kind"] in ("review", "check"):
            need = list(spec.get("examples") or []) + [ans for _p, ans in (spec.get("speak") or [])]
            ro = list(spec["reviewOf"])
            for iid in need:
                if iid not in spec["items"] and iid not in ro:
                    if iid not in taught:
                        raise KeyError(f"{spec['id']}: example/speak {iid} not yet taught")
                    ro.append(iid)
            spec["reviewOf"] = ro
        try:
            page = build_page(spec, src, taught)
        except Exception as e:
            print(f"build failed {spec['id']}: {e}", file=sys.stderr)
            raise
        new_pages.append(page)
        for it in page["items"]:
            taught[it["id"]] = it
            if it.get("heldForJohn"):
                held.add(it["id"])
            else:
                earlier_ids.append(it["id"])
        for rid in page["reviewOf"]:
            earlier_ids.append(rid)

    all_pages = existing + new_pages
    errs = validate_grammar_hebrew(all_pages)
    if errs:
        print("grammar Hebrew errors:", file=sys.stderr)
        for e in errs[:40]:
            print(" ", e, file=sys.stderr)
        return 1

    written["pages"] = all_pages
    written["completeUnits"] = [u["id"] for u in outline["units"]]
    written["generated"] = "2026-11-10"
    written["proofread"] = False
    written["nativeReview"] = "required"
    written["note"] = (
        "The written pages of the Practical course, in course order. Every Hebrew line is copied by id from "
        "data/corpus/phrasebook.json, data/audio/manifest*.json, data/curriculum/lessons.json, "
        "data/curriculum/dialogues.json or data/curriculum/gender-pairs.json. Page fields extend the v2 page shape; "
        "v2 readers can ignore the new ones. בְּעֶזְרַת הַשֵּׁם on pu-politeness-p05 (politeness-21) is shown as a set phrase "
        "(John, 2026-11-10). The eight divine-name holds in docs/review/LESSON-INTEGRITY-2026-11-10.md stay held and are not "
        "practised here. pu-army is on the live course, family-friendly sourced slang. Festival greetings "
        "גְּמַר חֲתִימָה טוֹבָה and חַג כָּשֵׁר וְשָׂמֵחַ are shown. Shabbat and holiday units stay at the end of the course."
    )
    (PAGES_DIR / "written.json").write_text(json.dumps(written, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    written_ids = {p["id"] for p in all_pages}
    for u in outline["units"]:
        for p in u["pages"]:
            if p["id"] in written_ids:
                p["status"] = "written"
        if u["id"] == "pu-army":
            u["live"] = True
            u.pop("heldForJohn", None)
    outline["totals"]["written"] = len(all_pages)
    outline["totals"]["pages"] = sum(len(u["pages"]) for u in outline["units"])
    outline["totals"]["units"] = len(outline["units"])
    outline["note"] = (
        "The planned page outline for the Practical course, now the single Israel course. "
        "Unit ids match data/curriculum/practical-units.json. Pages marked written are in "
        "data/curriculum/practical-pages/written.json. pu-army (I-18, family-friendly sourced slang) is on the live set. "
        "#/israel-units redirects to #/practical."
    )
    (PAGES_DIR / "outline.json").write_text(json.dumps(outline, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    army = write_army_unit(src, ROOT)
    insert_army_in_index(ROOT, len(army["pages"]), len(army["items"]))

    md = render_md(written)
    (ROOT / "docs/curriculum/PRACTICAL-WRITTEN-PAGES.md").write_text(md, encoding="utf-8")
    print(f"wrote {len(all_pages)} pages ({len(existing)} existing + {len(new_pages)} new)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
