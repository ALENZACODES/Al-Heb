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

## Second method: the Ashkenazi reading in Hebrew letters (run 3, 12 November)

Why the first method stalled: the held clips' reviews show the Israeli voice reading English letters ("cherev" was heard by Google as "chairs", "pesach" as "tasc"), and all three reviewers judged every clip against the Israeli pronunciation of the pointed Hebrew, so a correct "shabos" could not pass.

What changed:
- **Input:** Ashkenazi rows now send the Ashkenazi reading written in pointed Hebrew letters (`tools/audio/ashkenazi_script.mjs`): kamatz as holam, tav without dagesh as samekh, tzere with a yod, `-ָיו` as `-ֹב`. These are the transliteration engine's own three Ashkenazi rules; the Israeli reading of the new text equals the engine's Ashkenazi reading on 442 of 444 gap rows (test: `tests/audio.ashkenazi-script.test.js`).
- **Judge:** the sound reviewer compares with the sounds of that Hebrew-letter reading, so it checks o for kamatz and s for tav. The two word reviewers (speech-to-text trained on Israeli Hebrew) may match a heard word to either spelling, so they still catch a wrong or garbled word. Pass rule unchanged: at most one reviewer hears a word off.
- **Sephardi is not in this method.** The app's Sephardi reading is letter for letter the Israeli one (`src/pronunciation/forTradition.js`), so the Israeli voice reading it in Hebrew letters would only make the Israeli clip again.

| run 3 (Ashkenazi, Hebrew letters) | rows | kept | held | first method, same kinds |
|---|---:|---:|---:|---|
| words | 179 | 166 | 13 | 208 of 387 kept |
| lines | 40 | 27 | 13 | 2 of 42 |
| prayers | 34 | 6 | 28 | 0 of 34 |
| syllables | 97 | 48 | 49 | 123 of 220 |
| letters | 78 | 35 | 43 | 36 of 110 |
| vowels | 14 | 1 | 13 | 16 of 30 |
| **all** | **442** | **283** | **159** | |

Coverage after run 3: Ashkenazi 7,240/8,245 (87.8%, was 84.1%); kind letter 70.5%, syllable 79.4%, prayer 77.1%, line 95.5%, vowel 66.7%. Logs: `docs/audio/fill/accent-r3-*.jsonl`. Merged with `tools/audio/accent_merge.mjs --run 3`.

Short items: in 96 of the 159 held clips the sound reviewer passed the clip and only the two word reviewers failed it, mostly on single letters and syllables (Google heard "gimel" as "gmail" and returned nothing for most syllables). A review-only run of the same three reviewers on the Israeli letter, vowel and syllable clips already in the app measures how often the word reviewers fail short clips in general.
