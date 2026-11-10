# Ingest report: 88-clip machine-checked synthetic snapshot (5 more applied)

Status: synthetic, machine-checked only. Not approved for teaching. No native speaker has listened to any of these clips. The first report, `INGEST-REPORT-83.md`, is unchanged and still applies to its 82 clips.

## Counts

| step | count |
|---|---:|
| clips in the new snapshot (manifest.csv / manifest.json) | 88 |
| already in the repo from the first batch | 82 |
| not in the repo | 6 (5 new ids plus the one held back last time, `hf1da5ea6`) |
| the 6 WAV files copied and sha256-checked against `wav_sha256` | 6 matched, 0 mismatched |
| Hebrew identical to the repo text (NFC, vowel marks, exact) | 6 of 6 |
| dry run ready | 5 |
| applied | 5 |
| still held back | 1 (`hf1da5ea6`) |

Applied ids (all `audio/m/israeli/word/<id>.mp3`, status `synthetic-unreviewed`): `il12-w2` (מָחָר), `hfdbafdf6` (בִּגְלַל), `h9cbc0f35` (יוֹנָה), `h9aaba801` (שׁוֹפֵט), `hf53c9bc7` (כַּמּוּבָן). Source durations 0.84 to 1.76 s, plausible for one pointed word each. Peaks: `hfdbafdf6` at -0.1 dBFS (passed the tool's clipping check; nobody has listened for distortion), the others -2.8 to -5.9 dBFS. The dry run printed no warnings for them. Only these WAVs were copied; the 82 earlier ones were not re-copied, and the MP3 copies were again not used or hash-checked. Total now 87 clips applied.

## Did earlier clips change?

- Compared the new manifest.csv `wav_sha256` with the input hash recorded in each of the 82 existing sidecars (`synth.inputSha256`): 82 of 82 equal, 0 changed. No existing clip was touched.
- All 88 rows read pass / pass / pass, overall "unanimous-machine-pass", human_approved False. No verdict differs. The first batch's original verdict values were not kept in the repo, so "unchanged verdict" is only shown for the all-pass state and the hashes, not row by row against the old file.
- Every one of the 82 earlier ids is still in the new snapshot (none dropped).
- New in the manifest: a `source_scope_adjudication` column (and two review-hash columns). It is filled for five rows (`il12-w2`, `hfdbafdf6`, `h9cbc0f35`, `h9aaba801`, `hf53c9bc7`) with "isolated pointed headword only; original example warning retained". The supplier's wording suggests these clips cover the headword only; the repo uses them as single words, which fits. What the "original example warning" refers to was not explained and could not be checked.

## Still held back

`hf1da5ea6` (אֵשׁ): file size, modified time and length are the same as last time (2.64 s for a two-letter word, the reason it was held back). Its hash from the first batch was not recorded, so "unchanged" is inferred from size and date, not proven. The supplier now lists it as a pass; that does not answer the length concern. Apply it only after a person has listened.

## Voice, tradition and label

Unchanged from the first report: `israeli` only, voice slot `m` only as a layout slot, no claim that the voice is a man, Israeli-accented or a teacher. Same batch label and note. The in-app label wording was not re-checked in a browser for this batch; it comes from the same manifest status as the first 82.

## Checks run

- `build_manifest.mjs --check`: current. `coverage.mjs --write`: synthetic 87, missing 22425; `docs/voices/coverage.md` regenerated (a test failed on the stale file first, then passed).
- `node --test tests/audio*.test.js tests/offline.test.js tests/integration.test.js tests/shell.offline-fixes.test.js tests/tts.soundtext.test.js`: all pass after regenerating coverage.
- `node tools/build-precache.mjs` run once; only the version string in `precache-manifest.js` changed; no audio file is precached.
- `node tools/meta/scan.mjs` and `--text`, plus a manual grep: see the commit step; the perf test was not touched and not run.
- Not checked: any listening, the app in a browser for these clips, the licence (still "unknown: not cleared").

Tool-written detail: `docs/audio/INGEST-REPORT-88-tool.md`.
