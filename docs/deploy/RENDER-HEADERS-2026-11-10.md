# Render security headers (proposal)

The live review host (`alef-review.onrender.com`) is on Render. The repo's `_headers` file is Cloudflare Pages format, so Render ignores it. The live response has been measured as HSTS + `X-Content-Type-Options: nosniff` only, with no Content-Security-Policy in enforcement mode.

This file is the exact header set to paste into the Render static-site dashboard, or to put in a `render.yaml` **when John approves a deploy**. It is deliberately not a root `render.yaml`, so committing this branch cannot change the live service.

Copy each header onto path `/*`:

| Header | Value |
|---|---|
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self' http://127.0.0.1:* http://localhost:*; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `no-referrer` |
| Permissions-Policy | `camera=(self), geolocation=(self), microphone=(self), payment=(), usb=(), bluetooth=(), serial=(), interest-cohort=()` |
| X-Frame-Options | `DENY` |
| Cross-Origin-Opener-Policy | `same-origin` |

Also set `Content-Type: application/manifest+json` and `Cache-Control: no-cache` for `/manifest.webmanifest`, and `Cache-Control: no-cache` for `/`, `/index.html`, `/sw.js` and `/precache-manifest.js`.

The CSP matches `_headers`. It allows the learner's optional local translation helper on loopback and the vendored Tesseract worker. No third-party origins.
