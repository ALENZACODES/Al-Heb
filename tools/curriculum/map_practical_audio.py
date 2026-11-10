#!/usr/bin/env python3
"""Map practical items to existing clip ids; write gaps manifest. Does not render audio."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path("/workspace/Al-Heb-lesson-integrity-2026-11-10")
TRADITION = "israeli"

def load_manifests():
    rows = []
    for name in ("data/audio/manifest.json", "data/audio/manifest-kind-word.json", "data/audio/manifest-torah.json", "data/audio/manifest-torah-he.json"):
        p = ROOT / name
        if not p.exists():
            continue
        data = json.loads(p.read_text())
        if isinstance(data, list):
            rows.extend(data)
        elif isinstance(data, dict):
            rows.extend(data.get("clips") or data.get("entries") or [])
    by_id = {}  # (kind, id, tradition) -> entry, prefer tts/recorded over missing, israeli
    by_text = {}  # (text, tradition, kind) -> list
    for e in rows:
        if not isinstance(e, dict) or not e.get("id"):
            continue
        status = e.get("status") or ""
        if status == "missing":
            continue
        if not e.get("path"):
            continue
        kind, eid, trad = e.get("kind") or "word", e["id"], e.get("tradition") or "israeli"
        key = (kind, eid, trad)
        prev = by_id.get(key)
        if prev is None or (prev.get("voice") != "m" and e.get("voice") == "m"):
            by_id[key] = e
        text = e.get("text") or ""
        if text:
            by_text.setdefault((text, trad, kind), []).append(e)
    return by_id, by_text

def has_clip(by_id, kind, eid, tradition=TRADITION):
    for trad in (tradition, "israeli"):
        if (kind, eid, trad) in by_id:
            return by_id[(kind, eid, trad)]
    # any tradition
    for (k, i, t), e in by_id.items():
        if k == kind and i == eid:
            return e
    return None

def by_hebrew(by_text, he, kind=None):
    for trad in (TRADITION, "israeli"):
        kinds = [kind] if kind else ["word", "line", "prayer"]
        for k in kinds:
            if (he, trad, k) in by_text:
                return by_text[(he, trad, k)][0]
    return None

def main():
    by_id, by_text = load_manifests()
    units = []
    index = json.loads((ROOT / "data/curriculum/practical/index.json").read_text())
    clip_map = {"schema": "alef-practical-clip-map/1", "tradition": TRADITION, "note": "Existing clip ids only. Gaps are listed in docs/curriculum/PRACTICAL-AUDIO-GAPS.md for the games lane to render with Google Cloud TTS. This file does not invent audio.", "items": {}}
    gaps = []
    mapped = 0
    seen_gap = set()
    for row in index["units"]:
        u = json.loads((ROOT / row["file"]).read_text())
        units.append(u)
        for it in u["items"]:
            kind = (it.get("listen") or {}).get("kind") or ("word" if " " not in (it.get("he") or "") else "line")
            lid = (it.get("listen") or {}).get("id") or it["id"]
            entry = has_clip(by_id, kind, lid) or has_clip(by_id, "word", lid) or has_clip(by_id, "line", lid)
            via = "listen-id" if entry else None
            if not entry:
                entry = by_hebrew(by_text, it["he"], kind) or by_hebrew(by_text, it["he"], None)
                via = "same-pointed-text" if entry else None
            key = f"{u['id']}|{it['id']}"
            if entry:
                clip_map["items"][key] = {
                    "unitId": u["id"],
                    "itemId": it["id"],
                    "kind": entry.get("kind") or kind,
                    "clipId": entry["id"],
                    "tradition": entry.get("tradition") or TRADITION,
                    "via": via,
                    "status": entry.get("status"),
                }
                # also keep a convenience listen override
                it.setdefault("listen", {})
                # do not rewrite unit files here; sidecar only
                mapped += 1
            else:
                gap = {
                    "id": it["id"],
                    "unitId": u["id"],
                    "hebrew": it["he"],
                    "translit": it.get("translit") or "",
                    "tradition": TRADITION,
                    "en": it.get("en") or "",
                    "source": it.get("source") or "",
                }
                gaps.append(gap)
    clip_map["totals"] = {"mapped": mapped, "gaps": len(gaps), "items": mapped + len(gaps)}
    out = ROOT / "data/curriculum/practical/clip-map.json"
    out.write_text(json.dumps(clip_map, ensure_ascii=False, indent=1) + "\n")
    # unique gaps for games lane (same hebrew+id once)
    uniq = []
    seen = set()
    for g in gaps:
        k = (g["id"], g["hebrew"])
        if k in seen:
            continue
        seen.add(k)
        uniq.append({k2: g[k2] for k2 in ("id", "hebrew", "translit", "tradition")})
    md = ROOT / "docs/curriculum/PRACTICAL-AUDIO-GAPS.md"
    md.write_text(
        "# Practical audio gaps\n\n"
        "These Practical items have no existing clip in the audio manifests (by listen id or by the same pointed Hebrew text).\n"
        "The games lane can render them with Google Cloud TTS. This lane did not render them.\n\n"
        f"Mapped to an existing clip: {mapped}. Gaps (per unit item): {len(gaps)}. Unique texts to render: {len(uniq)}.\n"
        "Tradition for new clips should be `israeli` (the Practical track is Israeli Hebrew).\n\n"
        "```json\n"
        + json.dumps({"schema": "alef-practical-audio-gaps/1", "tradition": TRADITION, "items": uniq}, ensure_ascii=False, indent=2)
        + "\n```\n"
    )
    print(json.dumps({"mapped": mapped, "gap_items": len(gaps), "unique_gaps": len(uniq), "clip_map": str(out)}, ensure_ascii=False))

if __name__ == "__main__":
    main()
