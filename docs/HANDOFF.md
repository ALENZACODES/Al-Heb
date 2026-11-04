# ALEF handoff for John (checked 2026-11-04)

Every line below was read from the repo or produced by a command run today. Nothing here says the Hebrew is correct, that a learner has used the app, or that it runs well on a real phone. Counts drift while others edit; the commands are in `docs/STATUS.md`.

## What works (in code, checked headless or by unit test only)

- A static, no-dependency PWA: 76 routes in `src/shell/router.js`; 125 core lessons (`data/curriculum/lessons.json`), 50 intermediate lessons (`data/curriculum/lessons-intermediate/`), 6,297 vocabulary records (`data/vocab/meta.json`), 70 corpus records of which two are full reader texts with trope (`data/corpus/reader/`).
- Progress, settings and review cards stay in the browser (`src/store.js`); Settings has backup download and two-step restore (`docs/DEPLOY.md`, section "Backup and storage").
- Offline shell: `sw.js` precaches the shell and answers navigations offline. Updates wait for the learner: the banner in `src/shell/update.js` posts `SKIP_WAITING`, and `sw.js` takes over only then or when all tabs close. Tested with a fake service worker (`tests/settings.update.test.js`); never observed on a real device.
- A deploy build and check exist: `tools/deploy/build_site.mjs`, `tools/deploy/check-deploy.mjs`.
- 202 test files in `tests/`. The newest saved full run I found, `/tmp/fulltest3.txt` (Nov 4 10:45, not re-run now), shows 1728 pass and 1 fail (the journey-doc test). Treat it as stale.
- The text scan passes: `node tools/meta/scan.mjs --text`.

## What is preview

- Only 15 routes are marked `v0`; the other 61 are `preview` and show a "Preview" banner (`docs/v0/SCOPE.md`, `src/shell/preview-banner.js`).
- Known defects from emulated sweeps, not fixed or re-verified here: `docs/qa/SWEEP.md` (focus, contrast, overflow at 320 px, small touch targets) and `docs/qa/JOURNEY.md` (a placement result can send a learner to a locked lesson that the Today card then repeats).
- Hebrew text checks in `docs/hebrew-lint/REPORT.md` list mark-order and final-letter errors; passing them would not prove the Hebrew right.
- Audio: 22,716 clips are listed in `data/audio/manifest.json` and the three `manifest-words-*.json` shards, all with status `missing`; no audio file exists in the repo. Spoken sound is browser text-to-speech.
- Images: 282 ingested, 0 approved (`node tools/images/ingest.mjs status`, `data/images/approvals.json` is empty), so no generated image is shown to learners.
- Local synthetic voice (`docs/tts/README.md`) is built and mock-tested; no real clip has been produced or heard.
- The record kit for volunteer readers (`docs/record-kit/README.md`, `tools/record-kit/`) is built and tested with a fake microphone only; its consent wording is a draft.

## What needs humans

1. **Licence choice.** No `LICENSE` file exists; `README.md` says all rights are reserved. Decide in `docs/legal/DECISIONS-FOR-JOHN.md` (background `docs/legal/CONTENT-LICENCE-AUDIT.md`). Not legal advice; no lawyer has reviewed it. Share-alike vocabulary is an open question there.
2. **Cloudflare Pages.** Nothing is deployed and no account exists (`docs/deploy/CLOUDFLARE-PAGES.md`). Run `node tools/deploy/build_site.mjs` then `node tools/deploy/check-deploy.mjs` first. Run the precache build as the last step before publishing, per `docs/DEPLOY.md` (I did not run it).
3. **Native, teacher and clergy review.** 0 of 7,039 rows reviewed (`docs/review/STATUS.md`); send packs from `docs/review/packs/` with `docs/review/INSTRUCTIONS.md`. Questions for clergy are in `docs/sensitivity/REVIEW-FOR-CLERGY.md`.
4. **Human voices for Sephardi and Ashkenazi.** The synthetic route never covers them (`docs/tts/README.md`). Start with `docs/voices/casting-brief.md`, `docs/voices/donor-rights-grant.md`, `docs/voices/buyout-contract-terms.md`, the scripts `docs/voices/recording-script-sephardi.csv` and `docs/voices/recording-script-ashkenazi.csv`, and `docs/voices/kit/README.md`. `data/audio/equivalence.json` is empty, so no clip may stand in for another tradition until a native speaker says so.
5. **Approving images.** Review and approve or reject; disclosure wording is in `docs/images/RIGHTS.md`; order of work in `docs/images/RUNBOOK.md`.
6. **Real-device tests.** Everything so far is headless Chromium emulation; WebKit was not available (`docs/qa/DEVICES.md`). Needed: iPhone and Android install, offline reload, an update banner cycle, a screen reader (`docs/A11Y.md`).

See also `docs/NEXT-STEPS-JOHN.md` (ordered list; its record-kit line predates `docs/record-kit/README.md`) and `docs/STATUS.md` (its audio and image totals are older than the numbers above).
