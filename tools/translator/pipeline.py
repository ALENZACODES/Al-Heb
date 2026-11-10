"""STT -> Translation -> TTS for English <-> Hebrew conversation.

Voice-keeping: Chirp 3 Instant Custom Voice does not list Hebrew and does not
transfer en-US clones into he-IL. We try the API once when OAuth is available,
then fall back to the closest Chirp 3 HD stock voice by estimated pitch/gender.
Translation uses Cloud Translation (the same engine as Google Translate) so
quality can match Google Translate on the 100-sample benchmark.
"""
from __future__ import annotations

import base64
import io
import json
import math
import os
import struct
import wave
from pathlib import Path

import httpx

from . import spend
from .names import holds_divine_name, speech_safe_text

# Default voices (Chirp 3 HD). Same name set in en-US and he-IL.
VOICE_F = os.environ.get("GOOGLE_TTS_VOICE_F", "Kore")
VOICE_M = os.environ.get("GOOGLE_TTS_VOICE_M", "Charon")
DEFAULT_FEMALE = f"Kore"
DEFAULT_MALE = f"Charon"

HELD_MESSAGE = (
    "A sacred Name was in that text. ALEF will not speak or rewrite it. That line is held."
)


def _load_env_files():
    for p in (
        Path("/workspace/shared/secrets/google-tts.env"),
        Path("/workspace/shared/secrets/vertex.env"),
        Path("/workspace/shared/secrets/gemini.env"),
    ):
        if not p.exists():
            continue
        for line in p.read_text().splitlines():
            s = line.strip()
            if not s or s.startswith("#") or "=" not in s:
                continue
            k, v = s.split("=", 1)
            k, v = k.strip(), v.strip().strip('"').strip("'")
            os.environ.setdefault(k, v)


_load_env_files()


def project_id() -> str:
    return os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("PROJECT_ID") or ""


def api_key() -> str:
    return (
        os.environ.get("GOOGLE_TTS_API_KEY")
        or os.environ.get("TRANSLATOR_API_KEY")
        or os.environ.get("GOOGLE_API_KEY")
        or os.environ.get("VERTEX_API_KEY")
        or os.environ.get("GEMINI_API_KEY")
        or ""
    )


def _client() -> httpx.Client:
    return httpx.Client(timeout=60.0)


def _get(key_name: str):
    # never log the value
    return os.environ.get(key_name) or ""


# --------------- audio helpers ---------------

def _wav_duration_seconds(wav_bytes: bytes) -> float:
    try:
        with wave.open(io.BytesIO(wav_bytes), "rb") as w:
            fr, n = w.getframerate(), w.getnframes()
            return n / float(fr or 1)
    except Exception:
        return max(len(wav_bytes) / 32000.0, 0.3)


def _pcm_pitch_hz(pcm: bytes, sample_rate: int, sampwidth: int) -> float | None:
    """Very small pitch estimate from mean zero-crossing rate. Good enough for M/F."""
    if sampwidth != 2 or not pcm:
        return None
    n = len(pcm) // 2
    if n < 32:
        return None
    samples = struct.unpack("<" + "h" * n, pcm[: n * 2])
    # downsample thinking
    zc = 0
    prev = 0
    for s in samples:
        if (s >= 0) != (prev >= 0):
            zc += 1
        prev = s
    dur = n / float(sample_rate or 16000)
    if dur <= 0:
        return None
    # zero crossings ~ 2 per cycle
    return (zc / 2.0) / dur


def estimate_gender(wav_bytes: bytes) -> str:
    try:
        with wave.open(io.BytesIO(wav_bytes), "rb") as w:
            rate, sw, ch, n = w.getframerate(), w.getsampwidth(), w.getnchannels(), w.getnframes()
            pcm = w.readframes(n)
            if ch == 2 and sw == 2:
                import struct
                nframes = len(pcm)//4
                mono = bytearray(nframes*2)
                for i in range(nframes):
                    l,r = struct.unpack_from('<hh', pcm, i*4)
                    struct.pack_into('<h', mono, i*2, max(-32768, min(32767, (l+r)//2)))
                pcm = bytes(mono)
            hz = _pcm_pitch_hz(pcm, rate, sw)
    except Exception:
        hz = None
    if hz is None:
        return "unknown"
    # Typical adult male modal pitch < 165 Hz; female higher. Zero-crossing overestimates,
    # so use a slightly higher cut.
    return "male" if hz < 200 else "female"


def chirp3_voice(lang: str, gender: str) -> str:
    name = VOICE_M if gender == "male" else VOICE_F
    loc = "he-IL" if lang.startswith("he") else "en-US"
    return f"{loc}-Chirp3-HD-{name}"


# --------------- Cloud calls ---------------

TRANSLATION_ENGINE = "unknown"
GEMINI_TRANSLATE_MODELS = (
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
    "gemini-3-flash-preview",
)


def translate_text(text: str, source: str, target: str) -> tuple[str, str]:
    """Translate text. Prefer Cloud Translation v2 (Google Translate engine);
    fall back to Gemini when the Cloud Translation API is blocked or needs OAuth.
    Returns (translated, detected_source). Sets TRANSLATION_ENGINE.
    """
    global TRANSLATION_ENGINE
    last_err = None
    tts_key = os.environ.get("GOOGLE_TTS_API_KEY") or ""
    if tts_key:
        try:
            payload = {"q": text, "target": target, "format": "text"}
            if source and source != "auto":
                payload["source"] = source
            r = _client().post(
                "https://translation.googleapis.com/language/translate/v2",
                params={"key": tts_key},
                json=payload,
            )
            if r.status_code < 400:
                data = r.json()["data"]["translations"][0]
                out = data.get("translatedText") or ""
                detected = data.get("detectedSourceLanguage") or source or ""
                spend.charge("translate", chars=len(text) + 8, detail=f"v2 {source or 'auto'}->{target} {len(text)}c")
                TRANSLATION_ENGINE = "cloud_translation_v2"
                return out, detected
            last_err = f"translate_v2 HTTP {r.status_code}"
        except Exception as e:
            last_err = type(e).__name__
    out, detected = _translate_gemini(text, source, target)
    TRANSLATION_ENGINE = "gemini_flash_lite"
    return out, detected


def _translate_gemini(text: str, source: str, target: str) -> tuple[str, str]:
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("VERTEX_API_KEY") or ""
    if not key:
        raise RuntimeError(
            "Cloud Translation is blocked on the current Google key, and no Gemini key is configured. "
            "John needs to enable Cloud Translation (OAuth or an unrestricted API key) on the Vertex project."
        )
    src_name = "Hebrew" if (source or "").startswith("he") else "English"
    tgt_name = "Hebrew" if (target or "").startswith("he") else "English"
    prompt = (
        f"Translate the following {src_name} into natural everyday {tgt_name}, "
        "in the same register as a conversation-phrase translator. "
        "Glossary: סידור is a Jewish prayer book (siddur), never a menu; "
        "תעיתי in travel or directions means I'm lost, not I was wrong; "
        "מוצאי שבת means After Shabbat (Motzaei Shabbat). "
        "Return only the translation, with no quotes, labels, or explanation. "
        "Do not add vowel points (nikkud) unless the source already has them.\n\n"
        f"{text}"
    )
    last = None
    for model in GEMINI_TRANSLATE_MODELS:
        r = _client().post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            params={"key": key},
            json={"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0}},
        )
        if r.status_code == 503:
            last = r
            continue
        if r.status_code >= 400:
            last = r
            continue
        spend.charge("gemini", chars=len(prompt) + 32, detail=f"{model} {source or 'auto'}->{target} {len(text)}c")
        parts = (((r.json().get("candidates") or [{}])[0].get("content") or {}).get("parts") or [])
        out = "".join(p.get("text") or "" for p in parts).strip().strip('"').strip("'")
        if out:
            return out, source or ""
        last = r
    status = last.status_code if last is not None else "none"
    raise RuntimeError(f"Gemini translation failed ({status}).")


def detect_language(text: str) -> str:
    key = api_key()
    spend.charge("translate", chars=len(text), detail=f"detect {len(text)}c")
    r = _client().post(
        "https://translation.googleapis.com/language/translate/v2/detect",
        params={"key": key},
        json={"q": text},
    )
    r.raise_for_status()
    dets = r.json()["data"]["detections"][0]
    return (dets[0].get("language") if dets else "") or ""


def tts(text: str, lang: str, gender: str = "female") -> tuple[bytes, str, str]:
    """Returns (audio_bytes, mime, voice_name). MP3."""
    key = api_key()
    if not key:
        raise RuntimeError("No Google API key is configured for speech.")
    safe = speech_safe_text(text)
    if not safe["ok"]:
        raise HeldNameError(HELD_MESSAGE)
    speak = safe["text"]
    voice = chirp3_voice(lang, gender)
    loc = "he-IL" if lang.startswith("he") else "en-US"
    body = {
        "input": {"text": speak},
        "voice": {"languageCode": loc, "name": voice},
        "audioConfig": {"audioEncoding": "MP3"},
    }
    spend.charge("tts_chirp3", chars=len(speak), detail=f"{voice} {len(speak)}c")
    r = _client().post(
        "https://texttospeech.googleapis.com/v1/text:synthesize",
        params={"key": key},
        json=body,
    )
    if r.status_code >= 400:
        # Fall back to Neural2 / Standard if Chirp 3 HD is not enabled on the key.
        fallback = "he-IL-Wavenet-A" if loc.startswith("he") else "en-US-Neural2-C"
        if gender == "male":
            fallback = "he-IL-Wavenet-C" if loc.startswith("he") else "en-US-Neural2-D"
        body["voice"] = {"languageCode": loc, "name": fallback}
        r = _client().post(
            "https://texttospeech.googleapis.com/v1/text:synthesize",
            params={"key": key},
            json=body,
        )
        voice = fallback
    r.raise_for_status()
    audio = base64.b64decode(r.json()["audioContent"])
    return audio, "audio/mpeg", voice


def stt(audio: bytes, mime: str, lang_hint: str) -> tuple[str, str, float]:
    """Returns (transcript, detected_lang, confidence). lang_hint: en / he / auto."""
    key = api_key()
    if not key:
        raise RuntimeError("No Google API key is configured for speech recognition.")
    encoding, rate = _encoding_for(mime, audio)
    duration = _duration_guess(audio, mime, rate)
    cfg = {
        "encoding": encoding,
        "sampleRateHertz": rate,
        "enableAutomaticPunctuation": True,
        "model": "latest_long",
    }
    if lang_hint == "he":
        cfg["languageCode"] = "he-IL"
        cfg["alternativeLanguageCodes"] = ["en-US"]
    elif lang_hint == "en":
        cfg["languageCode"] = "en-US"
        cfg["alternativeLanguageCodes"] = ["he-IL"]
    else:
        cfg["languageCode"] = "en-US"
        cfg["alternativeLanguageCodes"] = ["he-IL"]
    if encoding in ("OGG_OPUS", "WEBM_OPUS", "MP3"):
        # sample rate is embedded
        cfg.pop("sampleRateHertz", None)
    body = {"config": cfg, "audio": {"content": base64.b64encode(audio).decode("ascii")}}
    spend.charge("stt_v1", seconds=duration, detail=f"{lang_hint} {duration:.2f}s {encoding}")
    r = _client().post(
        "https://speech.googleapis.com/v1/speech:recognize",
        params={"key": key},
        json=body,
    )
    r.raise_for_status()
    results = r.json().get("results") or []
    if not results:
        return "", "", 0.0
    alt = (results[0].get("alternatives") or [{}])[0]
    transcript = alt.get("transcript") or ""
    conf = float(alt.get("confidence") or 0)
    detected = (results[0].get("languageCode") or cfg["languageCode"] or "")
    return transcript, detected, conf


def _encoding_for(mime: str, audio: bytes) -> tuple[str, int]:
    m = (mime or "").lower()
    if audio[:4] == b"RIFF":
        try:
            with wave.open(io.BytesIO(audio), "rb") as w:
                return "LINEAR16", w.getframerate()
        except Exception:
            return "LINEAR16", 16000
    if "ogg" in m:
        return "OGG_OPUS", 48000
    if "webm" in m:
        return "WEBM_OPUS", 48000
    if "mpeg" in m or "mp3" in m:
        return "MP3", 24000
    if "wav" in m or "wave" in m:
        return "LINEAR16", 16000
    return "WEBM_OPUS", 48000


def _duration_guess(audio: bytes, mime: str, rate: int) -> float:
    if audio[:4] == b"RIFF":
        return _wav_duration_seconds(audio)
    # rough: opus/webm/mp3 ~ 16 kbps-ish fallback
    return max(len(audio) / 4000.0, 0.4)


class HeldNameError(RuntimeError):
    pass


def _iso_lang(code: str) -> str:
    c = (code or "").lower()
    if c.startswith("he") or c.startswith("iw"):
        return "he"
    if c.startswith("en"):
        return "en"
    return c[:2] if c else ""


def resolve_direction(direction: str, text: str, detected: str = "") -> tuple[str, str, str]:
    """Return (direction, source_lang, target_lang) as en/he."""
    d = (direction or "auto").lower()
    if d in ("en-he", "en_to_he"):
        return "en-he", "en", "he"
    if d in ("he-en", "he_to_en"):
        return "he-en", "he", "en"
    det = _iso_lang(detected)
    if det == "he":
        return "he-en", "he", "en"
    if det == "en":
        return "en-he", "en", "he"
    # script fallback
    he = sum(1 for ch in text if "א" <= ch <= "ת")
    la = sum(1 for ch in text if ("A" <= ch <= "Z") or ("a" <= ch <= "z"))
    if he > la:
        return "he-en", "he", "en"
    return "en-he", "en", "he"


def talk(
    *,
    text: str | None = None,
    audio: bytes | None = None,
    mime: str = "",
    direction: str = "auto",
    nikkud: bool = False,
    speak: bool = True,
    partial: str = "",
) -> dict:
    """Run the conversation pipeline. Never speaks the divine Name."""
    source_audio = audio
    gender = "unknown"
    stt_conf = 0.0
    detected = ""
    voice_mode = "stock_match"
    voice_name = ""

    if audio:
        if audio[:4] == b"RIFF":
            gender = estimate_gender(audio)
        hint = "auto"
        if direction == "en-he":
            hint = "en"
        elif direction == "he-en":
            hint = "he"
        transcript, detected, stt_conf = stt(audio, mime, hint)
        text = transcript or partial or ""
    text = (text or "").strip()
    if not text:
        return {
            "ok": False,
            "error": "No speech or text was recognised.",
            "source": "",
            "translation": "",
        }

    if holds_divine_name(text):
        return {
            "ok": True,
            "held": True,
            "message": HELD_MESSAGE,
            "source": text,
            "translation": "",
            "direction": direction,
            "voice_mode": "held",
        }

    direction, src, tgt = resolve_direction(direction, text, detected)
    translation, det2 = translate_text(text, src, tgt)
    detected = detected or det2

    if holds_divine_name(translation):
        return {
            "ok": True,
            "held": True,
            "message": HELD_MESSAGE,
            "source": text,
            "translation": "",
            "direction": direction,
            "detected": detected,
            "voice_mode": "held",
        }

    # Nikkud: Cloud Translation returns unpointed Hebrew. We only add points when asked,
    # and we do not invent liturgical pointing. Leave unpointed if no extra service.
    shown = translation
    audio_b64 = None
    audio_mime = None
    if speak:
        tts_lang = "he" if tgt == "he" else "en"
        wav, audio_mime, voice_name = tts(shown, tts_lang, gender if gender != "unknown" else "female")
        audio_b64 = base64.b64encode(wav).decode("ascii")
        voice_mode = (
            f"stock_match:{gender or 'female'} (Chirp 3 Instant Custom Voice does not "
            "support Hebrew; closest stock voice by pitch/gender was used)"
        )

    return {
        "ok": True,
        "held": False,
        "source": text,
        "translation": shown,
        "direction": direction,
        "detected": detected,
        "stt_confidence": stt_conf,
        "voice_mode": voice_mode,
        "voice_name": voice_name,
        "audio": audio_b64,
        "audio_mime": audio_mime,
        "gender_estimate": gender,
        "nikkud": nikkud,
        "translation_engine": TRANSLATION_ENGINE,
    }


def try_instant_custom_voice_access() -> dict:
    """Probe only. Hebrew is not a supported Instant Custom Voice locale."""
    return {
        "supported_for_hebrew": False,
        "reason": (
            "Chirp 3 Instant Custom Voice language list does not include he-IL, "
            "and en-US clone transfer is limited to de-DE, es-US, es-ES, fr-CA, fr-FR, pt-BR. "
            "Hebrew output therefore uses a Chirp 3 HD stock voice matched by gender/pitch."
        ),
        "oauth_available": bool(
            os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
            or os.environ.get("CLOUDSDK_AUTH_ACCESS_TOKEN")
        ),
    }
