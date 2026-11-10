from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path

from .config import SPEND_CAP_USD, SPEND_LEDGER, SPEND_PATH, SPEND_STOP_USD

_lock = threading.Lock()
ET = timezone.utc  # ledger stores UTC; the markdown line also shows America/Toronto.


def _ensure() -> None:
    SPEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not SPEND_LEDGER.exists():
        SPEND_LEDGER.write_text("[]", encoding="utf-8")
    if not SPEND_PATH.exists():
        SPEND_PATH.write_text(
            "# Ask Torah spend\n\nCap: US$40. Stop new paid calls at US$36.\n\n"
            "| when (America/Toronto) | kind | model | in | out | usd | note |\n"
            "|---|---|---|---:|---:|---:|---|\n",
            encoding="utf-8",
        )


def total_usd() -> float:
    _ensure()
    try:
        rows = json.loads(SPEND_LEDGER.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return 0.0
    return float(sum(r.get("usd", 0) for r in rows))


def can_spend(estimate: float = 0.0) -> bool:
    return (total_usd() + estimate) < SPEND_STOP_USD and total_usd() < SPEND_CAP_USD


def remaining() -> float:
    return max(0.0, SPEND_STOP_USD - total_usd())


def record(kind: str, model: str, usd: float, tokens_in: int = 0, tokens_out: int = 0, note: str = "") -> float:
    from zoneinfo import ZoneInfo

    _ensure()
    with _lock:
        rows = json.loads(SPEND_LEDGER.read_text(encoding="utf-8") or "[]")
        now = datetime.now(timezone.utc)
        toronto = now.astimezone(ZoneInfo("America/Toronto")).strftime("%Y-%m-%d %H:%M:%S ET")
        rec = {
            "at": now.isoformat(),
            "kind": kind,
            "model": model,
            "usd": round(float(usd), 8),
            "tokens_in": int(tokens_in),
            "tokens_out": int(tokens_out),
            "note": note,
        }
        rows.append(rec)
        SPEND_LEDGER.write_text(json.dumps(rows, indent=2), encoding="utf-8")
        with SPEND_PATH.open("a", encoding="utf-8") as f:
            f.write(
                f"| {toronto} | {kind} | {model} | {tokens_in} | {tokens_out} | {usd:.6f} | {note} |\n"
            )
        tot = float(sum(r.get("usd", 0) for r in rows))
        # rewrite header total
        text = SPEND_PATH.read_text(encoding="utf-8")
        line = f"_Running total: **US${tot:.4f}** of ${SPEND_CAP_USD:.0f} cap (stop at ${SPEND_STOP_USD:.0f})._\n"
        if "_Running total:" in text:
            import re
            text = re.sub(r"_Running total:.*\n", line, text, count=1)
        else:
            text = text.replace(
                "| when (America/Toronto) | kind | model | in | out | usd | note |\n",
                line + "\n| when (America/Toronto) | kind | model | in | out | usd | note |\n",
            )
        SPEND_PATH.write_text(text, encoding="utf-8")
        return tot
