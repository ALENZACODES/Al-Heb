# Audio ingest: scale check (2026-11-05)

Scope: `tools/record-kit/ingest.mjs` (there is no `tools/audio/ingest.mjs`; the ingest lives in record-kit), `tools/audio/build_manifest.mjs`, `tests/audio.*`, `tests/record-kit.test.js`, `sw.js`, `tools/build-precache.mjs`. Nothing was ingested, no manifest or audio file was changed.

## Dry run against the uploads folder

Command: `node tools/record-kit/ingest.mjs <folder>` (dry run is the default).

| Folder | Content | Result |
|---|---|---|
| `ALEF-THREE-JUDGE-PASSED/` | 88 WAV (+ MP3 copies), `manifest.csv`, `manifest.json`, README. Ids like `il07-w6`, `h00bec4fa`. README: synthetic voice, machine-only checks, zero human approvals | FATAL: no `consent.json`. accepted 0, rejected 0, 88 warnings `manifest.csv lists undefined but the file is absent` |
| `01a1a3a4-...` | empty | FATAL: no `consent.json` |

Findings from that run:
1. The 88 clips are not a record-kit export (files sit under `wav/`, not `audio/<m|f>/<tradition>/<kind>/<id>.<ext>`; the CSV has `id,wav_file,...`, no `path` column). `ingest.mjs` silently skips every file whose name does not start with `audio/` (`if (!f.name.startsWith('audio/')) continue`), so the report says accepted 0 / rejected 0 and never lists the 88 files. The only hint is 88 meaningless warnings.
2. They carry no voice (m/f) or tradition, so they cannot be mapped to manifest paths without a decision.
3. They are synthetic. `--apply` would stamp any accepted clip `status: "recorded"`, `source: "human:record-kit"`. Synthetic clips must go through the synthetic-status path (`tools/tts/manifest_update.mjs`), never through this ingest.

## Current numbers (working tree, measured)

- Manifest: 24,906 entries (core 6,384 + three shards of 6,174), 4,633 unique ids, all `missing`. 0 duplicate paths, 0 case collisions, 0 path/field mismatches.
- Entries per tradition: israeli 9,370, sephardi 7,768, ashkenazi 7,768 (israeli has the israeli-only phrasebook, anchor and israel-track lesson words).
- Core manifest 1,965,563 bytes against the 2 MiB test limit (2,097,152): headroom 131,589 bytes (6%). Shards 1.55 to 1.57 MB each.
- First-install precache: 336 files, 3.885 MiB. Largest file `data/curriculum/lessons.json`, 473,433 bytes. No precached file is over 512 KiB.

## Risks

| # | Risk | Evidence | Severity |
|---|---|---|---|
| 1 | Precache budget already over its own headroom rule. `tests/integration.test.js:278` requires under 3.75 MiB; the tree is 3.89 MiB, and that test fails now (pre-existing, not caused by this change). The 3.95 MiB figure in the brief is not in the repo: the code uses 4 MiB (hard) and 3.75 MiB (headroom). Audio files are excluded from precache (`/\.(mp3|wav|ogg|m4a|...)$/` in `SKIP`), so clips cannot grow it; only manifests and JSON can. | `build-precache.mjs` SKIP; test output | High (red test) |
| 2 | Core manifest grows as clips arrive. Each recorded or synthetic entry gains `source`, and synthetic entries gain a `synth` object; only 131 KB of headroom remains before the existing 2 MiB test fails. `ingest` rewrites shards with `JSON.stringify(list, null, 1)`, matching build output. Per-entry growth was not measured. Core is on demand, not precached, so this hits the manifest test and first-load time, not the precache budget. | `audio.manifest.test.js:97`; byte counts above | Medium |
| 3 | No 512 KiB per-file limit or 600-clip limit exists in `sw.js`, `build-precache.mjs` or any test. The only per-file cap is `MAX_FILE_BYTES` = 2 MiB (precache). Ingest caps a clip at 30 s; at 64 kbps (`post.mjs`) that is about 240 KB, so a 512 KiB cap would hold, but nothing enforces it. Audio is cache-first into `alef-runtime-v1` with no eviction and no count cap, so a 1,233+ clip batch plus both voices can grow without bound. Range requests bypass the cache (`sw.js`), so players that request ranges are not cached offline. | `sw.js`, `build-precache.mjs:11`, `post.mjs:46` | Medium (limits unenforced) |
| 4 | Silent skip of non-`audio/` files (see dry run). A mis-structured batch of 1,233 files reports nothing wrong. | `ingest.mjs` loop head | High |
| 5 | Tradition label mismatch is only cross-checked when the page `manifest.csv` is present. Without it the check is skipped with a warning. A clip is also accepted if its id is in a recording script CSV even with no manifest entry (`scriptIds` fallback), so a wrong-tradition label on a script word passes with a warning only. Manifest-hit paths are safe: the tradition is part of the key. | `ingest.mjs` `scriptIds`, `row.tradition` check | Medium |
| 6 | Duplicate handling is order-dependent: `a.wav` and `a.flac` map to the same `.mp3` path; the first read wins, the second is rejected. Across manifest files, `entry` is a `Map` on path, so a repeated path would silently shadow one entry. Currently 0 duplicates (new guard test covers this). | `ingest.mjs` `seen`, `entry` | Low |
| 7 | Duplicate ids with different text in `build_manifest`: first text wins and only a warning is printed; no test fails on `warnings`. Lesson hash ids use 8 hex chars (32 bits), negligible at this size. | `build_manifest.mjs` `add()` | Low |
| 8 | Memory and speed: the whole zip or folder is read into memory (`readExport`), accepted clips keep their `data` buffers, and each clip spawns one `ffmpeg` decode synchronously. 1,233 clips is fine; several thousand large WAVs is not. Same-text copy search is O(accepted x 24,906), about 30 million comparisons at 1,233. | `ingest.mjs` | Low |
| 9 | Non-atomic apply: MP3s and sidecars are copied, then manifests are written at the end with `writeFileSync`. A crash in between leaves files without manifest updates. `build_manifest` rebuilds status from files plus sidecars, so it self-heals, but ingest does not say so. | `applyAll` | Low |
| 10 | Copy inflation: one recording fills every same-text `lesson-word`/`vocab-*` id (`copyOf`). Recorded counts can exceed the number of distinct human recordings; report distinct recordings separately. | `ingest.mjs` COPY_GROUPS | Low |
| 11 | Report truncation: only 40 warnings and 20 plan lines are printed, so at scale the dry run hides most of its own detail. Use `--report <csv>`. | `formatReport` | Low |

## Added guard

`tests/audio.scale.test.js` (new file, additive): unique manifest paths across core and shards (also case-insensitively), path agrees with voice/tradition/kind/id and the record-kit parser, and ingest still lists all three traditions. No existing test was edited or relaxed.

## Suggested follow-ups (not done)

- Make ingest list ignored files under any prefix, and fail when zero files match the export layout.
- Fix the `undefined` warnings when `manifest.csv` has no `path` column.
- Decide whether 512 KiB per clip and a clip-count cap should be real tests; today they are only assumptions.
- Resolve the failing 3.75 MiB precache headroom test before any further data lands.
