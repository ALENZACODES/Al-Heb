# Generated files, their builders and freshness tests

Every file below is committed output. Each freshness test rebuilds the output in memory and compares it with the file on disk, so a stale file fails with a message naming the builder. To fix a failure, run the builder and commit the result. The builders listed here read only tracked files and relative paths. None writes a time-dependent value that a test compares.

| Generated file(s) | Builder | Freshness test |
|---|---|---|
| data/wordtrace/words.json | node src/wordtrace/build.mjs | tests/wordtrace.logic.test.js |
| data/typing/drills.json | node src/typing/build.mjs (--check) | tests/typing.test.js |
| data/curriculum/word-vocab-map.json | node tools/curriculum/word_ids.mjs | tests/curriculum.reviewpics.test.js |
| data/img/index.json | node tools/img/build_index.mjs | tests/img.index.test.js |
| data/pronunciation/variants/* | node tools/pronunciation/build_variants.mjs | tests/pronunciation.variants.test.js |
| data/pronunciation/derived/* | node tools/pronunciation/build_derived.mjs | tests/pronunciation.syllables.test.js |
| data/pronunciation/runtime/lookup-*, index.json | node tools/pronunciation/build_runtime.mjs | tests/pronunciation.compare.test.js |
| data/pronunciation/runtime/rules.json, quiz-pool.json | node tools/pronunciation/build_pages.mjs | tests/pronunciation.rulepages.test.js, tests/pronunciation.tradquiz.test.js |
| data/pronunciation minimal pairs file | node tools/pronunciation/build_minimal_pairs.mjs | tests/pronunciation.minimalpairs.test.js |
| recording-script CSVs | node tools/pronunciation/recording_script.mjs | tests/pronunciation.recording-script.test.js |
| data/vocab/vocab5000.json pack files | node src/vocab/split-tiers.mjs | tests/vocab.view.test.js |
| data/vocab/themes/* | node tools/vocab/theme_packs.mjs | tests/vocab.themes.test.js |
| data/vocab/deck-order.json | node tools/vocab/deck_order.mjs | tests/vocab.deckorder.test.js |
| data/vocab/attribution.json, docs/vocab/ATTRIBUTION.md | node tools/vocab/attribution.mjs | tests/vocab.attribution.test.js |
| data/vocab frequency.json | node tools/vocab/frequency.mjs | tests/vocab.reviewpack.test.js |
| tools/record-kit/recorder.html | node tools/record-kit/build.mjs | tests/record-kit.test.js |
| docs/voices/kit/* | node tools/audio/session_kit.mjs --write | tests/audio.kit.test.js |
| docs/voices/coverage.md | node tools/audio/coverage.mjs | tests/audio.coverage.test.js |
| docs/voices/tts-cost-plan.md | node tools/audio/cost_plan.mjs | tests/audio.costplan.test.js |
| data/audio/manifest*.json | tools/audio (manifest tooling) | tests/integration.test.js (audio manifest resolves), tests/audio.manifest.test.js |
| docs/images/paste/j-NN.txt, data/images/block-j.csv, docs/images/BLOCK-J.md | node tools/images/build_blockj.mjs | tests/images.blockj.test.js |
| docs/images/paste/redo-*.txt, REDO-LIST.md | node tools/images/build_redo.mjs | tests/images.redo.test.js |
| inter-pending files | node tools/images/build_inter.mjs | tests/images.inter.test.js |
| data/images/run3.csv | node tools/images/build_run3.mjs | tests/images.run3.test.js |
| docs/images/RUNBOOK.md | node tools/images/build_runbook.mjs | tests/images.review.test.js, images.run3, images.inter |
| data/images/next1000.csv, next1000-groups.json, docs/images/paste/cmd-*.txt | node tools/images/build_next1000.mjs | tests/next1000.test.js, tests/paste.test.js |
| altText in data/images/generated-manifest.json | node tools/images/alt_text.mjs | tests/images.redo.test.js |
| book image prompts | node tools/images/build_prompt_groups.mjs | tests/book.images.test.js (warns only) |
| precache-manifest.js | node tools/build-precache.mjs | tests/integration.test.js |
| src/shell/views.generated.js | node tools/build-precache.mjs (its writeViewList step; no separate generator exists) | tests/integration.test.js (views.generated.js lists exactly the *.view.js files) |

## Determinism and inputs (checked)

Each of these was run twice in the repo, and the resulting files were hashed. The hashes matched, so none depends on time, randomness or absolute paths: wordtrace, typing, img index, record-kit, word-vocab-map, and every pronunciation builder.

The in-memory builders for blockj, redo, inter, run3 and runbook were compared against disk by their tests on repeated runs. Their inputs are tracked files under data/ and docs/. Nothing generated reads the gitignored paths data/images/sheets, data/images/review, dist or node_modules.

## Known limits

- The vocab builders (frequency, theme_packs, deck_order, attribution) write a "generated" date field. Their tests compare entries and ignore it, but a rebuild changes that field.
- tools/images/ingest_lib.mjs defaults to a sibling directory ../alef-image-originals (or ALEF_IMAGE_ORIGINALS). Only the ingest step uses it, and no freshness test does.
- tests/next1000.test.js and tests/paste.test.js hard-code the ingest state (1000 pending rows, 282 done, cmd-036.txt). They fail once more images are ingested, so they are snapshot assertions and not freshness checks.
- precache-manifest.js is rebuilt only with node tools/build-precache.mjs, run deliberately outside this lane.
- src/shell/views.generated.js is written only by tools/build-precache.mjs (the exported writeViewList function, called first in that script's main block). There is no separate tool. It goes stale whenever a *.view.js file is added or removed, and the integration test then fails until the precache build is run deliberately outside this lane.
