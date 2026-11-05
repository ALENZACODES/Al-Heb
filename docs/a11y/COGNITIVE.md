# Cognitive, learning, mental-health and sensory-sensitivity access

Lane: cognitive. Date: 2026-11-04.

**What was and was not tested.** Everything below was checked with unit tests on a fake DOM, source scans, a word-counting script, and one desktop Chromium run (390px and 320px wide) that read computed styles. **Nobody tested any of this with real people** who have dyslexia, ADHD, memory difficulties, anxiety, sensory sensitivities, migraine, low literacy, brain fog or fatigue, and no screen reader, phone or photosensitivity analyser was used. Nothing here claims that a feature helps a particular group. The settings are offered as choices; people can try them and keep what works. ALEF never asks about a person's condition, and no setting is named after one.

## What was added

| Area | What it does | Where |
|---|---|---|
| Calm mode (`calmMode`) | No animation or transition anywhere (`data-calm` on the root; one `!important` rule). No vibration, no sound effects (even if switched on). No streak lines. No countdown in the Word Sprint (it runs untimed, with "Finish now") and no running clock in Timed read-aloud (the time is still measured). The stroke-order demo shows the finished stroke at once. Home shows the Today card with one main button and a single "More choices" button. Lessons come in small parts. | `src/shell/comfort.js`, `assets/css/app.css`, `src/home/today.js`, `src/shell/home.view.js`, `src/sprint/sprint.view.js`, `src/timedread/timedread.view.js`, `src/letters/trace.js`, `src/curriculum/exercises.session.js` |
| System "reduce motion" | Already honoured by the stylesheet (`animation`/`transition` off, no smooth scroll) and by vibration and the stroke demo. Unchanged, and it applies whether calm mode is on or off. Checked in Chromium with the preference set and calm mode off: no transitions, `scroll-behavior: auto`. | `assets/css/app.css` |
| Reading comfort | Font (standard, or a system font stack: Verdana, Tahoma, Trebuchet MS, Segoe UI, system-ui), text size in 4 steps (1, 1.15, 1.3, 1.5 times the browser's own size), line spacing (1.55, 1.8, 2.1), letter spacing (none, 0.05em, 0.1em; Hebrew is never spaced), line length (46rem or 36rem). All through CSS variables on the root. | `src/shell/comfort.js`, `assets/css/app.css`, Settings > Reading comfort |
| Fonts | **No font file was added**, so `data/legal/attributions.json` needed no change. The existing OFL fonts are untouched. No evidence is claimed that the system font helps with dyslexia; it is simply a different, already-installed face to try. | `tests/cognitive.test.js` checks that `fonts.css` still holds exactly three `@font-face` rules |
| Short sessions (`shortSession`) | A lesson shows a few items at a time (letters, vowels, words, prayer lines), then the quick-check questions three at a time. Same buttons in the same order on every part: main button, Back, Pause for now. Place saved after every part and every answer. | `src/curriculum/chunks.js`, `src/curriculum/lesson.parts.js` |
| Pause and resume | Normal lessons too: quick-check answers are saved as you go; reopening says "Continue quick check" and carries on from the next question. An earlier miss still comes back once at the end. New store key `lesson.resume.v1` (row in the Privacy screen). | `src/curriculum/lesson.view.js`, `src/curriculum/exercises.ui.js` (`carry`, `onProgress`), `src/curriculum/exercises.session.js` (`carry`) |
| Streaks optional | `showStreak` hides every streak line (Today card, Learn, Review summary, Progress "Today", Morning). Calm mode hides them too. Nothing stored changes. | `streakVisible()` in `src/shell/comfort.js` |
| Memory hook | One line, "Memory hook: ...", same wording and place on the lesson's letter items, example-word items, short-session parts and the answer side of letter and word review cards. Text comes from `data/letters/memory-chain.json` and follows the learner's pronunciation style. A card with no chain entry shows nothing. | `src/letters/hookline.js` |
| Fewer choices at once | Settings: only voice, pronunciation and goal are open; seven named groups are closed until opened. Learn: the next few lessons are shown first ("Show all N lessons" opens the rest) and the nine practice links sit under "More ways to practise". Home: the long "more lessons" tile list is closed. | `src/shell/settings.view.js`, `src/curriculum/learn.view.js`, `src/shell/home.view.js` |
| Gentle wording | See below. | various |

## Reading level (before and after, same strings)

Measured by `node tools/a11y/readability.mjs` (sentence = ends in . ! ?; long word = 7 or more letters; grade = Flesch-Kincaid estimate with a rule-of-thumb syllable count). Before-wording is kept in `tests/fixtures/plain-language-before.json`; the new wording is in `src/shell/plain-copy.js` (the same ids), and the views read it from there. 21 strings from Home, Settings (voice note, storage lines, delete, restore), the lesson page, the quick-check summary, exercise drafts, reminders, Progress and the Word Sprint.

| Mean per string | Before | After |
|---|---|---|
| Words per sentence | 11.1 | 7.5 |
| Long words (7+ letters) | 16.8% | 13.5% |
| Grade estimate | 4.9 | 2.9 |
| Total words | 469 | 432 |

Per string: 20 of 21 got shorter sentences. Worst cases fixed: lesson draft note (16 to 8.5 words per sentence), memory-hook note (15 to 4.3), reminder explanation (19.5 to 10.3), streak note on Home (18 to 11). Not improved: `closingPerfect` (grade 2.3 to 3.0), `notifyOpenOnly` (long words 20.5% to 22.6%), `restoreWarn` (long words 20% to 22.7%). Honest limits: I chose the strings myself (the ones I judged long or heavy), so these means overstate how much the whole app changed. Most of these strings were already short-sentenced, so the grade was low to begin with; the real gain is shorter sentences and fewer double-barrelled lines. A word-counting script cannot tell whether a sentence is clear. The gender note in Settings was rewritten by another lane while this work ran and is not counted. The Hebrew lessons, corpus notes and the long "How this works", "About" and "Privacy" pages were **not** reworked.

## Gentle wording (found and softened)

Penalty-style or blaming text found by searching `src` for wrong, failed, broke, lost, overdue, behind, missed, mistake and similar, then reading each hit:

- "Right shape, wrong direction." (letter tracing) is now "Right shape. Try the other direction."
- "That round had several wrong strokes." (word tracing) is now "...strokes off the path."
- "Wrong register" (Sounds like a local labels, score line) is now "Different register"; "Wrong answers go into your Say it review queue" is now "Answers you miss go into..."
- "No sound: the browser voice failed" (3 places) and "Recording failed" now say "did not work".
- Reminder default: "ALEF: time to study" is now "ALEF: a few minutes of Hebrew", with "Only if you feel like it. Your lessons and review cards stay as they are."
- Quick-check closing lines no longer say "tough one" or "Solid" (see plain-copy).
- Left as they are: "Not quite." (neutral, and followed by the right answer), "Again" on review ratings, "Missed N of M" in the weak-spots list on Progress, and the technical words in error messages for developers.

Checked in code, not changed: a missed day sets the day count back to 0 but keeps `best`, and never touches lessons, review cards or settings (`tests/cognitive.test.js` reads state for a learner 20 days away and checks nothing stored changed). Skipping a question is not recorded as a miss. The evening "rescue" code in `src/morning/plan.js` has no screen that uses it, so no nagging text reaches anyone.

## Flashing and motion audit (grep of `@keyframes`, `animation`, `transition`, `setInterval`, `requestAnimationFrame` in `src`, `assets/css`; SVG and media files in `assets`)

- Only one `@keyframes` exists in the app CSS and JS: `alef-nudge`, a 3px sideways shift lasting 0.25 s, once, on a wrong choice, only when motion is allowed. It changes no colour or brightness.
- Transitions: button press scale 0.12 s; progress bar width 0.25 s; card border colour 0.2 s (Traditions); opacity 0.25 s (pronunciation screens); letter picture cross-fade 0.4 s on a press. Each is one change per user action. All except the cross-fade are inside `prefers-reduced-motion: no-preference`; the cross-fade is switched off by the reduced-motion rule, and everything is switched off by calm mode.
- JS timing: the stroke-order demo sweeps a line (instant under reduced motion or calm mode). Torah "read with me" moves a highlight one word per 0.9 s at its fastest (about 1.1 per second), starts only when pressed and is not offered in calm mode. Word Sprint tick is 1 per second; Timed read-aloud 4 per second updates a number, not a flash (hidden in calm mode).
- The 28 letter-picture SVG files in `assets/letters/morph` contain an 8 second looping cross-fade of their own. The app loads them through the picture card, which drops that animation, so it never plays. If a file is opened on its own it would loop at 0.125 per second.
- No GIF, APNG, video or confetti exists (searched). No audio plays by itself: every `audio.play` call site I read sits behind a button press. I did not read every one of them line by line.
- Result: **nothing found that changes more than 3 times per second.** This is a code read. It is not a measurement with a photosensitivity analyser and does not cover images the browser or system adds.

## Tests

`tests/cognitive.test.js` (28 tests): settings keys, comfort variables, no new `@font-face`, the stylesheet hooks, calm mode vs haptics/sound, motion audit, chunk plan and resume record, `carry` in the session, pause and resume on the real lesson views (normal and parts), Home card (next step, streak hidden, calm), missed days keep progress, wording scan, reminder text, memory hook, Learn windowing, plain-language numbers, Privacy row.

Changed in other files, to keep them passing: `tests/integration.test.js` (the exact whole-object check of `DEFAULTS` could not survive six lanes adding keys; it now checks each long-standing default one by one), `tests/curriculum.learnflow.test.js`, `tests/home.today.test.js`, `tests/notify.test.js`, `tests/israel.view.test.js` (new wording), `tests/settings.roundtrip.browser.test.js` (opens the backup group first; passes in Chromium).

## Not done, not tested, and open items

- **Not tested with any user.** Part size is set by count (3 items, 3 questions), not by a clock; whether a part takes 2 to 3 minutes was not measured.
- Pause and resume covers the Learn lesson page and its quick check. Other practice screens (syllable ladder, fade-out, gender pairs, Spot It, placement, Word Sprint, Typing, intermediate lessons) keep their own behaviour; a few keep progress in their own keys, the rest restart.
- Calm mode removes the Torah "read with me" timer (the button and pace choices are gone; Previous word and Next word stay), but does not change the letter-trace screens' layout or the Atlas. The nudge, bar and fade are off, but those screens still show a lot at once.
- The memory hook line is not on the Vocab word cards, the Atlas tiles or the First 10 minutes steps. The Letters trace page has its own memory card (unchanged).
- The settings checkboxes are plain ones. Calm mode does not change any wording outside Home, Learn, Review, Progress and Morning; some other screens still say "streak" in their help text.
- Text size 1.5 at 320px: the three pages I checked (Home, Learn, Settings) did not scroll sideways. Other screens were not checked at the largest step.
- Settings screen: each group opens on a tap. The new group summaries have not been checked with a screen reader.
- Learn page: the first 7 lessons from the first unfinished one are shown; if you want a different rule, change `far()` in `learn.view.js`.
- **Needs a build step by someone allowed to run it:** the new files `src/shell/comfort.js`, `src/shell/plain-copy.js`, `src/curriculum/chunks.js`, `src/curriculum/lesson.parts.js`, `src/letters/hookline.js` must be added to the precache (`node tools/build-precache.mjs`), or the offline copy will miss them. The precache tests in `tests/integration.test.js` were already failing for other lanes' files and will stay red until that is run.
