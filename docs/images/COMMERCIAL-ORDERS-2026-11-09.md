# ALEF Commercial Image Orders (2026-11-09)

Based on `main` at `603a9f81e` and the open branches on GitHub. **Orders only.** Nothing in this file has been drawn, wired, merged or deployed. Machine-readable copy: [`orders/commercial-2026-11-09.json`](orders/commercial-2026-11-09.json). Order sheet: [`orders/commercial-2026-11-09.csv`](orders/commercial-2026-11-09.csv).

**46 pictures to generate**, in 10 groups ranked by how much they lift the first impression. Everything else listed (icon sizes, store screenshots, launch screens, crops) is built from these by script, with real type for any words.

## Ranked Summary

| Rank | Group | Pictures | Where it shows |
|---|---|---|---|
| 1 | [App Icon Set](#1-app-icon-set) | 1 | Home screen, install prompt, tab, notifications, both stores |
| 2 | [Store Screenshots and Install-Dialog Screenshots](#2-store-screenshots-and-install-dialog-screenshots) | 7 | App Store, Google Play, Chrome install dialog |
| 3 | [Key Art: Google Play Feature Graphic and Link Preview](#3-key-art-google-play-feature-graphic-and-link-preview) | 1 | Google Play header, shared links |
| 4 | [Onboarding (First Run)](#4-onboarding-first-run) | 5 | First run (#/welcome), every new learner |
| 5 | [Launch Screens (Splash)](#5-launch-screens-splash) | 1 | Every launch of the installed app |
| 6 | [Empty, Offline and Error States](#6-empty-offline-and-error-states) | 7 | Review, Search, Progress, Awards, Not found, offline and error cards |
| 7 | [Lesson-Complete Celebration and Streak Lamp](#7-lesson-complete-celebration-and-streak-lamp) | 5 | Lesson complete, Home Today card, Progress |
| 8 | [Missing Medallions](#8-missing-medallions) | 6 | Awards gallery |
| 9 | [Brain Lab](#9-brain-lab) | 11 | Brain Lab |
| 10 | [Learn Track Covers](#10-learn-track-covers) | 2 | Learn page track choice |

## How to Use These Orders

1. Paste the house style below once per session, then one row at a time. Attach the reference pictures named in each row.
2. Save each picture under its exact file name (for example `EMPTY_v2_review.png`), strip metadata, and put them in one folder or zip.
3. Before the first ingest, append the rows of [`orders/commercial-2026-11-09.manifest-rows.csv`](orders/commercial-2026-11-09.manifest-rows.csv) to `data/images/manifest.csv` (same columns, block T), so the ingest tool knows the new names. Then run the normal flow in [README.md](README.md) (`ingest`, contact sheets, approve).
   Rows marked transparent must arrive with a real transparent background (the ingest checks it). If your tool can only give the flat #FF00FF magenta, remove the magenta first, then ingest.
4. Sizes are the three shapes image tools deliver: 1024x1024 (1:1), 1536x1024 (3:2), 1024x1536 (2:3). Final sizes come from crops and scaling, listed per group.
5. Wiring each group into the app is a separate change after John approves the pictures; each group says exactly where.

## House Style (Paste Once)

```
You are drawing a matching set of pictures for ALEF, a Hebrew-learning app for adults.
Keep the look of the app's existing pictures: the golden olive tree, the green-and-gold medallions,
and the characters Ari, Noa and Rimon exactly as on the attached sheets.

HOUSE STYLE ("Tree"): flat vector illustration, thick rounded charcoal outlines (#2B2B2B), flat fills,
no gradients, no gloss, no photo-realism, no 3D render, gentle light from the upper left.
Every subject is centred with a 10% margin unless the row says otherwise.

PALETTE: deep green #1E4634, darkest green #16301C, olive #6B7F3A, warm gold #D9A441,
light gold #E9C46A, paper cream #F6F1E7, warm white #FFFAF0, pomegranate red #B0373B (small accents only).
Navy #1F3A5F only where a character already wears it (Ari's T-shirt, Rimon's scarf). No other colours.

CHARACTERS (never redesign them):
- Ari: a friendly Israeli man around 35, short dark curly hair, trimmed beard, warm brown skin,
  navy T-shirt, simple silver chain; no kippah unless the row says "synagogue look".
- Noa: a friendly Israeli woman around 32, shoulder-length wavy dark hair, olive skin,
  terracotta blouse, small gold hoop earrings.
- Rimon: a round red pomegranate mascot with the pomegranate's own small gold crown on top,
  a navy scarf, rosy cheeks, a simple smile, short stick arms and legs.

RULES FOR EVERY PICTURE
- No text of any kind: no letters in any alphabet, no numbers, no words in speech bubbles,
  no captions, no logos, no pseudo-Hebrew. Books, prayer books, cards, signs, maps and screens
  are closed, blank, or show plain lines only. Hebrew is added later by the app as real type.
- Everyday modest clothing. No depiction of God. No open Torah scroll. No Temple objects.
- Draw exactly one picture per row, at the size the row gives. No border or frame unless the row asks.
- When a row says "transparent": a PNG with a transparent background. If transparency is not
  available, use one flat solid magenta #FF00FF background with no shadow, and no magenta in the subject.
```

| Colour | Hex | Use |
|---|---|---|
| deep green | `#1E4634` | main field colour (the app accent) |
| darkest green | `#16301C` | night sky, splash, header (the app theme colour) |
| olive | `#6B7F3A` | leaves, second green |
| warm gold | `#D9A441` | trunks, rims, highlights (the app gold) |
| light gold | `#E9C46A` | glow and shine only |
| paper cream | `#F6F1E7` | backgrounds of spot art |
| warm white | `#FFFAF0` | pages, tiles |
| pomegranate red | `#B0373B` | small accents only |
| charcoal | `#2B2B2B` | outlines |
| navy | `#1F3A5F` | only where a character already wears it (Ari's T-shirt, Rimon's scarf) |

Reference pictures (already in the repo): `assets/img/gen/CHAR_ari_sheet.800.webp`, `assets/img/gen/CHAR_ari_synagogue.800.webp`, `assets/img/gen/CHAR_noa_sheet.800.webp`, `assets/img/gen/CHAR_noa_telaviv.800.webp`, `assets/img/gen/MASCOT_rimon.800.webp`, `assets/img/gen/HERO_home_tree.webp`, `assets/img/gen/BADGE_streak-7.800.webp`, `assets/img/gen/BADGE_games-5.800.webp`.

## 1. App Icon Set

**Why:** Seen before anything else: the home screen, the install prompt, the browser tab, notifications and both store listings. Today's icon is navy (#1F3A5F) and cream from the old palette, so it clashes with the green-and-gold app. Its letter is an SVG `<text>` element in FreeSerif or DejaVu, so each device draws the alef in whatever font it has, and its PNGs have rounded corners baked in, while store guides say to upload a full square because Google Play applies its own rounded mask.

**Plan:** The alef is never generated. It is the real alef from Frank Ruhl Libre Black (already in the repo, SIL OFL), outlined to a vector path: `docs/images/orders/alef-mark-v2.svg`. A vector-only version already works and is the fallback (`docs/images/orders/icon-concept-preview.png`: old icon, new icon, new maskable, then 96/64/48/32 px). The one generated picture is a background plate that adds depth at large sizes (store 1024, Play 512, the 180 touch icon). Compare the plate version with the plain vector version at 48 px and at 1024 px and keep whichever reads better; the small sizes (192 and under, favicons) use the plain vector version either way.

### 1.1 `ICON_v2_plate.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** App icon background plate with NO letter. Full-bleed square of flat deep green #1E4634. Across the whole field, a very faint tone-on-tone engraving of olive branches in #16301C rising from the bottom edge like the rings of the Tree. In the centre, a soft round warm-gold #E9C46A glow at low strength (this row may use one soft glow). The centre circle, 56% of the width, stays clear of any branch: the gold alef is placed there later as vector. No outline, no rounded corners, no shadow, no letter, no symbol.
- **Style:** House style, with one soft glow allowed. Tone-on-tone only, so it never competes with the gold alef.
- **Screen:** Home screen and app launcher, install prompt, App Store and Google Play listings

**Built from it by script:**

| File | Size | What |
|---|---|---|
| `assets/icons/v2/icon.svg` | vector | Plain vector: deep-green field, soft gold glow, gold alef path. Favicon and manifest "any". |
| `assets/icons/v2/icon-any-512.png` | 512x512 | Manifest "any". Plain vector, rounded corners (22.4%) with transparent corners, alef 59% of the height. |
| `assets/icons/v2/icon-any-192.png` | 192x192 | Manifest "any", as above. |
| `assets/icons/v2/icon-maskable-512.png` | 512x512 | Manifest "maskable". Full bleed, no corners; the whole alef inside the central circle of radius 40% (alef 46% of the height). |
| `assets/icons/v2/icon-maskable-192.png` | 192x192 | Manifest "maskable", as above. |
| `assets/icons/v2/icon-monochrome-512.png` | 512x512 | Manifest "monochrome": the alef in solid black on transparent. |
| `assets/icons/v2/apple-touch-icon-180.png` | 180x180 | iOS home screen. Plate version, full bleed square, no transparency (iOS rounds it). |
| `assets/icons/v2/favicon-32.png` | 32x32 | Browser tab fallback for browsers without SVG favicons. Plain vector. |
| `assets/icons/v2/notify-badge-96.png` | 96x96 | Android notification badge: the alef in solid white on transparent (src/shell/notify.js passes it as `badge`). |
| `store/apple/AppIcon-1024.png` | 1024x1024 | App Store icon: plate version, full bleed, no alpha channel (Apple applies the mask). |
| `store/apple/AppIcon-dark-1024.png` | 1024x1024 | iOS dark appearance: gold alef on a transparent background. |
| `store/apple/AppIcon-tinted-1024.png` | 1024x1024 | iOS tinted appearance: the alef in greyscale on black. |
| `store/google-play/icon-512.png` | 512x512 | Google Play hi-res icon: plate version, 32-bit PNG, full-bleed square, no baked corners, under 1024 KB. |

**Wiring (later, separate change):** After John approves the look: manifest.webmanifest `icons` point at assets/icons/v2 (any 192 and 512, maskable 192 and 512, monochrome 512); index.html `rel=icon` -> assets/icons/v2/icon.svg and `rel=apple-touch-icon` -> assets/icons/v2/apple-touch-icon-180.png; notify.js `badge` -> assets/icons/v2/notify-badge-96.png. FIRST-INSTALL BUDGET: the install is 4,129,564 bytes today, 12,311 bytes under the 3.95 MiB target, and the six current icon files are precached (33,884 bytes). New PNGs in assets/icons/v2 would be precached too, so in the same commit keep only icon.svg installed up front and list the v2 PNGs as on-demand in tools/build-precache.mjs (the browser fetches manifest icons itself at install), then retire the old six from the precache list. Old files stay in git until John says otherwise.

**Replaces these pending rows (left untouched in `data/images/manifest.csv`; John can mark them skipped):** BRAND_icon (pending, STYLE GUIDE v1 navy palette).

## 2. Store Screenshots and Install-Dialog Screenshots

**Why:** The screenshots sell the app on both store pages and in Chrome's install dialog, which is live today. The current manifest screenshots (assets/screens, 390x844 and 1280x800) show the earlier navy design and a "no recordings exist yet" banner, with no captions and no characters.

**Plan:** Six screenshot stories, each = real app screen in a simple phone frame + a short caption + one character cut-out. Only the cut-outs and one background pattern are generated; captions are real type added by the build script (Heebo 800, warm white #FFFAF0 on the green background). Captions reuse copy the app already shows; John approves the wording.

### 2.1 `CUT_v2_noa_point.png`

- **Size:** 1024x1024 (1:1), transparent
- **Shows:** Noa, waist-up, turned slightly to the left, smiling, pointing up and to the left with her right index finger (she points at a headline above her).
- **Style:** House style. Cut-out for compositing. Transparent background (PNG with alpha).
- **Screen:** Store screenshot 01 (Home)
- **Attach:** `assets/img/gen/CHAR_noa_sheet.800.webp`

### 2.2 `CUT_v2_rimon_cheer.png`

- **Size:** 1024x1024 (1:1), transparent
- **Shows:** Rimon, full body, jumping with both arms up, eyes happily closed, three small gold sparkles around him.
- **Style:** House style. Cut-out for compositing. Transparent background (PNG with alpha).
- **Screen:** Store screenshot 02 (first letter)
- **Attach:** `assets/img/gen/MASCOT_rimon.800.webp`

### 2.3 `CUT_v2_ari_trace.png`

- **Size:** 1024x1024 (1:1), transparent
- **Shows:** Ari, waist-up, smiling at the viewer, right index finger raised as if drawing in the air, with a short curved gold sparkle trail behind the fingertip (an abstract swoosh, not a letter shape).
- **Style:** House style. Cut-out for compositing. Transparent background (PNG with alpha).
- **Screen:** Store screenshot 03 (letters)
- **Attach:** `assets/img/gen/CHAR_ari_sheet.800.webp`

### 2.4 `CUT_v2_rimon_run.png`

- **Size:** 1024x1024 (1:1), transparent
- **Shows:** Rimon, full body, jogging to the right in a small gold sweatband, holding up a round gold stopwatch with a blank face (no numbers, no hands).
- **Style:** House style. Cut-out for compositing. Transparent background (PNG with alpha).
- **Screen:** Store screenshot 04 (Brain Lab)
- **Attach:** `assets/img/gen/MASCOT_rimon.800.webp`

### 2.5 `CUT_v2_ari_siddur.png`

- **Size:** 1024x1024 (1:1), transparent
- **Shows:** Ari in his synagogue look (as on his synagogue sheet), waist-up, warm smile, holding a closed small deep-green prayer book with gold-edged pages against his chest; nothing written on the cover.
- **Style:** House style. Cut-out for compositing. Transparent background (PNG with alpha).
- **Screen:** Store screenshot 05 (prayers)
- **Attach:** `assets/img/gen/CHAR_ari_sheet.800.webp`, `assets/img/gen/CHAR_ari_synagogue.800.webp`

### 2.6 `CUT_v2_noa_medal.png`

- **Size:** 1024x1024 (1:1), transparent
- **Shows:** Noa, waist-up, proud smile, holding up in her right hand a round gold medallion with an olive wreath and a plain empty green centre (no symbol, no writing).
- **Style:** House style. Cut-out for compositing. Transparent background (PNG with alpha).
- **Screen:** Store screenshot 06 (awards)
- **Attach:** `assets/img/gen/CHAR_noa_sheet.800.webp`, `assets/img/gen/BADGE_streak-7.800.webp`

### 2.7 `PATTERN_v2_olive.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** Seamless repeating tile: scattered olive leaves, small olives and a few tiny pomegranates as flat shapes in deep green #1E4634 on flat darkest green #16301C. Tone-on-tone, low contrast, no outlines in this row. The left edge must continue into the right edge and the top into the bottom.
- **Style:** House palette, outlines off for this row only. Used at 6 to 10% strength behind store screenshots, the feature graphic and the launch screens.
- **Screen:** Background texture for store screenshots and launch screens

**Screenshot stories** (captions reuse copy the app already shows; John approves the wording):

| # | Screen to capture | Caption | Cut-out |
|---|---|---|---|
| 01-home | #/ (Home, top of page, Tree hero visible) | Read Hebrew aloud. Speak it in Israel. | `CUT_v2_noa_point` |
| 02-first-letter | #/firstday (step "Your First Letter: Shin") | Hear it. Trace it. Your first letter. | `CUT_v2_rimon_cheer` |
| 03-letters | #/letters/alef (Trace tab) | Learn all 27 letter forms, one at a time. | `CUT_v2_ari_trace` |
| 04-brain-lab | #/brainlab (Today's Workout card) | Three 45-second drills a day. | `CUT_v2_rimon_run` |
| 05-prayers | a prayer-book reading line in the Read track | Prayers, Torah and everyday Israel. | `CUT_v2_ari_siddur` |
| 06-awards | #/awards (the medallion grid, demo profile with a few medallions earned) | Keep a daily streak. Earn medallions. | `CUT_v2_noa_medal` |

**Build recipe (no new art):** Capture each screen in Chrome at 440x956 CSS px, device scale 3 (that is exactly 1320x2868), light theme, the Rimon greeting bubble closed. Composite for 1320x2868: background flat #1E4634 at the top fading to #16301C at the bottom, PATTERN_v2_olive tiled at 8% strength; caption centred, top 150 to 560 px, Heebo 800 at 96 px, warm white #FFFAF0, at most two lines, a 120x8 px gold #D9A441 rule under it; phone frame = rounded rectangle 1000x2170 px at x 160, y 640, radius 120, 18 px #0F2416 bezel, the capture scaled into it; the story's cut-out 720 px tall, overlapping a lower corner of the frame by about 120 px. Google Play and the narrow manifest set use the same layout at 1080x1920 (scale 0.818, phone frame shortened to fit). iPad: same layout at 2064x2752 with an iPad-shaped frame.

**Built from it by script:**

| File | Size | What |
|---|---|---|
| `store/apple/iphone-6.9/01-home.png ... 06-awards.png` | 1320x2868 | App Store iPhone 6.9-inch set (6 files). PNG, RGB, no transparency. |
| `store/apple/ipad-13/01-home.png ... 06-awards.png` | 2064x2752 | App Store iPad 13-inch set (6 files). Only if the iOS build runs on iPad. |
| `store/google-play/phone/01-home.png ... 06-awards.png` | 1080x1920 | Google Play phone set (6 files). 24-bit PNG, no alpha. |
| `assets/screens/v2/narrow-01-home.png ... narrow-05-prayers.png` | 1080x1920 | Manifest screenshots, form_factor "narrow" (stories 01 to 05; Chrome on Android shows at most five). |
| `assets/screens/v2/wide-01-home.png ... wide-03-brain-lab.png` | 1920x1080 | Manifest screenshots, form_factor "wide" (desktop install dialog): raw desktop captures at 1280x720, device scale 1.5. |

**Wiring (later, separate change):** manifest.webmanifest `screenshots`: replace the eight current entries with the v2 narrow (5) and wide (3) files, each with `form_factor` and a `label` that repeats the caption. assets/screens/ is already on-demand in the precache rules, so no install-size cost. The store/ folder is outside src, assets and data, so it is never precached; it only holds uploads for the two stores.

**Replaces these pending rows (left untouched in `data/images/manifest.csv`; John can mark them skipped):** BRAND_store (pending, v1).

## 3. Key Art: Google Play Feature Graphic and Link Preview

**Why:** Google Play will not publish a listing without a 1024x500 feature graphic, and it is the first thing shown on the listing. index.html has no og:image or twitter tags today, so a shared ALEF link shows no picture in WhatsApp, iMessage or Slack.

**Plan:** One wide picture, cropped two ways. The app name and tagline are real type added on top (never drawn by the image tool).

### 3.1 `KEYART_v2_tree.png`

- **Size:** 1536x1024 (3:2)
- **Shows:** Evening key art. On the right half, a large golden olive tree (gold trunk, deep green and olive canopy) on a low hill, its canopy glowing softly. Under the tree, Ari and Noa sit on a low stone wall sharing one open book with plain lines (no writing); Rimon stands on the wall beside them, waving. A woven basket of pomegranates at the foot of the wall (pomegranates are in the basket, never on the olive tree). Sky: flat darkest green #16301C with a few small gold stars. The LEFT 45% of the picture is calm empty sky only (the name goes there later). Keep every character and the whole tree inside the middle band from y=150 to y=870 (the top and bottom are cropped).
- **Style:** House style. Use the home hero tree only as a silhouette reference; draw it flat, not painterly.
- **Screen:** Google Play listing header; link previews
- **Attach:** `assets/img/gen/CHAR_ari_sheet.800.webp`, `assets/img/gen/CHAR_noa_sheet.800.webp`, `assets/img/gen/MASCOT_rimon.800.webp`, `assets/img/gen/HERO_home_tree.webp`

**Built from it by script:**

| File | Size | What |
|---|---|---|
| `store/google-play/feature-graphic.png` | 1024x500 | Crop the band y=137..887 (1536x750), scale to 1024x500. JPEG or 24-bit PNG, no alpha. Overlay on the left: the ALEF wordmark with אָלֶף under it (Frank Ruhl Libre for the Hebrew, Heebo 800 for ALEF) and one short tagline; keep text away from the edges. |
| `assets/social/og-image-1200x630.png` | 1200x630 | Crop the band y=109..915 (1536x806), scale to 1200x630; same wordmark overlay. Under 300 KB. |

**Wiring (later, separate change):** index.html head: og:type, og:title, og:description, og:image (absolute https URL of assets/social/og-image-1200x630.png), og:image:width 1200, og:image:height 630, twitter:card summary_large_image. Add 'assets/social/' to the on-demand list in tools/build-precache.mjs so it is never installed. Product name: ALEF unless John picks another (Batch 01, task 5).

**Replaces these pending rows (left untouched in `data/images/manifest.csv`; John can mark them skipped):** BRAND_hero (pending, v1); BRAND_ad (pending, v1); BRAND_cover_b (pending, v1).

## 4. Onboarding (First Run)

**Why:** Every new learner sees these four steps (src/onboarding/firstrun.view.js: letters, congregation, minutes, plan). Today they are text and radio buttons only, and the Welcome card has no picture. A friendly picture per step is the standard in top learning apps and makes the first two minutes feel guided.

**Plan:** One wide banner for the Welcome card and one round spot picture per step, shown at about 152 px in a circle above the step heading.

### 4.1 `ONB_v2_welcome.png`

- **Size:** 1536x1024 (3:2)
- **Shows:** Wide welcome banner on paper cream #F6F1E7: the golden olive tree in the centre, Ari on the left and Noa on the right standing under it and waving hello, Rimon in front waving with both arms; a low stone wall and a woven basket of pomegranates at the foot of the tree. Keep all faces inside the band y=170 to y=850 (the app crops the banner to 16:9).
- **Style:** House style.
- **Screen:** #/welcome: top of the "Welcome to Aleph" card
- **Attach:** `assets/img/gen/CHAR_ari_sheet.800.webp`, `assets/img/gen/CHAR_noa_sheet.800.webp`, `assets/img/gen/MASCOT_rimon.800.webp`, `assets/img/gen/HERO_home_tree.webp`

### 4.2 `ONB_v2_letters.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** Three wide blank cream stone steps rising from left to right toward a small golden olive tree at the top right. Rimon stands on the first step looking up, excited; Noa stands beside the steps with an encouraging open-hand gesture. The steps are plain (no letters).
- **Style:** House style. Paper cream #F6F1E7 background. Keep the whole scene inside a centred circle 880 px wide (the app shows it inside a circle).
- **Screen:** #/welcome step 1: "How much Hebrew can you read today?"
- **Attach:** `assets/img/gen/CHAR_noa_sheet.800.webp`, `assets/img/gen/MASCOT_rimon.800.webp`

### 4.3 `ONB_v2_congregation.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** A warm synagogue doorway: a tall arched wooden door with a simple gold arch and a plain round window, a potted olive tree beside it. Ari in his synagogue look holds a closed prayer book; Noa stands beside him with a hand cupped to her ear, listening. Between them float two small rounded speech shapes, one gold and one olive, both empty.
- **Style:** House style. No symbols in the window or on the door. Paper cream #F6F1E7 background. Keep the whole scene inside a centred circle 880 px wide (the app shows it inside a circle).
- **Screen:** #/welcome step 2: synagogue and pronunciation
- **Attach:** `assets/img/gen/CHAR_ari_sheet.800.webp`, `assets/img/gen/CHAR_ari_synagogue.800.webp`, `assets/img/gen/CHAR_noa_sheet.800.webp`

### 4.4 `ONB_v2_minutes.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** Rimon watering a young olive sapling in a clay pot with a small gold watering can; beside the pot stands a gold hourglass with cream sand running.
- **Style:** House style. Paper cream #F6F1E7 background. Keep the whole scene inside a centred circle 880 px wide (the app shows it inside a circle).
- **Screen:** #/welcome step 3: "Your goal and time"
- **Attach:** `assets/img/gen/MASCOT_rimon.800.webp`

### 4.5 `ONB_v2_week.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** Seven small clay pots in a row on one wooden shelf, each with an olive sapling a little taller than the one before, left to right. The seventh pot, at the right, rests under a small white cloth, with two lit Shabbat candles in simple gold candlesticks beside it (the day of rest).
- **Style:** House style. Paper cream #F6F1E7 background. Keep the whole scene inside a centred circle 880 px wide (the app shows it inside a circle).
- **Screen:** #/welcome step 4: "Your week"

**Wiring (later, separate change):** firstrun.view.js: render the banner above the h1 and one decorative image (alt="", 152 px circle, loading=lazy) above each step's h2, through the same image resolver the other views use (generated-manifest ids). Images are under assets/img/gen, which is runtime-cached, so no install-size cost; a missing or unapproved image simply draws nothing.

## 5. Launch Screens (Splash)

**Why:** Android builds its launch screen from the manifest: today that is cream #F6EFE0 with the navy icon. iOS shows a blank screen at launch because index.html has no apple-touch-startup-image links.

**Plan:** Android: no picture needed; the new 512 icon plus manifest background_color #16301C gives a dark-green launch screen with the gold alef. iOS: one generated foliage band, combined by script with the vector alef on a darkest-green field, at each exact iOS screen size.

### 5.1 `SPLASH_v2_band.png`

- **Size:** 1536x1024 (3:2)
- **Shows:** Decorative band for the bottom of a launch screen: olive branches and leaves rising from the bottom edge, with two small pomegranates and a few olives, in gold, olive and deep green on a flat darkest-green #16301C background. The top 55% of the picture is empty flat #16301C (it blends into the screen colour).
- **Style:** House style.
- **Screen:** iOS launch screen (installed ALEF on iPhone and iPad)

**Built from it by script:**

| File | Size | What |
|---|---|---|
| `assets/splash/v2/ios-<width>x<height>.png` | one per iOS screen size | Field = the colour sampled from the band's top-left corner; PATTERN_v2_olive at 6%; the vector alef centred at 22% of the width; the band scaled to the full width along the bottom. Portrait for every iPhone and iPad size, plus landscape for iPads. The image must match the device window exactly (Safari ignores a startup image that is off by one pixel). Check the size list against Apple's current device list when wiring. |

**Wiring (later, separate change):** index.html: one <link rel="apple-touch-startup-image" media="(device-width: ...) and (device-height: ...) and (-webkit-device-pixel-ratio: ...) and (orientation: ...)"> per file. tools/build-precache.mjs: add 'assets/splash/' to the skip list so these PNGs are never part of the first install. manifest.webmanifest: background_color "#16301c" (Android launch screen).

## 6. Empty, Offline and Error States

**Why:** Review ("Nothing Due"), Search ("No matches yet"), Progress (all zeros), Awards (first visit), Page not found and the offline and error cards are plain text today. New learners hit most of these on day one, so they set the tone.

**Plan:** One Rimon picture per state, shown at 128 to 160 px in a circle above the message.

### 6.1 `EMPTY_v2_review.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** Rimon lying in a small hammock tied between two olive branches, eyes closed and smiling; a woven basket full of olives on the ground below (all done for today).
- **Style:** House style. Paper cream #F6F1E7 background. Keep the whole scene inside a centred circle 880 px wide (the app shows it inside a circle).
- **Screen:** Review, nothing due (src/curriculum/review.view.js)
- **Attach:** `assets/img/gen/MASCOT_rimon.800.webp`

### 6.2 `EMPTY_v2_search.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** Rimon holding a big gold magnifying glass, peering into an empty woven basket, one eyebrow raised, curious.
- **Style:** House style. Paper cream #F6F1E7 background. Keep the whole scene inside a centred circle 880 px wide (the app shows it inside a circle).
- **Screen:** Search, no matches (src/shell/search.view.js)
- **Attach:** `assets/img/gen/MASCOT_rimon.800.webp`

### 6.3 `EMPTY_v2_progress.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** A single seed sprouting two leaves in a small clay pot; Rimon kneels beside it holding a tiny gold watering can (the tree starts here).
- **Style:** House style. Paper cream #F6F1E7 background. Keep the whole scene inside a centred circle 880 px wide (the app shows it inside a circle).
- **Screen:** Progress, nothing practised yet (src/progress/progress.view.js)
- **Attach:** `assets/img/gen/MASCOT_rimon.800.webp`

### 6.4 `EMPTY_v2_awards.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** A wooden display shelf with three empty round medallion stands; Rimon polishing the first stand with a cream cloth, smiling.
- **Style:** House style. Paper cream #F6F1E7 background. Keep the whole scene inside a centred circle 880 px wide (the app shows it inside a circle).
- **Screen:** Awards, first visit (src/awards/gallery.view.js)
- **Attach:** `assets/img/gen/MASCOT_rimon.800.webp`

### 6.5 `EMPTY_v2_notfound.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** Rimon at a fork in a garden path between two olive trees, holding a paper map upside down (plain lines only), with a puzzled smile.
- **Style:** House style. Paper cream #F6F1E7 background. Keep the whole scene inside a centred circle 880 px wide (the app shows it inside a circle).
- **Screen:** Page not found (src/app.js)
- **Attach:** `assets/img/gen/MASCOT_rimon.800.webp`

### 6.6 `EMPTY_v2_offline.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** Rimon on a small hill holding up a lit gold oil lamp toward a distant village of small cream houses; a dotted gold line runs from the lamp toward the village with a short gap in the middle.
- **Style:** House style. Paper cream #F6F1E7 background. Keep the whole scene inside a centred circle 880 px wide (the app shows it inside a circle).
- **Screen:** "Needs a connection the first time" card (src/shell/ui.js, kind "offline", from PR #40)
- **Attach:** `assets/img/gen/MASCOT_rimon.800.webp`

### 6.7 `EMPTY_v2_error.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** Rimon sitting and patiently untangling a ball of gold yarn, with a calm small smile.
- **Style:** House style. Paper cream #F6F1E7 background. Keep the whole scene inside a centred circle 880 px wide (the app shows it inside a circle).
- **Screen:** Error card (src/shell/ui.js unavailableCard, kind "error")
- **Attach:** `assets/img/gen/MASCOT_rimon.800.webp`

**Wiring (later, separate change):** Each view adds one decorative image (alt="", 128 to 160 px, border-radius 50%, loading=lazy) through the generated-image resolver. The offline card must still work with no image available (it shows when the network is down and the image may not be cached), so a missing image draws nothing.

**Replaces these pending rows (left untouched in `data/images/manifest.csv`; John can mark them skipped):** STATE_art_01 to STATE_art_10 (pending, Command 243, v1 palette).

## 7. Lesson-Complete Celebration and Streak Lamp

**Why:** The lesson-complete panel (src/curriculum/exercises.ui.js) shows the one Rimon sticker every time. The streak is text only, although the app already has Shabbat and Yom Tov resting days (src/curriculum/streak.js). These moments repeat every day, so they carry the app's feel.

**Plan:** One celebration picture for lesson complete, and an olive-oil lamp in four states for the streak (olive oil fits the Tree theme).

### 7.1 `CELEB_v2_lesson.png`

- **Size:** 1024x1024 (1:1), transparent
- **Shows:** Ari, Noa and Rimon cheering together: Rimon jumping in the middle, Ari and Noa with their arms up on either side, a burst of gold and olive-leaf confetti and small pomegranate seeds around them.
- **Style:** House style. Transparent background (PNG with alpha).
- **Screen:** Lesson complete panel (replaces MASCOT_rimon there)
- **Attach:** `assets/img/gen/CHAR_ari_sheet.800.webp`, `assets/img/gen/CHAR_noa_sheet.800.webp`, `assets/img/gen/MASCOT_rimon.800.webp`

### 7.2 `STREAK_v2_lamp_unlit.png`

- **Size:** 1024x1024 (1:1), transparent
- **Shows:** A small round clay olive-oil lamp of the ancient kind, with a spout, terracotta with a thin gold rim, unlit.
- **Style:** House style. Transparent background (PNG with alpha).
- **Screen:** Home Today card and Progress: no study yet today

### 7.3 `STREAK_v2_lamp_lit.png`

- **Size:** 1024x1024 (1:1), transparent
- **Shows:** The same clay olive-oil lamp, now lit with a small warm gold flame at the spout.
- **Style:** House style. Same lamp, same angle and size as STREAK_v2_lamp_unlit. Transparent background (PNG with alpha).
- **Screen:** Home Today card and Progress: studied today

### 7.4 `STREAK_v2_lamp_gold.png`

- **Size:** 1024x1024 (1:1), transparent
- **Shows:** The same lamp, lit, with a soft ring of gold light around it and three small olive leaves at its base.
- **Style:** House style. Same lamp, same angle and size. Transparent background (PNG with alpha).
- **Screen:** Home Today card and Progress: a streak of 7 days or more

### 7.5 `STREAK_v2_lamp_rest.png`

- **Size:** 1024x1024 (1:1), transparent
- **Shows:** The same lamp, unlit, resting under a small clear glass dome, a neatly folded white cloth beside it.
- **Style:** House style. Same lamp, same angle and size. Transparent background (PNG with alpha).
- **Screen:** Home Today card and Progress: a resting day (Shabbat or Yom Tov) that keeps the streak

**Wiring (later, separate change):** exercises.ui.js: the celebration image switches from MASCOT_rimon.800.webp to CELEB_v2_lesson (keep the same 120 px box or grow it to 160). src/home/today.js and src/progress/progress.view.js: one lamp beside the streak line, picked from the streak record (none today / today done / 7+ / resting day).

**Replaces these pending rows (left untouched in `data/images/manifest.csv`; John can mark them skipped):** STREAK_art_01 to STREAK_art_10 (pending, Command 242, v1).

## 8. Missing Medallions

**Why:** The 25 milestone medallions are drawn and approved. Six awards still have no art, so the gallery falls back to a plain line glyph: the two practice badges, the Beginner checklist, and the three mastery finish slots (src/awards/eligibility.js).

**Plan:** Same recipe as the approved set, so they sit in the grid without a seam. The gallery already looks up BADGE_<award id>, so these names wire themselves once approved. Optional: 1600x1600 if your tool offers it, to match the existing sources.

### 8.1 `BADGE_game-session.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** Practice Game medallion: a small wooden game board of blank cream squares with one gold playing piece on it.
- **Style:** MEDALLION RECIPE (the same as the 25 approved Aleph medallions; attach BADGE_streak-7 and BADGE_games-5 as references): one round enamel medallion centred on a plain paper-cream #F6F1E7 background, filling about 90% of the square; deep green #1E4634 enamel field, warm gold #D9A441 rim, a ring of olive leaves with a few small pomegranate-red seeds, one central symbol in gold, cream and green; thin gold line work and a faint paper texture; no text, no numerals.
- **Screen:** Awards gallery: "Practice game session"
- **Attach:** `assets/img/gen/BADGE_streak-7.800.webp`, `assets/img/gen/BADGE_games-5.800.webp`

### 8.2 `BADGE_game-return.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** Came Back medallion: an olive branch bent into a circle that loops back to its own start, with one olive at the join.
- **Style:** MEDALLION RECIPE (the same as the 25 approved Aleph medallions; attach BADGE_streak-7 and BADGE_games-5 as references): one round enamel medallion centred on a plain paper-cream #F6F1E7 background, filling about 90% of the square; deep green #1E4634 enamel field, warm gold #D9A441 rim, a ring of olive leaves with a few small pomegranate-red seeds, one central symbol in gold, cream and green; thin gold line work and a faint paper texture; no text, no numerals.
- **Screen:** Awards gallery: "Returned to a practice game"
- **Attach:** `assets/img/gen/BADGE_streak-7.800.webp`, `assets/img/gen/BADGE_games-5.800.webp`

### 8.3 `BADGE_beginner-completion.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** Beginner Checklist medallion: a cream ribbon rosette with three gold check marks stacked in a column at its centre.
- **Style:** MEDALLION RECIPE (the same as the 25 approved Aleph medallions; attach BADGE_streak-7 and BADGE_games-5 as references): one round enamel medallion centred on a plain paper-cream #F6F1E7 background, filling about 90% of the square; deep green #1E4634 enamel field, warm gold #D9A441 rim, a ring of olive leaves with a few small pomegranate-red seeds, one central symbol in gold, cream and green; thin gold line work and a faint paper texture; no text, no numerals.
- **Screen:** Awards gallery: "Beginner checklist"
- **Attach:** `assets/img/gen/BADGE_streak-7.800.webp`, `assets/img/gen/BADGE_games-5.800.webp`

### 8.4 `BADGE_mastery-matte.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** Mastery frame, matte finish: the medallion rim and olive wreath only, the centre a plain empty green field; finish: soft unpolished bronze-gold with no shine.
- **Style:** MEDALLION RECIPE (the same as the 25 approved Aleph medallions; attach BADGE_streak-7 and BADGE_games-5 as references): one round enamel medallion centred on a plain paper-cream #F6F1E7 background, filling about 90% of the square; deep green #1E4634 enamel field, warm gold #D9A441 rim, a ring of olive leaves with a few small pomegranate-red seeds, one central symbol in gold, cream and green; thin gold line work and a faint paper texture; no text, no numerals. The three mastery rows must be the same frame, same size and angle; only the finish changes.
- **Screen:** Awards gallery: mastery slot "Matte"
- **Attach:** `assets/img/gen/BADGE_streak-7.800.webp`

### 8.5 `BADGE_mastery-polished.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** The same mastery frame, polished finish: bright warm gold with crisp flat highlights; the centre a plain empty green field.
- **Style:** MEDALLION RECIPE (the same as the 25 approved Aleph medallions; attach BADGE_streak-7 and BADGE_games-5 as references): one round enamel medallion centred on a plain paper-cream #F6F1E7 background, filling about 90% of the square; deep green #1E4634 enamel field, warm gold #D9A441 rim, a ring of olive leaves with a few small pomegranate-red seeds, one central symbol in gold, cream and green; thin gold line work and a faint paper texture; no text, no numerals. Same frame as BADGE_mastery-matte.
- **Screen:** Awards gallery: mastery slot "Polished"
- **Attach:** `assets/img/gen/BADGE_streak-7.800.webp`

### 8.6 `BADGE_mastery-foil.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** The same mastery frame, foil finish: gold foil with a faint flat pattern of fine green-and-gold diagonal lines; the centre a plain empty green field.
- **Style:** MEDALLION RECIPE (the same as the 25 approved Aleph medallions; attach BADGE_streak-7 and BADGE_games-5 as references): one round enamel medallion centred on a plain paper-cream #F6F1E7 background, filling about 90% of the square; deep green #1E4634 enamel field, warm gold #D9A441 rim, a ring of olive leaves with a few small pomegranate-red seeds, one central symbol in gold, cream and green; thin gold line work and a faint paper texture; no text, no numerals. Same frame as BADGE_mastery-matte. Still flat vector, no 3D.
- **Screen:** Awards gallery: mastery slot "Foil"
- **Attach:** `assets/img/gen/BADGE_streak-7.800.webp`

**Also (no new art):** No new art: five approved medallions sit too small in their frames, so at 64 px they look like dots next to the others: BADGE_letter-master, BADGE_night-owl, BADGE_streak-100, BADGE_streak-365 and BADGE_streak-5 (all from 1920x1280 sources). Re-crop each from its .1920.webp to a square with the medallion filling about 92%, and re-export the 800 and 1600 copies under the same names, once John agrees.

**Wiring (later, separate change):** None for the six new ones: src/awards/gallery.view.js already looks up BADGE_<id> and shows it once approved.

**Replaces these pending rows (left untouched in `data/images/manifest.csv`; John can mark them skipped):** BADGE_01 to BADGE_08 and BADGE_01_locked to BADGE_08_locked (pending, v1; the approved medallions already replaced them).

## 9. Brain Lab

**Why:** Brain Lab is ten drills on a text-only page (src/lab/lab.core.js GAMES). A header picture and one token per drill make the workout list scannable at a glance, the way fitness-style brain apps look.

**Plan:** One wide header and ten round tokens, shown at 56 px beside each drill name.

### 9.1 `LAB_v2_hero.png`

- **Size:** 1536x1024 (3:2)
- **Shows:** Wide banner on paper cream: Rimon in a small gold sweatband doing a stretch beside three cream tiles stacked like a podium and a large round gold stopwatch with a blank face (no numbers, no hands); a few olive leaves in the corners. Keep Rimon and the stopwatch inside the band y=280 to y=740 (shown cropped to 3:1).
- **Style:** House style.
- **Screen:** #/brainlab: top of the page
- **Attach:** `assets/img/gen/MASCOT_rimon.800.webp`

### 9.2 `LAB_v2_hunt.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** A gold magnifying glass over three blank cream tiles, the middle tile glowing.
- **Style:** TOKEN RECIPE (a plainer cousin of the medallions, must read at 56 px): one round token centred on paper cream #F6F1E7, filling about 88% of the square; deep green #1E4634 disc, one thin warm-gold ring (no wreath), one simple symbol in gold #D9A441 and warm white #FFFAF0 with thick rounded outlines; no text, no numerals.
- **Screen:** #/brainlab: "Letter Hunt" row
- **Attach:** `assets/img/gen/BADGE_streak-7.800.webp`

### 9.3 `LAB_v2_matrix.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** A 3 by 3 grid of blank cream tiles, three of them gold.
- **Style:** TOKEN RECIPE (a plainer cousin of the medallions, must read at 56 px): one round token centred on paper cream #F6F1E7, filling about 88% of the square; deep green #1E4634 disc, one thin warm-gold ring (no wreath), one simple symbol in gold #D9A441 and warm white #FFFAF0 with thick rounded outlines; no text, no numerals.
- **Screen:** #/brainlab: "Letter Matrix" row
- **Attach:** `assets/img/gen/BADGE_streak-7.800.webp`

### 9.4 `LAB_v2_soundmatch.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** An ear shape with three gold sound arcs beside one blank cream tile.
- **Style:** TOKEN RECIPE (a plainer cousin of the medallions, must read at 56 px): one round token centred on paper cream #F6F1E7, filling about 88% of the square; deep green #1E4634 disc, one thin warm-gold ring (no wreath), one simple symbol in gold #D9A441 and warm white #FFFAF0 with thick rounded outlines; no text, no numerals.
- **Screen:** #/brainlab: "Sound Match" row
- **Attach:** `assets/img/gen/BADGE_streak-7.800.webp`

### 9.5 `LAB_v2_siddurflash.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** A closed deep-green prayer book with gold-edged pages and a small gold lightning spark above it.
- **Style:** TOKEN RECIPE (a plainer cousin of the medallions, must read at 56 px): one round token centred on paper cream #F6F1E7, filling about 88% of the square; deep green #1E4634 disc, one thin warm-gold ring (no wreath), one simple symbol in gold #D9A441 and warm white #FFFAF0 with thick rounded outlines; no text, no numerals.
- **Screen:** #/brainlab: "Siddur Flash" row
- **Attach:** `assets/img/gen/BADGE_streak-7.800.webp`

### 9.6 `LAB_v2_switch.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** Two curved gold arrows chasing each other in a circle around a small cream square and a small cream circle.
- **Style:** TOKEN RECIPE (a plainer cousin of the medallions, must read at 56 px): one round token centred on paper cream #F6F1E7, filling about 88% of the square; deep green #1E4634 disc, one thin warm-gold ring (no wreath), one simple symbol in gold #D9A441 and warm white #FFFAF0 with thick rounded outlines; no text, no numerals.
- **Screen:** #/brainlab: "Rule Switch" row
- **Attach:** `assets/img/gen/BADGE_streak-7.800.webp`

### 9.7 `LAB_v2_gematria.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** A small wooden abacus with gold and cream beads.
- **Style:** TOKEN RECIPE (a plainer cousin of the medallions, must read at 56 px): one round token centred on paper cream #F6F1E7, filling about 88% of the square; deep green #1E4634 disc, one thin warm-gold ring (no wreath), one simple symbol in gold #D9A441 and warm white #FFFAF0 with thick rounded outlines; no text, no numerals.
- **Screen:** #/brainlab: "Gematria" row
- **Attach:** `assets/img/gen/BADGE_streak-7.800.webp`

### 9.8 `LAB_v2_countup.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** Four cream counters stacked into rising steps, the top one gold.
- **Style:** TOKEN RECIPE (a plainer cousin of the medallions, must read at 56 px): one round token centred on paper cream #F6F1E7, filling about 88% of the square; deep green #1E4634 disc, one thin warm-gold ring (no wreath), one simple symbol in gold #D9A441 and warm white #FFFAF0 with thick rounded outlines; no text, no numerals.
- **Screen:** #/brainlab: "Count Up" row
- **Attach:** `assets/img/gen/BADGE_streak-7.800.webp`

### 9.9 `LAB_v2_numberear.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** An ear shape beside a short string of three gold beads.
- **Style:** TOKEN RECIPE (a plainer cousin of the medallions, must read at 56 px): one round token centred on paper cream #F6F1E7, filling about 88% of the square; deep green #1E4634 disc, one thin warm-gold ring (no wreath), one simple symbol in gold #D9A441 and warm white #FFFAF0 with thick rounded outlines; no text, no numerals.
- **Screen:** #/brainlab: "Number Ear" row
- **Attach:** `assets/img/gen/BADGE_streak-7.800.webp`

### 9.10 `LAB_v2_calendar.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** A gold crescent moon above a blank cream calendar page with a grid of plain dots.
- **Style:** TOKEN RECIPE (a plainer cousin of the medallions, must read at 56 px): one round token centred on paper cream #F6F1E7, filling about 88% of the square; deep green #1E4634 disc, one thin warm-gold ring (no wreath), one simple symbol in gold #D9A441 and warm white #FFFAF0 with thick rounded outlines; no text, no numerals.
- **Screen:** #/brainlab: "Calendar Puzzle" row
- **Attach:** `assets/img/gen/BADGE_streak-7.800.webp`

### 9.11 `LAB_v2_pattern.png`

- **Size:** 1024x1024 (1:1)
- **Shows:** Three blank cream tiles in a row joined by a gold thread, with an empty dashed place for a fourth.
- **Style:** TOKEN RECIPE (a plainer cousin of the medallions, must read at 56 px): one round token centred on paper cream #F6F1E7, filling about 88% of the square; deep green #1E4634 disc, one thin warm-gold ring (no wreath), one simple symbol in gold #D9A441 and warm white #FFFAF0 with thick rounded outlines; no text, no numerals.
- **Screen:** #/brainlab: "Letter Pattern" row
- **Attach:** `assets/img/gen/BADGE_streak-7.800.webp`

**Wiring (later, separate change):** src/lab/lab.view.js: the header above the h1 and each token (alt="", 56 px) at the start of its drill row; ids LAB_v2_<game id> match GAMES ids.

## 10. Learn Track Covers

**Why:** The Learn page asks learners to pick "Read the prayer book" or "Speak in Israel" with two plain pill buttons (src/curriculum/learn.view.js). A cover picture per track makes the choice clear at a glance.

**Plan:** Two wide covers, shown cropped to 2:1 above each track.

### 10.1 `TRACK_v2_prayer.png`

- **Size:** 1536x1024 (3:2)
- **Shows:** A quiet synagogue corner in warm light: a wooden reading desk holding a closed prayer book with a deep-green cover and gold-edged pages, a tall arched window with soft gold light, a potted olive tree; no people. Keep the book and window inside the band y=200 to y=830.
- **Style:** House style. No symbols or writing anywhere.
- **Screen:** Learn: "Read the prayer book" track

### 10.2 `TRACK_v2_israel.png`

- **Size:** 1536x1024 (3:2)
- **Shows:** A sunny Tel Aviv street café: Noa in her Tel Aviv look at a small round table with two coffee cups, white rounded Bauhaus-style buildings and a palm tree behind, a blank cream menu board (no writing). Keep Noa and the table inside the band y=200 to y=830.
- **Style:** House style.
- **Screen:** Learn: "Speak in Israel" track
- **Attach:** `assets/img/gen/CHAR_noa_sheet.800.webp`, `assets/img/gen/CHAR_noa_telaviv.800.webp`

**Wiring (later, separate change):** learn.view.js: show the chosen track's cover (alt="", 2:1 crop, loading=lazy) above its lesson list.

## Not Ordered, on Purpose

- **Characters:** Ari and Noa (14 approved poses), Rimon (MASCOT_rimon and the frame sheets in assets/img/rimon) already exist. Every order above reuses them.
- **Home hero:** HERO_home_tree and HERO_olive_harvest_astral already exist and are kept. They are painterly while the rest is flat; that mix is left as is.
- **Game art:** GAME_minute_one_celebration, GAME_letter_rush, GAME_tradition_detective and other GAME_ art are on the open games-first-words branches; nothing here repeats them.
- **Share-card backgrounds:** SHARE_bg_01 to 10 stay pending: the app has no share button yet (no navigator.share in src), so they would not show anywhere.
- **Brain Lab badges:** None: the award rules have no Brain Lab award, and inventing one is a product decision for John.

## Also Worth Doing (No New Art)

- Badge crops: re-crop five medallions (see rank 8). No new art.
- Awards page: about 49,000 px tall on a phone, mostly explanation. Folding the rules text into one "How awards work" section would let the medallion grid lead. Copy and layout only.
- Badge size: the gallery draws medallions at 64 px (.aw-badge-art). 88 px makes the art read as a reward. CSS only.

## Checks Before Approving Any Picture

- Zoom in: no letters, numbers or pseudo-Hebrew anywhere (the ingest OCR is a screen, not a guarantee).
- Ari, Noa and Rimon match their sheets (hair, clothes, crown, scarf).
- Pomegranates only in baskets or alone, never growing on the olive tree. Candles only in the "Your week" picture.
- Transparent rows really are transparent, or flat #FF00FF with clean edges.
- Icon: compare the plate version with the plain vector version at 48 px; the alef must stay crisp and centred inside the 40% circle on the maskable file.

## Store and Platform Sizes Used (Checked 2026-11-09)

- [App Store Connect Help: Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/): 6.9-inch iPhone 1320x2868 (also 1290x2796, 1260x2736); 1 to 10 screenshots; .jpeg/.jpg/.png.
- [Play Console Help: preview assets (icon)](https://support.google.com/googleplay/android-developer/answer/1078870): Hi-res icon 512x512, 32-bit PNG with alpha, up to 1024 KB.
- [Play Console Help: feature graphic](https://support.google.com/googleplay/android-developer/answer/9866151): Feature graphic 1024x500, JPEG or 24-bit PNG, no alpha.
- [Expo docs: Create app store assets](https://docs.expo.dev/guides/store-assets): Play listing minimums in one table (icon, feature graphic, screenshots).
- [web.dev: Adaptive icon support in PWAs with maskable icons](https://web.dev/articles/maskable-icon): Keep the logo inside a centred circle of radius 40% of the width.
- [web.dev: Web app manifest](https://web.dev/learn/pwa/web-app-manifest): Android builds the launch screen from theme_color, background_color and the icons.
- [Chrome Lighthouse: custom splash screen](https://developer.chrome.com/docs/lighthouse/pwa/splash-screen): Needs name, background_color, theme_color and an icon of at least 512x512.
- [web.dev: Learn PWA, enhancements](https://web.dev/learn/pwa/enhancements): iOS startup images use apple-touch-startup-image links with media queries and must match the window size exactly.
- [Apple: Configuring your app icon](https://developer.apple.com/documentation/xcode/configuring-your-app-icon): Single 1024x1024 icon; optional dark (transparent background) and tinted (greyscale) variants.
