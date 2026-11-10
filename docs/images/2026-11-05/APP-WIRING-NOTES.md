# App wiring notes — images (2026-11-06)

## Data maps
- `data/images/letter-cartoons.json` — 27 meet tiles → `assets/letter-cartoons/…`
- `data/images/speak-candidates.json` — 12 SPEAK scenes → `assets/speak-candidates/…`

## How to show (without approving)
Existing resolver (`src/img/resolve.js`) only returns `assets/img/gen` entries that are in the index + approvals path. These the image generator packs are **outside** that pipeline on purpose:

1. Letter meet screens / letter lectures can load `letter-cartoons.json` paths directly when a draft flag is on.
2. SPEAK / Minute One scene cards can load `speak-candidates.json` only behind a `showSpeakCandidates` (or reuse `showUnapprovedImages`) setting — default off for learners.
3. Do **not** copy into `assets/img/gen` or flip `approvals.json` until John/runbook.

## Screens mapping (Vertex will refine)
| Asset set | Primary screens |
|---|---|
| Letter cartoons | Letters meet, letter lecture splash, Minute One “meet א” |
| SPEAK_01–03,08–10 | Street / Israel SPEAK scenes |
| SPEAK_04–05 | Table / hospitality |
| SPEAK_06–07 | Sanctuary (respectful; no ritual handling) |
| SPEAK_11–12 | Sound card / your-turn UI chrome |

Freeze: no cast regen.
