# Offline readiness: what exists

- `src/shell/offline.js`: parses `precache-manifest.js` without eval (the CSP forbids it), compares it with Cache Storage per feature group, warms missing files and the three optional downloads (word-audio index for the learner's tradition, 5,000-word tier packs, OCR engine; about 7 MB together), reports failures, and checks storage health (browser estimate, `persist()` on click, Web Storage near quota with a link to the Settings backup).
- `src/shell/offline.view.js`: the card (route in ROUTES.md).
- `src/shell/update.js`: detects a waiting or newly activated worker and shows a Reload banner; never reloads by itself. How state survives a reload is in the file header.
- `docs/offline/SW-PROPOSALS.md`: what to change in `sw.js` and why.

Honest limits: "ready" means the files are in a cache, not that a feature was run offline. Nothing was run in a browser or in airplane mode. The Web Storage ceiling (5 million characters) is an assumption for a warning, not a measured limit. Warming goes through the page's `fetch`, so it only caches if the service worker is controlling the page; the card says when it is not.
