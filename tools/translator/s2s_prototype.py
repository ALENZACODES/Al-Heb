#!/usr/bin/env python3
"""Honest prototype of Gemini native-audio / TTS speech-to-speech for Hebrew.

This is behind the idea of a live 'keep my intonation' flag. It does not claim
Instant Custom Voice. Spend must stay well under $5.
"""
from __future__ import annotations

import base64, json, os, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tools.translator import pipeline, spend

OUT = Path("/workspace/shared/al-heb/overnight-2026-11-10/translator/s2s")
REPO = Path(__file__).resolve().parents[2]


def redact_status(r):
    return f"HTTP {r.status_code}"


def try_models(audio_b64, prompt, models):
    import httpx
    key = os.environ.get("GEMINI_API_KEY") or ""
    client = httpx.Client(timeout=90.0)
    results = []
    for model, cfg in models:
        body = {
            "contents": [{"parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": "audio/mp3", "data": audio_b64}},
            ]}],
            "generationConfig": cfg,
        }
        t0 = time.time()
        r = client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            params={"key": key},
            json=body,
        )
        rec = {"model": model, "status": r.status_code, "seconds": round(time.time() - t0, 2)}
        if r.status_code < 400:
            spend.charge("gemini", chars=800, detail=f"s2s {model}")
            data = r.json()
            parts = (((data.get("candidates") or [{}])[0].get("content") or {}).get("parts") or [])
            rec["text"] = "".join(p.get("text") or "" for p in parts)[:300]
            rec["has_inline_audio"] = any("inlineData" in p or "inline_data" in p for p in parts)
            # save audio if present
            for p in parts:
                blob = p.get("inlineData") or p.get("inline_data") or {}
                b64 = blob.get("data")
                mime = blob.get("mimeType") or blob.get("mime_type") or "audio/mpeg"
                if b64:
                    OUT.mkdir(parents=True, exist_ok=True)
                    raw = base64.b64decode(b64)
                    ext = "wav" if "wav" in mime or "pcm" in mime or "linear" in mime else "mp3"
                    path = OUT / f"{model.replace('/','-')}.{ext}"
                    path.write_bytes(raw)
                    rec["audio_path"] = str(path)
                    rec["audio_bytes"] = len(raw)
        else:
            rec["error"] = (r.text or "")[:180].replace(key, "[redacted]")
        results.append(rec)
        print(json.dumps({k: rec[k] for k in rec if k != "error"}) | ({"error": rec.get("error", "")[:120]}), flush=True)
    return results


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    # Short English source, ask for Hebrew speech with the same tone.
    audio, mime, voice = pipeline.tts(
        "Good morning, I'm so happy to see you!", "en", "female"
    )
    (OUT / "source-en.mp3").write_bytes(audio)
    b64 = base64.b64encode(audio).decode("ascii")
    prompt = (
        "This is an English utterance. Speak a natural Hebrew translation aloud, "
        "keeping the speaker's intonation, pacing and warmth if you can. "
        "If you cannot produce audio, return only the Hebrew text."
    )
    audio_cfg = {
        "temperature": 0.4,
        "responseModalities": ["AUDIO"],
        "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": "Kore"}}},
    }
    models = [
        ("gemini-2.5-flash-preview-tts", audio_cfg),
        ("gemini-3.1-flash-tts-preview", audio_cfg),
        ("gemini-3.8-flash-tts", audio_cfg),
        ("gemini-omni-flash-preview", {"temperature": 0.4, "responseModalities": ["AUDIO"]}),
        ("gemini-3.5-flash", {"temperature": 0.2}),  # text-only fallback
    ]
    started = spend.total()
    results = try_models(b64, prompt, models)
    verdict = {
        "spend_usd_delta": round(spend.total() - started, 5),
        "spend_usd_total": spend.total(),
        "source_voice": voice,
        "results": results,
        "verdict": "",
    }
    audio_hits = [r for r in results if r.get("has_inline_audio") or r.get("audio_path")]
    if audio_hits:
        verdict["verdict"] = (
            "The API returned audio from: " + ", ".join(r["model"] for r in audio_hits) + ". "
            "Listen to the files in the s2s folder. This is a model voice speaking a translation, "
            "not a clone of the input speaker. Intonation may follow the prompt in a general way; "
            "it is not the speaker's own voice, and it is weaker than ElevenLabs-style cloning. "
            "A Live speech-to-speech WebSocket (Gemini 3.5 Live Translate) was not opened here "
            "because that path is preview/allowlist and we would not spend the budget without a clear win."
        )
    else:
        verdict["verdict"] = (
            "No model returned native audio on this key in generateContent (they failed or replied with text only). "
            "Gemini 3.5 Live Translate, which Google says preserves intonation across 70+ languages including Hebrew, "
            "was not reachable as a simple API-key generateContent call. Chirp 3 Instant Custom Voice still does not "
            "support Hebrew. Honest verdict: we cannot yet keep the speaker's own voice in Hebrew on the keys we have; "
            "stock Chirp 3 HD (gender/pitch match) plus a possible Live Translate allowlist later are the real options."
        )
    (OUT / "VERDICT.md").write_text(
        "# Voice-keeping prototype — 10 November 2026\n\n" + verdict["verdict"] + "\n\n"
        f"Spend for this prototype: ${verdict['spend_usd_delta']:.4f} (total ledger ${verdict['spend_usd_total']:.4f}).\n\n"
        "```json\n" + json.dumps({k: v for k, v in verdict.items() if k != "results"}, indent=2) + "\n```\n"
    )
    (OUT / "results.json").write_text(json.dumps(verdict, indent=2, default=str))
    dest = REPO / "docs/review/S2S-PROTOTYPE-2026-11-10.md"
    dest.write_text((OUT / "VERDICT.md").read_text())
    print(verdict["verdict"])
    print("spend_delta", verdict["spend_usd_delta"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
