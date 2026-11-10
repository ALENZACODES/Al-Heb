# Exercise feel: audit against the Duolingo lesson loop (draft)

Scope: the intermediate player (`src/curriculum/intermediate.view.js`, 50 lessons, 10 exercise types) and the quick check
for the 75 basic lessons (`src/curriculum/lesson.view.js`). Pure logic: `src/curriculum/exercises.session.js`; shared DOM:
`src/curriculum/exercises.ui.js`. Tests: `tests/feel.test.js` (fake DOM, not a browser). Nothing here has been tried with
real learners or in a real browser.

## Status per item

| Item | Before | Now |
| --- | --- | --- |
| Instant per-answer feedback with the right answer and why | status line only; "why" absent | right/wrong text, right answer, one "why" line from the exercise data, option marks (check/cross + border style, not colour alone) |
| Lesson progress bar | none ("n of N" text only) | `role=progressbar` with value and text; grows with repeats counted in the total |
| Enter to continue | only when focus was on the page body | Enter continues unless Next itself is focused (then the button handles it); 1-9 pick options; S skips in the quick check |
| Retry of misses | none | a miss is repeated once at the end; first attempt is what counts for score and SRS |
| End-of-lesson summary | count + list | first-try accuracy, time, words answered right, to-review list, skipped count, cards updated, primary Next button |
| "Complete" without exercises | the 75 basic lessons had a bare "Mark lesson complete" button | replaced by a quick check (letter name, letter sound, word meaning); completion, cards and streak happen only after answering |
| Copy | terse | short and plain, no exclamation marks, no mastery claims |
| Haptics / sound hooks | none | `fireFeedback`: off unless settings `haptics` / `soundEffects` is true; haptics never under `prefers-reduced-motion`; sound needs `ctx.sfx.play(name)` |
| Undo / skip | undo only inside the order exercise | Undo after any answer (result removed, SRS untouched because the SRS write waits for Next); Skip is penalty-free: nothing stored, item returns once, a second skip drops it ungraded and the lesson is not marked done |
| Mistakes feed the SRS | yes, but only at the end of the lesson | per answer on Next (`applyToSrs` -> `applyOutcomesToCards`); quick check via `saveQuickCheck` |
| Variety | 78 back-to-back same-type pairs across the 50 lessons | `sequenceExercises` removes them wherever an arrangement exists (test) |
| Answer-position bias | data always has the answer first; seeded shuffle with consecutive seeds gave slots 21/44/35% | `fairProduceOptions`: slot from a hash of the exercise id, 35/35/30% over 147 exercises (test bound 28-40%) |
| Distractors | phrase distractors come from the data; no letter-level ones | quick check uses look-alike sets (`data/letters/confusables.json`) first; sound questions exclude any letter with the same sound text; word questions exclude meanings taught in the same lesson; every question is audited |

## Gaps that remain

- Settings has no `haptics` / `soundEffects` keys (`src/shell/settings.js` validates a fixed key list, so they cannot be saved yet) and no sound files exist; the hooks are inert until the shell owner adds the settings and `ctx.sfx`.
- `match` and `order` exercises still use seeds from the exercise index (`intermediate-adapter.js`, not in this lane); only `produce` was made hash-fair.
- Produce distractors for the 147 intermediate exercises are as authored. The test only proves they are distinct after normalising pointing; plausibility (near-synonyms, look-alike spellings) needs a native reader.
- Quick-check word distractors are random meanings from other lessons, not near-miss words; letter distractors are look-alikes only for letters in a confusable set (alef, tet, lamed, mem, qof have none). The `shin` set in the data lists only `shin`, so it adds no look-alike.
- Retry queue and Undo state live in memory: closing the page mid-lesson keeps first-attempt results but forgets pending repeats; the last answer's SRS write is lost if the page closes before Next.
- Self-rated types (recall, respond, gender, dialogue, fade) cannot show "why"; the learner grades themselves.
- Summary "answered right" lists only words from `recall` and `produce`; it does not say a word is learned.
- No timer, hearts, XP or streak animation by design (not part of this sprint); the streak itself is counted by `completeLesson`.
- Not verified in a real browser: focus order after Next, screen-reader announcement order, 390px layout, animation under reduced motion (CSS is written, untested visually).
- Fake-DOM test for the audio line in `tests/curriculum.learnflow.test.js` currently fails for a reason outside this lane (`audio-ui.js` renders no Listen button for Shin with the test's audio mock).
