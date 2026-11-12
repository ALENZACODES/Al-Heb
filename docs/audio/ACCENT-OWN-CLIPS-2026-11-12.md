# Sephardi and Ashkenazi clips of their own (12 November 2026)

The owner's points plan item 1 asks for real Sephardi and Ashkenazi clips for the rows that played the Israeli clip (status `plays-israeli`), every one backtested. They were made with the repo's existing accent pipeline, unchanged: `tools/audio/render_tts.mjs` `renderBatch` (the Israeli he-IL WaveNet voice of the same slot reads the tradition's English-letter respelling of the pointed Hebrew, `tools/audio/accent.mjs` `respellFor`; loudness-normalised; tempo-capped to at most 1.26x the Israeli clip), driven by `tools/audio/accent_fill.mjs` (which only chooses and shards the rows) in the `accent-fill` workflow. Each clip was then judged against the row's pointed Hebrew by the three reviewers (sound review, word check, Google Speech-to-Text; `tools/audio/accent_review.py`). Only a clip that at most one reviewer heard a word off in was kept; a held clip was not shipped, and its row still plays the Israeli clip. Rows on the clergy list and letter-sound rows the respelling cannot write (a bare letter) were not made.

| run | rows | kept | held |
|---|---:|---:|---:|
| accent-fill 1 (letters, vowels, syllables, prayers, lines) | 872 | 383 | 489 |
| accent-fill 2 (words) | 1216 | 720 | 496 |

Alias rows (a one-line prayer that is the same clip as its line, a Dot Tile syllable that is a letter sound, a lesson-word alias) were given a copy of their target's clip where the target has its own, unheld clip with the same text (`tools/audio/alias_copies.mjs`, 1,332 rows).

Own-file coverage on the five audio manifests (a row counts when it has a synthetic status and its file exists):

| | before | after |
|---|---|---|
| kind letter | 114/342 33.3% | 206/342 60.2% |
| kind letter-lecture | 216/216 100.0% | 216/216 100.0% |
| kind line | 1246/1342 92.8% | 1255/1342 93.5% |
| kind prayer | 140/528 26.5% | 381/528 72.2% |
| kind syllable | 220/676 32.5% | 489/676 72.3% |
| kind vowel | 30/90 33.3% | 59/90 65.6% |
| kind word | 21227/25375 83.7% | 23022/25375 90.7% |
| tradition ashkenazi | 6238/8245 75.7% | 6937/8245 84.1% |
| tradition israeli | 11158/12078 92.4% | 11859/12078 98.2% |
| tradition sephardi | 5797/8246 70.3% | 6832/8246 82.9% |

The targets (every main-manifest kind and Sephardi and Ashkenazi above 90%) are **not met**. The pipeline is deterministic (the same respelling gives the same WaveNet clip), so a second run would only remake the held clips. Most held clips are the Israeli voice reading Latin-letter respellings that the reviewers, judging against the pointed Hebrew, hear as other words; no prayer clip passed. Raising these kinds further needs a different way of making the tradition clips (human readers, or a decision to judge them another way), which is the owner's call.

Logs: `docs/audio/fill/accent-r1-*.jsonl`, `docs/audio/fill/accent-r2-*.jsonl`.
