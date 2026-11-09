# Aleph homepage — astral Tree of Knowledge (branch candidate)

**Status:** implementation candidate on `homepage-astral-2026-11-07` (feature branch); do not merge to main or publish without review.

## Opening prayer

The first-screen overlay is present in `index.html` before the deferred app module starts. `src/shell/prayer-veil.js` loads one of **80** entries in `data/homepage/prayers.json` with no Hebrew text authored or corrected by the feature code. Each entry has `he`, `en`, `source`. If the bank cannot be loaded or validated, the literal Modeh Ani provided in the project brief is used. Sampling uses `crypto.getRandomValues` when available, falling back to `Math.random`. The previous selection is kept in device `localStorage` and excluded on the next successful bank draw. On browsers denying storage, cross-load non-repetition cannot be guaranteed; on a broken bank, the single Modeh Ani fallback can repeat.

The header marks the set `ASSEMBLED_FOR_REVIEW`, **not clergy-reviewed**. Current inputs: project brief's traditional Modeh Ani, pointed Hebrew and JPS 1917 English from verified public-domain UXLC corpus records, and further pointed Hebrew/JPS 1917 English copied unchanged from `data/morning-verses.json`. The latter and Modeh Ani's specific pre-1929 siddur edition still need independent collation before a sacred-text verification mark. Unlike some other items in Aleph's registry, this feature does **not** copy Modeh Ani from the 1981 Metsudah edition.

The veil releases on the first route's `alef:ready` event, or immediately on tap, skip-button activation, or Escape. The absolute fail-open deadline is 2,200 ms on a first visit and 800 ms on later visits; a fade-out of at most 150 ms applies when it exits before that deadline. No promise from the prayer fetch is awaited by app boot. Reduced motion is a still prayer card with no transitions.

## Living hero — photoreal ancient Tree of Life

**Recommitted 2026-11-07.** The original SVG tree built from thick strokes and oval leaves was rejected as cartoon-like. It has been **removed**. The replacement is `assets/img/gen/HERO_tree_of_life_realistic.webp` (900 × 455 px, approximately 70 KB), a photographic-style scene of monumental ancient olive bark, a deeply twisted trunk, hollow old-growth knots, dense natural foliage and sprawling roots across stone. The artwork is cropped from the approved visual exploration to remove **all embedded prayer, buttons and other lettering**; the prayer overlay and all page controls stay real, accessible HTML. No character art or audio changes.

`src/shell/astral-tree.js` uses that locally hosted WebP with slow transform-only arrival/parallax. Separate CSS-only nightfall, sparse stars, a gold travelling light ray and an atmospheric ground glow preserve the cinematic feeling. The heroine is **The Tree of Life** in the homepage kicker. The original headline, CTAs, first-word builder, statistics, destination tiles, books, games, footer and routes are otherwise unchanged.

This uses **one new media file** as a deliberate visual-quality exception to the previous code-only tree constraint. The image loads from the same origin; there is no CDN, video, network dependency or third-party library. The existing precache generator intentionally excludes `assets/img/` from initial installation and uses on-demand runtime caching. This new hero asset therefore fetches on demand and is not in the shell precache; the CSS fallback is a solid astral sky while it loads. If guaranteed offline image display on a first-ever offline visit becomes a release requirement, change the generator and regenerate manifests through the normal project process before merging.

Motion is CSS transform/opacity only. `IntersectionObserver` pauses offscreen scenes, `visibilitychange` pauses in hidden tabs, and one scheduled animation-frame callback handles scrolling. Mobile crop keeps the giant trunk prominent. With `prefers-reduced-motion`, the art and prayer are fully still. A physical-phone frame-rate check is outstanding; no unmeasured 60 fps claim is made.

## Build, QA and publishing

The branch-specific preparation workflow runs **`node tools/build-precache.mjs`**, stages the resulting `precache-manifest.js` and `src/shell/views.generated.js`, and runs `node tools/test/run.mjs unit` on a full runner checkout. It never merges or deploys. Browser/device profiling for 60 fps, first-paint timing and visual appearance requires a real mid-range phone; these are design targets, **not measured claims**. Check the workflow/CI run before approving the candidate for main.
