# Pronunciation variants: Israeli, Sephardi, Ashkenazi (rule-generated)

**Status: every rendering in `data/pronunciation/variants/` is produced by rule from the niqqud text. No recording
exists and no native speaker or teacher has checked a single record.** The three "traditions" are idealised
textbook readings, not any one community's practice. Treat the files as a draft for review, not as a reference.

## What is produced

`node tools/pronunciation/build_variants.mjs` reads `data/vocab/words.json` (6,303 records: 6,146 words, 157 phrases),
`data/corpus/phrasebook.json` (204 entries) and `data/corpus/registry.json` (70 entries, 129 lines; one record per
line, ids `<entry>` or `<entry>-l<n>` as the audio manifest uses) and writes

- `data/pronunciation/variants/_vocab-1..4.json`, `_corpus-1.json`: shards of at most 2,000 records each (6,630 in all);
- `_index.json`: counts, flag totals, shard list;
- `_review.csv`: the 401 records whose rendering rests on a guess (see "Flags").

The file names start with `_` on purpose: `tools/build-precache.mjs` and the `every data/**/*.json parses` test skip
`_`-prefixed paths, so the 4 MB of shards is not installed into every learner's offline cache and the precache
manifest does not go stale. They are build artefacts; the app does not load them yet.

Record shape:
```
{ id, source: vocab|phrasebook|corpus, kind, he, en?, ref?,
  variants: { israeli: {ipa, simple, stress:[{syllable, of, rule}…]}, sephardi: {…}, ashkenazi: {…} },
  flags: [...], note?, syllables: [[per word…]] }
```
`ipa` is a broad transcription: `.` between syllables, `ˈ` before the stressed syllable, words separated by spaces,
maqaf written `-`. `simple` is the existing siddur-style romanisation from `src/pronunciation/transliterate.js`
(`siddur` scheme for Israeli and Sephardi, `ashkenazi-siddur` with `cholam:'oy'` for Ashkenazi, `geminate:false`: since the doubling policy
(`docs/pronunciation/DOUBLING-POLICY.md`) a dagesh chazak is written as a single letter in every tradition: shabat, sukka(h) -> sukah) Israeli and Sephardi `simple` are identical by design of that transliterator;
their IPA differs. The output is deterministic (no timestamps; the test rebuilds and compares byte for byte).

## Reused code and data (nothing in `src/` was changed)

| Piece | Used for |
|---|---|
| `src/pronunciation/hebrew.js` `parseWord` | one cluster per letter (dagesh, dots, vowel) |
| `src/pronunciation/shva.js` `classifyShvas` (level 2) | shva na / nach: rules B1-B3, L1-L4, X1 as documented there |
| `src/pronunciation/kamatz-katan.js` | U+05C7 and the four-word list (כָּל, חָכְמָה, תָּכְנִית, קָרְבָּן), applied before the shva rules exactly as `transliterate.js` does, so a shva after a kamatz katan is silent |
| `src/pronunciation/transliterate.js` | the `simple` field |
| `src/photo/syllabify.js` `syllabifyWord` | syllables, vowel letters (matres), furtive patach, dagesh kind, the divine-name substitution אֲדֹנָי; its shva decision is overridden by the `shva.js` verdict per letter |
| `data/pronunciation/consonants.json`, `niqqud.json` | every IPA value in the table below is copied from those records (their cited sources: Wikipedia *Modern Hebrew phonology*, *Sephardi Hebrew*, *Ashkenazi Hebrew*, *Niqqud*; Judaism 101 transliteration guide) |
| `data/pronunciation/stress.json`, `prayerwords.json`, `syllabify.js STRESS_EXCEPTIONS`, the `ipa` field of `words.json` | the mil'el exception list (see Stress) |

## Rules, by tradition

Columns: Israeli / Sephardi / Ashkenazi. "Source" names where the value comes from; "own" marks a choice or
derivation made for this build that no fetched source states in that form.

| Sign | Israeli | Sephardi | Ashkenazi | Source and notes |
|---|---|---|---|---|
| kamatz (gadol) | a | a | ɔ | niqqud.json; Wikipedia *Ashkenazi Hebrew*: "kamatz gadol … is generally pronounced [ɔ]"; *Sephardi Hebrew*: "[a(ː)], not [ɔ]". `simple`: a / a / o |
| kamatz katan | o | ɔ | ɔ | niqqud.json variant. Detected only from U+05C7, the four-word list, and a kamatz immediately before a chataf-kamatz (צָהֳרַיִם; **own rule**, 2 hits). Any other kamatz in a closed unstressed syllable is read as gadol and is **not** detected (known gap, e.g. חָפְשִׁי) |
| patach, chataf-patach | a | a | a | niqqud.json |
| tzere | e | e | ej | niqqud.json; *Ashkenazi Hebrew*: "[ej] in the majority of Ashkenazic traditions"; *Sephardi Hebrew*: "[e(ː)], not [ei]". tzere + yod is the same vowel (the yod is a vowel letter); `simple` writes "ei" in all three (siddur convention of the transliterator) |
| segol, chataf-segol | e | e | e | niqqud.json |
| chirik | i | i | i | niqqud.json |
| cholam (chaser and malei) | o | o | oj | niqqud.json; *Ashkenazi Hebrew*: Galician/Polish [oi], Lithuanian [ei], southern German [o], northern German [au]. **Choice:** the Polish value [oj] (toyreh); the others are not generated. `simple`: o / o / oy |
| kubutz, shuruk | u | u | u | niqqud.json |
| chataf-kamatz | o | ɔ | ɔ | niqqud.json |
| shva na | e | e | ə | niqqud.json (Ashkenazi "[e]/[ə] when read strictly"). Israeli value is the careful/liturgical reading; **colloquial Israeli drops many of these** (zman, kmo). The `words.json` ipa field shows the colloquial form for 178 words; those are flagged `words-ipa-colloquial-shva-drop`, not changed |
| shva nach | ∅ | ∅ | ∅ | shva.js rules. 176 records depend on the L3 "after a long unaccented vowel" heuristic (flag `shva-heuristic-L3`) |
| dagesh in bet / kaf / pe | b k p vs v χ f | b k p vs v x f | b k p vs v x f | consonants.json. Gemination (dagesh chazak) is not written in IPA ("absent in spoken Israeli Hebrew"; not covered by the sources for the other two) |
| tav without dagesh | t | t | s | consonants.json; *Ashkenazi Hebrew*: "ungeminated ṯāw is pronounced [s]"; *Sephardi Hebrew*: [t] (θ/d in some communities, not generated) |
| chet | χ | ħ | x | consonants.json (Israeli merged with khaf; Ashkenazi pharyngeal "seldom observed in practice") |
| khaf | χ | x | x | consonants.json |
| ayin | ∅ | ʕ | ∅ | consonants.json; *Ashkenazi Hebrew*: "aleph and ayin are completely silent". Sephardi [ŋ] of Spanish-Portuguese Jews not generated |
| alef | ∅ | ʔ (when it carries a vowel) | ∅ | consonants.json (Israeli "[ʔ] or ∅": written ∅; a hiatus shows as a syllable break) |
| resh | ʁ | r | r | consonants.json; *Sephardi Hebrew*: "invariably … alveolar trill"; *Ashkenazi Hebrew*: "alveolar flap or trill" or uvular by region. **Choice:** r for Ashkenazi |
| he | h; silent when it is a final vowel letter; mappiq = h | same | same | hebrew.js / syllabify.js. A final he + patach **without** mappiq (גָּבֹהַ in the source) is read as mappiq + furtive patach and flagged `he-patach-no-mappiq` |
| vav | v; vowel letter for cholam/shuruk; conjunction וּ = u | same | same | syllabify.js. A vav-cholam or shuruk after a **silent alef** (מְאוֹד, בְּאוּר) is repaired to a vowel letter (syllabify reads it as a consonant; transliterate.js already reads it right), flag `alef-vav-mater-repaired` |
| shin without a dot | ʃ | ʃ | ʃ | same as transliterate.js; flag `shin-undotted` (0 hits in the current data) |
| furtive patach (רוּחַ) | vowel before the consonant, never stressed | same | same | syllabify.js flag + **own** stress rule |
| divine name יהוה | read as אֲדֹנָי (adonai / adonoy) | | | syllabify.js and transliterate.js conventions; flag `divine-name` (61) |

### Stress

- **Israeli and Sephardi:** final syllable (milra) by default (*Sephardi Hebrew*: "stress tends to fall on the last
  syllable wherever that is the case in Biblical Hebrew"). Exceptions come only from existing data, in this order:
  `syllabify.js STRESS_EXCEPTIONS` (סֵפֶר), `data/pronunciation/stress.json` (7 words, own, unreviewed),
  `prayerwords.json` Israeli stress (10 words), and the `ˈ` mark in the `words.json` `ipa` field (2,396 words; the
  position is counted from the end of the word so that it survives the colloquial shva drop in that field). A
  two-syllable word ending in segol with no data (typical segolate, e.g. סֶרֶט) keeps the milra default and is
  flagged `possible-segolate` (240) for review; no segolate heuristic is applied, as requested.
- **Ashkenazi:** `prayerwords.json` Ashkenazi stress where listed (10 words); otherwise the penultimate syllable,
  skipping a syllable whose vowel is a shva or chataf (those are never stressed), so לְךָ stays final. Source:
  *Ashkenazi Hebrew*, "In earlier centuries the stress in Ashkenazi Hebrew usually fell on the penultimate"
  (the "natural" register; the prescriptive Torah-reading register keeps milra and is not generated). Prefixed
  words (וּבְכָל, בְּשִׁבְתְּךָ) therefore get a stress a morphology-aware reader would not.
- **Ashkenazi final-vowel reduction:** an unstressed final open syllable written kamatz + he (or kamatz + silent
  alef) is read [ə] and written "eh": תּוֹרָה toyreh, מִצְוָה mitzveh, אַתָּה atteh. Source: *Ashkenazi Hebrew*, "The use
  of penultimate stress has led to the weakening of the final syllables of many words, often to schwa". Restricting
  it to the kamatz-he / kamatz-alef ending (so the 2ms suffix ־ךָ stays "-kho") is an **own** restriction. 1,220 records
  carry the flag `ashk-final-kamatz-reduced`. Note that `prayerwords.json` (also unreviewed) writes אַתָּה as "AH-toh" and
  תּוֹרָה as "TOY-roh / TOH-roh"; the two files disagree and a native reader must settle it.

### Known examples checked by the test
שַׁבָּת shabbat / shabbos · תּוֹרָה torah / toyreh · בְּרֵאשִׁית bereshit / bereishis (and IPA ʃa.ˈbat / ˈʃa.bɔs,
to.ˈʁa / ˈtoj.rə, be.ʁe.ˈʃit / bə.ˈrej.ʃis).

## Flags and the review CSV

Every record carries `flags`; `_review.csv` lists the records with at least one of the flags that mark a guess:

| Flag | Count | Meaning |
|---|---|---|
| `ipa-differs-from-words.json` | 136 | the rule-made Israeli IPA differs from the `words.json` ipa field beyond stress, glottal stops and the shva drop. Most are `words.json` entries whose ipa belongs to a different lemma (הָלַךְ with ipa /ˈhe.leχ/); both sides need a look |
| `possible-segolate` | 240 | see Stress |
| `words-ipa-syllable-count-differs` | 17 | the `words.json` ipa could not be aligned, so its stress mark was not used |
| `vav-cholam-consonantal` | 8 | vav with cholam after a vowelled letter, read as consonant + o (מִצְוֹת-type ambiguity) |
| `alef-vav-mater-repaired` | 71 | see vav |
| `kamatz-katan-before-chataf` | 2 | own rule |
| `aramaic` | 8 | Kaddish and Brich Shmei lines: Hebrew rules applied mechanically to Aramaic |
| `non-hebrew-token` | 8 | phrasebook templates containing "..." |
| `unpointed` | 2 | no niqqud in the source (קאפּ, אדני): consonants only, empty IPA |
| `he-patach-no-mappiq` | 1 | see he |

Other informational flags (not in the CSV): `ashk-final-kamatz-reduced`, `divine-name`, `kamatz-katan-list`,
`shva-heuristic-L3`, `words-ipa-colloquial-shva-drop`, `vav-dagesh-consonantal`.

## Not done / needs a person

- No native-speaker, cantor or teacher review of any value; no audio. Every record says so (`proofread:false`).
- Kamatz katan outside the four-word list and the chataf rule is misread as [a] (Israeli/Sephardi).
- Segolate and other mil'el nouns without existing stress data are read milra.
- Ashkenazi sub-dialects (Lithuanian [ej] cholam, German [au], [u] kamatz, uvular resh) and Sephardi sub-dialects
  (θ tav, ŋ ayin, Spanish-Portuguese β) are not generated.
- Colloquial Israeli (shva dropping, he dropping, intonation) is not generated.
- Shva rules T1-T5 of `shva.js` remain TODO there, so here too.
- Gemination is not transcribed. Cantillation is stripped; no pausal forms, no phrase-level stress.
- The app does not load these files yet; `precache` deliberately skips them.

## Commands
`node tools/pronunciation/build_variants.mjs` (writes), `--dry` (counts only); `node --test tests/pronunciation.variants.test.js`.
