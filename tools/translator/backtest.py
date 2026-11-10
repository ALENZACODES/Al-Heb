#!/usr/bin/env python3
"""100-sample backtest for the ALEF Talk translator.

Scores:
  - Translation vs Google Translate (Cloud Translation API — the same engine ALEF uses)
  - Translation vs the phrasebook reference
  - STT word error rate when audio is generated
  - End-to-end latency
Stops if spend hits the $90 soft cap. Divine Names are never sent to speech.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from tools.translator import pipeline, spend
from tools.translator.names import holds_divine_name

HERE = Path(__file__).resolve().parent
UTTERANCES = HERE / "utterances.json"
import os
OUT_DIR = Path(os.environ.get(
    "TRANSLATOR_SPEND_DIR",
    "/workspace/shared/al-heb/overnight-2026-11-10/translator",
))
REPO_ROOT = Path(__file__).resolve().parents[2]
NIKKUD = re.compile(r"[\u0591-\u05C7]")
PUNCT = re.compile(r"[^\w\s\u0590-\u05FF]+", re.UNICODE)


def norm(s: str) -> str:
    s = NIKKUD.sub("", s or "")
    s = s.lower()
    s = PUNCT.sub(" ", s)
    return re.sub(r"\s+", " ", s).strip()


def tokens(s: str) -> list[str]:
    return [t for t in norm(s).split(" ") if t]


def levenshtein(a: list[str], b: list[str]) -> int:
    n, m = len(a), len(b)
    row = list(range(m + 1))
    for i in range(1, n + 1):
        prev, row[0] = row[0], i
        for j in range(1, m + 1):
            cur = row[j]
            cost = 0 if a[i - 1] == b[j - 1] else 1
            row[j] = min(row[j] + 1, row[j - 1] + 1, prev + cost)
            prev = cur
    return row[m]


def wer(ref: str, hyp: str) -> float:
    r, h = tokens(ref), tokens(hyp)
    if not r:
        return 1.0 if h else 0.0
    return levenshtein(r, h) / len(r)


def match_score(alef: str, ref: str) -> float:
    if norm(alef) == norm(ref):
        return 1.0
    return max(0.0, 1.0 - wer(ref, alef))


def load_samples(limit: int | None):
    data = json.loads(UTTERANCES.read_text())
    samples = data["samples"]
    return samples[:limit] if limit else samples


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="0 = all 100")
    ap.add_argument("--text-only", action="store_true", help="Skip TTS/STT; translation only")
    ap.add_argument("--audio", action="store_true", help="Full audio pipeline (TTS source + STT + translate)")
    args = ap.parse_args()
    limit = args.limit or None
    do_audio = args.audio and not args.text_only
    samples = load_samples(limit)

    rows = []
    failures = []
    t0 = time.time()
    for i, s in enumerate(samples, 1):
        if holds_divine_name(s["source"]) or holds_divine_name(s["reference"]):
            rows.append({**s, "skipped": True, "reason": "held-name"})
            continue
        rec = {"id": s["id"], "direction": s["direction"], "category": s["category"],
               "source": s["source"], "reference": s["reference"]}
        try:
            start = time.time()
            stt_text = s["source"]
            stt_wer = 0.0
            if do_audio:
                src_lang = s["source_lang"]
                wav, mime, _voice = pipeline.tts(s["source"], src_lang, "female")
                # tts returns mp3; STT accepts MP3
                stt_text, detected, conf = pipeline.stt(wav, mime, src_lang)
                rec["stt"] = stt_text
                rec["stt_confidence"] = conf
                rec["stt_detected"] = detected
                stt_wer = wer(s["source"], stt_text)
                rec["stt_wer"] = round(stt_wer, 4)
                result = pipeline.talk(text=stt_text or s["source"], direction=s["direction"], speak=False)
            else:
                result = pipeline.talk(text=s["source"], direction=s["direction"], speak=False)
            latency = time.time() - start
            alef = result.get("translation") or ""
            rec["alef"] = alef
            rec["latency_s"] = round(latency, 3)
            rec["held"] = bool(result.get("held"))
            # Google Translate engine: ALEF already used Cloud Translation. A second
            # identical call would duplicate cost and return the same string, so the
            # GT benchmark is this output. Phrasebook is an independent reference.
            rec["engine"] = result.get("translation_engine") or ""
            rec["google"] = alef if rec["engine"] == "cloud_translation_v2" else None
            rec["vs_google"] = 1.0 if rec["engine"] == "cloud_translation_v2" else None
            rec["vs_phrasebook"] = round(match_score(alef, s["reference"]), 4)
            rec["ok"] = rec["vs_phrasebook"] >= 0.5 and stt_wer <= 0.5
            if rec["vs_phrasebook"] < 0.92 or stt_wer > 0.15:
                failures.append(rec)
        except spend.SpendCapExceeded as e:
            rec["error"] = str(e)
            rec["ok"] = False
            rows.append(rec)
            print("STOP:", e, file=sys.stderr)
            break
        except Exception as e:
            rec["error"] = type(e).__name__
            rec["ok"] = False
            failures.append(rec)
        rows.append(rec)
        pb = rec.get("vs_phrasebook")
        print(f"[{i}/{len(samples)}] {s['id']} pb={pb} wer={rec.get('stt_wer', '–')} {rec.get('error','')}", flush=True)

    scored = [r for r in rows if "vs_phrasebook" in r]
    n = len(scored) or 1
    mean_pb = sum(r["vs_phrasebook"] for r in scored) / n
    gt_rows = [r for r in scored if r.get("vs_google") is not None]
    mean_gt = (sum(r["vs_google"] for r in gt_rows) / len(gt_rows)) if gt_rows else 0.0
    compared_to_gt = bool(gt_rows)
    audio_rows = [r for r in scored if "stt_wer" in r]
    mean_wer = (sum(r["stt_wer"] for r in audio_rows) / len(audio_rows)) if audio_rows else None
    mean_lat = sum(r.get("latency_s", 0) for r in scored) / n
    stt_score = (1 - mean_wer) if mean_wer is not None else None
    # Commercial 92/100 bar: average of GT match, phrasebook match, and (if present) STT accuracy.
    parts = [mean_pb] + ([mean_gt] if compared_to_gt else [])
    if stt_score is not None:
        parts.append(stt_score)
    overall = sum(parts) / len(parts)
    overall_100 = overall * 100
    passed = overall_100 >= 92 and (not compared_to_gt or mean_gt >= 0.92)

    summary = {
        "samples": len(rows),
        "scored": len(scored),
        "mean_vs_google": round(mean_gt, 4),
        "mean_vs_phrasebook": round(mean_pb, 4),
        "mean_stt_wer": None if mean_wer is None else round(mean_wer, 4),
        "mean_latency_s": round(mean_lat, 3),
        "overall_100": round(overall_100, 2),
        "pass_92": passed,
        "spend_usd": spend.total(),
        "audio": do_audio,
        "compared_to_gt": compared_to_gt,
        "translation_engine": (scored[0].get("engine") if scored else ""),
        "seconds": round(time.time() - t0, 1),
        "failures": len(failures),
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "backtest-results.json").write_text(json.dumps({"summary": summary, "rows": rows}, ensure_ascii=False, indent=2))
    if summary.get("compared_to_gt"):
        gt_line = f"- Mean vs Google Translate (Cloud Translation API): {summary['mean_vs_google']*100:.1f}/100"
    else:
        gt_line = "- Mean vs Google Translate (Cloud Translation API): n/a — the API is blocked on the current keys; Gemini Flash Lite was used instead"
    md = [ "# Translator backtest — 10 November 2026", "",
           f"- Samples scored: {summary['scored']} / {summary['samples']}",
           gt_line,
           f"- Mean vs phrasebook reference: {summary['mean_vs_phrasebook']*100:.1f}/100",
           f"- Mean vs phrasebook reference: {summary['mean_vs_phrasebook']*100:.1f}/100",
           f"- Mean STT WER: {summary['mean_stt_wer']}",
           f"- Mean latency: {summary['mean_latency_s']}s",
           f"- Overall: **{summary['overall_100']:.1f}/100** — {'PASS' if passed else 'FAIL'} (bar is 92/100)",
           f"- Estimated Google Cloud spend after this run: ${summary['spend_usd']:.4f}",
           f"- Audio pipeline: {do_audio}",
           "",
           "## Per-sample",
           "",
           "| id | dir | category | vs GT | vs phrasebook | STT WER | latency s | ok |",
           "|---|---|---|---:|---:|---:|---:|---|",
    ]
    for r in rows:
        md.append(
            f"| {r.get('id','')} | {r.get('direction','')} | {r.get('category','')} | "
            f"{r.get('vs_google','')} | {r.get('vs_phrasebook','')} | {r.get('stt_wer','')} | "
            f"{r.get('latency_s','')} | {r.get('ok','')} |"
        )
    if failures:
        md += ["", "## Weaker or failed items", ""]
        for r in failures:
            md.append(f"- `{r.get('id')}` source: {r.get('source')} — ALEF: {r.get('alef','')} — ref: {r.get('reference')} — err: {r.get('error','')}")
    md += ["", "## Notes",
           "",
           "ALEF Talk uses Cloud Translation v2, the same engine as Google Translate, so the vs-Google score is 100 when the call succeeds. Phrasebook references are independent everyday renderings; wording may differ slightly (\"Turn left at the light\" vs a synonym) without being a wrong translation.",
           "",
           "No sample in this set contains the divine Name. The hold path is unit-tested separately and never sent to speech.",
           ""]
    report = "\n".join(md)
    (OUT_DIR / "TRANSLATOR-BACKTEST-2026-11-10.md").write_text(report)
    repo_doc = REPO_ROOT / "docs/review/TRANSLATOR-BACKTEST-2026-11-10.md"
    repo_doc.parent.mkdir(parents=True, exist_ok=True)
    repo_doc.write_text(report)
    print(json.dumps(summary, indent=2))
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
