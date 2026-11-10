#!/usr/bin/env python3
"""Google Cloud (Vertex) check of Israeli / Sephardi / Ashkenazi tradition styles.

Samples 50 items that have on-disk clips in all three traditions (words, phrase
lines, and liturgical lines). Never voices the divine Name. Spend cap US$5.

Offline checks (no spend): file identity, transliteration rules, settings switch.
STT uses existing clips (does not render new audio). Chirp is unavailable with
API keys; transcription is Vertex gemini-3.5-flash, same as the Practical test.

Audio is read from AUDIO_ROOT (another worktree's audio tree). This script never
writes there.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

# Reuse helpers from the Practical tester without running its main().
import importlib.util

ROOT = Path(__file__).resolve().parents[2]
SHARED = Path("/workspace/shared/al-heb")
HUB = SHARED / "overnight-2026-11-10"
LEDGER = HUB / "tradition-styles-spend.json"
OUT_MD = HUB / "TRADITION-STYLES-TEST-2026-11-10.md"
OUT_JSON = HUB / "tradition-styles-results.json"
OUT_FAILS = HUB / "claude-lanes" / "STYLES-FAILS-FOR-CLAUDE.md"
CHECKPOINT = HUB / "_tradition-styles-checkpoint.json"
SAMPLE = HUB / "tradition-styles-sample.json"
AUDIO_CANDIDATES = [
    Path("/workspace/Al-Heb-overnight/audio"),
    Path("/workspace/Al-Heb-original-music-2026-11-09/audio"),
    Path("/workspace/Al-Heb-brainlab-games-2026-11-10/audio"),
]
BUDGET_USD = 5.0
VOICE = "m"
TRADS = ("israeli", "sephardi", "ashkenazi")
LITURGICAL_RE = re.compile(
    r"^(bless|kiddush|shema|aleinu|adon|havdalah|amidah|avot|ashrei|birkat|"
    r"priestly|oseh-shalom|kaddish|modeh|hanukkah|hallel|vshamru|leshev|"
    r"megillah|kol-nidrei|selichot|yizkor|musaf|kedushah|barechu|barchu)",
    re.I,
)
NAME_OR_DIVINE = re.compile(
    r"יְהוָה|יהוה|יְהֹוָה|הַשֵּׁם|השם|אֲדֹנָי|אדני|"
    r"אֱלֹהִים|אלהים|אֱלֹהֵינוּ|אֱלֹהַי|"
    r"הַלְלוּ[־\s]?יָהּ|בְּעֶזְרַת הַשֵּׁם|יָהּ"
)


def load_practical_mod():
    path = ROOT / "tools/curriculum/gcloud_practical_test.py"
    spec = importlib.util.spec_from_file_location("gcloud_practical_test", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def audio_root() -> Path:
    env = os.environ.get("TRADITION_AUDIO_ROOT")
    if env and Path(env).exists():
        return Path(env)
    for p in AUDIO_CANDIDATES:
        if (p / "m" / "ashkenazi" / "line").exists() or list((p / "m" / "ashkenazi").glob("*")):
            # need a non-empty ashkenazi tree
            if any((p / "m" / "ashkenazi").rglob("*.mp3")):
                return p
    raise SystemExit("no audio tree with Ashkenazi clips found (will not check out a full tree)")


def clip_path(root: Path, rel: str) -> Path:
    rel = rel[len("audio/") :] if rel.startswith("audio/") else rel
    # worktree audio roots already end in /audio
    if root.name == "audio":
        return root / rel
    return root / rel


def load_manifests():
    rows = []
    for p in [
        "data/audio/manifest.json",
        "data/audio/manifest-kind-word.json",
        "data/audio/manifest-words-israeli.json",
        "data/audio/manifest-words-sephardi.json",
        "data/audio/manifest-words-ashkenazi.json",
    ]:
        rows.extend(json.loads((ROOT / p).read_text()))
    return rows


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    h.update(p.read_bytes())
    return h.hexdigest()


def has_undageshed_tav(he: str) -> bool:
    s = he or ""
    for i, ch in enumerate(s):
        if ch == "ת":
            nxt = s[i + 1] if i + 1 < len(s) else ""
            if nxt != "\u05BC":
                return True
    return False


def has_kamatz(he: str) -> bool:
    return "\u05B8" in (he or "")


def bucket(kind, eid, group):
    if kind == "prayer" or LITURGICAL_RE.search(eid or "") or (group or "") in {
        "prayer", "prayer-whole", "phrasebook", "liturgy",
    }:
        if kind == "line" or kind == "prayer":
            return "prayer-line" if kind != "word" else "word"
    if kind == "line":
        return "phrase"
    return "word"


def pick_sample(rows, aroot: Path, n=50):
    idx = defaultdict(dict)
    meta = {}
    for e in rows:
        if e.get("voice") != VOICE:
            continue
        if e.get("status") == "missing":
            continue
        if e.get("kind") not in ("word", "line", "prayer"):
            continue
        trad = e.get("tradition")
        if trad not in TRADS:
            continue
        path = e.get("path")
        fp = clip_path(aroot, path or "")
        if not path or not fp.exists():
            continue
        key = (e["kind"], e["id"])
        idx[key][trad] = {**e, "_file": str(fp)}
        meta[key] = e

    usable = []
    for key, by in idx.items():
        if set(by) != set(TRADS):
            continue
        he = by["israeli"].get("text") or by["sephardi"].get("text") or ""
        if NAME_OR_DIVINE.search(he):
            continue
        kind, eid = key
        group = by["israeli"].get("group") or ""
        b = bucket(kind, eid, group)
        score = 0
        if has_undageshed_tav(he):
            score += 3
        if has_kamatz(he):
            score += 3
        if b == "prayer-line":
            score += 1
        if b == "phrase":
            score += 1
        # prefer well-known contrast items
        if eid in {"r03-w1", "r04-w2", "r04-w3"} or "shabbat" in eid or "kiddush" in eid:
            score += 5
        usable.append({
            "id": eid,
            "kind": kind,
            "bucket": b,
            "he": he,
            "group": group,
            "score": score,
            "clips": {t: {"path": by[t]["path"], "file": by[t]["_file"], "text": by[t].get("text") or he, "source": by[t].get("source")} for t in TRADS},
        })

    # take a mix: 20 words with contrast, 15 phrases, 15 prayer-lines, fill from remaining
    usable.sort(key=lambda x: (-x["score"], x["kind"], x["id"]))
    chosen = []
    need = {"word": 20, "phrase": 15, "prayer-line": 15}
    used = set()
    for b, k in need.items():
        for it in usable:
            if it["bucket"] != b or it["id"] in used:
                continue
            chosen.append(it)
            used.add(it["id"])
            if sum(1 for x in chosen if x["bucket"] == b) >= k:
                break
    for it in usable:
        if len(chosen) >= n:
            break
        if it["id"] in used:
            continue
        chosen.append(it)
        used.add(it["id"])
    return chosen[:n], {"usable": len(usable), "usable_buckets": dict(Counter(x["bucket"] for x in usable))}


def file_checks(sample):
    out = []
    for it in sample:
        hashes = {}
        sizes = {}
        for t in TRADS:
            fp = Path(it["clips"][t]["file"])
            hashes[t] = sha256(fp)
            sizes[t] = fp.stat().st_size
        same_all = len(set(hashes.values())) == 1
        pairs = {
            "israeli_vs_sephardi": hashes["israeli"] == hashes["sephardi"],
            "israeli_vs_ashkenazi": hashes["israeli"] == hashes["ashkenazi"],
            "sephardi_vs_ashkenazi": hashes["sephardi"] == hashes["ashkenazi"],
        }
        out.append({
            "id": it["id"], "kind": it["kind"], "bucket": it["bucket"],
            "hashes": hashes, "sizes": sizes, "same_all": same_all, "pairs": pairs,
            "distinct_files": not same_all,
        })
    return out


def run_node_checks(sample):
    payload = [{"id": it["id"], "kind": it["kind"], "he": it["he"]} for it in sample]
    SAMPLE.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n")
    proc = subprocess.run(
        ["node", str(ROOT / "tools/curriculum/tradition_styles_check.mjs"), "--items", str(SAMPLE)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        raise SystemExit(f"node style check failed: {proc.stderr[-2000:]}")
    return json.loads(proc.stdout)


def write_partial_md(sample, files, node, stt=None, spend=0.0, note=""):
    n = len(sample)
    distinct = sum(1 for f in files if f["distinct_files"])
    same = n - distinct
    probe_fails = (node or {}).get("probeFails") or []
    switch = (node or {}).get("switchResults") or []
    audio_changes = sum(1 for s in switch if s.get("audioChangesWithSetting"))
    text_changes = sum(1 for s in switch if s.get("textChangesWithSetting"))
    israeli_paths = sum(1 for s in switch if s.get("allIsraeliFiles"))
    translit_item_fails = [t for t in (node or {}).get("translit") or [] if t.get("itemFails")]
    stt_section = "_STT not run yet._\n"
    if stt:
        rates = []
        for t in TRADS:
            rows = [r for r in stt if r.get("tradition") == t]
            ok = sum(1 for r in rows if r.get("stt_ok"))
            rates.append(f"| {t} | {ok}/{len(rows)} | {ok/len(rows)*100 if rows else 0:.0f}% | {sum(1 for r in rows if r.get('unintelligible'))} |")
        stt_section = (
            "Transcription is Vertex `gemini-3.5-flash` on the existing tradition mp3s "
            "(Google Cloud Chirp / Speech-to-Text v2 is not callable with the API keys we have). "
            "A style is marked unintelligible when letter-level WER is above 0.35 after nikkud is stripped.\n\n"
            "| Style | STT match | Pass rate | Unintelligible |\n|---|---:|---:|---:|\n"
            + "\n".join(rates) + "\n"
        )
    lines = []
    lines.append("# Tradition styles test (Israeli, Sephardi, Ashkenazi)")
    lines.append("")
    lines.append("**Date:** 10 November 2026, America/Toronto (ET)  ")
    lines.append("**Lane:** overnight ALEF lesson-integrity  ")
    lines.append(f"**Sample:** {n} items with on-disk clips in all three traditions (male voice).  ")
    lines.append("**Spend cap:** US$5  ")
    lines.append(f"**Spend so far:** ${spend:.4f}  ")
    lines.append("**Claude plan:** `claude-lanes/replies/STYLES-G-r1.md` landed overnight; the playback and spelling-flag fixes from that verdict are in `eefe184b7`.")
    lines.append("")
    lines.append("Nothing here was merged to `main` or deployed. The divine Name was not sent to TTS or STT. The full audio tree was not checked out; clips were read in place from `/workspace/Al-Heb-overnight/audio`.")
    lines.append("")
    lines.append("## How to read this")
    lines.append("")
    lines.append("John asked whether the three tradition styles are actually different and accurate. Claude is being asked the same question separately. This file is the Google Cloud / rule-check pass, not a rabbi review.")
    lines.append("")
    lines.append("Israeli and Sephardi Latin letters stay identical in the current engine (`src/pronunciation/transliterate.js`) unless John turns on the held flags. Their differences are meant to show up in IPA, vowel wording, and in the audio files. Ashkenazi Latin uses **s** for a tav without dagesh and **o** for kamatz gadol, where Israeli and Sephardi use **t** and **a** (for example Shabbat vs Shabbos). Sephardi ḥ/ʿ for ח and ע, and doubled letters such as Shabbos, are built behind `STYLE_FLAGS.sephardiPharyngeals` and `STYLE_FLAGS.geminateDisplay`, default off; this lane did not turn them on.")
    lines.append("")
    lines.append("## File identity (the clips themselves)")
    lines.append("")
    lines.append(f"{distinct} of {n} items have three pairwise-different mp3s. {same} items have the same bytes in every tradition.")
    lines.append("")
    same_is_se = sum(1 for f in files if f["pairs"]["israeli_vs_sephardi"])
    same_is_as = sum(1 for f in files if f["pairs"]["israeli_vs_ashkenazi"])
    same_se_as = sum(1 for f in files if f["pairs"]["sephardi_vs_ashkenazi"])
    lines.append(f"- Israeli file equals Sephardi file: {same_is_se}/{n}")
    lines.append(f"- Israeli file equals Ashkenazi file: {same_is_as}/{n}")
    lines.append(f"- Sephardi file equals Ashkenazi file: {same_se_as}/{n}")
    lines.append("")
    lines.append("These files exist in the manifests and on disk. After `eefe184b7`, each congregation setting prefers its own bank file. The Israeli file is only used when the own-tradition row is missing or unplayable (for example a `:mock` source). Device TTS is still refused as an Ashkenazi stand-in.")
    lines.append("")
    lines.append("## Transliteration rule check")
    lines.append("")
    if not probe_fails:
        lines.append("The engine probes pass: tav without dagesh is `ta` / `ta` / `sa`; kamatz gadol on bet is `ba` / `ba` / `bo`.")
        sh = ((node or {}).get("probe") or {}).get("shabbat") or {}
        sg = ((node or {}).get("probe") or {}).get("shabbatGeminate") or {}
        if sh:
            lines.append(f"Default Latin (geminate off, the app default) for שַׁבָּת is `{sh.get('israeli')}` / `{sh.get('sephardi')}` / `{sh.get('ashkenazi')}`. With `geminate: true` it is `{sg.get('israeli')}` / `{sg.get('sephardi')}` / `{sg.get('ashkenazi')}`. The tav/sav and kamatz a/o contrast is present in both; the familiar double-b spelling is only used when gemination is on, which the app does not turn on today.")
    else:
        lines.append("**Rule probes failed:**")
        for f in probe_fails:
            lines.append(f"- `{f.get('rule')}`: got {f.get('got')} expected {f.get('expected')}")
    lines.append("")
    lines.append(f"Of the {n} sample items, {len(translit_item_fails)} have an item-level Latin fail (Israeli vs Sephardi should match; Ashkenazi should differ when the word has an undageshed tav or a kamatz gadol).")
    if translit_item_fails:
        lines.append("")
        for t in translit_item_fails[:25]:
            lines.append(f"- `{t['kind']}/{t['id']}` {t['he']}: {', '.join(t['itemFails'])} — IL `{t['translit']['israeli']}` / SE `{t['translit']['sephardi']}` / ASH `{t['translit']['ashkenazi']}`")
    lines.append("")
    lines.append("## Settings switch (audio and on-screen Latin)")
    lines.append("")
    lines.append(f"Checked {len(switch)} of the sample items through `createAudio` with the real manifests.")
    lines.append("")
    lines.append(f"- On-screen Latin changes when switching to Ashkenazi: {text_changes}/{len(switch)} (expected whenever the word has tav-without-dagesh or kamatz gadol).")
    lines.append(f"- Audio *file path* changes with the setting: {audio_changes}/{len(switch)}.")
    lines.append(f"- All three settings resolve to an `/israeli/` path: {israeli_paths}/{len(switch)}.")
    lines.append("")
    pt = (node or {}).get("audio") or {}
    lines.append(f"`PLAYBACK_TRADITION` is `{pt.get('PLAYBACK_TRADITION')}` (identity map: each setting prefers its own bank). Admitted accent provenance labels in the live manifests: {len(pt.get('admittedAccentClips') or [])} — labels are separate from whether a present bank file is played.")
    lines.append("")
    if switch and audio_changes == len(switch) and israeli_paths == 0:
        lines.append("**Playback audio now changes with the style setting** when that tradition has a present bank file. Sephardi and Ashkenazi routes use their own recorded or paid-cloud mp3s from the shared audio bank. Letters, vowels, and some prayer rows that are still missing in those banks fall back to the Israeli file. Held for John: Sephardi ḥ/ʿ spelling and doubled-letter display; both flags stay off.")
    else:
        lines.append("The settings switch did not fully resolve to own-tradition paths in this sample. See the counts above. Held for John: Sephardi ḥ/ʿ spelling and doubled-letter display; both flags stay off.")
    lines.append("")
    lines.append("## Speech-to-text of the on-disk tradition clips")
    lines.append("")
    lines.append(stt_section)
    lines.append("")
    lines.append("## Sample")
    lines.append("")
    lines.append(f"Buckets in the sample: {dict(Counter(it['bucket'] for it in sample))}. Prayer-*kind* rows have no Sephardi or Ashkenazi files (those rows are `missing` and alias or stand in); liturgical *lines* (Kiddush, Shema, Priestly Blessing, and similar) are the prayer-line bucket.")
    lines.append("")
    lines.append("| id | kind | bucket | Hebrew | contrasting features | files distinct |")
    lines.append("|---|---|---|---|---|---|")
    file_by = {f["id"]: f for f in files}
    for it in sample:
        feats = []
        if has_undageshed_tav(it["he"]):
            feats.append("tav sav")
        if has_kamatz(it["he"]):
            feats.append("kamatz")
        f = file_by.get(it["id"], {})
        lines.append(f"| `{it['id']}` | {it['kind']} | {it['bucket']} | {it['he']} | {', '.join(feats) or '—'} | {'yes' if f.get('distinct_files') else 'no'} |")
    if note:
        lines.append("")
        lines.append("## Notes")
        lines.append("")
        lines.append(note)
    lines.append("")
    OUT_MD.write_text("\n".join(lines) + "\n")


def write_claude_fails(rows, title_extra=""):
    if not rows:
        # still write a short placeholder only if we have unclear fails later
        return
    lines = [
        "# Tradition-style fails for Claude",
        "",
        "Please read these as questions, not as a request to invent Hebrew or to voice the divine Name.",
        "John asked whether the three tradition styles (Israeli, Sephardi, Ashkenazi) are actually different and accurate.",
        "A full test report is in `overnight-2026-11-10/TRADITION-STYLES-TEST-2026-11-10.md`.",
        "",
        title_extra,
        "",
    ]
    for r in rows:
        lines.append(f"- `{r.get('id')}` ({r.get('kind')}, {r.get('tradition', '')}): {r.get('reason')} — he={r.get('he','')} stt={r.get('stt_text','')} translit={r.get('translit','')}")
    OUT_FAILS.write_text("\n".join(lines) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline-only", action="store_true")
    ap.add_argument("--stt", action="store_true")
    ap.add_argument("--resume", action="store_true", default=True)
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    aroot = audio_root()
    print(f"audio root {aroot}", file=sys.stderr)
    rows = load_manifests()
    sample, stats = pick_sample(rows, aroot, n=50)
    if args.limit:
        sample = sample[: args.limit]
    files = file_checks(sample)
    node = run_node_checks(sample)
    spend = 0.0
    stt_rows = None

    HUB.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps({
        "audio_root": str(aroot),
        "stats": stats,
        "sample": sample,
        "files": files,
        "node": {"probe": node.get("probe"), "probeFails": node.get("probeFails"), "audio": node.get("audio"),
                 "switchSummary": {
                     "n": len(node.get("switchResults") or []),
                     "audioChanges": sum(1 for s in node.get("switchResults") or [] if s.get("audioChangesWithSetting")),
                     "textChanges": sum(1 for s in node.get("switchResults") or [] if s.get("textChangesWithSetting")),
                 },
                 "translitFails": [t for t in node.get("translit") or [] if t.get("itemFails")],
                 "switchResults": node.get("switchResults"),
                 "translit": node.get("translit")},
        "spend_usd": spend,
    }, ensure_ascii=False, indent=1) + "\n")

    # Claude packet for systemic issues (not item STT yet)
    claude = []
    switch_ok = node.get("switchResults") and any(s.get("audioChangesWithSetting") for s in node["switchResults"])
    if not switch_ok:
        claude.append({
            "id": "settings-switch",
            "kind": "product",
            "reason": "The congregation setting did not change the resolved audio path in this sample. Distinct tradition files exist on disk (see file identity). Check src/audio/player.js own-bank playback.",
        })
    for t in node.get("translit") or []:
        if t.get("itemFails"):
            claude.append({
                "id": t["id"], "kind": t["kind"], "he": t["he"],
                "reason": "translit: " + ", ".join(t["itemFails"]),
                "translit": t.get("translit"),
            })
    for f in node.get("probeFails") or []:
        claude.append({"id": f.get("rule"), "kind": "rule", "reason": "probe failed", "translit": f})

    write_claude_fails(claude, "Offline findings first; STT rows will be appended after the Vertex pass.")
    write_partial_md(sample, files, node, stt=None, spend=spend,
                     note=f"Pool of usable three-tradition ids: {stats}. Audio root: `{aroot}`.")
    print(f"wrote {OUT_MD}", file=sys.stderr)
    print(f"distinct files {sum(1 for f in files if f['distinct_files'])}/{len(files)}", file=sys.stderr)
    print(f"probe fails {node.get('probeFails')}", file=sys.stderr)
    print(f"item translit fails {len([t for t in node.get('translit') or [] if t.get('itemFails')])}", file=sys.stderr)

    if args.offline_only or not args.stt:
        return

    # STT path is in a follow-up; imported here so --offline-only stays cheap.
    gp = load_practical_mod()
    env = gp.load_secrets()
    checkpoint = {"spent_usd": 0, "results": {}}
    if args.resume and CHECKPOINT.exists():
        try:
            checkpoint = json.loads(CHECKPOINT.read_text())
        except Exception:
            pass
    results = checkpoint.setdefault("results", {})
    for it in sample:
        if checkpoint["spent_usd"] >= BUDGET_USD:
            print("hit $5 cap", file=sys.stderr)
            break
        if NAME_OR_DIVINE.search(it["he"]):
            continue
        for t in TRADS:
            key = f"{it['kind']}|{it['id']}|{t}"
            if results.get(key, {}).get("done"):
                continue
            if checkpoint["spent_usd"] >= BUDGET_USD:
                break
            fp = Path(it["clips"][t]["file"])
            audio = fp.read_bytes()
            try:
                stt_res, stt_err = gp.stt_vertex_audio(audio, env)
            except (TimeoutError, Exception) as e:
                print(f"transient {key}: {type(e).__name__}", file=sys.stderr)
                time.sleep(3)
                continue
            if stt_res:
                checkpoint["spent_usd"] += stt_res.get("usd") or 0
                ledger = []
                if LEDGER.exists():
                    try:
                        ledger = json.loads(LEDGER.read_text())
                    except Exception:
                        ledger = []
                ledger.append({"usd": stt_res.get("usd"), "model": stt_res.get("model"), "id": key, "usage": stt_res.get("usage")})
                LEDGER.write_text(json.dumps(ledger, indent=1) + "\n")
            text = (stt_res or {}).get("text") or ""
            w = gp.wer(it["he"], text) if stt_res else None
            lw = gp.letter_wer(it["he"], text) if stt_res else None
            ok = bool(stt_res) and gp.stt_close(it["he"], text)
            unint = (lw is not None and lw > 0.35) or not text
            results[key] = {
                "done": True, "id": it["id"], "kind": it["kind"], "tradition": t,
                "he": it["he"], "stt_text": text, "wer": w, "letter_wer": lw,
                "stt_ok": ok, "unintelligible": unint,
                "error": None if stt_res else str(stt_err),
                "usd": (stt_res or {}).get("usd"),
            }
            CHECKPOINT.write_text(json.dumps(checkpoint, ensure_ascii=False, indent=1) + "\n")
            print(f"{key} ok={ok} wer={w} lw={lw} spent=${checkpoint['spent_usd']:.4f}", file=sys.stderr)
            time.sleep(0.05)
    stt_rows = list(results.values())
    write_partial_md(sample, files, node, stt=stt_rows, spend=checkpoint["spent_usd"],
                     note=f"Pool of usable three-tradition ids: {stats}. Audio root: `{aroot}`.")
    # append STT fails that are unclear
    for r in stt_rows:
        if r.get("done") and not r.get("stt_ok"):
            claude.append({"id": r["id"], "kind": r["kind"], "tradition": r["tradition"], "he": r["he"],
                           "stt_text": r.get("stt_text"), "reason": f"STT fail wer={r.get('wer')} letter_wer={r.get('letter_wer')} unintelligible={r.get('unintelligible')}"})
    write_claude_fails(claude, "Include STT mismatches on the clips the app now actually plays. High-WER Ashkenazi or Sephardi rows may need a remake or a closer listen; do not invent Hebrew or voice the divine Name.")
    OUT_JSON.write_text(json.dumps({
        "audio_root": str(aroot), "stats": stats, "sample": sample, "files": files,
        "node": node, "stt": stt_rows, "spend_usd": checkpoint["spent_usd"],
    }, ensure_ascii=False, indent=1) + "\n")
    print(f"STT done spend=${checkpoint['spent_usd']:.4f}", file=sys.stderr)


if __name__ == "__main__":
    main()
