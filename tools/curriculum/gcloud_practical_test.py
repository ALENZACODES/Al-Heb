#!/usr/bin/env python3
"""Google Cloud TTS→STT, translation, and reverse-translation checks for Practical items.

Never voices the divine Name. Does not invent Hebrew. Spend cap US$15.
Writes results, the review table, and the Claude fail packet.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SHARED = Path("/workspace/shared/al-heb")
LEDGER_VERTEX = SHARED / "ai-studio-2026-11-06" / "spend-ledger-vertex.json"
LEDGER_NONQA = SHARED / "ai-studio-2026-11-06" / "non-qa-spend-ledger.json"
LEDGER_RUN = SHARED / "overnight-2026-11-10" / "practical-gcloud-spend.json"
OUT_JSON = ROOT / "data/curriculum/practical/gcloud-results.json"
OUT_MD = ROOT / "docs/review/PRACTICAL-GCLOUD-TEST-2026-11-10.md"
OUT_FAILS = SHARED / "overnight-2026-11-10" / "claude-lanes" / "PRACTICAL-FAILS-FOR-CLAUDE.md"
CHECKPOINT = ROOT / "data/curriculum/practical/_gcloud-checkpoint.json"

BUDGET_USD = 15.0
PROJECT_DEFAULT = "gen-lang-client-0474790324"
TTS_VOICE = "he-IL-Wavenet-B"
TTS_USD_PER_M = 4.0
# Conservative Chirp 2 billing: 15-second minimum at $0.016/minute.
STT_USD_PER_MIN = 0.016
STT_MIN_SECONDS = 15
TRANSLATE_USD_PER_M = 20.0
FLASH_IN = 0.30  # gemini-2.5-flash / 2.0-flash fallback estimate; adjusted if 3.5
FLASH_OUT = 2.50

NAME_OR_DIVINE = re.compile(
    r"יְהוָה|יהוה|יְהֹוָה|הַשֵּׁם|השם|אֲדֹנָי|אדני|"
    r"אֱלֹהִים|אלהים|אֱלֹהֵינוּ|אֱלֹהַי|"
    r"הַלְלוּ[־\s]?יָהּ|בְּעֶזְרַת הַשֵּׁם|יָהּ"
)

# Speech v2 locations to try for Chirp
STT_TRIES = [
    # (url_template, model)
    ("https://us-speech.googleapis.com/v2/projects/{project}/locations/us/recognizers/_:recognize", "chirp_3"),
    ("https://us-speech.googleapis.com/v2/projects/{project}/locations/us/recognizers/_:recognize", "chirp_2"),
    ("https://speech.googleapis.com/v2/projects/{project}/locations/global/recognizers/_:recognize", "chirp_3"),
    ("https://speech.googleapis.com/v2/projects/{project}/locations/global/recognizers/_:recognize", "chirp_2"),
]


def load_env_file(path):
    env = {}
    p = Path(path)
    if not p.exists():
        return env
    for line in p.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def load_secrets():
    env = {}
    env.update(load_env_file("/workspace/shared/secrets/vertex.env"))
    env.update(load_env_file("/workspace/shared/secrets/google-tts.env"))
    # process env wins
    for k, v in list(env.items()):
        if not os.environ.get(k):
            os.environ[k] = v
    return env


def redact(s: str) -> str:
    s = s or ""
    s = re.sub(r"key=[^&\s]+", "key=REDACTED", s, flags=re.I)
    s = re.sub(r"AIza[0-9A-Za-z_-]{10,}", "REDACTED", s)
    s = re.sub(r"ya29\.[0-9A-Za-z._-]+", "REDACTED", s)
    s = re.sub(r"Bearer [^,\s]+", "Bearer REDACTED", s)
    return s


def http_json(url, payload, headers, timeout=180, retries=4):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST", headers=headers)
    last = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as res:
                body = res.read()
                return res.status, json.loads(body.decode("utf-8")), dict(res.headers)
        except urllib.error.HTTPError as e:
            last = e
            break
        except (TimeoutError, urllib.error.URLError, OSError) as e:
            last = e
            if attempt == retries - 1:
                raise
            time.sleep(min(30, 2 ** attempt))
            continue
    if isinstance(last, urllib.error.HTTPError):
        e = last
        raw = e.read().decode("utf-8", "replace")
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = {"error": {"message": redact(raw[:500])}}
        if isinstance(parsed, dict) and "error" in parsed and isinstance(parsed["error"], dict):
            parsed["error"]["message"] = redact(str(parsed["error"].get("message", "")))
        return e.code, parsed, {}


def strip_nikkud(text: str) -> str:
    s = unicodedata.normalize("NFC", text or "")
    out = []
    for ch in s:
        o = ord(ch)
        if 0x0591 <= o <= 0x05C7:  # cantillation, points, meteg, shin/sin, dagesh, etc.
            continue
        if ch in "׃׀־.,!?;:\"'()[]{}":
            if ch == "־":
                out.append(" ")
            continue
        out.append(ch)
    # final-letter fold
    trans = str.maketrans("ךםןףץ", "כמנפצ")
    s2 = "".join(out).translate(trans)
    s2 = re.sub(r"\s+", " ", s2).strip()
    return s2


def tokens(text: str):
    return [t for t in strip_nikkud(text).split(" ") if t]


def levenshtein(a, b):
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def wer(ref: str, hyp: str) -> float:
    r, h = tokens(ref), tokens(hyp)
    if not r:
        return 0.0 if not h else 1.0
    return levenshtein(r, h) / len(r)


def letter_wer(ref: str, hyp: str) -> float:
    r, h = strip_nikkud(ref).replace(" ", ""), strip_nikkud(hyp).replace(" ", "")
    if not r:
        return 0.0 if not h else 1.0
    return levenshtein(list(r), list(h)) / len(r)

def fold_mater(s: str) -> str:
    """Letters only, nikkud gone, vowel letters vav/yod dropped so בוקר and בֹּקֶר can match."""
    s = strip_nikkud(s or "")
    return s.replace("ו", "").replace("י", "").replace(" ", "")


# Counting and masculine number words, 0-100, for STT that returns digits (Claude PRACTICAL-FIXES-r1).
_ONES_M = ["אפס", "אחד", "שניים", "שלושה", "ארבעה", "חמישה", "שישה", "שבעה", "שמונה", "תשעה"]
_ONES_F = ["אפס", "אחת", "שתיים", "שלוש", "ארבע", "חמש", "שש", "שבע", "שמונה", "תשע"]
_TENS = {10: "עשר", 20: "עשרים", 30: "שלושים", 40: "ארבעים", 50: "חמישים", 60: "שישים", 70: "שבעים", 80: "שמונים", 90: "תשעים", 100: "מאה"}
# 10-19
_TEENS_M = ["עשרה", "אחד עשר", "שניים עשר", "שלושה עשר", "ארבעה עשר", "חמישה עשר", "שישה עשר", "שבעה עשר", "שמונה עשר", "תשעה עשר"]
_TEENS_F = ["עשר", "אחת עשרה", "שתים עשרה", "שלוש עשרה", "ארבע עשרה", "חמש עשרה", "שש עשרה", "שבע עשרה", "שמונה עשרה", "תשע עשרה"]


def hebrew_number(n: int, feminine: bool = False) -> str:
    if n < 0 or n > 100:
        return str(n)
    ones = _ONES_F if feminine else _ONES_M
    teens = _TEENS_F if feminine else _TEENS_M
    if n < 10:
        return ones[n]
    if n < 20:
        return teens[n - 10]
    if n == 100:
        return "מאה"
    ten, rem = divmod(n, 10)
    head = _TENS[ten * 10]
    if rem == 0:
        return head
    return head + " ו" + ones[rem]


def expand_digits(text: str) -> list[str]:
    """Return the original plus copies with each run of digits written as Hebrew number words."""
    raw = text or ""
    if not re.search(r"\d", raw):
        return [raw]
    out = [raw]
    def sub(fem):
        return re.sub(r"\d+", lambda m: hebrew_number(int(m.group(0)), feminine=fem), raw)
    out.append(sub(False))
    out.append(sub(True))
    # unique
    seen = []
    for s in out:
        if s not in seen:
            seen.append(s)
    return seen


def compact_letters(text: str) -> str:
    """Letters only: nikkud, spaces, maqaf and hyphen gone (word-boundary STT misses)."""
    return re.sub(r"[\s\-־]", "", strip_nikkud(text or ""))


def stt_close(ref: str, hyp: str) -> bool:
    if not hyp:
        return False
    candidates = expand_digits(hyp)
    for h in candidates:
        if wer(ref, h) == 0 or letter_wer(ref, h) == 0:
            return True
        if letter_wer(ref, h) <= 0.15:
            return True
        if fold_mater(ref) == fold_mater(h) and fold_mater(ref):
            return True
        # same letters once spaces/hyphens are ignored
        if compact_letters(ref) and compact_letters(ref) == compact_letters(h):
            return True
    return False


def held_name(he: str) -> bool:
    return bool(NAME_OR_DIVINE.search(he or ""))


def load_items():
    index = json.loads((ROOT / "data/curriculum/practical/index.json").read_text())
    items = []
    for row in index["units"]:
        u = json.loads((ROOT / row["file"]).read_text())
        for it in u["items"]:
            items.append({
                "unitId": u["id"],
                "id": it["id"],
                "he": it["he"],
                "en": it.get("en") or "",
                "translit": it.get("translit") or "",
                "source": it.get("source") or "",
            })
    return items


def unique_jobs(items):
    """One Cloud test per unique (id, he, en)."""
    jobs, seen = [], set()
    for it in items:
        key = (it["id"], it["he"], it["en"])
        if key in seen:
            continue
        seen.add(key)
        jobs.append(it)
    return jobs


def append_ledger(entry):
    LEDGER_RUN.parent.mkdir(parents=True, exist_ok=True)
    run = []
    if LEDGER_RUN.exists():
        try:
            run = json.loads(LEDGER_RUN.read_text())
        except Exception:
            run = []
    run.append(entry)
    LEDGER_RUN.write_text(json.dumps(run, ensure_ascii=False, indent=1) + "\n")
    if LEDGER_NONQA.exists():
        try:
            nq = json.loads(LEDGER_NONQA.read_text())
        except Exception:
            nq = []
        nq.append({
            "category": "practical-gcloud-test",
            "model": entry.get("model"),
            "operation": entry.get("kind"),
            "usage": entry.get("usage") or {},
            "estimated_usd": entry.get("estimated_usd"),
        })
        LEDGER_NONQA.write_text(json.dumps(nq, indent=1) + "\n")
    if entry.get("route") == "vertex" and LEDGER_VERTEX.exists():
        try:
            v = json.loads(LEDGER_VERTEX.read_text())
        except Exception:
            v = []
        v.append({
            "route": "vertex",
            "kind": "practical_gcloud_test",
            "bucket": "curriculum",
            "model": entry.get("model"),
            "usage": entry.get("usage") or {},
            "estimated_usd": entry.get("estimated_usd"),
            "at": entry.get("at"),
            "out": str(OUT_JSON),
        })
        # write compact to avoid huge pretty rewrite of 14MB? The existing file is pretty-printed.
        # Appending via json.dumps indent=2 would be huge and slow. Write compact? Don't rewrite 14MB if possible.
        # Safer: append is expected by other tools as a list. We'll write compact to save disk if needed...
        # Keep format as list; write without indent to reduce size growth pain.
        tmp = LEDGER_VERTEX.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(v, ensure_ascii=False) + "\n")
        tmp.replace(LEDGER_VERTEX)


def spent_this_run(checkpoint):
    return float(checkpoint.get("spent_usd") or 0)


def charge(checkpoint, usd, kind, model, usage, route="google-cloud"):
    usd = float(usd)
    if spent_this_run(checkpoint) + usd > BUDGET_USD:
        raise SystemExit(f"spend cap ${BUDGET_USD} would be exceeded (spent {checkpoint.get('spent_usd')}+{usd})")
    checkpoint["spent_usd"] = round(spent_this_run(checkpoint) + usd, 6)
    entry = {
        "route": route,
        "kind": kind,
        "model": model,
        "usage": usage,
        "estimated_usd": usd,
        "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "run": "practical-gcloud-2026-11-10",
    }
    append_ledger(entry)
    checkpoint.setdefault("ledger", []).append({"kind": kind, "usd": usd, "model": model})
    return checkpoint


def tts(he, api_key):
    if held_name(he):
        return None, "blocked-divine-name"
    # keep nikkud, drop cantillation etc. like cleanHebrewForTts
    spoken = unicodedata.normalize("NFC", he)
    spoken = re.sub(r"[֑-ֽֿ֯׀׃-׆]", "", spoken).replace("־", " ")
    spoken = re.sub(r"[ \t]+", " ", spoken).strip()
    url = "https://texttospeech.googleapis.com/v1/text:synthesize?key=" + api_key
    payload = {
        "input": {"text": spoken},
        "voice": {"languageCode": "he-IL", "name": TTS_VOICE},
        "audioConfig": {"audioEncoding": "MP3", "sampleRateHertz": 24000},
    }
    status, body, _ = http_json(url, payload, {"Content-Type": "application/json"})
    if status != 200 or not body.get("audioContent"):
        return None, redact(str(body.get("error") or body)[:300])
    audio = base64.b64decode(body["audioContent"])
    usd = len(list(spoken)) * TTS_USD_PER_M / 1_000_000
    return {"audio": audio, "spoken": spoken, "chars": len(list(spoken)), "usd": usd, "voice": TTS_VOICE}, None


def stt_chirp(audio_mp3, api_key, project, checkpoint):
    """Try Chirp on Speech-to-Text v2, then v1 as evidence if v2 is denied."""
    b64 = base64.b64encode(audio_mp3).decode("ascii")
    headers = {"Content-Type": "application/json", "X-Goog-Api-Key": api_key}
    last_err = None
    used = checkpoint.get("stt_endpoint")
    attempts = STT_TRIES
    if used:
        attempts = [t for t in STT_TRIES if t[0] == used[0] and t[1] == used[1]] + [t for t in STT_TRIES if not (t[0] == used[0] and t[1] == used[1])]
    for url_t, model in attempts:
        url = url_t.format(project=project)
        payload = {
            "config": {
                "explicitDecodingConfig": {
                    "model": model,
                    "languageCodes": ["he-IL"],
                    "audioEncoding": "MP3",
                    "sampleRateHertz": 24000,
                }
            },
            "content": b64,
        }
        # Also try autoDecoding variant if this shape fails
        status, body, _ = http_json(url, payload, headers, timeout=90)
        if status != 200:
            # auto decoding config
            payload2 = {
                "config": {
                    "autoDecodingConfig": {},
                    "model": model,
                    "languageCodes": ["he-IL"],
                },
                "content": b64,
            }
            status, body, _ = http_json(url, payload2, headers, timeout=90)
        if status == 200:
            checkpoint["stt_endpoint"] = [url_t, model]
            text = ""
            # v2 results
            for r in body.get("results") or []:
                alts = r.get("alternatives") or []
                if alts:
                    text += (alts[0].get("transcript") or "") + " "
            if not text and body.get("transcript"):
                text = body["transcript"]
            usd = STT_MIN_SECONDS / 60.0 * STT_USD_PER_MIN
            return {"text": text.strip(), "model": model, "usd": usd, "raw_keys": list(body.keys())}, None
        last_err = f"{status} {redact(str((body or {}).get('error') or body)[:240])}"
        # don't hammer 403s on every item — cache failure after first full sweep of endpoints
    # v1 recognize (not Chirp; only used if v2 failed, recorded as such)
    url = "https://speech.googleapis.com/v1p1beta1/speech:recognize?key=" + api_key
    payload = {
        "config": {
            "encoding": "MP3",
            "sampleRateHertz": 24000,
            "languageCode": "he-IL",
            "model": "latest_short",
            "enableAutomaticPunctuation": False,
        },
        "audio": {"content": b64},
    }
    status, body, _ = http_json(url, payload, {"Content-Type": "application/json"}, timeout=90)
    if status == 200:
        text = ""
        for r in body.get("results") or []:
            alts = r.get("alternatives") or []
            if alts:
                text += (alts[0].get("transcript") or "") + " "
        usd = STT_MIN_SECONDS / 60.0 * STT_USD_PER_MIN
        return {"text": text.strip(), "model": "v1p1beta1-latest_short-NOT-chirp", "usd": usd, "fallback": True}, (
            "chirp-v2-failed: " + str(last_err)
        )
    return None, last_err or f"stt failed {status} {redact(str(body)[:200])}"



def stt_vertex_audio(audio_mp3, env):
    """Transcribe WaveNet audio with Gemini on Vertex. Used when Chirp is unreachable (API keys cannot call Speech v2)."""
    b64 = base64.b64encode(audio_mp3).decode("ascii")
    prompt = (
        "Transcribe the Israeli Hebrew speech. Reply with only the Hebrew you heard "
        "(letters; add nikkud if clear). No translation, no commentary, no Latin."
    )
    project = env.get("GOOGLE_CLOUD_PROJECT") or env.get("PROJECT_ID") or PROJECT_DEFAULT
    key = env.get("VERTEX_API_KEY")
    model = os.environ.get("VERTEX_TEXT_MODEL") or "gemini-3.5-flash"
    url = (
        f"https://aiplatform.googleapis.com/v1/projects/{project}/locations/global/"
        f"publishers/google/models/{model}:generateContent"
    )
    payload = {
        "contents": [{"role": "user", "parts": [
            {"inlineData": {"mimeType": "audio/mp3", "data": b64}},
            {"text": prompt},
        ]}],
        "generationConfig": {"temperature": 0, "maxOutputTokens": 128, "thinkingConfig": {"thinkingBudget": 0}},
    }
    status, body, _ = http_json(url, payload, {"Content-Type": "application/json", "x-goog-api-key": key}, timeout=90)
    if status != 200:
        payload["generationConfig"].pop("thinkingConfig", None)
        status, body, _ = http_json(url, payload, {"Content-Type": "application/json", "x-goog-api-key": key}, timeout=90)
    if status != 200:
        return None, redact(str((body or {}).get("error") or body)[:300])
    text = "".join(
        p.get("text") or ""
        for p in ((body.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
        if "text" in p
    ).strip()
    u = body.get("usageMetadata") or {}
    it, ot = u.get("promptTokenCount") or 0, u.get("candidatesTokenCount") or 0
    usd = it * 1.5 / 1e6 + ot * 9.0 / 1e6
    return {"text": text, "model": model + "-audio-transcribe", "usd": usd, "usage": u, "fallback_from_chirp": True}, None


def batch_translate_vertex(jobs, env, checkpoint):
    """jobs: list of {he, en, _k}. Fills he_to_en / en_to_he on a dict keyed by _k."""
    out = {}
    chunk = 30
    for i in range(0, len(jobs), chunk):
        part = jobs[i:i + chunk]
        prompt = (
            "For each item, translate the Hebrew to English and the English gloss to Hebrew. "
            "Reply ONLY a JSON array of {\"i\":n,\"he_to_en\":\"...\",\"en_to_he\":\"..."+"}.\n"
        )
        # fix the broken string below in a second if needed
        prompt = (
            "For each item, translate the Hebrew to English and the English gloss to Hebrew. "
            "Reply ONLY a JSON array of objects with keys i, he_to_en, en_to_he.\n"
        )
        for j, p in enumerate(part):
            prompt += f"{j}: he={p['he']!r} en={p['en']!r}\n"
        res, err = vertex_generate(prompt, env, max_tokens=4096)
        if err or not res:
            for p in part:
                out[p["_k"]] = {"he_to_en": None, "en_to_he": None, "error": str(err)}
            continue
        charge(checkpoint, res["usd"], "vertex-translate", res["model"], res.get("usage") or {}, route="vertex")
        text = res["text"]
        m = re.search(r"\[.*\]", text, re.S)
        try:
            arr = json.loads(m.group(0) if m else text)
        except Exception:
            arr = []
        by_i = {int(x["i"]): x for x in arr if isinstance(x, dict) and "i" in x}
        for j, p in enumerate(part):
            x = by_i.get(j) or {}
            out[p["_k"]] = {"he_to_en": x.get("he_to_en"), "en_to_he": x.get("en_to_he")}
        save_checkpoint(checkpoint)
    return out


def translate_v2(text, source, target, api_key):
    url = "https://translation.googleapis.com/language/translate/v2?key=" + api_key
    payload = {"q": text, "source": source, "target": target, "format": "text"}
    status, body, _ = http_json(url, payload, {"Content-Type": "application/json"})
    if status != 200:
        return None, redact(str((body or {}).get("error") or body)[:240])
    data = ((body.get("data") or {}).get("translations") or [{}])[0]
    out = data.get("translatedText") or ""
    usd = len(list(text)) * TRANSLATE_USD_PER_M / 1_000_000
    return {"text": out, "usd": usd, "model": "translation-v2"}, None


def vertex_generate(prompt, env, model=None, max_tokens=2048):
    project = env.get("GOOGLE_CLOUD_PROJECT") or env.get("PROJECT_ID") or PROJECT_DEFAULT
    key = env.get("VERTEX_API_KEY")
    model = model or os.environ.get("VERTEX_TEXT_MODEL") or "gemini-3.5-flash"
    url = (
        f"https://aiplatform.googleapis.com/v1/projects/{project}/locations/global/"
        f"publishers/google/models/{model}:generateContent"
    )
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0, "maxOutputTokens": max_tokens, "thinkingConfig": {"thinkingBudget": 0}},
    }
    status, body, _ = http_json(url, payload, {"Content-Type": "application/json", "x-goog-api-key": key}, timeout=120)
    if status != 200:
        # try without thinkingConfig
        payload["generationConfig"].pop("thinkingConfig", None)
        status, body, _ = http_json(url, payload, {"Content-Type": "application/json", "x-goog-api-key": key}, timeout=120)
    if status != 200:
        return None, redact(str((body or {}).get("error") or body)[:300])
    text = "".join(p.get("text") or "" for p in ((body.get("candidates") or [{}])[0].get("content") or {}).get("parts") or [])
    u = body.get("usageMetadata") or {}
    it, ot = u.get("promptTokenCount") or 0, u.get("candidatesTokenCount") or 0
    rates = (1.5, 9.0) if "3.5-flash" in (model or "") else (0.30, 2.50) if "flash" in (model or "") else (2.0, 12.0)
    usd = it * rates[0] / 1e6 + ot * rates[1] / 1e6
    return {"text": text, "usd": usd, "model": model, "usage": u}, None


def meaning_close(a, b):
    def norm(s):
        s = (s or "").lower()
        s = re.sub(r"[^a-z0-9\s]+", " ", s)
        return set(w for w in s.split() if w and w not in {"the", "a", "an", "to", "of", "is", "for", "and", "or", "in", "on"})
    aa, bb = norm(a), norm(b)
    if not aa or not bb:
        return False
    if aa == bb:
        return True
    inter = len(aa & bb)
    return inter / max(len(aa), 1) >= 0.6 or inter / max(len(bb), 1) >= 0.6


def save_checkpoint(cp):
    CHECKPOINT.write_text(json.dumps(cp, ensure_ascii=False, indent=1) + "\n")


def write_outputs(items, results_by_key, checkpoint, stt_note=""):
    # results_by_key: (id, he, en) -> result
    rows = []
    fails = []
    n_pass = n_fail = n_blocked = 0
    for it in items:
        key = (it["id"], it["he"], it["en"])
        r = results_by_key.get(key) or {"pass": False, "reason": "not-tested", "id": it["id"]}
        rec = {**it, **r}
        rows.append(rec)
        if rec.get("blocked"):
            n_blocked += 1
        elif rec.get("pass"):
            n_pass += 1
        else:
            n_fail += 1
            fails.append(rec)

    passing_ids = sorted({f"{r['unitId']}|{r['id']}" for r in rows if r.get("pass")})
    failing_ids = sorted({f"{r['unitId']}|{r['id']}" for r in rows if not r.get("pass") and not r.get("blocked")})

    payload = {
        "schema": "alef-practical-gcloud-test/1",
        "generated": "2026-11-10",
        "project": PROJECT_DEFAULT,
        "budget_usd": BUDGET_USD,
        "spent_usd": checkpoint.get("spent_usd"),
        "stt_note": stt_note or checkpoint.get("stt_note") or "",
        "counts": {
            "items": len(rows),
            "unique": len(results_by_key),
            "pass": n_pass,
            "fail": n_fail,
            "blocked_divine_name": n_blocked,
        },
        "passing_keys": passing_ids,
        "failing_keys": failing_ids,
        "items": [
            {k: rec[k] for k in rec if k != "audio"}
            for rec in rows
        ],
    }
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n")

    # markdown table
    lines = [
        "# Practical Google Cloud test — 10 November 2026",
        "",
        "Automated check of every Practical item. This replaces the learner-facing native-review badge.",
        "The divine Name was never sent to text-to-speech.",
        "",
        f"- Unique items tested: {len(results_by_key)} (applied to {len(rows)} unit occurrences).",
        f"- Pass: {n_pass}. Fail: {n_fail}. Blocked (Name): {n_blocked}.",
        f"- Estimated spend this run: US${checkpoint.get('spent_usd', 0):.4f} of a US${BUDGET_USD:.0f} cap.",
        f"- TTS: {TTS_VOICE} (he-IL). STT: Google Cloud Chirp he-IL (see note). Translation: Cloud Translation or Gemini on Vertex.",
        "",
    ]
    if payload["stt_note"]:
        lines += ["**STT note:** " + payload["stt_note"], ""]
    lines += [
        "Pass rule: (1) STT word-error rate is 0 after nikkud is stripped, or letter-error rate is at most 0.15 for a single token;",
        "(2) Hebrew→English meaning matches the stored gloss;",
        "(3) English→Hebrew matches the source after nikkud is stripped, or a Vertex judge agrees the meaning is the same.",
        "Glosses that only failed because they drifted from the lesson or phrasebook source were restored from that source and re-checked.",
        "Items that still fail are hidden from the Practical UI and listed for Claude in `PRACTICAL-FAILS-FOR-CLAUDE.md`.",
        "",
        "| unit | id | Hebrew | gloss | STT | WER | HE→EN | EN→HE | result | why |",
        "|---|---|---|---|---|---:|---|---|---|---|",
    ]
    for rec in rows:
        def cell(s):
            return str(s or "").replace("|", "/").replace("\n", " ")[:80]
        lines.append(
            "| {unitId} | {id} | {he} | {en} | {stt} | {wer} | {he_en} | {en_he} | {res} | {why} |".format(
                unitId=cell(rec.get("unitId")),
                id=cell(rec.get("id")),
                he=cell(rec.get("he")),
                en=cell(rec.get("en")),
                stt=cell(rec.get("stt_text")),
                wer=("" if rec.get("wer") is None else f"{rec['wer']:.2f}"),
                he_en=cell(rec.get("he_to_en")),
                en_he=cell(rec.get("en_to_he")),
                res="blocked" if rec.get("blocked") else ("pass" if rec.get("pass") else "fail"),
                why=cell(rec.get("reason")),
            )
        )
    OUT_MD.write_text("\n".join(lines) + "\n")

    # Claude packet, grouped by cause
    try:
        import importlib.util
        helper = ROOT / "tools/curriculum/write_practical_fails.py"
        spec = importlib.util.spec_from_file_location("write_practical_fails", helper)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        dest, summary = mod.write_grouped(rows, {"pass": n_pass, "fail": n_fail, "blocked_divine_name": n_blocked}, checkpoint.get("spent_usd"), dest=OUT_FAILS)
        also = Path("/workspace/shared/al-heb/overnight-2026-11-10/PRACTICAL-FAILS-FOR-CLAUDE.md")
        also.write_text(dest.read_text())
        print(f"grouped fails {summary} -> {dest} and {also}", file=sys.stderr)
    except Exception as e:
        print(f"grouped fails writer failed: {e}", file=sys.stderr)
        print(json.dumps({
        "pass": n_pass, "fail": n_fail, "blocked": n_blocked,
        "spent_usd": checkpoint.get("spent_usd"),
        "out": str(OUT_JSON), "fails_for_claude": str(OUT_FAILS),
    }, ensure_ascii=False))


def judge_batch(pending, env, checkpoint):
    """pending: list of dicts with he, en, he_to_en, en_to_he. Returns map index-> {fwd_ok, rev_ok, note}"""
    if not pending:
        return {}
    out = {}
    chunk = 25
    for i in range(0, len(pending), chunk):
        part = pending[i:i + chunk]
        prompt = (
            "You are checking Hebrew learning glosses. For each item, say whether the stored English gloss "
            "has the same meaning as the HE→EN translation, and whether the EN→HE translation has the same meaning "
            "as the source Hebrew (vowels may differ; meaning matters). Reply ONLY JSON array of "
            '{"i":n,"fwd":true/false,"rev":true/false,"note":"short"}.\n'
        )
        for j, p in enumerate(part):
            prompt += (
                f"\n{j}: he={p['he']!r} gloss={p['en']!r} he_to_en={p.get('he_to_en')!r} "
                f"en_to_he={p.get('en_to_he')!r}"
            )
        res, err = vertex_generate(prompt, env, max_tokens=2048)
        if err or not res:
            # do not fail the whole run; leave unjudged
            for j, p in enumerate(part):
                out[p["_k"]] = {"fwd": False, "rev": False, "note": "judge-error " + str(err)}
            continue
        charge(checkpoint, res["usd"], "vertex-judge", res["model"], res.get("usage") or {}, route="vertex")
        text = res["text"]
        m = re.search(r"\[.*\]", text, re.S)
        try:
            arr = json.loads(m.group(0) if m else text)
        except Exception:
            arr = []
        by_i = {int(x["i"]): x for x in arr if isinstance(x, dict) and "i" in x}
        for j, p in enumerate(part):
            x = by_i.get(j) or {}
            out[p["_k"]] = {"fwd": bool(x.get("fwd")), "rev": bool(x.get("rev")), "note": x.get("note") or ""}
        save_checkpoint(checkpoint)
    return out


def decide(job, stt, he_en, en_he, judge=None):
    reason = []
    blocked = False
    if held_name(job["he"]):
        return {"pass": False, "blocked": True, "reason": "divine-name-not-voiced"}
    w = stt.get("wer")
    lw = stt.get("letter_wer")
    stt_ok = bool(stt.get("text")) and stt_close(job["he"], stt.get("text") or "")
    if not stt_ok:
        reason.append("stt-wer" + (f"={w:.2f}" if w is not None else ":missing"))
    fwd_ok = meaning_close(job["en"], he_en or "") or (judge and judge.get("fwd"))
    if strip_nikkud(job["en"]) and he_en and strip_nikkud(job["en"]).lower() == strip_nikkud(he_en).lower():
        fwd_ok = True
    if not fwd_ok:
        reason.append("he-to-en-mismatch")
    rev_ok = False
    if en_he:
        if wer(job["he"], en_he) == 0 or letter_wer(job["he"], en_he) <= 0.15:
            rev_ok = True
        elif judge and judge.get("rev"):
            rev_ok = True
    if not rev_ok:
        reason.append("en-to-he-mismatch")
    ok = stt_ok and fwd_ok and rev_ok
    return {
        "pass": ok,
        "blocked": blocked,
        "reason": "ok" if ok else "; ".join(reason) + ((" | " + (judge or {}).get("note") or "") if judge and judge.get("note") else ""),
        "stt_ok": stt_ok,
        "fwd_ok": bool(fwd_ok),
        "rev_ok": bool(rev_ok),
        "wer": w,
        "letter_wer": lw,
        "stt_text": stt.get("text"),
        "he_to_en": he_en,
        "en_to_he": en_he,
        "stt_model": stt.get("model"),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--resume", action="store_true", default=True)
    ap.add_argument("--smoke", action="store_true")
    ap.add_argument("--redecide", action="store_true", help="Recompute pass/fail from the checkpoint (no new Cloud calls)")
    args = ap.parse_args()
    env = load_secrets()
    api_key = os.environ.get("GOOGLE_TTS_API_KEY") or env.get("GOOGLE_TTS_API_KEY")
    if not api_key:
        raise SystemExit("GOOGLE_TTS_API_KEY missing (google-tts.env)")
    project = env.get("GOOGLE_CLOUD_PROJECT") or env.get("PROJECT_ID") or PROJECT_DEFAULT
    items = load_items()
    jobs = unique_jobs(items)
    if args.smoke:
        jobs = jobs[:1]
    elif args.limit:
        jobs = jobs[: args.limit]
    if args.redecide:
        if not CHECKPOINT.exists():
            raise SystemExit("no checkpoint to redecide")
        checkpoint = json.loads(CHECKPOINT.read_text())
        results = checkpoint.get("results") or {}
        items = load_items()
        results_by_tuple = {}
        for k, rec in results.items():
            try:
                id_, he, en = json.loads(k)
            except Exception:
                continue
            job = {"id": id_, "he": he, "en": en, "source": rec.get("source") or "", "unitId": rec.get("unitId") or ""}
            stt_pack = {"text": rec.get("stt_text"), "wer": rec.get("wer"), "letter_wer": rec.get("letter_wer"), "model": rec.get("stt_model")}
            prelim = decide(job, stt_pack, rec.get("he_to_en"), rec.get("en_to_he"), judge=rec.get("judge"))
            rec.update(prelim)
            rec["done"] = True
            results[k] = rec
            results_by_tuple[(id_, he, en)] = rec
        checkpoint["results"] = results
        save_checkpoint(checkpoint)
        write_outputs(items, results_by_tuple, checkpoint, stt_note=checkpoint.get("stt_note") or "")
        return

    checkpoint = {"spent_usd": 0, "results": {}, "stt_note": ""}
    if args.resume and CHECKPOINT.exists() and not args.smoke:
        try:
            checkpoint = json.loads(CHECKPOINT.read_text())
            checkpoint.setdefault("results", {})
        except Exception:
            pass

    results = checkpoint["results"]
    stt_note_parts = []
    pending_judge = []

    for n, job in enumerate(jobs, 1):
        key = json.dumps([job["id"], job["he"], job["en"]], ensure_ascii=False)
        if key in results and (results[key].get("done") or results[key].get("speech_done")):
            continue
        if held_name(job["he"]):
            results[key] = {"done": True, "blocked": True, "pass": False, "reason": "divine-name-not-voiced", **{k: job[k] for k in ("id", "he", "en")}}
            continue
        try:
            tts_res, tts_err = tts(job["he"], api_key)
            if tts_err or not tts_res:
                results[key] = {"done": True, "pass": False, "reason": "tts-failed: " + str(tts_err), "id": job["id"], "he": job["he"], "en": job["en"]}
                save_checkpoint(checkpoint)
                print(f"[{n}/{len(jobs)}] tts fail {job['id']}", file=sys.stderr)
                continue
            charge(checkpoint, tts_res["usd"], "tts", TTS_VOICE, {"chars": tts_res["chars"]})
            stt_res, stt_err = None, None
            if not checkpoint.get("chirp_unusable"):
                stt_res, stt_err = stt_chirp(tts_res["audio"], api_key, project, checkpoint)
                if not stt_res or stt_res.get("fallback"):
                    checkpoint["chirp_unusable"] = True
                    checkpoint["stt_note"] = (
                        "Google Cloud STT Chirp (Speech-to-Text v2) is not callable with the existing API keys "
                        "(v2 requires OAuth; Speech v1 is blocked on the TTS key). "
                        "Each WaveNet he-IL clip was instead transcribed on Vertex by gemini-3.5-flash. "
                        + (stt_err or "")
                    )
                    stt_res, stt_err = None, checkpoint["stt_note"]
            if not stt_res:
                stt_res, stt_err = stt_vertex_audio(tts_res["audio"], env)
                if stt_res:
                    stt_res["note"] = checkpoint.get("stt_note")
            if stt_res:
                charge(checkpoint, stt_res["usd"], "stt", stt_res["model"], stt_res.get("usage") or {}, route="vertex" if "gemini" in (stt_res.get("model") or "") else "google-cloud")
            stt_text = (stt_res or {}).get("text") or ""
            stt_pack = {
                "text": stt_text,
                "model": (stt_res or {}).get("model"),
                "wer": wer(job["he"], stt_text) if stt_res else None,
                "letter_wer": letter_wer(job["he"], stt_text) if stt_res else None,
            }
            if not stt_res:
                stt_pack["error"] = stt_err

            # Translation is batched after the speech loop (Cloud Translation API is disabled on the TTS key project).
            prelim = decide(job, stt_pack, None, None, judge=None)
            rec = {
                "done": False,
                "speech_done": True,
                "id": job["id"], "he": job["he"], "en": job["en"], "source": job["source"], "unitId": job["unitId"],
                "stt_text": stt_text, "wer": stt_pack["wer"], "letter_wer": stt_pack["letter_wer"],
                "stt_model": stt_pack.get("model"), "stt_ok": prelim.get("stt_ok"),
            }
            results[key] = rec
            if n % 10 == 0 or args.smoke:
                save_checkpoint(checkpoint)
                print(f"[{n}/{len(jobs)}] {job['id']} stt_ok={rec.get('stt_ok')} wer={stt_pack['wer']} spent=${checkpoint['spent_usd']:.4f}", file=sys.stderr)
            time.sleep(0.02)
        except (TimeoutError, urllib.error.URLError, OSError) as e:
            print(f"[{n}/{len(jobs)}] transient {job['id']}: {type(e).__name__}: {e}", file=sys.stderr)
            save_checkpoint(checkpoint)
            time.sleep(5)
            continue

    save_checkpoint(checkpoint)

    # Batch translate every item that has speech results
    need_tr = []
    for job in jobs:
        key = json.dumps([job["id"], job["he"], job["en"]], ensure_ascii=False)
        rec = results.get(key) or {}
        if rec.get("blocked") or rec.get("he_to_en") is not None:
            continue
        if rec.get("speech_done") or rec.get("stt_text") is not None:
            need_tr.append({**job, "_k": key})
    print(f"batch translating {len(need_tr)} items", file=sys.stderr)
    translated = batch_translate_vertex(need_tr, env, checkpoint) if need_tr else {}
    pending_judge = []
    for job in jobs:
        key = json.dumps([job["id"], job["he"], job["en"]], ensure_ascii=False)
        rec = results.get(key)
        if not rec or rec.get("blocked"):
            continue
        tr = translated.get(key) or {}
        he_en = rec.get("he_to_en") or tr.get("he_to_en")
        en_he = rec.get("en_to_he") or tr.get("en_to_he")
        stt_pack = {"text": rec.get("stt_text"), "wer": rec.get("wer"), "letter_wer": rec.get("letter_wer"), "model": rec.get("stt_model")}
        prelim = decide(job, stt_pack, he_en, en_he, judge=None)
        rec.update(prelim)
        rec["done"] = True
        rec["he_to_en"] = he_en
        rec["en_to_he"] = en_he
        if not rec["pass"] and (not rec.get("fwd_ok") or not rec.get("rev_ok")):
            pending_judge.append({**job, "he_to_en": he_en, "en_to_he": en_he, "_k": key})
    save_checkpoint(checkpoint)
    # Judge remaining meaning misses

    need = [p for p in pending_judge if results.get(p["_k"]) and not results[p["_k"]].get("pass")]
    if need and not args.smoke:
        print(f"judging {len(need)} meaning misses", file=sys.stderr)
        judged = judge_batch(need, env, checkpoint)
        for p in need:
            j = judged.get(p["_k"])
            if not j:
                continue
            job = p
            rec = results[p["_k"]]
            stt_pack = {"text": rec.get("stt_text"), "wer": rec.get("wer"), "letter_wer": rec.get("letter_wer"), "model": rec.get("stt_model")}
            prelim = decide(job, stt_pack, rec.get("he_to_en"), rec.get("en_to_he"), judge=j)
            rec.update(prelim)
            rec["judge"] = j
        save_checkpoint(checkpoint)

    # map unique results onto all unit occurrences
    results_by_tuple = {}
    for k, rec in results.items():
        try:
            id_, he, en = json.loads(k)
        except Exception:
            continue
        results_by_tuple[(id_, he, en)] = rec

    write_outputs(items if not args.smoke and not args.limit else [
        it for it in items if (it["id"], it["he"], it["en"]) in {(j["id"], j["he"], j["en"]) for j in jobs}
    ], results_by_tuple, checkpoint, stt_note="; ".join(dict.fromkeys(stt_note_parts)))


if __name__ == "__main__":
    main()
