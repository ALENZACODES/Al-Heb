# Home "Today" card — DRAFT, untested with learners

Files: `src/home/today.js` (pure `buildToday`, DOM `renderToday`), `src/shell/home.view.js` (mounts it), `tests/home.today.test.js`.
It replaces the three separate Home cards "Today's lesson", "Reviews due" and "Streak" with one card, placed above "Opening".
`src/shell/router.js`, `src/app.js` and i18n.js were not edited (existing keys `home.today`, `home.due.*`, `home.streak` are reused).

## Contents
- Next lesson(s): first available lesson per track of the `goal` setting (`curriculum.progress` + lesson prerequisites). "All complete" message when none.
- Reviews due: SRS cards due now (`srs.cards`, `srs.js due()`); links to `#/learn?review=1` when more than 0.
- Streak: from `loadState().streak` (same source as before). Note: the streak is engaged-time based (`src/curriculum/streak.js`, v2); completing a lesson alone no longer starts it.
- Morning verse: link to `#/morning` ("Today's morning verse"); the verse text is not fetched on Home.
- One primary button, "Continue: ...":
  - first run (no completed lessons and `firstday.progress.done` not set): `#/firstday`; if `onboarding.v1.start` is `/placement`, `#/placement`, or the lesson recommended by `placement.v1` once it exists;
  - otherwise the next lesson; if none, review when cards are due; else `#/learn`.

## Rules
- Read-only: reads `curriculum.progress`, `srs.cards`, `streak`, `firstday.progress`, `onboarding.v1`, `placement.v1`; writes nothing (a test compares the store before and after).
- Every link is guarded by `ctx.hasRoute(name)`. Without a `hasRoute` function only `learn` counts as present. A missing route drops the link; with no usable route there is no Continue button.
- Before the lesson modules load, the card shows the existing "lesson plan is not available yet" line; if they fail to load it stays that way.

## Tools updated for the new first run
- `tools/a11y/keyboard.mjs`: onboarding walk is now radio -> arrow -> Continue (saves `onboarding.v1`, stays on `#/welcome`) -> "Skip the rest and start now" -> `#/placement`, with focus checks.
- `tools/smoke.mjs`: first run covers letters answer, denomination + pronunciation, minutes, 7-day plan card and the start button. The old "1-day streak after completing a lesson" assertion was stale (engaged-time streak) and is replaced by checks for the due count, a streak line, the morning link and one Continue button.

## Not done
- Not viewed in a browser at 390px beyond the smoke script (no screenshot reviewed); no learner has used it.
- `src/home/today.js` and `home.today` test are not in `precache-manifest.js` (`npm run precache` not run here), so offline Home depends on that step.
