# ALEF on GitHub: What Is Missing and Where It Goes (2026-11-10, 1:45 AM ET)

Checked against `main` at `907caadc` (Torah audio fix), with the GitHub compare API for every branch and file-by-file checks where a branch's commits are not in `main`'s history. Only GitHub was checked: work that exists only on John's computer cannot be seen from here.

## Needs Action

| What | Why it matters | Where it goes |
|---|---|---|
| **PR #40 (Brain Lab offline fix) breaks one test once it meets today's `main`** | Alone it passes. Together with the music pack the first install is 3 KB over its 3.95 MiB budget (`tests/integration.test.js`). | Fixed on `overnight/launch-ready-2026-11-10` (the Israel view loads on first open). This branch takes the same lines, so the two merge without a conflict. Merge launch-ready, or this branch, rather than PR #40 alone. |
| **`main` fails the tracked-text scan in one place** | `tests/audio.music.test.js` line 137 names a vendor inside a negative check (from the music pack, PR #39). `node tools/meta/scan.mjs --text` reports 1 finding. | Add that test file to `tools/meta/text-allowlist.json`, or reword the check. Left alone here so it does not collide with the launch-ready lane. |
| **Tonight's work is on branches with no pull request** | Nothing is lost (all pushed), but nothing is queued for John's tap either. | Open a PR per branch below, marked do not merge without John. |

## Update, 3 AM

The integration branch `overnight/launch-ready-2026-11-10` has since merged the Brain Lab graphics, the commercial pictures, the Rimon stills stage, lesson integrity, the first minute and round 1 of this branch. This branch has merged the integration branch back (at `f04fb7ed`) and reconciled the Brain Lab art, so merging this branch into the integration branch again adds only tonight's later Brain Lab work and conflicts only in the generated `precache-manifest.js` (re-run `node tools/build-precache.mjs`).

## Tonight's Branches (1:45 AM)

| Branch | Ahead / behind `main` | Holds | Next step |
|---|---|---|---|
| `overnight/launch-ready-2026-11-10` | 7 / 1 | Launch polish, Brain Lab alias and search tags, PR #40, install headroom | PR to `main` first |
| the Brain Lab games branch (this one) | see PR #44 | 27 games in three packs: the six synagogue-and-Israel games, the ten classic drills and the eleven 3D Studio games (merged from `feature/brain-lab-games-2026-11-10` at `8cef9ebc`, which this branch now replaces); spoken Hebrew in every pack; tests | Merge after launch-ready |
| `feature/lesson-integrity-2026-11-10` | 3 / 1 | Lesson nikkud, Yom Kippur greetings, misplaced prayers, gloss fixes | PR to `main` |
| `feature/rimon-stills-2026-11-10` | 2 / 1 | Rimon stills 1 to 50 of 200 | Keep going; PR once wired |
| `feature/commercial-images-2026-11-10` | 1 / 1 | 46 pictures, including the Brain Lab hero and ten tokens | Ingest and approve: Brain Lab shows them with no code change |
| `books/pictures-38-62` | 28 / 6 | Little-book pictures 38 to 61 | PR to `main` |

Open pull requests not merged: #42 (box triage), #41 (commercial and Brain Lab picture orders), #40 (Brain Lab offline fix, see above), #38 (plain-English copy), #37 and #36 (QA), #30 (site craft), #29 (prayer audio), #28 (gloss fixes).

## Older Branches With Commits Not in `main`

**Already on `main` another way (safe to delete after a glance):**

- `feature/original-music-audio-fix-2026-11-09`: its 5 commits are inside the music pack branch, which merged as #39 with a later re-cut of the loops.
- `john/torah-hebrew-audio`: the verse clips on `main` are byte-identical.
- The Grade-1 read-along audio branch (PR #21, closed): the clips on `main` are byte-identical.
- `john/word-takes`: the raw pool of 2,236 takes; the takes both reviewers picked landed on `main` in `603a9f81`. Keep it as the pool if more picking is planned.
- `feature/original-music-2026-11-09` (#39), `john/israeli-voice-2026-11-07` (#35) and the beginner awards branch (#24): merged.

**Need a human look (the files on `main` have changed since, so they are probably superseded, but that is not proven):**

- The Nov 7 site-quality branch (PR #30, 52 commits, 425 behind).
- `john/israeli-production-2026-11-05` (16 voice production checkpoints, 727 behind).
- `feature/games-first-words-levels-2026-11-07` and a second branch with the same 14 commits (nine-level game catalogue, Word Finder styling).
- `john/little-books-6-62-2026-11-07` (pictures for books 6 to 13 that differ from the ones on `main`).
- `feature/homepage-olive-harvest-2026-11-07` and a second branch with the same commits (olive-harvest home artwork).
- `audio/foundation-traditions`, `audio/journey-gap-words`, `audio/prayers-standard-backup`, `audio/torah-smoke-raw` (one commit each).

**By design, not missing:** `john/torah-check-*`, `audio/*-raw`, `audio/books-6-62-hd` and `voice-sprint-2026-11-05` are separate result and raw-audio branches with no shared history.

## John's Computer

The local clone at `C:\Users\user\Al-Heb` and the generated pictures folder cannot be seen from here. PR #42 is the plan for any uncommitted voice work on that machine: run its read-only check, then commit what it lists to a new branch and push it. For pictures: put the drawn files in one folder, then use the ingest steps in each order document.
