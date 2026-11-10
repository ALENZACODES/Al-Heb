"""Camera sign translator: Gemini vision OCR + translation + Lens-style overlay."""
from __future__ import annotations

import base64
import io
import json
import os
import re
from pathlib import Path

import httpx
from PIL import Image

from . import pipeline, spend
from .names import holds_divine_name
from .overlay import overlay_regions, save_jpeg, strip_metadata

VISION_MODELS = (
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3-flash-preview",
    "gemini-3.5-flash",
)

OCR_PROMPT = """You are reading a photograph of a sign. Detect every line of text, especially Hebrew.
Return ONLY valid JSON with this shape:
{"regions":[{"text":"exact text as written","box":[x,y,width,height],"lang":"he or en"}]}
Coordinates are in pixels, origin at the top-left of the image, which is {w} pixels wide and {h} pixels tall.
Boxes must tightly cover the lettering. Do not translate. Do not add commentary.
"""


def _gemini_key() -> str:
    return os.environ.get("GEMINI_API_KEY") or os.environ.get("VERTEX_API_KEY") or ""


def _client() -> httpx.Client:
    return httpx.Client(timeout=90.0)


def _parts_text(resp: dict) -> str:
    cands = resp.get("candidates") or []
    if not cands:
        return ""
    parts = ((cands[0].get("content") or {}).get("parts") or [])
    return "".join(p.get("text") or "" for p in parts).strip()


def _parse_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.S)
        if m:
            return json.loads(m.group(0))
        raise


def gemini_ocr(im: Image.Image) -> list[dict]:
    """High-accuracy OCR via Gemini vision. Cloud Vision is not enabled on this project."""
    key = _gemini_key()
    if not key:
        raise RuntimeError("No Gemini key is configured for camera OCR.")
    im = strip_metadata(im.convert("RGB"))
    buf = io.BytesIO()
    im.save(buf, format="JPEG", quality=92)
    data = base64.b64encode(buf.getvalue()).decode("ascii")
    prompt = OCR_PROMPT.format(w=im.width, h=im.height)
    last = None
    payload = {
        "contents": [{"parts": [
            {"text": prompt},
            {"inline_data": {"mime_type": "image/jpeg", "data": data}},
        ]}],
        "generationConfig": {"temperature": 0, "responseMimeType": "application/json"},
    }
    for model in VISION_MODELS:
        r = pipeline._gemini_generate(model, key, payload)
        last = r
        if r.status_code >= 400:
            continue
        spend.charge("gemini", chars=len(prompt) + 400, detail=f"vision-ocr {model} {im.width}x{im.height}")
        payload = _parse_json(_parts_text(r.json()))
        regions = []
        for item in payload.get("regions") or []:
            box = item.get("box") or item.get("bbox") or []
            if len(box) != 4:
                continue
            x, y, w, h = [int(float(v)) for v in box]
            # accept [x1,y1,x2,y2] if it looks like corners
            if w > im.width and x < w:
                w, h = w - x, h - y
            x = max(0, min(im.width - 1, x))
            y = max(0, min(im.height - 1, y))
            w = max(1, min(im.width - x, w))
            h = max(1, min(im.height - y, h))
            text = str(item.get("text") or "").strip()
            if not text:
                continue
            regions.append({"text": text, "box": [x, y, w, h], "lang": item.get("lang") or ""})
        return regions
    status = last.status_code if last is not None else "none"
    raise RuntimeError(f"Gemini vision OCR failed ({status}).")


def translate_regions(regions: list[dict], *, direction: str = "he-en") -> list[dict]:
    out = []
    for r in regions:
        item = dict(r)
        text = r.get("text") or ""
        if holds_divine_name(text):
            item["held"] = True
            item["translation"] = ""
            item["message"] = pipeline.HELD_MESSAGE
            out.append(item)
            continue
        try:
            tr, _det = pipeline.translate_text(text, "he" if direction == "he-en" else "en", "en" if direction == "he-en" else "he")
        except Exception:
            tr = ""
            item["error"] = "translate-failed"
        item["translation"] = tr
        item["held"] = False
        out.append(item)
    return out


def translate_image(im: Image.Image, *, gold: bool = False, direction: str = "he-en") -> dict:
    """Full camera path. Does not store the photo. Metadata is stripped on every image."""
    im = strip_metadata(im.convert("RGB"))
    regions = translate_regions(gemini_ocr(im), direction=direction)
    over = overlay_regions(im, regions, gold=gold, show_original=False)
    orig_bytes = save_jpeg(im, None)
    over_bytes = save_jpeg(over, None)
    return {
        "ok": True,
        "regions": regions,
        "held_any": any(r.get("held") for r in regions),
        "style": "gold" if gold else "lens",
        "original_jpeg": base64.b64encode(orig_bytes).decode("ascii"),
        "translated_jpeg": base64.b64encode(over_bytes).decode("ascii"),
        "mime": "image/jpeg",
        "ocr_engine": "gemini_vision",
        "translation_engine": pipeline.TRANSLATION_ENGINE,
        "width": im.width,
        "height": im.height,
    }


def load_image_bytes(data: bytes) -> Image.Image:
    return strip_metadata(Image.open(io.BytesIO(data)).convert("RGB"))
