# Honesty audit: items 22, 23, 29, 30, 37, 38 (2026-11-04)

Scope: wording and records that could claim more than was checked. Everything below was read in the repo or run today; nothing was run on a phone, with a screen reader, with a Hebrew speaker or on a host. No file was committed or added to version control, and `tools/build-precache.mjs` was not run (the precache is still stale, see the last section).

## 1. Listen and pick (item 22)

| Claim checked | Evidence | Change |
|---|---|---|
| Page title says "Listen and pick" even when the screen is a reading drill | `data/listen/config.json` says the fallback is reading; `src/listen/listen.view.js` hard-coded the title | Title now follows the mode: "Listen and pick" only when at least 4 words have clips and the learner has not chosen "I do not use audio"; otherwise "Read and match". Before the list loads it reads "Word drill". |
| Instructions | Same file | Reading fallback now says it is a reading drill and that seeing a word and its meaning is not listening, so nothing shows how well the learner recognises spoken Hebrew (`READ_ONLY_NOTE`). |
| Missing recordings vs offline | `audio.manifestState === 'offline'` exists in `src/shell/audio.js` | Offline shows "The list of recordings could not be loaded (offline?)" instead of "Audio not recorded yet", which would have been untrue. |
| Browser speech | `audio.has()` is true only for a file (`src/audio/player.js`, `has: ... source === 'file'`) | The listening intro says browser speech is not used in the drill. A play failure still reports "could not play". |
| Clips may be computer-made | Manifest statuses `tts`, `synthetic-*` are files too (`src/shell/audio-labels.js`) | Intro names how many clips are human-recorded and how many computer-made, from `audio.status().entryStatus` when available. No synthetic clip exists today (0 of 24,906 are recorded or generated). |
| Score meaning | `listen.v1` mixed reading and listening picks in one tally | State now keeps `heard` and `heardCorrect`; the screen reports "reading: x right out of y" and "after hearing a clip: ..." separately, with a note that it is a personal tally, not a test result. The end-of-round line says "listening" or "reading" questions. Old saved state still loads (new fields default to 0, so earlier picks show as reading). |
| Teacher report text | `grep listen src/teacher` finds no listen figures; `src/shell/privacy.view.js` labelled the key "Listen-and-pick results" | Label now "Listen-and-pick and read-and-match tallies". Nothing else shares the listen tally. |

Tests: `tests/listen.test.js` (3 new tests: title and intro per mode, offline wording, listening score kept separate and clip kind named) and `tests/honesty.wording.test.js`.

Not changed, needs a decision: the route table title and nav label (`src/shell/router.js`, `nav.listen` in `src/shell/i18n.js`) still say "Listen and pick" for the whole page, because those files belong to the shell lane and tests may depend on them. While no clips exist, the nav entry names a listening drill that is a reading drill. Suggested: "Listen and pick (or read and match)".

## 2. Letter tracing (item 23)

| Claim checked | Evidence | Change |
|---|---|---|
| Draft warnings | `reviewNotice()` and the draft notice in `src/letters/trace.view.js` | Kept unchanged. |
| Assisted completion | "Next stroke" set `assistedRun`; strokes the app showed after mistakes (`r.forced`) did not, and still counted as drawn (the comment in `src/letters/progress.js` said so) | A forced stroke now makes the run assisted. Assisted runs are recorded apart from drawn ones, the feedback says "Walked through." instead of "Perfect!" or "Done.", and the note says the app moved the strokes. |
| Chip and picker labels said "completed" | `trace.completed` | Now "drawn by you"; the walked-through chip reads "walked through with help, not drawn by you yet". `src/letters/progress.js` comment corrected. |
| Strokes right? | `docs/STATUS.md` already says accepting 54 stroke sets does not show the strokes are right | No change. The tracer's check is a rough shape-and-order test; "drawn by you" does not mean correct. |

Test: `tests/honesty.wording.test.js` (source checks only; no DOM run of a forced-stroke tracing). `tests/letters.trace*.test.js` and `letters.progress.test.js` pass.

## 3. Placement and mastery wording (item 29)

| Claim checked | Evidence | Change |
|---|---|---|
| Recommendation wording | `src/placement/placement.view.js`: "Suggested starting point", "Your answers fit lesson", "Last result", "answered correctly" | Now "A possible starting point", "point towards", "Last suggestion", "answers matched", plus a line that a short untested check cannot show how much the learner knows and a line that nothing is locked in (earlier or later lessons, retake). The draft note that the cutoffs are untested guesses is kept. |
| "Measured mastery" anywhere | grep (case-insensitive) for mastery, mastered, proficien, fluen, CEFR across `src/`, `docs/*.md`, `docs/v0`, `docs/launch`, `docs/release`, `book/*.mjs`, README | No learner-facing text claims mastery. Hits are denials ("Not mastery", "Nothing is a fluency score") in `src/progress`, `src/sprint`, `src/typing`, `src/service`, `src/curriculum/exercises.session.js`. |
| "Black belt (practice for fluency)" | `src/curriculum/learn.view.js` | Changed to "Black belt (all belts finished; keep practising)" (it implied fluency was the next step). |

Needs a human, not changed (file in flux or a design choice):
- `src/curriculum/dom.js` `levelLabel()` shows "Beginner (A1)", "Elementary (A2)", "Intermediate (B1)", and `src/coursemap/model.js` shows A1/A2/B1 codes. They are CEFR names on lessons nobody has benchmarked against CEFR. `data/curriculum/resource-concepts-gratis.json` mentions a CEFR claim only as a research note. Recommend dropping the codes or adding "Aleph's own estimate".
- `docs/strategy/ACTIONS.csv` A31 plans a "mastery check per rung": a plan, not a claim.
- Placement items come from lesson data and the recommendation has no validation; tests only check the arithmetic.

Test: `tests/honesty.wording.test.js` fails if the placement files or config contain "measured mastery/proficiency", "proven" or "certif".

## 4. Release and launch docs (item 30)

Each count was re-run today. Changes:

| Claim | Result |
|---|---|
| Routes 85, v0 15, preview 70 | Router now has 86 routes, 15 v0, 71 preview. Fixed in STATUS, HANDOFF, LAUNCH-NOTE, README, DECISIONS-NEEDED item 9 (said 62). |
| View files 78, JS files 253, test files 241 | 79, 268, 252. Fixed in STATUS and HANDOFF. These count files only, not passing tests. |
| Audio 24,900 (HANDOFF, COPY) | 24,906 across the four manifests, all `missing`; no .mp3/.ogg/.m4a/.opus file under `assets/`. Fixed. |
| Review rows 3,716 (HANDOFF, LAUNCH-NOTE) | `docs/review/STATUS.md` says 0 of 3,718. Fixed. Area packets are 8,541 items, about 94.5 h (docs said 8,508 and 92.9 h). Fixed in STATUS and HANDOFF. |
| README "14 items" | `docs/DECISIONS-NEEDED.md` has 15. Fixed. |
| LAUNCH-NOTE "21 prayer records", STATUS "9 of 70" Metsudah | Both are true counts of different things: 21 records mention Metsudah anywhere, 9 name it in `source`. LAUNCH-NOTE now says so. |
| Images 1,797 rows, 914 ingested, 187 flagged, 883 not generated, 0 approved | Re-run `node tools/images/ingest.mjs status`; `approvals` is `{}`. Correct. |
| 15 v0 routes listed in LAUNCH-NOTE | Matches the `tier: 'v0'` names in the router. Correct. |
| Share line "Audio is coming" | Promised something; replaced with a line that says there are no recordings, the device voice is not a teacher, no teacher reviewed the Hebrew and nobody tested with learners. |
| Distinction between finished code, drafts, scripts, tests, reviewers | Added a classification table to STATUS, a short paragraph in HANDOFF, a sentence in README and LAUNCH-NOTE. No part is called finished. |

Not re-verified (left as written, each already says it was not re-verified): test pass counts quoted from other lanes' docs, the QA doc summaries, CI run details, the Deploy build figures (stale, flagged in STATUS), the docs count (1,223), the legal and TTS summaries. The branch state in HANDOFF ("many modified tracked files") was not re-read.

## 5. Voices (item 38)

| Place | Says | Verdict |
|---|---|---|
| Settings (`plain-copy.js` settingsIntro, shown above the voice choice) | "There are no recorded voices yet. The Man and Woman choice is saved for later. Sound comes from your device's own voice." | Consistent. The radio labels "Woman (Noa)" and "Man (Ari)" name people; the sentence above them is the only qualification. |
| About | "There are no recordings yet ... device's built-in voice" | Consistent. |
| How this works | "No human or studio recordings exist yet, and no synthetic voice files exist either ... the Man/Woman choice cannot change it yet" | Consistent and matches the files on disk. |
| Offline | "none are recorded yet" | Consistent; added that the speech is the browser's own voice and that offline use depends on the device (not tested). |
| Install | `src/shell/install.view.js` makes no claim about voices | No claim, nothing to contradict. |
| Accessibility statement, Home sound bar (`src/app.js`), reader footers, scan page | "no recorded voices ship yet", "No recordings." | Consistent. |
| Book front matter (`book/build.mjs`) | "audio recordings do not exist yet ... device's Hebrew voice, if it has one" | Consistent. The letter-page link label said "Hear it & trace it"; changed to "Open it & trace it". `book/out/` is generated and was not rebuilt, so the built book and PDFs still carry the old label. `book/babysteps/section.mjs` line 58 says "Listen and spot the letters you know" for the Priestly Blessing; no recording exists, so it only works if someone reads it aloud. Not changed; needs the book owner. |
| Visible distinction | `src/shell/audio-labels.js` and `audio-access.js` label a clip "Recorded by a human reader", "Synthetic voice ..., not a recorded teacher" or "Device voice, not a recorded teacher; Israeli-style only"; the sound bar shows "text-to-speech voice, not a recording" | Distinct in code and unit tests with fake audio; never seen on a real device. `audio-labels.js` and `audio-access.js` belong to another lane and were not edited. |

Test: `tests/honesty.wording.test.js` checks the strings above exist in those files.

## Commands run

- `node --test tests/listen.test.js tests/placement.test.js tests/letters.trace.test.js tests/letters.progress.test.js tests/honesty.wording.test.js` plus settings and privacy files: pass.
- `node tools/meta/scan.mjs --text`: PASS (5,537 tracked files, 24 allowlisted).
- In a combined run, three precache tests in `tests/integration.test.js` and the letter-pictures test failed; the cause named in their messages is the stale `precache-manifest.js` and the first-install size budget (3.82 MiB against a 4 MiB limit with 0.25 MiB headroom required). One settings backup test failed in that combined run and passed when its own file was run alone; not investigated.
- Not run: the browser tier, the full unit tier.

## Needs a human

1. Nav/route title for Listen and pick (shell lane).
2. CEFR labels on lessons (`dom.js`, `coursemap`).
3. Rebuild the book and the precache after the shell and book edits (precache owner; `build-precache` was not run). `src/shell/offline.view.js`, `privacy.view.js`, `listen.view.js`, `placement.view.js` and `trace.view.js` changed, so the stale-manifest state is unchanged but still owed.
4. A Hebrew-speaking reviewer for the read-and-match word list (machine-built; glosses and points may be wrong, as the screen already says).
5. A real-device look at the Listen screen once any clip exists, to confirm the clip-kind sentence and the mode switch read correctly.
