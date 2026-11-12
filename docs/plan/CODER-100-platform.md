# CODER-100: Lane Platform (H, I, J Ideas), 12 November 2026

Branch `lane/platform-2026-11-12c`. Every row is unit-tested (tests/platform.*.test.js); nothing below was checked in a real
browser or on a phone in this lane. New screens are lazy routes under `src/platform/` (on demand, not in the first install).

| Idea | Status | Files | What the learner sees |
|---|---|---|---|
| H1 Scheduler transparency | extended existing | src/platform/sched-state.js, src/platform/scheduler-live.js, src/fsrs/scheduler.view.js | #/scheduler now opens with "Your Reviews Now": cards by state and by interval, due now / today / tomorrow, the scheduler's own recall estimate (labelled a formula) and the recall measured from their answers. |
| H2 Fitted weights on-device | built | src/curriculum/srs.js (answer log, activeParams), src/platform/fit.js, docs/srs/FITTED-WEIGHTS.md | "Fit to My Reviews": says "not enough review history yet: n of 300" until there is enough; then offers fitted first-answer days and growth factor, used only if they predict better and only after the learner presses "Use my fitted numbers". |
| H3 Cram mode | built | src/platform/srs-tools.js, src/platform/cram.view.js, src/curriculum/review.view.js, src/curriculum/learn.view.js | #/cram: pick 5 to 30 minutes; the lesson review is sized from their own measured pace (an estimate until 20 cards are timed), due cards first, then weak ones. |
| H4 Leech detector | built | src/platform/srs-tools.js, src/curriculum/review.view.js | A card missed five times or more comes the other way round in review: the answer first, recall the Hebrew, then show it. |
| H5 Mastery map | built | src/platform/mastery.view.js | #/mastery: every review card as new, learning, known or mastered (stated thresholds), by section and state. |
| H6 Weekly report | extended existing | src/platform/week.js, src/platform/week.view.js (reuses src/progress/weekly.js) | #/my-week: the last 7 days (lessons, XP, minutes as a lower bound, cards, words, books, streak, rest days). Not pushed on Sundays: there is no Home hook (shared hot file). |
| H7 Learner-set goals | built | src/platform/week.js, src/platform/week.view.js | Weekly XP, minutes and lesson goals the learner chooses, with progress on #/my-week. Not shown on Home (hot file). |
| H9 Badges from verified completions | built | src/platform/badges.js, src/platform/badges.view.js | #/lesson-badges: count and path badges from lessons with a kept passing first-try score only; the rest listed as the unverified era. |
| H10 Export my data | extended existing | src/platform/export.js, src/platform/mydata.view.js | #/my-data: what is stored, the JSON backup (Settings > Restore and #/move read it back), and review cards and lessons as CSV. |
| I1 Toast hygiene contract | built | src/shell/transient.js, src/audio/sfx.js, src/retention/ui.js, src/app.js | "Not this time" (the answer line for screen readers, #media-twin) and the hearts line no longer stay in the page all session; toasts go on navigation. |
| I2 Stale-while-revalidate | already existed in part, verified, not extended | src/shell/loading-contract.js | Repeat visits in a session already paint an inert snapshot at once. Not extended to first visits: keeping page snapshots across sessions would store progress text outside the store, which Delete all my data does not clear. |
| I4 Dead-button gate | built | tools/deploy/check-buttons.mjs, .github/workflows/ci.yml | Nothing visible; CI fails on any button without a handler or a disabled state (855 pass). |
| I9 Helpful 404 | built | src/platform/suggest.js, src/app.js | An unknown address offers up to three close pages ("Did you mean") and Search. |
| I10 Build stamp and changelog | extended existing | tools/release/changelog.mjs, data/platform/changelog.json, src/platform/whatsnew.js, src/shell/about.view.js | About: "What Changed Recently", the newest changes from the git history (generated, not hand-written). |
| J1 Offline indicator | built (visited content already existed, verified) | src/shell/offline-badge.js, src/app.js | A line under the header while offline, linking to Use Aleph offline. sw.js already keeps every page file it fetched. |
| J2 QR pair sync | already existed, verified | src/sync/move.view.js, src/sync/qr.js, src/sync/transfer.js | #/move (link, QR code or file); its 31 tests pass here, including the OpenCV decode test. |
| J3 Shareable progress card | built | src/platform/week.js, src/platform/week.view.js | A 1080 x 1080 picture of the week drawn on the device, to download or share. |
| J4 Printable worksheets | built | src/platform/worksheet.js, src/platform/worksheet.view.js, src/shell/workbook.view.js | #/worksheet: the current lesson's letters and words to copy, a matching exercise and an answer key, printed with a print stylesheet (Save as PDF in the dialog). |
| J5 Focus mode | built | src/platform/focus.js, src/platform/focus.view.js | #/focus: a book, prayer or Torah chapter one passage at a time, large text, chrome hidden. |
| J6 Keyboard shortcuts | built (help page and "?"; not every game) | src/platform/shortcuts.js, src/platform/shortcuts.view.js, src/app.js | #/shortcuts lists the shortcuts that exist, each checked against its code; "?" opens it. |
| J7 Accessibility gate | built | tools/deploy/check-a11y.mjs, .github/workflows/ci.yml | Nothing visible; CI fails on an unnamed field, an image without alt, or a lost reduced-motion rule (183 pass, nothing to fix). |
| J8 Performance budget | built | tools/build-precache.mjs | Nothing visible; the precache build fails over 3.95 MiB first install or 2.2 MiB installed JavaScript. No first-paint time budget (needs a browser). |
| J9 Search everything | extended existing | src/platform/search-more.js, src/shell/search.view.js, src/shell/search.js | #/search also finds lessons, books, root families, prayers and texts, Torah references, and on request every Torah verse by Hebrew or English words. |
| J10 What's new feed | built | src/platform/whatsnew.view.js | #/whats-new: the change list, with entries since the last visit marked. |

Shared files touched (small, additive): src/app.js, src/shell/router.js (one spread of src/shell/platform-routes.js),
src/shell/nav-model.js, src/shell/nav.strings.js, src/shell/search.js, src/shell/search.view.js, src/shell/about.view.js,
src/shell/workbook.view.js, src/shell/offline.js (two groups), src/curriculum/srs.js, src/curriculum/review.view.js,
src/curriculum/learn.view.js, src/audio/sfx.js, src/retention/ui.js, tools/build-precache.mjs, package.json (release script),
.github/workflows/ci.yml (two check steps). First-install headroom was bought back by moving the Grammar notes page code and an
unused speaking model on demand.
