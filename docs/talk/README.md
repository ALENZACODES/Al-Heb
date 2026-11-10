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
| `data/talk/pack.json` | About 200 sentence pairs with their English wordings, 130 nouns, 24 places, 40 names and the numbers 0 to 12. Written for this project. Not yet checked by a native speaker. |
| `data/corpus/phrasebook.json` | The 204 phrasebook lines. |
| `data/curriculum/dialogues.json`, `data/israel/scenarios.json` | Dialogue lines and the natural option of each scene. |
| `data/vocab/index.json` | The dictionary index. Fetched only when a line needs it. Dictionary answers are always marked low. |

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

The translation is read by the device voice and labelled as the device voice. Speaking the translation in the learner's own voice is not built. The screen calls it a future feature.

## Who Is Speaking

Hebrew "I" forms change with the speaker (a man says צריך, a woman צריכה). The screen shows the man's form with the woman's beside it, or the learner picks who is speaking. Lines said to one person also show the form said to a woman.

## The Sacred Name

A line that holds the four-letter Name, in Hebrew or in English letters, is held. It is not translated, not reworded, not read aloud and not saved to history.

## Stored On The Device

`talk.history` keeps the text of the last 60 lines. `talk.settings` keeps the choices on the screen. Both go through the app store, so backups include them. No sound is stored.

## Scores

`tests/talk.engine.test.js` scores the engine on two files. An exact match after normalizing scores 1; otherwise the score is 1 minus the word error rate against the reference; a refusal scores 0.

| File | Lines | Score | Refused | What it shows |
|---|---|---|---|---|
| `tests/fixtures/talk.utterances.json` | 100 | 97.3 | 0 | The pack was written with these lines in view, so this is a regression check. It is not a held-out result. |
| `tests/fixtures/talk.fresh.json` | 60 | 69.6 | 16 | Lines written after the pack. This is the honest number for everyday lines near the pack's topics. |

On open conversation outside these topics the engine will mostly refuse. The measured scores were taken on typed text. Nothing here has been tested with real speech in a browser.

## Not Built

- A small translation model that runs in the browser. It would lift the score on new sentences. It needs a model of a workable size hosted with the site and a test in real browsers first.
- Number and noun agreement beyond tickets ("two coffees").
- Playing the recorded phrasebook clips for stored lines. Today every line uses the device voice.
