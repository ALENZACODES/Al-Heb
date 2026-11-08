# ALEF — Project State (Handover Snapshot)

**Snapshot taken:** 2026-11-07, 16:26 EST (America/Toronto). This snapshot begins aging the moment it is written. Several workstreams were in flight at snapshot time (see LANES.md); before acting on any "in flight" statement, check the commit log on `main` — work may already have landed.

**Repository:** ALENZACODES/Al-Heb (private). **Live site:** https://alef-review.onrender.com/ — the hosting service (Render, service name `alef-review`) publishes the `main` branch only. Never point the host at a feature branch.

## Where the product stands

- **Main HEAD at snapshot:** `bffaf758a6c0`
- **Precache version on main:** `5f2b183605dc` (in `precache-manifest.js`; the service worker only picks up a new build when this version changes — regenerate it, never hand-edit, with `node tools/build-precache.mjs`)
- **Honest grades (kept separate, never blended):** 8.4 / 10 on the learner-product rubric; 577 / 1000 on the third-party software-house audit of Nov 7; 51 / 100 on the Nov 7 beginner-usability review (its fix list is a queue — see QUEUES.md). The final authenticity points are human-gated: letter-stroke correctness needs the teacher's eye, and tradition voices need blind human judges or human readers.
- **Test gate:** GitHub Actions is unavailable (the account's student-plan minutes are exhausted; upgrading would void the student plan, and the owner has ruled it out). The gate is a full local `npm test`, judged by the summary line (tests / pass / fail) plus a fail-name diff against the baseline — never by the raw fail count alone. Baseline of record after the Nov 7 build (Build C): tests 3043, pass 2959, fail 67. The badges landing that followed added tests (3055 in its own runs); **the first job on any restart is to run the full gate on current main and record the new baseline of record before landing anything else.**

## What is live on main

- **Little Books 1–62, all voiced.** Books 6–62 carry 1,368 high-grade (Chirp 3 HD) clips, both voices, landed Nov 7 and verified live page by page. Book 6 has its 12 pictures; pictures for books 7–62 are the one known content gap on the shelf (see LANES.md, books-branch reconciliation).
- **Build C (landed Nov 7, commits 12e52a9 through 4e58c9b):** the approved sound-enhancement rollout for the historic Sacred Listen recordings (originals preserved in the repo under `audio/listen/originals/`); a compact music bar; a Terms & Rights page carrying every credit; the Home mascot (Rimon) fixed beside the hero title; the letter cartoons wired into the Letter Atlas for all 27 letters, including the hand-redrawn qof; Calendar and Festivals promoted to full destinations and Calendar added to Home's first screen; 35 orphaned routes sectioned so navigation and search find them; one shared books-progress writer.
- **Badges (landed Nov 7, commits a59d0842, a50bd67a, ee331ed6, bffaf758):** the 25-badge engine (streak ladder plus mastery badges), the day-start stamp wired at boot, and all 25 medallion images ingested additively. A few badges stay honestly locked until their data sources exist (named in the engine's staging notes).
- **Prayer veil:** dwell timing fixed (first visit about 9 s, returning about 6 s, counted from when the app signals ready, with a 12 s failsafe). The veil rotates all 80 blessings. See DECISIONS.md for the owner's frequency ruling.
- **Audio estate:** see AUDIO-LEDGER.md. Headlines: prayer library 140/140, veil clips 160/160, synthetic library about 85% of everything the app can request.
- **Dictionary:** one on-screen set of 6,303 entries (a merge build is queued — see LANES.md).
- **Theme:** greens and gold throughout. Blue is out (owner ruling, Nov 7).

## House rules a restarter must not break

1. **Work in an isolated tree.** The shared local mirror is resynced without warning by a scheduled job and has already eaten uncommitted work once (Nov 7). Copy or sync a private tree, work there, and commit each verified chunk through the API immediately.
2. **Precache:** regenerate only with `node tools/build-precache.mjs`, as the last step of a landing, on the final tree. Never hand-edit the manifest.
3. **Images:** never run the image index builder or ingest script locally — the index is a carried artifact and a local rebuild loses images. Ingest by surgical additive edits to the index and approvals files only, and only for approved images.
4. **Commits** are authored `John Khan <johnnykhan1@gmail.com>`, in the owner's name only, with no tool credits or tool names in files, commit messages, or metadata. Strip embedded metadata from every produced file and run a zero-hit scan before committing.
5. **Sale-clear only.** The course is free today and may be sold later; every text, image, font, and recording in the repo must be clear for sale. Known traps are listed in the goal file (see QUEUES.md) — one example: the default English text offered by a popular Tanakh API is non-commercial; the Torah build pins the public-domain JPS 1917 instead, with a test that fails if anything else slips in.
6. **Audio honesty.** Synthetic speech is always labelled synthetic. A tradition voice (Ashkenazi, Sephardi) never ships on machine say-so: it needs the blind-judge gate (authenticity at least 8/10 from at least two judges, no dimension under 6, transcription error rate at most 0.10) or human tradition readers.
7. **Verify on main, then live.** A landing counts only when its commits are on `main` and the served site shows the new precache version and the change itself.

## Sources of truth

- Code and content: the `main` branch of this repository.
- Work state and next actions: this handover pack (LANES.md, QUEUES.md).
- Rulings: DECISIONS.md in this pack.
- Detail behind every summary here: the local working folders named in LANES.md (on the build machine, under `~/workspace/`). If the machine is gone, this pack plus the repository branches are the reconstruction base — every audio branch and its commit is listed in AUDIO-LEDGER.md.

## Pack contents

- `STATE.md` — this file.
- `LANES.md` — every workstream: purpose, status, staging location, what remains, next action.
- `DECISIONS.md` — the owner's rulings of Nov 6–7 with timestamps.
- `AUDIO-LEDGER.md` — the full audio estate and the production pattern.
- `QUEUES.md` — the three open work queues and where they live.
- `packs/` — clean production artifacts (recording scripts, inventories, normalization and enhancement scripts, the tradition recording pack, the blind-audition judge sheet) copied from the local folders so the runs can be repeated without the machine.
