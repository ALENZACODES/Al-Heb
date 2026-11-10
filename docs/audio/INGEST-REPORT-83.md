# Ingest report: 83-clip machine-checked synthetic batch (82 applied)

Status: synthetic, machine-checked only. Not approved for teaching. No native speaker has listened to any of these clips.

## Counts

| step | count |
|---|---:|
| clips in the supplied snapshot (manifest.csv, WAV files) | 83 |
| WAV files copied and sha256-checked against manifest.csv (`wav_sha256`) | 83 matched, 0 mismatched, 0 missing |
| ids found in the repo audio manifest (`m` / `israeli` / `word`) | 83 of 83 |
| Hebrew text identical to the repo text (NFC, with vowel marks, exact) | 83 of 83 (0 differ) |
| dry run: ready | 83 |
| applied (written to `audio/` with sidecars) | 82 |
| skipped | 1 |

Hash check covered the WAV files only. The supplied MP3 copies were not used or hash-checked; the repo MP3s were produced from the WAVs by `tools/audio/ingest.mjs` (its sidecars record the input WAV sha256).

## Id mapping

The supplied ids are already the repo ids, so no renaming was needed: `il07-w6`, `i-17-w4`, `r38-w2`, `numbers-03-m` and the `hxxxxxxxx` ids all exist as `audio/m/israeli/word/<id>.mp3` in `data/audio/manifest-words-israeli.json` / `data/audio/manifest.json` with status `missing` before this work. The file names (`<id>-<hash>.wav`) do not match the tool's name rules directly, so a listing file (`file,id,voice,tradition,kind,text`) was passed with `--listing`; the tool compared the listed Hebrew with the manifest text.

Group split of the applied entries: lesson-word 32, phrasebook 2, vocab-word 48 (from the regenerated coverage table).

## Skipped (1)

- `hf1da5ea6` (אֵשׁ): the tool's dry run warned "very long for its text (1.29 s per letter; extra speech or padding?)" (the WAV is about 2.6 s for a two-letter word). Nobody has listened to it, so it was held back instead of applied. It is not rejected for wrong Hebrew; the text matches the repo. Apply it later only after a person has listened (`ingest.mjs` with a folder holding just that file and the listing).

## Tradition and voice

- Tradition: `israeli` only. No clip is labelled Sephardi or Ashkenazi.
- Voice slot: `m` ("Ari (man)" in the coverage table). This is only the slot the repo layout needs. The source says "synthetic default voice"; the gender and accent of that voice were not established. A rough pitch estimate on the WAVs (autocorrelation, 81 clips with a stable pitch) gave a median near 176 Hz, which does not settle it. Do not describe this voice as a man, as Israeli-accented, or as a teacher.
- The `f` slot for the same ids stays `missing`.

## Label shown in the app

Checked in headless Chromium (QA server from `tools/serve.mjs`, Playwright, congregation set to Israeli, voice `m`) on `#/words/trace?word=תֵּה` (id `il07-w6`):

- Button data state: `file`
- Label text: "Synthetic voice (outside generator; Israeli style not verified; not a recorded teacher; unreviewed)"
- Source: `audio/m/israeli/word/il07-w6.mp3`, served 200 `audio/mpeg`
- The audio element started and fired `ended` (duration 0.34 s reported by the browser); no console or page errors.

Only that one clip on that one view was checked. Learners on the default congregation (Sephardi) do not load the Israeli word manifest and get the device-voice label instead, so they will not hear these clips.

What could not be checked: headless Chromium has no audio output here, so nothing was heard. "Ended" shows the file decodes and plays to the end, not that it says the right word, with the right vowels or stress, or in a suitable voice. The service worker cache filling for these MP3s was not tested in a real browser.

## Delivery and size

- `audio/` is 1.1 MB for 82 MP3 and 82 sidecars (64 kbps mono, converted by the tool).
- Not in the precache: `node tools/build-precache.mjs --check` is current, lists no `audio/` file; `precache-manifest.js` changed only in its version string. `tests/offline.test.js` and `tests/integration.test.js` pass.
- Licence: recorded as "unknown: not cleared"; redistribution not cleared. The supplier's terms and any voice rights are still unknown to the repo.

## Checks run

- `node tools/audio/build_manifest.mjs --check`: manifest files are current.
- `node tools/audio/coverage.mjs`: required 22512, recorded 0, synthetic-unreviewed 82 (the table column is headed tts), missing 22430. `docs/voices/coverage.md` regenerated. Its status label for that column reads "Synthetic voice (Israeli only), not a recorded teacher", which is looser than the in-app label above.
- `node --test tests/audio*.test.js tests/offline.test.js tests/integration.test.js tests/shell.offline-fixes.test.js tests/tts.soundtext.test.js`: 330 pass, 0 fail after the test edits below.
- `node tools/meta/scan.mjs` and `--text`: pass. A manual grep of the diff and `audio/` for tool/company names and Windows paths found none.
- Docs link check (`tools/docs/linkcheck.mjs`): one broken link, `docs/INDEX.md` to `drafts/`, which this working copy does not contain (it was left out of a partial checkout to save disk). Not caused by this change. The other test files were not run, and `tests/perf.test.js` was not touched.

Test edits: four assertions encoded "no audio exists / every status is missing" and were relaxed to "no recording exists, every non-missing entry is `synthetic-unreviewed` with `synth.reviewed` false and has its file, and the synthetic count matches". They still fail if any clip is `recorded` or unreviewed-flag is true.

## What the machine pass does not prove

The supplier reports a unanimous pass by three recognizers of one model family. They share a model family, and repeated settings are correlated, so agreement is weak evidence. It does not certify vowels, stress, accent, meaning, voice suitability, or that the clip is the right word spoken once and cleanly. The ingest tool's checks (length, level, silence, clipping) are technical only. One clip in the supplied set peaks at 0 dBFS; it passed the tool's clipping threshold but nobody has listened for distortion.

## Before any of these can be called approved

A native Hebrew listener must review each clip individually and a person must then set its status by hand (`synthetic-reviewed`, or `recorded` only for a real human recording). Until then every clip stays `synthetic-unreviewed`, must not be called approved, recorded or teacher audio, and should not be treated as ready to teach with. Tool-written detail for this batch: `docs/audio/INGEST-REPORT-83-tool.md`.
