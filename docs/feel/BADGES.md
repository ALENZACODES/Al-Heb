# Badges: earned recognition in ALEF (draft)

Status: built and unit-tested on top of the engagement loops (`docs/feel/LOOPS-PARITY.md`). Nothing here was tried with a real learner, on a real phone, or with a screen reader. The only browser check was one headless desktop-Chrome screenshot of `#/daily` with an empty store (the shelf rendered, no console review was done). Names and thresholds are the owner's to tune; they are guesses, not tuned on any learner.

## What it is

Badges are things you earn and can look at, in the spirit of trophies and progression tiers: not a currency. Nothing is spent, bought, lost, expired or ranked. Each badge has three levels named First, Steady and Deep. The level is shown by frame shape (circle, rounded square, hexagon), by one, two or three dots, and by words and the number in the text next to the picture; never by colour alone. A badge not earned yet is a dashed outline described as "Next".

Where it lives (all under `preview/loops/`, outside the first-install list):

| File | Role |
|---|---|
| `badges.catalog.json` | the catalogue as data, read once on demand from the site's own files |
| `badges.js` | pure evaluation: `factsFrom`, `evaluate`, `tierFor`, `shelf`, `shelfText`, `badgePlan` |
| `badges.art.js` | deterministic SVG generator (`badgeSVG`, `artFor`) |
| `badges.view.js` | shelf section, new-badge card, `settle` (evaluate and write) |
| `store.js` | gained a migration-safe `badges` field inside the existing `loops.v1` record |

## Catalogue

Quiet badges are not listed until earned. "Counted" facts come from records other screens already write. Reviews and minutes are lower bounds (a card keeps only its latest review time). "Known" letters and words mean answered right at least twice and not being relearned, as on the progress section.

| id | family | signal (what is counted) | First / Steady / Deep | how it is earned (First level) |
|---|---|---|---|---|
| rhythm-start | rhythm | rhythmBest (practice days in a run) | 3 / 7 / 14 | You practiced on 3 days in your practice rhythm. Rest days did not interrupt it. |
| rhythm-long | rhythm | rhythmBest (practice days in a run) | 30 / 100 / 365 | Your practice rhythm reached 30 days. |
| letters-base | letters | lettersBase (base letters known) | 5 / 10 / 22 | You answered 5 of the 22 base letters right at least twice. |
| letters-finals | letters | lettersFinal (final-form letters known) | 1 / 3 / 5 | You answered 1 final-form letter right at least twice. |
| words-known | words | words (words known) | 25 / 100 / 500 | You answered 25 words right at least twice. |
| words-many | words | words (words known) | 1000 / 2000 / 4000 | You answered 1,000 words right at least twice. |
| read-timed | reading | timedReads (timed reads saved) | 1 / 10 / 50 | You saved your first timed read-aloud of a prayer or text. |
| read-texts | reading | readTexts (different texts or lines read) | 1 / 5 / 20 | You timed a read of 1 text or line. |
| read-shema | reading | shemaReads (full read-throughs of the Shema passage) | 1 / 3 / 10 | You read the whole Shema passage (Deuteronomy 6:4-9) aloud once, start to finish, and saved the time. |
| listen-tries | listening | listenTries (listening tries) | 10 / 50 / 200 | You made 10 tries at telling two sounds apart. This counts tries, not how many were right. |
| speak-tries | speaking | speakTries (speaking tries) | 10 / 50 / 200 | You made 10 tries at saying something aloud. This counts tries, not how well they went. |
| traditions | traditions | traditions (traditions tried) | 1 / 2 / 3 | You tried a pronunciation drill in 1 tradition. |
| review-cards | review | reviews (review cards rated) | 100 / 500 / 2000 | You rated 100 review cards. |
| minutes | minutes | minutes (minutes of practice time) | 60 / 300 / 1000 | You spent about 60 minutes of practice time here. |
| offline | offline | offlineDays (days used with no connection) | 1 / 3 / 10 | You used the course with no internet connection. |
| quiet-return (quiet) | quiet | comebacks (returns after a week or more) | 1 / 3 / 10 | You came back to practice after a week or more away. The door is always open. |
| quiet-enough (quiet) | quiet | goalDays (days reaching the goal) | 5 / 20 / 60 | You reached your daily goal on 5 days. |
| quiet-unhurried (quiet) | quiet | longDays (days of 15 minutes or more) | 1 / 5 / 20 | You spent 15 minutes or more with the course in one day. |

Notes on specific rows: Rhythm uses the forgiving practice rhythm, so a banked or declared rest day never interrupts a run; the best run counts. Letters: 22 base letters plus 5 final forms make 27, reached with both Letters badges at Deep. Listening and speaking count tries only, never accuracy. Traditions counts distinct pronunciation traditions (israeli, sephardi, ashkenazi) tried in the tradition listening drill; other places a learner might try a tradition are not counted. Reading badges use the timed-read record: the Shema badge counts timed reads of the whole passage (Deuteronomy 6:4-9) as one text; there is no separate record of a "prayer line", so the first Reading badge counts any timed read. Offline is recorded when `#/daily` is opened with the browser reporting no connection (`navigator.onLine === false`), once per day; it is not recorded from other screens. "Welcome back" counts a return to practice after seven or more days with none; its copy never mentions what was missed.

## Tiers

Chosen from lifetime points (the points already shown on `#/daily`). A tier is never lowered, even if points were trimmed.

| tier | lifetime points from |
|---|---|
| Newcomer | 0 |
| Reader | 100 |
| Regular | 500 |
| Scribe | 2000 |
| Sage | 6000 |

Lifetime points: days older than 30 days are folded into a running total in the badge state, so the record's 400-day limit does not lower the total. A day older than 400 days that was never seen by the page before being trimmed would be missed; that edge is not handled.

## Rules the code keeps (and the tests check)

- Only ever earned: `evaluate` adds levels and never removes or re-dates one; running it twice gives the same record; a lower count later changes nothing; badge ids a newer catalogue no longer lists are kept in storage.
- No loss-shaming, pressure, shopping or ranking words in the catalogue or view text (scanned), no exclamation marks.
- No leaderboard, no friends, no shop, no push, no notification, nothing autoplays, no sound unless the sound setting is on and calm mode and reduced motion are both off.
- A new badge is one calm in-page card (`role="status"`, `aria-live="polite"`, focus not moved); at most three cards at once, the rest wait on the shelf. One slow fade at most, none in calm mode or under reduced motion.
- Sharing is a plain-text summary in a read-only box with a copy button (clipboard only if the browser offers it). No image export, no upload.
- Storage: inside `loops.v1` (already in the privacy table, the whole-app backup and the progress backup); the privacy row now says badges are kept. No new key. A record from before badges reads as empty.
- Install size: no file under `src/` imports badge code; the catalogue and modules are not in the first-install or on-demand lists. The only `src/` change is the longer privacy-table sentence. The first-install size rule was not touched.
- Art: SVG built by code, no raster, no script, every stroke 6 units, colours only from the page variables with the light-theme values as fallbacks, a `<title>` and `<desc>` on each, no text inside except a plain letter on the two letter badges. Contrast of the colour pairs used is checked at 3:1 (4.5:1 for the picture on the filled hexagon) in the light, dark and high-contrast themes by `tests/badges.art.test.js`.

## Deliberately not built

Leaderboards, friends or shared shelves, a shop or any currency, streak-loss or "badge at risk" messages, badge notifications or push, rarity or percent-of-learners statistics, image sharing, timed or seasonal badges, anything that locks a lesson behind a badge.

## Owner decisions

1. Names (badge, family and tier names) and thresholds are guesses; tiers at 0, 100, 500, 2,000 and 6,000 points were not tuned on any learner.
2. Whether the hidden "quiet" badges should exist at all, and whether "Welcome back" (a return after a week or more) is the right idea.
3. Whether the first Reading badge should wait for a siddur-category text (needs the registry loaded in the evaluator).
4. Whether Offline should be recorded from more places than `#/daily`.
5. Whether the badge files should join the offline download group (same question as the loops files; touches the deferral list).
6. Whether the Home streak ever shows badges (it does not now).

## Accessibility notes and what was not tested

Each picture has a title and description; the text beside it carries name, level word, number, how it was earned and the date. The level is never colour alone. Buttons use the shared 48 px class. The new-badge card is polite and does not take focus. Not done: a screen-reader run, a keyboard pass on a device, a high-contrast or forced-colours look, a real phone, a Hebrew-reader review of the two letter pictures, or any learner trial. Contrast is a number check, not a look.
