# Live site check, 2026-11-07 (evening)

Checked at 02:25 UTC on 2026-11-08 (21:25 EST, 2026-11-07) from the audit worktree at `main` `b616ac68`, with `curl` against https://alef-review.onrender.com/ (Render, which deploys `main`). No browser, no phone, no learner.

## What was compared

| File | Live (`curl -sS https://alef-review.onrender.com/<file>`) | Committed at `b616ac68` | Same? |
|---|---|---|---|
| `precache-manifest.js` | `ALEF_VERSION = "4dc6df24f3ec"`, 362 entries, 43,075 bytes | `ALEF_VERSION = "4dc6df24f3ec"`, 362 entries | yes (`cmp` reports no difference) |
| `index.html` | | | yes |
| `sw.js` | | | yes |
| `src/shell/router.js` | | | yes |
| `src/games/arcade.catalog.js` | | | yes |
| `data/audio/summary.json` | | | yes |

Response headers on `precache-manifest.js`: `last-modified: Sun, 08 Nov 2026 02:22:32 UTC`, `etag: W/"f2681b63492294b64d5badb22b74d3f2"`, `cache-control: public, max-age=0, s-maxage=300` (Render's uniform header; the repo `_headers` file is not applied, as `docs/DEPLOY.md` already records). `/` answers 200 with 4,797 bytes.

## Finding: the live build is not behind `main`, but the committed precache manifest is behind the source

- Live equals committed. Every file compared is byte-identical to the file at `b616ac68`, and the live `last-modified` (02:22 UTC) is after the last push to `main` that this pass saw (`b616ac68`, 02:19 UTC per `gh run list`). So Render had deployed `b616ac68` within about three minutes.
- The committed `precache-manifest.js` itself is stale. It was last regenerated in `e9889e11` ("Precache refresh for the usability build", 20:49 EST). The two later commits (`39ae3543` Sephardi stand-in, `b616ac68` playback speed and Echo) changed precached source files without re-running the build. Running `node tools/build-precache.mjs` in the `b616ac68` tree writes `ALEF_VERSION = "ea6c2c07f8e6"` (362 files installed, 804 on demand) and changes 4 lines; the file was reverted afterwards, not committed, because this lane does not own it.
- Consequence for an installed learner: `sw.js` names its shell cache after `ALEF_VERSION`. Because the version did not change, a phone that already holds the `4dc6df24f3ec` cache is not told that a new version is ready and keeps serving the pre-Echo copies of the changed `src/` files from its cache until the version changes. A first-time visitor gets the current files. (`ci.yml` has a step "Precache manifest is current" that would have caught this, but no Actions job has run since 01:49 UTC: see `CI-BILLING-2026-11-07.md`.)
- A newer commit `f19f50cf` was pushed to `main` at 02:24 UTC (seen only in `gh run list`; this pass did not fetch it). The live site was not re-checked against it.

## How to re-check

```
curl -sS https://alef-review.onrender.com/precache-manifest.js | grep ALEF_VERSION
grep ALEF_VERSION precache-manifest.js
node tools/build-precache.mjs && git diff --stat precache-manifest.js   # non-empty diff = committed manifest is stale
```

The first two lines agreeing means Render has caught up with `main`; the third line empty means `main` itself is current.
