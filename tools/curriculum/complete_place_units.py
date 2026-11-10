#!/usr/bin/env python3
"""Give the place units the same page fields build_practical_pages.py writes: listen, srsQueue, listenIds, speakSet.

The place units were written by hand from existing lessons and phrasebook lines. This adds no Hebrew and changes no line.
Run: python3 tools/curriculum/complete_place_units.py
"""
from __future__ import annotations

import json
from pathlib import Path

from build_practical_pages import kind_of, srs_for

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data/curriculum/practical"

# Existing speaking set for each place unit (data/speak/sets/<name>.json).
SPEAK = {
    "pu-pharmacy": "speak-body-health-1",
    "pu-hospital": "speak-body-health-2",
    "pu-shuk": "speak-survival-shop-1",
    "pu-supermarket": "speak-food-drink-1",
    "pu-university": "speak-school-learning-1",
    "pu-school": "speak-school-learning-1",
    "pu-going-out": "speak-survival-small-talk-1",
    "pu-airport-taxi": "speak-survival-taxi-1",
}


def with_listen(it: dict) -> dict:
    if "listen" not in it:
        it = {**it, "listen": {"kind": kind_of(it["he"]), "id": it["id"]}}
    return it


def main() -> None:
    for uid, speak in SPEAK.items():
        assert (ROOT / f"data/speak/sets/{speak}.json").exists(), speak
        path = OUT / f"{uid}.json"
        unit = json.loads(path.read_text(encoding="utf-8"))
        unit["items"] = [with_listen(it) for it in unit["items"]]
        unit["speakSets"] = [speak]
        unit["srsQueue"] = srs_for(unit["items"])
        unit["listenDrills"] = [{
            "goal": "Hear the sourced lines and words already in the audio manifest.",
            "items": [it["listen"]["id"] for it in unit["items"]],
            "source": "audio manifest, phrasebook and lesson-word ids",
        }]
        unit["speakDrills"] = [{
            "goal": f"Repeat the existing set data/speak/sets/{speak}.json.",
            "set": speak,
            "note": "That set is machine-built and also unverified.",
        }]
        for page in unit["pages"]:
            page["items"] = [with_listen(it) for it in page["items"]]
            page["srsQueue"] = srs_for(page["items"])
            page["listenIds"] = [it["listen"]["id"] for it in page["items"]]
            page["speakSet"] = speak
        path.write_text(json.dumps(unit, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(uid, len(unit["pages"]), "pages", len(unit["items"]), "items")


if __name__ == "__main__":
    main()
