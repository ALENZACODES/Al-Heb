# ALEF Talk — live English ↔ Hebrew translator

A conversation translator modelled on Google Translate’s Conversation mode. A person opens ALEF, taps **Talk** (`#/talk`), and can speak or type. English becomes Hebrew (shown large, spoken automatically); Hebrew becomes English. Auto detects which language was spoken.

This is not live on the public site until John approves a deploy. Nothing here merges to `main`.

## What it does

- One large microphone button, plus **Auto**, English, Hebrew, and swap.
- Live partial transcript while the person is speaking (device speech recognition when the browser offers it; final pass goes through Google speech recognition).
- The translation is shown large and spoken automatically (can be turned off).
- Face-to-face view: the other half of the screen is rotated 180° for the person across the table.
- A text box as well as voice; copy and replay; history.
- Hebrew is right-to-left. Vowel points (nikkud) are optional; Cloud Translation usually returns unpointed Israeli Hebrew.
- A clear message when no translator service is configured, and when the device is offline.
- The four-letter Name is never spoken or casually rewritten. Those lines are held.

## Voice keeping — plain facts

The YouTube demo John pointed at (AssemblyAI + Gradio + ElevenLabs) clones the speaker’s voice into other languages. Google Cloud **Chirp 3 Instant Custom Voice** can do something similar, but:

- Instant Custom Voice does **not** list Hebrew (`he-IL`).
- Language transfer from an `en-US` clone only covers German, Spanish, French, and Brazilian Portuguese — not Hebrew.

So ALEF cannot honestly keep “your own voice” in Hebrew with that Google feature today. It falls back to the closest **Chirp 3 HD** stock voice by estimated pitch / gender, and the API says so in `voice_mode`. Gemini 3.5 Live Translate (public preview) can preserve intonation across 70+ languages including Hebrew; it is **not** wired in yet because this project may not be allowlisted and the spend cap must stay under $100.

John has an ElevenLabs account (almost at its credit limit as of 21 October 2026) and a Hugging Face token, which could help later if he wants true voice cloning. Those keys are not used here.

## Backend

Python service in `tools/translator/`:

- `server.py` — FastAPI, `GET /v1/health`, `POST /v1/talk` (JSON or multipart audio).
- `app.py` — Gradio demo (microphone or type).
- `pipeline.py` — Google Speech-to-Text (`en-US` + `he-IL`), Cloud Translation v2 (the same engine as Google Translate), Cloud Text-to-Speech (Chirp 3 HD, with a WaveNet/Neural2 fallback).
- Secrets are environment variables only (see `/workspace/shared/secrets/google-tts.env` and `vertex.env` on the build machine). Nothing is committed.

```bash
pip install -r tools/translator/requirements.txt
# set GOOGLE_TTS_API_KEY and GOOGLE_CLOUD_PROJECT
uvicorn tools.translator.server:app --host 0.0.0.0 --port 8080
# optional demo
python tools/translator/app.py
```

Point the web app at the service with one of:

- `localStorage.alefTranslatorUrl = "https://your-service"`
- a `<meta name="alef-translator-url" content="…">` tag
- `window.ALEF_TRANSLATOR_URL`
- `?translator=` on the hash query

The Talk screen is lazy-loaded so the first-install precache budget (3.95 MiB) is unchanged.

## Spend

John authorised up to **US$100** of Google Cloud. Every call is estimated in `tools/translator/SPEND.md` and `/workspace/shared/al-heb/overnight-2026-11-10/translator/SPEND.md`. The service stops at **$90**.

## Backtest

`python tools/translator/backtest.py --text-only` then `--audio` for the full 100 (50 English→Hebrew and 50 Hebrew→English). Results: `docs/review/TRANSLATOR-BACKTEST-2026-11-10.md`. The commercial bar is **92/100**. Translation is benchmarked against Google Translate (same API engine) and against a phrasebook reference.

## Render (proposal only — do not deploy without John)

See `tools/translator/render.yaml`. A private or web service would take `GOOGLE_TTS_API_KEY` and `GOOGLE_CLOUD_PROJECT` from the Render dashboard, not from the repo.

## Camera follow-on

A `#/camera` “translate the sign on the photo” feature (Vision OCR + overlay) shares this stack and the same spend cap. Spec: overnight FABLE-2. Built after the first green translator backtest.
