# CI runner audit: can every step run on a fresh GitHub `ubuntu-latest` runner?

Scope: `.github/workflows/ci.yml`, `.github/workflows/pages.yml`, `package.json`, `tools/test/tiers.mjs`, `docs/test/CI-TIERS.md`.

## What was and was not checked

- Checked by running here: a copy of the working tree made from `git ls-files -co --exclude-standard` (tracked plus untracked, ignored files left out, so no `dist/`, `node_modules/`, `data/images/sheets/`, `data/images/review/`) in a scratch folder with `TZ=UTC LANG=C.UTF-8`. The whole unit tier ran there once (1838 tests, 6 skipped); the files that failed were re-run on a fresh copy (see "Result of the clean-copy run"). Also in that copy: `build_site.mjs` and `check-deploy.mjs --root dist` (44/44 checks), and `build-precache.mjs` twice (output is independent of file mtimes and of git).
- Not checked: nothing was run on an actual GitHub runner. The local machine is Node v22.23.4, Python 3.13, and has ffmpeg, pdfinfo, tesseract, rsvg-convert, Pillow, segno, pypdf, numpy and OpenCV installed, so tool-present paths were exercised and tool-absent paths were only read, not run (except where noted). The browser tier was not run for this audit.
- Wall time: the clean-copy unit run took 17.9 minutes, but the machine was shared (load average above 20 on 2 CPUs), so that number says nothing about a runner. `streak.freeze.test.js` alone took 270 s in the older `TIMINGS.md`. The "unit tier under 10 minutes" goal is therefore unconfirmed; the `test` job has `timeout-minutes: 20` so a slow run fails loudly instead of hanging for 6 hours.

## Findings and what was done

| # | Area | Finding | Action |
|---|---|---|---|
| 1 | Node | Workflows pin `node-version: 22`; local is v22.23.4. `package.json` has no `engines` field. | No change needed. |
| 2 | `npm ci` | The app is zero-dependency: `package.json` has no dependencies and there is no `package-lock.json`, so `npm ci` would fail and must not be added. | No `npm ci` for the app. Comment added to `ci.yml`. |
| 3 | Playwright | Not a dependency. Tests and tools look for it with `require('playwright')` and fall back to `/opt/npm-tools/...` or `/usr/lib/node_modules/...`, which do not exist on a runner. | `browser` job runs `npm install --no-save --no-package-lock playwright@1.63.0` (the version present locally) then `npx playwright install --with-deps chromium`. Unit-tier tests that use it (`a11y.fixes`, `record-kit`, `book.cards`) skip with a message when it is absent. |
| 4 | axe-core | `tests/a11y.*`, `sweep` need `tools/a11y/node_modules/axe-core` (gitignored). `tools/a11y/package-lock.json` is tracked. | `browser` job runs `npm ci --prefix tools/a11y`. |
| 5 | `dist/` | Gitignored. `tests/deploy.smoke.test.js` skips without it; `deploy.test.js` already skips with a message. | `browser` job runs `node tools/deploy/build_site.mjs` before the tier so `deploy.smoke` runs instead of skipping. |
| 6 | Python | The runner's system `python3` is Debian-style "externally managed", so the previous bare `pip install segno` could fail. | `actions/setup-python@v5` (3.12) plus `tools/test/requirements-ci.txt` (new). The pip step now fails visibly (a failed install is no longer ignored); the Toolchain report step prints what is actually importable. |
| 7 | Python modules imported by tests and tools | See the list below. | Installed: segno (pinned 1.6.6), Pillow, pypdf, numpy, opencv-python-headless (Pillow is pinned to 11.3.0, the version the green main CI used; the others are ranges, not pins). |
| 8 | poppler (`pdfinfo`) | Used by `tests/meta.test.js` and `tools/meta/lib.mjs`; the test is skipped when absent. | `apt-get install poppler-utils`. |
| 9 | ffmpeg / ffprobe | Used by `audio.script`, `meta`, `record-kit`, `tts.pipeline`; each skips when absent (`tts.pipeline` skips with "python3/ffmpeg/ffprobe not available"). | `apt-get install ffmpeg`. |
| 10 | tesseract + Hebrew data | `images.ingest` OCR tests skip with "Pillow or tesseract (heb) not installed". | `apt-get install tesseract-ocr tesseract-ocr-heb`. |
| 11 | ImageMagick | No unit-tier test or script it invokes calls `convert`/`magick` (searched `tests/` and `tools/meta`). | Not installed. |
| 12 | Fonts | Unit tier reads font files from the repo (`assets/fonts`, existence checks only). Pixel and overflow checks (`book.cards`) run in Chromium, which uses repo fonts, and are in the skip path without Playwright. | No system fonts needed for the unit tier. `--with-deps` installs the fonts Chromium needs. |
| 13 | rsvg-convert | The book QR decode test (`book.build`, rasterises each SVG before decoding) and the `LETTERS_REVIEW_FULL=1` review-sheet test. Without it the QR test fails with a JSON parse error rather than skipping. | `ci.yml` installs `librsvg2-bin` with the other system tools; the Toolchain report prints whether it is present. |
| 14 | Timezone and locale | The local machine is `America/Toronto`; the runner is UTC. `festivals`, `engagement.dst`, `streak.freeze` set `process.env.TZ` themselves. The clean-copy run used `TZ=UTC LANG=C.UTF-8` and showed no zone-dependent failure. Many other tests call `new Date()` without setting a zone. | `ci.yml` sets `TZ: UTC` and `LANG: C.UTF-8` explicitly and prints them in the Toolchain report. Not exhaustively proven for the 116 date-touching lines; the full run was green apart from the items below. |
| 15 | Case sensitivity | Runner and local box are both case-sensitive Linux. A scan of all non-ignored files found no two paths differing only by case. | No change. |
| 16 | Executable bits | 13 tracked files under `tools/` are mode 100755. Tests run scripts through `bash`, `python3` or `node` explicitly (no direct `./script` execution found). | No change. |
| 17 | Gitignored files tests need | `dist/` (handled, 5), `tools/a11y/node_modules` (handled, 4), `node_modules` (only for Playwright, handled, 3). `data/images/sheets/`, `data/images/review/`, `dist-test/` are produced by the tests themselves into temp folders or recreated (`integration.test.js` writes and removes `dist-test/`); the clean copy lacked them and those tests passed. The UXLC XML cache for `corpus.verify` is gitignored; those 2 tests skip with a message. | No change. |
| 18 | jsdom | Not installed anywhere; two tests in `firstday.test.js` and one in `firstday.ladder.test.js` need it. The two in `firstday.test.js` used `return`, so they reported as passed without asserting anything. | Changed both to `t.skip('jsdom not installed ...')`, so the skip is visible. jsdom is not installed in CI (the app has no dependencies). |
| 19 | Job time | No `timeout-minutes` anywhere (default is 360). | Added: `test` 20, `build-dist` 10, `browser` 45, `pages` jobs 10. |
| 20 | Browser tier | Was the `smoke` job, `needs: test`, `continue-on-error: true`, installed Playwright, did not install axe, did not build `dist/`. | Now a standalone `browser` job (runs in parallel with `test`), installs Playwright and axe, builds `dist/`, runs `npm run test:browser` then `tools/smoke.mjs`, uploads `docs/screens`. Required: `continue-on-error` was removed when merging main (browser regressions must be visible); the remote's green `smoke` job used the same Playwright install, but this `browser` job (axe, dist build, pinned Playwright) has not yet run on a GitHub runner, so watch its first run. |
| 21 | Concurrency | None, so duplicate pushes queued full runs. | `concurrency` group per ref with cancel-in-progress added to `ci.yml`. |
| 22 | Token scope | No `permissions:` in `ci.yml`. | `permissions: contents: read` added. |

### Python imports reachable from tests and tools

Unit tier (all guarded by a skip unless noted): `segno` (`book/make_qr.py`, `book.overlay`, `book.build`), `cv2` and `numpy` (`book/verify_qr.py`, used by the `book.build` QR decode test), `pypdf` (`book/pdf_tools.py`, `book.build`, `meta`), `PIL` (`images.ingest`, `images.review`, `images.redo`, `images.ingest_fixtures.py`, `tools/images/ingest_image.py`, `book/contact_sheets.py`), standard library only for `tools/tts/render_chatterbox.py --mock` and `verify.py --mock` (`tts.pipeline`). Not installed in CI and not reached by the unit tier: `torch`, `chatterbox`, `nakdimon`, `faster_whisper` (real TTS), `argos` (OCR bench), and anything under `tools/ocr-bench`, `tools/vocab`, `tools/youtube`.

## Result of the clean-copy run

- First full run, copied while other work was still landing in the shared tree: 1803 pass, 29 fail, 6 skipped. The failures were: files missing from the copy because they were created after the file list was taken (`src/shell/sources.js` imported by several views), and image runbook counts that depend on files being deleted at the time. Re-running the 21 affected files on a fresh copy gave 273 pass, 1 fail.
- The one real failure: `integration.test.js` "precache: skips vendor, PDFs and files over the size limit" reports that `precache-manifest.js` does not list `src/shell/sources.js`. That is a stale committed manifest, not a runner problem. It is the same condition the `Precache manifest is current` CI step checks: `node tools/build-precache.mjs` must be run and `precache-manifest.js` committed together with the new source files. This audit was not allowed to run it in the repo.
- `build_site.mjs` then `check-deploy.mjs --root dist`: 44/44 passed, 6 warnings (origins named in code), 722 files, 60.48 MiB.
- Skips seen (all with a message): a11y browser test (no Playwright/axe), two UXLC cache tests, `deploy.test` dist copy, jsdom view test, `LETTERS_REVIEW_FULL` review sheets.

## Former flip criteria for the `browser` job

The merge with main made this job required (no `continue-on-error`). These are the checks its first GitHub run has to show green: one run of that job on GitHub shows all of these green: the Playwright/Chromium install, `npm ci --prefix tools/a11y`, `npm run test:browser`, and `tools/smoke.mjs`. Until then a failure there is an install or environment problem first. Known risks I could not test: Chromium sandbox on the runner, `--with-deps` apt time, the 45 minute budget for the one-file-at-a-time tier, and `perf.test.js` / `journey.test.js` thresholds on slower shared CPUs.

## Remaining caveats

- `requirements-ci.txt` pins segno and Pillow; the rest are ranges; tighten after the first green run.
- If any apt or pip step fails, the job continues and the affected tests skip. The Toolchain report step is where to look.
- `pages.yml` needs nothing beyond Node 22; its deploy job only runs when the repository variable `ENABLE_GITHUB_PAGES` is `true`.
