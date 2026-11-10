# On-ramp: the first 30 minutes as baby steps (DRAFT, 2026-11-04)

John's standing rule: "goal is to start with very very very baby steps." This lane audited the first day of a total beginner and
re-chunked it. Nothing here has been tried by a real learner or reviewed by a Hebrew teacher; the numbers below come from a
scripted phone-size run (`docs/onramp/shots.mjs`, headless Chromium 390x844, persona A of `tools/qa/journey.mjs`), which is
scripted emulation, not a real learner. "Minutes" are a design budget, not a measurement.

## Decision: `/firstday` is the on-ramp, lesson r01 is what it completes

Before, `/firstday` taught five letters (shin, lamed, vav, mem, he) and two vowels in eight screens, then sent the learner to r01,
which taught shin and bet again on one long page (letters, vowels, words, memory hooks, Spot It, a 4-question quick check).
The two contradicted each other: different letters, different order, the same "first" letter twice.

Now:

| Step | Screen | One thing | Check | Budget |
|---|---|---|---|---|
| 1 | Your first letter: Shin | hear it, trace it once (`#/letters/shin`) | 2 questions (r01's own: name, sound) | 2 min |
| 2 | Your second letter: Bet | hear it, trace it once | 2 questions (r01's own) | 2 min |
| 3 | Your first vowel sign | the kamatz mark under Bet (`niqqud.json` shape) | 1 question (which has the sign) | 2 min |
| 4 | Your first syllable | שָׁ, letter then sign | 1 question | 2 min |
| 5 | Your first word | שָׁב (r01's word) | 1 question (r01's own: meaning) | 2 min |

- Data: `data/firstday/onramp.json`. Every Hebrew string is copied from existing files (named per step in `source`); no new Hebrew.
- The five answers to r01's own questions are saved with `saveQuickCheck`, so finishing the on-ramp **completes r01** and creates
  its review cards (`letter:shin`, `letter:bet`, `word:r01:1`). Lesson ids are unchanged; r01 only gained `onramp: "/firstday"` and
  `steps` (`r01.1` to `r01.5`) in `data/curriculum/lessons.json`. r02 to r05 were not changed.
- Each win is written to `firstday.progress` (`{v:2, part, step, wins[], answers, next}`; `src/firstday/onramp.model.js`) and counts
  the day as active the way a finished lesson does (`recordActivity`). Honest limit: once the engaged-time streak record exists
  (v2), only timed minutes on counted routes count, and `/firstday` is **not** in `COUNTED` in `src/morning/engage.js` (main lane).
  One-line fix for main: add `/^\/firstday/` there. Until then a learner who only does the on-ramp sees "No streak yet".
- The old eight-step flow (five letters, two vowels, shalom / sham / mah, the honesty note) is kept whole as an optional preview
  after the five wins: `#/firstday?part=preview`, labelled "Lesson 3 teaches these letters properly". A learner who was already
  inside the old flow (legacy record without `v`) stays in it.
- Memory hooks sit behind "Why?" on each step and behind "Why? Remember it" on the lesson page; Spot It is inside "Why?" on the
  steps and behind "Optional: Spot It drills" on the lesson page. Lesson-page quick checks are capped at 2 questions per sub-step
  (`sizeQuickCheck` in `src/curriculum/lesson.view.js`; r01's own 5 questions are under the cap, so nothing was dropped).
- Tradition (accent lane): the letter sound line, the kamatz wording and the word respelling follow the learner's congregation
  (`src/pronunciation/forTradition.js`); an Ashkenazi learner sees "shov" and "aw as in saw", with the device-voice note under
  Hear it. `tests/onramp.test.js` checks that tav differs between Ashkenazi and Israeli.

## Today card

- First-run beginner: **"Learn your first letter: Shin (2 min)"** (was "Continue: your first 10 minutes").
- Mid-way: "Continue: step 3 of 5, Your first vowel sign: the small T (2 min)" and the line "2 of 5 wins so far".
- A learner with study time but no lesson is sent to the on-ramp instead of r01's full page; learners who took the placement check
  keep the full page (they said they know some letters). After the five wins: "Continue: Tav and the dot in Bet: Shabbat" (r02).

## Before and after (scripted run, persona A, day 1)

Page height is the full document at 390 px wide; the first ~190 px of every screen is the shell's sound banner (not this lane's).
Taps = taps the script needed to get there. Screenshots are plain JPEGs with no EXIF/XMP (checked by the test).

| Screen | Before | After |
|---|---|---|
| Home, first open | "Continue: your first 10 minutes" — docs/onramp/before/01-home-today.jpg | "Learn your first letter: Shin (2 min)" — docs/onramp/after/01-home-today.jpg |
| First-day step 1 | "Hebrew reads right to left", text only, 844 px — docs/onramp/before/02-firstday-step1.jpg | one letter ש, hear / trace, 1228 px incl. banner — docs/onramp/after/02-firstday-step1.jpg |
| Second screen | "Five letters" in one list, 977 px — docs/onramp/before/03-firstday-step2.jpg | one letter ב — docs/onramp/after/03-firstday-step2.jpg |
| Vowel | "Two vowel signs" at once — docs/onramp/before/04-firstday-step3.jpg | one sign, בָ — docs/onramp/after/04-firstday-step3.jpg |
| First word | shalom, 4 letters incl. 3 just shown — docs/onramp/before/05-firstday-step4.jpg | syllable שָׁ then שָׁב — docs/onramp/after/05-firstday-step4.jpg, docs/onramp/after/06-firstday-step5.jpg |
| End of first day | 8 screens, 15 taps, then r01 (3423 px, 1861 chars, 4-question check) — docs/onramp/before/09-firstday-step8.jpg, docs/onramp/before/91-lesson-r01.jpg | 5 wins, 16 taps, r01 complete, Today points at r02 — docs/onramp/after/07-firstday-step6.jpg, docs/onramp/after/90-home-after-firstday.jpg; r01 page now 2194 px / 776 chars with hooks collapsed — docs/onramp/after/91-lesson-r01.jpg |

Raw numbers: `docs/onramp/before/shots.json`, `docs/onramp/after/shots.json`. Re-run: `node docs/onramp/shots.mjs --out docs/onramp/after`.

## Not done / open

- Steps still scroll a little on an 844 px phone (about 1.3 screens each, half of it the shell's sound banner); the check is below
  the fold until the banner is dismissed. Shortening the shell banner is not this lane's file.
- r02 to r05 still render as full pages; only r01 has sub-steps. The same `steps` shape can be added to them later.
- `tests/journey.test.js` (persona A --quick) passes with the new screens; the journey script answers no on-ramp check, so its
  "first 10 minutes finished" log now records the step-1 screen only. Its loop would need `.fd-check button` to walk the steps.
- Nothing measured with people. The 2-minute budget per step is a target.
