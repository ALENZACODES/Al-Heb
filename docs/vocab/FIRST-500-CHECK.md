# First-500 check (words.json ranks 1-500)

Audit of the 500 highest-frequency records of `data/vocab/words.json` (`frequencyRank` 1-500), the words a beginner meets first. Judgement only; no Hebrew was written and no gloss was invented. Every row stays `proofread: false`; nothing here has been read by a native speaker. 2026-11-04.

**Follow-up, same day (section 10):** the missing basics were added or typed and ranked, the wrong-sense examples were replaced or removed, and two rank holders were lowered. That renumbered `frequencyRank` below rank 12, so every rank quoted in sections 1-9 is the rank before the follow-up (words.json and vocab5000.json).

How it was checked: a script over `words.json` (pointing, `heUnpointed`, POS, gloss, example fields, flags), the Wiktionary extract in `tools/vocab/.cache/kaikki-hebrew.jsonl` (POS and gloss vocabulary per pointed form, falling back to the unpointed spelling), `transliterate()` in all three traditions, the Compare lookup shards, the audio manifests, `audit-baseline.json`, and a by-eye read of all 500 rows with their Wiktionary glosses. The English-only example screen in section 4 is a heuristic read by one reviewer.

## What was fixed (mechanical, through `data/vocab/corrections.json`)

31 corrections (29 `en`, 2 `example`), applied with `node tools/vocab/apply_corrections.mjs`, then the dependants were rebuilt (`build_vocab5k.py`, `split-tiers.mjs`, `frequency`, `theme_packs`, `deck_order`, `attribution`, `review_pack`, the pronunciation builders, `tools/audio/build_manifest.mjs`, `src/speak/build.mjs`):

- 3 glosses had wiki markup or a usage-note pointer: rank 209 and 218 "(See usage note below.)", rank 473 `[[[in order that|in order]]]`.
- 22 glosses started with a capital letter for no reason (ranks 8, 29, 30, 41, 75, 138, 188, 223, 246, 250, 261, 291, 301, 314, 324, 341, 349, 379, 388, 405, 416, 440); proper nouns and "OK" were left alone.
- 4 verb glosses lacked "to" (ranks 160, 250, 456, 457).
- Rank 110 יֶלֶד had the gloss "a" (truncated); now "child, a kid, a boy", the gloss the 5,000-word build already had.
- 2 examples removed (ranks 5 and 41, see section 4).

Not changed: translit (0 mismatches), pointing (0 problems), flags, anything that needs a Hebrew reader's judgement.

## Summary

| check | result for ranks 1-500 |
|---|---|
| pointed | 500/500; unpointed field consistent |
| POS agrees with Wiktionary | 500/500 present in the source entry; 11 questions of fit (section 2) |
| gloss shares vocabulary with Wiktionary | 499/500 (the 1 is a tokenising artefact) |
| gloss defects | 3 markup, 22 capitals, 4 missing "to", 1 truncated: all fixed; 20 glosses over 45 characters |
| translit equals siddur/israeli rule | 500/500 |
| translit equals Compare lookup (doubling) | 433/500 (67 differ by gemination) |
| Compare lookup entry | 493/500 |
| in audio manifests | 478/500; recordings: 0 |
| example present | 499/500 |
| example sourced | 499/499 (Tatoeba or registry URL, licence given) |
| example sense checked | 0/499 (`senseChecked: false`); 33 judged wrong-sense here |
| hidden | 0 |
| duplicate groups touching 1-500 | 36 of 62 (vocab5000 ranks); 8 with both members inside |
| circular glosses | 0 of the 28 in the baseline; 1 unlisted (486 מִקְוֶה) |

## 1. Rank holders and duplicates (words.json ranks 1-500)

Frequency is counted per unpointed spelling, so a rare sense can sit on a common word's count. The ones below are judged from the English gloss, the matched example and the Wiktionary entry; none has been read by a Hebrew educator.

| rank | id, word | finding | proposed fix | native reviewer? |
|---|---|---|---|---|
| 5 | `ha3cf2c46` הִוָּה | form of היה (spelling הוה); gloss "to constitute" is a rare sense; occupies rank 5 | mark as `formOf` h2cd963e3 and drop from the teaching list (already `isForm` in vocab5000); next word takes the slot | yes |
| 31 | `hd5bcfcb8` נָבַל | "to wither" holds rank 31; no common word of that spelling | demote to the rare tail | yes |
| 42 | `h93f568f7` שֶׂה | "lamb" at rank 42 is almost certainly the count of a different word with this spelling; the example is "This is rather foolish" | demote; keep after common words | yes |
| 71 | `h5c96df63` מָן | "manna" holds the count of the preposition מן "from"; example is the preposition | add the preposition from Wiktionary at this rank, move "manna" to the tail (an addition, not a correction) | yes |
| 99 | `h8e3fbf43` שָׁם | verb "to assess" holds a slot that belongs to the adverb שָׁם "there" (rank 323); example is לשום | exchange ranks with `h` rank 323 | yes |
| 125 | `h1797f84f` צָר | verb "to shape" at 125; example is צרות "troubles" | demote | yes |
| 322 | `h6a579e02` טָח | "to daub" at 322; example is הבטחות "promises" | demote | yes |
| 326 | `h2f12d5bf` דָּר | "to dwell" (דָּר) at 326; example is דירה "apartment" | demote; check against 398 גָּר (same meaning, other spelling) | yes |
| 336 | `h7715384f` שָׁת | "to place, set" (שָׁת) at 336; example is תשתנה "will change" | demote | yes |
| 370 | `ha5b5601c` לוֹם | "a crowbar" at 370; example is הלום | demote | yes |
| 403 | `h277eae86` עֹל | "yoke" at 403; example is העלים "the leaves" | demote (the document JUDGEMENT.md already lists it) | yes |
| 481 | `hf4758d4d` רֹק | "saliva" at 481; example is רוק "rock (music)" | demote | yes |
| 452 | `hbe4076c4` כִי | Greek letter "chi" at 452; the count belongs to the conjunction כי (rank 21); example is כי "because" | remove from the beginner list, demote to the tail | yes |
| 487 | `hae413d41` רָעָה | "to herd" at 487; example is רעיה "wife" | demote | yes |
| 354 | `he9d6c9ab` כַּר | "cushion" at 354; example is כריך "sandwich" | demote | yes |
| 298 | `h7439bf9d` מְכָל | "container, bin" (מְכָל) at 298; example is מכל "from all" | demote | yes |
| 135 | `hba8920a3` חֻשַּׁב | passive (pu'al) "to be calculated" inherits the active verb's rank | rule in the build: pu'al/huf'al/nif'al-passive get the base verb rank +1,000 (JUDGEMENT.md section 1) | no (build rule) |
| 194 | `h0e071b5c` יֻדַּע | passive "to be informed", same | as above | no (build rule) |
| 362 | `h5ba7d704` נוֹסַף | "to be added" (nif'al), same | as above | no (build rule) |
| 400 | `hfbe29a09` דֻּבַּר | passive "to be spoken", same | as above | no (build rule) |
| 494 | `hb3377769` הוּסַף | passive "to be added", same | as above | no (build rule) |
| 405 | `hdcbb6117` אִישׁ | pronoun "Anyone" (אִישׁ) at 405 duplicates the noun אִישׁ "man" at rank 51 (same pointed form) | keep as a sense of rank 51 or demote | yes |
| 327 | `hd2aa4e1a` טוֹב | adverb טוֹב "well, good" at 327 duplicates adjective טוֹב at 28 | fold into rank 28 as `posAlt: adv` | yes |
| 414 | `hd1ed8938` שָׁנָה | verb שָׁנָה "to repeat" at 414 shares the pointed form of the noun "year" (rank 58) | keep; mark the pair as a homograph (already tagged) | no |
| 223 | `h324e6752` דֶּרֶךְ | prepositional דֶּרֶךְ "through, via" duplicates noun דֶּרֶךְ "road" (rank 217) | fold into rank 217 as `posAlt: prep` | yes |
| 292 | `h1a07a738` פָּשׁוּט | adjective פָּשׁוּט "simple" duplicates adverb פָּשׁוּט "simply" (rank 201) | keep one entry with `posAlt` | yes |
| 437 | `h397fb32e` נָכוֹן | adverb נָכוֹן "correctly" duplicates adjective נָכוֹן (rank 261) | fold into rank 261 | yes |
| 245 | `h21e009ad` אַף | noun אַף "nose" (245) duplicates אַף "even" (157) | homograph; keep both, rank by sense | no |

## 2. Part of speech

The POS in words.json is Wiktionary's heading. All 500 have a POS and every POS is present in the Wiktionary entry for that spelling (checked by script, 0 mismatches), so these are questions of fit, not of agreement with the source.

| rank | id, word | finding | proposed fix | native reviewer? |
|---|---|---|---|---|
| 22 | `ha18100a8` יֵשׁ | `pos: adv` for the existential יֵשׁ | `particle` (existential), as vocab5000 already has | no (vocab5000 override exists) |
| 55 | `h8875eeda` כָּךְ | `pos: pron` "that" for כָּךְ | adverb "so, thus" (vocab5000 override exists) | no |
| 44 | `ha5429c9f` יוֹתֵר | `pos: det` "more" (יוֹתֵר) | adverb | yes |
| 157 | `ha6aca44b` אַף | `pos: det` "even" (אַף) | particle/adverb | yes |
| 197 | `h97be2e78` אֲפִלּוּ | `pos: prep` "even" (אֲפִלּוּ) | particle/adverb | yes |
| 39 | `h66252016` אֶחָד | `pos: pron` "one" (אֶחָד); the numeral is a separate record at rank 1179 | numeral/determiner | yes |
| 143 | `heb8a3bc1` הֵן | `particle` "lo! as expressing surprise" (הֵן); the everyday meaning "they (f.)" is not shown | pronoun "they (f.)" (vocab5000 override exists) | yes |
| 246 | `hd6219bc1` חוּץ | noun with gloss "Outside (of)" (חוּץ) | adverb/preposition "outside" | yes |
| 244 | `h7b44b8a0` עָשָׂר | num with gloss "-teen" (עָשָׂר), a bound form | gloss "ten (in compounds 11-19)"; check | yes |
| 17 | `h5aed8aaa` יָכֹל | verb with gloss "can, to be able to" (modal) | keep; the missing "to" is intentional for modals | no |
| 165 | `h8ea4d152` לַעֲזָאזֵל | interjection לַעֲזָאזֵל, mild curse; the unsuitable example was already removed | keep hidden from first-day lists or tag `colloquial` | yes |

## 3. Gloss plausibility (compared with the Wiktionary extract in tools/vocab/.cache/kaikki-hebrew.jsonl)

Script check: every gloss shares at least one content word with some Wiktionary sense of that pointed form, except rank 7 (הָיָה "to be"; Wiktionary writes "to be:" with a colon and a sub-list, so this is a tokenising artefact, not a mismatch). So no gloss is invented. The problems are sense order, length, register, and a few clean-ups.

| rank | id, word | finding | proposed fix | native reviewer? |
|---|---|---|---|---|
| 1 | `h7c9d2ffe` אֵת | gloss is a grammar description, alt "to, with" is the homograph את "with" | "(marks a definite direct object; not translated)" (vocab5000 has it) | yes |
| 47 | `h1a3574d3` יָד | first gloss "arm", beginners need "hand" | "hand; arm" | yes |
| 110 | `h1301ecc3` יֶלֶד | was "a" (truncated) - FIXED to "child, a kid, a boy" | a native reviewer should decide "child; boy" and whether "(male)" matters | yes |
| 226 | `h448b5d1a` יָרָה | gloss "to flow as water (that is, to rain)" is the rare sense; the matched example is "shot him" | put the shoot/throw sense first | yes |
| 231 | `hb5c944d2` עָרַב | gloss "to guarantee, promise vow"; also "to wane" etc.; example is "mix business with pleasure" | check order of senses | yes |
| 232 | `hf8d6ef2c` גָּמַר | alt text includes a vulgar sense (orgasm) | drop vulgar alt from the learner gloss; keep "to finish, complete" | yes |
| 420 | `h327ac347` שָׁכַב | alt "to have sex" listed beside "to lie down" | move the sexual sense out of the beginner gloss | yes |
| 397 | `h5b57ed79` בָּשָׂר | alt "male genitals" | drop from the beginner gloss | yes |
| 41 | `heabe1020` יָא | gloss "Vocative particle preceding a noun, especially a slur or pejorative"; rank 41 is implausible for this word | hide or demote; register wording is for a native speaker | yes |
| 75 | `h6ad3ddd8` סֵדֶר | gloss is a long definition; vocab5000 has "order, arrangement; the Passover seder" | take the vocab5000 gloss | yes |
| 102 | `hfcd9d9b6` יָשַׁב | gloss is a long definition | "to sit; to live (somewhere)" (JUDGEMENT.md) | yes |
| 169 | `h3c9f9b9b` אֹהֶל | gloss is the technical ritual sense of אֹהֶל; example says "tent" | "tent" | yes |
| 192 | `hd83852fd` הֵבִין | "to understand, to have understanding, to be one who understands" | "to understand" | no (shortening only) |
| 486 | `h19702c85` מִקְוֶה | circular: gloss "mikveh" equals the transliteration | plain English gloss (for example "ritual bath"), reviewer to confirm | yes |
| 187 | `h3b32dc48` גּוֹי | "gentile (a non-Jewish person), goy": register is sensitive | review wording and whether this belongs in the first 500 | yes |
| 190 | `h6b853dd5` אֱלֹהִים | "a god" for אֱלֹהִים and 57 "a god" for אֱלוֹהַּ, 215 "god" for אֵל: indistinguishable glosses; divine-name conventions apply | use the sensitivity lane conventions (docs/sensitivity/CONVENTIONS.md) | yes |
| 344 | `hdb3c45eb` רֶגֶל | the example for "foot, leg" is "You have very sexy legs." | replace with a neutral example | yes |

## 4. Example sentences

Counts (script): 499 of 500 have an example (rank 165 לַעֲזָאזֵל has none since the sensitivity lane removed its profane example); all 499 carry a source with a Tatoeba or registry URL and a licence line; 0 unsourced; 487 are unpointed Tatoeba text (`hePointed: false`) and have no transliteration; all 499 have `senseChecked: false`; 86 have `ambiguousMatch: true`; 12 have no English (Tanakh verses with `noTranslation`: ranks 114, 200, 203, 293, 309, 358, 404, 411, 429, 447, 468, 473). The list below is every example whose English line clearly does not translate the headword's sense, judged from the English only. A beginner should not meet these first; there are probably more among the 86 ambiguous matches.

| rank | id, word | finding | proposed fix | native reviewer? |
|---|---|---|---|---|
| 5 | `ha3cf2c46` הִוָּה | FIXED (example removed): matched the four-letter divine name in "Jehovah's Witnesses", unrelated to this word | done | no |
| 41 | `heabe1020` יָא | FIXED (example removed): match was the single letter י inside the abbreviation י"ש | done | no |
| 31 | `hd5bcfcb8` נָבַל | example matched on spelling only; sentence uses תבל "world", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 42 | `h93f568f7` שֶׂה | example matched on spelling only; sentence uses שה, English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 71 | `h5c96df63` מָן | example matched on spelling only; sentence uses מן "from", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 92 | `h22a20328` כִּוֵּן | example matched on spelling only; sentence uses מכונת "machine of", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 99 | `h8e3fbf43` שָׁם | example matched on spelling only; sentence uses לשום, English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 125 | `h1797f84f` צָר | example matched on spelling only; sentence uses צרות "troubles", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 135 | `hba8920a3` חֻשַּׁב | example matched on spelling only; sentence uses מחשבות "thoughts", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 148 | `h13c6683f` הֵכִיל | example matched on spelling only; sentence uses הכל "everything", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 178 | `h0aeb9756` דָּמַם | example matched on spelling only; sentence uses דם "blood", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 187 | `h3b32dc48` גּוֹי | example matched on spelling only; sentence uses שגוי "wrong", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 229 | `h15d39df8` עֹלָה | example matched on spelling only; sentence uses עלות "break of dawn", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 241 | `h2b39dcf2` בַּד | example matched on spelling only; sentence uses הבד, English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 285 | `h6c9f6f29` רָבָה | example matched on spelling only; sentence uses רובים "guns", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 311 | `hea4f6fcc` חֵן | example matched on spelling only; sentence uses חנות "shop", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 322 | `h6a579e02` טָח | example matched on spelling only; sentence uses הבטחות "promises", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 326 | `h2f12d5bf` דָּר | example matched on spelling only; sentence uses דירה "apartment", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 336 | `h7715384f` שָׁת | example matched on spelling only; sentence uses תשתנה "will change", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 347 | `h3e8123a0` וִתֵּר | example matched on spelling only; sentence uses מותר "allowed", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 354 | `he9d6c9ab` כַּר | example matched on spelling only; sentence uses כריך "sandwich", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 369 | `h84ac4111` שָׂרָה | example matched on spelling only; sentence uses ישרה, English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 370 | `ha5b5601c` לוֹם | example matched on spelling only; sentence uses הלום, English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 381 | `h264da105` שָׂבַע | example matched on spelling only; sentence uses שבעים "seventy", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 393 | `h40e5a2de` אַיֵּה | example matched on spelling only; sentence uses איך "how", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 395 | `he1477da0` גֵּר | example matched on spelling only; sentence uses גריי "Grey", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 396 | `h0cdd730a` אִוָּה | example matched on spelling only; sentence uses אוי "oh no", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 401 | `h8aa6404d` אַיִל | example matched on spelling only; sentence uses איל, English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 403 | `h277eae86` עֹל | example matched on spelling only; sentence uses העלים "the leaves", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 425 | `hab586bfa` תִּוֵּךְ | example matched on spelling only; sentence uses מתוך "out of", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 459 | `h60dd9be7` מִיֵּן | example matched on spelling only; sentence uses ימין "right", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 474 | `h3674f19e` נֵס | example matched on spelling only; sentence uses נסיך "prince", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 481 | `hf4758d4d` רֹק | example matched on spelling only; sentence uses רוק "rock", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 486 | `h19702c85` מִקְוֶה | example matched on spelling only; sentence uses מקווה "hopes", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |
| 487 | `hae413d41` רָעָה | example matched on spelling only; sentence uses רעיה "wife", English translation does not contain the headword's sense | replace with a sentence for the right sense, or drop the example | yes |

## 5. Transliteration and pronunciation, per engine

- Stored `translit` vs `transliterate(he, {scheme:'siddur', tradition:'israeli'})` (the rule `vocab.corrections.test.js` enforces): 0 differences in ranks 1-500 (11 of the 173 translit corrections touch these ranks).
- The Sephardi scheme output is identical to the Israeli one for all 500 words; the Ashkenazi output differs for 320 of 500 (for example אָמַר amar / omar, אֵת et / eis), as designed. These Ashkenazi forms were not reviewed.
- Doubling (resolved, see `docs/pronunciation/DOUBLING-POLICY.md`): the stored translit already wrote one consonant; the Compare lookup now does too (`GEMINATE = false` in `build_variants.mjs`). Before: 67 of 500 differed; after: 0 (test in `tests/pronunciation.compare.test.js`). Which tradition really doubles is unverified. Native reviewer: yes, for the Sephardi and Ashkenazi claims.
- Compare lookup coverage (resolved): 493 of 500 before, 500 of 500 after. The 7 prefix clitics were already in the table under the bare letter; the lookup key did not drop the maqaf in `he`, so `wordKey()` now does. Their IPA marks the single syllable as stressed, which is wrong for a clitic. Native reviewer: yes, for clitic stress.
- Stored `ipa`: missing for 192 of 500 (unchanged); the 23 mismatching values listed below were replaced by the Israeli IPA of the rule builder (`tools/vocab/ipa_rule_corrections.mjs`, then `apply_corrections.mjs`): 23 mismatches before, 0 after (same rank list). The old values were for a different reading: הָלַךְ (34) `/ˈhe.leχ/`, כְּמוֹ (50) `/kmo/`, זְמַן (61) `/zman/`, לָקַח (72) `/ˈlekaχ/`, לִפְנֵי (86), שְׁנַיִם (104), דֶּרֶךְ (217, 223) `/daˈʁaχ/`, יָלַד (227) `/ˈje.led/`, עֹלָה (229), עָרַב (231), עָרַךְ (237), דַּבָּר (248), הָפַךְ (289), זֶרַע (307), בְּרִית (312), שְׁלוֹשָׁה (313), צָדַק (348), הֶחְזִיק (399), כְּבָר (409), יָצַר (410), רָכַב (483), סָתַם (496). The new values are careful-reading forms (shva kept), not everyday speech for כְּמוֹ, זְמַן, בְּרִית, כְּבָר. Segolate stress for דֶּרֶךְ and זֶרַע is forced inside that tool (own knowledge). Native reviewer: yes.
- Audio: `data/audio/manifest-words-{israeli,sephardi,ashkenazi}.json` contain 478 of the 500 ids; every entry has `status: missing` (no recording or TTS file exists). Not in the manifest: ranks 263, 308, 377, 378, 380, 398, 400, 405, 414, 437, 443, 446, 452, 454, 463, 468, 470, 481, 488, 489, 490, 500. Proposed fix: find out why the manifest builder skips them (it takes ids from lesson/pack lanes, not from words.json) and include all of 1-500. Native reviewer: no.

## 6. Pointed vs unpointed completeness

All 500 headwords carry niqqud (`he`), 0 are unpointed; `heUnpointed` equals `he` with niqqud and maqaf removed for all 500; no doubled sheva, all NFC. The 7 proclitics carry a trailing maqaf in `he` (לְ־ בְּ־ מִ־ שֶׁ־ הֲ־ וְ־ דְּ־) and not in `heUnpointed`. All 500 have `pointedFromSource: true` (Wiktionary); none is proofread. The three entries that have no points in the 5,000-word build (עכשיו, יום שישי, שחור) are not in 1-500 of words.json (עַכְשָׁו, rank 52, is pointed). Pointing was not checked against a second source. Native reviewer: yes, for the pointing of every entry.

## 7. Duplicate groups and circular glosses from audit-baseline.json

The baseline keys refer to the 5,000-word build (`vocab5000.json`), whose ranks differ from words.json by up to about 14 (14 additions were inserted near the top). Using vocab5000 ranks 1-500, or the words.json rank of the same pointed form:

- `duplicate-lemma-pointed`: 36 of the 62 groups have a member in ranks 1-500 (vocab5000 rank, then rank of the other members): את 1/1454, אני 6/696, כי 23/2602, יש 24/1792, טוב 30/331, כאן 37/2125/2126, רק 40/3649, אחד 41/1221, בא 45/4374, איש 54/409, עד 57/4448, קרה 59/4281, שנה 61/418, אי 66/1790/2841, מת 83/3914, שם 102/327, רגע 116/4925, מאוד 125/2282, אל 136/3564, חי 149/978, אף 160/248, ממש 173/4458, מאה 184/2620, תמיד 191/3876, נא 198/3892, פשוט 204/295, דרך 220/226, שעה 262/3187, נכון 264/441, אלף 282/517, צבא 286/733, נח 395/2533, קרוב 453/730, פנה 457/2147, פרה 464/1730, רעה 490/2522. Both members are inside 1-500 for: טוב (30/331), שנה (61/418), איש (54/409), פשוט (204/295), דרך (220/226), נכון (264/441), שם (102/327), אף (160/248). Most are POS splits of one Wiktionary spelling; the second member should be a `posAlt` or `sameSpelling` cross-reference, not a second teaching slot (see section 1). Native reviewer: yes for which sense to keep.
- `circular-gloss`: 28 baseline hits; none has a vocab5000 rank at or below 500 (the lowest is הא, rank 853). The loanword hits (bank, virus, robot, ...) are correct as they are; the ones that need a plain gloss (גאון, עמר, חצפה, שיך, נקוד, בלבול, הא) are all beyond rank 500. Inside words.json 1-500 there is one circular gloss that the audit check does not list: מִקְוֶה (rank 486, gloss "mikveh"); see section 3.
- words.json 1-500 has 97 entries that share an unpointed spelling with another entry inside 1-500 (the homograph groups above plus mere spelling twins such as הוא/הוא); `sameSpelling` is not set in words.json (only in vocab5000).

## 8. Hidden and sensitive flags

- `flags.hidden`: none of the 500 is hidden (the two hidden records, h974f415a and h8e35f713, are outside 1-500).
- `needsReview: true` on 263 of 500 (177 homograph; 52 homograph plus example token also fits another entry; 34 example token also fits another entry).
- Divine-name convention: no headword in 1-500 is the four-letter name; the one example that contained it (rank 5) was removed (see section 4). אֱלוֹהַּ (57), אֱלֹהִים (190), אֵל (215), אָדוֹן (184) are ordinary vocabulary under the sensitivity lane's conventions; the glosses are not distinguished (section 3).
- Profanity/sexual content among 1-500, none hidden: 165 לַעֲזָאזֵל (mild curse, example already removed), 232 and 420 (vulgar/sexual senses in the alt gloss), 397 ("male genitals" in the alt), 344 (example "very sexy legs"), 41 (gloss mentions slurs), 187 (goy). Proposed fix: the sensitivity lane should decide whether to hide or only trim alt glosses. Native reviewer: yes.
- Applied 2026-11-04 (sensitivity pass, through `corrections.json` and `overrides.json`): hidden (`flags.hidden`, ranks kept) 41 יָא and 165 לַעֲזָאזֵל, in `words.json` and the 5,000 (overrides `vedf291d8`, `v96491b44`); alt senses removed 232 ("to cum, ejaculate, have an orgasm"), 420 ("to have sex"), 397 ("male genitals"); example removed 344 ("You have very sexy legs."), nothing written in its place. Rank 187 גּוֹי is NOT reworded: the Wiktionary snapshot (`kaikki-hebrew.jsonl`) gives only "gentile (a non-Jewish person), goy" tagged Judaism and has no offensive or derogatory note, so "can be offensive in some uses" would not come from the source. It stays as is and is a question for a reviewer (OPEN.md, REVIEW-FOR-CLERGY.md E2). Beyond the first 500, see the keyword scan in `docs/sensitivity/OPEN.md`.

## 9. Basic words missing from words.json 1-500

Spelling lookups in words.json (not an exhaustive gap analysis): there is no record at all for הם "they", אנחנו "we", זאת, לכן, בלי, ללא, שניים/שתיים; כל "all", מים "water", בבקשה, לי, אחת, שלוש, ארבע, תשע exist but with `pos: unknown` and no rank; למה "why" is at rank 5177, כמה "how many" has only a verb record (5979), בוקר "morning" is a cowboy at 2663, כלב "dog" is absent. `vocab5000.json` already adds 14 of these by hand (`additions` in overrides.json) with approximate priorities, so the 500-word beginner tier there is better than words.json 1-500. Proposed fix: add the missing basics as ranked records through the same `additions` mechanism, then regenerate words.json from the build, which is a ranking decision and was not done here. Native reviewer: yes, for the order.

## 10. Follow-up: basics added, examples fixed, rank holders (2026-11-04)

All of it went through `data/vocab/corrections.json` (90 new entries, applied by `node tools/vocab/apply_corrections.mjs`, which gained two kinds: `(add)` creates a record, `(rerank)` re-sorts by the build rule `min(modernRank, 1.5 x readRank)` and renumbers `frequencyRank`/`level` 1..n, closing the two gaps left by the removed duplicates). Dependants were rebuilt afterwards. Nothing was read by a native speaker; every touched record carries a `needs-native-review` note.

### 10.1 Basics (section 9)

Glosses, pointing and part of speech are the Wiktionary snapshot's (`tools/vocab/.cache/kaikki-hebrew.jsonl`); the correction `reason` quotes the entry. `ipa` stays null and there is no example for the six new records.

| word | action | pos | gloss | rank now (before) |
|---|---|---|---|---|
| הֵם | added | pron | they | 33 (none) |
| אֲנַחְנוּ | added | pron | we | 29 (none) |
| זֹאת | added | pron/det | this (feminine) | 55 (none) |
| לָכֵן | added | adv | therefore, so | 556 (none) |
| בְּלִי | added | prep | without | 358 (none) |
| לְלֹא | added | prep | without | 462 (none) |
| כָּל | typed, ranked | noun (Wiktionary heading) | all, whole, everything | 18 (unknown) |
| מַיִם | typed, ranked | noun, m pl | water | 530 (unknown) |
| בְּבַקָּשָׁה | typed, ranked | intj | please / you're welcome | 145 (unknown) |
| אַחַת, שְׁתַּיִם, שָׁלוֹשׁ, אַרְבַּע, תֵּשַׁע, שִׁשָּׁה | typed, ranked | num (f. except שִׁשָּׁה) | one/two/three/four/nine (f.), six | 193, 885, 543, 952, 1828, 1457 (unknown) |

Rank rule (frequency source only): `modernRank` = 1 + the number of lemma scores above the word's mass, on the scale of `tools/vocab/build_lexicon.py` (the 9,855 positive lemma scores of a re-run of its modern-frequency step, nothing written). The mass is the count in `he_full.txt` (OpenSubtitles) of the exact spelling plus the same word after one proclitic (ו ה ב ל מ כ ש) when that token is not itself a Wiktionary headword. The stage run did not rank these words (its attribution gave לכן, בלי, ללא, בבקשה almost no mass because it read them as ל+כן, ב+לי, ...), so the counts are raw token counts, not the stage's lemma scores; the scale mix is approximate. מים lands at 530, outside the first 500, where vocab5000 has a hand-picked 304. Not done: לי and לְךָ-type forms (forms of ל, listed under it in vocab5000), שתיים/שניים (שְׁנַיִם, rank 104, already exists), and the other unknown-typed phrasebook and prayer words.

How vocab5000.json patched them: not by ranking. `additions` in `overrides.json` inserted הם, אנחנו, כל, מים (and 10 nouns) at hand-picked priorities (12, 50, 20, 300); זאת/אלה were `forms` under זה; the feminine numerals were `forms` of the masculine numerals; לכן, בלי, ללא and בבקשה were not among the 14 additions. With words.json now carrying ranked records, `build_vocab5k.py` finds הם, אנחנו and מים in its pool (additions inserted: 14 -> 10), and takes זאת, לכן, בלי, ללא, בבקשה, אחת, שתים, שלוש, ארבע, תשע, שישה/ששה from it. The hand `additions` entry for כל (pos det) would now list the word twice, so it was removed from `overrides.json` and an override on the pool entry (`v620a2741`) gives it the same typing (det, "all, every, whole", function). Side effect: the build is capped at 5,000, so the 11 last pool words fell out (רשלנות ... ריצה) and 11 words came in (the ones listed above); 4,864 entries kept their id and changed rank, and no (lemma, pointed form, pos) is listed twice.

### 10.2 The 33 wrong-sense examples (section 4)

Rule used: the Tatoeba snapshot (`heb_sentences_detailed.tsv` + links), a sentence of 2-8 Hebrew tokens and an English line of 8-80 characters whose token is a form of the headword (forms from the Wiktionary entry) AND whose English line carries the gloss sense. `senseChecked: true` was set only after reading that English line against the gloss (alt gloss where the note says so); those 13 also carry `flags.needsNativeReview` and a `note` on the example. The other 20 have no such sentence and the example is now null. Two replacements have only 2 tokens (ירבו כמותך, איה בני) because the snapshot has no 3-8 token sentence for that sense; a longer candidate existed for צָר (2074710, 11 tokens, 92 characters) and חֻשַּׁב (1576369, 19 tokens) and was not used.

| replaced (13) | Tatoeba id | English line |
|---|---|---|
| נָבַל | 2132272 | Flowers wither without water. |
| הֵכִיל | 1725639 | The chest contained gold coins. |
| גּוֹי | 13577778 | Tom is a gentile. |
| בַּד | 1447454 | This fabric is made of cotton. |
| רָבָה | 565013 | They'll multiply just like you. |
| חֵן | 13083815 | Tom has charm. |
| וִתֵּר | 1390461 | She gave up her plans against her will. |
| כַּר | 5511417 | Tom fell asleep the moment his head hit the pillow. (alt gloss "pillow") |
| לוֹם | 13083983 | Get a crowbar. |
| שָׂבַע | 5715037 | We ate until we were satisfied. (alt gloss "to be satisfied") |
| אַיֵּה | 2310391 | Where is my son? |
| נֵס | 1829870 | Our existence is a miracle in itself. |
| רָעָה | 1366471 | The cows grazed in the pasture. (second Wiktionary sense, kept as alt gloss) |

Removed (20), no matching sentence in the snapshot: שֶׂה, מָן, כִּוֵּן (the sentences found mean "aim", not "direct (as traffic)"), שָׁם (verb), צָר, חֻשַּׁב, דָּמַם (found: "All is still", gloss is "to pause"), עֹלָה, טָח, דָּר, שָׁת, שָׂרָה, גֵּר (found: מהגר "immigrant", another word), אִוָּה, אַיִל, עֹל, תִּוֵּךְ, מִיֵּן, רֹק, מִקְוֶה. No example was found for the right sense in these; the Hebrew token was not guessed.

### 10.3 Rank holders (section 1)

Only fixes that the frequency source itself proves were applied. Test used (modern side, from the attribution run of `build_lexicon.py` with the same dictionary): the share of the entry's modern mass that comes from tokens which are not its own spelling and are the headword of another entry; applied at 90% or more.

| rank (before -> now) | record | result |
|---|---|---|
| 31 -> 853 | נָבַל "to wither" | APPLIED: 99% of its mass (712,381 of 720,657, 704,684 of it the token אבל "but") is tokens that are other entries' headwords and not its own spelling; the rest (8,276, including 1,114 for its own spelling) supports modernRank 1,521 (was 24); the read side (readRank 424) now sets its priority. |
| 370 -> 2489 | לוֹם "a crowbar" | APPLIED: 93% of its mass (73,166 of 78,771) is כלום and שלום read as proclitic + לום; the rest (5,605, including 180 for its own spelling) supports modernRank 1,906 (was 279). |
| 5, 42, 125, 336, 354, 298, 452, 487 | הִוָּה, שֶׂה, צָר, שָׁת, כַּר, מְכָל, כִי (chi), רָעָה | not applied: priority comes from the Tanakh/prayer side (readRank), which the OpenSubtitles counts cannot test. הִוָּה as a form of היה is already `isForm` in vocab5000. |
| 71 | מָן "manna" | not applied: the token מן is its own spelling, so the count cannot say how much is "from". Adding מִן "from" would count the same tokens twice. |
| 99 | שָׁם verb | not applied: 43% of the mass is from other entries' headwords (שום 98,108) and 32% is its own spelling שם, shared with the adverb; below 90%. Swap with the adverb (323) still proposed. |
| 322, 326 | טָח, דָּר | not applied: 68% and 25% of the mass is from other entries' headwords. |
| 92 | כִּוֵּן | not applied: 78% (נכון 213,841 of 312,063), below 90%. |
| 403, 481 | עֹל, רֹק | not applied: most of the mass is the shared spelling על / רק itself (22,344 and 44,787 of 68,710 and 57,045), which the count cannot split. |
| 135, 194, 362, 400, 494 | passives | not applied: a build rule (base rank +1,000), not a frequency fact. |
| 405, 327, 414, 223, 292, 437, 245 | homograph duplicates | not applied: folding into `posAlt` is a schema decision. |

The two lowered records keep their old `modernRank` neighbours unchanged (the modernRank column of other records was not renumbered), so modernRank is no longer a gap-free rank.

### 10.4 What the renumbering touched

`frequencyRank` of 6,025 records (all below rank 12; contiguous 1..6,042 now, 6,042 ranked records), their `level` where a band edge was crossed, 139 pack files, `packs.json` (medianRank, level), `index.json`, `meta.json` (6,303 records), `frequency.json`, the themes, `deck-order.json`, `attribution.json` and the review sheets, vocab5000.json and its tier files, the pronunciation variants, derived and runtime data, the audio manifests and `data/speak`. Tests changed: `vocab.corrections.test.js` (counts, new kinds, three new tests), `vocab.audit.test.js` (rank 937 is no longer hard-coded), the audit baseline (`--write-baseline`: one circular-gloss hit fell out of the 5,000), `ATTRIBUTION.md` counts. Counts in `REVIEW-PACK.md` and `JUDGEMENT.md` were later refreshed to the 6,303-record state (REVIEW-PACK flag table and frequency figures from the builders' output; JUDGEMENT only the record totals, its ranked tables were not re-derived and may cite pre-shift ranks).
