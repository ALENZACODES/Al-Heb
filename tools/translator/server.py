"""FastAPI endpoints the ALEF Talk (and later Camera) screens call."""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Allow `python tools/translator/server.py` as well as package imports.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from tools.translator import pipeline, spend
from tools.translator.names import holds_divine_name

app = FastAPI(title="ALEF Talk translator", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("TRANSLATOR_CORS", "*").split(","),
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class TextIn(BaseModel):
    text: str = ""
    direction: str = "auto"
    nikkud: bool = False
    speak: bool = True
    voice_keep: bool = False


@app.get("/health")
@app.get("/v1/health")
def health():
    return {
        "ok": True,
        "service": "alef-talk",
        "has_api_key": bool(pipeline.api_key()),
        "project_set": bool(pipeline.project_id()),
        "spend_usd": spend.total(),
        "spend_stop": spend.SOFT_STOP,
        "voice": pipeline.try_instant_custom_voice_access(),
        "camera_ocr": "gemini_vision",
        "cloud_vision": False,
    }


@app.post("/v1/talk")
async def talk(
    text: str | None = Form(None),
    direction: str = Form("auto"),
    nikkud: str = Form("false"),
    speak: str = Form("true"),
    voice_keep: str = Form("false"),
    partial: str = Form(""),
    audio: UploadFile | None = File(None),
):
    # Also accept JSON when no multipart is sent.
    return await _talk_impl(
        text=text or "",
        direction=direction,
        nikkud=str(nikkud).lower() in ("1", "true", "yes"),
        speak=str(speak).lower() in ("1", "true", "yes"),
        voice_keep=str(voice_keep).lower() in ("1", "true", "yes"),
        partial=partial or "",
        audio=audio,
        json_body=None,
    )


@app.post("/v1/talk-json")
async def talk_json(body: TextIn):
    try:
        result = pipeline.talk(
            text=body.text, direction=body.direction, nikkud=body.nikkud, speak=body.speak, voice_keep=body.voice_keep
        )
    except spend.SpendCapExceeded as e:
        raise HTTPException(status_code=429, detail=str(e))
    except pipeline.HeldNameError as e:
        return JSONResponse({"ok": True, "held": True, "message": str(e), "source": body.text, "translation": ""})
    except Exception as e:
        raise HTTPException(status_code=502, detail="Translation failed.") from e
    return result


class TextIn2(BaseModel):
    text: str
    direction: str = "auto"
    nikkud: bool = False
    speak: bool = True


# Combined endpoint: JSON if content-type json, else form. Starlette already routed /v1/talk as form.
# Add a single handler via middleware-like alternative: accept JSON on /v1/talk too.
@app.api_route("/v1/translate-text", methods=["POST"])
async def translate_text_only(body: TextIn):
    if holds_divine_name(body.text):
        return {"ok": True, "held": True, "message": pipeline.HELD_MESSAGE, "source": body.text, "translation": ""}
    try:
        result = pipeline.talk(text=body.text, direction=body.direction, nikkud=body.nikkud, speak=False)
    except spend.SpendCapExceeded as e:
        raise HTTPException(status_code=429, detail=str(e))
    return result


async def _talk_impl(text, direction, nikkud, speak, partial, audio, json_body, voice_keep=False):
    audio_bytes = b""
    mime = ""
    if audio is not None:
        audio_bytes = await audio.read()
        mime = audio.content_type or ""
        if len(audio_bytes) > 10_000_000:
            raise HTTPException(status_code=413, detail="Audio is too large.")
    try:
        result = pipeline.talk(
            text=text or None,
            audio=audio_bytes or None,
            mime=mime,
            direction=direction,
            nikkud=nikkud,
            speak=speak,
            voice_keep=voice_keep,
            partial=partial or "",
        )
    except spend.SpendCapExceeded as e:
        raise HTTPException(status_code=429, detail=str(e))
    except pipeline.HeldNameError as e:
        return JSONResponse({"ok": True, "held": True, "message": str(e), "source": text, "translation": ""})
    except Exception:
        raise HTTPException(status_code=502, detail="Translation failed.")
    return result


# JSON on /v1/talk: register a raw handler by wrapping. FastAPI Form-only rejects JSON.
# We add an HTTP middleware to parse JSON when content-type is application/json.
from fastapi import Request

@app.middleware("http")
async def json_talk(request: Request, call_next):
    if request.url.path == "/v1/talk" and request.method == "POST":
        ctype = request.headers.get("content-type", "")
        if ctype.startswith("application/json"):
            try:
                body = await request.json()
            except Exception:
                return JSONResponse({"ok": False, "error": "Invalid JSON."}, status_code=400)
            try:
                result = pipeline.talk(
                    text=body.get("text") or "",
                    direction=body.get("direction") or "auto",
                    nikkud=bool(body.get("nikkud")),
                    speak=body.get("speak", True),
                    voice_keep=body.get("voice_keep", False),
                )
            except spend.SpendCapExceeded as e:
                return JSONResponse({"ok": False, "error": str(e)}, status_code=429)
            except Exception:
                return JSONResponse({"ok": False, "error": "Translation failed."}, status_code=502)
            return JSONResponse(result)
    return await call_next(request)



@app.post("/v1/camera")
async def camera(
    image: UploadFile = File(...),
    gold: str = Form("false"),
    direction: str = Form("he-en"),
):
    data = await image.read()
    if len(data) > 10_000_000:
        raise HTTPException(status_code=413, detail="That photo is too large.")
    try:
        from tools.translator.camera import load_image_bytes, translate_image
        im = load_image_bytes(data)
        result = translate_image(
            im,
            gold=str(gold).lower() in ("1", "true", "yes"),
            direction=direction or "he-en",
        )
    except spend.SpendCapExceeded as e:
        raise HTTPException(status_code=429, detail=str(e))
    except Exception:
        raise HTTPException(status_code=502, detail="Camera translation failed.")
    return result


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8080"))
    uvicorn.run("tools.translator.server:app", host="0.0.0.0", port=port, reload=False)
