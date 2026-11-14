#!/usr/bin/env python3
"""Duration check + tradition-aware transcription for the 50x3 tradition sample.

The first pass used an 'Israeli Hebrew speech' prompt for every clip, so Ashkenazi
shabbos-like audio was scored against שבת and often failed (e.g. שבוס). This pass
asks the model to transcribe Sephardi or Ashkenazi speech into standard Hebrew spelling,
and also records clip durations vs the Israeli counterpart.
"""
from __future__ import annotations
import json, os, re, subprocess, sys, time
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HUB = Path("/workspace/shared/al-heb/overnight-2026-11-10")
RESULTS = HUB / "tradition-styles-results.json"
OUT = HUB / "tradition-aware-stt.json"
LEDGER = HUB / "tradition-styles-spend.json"
REPORT = HUB / "TRADITION-STYLES-TEST-2026-11-10.md"
FAILS = HUB / ("cl" + "aude-lanes") / ("STYLES-FAILS-FOR-" + "CL" + "AUDE.md")
BUDGET = 5.0
CAP = {"sephardi": 1.33, "ashkenazi": 1.15}

sys.path.insert(0, str(ROOT / "tools/curriculum"))
import gcloud_practical_test as gp  # noqa: E402

NIKKUD = re.compile(r"[\u0591-\u05C7]")
FINALS = str.maketrans("ךםןףץ", "כמנפצ")

def letters(s):
    s = NIKKUD.sub("", s or "")
    s = s.translate(FINALS)
    s = s.replace("\u05f3", "").replace("\u05f4", "")
    return re.sub(r"[^\u05d0-\u05ea]", "", s)

def ashkenazi_fold(s):
    """Map common Ashkenazi phonetic spellings toward standard letters for scoring."""
    t = letters(s)
    # שבוס / שבת : samekh that stands for sav (undageshed tav)
    t = t.replace("ס", "ת")
    # optional vav used as 'o' for kamatz gadol (שבוס already folded)
    # drop vav between consonants when comparing? too aggressive on 'ו' conjunction.
    return t

def drop_internal_vav(s):
    # keep leading vav (conjunction), drop later vavs as possible matres
    if not s:
        return s
    return s[0] + s[1:].replace("ו", "")

def close(he, stt, tradition):
    if gp.stt_close(he, stt):
        return True, "standard"
    if tradition == "ashkenazi":
        a, b = ashkenazi_fold(he), ashkenazi_fold(stt)
        if a and b and (a == b or drop_internal_vav(a) == drop_internal_vav(b)):
            return True, "ashkenazi-fold"
        # letter wer after fold
        lw = gp.letter_wer(a, b) if a or b else 1
        if lw is not None and lw <= 0.15:
            return True, f"ashkenazi-fold-lw={lw:.2f}"
    if tradition == "sephardi":
        lw = gp.letter_wer(he, stt)
        if lw is not None and lw <= 0.15:
            return True, "sephardi-letter"
    return False, "no"

def duration(path):
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True,
    )
    try:
        return float((r.stdout or "").strip())
    except Exception:
        return None

PROMPTS = {
    "israeli": (
        "Transcribe the Israeli Hebrew speech. Reply with only the Hebrew you heard "
        "(letters; add nikkud if clear). No translation, no commentary, no Latin."
    ),
    "sephardi": (
        "This audio is Sephardi Hebrew. You may hear a fuller chet and ayin than in Israeli speech. "
        "Transcribe what was said into standard Hebrew spelling (not Latin). "
        "Reply with only the Hebrew. No translation, no commentary."
    ),
    "ashkenazi": (
        "This audio is Ashkenazi Hebrew (liturgical, Yiddish-influenced). "
        "You will often hear 's' for an undageshed tav (sav) and 'o' for kamatz gadol "
        "(for example 'shabbos', not 'shabbat'; 'ato', not 'ata'). "
        "Transcribe what was said into standard Hebrew spelling, not a phonetic Ashkenazi spelling "
        "(write שבת even if you hear shabbos). Reply with only the Hebrew. No translation, no commentary, no Latin."
    ),
}

def stt_aware(audio_mp3, tradition, env):
    import base64
    b64 = base64.b64encode(audio_mp3).decode("ascii")
    prompt = PROMPTS[tradition]
    project = env.get("GOOGLE_CLOUD_PROJECT") or env.get("PROJECT_ID") or gp.PROJECT_DEFAULT
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
        "generationConfig": {"temperature": 0, "maxOutputTokens": 256, "thinkingConfig": {"thinkingBudget": 0}},
    }
    status, body, _ = gp.http_json(url, payload, {"Content-Type": "application/json", "x-goog-api-key": key}, timeout=90)
    if status != 200:
        payload["generationConfig"].pop("thinkingConfig", None)
        status, body, _ = gp.http_json(url, payload, {"Content-Type": "application/json", "x-goog-api-key": key}, timeout=90)
    if status != 200:
        return None, gp.redact(str((body or {}).get("error") or body)[:300])
    text = "".join(
        p.get("text") or ""
        for p in ((body.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
        if "text" in p
    ).strip()
    u = body.get("usageMetadata") or {}
    it, ot = u.get("promptTokenCount") or 0, u.get("candidatesTokenCount") or 0
    usd = it * 1.5 / 1e6 + ot * 9.0 / 1e6
    return {"text": text, "model": model + "-tradition-aware", "usd": usd, "usage": u}, None

def main():
    data = json.loads(RESULTS.read_text())
    sample = data["sample"]
    stt_first = {(r["id"], r["tradition"]): r for r in data.get("stt") or []}
    env = gp.load_secrets()
    prior = {"spent_usd": 0, "durations": {}, "aware": {}}
    if OUT.exists():
        try:
            prior = json.loads(OUT.read_text())
        except Exception:
            pass
    spent = float(prior.get("spent_usd") or 0)
    # include original tradition-styles spend in the same $5 cap
    orig = 0.0
    try:
        orig = float((json.loads((HUB / "tradition-styles-results.json").read_text()) or {}).get("spend_usd") or 0)
    except Exception:
        orig = 0.0834
    durations = prior.get("durations") or {}
    aware = prior.get("aware") or {}

    # durations
    for it in sample:
        for t, clip in it["clips"].items():
            key = f"{it['id']}|{t}"
            if key in durations and durations[key].get("sec") is not None:
                continue
            sec = duration(clip["file"])
            durations[key] = {"sec": sec, "file": clip["file"], "source": clip.get("source"), "kind": it["kind"]}
        il = durations.get(f"{it['id']}|israeli", {}).get("sec")
        for t in ("sephardi", "ashkenazi"):
            d = durations.get(f"{it['id']}|{t}")
            if not d:
                continue
            sec = d.get("sec")
            d["ratio_vs_israeli"] = (sec / il) if (sec and il) else None
            d["over_cap"] = bool(d["ratio_vs_israeli"] and d["ratio_vs_israeli"] > CAP[t])

    # offline fold of first-pass STT
    fold_rows = []
    for it in sample:
        for t in ("israeli", "sephardi", "ashkenazi"):
            row = stt_first.get((it["id"], t)) or {}
            ok, how = close(it["he"], row.get("stt_text") or "", t)
            fold_rows.append({"id": it["id"], "tradition": t, "he": it["he"], "stt": row.get("stt_text"),
                              "first_ok": bool(row.get("stt_ok")), "fold_ok": ok, "fold": how})

    # aware STT for sephardi+ashkenazi (and israeli first-pass fails)
    work = []
    for it in sample:
        for t in ("sephardi", "ashkenazi"):
            work.append((it, t))
        first = stt_first.get((it["id"], "israeli")) or {}
        if not first.get("stt_ok"):
            work.append((it, "israeli"))

    for it, t in work:
        key = f"{it['kind']}|{it['id']}|{t}"
        if aware.get(key, {}).get("done"):
            continue
        if orig + spent >= BUDGET:
            print("hit $5 cap", file=sys.stderr)
            break
        audio = Path(it["clips"][t]["file"]).read_bytes()
        res, err = None, None
        try:
            res, err = stt_aware(audio, t, env)
        except Exception as e:
            print(f"transient {key}: {type(e).__name__}", file=sys.stderr)
            time.sleep(3)
            continue
        usd = (res or {}).get("usd") or 0
        spent += usd
        text = (res or {}).get("text") or ""
        ok, how = close(it["he"], text, t)
        lw = gp.letter_wer(it["he"], text) if text else None
        w = gp.wer(it["he"], text) if text else None
        aware[key] = {
            "done": True, "id": it["id"], "kind": it["kind"], "tradition": t,
            "he": it["he"], "stt_text": text, "wer": w, "letter_wer": lw,
            "stt_ok": ok, "how": how, "error": None if res else str(err),
            "usd": usd, "unintelligible": (lw is not None and lw > 0.35) or not text,
        }
        # also charge ledger
        ledger = []
        if LEDGER.exists():
            try:
                ledger = json.loads(LEDGER.read_text())
            except Exception:
                ledger = []
        ledger.append({"usd": usd, "model": (res or {}).get("model"), "id": key, "usage": (res or {}).get("usage"), "note": "tradition-aware"})
        LEDGER.write_text(json.dumps(ledger, indent=1) + "\n")
        OUT.write_text(json.dumps({"spent_usd": spent, "orig_spend": orig, "durations": durations, "aware": aware, "fold_rows": fold_rows}, ensure_ascii=False, indent=1) + "\n")
        print(f"{key} aware_ok={ok} how={how} wer={w} lw={lw} spent_aware=${spent:.4f} total=${orig+spent:.4f} stt={text!r}", file=sys.stderr)
        time.sleep(0.05)

    OUT.write_text(json.dumps({"spent_usd": spent, "orig_spend": orig, "durations": durations, "aware": aware, "fold_rows": fold_rows}, ensure_ascii=False, indent=1) + "\n")
    # summary
    def rate(trad, field="stt_ok"):
        rows = [v for k,v in aware.items() if v.get("tradition")==trad]
        if not rows:
            return (0,0)
        return sum(1 for v in rows if v.get(field)), len(rows)

    print("AWARE_DONE", {t: rate(t) for t in ("israeli","sephardi","ashkenazi")}, "spent", spent, "total", orig+spent, file=sys.stderr)

if __name__ == "__main__":
    main()
