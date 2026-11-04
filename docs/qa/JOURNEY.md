# Journey QA: three scripted learner personas, 7 simulated days

**This is scripted emulation, not real learners.** A script (`tools/qa/journey.mjs`) drove headless Chromium at 390x844 against a local static server of the repo. It pressed whatever the Today card said, took right answers from the app's own data files, missed some on purpose, and moved the page clock forward by overriding `Date`. It can find dead ends, confusing states, console errors and counters that claim more than was done. It cannot say whether a person would understand, enjoy or finish any of these screens, and nothing here replaces watching real learners.

Run: `node tools/qa/journey.mjs` (all three personas, 7 days, about 200 s). `--quick` runs persona A, day 1 only (about 50 s). Output: `docs/qa/journey/journey.json` (every step, with the text the script read) plus the screenshots cited below. Run date 2026-11-04, simulated week Monday 2026-11-09 to Sunday 2026-11-15, Toronto time.

## What was emulated

| | Onboarding answers | Behaviour |
|---|---|---|
| A | "No, start from the beginning", Orthodox, Ashkenazi, 10 min/day | First task from the Today card each day (two on day 1), then the lesson's "Review now". Missed 1 in 3 review cards on purpose. Day 4 is a short day: only the due cards, no extra time. |
| B | "Yes, I read with vowels", Conservative, Sephardi, 15 min/day | Placement check answered like a letter-and-vowel reader (letters and syllables right, one vowel slip, words and phrases wrong or "Not sure"). Follows only the Today card. Ignores review. Skips day 6 entirely. Taps the 20 min daily goal on day 2. |
| C | "No, start from the beginning", no synagogue stream, Israeli, 10 min/day | After onboarding, changes the goal to Israel in Settings (the only place it exists), then follows the Today card. |

All three, on a fixed schedule: day 1 speak + typing + listen + progress; day 2 speak; day 3 typing; day 4 listen; day 5 progress; day 6 speak + typing; day 7 progress + listen. Right answers: first-10 check word from `data/firstday/first10.json`; placement options from `src/placement/model.js`; typing prompt text; listen answers from `data/vocab/words.json`; review cards are self-rated.

"Time spent" is also emulated: the streak needs 300 engaged seconds (`src/morning/engage.js`), so the script fires a pointer event and moves the clock 55 s, six times (about 330 s), on a lesson list page. Nobody actually studied for six minutes.

Results across the week: console errors, page errors and failed requests: 0 for all three personas. Lessons completed by day 7: A 6, B 0, C 7.

## Findings, ranked

### 1. HIGH: placement sends a learner to a locked lesson; the Today card keeps sending them back for a week (persona B)
- Repro: onboarding, answer "Yes, I read with vowels" and finish the other three screens. On Home press "Continue: placement check". Answer letters, syllables and vowels right, miss or skip the word and phrase items. Result: "Lesson r13: Shuruk and Kubutz". Press "Go to this lesson".
- What happens: the lesson page says "Locked: finish Nun and final Nun first. You can still look around." The only completion button is disabled. The note names one lesson (the direct prerequisite, itself locked behind r01 to r11) and is not a link. Nothing on the page says how to get unlocked.
- Then: Home says "Continue: lesson r13" on days 2, 3, 4, 5 and 7 (the card shows its first-run state, with a lesson id instead of a title). Pressing it lands on the same locked page every time. After seven days B had 0 lessons completed and 0 review cards, while the streak had reached 5 days, because time on a locked lesson page counts as engaged time.
- The Learn list does show "Start" next to r01 (seen in the step log), so a person could escape; nothing points to it.
- Evidence: `docs/qa/journey/B-d1-lesson-locked-r13.jpg`, `docs/qa/journey/B-d2-today-repeat.jpg`; JSON `personas.B.findings` ids `lesson-locked-dead-end`, `today-repeats`, and steps "learn list after a locked lesson".
- Human would expect: placement either completes or unlocks the lessons before the placed one, or the Today card names the first available lesson and says why.
- Caveat: B follows the Today card only, as instructed. The placed lesson (r13) depends on B's scripted answers; a different answer pattern may land on an unlocked lesson (r01 is always unlocked).

### 2. HIGH: the Streak line promises something that does not happen (A, B, C, day 1)
- Repro: finish onboarding, complete the first lesson, review its cards (A did the first 10 minutes, lesson r01 and its 6 review cards), open Home before five minutes have passed.
- Home: "Streak: No streak yet. Finish a lesson or review a card to start one." Stored record: `count 0, todaySeconds 7`. The Progress screen at the same moment says "Today's goal is met: you finished 1 lesson" and, in the sentence before it, "No streak running right now. Any lesson or review card starts one."
- After the script moved the clock past 300 engaged seconds, Home said "Streak: 1 day and counting. Done for today." (record `todaySeconds 345`).
- So the copy says a lesson or a card starts a streak; the rule is five engaged minutes on a counted screen. Lessons here take seconds to complete (finding 8), so a learner can do "enough" and be told they have not.
- Evidence: `docs/qa/journey/A-d1-streak-before-5min.jpg`, `docs/qa/journey/C-d1-streak-before-5min.jpg`; JSON `streak-copy-vs-rule`, `days.1.beforeDwell` and `days.1.afterDwell`.

### 3. HIGH: a short day breaks the streak the app said a review would keep (A, day 4 to 5)
- Repro: three days with 5+ minutes. Day 4: open Home ("Streak: 3 days. Learn something today to keep it."), tap "4 cards due", rate the 4 cards, leave. Day 5: open Home.
- Day 5 shows "Streak: No streak yet. Finish a lesson or review a card to start one." The learner did something on four straight days; the best streak (3) is not shown on Home. B on day 7 (after skipping day 6) gets the same line with a best of 5. Progress has a "Count yesterday as a rest day" button, but only for a day you skipped, and Home does not link to it.
- Evidence: `docs/qa/journey/A-d5-today.jpg`, `docs/qa/journey/B-d7-today.jpg`; JSON `streak-vs-actions` (A), `streak-lost-wording` (A, B). The streak engine's rule (300 s a day) is documented in `src/curriculum/streak.js`; this is the same cause as finding 2 seen a day later.
- Human would expect: a reviewed day to count as a day, or the card to say "5 minutes needed" before the day ends, and "No streak yet" not to be used for someone who just lost one.

### 4. HIGH: the last screen of "Your first 10 minutes" has no button (A, C)
- Repro: onboarding as a beginner, Home, "Continue: your first 10 minutes", press Next through all eight steps.
- Step 8 of 8 shows "You read 3 Hebrew words" and the honesty note. There is no Next, Home, or lesson button in the page (visible links and buttons in the main area: 0). Only the bottom tab bar remains. The stale "Yes, that one is shalom." from the previous step is still the last line.
- Home afterwards correctly offers r01, so nothing is lost; the page just ends.
- Evidence: `docs/qa/journey/A-d1-firstday-done.jpg`, `docs/qa/journey/C-d1-firstday-done.jpg`; JSON `firstday-dead-end`.

### 5. MEDIUM: the minutes the learner chose do nothing (A, B, C)
- Repro: onboarding, pick 10 (or 15) minutes a day, finish. Open Home.
- The Today card highlights "5 min" for all three personas (saved: 10, 15, 10). The two settings live in different places (`onboarding.v1.minutesPerDay` and `onboarding.v1.dailyGoal`). B then tapped "20 min" on day 2 (stored 20, button pressed) and studied about 339 s: Home said "Streak: 2 days and counting. Done for today." A grep of `src/` finds the daily-goal key read only for the Today card's buttons; the streak engine uses a fixed 300 s (`src/morning/boot.js`).
- Evidence: `docs/qa/journey/A-d1-today.jpg`, `docs/qa/journey/B-d1-today.jpg`, `docs/qa/journey/C-d1-today.jpg`; JSON `onboarding-minutes-not-carried`, `daily-goal-ignored`.

### 6. MEDIUM: the "Your week" plan and the Today card disagree from day 2 (A 6 of 7 days, B 5 of 6, C 6 of 7)
- Repro: finish onboarding, read the week card. Each day press the Today button and finish it.
- Plan: day 2 and day 3 are both "Shin and Bet" (a 20-minute lesson split in two for a 10-minute learner). Today: lessons are completed in one press, so day 2 already shows the next lesson ("Tav and the dot in Bet") and day 3 the one after. The plan says "Every link goes to an existing screen"; it does not say it is not followed.
- Evidence: `docs/qa/journey/A-d1-plan.jpg`, `docs/qa/journey/B-d1-plan.jpg`, `docs/qa/journey/C-d1-plan.jpg`; JSON `plan-vs-today` with day-by-day examples.

### 7. MEDIUM: Israel goal is not asked in onboarding; the first-run card ignores it (C)
- Repro: onboarding (four screens, no goal question), "Your week" shows read-track lessons only. Home says "Welcome. Start with your first 10 minutes: five letters, two vowels, three real words." The goal is only in Settings (Goal: Israel). After setting it, the first-run Today card is unchanged.
- C's week plan listed Shin and Bet on day 2; the Today card (after first 10 minutes) said "Hello, thanks, sorry" then "Fillers that make you sound local". The first 10 minutes is Hebrew-letter work for a learner whose goal is speaking.
- Evidence: `docs/qa/journey/C-d1-plan.jpg`, `docs/qa/journey/C-d1-today.jpg`; JSON `onboarding-never-asks-goal`, `first-run-card-ignores-goal`.

### 8. MEDIUM: a lesson is completed with one press and no check (A, B, C)
- Repro: Home, "Continue: Shin and Bet", scroll, "Mark lesson complete".
- The lesson page has no exercise (0 inputs or choices on the page). The button reports "Lesson complete. 6 new review cards added." and Progress then counts "Letters taught by lessons". The script pressed it without reading. A person who really pressed it after reading would get the same result, so this is about what the app claims, not about the script. Answers were clicked in the first-10 check, placement, review, listen, typing and speak, not in lessons, because lessons have none.
- Evidence: JSON step "lesson: marked complete without any check" (`exercises: 0`), `notes`.

### 9. LOW: raw code in the sound message (unverified outside headless)
- Lesson "Listen" shows "No sound: speech-error."; the sound bar shows "No sound: the browser voice reported an error." Headless Chromium has no speech voices, so this may not appear for a person with a normal browser; only the wording ("speech-error") is a finding. JSON `raw-speech-error`.

## Checked and nothing found
- Onboarding validation: "Continue" with no answer says "Choose one answer to continue." and moves focus.
- Review: rating Again opens the hint panel and carries on; session summaries add up; "Nothing due" did not appear after following a due link.
- `/speak` (self-judged mode), `/typing` (letters round with one wrong letter on purpose: "9 of 10 right", totals line updated), `/listen` (honest "Audio not recorded yet", read-and-match worked, one wrong pick), `/progress` (zero states readable on day 1; numbers matched actions: 3 of 27 letters after two lessons) ran every scheduled day with no dead end.
- Pronunciation: choosing Orthodox preselects nothing, so an Ashkenazi learner must pick Ashkenazi by hand (by design in `src/onboarding/model.js`, not a defect).
- Today card never recommended something already done within a day for A or C.

## Not covered
- The speak microphone path (headless has no microphone or permission prompt).
- Real audio, real voices, installed PWA, offline use, screen readers, a real phone.
- Any judgement of whether the Hebrew, pointing or glosses are right.
- Variation: one script, one run per persona, deterministic answers. Severity ranking is the author's judgement.
- Nothing in `src/` was changed.

## Fix status (second pass, 2026-11-04)

Verified by: unit tests (home, onboarding, placement, firstday, morning, streak, progress: 260 pass) and `node tools/qa/journey.mjs --quick` (persona A, day 1; output kept in `docs/qa/journey/journey.quick-after-fix.json`; `journey.json` is still the full pre-fix run). Persona B/C paths and days 2 to 7 were not re-run; the placement and plan fixes are covered by unit tests only.

| # | Finding | Status | What changed / what remains |
|---|---|---|---|
| 1 | Placement points at locked r13; Today says "Continue: lesson r13" | Fixed | `openStart()` in `src/placement/model.js`: a recommended lesson is used only if its prerequisites are done, otherwise the first open lesson. Used by the placement result screen (explains the lock, button "Start lesson r01"), the Today card, and the onboarding plan and Start button. Placement still completes nothing. |
| 2 | Streak copy promised "a lesson or a card starts one" | Fixed (copy only) | The rule is unchanged: 300 engaged seconds on a counted screen, idle pause after 60 s (`src/curriculum/streak.js`, `src/morning/engage.js`). Home and Progress now say so. Still old wording, not in my files: `src/curriculum/learn.view.js` line 69 and `review.view.js` (Learn and Review screens) still say "Finish a lesson or review a card to start one". |
| 3 | Short day shows "No streak yet" when a best exists | Fixed | Home: "Paused. Your best streak was N days." when count is 0 and best > 0. Not changed: the rule itself (a reviewed day under 5 minutes does not count) and Home's lack of a link to Progress rest days. |
| 4 | Last first-10 screen had no button | Fixed | "Start your first lesson" (to r01) and "Back to Home"; stale check message cleared on Next. The view test skips itself when jsdom is not installed (it is not here), so this was checked by the journey run (2 actions on the last screen), not by the unit test. |
| 5 | Onboarding minutes ignored by Today card | Fixed as a label, not as a rule | Onboarding writes `onboarding.v1.dailyGoal`; the Today card reads it (30 added to the choices). Shown as "Study goal" with the line "The streak always counts a day at 5 minutes". Not wired into the streak: `createEngagement` accepts a goal, but the projection, Progress ring, morning card and rescue read the fixed 300 s, so a per-user goal would make them disagree. |
| 6 | Week plan vs Today card | Fixed in wording only | The plan card says it is a pacing guide and that Today runs ahead when lessons are marked complete. The plan still splits lessons over days; the mismatch remains. |
| 7 | Israel goal not asked in onboarding | Not fixed | Out of scope for this pass. |
| 8 | Lesson completes with one press | Not fixed | Lesson view, not in scope. |
| 9 | Raw "speech-error" text | Not fixed | Not in scope. |
