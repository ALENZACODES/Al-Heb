# Push gate: interim rehearsal (not a final verdict)

Verdict at the time of the run: NO-GO. Reason: the working tree never went quiet while it ran, so the results describe a moving snapshot, not a releasable state. This note was written from the gate lane's report; nothing here was re-run by the person who wrote it.

## What was run (in a temp copy)

- `node tools/build-precache.mjs`: exit 0 (323 installed, 273 on demand). The committed `precache-manifest.js` is stale against it; only running build-precache at push time fixes that.
- Deploy build and check (`build_site.mjs`, then `check-deploy.mjs --root dist`): 46 of 46 passed, 7 harmless warnings about an origin named in code. All 323 precache URLs exist in `dist`.
- `node tools/meta/scan.mjs`: pass, zero findings. `scan.mjs --text` passed in the repo.
- `npm test`: did not finish. It hit the 500 s cap after 1870 results (1868 ok, 2 not ok, 6 skipped); later tests never ran.
- The browser job (Playwright, Chromium, axe) was not run by the gate lane.

## Failing tests seen

1. `tests/curriculum.learnflow.test.js:58` ("lesson deep link shows letters/vowels/words with audio, completes, creates cards and a streak"): waited for the text "Draft content" and timed out. Cause not verified.
2. `tests/integration.test.js:42` ("settings defaults and validation"): new settings keys (audio-free, calm mode, letter spacing, line length, line spacing and possibly more) are not in the test's expected object. Cause looks like in-flight accessibility work; not confirmed.

## Conditions before any push

- Remote main has moved (8 commits from three merged pull requests; CI and Pages are green there). A plain push of the local history will be rejected and a force push would destroy those commits: never force. See `docs/release/MERGE-PLAN.md`.
- Tree quiet (no file changed in the last 10 minutes), `npm test` fully green apart from declared skips, `npm run test:browser` run, build-precache run and its output staged, deploy check and both metadata scans passing, `git status` checked so build artifacts are not staged by accident.
