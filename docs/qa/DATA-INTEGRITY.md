# Data integrity audit

Run on a fresh checkout of `main` at commit `0f0daea` (2026-11-05). Every number below came from the command beside it, run in that checkout. Nothing here judges Hebrew, audio or wording; it only checks that files, ids and generated outputs agree with each other. Nothing was changed in `data/`, `src/` or `assets/`, so no precache rebuild was needed.

## Result in one line

No mechanical defect was found in the data. Nothing was fixed in the data. One regression test was added (`tests/data.crossrefs.test.js`) so the cross-file checks below keep running. Items that need a native reader are listed at the end by id only.

## 1. Validators the repo already has

| Command | Result |
|---|---|
| `node tools/test/run.mjs unit --concurrency 3 --test-reporter=spec` (255 unit-tier files) | 2,657 tests, 2,649 pass, 0 fail, 8 skipped |
| `node tools/curriculum/integrity.mjs` | 125 lessons, 125 reachable, 0 violations |
| `node tools/corpus/verify_texts.mjs` | 70 records, 0 hard failures, 0 warnings (see note A) |
| `node tools/images/validate.mjs` | 914 ingested, 0 approved, 0 errors, 0 warnings |
| `node tools/knownwords/check.mjs --dialogues` | 7 texts checked, 0 below the gate |
| `node tools/vocab/audit_checks.mjs --check` | PASS, all hits in the baseline |
| `node tools/audio/coverage.mjs --check` | coverage.md is current |
| `node tools/audio/build_manifest.mjs --check` | manifest files are current |
| `node tools/hostkit/check.mjs` | exit 0 |
| `node tools/hebrew-lint/cli.mjs` | exit 0 (style findings only; baseline in `tools/hebrew-lint/baseline.json`) |
| `node tools/meta/scan.mjs` | PASS, zero findings, 914 allowlisted (see note B) |
| `node tools/docs/linkcheck.mjs` | 13 files, 1 broken link in a sparse checkout (see note C); 0 in a full checkout is expected |
| `node tools/letters/workbook_manifest.mjs --check` | 26 PDFs, manifest unchanged |
| `node tools/curriculum/word_ids.mjs --check` | word-vocab-map.json is current |
| `node tools/build-precache.mjs --check` | 338 installed, 273 on demand, version 30882f835280, current |
| `node tools/deploy/build_site.mjs` then `node tools/deploy/check-deploy.mjs --root dist` | 46 of 46 pass, 3 warnings (header rules, two origins named in code); 822 files, 46.12 MiB |

Notes.
- A. `verify_texts.mjs` rewrites `docs/corpus/VERIFY-REPORT.md` even with `--check` and without `--check`. In this checkout the Tanach cross-check cache (`tools/vocab/.cache/tanach`) is not on disk, so the rewritten report showed `no-xml` where the committed one shows `equal`. I reverted that file; the committed report was produced with the cache. This is a tool behaviour to know about, not a data defect.
- B. `scan.mjs` says two allowlist entries match nothing: `data/pronunciation/variants/_vocab-3.json` and `data/pronunciation/runtime/lookup-01.json`. Harmless; left alone (the allowlist is not mine to edit).
- C. The first run used a sparse checkout that left out `docs/drafts`, `docs/review` and others, which produced false broken links; those are not counted. After checking out everything except `docs/drafts` (only `docs/drafts/batches` was kept), the only link the checker still flags is `docs/INDEX.md:38 -> drafts/`, which is the folder I left out.
- `node tools/test/run.mjs browser` (20 browser-tier files) was NOT run.

## 2. Generators run with their own `--check`

All exit 0 (current): `tools/nikkudfade/build.mjs`, `tools/letters/build_memory_chain.mjs` (27 chains), `tools/letters/build_morph_sheet.mjs` (28 files), `tools/images/build_run3.mjs`, `tools/img/build_index.mjs`, `tools/tts/build_soundwords.mjs`, `tools/audio/cost_plan.mjs`, `tools/audio/recording_needs.mjs`, `tools/audio/first100.mjs`, `tools/audio/session_kit.mjs`, `tools/syllabus/build.mjs`, `tools/gender/build.mjs`, `tools/roots/build.mjs`, `tools/knownwords/build.mjs`, `tools/drafts/export_batches.mjs` (50 files, 4,685 rows).

Generators with no `--check`: I ran them and compared with git. No change from `tools/pronunciation/build_derived.mjs`, `build_runtime.mjs`, `build_variants.mjs`, `build_pages.mjs`, `build_minimal_pairs.mjs`, `tools/vocab/theme_packs.mjs`. `tools/vocab/deck_order.mjs`, `attribution.mjs` and `frequency.mjs` changed only the `generated` date stamp (confirmed byte-identical after replacing the date); I reverted them.

Not run: `tools/tts/manifest_update.mjs` (needs inputs from a render run), `tools/vocab/build_words.mjs`, `tools/vocab/fetch.py` and other generators that read uncommitted caches, the Python tools, and all `tools/a11y`, `tools/qa`, `tools/lighthouse`, `tools/sensitivity` runners.

## 3. Cross-checks no single test covers

All run by a scratch script over the JSON files; the stable ones are now in `tests/data.crossrefs.test.js` (9 tests, all pass). Counts are from this checkout.

| Check | Scope | Result |
|---|---|---|
| Vocab ids unique; `words.json` vs `index.json` | 6,303 and 6,303 | no duplicates, sets equal |
| Pack files reference real vocab ids | 6,303 words in 146 theme packs (4 tier files use their own entry ids and were not mapped) | 0 unknown |
| Deck order ids exist | 1,000 | 0 unknown |
| Lesson prerequisites, letters, vowels, prayer lines | 125 lessons, 27 letter refs, 15 vowel refs, 147 prayer-line refs | 0 unresolved |
| Lesson word steps point at a real word | 940 lesson words, 5 steps in r01 (the other lessons carry no step list) | 0 out of range |
| `word-vocab-map.json` keys and values | 649 mapped | all keys are real lesson words, all values real vocab ids |
| Intermediate lesson files vs copy in `lessons.json` | 50 | words identical |
| Corpus registry has text and meta | 70 entries | none missing `he`, `english`, `ref`, `title`, `category`, `source`, `license`; ids unique |
| Prayer meta covers exactly the registry | 70 and 70 | equal; readers' `registryIds` all resolve |
| Phrasebook entries have Hebrew, transliteration and English | 204 | none missing |
| Audio manifests: duplicate paths | 24,906 entries over 4 files | 0 |
| Audio path equals `audio/<voice>/<tradition>/<kind>/<id>.mp3` and text present | all | 0 mismatches |
| Audio ids map to an owner | letters (342), vowels (90), syllables, lines (1,096), prayers (420), words (22,298) | every letter, vowel, line, prayer, lesson word, prayer word, phrasebook and vocab id resolves; every `vocabId` exists; every `aliasOf` target exists; every lesson word has a clip slot |
| Audio status | 24,906 | all `missing`; no recorded clip exists |
| Memory-chain | 27 letters | SVG exists, vocab record exists and the Hebrew word equals the record |
| Art concept map | 27 letters, 27 file refs | same letter set as memory-chain; every `exists` flag matches disk |
| Image queues | manifest 1,797, next1000 814, inter-pending 100, block-j 1,000, run3 1,000 | no duplicate file inside any one queue; all 100 intermediate image slot ids have a prompt row |
| Routes | 87 routes | every module and `needs` file exists |
| Precache lists | 338 installed, 273 on demand | no file in both; every listed file exists on disk |
| Data files read by `src/` | 72 distinct paths | 0 missing on disk; 71 are in exactly one list; 1 is in neither (see below) |
| JSON parse | 499 json files under data, src, assets, tools | 0 failures |
| Markdown and HTML relative links | 448 files, 283 links | 26 unresolved, all explained (see below) |

Explained non-defects.
- `data/vocab/words.json` (7.0 MB) is in neither precache list because it is over the 2 MB install limit and is runtime-cached by design (`tools/build-precache.mjs`).
- The route `daily` loads `preview/loops/daily.view.js`, outside `src/`. It is not precached on purpose: `tools/deploy/make-dist.mjs` lists `preview/loops` as loaded on demand. I did not touch the precache rules.
- 25 of the 26 unresolved links are in `docs/review/out/index.html` and point at PDFs and one CSV that `docs/review/.gitignore` keeps out of git (rebuilt by `tools/review/build_packet.mjs`). The 26th is `offline.html -> ./`, a directory link.
- 329 stems appear in both `manifest.csv` and `next1000.csv` and 1,000 in both `manifest.csv` and `run3.csv`; this matches the append design (rows are appended to the manifest when a batch is cut). No stem repeats inside one file.

Not checked: ids built at run time from templates in `src/` (only string literals were scanned); the `tools/` data under `docs/` generated for reviewers; image files against their CSV rows beyond what `tools/images/validate.mjs` does; any content of `docs/drafts` except `batches`.

## 4. Defects

Found: 0 in data. Fixed: 0 (nothing to fix). Left: 0 mechanical.

Tooling observations, no change made: `verify_texts.mjs` overwrites its report whenever it runs (note A); the `scan.mjs` allowlist has two unused entries (note B).

## 5. Content doubts for a native reader (ids only; nothing changed)

These are flags the repo's own data already carries, plus mechanical oddities the checks surfaced. Everything in `data/` is still marked unreviewed (`proofread: false`, `needsNativeReview: true`).

- Vocab records with no pointed form (`pointed: null`): v66f62b1a, vdf2737fe, vba010668 (keys in the vocab5000 baseline).
- Vocab record whose gloss is a verb-form description: vaa2ad51d (one of three `verb-gloss-form` hits; the other two are in `data/vocab/audit-baseline.json`).
- Vocab records skipped by the roots builder because the plural or form has conflicting marks: h1da16296, h9167dfb6, h448338e7.
- `audit-baseline.json` also lists 62 duplicate-lemma-pointed and 27 circular-gloss hits; the full id lists are in `data/vocab/audit-baseline.json`.
- Lesson words with no unique vocab match: 258 unmatched and 33 ambiguous in `data/curriculum/word-vocab-map.json` (lists under `unmatched` and `ambiguous`). The map only does exact pointed matches, so each needs a person to say whether it is a different word, a different pointing or a form of a listed word.
- Corpus records whose Hebrew licence label comes from Sefaria metadata and is unverified: 42, see `docs/corpus/VERIFY-REPORT.md`. Prayer meta entries with an empty `service` list: bless-formula-1, num-12-13 (probably correct: not tied to a fixed place in a service; a reader should confirm).
- Memory-chain: the file-level `meta` of `data/letters/memory-chain.json` carries `needsNativeReview: true`, covering all 27 letters.
- Audio: all 24,906 slots are `missing`; the Hebrew `text` of every slot is unrecorded and unreviewed.
