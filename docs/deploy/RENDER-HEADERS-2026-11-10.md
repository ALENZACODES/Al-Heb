# Render security headers (proposal)

The live review host (`alef-review.onrender.com`) is on Render. The repo's `_headers` file is Cloudflare Pages format, so Render ignores it. The live response has been measured as HSTS + `X-Content-Type-Options: nosniff` only, with no Content-Security-Policy in enforcement mode.

This file is the exact header set to paste into the Render static-site dashboard, or to put in a `render.yaml` **when John approves a deploy**. It is deliberately not a root `render.yaml`, so committing this branch cannot change the live service.

Copy each header onto path `/*`:

| Header | Value |
|---|---|
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self' http://127.0.0.1:* http://localhost:* https://alenzacodes.github.io; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `no-referrer` |
| Permissions-Policy | `camera=(self), geolocation=(self), microphone=(self), payment=(), usb=(), bluetooth=(), serial=(), interest-cohort=()` |
| X-Frame-Options | `DENY` |
| Cross-Origin-Opener-Policy | `same-origin` |

Also set `Content-Type: application/manifest+json` and `Cache-Control: no-cache` for `/manifest.webmanifest`, and `Cache-Control: no-cache` for `/`, `/index.html`, `/offline.html`, `/404.html`, `/404.js`, `/sw.js`, `/precache-manifest.js` and `/media-hosts.js`.

The CSP matches `_headers`. It allows the learner's optional local translation helper on loopback and the vendored Tesseract worker. No third-party origins.

A machine-readable `headers` block, still a proposal only, is in [`render.yaml.headers-proposal.yaml`](render.yaml.headers-proposal.yaml). It is not a root Blueprint and will not change the live Render service.

## Update, 2026-11-14

- The root `render.yaml` now carries the `headers` block and is the one source for these values. The CSP above was missing `https://alenzacodes.github.io` in `connect-src`, the host the Talk language pack is read from; it is fixed here to match `render.yaml` and `_headers`. Pasting the old value would have blocked the pack download.
- Checked live with `node tools/deploy/check-live.mjs` on 2026-11-14: the live build is the same as `main` (`ALEF_VERSION 821215c9a227`, all 357 precached files byte-identical), but none of the five security headers above are sent, `Cache-Control` is Render's default `public, max-age=0, s-maxage=300` on every file, and `/manifest.webmanifest` is served as `binary/octet-stream`. Some browsers will not offer "Install app" for a manifest with that type.
- The live service is not Blueprint-managed, so the values must be entered on the service itself (Render dashboard, the service's Headers settings). Run `node tools/deploy/check-live.mjs` afterwards; it exits 0 when the build matches and every header is present.
