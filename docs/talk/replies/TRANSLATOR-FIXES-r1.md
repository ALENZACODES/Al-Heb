# Translator Fixes, Round 1

Reply to `TRANSLATOR-FAILS-FOR-CLAUDE.md` (speech review of `feature/live-translator-2026-11-10` at `b0fe32d71`).

Fixes are on `claude/live-translator-2026-11-10`. Nothing was changed on the feature branch.

## What Was Tested And What Ships

The fail list scored the server pipeline: synthesized speech, a hosted model for transcription, a hosted model for translation. That pipeline is no longer on the learner's path. Talk now runs in the browser from stored lines and sentence patterns (`src/talk/engine.js`), with the browser's own speech recognition for listening.

So the fixes below are made in the shipped engine, and each example from the fail list was run through it as text. The 37 example lines, with the transcripts exactly as the review reported them, score **81.8** with 6 refusals. That figure covers these examples only. It is not a score for the 20,000-line run.

## How To Rerun Against The Shipped Engine

Keep the speech half of the harness (synthesis and transcription). Replace the translation call with the engine:

```
node tools/talk/translate.mjs --jsonl < transcripts.jsonl > results.jsonl
```

Each input line is `{"id": "...", "direction": "en-he" or "he-en", "text": "<transcript>", "reference": "<expected>"}`. The tool needs no network and no key. A refusal comes back as `ok: false` and scores 0. The summary is printed to stderr.

Please report three numbers for each run, so a transcription error is not read as a translation error: the score on the source text, the score on the transcripts, and the count of refusals.

## Group 1: Translation Mismatch After A Correct Transcript (4,526)

Cause: the hosted model reworded lines that have a set everyday form ("האם יש לכם" for "יש לכם", "באיזו שעה מגיע האוטובוס" for "מתי האוטובוס מגיע").

Fix: the shipped engine answers these from stored lines, so the wording is fixed. All ten examples now match the reference.

| Case | Text given to the engine | Engine answer | How |
|---|---|---|---|
| enhe-11 | How do I get to the hotel? | איך מגיעים למלון? | phrase |
| enhe-13 | Go straight and then turn right. | תמשיך ישר ואז פנה ימינה | phrase |
| enhe-15 | Can you show me on the map? | אפשר להראות לי על המפה? | phrase |
| enhe-19 | Do you have vegetarian options? | יש לכם אפשרויות צמחוניות? | phrase |
| enhe-18 | The bill, please. | את החשבון, בבקשה | phrase |
| enhe-21 | This is delicious. | זה טעים מאוד | phrase |
| enhe-12 | Is it far from here? | זה רחוק מכאן? | phrase |
| enhe-41 | Is there kiddush after the service? | יש קידוש אחרי התפילה? | phrase |
| enhe-16 | What time does the bus arrive? | מתי האוטובוס מגיע? | phrase |
| enhe-38 | What time is the service? | מתי התפילה? | phrase |
| enhe-25 | How much does this cost? | כמה זה עולה? | phrase |

Lines outside the stored topics are refused, not reworded. On the held-out file `tests/fixtures/talk.fresh3.json` the engine scores 74.4 with 10 of 40 refused.

## Group 2: Transcription Errors With Noise (4,500)

Cause: the transcript is wrong before translation starts. No translation step can recover "No onion" from a transcript that says "No eggs".

Fix, as far as it is safe:

- A dropped article is allowed for: "איפה בית חולים" is read as the stored hospital line.
- Known swaps that keep the request the same are folded: "ניפגש" for "נתראה", "תתקשר" for "תתקשרו", "שמאל" for "שמאלה".
- A misheard word that is a real word is translated as heard or refused. It is never bent to a stored line.

| Case | Text given to the engine | Engine answer | How |
|---|---|---|---|
| heen-20-heard | מי בא לי קרח? | Refused | refused |
| heen-19-heard-n25 | יש לכם אפשרויות סינכרוניות? | Refused | refused |
| heen-30-heard-n25 | אני צריך שקיות בבקשה. | I need shopping bags, please | pattern |
| heen-33-heard | איפה בית חולים? | Where is the hospital? | close |
| heen-39-heard | איפה בית כנסת? | Where is the synagogue? | close |
| heen-35-heard | תתקשר למשטרה. | Call the police | phrase |
| heen-42-heard | ניפגש בבית הכנסת | See you at shul | phrase |
| extra-008-heard | איפה השאלמונית לשדה תעופה? | Refused | refused |
| extra-017-heard | בלי ביצים בבקשה | No eggs, please | pattern |
| extra-018-heard | החשבון בפרטנר, בבקשה. | Refused | refused |

Not fixed here: denoising or a second recognition pass. The shipped screen uses the browser's recogniser, which this harness does not exercise. A test on real phones is still needed.

## Group 3: Hebrew Near Miss (25)

Fix: the three rules above, plus one more. A single word that is not a word at all, within one letter of a stored line (two for long words), is read as the stored word, and the screen shows the correction ("Read “שקיד” as “שקית”").

| Case | Text given to the engine | Engine answer | How |
|---|---|---|---|
| heen-19-heard-clean | יש לכם אפשרויות סמכוניות? | Do you have vegetarian options? | close |
| heen-30-heard-clean | אני צריך שקיד בבקשה. | I need a bag, please | close |
| heen-49-heard | ניפגש מחר בעשר | See you tomorrow at ten | pattern |
| heen-10-heard | פנה שמאל ברמזור | Turn left at the light | phrase |
| heen-16-heard | מתי אוטובוס מגיע? | What time does the bus arrive? | close |
| heen-41-heard | יש קידוש אחרי התפלה? | Is there kiddush after the service? | phrase |

## Group 4: Service Errors (8)

These are JSON parse failures in the harness's call to the hosted model, not phrase bugs. Suggested harness change: ask the model for JSON output with a response schema, and retry once on a parse error before counting the item as 0. The shipped engine makes no such call. The source lines of those items now translate:

| Case | Text given to the engine | Engine answer | How |
|---|---|---|---|
| extra-008 | אפשר מונית לשדה התעופה? | Can I get a taxi to the airport? | phrase |
| extra-017 | בלי בצל, בבקשה. | No onion, please | phrase |
| extra-018 | החשבון נפרד, בבקשה. | Separate checks, please | phrase |
| extra-013 | We have a reservation for four. | יש לנו הזמנה לארבעה | pattern |
| extra-014 | Can we sit outside? | אפשר לשבת בחוץ? | phrase |
| extra-046 | בהצלחה. | Good luck | phrase |
| extra-006 | איפה התחנה המרכזית? | Where is the central bus station? | phrase |

## Group 5: English Near Miss (3)

- Digits and number words are the same to the engine: "It costs 20 shekels" and "It costs twenty shekels" give the same line. Numbers run to 100.
- "It cost twenty shekels" (past) is refused. The engine has no past-tense frame and does not pass the present off as the past.
- "See you at show" is refused. "Show" is a real word, so it is not read as "shul".

| Case | Text given to the engine | Engine answer | How |
|---|---|---|---|
| extra-040-heard-f | It costs 20 shekels. | זה עולה עשרים שקלים | pattern |
| extra-040-heard-m | It cost twenty shekels. | Refused | refused |
| enhe-42-heard | See you at show. | Refused | refused |

## Also Added This Round

- 114 more stored lines (taxi to the airport, separate checks, no onion, sit outside, central bus station, reservation, holiday greetings, days of the week).
- To-forms after want, need and can I ("I want to pay", "Where can I park?").
- Counted things and money with the right number form, open, closed and late with the noun's gender.
- Dictionary answers use a word's first meaning only, and dictionary glosses are no longer strung into sentences.

## Open

- The extra-001 to extra-0xx source lines are not in the repository. If they are added under `tests/fixtures/`, they can be scored on every push.
- Hebrew in `data/talk/pack.json` has not been checked by a native speaker.
