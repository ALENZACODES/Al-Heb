# GitHub Actions is not running: a billing block, not a code failure (2026-11-07)

## What is happening

Every workflow run on `main` since 01:49 UTC on 2026-11-08 shows `failure` in `gh run list`, for both `ci` and `pages`, and each one finishes about 2 seconds after it starts with zero steps executed. Read on 2026-11-08 02:28 UTC:

| Run | Workflow | Commit | Created (UTC) | Jobs |
|---|---|---|---|---|
| 42435887075 / 42435887067 | ci / pages | `e9889e11` | 01:49:14 | not started |
| 42437037904 / 42437037800 | ci / pages | `39ae3543` | 02:05:43 | not started |
| 42438050194 / 42438050186 | ci / pages | `b616ac68` | 02:19:36 | not started |
| 42438415674 / 42438415744 | ci / pages | `f19f50cf` | 02:24:35 | not started |

For run 42438050194 the three `ci` jobs (`test`, `build-dist`, `browser`) each report `steps: 0`, started 02:19:37 and completed 02:19:38 to 02:19:39. The job's check-run annotation (`gh api repos/ALENZACODES/Al-Heb/check-runs/<job-id>/annotations`) reads:

> The job was not started because recent account payments have failed or your spending limit needs to be increased. Please check the 'Billing & plans' section in your settings

The job log endpoint returns 404 (no log exists because nothing ran). The repository is private (`gh api repos/ALENZACODES/Al-Heb` → `"private": true`), so every Actions minute counts against the account's paid or included quota; a public repository would not be metered this way.

So: nothing in `.github/workflows/ci.yml` or `pages.yml` failed. No test ran, no build ran, no verdict exists for these four commits.

## The fix (account owner only; nothing to change in the repo)

1. GitHub → account (or organisation) Settings → **Billing & plans**.
2. Clear the failed payment (update the card or payment method and retry), or raise the **Actions** spending limit under "Budgets and alerts" / "Spending limit" so the included minutes for a private repository can be exceeded.
3. Once billing is unblocked, re-run the latest failed runs (`gh run rerun <id>`) or push the next commit; runs will start normally.

Do not change the workflow triggers to work around this. Both workflows are correct as written and will resume on their own.

## What runs where meanwhile

| Check | Where it runs today | Status while Actions is blocked |
|---|---|---|
| Deploy of `main` to https://alef-review.onrender.com/ | Render, from its own GitHub integration, independent of Actions | Working: the live site matched `b616ac68` within about three minutes of the push (`LIVE-CHECK-2026-11-07.md`) |
| Unit tier (`npm test`) | `ci.yml` job `test` | Not run since 01:49 UTC. Run locally: `npm test` (about 9 minutes; 3,114 tests on `b616ac68`, 58 failing, classified in `docs/test/UNIT-FAILURES-2026-11-07.md`) |
| "Precache manifest is current" (`node tools/build-precache.mjs && git diff --exit-code precache-manifest.js`) | `ci.yml` job `test` | Not run. It would fail on `b616ac68`: the committed manifest is behind the source (`LIVE-CHECK-2026-11-07.md`) |
| `dist/` build and deploy check (`tools/deploy/build_site.mjs`, `check-deploy.mjs`) | `ci.yml` job `build-dist` and `pages.yml` job `build` | Not run. Run locally with the same two commands |
| Browser tier, Playwright and axe (`npm run test:browser`, `tools/smoke.mjs`) | `ci.yml` job `browser` | Not run; needs Playwright and a built `dist/` locally |
| GitHub Pages publish | `pages.yml` job `deploy`, gated on the repository variable `ENABLE_GITHUB_PAGES` | Off anyway (variable not set); Pages is not the live host |

## What this pass did about it

Nothing in the workflows. This file records the cause and the remedy; the deploy and test facts it relies on are measured in `LIVE-CHECK-2026-11-07.md` and `docs/test/UNIT-FAILURES-2026-11-07.md`. The `ci.yml` concurrency rule (cancel superseded runs only for pull requests) and the `pages.yml` Pages gate are unchanged.
