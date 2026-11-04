# Progress screen (lane: progress)

Route `#/progress`, view `src/progress/progress.view.js`. Everything is computed offline from the store; no network, no estimates.

## Files
- `src/progress/model.js` pure computations (streak, goal, SRS maturity, vocab band, Spot It, checkpoints, paths, belts, weak spots).
- `src/progress/decode.js` "what can I read now": per word, which letters and signs are required; lines are graded full / almost (exactly one unknown) / no.
- `src/progress/store.js` writes the only new state: `progress.state` = `{ rest: ["YYYY-MM-DD"...], goal: {kind:"cards", target} }` (max 90 rest days kept).
- `src/progress/data.js` loads lessons, belts, registry, phrasebook, `data/service/orders.json` (for the siddur coverage line) and the data files below. `mergeTimedReadGates()` replaces the `unmeasured` placeholders of the grey and black belts with the timed-read gates from `data/timedread/gates.json` (only `kind: timedRead` entries with a `minWpm`; other belts are never touched; nothing is mutated). If that file is missing, grey and black stay unmeasured.
- `data/progress/milestones.json` goal paths and thresholds. `data/progress/belt-gates.json` ALEF belt gates. `data/timedread/gates.json` timed-read gates for grey and black (targets copy `belts.json` wpmTarget, ALEF proposals, unsourced). All are drafts, not expert-reviewed.

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
| Siddur coverage | graded lines above + `data/service/orders.json`, `service.prefs` | `src/service/model.js coverage()` over Progress's own graded lines, for the service saved on the Service screen (else Shabbat morning). Percent of lines ALEF holds, rounded down; gaps are counted separately. The line links to `#/service` |

## Not built, on purpose
- **Measured reading speed.** The app has no speech recognition. Reading speed appears only from the learner's own timed reads (`#/timedread`), labelled self-reported. See `timed-read-spec.md`.
- **Minutes goal.** Sessions are not timed; a guess would be invented. The goal is in cards.
- **Separate progress export.** Settings already backs up the whole store (`Settings -> Back up`), which includes `progress.state`; the screen links to it.

## Honesty notes
- A belt or "decodable" line means the learner has met every letter and sign in it. It does not mean they read it fluently or correctly aloud.
- Belt gates are ALEF's own (belts.json: the verification sweep found the Aleph Champ ladder does not apply).
- The streak here is rest-aware and can differ from the plain streak lane 1 shows on Home.
