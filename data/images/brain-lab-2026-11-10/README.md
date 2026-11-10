# Brain Lab artwork, 2026-11-10

These are the 32 Brain Lab scene orders from `docs/images/BRAIN-LAB-ORDERS-2026-11-09.md` (PR #41). They are drawn in the house style: flat vector, charcoal outlines, greens and golds, with no text, letters or numerals in the pixels. Ari, Noa and Rimon follow the official character sheets.

| Kind | Files | Size | Notes |
|---|---|---|---|
| Cover | `LAB_v2_<game>_cover.webp` (10) and `LAB_v2_workout_done.webp` | 1536x1024 | Shown on each drill's intro screen, and in the hub once today's workout is done |
| Board mat | `LAB_v2_<game>_play.webp` (10) | per order | Not used behind the tiles yet. They are kept for a later contrast review |
| Win | `LAB_v2_<game>_win.webp` (10) | 1024x1024, alpha | Shown on the results screen |
| New best | `LAB_v2_new_best.webp` | 1024x1024, alpha | Replaces the win picture when the score is a new best |

Games: hunt, matrix, soundmatch, siddurflash, switch, gematria, countup, numberear, calendar, pattern.

All files are WebP (q82) with the metadata stripped; exiftool finds no EXIF, XMP or IPTC. The pack totals about 1.7 MB. `data/images/` is left out of the install precache, so the pictures load online. On an offline device a picture simply removes itself (see `src/lab/lab.art.js`). Every picture is decorative, with empty alt text and `aria-hidden`.

Contact sheets: `docs/images/brain-lab-contact-{covers,play,wins}.jpg`.

## Second pass, 2026-11-10
- `LAB_v2_switch_play_r2.webp` is a true 1024x1536 card frame. The first version was stretched; the corner sprigs are now kept at their drawn proportions. `LAB_v2_calendar_cover_r2.webp` has a house-green evening sky instead of blue. The code uses the r2 files. The first versions stay on disk.
- The board mats are now in use (`applyMat` in `src/lab/lab.art.js`):
  - Hunt, Siddur Flash, Rule Switch, Count Up, Calendar and Pattern show their mat behind the board.
  - Letter Matrix uses its picture as the back of a hidden tile.
  - Sound Match, Gematria and Number Ear show their figure under the board.
- Contrast: text never sits on a mat. On a board with a mat, each direct child (the tile grid, the flash card, the rule card, the totals) gets an opaque `#fffaf0` backing, so every letter and number keeps the contrast it has today. A scrim was measured as an alternative: the lightest text colour (`#8a6d1f`) only reached 3.1:1 at an 80% warm-white scrim, below the 4.5:1 AA level, so the backing approach was used instead.
- Fail-safe: a mat is set only after its picture has loaded; on an error nothing changes. Mats are skipped when the device asks to save data and are hidden in forced-colours mode. No picture is in the install precache.
- Contact sheet: `docs/images/brain-lab-contact-r2.jpg`.


## Six new games, 2026-11-10

Cover, board-mat and win pictures for Sound Twins, Vowel Rain, Middle Letter, Taxi Turns, Café Order and Prayer Chain, following `docs/images/BRAIN-LAB-NEW-GAMES-ORDERS-2026-11-10.md`. Covers are 1536x1024. Wins are 1024x1024 with alpha. Play mats keep a calm centre so Hebrew type sits on them. Ari, Noa and Rimon follow the official character sheets. Metadata is stripped. These files stay out of the first-install precache.

Tokens, café menu pictures, `LAB_v2_rain_drop` and `LAB_v2_taxi_cab` are still ordered for the commercial ingest path; the six games work without them (letter tokens and plain boards).
