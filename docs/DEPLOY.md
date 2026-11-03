# Deploying ALEF (static hosting; nothing has been deployed)

The app is plain static files. Any host that serves the repo root over HTTPS works (HTTPS needed for service worker,
camera, geolocation). Run `node tools/build-precache.mjs` before publishing.

Options: GitHub Pages (project sites serve under `/<repo>/`; all paths in the app are relative, so this works, but the
hash-router means no server rewrites are needed), Cloudflare Pages, Netlify, Vercel, or any object storage + CDN.

**Free-tier limits for these hosts are UNVERIFIED** (the research did not fetch 2026 limits). Check bandwidth and file-count limits
before hosting audio (~1000+ mp3 files planned) and images (assets/img is several MB already).

Hosting notes: serve `sw.js` and `index.html` with short caching (`no-cache`); `.webmanifest` as `application/manifest+json`;
`.mp3` as `audio/mpeg` with Range support. QR deep links look like `https://<host>/#/letters/alef`.
The GitHub push is not possible in the build environment (invalid token).
