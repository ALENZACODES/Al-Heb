# Go-live checklist: ALEF on Cloudflare Pages (about 10 minutes)

Nothing here has been done yet. Background and limits are in `docs/deploy/CLOUDFLARE-PAGES.md`. The local build and check were run on 2026-11-04 (`node tools/deploy/build_site.mjs` then `node tools/deploy/check-deploy.mjs --root dist`: 44 of 44 checks passed, 6 warnings about origins named in code, which are expected).

## Before you start (1 minute)
1. The repository on GitHub is `ALENZACODES/Al-Heb` (private). Make sure the code you want live is pushed. The default branch is `main`. Push to `main`, and enter `main` in step 6.
2. Optional local dry run: `node tools/deploy/build_site.mjs && node tools/deploy/check-deploy.mjs --root dist`. Every line must say PASS.

## Steps
1. Go to https://dash.cloudflare.com and sign up (free plan, email and password, turn on 2FA). Verify the email.
2. Left menu: **Workers & Pages**, then **Create application**, then the **Pages** tab, then **Connect to Git**.
3. Choose GitHub, then **Install & Authorize** the Cloudflare Pages app. Pick **Only select repositories** and tick only `Al-Heb`. Back in Cloudflare, select `Al-Heb` and click **Begin setup**.
4. Project name: for example `alef` (this becomes `alef.pages.dev`; pick carefully, a rename is not offered).
5. Build settings:
   - Framework preset: **None**
   - Build command: `node tools/deploy/build_site.mjs`
   - Build output directory: `dist`
   - Root directory (advanced): leave empty
6. Production branch: type `main`.
7. Environment variables (optional): `NODE_VERSION` = `22`. Nothing else is needed; there are no dependencies to install.
8. Click **Save and Deploy**. Watch the log. It should end with "precache check: all N URLs exist in dist". If it prints "OVER A CLOUDFLARE PAGES LIMIT" or "MISSING from dist", the build fails on purpose; send me the log.
9. Headers: nothing to configure. The file `_headers` in the repo is copied into `dist/` by the build and Cloudflare applies it automatically (CSP, nosniff, cache rules, MIME). Do not add a `_headers` rule in the dashboard.
10. Custom domain (optional, can wait): project, **Custom domains**, **Set up a custom domain**, enter the domain, follow the DNS prompt. If the domain's DNS is not on Cloudflare, add the CNAME it shows at your DNS provider.
11. Open `https://<project>.pages.dev` and run the smoke test below.

The checker has no URL mode: `check-deploy.mjs` only serves a local folder (`--root <dir>`, or `--serve` to keep a local server up). The live URL is checked by the manual list below.

## Smoke test on the live URL
Do these in Chrome on a desktop and again on a phone. Write down any failure with the URL and a screenshot.

Headers (terminal; replace the host):
- [ ] `curl -sI https://<project>.pages.dev/` shows 200, `content-type: text/html`, `cache-control: no-cache`, and a `content-security-policy` header.
- [ ] `curl -sI https://<project>.pages.dev/manifest.webmanifest` shows `content-type: application/manifest+json`.
- [ ] `curl -sI https://<project>.pages.dev/sw.js` shows a JavaScript content type and `cache-control: no-cache`.
- [ ] `curl -sI https://<project>.pages.dev/assets/fonts/web/heebo.woff2` shows `font/woff2` and a one-week `max-age`.
- [ ] `curl -s -o /dev/null -w "%{http_code}\n" https://<project>.pages.dev/_headers` prints 404 (or the app page), not the rules file.
- [ ] `curl -s -o /dev/null -w "%{http_code}\n" https://<project>.pages.dev/nope.js` prints 404.

App (browser):
- [ ] Home page loads; Hebrew text is in the right font and reads right to left; no console errors.
- [ ] DevTools, Application, Manifest: no errors, icons show. Service Workers: "activated and running", scope is the site root.
- [ ] Console shows no "Content Security Policy" violation while you open a lesson, the letters, settings, and download a backup.
- [ ] Photo scan: choose an image; the OCR runtime loads (the folder `assets/vendor/_tesseract` starts with an underscore and was never confirmed to deploy; if it 404s, tell me and I will rename it).
- [ ] Audio: play a letter or word sound; with no recorded clips it should fall back to the device voice.
- [ ] Workbook: open a PDF from the workbook page (the largest is 8.9 MiB).
- [ ] Offline: reload once online, set Network to Offline, reload. Home, `/#/learn` and `/#/letters/alef` still render; `offline.html` appears for an uncached route.
- [ ] Install: Chrome offers Install; the installed app opens at the start page.
- [ ] Update: push a small change, wait for the deploy, reload twice; the new content appears (there is no "new version" banner yet).
- [ ] Phone: repeat the offline test after turning on airplane mode.

## If something fails
- Build fails on Cloudflare but passes locally: compare the Node version in the log with 22.
- Pages shows an old version: hard reload, or in DevTools Application click Unregister and reload (the service worker caches).
- Remember GitHub Actions is separate: `ci.yml` runs the tests and the same build and check on every push; `pages.yml` only publishes to GitHub Pages when the repository variable `ENABLE_GITHUB_PAGES` is `true`, and does nothing harmful otherwise.
