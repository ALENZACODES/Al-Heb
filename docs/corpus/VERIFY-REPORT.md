# Corpus text verification report

Generated 2026-11-04 by `tools/corpus/verify_texts.mjs` from `data/corpus/registry.json` (built 2026-11-03) and `data/corpus/source-snapshot.json` (fetched 2026-11-03T23:45:12Z). Regenerate with `node tools/corpus/verify_texts.mjs`; `tests/corpus.verify.test.js` re-runs the same checks.

These are machine checks of character-level consistency and of agreement with the cited source files. They are not proofreading by a Hebrew educator, and nothing here changes a licence label; see `docs/corpus/LICENSES.md`.

## 1. Counts

| Check | Count |
|---|---|
| Records | 70 (torah 28, siddur 42) |
| Records with a hard failure (stray characters, mark placement, final forms, maqaf/sof pasuq, NFC) | 0 |
| Records with warnings only (dagesh on alef/ayin) | 0 |
| UXLC cross-check (tools/vocab/.cache/tanach) | equal 27, no-ref 41, clip 2 |
| Snapshot re-derivation (source-snapshot.json raw lines through normalize.js) | equal 66, clip 4 |
| Hebrew licence label taken from Sefaria metadata (unverified) | 42 |
| English licence label (JPS 1917 "Public Domain") taken from Sefaria metadata (unverified) | 26 |
| Metsudah siddur (1981) records, labelled CC-BY by Sefaria | 21 |
| Licence label "Public Domain / copy without restriction (tanach.us/License.html)" | 28 |
| Licence label "CC-BY" | 21 |
| Licence label "CC0" | 15 |
| Licence label "Public Domain" | 6 |

Cross-check statuses: `equal` every line equals the UXLC verse after the registry normalisation; `clip` the record is a contiguous run of words inside the verse range (records that quote part of a verse); `mismatch` neither; `no-ref` the ref is not Book chapter:verse; `no-xml` the UXLC cache is not on disk (it is gitignored, so a fresh clone shows this). Snapshot statuses: `equal` re-derived from the raw snapshot line with the record's `transforms`; `clip` a word run of that derivation; `derived` the record is derived from another record and has no snapshot item.

## 2. Per-record table

| id | ref | cat | letters | words | maqaf | sof pasuq | failures | warnings | UXLC | snapshot |
|---|---|---|---|---|---|---|---|---|---|---|
| `bless-priestly-1` | Numbers 6:24 | torah | 15 | 3 | 0 | 1 | - | - | equal | equal |
| `bless-priestly-2` | Numbers 6:25 | torah | 20 | 5 | 0 | 1 | - | - | equal | equal |
| `bless-priestly-3` | Numbers 6:26 | torah | 25 | 7 | 0 | 1 | - | - | equal | equal |
| `shema-1` | Deuteronomy 6:4 | torah | 25 | 6 | 0 | 1 | - | - | equal | equal |
| `vahavta-1` | Deuteronomy 6:5 | torah | 39 | 10 | 3 | 1 | - | - | equal | equal |
| `vahavta-2` | Deuteronomy 6:6-7 | torah | 85 | 19 | 1 | 2 | - | - | equal | equal |
| `vahavta-full` | Deuteronomy 6:5-9 | torah | 180 | 42 | 6 | 5 | - | - | equal | equal |
| `shema-vahavta` | Deuteronomy 6:4-9 | torah | 205 | 48 | 6 | 6 | - | - | equal | equal |
| `shema-2` | Siddur: Baruch shem kevod malchuto | siddur | 24 | 6 | 0 | 1 | - | - | no-ref | equal |
| `bless-formula-1` | Siddur: blessing formula | siddur | 25 | 6 | 0 | 0 | - | - | no-ref | clip |
| `mah-tovu-1` | Numbers 24:5 | torah | 26 | 6 | 1 | 1 | - | - | equal | equal |
| `mi-chamocha-1` | Exodus 15:11 | torah | 42 | 12 | 1 | 1 | - | - | equal | equal |
| `num-12-13` | Numbers 12:13 (second half) | torah | 11 | 5 | 0 | 1 | - | - | clip | clip |
| `kiddush-gen-2-1-3` | Genesis 2:1-3 | torah | 144 | 35 | 5 | 3 | - | - | equal | equal |
| `kiddush-wine-1` | Siddur: blessing over wine | siddur | 36 | 9 | 0 | 1 | - | - | no-ref | equal |
| `hamotzi` | Siddur: HaMotzi | siddur | 40 | 10 | 0 | 1 | - | - | no-ref | equal |
| `candle-shabbat` | Siddur: Shabbat candle blessing | siddur | 58 | 14 | 0 | 1 | - | - | no-ref | equal |
| `torah-bless-1` | Siddur: Torah blessing (asher bachar banu) | siddur | 76 | 20 | 2 | 1 | - | - | no-ref | equal |
| `torah-barchu` | Siddur: Barchu before the Torah reading | siddur | 36 | 9 | 0 | 2 | - | - | no-ref | equal |
| `torah-bless-2` | Siddur: Torah blessing after the reading | siddur | 78 | 20 | 0 | 2 | - | - | no-ref | equal |
| `amidah-lips` | Psalm 51:17 (Amidah preface) | siddur | 24 | 6 | 0 | 1 | - | - | equal | equal |
| `avot-1` | Siddur: Amidah, first blessing (Avot) | siddur | 162 | 37 | 0 | 2 | - | - | no-ref | clip |
| `aleinu-1` | Siddur: Aleinu (first paragraph) | siddur | 344 | 81 | 4 | 1 | - | - | no-ref | equal |
| `modeh-ani-1` | Siddur: Modeh Ani | siddur | 48 | 12 | 0 | 1 | - | - | no-ref | equal |
| `adon-olam-1` | Siddur: Adon Olam | siddur | 274 | 72 | 0 | 10 | - | - | no-ref | equal |
| `kaddish-1` | Siddur: Mourner's Kaddish | siddur | 337 | 76 | 7 | 4 | - | - | no-ref | equal |
| `birkat-hamazon-1` | Siddur: Birkat Hamazon, first blessing (opening) | siddur | 84 | 22 | 0 | 1 | - | - | no-ref | clip |
| `ein-kamocha` | Psalm 86:8 | torah | 27 | 6 | 1 | 1 | - | - | equal | equal |
| `malchutcha` | Psalm 145:13 | torah | 35 | 8 | 2 | 1 | - | - | equal | equal |
| `adonai-oz` | Psalm 29:11 | torah | 31 | 9 | 1 | 1 | - | - | equal | equal |
| `gadlu` | Psalm 34:4 | torah | 26 | 6 | 0 | 1 | - | - | equal | equal |
| `yehalelu` | Psalm 148:13-14 | torah | 85 | 24 | 6 | 2 | - | - | equal | equal |
| `hashivenu` | Lamentations 5:21 | torah | 32 | 7 | 0 | 1 | - | - | equal | equal |
| `kedushah-kadosh` | Isaiah 6:3 | torah | 49 | 14 | 2 | 1 | - | - | equal | equal |
| `kedushah-baruch` | Ezekiel 3:12 (last three words) | torah | 18 | 4 | 1 | 1 | - | - | clip | equal |
| `kedushah-yimloch` | Psalm 146:10 | torah | 34 | 9 | 1 | 1 | - | - | equal | equal |
| `kiddush-veshamru` | Exodus 31:16-17 | torah | 118 | 31 | 6 | 2 | - | - | equal | equal |
| `kiddush-zachor` | Exodus 20:8-11 | torah | 203 | 55 | 14 | 1 | - | - | equal | equal |
| `ashrei-84-5` | Psalm 84:5 | torah | 25 | 6 | 0 | 1 | - | - | equal | equal |
| `ashrei-144-15` | Psalm 144:15 | torah | 30 | 8 | 0 | 1 | - | - | equal | equal |
| `ashrei-145-1-3` | Psalm 145:1-3 | torah | 97 | 23 | 1 | 3 | - | - | equal | equal |
| `ashrei-145-16` | Psalm 145:16 | torah | 24 | 7 | 2 | 1 | - | - | equal | equal |
| `shir-hamaalot` | Psalm 126:1-6 | torah | 208 | 50 | 5 | 6 | - | - | equal | equal |
| `vayehi-binsoa` | Siddur: Vayehi binsoa (Numbers 10:35, Isaiah 2:3, blessing) | siddur | 110 | 25 | 0 | 3 | - | - | no-ref quotes 1/2 | equal |
| `lecha-hashem` | Siddur: Lecha Adonai hagedulah (1 Chronicles 29:11, Psalm 99:5, 99:9) | siddur | 158 | 35 | 0 | 3 | - | - | no-ref quotes 1/3 | equal |
| `vezot-hatorah` | Siddur: V'zot haTorah (Deuteronomy 4:44, Numbers 9:23) | siddur | 43 | 13 | 0 | 1 | - | - | no-ref quotes 0/2 | equal |
| `etz-chaim` | Siddur: Etz chaim hi (Proverbs 3:18, 3:17, 3:16, Isaiah 42:21) | siddur | 114 | 26 | 0 | 4 | - | - | no-ref quotes 1/4 | equal |
| `brich-shmei` | Siddur: Berich shmei (Zohar, Vayakhel) | siddur | 531 | 129 | 11 | 1 | - | - | no-ref | equal |
| `hagomel` | Siddur: Birkat Hagomel | siddur | 78 | 20 | 1 | 2 | - | - | no-ref | equal |
| `avot-closing` | Siddur: Amidah, first blessing, closing lines | siddur | 36 | 9 | 0 | 2 | - | - | no-ref | equal |
| `amidah-yihyu` | Siddur: Amidah, closing verse (Psalm 19:15) | siddur | 43 | 10 | 0 | 1 | - | - | no-ref quotes 0/1 | equal |
| `amidah-elohai-netzor` | Siddur: Amidah, Elohai netzor | siddur | 247 | 57 | 0 | 3 | - | - | no-ref | equal |
| `oseh-shalom` | Siddur: Oseh shalom | siddur | 48 | 12 | 1 | 1 | - | - | no-ref | equal |
| `sim-shalom` | Siddur: Amidah, Sim shalom (morning) | siddur | 213 | 53 | 4 | 2 | - | - | no-ref | equal |
| `kiddush-shabbat-eve` | Siddur: Kiddush for Friday night, the sanctification | siddur | 196 | 45 | 0 | 1 | - | - | no-ref | equal |
| `lecha-dodi-1` | Siddur: Lecha Dodi, refrain and first verse | siddur | 88 | 21 | 0 | 2 | - | - | no-ref | equal |
| `yigdal` | Siddur: Yigdal | siddur | 446 | 112 | 3 | 13 | - | - | no-ref | equal |
| `zimun-opening` | Siddur: Birkat Hamazon, zimun (invitation) | siddur | 33 | 9 | 1 | 2 | - | - | no-ref | equal |
| `haftarah-before` | Siddur: Haftarah, blessings before | siddur | 121 | 26 | 0 | 1 | - | - | no-ref | equal |
| `haftarah-after` | Siddur: Haftarah, blessings after (Shabbat) | siddur | 586 | 148 | 5 | 4 | - | - | no-ref | equal |
| `mi-sheberach-opening` | Siddur: Mi sheberach, opening words | siddur | 27 | 6 | 0 | 0 | - | - | no-ref | equal |
| `havdalah-opening` | Siddur: Havdalah, opening verses (Hinei El yeshuati) | siddur | 242 | 60 | 0 | 9 | - | - | no-ref | equal |
| `havdalah-spices` | Siddur: Havdalah, blessing over spices | siddur | 38 | 9 | 0 | 1 | - | - | no-ref | equal |
| `havdalah-flame` | Siddur: Havdalah, blessing over the flame | siddur | 37 | 9 | 0 | 1 | - | - | no-ref | equal |
| `havdalah-hamavdil` | Siddur: Havdalah, the separation blessing | siddur | 118 | 29 | 0 | 1 | - | - | no-ref | equal |
| `hanukkah-candle` | Siddur: Hanukkah candle blessing | siddur | 57 | 13 | 0 | 1 | - | - | no-ref | equal |
| `hanukkah-nissim` | Siddur: Hanukkah, blessing for the miracles | siddur | 56 | 13 | 0 | 1 | - | - | no-ref | equal |
| `shehecheyanu` | Siddur: Shehecheyanu | siddur | 52 | 11 | 0 | 1 | - | - | no-ref | equal |
| `hanerot-halalu` | Siddur: Hanerot halalu | siddur | 174 | 38 | 1 | 1 | - | - | no-ref | equal |
| `maoz-tzur-1` | Siddur: Maoz Tzur, first verse | siddur | 89 | 23 | 0 | 1 | - | - | no-ref | equal |

`quotes a/b` on a siddur record: of the b Tanakh verses named in its ref, a occur verbatim (by consonant skeleton) inside the record. A miss is not an error: siddur wording often differs from the Masoretic verse.

## 3. Records whose licence label is unverified

The Hebrew licence label of every record below is what Sefaria's API reported for the version; nobody on this project has checked it against the publisher. Exact source URL as stored in the registry.

| id | licence label | Hebrew source | source URL |
|---|---|---|---|
| `shema-2` | CC-BY | The Metsudah siddur, 1981 via Sefaria: Siddur Ashkenaz, Weekday, Shacharit, Blessings of the Shema, Shema | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Blessings_of_the_Shema%2C_Shema |
| `bless-formula-1` | CC0 | Shaliehsaboo Edition via Sefaria: Siddur Edot HaMizrach, Shabbat Evening, First Meal | https://www.sefaria.org/Siddur_Edot_HaMizrach%2C_Shabbat_Evening%2C_First_Meal |
| `kiddush-wine-1` | Public Domain | Torat Emet 357 via Sefaria: Siddur Sefard, Birchat HaMazon, Blessing on Foods | https://www.sefaria.org/Siddur_Sefard%2C_Birchat_HaMazon%2C_Blessing_on_Foods |
| `hamotzi` | CC0 | Shaliehsaboo Edition via Sefaria: Siddur Edot HaMizrach, Shabbat Evening, First Meal | https://www.sefaria.org/Siddur_Edot_HaMizrach%2C_Shabbat_Evening%2C_First_Meal |
| `candle-shabbat` | Public Domain | Torat Emet 357 via Sefaria: Siddur Sefard, Shabbat Candle Lighting | https://www.sefaria.org/Siddur_Sefard%2C_Shabbat_Candle_Lighting |
| `torah-bless-1` | CC0 | Shaliehsaboo Edition via Sefaria: Siddur Edot HaMizrach, Preparatory Prayers, Torah Blessings | https://www.sefaria.org/Siddur_Edot_HaMizrach%2C_Preparatory_Prayers%2C_Torah_Blessings |
| `torah-barchu` | CC-BY | The Metsudah siddur, 1981 via Sefaria: Siddur Ashkenaz, Weekday, Shacharit, Torah Reading, Reading from Sefer, Birkat HaTorah | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Torah_Reading%2C_Reading_from_Sefer%2C_Birkat_HaTorah |
| `torah-bless-2` | CC-BY | The Metsudah siddur, 1981 via Sefaria: Siddur Ashkenaz, Weekday, Shacharit, Torah Reading, Reading from Sefer, Birkat HaTorah | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Torah_Reading%2C_Reading_from_Sefer%2C_Birkat_HaTorah |
| `amidah-lips` | CC0 | Shaliehsaboo Edition via Sefaria: Siddur Edot HaMizrach, Weekday Shacharit, Amida | https://www.sefaria.org/Siddur_Edot_HaMizrach%2C_Weekday_Shacharit%2C_Amida |
| `avot-1` | CC0 | Shaliehsaboo Edition via Sefaria: Siddur Edot HaMizrach, Weekday Shacharit, Amida | https://www.sefaria.org/Siddur_Edot_HaMizrach%2C_Weekday_Shacharit%2C_Amida |
| `aleinu-1` | CC0 | Shaliehsaboo Edition via Sefaria: Siddur Edot HaMizrach, Weekday Shacharit, Alenu | https://www.sefaria.org/Siddur_Edot_HaMizrach%2C_Weekday_Shacharit%2C_Alenu |
| `modeh-ani-1` | CC-BY | The Metsudah siddur, 1981 via Sefaria: Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Modeh Ani | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Preparatory_Prayers%2C_Modeh_Ani |
| `adon-olam-1` | CC-BY | The Metsudah siddur, 1981 via Sefaria: Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Adon Olam | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Preparatory_Prayers%2C_Adon_Olam |
| `kaddish-1` | CC-BY | The Metsudah siddur, 1981 via Sefaria: Siddur Ashkenaz, Weekday, Shacharit, Concluding Prayers, Mourner's Kaddish | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Concluding_Prayers%2C_Mourner%27s_Kaddish |
| `birkat-hamazon-1` | Public Domain | Torat Emet 357 via Sefaria: Siddur Sefard, Birchat HaMazon, Birchat HaMazon | https://www.sefaria.org/Siddur_Sefard%2C_Birchat_HaMazon%2C_Birchat_HaMazon |
| `vayehi-binsoa` | CC-BY | The Metsudah siddur, 1981 via Sefaria: Siddur Ashkenaz, Weekday, Shacharit, Torah Reading, Removing the Torah from Ark, Vayehi Binsoa | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Torah_Reading%2C_Removing_the_Torah_from_Ark%2C_Vayehi_Binsoa |
| `lecha-hashem` | CC-BY | The Metsudah siddur, 1981 via Sefaria: Siddur Ashkenaz, Weekday, Shacharit, Torah Reading, Removing the Torah from Ark, Lekha Hashem | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Torah_Reading%2C_Removing_the_Torah_from_Ark%2C_Lekha_Hashem |
| `vezot-hatorah` | CC-BY | The Metsudah siddur, 1981 via Sefaria: Siddur Ashkenaz, Weekday, Shacharit, Torah Reading, Reading from Sefer, Raising the Torah | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Torah_Reading%2C_Reading_from_Sefer%2C_Raising_the_Torah |
| `etz-chaim` | CC-BY | The Metsudah siddur, 1981 via Sefaria: Siddur Ashkenaz, Weekday, Shacharit, Torah Reading, Reading from Sefer, Raising the Torah | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Torah_Reading%2C_Reading_from_Sefer%2C_Raising_the_Torah |
| `brich-shmei` | CC-BY | The Metsudah siddur, 1981 via Sefaria: Siddur Ashkenaz, Weekday, Shacharit, Torah Reading, Removing the Torah from Ark, Berich Shmei | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Torah_Reading%2C_Removing_the_Torah_from_Ark%2C_Berich_Shmei |
| `hagomel` | CC-BY | The Metsudah siddur, 1981 via Sefaria: Siddur Ashkenaz, Weekday, Shacharit, Torah Reading, Reading from Sefer, Birkat Hagomel | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Torah_Reading%2C_Reading_from_Sefer%2C_Birkat_Hagomel |
| `avot-closing` | CC-BY | The Metsudah siddur, 1981 via Sefaria: Siddur Ashkenaz, Weekday, Shacharit, Amidah, Patriarchs | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Amidah%2C_Patriarchs |
| `amidah-yihyu` | CC-BY | The Metsudah siddur, 1981 via Sefaria: Siddur Ashkenaz, Weekday, Shacharit, Amidah, Concluding Passage | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Amidah%2C_Concluding_Passage |
| `amidah-elohai-netzor` | CC-BY | The Metsudah siddur, 1981 via Sefaria: Siddur Ashkenaz, Weekday, Shacharit, Amidah, Concluding Passage | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Amidah%2C_Concluding_Passage |
| `oseh-shalom` | CC-BY | The Metsudah siddur, 1981 via Sefaria: Siddur Ashkenaz, Weekday, Shacharit, Amidah, Concluding Passage | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Amidah%2C_Concluding_Passage |
| `sim-shalom` | CC-BY | The Metsudah siddur, 1981 via Sefaria: Siddur Ashkenaz, Weekday, Shacharit, Amidah, Peace | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Amidah%2C_Peace |
| `kiddush-shabbat-eve` | CC-BY | The Metsudah siddur, 1981 via Sefaria: Siddur Ashkenaz, Shabbat, Shabbat Evening, Kiddush | https://www.sefaria.org/Siddur_Ashkenaz%2C_Shabbat%2C_Shabbat_Evening%2C_Kiddush |
| `lecha-dodi-1` | CC-BY | The Metsudah siddur, 1981 via Sefaria: Siddur Ashkenaz, Shabbat, Kabbalat Shabbat, Lekha Dodi | https://www.sefaria.org/Siddur_Ashkenaz%2C_Shabbat%2C_Kabbalat_Shabbat%2C_Lekha_Dodi |
| `yigdal` | CC-BY | The Metsudah siddur, 1981 via Sefaria: Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Yigdal | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Preparatory_Prayers%2C_Yigdal |
| `zimun-opening` | CC-BY | The Metsudah siddur, 1981 via Sefaria: Siddur Sefard, Birchat HaMazon, Birchat HaMazon | https://www.sefaria.org/Siddur_Sefard%2C_Birchat_HaMazon%2C_Birchat_HaMazon |
| `haftarah-before` | CC0 | Shaliehsaboo Edition via Sefaria: Siddur Edot HaMizrach, Shabbat Shacharit, Haftarah | https://www.sefaria.org/Siddur_Edot_HaMizrach%2C_Shabbat_Shacharit%2C_Haftarah |
| `haftarah-after` | CC0 | Shaliehsaboo Edition via Sefaria: Siddur Edot HaMizrach, Shabbat Shacharit, Haftarah | https://www.sefaria.org/Siddur_Edot_HaMizrach%2C_Shabbat_Shacharit%2C_Haftarah |
| `mi-sheberach-opening` | Public Domain | Torat Emet 357 via Sefaria: Siddur Sefard, Shabbat Morning Services, Prayer for Oleh | https://www.sefaria.org/Siddur_Sefard%2C_Shabbat_Morning_Services%2C_Prayer_for_Oleh |
| `havdalah-opening` | Public Domain | Torat Emet 357 via Sefaria: Siddur Sefard, Motzaei Shabbat , Havdala | https://www.sefaria.org/Siddur_Sefard%2C_Motzaei_Shabbat_%2C_Havdala |
| `havdalah-spices` | Public Domain | Torat Emet 357 via Sefaria: Siddur Sefard, Motzaei Shabbat , Havdala | https://www.sefaria.org/Siddur_Sefard%2C_Motzaei_Shabbat_%2C_Havdala |
| `havdalah-flame` | CC0 | Shaliehsaboo Edition via Sefaria: Siddur Edot HaMizrach, Havdalah, Havdala | https://www.sefaria.org/Siddur_Edot_HaMizrach%2C_Havdalah%2C_Havdala |
| `havdalah-hamavdil` | CC0 | Shaliehsaboo Edition via Sefaria: Siddur Edot HaMizrach, Havdalah, Havdala | https://www.sefaria.org/Siddur_Edot_HaMizrach%2C_Havdalah%2C_Havdala |
| `hanukkah-candle` | CC0 | Shaliehsaboo Edition via Sefaria: Siddur Edot HaMizrach, Hanukkah, Menorah Lighting | https://www.sefaria.org/Siddur_Edot_HaMizrach%2C_Hanukkah%2C_Menorah_Lighting |
| `hanukkah-nissim` | CC0 | Shaliehsaboo Edition via Sefaria: Siddur Edot HaMizrach, Hanukkah, Menorah Lighting | https://www.sefaria.org/Siddur_Edot_HaMizrach%2C_Hanukkah%2C_Menorah_Lighting |
| `shehecheyanu` | CC0 | Shaliehsaboo Edition via Sefaria: Siddur Edot HaMizrach, Hanukkah, Menorah Lighting | https://www.sefaria.org/Siddur_Edot_HaMizrach%2C_Hanukkah%2C_Menorah_Lighting |
| `hanerot-halalu` | CC0 | Shaliehsaboo Edition via Sefaria: Siddur Edot HaMizrach, Hanukkah, Menorah Lighting | https://www.sefaria.org/Siddur_Edot_HaMizrach%2C_Hanukkah%2C_Menorah_Lighting |
| `maoz-tzur-1` | CC0 | Shaliehsaboo Edition via Sefaria: Siddur Edot HaMizrach, Hanukkah, Menorah Lighting | https://www.sefaria.org/Siddur_Edot_HaMizrach%2C_Hanukkah%2C_Menorah_Lighting |

English: 26 records carry JPS 1917 English labelled "Public Domain" by Sefaria (public domain by age in the US; label itself unverified). Version source URL given by Sefaria: http://opensiddur.org/2010/08/%D7%AA%D7%A0%D7%B4%D7%9A-the-holy-scriptures-a-new-translation-jps-1917/. Records: `bless-priestly-1`, `bless-priestly-2`, `bless-priestly-3`, `shema-1`, `vahavta-1`, `vahavta-2`, `vahavta-full`, `shema-vahavta`, `mah-tovu-1`, `mi-chamocha-1`, `kiddush-gen-2-1-3`, `ein-kamocha`, `malchutcha`, `adonai-oz`, `gadlu`, `yehalelu`, `hashivenu`, `kedushah-kadosh`, `kedushah-yimloch`, `kiddush-veshamru`, `kiddush-zachor`, `ashrei-84-5`, `ashrei-144-15`, `ashrei-145-1-3`, `ashrei-145-16`, `shir-hamaalot`.

## 4. Metsudah records (flagged)

The Metsudah siddur is a 1981 publication. Sefaria labels its digitisation CC-BY; LICENSES.md calls it the riskiest source. These records would need replacing or permission before commercial use:

| id | ref | source URL |
|---|---|---|
| `shema-2` | Siddur: Baruch shem kevod malchuto | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Blessings_of_the_Shema%2C_Shema |
| `torah-barchu` | Siddur: Barchu before the Torah reading | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Torah_Reading%2C_Reading_from_Sefer%2C_Birkat_HaTorah |
| `torah-bless-2` | Siddur: Torah blessing after the reading | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Torah_Reading%2C_Reading_from_Sefer%2C_Birkat_HaTorah |
| `modeh-ani-1` | Siddur: Modeh Ani | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Preparatory_Prayers%2C_Modeh_Ani |
| `adon-olam-1` | Siddur: Adon Olam | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Preparatory_Prayers%2C_Adon_Olam |
| `kaddish-1` | Siddur: Mourner's Kaddish | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Concluding_Prayers%2C_Mourner%27s_Kaddish |
| `vayehi-binsoa` | Siddur: Vayehi binsoa (Numbers 10:35, Isaiah 2:3, blessing) | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Torah_Reading%2C_Removing_the_Torah_from_Ark%2C_Vayehi_Binsoa |
| `lecha-hashem` | Siddur: Lecha Adonai hagedulah (1 Chronicles 29:11, Psalm 99:5, 99:9) | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Torah_Reading%2C_Removing_the_Torah_from_Ark%2C_Lekha_Hashem |
| `vezot-hatorah` | Siddur: V'zot haTorah (Deuteronomy 4:44, Numbers 9:23) | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Torah_Reading%2C_Reading_from_Sefer%2C_Raising_the_Torah |
| `etz-chaim` | Siddur: Etz chaim hi (Proverbs 3:18, 3:17, 3:16, Isaiah 42:21) | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Torah_Reading%2C_Reading_from_Sefer%2C_Raising_the_Torah |
| `brich-shmei` | Siddur: Berich shmei (Zohar, Vayakhel) | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Torah_Reading%2C_Removing_the_Torah_from_Ark%2C_Berich_Shmei |
| `hagomel` | Siddur: Birkat Hagomel | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Torah_Reading%2C_Reading_from_Sefer%2C_Birkat_Hagomel |
| `avot-closing` | Siddur: Amidah, first blessing, closing lines | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Amidah%2C_Patriarchs |
| `amidah-yihyu` | Siddur: Amidah, closing verse (Psalm 19:15) | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Amidah%2C_Concluding_Passage |
| `amidah-elohai-netzor` | Siddur: Amidah, Elohai netzor | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Amidah%2C_Concluding_Passage |
| `oseh-shalom` | Siddur: Oseh shalom | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Amidah%2C_Concluding_Passage |
| `sim-shalom` | Siddur: Amidah, Sim shalom (morning) | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Amidah%2C_Peace |
| `kiddush-shabbat-eve` | Siddur: Kiddush for Friday night, the sanctification | https://www.sefaria.org/Siddur_Ashkenaz%2C_Shabbat%2C_Shabbat_Evening%2C_Kiddush |
| `lecha-dodi-1` | Siddur: Lecha Dodi, refrain and first verse | https://www.sefaria.org/Siddur_Ashkenaz%2C_Shabbat%2C_Kabbalat_Shabbat%2C_Lekha_Dodi |
| `yigdal` | Siddur: Yigdal | https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Preparatory_Prayers%2C_Yigdal |
| `zimun-opening` | Siddur: Birkat Hamazon, zimun (invitation) | https://www.sefaria.org/Siddur_Sefard%2C_Birchat_HaMazon%2C_Birchat_HaMazon |

## 5. UXLC mismatches

None.

## 6. Failures and warnings in detail

None.
