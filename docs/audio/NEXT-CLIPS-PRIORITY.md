# Which clips to ask for next

Status: a ranked work list for the outside generator, produced by `node tools/audio/priority.mjs`. **The ranking is a builder judgement written from the repository's own data. It is not learner data**: nothing here measures what learners need, hear, replay or get stuck on. Every clip the generator returns stays `synthetic-unreviewed` and must go through the ingest steps in [`INGEST-CLIPS.md`](INGEST-CLIPS.md) and a native-speaker listen before anyone calls it approved.

## What it ranks

- Entries of the audio manifest with `voice: m`, `tradition: israeli`, `status: missing`, and `kind: word` (the same slot, tradition and kind as the 87 clips already applied; the earlier batches are described in [`INGEST-REPORT-83.md`](INGEST-REPORT-83.md) and [`INGEST-REPORT-88.md`](INGEST-REPORT-88.md)). `--kinds word,line` also ranks lines, after all words; the default is words only, because that is what the generator has returned so far.
- Not ranked: aliases (`aliasOf`, entries that point at another id) and entries marked optional (whole-prayer reads).
- Letters, vowels and syllables are never listed (`HUMAN_ONLY_GROUPS` in `tools/audio/coverage.mjs`; the ingest tool refuses them too). The woman voice, Sephardi and Ashkenazi are not covered: no outside clip exists for them and the app does not claim any.

## Files

| file | what |
|---|---|
| `NEXT-CLIPS-PRIORITY.csv` | the first 500, columns below |
| `NEXT-CLIPS-EXCLUDED.csv` | every candidate that was left out, with the reason(s) (`id`, `pointed_hebrew`, `kind`, `group`, `reasons`) |
| `next-batches/batch-01.csv` ... `batch-10.csv` | the same 500 cut into batches of 50 in rank order, in the manifest layout the generator last returned |

Rebuild: `node tools/audio/priority.mjs --write`. Check that the files are current: `node tools/audio/priority.mjs --check` (a test runs it). Options: `--top 500`, `--batch-size 50`, `--kinds word[,line]`. The output has no dates and no randomness, so two runs on the same data give the same files.

`NEXT-CLIPS-PRIORITY.csv` columns:

| column | meaning |
|---|---|
| `rank` | 1 is asked for first |
| `id` | the manifest id (the file will be `audio/m/israeli/word/<id>.mp3`) |
| `pointed_hebrew` | the manifest text for that id, copied unchanged (NFC). Nothing in this tool writes or edits Hebrew |
| `kind`, `group` | manifest kind and group (`lesson-word`, `vocab-word`, `phrasebook`, `anchor-word`, `vocab-extra`, `prayer-word`) |
| `tier`, `score` | see the rule |
| `why` | the signals that put it there, in words |
| `lesson_route_ref` | the lesson word, first-day step or prayer it comes from |
| `already_have` | `no` for every row (a listed id has no clip by definition). `no (same text has a clip under <id>)` when another id with identical pointed text already has an applied clip, so the same word has been spoken once already |
| `same_text_as` | the best-ranked id with the same pointed text, when this row is a second or later id with that text. The app asks for each id separately, so each id still needs its own file, but one spoken word could serve all of them |
| `batch` | 1 to 10 |

## The scoring rule

An entry gets `score = tier base + position bonus + frequency bonus`. The bonuses add at most 98 and the tiers are 100 apart, so a lower tier never outranks a higher one. Rows are sorted by score, then pointed text, then id.

Tiers (the first that applies):

| tier | base | what |
|---|---:|---|
| T1 | 1000 | a word taught on the first-day route: the on-ramp word, the first-ten-minutes words, the 20-word ladder (`data/firstday/`) |
| T2 | 900 | a word of lessons r01 to r10 (the v0 reading path) |
| T3 | 800 | a word of any other lesson, in `lessons.json` order |
| T4 | 700 | a word of a core prayer (`CORE_PRAYER_RE` in `tools/audio/recording_needs.mjs`) or of a prayer line a lesson lists |
| T5 | 600 | one of the first 1000 words of the vocabulary deck order (`data/vocab/deck-order.json`) |
| T6 | 500 | occurs in the project's own text (`data/vocab/frequency.json`) but is not in the deck order |
| T7 | 400 | none of the above |

Position bonus, 59 down to 0: inside a tier the entries are put in their natural order and spread evenly. T1: first-day step order. T2 and T3: lesson position, then word position in the lesson. T4: the lesson that lists the prayer, then corpus frequency. T5: deck position. T6: corpus rank. T7: none (0). Entries with the same natural key share a bonus.

Frequency bonus, 39 down to 0: `round(39 * (1 - corpusRank / 6303))` for a spelling found in `frequency.json` with a count above zero; 0 otherwise. Matching is on the unpointed spelling, so homographs share a rank.

One spoken word, several ids. The same pointed text often has several ids (a lesson word, a vocabulary id, a phrasebook entry, a prayer word). The id that stands for the word (best signal, then group order lesson-word, vocab-word, phrasebook, anchor-word, vocab-extra, prayer-word, then id) is scored on the best signal of the text, including first-day and the earliest lesson. The other ids are scored only on their own context: their own lesson word (a vocabulary id counts as the lesson word whose `vocabId` points at it), their own prayer, their own vocabulary id in the deck order. Without this, one word such as "shalom" would put every one of its ids in the first tier and crowd out the rest of the list.

## What is left out, and why

An entry is excluded (and written to `NEXT-CLIPS-EXCLUDED.csv` with its reasons) when any of these holds:

1. It is `hf1da5ea6`, the clip held back until a person has listened ([`INGEST-REPORT-88.md`](INGEST-REPORT-88.md)).
2. Its group is human-only (letters, vowels, syllables).
3. Its id starts with `bless-priestly`: the Priestly Blessing lines, the whole prayer and each of its words. This comes from the lane instruction that these stay with human recording; the repository's code rule (`HUMAN_ONLY_GROUPS`) does not itself name them, so `HUMAN_FIRST_PREFIXES` in the script is the one place to change it. Words of other ids that merely share a spelling with a word of that blessing are not excluded.
4. The text has no Hebrew, or no vowel points.
5. Pronunciation data in `data/tts/soundwords.israeli.json` marks it open: confidence `unvoiced`; any flag that file itself marks `hard` (`aramaic`, `shva-heuristic-L3`, `possible-segolate`, `vav-cholam-consonantal`, `he-patach-no-mappiq`, `kamatz-katan-before-chataf`); or one of two further flags: `words-ipa-colloquial-shva-drop` (the repo's own colloquial IPA disagrees with the careful reading) and `template-ellipsis` (an open slot, not a full utterance).
6. `data/pronunciation/exceptions.json` lists a form in it as `needs-native-review` or as an unapplied candidate reading.
7. Its vocabulary record (`data/vocab/words.json`, matched by id or by the lesson word's `vocabId`) is hidden, has a reason mentioning that the pointing or entry is not native-reviewed, or has a gloss saying the term's meaning is uncertain.

No field in the repository is literally named "disputed". Items 5 to 7 are what the repository marks as uncertain or open for pronunciation or pointing; the list above is the rule as built, not a claim that these are the only doubtful items. About one in six candidates is excluded (661 of 3727 at the time of writing); the counts per reason are in the CSV and the summary printed by the script. Excluding on item 7 also removes a few v0 lesson words (for example `r04-w3`, `r06-w2`, `r10-w2`), which therefore cannot be synthesised from this list until a native reviewer clears their pointing.

## Using a batch

Each `batch-NN.csv` has the generator's manifest columns: `id,he,source_file,source_text_sha256,source_structural,recognition,consistency,overall,human_approved,status,wav_file,wav_sha256,mp3_file,mp3_sha256`. Only `id` and `he` are filled (`he` is the manifest text). The other columns are left empty for the generator to fill, because this repository does not know how it computes them. Whether the generator will accept this file as input is not known: it is a format match, not a tested hand-off.

When the generator returns its manifest and WAV files, build the ingest listing from it instead of by hand:

```bash
node tools/audio/priority.mjs --ingest-listing /path/to/returned/manifest.csv --out /tmp/listing.csv
node tools/audio/ingest.mjs /path/to/wavs --listing /tmp/listing.csv --report /tmp/ingest-report.md   # dry run first
```

The listing has `file,id,voice,tradition,kind,text` with `file` taken from `wav_file`, voice `m`, tradition `israeli`, kind `word`. Rows with no `id` or no `wav_file` are skipped and named. The ingest tool then does its own Hebrew comparison and technical checks as before.

## Honest limits

- This is ordering by a rule the builder chose. The tier order (first-day, then v0 lessons, then the other lessons, then prayers, then frequency) is a judgement about what a new learner meets first; no learner, teacher or usage data was used, and none exists in the repository to check it against.
- Lessons r01 to r10 as "v0" is the lane brief's definition. The repository does not define a v0 lesson set; its "15 v0 routes" are app routes, not lessons.
- The frequency numbers count occurrences in the project's own texts (lessons, prayers, phrasebook), not general Hebrew usage, and match on unpointed spelling.
- Ranking is by id, as the app asks for ids. The first 500 rows hold fewer distinct spoken words than rows; `same_text_as` shows which are repeats.
- The exclusions only catch what the repository's own files flag. An unflagged entry can still be wrong or read wrongly; the flags in `soundwords.israeli.json` come from a rule engine that nobody has checked against a native speaker, and the Hebrew in the manifest is a draft that has not been reviewed.
- The 500 is a cut-off for the first batches, not an estimate of how many clips the app needs. The manifest still lists far more Israeli man-voice entries than that.
- Nothing here was listened to, and nothing here approves a clip.
