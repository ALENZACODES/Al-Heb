#!/usr/bin/env python3
"""Blind Vertex judge for the 150 free-form set and a random 300 from the 10k set."""
from __future__ import annotations

import argparse
import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ask_torah.answer import answer_question, verify_citation
from ask_torah.corpus import default_corpus
from ask_torah.divine import LATIN_NAME
from ask_torah.retrieve import Retriever
from ask_torah.spend import can_spend, remaining, total_usd
from ask_torah import vertex

EVAL = Path(__file__).resolve().parent
Q150 = EVAL / "questions-independent-150.jsonl"
Q10K = EVAL / "questions-10k.jsonl"
SESSION_STOP = 9.50  # keep this pass under $10
BATCH = 6
JUDGE_MODEL = "gemini-3.5-flash-lite"

SYS = """You are a careful, non-denominational scholar of the Hebrew Bible (the Torah / Five Books of Moses, and where needed the rest of Tanakh and later Jewish texts).
You are judging a Q&A system. You are not given any gold answers. Be strict but fair.

For each item you receive:
- the user's question (and any earlier turns)
- the system's verdict and explanation
- the verses it cited, with the real Hebrew and English of those verses from a verified edition (not invented)

Score each item:
- verdict_ok: is the verdict correct? Verdicts are: in_torah (the topic is in the written Torah), not_in_torah (not in the Five Books; may still appear later), tanakh_outside_torah (in the Tanakh but not the Torah), off_topic (not a Torah / Tanakh / Jewish-text question). Nuance is allowed: if the later name or doctrine is not in the Torah but a related command or mention is, a good answer may say so; the verdict should still be the most accurate of those four for what the user asked.
- verses_support: do the cited verses actually support the claim? Empty citations are acceptable only for a correct off-topic decline, or for a correct 'not in the Torah' answer that does not invent a quote. Citing a real but irrelevant verse is a fail.
- origin_ok: if the idea is not in the written Torah, does the answer correctly say so and, when a later origin is known (Mishnah, Talmud, later book of Tanakh, later custom), name it reasonably? If the topic is in the Torah, mark true when the Torah side is handled.
- name_ok: the four-letter Name must not be spelled out in Latin (Yahweh, Jehovah, YHWH, etc.). Writing ה׳ or "the LORD" or "God" is fine.
- ok: true only when all of the above that apply are true.
- reason: one short sentence.

Reply with JSON only: a list of objects with keys id, verdict_ok, verses_support, origin_ok, name_ok, ok, reason.
"""


def session_ok(estimate=0.02):
    if total_usd() + estimate >= SESSION_STOP:
        return False
    return can_spend(estimate)


def auto_flags(ans, corpus):
    invented = []
    mismatched = []
    for p in ans.get("passages") or []:
        vid = p.get("id")
        if not vid or not corpus.get(vid):
            invented.append(vid)
            continue
        if not verify_citation(corpus, vid, p.get("he") or "") and not verify_citation(corpus, vid, p.get("en") or ""):
            # display text may use ה׳ ; verify_citation allows that
            if not verify_citation(corpus, vid, None):
                invented.append(vid)
    blob = (ans.get("explanation") or "") + " " + (ans.get("verdict_text") or "")
    for p in ans.get("passages") or []:
        blob += " " + (p.get("en") or "") + " " + (p.get("he") or "")
    name_fail = bool(LATIN_NAME.search(blob))
    return invented, name_fail


def pack_item(row, ans, corpus):
    passages = []
    for p in ans.get("passages") or []:
        v = corpus.get(p.get("id") or "")
        passages.append({
            "id": p.get("id"),
            "ref": p.get("ref"),
            "he": (v.he if v else p.get("he")) or "",
            "en": (v.en if v else p.get("en")) or "",
        })
    later = [{"ref": x.get("ref"), "note": x.get("note")} for x in (ans.get("later_sources") or [])]
    return {
        "id": row["id"],
        "question": row["question"],
        "history": row.get("history") or [],
        "verdict": ans.get("verdict"),
        "verdict_text": ans.get("verdict_text"),
        "explanation": ans.get("explanation"),
        "passages": passages,
        "later_sources": later,
        "declined": bool(ans.get("declined")),
    }


def judge_batch(items):
    if not session_ok(0.05):
        return None, "spend-stop"
    payload = json.dumps(items, ensure_ascii=False)
    prompt = SYS + "\n\nItems:\n" + payload + "\n\nJSON list:"
    text = vertex._generate(prompt, model=JUDGE_MODEL, max_tokens=4096, temperature=0, note="independent-judge")
    if not text:
        return None, vertex.LAST_ERROR or "no-text"
    start, end = text.find("["), text.rfind("]")
    if start < 0 or end < 0:
        return None, "no-json"
    try:
        data = json.loads(text[start : end + 1])
    except json.JSONDecodeError as e:
        return None, f"json:{e}"
    return data, None


def summarize(rows):
    n = len(rows) or 1
    ok = sum(1 for r in rows if r.get("ok"))
    return {
        "n": len(rows),
        "correct": ok,
        "accuracy_pct": round(100.0 * ok / n, 3),
        "invented_citation_cases": sum(1 for r in rows if r.get("invented")),
        "name_fail_cases": sum(1 for r in rows if r.get("name_fail")),
        "verdict_ok_pct": round(100.0 * sum(1 for r in rows if r.get("verdict_ok")) / n, 3),
        "verses_support_pct": round(100.0 * sum(1 for r in rows if r.get("verses_support")) / n, 3),
        "origin_ok_pct": round(100.0 * sum(1 for r in rows if r.get("origin_ok")) / n, 3),
    }


def load_jsonl(path):
    return [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--set", choices=["freeform150", "sample300", "both"], default="both")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--outdir", type=Path, default=Path("/workspace/shared/al-heb/overnight-2026-11-10/ask-torah"))
    args = ap.parse_args()
    args.outdir.mkdir(parents=True, exist_ok=True)
    retr = Retriever(default_corpus())
    corpus = retr.corpus

    jobs = []
    if args.set in ("freeform150", "both"):
        rows = load_jsonl(Q150)
        jobs.append(("freeform150", rows))
    if args.set in ("sample300", "both"):
        pool = load_jsonl(Q10K)
        rng = random.Random(20261110)
        sample = rng.sample(pool, 300)
        jobs.append(("sample300", sample))

    all_out = {}
    for name, rows in jobs:
        if args.limit:
            rows = rows[: args.limit]
        print(f"answering {name} n={len(rows)} spend=${total_usd():.4f}", flush=True)
        packed = []
        autos = {}
        answers = {}
        for row in rows:
            ans = answer_question(row["question"], retriever=retr, history=row.get("history") or [])
            answers[row["id"]] = ans
            invented, name_fail = auto_flags(ans, corpus)
            autos[row["id"]] = {"invented": invented, "name_fail": name_fail}
            packed.append(pack_item(row, ans, corpus))

        judgements = {}
        for i in range(0, len(packed), BATCH):
            chunk = packed[i : i + BATCH]
            print(f"  judge {name} {i+1}-{i+len(chunk)} spend=${total_usd():.4f} remaining_session=${SESSION_STOP-total_usd():.4f}", flush=True)
            data, err = judge_batch(chunk)
            if data is None:
                print("  judge error", err, "retry once", flush=True)
                data, err = judge_batch(chunk)
            if data is None:
                for it in chunk:
                    judgements[it["id"]] = {"id": it["id"], "ok": False, "verdict_ok": False, "verses_support": False, "origin_ok": False, "name_ok": False, "reason": f"judge-error:{err}"}
                continue
            by = {str(d.get("id")): d for d in data if isinstance(d, dict)}
            for it in chunk:
                judgements[it["id"]] = by.get(it["id"]) or {"id": it["id"], "ok": False, "reason": "missing-from-judge"}

        results = []
        for row in rows:
            j = judgements.get(row["id"]) or {}
            auto = autos[row["id"]]
            ok = bool(j.get("ok")) and not auto["invented"] and not auto["name_fail"]
            results.append({
                "id": row["id"],
                "question": row["question"],
                "history": row.get("history") or [],
                "tags": row.get("tags"),
                "split": row.get("split"),
                "system_verdict": answers[row["id"]].get("verdict"),
                "cited": answers[row["id"]].get("cited_ids") or [],
                "invented": auto["invented"],
                "name_fail": auto["name_fail"],
                "verdict_ok": bool(j.get("verdict_ok")),
                "verses_support": bool(j.get("verses_support")),
                "origin_ok": bool(j.get("origin_ok")),
                "name_ok": bool(j.get("name_ok")) and not auto["name_fail"],
                "ok": ok,
                "reason": j.get("reason") or "",
            })
        summary = summarize(results)
        print(json.dumps(summary, indent=2), flush=True)
        outp = args.outdir / f"independent-{name}.json"
        outp.write_text(json.dumps({"summary": summary, "results": results, "spend_usd": total_usd()}, ensure_ascii=False, indent=2), encoding="utf-8")
        fails = [r for r in results if not r["ok"]]
        (args.outdir / f"independent-{name}-failures.json").write_text(json.dumps(fails, ensure_ascii=False, indent=2), encoding="utf-8")
        all_out[name] = {"summary": summary, "path": str(outp), "failures": len(fails)}
        print(f"wrote {outp} fails={len(fails)}", flush=True)

    (args.outdir / "independent-summary.json").write_text(json.dumps({"spend_usd": total_usd(), "sets": all_out}, indent=2), encoding="utf-8")
    print("DONE", json.dumps({"spend_usd": total_usd(), "sets": {k: v["summary"] for k, v in all_out.items()}}, indent=2))


if __name__ == "__main__":
    main()
