# Test tiers and the CI change

| Script | What runs | When |
|---|---|---|
| `npm test` | fast unit tier: every `tests/*.test.js` except the browser tier, files run `CPU count` at a time | every edit, every push |
| `npm run test:browser` | browser tier, one file at a time (heavy, shared ports): the files in `BROWSER` in `tools/test/tiers.mjs` plus any `tests/*.browser.test.js` | smoke job, before deploy |
| `npm run test:all` | unit then browser | before release |
| `npm run test:profile` | `tools/test/profile.mjs`: per-file seconds into `docs/test/TIMINGS.md` | when the suite feels slow |

Adding a browser test: name it `something.browser.test.js` (auto-detected) or add it to `BROWSER`.
`tests/helpers/memo.js` (`memoDisk`) caches deterministic JSON-safe builder output in the OS temp dir, keyed on file sizes and mtimes under `data/`, `src/` and the builder folder; set `ALEF_NO_TEST_CACHE=1` to bypass it. Tests that assert determinism still call the builder directly.

## Exact YAML change (for the workflow owner; not applied here)

In `.github/workflows/ci.yml`, job `test`, replace the step `run: node --test` with:

```yaml
      - name: Unit tier (fast)
        run: npm test
```

In job `smoke`, after the Playwright install step and before `node tools/smoke.mjs`, add:

```yaml
      - name: Browser tier
        run: npm run test:browser
```

In `.github/workflows/pages.yml`, step "Tests", replace `run: node --test` with `run: npm test` (the browser tier stays in the smoke job; it needs Playwright, which the deploy build does not install).
