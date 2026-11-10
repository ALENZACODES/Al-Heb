# ALEF Brain Lab Picture Orders: The Six New Games (2026-11-10)

For the six games added on the Brain Lab games branch of 2026-11-10: Sound Twins, Vowel Rain, Middle Letter, Taxi Turns, Café Order and Prayer Chain. **Orders only.** The code already has a slot for every picture below: each one shows as soon as it is ingested and approved, and nothing is fetched before that. Machine-readable copy: [`orders/brain-lab-new-games-2026-11-10.json`](orders/brain-lab-new-games-2026-11-10.json). Order sheet: [`orders/brain-lab-new-games-2026-11-10.csv`](orders/brain-lab-new-games-2026-11-10.csv). Manifest rows to append before ingest: [`orders/brain-lab-new-games-2026-11-10.manifest-rows.csv`](orders/brain-lab-new-games-2026-11-10.manifest-rows.csv).

**41 pictures:** 6 round tokens, 6 covers, 6 in-game pictures, 6 results pictures and 17 café menu pictures. They follow the same naming, sizes and house style as the Brain Lab orders for the first ten games (`docs/images/BRAIN-LAB-ORDERS-2026-11-09.md` and rank 9 of `docs/images/COMMERCIAL-ORDERS-2026-11-09.md`, PR #41), so one ingest covers both sets.

## Status (2026-11-10, 3 AM)

- **Drawn and in the app:** the six covers, the six in-game pictures (`LAB_v2_twins_play`, `LAB_v2_rain_play`, `LAB_v2_middle_play`, `LAB_v2_taxi_play`, `LAB_v2_cafe_play`, `LAB_v2_chain_play`) and the six results pictures, in `data/images/brain-lab-2026-11-10/` (see its README).
- **Still to draw:** the six tokens, the seventeen café menu pictures, `LAB_v2_rain_drop` and `LAB_v2_taxi_cab` (23 pictures). They show through the shared image resolver once ingested and approved.

## What Is Already Wired

| Picture | Where it shows | Code |
|---|---|---|
| `LAB_v2_<game>` token | 56 px round token beside each game on the Brain Lab page, 40 px in Today's Workout. Until approved: the game's Hebrew letter on a green-and-gold disc | `lab.view.js` `token()` |
| `LAB_v2_<game>_cover` | Top of the intro card, 2:1 crop | `lab.view.js` `intro()` |
| `LAB_v2_<game>_win` | Results card, above the stars, about 180 px | `lab.view.js` `results()` |
| In-game pictures | Per game, below; board pictures are switched off under high contrast and forced colours | `lab.games2.js` (`env.backdrop`, `env.img`) |
| `LAB_v2_menu_*` | Café Order menu tiles, 56 px above the English word | `lab.games2.js` café |
| `LAB_v2_hero`, `LAB_v2_workout_done`, `LAB_v2_new_best` and the in-game pictures of the first ten games (ordered in PR #41) | Top of Brain Lab; the same spot once the day's workout is done; beside "A new best score!"; board mats, tile backs and side pictures as their orders say | `lab.view.js`, `lab.games.js` |

Already drawn on `feature/commercial-images-2026-11-10` (not yet ingested): `LAB_v2_hero` and the ten tokens of the first ten games. Ingest and approve them and they appear on the Brain Lab page with no code change.

## How to Use

1. Paste the house style below once, then each prompt as it is. Attach the reference pictures each prompt names.
2. Save each picture under its exact file name, strip metadata, append the manifest rows, then ingest and approve as usual ([README.md](README.md)), and rebuild the image index (`node tools/img/build_index.mjs`).
3. Covers are cropped to 2:1, so keep faces inside the band the prompt gives. In-game pictures must stay calm in the middle: Hebrew sits on them.
4. Transparent prompts must arrive with a real transparent background (the ingest checks it).
5. Rimon stays exactly as on `assets/img/rimon/rimon-sprite.png`: round pomegranate-red body, gold crown on top with two olive leaves, small dot eyes, pink cheeks, simple smile, navy scarf tied at the front, thin red arms and legs. A prop or a small apron is fine; the scarf and crown always show.

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

## Sound Twins (`twins`, Speed)

**How it plays:** Letters appear one at a time; say whether each makes the same sound as the one before (two before from level 7). Twins such as Tet and Tav, Kaf and Qof, Vet and Vav.

### Token: `LAB_v2_twins.png`

- **Size:** 1024x1024
- **Shows:** Two blank cream cards standing side by side, joined by one gold sound wave that passes through both.
- **Screen:** Brain Lab page: the 56 px round token beside the game (lab.view.js token()), and in Today's Workout (40 px)

```
Two blank cream cards standing side by side, joined by one gold sound wave that passes through both. TOKEN RECIPE (the same as the ten Brain Lab tokens already drawn; attach LAB_v2_hunt and LAB_v2_switch from data/images/commercial-2026-11-10/ on the commercial images branch so the set matches): one round token centred on paper cream #F6F1E7, filling about 88% of the square; deep green #1E4634 disc, one thin warm-gold ring (no wreath), one simple symbol in gold #D9A441 and warm white #FFFAF0 with thick rounded outlines; no text, no numerals. Must read at 56 px. Attach as reference: assets/img/gen/BADGE_streak-7.800.webp. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Cover: `LAB_v2_twins_cover.png`

- **Size:** 1536x1024
- **Shows:** Ari and Noa face each other in a sunny Jerusalem-stone courtyard, each holding up one blank cream card at chest height; matching gold sound waves rise from both cards and meet in the middle. Rimon stands between them, turning his head from one card to the other with a delighted smile. Keep every character and the key object inside the band y=128 to y=896 (the app crops it to 2:1).
- **Screen:** Intro card above the game title (lab.view.js intro(), 2:1 crop, full card width)

```
Ari and Noa face each other in a sunny Jerusalem-stone courtyard, each holding up one blank cream card at chest height; matching gold sound waves rise from both cards and meet in the middle. Rimon stands between them, turning his head from one card to the other with a delighted smile. Keep every character and the key object inside the band y=128 to y=896 (the app crops it to 2:1). House style. Attach as reference: assets/img/gen/CHAR_ari_sheet.800.webp, assets/img/gen/CHAR_noa_sheet.800.webp, assets/img/gen/MASCOT_rimon.800.webp. Size: 1536x1024. No text, letters or numerals anywhere.
```

### In-game: `LAB_v2_twins_play.png`

- **Size:** 1024x1024
- **Shows:** The face of a game card, full-bleed square with no background around it: warm white #FFFAF0 field, a thin warm-gold inset border 5% from the edge, a tiny olive sprig in each corner. The centre 70% is plain and evenly lit (a big Hebrew letter sits on it at about 130 px).
- **Screen:** Behind the letter on each Sound Twins card (.lab-twin background, about 130 px); switched off under high contrast

```
The face of a game card, full-bleed square with no background around it: warm white #FFFAF0 field, a thin warm-gold inset border 5% from the edge, a tiny olive sprig in each corner. The centre 70% is plain and evenly lit (a big Hebrew letter sits on it at about 130 px). House style. No characters. Calm and low in contrast so the Hebrew on top stays easy to read. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Results: `LAB_v2_twins_win.png`

- **Size:** 1024x1024, transparent
- **Shows:** Rimon holding two identical blank cream cards high above his head, one in each hand, grinning, two small gold sound arcs between the cards.
- **Screen:** Results card above the stars (lab.view.js results(), about 180 px)

```
Rimon holding two identical blank cream cards high above his head, one in each hand, grinning, two small gold sound arcs between the cards. House style. Transparent background (PNG with alpha). Attach as reference: assets/img/gen/MASCOT_rimon.800.webp, assets/img/rimon/rimon-sprite.png. Size: 1024x1024. No text, letters or numerals anywhere.
```

## Vowel Rain (`rain`, Speed)

**How it plays:** A syllable falls from the sky; tap its vowel sound (a, e, i, o, u) before it lands. New vowel signs arrive as the level climbs.

### Token: `LAB_v2_rain.png`

- **Size:** 1024x1024
- **Shows:** One cream raindrop with a small gold dot just under it (like a vowel point), two smaller cream drops behind it.
- **Screen:** Brain Lab page: the 56 px round token beside the game (lab.view.js token()), and in Today's Workout (40 px)

```
One cream raindrop with a small gold dot just under it (like a vowel point), two smaller cream drops behind it. TOKEN RECIPE (the same as the ten Brain Lab tokens already drawn; attach LAB_v2_hunt and LAB_v2_switch from data/images/commercial-2026-11-10/ on the commercial images branch so the set matches): one round token centred on paper cream #F6F1E7, filling about 88% of the square; deep green #1E4634 disc, one thin warm-gold ring (no wreath), one simple symbol in gold #D9A441 and warm white #FFFAF0 with thick rounded outlines; no text, no numerals. Must read at 56 px. Attach as reference: assets/img/gen/BADGE_streak-7.800.webp. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Cover: `LAB_v2_rain_cover.png`

- **Size:** 1536x1024
- **Shows:** A light sunny shower over a Jerusalem-stone street: Noa holds a deep-green umbrella and smiles up at falling cream raindrops, each drop with one small gold dot under it; Rimon holds out a small cup to catch a drop. The drops are blank: no marks inside them. Keep every character and the key object inside the band y=128 to y=896 (the app crops it to 2:1).
- **Screen:** Intro card above the game title (lab.view.js intro(), 2:1 crop, full card width)

```
A light sunny shower over a Jerusalem-stone street: Noa holds a deep-green umbrella and smiles up at falling cream raindrops, each drop with one small gold dot under it; Rimon holds out a small cup to catch a drop. The drops are blank: no marks inside them. Keep every character and the key object inside the band y=128 to y=896 (the app crops it to 2:1). House style. Attach as reference: assets/img/gen/CHAR_noa_sheet.800.webp, assets/img/gen/MASCOT_rimon.800.webp. Size: 1536x1024. No text, letters or numerals anywhere.
```

### In-game: `LAB_v2_rain_play.png`

- **Size:** 1024x1536
- **Shows:** Portrait sky backdrop: pale mint-to-cream sky, three soft cream clouds in the top 15%, a low olive-green hill with two small olive trees along the bottom 10%. The middle 75% is plain open sky, evenly lit and low in contrast (syllable drops fall through it).
- **Screen:** Behind the falling drops (.lab-sky background, about 350 x 210 px, cover-fitted); switched off under high contrast

```
Portrait sky backdrop: pale mint-to-cream sky, three soft cream clouds in the top 15%, a low olive-green hill with two small olive trees along the bottom 10%. The middle 75% is plain open sky, evenly lit and low in contrast (syllable drops fall through it). House style. No characters. Calm and low in contrast so the Hebrew on top stays easy to read. Size: 1024x1536. No text, letters or numerals anywhere.
```

### In-game: `LAB_v2_rain_drop.png`

- **Size:** 1024x1024, transparent
- **Shows:** One big friendly raindrop shape, warm white fill, thick deep-green #1E4634 outline, a small gold highlight at the upper left; plain and empty inside (the app writes a Hebrew syllable on it at about 60 px). No face.
- **Screen:** Each falling drop (.lab-drop, about 72 px)

```
One big friendly raindrop shape, warm white fill, thick deep-green #1E4634 outline, a small gold highlight at the upper left; plain and empty inside (the app writes a Hebrew syllable on it at about 60 px). No face. House style. Transparent background (PNG with alpha). Size: 1024x1024. No text, letters or numerals anywhere.
```

### Results: `LAB_v2_rain_win.png`

- **Size:** 1024x1024, transparent
- **Shows:** Rimon holding a small deep-green umbrella and splashing happily in a tiny puddle, a few cream raindrops with gold dots around him.
- **Screen:** Results card above the stars (lab.view.js results(), about 180 px)

```
Rimon holding a small deep-green umbrella and splashing happily in a tiny puddle, a few cream raindrops with gold dots around him. House style. Transparent background (PNG with alpha). Attach as reference: assets/img/gen/MASCOT_rimon.800.webp, assets/img/rimon/rimon-sprite.png. Size: 1024x1024. No text, letters or numerals anywhere.
```

## Middle Letter (`middle`, Attention)

**How it plays:** A row of five (later seven) letters; name only the middle one, even when its neighbours are its look-alikes.

### Token: `LAB_v2_middle.png`

- **Size:** 1024x1024
- **Shows:** Five blank cream tiles in a row; the middle tile is gold and a little raised.
- **Screen:** Brain Lab page: the 56 px round token beside the game (lab.view.js token()), and in Today's Workout (40 px)

```
Five blank cream tiles in a row; the middle tile is gold and a little raised. TOKEN RECIPE (the same as the ten Brain Lab tokens already drawn; attach LAB_v2_hunt and LAB_v2_switch from data/images/commercial-2026-11-10/ on the commercial images branch so the set matches): one round token centred on paper cream #F6F1E7, filling about 88% of the square; deep green #1E4634 disc, one thin warm-gold ring (no wreath), one simple symbol in gold #D9A441 and warm white #FFFAF0 with thick rounded outlines; no text, no numerals. Must read at 56 px. Attach as reference: assets/img/gen/BADGE_streak-7.800.webp. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Cover: `LAB_v2_middle_cover.png`

- **Size:** 1536x1024
- **Shows:** Ari in a cosy bookshop studies a shelf of identical cream book spines with one gold spine exactly in the middle; Rimon stands on a small footstool and points at the gold one. Every spine is blank. Keep every character and the key object inside the band y=128 to y=896 (the app crops it to 2:1).
- **Screen:** Intro card above the game title (lab.view.js intro(), 2:1 crop, full card width)

```
Ari in a cosy bookshop studies a shelf of identical cream book spines with one gold spine exactly in the middle; Rimon stands on a small footstool and points at the gold one. Every spine is blank. Keep every character and the key object inside the band y=128 to y=896 (the app crops it to 2:1). House style. Attach as reference: assets/img/gen/CHAR_ari_sheet.800.webp, assets/img/gen/MASCOT_rimon.800.webp. Size: 1536x1024. No text, letters or numerals anywhere.
```

### Results: `LAB_v2_middle_win.png`

- **Size:** 1024x1024, transparent
- **Shows:** Rimon standing on top of the middle tile of a row of five blank cream tiles, arms raised in a V; the middle tile glows gold.
- **Screen:** Results card above the stars (lab.view.js results(), about 180 px)

```
Rimon standing on top of the middle tile of a row of five blank cream tiles, arms raised in a V; the middle tile glows gold. House style. Transparent background (PNG with alpha). Attach as reference: assets/img/gen/MASCOT_rimon.800.webp, assets/img/rimon/rimon-sprite.png. Size: 1024x1024. No text, letters or numerals anywhere.
```

## Taxi Turns (`taxi`, Flexibility)

**How it plays:** A Hebrew sign says right, left or straight on, and stands on one side of the road. Follow the word or the side, as the rule switches.

### Token: `LAB_v2_taxi.png`

- **Size:** 1024x1024
- **Shows:** A gold road sign on a short post with one thick curved arrow bending to the right.
- **Screen:** Brain Lab page: the 56 px round token beside the game (lab.view.js token()), and in Today's Workout (40 px)

```
A gold road sign on a short post with one thick curved arrow bending to the right. TOKEN RECIPE (the same as the ten Brain Lab tokens already drawn; attach LAB_v2_hunt and LAB_v2_switch from data/images/commercial-2026-11-10/ on the commercial images branch so the set matches): one round token centred on paper cream #F6F1E7, filling about 88% of the square; deep green #1E4634 disc, one thin warm-gold ring (no wreath), one simple symbol in gold #D9A441 and warm white #FFFAF0 with thick rounded outlines; no text, no numerals. Must read at 56 px. Attach as reference: assets/img/gen/BADGE_streak-7.800.webp. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Cover: `LAB_v2_taxi_cover.png`

- **Size:** 1536x1024
- **Shows:** Golden hour on a Tel Aviv street with low white buildings and palm trees: a warm-gold taxi seen from behind at a junction; Ari leans out of the back window pointing right, Noa on the pavement points left and laughs; Rimon sits on the taxi roof, holding on to its blank roof sign. Every street sign is blank. Keep every character and the key object inside the band y=128 to y=896 (the app crops it to 2:1).
- **Screen:** Intro card above the game title (lab.view.js intro(), 2:1 crop, full card width)

```
Golden hour on a Tel Aviv street with low white buildings and palm trees: a warm-gold taxi seen from behind at a junction; Ari leans out of the back window pointing right, Noa on the pavement points left and laughs; Rimon sits on the taxi roof, holding on to its blank roof sign. Every street sign is blank. Keep every character and the key object inside the band y=128 to y=896 (the app crops it to 2:1). House style. Attach as reference: assets/img/gen/CHAR_ari_sheet.800.webp, assets/img/gen/CHAR_noa_sheet.800.webp, assets/img/gen/MASCOT_rimon.800.webp. Size: 1536x1024. No text, letters or numerals anywhere.
```

### In-game: `LAB_v2_taxi_play.png`

- **Size:** 1024x1536
- **Shows:** Driver's-eye view of a straight three-lane road going ahead in perspective: charcoal asphalt, cream lane lines, low white buildings and palm trees at the far left and right edges only, soft evening sky in the top 15%. The road in the middle 70% is plain and calm (a sign with a Hebrew word and a small taxi sit on it).
- **Screen:** Behind the road board (.lab-road background, about 380 x 180 px); switched off under high contrast

```
Driver's-eye view of a straight three-lane road going ahead in perspective: charcoal asphalt, cream lane lines, low white buildings and palm trees at the far left and right edges only, soft evening sky in the top 15%. The road in the middle 70% is plain and calm (a sign with a Hebrew word and a small taxi sit on it). House style. No characters. Calm and low in contrast so the Hebrew on top stays easy to read. Size: 1024x1536. No text, letters or numerals anywhere.
```

### In-game: `LAB_v2_taxi_cab.png`

- **Size:** 1024x1024, transparent
- **Shows:** A friendly small taxi seen straight from behind: warm gold #E9C46A body, deep-green rear window, a blank cream roof sign, two small red tail lights; simple and bold so it reads at 48 px. No people, no plate numbers.
- **Screen:** The taxi that moves left, right or ahead after each answer (.lab-cab, about 48 px)

```
A friendly small taxi seen straight from behind: warm gold #E9C46A body, deep-green rear window, a blank cream roof sign, two small red tail lights; simple and bold so it reads at 48 px. No people, no plate numbers. House style. Transparent background (PNG with alpha). Size: 1024x1024. No text, letters or numerals anywhere.
```

### Results: `LAB_v2_taxi_win.png`

- **Size:** 1024x1024, transparent
- **Shows:** Rimon driving a small warm-gold taxi seen from the front at three-quarters, waving one hand out of the window, the roof sign blank.
- **Screen:** Results card above the stars (lab.view.js results(), about 180 px)

```
Rimon driving a small warm-gold taxi seen from the front at three-quarters, waving one hand out of the window, the roof sign blank. House style. Transparent background (PNG with alpha). Attach as reference: assets/img/gen/MASCOT_rimon.800.webp, assets/img/rimon/rimon-sprite.png. Size: 1024x1024. No text, letters or numerals anywhere.
```

## Café Order (`cafe`, Memory)

**How it plays:** Noa or Ari orders food and drink in Hebrew; remember the order and bring it from the menu in the same order.

### Token: `LAB_v2_cafe.png`

- **Size:** 1024x1024
- **Shows:** A cream coffee cup on a gold saucer with a small olive sprig beside it.
- **Screen:** Brain Lab page: the 56 px round token beside the game (lab.view.js token()), and in Today's Workout (40 px)

```
A cream coffee cup on a gold saucer with a small olive sprig beside it. TOKEN RECIPE (the same as the ten Brain Lab tokens already drawn; attach LAB_v2_hunt and LAB_v2_switch from data/images/commercial-2026-11-10/ on the commercial images branch so the set matches): one round token centred on paper cream #F6F1E7, filling about 88% of the square; deep green #1E4634 disc, one thin warm-gold ring (no wreath), one simple symbol in gold #D9A441 and warm white #FFFAF0 with thick rounded outlines; no text, no numerals. Must read at 56 px. Attach as reference: assets/img/gen/BADGE_streak-7.800.webp. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Cover: `LAB_v2_cafe_cover.png`

- **Size:** 1536x1024
- **Shows:** A sunny Tel Aviv street café: Noa at the counter ordering with a friendly open-hand gesture, Ari behind the counter in a deep-green apron holding a blank notepad, Rimon carrying a small tray with a coffee cup and a pita. A blank chalkboard menu on the wall. Keep every character and the key object inside the band y=128 to y=896 (the app crops it to 2:1).
- **Screen:** Intro card above the game title (lab.view.js intro(), 2:1 crop, full card width)

```
A sunny Tel Aviv street café: Noa at the counter ordering with a friendly open-hand gesture, Ari behind the counter in a deep-green apron holding a blank notepad, Rimon carrying a small tray with a coffee cup and a pita. A blank chalkboard menu on the wall. Keep every character and the key object inside the band y=128 to y=896 (the app crops it to 2:1). House style. Attach as reference: assets/img/gen/CHAR_ari_sheet.800.webp, assets/img/gen/CHAR_noa_sheet.800.webp, assets/img/gen/MASCOT_rimon.800.webp. Size: 1536x1024. No text, letters or numerals anywhere.
```

### In-game: `LAB_v2_cafe_play.png`

- **Size:** 1536x1024
- **Shows:** A café counter seen from the customer's side: warm olive-wood counter top across the bottom 20%, a blank cream chalkboard frame along the very top, a potted olive plant at the far left and a glass jar of biscuits at the far right. The middle is a plain warm-cream wall, evenly lit (the order card and the menu sit on it).
- **Screen:** Behind the order card and menu (.lab-cafe background, about 360 x 300 px); switched off under high contrast

```
A café counter seen from the customer's side: warm olive-wood counter top across the bottom 20%, a blank cream chalkboard frame along the very top, a potted olive plant at the far left and a glass jar of biscuits at the far right. The middle is a plain warm-cream wall, evenly lit (the order card and the menu sit on it). House style. No characters. Calm and low in contrast so the Hebrew on top stays easy to read. Size: 1536x1024. No text, letters or numerals anywhere.
```

### Results: `LAB_v2_cafe_win.png`

- **Size:** 1024x1024, transparent
- **Shows:** Rimon as a proud waiter: a small deep-green apron below his navy scarf (the scarf stays fully visible), holding up a tray with a coffee cup, a glass of water and a pita, big smile.
- **Screen:** Results card above the stars (lab.view.js results(), about 180 px)

```
Rimon as a proud waiter: a small deep-green apron below his navy scarf (the scarf stays fully visible), holding up a tray with a coffee cup, a glass of water and a pita, big smile. House style. Transparent background (PNG with alpha). Attach as reference: assets/img/gen/MASCOT_rimon.800.webp, assets/img/rimon/rimon-sprite.png. Size: 1024x1024. No text, letters or numerals anywhere.
```

## Prayer Chain (`chain`, Memory)

**How it plays:** A blessing or prayer starts; tap its next words in order. The divine name is filled in for the learner and is never a choice.

### Token: `LAB_v2_chain.png`

- **Size:** 1024x1024
- **Shows:** Three linked gold chain links in a row, slightly curved.
- **Screen:** Brain Lab page: the 56 px round token beside the game (lab.view.js token()), and in Today's Workout (40 px)

```
Three linked gold chain links in a row, slightly curved. TOKEN RECIPE (the same as the ten Brain Lab tokens already drawn; attach LAB_v2_hunt and LAB_v2_switch from data/images/commercial-2026-11-10/ on the commercial images branch so the set matches): one round token centred on paper cream #F6F1E7, filling about 88% of the square; deep green #1E4634 disc, one thin warm-gold ring (no wreath), one simple symbol in gold #D9A441 and warm white #FFFAF0 with thick rounded outlines; no text, no numerals. Must read at 56 px. Attach as reference: assets/img/gen/BADGE_streak-7.800.webp. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Cover: `LAB_v2_chain_cover.png`

- **Size:** 1536x1024
- **Shows:** Inside a warm, simple synagogue with tall windows and soft light (no Torah scroll, no ark curtain with writing, nothing written anywhere): Ari in his synagogue look and Noa stand side by side holding closed deep-green prayer books; above them a gently curving chain of small blank cream tiles joined by gold links floats in the light; Rimon at the front looks up at it with a calm smile. Keep every character and the key object inside the band y=128 to y=896 (the app crops it to 2:1).
- **Screen:** Intro card above the game title (lab.view.js intro(), 2:1 crop, full card width)

```
Inside a warm, simple synagogue with tall windows and soft light (no Torah scroll, no ark curtain with writing, nothing written anywhere): Ari in his synagogue look and Noa stand side by side holding closed deep-green prayer books; above them a gently curving chain of small blank cream tiles joined by gold links floats in the light; Rimon at the front looks up at it with a calm smile. Keep every character and the key object inside the band y=128 to y=896 (the app crops it to 2:1). House style. Attach as reference: assets/img/gen/CHAR_ari_synagogue.800.webp, assets/img/gen/CHAR_noa_synagogue.800.webp, assets/img/gen/MASCOT_rimon.800.webp. Size: 1536x1024. No text, letters or numerals anywhere.
```

### Results: `LAB_v2_chain_win.png`

- **Size:** 1024x1024, transparent
- **Shows:** Rimon hugging a closed deep-green prayer book with gold-edged pages (cover blank), eyes in happy arcs, a short chain of three gold links curling beside him.
- **Screen:** Results card above the stars (lab.view.js results(), about 180 px)

```
Rimon hugging a closed deep-green prayer book with gold-edged pages (cover blank), eyes in happy arcs, a short chain of three gold links curling beside him. House style. Transparent background (PNG with alpha). Attach as reference: assets/img/gen/MASCOT_rimon.800.webp, assets/img/rimon/rimon-sprite.png. Size: 1024x1024. No text, letters or numerals anywhere.
```

## Café Order menu pictures (`cafe-menu`)

**How it plays:** The menu tiles show the English word; a picture helps beginners find it fast. Twelve café words already have a picture ordered in Block J (J-0961 tea and others); these are the other seventeen.

### Menu: `LAB_v2_menu_water.png`

- **Size:** 1024x1024
- **Shows:** A single picture of a clear glass of cold water.
- **Screen:** Café Order menu tile for "water" (lab.games2.js, about 56 px; dictionary word p7f7d7b8f)

```
A single picture of a clear glass of cold water. WORD PICTURE RECIPE (the same as the Block J vocabulary pictures, docs/images/BLOCK-J.md): STYLE GUIDE v1: flat vector illustration, thick rounded outlines, soft paper-cream background (#F6F1E7), palette of deep sea blue (#1F3A5F), pomegranate red (#B0373B), olive green (#6B7F3A), warm gold (#D9A441) and charcoal (#2B2B2B); no gradients, no photoreal; every object centred with 10% margin; consistent 3/4 top-down light from upper left. One clear, instantly recognisable object centred on the plain background, nothing else competing. Square 1:1. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Menu: `LAB_v2_menu_coffee.png`

- **Size:** 1024x1024
- **Shows:** A single picture of a cup of coffee on a saucer.
- **Screen:** Café Order menu tile for "coffee" (lab.games2.js, about 56 px; dictionary word h06440deb)

```
A single picture of a cup of coffee on a saucer. WORD PICTURE RECIPE (the same as the Block J vocabulary pictures, docs/images/BLOCK-J.md): STYLE GUIDE v1: flat vector illustration, thick rounded outlines, soft paper-cream background (#F6F1E7), palette of deep sea blue (#1F3A5F), pomegranate red (#B0373B), olive green (#6B7F3A), warm gold (#D9A441) and charcoal (#2B2B2B); no gradients, no photoreal; every object centred with 10% margin; consistent 3/4 top-down light from upper left. One clear, instantly recognisable object centred on the plain background, nothing else competing. Square 1:1. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Menu: `LAB_v2_menu_falafel.png`

- **Size:** 1024x1024
- **Shows:** A single picture of a few golden falafel balls on a small plate.
- **Screen:** Café Order menu tile for "falafel" (lab.games2.js, about 56 px; dictionary word pa04b1f3c)

```
A single picture of a few golden falafel balls on a small plate. WORD PICTURE RECIPE (the same as the Block J vocabulary pictures, docs/images/BLOCK-J.md): STYLE GUIDE v1: flat vector illustration, thick rounded outlines, soft paper-cream background (#F6F1E7), palette of deep sea blue (#1F3A5F), pomegranate red (#B0373B), olive green (#6B7F3A), warm gold (#D9A441) and charcoal (#2B2B2B); no gradients, no photoreal; every object centred with 10% margin; consistent 3/4 top-down light from upper left. One clear, instantly recognisable object centred on the plain background, nothing else competing. Square 1:1. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Menu: `LAB_v2_menu_pita-bread.png`

- **Size:** 1024x1024
- **Shows:** A single picture of one round pita bread.
- **Screen:** Café Order menu tile for "pita bread" (lab.games2.js, about 56 px; dictionary word pf8630913)

```
A single picture of one round pita bread. WORD PICTURE RECIPE (the same as the Block J vocabulary pictures, docs/images/BLOCK-J.md): STYLE GUIDE v1: flat vector illustration, thick rounded outlines, soft paper-cream background (#F6F1E7), palette of deep sea blue (#1F3A5F), pomegranate red (#B0373B), olive green (#6B7F3A), warm gold (#D9A441) and charcoal (#2B2B2B); no gradients, no photoreal; every object centred with 10% margin; consistent 3/4 top-down light from upper left. One clear, instantly recognisable object centred on the plain background, nothing else competing. Square 1:1. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Menu: `LAB_v2_menu_salad.png`

- **Size:** 1024x1024
- **Shows:** A single picture of a bowl of chopped Israeli salad (tomato and cucumber).
- **Screen:** Café Order menu tile for "salad" (lab.games2.js, about 56 px; dictionary word p5e953ba9)

```
A single picture of a bowl of chopped Israeli salad (tomato and cucumber). WORD PICTURE RECIPE (the same as the Block J vocabulary pictures, docs/images/BLOCK-J.md): STYLE GUIDE v1: flat vector illustration, thick rounded outlines, soft paper-cream background (#F6F1E7), palette of deep sea blue (#1F3A5F), pomegranate red (#B0373B), olive green (#6B7F3A), warm gold (#D9A441) and charcoal (#2B2B2B); no gradients, no photoreal; every object centred with 10% margin; consistent 3/4 top-down light from upper left. One clear, instantly recognisable object centred on the plain background, nothing else competing. Square 1:1. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Menu: `LAB_v2_menu_shakshuka.png`

- **Size:** 1024x1024
- **Shows:** A single picture of a small pan of shakshuka: eggs in tomato sauce.
- **Screen:** Café Order menu tile for "shakshuka" (lab.games2.js, about 56 px; dictionary word p43836f09)

```
A single picture of a small pan of shakshuka: eggs in tomato sauce. WORD PICTURE RECIPE (the same as the Block J vocabulary pictures, docs/images/BLOCK-J.md): STYLE GUIDE v1: flat vector illustration, thick rounded outlines, soft paper-cream background (#F6F1E7), palette of deep sea blue (#1F3A5F), pomegranate red (#B0373B), olive green (#6B7F3A), warm gold (#D9A441) and charcoal (#2B2B2B); no gradients, no photoreal; every object centred with 10% margin; consistent 3/4 top-down light from upper left. One clear, instantly recognisable object centred on the plain background, nothing else competing. Square 1:1. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Menu: `LAB_v2_menu_espresso.png`

- **Size:** 1024x1024
- **Shows:** A single picture of a tiny espresso cup on a saucer.
- **Screen:** Café Order menu tile for "espresso" (lab.games2.js, about 56 px; dictionary word p6296527a)

```
A single picture of a tiny espresso cup on a saucer. WORD PICTURE RECIPE (the same as the Block J vocabulary pictures, docs/images/BLOCK-J.md): STYLE GUIDE v1: flat vector illustration, thick rounded outlines, soft paper-cream background (#F6F1E7), palette of deep sea blue (#1F3A5F), pomegranate red (#B0373B), olive green (#6B7F3A), warm gold (#D9A441) and charcoal (#2B2B2B); no gradients, no photoreal; every object centred with 10% margin; consistent 3/4 top-down light from upper left. One clear, instantly recognisable object centred on the plain background, nothing else competing. Square 1:1. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Menu: `LAB_v2_menu_latte-style-milky-coffee.png`

- **Size:** 1024x1024
- **Shows:** A single picture of a tall glass of milky coffee with foam on top (hafuch).
- **Screen:** Café Order menu tile for "latte-style milky coffee" (lab.games2.js, about 56 px; dictionary word p80064ddc)

```
A single picture of a tall glass of milky coffee with foam on top (hafuch). WORD PICTURE RECIPE (the same as the Block J vocabulary pictures, docs/images/BLOCK-J.md): STYLE GUIDE v1: flat vector illustration, thick rounded outlines, soft paper-cream background (#F6F1E7), palette of deep sea blue (#1F3A5F), pomegranate red (#B0373B), olive green (#6B7F3A), warm gold (#D9A441) and charcoal (#2B2B2B); no gradients, no photoreal; every object centred with 10% margin; consistent 3/4 top-down light from upper left. One clear, instantly recognisable object centred on the plain background, nothing else competing. Square 1:1. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Menu: `LAB_v2_menu_soup.png`

- **Size:** 1024x1024
- **Shows:** A single picture of a bowl of hot soup.
- **Screen:** Café Order menu tile for "soup" (lab.games2.js, about 56 px; dictionary word h1efbc546)

```
A single picture of a bowl of hot soup. WORD PICTURE RECIPE (the same as the Block J vocabulary pictures, docs/images/BLOCK-J.md): STYLE GUIDE v1: flat vector illustration, thick rounded outlines, soft paper-cream background (#F6F1E7), palette of deep sea blue (#1F3A5F), pomegranate red (#B0373B), olive green (#6B7F3A), warm gold (#D9A441) and charcoal (#2B2B2B); no gradients, no photoreal; every object centred with 10% margin; consistent 3/4 top-down light from upper left. One clear, instantly recognisable object centred on the plain background, nothing else competing. Square 1:1. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Menu: `LAB_v2_menu_orange.png`

- **Size:** 1024x1024
- **Shows:** A single picture of one whole orange (the fruit) with a leaf.
- **Screen:** Café Order menu tile for "orange" (lab.games2.js, about 56 px; dictionary word hec23eb47)

```
A single picture of one whole orange (the fruit) with a leaf. WORD PICTURE RECIPE (the same as the Block J vocabulary pictures, docs/images/BLOCK-J.md): STYLE GUIDE v1: flat vector illustration, thick rounded outlines, soft paper-cream background (#F6F1E7), palette of deep sea blue (#1F3A5F), pomegranate red (#B0373B), olive green (#6B7F3A), warm gold (#D9A441) and charcoal (#2B2B2B); no gradients, no photoreal; every object centred with 10% margin; consistent 3/4 top-down light from upper left. One clear, instantly recognisable object centred on the plain background, nothing else competing. Square 1:1. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Menu: `LAB_v2_menu_black-coffee.png`

- **Size:** 1024x1024
- **Shows:** A single picture of a cup of black coffee, no milk.
- **Screen:** Café Order menu tile for "black coffee" (lab.games2.js, about 56 px; dictionary word pce477866)

```
A single picture of a cup of black coffee, no milk. WORD PICTURE RECIPE (the same as the Block J vocabulary pictures, docs/images/BLOCK-J.md): STYLE GUIDE v1: flat vector illustration, thick rounded outlines, soft paper-cream background (#F6F1E7), palette of deep sea blue (#1F3A5F), pomegranate red (#B0373B), olive green (#6B7F3A), warm gold (#D9A441) and charcoal (#2B2B2B); no gradients, no photoreal; every object centred with 10% margin; consistent 3/4 top-down light from upper left. One clear, instantly recognisable object centred on the plain background, nothing else competing. Square 1:1. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Menu: `LAB_v2_menu_coffee-with-milk.png`

- **Size:** 1024x1024
- **Shows:** A single picture of a cup of coffee with a small milk jug beside it.
- **Screen:** Café Order menu tile for "coffee with milk" (lab.games2.js, about 56 px; dictionary word p7ec62c43)

```
A single picture of a cup of coffee with a small milk jug beside it. WORD PICTURE RECIPE (the same as the Block J vocabulary pictures, docs/images/BLOCK-J.md): STYLE GUIDE v1: flat vector illustration, thick rounded outlines, soft paper-cream background (#F6F1E7), palette of deep sea blue (#1F3A5F), pomegranate red (#B0373B), olive green (#6B7F3A), warm gold (#D9A441) and charcoal (#2B2B2B); no gradients, no photoreal; every object centred with 10% margin; consistent 3/4 top-down light from upper left. One clear, instantly recognisable object centred on the plain background, nothing else competing. Square 1:1. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Menu: `LAB_v2_menu_tea-with-mint.png`

- **Size:** 1024x1024
- **Shows:** A single picture of a glass of tea with fresh mint leaves in it.
- **Screen:** Café Order menu tile for "tea with mint" (lab.games2.js, about 56 px; dictionary word p2de095da)

```
A single picture of a glass of tea with fresh mint leaves in it. WORD PICTURE RECIPE (the same as the Block J vocabulary pictures, docs/images/BLOCK-J.md): STYLE GUIDE v1: flat vector illustration, thick rounded outlines, soft paper-cream background (#F6F1E7), palette of deep sea blue (#1F3A5F), pomegranate red (#B0373B), olive green (#6B7F3A), warm gold (#D9A441) and charcoal (#2B2B2B); no gradients, no photoreal; every object centred with 10% margin; consistent 3/4 top-down light from upper left. One clear, instantly recognisable object centred on the plain background, nothing else competing. Square 1:1. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Menu: `LAB_v2_menu_sugar.png`

- **Size:** 1024x1024
- **Shows:** A single picture of a small sugar bowl with a spoon.
- **Screen:** Café Order menu tile for "sugar" (lab.games2.js, about 56 px; dictionary word h7631737e)

```
A single picture of a small sugar bowl with a spoon. WORD PICTURE RECIPE (the same as the Block J vocabulary pictures, docs/images/BLOCK-J.md): STYLE GUIDE v1: flat vector illustration, thick rounded outlines, soft paper-cream background (#F6F1E7), palette of deep sea blue (#1F3A5F), pomegranate red (#B0373B), olive green (#6B7F3A), warm gold (#D9A441) and charcoal (#2B2B2B); no gradients, no photoreal; every object centred with 10% margin; consistent 3/4 top-down light from upper left. One clear, instantly recognisable object centred on the plain background, nothing else competing. Square 1:1. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Menu: `LAB_v2_menu_cheese.png`

- **Size:** 1024x1024
- **Shows:** A single picture of a wedge of yellow cheese.
- **Screen:** Café Order menu tile for "cheese" (lab.games2.js, about 56 px; dictionary word h4ef6ec03)

```
A single picture of a wedge of yellow cheese. WORD PICTURE RECIPE (the same as the Block J vocabulary pictures, docs/images/BLOCK-J.md): STYLE GUIDE v1: flat vector illustration, thick rounded outlines, soft paper-cream background (#F6F1E7), palette of deep sea blue (#1F3A5F), pomegranate red (#B0373B), olive green (#6B7F3A), warm gold (#D9A441) and charcoal (#2B2B2B); no gradients, no photoreal; every object centred with 10% margin; consistent 3/4 top-down light from upper left. One clear, instantly recognisable object centred on the plain background, nothing else competing. Square 1:1. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Menu: `LAB_v2_menu_sandwich.png`

- **Size:** 1024x1024
- **Shows:** A single picture of a sandwich cut in half.
- **Screen:** Café Order menu tile for "sandwich" (lab.games2.js, about 56 px; dictionary word h08c16650)

```
A single picture of a sandwich cut in half. WORD PICTURE RECIPE (the same as the Block J vocabulary pictures, docs/images/BLOCK-J.md): STYLE GUIDE v1: flat vector illustration, thick rounded outlines, soft paper-cream background (#F6F1E7), palette of deep sea blue (#1F3A5F), pomegranate red (#B0373B), olive green (#6B7F3A), warm gold (#D9A441) and charcoal (#2B2B2B); no gradients, no photoreal; every object centred with 10% margin; consistent 3/4 top-down light from upper left. One clear, instantly recognisable object centred on the plain background, nothing else competing. Square 1:1. Size: 1024x1024. No text, letters or numerals anywhere.
```

### Menu: `LAB_v2_menu_lemonade.png`

- **Size:** 1024x1024
- **Shows:** A single picture of a glass of lemonade with a lemon slice.
- **Screen:** Café Order menu tile for "lemonade" (lab.games2.js, about 56 px; dictionary word h8417ff6d)

```
A single picture of a glass of lemonade with a lemon slice. WORD PICTURE RECIPE (the same as the Block J vocabulary pictures, docs/images/BLOCK-J.md): STYLE GUIDE v1: flat vector illustration, thick rounded outlines, soft paper-cream background (#F6F1E7), palette of deep sea blue (#1F3A5F), pomegranate red (#B0373B), olive green (#6B7F3A), warm gold (#D9A441) and charcoal (#2B2B2B); no gradients, no photoreal; every object centred with 10% margin; consistent 3/4 top-down light from upper left. One clear, instantly recognisable object centred on the plain background, nothing else competing. Square 1:1. Size: 1024x1024. No text, letters or numerals anywhere.
```

## Rimon in Brain Lab

Brain Lab already tells the companion what is happening. Each moment sends `alef:rimon` with `{ action, moment, game }`; the sprite sheets play the action today, and the stills planned on `feature/rimon-stills-2026-11-10` (146 to 160, Brain Lab) can be mapped to the `moment` without touching Brain Lab:

| Moment (`detail.moment`) | When | Action played today | Still to map |
|---|---|---|---|
| `lab.hub` | Brain Lab page opens | wave | 146 (welcome) or 157 (lab coat) |
| `lab.round` | Memory phase of Letter Matrix and Café Order | thinking | 148 (hand on chin) or 153 (about to flip a card) |
| `lab.levelup` | Every second level reached | bounce | 151 (jump and clap) |
| `lab.results` | Results, new best | highfive | 158 (arms in a V) |
| `lab.results` | Results, two stars or more | wink | 149 (idea lands) |
| `lab.results` | Results, one star or none | nervous | 159 (thumbs-up, play again) |
| `lab.workout-done` | Third game of the day finished | laugh | 158 |

