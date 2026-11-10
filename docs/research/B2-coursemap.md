# B2: syllabus page and time-budget page

Board support: indirect. Neither has an R number. They were proposed in the task brief; the nearest board text is "R focus, C: Gameplan budget vs what Aleph has today" (lessons, hours) and the R recommendation that nothing claim "B1". Built as preview only.

## What exists
- `src/coursemap/model.js` (pure): `syllabus`, `timeTotals`, `budget`, `toMarkdown`, `DEFAULT_RANGE = {400, 600}` (a parameter).
- `src/coursemap/syllabus.view.js` (route `syllabus`): all lessons by track and level with their goals, verbatim from `data/curriculum/lessons.json`.
- `src/coursemap/timebudget.view.js` (route `time-budget`): lesson hours, a meter of completed lesson minutes (reads `curriculum.progress`, writes nothing), arithmetic against the range, weeks at 2/5/10 hours a week.
- `tools/syllabus/build.mjs [--check]` writes `docs/curriculum/SYLLABUS.md` (426 lines, generated). A test fails if the file is stale.
- `tests/coursemap.test.js` (8 tests).

## Real (RAN)
- 125 lessons, 3,325 estimated minutes = 55.4 hours of lesson time (all of it from `estMinutes`, summed by the code).
- That is 9% to 14% of a 400 to 600 hour range. The page says the remaining hours would have to come from review, listening, reading and speaking, which nothing in Aleph measures.

## Draft / unverified
- The 400 to 600 hour range has no source in this repo. The page labels it unverified. Change `DEFAULT_RANGE` when a source is chosen.
- `estMinutes` are the authors' estimates, never measured. Goals are the authors' draft wording; no Hebrew teacher reviewed them.
- The page does not predict a level or a date; "weeks" is division only.
- No per-lesson links (no stable lesson route found). Not run in a browser.

## Browser check (RAN, temp copy only)
In a temp copy with the precache build run (never in the repo), `node tools/a11y/newviews.mjs --routes /scheduler,/known-words,/syllabus,/time-budget` (Chromium + axe-core, light and dark, initial state of each page) at 390x844 and at 375x667: 0 findings after one fix. The first run found a reflow overflow at 320 px on the scheduler table (fixed: narrower headers and a scrollable named region). Deeper states (after tapping) were not audited in a browser. No screen reader.
