# 3D Studio Brain Lab — graphics needed

Branch: `feature/brain-lab-games-2026-11-10`. The gold Aleph is the logo. Rimon is the mascot only (never the app icon). Pictures are decorative, loaded lazily from `data/images/brain-lab-studio-2026-11-10/`, and must stay out of the first-install precache (`data/images/` is already on-demand). If a file is missing the game still plays, with CSS 3D tiles as the fallback.

Sister lane `feature/brain-lab-graphics-2026-11-10` may supply final art. Until then, use these orders. Style for every picture: soft-lit glossy 3D props, Hebrew letters as rounded 3D tiles or blocks, clear depth, soft contact shadows, no heavy clutter, no logos other than a small gold Aleph mark if a logo is needed, no Rimon unless the pose is strictly on-model (round red pomegranate body, gold crown, leaf ears, blue sash). Palette: deep green `#16301C`, gold `#D4A647`, cream `#FFFAF0`, warm wood `#C9A24A`.

Do not invent Hebrew words in the pictures. Use only letters, or words that already exist in the app’s lists, or no writing at all. Never show the four-letter divine name. Gender-neutral presentation. No tool or model names on the art.

Save as WebP, strip all metadata, keep each file under about 80 KB, and name them exactly as below.

## Shared

| file | size | shot |
| --- | --- | --- |
| `LAB_v3_new_best.webp` | 1024×1024 | A glossy gold 3D star bursting over a deep-green desk, cream spark particles, a small gold Aleph tile in the corner. “New best” celebration, no text. |
| `LAB_v3_studio_hero.webp` | 1536×1024 | A 3D laboratory table in the ALEF palette with ten small glossy game props (bursting word tile, flock of gold birds, gold stars, root blocks, letter path, falling vowel drops). |

## Per game (cover 1536×1024, play 1536×1024 board mat, win 1024×1024)

Cover: 3:2 product shot of the toy. Play: an empty board mat the tiles can sit on (optional; the games already draw CSS 3D tiles). Win: a tight celebration of the same prop.

1. **Word Burst** (`wordburst`) — A field of creamy 3D Hebrew word tiles on a green table; one tile has just burst into gold particles and glossy shards.
2. **Migration Birds** (`migration`) — A flock of soft-lit 3D gold-and-cream birds flying left to right across a deep-green sky; each bird carries a raised 3D Hebrew numeral tile; one bird is clearly larger, higher in the frame.
3. **Star Search** (`starsearch`) — A grid of glossy 3D gold stars, each with a raised letter tile; one star has a different number of points and sits slightly closer to the camera.
4. **Root Forge** (`rootforge`) — Three large 3D root-letter blocks at the back, and in front a row of smaller letter cubes being stacked into a word. Anvil or workbench in green and gold, no text beyond letters.
5. **Letter Sequence** (`letterseq`) — A rising 3D staircase of letter tiles in alef-bet order, the last step an empty gold frame waiting for the next letter.
6. **Speed Match** (`speedmatch`) — Two large 3D letter tiles mid-flip, one facing us, one turning, on a glossy green desk, motion implied with soft blur (still image).
7. **Letter Span** (`letterspan`) — A row of 3D letter tiles lighting up in order, then dimming, like a memory piano in cream and gold.
8. **Vowel Rain** (`vowelrain`) — Glossy 3D syllable drops falling through a deep-green night, gold rims, soft reflections on a cream table below.
9. **Tile Turn** (`tileturn`) — A single thick 3D letter cube turned in space (about 90–180°), sharp highlights, four small upright choice tiles in the distance.
10. **Path Word** (`pathword`) — A 4×4 board of thick 3D letter cubes; a glowing gold path snakes through neighbouring tiles.

Rimon, if used on a win still only: on-model, bursting in to cheer, no gendered styling, never replacing the gold Aleph logo.
