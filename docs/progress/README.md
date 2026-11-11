# Progress screen (lane: progress)

Route `#/progress`, view `src/progress/progress.view.js`. Everything is computed offline from the store; no network, no estimates.

## Files
- `src/progress/model.js` pure computations (streak, goal, SRS maturity, vocab band, Spot It, checkpoints, paths, belts and ranks, weak spots).
- `src/progress/decode.js` "what can I read now": per word, which letters and signs are required; lines are graded full / almost (exactly one unknown) / no.
- `src/progress/store.js` writes the only new state: `progress.state` = `{ rest: ["YYYY-MM-DD"...], goal: {kind:"cards", target} }` (max 90 rest days kept); also the progress-only export/import (see below).
- `src/progress/weak.js` the weak-spot report (`weakReport`): up to 10 merged rows, each with a "Do this next" sentence and a `hasRoute`-guarded link.
- `src/progress/weekly.js` the "This week" card (`weeklySummary`, `weeklySentences`) and the inline SVG sparkline (`sparklineSVG`).
- `src/progress/milestones.js` personal milestones (`evaluateMilestones`, `updateMilestones`, `milestoneRows`); `store.js recordMilestones` persists them. Definitions: `data/progress/personal-milestones.json`.
- `src/progress/data.js` loads lessons, belts, registry, phrasebook, `data/service/orders.json` (for the siddur coverage line) and the data files below. `mergeTimedReadGates()` replaces the `unmeasured` placeholder skill checks of ranks G5 (Brown belt) and E5 (Black belt) with the timed-read checks from `data/timedread/gates.json` (only `kind: timedRead` entries with a `minWpm`; other ranks are never touched; nothing is mutated). If that file is missing, those checks stay unmeasured.
- `data/progress/milestones.json` goal paths and thresholds. `data/progress/belt-gates.json` Aleph skill checks keyed by rank (P0..E5). `data/timedread/gates.json` timed-read checks for G5 and E5 (targets copy the rank's `wpmTarget` in `belts.json`, Aleph proposals, unsourced). All are drafts, not expert-reviewed.

## Where each number comes from (store keys, all written by other lanes)
| Shown | Key | Rule |
|---|---|---|
| Letters traced | `letters.progress` | letter with a finished tracing in either script |
| Letters/signs taught | `curriculum.progress` + `lessons.json` | union of letters/vowels of completed lessons |
| Known letters (for decoding) | both of the above | taught OR traced. Signs: lessons only. The Name: lesson `nameLesson` (r15) done |
| Card maturity | `srs.cards`, `srs.vocab` | new = never reviewed; mature = state review and stability >= 21 days; else learning |
| Vocabulary band | `srs.vocab` | highest tier band with >= 10 cards reviewed at least once ("working in", not "mastered") |
| Spot It | `curriculum.pairs` | 1 - errors/trials, shown as "at least X%" because several errors can fall in one round; needs 10 rounds |
| Checkpoints | `curriculum.checkpoints` | passed at 80% (same constant as the checkpoint lane, tested) |
| Streak | all timestamps + `streak` | days with activity, rest days skipped. Card stores keep only each card's last review, so older days come from lane 1's streak record |
| Daily goal | `srs.cards`, `srs.vocab`, `curriculum.progress` | distinct cards reviewed today; a lesson finished today also meets it |
| Weak spots | `curriculum.pairs`, `srs.cards` lapses, `pron.misses` | ranked by miss count; letters already in a pair row are folded into it |
| Timed reads, reading speed | `timedread.v1` | `evaluate()` kind `timedRead` calls `src/timedread/gate.js timedReadGate(gate, raw)`: one text, last 5 reads, median clean wpm and accuracy; texts are never mixed. "Your numbers" shows the read count and the median clean wpm of the text with the most reads. Everything is self-reported: the app keeps only the clock |
| Siddur coverage | graded lines above + `data/service/orders.json`, `service.prefs` | `src/service/model.js coverage()` over Progress's own graded lines, for the service saved on the Service screen (else Shabbat morning). Percent of lines Aleph holds, rounded down; gaps are counted separately. The line links to `#/service` |

| Weak spots, This week, Milestones | see the three sections below | each states its limits in the screen text |
| "What can I read now?" panel | all of the above + `firstday.progress`, `firstday.ladder` + `data/firstday/ladder.json` | `readNowSummary()`: one row per source (letters and signs, lines and words, vocabulary cards, timed reads, siddur coverage, first day). Rows are tagged `taught` (lessons, tracing) or `self` (the learner's own report: timed reads, first-day words, ladder via `unpointedScore`); the view shows a "self-reported" badge on the latter. Links appear only for routes present in the build (`ctx.hasRoute`) |

## Weak-spot report ("Worth another look", up to 10)
Sources, all read-only: `letters.progress` (a letter finished but never without slips, whose best run still had 2 or more), `srs.cards` / `srs.vocab` lapses (vocabulary grouped by topic, 2+ slips; letter and vowel cards by id), `curriculum.pairs` (Spot It), `pron.misses`, `speak.v1` (`soundReport`, sounds with 3+ tries and a miss), `placement.v1` (answers with `correct:false`; words and syllables are grouped into one row), `timedread.v1` (a word marked as a stumble in 2+ reads of the same line, shown as the Hebrew word). Rows about the same subject (for example the letter Bet from tracing, review slips and the placement check) merge: scores add, details join, the strongest source supplies the next step. Each source counts slips its own way, so the order is a rough guide and the screen says so. Speaking rows carry a caveat that the browser's recognizer is unverified for Hebrew. Links go to the first route that exists (`ctx.hasRoute`); with none, to `#/learn?review=1`.

## This week
`weeklySummary(snapshot, now)` covers the 7 days ending today. Source: the shared `streak` record that `src/morning/engage.js` writes through `src/curriculum/streak.js` (both read-only here: `weekStrip`, `projectStreak`).
- **Minutes are a floor.** The record keeps today's engaged seconds and the dates of the last 30 days that reached the 5-minute goal, not minutes for past days. Shown: "At least N minutes" = 5 minutes per past goal day + today's seconds so far.
- **Days reached the goal, streak, rest days honored** come straight from the record (`weekStrip` states). Rest days appear only when the record froze them: Shabbat or Yom Tov with the setting on (counted separately by kind) or days the learner declared here. A day with real activity shows as engaged, not as rest.
- **Cards reviewed** counts distinct cards whose latest review is in the week; **new words** counts word cards with exactly one review, in the week ("at least": cards keep no start date). **Reads** = timed reads in the week (self-reported).
- **Sparkline** (8 buckets of 7 days, oldest first): dated actions only, namely lessons finished, timed reads, speaking-practice attempts, checkpoints and loanword marks. Review cards are left out because only their latest review is dated, so older weeks would read low. It is inline SVG built from numbers (`currentColor`, `role="img"`, the same numbers in the label and in a sentence below it).

## Milestones (certificate-free)
`data/progress/personal-milestones.json`: first 100 words started (cards reviewed at least once, vocabulary plus lesson words), first prayer text read aloud and timed (a timed read of a siddur registry entry; self-reported), siddur coverage 25 / 50 / 75% (best of the three services; taught, not fluent). Dates are stored under `progress.milestones.v1` = `{v:1, achieved:{id:{at, day, basis}}}`. `basis: "dated"` when a stored timestamp shows when (the earliest qualifying timed read); `"noticed"` when the app only saw it on the Progress screen, shown as "first noticed YYYY-MM-DD". Once reached a milestone is never removed or re-dated; a timestamp from the future is ignored. The key is part of the progress-only backup and of Settings -> Back up. No certificate, badge or level is shown.

## Not built, on purpose
- **Measured reading speed.** The app has no speech recognition. Reading speed appears only from the learner's own timed reads (`#/timedread`), labelled self-reported. See `timed-read-spec.md`.
- **Minutes goal.** Sessions are not timed; a guess would be invented. The goal is in cards.
- **Minutes goal** stays unbuilt. A separate progress export now exists (below); the whole-store backup in Settings still includes everything.

## Progress-only backup (export / import with checksum)
`src/progress/store.js`: `exportProgress(store)` writes `{app:"alef", kind:"alef-progress", schema:1, exportedAt, keys, checksum, data}` with `data` holding only the keys Progress reads (`PROGRESS_KEYS` = `model.js KEYS`, so `settings` and other lanes' keys are never included). `checksum` = two FNV-1a 32-bit hashes over the canonical JSON of `data` (keys sorted at every level); it catches a cut-short or edited file, not a deliberate forgery. `inspectProgressBackup(text)` validates without writing; `importProgress(store, text, {mode})` writes only after every check passes: `replace` (default) sets every progress key from the file and removes progress keys absent from it, `merge` writes only the keys present. Keys outside `PROGRESS_KEYS` are ignored and reported. A whole-app backup pasted here is refused with a pointer to Settings. The screen's "Back up your progress" card has the export button (download link plus the text to copy), a file input, a paste box, the mode select and a confirm step.

## Honesty notes
- Belts and ranks are Krav Maga style (IKMF-style layout, `data/curriculum/belts.json`): White P0; Yellow P1-P2; Orange P3-P4; Green P5, G1; Blue G2-G3; Brown G4-G5; Black E1-E5. Each rank is a contiguous run of Reading-track lessons in course order (`src/curriculum/ranks.js`). A rank is earned only by finishing all its lessons, and only after every earlier rank is earned; the skill checks in `belt-gates.json` are shown for information and never earn or hold back a rank.
- A "decodable" line means the learner has met every letter and sign in it. It does not mean they read it fluently or correctly aloud.
- Ranks and skill checks are Aleph's own, not a Krav Maga grade (the verification sweep also found the Aleph Champ ladder does not apply).
- The streak here is rest-aware and can differ from the plain streak lane 1 shows on Home.
