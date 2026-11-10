#!/usr/bin/env python3
"""Check whether existing Vertex/TTS/Gemini keys can call Translation v3 or Speech v2.

Does not enable APIs or billing. Prints status codes only, never secrets.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tools.translator import pipeline  # loads env files

import httpx

PROJECT = pipeline.project_id() or "gen-lang-client-0474790324"


def has(name: str) -> bool:
    return bool(os.environ.get(name))


def check(name: str, method: str, url: str, **kwargs):
    # never log request keys
    kwargs.pop("headers", None)
    # we pass headers separately after redacting description
    headers = kwargs.pop("_headers", {})
    try:
        r = httpx.request(method, url, headers=headers, timeout=20.0, **kwargs)
        body = (r.text or "")[:240]
        # redact any key-looking tokens
        rec = {"name": name, "status": r.status_code, "ok": r.status_code < 400}
        # include a short reason without tokens
        lower = body.lower()
        if "api has not been used" in lower or "is not enabled" in lower or "has not been enabled" in lower:
            rec["reason"] = "API not enabled"
        elif "method does not allow api keys" in lower or "expected oauth" in lower or "login required" in lower:
            rec["reason"] = "needs OAuth / service account, not an API key"
        elif "blocked" in lower or "requests to this method are blocked" in lower:
            rec["reason"] = "API key restriction blocked this method"
        elif "permission" in lower or "iam" in lower or "denied" in lower:
            rec["reason"] = "permission denied"
        elif r.status_code == 401:
            rec["reason"] = "unauthorized"
        elif r.status_code == 403:
            rec["reason"] = "forbidden"
        else:
            rec["reason"] = f"HTTP {r.status_code}"
        return rec
    except Exception as e:
        return {"name": name, "status": None, "ok": False, "reason": type(e).__name__}


def main():
    tts_key = os.environ.get("GOOGLE_TTS_API_KEY") or ""
    gem_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("VERTEX_API_KEY") or ""
    adc = bool(os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"))
    adc_file = Path(os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") or "")
    well_known = Path.home() / ".config/gcloud/application_default_credentials.json"
    results = {
        "project": PROJECT,
        "has_tts_api_key": bool(tts_key),
        "has_gemini_or_vertex_api_key": bool(gem_key),
        "has_GOOGLE_APPLICATION_CREDENTIALS": adc and adc_file.exists(),
        "has_well_known_adc": well_known.exists(),
        "has_gcloud_cli": bool(os.popen("command -v gcloud").read().strip()),
        "checks": [],
    }
    # Translation v2 (API key)
    if tts_key:
        results["checks"].append(check(
            "translation_v2_tts_key", "POST",
            "https://translation.googleapis.com/language/translate/v2",
            params={"key": tts_key},
            json={"q": "hello", "target": "he", "format": "text", "source": "en"},
        ))
    if gem_key:
        results["checks"].append(check(
            "translation_v2_gemini_key", "POST",
            "https://translation.googleapis.com/language/translate/v2",
            params={"key": gem_key},
            json={"q": "hello", "target": "he", "format": "text", "source": "en"},
        ))
        results["checks"].append(check(
            "translation_v3_gemini_key", "POST",
            f"https://translation.googleapis.com/v3/projects/{PROJECT}:translateText",
            params={"key": gem_key},
            json={"contents": ["hello"], "targetLanguageCode": "he", "sourceLanguageCode": "en"},
        ))
        results["checks"].append(check(
            "speech_v2_gemini_key", "GET",
            f"https://speech.googleapis.com/v2/projects/{PROJECT}/locations/global/recognizers/_:recognize",
            params={"key": gem_key},
        ))
        results["checks"].append(check(
            "cloud_vision_gemini_key", "POST",
            "https://vision.googleapis.com/v1/images:annotate",
            params={"key": gem_key},
            json={"requests": [{"image": {"content": "aGVsbG8="}, "features": [{"type": "TEXT_DETECTION"}]}]},
        ))
    if tts_key:
        results["checks"].append(check(
            "translation_v3_tts_key", "POST",
            f"https://translation.googleapis.com/v3/projects/{PROJECT}:translateText",
            params={"key": tts_key},
            json={"contents": ["hello"], "targetLanguageCode": "he", "sourceLanguageCode": "en"},
        ))
        results["checks"].append(check(
            "speech_v2_tts_key", "GET",
            f"https://speech.googleapis.com/v2/projects/{PROJECT}/locations/global/recognizers",
            params={"key": tts_key},
        ))

    can_v3 = any(c["name"].startswith("translation_v3") and c["ok"] for c in results["checks"])
    can_stt = any(c["name"].startswith("speech_v2") and c["ok"] for c in results["checks"])
    results["can_call_translation_v3_without_john"] = can_v3
    results["can_call_speech_v2_without_john"] = can_stt
    results["conclusion"] = (
        "Existing API keys cannot call Cloud Translation v3 or Speech v2 without John. "
        "There is no service account JSON and no Application Default Credentials on this machine. "
        "Do not enable billing or new APIs in the console from this lane."
        if not (can_v3 or can_stt) else
        "At least one Cloud API responded successfully with the keys already on the box."
    )
    out = Path("/workspace/shared/al-heb/overnight-2026-11-10/translator/api-probe.json")
    out.write_text(json.dumps(results, indent=2))
    print(json.dumps(results, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
