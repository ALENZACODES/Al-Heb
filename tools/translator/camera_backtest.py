#!/usr/bin/env python3
"""Backtest the camera translator on 24 synthetic Hebrew signs. Bar is 92/100."""
from __future__ import annotations

import json, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from tools.translator.camera import gemini_ocr, translate_regions, translate_image
from tools.translator.overlay import overlay_regions, save_jpeg
from tools.translator.score import cer, meaning_score
from tools.translator.signs import SIGNS, render_sign
from tools.translator import spend
from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[2]
OUT = Path("/workspace/shared/al-heb/overnight-2026-11-10/translator")
SHOTS = Path("/workspace/shared/al-heb/overnight-2026-11-10/screenshots/camera")
SYN = OUT / "synth-signs"


def box_iou(a, b) -> float:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    ax2, ay2, bx2, by2 = ax + aw, ay + ah, bx + bw, by + bh
    ix1, iy1 = max(ax, bx), max(ay, by)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
    inter = iw * ih
    union = aw * ah + bw * bh - inter
    return inter / union if union else 0.0


def main():
    SYN.mkdir(parents=True, exist_ok=True)
    SHOTS.mkdir(parents=True, exist_ok=True)
    rows = []
    for spec in SIGNS:
        t0 = time.time()
        im, gold_box = render_sign(spec)
        src_path = SYN / f"{spec['id']}-original.jpg"
        save_jpeg(im, src_path)
        rec = {"id": spec["id"], "he": spec["he"], "en": spec["en"], "path": str(src_path)}
        try:
            regions = gemini_ocr(im)
            rec["ocr_regions"] = [{"text": r["text"], "box": r["box"]} for r in regions]
            # best text match by CER
            if not regions:
                rec["ocr_cer"] = 1.0
                rec["ocr_text"] = ""
            else:
                best = min(regions, key=lambda r: cer(spec["he"], r["text"]))
                rec["ocr_text"] = best["text"]
                rec["ocr_cer"] = round(cer(spec["he"], best["text"]), 4)
                rec["box_iou"] = round(box_iou(best["box"], gold_box), 3)
            regions = translate_regions(regions or [{"text": "", "box": gold_box}], direction="he-en")
            # translation of the best region
            if regions:
                best_tr = min(regions, key=lambda r: cer(spec["he"], r.get("text") or ""))
                tr = best_tr.get("translation") or ""
            else:
                tr = ""
            rec["translation"] = tr
            sc, why = meaning_score(tr, spec["en"])
            rec["translation_score"] = round(sc, 4)
            rec["match_why"] = why
            rec["latency_s"] = round(time.time() - t0, 3)
            rec["ok"] = rec.get("ocr_cer", 1) <= 0.15 and sc >= 0.92
            over = overlay_regions(im, regions, gold=False)
            save_jpeg(over, SYN / f"{spec['id']}-translated.jpg")
        except spend.SpendCapExceeded as e:
            rec["error"] = str(e)
            rec["ok"] = False
            rows.append(rec)
            break
        except Exception as e:
            rec["error"] = type(e).__name__
            rec["ok"] = False
        rows.append(rec)
        print(f"{spec['id']}: cer={rec.get('ocr_cer')} tr={rec.get('translation_score')} alef={rec.get('translation')} err={rec.get('error','')}", flush=True)

    scored = [r for r in rows if "ocr_cer" in r and "translation_score" in r]
    n = len(scored) or 1
    mean_ocr = 1 - (sum(r["ocr_cer"] for r in scored) / n)
    mean_tr = sum(r["translation_score"] for r in scored) / n
    overall = (mean_ocr + mean_tr) / 2 * 100
    summary = {
        "samples": len(rows),
        "scored": len(scored),
        "mean_ocr_accuracy_100": round(mean_ocr * 100, 2),
        "mean_translation_100": round(mean_tr * 100, 2),
        "overall_100": round(overall, 2),
        "pass_92": overall >= 92 and len(scored) >= 20,
        "spend_usd": spend.total(),
        "failures": [r["id"] for r in rows if not r.get("ok")],
    }

    # 3 before/after samples: optical, bakery, exit — also gold accent for bakery
    for sid, label in (("optical", "optical-store"), ("bakery", "bakery"), ("exit", "exit")):
        spec = next(s for s in SIGNS if s["id"] == sid)
        im, box = render_sign(spec)
        save_jpeg(im, SHOTS / f"{label}-before.jpg")
        # reuse translated if we already have regions from the run
        row = next((r for r in rows if r["id"] == sid), None)
        try:
            if row and row.get("ocr_regions"):
                regs = translate_regions([{"text": r["text"], "box": r["box"]} for r in row["ocr_regions"]])
            else:
                regs = translate_regions(gemini_ocr(im))
            after = overlay_regions(im, regs, gold=False)
            save_jpeg(after, SHOTS / f"{label}-after.jpg")
            if sid == "bakery":
                gold = overlay_regions(im, regs, gold=True)
                save_jpeg(gold, SHOTS / f"{label}-after-gold.jpg")
        except Exception as e:
            summary.setdefault("sample_errors", []).append(f"{sid}:{type(e).__name__}")

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "camera-backtest.json").write_text(json.dumps({"summary": summary, "rows": rows}, ensure_ascii=False, indent=2))
    md = [
        "# Camera sign translator backtest — 10 November 2026",
        "",
        f"- Signs scored: {summary['scored']} / {summary['samples']} (need 20+)",
        f"- OCR accuracy (1−CER): **{summary['mean_ocr_accuracy_100']:.1f}/100**",
        f"- Translation (meaning-aware): **{summary['mean_translation_100']:.1f}/100**",
        f"- Overall: **{summary['overall_100']:.1f}/100 — {'PASS' if summary['pass_92'] else 'FAIL'}** (bar is 92/100)",
        f"- OCR engine: Gemini vision (Cloud Vision is not enabled on the project; it was not turned on).",
        f"- Estimated spend after this run: **${summary['spend_usd']:.4f}**",
        "",
        "Before/after JPEGs (EXIF stripped) are in `/workspace/shared/al-heb/overnight-2026-11-10/screenshots/camera/`.",
        "",
        "| id | Hebrew | English ref | OCR CER | translation | ok |",
        "|---|---|---|---:|---:|---|",
    ]
    for r in rows:
        md.append(f"| {r.get('id')} | {r.get('he')} | {r.get('en')} | {r.get('ocr_cer','')} | {r.get('translation_score','')} {r.get('translation','')} | {r.get('ok','')} |")
    if summary["failures"]:
        md += ["", "## Failures", ""] + [f"- `{i}`" for i in summary["failures"]]
    text = "\n".join(md) + "\n"
    (OUT / "CAMERA-BACKTEST-2026-11-10.md").write_text(text)
    dest = REPO / "docs/review/CAMERA-BACKTEST-2026-11-10.md"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(text)
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    return 0 if summary["pass_92"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
