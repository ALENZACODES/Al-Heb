# ALEF homepage — astral Tree of Knowledge (branch candidate)

**Status:** implementation candidate on `chatgpt/homepage-astral-2026-11-07`; do not merge to main or publish without review.

## Opening prayer

The first-screen overlay is present in `index.html` before the deferred app module starts. `src/shell/prayer-veil.js` loads one of **80** entries in `data/homepage/prayers.json` with no Hebrew text authored or corrected by the feature code. Each entry has `he`, `en`, `source`. If the bank cannot be loaded or validated, the literal Modeh Ani provided in the project brief is used. Sampling uses `crypto.getRandomValues` when available, falling back to `Math.random`. The previous selection is kept in device `localStorage` and excluded on the next successful bank draw. On browsers denying storage, cross-load non-repetition cannot be guaranteed; on a broken bank, the single Modeh Ani fallback can repeat.

The header marks the set `ASSEMBLED_FOR_REVIEW`, **not clergy-reviewed**. Current inputs: project brief's traditional Modeh Ani, pointed Hebrew and JPS 1917 English from verified public-domain UXLC corpus records, and further pointed Hebrew/JPS 1917 English copied unchanged from `data/morning-verses.json`. The latter and Modeh Ani's specific pre-1929 siddur edition still need independent collation before a sacred-text verification mark. Unlike some other items in ALEF's registry, this feature does **not** copy Modeh Ani from the 1981 Metsudah edition.

The veil releases on the first route's `alef:ready` event, or immediately on tap, skip-button activation, or Escape. The absolute fail-open deadline is 2,200 ms on a first visit and 800 ms on later visits; a fade-out of at most 150 ms applies when it exits before that deadline. No promise from the prayer fetch is awaited by app boot. Reduced motion is a still prayer card with no transitions.

## Living hero — realism correction

**Recommitted 2026-11-07.** The first implementation built a stylised SVG tree from thick strokes, ellipses and graphic pomegranates. It was rejected as cartoon-like. The replacement uses ALEF's already-existing fine-art `assets/img/gen/HERO_home_tree.webp` for a colossal, ancient, naturally weathered olive tree: hollow bark, thick twisting limbs, gnarled knots, sprawling roots against rock and dense leaves. The title now reads **The Tree of Life**, not Tree of Knowledge. That artwork is painterly rather than a literal photograph; the improvement is substantial in anatomical realism, but a fully photoreal output still requires a separately approved, text-free photographic source. No source image is modified or newly added in this commit.

The art gets a two-second atmospheric camera arrival with subtle colour grading. A transparent navy nightfall, sparse stars, soft moving golden light and slow photo parallax provide depth without geometric/cartoon branches or floating circles. The entire tree is one pre-existing locally shipped image; no CDN, framework, new image download, character artwork, or audio is introduced. Source text, original CTA links, word-builder, stats, books, games, footer and other navigation are untouched.

Only opacity/transform animate; star and ray layers are compositor-friendly. A shared `IntersectionObserver` pauses all scene movement offscreen, `visibilitychange` pauses in background tabs, and scroll listeners throttle parallax updates to one animation frame. Mobile uses a different crop to keep the ancient trunk prominent. Reduced-motion users get a static artwork and a still prayer card.


## Build, QA and publishing

The branch-specific preparation workflow runs **`node tools/build-precache.mjs`**, stages the resulting `precache-manifest.js` and `src/shell/views.generated.js`, and runs `node tools/test/run.mjs unit` on a full runner checkout. It never merges or deploys. Browser/device profiling for 60 fps, first-paint timing and visual appearance requires a real mid-range phone; these are design targets, **not measured claims**. Check the workflow/CI run before approving the candidate for main.
