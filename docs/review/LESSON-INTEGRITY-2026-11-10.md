# Lesson integrity for a rabbi or cantor (2026-11-10)

Lane C (lesson sense and rabbi appeal). Scope: every lesson and unit from the prayer-reading path (r01 to r51) through the Israel track
(il01 to il24) and the intermediate units (I-01 to I-50), plus the prayer texts and notes those lessons open. The question asked of each item:
would a rabbi, cantor or careful Hebrew teacher object to it, and does it make sense in its place in the course?

Nothing here is a clergy or native-speaker review. It is a careful read by a non-clergy reviewer, with every fix checked against the repo's
own sources (the UXLC Torah text in `data/corpus/torah`, the fetched siddur snapshot, the vocabulary data) and pinned by tests.

## What was read

| Area | Items | How |
|---|---|---|
| Lessons r01 to r51, il01 to il24, I-01 to I-50 | 125 lessons: 250 goals, 940 words with glosses, 752 exercises (cues, prompts, answers, dialogues) | read in full; order checked against the letter and vowel sequence |
| Prayer texts (`data/corpus/registry.json`) | 70 entries, Hebrew and English | read in full; Torah-quoting siddur lines compared word by word with the Torah text |
| Prayer notes (`data/corpus/prayer-meta.json`) | 70 entries | read in full |
| Calendar day pages (`data/calendar/days.json`) | 18 days: dates, customs, readings, greetings | read in full; the calendar code's 5787 dates (September 2026 to August 2027) checked by hand |
| Class track, dialogues, service orders, prompts, prayer cards, traditions guide | 10 weeks, 7 dialogues, 3 orders, 33 prompts, 50 cards, 1 guide | read in full |
| Torah quotes (`data/torah-quotes.json`) | 60 verses | machine-compared with `data/corpus/torah`: 60 of 60 identical |

## Order and progression

The reading path is sound. Each of the 27 letter forms and 15 marks is taught once, in a primer order (Shin, Bet, Tav first, the alphabet
complete at r24), and `tools/curriculum/integrity.mjs` confirms no lesson uses a letter or mark before its path has taught it. Prayers come
in a sensible order for an adult: the Priestly Blessing line by line (r15, r25, r26, r27), the blessing formula (r28), the Shema and
V'ahavta (r22, r36, r37), then the Torah blessings, Modeh Ani, Mah Tovu, Kiddush, Avot, Mi Chamocha, Aleinu, Kaddish, Adon Olam and
Birkat Hamazon. The Israel track runs greetings, numbers, cafe, shop, transport, time, family, then present, past and future tense, close to
a typical ulpan order. The intermediate units branch correctly (I-01 after r51, I-11 after il24).

Two small order notes, not changed: class-track week 4 reads the zimun call (`רַבּוֹתַי נְבָרֵךְ`, with a vocal shva) one week before r14 teaches
the vocal shva; and r12 uses the pause form `אָנִי` so that "I" can be taught before the half vowels of r21 (the gloss now says so).

## Fixed in this pass

### Liturgy a congregant would notice

| Where | Was | Now |
|---|---|---|
| I-10 e13, e14 | The Priestly Blessing said by the leader answered with Amen | "Ken yehi ratzon", with a note that the answer is Amen when kohanim bless; goal updated |
| I-33 e09 | An Amen taught after "ki l'olam chasdo", which is mid-paragraph in Birkat Hamazon | The first blessing closes "Baruch atah Adonai, hazan et hakol"; the Amen follows that |
| I-33, registry `zimun-opening` | "Rabotai" glossed "Gentlemen" | "Friends" (literally "my masters"), and the Reform/egalitarian "Chaverai nevarech" named in the cue and the prayer note |
| I-08 e04 | Taught only the Sephardi "va'anachnu mishtachavim" | Cue gives the Ashkenazi and Reform "va'anachnu kor'im umishtachavim umodim" and where to bend and bow |
| I-19 e15 | The host says "shavua tov" at the end of a Friday-night dinner | "Shabbat shalom"; shavua tov glossed as said once Shabbat ends |
| I-10 e08, I-34 e02 | Hagomel response given only in the form said to a man | Cue names the form said to a woman |
| I-28 e09 | "Someone you wronged asks for forgiveness" (backwards) | Before Yom Kippur, the learner asks someone they may have wronged |
| I-32 e08 | "On the first night only the third blessing follows" | "On the first night only, a third blessing (Shehecheyanu) follows" |
| I-34 e12 | The friend says "may it be so" and the learner is told to answer with it | The friend wishes a safe trip; the learner answers "may it be so" |
| Service orders, Friday night | Baruch shem missing after the Shema | Added, as in the morning orders |
| Class track week 10 | "The wine blessing opens Friday-night Kiddush" | Kiddush opens with the Genesis verses, then the wine blessing and the Kiddush blessing |

### Hebrew

| Where | Was | Now |
|---|---|---|
| Registry `vayehi-binsoa` | `וַיֹאמֶר`: an earlier correction added the missing holam but dropped the dagesh | `וַיֹּאמֶר`, as in Numbers 10:35 (UXLC); audio manifest text and pronunciation shards follow |
| I-42 | `בֵּן כַּמָּה?` (absolute "son") | `בֶּן כַּמָּה?` (construct, for age) |
| I-42 dialogue | `חֲמוּדִים!` after "one boy" | `חָמוּד!` |
| I-45 dialogue | `קוֹמָה שְׁנַיִם` | `קוֹמָה שְׁתַּיִם` (koma is feminine) |
| Dialogue d-taxi | `לַשְּׂדֵה הַתְּעוּפָה` | `לִשְׂדֵה הַתְּעוּפָה` (construct state takes no article), as in I-23 |
| Dialogue d-shop | `אֶפְשָׁר לְהִתְנַסּוֹת?` ("gain experience") for trying on a shirt | `אֶפְשָׁר לִמְדֹּד?` |

### English glosses and learner text

- `לָךְ` is "to you (f.)" (r10) and `לְךָ` "to you (m.)" (r14); `אָנִי` and `וְאָנִי` are marked as verse-end forms (r12, r14); `תִּשְׁמְעוּ` is plural (r29).
- `בּוֹרֵא` "who creates" (r41); `לַאֲדוֹן` "to the Master (of)" and `הַכֹּל` "all; everything" (r44); `עוֹלָם` "world; eternity" (r46).
- `יָשָׁר` "straight (ahead)", no longer "right, straight" in the lessons that also teach "to the right" (I-15, I-39).
- `הוֹדָעָה` "message, notice" (I-16, I-36, I-49); `עָלֵינוּ` in the Kaddish is "upon us" (I-04); `תַּגִּידוּ` is "to more than one person" (il18).
- "the great, mighty and awesome God" for `הָאֵל הַגָּדוֹל...` (I-02).
- Hanerot Halalu English now matches its (Edot HaMizrach) Hebrew; the note gives the Ashkenazi wording.
- Learner-facing goals no longer mention lanes, `belts.json`, "proposed" rates or "the app's English line" (r14, r19, r34, r48, r49, r51, il23).
- Titles and goals that said "the corpus" now say what ALEF does not hold yet and point to the congregation's siddur (I-07, I-28, I-29, I-30,
  I-31, I-34). r51 is the "Grey-belt check". English lines in three dialogues now match their Hebrew (I-21, I-23, I-39).

### Notes a Reform rabbi will look for

- Aleinu: the conservative and reform notes name the line most of their books leave out ("shehem mishtachavim lahevel varik") and the bowing words.
- Kaddish and Oseh Shalom: the Reform addition "v'al kol yoshvei tevel" is named.
- Priestly Blessing: its Reform use as the closing blessing, answered "ken yehi ratzon".
- The traditions guide now speaks to learners in the US or Canada, and says the one survey it cites asked Jews in the United States only.

### Kept in step

The intermediate authoring sources (`tools/curriculum/intermediate/*.py`) carry every exercise, goal and title fix, so a rebuild with
`build.py` reproduces them (checked: each changed exercise rebuilds identically). The registry builder META carries the three registry fixes.
Derived files were rebuilt with their own tools, not by hand.

`tests/curriculum.liturgy-integrity.test.js` (14 tests) pins this pass with rules where a rule exists: no internal wording in learner
text; the leader's Priestly Blessing answered "Ken yehi ratzon"; no Amen after a mid-blessing phrase; no "Gentlemen"; Shabbat shalom at a
Friday dinner; Baruch shem after every Shema in the service orders; siddur lines that quote the Torah match its pointing word for word; the
Hebrew slips and glosses above stay fixed. The Priestly Blessing, mid-blessing Amen and Torah-pointing rules were each checked to fail when the
old data is put back.

## Held for John: names of God

None of these was changed. Each needs a decision; a recommendation is given where one seems clear. Questions for a rabbi are added to
[`../sensitivity/REVIEW-FOR-CLERGY.md`](../sensitivity/REVIEW-FOR-CLERGY.md) (section G).

1. **El as a vocabulary word.** r08 teaches `אֵל` = "God" as the first tzere word, with an audio clip that says "el". The healing verse
   `אֵל נָא רְפָא נָא לָהּ` is a word in I-10 (pronunciation "el na refa na lah") and a read-aloud in class-track week 5. Many Orthodox teachers
   say "Kel" outside prayer. Recommendation: drop `אֵל` from r08 (the lesson already has `בֵּית` and `לֵב` for tzere); keep the healing verse,
   which is a prayer.
2. **Elohim, Eloheinu, Elohei, Elohai** are vocabulary items with audio in r21, r22, r28, r42, I-01, I-27 and others. Orthodox practice
   says "Elokim" when practising. Reform practice says the word. Options: keep (Reform norm), or a "practice substitutes" setting, off by
   default, like the existing "G-d" setting.
3. **Adonai written as a word** (`אֲדֹנָי`, r21 "my Lord (read in place of the Name)" and I-02) is pronounced "adonai" in its own audio.
   Same choice as 2.
4. **Yah.** I-07 teaches `הַלְלוּ־יָהּ` and `מִן הַמֵּצַר קָרָאתִי יָּהּ` with "yah" in the pronunciation line. Orthodox teachers say "Kah"
   outside prayer. Same choice as 2.
5. **Ehyeh** appears in the Torah quote for Exodus 3:14 (`data/torah-quotes.json`), shown as Torah text. No change suggested.
6. **The four-letter Name**: already tracked in `docs/sensitivity/OPEN.md` and questions 1 to 8 of the clergy list (prefixed forms such as
   Gadlu and Ashrei, the holam-pointed form in Havdalah, r34's unpointed Name as a recognition item, typing drills). Unchanged.
7. **English house style for the Name.** Lessons and prayer English say "the LORD" (JPS 1917); the morning and evening prompts say
   "the Eternal"; the day pages say "God". Reform prayer books use "Adonai" or "the Eternal". Pick one for learner-written English
   (JPS quotations keep "the LORD").
8. **Hashem phrases.** il13 points the colloquial `בְּרוּךְ הַשֵּׁם`; the standard pointing is `בָּרוּךְ`. Left for John because it sits in a
   name phrase.

## Other decisions for John (not names of God)

1. **One prayer-book tradition.** Besides the 28 Bible verses (UXLC), the siddur texts come from three sources: Edot HaMizrach, 16 records
   (the blessing formula and HaMotzi, the Torah blessing and its Barchu, the Amidah opening and Avot, Aleinu, the haftarah blessings, the
   Havdalah flame and separation, the Hanukkah blessings, Hanerot Halalu, Maoz Tzur, Shehecheyanu); Nusach Sefard (Torat Emet), 17; and
   Ashkenaz (Metsudah), 9. A Toronto Reform congregation prays from an Ashkenazi-based book. The visible differences: Aleinu
   ("va'anachnu mishtachavim" vs "kor'im umishtachavim umodim", and the "shehem mishtachavim" line), "ner Chanukah" vs "ner shel Chanukah",
   and Hanerot Halalu. Re-sourcing those records from a public-domain Ashkenazi text needs network access (`tools/corpus/resource_metsudah.mjs`
   shows the method) and was not possible offline. Recommendation: make Ashkenaz the primary text and keep the Sephardi wording as a note.
2. **Reform wording as optional lines**: the matriarchs in Avot and Mi Sheberach, "g'ulah" for "go'el", "mechayei hakol" in Gevurot,
   the Reform Aleinu alternative, "v'al kol yoshvei tevel". Needs a licence-clean source (gap `g-matriarchs` already open).
3. **Shema English in capitals.** JPS 1917 sets Deuteronomy 6:4 in capitals ("HEAR, O ISRAEL..."), and it shows that way in r22, the
   reader and the home page. It reads as shouting on a phone. Changing case keeps the JPS words; it was left because it also changes the
   Torah reader's verse.
4. **Pointing items for a native reviewer**: `בְּטַח` vs `בֶּטַח` (I-12, I-13, I-23, I-35 use the first, the dialogues and register ladder
   the second; the phrasebook line uses the first, so it was not changed); `אַרוּחַת בֹּקֶר` (il17) should be `אֲרוּחַת`, but it is the shared
   vocabulary record `pe9c62881` with its own audio, so it belongs to the vocabulary lane; Adon Olam `אִישָׁן` (registry) vs `אִישַׁן`
   (I-09 word and exercise); I-22 `מָה כְּתֹבֶת?` should be `מָה הַכְּתֹבֶת?`, but `הַכְּתֹבֶת` is not attested in the data.
5. **Content gaps a rabbi will notice**: I-50 now teaches `גְּמַר חֲתִימָה טוֹבָה` (moved to the end of that lesson's word list so existing audio ids stay stable) as the Yom Kippur greeting, alongside `שָׁנָה טוֹבָה` for Rosh Hashana. `צוֹם קַל` is still absent: it is not in the sources the lessons may draw on, so it stays a named gap rather than invented Hebrew. I-31 (Purim) still uses the Hagomel line only to spot a word. r34 now points at the already-sourced calendar date `ט״וּ בִּשְׁבָט` as a gershayim example and does not invent a siddur abbreviation.
6. **Lesson titles are sentence case** ("Shin and Bet: your first two letters"); the house rule is Title Case. Left for the copy lane.
7. **Branch name.** This work sits on the lane branch the brief named, which does not follow the `john/<topic>-<date>` pattern in
   `CONTRIBUTING.md`; `sh tools/git/branch-cleanup.sh --apply` renames it when the work is merged.
8. `node tools/meta/scan.mjs --text` reports one finding that was already on `main` before this branch (`tests/audio.music.test.js:137`).

## Still needs a rabbi, cantor or native speaker

Every Hebrew line and gloss above is still unreviewed by a person qualified to sign it off. The highest-value review, in order: the 20
synagogue lessons (I-01 to I-10, I-26 to I-35) by a cantor; the prayer notes in `prayer-meta.json` by a Reform rabbi (27 still say
"unknown"); the 30 Israel lessons by a native speaker (register labels, slang, gender forms); the day pages by a rabbi. The review packets in
`docs/review/out` and `docs/review/packs` were built before this pass; rebuild them (`node tools/review/build_packet.mjs`,
`node tools/review/build-packs.mjs`) before sending them out.

## Score

Lane C, rabbi appeal and lesson sense: **81 / 100** after the later 10 November 2026 passes (an estimate, not a measurement; the 78 was from the first overnight pass, and about 68 before that). The later lift is the I-50 Yom Kippur greeting, the r34 gershayim example, named tradition wording on I-08 / I-32 / I-28, and the Judaic-to-Israeli companion notes on il01, r51, I-11 and I-19. None of those lines is clergy-reviewed.

What would still raise it:
- One Ashkenazi-based prayer text, re-sourced with network access (+6).
- John's decisions on the eight name items above, then applied (+4).
- Reform optional lines (matriarchs, Aleinu alternative) from a licensed source (+4).
- A cantor's pass over the 20 synagogue lessons and a native speaker's over the 30 Israel lessons (+6, and it is the only thing that
  lets any line be marked reviewed).
- A sourced `צוֹם קַל` and festival-specific greetings that still have no pointed tokens (+1).

## Round 2 (2026-11-10, later the same night)

### Plan to reach 95 to 100

| Step | Gain | Status |
|---|---|---|
| Israel track as practical units: grammar notes, spaced unit review, listening and speaking drills, no new Hebrew | +3 | built this round (`#/israel-units`, [`../curriculum/ISRAEL-UNITS.md`](../curriculum/ISRAEL-UNITS.md)) |
| Bring in the sourced Hallel verses and festival Kiddush from `feature/lesson-integrity-2026-11-10` | +3 | conflict resolution worked out; blocked on that branch's 35 failing tests ([`BRANCH-REVIEW-2026-11-10-R1.md`](BRANCH-REVIEW-2026-11-10-R1.md)) |
| John's decisions on the eight name items and on the default rite, then applied | +4 | waiting for John |
| Reform optional lines (matriarchs, Aleinu alternative) from a licensed source | +4 | needs a source and network access |
| A cantor on the 20 synagogue lessons, a native speaker on the 30 Israel lessons and the unit grammar notes | +6 | needs people |
| Sourced entries for the Yom Kippur greetings, then add them to I-28 and I-50 | +1 | needs a source |

### Built this round

The Israel track mapped onto practical units the way a structured conversation course is built: 13 units (Hello and Introductions,
Sound Like a Local, Numbers and Prices, Cafe and Ordering Food, Shopping and Paying, Getting Around, Time Plans and the Phone, Verbs Now
and Yesterday, People Family and Opinions, Health Help and Emergencies, Home Work and Study, Israeli Life, Capstone). Every il lesson is
core and every Israel B1 lesson is "go further"; each unit says what the learner will be able to do, explains the pattern behind its
phrases in one or two short notes, and has a unit review that comes back after 1, 3, 7, 14 and 30 days, a listening drill (hear the
word's clip, pick the meaning, graded) and a speaking drill (English cue, say it aloud, check and hear it). Every Hebrew example and drill
line is a verbatim line of that unit's own lessons, and the test fails on anything else. The route is preview, its code and data load on
demand, and the grammar notes say they are not yet reviewed by a teacher.

### Score

**81 / 100** (estimate). The gain is the unit structure and drills; the rest of the plan above needs a decision, a source or a person.

## Round 3 (Review Round 2 of 5)

### Gaps Closed

- **Two parallel courses.** The Practical course on `feature/lesson-integrity-2026-11-10` (`#/practical`, 33 units) and this
  branch's `#/israel-units` cover the same ground. The plan now converges on `#/practical` and retires `#/israel-units` at merge
  ([`../curriculum/PRACTICAL-200-PAGE-PLAN.md`](../curriculum/PRACTICAL-200-PAGE-PLAN.md)).
- **Lessons with no unit.** il16, il19, il23, il24 and I-18 had no Practical unit. Three units were added (`pu-verbs`,
  `pu-conversation`, `pu-army`), and a test now fails if any Israel-track lesson is left out.
- **Grammar notes that described files.** The Practical branch's page notes read "This page uses only Hebrew already stored in
  data/corpus/phrasebook.json…". The first 20 pages now have real grammar points, and a test bans file talk in a page note.
- **Woman's forms missing.** The phrasebook gives only the man's form of how are you, I'm sorry, I don't understand and do you
  speak English. The audio manifests hold both forms with clips, so the pages teach them as pairs.

### Built This Round

- A 194-page outline in 36 units and five levels, with ids, kinds, titles, routes and lesson links
  (`data/curriculum/practical-pages/outline.json`).
- The first 20 pages written in full: 103 items with pointed Hebrew, transliteration, English and clip ids; 20 grammar points;
  speaking prompts; listening rounds; spaced review of earlier items (now `written.json`, readable copy in
  [`../curriculum/PRACTICAL-WRITTEN-PAGES.md`](../curriculum/PRACTICAL-WRITTEN-PAGES.md)).
- A v3 page schema that only adds optional fields to the v2 page (`page.schema.json`).
- 10 tests. Every Hebrew line must match its source byte for byte after NFC normalisation. Grammar Hebrew must come from the
  page's own items or earlier ones. Clips must be in a manifest in both voices, or be marked as gaps. Review items must come from
  earlier pages. The outline must have 100 to 200 pages and cover every lesson.

### Score

**85 / 100** (estimate). Raised by the outline, the 20 written pages and the convergence plan. To raise it further:

- the merge decision and v3 support in `practical.view.js` (+3)
- the remaining 174 pages to the same standard (+4)
- native-speaker and cantor review (+6)
- John's decisions on the divine-name holds (+2)

## Round 4 (Review Round 3 of 5)

### Plan to Reach 95 to 100

| Step | Gain | Status |
|---|---|---|
| Fix lesson words that mean something else, and the clips that say them | +2 | built: charger, course and map, with clip rows marked missing and a clip-text test |
| Finish level 0 of the Practical course | +2 | built: 30 of 30 level-0 pages written |
| Merge decision and v3 support in the Practical view | +3 | waiting for John |
| Clips for corrected words and dialogue lines | +1 | needs a rendering run |
| Native-speaker and cantor review; divine-name decisions | +6 | needs people and John |

### Score

**88 / 100** (estimate). See [`BRANCH-REVIEW-2026-11-10-R3.md`](BRANCH-REVIEW-2026-11-10-R3.md).

## Round 5 (Review Round 4 of 5)

Built:
- **Merge.** The feature branch is merged into this branch, so one green lesson branch carries both the live Practical course and
  the liturgy fixes.
- **Written pages in the live view.** The 30 written pages now show in `#/practical`.
- **Learner copy.** File-talk is stripped from the draft pages' grammar notes, and the intro line is plainer.
- **Tests.** Seven new tests, two of them rendering real pages.

Review: [`BRANCH-REVIEW-2026-11-10-R4.md`](BRANCH-REVIEW-2026-11-10-R4.md). **90 / 100** (estimate).

## Round 6 (Review Round 5 of 5)

Built:
- **Failed clips pulled for good.** The 67 items whose clips failed are now hidden through a committed list. Before, the hiding
  depended on an untracked file.
- **The cafe unit written in full.** All ten `pu-cafe` pages are written, for 40 written pages.
- **Reply on the fails.** `PRACTICAL-FIXES-r2.md`: all 67 kept as sourced and pulled from learner pages; none rewritten.

Final review: [`BRANCH-REVIEW-2026-11-10-R5.md`](BRANCH-REVIEW-2026-11-10-R5.md). **91 / 100** (estimate).

## Round 7 (Final Review, Second Pass)

Built:
- **Two more units written.** `pu-restaurant` (7 pages) and `pu-shop` (9 pages): 56 written Practical pages are live, and none
  uses an item whose clip failed.
- **Restaurant outline cut** to what the sources can honestly fill. The outline is now 191 pages.
- **Hidden-item test widened** to every unit.

**92 / 100** (estimate). See the second pass in
[`BRANCH-REVIEW-2026-11-10-R5.md`](BRANCH-REVIEW-2026-11-10-R5.md).

## Round 8

**Built:** level 1 is finished. `pu-directions` (7 pages), `pu-transport` (9) and `pu-small-talk` (8) are written to the same
sourced standard, so all 80 pages of levels 0 and 1 are live.

**Kept out:**
- every item on the hidden list;
- `il13-w4` (בְּרוּךְ הַשֵּׁם), which names God and stays with John's decisions.

**One English gloss corrected:** the woman's form of "how old are you?" now reads "daughter of how much", not "son".

**Open:**
- 57 dialogue lines with no audio;
- levels 2 to 4 (111 pages);
- native and cantor review;
- John's held decisions.

**93 / 100** (estimate).

## Round 9

**Built:** level 2 is started. `pu-verbs-now` (3 pages), `pu-past` (2), `pu-family` (5) and `pu-home` (4) are written, for 94
live pages.

**Found and fixed:** two of this plan's added units used their own ids (`pu-verbs`, `pu-conversation`) that the live course does
not have. Any page written for them would never have shown. They now use the live ids `pu-verbs-now`, `pu-past` and
`pu-decide`. A new test fails if an outline unit has no live unit.

**New source:** the gender pairs in `data/curriculum/gender-pairs.json` now supply women's forms that the phrasebook lacks. They
are original, unreviewed sentences with no clips yet, and the pages mark them for native review.

**93 / 100** (estimate). Levels 2 to 4 still have 97 pages to write.

## Round 10 (Launch Check)

- **Up to date with `main`.** `main` (the Torah audio fix rounds) is merged into this branch, with no conflicts.
- **Two more units.** `pu-time` and `pu-weather` are written, for 101 live Practical pages.
- **Score: 93 / 100** (estimate). See the launch-check pass in
  [`BRANCH-REVIEW-2026-11-10-R5.md`](BRANCH-REVIEW-2026-11-10-R5.md).
