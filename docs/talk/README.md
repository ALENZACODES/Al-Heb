# Talk

Talk (`#/talk`) turns a short everyday line from English into Hebrew or from Hebrew into English. It runs on the learner's device. The site stays a static site: there is no server, no key and no outside translation service on the learner's path.

## What It Is

Talk is a phrase memory with sentence patterns on top. It is not a general translator. It knows travel, shop, table, emergency and synagogue talk, and it says so on the screen. When it has no line it says "ALEF does not have that line yet" and offers the nearest stored lines. It never makes up a sentence.

Every answer carries a label that says how it was made.

| Label | Meaning |
|---|---|
| A stored line | An exact line from the stored sentence pairs. |
| Built from a sentence pattern | A stored frame such as "Where is …?" with a known noun, place, name or number slotted in. |
| The closest stored line | A stored line that differs from the request only by small words such as "here" or "very". The matched line is shown. |
| A single word | One noun from the Talk list, or one dictionary word. |
| Word by word | Hebrew read one word at a time from the dictionary. Shown as a gist, not as a sentence. |

A line that differs from a stored line by a real word is refused, not matched. "I don't eat fish" is not answered with the stored "I don't eat meat".

## Where The Lines Come From

| File | Use |
|---|---|
| `data/talk/pack.json` | 317 sentence pairs with their English wordings, 258 nouns with gender and plural where needed, 56 describing words in their four forms, 62 to-forms, 24 places, 40 names and the numbers 0 to 100. Written for this project. Not yet checked by a native speaker. |
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
- Describing words that follow the noun or the speaker ("The room is very dirty", "I am tired", "The soup was cold").
- Clock times with half and quarter past, and when things start and end ("The service starts at nine").
- I live in, I work in, I am a number of years old, we are from.
- A describing word beside a noun ("cold water", "a bigger room"), my, another, per night, and someone else wanting or needing ("The children want ice cream").

## Lines As They Are Heard

Speech recognisers drop the article, swap near words and sometimes return a non-word. The engine allows for three of these and no more.

- A dropped article: "איפה בית חולים" is read as "איפה בית החולים".
- A known swap that keeps the request the same: "ניפגש" for "נתראה", "שמאל" for "שמאלה", "תתקשר" for "תתקשרו".
- One word that is not a word, within one letter of a stored line (two letters for long words): "שקיד" is read as "שקית". The screen shows the correction.

A misheard word that is itself a real word is a different request. It is translated as heard or refused. When a refused line sounds like a stored line, the screen offers that line under "Did You Mean" for the learner to tap. It is never given as the answer. "בלי ביצים" stays "No eggs" even if the speaker said "בלי בצל".

## Code

| File | Role |
|---|---|
| `src/talk/engine.js` | The engine. Pure functions. |
| `src/talk/data.js` | Loads the files above and builds the engine. |
| `src/talk/speech.js` | Listening through the browser's own speech recognition. |
| `src/talk/talk.model.js` | Settings, history, the sacred-Name hold, scoring helpers. |
| `src/talk/talk.view.js` | The screen. |

## Listening And Voice

Listening uses the browser's speech recognition. ALEF uploads nothing itself. Some browsers send the sound to the browser maker to turn it into text; the screen says this beside the buttons, and the privacy page lists it. Browsers without speech recognition get typing only, with a sentence that says so. Typing works offline once the screen has been opened.

When the Hebrew answer is word for word a phrasebook line that has a clip in the audio manifest, that clip plays and is labelled as what it is. Every other answer is read by the device voice and labelled as the device voice. Speaking the translation in the learner's own voice is not built. The screen calls it a future feature.

## Who Is Speaking

Hebrew "I" forms change with the speaker (a man says צריך, a woman צריכה). The screen shows the man's form with the woman's beside it, or the learner picks who is speaking. Lines said to one person also show the form said to a woman.

## The Sacred Name

A line that holds the four-letter Name, in Hebrew or in English letters, is held. It is not translated, not reworded, not read aloud and not saved to history.

## Stored On The Device

`talk.history` keeps the text of the last 60 lines. `talk.settings` keeps the choices on the screen. Both go through the app store, so backups include them. No sound is stored.

## Scores

`tests/talk.engine.test.js` scores the engine on six files. An exact match after normalizing scores 1; otherwise the score is 1 minus the word error rate against the reference; a refusal scores 0. A correct answer worded differently from the reference loses points.

| File | Lines | Score | Refused | What it shows |
|---|---|---|---|---|
| `tests/fixtures/talk.utterances.json` | 100 | 96.3 | 0 | The pack was written with these lines in view. A regression check. |
| `tests/fixtures/talk.fresh.json` | 60 | 95.5 | 1 | Written after round 1. It scored 69.6 then and has since been used to widen the pack. A regression check. |
| `tests/fixtures/talk.fresh2.json` | 75 | 88.4 | 7 | Written during round 2. It scored 62.7 when first run and was then used to add patterns. A regression check. |
| `tests/fixtures/talk.fresh3.json` | 40 | 91.9 | 3 | Written at the end of round 2. It scored 74.4 then. A regression check. |
| `tests/fixtures/talk.fresh4.json` | 40 | 95.1 | 0 | Written at the end of round 3. It scored 60.3 then; its refusals guided the round 4 frames. A regression check. |
| `tests/fixtures/talk.fresh5.json` | 40 | 48.5 | 17 | Written at the end of round 4. It scored 47.5 when first run. No line or frame was added for it. This is the honest number for a new everyday line. |

The held-out files scored 69.6, 62.7, 74.4, 60.3 and 47.5 when first run, whatever the earlier files had reached by then. Widening the stored lines and frames lifts the files it was done against and does not lift the next new file. A new everyday line has roughly an even chance of being answered. On open conversation outside these topics the engine will mostly refuse. All scores were taken on typed text. Nothing here has been tested with real speech in a browser.

## Scoring The Shipped Engine From A Speech Review

`tools/talk/translate.mjs` runs the engine as the screen does, with no network. A speech review can synthesize a line, transcribe it with any recogniser, and pass the transcript through it.

```
node tools/talk/translate.mjs "Where is the hotel?"
node tools/talk/translate.mjs --jsonl < transcripts.jsonl > results.jsonl
node tools/talk/translate.mjs --score tests/fixtures/talk.fresh3.json
```

Each line of `transcripts.jsonl` is `{"id": "...", "direction": "he-en", "text": "<transcript>", "reference": "<expected>"}`. Refusals come back with `ok: false` and score 0.

## Not Built

- A small translation model that runs in the browser. It would lift the score on new sentences. It needs a model of a workable size hosted with the site and a test in real browsers first.
- Past and future sentences, and anything said about a third person ("The children are hungry").
- Clips for the Talk pack's own lines. Only phrasebook lines that already have a clip play one (93 of the 204 today).
- "Doesn't work", "our", "on Friday", "I don't need", "is on the chair", colours: the round 4 held-out file lists what is still refused.
