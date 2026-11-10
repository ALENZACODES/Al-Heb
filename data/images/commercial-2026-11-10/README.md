# Commercial image pack (10 Nov 2026)

New pictures for ALEF store listings, onboarding, empty states, streak lamps, missing medallions, Brain Lab tokens, and learn-track covers. Orders: draft PR #41 (`docs/commercial-image-orders-2026-11-09`, `COMMERCIAL-ORDERS-2026-11-09.md`). Nothing here overwrites existing files under `assets/` or `data/images/manifest.csv`.

All 46 ordered pictures are here as `.webp`, metadata stripped. Also included:

- `ICON_v2.png` / `ICON_v2.webp`: gold Frank Ruhl Libre alef (from `alef-mark-v2.svg`, SIL OFL) composited on the generated deep-green plate
- `icon-set/`: PNG app icons at 1024, 512, 192, 180, 167, 152, 120 and 32 px
- `KEYART_v2_play-feature-1024x500.png`: Google Play feature graphic crop
- `KEYART_v2_og-1200x630.png`: link-preview crop
- `commercial-2026-11-09.manifest-rows.csv`: rows to append to `data/images/manifest.csv` before the first ingest

Contact sheets live at `docs/images/commercial-2026-11-10-contact-*.jpg`.

Held for John: screenshot caption wording, iPad screenshot set, re-cropping five already-approved Awards medallions.

These pictures are not yet wired into the app. After approval, ingest from this folder and replace `assets/icons/*` from `icon-set/` on the launch-readiness branch.

## Second pass (r2), 2026-11-10
Use these in place of the first versions when ingesting. The originals stay in the repo; nothing was overwritten.

| r2 file | Replaces | Why |
|---|---|---|
| `ONB_v2_letters_r2.webp` | `ONB_v2_letters.webp` | Exactly three steps (stepping stones); one Noa, one Rimon |
| `EMPTY_v2_review_r2.webp` | `EMPTY_v2_review.webp` | No drawn circle frame |
| `EMPTY_v2_offline_r2.webp` | `EMPTY_v2_offline.webp` | No drawn circle frame |
| `EMPTY_v2_notfound_r2.webp` | `EMPTY_v2_notfound.webp` | No circular vignette |
| `EMPTY_v2_awards_r2.webp` | `EMPTY_v2_awards.webp` | No pale round backdrop |
| `STREAK_v2_lamp_gold_r2.webp` | `STREAK_v2_lamp_gold.webp` | The first version kept an opaque magenta background. Rebuilt from the lit lamp with a gold ring, real alpha |
| `STREAK_v2_lamp_lit_r2.webp` | `STREAK_v2_lamp_lit.webp` | Removed about 6,800 stray magenta pixels around the lamp |

The empty states keep every subject inside the central 80%, so the app can still crop them to a circle. The manifest rows above keep the original order text. The r2 files are delivery fixes against those same orders.

## Third pass (r3), 2026-11-10
`ONB_v2_letters_r3.webp` replaces `ONB_v2_letters_r2.webp` when ingesting. The r2 file stays on disk. Noa now stands behind the middle stepping stone, so she has a ground line; she is the same on-model bust, unflipped. Rimon, the tree and the three stones are unchanged. Metadata stripped.
