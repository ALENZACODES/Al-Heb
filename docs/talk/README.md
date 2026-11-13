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

## The Tools Repository

Since 12 November 2026 the pack code lives in the tools repository, [ALENZACODES/alef-tools](https://github.com/ALENZACODES/alef-tools), in `packages/translate`: the tokenizer, the decoding loop, the runtime, the worker, the page's side, the mapping of the Talk pack list onto the shared loader, the pack builder and the scoring tool. The app carries a copy of that package's `dist/` at a pinned commit, beside the shared loader.

- **Where the copy is.** `assets/vendor/_alef-tools/translate@0.1.0/`, 9 modules, 32.9 KB (12.8 KB gzipped). `data/alef-tools.lock.json` names the commit and every file's SHA-256. `node tools/alef-tools/sync.mjs --from <alef-tools checkout> --ref <commit> --add translate` refreshes it; `--check` proves every file is the pinned one, and `tests/talk.memory.test.js` runs that check.
- **Old paths still work.** `src/talk/nmt/tokenizer.js`, `decode.js`, `runtime.js`, `worker.js`, `pack.js` and `client.js` are now short wrappers around the vendored modules. None of them names a version: `src/talk/nmt/tools.js` reads the folder from the file the sync tool writes. `pack.js` still says where this app keeps its packs. `postedit.js` (the Name, the term list) stays here.
- **Not in the first install.** The first install is the same 357 files, byte for byte, as before this change. The vendored code and the wrappers are fetched when Talk or Camera first opens.
- **The builder.** `tools/talk/nmt/export.py` and `gpu_graph.py` are kept here as they were. The copies in the tools repository are the ones to use from now on; they also build the larger model.

## The Sentence Memory

`data/talk/tm/` holds 885 Hebrew sentences of the app (lessons, little books, the Israel course, games) with one English line each. A Hebrew line that is one of them is answered from there, with or without a pack, on Talk and on the Camera Translator. The label is "A lesson sentence".

- **Where the English comes from.** 876 lines carry the English the app already gives that sentence. 9 lines had none; they were translated ahead of time with the high-quality pack's model and passed every check. Their note says a person has not checked them yet.
- **The checks.** Shape, numbers, person, singular and plural (using the number forms and noun plurals of `data/talk/pack.json`); for the translated lines also a round trip through the English to Hebrew model and agreement with the ordinary pack. 33 lines failed and are listed in the tools repository, `review/tm-needs-human.json`, for a person to settle. They are not in the app.
- **Left out.** Any line with the four-letter Name (118), scripture and prayer lines (42), and the vocabulary's example sentences, which come from Tatoeba and need a credit each.
- **Size.** Four unit files, the largest 27.7 KiB, and an index of 5.5 KiB. Nothing is fetched until a Hebrew line is looked up; then the index, and a unit only when the index says the line is in it. All of it comes from the site itself.
- **What it did to the scores.** Nothing: no line of the test files is a lesson sentence. It helps a learner who types or photographs a line from a lesson.

## The High-Quality Pack

A second Hebrew to English pack, built from `Helsinki-NLP/opus-mt-tc-big-he-en` (CC BY 4.0, revision `134c5a85`), 237.6 MiB in 17 parts of at most 16 MiB.

- **Where it stands.** Built and scored. It is **not on the pack host yet**, so the app does not offer it: `data/talk/pack-host.json` lists it part by part with sizes and SHA-256 and `"published": false`. Putting the files on the host and setting that to `true` turns it on. Until then the app asks the host for nothing.
- **Who is offered it.** Only a browser with a real graphics adapter, on the Talk screen, with its size shown first. When it is on the device it answers Hebrew to English lines on Talk and on the Camera Translator in place of the ordinary pack.
- **Both ways of running.** The 8-bit graphs on the processor and the graphics-card graphs run on the processor give the recorded check lines under Node. A real graphics card has not been tried. On the processor a line takes about 0.9 seconds on the two-core test machine, twice the ordinary pack.
- **Credit.** Its credit line is in the pack list (`data/packs/catalog.json`, from the tools repository's `models.manifest.json`). The Credits page prints the credit lines of the packs a learner can download, so it appears there the moment the pack is published.

### Scores With It

`node tools/talk/nmt/score.mjs <file> --hq <packs dir>`, stored lines first, then the memory, then the pack; WebAssembly, beam of 2. chrF is the character n-gram score (the arithmetic of sacreBLEU's chrF2).

| File | Lines | First-choice wording, before / after | Accepted wordings, before / after | chrF, before / after |
|---|---|---|---|---|
| `talk.utterances.json` | 100 | 96.3 / 96.3 | 96.5 / 96.5 | 93.8 / 93.8 |
| `talk.fresh.json` | 60 | 96.6 / 96.6 | 97.0 / 97.0 | 93.5 / 93.5 |
| `talk.fresh2.json` | 75 | 94.6 / 94.6 | 94.9 / 94.9 | 91.8 / 91.8 |
| `talk.fresh3.json` | 40 | 91.5 / 91.5 | 91.5 / 91.5 | 90.1 / 89.9 |
| `talk.heldout.json` | 240 | 77.3 / 81.0 | 94.4 / 96.3 | 76.6 / 80.1 |
| held-out, Hebrew to English | 120 | 69.9 / 77.4 | 90.8 / 94.6 | 69.7 / 75.4 |
| held-out, English to Hebrew | 120 | 84.7 / 84.7 | 97.9 / 97.9 | 87.1 / 87.1 |

"Before" is the app with the two ordinary packs. Without the high-quality pack nothing changes, so the held-out file stays at 77.3 on first-choice wording. English to Hebrew is the same pack as before. On `talk.fresh3.json` one Hebrew to English line is worded a little further from its reference with the larger pack (chrF 90.1 to 89.9; the house scores are the same). The recorded lines are in `tests/fixtures/talk.heldout.results.hq.json`.

The packs alone, without the stored lines, on the Hebrew to English half of each file (first-choice wording, ordinary / high-quality): held-out 70.0 / 77.5, fresh3 83.3 / 86.7, fresh2 76.0 / 79.3, fresh 69.1 / 63.1, utterances 67.6 / 65.7. On the two oldest files the larger pack words short stored-style lines further from the reference; the screen answers those from stored lines, so they do not reach a pack.

## The Graphics Card (WebGPU)

The encoder and decoder can run on the device's graphics card. The word table stays on the processor.

- **No second download of the weights.** A graphics card runs floating-point graphs; the pack is 8-bit. Each direction has two small graph files (`encoder.gpu.onnx`, 114 KB, and `decoder.gpu.onnx`, 124 KB) that hold the wiring only. Every weight in them points at the byte range where the same weight already sits inside the 8-bit file, and is turned into floats as the graph loads (`tools/talk/nmt/gpu_graph.py`). The repository grew by the runtime, not by a second copy of the models.
- **What a graphics-capable browser fetches.** The runtime that can use the card (27.5 MiB in two parts; it also runs the ordinary way) in place of the 14.2 MiB one, plus the two small graphs: about 14 MB more. A browser with no adapter, or only a software stand-in, fetches the ordinary files.
- **It has to prove itself on each device.** The processor way is ready first, so nobody waits. The card is then tried once in the background on two check lines. It is used only if both answers match the recorded ones and the second comes back within 1.5 seconds. The outcome is remembered with the pack. `src/talk/nmt/worker.js`.
- **Quality.** On the held-out file the float graphs score the same as the 8-bit ones to within a point (greedy, first-choice wording: 70.6 and 70.6 Hebrew to English, 83.6 and 82.6 English to Hebrew).
- **What was tested.** Headless Chromium with a software adapter, under the site's content policy: the files load, the answers match, a line is answered on the card when the slow adapter is accepted for the test, and the slow adapter is otherwise turned down (about 20 seconds a line against half a second on the processor). `tests/talk.nmt.browser.test.js`; the graphs also run on the processor in `tests/talk.nmt.test.js`.
- **What was not tested.** Any real graphics card. Whether it is faster than the processor for lines this short is not known; small models often are not. "Check Translation Speed" on the Talk screen times both ways on the device and says which is in use.

## The Pack Host (A Second Repository)

The packs are in this repository and also in `ALENZACODES/alef-packs`, which holds nothing else (198 MiB: the two packs and the runtime's WebAssembly).

- A copy of the site that carries the packs uses its own. Nothing changes for it.
- A copy built without them (`node tools/deploy/build_site.mjs --packs-remote`, or `ALEF_PACKS=remote`) is about 185 MiB lighter. On it the app finds no pack list of its own and reads the one at the address in `data/talk/pack-host.json`, then fetches every pack part from there.
- Only data comes from the pack host: pack parts and WebAssembly, each checked against its SHA-256. Code always comes from the site itself. The content policy allows the host for reading data (`connect-src`) and nothing else.
- To refresh the pack host after a pack changes: `node tools/talk/nmt/export-host.mjs <fresh clone of alef-packs>`, commit, push.
- Tested in a real browser against a stand-in host serving that exact folder (`tests/talk.nmt.browser.test.js`). Not tested against the live GitHub Pages address, which does not exist until Pages is turned on for `alef-packs`.

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
| `src/talk/nmt/tokenizer.js`, `decode.js`, `runtime.js` | Splitting a line into word pieces, the beam search, and the three graphs put together. The same code runs in the browser and in the Node scoring tool. Now wrappers around `assets/vendor/_alef-tools/translate@0.1.0/`. |
| `src/talk/nmt/memory.js`, `data/talk/tm/` | The sentence memory and its lookup. |
| `src/talk/nmt/tools.js` | Where the pinned translation code is (no version written in any screen). |
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
