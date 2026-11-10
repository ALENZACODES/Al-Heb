"""Ground truth for the static matcher: the vetted pipeline's answer to each of the 150 free-form questions (the set the
independent judge scored 100%). Writes eval/independent-150-truth.json: [{id, question, has_history, verdict, refs}]."""
import json, sys
from pathlib import Path
HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
from ask_torah.answer import answer_question  # noqa: E402
from ask_torah.retrieve import default_retriever  # noqa: E402
r = default_retriever()
out = []
for line in (HERE / "eval" / "questions-independent-150.jsonl").open(encoding="utf-8"):
    row = json.loads(line)
    a = answer_question(row["question"], retriever=r, history=row.get("history") or [])
    out.append({"id": row["id"], "question": row["question"], "has_history": bool(row.get("history")), "history": row.get("history") or [], "verdict": a.get("verdict"),
                "refs": [p.get("ref") for p in a.get("passages") or []]})
(HERE / "eval" / "independent-150-truth.json").write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding="utf-8")
print(len(out), "questions")
