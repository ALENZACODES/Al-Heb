# Pre-launch checklist, ordered by risk (draft, 2026-11-04)

Nothing here is ticked. A box is ticked only after the command was run or the file was acted on, and the date is written beside it. Owners: JOHN = only John can do it; MAIN = the main session or a lane; ANY = either.

Risk order: things that make the launch illegal or untrustworthy first, then things that make it break, then things that make it unpleasant, then growth.

## A. Cannot launch without these

| # | Item | Owner | Command or file to open | Done |
|---|---|---|---|---|
| 1 | Pick a code licence and a content approach for share-alike vocabulary and unsure-licence prayers; add a `LICENSE` file or keep "all rights reserved" on purpose | JOHN | `docs/legal/DECISIONS-FOR-JOHN.md`, background in `docs/legal/CONTENT-LICENCE-AUDIT.md` (not legal advice; no lawyer has seen it) | [ ] |
| 2 | Every screen that shows Hebrew carries the "draft, unreviewed" notice, and the About screen carries the limitations text | MAIN | `docs/launch/LIMITATIONS.md` to wire; check by opening `#/about`, `#/speak`, `#/torahread`, `#/vocab/themes` | [ ] |
| 3 | No tool or product names in any shipped file; no metadata in images | ANY | `node tools/meta/scan.mjs` and `node tools/meta/scan.mjs --text` (both must say PASS) | [ ] |
| 4 | Full test suite passes; list any failures instead of hiding them | MAIN | `npm test` (as of 2026-11-04 `tests/pwa.manifest.test.js` had 2 failures from other lanes: theme-color meta and an unprecached `src/shell/install-notice.js`) | [ ] |
| 5 | Rebuild the precache list after the last code change, so offline first paint works | MAIN | `npm run precache` (`node tools/build-precache.mjs`); then `node --test tests/pwa.manifest.test.js` | [ ] |

## B. The deploy itself

| # | Item | Owner | Command or file to open | Done |
|---|---|---|---|---|
| 6 | Build and check the deploy folder locally | MAIN | `node tools/deploy/build_site.mjs && node tools/deploy/check-deploy.mjs` | [ ] |
| 7 | Create the Cloudflare Pages account and project (build command `node tools/deploy/build_site.mjs`, output `dist`) | JOHN | `docs/deploy/CLOUDFLARE-PAGES.md`, section "Steps" | [ ] |
| 8 | After deploy, run the "After the deploy" checks on the live URL (HTTPS, headers, service worker, manifest) | JOHN, then MAIN | `docs/deploy/CLOUDFLARE-PAGES.md`; `node tools/qa/pwa_audit.mjs` (read its header for usage) | [ ] |
| 9 | Confirm screenshots in the manifest load on the live URL | ANY | open `/manifest.webmanifest`, then each `assets/screens/*.png`; regenerate with `node tools/launch/shots.mjs` if the UI changed, then `node tools/meta/scan.mjs` | [ ] |
| 10 | Read the CI notes: they were written against an older commit | MAIN | `docs/deploy/CI-GAP.md` | [ ] |

## C. Real-world breakage that emulation cannot show

| # | Item | Owner | Command or file to open | Done |
|---|---|---|---|---|
| 11 | Install and use on one real iPhone and one real Android phone: add to home screen, reload offline, tab bar and More sheet, a lesson, letters | JOHN | `docs/qa/DEVICES.md` (what emulation does and does not cover) | [ ] |
| 12 | Check that Hebrew text-to-speech exists or fails gracefully on those phones (no voice = text only, with a visible message) | JOHN | open `#/speak` and `#/letters/alef` on the phone; `docs/speak/` for design notes | [ ] |
| 13 | Fix the known accessibility and layout defects, or list them on the limitations page | MAIN | `docs/qa/SWEEP.md` (12 ranked findings, for example overflow at 320 px, small tap targets, link without text on Home); `docs/A11Y.md` | [ ] |
| 14 | Back up and restore test of progress | ANY | Settings, export then import; `node --test tests/pwa.backup.test.js` | [ ] |

## D. Trust: the content is unreviewed

| # | Item | Owner | Command or file to open | Done |
|---|---|---|---|---|
| 15 | Send the review packs to at least one clergy or cantor (liturgy and trope) and one Hebrew teacher (core lessons) | JOHN | `docs/review/INSTRUCTIONS.md`, packs in `docs/review/packs/`, status in `docs/review/STATUS.md` (0 of 3,718 rows reviewed on 2026-11-04) | [ ] |
| 16 | Apply returned reviews | MAIN | `node tools/review/ingest.mjs returned.csv --reviewer NAME --type teacher\|cantor\|native --date YYYY-MM-DD` (dry run), then `--write` | [ ] |
| 17 | Fix the code-point errors the Hebrew lint found (mark order, stray marks, final letters). Passing the lint does not prove the Hebrew is right | MAIN | `docs/hebrew-lint/REPORT.md` | [ ] |
| 18 | Keep the launch copy honest: no "native audio", "accurate", "approved" | ANY | `docs/launch/COPY.md`, "Wording rules" | [ ] |

## E. Sound

| # | Item | Owner | Command or file to open | Done |
|---|---|---|---|---|
| 19 | Decide: launch with device voice only (current state), or record priority clips first | JOHN | `docs/voices/recording/priority_summary.md`, `docs/voices/casting-brief.md` | [ ] |
| 20 | If using a local synthetic voice, listen first and follow the evaluation protocol | JOHN | `docs/tts/README.md`, `docs/voices/tts-evaluation-protocol.md` | [ ] |

## F. Support and learning from users

| # | Item | Owner | Command or file to open | Done |
|---|---|---|---|---|
| 21 | Create a contact address or form and put it on the About screen (none exists in the repo) | JOHN | `docs/launch/LIMITATIONS.md`, section "How to report a problem" | [ ] |
| 22 | Pick one or two learners and one shul or class; run a first session | JOHN | `docs/host-kit/facilitator-guide.md`, `docs/host-kit/outreach-drafts.md`, `docs/host-kit/feedback-form.html` | [ ] |
| 23 | Post the launch copy | JOHN | `docs/launch/COPY.md` (use the short lines) | [ ] |

## G. Nice to have, not blocking

| # | Item | Owner | Command or file to open | Done |
|---|---|---|---|---|
| 24 | Generate and approve images (0 approved of 282 ingested on 2026-11-04) | JOHN | `docs/images/RUNBOOK.md`, `docs/images/RIGHTS.md` | [ ] |
| 25 | Re-run the screenshots after UI changes | ANY | `node tools/launch/shots.mjs` | [ ] |
