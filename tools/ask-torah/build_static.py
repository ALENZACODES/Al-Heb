"""Build the static Ask the Torah bank for the browser (no server on the learner's path).

Runs the vetted pipeline (answer_question, no model, exactly the path the 10k backtest and the independent judge scored) on every
question in eval/questions-10k.jsonl, deduplicates identical answers, and writes:

  data/ask/bank.json            {v, built, questions: [[question, answerId], ...], starters: [question, ...]}
  data/ask/answers/NN.json      {answerId: answer} in 32 shards (answerId is a short content hash; shard = int(id, 16) % 32)

Both are fetched only when #/ask opens (on-demand, never in the first-install precache). The Name stays as ה׳ (ask_torah/divine.py).
Usage (repo root):  PYTHONPATH=tools/ask-torah python3 tools/ask-torah/build_static.py
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from ask_torah.answer import answer_question  # noqa: E402
from ask_torah.retrieve import default_retriever  # noqa: E402
from ask_torah.divine import display_hebrew  # noqa: E402

REPO = HERE.parents[1]
OUT = REPO / "data" / "ask"
SHARDS = 32
# Starter questions shown on the empty screen: real bank questions, so each one has a vetted answer.
STARTERS = [
    "Is the Shema in the Torah?",
    "Where does the Torah talk about Shabbat?",
    "Is Hanukkah in the Torah?",
    "Where is the Priestly Blessing?",
    "What does the Torah say about kosher food?",
    "Who was Miriam?",
]
KEEP_P = ("ref", "he", "en", "href", "link_kind", "link_label", "parasha")
KEEP_L = ("ref", "text", "note", "href")


import re  # noqa: E402

# The four letters of the Name with any vowel or cantillation marks between them, anywhere in a word (also joined forms such as
# אליהוה, which display_hebrew leaves alone). Replaced by ה׳; letters before it are kept.
NAME_RE = re.compile("י[֑-ׇ]*ה[֑-ׇ]*ו[֑-ׇ]*ה[֑-ׇ]*")


def no_name(text: str) -> str:
    return NAME_RE.sub("ה׳", display_hebrew(text))


def clean(v):
    """Every string shown to a learner passes display_hebrew, so the Name is ה׳ even where a question quotes it."""
    if isinstance(v, str):
        return no_name(v)
    if isinstance(v, list):
        return [clean(x) for x in v]
    if isinstance(v, dict):
        return {k: clean(x) for k, x in v.items()}
    return v


def slim(a: dict) -> dict:
    a = clean(a)
    out = {"verdict": a.get("verdict"), "verdict_text": a.get("verdict_text", ""), "explanation": a.get("explanation", "")}
    if a.get("declined"):
        out["declined"] = True
    ps = [{k: p[k] for k in KEEP_P if p.get(k)} for p in a.get("passages") or []]
    ls = [{k: p[k] for k in KEEP_L if p.get(k)} for p in a.get("later_sources") or []]
    if ps:
        out["passages"] = ps
    if ls:
        out["later_sources"] = ls
    return out


def aid(ans: dict) -> str:
    return hashlib.sha1(json.dumps(ans, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()[:10]


def main() -> None:
    rows = [json.loads(line) for line in (HERE / "eval" / "questions-10k.jsonl").open(encoding="utf-8")]
    retr = default_retriever()
    answers: dict[str, dict] = {}
    questions: list[list[str]] = []
    seen_q: set[str] = set()
    for i, row in enumerate(rows):
        q = no_name(row["question"].strip())
        key = " ".join(q.lower().split())
        if key in seen_q:
            continue
        seen_q.add(key)
        ans = slim(answer_question(q, retriever=retr))
        if NAME_RE.search(json.dumps(ans, ensure_ascii=False)) or NAME_RE.search(q):
            raise SystemExit(f"the Name is spelled out in the answer to: {q}")
        a = aid(ans)
        answers[a] = ans
        questions.append([q, a])
        if i % 1000 == 0:
            print(f"{i} questions, {len(answers)} distinct answers", file=sys.stderr)
    bank_q = {" ".join(q.lower().split()) for q, _ in questions}
    missing = [s for s in STARTERS if " ".join(s.lower().split()) not in bank_q]
    for s in missing:  # a starter not in the 10k gets its vetted answer too (same pipeline), so the chip never fails
        ans = slim(answer_question(s, retriever=retr))
        a = aid(ans)
        answers[a] = ans
        questions.append([s, a])
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "answers").mkdir(exist_ok=True)
    # Topics: every concept and tradition item the pipeline knows, with the vetted answer to its plain question, so the browser can
    # answer "addam and ev — are they in chumash" by recognising the topic (after the same typo rewrites the pipeline uses).
    from ask_torah import rewrite
    know = HERE / "knowledge"
    concepts = json.loads((know / "concepts.json").read_text(encoding="utf-8"))["concepts"]
    tradition = json.loads((know / "tradition.json").read_text(encoding="utf-8"))["items"]
    topics, problems = [], []
    for kind, items in (("concept", concepts), ("tradition", tradition)):
        for it in items:
            terms = [no_name(t) for t in it.get("terms") or [] if t and len(t.strip()) >= 3]
            if not terms:
                continue
            q = f"Where is {terms[0]} in the Torah?" if kind == "concept" else f"Is {terms[0]} in the Torah?"
            raw = answer_question(q, retriever=retr)
            ans = slim(raw)
            ids = {p.get("id") for p in raw.get("passages") or []}
            if kind == "concept" and it.get("gold") and not ids & set(it["gold"]) and raw.get("verdict") == "in_torah":
                problems.append(f"concept {it['id']}: answer cites none of its gold verses")
            if kind == "tradition" and it.get("verdict") and raw.get("verdict") != it["verdict"]:
                problems.append(f"tradition {it['id']}: verdict {raw.get('verdict')} not {it['verdict']}")
            if NAME_RE.search(json.dumps(ans, ensure_ascii=False)):
                raise SystemExit(f"the Name is spelled out in topic {it['id']}")
            a = aid(ans)
            answers[a] = ans
            topics.append({"id": it["id"], "kind": kind, "terms": terms, "a": a})
    for pr in problems:
        print("topic skipped: " + pr, file=sys.stderr)
    bad = {pr.split(":")[0].split(" ", 1)[1] for pr in problems}
    topics = [t for t in topics if t["id"] not in bad]
    rw = {"typos": rewrite.TYPOS, "phrases": [[rx.pattern, repl] for rx, repl in rewrite.PHRASES]}
    (OUT / "topics.json").write_text(json.dumps({"v": 1, "rewrite": rw, "topics": topics}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    shards: list[dict] = [{} for _ in range(SHARDS)]
    for a, ans in answers.items():
        shards[int(a, 16) % SHARDS][a] = ans
    for n, sh in enumerate(shards):
        (OUT / "answers" / f"{n:02d}.json").write_text(json.dumps(sh, ensure_ascii=False, separators=(",", ":"), sort_keys=True), encoding="utf-8")
    bank = {"v": 1, "source": "tools/ask-torah/eval/questions-10k.jsonl (vetted pipeline, no model)", "shards": SHARDS,
            "questions": questions, "starters": STARTERS}
    (OUT / "bank.json").write_text(json.dumps(bank, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(questions)} questions, {len(answers)} distinct answers, {SHARDS} shards", file=sys.stderr)


if __name__ == "__main__":
    main()
