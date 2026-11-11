#!/usr/bin/env python3
"""Add the written pages for the place units in place_page_specs.py to the Practical course.

Existing written pages are left exactly as they are. Each new unit is put after the unit named in its spec, its pages are built
with the same builder as the rest of the course (build_written_v3.build_page), and review items are the lines taught most
recently before it.
Run: python3 tools/curriculum/build_place_pages.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_written_v3 as B  # noqa: E402
from place_page_specs import SPECS, UNITS  # noqa: E402

ROOT = B.ROOT
PAGES_DIR = B.PAGES_DIR


def main() -> int:
    src = B.Sources(ROOT)
    hidden = B.hidden_item_ids(ROOT)
    outline = B.load_json(PAGES_DIR / "outline.json")
    written = B.load_json(PAGES_DIR / "written.json")
    by_id = {p["id"]: p for p in written["pages"]}
    specs = {s["id"]: s for s in SPECS}

    # 1. outline: put each new unit after its named unit (skip units already there, so the script can be run again)
    for u in UNITS:
        if any(x["id"] == u["id"] for x in outline["units"]):
            continue
        pages = [s for s in SPECS if s["id"].startswith(u["id"] + "-p")]
        entry = {
            "id": u["id"], "level": u["level"], "title": u["title"], "lessons": u["lessons"],
            "phrasebookSituation": None, "dialogue": None,
            "file": f"data/curriculum/practical/{u['id']}.json", "route": f"#/practical/{u['id']}",
            "pages": [{"id": s["id"], "order": s["order"], "kind": s["kind"], "title": s["title"], "status": "written",
                       "route": f"#/practical/{u['id']}/{s['id']}"} for s in pages],
        }
        at = next(i for i, x in enumerate(outline["units"]) if x["id"] == u["after"])
        outline["units"].insert(at + 1, entry)

    # 2. pages in course order: keep every existing page, build the new ones where they fall
    taught, earlier, held = {}, [], set(hidden)
    out = []
    for u in outline["units"]:
        for op in u["pages"]:
            pid = op["id"]
            if pid in specs:
                spec = dict(specs[pid])
                exclude = set(spec["items"])
                spec["reviewOf"] = B.pick_reviews(earlier, spec.get("review_n") or 0, exclude, held)
                if spec["kind"] in ("review", "check"):
                    for iid in list(spec["examples"]) + [a for _p, a in spec["speak"]]:
                        if iid not in spec["items"] and iid not in spec["reviewOf"]:
                            spec["reviewOf"].append(iid)
                page = B.build_page(spec, src, taught)
            elif pid in by_id:
                page = by_id[pid]
            else:
                continue
            out.append(page)
            for it in page["items"]:
                taught[it["id"]] = it
                if it.get("heldForJohn"):
                    held.add(it["id"])
                else:
                    earlier.append(it["id"])

    errs = B.validate_grammar_hebrew(out)
    if errs:
        print("\n".join(errs), file=sys.stderr)
        return 1
    for pid in specs:
        page = next(p for p in out if p["id"] == pid)
        for it in page["items"]:
            if it["id"] in hidden:
                print(f"{pid}: {it['id']} is on the hidden list", file=sys.stderr)
                return 1

    written["pages"] = out
    written["completeUnits"] = [u["id"] for u in outline["units"]]
    (PAGES_DIR / "written.json").write_text(json.dumps(written, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    outline["totals"]["written"] = len(out)
    outline["totals"]["pages"] = sum(len(u["pages"]) for u in outline["units"])
    outline["totals"]["units"] = len(outline["units"])
    (PAGES_DIR / "outline.json").write_text(json.dumps(outline, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (ROOT / "docs/curriculum/PRACTICAL-WRITTEN-PAGES.md").write_text(B.render_md(written), encoding="utf-8")
    print(f"wrote {len(out)} pages in {len(outline['units'])} units ({len(specs)} from the place specs)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
