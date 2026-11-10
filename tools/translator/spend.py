"""Hard cap: US$100 total Google Cloud spend for this lane. Stop at $90."""
from __future__ import annotations
import json, os, threading, time
from datetime import datetime, timezone
from pathlib import Path

# Conservative 2026 list-price estimates (USD). Over-estimate rather than under.
RATES = {
    # Speech-to-Text v1 standard: $0.006 / 15s = $0.024/min. Chirp v2 often ~$0.016/min.
    "stt_chirp_per_min": 0.024,
    "stt_v1_per_min": 0.024,
    # Cloud Translation: $20 / million characters
    "translate_per_char": 20.0 / 1_000_000,
    # Chirp 3 HD TTS: treat as $30 / million characters
    "tts_chirp3_per_char": 30.0 / 1_000_000,
    # Vision TEXT_DETECTION: $1.50 / 1,000 images (first 1k/mo often free; we still log list price)
    "vision_per_image": 0.0015,
    # Gemini flash text (Vertex) rough
    "gemini_per_char": 0.10 / 1_000_000,
}

SOFT_STOP = float(os.environ.get("TRANSLATOR_SPEND_STOP", "90"))
HARD_CAP = float(os.environ.get("TRANSLATOR_SPEND_CAP", "100"))

SHARED_DIR = Path(os.environ.get(
    "TRANSLATOR_SPEND_DIR",
    "/workspace/shared/al-heb/overnight-2026-11-10/translator",
))
REPO_SPEND = Path(__file__).resolve().parent / "SPEND.md"
LEDGER = SHARED_DIR / "spend-ledger.json"

_lock = threading.Lock()


class SpendCapExceeded(RuntimeError):
    pass


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _load() -> dict:
    if LEDGER.exists():
        try:
            return json.loads(LEDGER.read_text())
        except Exception:
            pass
    return {"total_usd": 0.0, "calls": []}


def total() -> float:
    with _lock:
        return float(_load().get("total_usd") or 0)


def estimate(kind: str, *, seconds: float = 0, chars: int = 0, images: int = 0) -> float:
    if kind.startswith("stt"):
        rate = RATES["stt_chirp_per_min"] if "chirp" in kind else RATES["stt_v1_per_min"]
        return (max(seconds, 0) / 60.0) * rate
    if kind.startswith("translate"):
        return max(chars, 0) * RATES["translate_per_char"]
    if kind.startswith("tts"):
        return max(chars, 0) * RATES["tts_chirp3_per_char"]
    if kind.startswith("vision"):
        return max(images, 0) * RATES["vision_per_image"]
    if kind.startswith("gemini"):
        return max(chars, 0) * RATES["gemini_per_char"]
    return 0.0


def _write_markdown(data: dict) -> None:
    lines = [
        "# Translator Google Cloud spend",
        "",
        f"Updated (UTC): {data.get('updated') or _now()}",
        f"Total estimated USD: **${data['total_usd']:.4f}**",
        f"Soft stop: ${SOFT_STOP:.2f}. Hard cap: ${HARD_CAP:.2f}.",
        "Rates are conservative list-price estimates, not the invoice.",
        "",
        "| time (UTC) | kind | est. USD | detail |",
        "|---|---:|---:|---|",
    ]
    for c in data.get("calls") or []:
        detail = c.get("detail") or ""
        lines.append(f"| {c.get('ts','')} | {c.get('kind','')} | {c.get('usd',0):.5f} | {detail} |")
    body = "\n".join(lines) + "\n"
    SHARED_DIR.mkdir(parents=True, exist_ok=True)
    (SHARED_DIR / "SPEND.md").write_text(body)
    REPO_SPEND.write_text(body)


def log(kind: str, usd: float, detail: str = "") -> float:
    """Record a call. Raises SpendCapExceeded if the soft stop would be crossed."""
    if usd < 0:
        usd = 0.0
    with _lock:
        data = _load()
        new_total = float(data.get("total_usd") or 0) + usd
        if new_total >= SOFT_STOP:
            _write_markdown(data)
            raise SpendCapExceeded(
                f"Spend soft-stop ${SOFT_STOP:.2f} would be crossed "
                f"(at ${new_total:.4f}). No further Google Cloud calls."
            )
        data["total_usd"] = new_total
        data["updated"] = _now()
        data.setdefault("calls", []).append({
            "ts": _now(), "kind": kind, "usd": usd, "detail": detail[:200],
        })
        SHARED_DIR.mkdir(parents=True, exist_ok=True)
        LEDGER.write_text(json.dumps(data, indent=2))
        _write_markdown(data)
        return new_total


def charge(kind: str, *, seconds: float = 0, chars: int = 0, images: int = 0, detail: str = "") -> float:
    usd = estimate(kind, seconds=seconds, chars=chars, images=images)
    return log(kind, usd, detail or kind)
