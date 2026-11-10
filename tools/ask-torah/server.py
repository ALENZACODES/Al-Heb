#!/usr/bin/env python3
"""FastAPI service for Ask the Torah. Gradio is optional (see gradio_app.py)."""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from ask_torah.answer import answer_question
from ask_torah.retrieve import default_retriever
from ask_torah.spend import remaining, total_usd

app = FastAPI(title="Ask the Torah", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ASK_TORAH_CORS", "*").split(","),
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

_retriever = None


def retriever():
    global _retriever
    if _retriever is None:
        _retriever = default_retriever()
    return _retriever


class AskIn(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    use_llm: bool = False


@app.get("/health")
def health():
    return {"ok": True, "service": "ask-torah", "spend_remaining_usd": round(remaining(), 4), "spend_total_usd": round(total_usd(), 4)}


@app.post("/ask")
def ask(body: AskIn):
    try:
        return answer_question(body.question, retriever=retriever(), use_llm=body.use_llm)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail="Torah corpus is not available on this server.") from e


DEMO = """<!doctype html>
<html lang="en"><meta charset="utf-8"><title>Ask the Torah</title>
<body style="font-family:system-ui,sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem">
<h1>Ask the Torah</h1>
<p>Type a question about the Torah, the Tanakh, or Jewish texts. Answers quote real verses and lead you to the passage.</p>
<form id="f"><input id="q" style="width:70%" placeholder="Is the Shema in the Torah?" />
<button type="submit">Ask</button></form>
<pre id="out" style="white-space:pre-wrap"></pre>
<script>
f.onsubmit = async (e) => {
  e.preventDefault();
  out.textContent = "Looking up verses…";
  const r = await fetch("/ask", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({question: q.value})});
  const j = await r.json();
  let t = (j.verdict_text||"") + "\\n\\n" + (j.explanation||"");
  for (const p of (j.passages||[])) t += "\\n\\n" + p.ref + "\\n" + p.he + "\\n" + p.en + "\\n" + p.href;
  for (const p of (j.later_sources||[])) t += "\\n\\n" + p.ref + (p.note? " — "+p.note:"") + (p.href? "\\n"+p.href:"");
  out.textContent = t;
};
</script>
</body></html>
"""


@app.get("/", response_class=HTMLResponse)
@app.get("/demo", response_class=HTMLResponse)
def demo():
    return DEMO


def main():
    import uvicorn
    host = os.environ.get("ASK_TORAH_HOST", "127.0.0.1")
    port = int(os.environ.get("ASK_TORAH_PORT", "8787"))
    uvicorn.run("server:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
