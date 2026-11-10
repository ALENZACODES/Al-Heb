"""Optional Vertex Gemini / embeddings client. Never prints secrets. Logs spend."""
from __future__ import annotations

import json
import os
from pathlib import Path

from .config import EMBED_MODEL, EMBED_RATE_PER_1K_CHARS, FLASH_MODEL, FLASH_RATES, VERTEX_ENV
from .spend import can_spend, record, remaining


def _load_env() -> dict[str, str]:
    env = {}
    if VERTEX_ENV.exists():
        for line in VERTEX_ENV.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    # process env wins
    for k in ("GOOGLE_CLOUD_PROJECT", "PROJECT_ID", "VERTEX_API_KEY", "GOOGLE_CLOUD_LOCATION", "LOCATION"):
        if os.environ.get(k):
            env[k] = os.environ[k]
    return env


def configured() -> bool:
    env = _load_env()
    return bool(env.get("VERTEX_API_KEY") and (env.get("GOOGLE_CLOUD_PROJECT") or env.get("PROJECT_ID")))


def _generate(prompt: str, model: str | None = None, max_tokens: int = 1024, temperature: float = 0.1, note: str = "") -> str | None:
    if not configured() or not can_spend(0.02):
        return None
    env = _load_env()
    project = env.get("GOOGLE_CLOUD_PROJECT") or env.get("PROJECT_ID")
    key = env["VERTEX_API_KEY"]
    model = model or FLASH_MODEL
    url = f"https://aiplatform.googleapis.com/v1/projects/{project}/locations/global/publishers/google/models/{model}:generateContent"
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens, "thinkingConfig": {"thinkingBudget": 0}},
    }
    try:
        import urllib.request
        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json", "x-goog-api-key": key},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None
    text = "".join(p.get("text") or "" for p in (data.get("candidates") or [{}])[0].get("content", {}).get("parts") or [])
    usage = data.get("usageMetadata") or {}
    tin, tout = int(usage.get("promptTokenCount") or 0), int(usage.get("candidatesTokenCount") or 0)
    usd = tin * FLASH_RATES["in"] / 1e6 + tout * FLASH_RATES["out"] / 1e6
    record("generate", model, usd, tin, tout, note=note)
    return text.strip() or None


def explain_safe(question: str, verdict: str, verses, later, fallback: str) -> str | None:
    """The model may only explain retrieved passages. Server verifies every cited id."""
    if not verses and verdict == "off_topic":
        return None
    catalog = []
    for v in verses:
        catalog.append({"id": v.id, "ref": v.ref, "he": v.he, "en": v.en})
    prompt = (
        "You help a Torah question page. You may ONLY use the passages in the catalog. "
        "Do not invent a quote or a reference. Do not spell the four-letter Name; keep ה׳ in Hebrew and 'the LORD' or 'God' in English. "
        "Do not name any AI product. Be respectful and non-denominational. Note where traditions differ, briefly.\n"
        f"Question: {question}\n"
        f"Already-decided verdict: {verdict}\n"
        f"Passage catalog (JSON): {json.dumps(catalog, ensure_ascii=False)}\n"
        f"Later sources (names only): {json.dumps(later, ensure_ascii=False)}\n"
        "Write 2-5 short sentences of plain English explanation. End with a line CITE: id,id using only catalog ids.\n"
    )
    text = _generate(prompt, note="explain")
    if not text:
        return None
    # verify cites
    cite_line = ""
    for line in text.splitlines():
        if line.upper().startswith("CITE:"):
            cite_line = line.split(":", 1)[1]
    ids = [p.strip() for p in cite_line.replace(" ", "").split(",") if p.strip()]
    allowed = {v.id for v in verses}
    if any(i not in allowed for i in ids):
        return None
    body = "\n".join(line for line in text.splitlines() if not line.upper().startswith("CITE:")).strip()
    return body or None


def judge_batch(rows: list[dict], note: str = "judge") -> list[dict]:
    """LLM judge for borderline cases. Returns list of {id, ok, reason}."""
    if not rows or not can_spend(0.05):
        return []
    payload = json.dumps(rows, ensure_ascii=False)
    prompt = (
        "You are checking Torah Q&A answers. For each item, gold_refs are known-correct verse ids, "
        "gold_verdict is the correct verdict, and the answer cites cited_ids with a verdict.\n"
        "Mark ok true only if: the verdict matches gold_verdict, at least one cited id is in gold_refs "
        "or is an immediately neighbouring verse of a gold ref (same book and chapter, verse ±1), "
        "and no cited id looks invented. Off-topic gold must be declined.\n"
        f"Items JSON: {payload}\n"
        "Reply with JSON only: [{\"id\":...,\"ok\":true/false,\"reason\":\"...\"}]"
    )
    text = _generate(prompt, max_tokens=2048, temperature=0, note=note)
    if not text:
        return []
    try:
        start, end = text.find("["), text.rfind("]")
        return json.loads(text[start : end + 1])
    except Exception:
        return []
