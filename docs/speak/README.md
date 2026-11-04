# Say it (draft, unreviewed)

Spoken practice for ALEF. Closes the "no speaking exercise at all" gap in `docs/strategy/DUOLINGO-100.md` (items 6, P044,
P045, P047) as a draft. Route wiring: `docs/speak/ROUTES.md`. Store key: `speak.v1`.

## What it does

- **Say it** (`#/speak`): shows a word or phrase (pointed Hebrew, transliteration, English) from one of 60 sets, plays the model
  pronunciation, then captures the learner's attempt in one of three ways, picked from what the browser offers and the learner's
  choice (radio group, saved):
  - `asr`: the browser's `SpeechRecognition` with `lang = 'he-IL'`, up to 5 alternatives, 10 s timeout. The best alternative is
    compared with the target after stripping niqqud, cantillation and punctuation, folding final letters and ignoring vav/yod
    (so the recognizer's full spelling בוקר matches the list's pointed בֹּקֶר). Verdict: match / close (>= 70% letters) / miss.
    A miss or close still lets the learner self-judge.
  - `record`: `MediaRecorder` (up to 6 s), plays back in an `<audio controls>`, then "I said it / Not yet". Object URLs are revoked
    on unmount; nothing leaves the page.
  - `self`: "I said it / Not yet" only.
- **Listening drills** (`?tab=drills`): bet/vet, het/khaf, kamatz (a vs o), shin/sin. 130 items built from existing words; 19
  true minimal pairs (kamatz vs cholam, e.g. אֵיפֹה / אֵיפָה) and 4 for shin/sin (שָׂם / שָׁם); the rest are "which sound is the
  marked letter" items whose answer is read from the source niqqud. het/khaf is labelled a spelling check, because Israeli
  Hebrew and the browser voice say both the same.
- **History** (`?tab=history`): by-day totals, recent attempts, and a weakest-sounds report by letter class (from an edit-distance
  alignment of target vs recognized letters, plus drill answers). A class is ranked after 3 tries.

## Model audio

`ctx.audio.has('word', audioId)` is checked first (audioId = the manifest word id with the same pointed text; 0 clips exist, so
this is never true today). Otherwise the browser's `speechSynthesis` speaks the pointed text with `lang he-IL`, and the status
line says it is the browser's voice, not a recording. If the browser lists no Hebrew voice the start screen says so.

## Honesty notes (also shown on screen)

- Draft flag on every start screen: words, points and transliterations are machine-built, not teacher-checked.
- The recognizer is the browser's and is **unverified for Hebrew by ALEF**; no accuracy was measured. A "match" means the
  recognizer wrote the same letters, not that a teacher heard the learner.
- The browser's recognizer may send audio to its vendor's servers (Chromium does); ALEF sends nothing. Nothing starts until the
  learner presses the microphone button.
- The weakest-sounds report counts recognizer output, so a weak sound may be the recognizer's weakness.

## Data

`node src/speak/build.mjs` rebuilds `data/speak/` from `data/vocab/words.json`, `data/vocab/packs.json` and the audio manifests:
60 sets (12 survival packs, then one pack per theme, up to 12 items each, most frequent first), `sets.json` index, `pairs.json`.
No Hebrew is composed by the script.

## Not done / needs a human

- No browser run: the view is tested with a fake DOM and fake recognizer/recorder only (`tests/speak.test.js`). Real microphone
  permission flows, Safari's webkit prefix behaviour and the he-IL recognizer's accuracy are untested.
- No recorded clips, so the drills depend on the browser voice, which may misread kamatz katan.
- Native review of the 712 set items and 130 drill items.
- Route, nav string and precache entries (shell owner).
