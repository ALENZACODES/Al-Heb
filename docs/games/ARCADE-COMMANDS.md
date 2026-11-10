# Arcade: picture run and voice run

Thirty quick games live under `src/games/` (catalogue: `src/games/arcade.catalog.js`). Every picture and every clip they can show or play is optional: a missing file leaves the game fully playable as text. This file is the hand-off for the two production runs. Keep tool and model names out of files, commit messages and branch names; `node tools/meta/scan.mjs --text` must stay green, and commits are authored John Khan.

## Where the files go

| What | Path | Spec |
| --- | --- | --- |
| Game backdrop | `assets/games/arcade/<game>/env.png` (30 games) | PNG, 1600 x 600, no text, metadata stripped |
| Cast sprites (shared) | `assets/games/arcade/cast/<name>.png` (10 files, listed in the CSV) | PNG with transparency, 256 x 256 |
| Letter sprites (optional) | `assets/games/arcade/letters/<letterId>.png` (27 files) | PNG with transparency, 256 x 256 |
| Game voice lines | `audio/<voice>/israeli/games/<game>-NN.mp3` (4 lines x 30 games x 2 voices) | mono 44.1 kHz 96 kbps mp3, no ID3 |
| Law keywords | `audio/<voice>/israeli/games/laws/noah-NN.mp3`, `laws/ten-NN.mp3`, `laws/mitzvah-NN.mp3` (65 x 2 voices) | same |

`<voice>` is `m` (Ari) or `f` (Noa). The exact rows are in `docs/games/arcade-images.csv` (67 pictures) and `docs/games/arcade-voice-lines.csv` (370 clips). Both are written by `node tools/games/arcade-assets.mjs`; edit the catalogue or that script, not the CSVs.

After pushing: `node tools/meta/strip.mjs assets/games/arcade --apply --in-place` (pictures), `node tools/meta/scan.mjs audio/m/israeli/games audio/f/israeli/games` (clips must carry no tags), `node tools/meta/scan.mjs --text`, `npm test`. No manifest needs editing: the games look for the files by path and show them when they exist.

## Master command: pictures

Paste once. Attach the three character sheets from `docs/images` (Ari, Noa, Rimon) with it. Then paste rows from `docs/games/arcade-images.csv` ten at a time.

```
You are illustrating thirty small Hebrew learning games for ADULT beginners inside one app. Everything you
draw must match the app's existing cast and house style exactly.

HOUSE STYLE: flat vector illustration, thick rounded charcoal outlines, soft paper-cream background (#F6F1E7),
palette of deep sea blue (#1F3A5F), pomegranate red (#B0373B), olive green (#6B7F3A), warm gold (#D9A441) and
charcoal (#2B2B2B). No gradients, no photo-realism, no anime, no cartoon sparkle.

CAST (from the attached sheets, keep them identical in every picture):
- Ari: friendly Israeli man around 35, short dark curly hair, trimmed beard, warm brown skin, navy T-shirt,
  simple silver chain; open, encouraging expression; no kippah by default.
- Noa: friendly Israeli woman around 32, shoulder-length wavy dark hair, olive skin, terracotta blouse, small
  gold hoop earrings; warm and confident.
- Rimon: a small round pomegranate-red sprite with a gold crown-shaped calyx on top, two olive-green leaf ears,
  big friendly dot eyes, tiny arms and feet, thick charcoal outline; expressive, never any writing.

RULES FOR EVERY IMAGE:
- NO TEXT: no letters in any alphabet, no numbers, no signs with writing, no logos, no brands. Game tiles,
  cards, bricks and balloons are drawn BLANK; the app prints the Hebrew on them.
- Backdrops (kind = backdrop): 1600 x 600, landscape, the scene described in the row, calm, with the lower
  third quiet so the game board can sit over it. Light from the upper left.
- Sprites (kind = sprite or letter sprite): 256 x 256, transparent background, the character or object alone,
  centred, nothing cut off. Letter sprites are the letter's own shape turned into a chunky friendly tile
  character (two dot eyes near the top) in red or sea blue; the shape must stay a correct, readable Hebrew letter.
- Save each file under the exact path in the row (for example assets/games/arcade/meltdown/env.png). Strip all
  metadata.

Work ten rows at a time, then show me a contact sheet of the ten so I can check that Ari, Noa and Rimon look
the same across them, then wait for "next". Reply "ready" and I will paste the first ten rows.
```

## Master command: voices

Paste once into the voice studio, or hand it with the CSV to a reader. Then paste rows from `docs/games/arcade-voice-lines.csv` one game at a time (8 rows: 4 lines x 2 voices), and the laws rows in three batches.

```
You are recording short Hebrew lines for thirty small learning games and three games about Jewish law,
twice each: once in a man's voice (Ari) and once in a woman's voice (Noa). Modern Israeli Hebrew, standard
pronunciation, warm and unhurried, like a friendly game host. Not childish, not shouted.

LINES PER GAME: 01 the game's Hebrew title; 02 "Bo natchil!" (Let's start!), bright; 03 "Kol ha-kavod!"
(Well done!), warm; 04 "Naseh shuv." (Try again.), kind, never disappointed.

LAW KEYWORDS: read each `hebrew` field exactly as pointed, evenly, as a teacher naming a term. These are
sacred-text terms; no dramatics. If a pointing looks wrong, read what is written and flag the clip_id.

FILE RULES: one file per row; mono, 44.1 kHz, 96 kbps mp3; 0.3 s silence at start and end; peak -3 dBFS;
NO ID3 tags or metadata; file named and placed exactly as `output_path` (audio/m/... for Ari, audio/f/... for Noa).

QUALITY GATE: play every clip against its `hebrew` text before handing back; re-record anything clipped,
mispronounced against the points, or with added words. Return the batch plus the list of flagged clip_ids.

Reply "ready".
```

## What the games do without these files

Everything. Backdrops and sprites are decorative; the cast appears as text labels (Ari, Noa, Rimon) until the sprites arrive. Word and letter clips already come from the main audio library through the shared player; the game lines and law keywords are extras. A clip that does not exist is simply not played, and the status line never claims it was.
