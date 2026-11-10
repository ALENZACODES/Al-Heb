# Talk

Talk (`#/talk`) turns a short everyday line from English into Hebrew or from Hebrew into English. It runs on the learner's device. The site stays a static site: there is no server, no key and no outside translation service on the learner's path.

## What It Is

Talk answers in two steps.

1. **Stored lines first.** A phrase memory with sentence patterns on top. It knows travel, shop, table, emergency and synagogue talk. Its wording is fixed and its gender and number forms are right, so it is trusted over anything else.
2. **A language pack for the rest.** Two small translation models, one for each direction, that run in the browser on the learner's device. They are not part of the first install. The learner adds a pack on the Talk screen; after that it works offline. Without a pack, a line the stored lines do not hold is refused as before, and the screen offers the pack.

Every answer carries a label that says how it was made.

| Label | Meaning |
|---|---|
| A stored line | An exact line from the stored sentence pairs. |
| Built from a sentence pattern | A stored frame such as "Where is …?" with a known noun, place, name or number slotted in. |
| The closest stored line | A stored line that differs from the request only by small words such as "here" or "very". The matched line is shown. Only used when the pack is not on the device. |
| A single word | One noun from the Talk list, or one dictionary word. |
| Word by word | Hebrew read one word at a time from the dictionary. Shown as a gist, not as a sentence. Only used when the pack is not on the device. |
| Translated on this device | A line from the language pack. The note under it says it is not from a checked line. |

A line that differs from a stored line by a real word is never matched to it. "I don't eat fish" is not answered with the stored "I don't eat meat".

## The Language Packs

| Pack | Download | Model | Licence |
|---|---|---|---|
| Hebrew to English | 77.2 MiB | OPUS-MT Tatoeba heb-eng, `opus-2021-02-19` | Apache-2.0 |
| English to Hebrew | 78.6 MiB | OPUS-MT en-he, `Helsinki-NLP/opus-mt-en-he` | Apache-2.0 |
| Runtime, shared by both | 14.2 MiB | onnxruntime-web 1.31.1, WebAssembly build | MIT |

- **Where they live.** `assets/vendor/_nmt/` and `assets/vendor/_ort/`, files of the site itself. Nothing is fetched from another address, and the site's content policy is unchanged.
- **Not in the first install.** `tools/build-precache.mjs` skips `assets/vendor/`. The first install is still under 3.95 MiB. `tests/talk.nmt.test.js` checks both.
- **Download.** On request only, in parts of at most 16 MiB. The screen shows the size before the download, a progress bar and megabytes during it, and a line about Wi-Fi. On mobile data or with data saving on, the first press only warns and the second press downloads. A stopped download carries on from the parts that arrived.
- **Checked.** Every part is checked against the size and SHA-256 in `assets/vendor/_nmt/manifest.json` before it is kept.
- **Kept.** In its own cache, `alef-talk-pack-v1`, which an app update does not clear. `sw.js` serves these files from that cache and never copies them into the per-version cache. "Remove The Packs From This Device" on the Talk screen deletes them.
- **Where it runs.** In a worker, so the page stays responsive, on WebAssembly with one thread. A line takes about 0.3 to 0.6 seconds on the desktop used for testing. It has not been timed on a phone.
- **Size.** The stock export of these models is about 143 MiB a direction at 8 bits because the 60,000-row word table is stored three times. `tools/talk/nmt/export.py` stores it once, with one scale per row, and splits the model into three graphs. On the held-out file the 8-bit packs score within one point of the full-precision models (greedy decoding, first-choice wording: 69.8 against 70.0 Hebrew to English, 79.9 against 80.8 English to Hebrew).
- **Synagogue words.** `data/talk/terms.json` lists words the packs get wrong (כיפה as "dome", קידוש as "sanctification") with the wrong renderings, found by `tools/talk/nmt/terms.mjs`. A rendering is replaced only when the source line holds the word and the output holds that exact rendering. Words with a second everyday meaning are left out.

## The Graphics Card (WebGPU)

The encoder and decoder can run on the device's graphics card. The word table stays on the processor.

- **No second download of the weights.** A graphics card runs floating-point graphs; the pack is 8-bit. Each direction has two small graph files (`encoder.gpu.onnx`, 114 KB, and `decoder.gpu.onnx`, 124 KB) that hold the wiring only. Every weight in them points at the byte range where the same weight already sits inside the 8-bit file, and is turned into floats as the graph loads (`tools/talk/nmt/gpu_graph.py`). The repository grew by the runtime, not by a second copy of the models.
- **What a graphics-capable browser fetches.** The runtime that can use the card (27.5 MiB in two parts; it also runs the ordinary way) in place of the 14.2 MiB one, plus the two small graphs: about 14 MB more. A browser with no adapter, or only a software stand-in, fetches the ordinary files.
- **It has to prove itself on each device.** The processor way is ready first, so nobody waits. The card is then tried once in the background on two check lines. It is used only if both answers match the recorded ones and the second comes back within 1.5 seconds. The outcome is remembered with the pack. `src/talk/nmt/worker.js`.
- **Quality.** On the held-out file the float graphs score the same as the 8-bit ones to within a point (greedy, first-choice wording: 70.6 and 70.6 Hebrew to English, 83.6 and 82.6 English to Hebrew).
- **What was tested.** Headless Chromium with a software adapter, under the site's content policy: the files load, the answers match, a line is answered on the card when the slow adapter is accepted for the test, and the slow adapter is otherwise turned down (about 20 seconds a line against half a second on the processor). `tests/talk.nmt.browser.test.js`; the graphs also run on the processor in `tests/talk.nmt.test.js`.
- **What was not tested.** Any real graphics card. Whether it is faster than the processor for lines this short is not known; small models often are not. "Check Translation Speed" on the Talk screen times both ways on the device and says which is in use.

## Where The Lines Come From

| File | Use |
|---|---|
| `data/talk/pack.json` | 311 sentence pairs with their English wordings, 234 nouns with gender and plural where needed, 62 to-forms, 24 places, 40 names and the numbers 0 to 100. Written for this project. Not yet checked by a native speaker. |
| `data/corpus/phrasebook.json` | The 204 phrasebook lines. |
| `data/curriculum/dialogues.json`, `data/israel/scenarios.json` | Dialogue lines and the natural option of each scene. |
| `data/vocab/index.json` | The dictionary index. Fetched only when a line needs it. Only a word's first meaning is used, only for nouns inside a pattern or for a single word, and the answer is always marked low. Dictionary glosses are never strung into a sentence. |

## What The Patterns Cover

- Where is, how do I get to, how long does it take to get to, turn left or right after or at.
- I want, I need, we want, we need, can I have, do you have, is there, how much is, I lost my, I am looking for, I don't eat, I don't drink, thank you for.
- To-forms after want, need, can I and where can I ("I want to pay", "Where can I park?"). A to-form that cannot take a thing refuses one.
- Counted things with the right number form ("two beers", "three rooms"), money ("It costs twenty shekels"), clock hours, "in ten minutes", a table or a reservation for a number.
- Open, closed and late with the noun's gender ("When does the store close?").
- Things joined by with, without, and, of, to a place, outside, inside, in English.

## Lines As They Are Heard

Speech recognisers drop the article, swap near words and sometimes return a non-word. The engine allows for three of these and no more.

- A dropped article: "איפה בית חולים" is read as "איפה בית החולים".
- A known swap that keeps the request the same: "ניפגש" for "נתראה", "שמאל" for "שמאלה", "תתקשר" for "תתקשרו".
- One word that is not a word, within one letter of a stored line (two letters for long words): "שקיד" is read as "שקית". The screen shows the correction.

A misheard word that is itself a real word is a different request. It is translated as heard or refused. "בלי ביצים" stays "No eggs" even if the speaker said "בלי בצל".

## Code

| File | Role |
|---|---|
| `src/talk/engine.js` | The stored-line engine. Pure functions. |
| `src/talk/hybrid.js` | Stored lines first, the pack for the rest. |
| `src/talk/nmt/tokenizer.js`, `decode.js`, `runtime.js` | Splitting a line into word pieces, the beam search, and the three graphs put together. The same code runs in the browser and in the Node scoring tool. |
| `src/talk/nmt/pack.js`, `client.js`, `worker.js` | Download, checking and keeping of the pack files; the page's side; the worker. |
| `src/talk/nmt/postedit.js` | What is done to a pack line before it is shown: the Name, the term list, stray dashes. |
| `src/talk/data.js` | Loads the stored lines and builds the engine. |
| `src/talk/speech.js` | Listening through the browser's own speech recognition. |
| `src/talk/talk.model.js` | Settings, history, the sacred-Name hold, scoring helpers. |
| `src/talk/talk.view.js` | The screen. |
| `tools/talk/nmt/` | `export.py` builds a pack from a checkpoint, `pack.mjs` splits it and writes the manifest, `terms.mjs` builds the term list, `score.mjs` scores a held-out file, `e2e-talk.mjs` runs the screen in a real browser. |

## Listening And Voice

Listening uses the browser's speech recognition. ALEF uploads nothing itself. Some browsers send the sound to the browser maker to turn it into text; the screen says this beside the buttons, and the privacy page lists it. Browsers without speech recognition get typing only, with a sentence that says so. Typing works offline once the screen has been opened.

The translation is read by the device voice and labelled as the device voice. Speaking the translation in the learner's own voice is not built. The screen calls it a future feature.

## Who Is Speaking

Hebrew "I" forms change with the speaker (a man says צריך, a woman צריכה). The screen shows the man's form with the woman's beside it, or the learner picks who is speaking. Lines said to one person also show the form said to a woman.

## The Sacred Name

A line that holds the four-letter Name, in Hebrew or in English letters, is held. It is not translated, not reworded, not sent to the pack, not read aloud and not saved to history. Where the line is shown back, the Name is shown as ה׳.

If a pack ever writes the Name in a translation, it is shown as ה׳ (with its prefix kept: לה׳), and a line that shows ה׳ is never handed to a voice. `src/talk/nmt/postedit.js`; `tests/talk.nmt.test.js`.

Whether a held line should instead be translated with ה׳ in place of the Name is the owner's decision and is not built.

## Stored On The Device

`talk.history` keeps the text of the last 60 lines. `talk.settings` keeps the choices on the screen. Both go through the app store, so backups include them. No sound is stored.

## Scores

### The Held-Out File

`tests/fixtures/talk.heldout.json` holds 240 lines, 120 each way, over travel, food, shopping, health, hotel, small talk and synagogue life. It was written before a model was chosen. No line is a stored line, none is in an older test file, and none was used to change the packs, the stored lines or the patterns. (26 lines of the first draft turned out to be stored lines or in older files; they were replaced with new lines before the final run.) The term list was built after a first look at the results and changed the score by a tenth of a point.

Two scores are given, because they answer different questions.

- **First-choice wording.** The house score against one reference: 1 for an exact match after normalizing, otherwise 1 minus the word error rate. A correct answer worded differently loses points ("Where's the elevator?" against "Where is the elevator?" scores 0.75).
- **Accepted wordings.** The best house score over the reference and the other correct wordings written with it (up to about ten a line), with English contractions opened. The other wordings were written before any output was seen and none was added afterwards.

Shipped code and shipped packs, WebAssembly, beam of 2 (`node tools/talk/nmt/score.mjs tests/fixtures/talk.heldout.json`):

| What answers | First-choice wording | Accepted wordings | Refused |
|---|---|---|---|
| Stored lines only (no pack on the device) | 5.0 | 5.5 | 224 of 240 |
| Stored lines first, then the pack (what the screen does) | 77.3 | 94.4 | 0 |
| The pack alone | 77.0 | 94.4 | 0 |

| Direction, stored lines then pack | First-choice wording | Accepted wordings |
|---|---|---|
| English to Hebrew (120) | 84.7 | 97.9 |
| Hebrew to English (120) | 69.9 | 90.8 |

Against the bar of 92: the accepted-wordings score is above it, the first-choice score is not, and Hebrew to English is below it on both counts taken alone. Which of the two scores the bar means is the reviewer's call.

Read line by line by the builder (not a native speaker), about 11 of the 240 lines came out with a wrong meaning, 8 of them Hebrew to English: "These shoes are too small for me" became "I don't have any of those shoes", הכדור (the pill) became "ball", חצי קילו became "a pound", החשבון (the bill) became "the math", חלות לשבת became "Saturday nights", שנה טובה ומתוקה became "Happy New Year, sweetheart". English to Hebrew: "services" (prayers) became שירותים, and "the Torah portion of the week" was put word for word. The recorded lines are in `tests/fixtures/talk.heldout.results.json`.

Not measured: real speech, a phone, and a native speaker's judgment of any line.

### The Older Files (Stored Lines Only)

`tests/talk.engine.test.js` scores the stored-line engine alone on four files.

| File | Lines | Score | Refused | What it shows |
|---|---|---|---|---|
| `tests/fixtures/talk.utterances.json` | 100 | 96.3 | 0 | The pack of stored lines was written with these lines in view. A regression check. |
| `tests/fixtures/talk.fresh.json` | 60 | 95.5 | 1 | Written after round 1 and since used to widen the stored lines. A regression check. |
| `tests/fixtures/talk.fresh2.json` | 75 | 88.4 | 7 | Written during round 2 and then used to add patterns. A regression check. |
| `tests/fixtures/talk.fresh3.json` | 40 | 74.4 | 10 | Written at the end of round 2. No line from it was added. |

## Scoring The Shipped Engine From A Speech Review

`tools/talk/translate.mjs` runs the engine as the screen does, with no network. A speech review can synthesize a line, transcribe it with any recogniser, and pass the transcript through it.

```
node tools/talk/translate.mjs "Where is the hotel?"
node tools/talk/translate.mjs --jsonl < transcripts.jsonl > results.jsonl
node tools/talk/translate.mjs --score tests/fixtures/talk.fresh3.json
```

Each line of `transcripts.jsonl` is `{"id": "...", "direction": "he-en", "text": "<transcript>", "reference": "<expected>"}`. Refusals come back with `ok: false` and score 0.

## Not Built

- A timing of the graphics-card path on a real graphics card. See "The Graphics Card" above.
- A test on a phone: speed, memory with both packs loaded, and what the browser does with a 90 MB cache when space runs low.
- A native speaker's check of the stored lines, the term list and the held-out references.
- Speaker forms for pack lines. A pack line comes out as said by and to a man unless the English says otherwise; the screen says so.
- Playing the recorded phrasebook clips for stored lines. Today every line uses the device voice.
