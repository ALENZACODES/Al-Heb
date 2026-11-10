# Aleph opening — ancient olive harvest under the stars

**Review candidate, 7 November 2026.** Feature branch: `homepage-olive-harvest-2026-11-07` (feature branch). This is not permission to merge or publish.

## Art direction

The homepage opens onto a monumental old olive tree whose trunk and exposed roots are the primary subject. The harvest objects are physically plausible, not a collection of generic interface symbols: thrown earthenware vessels, a small olive-oil lamp, a resting shofar, a woven textile and scattered olives, with pomegranates as a quiet echo of the Rimon motif. Distant hills meet an indigo starfield and warm dawn. These are artistic representations; neither the objects nor their imagined arrangement should be presented as an archaeologically verified scene.

The artwork is **text-free**. No Hebrew glyphs, liturgical quotations, ornamental pseudo-Hebrew, navigation, calls to action or buttons are baked into the WebP files. All real text, accessibility descriptions, prayer rotation, game links and interactions remain DOM content. No modifications to Ari, Noa or Rimon, to voice assets, to books, or to existing routes.

### Assets

| File | Pixels | File size | Use |
| --- | --- | --- | --- |
| `assets/img/gen/HERO_olive_harvest_astral.1600.webp` | 1600 × 900 | 278,040 bytes | Wider viewports |
| `assets/img/gen/HERO_olive_harvest_astral.900.webp` | 900 × 507 | 100,068 bytes | Up to 600 px wide |

A `picture` element chooses the mobile image without requesting the large one on small phones. Image loading is eager/high priority. The rendering preserves the photo's natural bark and pottery detail; CSS supplies understated stars, breathable golden light, fine dust motes and slow parallax/arrival. These are atmospheric layers, not flashing or spinning supernatural emblems.

The existing `assets/css/astral-home.css` uses compositor-friendly transforms/opacity; the `IntersectionObserver` and document-visibility logic pause movement when hidden or off-screen. `prefers-reduced-motion` displays a still image. The existing 80-prayer veil is unchanged and still lifts on readiness, tap, or its short hard deadline.

## Integration and review

Modified feature-branch files: `src/shell/astral-tree.js`, `assets/css/astral-home.css`, `tests/home.hero.test.js`, plus `tests/home.harvest.assets.test.js`. Static validation checks both WebP headers and mobile-vs-desktop budgets, and checks the DOM is separate from artwork.

The project's `tools/build-precache.mjs` intentionally excludes `assets/img/` and treats artwork as runtime cached on demand (already documented in `docs/homepage-astral.md`). The new WebPs are not installed in the PWA's initial offline shell. The CSS fallback remains a deep-blue astral gradient. Once the full repo runner is operational, regenerate `precache-manifest.js` and `src/shell/views.generated.js` **only by running the generator**, never by hand, and run `node tools/test/run.mjs unit`.

Before approval, inspect an actual small Android phone for visible tree roots and for text contrast, check reduced-motion, inspect the WebP for unintended symbols, and confirm initial page load and audio behaviour. A generated mockup must never be mistaken for a verified deployed screen.
