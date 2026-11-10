# Beginner quick check: sticky action bar QA

Date: 2026-11-04. Observed only. Headless Chrome (`google-chrome`, synthetic touch and keyboard input, no real phone, no real soft keyboard, no screen reader). Harness was a throwaway script outside the repo (deleted); numbers below are from its runs on the working tree as it stood during the run (other lanes were editing `lesson.view.js` at the same time).

## What was walked

- Lessons r01 to r10, each at 375x667 and 360x640 (20 runs). Progress seeded with `alef:curriculum.progress` = `{ completed: { r01..r09 } }` and `alef:settings` = `{ onboarded: true }`, so r02 to r10 were open.
- Every question of every quick check, start to summary: 202 questions. Kinds that exist in r01..r10 (`buildChoiceQuestions`): `letter-name` 56, `letter-sound` 50, `word-meaning` 96. These are the only kinds; the beginner quick check has no typing exercise and no text field.
- Answers: first option every time (140 wrong, 26 right), Skip 36 times, Undo on question 2 (lessons with more than one question), 90 "Try again" repeats reached. Every run reached the summary.
- Per question: before the answer (card top scrolled to the top of the viewport, and again at maximum scroll) and after the answer (scroll allowed to settle; smooth scrolling is on in this app).

## Checks and results (after the changes below)

| Check | Result |
| --- | --- |
| Primary action on first screen of the lesson page (Start quick check) | In view at load in all 20 runs (the Start row is sticky; that is another lane's change) |
| Bar overlaps tab bar (bar bottom vs tab bar top), every question | 0 of 202 |
| Bar covers last option at maximum scroll | 0 of 202 |
| Bar covers last option with the card top at the top of the viewport | 0 of 202 |
| After an answer: Continue visible, bar clear of the verdict line and of the explanation | 0 failures in 20 runs |
| Focus after an answer | Continue, every time |
| Sound bar | not measured; by reading `app.css` it is in normal flow at the top of the page (not fixed) |
| Summary buttons vs tab bar at maximum scroll | clear (last button bottom 544 vs tab bar top 583 at 360x640 r03) |
| axe-core 4.x (`tools/a11y/node_modules`), questions 1, 2 and every 4th, before and after answering, plus the summary: 184 passes | 0 violations |
| Page errors | 0 |
| Enter, Space | Continue advanced on Space while focused (68 of 68), Enter while focused (54 of 54), Enter with focus on the body (44 of 44) |
| Undo | restored an enabled question every time it was used |
| Reduced motion (`reducedMotion: reduce`) | wrong-answer card animation `none`, progress fill transition `0s`, `scroll-behavior: auto`. Without it: `smooth` and `0.25s` |

Keyboard order (r01, both sizes): before an answer Tab goes option 1, 2, 3, Skip. Answering with Space on an option moves focus to Continue; Tab then reaches Undo; Shift+Tab from Continue goes to an anchor above the quiz (the disabled options are skipped). After Skip or Undo the next Tab leaves the card (the page's remaining links). Every stop was inside the viewport and the element at its centre point was the control itself (not the bar or tab bar), after the changes below.

## Soft keyboard

The beginner quick check has no text field, so there was nothing to type into. Two emulations only, both on r01:

1. Viewport shrunk to 377 and 300 high at 375 wide (and 350 and 300 at 360 wide). At or below 480 px high the tab bar becomes `position: static` (existing `app.css` rule) and the action bar uses `inset-block-end: env(safe-area-inset-bottom)`. Skip before answering and Continue after answering were inside the viewport in all four cases.
2. A throwaway `<input>` injected into the card and focused, with the viewport at 567 and 540 high (above the 480 px rule). The tab bar was `display: none` and the bar's computed `inset-block-end` was `0px`; the bar sat inside the shrunk viewport (bottom 525 of 567, 498 of 540).

This does not show what a real Android or iOS keyboard does (visual viewport vs layout viewport, `interactive-widget`). Not tested.

## Bugs found and what changed

Found by measuring before the changes:

1. After an answer with a long explanation, the sticky bar covered the end of the explanation (and, at 360x640 r02 question 4, the verdict line too). Seen in r02 and r03 (r03 questions 12 and 16, both sizes). Cause: only the verdict line was scrolled into view and the explanation line has no scroll margin.
2. Keyboard Tab from the heading to option 1 left option 1 fully under the bar (375x667 r01: option at 554 to 602, bar at 546 to 609). Chrome's own focus scroll stops at the viewport edge and does not use `scroll-margin` or `scroll-padding`; `scrollIntoView()` does.

Changes:

- `src/curriculum/exercises.ui.js`: after an answer one `scrollIntoView({ block: "nearest" })` call on the explanation (or on the verdict line when there is none). A first attempt with two calls (explanation, then verdict) still failed on r03, because the second smooth scroll cancelled the first. Options get a `focus` handler that re-scrolls the option a tick later when the focus is keyboard focus (`:focus-visible`).
- `assets/css/learn.css`: `scroll-margin-block-end` rule now also covers `.alef-why` and `.alef-int-opt` inside `.alef-ex-card`.
- Tests: `tests/feel.test.js` (bar order Continue, Undo, Skip; one scroll call on the explanation; option focus handler), `tests/curriculum.intermediate-view.test.js` (the two CSS rules).

## Not fixed, not tested

- Right after tapping Start, the quiz card is below the first screen (card top about 1236 px down at 360x640, page scrolled 303 px) and the Start row is no longer sticky, so nothing on the first screen shows that the quiz began until the card is scrolled to. The heading focus after Start belongs to another lane and was not touched.
- Immediately after Start, before anything scrolls, the bar can be pinned to the top of the card (a sticky box cannot leave its card). Seen once in an earlier tree state (bar 531 to 594 against a tab bar at 583); not reproduced in the current tree because the card starts lower. Not re-measured after the heading focus lands.
- Intermediate lessons were not walked. By reading `intermediate.view.js`, it scrolls only the verdict line into view after an answer, so the first bug above is likely there too; it also has typing and select exercises that were not exercised.
- Not tested: real devices, iOS Safari, landscape, dark theme, 200 percent text, forced colours, screen readers.
