# Traditions lane

What it is: an explorer that shows one prayer line or word in the app's settings (Israeli, American synagogue = `sephardi` values per CONTRACT, Ashkenazi), a per-sound table with sources and confidence, a "Which should I learn?" guide, a "Hear the difference" drill, and a source list. Yemenite and other Mizrahi readings appear only as an "also exists" note.

Files: `src/traditions/model.js` (pure helpers), `src/traditions/traditions.view.js` (`mount(root, ctx)`), `data/traditions/{sounds,guide,sources}.json`, `tests/traditions.*.test.js`, `docs/traditions/SEPHARDI-DECISION.md`, `docs/traditions/preview.html` (dev-only harness; serve the repo root and open it), screenshots at 390px in `docs/traditions/shots/`.

Read-only inputs: `data/pronunciation/*` (IPA, hand-written prayer-word respellings), `data/corpus/registry.json` (the 70 texts), `src/pronunciation/transliterate.js`, `data/audio` via `ctx.audio`.

Honesty rules the screen follows
- No audio exists. Play buttons appear only when `ctx.audio` reports a real clip for exactly that setting; a stand-in clip is labelled; otherwise "No audio yet". The Web Speech fallback is never offered (it reads Israeli Hebrew only).
- The engine writes `israeli` and `sephardi` identically, so the American-synagogue card says so and lists the English-speaker habits instead of inventing a different respelling.
- Every sound row has a confidence label (high, medium, low) and source ids. Rows resting only on project inference are never "high" (tested).
- Facts are paraphrased from Wikipedia (CC BY-SA 4.0, cited), Pealim, Chabad.org and the Benor and Cohen survey (not open licensed, cited by URL only). Fetch dates and how much of each page was read are in `sources.json`.
- Not covered because no source was read: tsadi and tet variants, emphatic consonants, kamatz katan rules, Tel Aviv-specific speech, trope.

Draft notices: the view shows the draft banner on every tab; `proofread` is not claimed anywhere.
