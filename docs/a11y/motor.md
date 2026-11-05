# Motor and physical access (tremor, limited reach or dexterity, one hand, keyboard-only, switch, voice control, fatigue)

Written 2026-11-04. Everything below was checked in headless Chromium (desktop keyboard events, and an emulated 375x667 touch phone).

## What was NOT tested (read this first)
No one on this project could test with a switch device, an eye tracker, voice-control software (Voice Control, Voice Access, Dragon), a head pointer, a screen reader, or with a person who has a motor disability. A real phone in a real hand was not used. So:
- "Works with a switch / eye tracker / voice control" is NOT claimed anywhere. What was checked is the things those tools depend on: every control can take focus from the keyboard, focus is visible, targets are big enough, names contain their visible words, and nothing needs a drag, swipe, hold or timed press.
- The 44 px and 64 px sizes are CSS pixels measured in an emulator. Whether they are comfortable for a given finger is not known.
- Thumb reach is judged from where things sit on a 375x667 screen, not from people's hands.

## How to re-run the checks
| Check | Command | What it does |
|---|---|---|
| Target sizes | `node tools/a11y/targets.mjs [--large --min 60] [--verbose] [--route /x]` | 32 screens at 375x667 with touch. Lists every visible control under 44 px (or the `--min` given) and neighbours closer than 4 px. Skips the skip-link, visually hidden inputs and links inside a sentence. |
| Label in name | `node tools/a11y/labels.mjs` | For each control with an `aria-label`, the visible words must be inside the name (so "tap Next" works). Not a test of any voice product. |
| Keyboard walk | `node tools/a11y/keyboard.mjs` | The earlier six flows, plus a Tab walk of 23 screens and the new features, keyboard only. Results in `tools/a11y/keyboard-run.json`. |
| Unit and browser tests | `node --test tests/motor.test.js tests/motor.browser.test.js` | Settings, helpers, undo, sizes, confirm-answer flow, shortcuts, roving tab stop. |

## 1. Keyboard only (measured)
Tab walk of 23 screens: `/`, `/learn`, a lesson, the review, `/letters` (Trace and Typing tabs), `/letters/alef`, the atlas, `/progress`, `/firstday`, `/install`, `/credits`, `/privacy`, `/offline`, `/settings`, `/accessibility`, `/welcome`, `/search`, `/about`, `/vocab`, `/sounds`, a reader page, `/calendar`. Result: **144 checks ok, 0 failed** on the last run (after the fixes below). Each screen was checked for: Tab never gets stuck (the walk returns to the top), every visible control gets focus, every stop has a visible focus mark, and the order inside `<main>` never jumps back up the page.
"Gets focus" counts a radio group as one stop (arrow keys move inside it), the letter strip and the ARIA tabs as one stop each (arrow keys), and does not count the on-screen typing keys (a person with a physical keyboard presses the real key; the on-screen keys are for touch).
The calendar time fields show their own browser focus mark on three of their four inner stops; the fourth is the browser's own picker button, whose ring was not measured (exempted in the walk).

Found and fixed:
| Finding | Fix |
|---|---|
| Letters: the 27-letter picker was 27 Tab stops; "Animate" was the 40th stop (a lot of presses for someone with fatigue or a switch) | One Tab stop with Left/Right/Up/Down/Home/End (`src/shell/roving.js`). "Animate" is now reached in 14 Tab presses from the top of `/letters/alef` (was 40). |
| Letters > Typing: the typing trainer swallowed Enter and Space everywhere, so "Vowel marks" could not be pressed from the keyboard | Enter and Space on a focused button, link or field are left alone. Tested. |
| Letters on a phone: Tab order and screen order disagreed ("Strokes in words" and the Print/Cursive row sat in a different order on screen than for Tab) | Matching order in `assets/css/app.css`. The Tab walk now reports no jumps. |
| Letters: "Walk me through it with buttons" (the way to finish a letter without drawing) sat about 1,100 px down the page | Moved into the Animate / Hint row next to the drawing area. |
Already fine before this round (kept, re-verified): skip link, More sheet focus rules, atlas focus, reader tabs.

## 2. No drag, swipe, long-press, pinch, double-tap, multi-touch or path-tracing without an alternative
Searched all of `src/` (a test now fails if any of these appear): no `draggable`/`dragstart`/`drop`, `touchmove`, swipe, long-press, `contextmenu` or `dblclick` handling exists, so **there are no drag-to-reorder exercises to give up/down buttons**. The only path precision is stroke tracing on `/letters/:id` and `/words/trace`:
- Letters has **"Walk me through it with buttons"** with **Next stroke**, by keyboard or tap. The message says it was recorded as walked through, not as drawn, and the letter is not counted as drawn (`assisted`, stored apart). Checked by keyboard: a letter can be finished with Tab and Enter only.
- The word-tracing screen has the same mode (built by another lane); its keyboard path is covered by that lane's test, not re-walked here.
- The Fade stage `<input type=range>` already has one button per stage as a single-tap alternative.
Wording was kept honest: stepping through skips the practice of drawing the letter.

## 3. Touch targets at least 44x44 (measured at 375x667, touch emulation)
| | Before | After |
|---|---|---|
| Screens measured | 32 | 32 |
| Targets measured | 1,040 | 908 (Settings now has its groups closed, so fewer are visible) |
| Under 44 px | **84** (47 on-screen typing keys 34 px wide and cut off at the screen edges; 35 calendar days 43 px wide; 1 lesson "About this lesson" summary 36 px tall; 1 hidden file input counted by mistake) | **0** |
Fixes: typing keys wrap on a phone and are 44 px wide with 8 px between them (they were cut off on both sides before); calendar grid uses the card padding so days are at least 44 px; lesson summary 44 px.
Spacing: neighbouring targets that touched (daily-goal buttons, stacked radio rows, link buttons on About and Privacy, stacked "How X is said" details) now have 2 to 8 px between them. The remaining close pairs are the calendar day grid (cells share a border; each is at least 44 px), two on `/progress` and two on `/scan` at 0 to 2 px.

## 3b. Larger targets setting (`targetSize: normal | large`)
Set with the accessibility page. Sets `--tap: 64px` on the root and a rule in `assets/css/app.css` that gives buttons, links, summaries, fields, radio/checkbox rows and the tab bar a 64 px minimum, with more space between them. Measured with `--large --min 60`: **859 of 908 targets are 60 px or more**. The exceptions: the 47 on-screen typing keys (56 px wide by 64 tall, six to a row on a phone), one paste box (54 px), one link on `/words/trace` (48 px, set inline by that view), and the skip link (only shown on focus).

## 4. Time limits, automatic advance, toasts
Searched every `setTimeout` and `setInterval`:
| Where | What it did | Now |
|---|---|---|
| First 10 minutes quick check | jumped to the next question 0.5 s (right) or 1.5 s (wrong) after an answer | **removed**: a "Next question" button; the verdict stays until pressed |
| Word Sprint | 5-minute countdown (Calm mode could already turn it off) | **"No time limits" setting** (`untimed`) also removes it; ends when you press Finish |
| Record and compare | recording stops by itself after 4 seconds | with `untimed` it does not stop by itself (10-minute safety cap in the recorder); you press Stop |
| Read with me (Torah reader) | highlight moves at a pace | started and stopped by the learner, with Pause and one-word steps; left as it is |
| Timed read-aloud, Morning streak timer | a stopwatch / engaged-time counter, no limit on the learner | unchanged: nothing is cut off |
| Messages | status text is in live regions and stays until the screen changes; the update banner and sound bar have a dismiss button; none disappears by itself | unchanged |
Not changed: the speech check waits a fixed time for the browser's speech engine to answer (a technical limit, not on the person).

## 5. Accidental taps
| Action | Before | Now |
|---|---|---|
| Lesson quick check answer | one tap answers; an Undo button follows | same by default; **"Ask me to confirm each answer"** (`confirmAnswers`): a tap only marks (thick outline and a tick, not colour alone), "Check answer" grades it, you can change the mark first; Undo still follows |
| Review rating (Again/Hard/Good/Easy) | no way back | **"Undo last rating"** puts that one card (and its reading-aid entry) back exactly as it was. The study streak is kept (you did study). One step only. |
| Settings: Reset | one tap | asks first ("Keep my settings" is focused) |
| Delete all data, Restore from backup | already typed word / two steps | unchanged |
| Clear saved location (Settings) | one tap | unchanged (it can be set again with one button) |
Other practice screens (Spot It, Atlas quiz, Fade, Ladder, Scaffold, Gender pairs, Listen, Sprint) still answer on the tap. Most have an Undo or a retry; `confirmAnswers` is not wired into them. This is a gap.

## 6. One-handed use
Lessons already keep Continue/Undo/Skip in a sticky bar just above the tab bar. New setting **`bottomActions`**: keeps "Show answer" and the four rating buttons (Review), "Next" (First 10 minutes) and the Word Sprint buttons stuck at the bottom of the screen above the tab bar. It only pins a button once the content is long enough to scroll; on a short card the button stays where the card puts it, so it is not always in the lower half. Not applied to: letter tracing's Animate row, Atlas, Listen, Fade, Ladder, Gender. The tab bar itself is at the bottom already.
Not verified: reach on a large phone, the browser's own bottom toolbar on iOS, the home indicator.

## 7. Label in name (voice control)
`tools/a11y/labels.mjs` (visible Latin words must be inside the accessible name): **46 controls on 36 screens before this round's fixes (found by the check, after earlier rounds had fixed the larger groups) -> 3 left**. Fixed: vocab "Listen (computer voice)" (the name began "Listen to ..."), Dot tiles "Dot on", scan "Helper address (this computer only)", progress "Import a progress file". The 3 left are the Letters/First-day memory-picture button, whose visible words are drawn inside the picture and are hidden from reading software. Hebrew-only text is skipped (an English recogniser cannot say it). No voice-control product was run.

## 8. Settings added (all through `src/shell/settings.js`, controls on the accessibility page)
`targetSize`, `bottomActions`, `untimed`, `confirmAnswers`, `keyShortcuts` (see `docs/a11y/SETTINGS-ADDED.md`). `keyShortcuts: false` turns off the single-key shortcuts (1 to 4 in lessons and Review, S to skip, Enter to continue) that a speech-input tool or a stray key could fire; buttons always work. Not covered by it: typing-trainer keys and a few shortcuts inside the vocab list and Torah reader, which use their own handlers.

## 9. Pointer cancellation
Every button, link and control in `src/` acts on `click`, which fires on release (a pressed finger can slide off to cancel). A test fails if a view uses `pointerdown`, `mousedown` or `touchstart` for an action. Exceptions: the tracing surface (a stroke has to start when the finger goes down), passive listeners that only notice activity (audio unlock, the morning timer, the "touched" flag).

## Not fixed, and open
- `confirmAnswers` only in lesson quick checks (section 5).
- `bottomActions` only on the views listed in section 6.
- Single-key shortcuts in vocab, Torah reader and the typing trainer ignore `keyShortcuts`.
- Tab order: the tab bar is before `<main>` in the page, so a keyboard user passes 5 to 8 stops before content on every screen (the skip link reaches `<main>`). It is at the bottom on a phone.
- Calendar day grid: cells touch each other.
- The memory-picture button name (section 7).
- 5 of the 7 unit-test failures in the last full run are not from this lane (precache and view-list checks need `node tools/build-precache.mjs`, which the shared rules say not to run; the tav header test and the letter-picture count test belong to other lanes). `src/shell/motor.js` and `src/shell/roving.js` are new files and must be in the precache list when the build is run.
- Nothing here was tried with a real switch, eye tracker, voice control or a person with a motor disability.
