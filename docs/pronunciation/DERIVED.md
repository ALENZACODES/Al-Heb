# Derived pronunciation data (rule-generated, not verified by a native speaker)

All of this is built on `data/pronunciation/variants/` (rules and sources in VARIANTS.md). It inherits every
limitation listed there. No audio exists.

## 1. Syllables and stress: `data/pronunciation/derived/_syllables-001..007.json`, `index.json`
Record `{i, w:[{h, s, st, sr, p}]}` per variants record id: `h` pointed word, `s` pointed syllables, `st` stressed
syllable index (0-based) for [israeli, sephardi, ashkenazi], `sr` indexes `index.json stressRules`, `p` IPA syllables
per tradition (stress mark removed). 6,630 records, 8,758 words; shards < 190 KB, <= 2,000 records. Stress: milra by
default for Israeli/Sephardi with mil'el only from existing lists (stress.json, prayerwords.json, syllabify.js, the
stress marks in words.json ipa); Ashkenazi penultimate. 240 segolate-shaped words are read milra and flagged in
`variants/_review.csv`. `index.json` is small and non-underscore; the bulk shards are `_`-prefixed so they are not
precached.

## 2. Minimal pairs: `data/speak/minimal-pairs.json` (35 KB, runtime-safe)
`node tools/pronunciation/build_minimal_pairs.mjs`. Two different single words from `data/vocab/words.json` whose
pointing is identical except one feature at one position; pairs whose glosses share a content word are dropped
(spelling variants of one sense). Contrasts: bet/vet, kaf/khaf, pe/fe, shin/sin, het/khaf, tav/sav, alef/ayin,
kamatz/patach, tzere/segol. Each pair has `audible[]` per tradition, computed from the rule IPA, and each contrast
states what is heard per tradition (`heard`). The vocab is small, so several contrasts have few or no pairs
(`available` per contrast; bet/vet and tav/sav have none). Nothing was invented to fill them. Pairs are capped at 40 per
contrast, most frequent first, any word used at most twice. Real in all three traditions: bet/vet, kaf/khaf, pe/fe,
shin/sin. Only Sephardi: het/khaf (ħ vs x), alef/ayin (ʔ vs ʕ). Only Ashkenazi: kamatz/patach (ɔ vs a), tzere/segol
(ej vs e), tav/sav (s vs t). Israeli hears none of the last five (merged).

## 3. SSML: see SSML.md.

## 4. Recording script: `docs/voices/recording-script-{israeli,sephardi,ashkenazi}.csv`
`node tools/pronunciation/recording_script.mjs`. 1,000 rows each: the 1,000 entries of `data/vocab/deck-order.json`
ordered by `frequency.json` corpusRank. Columns: order, id, pointed_hebrew, read_aloud (siddur-style Latin), ipa,
stressed_syllable, syllables (stressed one in brackets), stress_rule, gloss, pos, corpus_count, check (why a row is
uncertain), donor_note and take_ok (for the donor). The donor reads the word as written in `read_aloud`/`ipa`; if a
native reader of that tradition says it is wrong, they write it in `donor_note` and the row goes to review rather than
being recorded as is. The older `docs/voices/recording-script*.md|csv` files (lesson ids) are unchanged.

## Tests
`tests/pronunciation.{syllables,ssml,minimalpairs,recording-script,variants}.test.js` also check that the files on
disk match a fresh build.
