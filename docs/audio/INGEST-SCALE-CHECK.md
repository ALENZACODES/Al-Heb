# Ingest scale check (2026-11-05)

Checked against origin/main `ceb04efc`. Everything below was run or read in a clean worktree; nothing was applied.

## 1. Dry run of tools/audio/ingest.mjs (never --apply)

Only one audio folder exists outside the repo: `/mnt/user-data/uploads/ALEF-THREE-JUDGE-PASSED` (88 WAV, 24 kHz mono, plus README, manifest.csv, manifest.json). It is labelled machine-pass only, unreviewed, not approved for teaching.

| Run | Result |
|---|---|
| `ingest.mjs <folder> --listing <folder>/manifest.csv` | **listing: 0 rows; 88 unmatched** ("no manifest id found in the file name") |
| same, with a 3-column listing (`file,id,text`) derived from that csv, no defaults | 88 ambiguous: each id has 6 entries (voice x tradition) and nothing states them |
| same listing plus `--voice m --tradition israeli --kind word` | 87 `exists` (already ingested, protected without `--replace`), 1 `ready`, 0 errors |

Findings:
- The supplier's csv names its file column `wav_file`. `loadListing` accepts only `file, filename, file_name, audio_file, audio, wav, mp3, clip`, so that csv is silently read as 0 rows. The report prints "listing file: 0 row(s)" but does not flag it. Not changed here (tool behaviour); a one-line alias would fix it.
- Handoff voice, tradition and kind are not stated in the files, so ids alone are ambiguous by design (correct: the tool refuses to guess).
- The one `ready` clip is `hf1da5ea6` with a warning: 1.29 s per letter (possible padding). Listen before applying.
- Conversion sample: 1 of 1 passed the delivery format check; 21,315 B measured against 21,680 B estimated.
- The dry run wrote nothing (`git status` clean).

## 2. Scale numbers (measured)

- Manifest: 24,906 entries, 4,633 distinct ids; 87 non-missing, all `synthetic-unreviewed` / `outside-synthetic`, all israeli/m. 0 recorded.
- Per voice/tradition: israeli 4,598 (m) and 4,685 (f); sephardi and ashkenazi 3,884 each per voice.
- Duplicate ids: 312 (id, tradition, voice) combinations appear twice, always as kind `line` plus kind `prayer`. They are distinct paths and distinct player index keys (`voice|tradition|kind|id`), so no collision. Path duplicates: 0. Path vs voice/tradition/kind label mismatches: 0. Sidecar tradition mismatches: 0 (87 checked).
- Clip sizes: largest on disk 22,151 B; mean about 21 KB. The ingest default cap is 200 KB.
- Projection (ingest report): if all 24,906 entries had a 21.2 KB clip, about 515 MB, over the tool's 300 MB default budget (the budget is the tool's own default, not a hosting limit).
- The "1,233+ items" figure is not stated anywhere in the audio manifests, tests or tools; it was not verified.

## 3. Service worker and precache

- Precache: `computeManifest()` gives 343 files, **3.947 MiB**. The test requires under 3.95 MiB, so headroom to that line is about 3 KiB. Any new precached file of a few KiB fails `tests/integration.test.js`. No audio file is precached (all 273 on-demand files include none under audio/).
- sw.js: `MAX_CLIP_BYTES` = 512 KiB, `MAX_CLIPS` = 600, oldest-inserted evicted. The 512 KiB cap is about 23 times the largest clip, so size is not a risk. The 600-clip cap is the real limit: it is 2.4% of all entries and about 13% of one voice/tradition set, and the cache is shared across voices and traditions. Offline audio therefore covers only recently played clips; this is by design and documented in docs/audio/RANGE-AND-OFFLINE.md, but a full offline course would need a different design.
- Existing coverage: `tests/sw.range.test.js` reads both limits from sw.js and tests the cap behaviour; `tests/integration.test.js` holds the 4 MiB and 3.95 MiB checks; `tests/audio.manifest.test.js` holds path uniqueness and path-equals-labels.

## 4. Guard test added

`tests/audio.scale.test.js` (additive, no existing test changed or loosened):
1. every clip on disk is at most the sw.js `MAX_CLIP_BYTES` (read from sw.js);
2. the ingest default `maxClipKb` never exceeds the sw.js cap.

## 5. Risks, ranked

1. Precache headroom of about 3 KiB: next unrelated shell change can break the suite.
2. `wav_file` listing header read as 0 rows without a warning.
3. 600-clip runtime cache is small relative to 24,906 entries.
4. Repo size projection (515 MB at full coverage) exceeds the 300 MB tool default; `--budget-mb` or a hosting decision is needed before bulk ingest.
