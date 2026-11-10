# Home / Today QA at 375x667

Scripted pass (Playwright, Chromium, 375x667, touch, service worker blocked), one fresh browser profile per state. Each state was seeded by writing store keys into localStorage (`settings.onboarded`, `onboarding.v1`, `firstday.progress`, `curriculum.progress`, `streak`) and then loading `#/`. This reports what the script saw. It says nothing about comprehension by a real learner, and the seeded states are approximations of real histories.

## Per state (after the copy edits listed below)

| State | Route | Primary action in first screen | Count of primary buttons | Notes |
|---|---|---|---|---|
| 1 Brand new | `#/welcome` | "No, start from the beginning" radio, then Continue | 1 (Continue is below the fold until a radio is chosen) | Letters question visible. |
| 2 After step 1 | `#/` | "Continue: step 2 of 5, Your second letter: Bet (2 min)" at y 447-537 | 1 | Text: "1 of 5 wins so far. The next step is about 2 minutes." |
| 3 Mid first-day (3 wins) | `#/` | "Continue: step 4 of 5, Your first syllable (2 min)" at y 447-537 | 1 | Same layout. |
| 4 After first-day | `#/` | "Continue: Tav and the dot in Bet: Shabbat" at y 421-511 | 1 | Three small links below it (morning verse, Say it, Typing) at y 571-622. |
| 5 Returning after 10 days | `#/` | "Continue: Shabbat Shalom: review" at y 447-537 | 1 | "Welcome back. No need to catch up". Streak line reads "Paused. Your best streak was 4 days." |
| 6 Advanced (40 lessons done) | `#/` | "Continue: Kiddush on Friday night: the wine blessing" at y 421-511 | 1 | Streak "12 days and counting." |

No horizontal overflow and no console errors in any of the six states.

## Observed problems

1. In every state the first screen also carries the yellow "Sound: no recordings exist yet" strip and an "About sound" paragraph with a "Got it" button (y 34-194), which pushes the Today button down to y 421-537 and is a second button above it. This comes from the shell (not src/home or src/onboarding); not changed.
2. Onboarding congregation screen (before edits): the first thing was "Which synagogue stream do you belong to?" with four near-identical long lines; the pronunciation question and any plain explanation of Ashkenazi/Sephardi/Israeli sat below the first screen.
3. Tap count to the first letter, with the sound strip dismissed or not:
   - Default path (radio, Continue, Continue on synagogue screen, "Show my week", "Start"): 5 taps, 6 with "Got it" on the sound strip. This exceeds 4.
   - Shortest path using the existing "Skip the rest and start now" link on the synagogue screen (radio, Continue, skip link): 3 taps, 4 with "Got it". On that screen the Continue button is at y 1141 and the skip link is further down, so a script reaches it by scrolling; a person has to scroll to find either.
   - Not changed: removing a screen needs a product decision.
4. Jargon seen in the first screens: "synagogue stream", "siddur", "placement check", "kamatz", "tav", "Compare traditions", "wins". "wins" is explained by "1 of 5 wins so far" only by context. "Preview" tags and the long Draft note on the plan card remain.

## Edits made (copy only, in src/home and src/onboarding)

- `src/onboarding/firstrun.view.js`: pronunciation question now comes first on the synagogue screen with one sentence: "Ashkenazi, Sephardi and Israeli are three ways of saying Hebrew; your pick only changes the sounds you hear and read, and you can change it any time in Settings." Heading "Your synagogue" became "Your sounds". The movement question reads "Which movement are you part of? (optional)" with "Optional. It does not change your lessons." Goal option "Reading the siddur" became "Reading the prayer book (siddur)" with "Letters, vowels and prayer lines."
- `src/onboarding/model.js`: shortened the repeated denomination lines and the three pronunciation lines (for example Ashkenazi: "The older European style: the vowel kamatz sounds like "aw" and the letter tav without a dot sounds like "s"."). The phrase "Orthodox congregations vary" is kept because a test pins it.
- `src/home/today.js`: link label "Compare traditions" became "Compare pronunciations". The router page title still says "Compare traditions" (src/shell, not touched).
- No edit was needed to the edits another lane made in today.js / firstrun.view.js; the git diff of src/home and src/onboarding showed no uncommitted changes before these edits.

## Tests run after the edits

- `node --test tests/home.today.test.js`: 15 pass, 0 fail.
- `node --test tests/onboarding.test.js`: 20 pass, 0 fail (one failure on the first try, fixed by keeping a pinned phrase).
- `node --test tests/nextlesson.shared.test.js`: 4 pass, 0 fail.
- Screens re-checked with Playwright after the edits (synagogue screen first screen shows the one-sentence explanation and the three pronunciations).

## Not checked

Real devices, screen readers, other widths, the `#/firstday` screens themselves, the Learn path after the first letter.

## Round 2: audio notice and onboarding taps (before / after, observed)

Same method: Playwright, Chromium, 375x667, touch, service worker blocked, fresh profile. One run each; numbers are what the script measured at that moment, not a guarantee for other devices or widths.

| Item | Before | After |
|---|---|---|
| Audio notice strip ("About sound" paragraph + "How this works" + "Got it") | y 34-194 (about 160px), plus a second button above the Today button | one line, 44px (y 71-115 on the first screen, under the header and the existing yellow sound bar): "Audio: your device's Hebrew voice, if it has one - details" and a 44px dismiss button |
| Today primary button, after onboarding (first letter state) | y 421-537 | y 359-449, inside the first 667px screen with the notice still showing |
| Taps from a fresh start to the first letter, default path (letters radio, Continue, Continue, Start) | 5 (6 with "Got it") | 4 (no extra tap for the notice) |
| Same, picking a pronunciation radio (what tools/qa/v0-walk.mjs does) | 6 | 5; the v0 walk (israeli) passed all 12 steps and no longer meets a "Got it" button |
| Shortest path (letters radio, Continue, "Skip the rest and start now") | 3 (4 with "Got it"), skip link below the fold | 3; on the pronunciation screen Continue is at y 513-561 and the skip link at y 578-629, both on the first screen (the bottom tab bar covers from about y 611) |

What changed:
- Superseded: the separate audio banner (`mountAudioBanner`, `bannerLine`) was merged into the single `.sound-bar` (status sentence + "Details" link + dismiss, `wireSoundBar`). Dismissal still uses `alef.audioBannerSeen.v1`.
- `src/onboarding/firstrun.view.js`: on the pronunciation screen, Continue and Skip now go straight to the plan card; minutes a day and the goal keep their defaults and stay changeable from "Change minutes a day" on the plan card and from Settings. The pronunciation question is shorter ("Which way of saying Hebrew?", one sentence), the movement question moved into a collapsed "Optional: your movement" section below the buttons, and the "Skip the rest and start now" link sits right under the buttons. No settings keys were added or renamed (`congregation`, `onboarded`, `goal`, `onboarding.v1` unchanged); a default-path user no longer writes `onboarding.v1.dailyGoal` (it is only written when minutes are chosen).
- Tests changed on purpose: `tests/onboarding.test.js` (two tests: after Continue or Skip the plan card shows, not the minutes form) and `tests/audio.access.test.js` (banner role, label, one-line text, dismissal persisting).

Checked after the edits: `node --test` on onboarding, audio.access, audio.labels, home.today, store.safety (59 pass, 0 fail); a11y.static / fixes / newviews and settings.keys (19 pass, 0 fail); `node tools/meta/scan.mjs --text` passes; `node tools/qa/v0-walk.mjs --cong israeli` all steps pass.

Not checked: the full unit suite (my run hit a 580s limit before finishing; of the tests that reported, one failed, tests/book.images.test.js "manifest.csv has one line per row plus header", on book files that were already modified in the working tree and not touched here); real devices, screen readers, dark mode, other widths, ashkenazi / sephardi walks, the long-form `#/how` content, whether a learner understands "details".
