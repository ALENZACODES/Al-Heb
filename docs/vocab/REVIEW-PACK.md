# Vocabulary review pack (words.json, 6,297 entries)

No native speaker or Hebrew educator has read `data/vocab/words.json`. This pack turns that file into sheets a reviewer can work through, ranks each entry by how often it appears in the project's own Hebrew, groups the most useful words into 40 theme packs with corpus-only example lines, and proposes gender/plural values by rule. Nothing here edits `words.json` or the packs under `data/vocab/packs/`; the tests check that.

```
node tools/vocab/review_pack.mjs      # Stage 1 + 4: docs/vocab/review/*.csv
node tools/vocab/frequency.mjs        # Stage 2:     data/vocab/frequency.json
node tools/vocab/theme_packs.mjs      # Stage 3:     data/vocab/themes/*.json
node --test tests/vocab.reviewpack.test.js tests/vocab.themes.test.js
```

All three accept `--dry` (print counts, write nothing). Each is deterministic; the tests fail when a committed output is stale.

## Stage 1: lint and review sheets

`docs/vocab/review/<theme>-NN.csv`: one sheet per theme (the 21 `topic` values), at most 250 rows each, ordered by `frequencyRank`. Columns: `id, hebrew, niqqud, translit, gloss, pos, gender, source, flags, reviewer_ok, reviewer_note`. The reviewer writes `ok` / `no` in `reviewer_ok` and a correction in `reviewer_note`; the other columns are generated and must not be edited. `_index.csv` lists the sheets; `_flag-summary.csv` has the counts. Files start with a UTF-8 BOM so Excel shows the Hebrew.

Counts after the Stage 6 corrections (2026-11-04): 35 theme sheets, 6,297 rows, every row carries at least one flag.

| flag | rows | meaning |
|---|---|---|
| licence-missing | 6,297 | no record carries a per-record CC BY-SA field. The licence is stated only at file level (`docs/vocab/LICENSES.md`, the credits screen). A record-level `license` field is a build change, not made here. |
| needs-review | 2,670 | the build already marked the record (`flags.needsReview`) |
| homograph | 1,695 | another record shares the unpointed spelling; frequency is counted per spelling, so the rarer word's rank is inflated |
| plural-missing | 820 | noun without `forms.plural` |
| dup-spelling | 420 | same spelling and POS (and binyan for verbs) with different pointing: possible duplicate or ktiv variant |
| gloss-machine | 251 | dictionary-ese: wiki markup, "form of", "used to introduce", "one who", passive "to be X-ed" first sense, over 70 characters. "made by" glosses are exempt on purpose |
| pos-unknown | 113 | POS is `unknown` (mostly phrasebook/lesson additions) |
| gender-missing | 6 | noun without gender |
| no-niqqud | 2 | יהוה and אדני, kept unpointed on purpose (lesson r34 teaches reading them unpointed) |

Fixed in Stage 6 (`data/vocab/corrections.json`, `tools/vocab/apply_corrections.mjs`): `duplicate` (2 duplicate records removed), `translit-mismatch` (65 initial-h losses), `translit-missing` (2). Zero hits (checked, not merely absent): `partial-niqqud`, `skeleton-mismatch`, `translit-scheme`, `gloss-empty`, `source-missing`, `example-licence`, `pack-mismatch` (every pack copy equals its words.json record).

Transliteration scheme check: the builder used the `siddur` scheme with the Israeli tradition; a record is flagged when re-transliterating its pointed form gives a different string (trailing clitic hyphens ignored), or when the string uses letters the siddur scheme never emits (`ts`, `q`, `w`, diacritics).

## Stage 2: frequency in the project's own text

`data/vocab/frequency.json` ranks all 6,297 entries by occurrences in a fixed list of files (`POOL_FILES` in `tools/vocab/frequency.mjs`): the corpus registry and phrasebook and the service-guide section names (`corpus`), the registry lines referenced by `data/service/orders.json` (`service`), and lesson word lists, lesson prayer lines, dialogues, gender pairs, prayer prompts and loanwords (`curriculum`). Pool: 1,022 lines, 5,680 tokens.

A token matches an entry when, with points and cantillation removed, it equals the headword or one of its listed forms; a `clitic` match removes one or two leading prefix letters (ו ה ב ל מ ש כ) if at least three letters remain. Result: 1,203 entries attested (1,023 by an exact token, 180 only behind a prefix), 5,094 with zero occurrences. Ties are broken by the main `frequencyRank`, so `corpusRank` is a complete order but says nothing about general Hebrew frequency for the 5,094 zeros. Counts are per spelling: הִוָּה (whose future form is spelled יהוה) and יְהוָה share the top count, and both לְךָ and לָךְ receive every לך.

## Stage 3: theme packs

`data/vocab/themes/<topic>-setNN.json` (40 files) plus `index.json`. Sets per topic: general-things 11, doing-verbs 8, describing-words 3, every other topic 1. Each set holds up to 125 words taken in `corpusRank` order inside its topic; 33 packs are full, the 7 smaller ones are topics with fewer than 125 entries (school-learning 47, arts-sports 69, clothes-shopping 90, tech-media 99, home-things 113, feelings-mind 118, small-words 121). Total 4,782 words; 1,515 words.json entries (the lowest-ranked in general-things, doing-verbs, describing-words, religion-prayer, body-health, moving-doing, science-ideas, people-family, society-work-law, nature-animals, talking-asking, places-travel, food-drink, time-numbers) are in no theme pack.

Example sentences are never composed. An example is a line copied verbatim from the Stage 2 pool (with its English rendering and source file/id where the source has one). 1,038 words have one (480 matched with vowels agreeing, 332 by consonants only, 226 behind a prefix); 3,744 have `example: null` and the flag `noCorpusExample`. Every example carries `senseChecked: false`; 349 are flagged `exampleSpellingShared` because the match was by consonants and another entry shares the spelling (רִבָּה "jam" is illustrated by תּוֹדָה רַבָּה). `tests/vocab.themes.test.js` rebuilds the set of every Hebrew string under `data/corpus`, `data/service` and `data/curriculum` on its own and fails if any example is not in it.

## Stage 4: gender and plural by rule

`docs/vocab/review/gender-plural-rules-NN.csv` (4 sheets, 837 nouns): every noun lacking a gender or a listed plural. Columns `gender_current, gender_rule, plural_current, plural_rule, rule, flag`. Rules: kamatz/patach + ה, ־וּת, ־ִית, final ת or ה -> feminine, otherwise masculine; plurals are unpointed only (ילדה -> ילדות, מכונית -> מכוניות, ספר -> ספרים, final letters made medial). Irregular plurals (עיר/ערים, בת/בנות, duals like עיניים) are not produced; every row is flagged `gender:rule(low|medium)` and/or `plural:rule-unpointed` so no value can be mistaken for a checked one. Nothing is written to `words.json`; applying accepted rows is a separate step for the vocabulary build.

## Not done

- No per-record licence field exists; the `licence-missing` flag records that fact rather than fixing it.
- Adjective feminine/plural forms are not generated.
- Word sense inside example lines was not verified; the corpus is prayer-heavy, so examples lean liturgical.
