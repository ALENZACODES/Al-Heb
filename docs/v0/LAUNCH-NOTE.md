# Aleph v0: launch note for John (2026-11-04, memory-chain section refreshed about 21:15)

Plain version of where things stand if you ship a tiny first release and share the link. Each claim names the doc it comes from. Counts drift because other work is going on in the repo; re-check before you quote one.

## What v0 is

v0 is the intended first-release set of pages. The code for it exists; its lessons and Hebrew are drafts, its tests have not covered a real phone, and nothing in it has been reviewed (`docs/qa/HONESTY-AUDIT.md`).

- **15 pages** are marked `v0`; the other 71 of 86 are marked `preview` and carry a banner (`docs/STATUS.md`, `docs/v0/SCOPE.md`). The 15: welcome, home, first day, learn, letters, one letter, atlas, progress, settings, about, credits, privacy, install, offline, search (`docs/v0/SCOPE.md`).
- **Baby steps lessons 1 to 10.** The learn page is the lesson path r01 to r10, plus the spaced review of due cards (`docs/v0/SCOPE.md`). The first day ("your first 10 minutes") leads into r01 and is built as short two-minute steps (`docs/onramp/ONRAMP.md`, a draft).
- **Three pronunciation settings:** Ashkenazi, Sephardi, Israeli. A scripted first-release walk was run for each (`docs/qa/V0-WALK.md`).
- The app has no account, keeps progress on the device, and has backup, restore and delete in settings (`docs/v0/SCOPE.md`).

## What is NOT there

- **No recordings.** 0 of 24,906 listed audio clips are recorded (`docs/STATUS.md`). Sound comes from the device's own Hebrew voice, if the phone has one (`docs/audio/NO-AUDIO.md`, `docs/launch/COPY.md`).
- **Preview pages are unreviewed.** They stay reachable by direct link and search, labelled "Preview" (`docs/v0/SCOPE.md`).
- **No native, teacher or clergy review yet:** 0 of 3,718 rows in the review packs are reviewed (`docs/review/STATUS.md`, via `docs/STATUS.md`). No route has met the promotion bar (`docs/v0/SCOPE.md`).
- **Nobody has used it.** No learner has used the app. The review site is deployed (Render, from `main` — see `docs/STATUS.md`).

## Checked and not checked

Checked (scripted, headless browser):
- The v0 walk: israeli table 13 pass, 0 warn, 0 fail, at 375x667, with a second size in the same file (`docs/qa/V0-WALK.md`, `docs/STATUS.md`). It does not judge Hebrew, audio or wording.
- Accessibility on the 15 v0 pages: axe found 0 violations on 14 and 1 minor on `/settings` (`docs/qa/A11Y-V0.md`).
- Five simulated learners over 7 days: 0 console, page or request errors (`docs/qa/JOURNEY.md`).
- Deploy build and check on this machine: 44 of 44 pass, 6 expected warnings (`docs/deploy/GO-LIVE-CHECKLIST.md`).

Not checked:
- **No real phone.** The device runs are emulation, "not a real device" (`docs/qa/DEVICES.md`).
- **Safari/WebKit only partly.** With the normal offline method WebKit passed 52 of 83 checks; with the "stop-server" method it passed 82 of 83 and 80 of 83, and the failures were not investigated (`docs/qa/CROSS-ENGINE.md`). Safari offline is treated as unverified (`docs/STATUS.md`).
- The live site: headers, security policy and the OCR folder on a real host are unverified (`docs/STATUS.md`).
- The full test suite was not re-run for that status file; the last saved full run is stale (`docs/STATUS.md`).
- Open items: the preview pages have known layout and accessibility gaps (`docs/STATUS.md`, from `docs/qa/SWEEP.md`).

## The 5 things you must do to go live

1. **Cloudflare account and deploy** (about 10 minutes): sign up, connect the GitHub repo `Al-Heb`, build command `node tools/deploy/build_site.mjs`, output `dist`, production branch name, Save and Deploy; then run the smoke test on the live URL (`docs/deploy/GO-LIVE-CHECKLIST.md`). Nothing on that list has been done.
2. **Choose a licence** for the code: proprietary, MIT or Apache-2.0 (`docs/legal/DECISIONS-FOR-JOHN.md`, section 1). None is chosen; the content licence questions (share-alike vocabulary; Metsudah-sourced prayers, which that document counts as 21 of 70 corpus records because 21 records mention Metsudah, while only 9 name it in their `source` field) are in section 2 and are not legal advice.
3. **Decide on the extra remote branch** `codex/complete-alef-review`: do not merge it; to delete it, run `git push origin --delete codex/complete-alef-review` from your machine. Its contents were never compared with `main` (`docs/DECISIONS-NEEDED.md`, item 6).
4. **Record the audio kit.** The recorder page and a first-100 list per tradition exist; follow `docs/voices/JOHN-RECORDING-GUIDE.md`. It was tested with a fake microphone only, and its consent wording is a draft for a lawyer (`docs/STATUS.md`, `docs/record-kit/README.md`). Recording is not required for v0 to be honest; it is what makes the sound real.
5. **Test on a real iPhone** (and ideally an Android phone): install, offline with airplane mode, a lesson, review, backup (`docs/deploy/GO-LIVE-CHECKLIST.md` phone steps; the gap is stated in `docs/qa/DEVICES.md`).

## A line you can share

> Early draft of a free Hebrew reading course. There are no recordings yet; where your phone has a Hebrew voice the app uses it, and that is a device voice, not a teacher. No teacher has reviewed the Hebrew and nobody has tested it with learners. Feedback welcome.

Do not call it reviewed, tested on phones, or complete; the docs above do not support that.

Note: `docs/launch/COPY.md` was updated on 2026-11-04 to the figures in `docs/STATUS.md` (24,906 clips, 3,718 review rows).

## New today: the letter memory chain (not part of the checked v0 walk)

- **What exists.** For each of the 27 letter forms: a picture that turns into the letter (`assets/letters/morph/*.svg`, 28 files, sin has no chain entry), and three beats, picture, a sound hook word, and one Hebrew example word (`data/letters/memory-chain.json`, generated from `tools/letters/memory-chain.source.json`). It shows as a memory card on each letter page, as practice cards in review, and in a poster, flashcard sheet and a book section (`docs/letters/MEMORY-SYSTEM.md`, `docs/letters/MORPH-USAGE.md`). Several hooks changed today (loch for chet and final kaf, hut, cup, mailbox, swim ring, shortcake, feather, nuts), and the story text now follows each pronunciation setting. For a letter the learner has not traced yet, the card sits above the tracing box, which pushes the box down (at 375x667 it starts at y 415 to 533 in my scripted run; `docs/STATUS.md` has the numbers).
- **Checked today (scripts, my run about 21:05).** The 18 non-browser `letters.*` test files: 223 tests, 222 pass, 0 fail, 1 skipped (among them `letters.memorychain` 10, `letters.morph` 46, `letters.memorycard` 17); `workbook.extras` 7 pass; the chain build check and the picture contract check pass. The earlier scripted phone-size pass of the card (`docs/qa/MEMORY-CARD-QA.md`) was made before the card moved and before the stories changed; its findings 1 and 4 are addressed, finding 5 (the final kaf sound line) and finding 8 (precache) are not.
- **Not checked.** No native, teacher or learner review. No evidence it helps anyone remember. The pictures are self-rated: the second blind read of 28 pictures (`docs/review/MORPH-RECOGNITION-2.md`, 20:32) rated 22 recognised, 6 weak, 0 not recognised, and ten files were changed after it without a new read. `docs/review/MEMORY-CHAIN-AUDIT.md` predates the hook changes. Whether tracing is harder with the box lower has not been tried. Treat the feature as a draft; it is safest left out of any claim you share.
- **Offline and book.** Nine of the 28 pictures are in the install list and 19 load on demand; the committed `precache-manifest.js` has none of the memory-chain files, so regenerate it before a release (`node tools/build-precache.mjs`). The book outputs were rebuilt around 21:00 and `book/out/alef-book.html` contains the new chapter (`docs/book/REBUILD-NEEDED.md`). The workbook PDFs total 13.27 MiB against a 31 MiB test cap.
- **Your calls.** `docs/DECISIONS-NEEDED.md`, item 15 (card position against tracing box, "loch", "nuts" against nun, final pe wording, weak pictures).
