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
