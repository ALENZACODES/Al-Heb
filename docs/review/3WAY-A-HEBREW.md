# Reviewer A: Hebrew accuracy and pedagogy correctness

Date: 2026-11-05. Scope: read-only desk review of `main` (sparse checkout of `data/`, `src/`, `docs/`, `tools/`). Nothing in app code, data or tests was changed.

Who wrote this: an automated reviewer. This is NOT native-speaker, rabbinic or cantorial review, and nothing here should be read as one. I cannot hear audio. Where Hebrew is judged wrong or doubtful below, I describe it and point at the place; I did not write replacement Hebrew, and every item marked "decision" needs a native reader, a teacher or a rabbi.

Method note: "error" = I am confident it is wrong against general knowledge of Hebrew or against another part of the same app. "doubtful" = probably wrong or misleading, someone qualified should decide. "ok-but-unclear" = defensible but a learner will be confused or the claim is wider than the evidence. Confidence is my own estimate (high / medium / low), not a measured number.

## Summary

- The scripture and prayer corpus is the strongest part: the 70 registry records are machine-matched to their cited sources, the Priestly Blessing, Shema, Vahavta, the blessing formula, Kiddush wine, Hamotzi, Kaddish, Adon Olam and Modeh Ani read correctly to me, and the repo labels honestly what is unproofread.
- The reading-track lessons (r01-r51) and the phrasebook are mostly accurate; the problems are a few pointing slips and some goals that claim more than the data supports.
- The weak points are (1) the "Sephardi" setting is not Sephardi, (2) the transliteration engine has several systematic bugs (prefixed Divine Name, kamatz katan, Ashkenazi stress), (3) the vocabulary layer (senses, levels, examples, missing basics) built from spelling-level frequency, which puts rare Biblical homographs in the first cards, and (4) there is no binyanim intro and no false-friends content at all.
- Many vocabulary defects are already listed in `docs/vocab/JUDGEMENT.md` and `docs/vocab/FIRST-500-CHECK.md` but are still live in `data/vocab/words.json` and `data/vocab/deck-order.json`; I mark those "known, unfixed".

## Score: 66 / 100 for "Hebrew accuracy as it stands"

Rubric (my own; weights chosen to reflect what a learner meets first). Points are awarded per area by how much of what I sampled was correct and how well uncertainty is disclosed.

| Area | Weight | Awarded | Basis |
|---|---|---|---|
| A. Scripture and prayer text fidelity (registry, pointing, glosses of prayer lines) | 25 | 22 | 70/70 records machine-matched to sources; my read found no wrong word; deductions for nusach mixing, 3 records still "needs-check", prefixed Name in examples |
| B. Letters, vowels, names, sound tables per tradition | 20 | 14 | letters/niqqud/consonants tables are careful and cited; deductions for the Sephardi track not existing, unresolved Ashkenazi cholam split, stress |
| C. Transliteration / rule engine output | 15 | 9 | reads ordinary words correctly in Israeli and Ashkenazi; deductions for Name+prefix, kamatz katan, Ashkenazi stress, gemination convention |
| D. Vocabulary senses, forms, levels, examples | 20 | 8 | first-500 and deck head contain rare homograph senses, wrong first glosses, spelling-matched examples, missing basics, unreliable A1-B2 levels |
| E. Lesson and grammar pedagogy (r01-r51, il, I-lessons, gender, grammar notes) | 20 | 13 | mostly accurate; deductions for pointing slips, inconsistent forms between lessons, no binyanim intro, no false friends, thin notes |
| Total | 100 | 66 | |

A 66 means: the liturgical core would survive a rabbi's read with few corrections; the everyday-vocabulary and tradition-choice layers would not yet survive a native teacher's read.

## Ranked findings (top 25)

### 1. "Sephardi" setting is Israeli sounds; the three-tradition goal is met for two traditions only (error against stated goal; confidence high)
- `src/pronunciation/transliterate.js:14-16`: "israeli and sephardi currently produce IDENTICAL Latin output".
- `data/traditions/sounds.json:12`: the app's `sephardi` setting is "American synagogue ... Sephardi/Israeli vowel values said with American-English habits ... not a community".
- `data/pronunciation/consonants.json` stores pharyngeal chet [ħ] and ayin [ʕ] for Sephardi, but the learner-facing English line for ayin/chet says silent / ch, and lesson r19 admits the mismatch in a goal line.
- `data/traditions/sounds.json` `alsoExists` note says the setting "is NOT a model of any of these communities".
- The honesty is good; the product claim "Israeli/Sephardi/Ashkenazi equally" is not met. Decision for John: rename the setting (for example "American synagogue") or build a real Sephardi track; a Sephardi cantor/speaker must decide which community.

### 2. Divine Name with a prefix is transliterated letter by letter (error; confidence high)
- `src/pronunciation/transliterate.js:137-138` substitutes Adonai only when the consonants are exactly the four letters. With a prefix the output is `laivah` (לַיהוָה), `laihovah` (לַיהֹוָה), `sheyavah` (שֶׁיֲהוָה).
- Live in data: 8 example transliterations in `data/vocab/words.json` end in `laivah` (e.g. ids `hacf6831d`, `hccd921cd`, `h8a97b4ba`, `ha3db2e46`, `h604ec6ff`); corpus records gadlu, kiddush-zachor and havdalah-opening contain the prefixed forms.
- The app's own convention (r15, r34) is that the Name is read Adonai. A learner is shown a spelled-out Name. Decision: a rabbi should say how prefixed forms are to be written (for example ladonai/ladonoy).

### 3. Ashkenazi cholam is still inconsistent inside one tradition (error; confidence high)
- `data/pronunciation/prayerwords.json:130,215`: haolam `ho-OY-lom`, Torah `TOY-roh / TOH-roh`, while Shalom is `SHO-lom` and the syllable chips show `ho-'O-lom`, `TO-ro`, `SHO-lom` (I ran `chipsFor`).
- `docs/review/ASHKENAZI-CHOLAM.md` already named this and recommended `o` default plus a variety setting; no `ashkenaziCholam` setting exists in `src/` or `data/` (only in that doc).
- Decision (the cholam o/oy decision): needs John plus an Ashkenazi reader; the brief's recommendation (o default, oy as a labelled variety) is reasonable on the evidence it cites, but the prayerwords strings must then be derived, not free text.

### 4. Ashkenazi stress shown for non-prayer words is just "last syllable" (error/doubtful; confidence medium-high)
- `src/pronunciation/syllables.js:44-48`: for Ashkenazi, stress is only correct for the ten prayer words; every other chip falls to `default-final (not checked for Ashkenazi)`.
- Output I generated: `to-DO` (תּוֹדָה), `su-KO`, `ku-LOM`, `i-MO`, `ge-vi-NO`, `pei-ROS`, `lo-MO`. `data/traditions/sounds.json` itself says traditional Ashkenazi is second-to-last. The code flags `checked:false`; if the screen does not show that caveat, this is a visible error. I did not check the view.
- Also minor: `prayerwords.json` respells amen as `o-MAYN` while the chip shows `o-MEIN`.

### 5. Deck order opens with rare homograph senses; known, unfixed (error; confidence high)
- `data/vocab/deck-order.json`: position 1 = מָן "manna", position 2 = הִוָּה "to constitute" (rank 5 in `words.json`, id `ha3cf2c46`); also in the first 120: אֶדֶן "base, pedestal, socket", שֶׂה "lamb, kid", חֹר/"nobleman" alt, שָׁר "to sing".
- `docs/vocab/JUDGEMENT.md` section 1 recommends demoting exactly these; the data still ships them. In the first 500 by `frequencyRank` I also found rank 43 `יָא` "vocative particle ... especially a slur", 102 שָׁם "to assess, appraise" (the adverb "there" is at 328), 457 כִי "chi".

### 6. A1-B2 level labels follow a Torah-heavy spelling count, not learner need (doubtful; confidence high)
- `data/vocab/index.json`: A1 = 825 rows, of which 246 verbs and 92 "unknown".
- Everyday words are late: תּוֹדָה A2 (rank 1068, id `he0b2f96b`), סְלִיחָה B2 (rank 5692, id `h33cf0d1b`), הַיּוֹם B2 (id `h5350449f`), לָמָּה B2, מָחָר B1, הַלּוֹ B1, שָׁמַיִם B1; while rare or archaic items sit in A1-B1: אֵד "vapour", עִשָּׂרוֹן "a former Hebrew unit of dry volume" (B1), חוּר "fine white cloth" (B1), זָנָה "to lust, fornicate" (A2), שִׁכֵּל "to unchild" (B1).
- The lessons use thanks/sorry in il01 (first intermediate lesson), so the vocabulary levels contradict the curriculum. Decision: native teacher to set levels.

### 6b. Basic words and forms missing from `words.json` (error; confidence medium: I searched `words.json` only, not `vocab5000.json` forms)
- No entry for אַתֶּן "you (f. pl.)"; הֵן exists only as particle "lo! as expressing surprise" with alt "yes, yea" (id `heb8a3bc1`), not "they (f.)" - yet `data/pronunciation/soundgap.json` uses הֵן "they (f.)". No אֵלֶּה/אֵלּוּ "these", no כַּמָּה "how much" (only כָּמַהּ "to long"), and no feminine numerals חָמֵשׁ, שֵׁשׁ, שֶׁבַע, עֶשֶׂר although lesson il04 teaches them (chamesh/sheva are glossed as other words: חִמֵּשׁ "to arm", שָׂבַע "to be sated").
- Duplicates: שִׁשָּׁה and שִׁישָּׁה both "six"; שְׁמוֹנָה twice.
- 258 of 940 lesson words do not appear verbatim in `words.json`; many are multi-word phrases, but r12/r14 אָנִי/וְאָנִי, il04 numerals, il05 כַּמָּה and il09 עוֹדֶף are single words.

### 7. Example sentences attached by spelling, not by sense (error; confidence high for the cases below)
- אָתָה "to come" (id `h772a0c9a`) shows "do not forget to meet him tomorrow" (אתו); שָׂשׂ "to rejoice" (id `h731d1356`) shows a sentence with שישי; אֵת "shovel" shows "who comes with us"; אֲנִי "ego" and אֳנִי "fleet" both show the pronoun sentence; בֻּקַּר "to be visited" shows מבוקר "from morning"; אֶחָד numeral shows a sentence with אחת.
- 614 sentences are shared by more than one entry (1,230 entries; 386 across different parts of speech); some are legitimate, many are not. `FIRST-500-CHECK.md` section 10 fixed 33 in the first 500; the tail is unchecked (`flags.senseChecked: false`).

### 8. Wrong or misleading first glosses in high ranks (error/doubtful)
- יָד "arm" first, "hand" only as alt (id `h1a3574d3`); the app's own mnemonics say "hand". Known in `FIRST-500-CHECK.md`, unfixed. High.
- מַזָּל first gloss "astrological sign", "luck" only as alt (id `h66ce9ca4`); in the app it is taught as "mazal tov". New. High.
- שָׁלוֹם gloss "peace" only; "hello/goodbye" appears in lessons r03, il01 and the phrasebook but not in the vocabulary entry (id `hf8c8316a`). New. High.
- יָרָה "to flow as water (that is, to rain)" first, shoot/throw only as alt (id `h448b5d1a`); known, unfixed.
- דַּבָּר "leader" (rank 253; id `hc7113076`); known in the first-500 doc, unfixed. Low-frequency sense at a top rank.
- הִכִּיר "to recognize (a country or legal entity)" for the general "to know/recognize (a person)" (rank 190); doubtful, medium.
- מְלָאכָה "sending, commission" (rank 450) where the modern sense is work/craft; doubtful, medium.
- אַמָּה "forearm" (rank 157; cubit is the usual sense); doubtful, medium-low.

### 9. פָּנִים is tagged feminine plural; the gender lesson teaches it as an exception (doubtful; confidence medium)
- `data/gender/templates.json` irregular list and vocab id `hbd0751bc`: gender `f`, number pl.
- My understanding is that panim is treated as a masculine plural noun in Modern Hebrew; I am not certain. Decision: a native teacher or the Academy dictionary entry. It is used as an "irregular feminine" teaching example, so a wrong tag teaches a wrong rule.

### 10. Kamatz katan is a five-form list; the engine gets other words wrong (error; confidence high for the words tested)
- `src/pronunciation/kamatz-katan.js` (list of 4 stems plus one form, all `verified:false`).
- Output: חָפְשִׁי -> `chafeshi` (reads as kamatz gadol plus an inserted vowel), שָׁרְשִׁי -> `shareshi`; and the prefix rule over-fires: vocab id `h7439bf9d` מְכָל "container" has stored translit `mekhol`, because prefix + כָל matches the stem "kol". My understanding is that the container word is read mekhal; decision for a native reader.

### 11. Transliteration `ts`/`tz`, `ata`/`atah`, geminate convention are mixed between files (ok-but-unclear; confidence high)
- Vocab: `tz`, `atah`, `ketzat`; `data/curriculum/gender-pairs.json`: `ts`, `ata`, `ktsat`; phrasebook: `toda`, `slicha`, `tsohorayim`.
- Israeli output for שַׁבָּת is `shabat` while lesson r02 and sounds.json spell Shabbat. Also gp-02 `aye'fa` (stray apostrophe). Minor, but a learner sees three conventions.

### 12. Lessons teach non-standard pointing for "I" (error; confidence medium-high)
- `data/curriculum/lessons.json:449` r12 `אָנִי` and `:529` r14 `וְאָנִי` (kamatz under alef). Standard is אֲנִי (r21 and vocab) and conjunction form וַאֲנִי. Probably a simplification before chataf vowels are taught, but it is presented as the word "I" and it does not match the vocabulary entry. Decision: teacher.

### 13. Blessing "baruch hashem" pointed with shva (error; confidence high)
- `data/curriculum/lessons.json:2598` il13 `בְּרוּךְ הַשֵּׁם`: the first word should carry kamatz (בָּרוּךְ), as in r28 and the phrasebook. Typo-level, but it is a prayer-word.

### 14. Lesson r25 claims Sephardi does not double the dagesh (doubtful; confidence medium)
- Goal text: "Israeli and Sephardi do not say it doubled". `data/pronunciation/niqqud.json` (dagesh record) says gemination in Sephardi is "not covered by the sources fetched". The lesson claims more than the data. Some Sephardi liturgical traditions do geminate in careful reading; I cannot say which. Decision: Sephardi reader.

### 15. Nusach mixing and one prayer text with an omission relative to common printings (doubtful; confidence low-medium)
- `aleinu-1` is from the Edot HaMizrach edition (I re-fetched the source for that line: it matches the registry), and reads `וַאֲנַחְנוּ מִשְׁתַּחֲוִים לִפְנֵי`, without the commonly printed "kor'im ... u-modim" words; `kaddish-1` is Ashkenaz (Metsudah). The registry labels all `traditionNeutral: true`.
- A learner moving between lessons I-04 and I-08 meets Ashkenaz and Mizrahi nusach without being told. Decision: rabbi/cantor to confirm which nusach each lesson claims. Also 3 records remain `transcribed-needs-check` (vayehi-binsoa, yigdal, haftarah-after); vayehi-binsoa has two hand corrections of a missing vowel (`וַיֹאמֶר`, `מֹשֶׁה`).

### 16. ashrei-144-15 pointing `שֶׁיֲהוָה` (doubtful; confidence low)
- Registry text has chataf patach under the yod in "she-Adonai". It equals the cited UXLC file per the report and I could not re-fetch UXLC here, so I cannot say the source is wrong; it is a form I would expect a reader to query. Decision: Tanakh reader.

### 17. No binyanim introduction and no false-friends content (gap; confidence high)
- `data/grammar/notes.json` has 5 topics: article, prefixes, construct, plurals, roots. "binyan" appears only as a label inside vocab and `data/roots/verbs.json` (1,655 verbs; binyan counts pa'al 618, pi'el 465, hif'il 306, hitpa'el 191, nif'al 115, pu'al 81, huf'al 39, hitpu'al 2). Lesson il16 says "five pa'al/pi'el verbs" in a goal line, no explanation of binyanim.
- False friends: only `docs/drafts/SIX-LANES-2.md:59` (idea "50 false-friend pairs") and a note in `docs/festivals/FESTIVALS.md`; no data.
- Roots: `data/roots/verified.json` is empty; `families.json` says 0 families verified (82 rule-checked). Only 501 of 1,820 verbs have a root. The app's own policy (say "share letters", not "share a root") is sound.

### 18. Grammar notes: accurate but thin, with small omissions (ok-but-unclear; confidence medium)
- Prefix note lists ve-, be-, le-, me-, she- (no ke-); lesson r33 lists Vav, Bet, Lamed, Mem, Hey (no she-, no ke-); the transliterator treats ו ב ל מ ה ש כ as prefixes. Three lists, three contents.
- Prefix note does not mention וּ before labials or ba-/la- with the article (lesson words show וּבְכָל, בַּבַּיִת, לַמֶּלֶךְ without the rule).
- Article note says "usually also he and chet" cannot take dagesh; correct as a tendency, the vowel outcome (ha-/ha-/he-) is only sketched.
- Plurals note counts the plural rule "over that list" built by a program; the note itself warns that entries may be wrong.

### 19. Lesson r34 title does not match content (ok-but-unclear; confidence high)
- Title "Final-letter and gershayim / abbreviation marks"; goals and words cover only the written Name read as Adonai, and the goal says "no example word is in this lesson yet". A learner expecting gershayim gets none.

### 20. Slang pointing is inconsistent between lessons and phrasebook (ok-but-unclear; confidence high)
- il02 `יָאללָה`, `סַבָּבָּה`, `וַואלָה` vs I-18 `יַאלְלָה`, `סַבָּבָה` vs phrasebook `יַאלְלָה`, `סַבָּבָה`, `וָואלָה`. Slang is not normally pointed; the three spellings differ in the same app. Native check for the preferred written form.

### 21. "What is your name" has two different pointings (doubtful; confidence low-medium)
- il03 `מַה שְׁמֶךָ` / `מַה שְׁמֵךְ` (`lessons.json:2102`) vs I-25 `מַה שִּׁמְךָ?`. My understanding is that the second is the form of everyday speech; the first has a liturgical flavour. Decision: teacher, and teach the conversational form with a note on the other.

### 22. Smaller pointing slips (error, low severity; confidence medium-high)
- il17 `אַרוּחַת בֹּקֶר` (`lessons.json:2780`) with patach under the alef; the vocabulary has אֲרוּחָה.
- I-14 `אַנְטִיבְּיוֹטִיקָה` with a dagesh in bet after shva.
- vocab id `h448338e7` `טִיֵַּח`: the furtive patach is encoded on the yod, together with the tsere (double vowel on one letter). Found by an encoding lint over all 6,303 `he` fields; this was the only two-vowel hit.
- I-06 `לְחוֹל` glossed "from the ordinary (weekday)": the prefix is "to/for"; in the Havdalah line it stands after "between", so as a stand-alone gloss it misleads.
- Priestly Blessing line 2 is correct in the registry (`וִיחֻנֶּךָּ`), but the Israeli transliteration is `vichuneka`; the dagesh in the final kaf is not shown. Fine for a first reader.

### 23. Letter hints and mnemonics: small shape-description doubts (ok-but-unclear; confidence low)
- `data/letters/interference.json` / `confusables.json`: "ayin|tsadi ... second stroke from the top left/right" and "pe-final curls inward at the top left" are shape descriptions I could not verify without looking at the rendered letters; they are labelled "not checked by a native teacher". Letters, names, gematria (including 500-900 for final forms), and name meanings are otherwise correct and hedged ("often taught as", "a story, not proven").
- The tav/tet hint "Tav and dagesh-Tav sound alike" is correct for Israeli and Sephardi, which matters for Ashkenazi `s`; the lessons say so.

### 24. Resh claim "nearly all Israeli Jews" use the uvular r (doubtful; confidence medium)
- `data/traditions/sounds.json` (resh, Israeli cell) and `data/pronunciation/consonants.json` (uvular-resh feature). The same file correctly says Sephardi/Mizrahi speakers use a tapped r; for Israelis, an alveolar r is common among older Mizrahi speakers. Wording should be softened or sourced; also lesson il23 (foreigner markers) builds on it.

### 25. English renderings: archaic JPS for Torah verses, original gloss elsewhere (ok-but-unclear; confidence medium)
- Torah-verse records use 1917 JPS ("thee/thou", "Fearful in praises"); siddur records use original glosses ("who bestows loving-kindnesses, creates all things" for קוֹנֵה הַכֹּל, where "possessor/owner" is the other common rendering; "the King of kings of kings"). Mixed register in one screen; the kone rendering is a translation choice for a rabbi.

## What checked out (so the reader knows what was NOT a problem)

- Letters: all 27 records (names with niqqud, Hebrew name forms, gematria, sound lines) and all 27 mnemonic example words; no error found.
- Vowel and consonant tables: tsere/segol/kamatz/patach/cholam/kubutz/shuruk/chataf/shva/dagesh/shin-sin records read as correct, with Ashkenazi variants (including regional cholam values) hedged and attributed; Ashkenazi tav-without-dagesh = s, kamatz = o/aw, tsere = ei, stress and Israeli r are correct as stated.
- Priestly Blessing (3 lines), Shema, Vahavta (as r37 and corpus), blessing formula, Hamotzi, wine blessing, candle blessing, Modeh Ani, Mi Chamocha, Mah Tovu, Adon Olam (9 lines), Kaddish (6 paragraphs), Birkat Hamazon opening, Sim Shalom, Hagomel, Havdalah and Hanukkah blessings: pointing and wording agree with the printed forms I know; the English glosses of the prayer lines are accurate.
- Reading lessons r01-r51: gloss and pointing correct except items 12, 13, 14, 19.
- Intermediate numerals il04 (feminine counting forms) are correct; gender-pair sentences gp-01..gp-16 and the 6 paradigms are correct; phrasebook (first 60 of 204 entries) is good: correct pointing, register tags, and honest "native-speaker-needed" flags.
- Encoding lint over all `he` strings in lessons, phrasebook, gender, niqqud, mnemonics and 6,303 vocabulary headwords: no misplaced final letters or multi-vowel letters other than the one in item 22.

## Sampling table

| Area | What I read or ran | Size | Coverage |
|---|---|---|---|
| Letters (`letters.json`, `mnemonics.json`, `interference.json`, `confusables.json`) | every record, all example words, all 22 interference pairs, 9 confusable sets | 27 + 27 + 22 + 9 | 100% |
| Vowel table (`niqqud.json`) | all records | 17 | 100% |
| Consonant table (`consonants.json`) | all letter records, features list | 27 | 100% |
| Tradition guide (`traditions/sounds.json`, `guide.json`) | sounds.json in full; guide.json first 3 situations plus summary text | 14 sounds | about 80% |
| Pronunciation extras | prayerwords (10), dial-words (15), stress (7), plene, exceptions, easy, dot-pairs, soundgap (first gap) | all except soundgap tail | about 90% |
| Syllable chips | ran `chipsFor` for all 24 chip words in Israeli and Ashkenazi | 24 | 100% |
| Transliteration engine | ran `transliterate` on about 90 words/lines in Israeli and Ashkenazi (priestly lines, Shema, formula, prefix forms, kamatz katan, shva clusters, Name forms); compared stored vocab translit to engine output for ranks 1-1500 (0 differences, so stored translit is engine-generated, not an independent check) | about 90 + 1,500 | targeted |
| Corpus registry | all 70 Hebrew texts read; English of 12 records read; Sefaria source for Aleinu re-fetched and compared; verify report read | 70 | Hebrew 100%, English about 17% |
| Vocabulary first 500 | all 500 rows by `frequencyRank` (translit, gloss, pos, gender, root) | 500 of 6,303 | 7.9% (top of list) |
| Vocabulary learner deck | first 120 of `deck-order.json` | 120 of 1,000 | 12% |
| Vocabulary random | seeded random 130 of the 2,500 top-ranked word entries (seed 7) | 130 | 5% of top 2,500 |
| Vocabulary targeted lookups | about 100 headwords (numbers, pronouns, greetings, family, question words) plus homograph/example analysis over all examples | about 100; all 5,706 examples counted | targeted |
| Roots | statistics over 1,611 rooted entries; family file header; first verbs | stats | statistical |
| Reading lessons | r01-r51: titles, goals, words, prayer links | 51 | 100% |
| Intermediate (il) lessons | il01-il24 words and goals | 24 | 100% |
| Intermediate (I-) lessons | I-01..I-11, I-13, I-14, I-18, I-20, I-25, I-28..I-32, I-36, I-38, I-47, I-50 | 25 of 50 | 50% |
| Gender | gender-pairs (16 pairs + 6 paradigms), templates (19 person pairs, irregular list head) | 41 | about 90% |
| Grammar notes | all 5 topics | 5 | 100% |
| Phrasebook | first 60 entries (greetings, politeness, fillers) | 60 of 204 | 29% |
| Encoding lint | final-form placement, multi-vowel letters, over lessons, phrasebook, gender, niqqud, mnemonics, prayerwords, I-lessons, all vocab headwords | about 7,500 strings | automated, 100% of those files |

## What I could not check

- Audio: I cannot hear. No judgement of any recording, TTS output, syllable audio, or of whether the audio matches the shown respelling in any tradition. The audio manifests, voices and prosody are unreviewed by me.
- Real speakers: no native Israeli, Sephardi or Ashkenazi speaker, teacher, cantor or rabbi was consulted. All "needs-native-review" flags in the repo remain open as far as I can tell; none of my findings substitutes for that.
- UXLC and the other source files themselves: the Tanakh cache is not in a fresh clone, so I trusted the repo's verify report for scripture agreement (I re-fetched only the Aleinu source line).
- Rendered UI: I read data and code, not the screens. Where a finding depends on whether a caveat is displayed (item 4), I say so.
- Rendered letter shapes, stroke order, cursive: not examined (images and strokes are outside this lens).
- `data/vocab/vocab5000.json`, the packs, theme files and Compare lookup shards: sampled indirectly only; the learner may see slightly different content there than in `words.json`.
- The unread remainder: vocabulary ranks 501-6,303 beyond the 130-word random sample, 25 of 50 intermediate lessons, entries 61-204 of the phrasebook, the guide.json situations after the first three, `torah-service-guide.json`, trope data, calendar and festival data, number words above 100, and root family correctness beyond statistics.
- Hebrew spelling and pointing of any word judged "ok" is "ok to my reading", not verified against a dictionary; I did not consult one.

## Where a native reader or rabbi must decide (consolidated)

1. How the Divine Name with a prefix is displayed in transliteration (item 2).
2. Cholam in the Ashkenazi setting, and which community the default represents (item 3).
3. Whether to build a Sephardi track and which community it models (item 1, item 14).
4. Nusach per prayer lesson; whether the Aleinu verb line and the Avot "kone" rendering are as intended (items 15, 25).
5. The pointing and gender questions: אֲנִי vs אָנִי in early lessons, פָּנִים gender, מְכָל reading, שִׁמְךָ vs שְׁמֶךָ (items 9, 10, 12, 21).
6. A1-B2 levels and the first 100 deck words (items 5, 6).
7. Preferred written form of slang (item 20).
