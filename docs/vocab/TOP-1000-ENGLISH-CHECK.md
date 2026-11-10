# Top 1,000 English words: do they have a Hebrew word, and does it have sound? (2026-11-08)

Owner request: the 1,000 most common English words should each map to a Hebrew word in the dictionary, with audio.

## Method

English list: the Google Web Trillion Word Corpus top words (`first20hours/google-10000-english`, US spelling), with single letters, abbreviations, month and day names, place and brand names, and adult-site vocabulary removed, then the first 1,000 kept. Each English word (and its plain singular, base verb or adjective form) was looked up as a whole word in the English glosses of `data/vocab/words.json` (6,303 entries); the primary gloss wins over an alternative gloss. Audio counts as present when both the man and the woman Israeli clip exist on disk, directly or through the entry's lesson-word alias (`data/audio/manifest-words-israeli.json`, `manifest-kind-word.json`). Row by row: `TOP-1000-ENGLISH-CHECK.csv`.

Limits: a gloss match is not a reviewed translation (an English word can match a Hebrew entry through a secondary sense); nobody has checked the 931 pairs by hand.

## Result

| | count |
|---|---:|
| English words with a Hebrew entry in the dictionary | **931** |
| of which with both Israeli clips | **535** |
| of which with no clip entry at all | 396 |
| English words with no Hebrew entry | 69 |

## The 69 words with no Hebrew entry

Grammar and everyday words worth adding to the dictionary (21): these, could, did, those, both, while, him, previous, got, latest, least, log, plus, percent, none, although, overall, soon, rather, came, pre.

Web, business and site vocabulary (48), lower priority for a beginner: email, copyright, info, privacy, management, design, index, science, san, feedback, users, browse, fax, professional, journal, entertainment, format, edition, database, pro, federal, auto, global, tech, subscribe, newsletter, listings, corporate, hardware, designed, environmental, availability, pics, income, bay, administration, sponsored, eur, executive, jewelry, rental, sat, facilities, bid, sellers, logo, score, statistics.

## What is needed next

1. **Add the 21 grammar words** (these, those, both, while, him, could, did, came, got, least, rather, although, soon, none ...) as dictionary entries with a native-speaker check; they are function words a beginner meets in the first weeks.
2. **Render clips for the 396 matched entries with no clip** (792 clips, two voices). These ids are not in the audio manifests yet, so the step is: add their manifest rows (`tools/tts/manifest_update.mjs`), then `node tools/audio/render_tts.mjs --provider google --voice both --kinds word --ids docs/vocab/top-1000-no-audio-ids.txt --execute` with the Google key, then the metadata scan and `npm test`. List: `top-1000-no-audio-ids.txt`.
3. Re-run this check after both; the target is 1,000 of 1,000 with sound.
