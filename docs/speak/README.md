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
- **Sounds by tradition** (`?tab=sounds`): reads `data/speak/minimal-pairs.json` (pronunciation lane, rule-generated, unreviewed). The tradition
  defaults to Settings `congregation` and can be changed on the screen. For each contrast it says how many listed pairs sound different
  and how many sound the same in that tradition (e.g. kamatz/patach: none in Israeli, all in Ashkenazi), lists the pairs with
  sound-spellings, and offers a quiz on the pairs that do sound different. The browser voice reads Israeli pronunciation only, so
  the quiz plays audio for Israeli and shows the printed sound-spelling for the others.
- **Read a prayer aloud** (`?tab=read`): 8 short prayers (`data/speak/prayers.json`: shema-2, hamotzi, kiddush-wine-1, candle-shabbat,
  modeh-ani-1, torah-barchu, oseh-shalom, shehecheyanu), lines copied verbatim from `data/corpus/registry.json`. Line by line the
  recognizer's text is aligned word by word with the printed line (letters only, vav/yod tolerant); words not heard are underlined
  (wavy = not heard, dotted = close) and listed as text. Falls back to record-and-self-judge, then "I read it / Not yet". The screen
  warns that the recognizer expects modern Israeli pronunciation.
- **Shadowing** (`?tab=shadow`): listen (recorded line clip if one exists, otherwise the browser voice, with a slow option), say it,
  optionally record and play back, then rate yourself 1-3. Stored as kind `shadow` with `rating`.
- **History** (`?tab=history`): by-day totals, recent attempts, words missed most when reading aloud, and a weakest-sounds report by letter class (from an edit-distance
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
- Sub-page route entries and nav strings are optional (`docs/speak/ROUTES.md`); precache entries (shell owner).
- Read-aloud accuracy for Sephardi/Ashkenazi reading styles, and for long lines (the recognizer waits up to 20 s), is untested.
- The tradition pairs are rule-generated by another lane from draft vowel points; the sound-spellings are not heard by anyone.
