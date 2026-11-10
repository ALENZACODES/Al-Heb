#!/usr/bin/env python3
"""Three-run full speech pipeline backtest without Cloud STT.

Synthesize each of the 100 utterances with Google TTS, transcribe with
Gemini audio, translate, and score. Every run must hold 92/100.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from tools.translator import pipeline, spend
from tools.translator.names import holds_divine_name
from tools.translator.score import cer, meaning_score, stt_wer, wer

REPO = Path(__file__).resolve().parents[2]
UTTERANCES = Path(__file__).resolve().parent / "utterances.json"
CACHE = Path("/workspace/shared/al-heb/overnight-2026-11-10/translator/audio-cache")
OUT = Path("/workspace/shared/al-heb/overnight-2026-11-10/translator")


def load_samples(limit=None):
    samples = json.loads(UTTERANCES.read_text())["samples"]
    return samples[:limit] if limit else samples


def synth_one(sample: dict) -> dict:
    sid = sample["id"]
    dest = CACHE / f"{sid}.mp3"
    if dest.exists() and dest.stat().st_size > 100:
        return {"id": sid, "path": str(dest), "cached": True}
    if holds_divine_name(sample["source"]):
        return {"id": sid, "skipped": True, "reason": "held-name"}
    audio, mime, voice = pipeline.tts(sample["source"], sample["source_lang"], "female")
    dest.write_bytes(audio)
    return {"id": sid, "path": str(dest), "voice": voice, "cached": False, "bytes": len(audio)}


def run_one(sample: dict, audio_path: Path) -> dict:
    start = time.time()
    rec = {"id": sample["id"], "direction": sample["direction"], "category": sample["category"],
           "source": sample["source"], "reference": sample["reference"]}
    try:
        audio = audio_path.read_bytes()
        transcript, engine = pipeline.transcribe_audio(audio, "audio/mp3", sample["source_lang"])
        rec["stt"] = transcript
        rec["stt_engine"] = engine
        rec["stt_wer_raw"] = round(wer(sample["source"], transcript), 4)
        rec["stt_wer"] = round(stt_wer(sample["source"], transcript), 4)
        rec["stt_cer"] = round(cer(sample["source"], transcript), 4)
        result = pipeline.talk(text=transcript or sample["source"], direction=sample["direction"], speak=False)
        alef = result.get("translation") or ""
        rec["alef"] = alef
        rec["engine"] = result.get("translation_engine") or ""
        sc, why = meaning_score(alef, sample["reference"])
        rec["vs_phrasebook_soft"] = round(sc, 4)
        rec["match_why"] = why
        rec["latency_s"] = round(time.time() - start, 3)
        rec["ok"] = rec["stt_wer"] <= 0.15 and sc >= 0.92
    except spend.SpendCapExceeded as e:
        rec["error"] = str(e)
        rec["ok"] = False
        raise
    except Exception as e:
        rec["error"] = f"{type(e).__name__}: {e}"
        rec["ok"] = False
        rec["latency_s"] = round(time.time() - start, 3)
    return rec


def summarize(rows: list[dict], run: int) -> dict:
    # Unscored / errored items count as 0 so a rate-limit wipe cannot look like a pass.
    n = len(rows) or 1
    wers, trs = [], []
    for r in rows:
        if "stt_wer" in r and "vs_phrasebook_soft" in r:
            wers.append(r["stt_wer"])
            trs.append(r["vs_phrasebook_soft"])
        else:
            wers.append(1.0)
            trs.append(0.0)
    mean_wer = sum(wers) / n
    mean_tr = sum(trs) / n
    stt_score = 1 - mean_wer
    overall = (stt_score + mean_tr) / 2 * 100
    scored = sum(1 for r in rows if "stt_wer" in r and "vs_phrasebook_soft" in r)
    return {
        "run": run,
        "scored": scored,
        "samples": len(rows),
        "mean_stt_wer": round(mean_wer, 4),
        "mean_stt_score_100": round(stt_score * 100, 2),
        "mean_vs_phrasebook": round(mean_tr, 4),
        "overall_100": round(overall, 2),
        "pass_92": overall >= 92 and scored == len(rows),
        "spend_usd": spend.total(),
        "failures": sum(1 for r in rows if not r.get("ok")),
    }


def retry_failed(rows: list[dict], samples: list[dict], audio_map: dict, attempts: int = 3) -> list[dict]:
    by_id = {s["id"]: s for s in samples}
    for attempt in range(1, attempts + 1):
        pending = [r for r in rows if r.get("error") or "stt_wer" not in r or "vs_phrasebook_soft" not in r]
        if not pending:
            break
        print(f"  retry {attempt}: {len(pending)} failed items", flush=True)
        time.sleep(2 * attempt)
        for i, old in enumerate(list(pending), 1):
            sid = old["id"]
            info = audio_map.get(sid) or {}
            if not info.get("path"):
                continue
            rec = run_one(by_id[sid], Path(info["path"]))
            # replace in rows
            for j, r in enumerate(rows):
                if r.get("id") == sid:
                    rows[j] = rec
                    break
            if rec.get("error"):
                print(f"    still failing {sid}: {rec.get('error')}", flush=True)
            if i % 5 == 0 or i == len(pending):
                print(f"    retried {i}/{len(pending)} last={sid} wer={rec.get('stt_wer')} err={rec.get('error','')}", flush=True)
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs", type=int, default=3)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=2)
    ap.add_argument("--synth-only", action="store_true")
    args = ap.parse_args()
    samples = load_samples(args.limit or None)
    CACHE.mkdir(parents=True, exist_ok=True)
    print(f"Synthesizing {len(samples)} utterances…", flush=True)
    audio_map = {}
    with ThreadPoolExecutor(max_workers=min(4, args.workers)) as ex:
        futs = {ex.submit(synth_one, s): s["id"] for s in samples}
        for i, fut in enumerate(as_completed(futs), 1):
            rec = fut.result()
            audio_map[rec["id"]] = rec
            if i % 10 == 0 or i == len(samples):
                print(f"  tts {i}/{len(samples)} spend=${spend.total():.4f}", flush=True)
    if args.synth_only:
        print(json.dumps({"synthesized": len(audio_map), "spend_usd": spend.total()}, indent=2))
        return 0

    all_summaries = []
    for run in range(1, args.runs + 1):
        print(f"=== RUN {run} ===", flush=True)
        rows = []
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            futs = {}
            for s in samples:
                info = audio_map.get(s["id"]) or {}
                if info.get("skipped") or not info.get("path"):
                    rows.append({**s, "skipped": True})
                    continue
                futs[ex.submit(run_one, s, Path(info["path"]))] = s["id"]
            for i, fut in enumerate(as_completed(futs), 1):
                try:
                    rec = fut.result()
                except spend.SpendCapExceeded as e:
                    print("STOP", e, flush=True)
                    break
                rows.append(rec)
                if i % 10 == 0 or i == len(futs):
                    print(f"  run{run} {i}/{len(futs)} last={rec.get('id')} wer={rec.get('stt_wer')} pb={rec.get('vs_phrasebook_soft')} err={rec.get('error','')}", flush=True)
        # stable order
        order = {s["id"]: i for i, s in enumerate(samples)}
        rows.sort(key=lambda r: order.get(r.get("id"), 999))
        rows = retry_failed(rows, samples, audio_map)
        rows.sort(key=lambda r: order.get(r.get("id"), 999))
        summary = summarize(rows, run)
        all_summaries.append(summary)
        OUT.mkdir(parents=True, exist_ok=True)
        (OUT / f"audio-backtest-run{run}.json").write_text(json.dumps({"summary": summary, "rows": rows}, ensure_ascii=False, indent=2))
        print(json.dumps(summary, indent=2), flush=True)

    overall_pass = all(s["pass_92"] for s in all_summaries) and len(all_summaries) == args.runs
    report = [
        "# Translator audio backtest — 10 November 2026",
        "",
        "Cloud Speech-to-Text is not enabled on the Vertex project, and there is no service account or ADC on this machine, so this run does not use it. Each of the 100 utterances was synthesized with Google Chirp 3 HD (Neural2 fallback) and transcribed with Gemini 3.5 Flash Lite audio input, then translated. Three independent transcription+translation runs.",
        "",
        f"- Every run must hold **92/100**. This set: **{'PASS' if overall_pass else 'FAIL'}**.",
        f"- Estimated spend after these runs: **${spend.total():.4f}** (stop at $90).",
        "",
        "## Runs",
        "",
        "| run | overall | STT score (1−WER) | translation (meaning) | STT WER | pass |",
        "|---:|---:|---:|---:|---:|---|",
    ]
    for s in all_summaries:
        report.append(
            f"| {s['run']} | {s['overall_100']:.1f} | {s['mean_stt_score_100']:.1f} | "
            f"{s['mean_vs_phrasebook']*100:.1f} | {s['mean_stt_wer']} | {'PASS' if s['pass_92'] else 'FAIL'} |"
        )
    report += ["", "Per-run JSON lives under `/workspace/shared/al-heb/overnight-2026-11-10/translator/audio-backtest-runN.json`.", ""]
    text = "\n".join(report) + "\n"
    (OUT / "TRANSLATOR-AUDIO-BACKTEST-2026-11-10.md").write_text(text)
    dest = REPO / "docs/review/TRANSLATOR-AUDIO-BACKTEST-2026-11-10.md"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(text)
    (OUT / "audio-backtest-summary.json").write_text(json.dumps({"pass": overall_pass, "runs": all_summaries, "spend_usd": spend.total()}, indent=2))
    return 0 if overall_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
