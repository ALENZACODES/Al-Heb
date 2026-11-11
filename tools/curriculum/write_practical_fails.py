#!/usr/bin/env python3
"""Group Practical Cloud fails by cause for Claude. Do not invent Hebrew."""
from __future__ import annotations
import json, re, unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SHARED = Path("/workspace/shared/al-heb")
OUT = SHARED / "overnight-2026-11-10" / "claude-lanes" / "PRACTICAL-FAILS-FOR-CLAUDE.md"
RESULTS = ROOT / "data/curriculum/practical" / "gcloud-results.json"

NIKKUD = re.compile(r"[\u0591-\u05C7]")
FINALS = str.maketrans("ךםןףץ", "כמנפצ")

def letters(s):
    s = NIKKUD.sub("", s or "")
    s = s.translate(FINALS)
    return re.sub(r"[^\u05d0-\u05ea]", "", s)

def group_of(rec):
    reason = rec.get("reason") or ""
    if rec.get("blocked"):
        return "blocked-name"
    if reason == "not-tested" or not rec.get("done"):
        return "not-tested"
    fwd, rev = rec.get("fwd_ok"), rec.get("rev_ok")
    if fwd is False or rev is False:
        return "translation"
    he, stt = rec.get("he") or "", rec.get("stt_text") or ""
    hl, sl = letters(he), letters(stt)
    words = [w for w in NIKKUD.sub("", he).split() if re.search(r"[\u05d0-\u05ea]", w)]
    if "..." in he or "…" in he:
        return "ellipsis-or-truncated"
    # gender/number near-misses (אחד/אחת, הוא/היא, endings ך/ךְ)
    if hl and sl and hl != sl and (hl[:-1] == sl[:-1] or hl.replace("ה","") == sl.replace("ה","")):
        if len(hl) <= 6:
            return "short-near-miss"
    if len(words) <= 1:
        return "short-word-stt"
    if rec.get("letter_wer") is not None and rec.get("letter_wer") <= 0.35:
        return "mild-stt"
    return "multi-word-stt"

TITLES = {
    "translation": "Gloss or reverse-translation mismatch (fix from the existing source)",
    "not-tested": "Not yet Cloud-tested (run the tester; do not invent Hebrew)",
    "ellipsis-or-truncated": "Phrases with ellipses or a truncated TTS/STT loop",
    "short-near-miss": "Short near-misses (often gender or a final letter; source is usually already right)",
    "short-word-stt": "Short-word speech-loop misses (keep the sourced Hebrew and gloss unless a better existing source line is cited)",
    "mild-stt": "Mild STT letter errors; meaning already matches (keep the source)",
    "multi-word-stt": "Multi-word speech-loop misses (keep the source unless STT shows a pointing typo against the source file)",
    "blocked-name": "Held: divine Name was not sent to TTS",
}
FIXES = {
    "translation": "Compare the stored gloss to the phrasebook or lesson source and restore the source English. Do not invent a new gloss. After a restore, re-run the Cloud test on that item only.",
    "not-tested": "These rows were added after the last full Cloud run. Test them with the existing WaveNet → Vertex loop. Do not invent Hebrew to make a row pass.",
    "ellipsis-or-truncated": "If the source is a fill-in template (for example 'how do you say … in Hebrew?'), keep it. The speech loop often drops the dots. Leave the item sourced as-is; it can stay hidden from the live set until a human confirms the audio.",
    "short-near-miss": "Typical cases: אחד heard as אחת, or a missing final heh. If the source Hebrew is the intended word, keep it and leave the item out of the live set (the speech loop is the failure, not the curriculum).",
    "short-word-stt": "Do not change the Hebrew or the gloss on the basis of a failed short-word transcript. Pull the item from the live Practical set (already done via failing_keys) until a human listen-check says otherwise.",
    "mild-stt": "Keep the source. Optional: a human listen-check. Safe to leave hidden, or to mark passing if a reviewer confirms the clip.",
    "multi-word-stt": "First check the source file (phrasebook / lessons / dialogues) for a pointing typo. If the source is already correct, keep it and leave the item hidden. Do not rewrite the line.",
    "blocked-name": "Leave held. Never voice or respell the Name.",
}

def unique_fails(items, failing_keys=None):
    seen = set()
    out = []
    for rec in items:
        if rec.get("pass") or rec.get("blocked"):
            continue
        k = (rec.get("id"), rec.get("he"), rec.get("en"))
        if k in seen:
            continue
        seen.add(k)
        out.append(rec)
    return out

def write_grouped(items, counts=None, spent=None, dest=OUT):
    fails = unique_fails(items)
    groups = defaultdict(list)
    for rec in fails:
        groups[group_of(rec)].append(rec)
    order = [k for k in TITLES if groups[k]]
    lines = [
        "# Practical items that failed the Google Cloud test — grouped by cause",
        "",
        "You are Claude, working on Aleph (repo ALENZACODES/Al-Heb), lane C curriculum.",
        "Please propose exact fixes from Hebrew and English already in the item's source",
        "(`data/corpus/phrasebook.json`, `data/curriculum/lessons.json`, or `data/curriculum/dialogues.json`).",
        "Do not invent new Hebrew and treat it as verified. Do not voice or rewrite the divine Name.",
        "If the TTS/STT loop failed but the source Hebrew and gloss are already correct, say so and keep the source.",
        "Items we cannot fix stay out of the live Practical set (`failing_keys` in `gcloud-results.json`).",
        "",
        "Reply as `replies/PRACTICAL-FIXES-r1.md`.",
        "",
    ]
    if counts:
        lines.append(f"- Occurrences: pass {counts.get('pass')}, fail {counts.get('fail')}, blocked {counts.get('blocked_divine_name', 0)}.")
    lines.append(f"- Unique failing items below: {len(fails)}.")
    if spent is not None:
        lines.append(f"- Cloud spend so far: US${spent:.4f} of a US$15 cap.")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append("| Group | Count | Suggested action |")
    lines.append("|---|---:|---|")
    for g in order:
        lines.append(f"| {TITLES[g]} | {len(groups[g])} | {FIXES[g].split('.')[0]}. |")
    lines.append("")
    for g in order:
        recs = groups[g]
        lines += [f"## {TITLES[g]}", "", FIXES[g], ""]
        for rec in recs:
            lines += [
                f"### {rec.get('unitId')} / {rec.get('id')}",
                f"- Hebrew: {rec.get('he')}",
                f"- Gloss: {rec.get('en')}",
                f"- Source: {rec.get('source')}",
                f"- STT output: {rec.get('stt_text')}",
                f"- WER (nikkud stripped, word): {rec.get('wer')}",
                f"- Letter WER: {rec.get('letter_wer')}",
                f"- Translation HE→EN: {rec.get('he_to_en')}",
                f"- Reverse EN→HE: {rec.get('en_to_he')}",
                f"- Why it failed: {rec.get('reason')}",
                "",
            ]
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text("\n".join(lines) + "\n")
    return dest, {g: len(groups[g]) for g in order}

def main():
    d = json.loads(RESULTS.read_text())
    path, summary = write_grouped(d["items"], d.get("counts"), d.get("spent_usd"))
    print("wrote", path, summary)

if __name__ == "__main__":
    main()
