from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[3]
KNOWLEDGE = ROOT / "knowledge"
DEFAULT_CORPUS = REPO_ROOT / "data" / "corpus" / "torah"
SPEND_PATH = Path(
    os.environ.get(
        "ASK_TORAH_SPEND",
        "/workspace/shared/al-heb/overnight-2026-11-10/ask-torah/SPEND.md",
    )
)
SPEND_LEDGER = SPEND_PATH.with_suffix(".json")
VERTEX_ENV = Path(os.environ.get("ASK_TORAH_VERTEX_ENV", "/workspace/shared/secrets/vertex.env"))
# Lane cap is US$40; stop new paid calls at $36 so we cannot overshoot.
SPEND_STOP_USD = float(os.environ.get("ASK_TORAH_SPEND_STOP", "36"))
SPEND_CAP_USD = float(os.environ.get("ASK_TORAH_SPEND_CAP", "40"))
FLASH_MODEL = os.environ.get("ASK_TORAH_FLASH_MODEL", "gemini-3.5-flash-lite")
EMBED_MODEL = os.environ.get("ASK_TORAH_EMBED_MODEL", "text-embedding-004")
# Published Vertex list prices (USD / 1M tokens), used only for the spend ledger.
# Ledger rates for gemini-3.5-flash / flash-lite (USD / 1M tokens). Lite is cheaper;
# we book flash-lite at the flash list of $0.25 / $1.50 when noted as lite, else $1.50 / $9.00.
FLASH_RATES = {"in": 1.50, "out": 9.00}
FLASH_LITE_RATES = {"in": 0.25, "out": 1.50}
EMBED_RATE_PER_1K_CHARS = 0.000025
SEFARIA_BASE = "https://www.sefaria.org"
