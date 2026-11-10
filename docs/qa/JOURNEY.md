# Journey QA: three scripted learner personas, 7 simulated days

**This is scripted emulation, not real learners.** A script (`tools/qa/journey.mjs`) drove headless Chromium at 390x844 against a local static server of the repo. It pressed whatever the Today card said, took right answers from the app's own data files, missed some on purpose, and moved the page clock forward by overriding `Date`. It can find dead ends, confusing states, console errors and counters that claim more than was done. It cannot say whether a person would understand, enjoy or finish any of these screens, and nothing here replaces watching real learners.

Run: `node tools/qa/journey.mjs` (all three personas, 7 days, about 200 s). `--quick` runs persona A, day 1 only (about 50 s). Output: `docs/qa/journey/journey.json` (every step, with the text the script read) plus the screenshots cited below. Run date 2026-11-04, simulated week Monday 2026-11-09 to Sunday 2026-11-15, Toronto time.

## Fourth pass (2026-11-04): five personas, phone size, v0 tiering in place

Run: `node tools/qa/journey.mjs` (A, B, C, D, E; 7 days, D runs 13), 390x844, scripted emulation as described at the top, not real learners. Output `docs/qa/journey/journey.json`; screenshots kept: `docs/qa/journey/A-d1-plan.jpg`, `docs/qa/journey/B-d1-plan.jpg`, `docs/qa/journey/C-d1-plan.jpg`, `docs/qa/journey/C-d1-review-summary.jpg`. Earlier screenshots cited in the sections above are not in the repository any more and are marked "(screenshot not kept)"; in particular `B-d1-lesson-locked-r13.jpg` was not regenerated because the locked-lesson landing it showed no longer happens (placement now starts B at r01).

Harness changes needed to test the current tree (`tools/qa/journey.mjs`): the first-10-minutes driver was written for the old eight-step flow and stopped after step 1 of the new five-step on-ramp (its quick-check buttons are `.fd-opt`, Next is `#fd-next`); that produced a false "Today keeps recommending Shin" result in a first attempt at this run. The driver now walks all five steps, answering the first option of each check. A backup probe was added: Settings, press the backup button, read the downloaded file.

Observed result per persona (console errors, page errors, failed requests: 0 for all five):

| Persona | First letter | First word | Review cards | Backup | Dead end |
|---|---|---|---|---|---|
| A: beginner, Ashkenazi | Pass: first-10 step 1 (Shin), then Bet | Pass: step 5 "you read a real Hebrew word"; ends on "Continue: Tav and the dot in Bet" | Pass: 5 cards reviewed day 1, due cards reviewed on days 2 to 7 (34 cards stored) | Pass: file downloaded, 12 keys, includes curriculum progress and cards | None. Lessons r01 to r08 completed by day 7 |
| B: placement, Sephardi | Via lessons: placement result names r13 but its start is r01, and B starts r01 (Shin and Bet) | Via lessons only (no first-10 run for this path) | Pass: Today says "Review N due cards first" on days 5 and 7, 20 cards rated each time (46 stored) | Pass: 12 keys with progress and cards | None. r01 to r10 completed; the old locked-r13 landing did not occur |
| C: Israel goal | Not applicable: the Israel track starts with phrases, not letters | Pass: first-run card "Start: Hello, thanks, sorry" (il01), then il02 to il08 | Pass: cards reviewed days 2 to 7 (51 stored) | Pass: 11 keys with progress and cards | None. 8 lessons by day 7 |
| D: away 10 days | Pass (day 1 first-10 as A) | Pass (as A) | Pass: day 13 review of 16 cards | Pass: 12 keys | None. Day 13 Home reads "Streak: Paused. Your best streak was 2 days" and offers the next lesson (r04) |
| E: reads /read only | Not exercised (E never follows the Today card) | Not exercised | Not exercised: 0 cards, no lessons completed | Opens and downloads, but the file has only 4 keys, no curriculum progress or cards, as expected | None on the paths E uses (/read worked every day, 7-day streak from reading) |

Exact defects and observations from this run:
1. MEDIUM, Today card vs week plan: "Your week" plan and the Today card disagree on 6 of 7 days for A and C, 4 of 6 for B (the plan is one lesson a day; Today moves ahead as soon as a lesson is marked done). Unchanged from the third pass.
2. LOW, C day 1: the due-cards link led to "Nothing due" (after il01 and again after il02). Cause not investigated.
3. LOW, headless-only: "No sound: speech-error." in the lesson Listen note and "No sound: the browser voice reported an error." in the sound bar (A, B, C, D). The first-10 "Hear it" says "Sound is not available on this device yet." Headless Chromium has no voices, so this is not verified for a real browser.
4. Backup probe limit: the confirmation text after pressing the backup button was not captured (the script read the sound bar's status element instead), so only the downloaded file is verified, not the message.
5. v0 tiering: speak, typing and listen show the "Preview: unreviewed, may change" banner at the top; Home, Learn, Progress, first-10 and Settings are v0 and show none. No dead end seen at either tier.
6. Quick-check scores are low (0 to 50 percent first try) because the script answers choice questions by position, not by knowledge; not an app result.

Follow-up fixes after the fourth pass (re-run for personas A and C only: `node tools/qa/journey.mjs --persona A,C`, 7 days, console errors 0):
- Defect 1 (plan vs Today): cause was two separate pickers. The plan walked the lesson array from the start lesson, one per day, while Today takes the first open lesson (prerequisites met, not done), so any learner who finished a lesson early or out of array order drifted apart. Both now use `src/home/nextlesson.js`; the plan is built from finished lessons on every view, so plan day 1 is Today's lesson and each later day is Today's lesson after the earlier ones are done. `tests/nextlesson.shared.test.js` simulates 7 days for the read, israel and both goals. The harness now re-opens the plan each day (a plan read once and held for a week cannot follow a learner who goes faster); in that run plan and Today agreed on 7 of 7 days for A and for C. Still true: a plan assumes one lesson a day.
- Defect 2 (C day 1, "Nothing due"): the link was the "Review now" button on the lesson-complete summary, which was always shown, even when no card was due (the Today card correctly said "No reviews due"). It is now hidden when the due count is 0 (`dueCount` in `summaryNode`). The re-run found no empty review session for C.
- Defect 5 (preview banner): a probe over all 62 static and 14 parameterised routes found no preview route without the banner and no v0 route with one after load. One real gap was fixed: views that rebuild `#main` after an interaction dropped the banner; `mountPreviewBanner` now restores it. Not verified on a real device.

Not covered: real audio, microphone, installed PWA, restore from a backup file (only the download was checked), screen readers, a real phone, real learners. Persona E's first letter, first word and review cards were not exercised.

## Fifth pass (2026-11-04): five personas after the onboarding, audio banner, first-day, settings, typing and reader changes

Run: `node tools/qa/journey.mjs` (A, B, C, D, E; 7 days, D runs 13), 390x844, against a temporary copy of the working tree with a freshly generated precache manifest, scripted emulation as described at the top, not real learners. Console errors, page errors, failed requests: 0 for all five.

Harness drift found and fixed in `tools/qa/journey.mjs` (the first run of this pass was wrong because of it): onboarding is now two question screens, then the plan card. The congregation Continue goes straight to the plan card, and the goal question and minutes live behind the plan card's "Change minutes a day" button (`#ob-change-minutes`, then `#ob-form-minutes`). The script still waited for the minutes screen after Continue, timed out ("SCRIPT PROBLEM: onboarding" for all five personas), never set the Israel goal for C, and then reported a false MEDIUM "first-run card ignores goal" for C. The driver now opens "Change minutes a day" when the persona's goal is not read or its minutes are not 10. After the fix that finding does not appear. Also: the Today card now carries the Israel goal (C's first card reads "Start: Hello, thanks, sorry").

| Persona | First letter | First word | Review cards | Backup | Dead end |
|---|---|---|---|---|---|
| A: beginner, Ashkenazi | Pass: first-10 from "Learn your first letter: Shin" | Pass: first-10 completed, then "Continue: Lamed, final Mem and Vav: Shalom" | Pass: 34 cards stored; 8 lessons completed by day 7 | Pass: 11 keys, curriculum and cards present | None |
| B: placement, Sephardi, 15 min | Via lessons: placement says r13, `start` is r01, B starts r01 | Via lessons | Pass: Today says "Review N due cards first" on days 5 and 7 (27 and 26 due); 46 cards; 10 lessons | Pass: 12 keys | None |
| C: Israel goal, 10 min | Not applicable (Israel track): plan start "Start lesson il01", first card "Start: Hello, thanks, sorry" | Pass: il lessons, 7 completed | Pass: 45 cards; "Review 20 due cards first" on day 5 | Pass: 11 keys | None |
| D: away 10 days | Pass (as A) | Pass (as A) | Pass: day 13 Home said "Welcome back", "16 cards due" and the script reviewed 16 | Pass: 11 keys | None. Streak line "Paused. Your best streak was 2 days"; the main button was the next lesson, with the 16 due cards as a secondary link |
| E: reads /read only | Not exercised | Not exercised | Not exercised: 0 cards, 0 lessons | Downloads; 3 keys, no curriculum or cards, as expected | None. 7-day streak from reading, reader opened each day with Hebrew present |

Plan vs Today card agreement (days where the script compared them): A 7 of 7, B 6 of 6, C 7 of 7, D 3 of 3.

Observations and findings in this run:
1. LOW, headless-only: "No sound: the browser voice reported an error." in the sound bar and "No sound: speech-error." in the lesson Listen note (A, B, C, D); first-10 "Hear it" says "Sound is not available on this device yet." Headless Chromium has no voices, so a real browser was not checked.
2. LOW, C first-run card: the Today card for the Israel goal still opens with "Welcome. One small step at a time: the first is one letter, about 2 minutes." above a button that starts an Israel lesson ("Start: Hello, thanks, sorry"). The sentence mentions a letter; the button does not. Wording only.
3. Harness drift, fixed (reader): the reader now keeps the text picker, show/hide switches, Play all and letter highlights inside a closed "Change text, show or hide, highlight letters" details (`details.crp-ctl`). Persona E's first re-run in this pass therefore opened "The Priestly Blessing (Birkat Kohanim)" all 7 days because the script's picker, switch and highlight actions silently hit hidden controls. The driver now opens that details first. Re-run for E only (`--persona E`): seven different texts opened on days 1 to 7 (Priestly Blessing, Shema Yisrael, V'ahavta verse 1, V'ahavta verses 2-3, V'ahavta, Shema and V'ahavta, Baruch shem), letter highlight works each day, 7-day streak, 0 console errors, 0 findings. The E row above and its counts are from the first full run; the E results are unchanged by the re-run.
4. Not checked: the new audio banner, the settings page and the typing keys changes are not exercised by this script beyond the backup download (the v0 walk covers Settings and restore; typing is only opened on day 1 and 3 here).

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
- Evidence: (screenshot not kept), (screenshot not kept); first-run JSON (since overwritten) `personas.B.findings` ids `lesson-locked-dead-end`, `today-repeats`, and steps "learn list after a locked lesson".
- Human would expect: placement either completes or unlocks the lessons before the placed one, or the Today card names the first available lesson and says why.
- Caveat: B follows the Today card only, as instructed. The placed lesson (r13) depends on B's scripted answers; a different answer pattern may land on an unlocked lesson (r01 is always unlocked).

### 2. HIGH: the Streak line promises something that does not happen (A, B, C, day 1)
- Repro: finish onboarding, complete the first lesson, review its cards (A did the first 10 minutes, lesson r01 and its 6 review cards), open Home before five minutes have passed.
- Home: "Streak: No streak yet. Finish a lesson or review a card to start one." Stored record: `count 0, todaySeconds 7`. The Progress screen at the same moment says "Today's goal is met: you finished 1 lesson" and, in the sentence before it, "No streak running right now. Any lesson or review card starts one."
- After the script moved the clock past 300 engaged seconds, Home said "Streak: 1 day and counting. Done for today." (record `todaySeconds 345`).
- So the copy says a lesson or a card starts a streak; the rule is five engaged minutes on a counted screen. Lessons here take seconds to complete (finding 8), so a learner can do "enough" and be told they have not.
- Evidence: (screenshot not kept), (screenshot not kept); JSON `streak-copy-vs-rule`, `days.1.beforeDwell` and `days.1.afterDwell`.

### 3. HIGH: a short day breaks the streak the app said a review would keep (A, day 4 to 5)
- Repro: three days with 5+ minutes. Day 4: open Home ("Streak: 3 days. Learn something today to keep it."), tap "4 cards due", rate the 4 cards, leave. Day 5: open Home.
- Day 5 shows "Streak: No streak yet. Finish a lesson or review a card to start one." The learner did something on four straight days; the best streak (3) is not shown on Home. B on day 7 (after skipping day 6) gets the same line with a best of 5. Progress has a "Count yesterday as a rest day" button, but only for a day you skipped, and Home does not link to it.
- Evidence: (screenshot not kept), (screenshot not kept); JSON `streak-vs-actions` (A), `streak-lost-wording` (A, B). The streak engine's rule (300 s a day) is documented in `src/curriculum/streak.js`; this is the same cause as finding 2 seen a day later.
- Human would expect: a reviewed day to count as a day, or the card to say "5 minutes needed" before the day ends, and "No streak yet" not to be used for someone who just lost one.

### 4. HIGH: the last screen of "Your first 10 minutes" has no button (A, C)
- Repro: onboarding as a beginner, Home, "Continue: your first 10 minutes", press Next through all eight steps.
- Step 8 of 8 shows "You read 3 Hebrew words" and the honesty note. There is no Next, Home, or lesson button in the page (visible links and buttons in the main area: 0). Only the bottom tab bar remains. The stale "Yes, that one is shalom." from the previous step is still the last line.
- Home afterwards correctly offers r01, so nothing is lost; the page just ends.
- Evidence: (screenshot not kept), (screenshot not kept); JSON `firstday-dead-end`.

### 5. MEDIUM: the minutes the learner chose do nothing (A, B, C)
- Repro: onboarding, pick 10 (or 15) minutes a day, finish. Open Home.
- The Today card highlights "5 min" for all three personas (saved: 10, 15, 10). The two settings live in different places (`onboarding.v1.minutesPerDay` and `onboarding.v1.dailyGoal`). B then tapped "20 min" on day 2 (stored 20, button pressed) and studied about 339 s: Home said "Streak: 2 days and counting. Done for today." A grep of `src/` finds the daily-goal key read only for the Today card's buttons; the streak engine uses a fixed 300 s (`src/morning/boot.js`).
- Evidence: (screenshot not kept), (screenshot not kept), (screenshot not kept); JSON `onboarding-minutes-not-carried`, `daily-goal-ignored`.

### 6. MEDIUM: the "Your week" plan and the Today card disagree from day 2 (A 6 of 7 days, B 5 of 6, C 6 of 7)
- Repro: finish onboarding, read the week card. Each day press the Today button and finish it.
- Plan: day 2 and day 3 are both "Shin and Bet" (a 20-minute lesson split in two for a 10-minute learner). Today: lessons are completed in one press, so day 2 already shows the next lesson ("Tav and the dot in Bet") and day 3 the one after. The plan says "Every link goes to an existing screen"; it does not say it is not followed.
- Evidence: `docs/qa/journey/A-d1-plan.jpg`, `docs/qa/journey/B-d1-plan.jpg`, `docs/qa/journey/C-d1-plan.jpg`; JSON `plan-vs-today` with day-by-day examples.

### 7. MEDIUM: Israel goal is not asked in onboarding; the first-run card ignores it (C)
- Repro: onboarding (four screens, no goal question), "Your week" shows read-track lessons only. Home says "Welcome. Start with your first 10 minutes: five letters, two vowels, three real words." The goal is only in Settings (Goal: Israel). After setting it, the first-run Today card is unchanged.
- C's week plan listed Shin and Bet on day 2; the Today card (after first 10 minutes) said "Hello, thanks, sorry" then "Fillers that make you sound local". The first 10 minutes is Hebrew-letter work for a learner whose goal is speaking.
- Evidence: `docs/qa/journey/C-d1-plan.jpg`, (screenshot not kept); JSON `onboarding-never-asks-goal`, `first-run-card-ignores-goal`.

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

Verified by: unit tests (home, onboarding, placement, firstday, morning, streak, progress: 260 pass) and `node tools/qa/journey.mjs --quick` (persona A, day 1; output kept in `docs/qa/journey/journey.quick-after-fix.json`; `journey.json` was the full pre-fix run at that time; it has since been overwritten by the fourth-pass run below). Persona B/C paths and days 2 to 7 were not re-run; the placement and plan fixes are covered by unit tests only.

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


## Third pass (2026-11-04): first-run journey, five personas

Run: `node tools/qa/journey.mjs` (A, B, C, D, E; 7 days, D runs 13). Scripted emulation as above, not real learners. Before = full run of the tree after the second pass; after = full run after this pass. Before, per persona: A 3 high/medium findings plus 1 low, B 4 plus 1, C 4 plus 1 (counts below). The before-run flagged items were partly detector wording: the checker looked for "No streak yet" and for a bare count in the text, which now matches correct copy, so the detector was tightened (it now flags only the old "a lesson or a review card starts a streak" wording and compares the shown count with the 5-minute rule).

| Finding | Before (full run) | After (full run) |
|---|---|---|
| Streak copy promises "lesson or card starts it" | high (A, B, C) | not seen. Learn and Review now say the 5-minute rule (they were the last old wording) |
| Short-day streak vs actions | high (A) | not flagged: Home says "Today is not counted yet... after 5 minutes" and "Paused. Your best streak was N days" |
| 46 cards due, Today still sends a new lesson (B) | medium | not seen: 20 or more due cards make "Review N due cards first" the one main action; the next lesson stays one link away |
| Israel goal never asked / first-run card ignores it (C) | medium + low | goal question added to the minutes screen; plan and first-run card then start an Israel-track lesson ("Start: Hello, thanks, sorry") |
| Plan vs Today disagree | medium on 5-6 of 7 days (A, B, C) | still medium on 3 to 4 of 7 days (A, B, C): the plan is now one lesson a day with the first lesson on day 1, so it matches until a lesson cannot be completed (next row) |
| Reader-only learner (E) sees "Welcome, first step" forever | not run | fixed: any counted study time or a best streak ends the first-run card; E: 0 findings, 6 minutes on /read counts toward the streak, Hebrew text present, picker and transliteration worked |
| Returns after 10 days (D) | not run | Home says "Welcome back. No need to catch up", streak reads "Paused. Your best streak was 2 days", main action is the next lesson; 0 findings except the speech-error note |

Home card: one large button first (the single next action), then one line of at most 3 secondary links (due cards, the morning verse, one or two practice links; none on first run), then the streak line, and the study goal tucked into a closed "Study goal" disclosure.

### Open, high, not in my files
Lessons whose quick check has no letters (r04 "Shabbat Shalom", r05, r08 and others; the first Israel lesson too) show "No quick check is available for this lesson yet, so it cannot be marked complete", and the start button is disabled. The Today card keeps pointing at them, so all of A, B and C stall at day 2 to 4 (3 lessons done, none of the later ones). Cause found: `buildChoiceQuestions(lesson, c, { seed, wordPool })` in `src/curriculum/lesson.view.js` passes `wordPool` in the third argument, but `src/curriculum/exercises.session.js` line 149 reads `wordPool` from the second. Checked with a toy call: `wordPool` in the second argument returns a question, in the third returns none. One-line fix in either file. Until it lands, the journey results for days 4 to 7 describe this stall, not the other fixes.

### Still not fixed
Raw "speech-error" wording (low, headless only, not my files). The microphone path, real audio, installed PWA and real learners were not covered.

## Sixth pass (2026-11-04): five personas after the goal-first onboarding, short Home, sound bar and action bar changes

Scripted emulation, not real learners. `node tools/qa/journey.mjs` (A to E, 7 days, D runs 13) at 390x844 against a temp copy with a freshly built precache; the copy was deleted afterwards. Console errors, page errors, failed requests: 0 for all five.

Harness changes (drift, not product): (1) the short Home draws the streak line only when the count or best is 2 or more (`src/home/today.js`), so on day 2 the script read an empty line as "0" and raised `streak-vs-rule` and `streak-vs-actions` for A, B, C, D; it now skips those checks when no line is drawn and records a note. (2) Persona E looks for the reader from the full Home's Opening card; first-run Home shows a Read tile instead, so the script falls back to `#home-rest a[href="#/read"]` (it had raised `read-no-link-from-home`). Before these two changes the first run flagged those findings; the numbers below are from the second run.

| Persona | Steps | Findings | Backup |
|---|---|---|---|
| A: beginner, Ashkenazi | 91 | 1 low (`raw-speech-error`) | downloaded, 11 keys, curriculum and cards present |
| B: placement, Sephardi | 86 | 1 low (same) | 12 keys, curriculum and cards present |
| C: Israel goal | 85 | 1 low (same) | 10 keys, curriculum and cards present |
| D: away 10 days | 57 | 1 low (same) | 11 keys, curriculum and cards present |
| E: reader only | 28 | none | 3 keys, no curriculum or cards (as expected) |

Open product finding (low, unchanged from before): in a lesson, Listen shows "No sound: speech-error." (raw code) while the sound bar says "No sound: the browser voice reported an error." Headless Chromium has no speech voices, so this is not checked in a real browser. Repro: open any lesson, tap Listen.

Not covered by this run: the streak line on the short Home is no longer checked at 1 day (it is not shown); whether hiding it at 1 day is intended was not judged. `src/letters/trace.view.js` changed after the temp copy was made, so it was not in this run.
