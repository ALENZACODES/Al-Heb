# B2: known-word validator (board: R focus table row "Coverage validator for graded texts and dialogues")

Status: pure module + CLI + preview route `known-words`. It is the "validate" half only; it never writes or repairs Hebrew.

## What exists
- `src/knownwords/validate.js` (pure): `strip`, `tokens`, `knownSet(rows, {maxLevel, maxRank})`, `matchWord`, `validate`, `passes`, `similar`, `dialogueText`.
- `tools/knownwords/check.mjs`: `--dialogues` or `--file path`, `--level`, `--min` gate (exit 1 below the gate, 2 on bad usage).
- `src/knownwords/knownwords.view.js`: paste text, pick A1 to B2, see counts and the unlisted words. Loads `data/vocab/words.json` on first check; stores nothing.
- `tests/knownwords.test.js` (11 tests).

## Rules (all spelling rules, none linguistic claims)
- Matching is on unpointed letters. A word is "known" if the spelling equals a listed `heUnpointed`, or a stored form (plural, feminine, present, future, infinitive). Records with `flags.hidden` are skipped.
- "By prefix": removing one or two of ו ה ב כ ל מ ש leaves a listed word. Reported separately because it can be wrong.
- `similar()` offers listed spellings one edit away for words of 4+ letters. It is a hint, often unrelated, never a replacement.
- A level means "A1 up to that level" using the `level` field of the vocabulary rows.

## Results (RAN: `node tools/knownwords/check.mjs --dialogues`)
- 7 dialogues, each at its own `level`: coverage 73.9% (d-cafe, A1) to 92.6% (d-taxi, A2). Gate at 0.9 fails 5 of 7 (RAN with `--min 0.9`).
- Finding: the A1 dialogue d-cafe uses words the word list marks A2 (for example תודה, עוגה) and one at A2 and B2 (קפה); d-restaurant uses סליחה, which the list marks B2. So either the dialogue levels or the word levels are off; a reader should decide which. The tool only reports it.
- Exact matching under-counts inflected Hebrew (the list has few forms for most words), so "not listed" is an upper bound on truly unknown words.

## Not done
- No repair step (would need generated Hebrew). The CLI is shaped to be called by a generator loop: exit code and the unknown list are the interface.
- No lesson-position known set (only levels). `unlockLesson` could be added.
- Not run in a browser.

## Browser check (RAN, temp copy only)
In a temp copy with the precache build run (never in the repo), `node tools/a11y/newviews.mjs --routes /scheduler,/known-words,/syllabus,/time-budget` (Chromium + axe-core, light and dark, initial state of each page) at 390x844 and at 375x667: 0 findings after one fix. The first run found a reflow overflow at 320 px on the scheduler table (fixed: narrower headers and a scrollable named region). Deeper states (after tapping) were not audited in a browser. No screen reader.
