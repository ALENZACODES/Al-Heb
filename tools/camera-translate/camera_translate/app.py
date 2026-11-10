"""Camera translator service (FastAPI).

  GET  /health            -> {ok, ocr, translate, storesPhotos:false}
  POST /translate-image   body = the photo's bytes (JPEG, PNG or WebP; Content-Type image/*), at most 10 MB
                          -> {width, height, regions:[...], image:"data:image/jpeg;base64,...", engines, notices}

Privacy rules this file keeps:
  * the photo is read from the request into memory, processed and dropped: no file, no database, no cache, no log line with image or text;
  * the upload is rebuilt from pixels before anything else touches it, and the returned photo is encoded fresh: no EXIF/GPS in or out;
  * responses carry Cache-Control: no-store.

Environment:
  CAMERA_OCR            vision | tesseract | auto (default auto: vision when Google credentials are set, else tesseract)
  CAMERA_TRANSLATE      google | word-list | auto (default auto: google when credentials are set, else the built-in word list)
  GOOGLE_APPLICATION_CREDENTIALS   path to a service-account key with Cloud Vision and Cloud Translation enabled
  ALLOWED_ORIGINS       comma-separated site origins allowed to call this service (loopback origins are always allowed)
  RATE_LIMIT_PER_MIN    photos per minute per client address (default 12)

Run:  uvicorn camera_translate.app:app --host 127.0.0.1 --port 8790     (from tools/camera-translate)
"""
from __future__ import annotations

import base64
import os
import time
from collections import defaultdict, deque

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from .hebrew import Glossary
from .intake import MAX_BYTES, IntakeError
from .ocr import GoogleVisionOCR, OCRError, TesseractOCR
from .pipeline import translate_photo
from .translate import ChainTranslator, GlossaryTranslator, GoogleTranslator

LOOPBACK_ORIGIN_RE = r'^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$'


def _has_google_credentials() -> bool:
    return bool(os.environ.get('GOOGLE_APPLICATION_CREDENTIALS') or os.environ.get('GOOGLE_CLOUD_PROJECT'))


def build_engines(env=os.environ):
    """-> (ocr, fallback_ocr, translator, glossary) from the environment."""
    glossary = Glossary.load()
    tess = TesseractOCR()
    want_ocr = env.get('CAMERA_OCR', 'auto').lower()
    use_vision = want_ocr == 'vision' or (want_ocr == 'auto' and _has_google_credentials())
    if use_vision:
        ocr, fallback = GoogleVisionOCR(), (tess if tess.available() else None)
    else:
        ocr, fallback = tess, None
    want_tr = env.get('CAMERA_TRANSLATE', 'auto').lower()
    words = GlossaryTranslator(glossary)
    use_google = want_tr == 'google' or (want_tr == 'auto' and _has_google_credentials())
    translator = ChainTranslator([GoogleTranslator(), words]) if use_google else ChainTranslator([words])
    return ocr, fallback, translator, glossary


class RateLimiter:
    def __init__(self, per_minute: int):
        self.per_minute = per_minute
        self.hits: dict[str, deque] = defaultdict(deque)

    def allow(self, key: str, now: float | None = None) -> bool:
        now = time.monotonic() if now is None else now
        q = self.hits[key]
        while q and now - q[0] > 60:
            q.popleft()
        if len(q) >= self.per_minute:
            return False
        q.append(now)
        if len(self.hits) > 5000:      # bound memory: forget idle clients
            for k in [k for k, v in self.hits.items() if not v or now - v[-1] > 60]:
                del self.hits[k]
        return True


def create_app(ocr=None, translator=None, glossary=None, fallback_ocr=None, allowed_origins=None, rate_per_min=None) -> FastAPI:
    if ocr is None or translator is None:
        e_ocr, e_fallback, e_tr, e_gl = build_engines()
        ocr, translator, glossary = ocr or e_ocr, translator or e_tr, glossary or e_gl
        fallback_ocr = fallback_ocr if fallback_ocr is not None else e_fallback
    glossary = glossary or Glossary.load()
    origins = allowed_origins if allowed_origins is not None else [o.strip() for o in os.environ.get('ALLOWED_ORIGINS', '').split(',') if o.strip()]
    limiter = RateLimiter(rate_per_min if rate_per_min is not None else int(os.environ.get('RATE_LIMIT_PER_MIN', '12')))

    app = FastAPI(title='Camera translator', docs_url=None, redoc_url=None, openapi_url=None)
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_origin_regex=LOOPBACK_ORIGIN_RE,
                       allow_methods=['GET', 'POST', 'OPTIONS'], allow_headers=['content-type'], max_age=600)

    @app.middleware('http')
    async def no_store(request: Request, call_next):
        response = await call_next(request)
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response

    @app.get('/health')
    def health():
        return {'ok': True, 'ocr': ocr.name, 'translate': translator.name, 'storesPhotos': False,
                'sendsPhotoToCloud': bool(getattr(ocr, 'sends_image_off_server', False)), 'maxBytes': MAX_BYTES}

    @app.post('/translate-image')
    async def translate_image(request: Request):
        client = request.client.host if request.client else 'unknown'
        if not limiter.allow(client):
            raise HTTPException(429, 'Too many photos in a short time. Please wait a minute.')
        declared = request.headers.get('content-length')
        if declared and declared.isdigit() and int(declared) > MAX_BYTES:
            raise HTTPException(413, 'The photo is larger than 10 MB.')
        chunks, size = [], 0
        async for chunk in request.stream():       # read into memory with a hard cap; never spooled to a temp file
            size += len(chunk)
            if size > MAX_BYTES:
                raise HTTPException(413, 'The photo is larger than 10 MB.')
            chunks.append(chunk)
        data = b''.join(chunks)
        del chunks
        try:
            result = await run_in_threadpool(translate_photo, data, ocr, translator, glossary, fallback_ocr)
        except IntakeError as exc:
            raise HTTPException(exc.status, str(exc))
        except OCRError:
            raise HTTPException(503, 'The text reader is not available right now.')
        finally:
            del data
        jpeg = result.pop('image_jpeg')
        result['image'] = 'data:image/jpeg;base64,' + base64.b64encode(jpeg).decode('ascii')
        result['storesPhotos'] = False
        return JSONResponse(result)

    return app


def __getattr__(name):
    # `uvicorn camera_translate.app:app` builds the app from the environment on first use (tests call create_app directly).
    if name == 'app':
        return create_app()
    raise AttributeError(name)
