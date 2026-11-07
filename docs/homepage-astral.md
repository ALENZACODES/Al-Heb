# ALEF homepage — astral Tree of Knowledge (branch candidate)

**Status:** implementation candidate on `chatgpt/homepage-astral-2026-11-07`; do not merge to main or publish without review.

## Opening prayer

The first-screen overlay is present in `index.html` before the deferred app module starts. `src/shell/prayer-veil.js` loads one of **80** entries in `data/homepage/prayers.json` with no Hebrew text authored or corrected by the feature code. Each entry has `he`, `en`, `source`. If the bank cannot be loaded or validated, the literal Modeh Ani provided in the project brief is used. Sampling uses `crypto.getRandomValues` when available, falling back to `Math.random`. The previous selection is kept in device `localStorage` and excluded on the next successful bank draw. On browsers denying storage, cross-load non-repetition cannot be guaranteed; on a broken bank, the single Modeh Ani fallback can repeat.

The header marks the set `ASSEMBLED_FOR_REVIEW`, **not clergy-reviewed**. Current inputs: project brief's traditional Modeh Ani, pointed Hebrew and JPS 1917 English from verified public-domain UXLC corpus records, and further pointed Hebrew/JPS 1917 English copied unchanged from `data/morning-verses.json`. The latter and Modeh Ani's specific pre-1929 siddur edition still need independent collation before a sacred-text verification mark. Unlike some other items in ALEF's registry, this feature does **not** copy Modeh Ani from the 1981 Metsudah edition.

The veil releases on the first route's `alef:ready` event, or immediately on tap, skip-button activation, or Escape. The absolute fail-open deadline is 2,200 ms on a first visit and 800 ms on later visits; a fade-out of at most 150 ms applies when it exits before that deadline. No promise from the prayer fetch is awaited by app boot. Reduced motion is a still prayer card with no transitions.

## Living hero

`src/shell/astral-tree.js` constructs the sky, trunk, branches, olive/gold canopy and pomegranates as inline SVG plus two CSS atmosphere layers; no images, videos, CDNs, external requests, character art, audio, or framework. It sits **above** the original hero headline, two CTAs, word-builder panel, stats and destination tiles; these are kept as functional DOM elements. The tree grows in two seconds and then the canopy, fruit, ray and stars drift at deliberately slow frequencies.

Only transforms and opacity animate. A shared `IntersectionObserver` pauses off-screen scenes, `visibilitychange` pauses hidden tabs, and one throttled `requestAnimationFrame` per scroll/resize update provides ±9 px parallax. Small screens omit three canopy groups and two fruit clusters; no per-leaf animation loops run. There is no gyroscope permission or orientation tracking. When `prefers-reduced-motion` is set, CSS turns off all animations/transitions, and parallax remains still. The tree scene is described as one accessible image; its many ornamental parts are hidden from accessibility navigation.

## Build, QA and publishing

The branch-specific preparation workflow runs **`node tools/build-precache.mjs`**, stages the resulting `precache-manifest.js` and `src/shell/views.generated.js`, and runs `node tools/test/run.mjs unit` on a full runner checkout. It never merges or deploys. Browser/device profiling for 60 fps, first-paint timing and visual appearance requires a real mid-range phone; these are design targets, **not measured claims**. Check the workflow/CI run before approving the candidate for main.
