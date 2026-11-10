# Pronunciation engine audit

Scope: items 24, 25, 27 and 28 of the audit (shva classifier, stress default and exception list, unwired IPA adapter, rule-generated candidate readings). Written 2026-11-04. Everything below was read from the code and data in this repo or produced by running the code; nothing was checked by a native speaker.

## 1. Declared heuristics and unimplemented conditions

| Where | What | Status | User-visible surfaces that rely on it |
|---|---|---|---|
| src/pronunciation/shva.js L3 | shva after a long unaccented vowel is vocal; accent is guessed by assuming final stress (unsourced derivation, marked `heuristic: true` in the verdict) | implemented-heuristic | transliteration wherever transliterate() is used (vocab, sprint, torah reader, corpus reader, service model, traditions model, curriculum scaffold, niqqud dial view, photo word cards); syllable chips (src/pronunciation/syllables.js); photo scan cards via loadLane3Shva(); the generated lookup tables built by tools/pronunciation/build_variants.mjs |
| shva.js T1 | shva between two accents is vocal | todo, not implemented | same as above (silent/vocal calls ignore it) |
| shva.js T2 | shva after a letter with a trope | todo, conflicts with L3, unresolved | same |
| shva.js T3 | shva after the prefixes כַּ מִ שֶׁ בַּ לַ הַ (needs morphology) | todo | same |
| shva.js T4 | second letter alef/heh/ayin gives a short e | todo | same |
| shva.js T5 | colloquial Israeli shva (zman, gdola) | todo; transliterate.js has a small own-derivation option (shvaMode colloquial), known to mishandle prefix letters (see section 3) | opt-in only; no view turns it on |
| src/photo/syllabify.js STRESS_EXCEPTIONS | one entry (סֵפֶר); every other word is stressed on the last syllable | placeholder list; the opt-in segolate guess is off by default | photo scan cards (syllable stress marks); not used by the syllable chips, which read data/pronunciation/stress.json |
| syllabify.js LIMITATIONS | kamatz gadol vs katan not decided; dagesh chazak detected by position; Israeli-style single-tradition romanisation | declared | photo scan cards |
| src/photo/engines/web.js placeholder IPA adapter | IPA adapter is inert (ipa is undefined, installed false) | not wired | pipeline.js skips the IPA step; scan.view.js would print an `IPA:` line only if an engine returned one, and none does |

Views that show generated pronunciation of words the app has not curated: the photo scan cards (OCR output, any word). Views that convert curated or pasted words through lookup tables (Read it my way, Compare traditions) already carry the "rule-generated and unverified" notice. The torah reader and curriculum scaffold already carry their own notes.

## 2. What was changed

- syllabifyWord() now attaches `confidence` to the returned array (like the existing `stressRule`): `{level: 'low'|'draft', reasons: [...], checked: false}`. There is no 'verified' level. Reason codes: final-stress-assumed, segolate-stress-guess, shva-rules-partial, shva-after-long-vowel-guess, kamatz-gadol-katan-undecided; plain-language text is in CONFIDENCE_REASONS. Existing callers that treat the return value as an array are unaffected.
- pipeline.js copies it to each Hebrew word as `word.confidence`; word-card.js adds `confidence` and `draftNote` to each card that has a reading (null for unpointed words, where nothing is guessed).
- scan.view.js shows the draft note, with the reasons, on every such card. src/corpus/read.view.js shows a one-line draft note whenever the transliteration toggle is on.
- Tests: tests/photo.draft-reading.test.js.

## 3. IPA claim check (item 27)

Searched src/, docs/, README.md and the About and How views for text linking the photo or scan path with IPA or phonetic output. Nothing claims it. docs/photo/ENGINES.md says "No IPA engine" and lists the adapter as a placeholder; the adapter's own describe() says it is not wired. No text change was needed; tests/photo.draft-reading.test.js now pins this (placeholder inert, default engine bundle has no ipa, no README/About/How line pairs photo/scan with IPA).

## 4. Source-reviewed regression set

Source rows: every Hebrew word with a stored Latin reading in data/pronunciation/drills.json, soundgap.json and prayerwords.json (the Israeli respelling). 90 stored readings over 85 distinct words (35 drills, 45 soundgap, 10 prayerwords). Rows with several forms (for example "shalom / sholom") and English-habit respellings (american column) were skipped. Those three files are marked unproofread, so agreement means "engine matches what the repo stores", not "correct".

Comparison: reading letters lower-cased with punctuation removed and kh treated as ch; final he silent. Stress: the capitalised syllable of the stored reading, counted from the end of the word.

Result: transliterate() agrees on 79 of 90 rows (76 distinct words); 6 more agree only in colloquial shva mode; the photo syllabifier's own romanisation agrees on 74; stress position agrees on 13 of the 19 rows with a stored stress (one is not comparable).

### 4a. Agreements (asserted by tests/pronunciation.regression-set.test.js)

| Hebrew | Stored reading | File | Engine (transliterate) | Photo syllabifier |
|---|---|---|---|---|
| קַר | kar | drills | kar | kar |
| רִאשׁוֹן | rishon | drills | rishon | rishon |
| רֶכֶב | rekhev | drills | rekhev | rechev |
| שָׁלוֹם | shalom | drills | shalom | shalom |
| לֹא | lo | drills | lo | lo |
| בֵּן | ben | drills | ben | ben |
| בְּגָדִים | begadIM | drills | begadim | begadim |
| יַלְדָּה | yaldA | drills | yalda | yalda |
| לִלְמֹד | lilmOD | drills | lilmod | lilmod |
| סֵפֶר | SEfer | drills | sefer | sefer |
| מְדַבֶּרֶת | medabEret | drills | medaberet | medaberet |
| תַּפּוּחַ | tapUach | drills | tapuach | tapuach |
| בֹּקֶר | BOker | drills | boker | boker |
| בּוֹקֵר | boKER | drills | boker | boker |
| חֶדֶר | cheder | drills | cheder | cheder |
| חֲבֵרָה | chavera | drills | chavera | chavera |
| בָּחַר | bachar | drills | bachar | bachar |
| נוֹחַ | no'ach | drills | noach | noach |
| עַכְשָׁיו | achshav | drills | akhshav | achshav |
| חַם | cham | drills | cham | cham |
| הַר | har | drills | har | har |
| פִּיתָה | pita | drills | pita | pita |
| תּוֹדָה | toda | drills | toda | toda |
| קָפֶה | kafe | drills | kafe | kafe |
| אֱלֹהֵינוּ | Eloheinu | drills | eloheinu | elohenu (differs) |
| הוֹרִים | horim | soundgap | horim | horim |
| חוֹרִים | chorim | soundgap | chorim | chorim |
| הֵן | hen | soundgap | hen | hen |
| חֵן | chen | soundgap | chen | chen |
| הֶבֶל | hevel | soundgap | hevel | hevel |
| חֶבֶל | chevel | soundgap | chevel | chevel |
| חַף | chaf | soundgap | chaf | chaf |
| כַּף | kaf | soundgap | kaf | kaf |
| אָח | ach | soundgap | ach | ach |
| אַךְ | akh | soundgap | akh | ach |
| אִם | im | soundgap | im | im |
| עִם | im | soundgap | im | im |
| אוֹר | or | soundgap | or | or |
| עוֹר | or | soundgap | or | or |
| אֵת | et | soundgap | et | et |
| עֵת | et | soundgap | et | et |
| אָב | av | soundgap | av | av |
| עָב | av | soundgap | av | av |
| קָרָא | kara | soundgap | kara | kara |
| קָרַע | kara | soundgap | kara | kara |
| קַל | kal | soundgap | kal | kal |
| גָּר | gar | soundgap | gar | gar |
| גָּל | gal | soundgap | gal | gal |
| צַל | tzal | soundgap | tzal | tsal (differs) |
| סַל | sal | soundgap | sal | sal |
| צוֹר | tzor | soundgap | tzor | tsor (differs) |
| שׁוֹר | shor | soundgap | shor | shor |
| כֵּן | ken | soundgap | ken | ken |
| קֵן | ken | soundgap | ken | ken |
| כָּל | kol | soundgap | kol | kal (differs) |
| קוֹל | kol | soundgap | kol | kol |
| כַּר | kar | soundgap | kar | kar |
| טוֹר | tor | soundgap | tor | tor |
| תּוֹר | tor | soundgap | tor | tor |
| שַׁבָּת | shabat | soundgap | shabat | shabat |
| שַׁבָּת | shabos | soundgap | shabos | shabat (differs) |
| סָר | sar | soundgap | sar | sar |
| שָׂר | sar | soundgap | sar | sar |
| סַם | sam | soundgap | sam | sam |
| שָׂם | sam | soundgap | sam | sam |
| שָׁם | sham | soundgap | sham | sham |
| וַעַד | va'ad | soundgap | va'ad | vaad |
| בַּעַד | ba'ad | soundgap | ba'ad | baad |
| דָּבָר | davar | soundgap | davar | davar |
| דִּבֵּר | diber | soundgap | diber | diber |
| בָּרוּךְ | ba-RUKH | prayerwords | barukh | baruch |
| אַתָּה | a-TA | prayerwords | ata | ata |
| אֲדֹנָי | a-do-NAI | prayerwords | adonai | adonay (differs) |
| מֶלֶךְ | ME-lekh | prayerwords | melekh | melech |
| הָעוֹלָם | ha-o-LAM | prayerwords | ha'olam | haolam |
| שָׁלוֹם | sha-LOM | prayerwords | shalom | shalom |
| אָמֵן | a-MEN | prayerwords | amen | amen |
| שַׁבָּת | sha-BAT | prayerwords | shabat | shabat |
| תּוֹרָה | to-RA | prayerwords | tora | tora |

### 4b. Disagreements (NOT asserted as correct)

| Hebrew | Stored reading | File | Engine (transliterate) | Colloquial mode | Photo syllabifier | Note |
|---|---|---|---|---|---|---|
| חוֹרִים | horim | drills | chorim | chorim | chorim | repo-internal conflict: soundgap.json stores chorim for this word |
| יָלְדָה | YALda | drills | yaleda | yaleda | yalda | shva after a long vowel called vocal (L3 heuristic); stored form has a silent shva and first-syllable stress |
| זְמַן | zman | drills | zeman | zman | zeman | stored form is the colloquial one; the default liturgical mode differs, colloquial mode agrees |
| גְּדוֹלָה | gdola | drills | gedola | gdola | gedola | stored form is the colloquial one; the default liturgical mode differs, colloquial mode agrees |
| קְטַנָּה | ktana | drills | ketana | ktana | ketana | stored form is the colloquial one; the default liturgical mode differs, colloquial mode agrees |
| גְּדוֹלִים | gdolim | drills | gedolim | gdolim | gedolim | stored form is the colloquial one; the default liturgical mode differs, colloquial mode agrees |
| קְטַנִּים | ktanim | drills | ketanim | ktanim | ketanim | stored form is the colloquial one; the default liturgical mode differs, colloquial mode agrees |
| בְּדִיחָה | bdicha | drills | bedicha | bedicha | bedicha | colloquial initial-shva drop not applied after a prefix letter |
| בְּחִילָה | bchila | drills | bechila | bechila | bechila | same |
| תְּחִינָה | tchina | drills | techina | tchina | techina | stored form is the colloquial one; the default liturgical mode differs, colloquial mode agrees |
| אֱלֹהֵינוּ | e-lo-HAY-nu | prayerwords | eloheinu | eloheinu | elohenu |  |

### 4c. Stress

| Hebrew | Stored reading | Stored stress (from end) | Photo syllabifier stress (from end) | Result |
|---|---|---|---|---|
| בְּגָדִים | begadIM | -1 | -1 | agree |
| יַלְדָּה | yaldA | -1 | -1 | agree |
| לִלְמֹד | lilmOD | -1 | -1 | agree |
| סֵפֶר | SEfer | -2 | -2 | agree |
| מְדַבֶּרֶת | medabEret | -2 | -1 | DISAGREE |
| תַּפּוּחַ | tapUach | -1 | -1 | not comparable (furtive patach syllable count) |
| בֹּקֶר | BOker | -2 | -1 | DISAGREE |
| בּוֹקֵר | boKER | -1 | -1 | agree |
| יָלְדָה | YALda | -2 | -1 | DISAGREE |
| בָּרוּךְ | ba-RUKH | -1 | -1 | agree |
| אַתָּה | a-TA | -1 | -1 | agree |
| אֲדֹנָי | a-do-NAI | -1 | -1 | agree |
| אֱלֹהֵינוּ | e-lo-HAY-nu | -2 | -1 | DISAGREE |
| מֶלֶךְ | ME-lekh | -2 | -1 | DISAGREE |
| הָעוֹלָם | ha-o-LAM | -1 | -1 | agree |
| שָׁלוֹם | sha-LOM | -1 | -1 | agree |
| אָמֵן | a-MEN | -1 | -1 | agree |
| שַׁבָּת | sha-BAT | -1 | -1 | agree |
| תּוֹרָה | to-RA | -1 | -1 | agree |

Prayer words (data/pronunciation/prayerwords.json) also store Ashkenazi stress. The photo syllabifier has no tradition setting and always assumes final stress, so it cannot match the stored Ashkenazi stress for barukh, atah, haolam, shalom (second-to-last) and shabbat, torah (first); this is a known gap, not tested.

### 4d. Reading the numbers

The agreements show the spelling rules and the stress default behave consistently on a mixed set of common words. The disagreements cluster in three places: stress exceptions (the one-entry list), the vocal-shva heuristic after a long vowel (יָלְדָה), and the colloquial initial-shva option (prefix letters). Those are the same places the code declares as weak.

## 5. Candidates for a human reviewer

docs/review/packet/08-engine-candidates.csv lists 15 words with the engine reading, the rule that produced it, the question and the community needed. כְּנִיסָה (kenisah) and הַסְּכוּם (hasekhum) came from the audit brief; they do not appear in the repo data, so they have no stored reading to compare with. They are review candidates only, not corrections. The decision and corrections columns are blank.

## 6. Not done

- No stress exceptions were added; the list needs a sourced lexicon.
- T1 to T5 are still unimplemented.
- The torah reader, vocab and sprint views were not given new notes (the torah reader and scaffold already have one); only the photo cards and the corpus reader were changed.
- No browser run of the scan view was done for this change; only unit tests.
