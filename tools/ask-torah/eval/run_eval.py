#!/usr/bin/env python3
"""Run the Ask pipeline on the 10k set. Automatic checks first; optional LLM judge on misses."""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ask_torah.answer import answer_question  # noqa: E402
from ask_torah.corpus import default_corpus  # noqa: E402
from ask_torah.links import parse_id  # noqa: E402
from ask_torah.retrieve import Retriever  # noqa: E402

QPATH = Path(__file__).resolve().parent / "questions-10k.jsonl"


def equivalent(cited: str, gold: str) -> bool:
    if cited == gold:
        return True
    a, b = parse_id(cited), parse_id(gold)
    if not a or not b:
        return False
    if a[0] == b[0] and a[1] == b[1] and abs(a[2] - b[2]) <= 1:
        return True
    return False


def gold_overlap(cited: list[str], gold: list[str]) -> bool:
    if not gold:
        return True  # not-in-torah / off-topic may have empty gold; citation not required
    return any(equivalent(c, g) for c in cited for g in gold)


def invented(cited: list[str], corpus) -> list[str]:
    return [c for c in cited if corpus.get(c) is None]


def score_one(row: dict, ans: dict, corpus) -> dict:
    verdict_ok = ans.get("verdict") == row["verdict"]
    declined = bool(ans.get("declined"))
    if row["verdict"] == "off_topic":
        decline_ok = declined or ans.get("verdict") == "off_topic"
        cites_ok = not invented(ans.get("cited_ids") or [], corpus)
        overlap_ok = True
        # invented citations on a decline is a hard fail
        ok = bool(decline_ok and cites_ok and verdict_ok)
    else:
        decline_ok = not declined
        inv = invented(ans.get("cited_ids") or [], corpus)
        cites_ok = not inv
        need_cite = row["verdict"] == "in_torah" or bool(row.get("gold"))
        overlap_ok = gold_overlap(ans.get("cited_ids") or [], row.get("gold") or []) if need_cite else True
        if row["verdict"] in {"not_in_torah", "tanakh_outside_torah"} and not row.get("gold"):
            # correct verdict, no invented cites; later source is a plus but not required
            overlap_ok = True
        ok = bool(verdict_ok and decline_ok and cites_ok and overlap_ok)
    return {
        "id": row["id"],
        "ok": ok,
        "verdict_ok": verdict_ok,
        "overlap_ok": overlap_ok,
        "cites_ok": cites_ok,
        "decline_ok": decline_ok,
        "category": row.get("category"),
        "split": row.get("split"),
        "gold_verdict": row["verdict"],
        "got_verdict": ans.get("verdict"),
        "cited": ans.get("cited_ids") or [],
        "gold": row.get("gold") or [],
        "invented": invented(ans.get("cited_ids") or [], corpus),
        "question": row["question"],
    }


def load_questions(path: Path, split: str | None = None) -> list[dict]:
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        r = json.loads(line)
        if split and r.get("split") != split:
            continue
        rows.append(r)
    return rows


def summarize(results: list[dict]) -> dict:
    n = len(results) or 1
    invented_n = sum(1 for r in results if r["invented"])
    acc = 100.0 * sum(1 for r in results if r["ok"]) / n
    by_cat = defaultdict(list)
    for r in results:
        by_cat[r["category"]].append(r["ok"])
    return {
        "n": len(results),
        "accuracy_pct": round(acc, 3),
        "correct": sum(1 for r in results if r["ok"]),
        "invented_citation_cases": invented_n,
        "verdict_acc_pct": round(100.0 * sum(1 for r in results if r["verdict_ok"]) / n, 3),
        "overlap_acc_pct": round(100.0 * sum(1 for r in results if r["overlap_ok"]) / n, 3),
        "by_category": {c: round(100.0 * sum(v) / len(v), 3) for c, v in sorted(by_cat.items())},
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--split", choices=["tune", "test", "all"], default="all")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--out", type=Path, default=None)
    ap.add_argument("--failures", type=Path, default=None)
    args = ap.parse_args()
    split = None if args.split == "all" else args.split
    rows = load_questions(QPATH, split)
    if args.limit:
        rows = rows[: args.limit]
    retr = Retriever(default_corpus())
    corpus = retr.corpus
    results = []
    for i, row in enumerate(rows, 1):
        ans = answer_question(row["question"], retriever=retr, use_llm=False)
        results.append(score_one(row, ans, corpus))
        if i % 500 == 0:
            s = summarize(results)
            print(f"... {i}/{len(rows)} acc={s['accuracy_pct']}% invented={s['invented_citation_cases']}", flush=True)
    summary = summarize(results)
    print(json.dumps(summary, indent=2))
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps({"summary": summary, "results": results}, ensure_ascii=False, indent=2), encoding="utf-8")
    if args.failures:
        fails = [r for r in results if not r["ok"]]
        args.failures.write_text(json.dumps(fails, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"wrote {len(fails)} failures to {args.failures}")


if __name__ == "__main__":
    main()
