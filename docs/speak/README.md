# Say it (draft, unreviewed)

Spoken practice for Aleph. Closes the "no speaking exercise at all" gap in `docs/strategy/DUOLINGO-100.md` (items 6, P044,
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

## Daily card (for the Today card)

`src/speak/daily.js` exports a pure card model for the home owner:

- `buildDailyCard({ date, pool, attempts, n = 5 })` (pure; `date` is a local `YYYY-MM-DD` key) returns
  `{ kind: 'speak-daily', id: 'daily:<date>', date, title, items[5], weakSounds[], progress: {done, total}, complete, href: '#/speak?daily=1', note }`.
  Each item is `{ id, he, translit, en, kind, audioId, set, reason }` (`reason`: "new for today", "try again", or "works on <sound>").
- `loadDailyCardFromStore(ctx, nowMs)` reads `speak.v1` from `ctx.store`, loads the day's pool (3 sets, moving on each day, from
  `data/speak/sets/`) and returns the card, or `null` if the data cannot load. `loadDailyCard({ date, state })` is the same without the store;
  `dayKeyLocal(ms)` makes the date key.
- Choice: with no history it rotates by date. With history, items whose letters fall in a weak sound class (3+ tries, from the
  weakest-sounds report) score higher, items last marked "not yet"/missed come back, and items said successfully today or yesterday are
  pushed down. The four-letter divine name is never offered. "Weak" rests on an unverified recognizer and drill answers; the card carries that note.
- Progress counts Say it attempts stored under `daily:<date>`. The Say it screen lists "Today's five" first when it can build the card;
  `?daily=1` preselects it. Doing it does not change the remembered set.

## Model audio

`ctx.audio.has('word', audioId)` is checked first (audioId = the manifest word id with the same pointed text; 0 clips exist, so
this is never true today). Otherwise the browser's `speechSynthesis` speaks the pointed text with `lang he-IL`, and the status
line says it is the browser's voice, not a recording. If the browser lists no Hebrew voice the start screen says so.

## Honesty notes (also shown on screen)

- Draft flag on every start screen: words, points and transliterations are machine-built, not teacher-checked.
- The recognizer is the browser's and is **unverified for Hebrew by Aleph**; no accuracy was measured. A "match" means the
  recognizer wrote the same letters, not that a teacher heard the learner.
- The browser's recognizer may send audio to its vendor's servers (Chromium does); Aleph sends nothing. Nothing starts until the
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

## Speaking Studio (`#/speak-studio`, CODER-100 G1-G10)

View `src/voice/voice.view.js`, model `src/voice/voice.model.js`, journal storage `src/voice/journal.js`. Lazy route (`src/voice/` is on demand).
Lines: every service line Aleph holds (`src/service/practice.model.js serviceLines`), the name shown as ה׳. Store key `voice.v1` (`{ratings, days, goal}`).

- Record and Compare (G1): play the model clip, record yourself (the same `createRecorder`), play yours, and see both waveforms side by side
  (Web Audio `decodeAudioData` on the app's own clip file and your take; peaks only). No score: the page says the shapes show loudness over time.
- Rate Yourself (G3): vowels, stress, fluency, 1-3 each, labelled "Self-assessment: your own rating, not a score from Aleph"; a by-week table.
- Machine Check (G5): only where the browser has a speech recognizer (`createRecognizer`, he-IL). Shows "The machine heard: X. The line is: Y.
  A machine guess, not a grade." No server or key of Aleph's; the page repeats that the browser itself may send the sound to its maker.
  Without a recognizer it says there is no machine guess here.
- Shadowing (G2): model, a silent turn of the clip's measured length times 1x / 1.25x / 1.5x / 2x (1 to 20 seconds), the model again; 1-3 rounds.
  Only for lines with a clip file.
- Pronunciation Gym (G6): five lines from your own latest ratings, lowest on your weakest axis first; empty until you rate something.
- Fluency (G8): Timed read-aloud reads (`timedread.v1`, read only) by week: median words per minute and self-reported stumbles per 100 words.
  Labelled "not pronunciation accuracy". Timed read-aloud itself is unchanged.
- Speaking Days (G9): days with a recording here or a recorded Say it attempt; a streak separate from the main streak; weekly goal 1-7 days.
- Voice Journal (G10): takes you choose to keep go to IndexedDB (`alef-voice-journal`, up to 200), dated, per passage, oldest first with week
  numbers; play one, play all in order, delete. Nothing is uploaded.

## Record and compare: blind check (G4)

`#/record-compare` gains a blind check once both takes exist: one of your two recordings plays at random and you say which word it was.
Counts only (`recordcompare.blind.v1`), no audio stored; labelled a self-check of your own takes.

`src/speak/recognizer.js` `createRecorder().stop()` now also returns the take's `blob` (for the journal); nothing else changed there.
