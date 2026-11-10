# Google Cloud API probe — 10 November 2026

Checked whether the Vertex project's credentials already on this machine (API keys in `vertex.env`, `google-tts.env`, `gemini.env`) can call Cloud Translation v3 or Speech-to-Text v2 **without John**. No service account JSON and no Application Default Credentials are present. `gcloud` is not installed. **No APIs or billing were enabled.**

## Result

- Cloud Translation v3: **no**. API-key calls return 401 (OAuth / service account required). The TTS key is also restricted: Translation v2 returns 403 "method blocked".
- Speech-to-Text v2: **no**. The TTS key returns 401; the Gemini/Vertex API key returns 404 or 401. Speech-to-Text is not usable with the keys we have (and was previously observed as not enabled).
- Cloud Vision: **no**. 401 with the Gemini/Vertex key (and previously 403 not-enabled with the TTS key).
- Gemini API (generativelanguage): **yes**. This is the working path for text translation, audio transcription, and vision OCR.

Full status codes (no secrets): `/workspace/shared/al-heb/overnight-2026-11-10/translator/api-probe.json`.

Because v3 and Speech v2 cannot be called, the 100-utterance speech backtest uses Google Chirp 3 HD TTS + Gemini audio transcription + Gemini translation, not Cloud STT or Cloud Translation. Scores are therefore meaning-aware against the phrasebook, not a same-engine Google Translate comparison.
