# Antonym Tug-of-War: 600 rounds, and the picture run

The game now has **600 numbered rounds**: 300 opposite pairs, each asked both ways (A → B, then B → A). Rounds 1-100 are level 1, 101-200 level 2, up to 501-600 level 6. Levels 1-3 are everyday opposites; levels 4-6 add harder words, then the feminine (f.), plural (pl.) and feminine-plural (f. pl.) forms, so the learner has to match the ending as well as the meaning.

A learner can start anywhere: type a round number and press Go, tap a level button (L1-L6), or press Surprise me. A game is 10 rounds from that start; the results card offers "Next 10 rounds", and the next start is remembered on the device (`games.tugowar.next.v1`).

| File | What it is |
| --- | --- |
| `tools/games/tugowar-bank.psv` | The 300 pairs. Edit this one (Hebrew, transliteration, English, picture scene). |
| `tools/games/build-tugowar.mjs` | Run after editing the bank. Writes the three files below. `--check` fails if they are out of date. |
| `src/games/tugowar.bank.js` | Generated bank the game reads. |
| `docs/games/tugowar-images.csv` | Pair-picture filenames and original scenes (201 completed pictures). |
| `docs/games/tugowar-image-batches.md` | The same 201 pictures as 21 ready-to-paste batches of ten. |

## Where the pictures go

| What | Path | Spec |
| --- | --- | --- |
| Pair picture | `assets/games/tugowar/pairs/TUG_<key>.png` (201 files) | PNG, 1024 x 1024, no text, metadata stripped |

All 201 new pair pictures are present in the repo. Another 24 pairs use the approved Opposites pictures (packs I and II and the gap fills), and the gendered and plural forms reuse their base pair's picture. Nothing needs registering: the game loads each picture by its path. The prompts below are retained as an art reference.

## Master command: pictures

Paste once, and attach the three character sheets from `docs/images` (Ari, Noa, Rimon). Then paste the batches from `docs/games/tugowar-image-batches.md` one at a time.

```
You are illustrating opposite-word picture cards for a Hebrew learning game for ADULT beginners. Every card shows
ONE pair of opposites: the LEFT half shows the first word, the RIGHT half shows its opposite, split by a thin
soft vertical gap. Both halves use the same viewpoint, scale and light so the difference is the only thing that
changes and it reads in one second.

HOUSE STYLE: flat vector illustration, thick rounded charcoal outlines, soft paper-cream background (#F6F1E7),
palette of deep sea blue (#1F3A5F), pomegranate red (#B0373B), olive green (#6B7F3A), warm gold (#D9A441) and
charcoal (#2B2B2B). No gradients, no photo-realism, no anime, no cartoon sparkle.

CAST (keep them identical to the attached sheets whenever they appear):
- Ari: friendly Israeli man around 35, short dark curly hair, trimmed beard, warm brown skin, navy T-shirt,
  simple silver chain; no kippah by default.
- Noa: friendly Israeli woman around 32, shoulder-length wavy dark hair, olive skin, terracotta blouse, small
  gold hoop earrings.
- Rimon: a small round pomegranate-red sprite with a gold crown-shaped calyx, two olive-green leaf ears, big dot
  eyes, tiny arms and feet, thick charcoal outline.

RULES FOR EVERY IMAGE:
- NO TEXT: no letters in any alphabet, no numbers, no signs with writing, no logos, no brands, no arrows with words.
  Books, screens, papers and calendars are blank.
- Square 1024 x 1024. Main subject of each half centred with a comfortable margin. Nothing important cut off.
- Adults are dressed modestly; nothing frightening, gory or mocking. Religious objects are drawn respectfully.
- Give me each image as its own file named EXACTLY as listed (for example TUG_good_bad.png).

Reply "ready" and wait for the first batch.
```

If the files download with random names, rename each one to the name in the batch, in the order you made them, before pushing.

## After pushing the pictures

```
node tools/meta/strip.mjs assets/games/tugowar --apply --in-place
node tools/meta/scan.mjs --text
npm test
```

## Sound

131 of the 600 words already have a recorded clip (vocabulary word clips under `audio/<m|f>/israeli/word/`); the 🔊 button plays it. Every other word falls back to the device's Hebrew voice until a clip exists for its vocabulary entry.
