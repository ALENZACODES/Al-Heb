# Test tiers and the CI change

| Script | What runs | When |
|---|---|---|
| `npm test` | fast unit tier: every `tests/*.test.js` except the browser tier, files run `CPU count` at a time | every edit, every push |
| `npm run test:browser` | browser tier, one file at a time (heavy, shared ports): the files in `BROWSER` in `tools/test/tiers.mjs` plus any `tests/*.browser.test.js` | smoke job, before deploy |
| `npm run test:all` | unit then browser | before release |
| `npm run test:profile` | `tools/test/profile.mjs`: per-file seconds into `docs/test/TIMINGS.md` | when the suite feels slow |

Adding a browser test: name it `something.browser.test.js` (auto-detected) or add it to `BROWSER`.
`tests/helpers/memo.js` (`memoDisk`) caches deterministic JSON-safe builder output in the OS temp dir, keyed on file sizes and mtimes under `data/`, `src/` and the builder folder; set `ALEF_NO_TEST_CACHE=1` to bypass it. Tests that assert determinism still call the builder directly.

## Workflow layout

`.github/workflows/ci.yml` has three jobs: `test` (unit tier, then the precache-is-current check), `build-dist` (the Cloudflare-style build and deploy check) and `browser` (Playwright, Chromium and axe-core, browser tier, then `tools/smoke.mjs`; `continue-on-error: true` until it has gone green on GitHub once). `pages.yml` only builds and checks `dist/`. What each runner needs, and every gap found, is in `CI-RUNNER-AUDIT.md`.
