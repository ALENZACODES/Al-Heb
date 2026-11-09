# Go-live checklist: Aleph on Render

The review site is live at https://alef-review.onrender.com/ (Render, auto-deploys from `main`). This checklist is the per-deploy verification: push to `main`, wait for the deploy, confirm the served version, run the smoke test. The archived Cloudflare Pages path — account creation, dashboard steps — is in `docs/deploy/CLOUDFLARE-PAGES.md` and is not the live host. The local build and check were run on 2026-11-04 (`node tools/deploy/build_site.mjs` then `node tools/deploy/check-deploy.mjs --root dist`: 44 of 44 checks passed, 6 warnings about origins named in code, which are expected).

## Before you start (1 minute)
1. The repository on GitHub is `ALENZACODES/Al-Heb` (private). Make sure the code you want live is pushed. The default branch is `main`. Render publishes `main` only.
2. Optional local dry run: `node tools/deploy/build_site.mjs && node tools/deploy/check-deploy.mjs --root dist`. Every line must say PASS. (The local checker applies the repo `_headers`; Render does not — see `docs/DEPLOY.md` — so a local PASS on headers does not mean the live site sends them.)
3. The by-hand gate for every push is the local unit suite (`npm test`); record its pass/fail tail line. GitHub Actions is down (billing exhausted on the owner's student account; fix #1) — do not wait for it.

## Steps
1. Push to `main`.
2. Wait for Render to deploy. The served build is identified by `ALEF_VERSION` in https://alef-review.onrender.com/precache-manifest.js — compare it with the committed `precache-manifest.js`. Until the values match, the live site is still the previous deploy.
3. Open https://alef-review.onrender.com/ and run the smoke test below.

The checker has no URL mode: `check-deploy.mjs` only serves a local folder (`--root <dir>`, or `--serve` to keep a local server up). The live URL is checked by the manual list below.

## Smoke test on the live URL
Do these in Chrome on a desktop and again on a phone. Write down any failure with the URL and a screenshot.

Headers (terminal; the live host is Render, so its answers differ from the old Cloudflare expectations — measured 2026-11-07 19:26 EST):
- [ ] `curl -sI https://alef-review.onrender.com/` shows 200, `content-type: text/html; charset=utf-8`, `cache-control: public, max-age=0, s-maxage=300` (Render's uniform value — the `_headers` rules are not applied), `x-content-type-options: nosniff`, and `strict-transport-security`. No `content-security-policy` header is sent (known gap: the `_headers` CSP is not applied by Render).
- [ ] `curl -sI https://alef-review.onrender.com/manifest.webmanifest` shows 200 and `cache-control: public, max-age=0, s-maxage=300`. Note: Render serves it as `content-type: binary/octet-stream`, not `application/manifest+json`.
- [ ] `curl -sI https://alef-review.onrender.com/sw.js` shows 200, a JavaScript content type and `cache-control: public, max-age=0, s-maxage=300`.
- [ ] `curl -sI https://alef-review.onrender.com/assets/fonts/web/heebo.woff2` shows 200 and `font/woff2` (the one-week `max-age` in `_headers` is not applied on Render).
- [ ] `curl -s -o /dev/null -w "%{http_code}\n" https://alef-review.onrender.com/_headers` prints 404 (or the app page), not the rules file.
- [ ] `curl -s -o /dev/null -w "%{http_code}\n" https://alef-review.onrender.com/nope.js` prints 404.

App (browser):
- [ ] Home page loads; Hebrew text is in the right font and reads right to left; no console errors.
- [ ] DevTools, Application, Manifest: no errors, icons show. Service Workers: "activated and running", scope is the site root.
- [ ] Console shows no "Content Security Policy" violation while you open a lesson, the letters, settings, and download a backup. (No CSP header is sent by the host, so a violation here would come from a `<meta>` policy or a worker — report it either way.)
- [ ] Photo scan: choose an image; the OCR runtime loads (the folder `assets/vendor/_tesseract` starts with an underscore and was never confirmed to deploy; if it 404s, tell me and I will rename it).
- [ ] Audio: play a letter or word sound. Most clips are now synthetic, not recorded — the player should play the clip and label it synthetic, unreviewed by a native speaker.
- [ ] Workbook: open a PDF from the workbook page (the largest is 8.9 MiB).
- [ ] Offline: reload once online, set Network to Offline, reload. Home, `/#/learn` and `/#/letters/alef` still render; `offline.html` appears for an uncached route.
- [ ] Install: Chrome offers Install; the installed app opens at the start page.
- [ ] Update: push a small change, wait for the deploy (the served `ALEF_VERSION` changes), reload twice; the new content appears (there is a "new version" banner; it never reloads by itself).
- [ ] Phone: repeat the offline test after turning on airplane mode.

## If something fails
- Build fails on Render but passes locally: read the deploy log in the Render dashboard; compare the Node version in the log with 22.
- Render shows an old version: check the served `ALEF_VERSION` in `precache-manifest.js` against the committed one — if they differ, the deploy has not finished or has not flipped yet; wait, then hard reload. In DevTools Application click Unregister and reload (the service worker caches).
- Remember GitHub Actions is separate and currently down: `ci.yml` runs the tests and the same build and check on every push; `pages.yml` only publishes to GitHub Pages when the repository variable `ENABLE_GITHUB_PAGES` is `true`, and does nothing harmful otherwise. The by-hand gate is the local `npm test` run, not Actions.
