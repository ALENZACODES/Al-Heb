# Photo feature: translation (he -> en) status, optional local path, open question (Lane 6)

## What the user sees today
- Default: **no translation**. The scan screen says "Translation unavailable offline" once at the top and once under every Hebrew line that has no English. Nothing is sent anywhere to try.
- Prayer lines that match the built-in corpus show the corpus translation (labelled `corpus translation`) when the corpus has one. Everything else is blank.
- Why: the only he->en engine measured here (Argos Translate, 30 phrases, token F1 0.53) needs a ~132 MB model and Python; it is not a sensible browser download. See BENCHMARK.md.

## Optional path: local helper (built, tested only on this machine, never on a phone)
1. Install Python, `pip install argostranslate`, and the he->en package (see docs/TOOLING.md for what was installed here; the Argos model licence is UNVERIFIED).
2. From the project folder run `node tools/ocr-server.mjs` (binds 127.0.0.1:8787; CORS only for localhost origins).
3. In the Scan screen open "Translation: off. How to turn it on", enter `http://127.0.0.1:8787`. Only loopback addresses are accepted (`isLocalHelperUrl`), so a typo cannot send text to a third party.
4. Only the recognised Hebrew text goes to the helper (never the photo, unless `useLocalOcr` is set in code). Output is always labelled `machine translation`; it is weak on single words (repeats, wrong senses).
Untested: an HTTPS-hosted copy of the app calling http://127.0.0.1 (Chrome treats loopback as secure; Safari may block it as mixed content). A phone cannot reach a laptop's 127.0.0.1.

## Open question: a cloud translation option
Not built, deliberately. Options (Google Cloud Translation, Microsoft Translator, others) all need an API key, would send the recognised text (and possibly identify the user) to a third party, and have unverified free tiers and terms. A key cannot be embedded in a static, zero-backend app without being exposed; it would need a small proxy we do not have. Decisions needed from a human: (a) is any cloud call acceptable in a learning app, (b) who pays and holds the key, (c) opt-in wording. Until decided: the app offers no cloud translation and **no image is ever sent anywhere by default** (the only off-device call in the app is the opt-in Dicta vowelizer, which sends recognised text, not the photo).
