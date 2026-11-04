# V0 content check: lessons r01 to r08

Scope: the first eight lessons of the v0 path (r01 to r08) in `data/curriculum/lessons.json`, the first-day on-ramp (`data/firstday/onramp.json`, `first10.json`), the letter, vowel and hint data they use, and the choice questions the lesson page generates at run time.

Status: DRAFT. Nothing here was checked by a native or fluent reader. "Fixed" means the text was changed to agree with `data/pronunciation/*.json` and `src/pronunciation/forTradition.js`; it does not mean the Hebrew was proofread.

## What was actually checked

- `node tools/hebrew-lint/cli.mjs` logic (`lintString`) run over r01 to r08, `onramp.json`, `first10.json`, `hints.json`, `mnemonics.json`, `confusables.json`: 0 findings. Whole-repo lint counts are unchanged by this pass.
- Respellings of every r01 to r08 word and of the on-ramp syllables in all three traditions, via `respellAll` (see table below).
- The real question builder (`buildChoiceQuestions`, tradition passed through) was run for r01 to r08 in all three traditions with a few seeds, and the full distractor space was then analysed statically from `consonants.json` (IPA overlap between the target letter and every possible distractor letter) and from the word pool the lesson page passes in (`lessons.filter(not A_ID).flatMap(words)`, 940 entries). A 60-seed brute-force run did not finish in the time available, so the "can appear" statements below come from the static analysis plus the sampled seeds, not from an exhaustive run.
- No audio, no native review, no real-device check.

Respellings (siddur scheme), israeli = sephardi in every row:

| Hebrew | israeli / sephardi | ashkenazi |
|---|---|---|
| שָׁב | shav | shov |
| שַׁבָּת | shabat | shabos |
| בַּת | bat | bas |
| שָׁלוֹם | shalom | sholom |
| לוֹ, לֹא | lo | lo |
| בִּי, לִי | bi, li | bi, li |
| אַבָּא | aba | abo |
| בָּא | ba | bo |
| הָיָה | hayah | hoyoh |
| אֵל, בֵּית, לֵב | el, beit, lev | eil, beis, leiv |

These agree with the niqqud records (kamatz aw, tav without dagesh s, tzere ei in Ashkenazi). Rule-generated, not checked by a native speaker.

## Fixed (lesson data, `data/curriculum/lessons.json`, goals only; ids, titles, words and steps untouched)

| # | where | issue | change |
|---|---|---|---|
| F1 | r01 goals[0] | Said Bet is "(b)". The only r01 word, שָׁב, has Bet without a dot, which is v (shav). The goal contradicted the word. | "Name and sound Shin (sh) and Bet (b with the dot inside, v without)" |
| F2 | r01 goals[1] | "the two 'ah' vowels (kamatz, patach)": in Ashkenazi kamatz is "aw" (niqqud.json kamatz.english.ashkenazi; word respelling shov). | "Read kamatz and patach with them: both are 'ah' (Ashkenazi reads kamatz as 'aw')" |
| F3 | r02 goals[0] | "(Shabbat)" only; Ashkenazi setting shows Shabbos. | "Read שַׁבָּת (Shabbat; Ashkenazi says Shabbos)" |
| F4 | r06 goals[0] | "chirik with and without yod": both r06 words (בִּי, לִי) have a yod; no word in the repo data with only letters taught by r06 shows chirik without yod, so the goal promised practice the lesson does not give. No Hebrew invented. | "Read chirik as 'ee' (the words here have a yod after it; chirik without a yod sounds the same)" |
| F5 | r08 goals[0] | "'ay'" is the Ashkenazi value only; niqqud.json says Israeli and Sephardi "e as in bed" (the app default is sephardi). | "Read tzere with and without yod: 'e' as in bed (Israeli, Sephardi) or 'ay' as in they (Ashkenazi)" |

## Open findings (not fixed: owned elsewhere, code, or needs a decision)

Severity: H = a learner can be marked wrong for a right answer, or taught something false in a supported tradition; M = misleading or inconsistent; L = polish.

### Quiz answers that are not unambiguous (generator: `src/curriculum/exercises.session.js` `buildChoiceQuestions` / `letterDistractors`, called from owned `lesson.view.js`)

Status update: Q1 to Q10 are addressed by the current builder (phoneme-based `soundsClash` in the learner's tradition, base/final exclusion, `glossesOverlap` plus skeleton comparison for glosses, pool limited to lessons up to the current one). Checked by running `node --test tests/choice-questions.test.js` (5 of 5 pass): letter-sound and letter-name rules over every non-intermediate lesson, 8 seeds, 3 traditions; word-meaning rules over the first 40 lessons only. Not exhaustively run beyond that. Q11 is unchanged (the `why` text still reads "which sounds like <description>"). The table below keeps the original findings for the record.

| # | id pattern | issue | proposed fix |
|---|---|---|---|
| Q1 H (addressed in builder, test-checked) | `r01-q-sound-bet` ("b with dagesh, v without") | Distractor pool excludes only letters with the same Israeli `sound.en`. Vav ("v as in van") can appear and is also a "v" sound. | In `letterDistractors(..., bySound)` compare phonemes, not `sound.en`: drop any letter whose IPA in the learner's tradition (consonants.json) shares a phoneme with the target, in any variant (bet/vav, shin/samekh, tav/samekh/tet, mem/final mem, alef/ayin). |
| Q2 H (addressed in builder, test-checked) | `r03-q-sound-vav` | Bet can appear as a distractor; Bet without dagesh is v. | Same as Q1. |
| Q3 H (addressed in builder, test-checked) | `r01-q-sound-shin` | Prompt includes "s with the left dot"; Samekh (s) can appear. | Same as Q1. |
| Q4 H (addressed in builder, test-checked) | `r02-q-sound-tav`, ashkenazi | Ashkenazi prompt is "s without dagesh (Shabbos), t with dagesh"; Samekh and Shin/Sin are s sounds and can appear. Under israeli/sephardi Tet is already excluded (same `sound.en`). | Same as Q1 (needs a tradition-aware phoneme check). |
| Q5 H (addressed in builder, test-checked) | `r03-q-sound-mem-final` and `r03-q-name-mem-final` | Mem (מ) has an identical sound and can be offered next to Final Mem. For the name question "Mem" vs "Final Mem" for ם is arguable. | Exclude the base form of a final letter (`finalOf` in letters.json) from distractors of the final letter, both question kinds. |
| Q6 H (addressed in builder, test-checked) | `r07-q-sound-alef` | "silent / a glottal stop" (Israeli, Sephardi) or "silent" (Ashkenazi): Ayin (silent) and He (silent at word end) can appear and are also silent. | Same as Q1, plus treat alef, ayin and word-final he as one "silent" class. |
| Q7 M (addressed in builder, test-checked) | `r05-q-word-1` (answer "peace") | Distractor "a peaceful Sabbath (greeting)" (r04) can appear and contains the answer. | In the word-meaning distractor filter also reject pool glosses that contain the answer as a whole word, and glosses whose unpointed consonants equal the target's. |
| Q8 H (addressed in builder, test-checked) | `r03-q-word-1` (answer "peace; hello") | Pool contains unpointed שלום with gloss "peace" (r35); its `he` differs from the pointed word so the `p.he !== w.he` filter lets it through. Also "hello (on the phone)", "to peace, in peace", "who makes peace", "great peace (Aramaic)" can appear. Same for `r02`/`r04` "Sabbath" vs unpointed שבת "Sabbath" (blocked for r02/r04 only because the exact gloss is in the lesson's own keys). | Compare consonant skeletons (strip U+0591-U+05C7) in the filter, and apply the whole-word gloss test from Q7. |
| Q9 M (addressed in builder, test-checked) | `r08-q-word-1` (answer "God") | Pool entries "our God", "God of", "thank God (common reply)", "you are my God", "God, please heal her" and "the Name (read aloud as Adonai)" can appear: arguably also correct for אֵל. | Same whole-word gloss test. |
| Q10 M (addressed in builder, test-checked) | all word-meaning questions | The distractor pool is every non-intermediate lesson word (940 entries), so a first-week learner sees glosses from far ahead ("who has kept us alive", "the lights of the fire", "pizza", "the Name (read aloud as Adonai)"). Not wrong, but the odd-one-out is trivially guessable by length or register, and some are sensitive for a day-1 learner. | Restrict the pool to words of lessons up to and including the current one plus the on-ramp words; when too few, add short single-word glosses only. Needs a pool of safe beginner glosses (data decision, not invented here). |
| Q11 L (open) | `*-q-name-*` and `*-q-sound-*` `why` text | "This is Alef, which sounds like silent / a glottal stop ..." and "Shin ... sounds like sh with the right dot, s with the left dot" read oddly because the sound line is a description, not a sound. | Template: "Its sound: <line>" when the line is not a bare phoneme. |

### Hebrew / pronunciation consistency

| # | where | issue | proposed fix |
|---|---|---|---|
| P1 M (fixed) | `data/curriculum/hints.json` kind `wrong-vowel` example | "two dots side by side under a letter (tzere) say 'ay'": Israeli/Sephardi value is "e as in bed" (niqqud.json). File is staged by another change; not edited here. | "(tzere) say 'e' as in bed ('ay' in Ashkenazi)". |
| P2 M (fixed) | titles r08 "Tzere: the 'ay' vowel" (also quoted in `docs/host-kit/facilitator-guide.md:45`, PATH.md, journey fixtures) | Same issue as F5, in the title. Not changed because titles are quoted in docs and test fixtures. | "Tzere: the 'e' / 'ay' vowel" and regenerate PATH.md and fixtures together. |
| P3 M | `data/firstday/onramp.json` (on-ramp lane) | The on-ramp teaches kamatz only as "the small T"; fine. But `first10.json` `vowels[0].sound "ah"` and word sound "shah-LOHM" are Israeli only (the file says so). With an Ashkenazi setting the on-ramp screen text and the generated respelling (sho / shov) disagree if the screen shows the static "ah". | Have the view read `vowelSound(rec, tradition)` for the kamatz line; confirm the view does so (not checked, view is owned). |
| P4 L | `first10.json` vowel id `holam-male` vs `plene.json` id `cholam-malei` and niqqud id `cholam` | Three spellings for one vowel. | Pick `cholam-malei`; update first10.json when that lane is free. |
| P5 L | r03 goals[1] "Vav with a dot above = 'oh'" | Ashkenazi cholam is "o" in the primary record but "oy" (Polish/Galician) or "ow" are listed variants; the lesson shows sholom for ashkenazi. Acceptable for a first lesson. | Optional: add "(Ashkenazi variants differ)". Needs native review before changing. |
| P6 L | r04 goals[1] "Pass the white-belt 1 check: 6 letters, 3 vowels" | Letters (shin, bet, tav, lamed, final mem, vav) = 6 and vowels (kamatz, patach, cholam) = 3, consistent. But belts.json says white = r01 to r09 and lists dagesh as a sign, so "3 vowels" omits dagesh and shin-dot. | Say "6 letters, 3 vowel signs, the dagesh and the shin dot". |
| P7 L | r07 goals "Alef is silent carrier of its vowel" | Sephardi consonants.json gives alef IPA [ʔ] and Israeli "[ʔ] or silent"; "silent" is the Ashkenazi value only. The letter data wording ("silent / a tiny glottal stop") is correct; the goal is shorter. | "Alef carries its vowel; in Israeli and Sephardi it can be a tiny pause, in Ashkenazi it is silent". |
| P8 L | `word-vocab-map.json` | `r03:2` (לוֹ), `r06:1` (בִּי), `r08:2` (בֵּית) are unmatched and `r07:2` (בָּא) is ambiguous (h367896de "Coming, next, upcoming" vs h66c2ffb6 "to come"). The lesson gloss "he came" matches neither word's vocab gloss. Vocab data lane owns this. | Map בָּא to h66c2ffb6 and gloss "he came (to come)". |
| P9 L | vocab glosses | `words.json` glosses אֵל as lower-case "god"; the lesson says "God". Same word. | Make one convention (the lesson form). |

### Needs a native reviewer (not changed, not verified)

- Every pointed word in r01 to r08 and the three Priestly Blessing lines r05 reference: `bless-priestly-1..3` carry JPS 1917 English and UXLC Hebrew, which is a source, but the pointing here has not been read by a person.
- Letter names in Hebrew (`nameHe`: אָלֶף, בֵּית, הֵא, וָו, יוֹד, לָמֶד, שִׁין, תָּו, מֵם סוֹפִית) and the mnemonic example words (בַּיִת, וֶרֶד, יָד, הַר, לֶחֶם, מַיִם, תּוֹדָה, יָם), flagged `needsNativeReview` in the data.
- The gloss "a peaceful Sabbath (greeting)" for שַׁבָּת שָׁלוֹם and "he returned" for שָׁב (both ordinary, but the lesson authors' own wording).
- Gloss "house of" for בֵּית (construct state) and "God" for אֵל.
- All three Latin respellings (rule-generated).
- Israeli and Sephardi share Latin respellings in this engine; Sephardi differences exist only in IPA and the English vowel wording (see forTradition.js header). Any statement that implies otherwise should be marked.

## Extension: lessons r09 to r51 (beginner read path)

Method as above, applied to r09 to r51 (all `read` lessons that are not `intermediate`; r41 to r47 and r48 to r51 have words only, no letter or vowel lists). Checked: each pointed word respelled in all three traditions with `respellAll`; goal strings read against the lesson's own words, the letter and niqqud records and `belts.json`; `hebrew-lint` over the file (no new findings; whole-repo lint counts are those of `node tools/hebrew-lint/cli.mjs`, not changed by this pass); quiz tests as in the status note. Not checked: audio, native review, device. The respellings are rule-generated and agree with the niqqud records except where listed below.

### Fixed (goal strings only in `data/curriculum/lessons.json`; ids, titles, words untouched)

| # | where | issue | change |
|---|---|---|---|
| G1 | r09 goals[0] | named Dalet, which no lesson word contains and is not taught until r18 | "Tell Resh by its rounded corner (Dalet, taught in r18, has a sharp corner)" |
| G2 | r10 goals[0] | "Kaf with/without dagesh": the words are כִּי (dagesh) and final-Kaf לָךְ; no non-final Kaf without dagesh | names the two actual cases |
| G3 | r11 goals[1] | promised hearing a tzere/segol difference; niqqud.json says Israeli tzere and segol sound the same, and no r11 word has tzere | states: same in Israeli and Sephardi, different in Ashkenazi |
| G4 | r16 goals[0] | "Pe without dagesh f": the words show final Pe (אַף), not a non-final soft Pe | "Pe with dagesh (p) from final Pe (f)" |
| G5 | r17 goals | "from kaf and he": no He in the words; "final chet/ayin/he": only final chet (רוּחַ) occurs | chet only, with the rule noted for later |
| G6 | r19 goals[0] | "silent in the Ashkenazi/Israeli norm": consonants.json lists Sephardi ayin as [ʕ] while its English line says silent; Israeli is "[ʔ] or silent" | states each tradition as the data does |
| G7 | r20 goals[0] | "tell apart" read as a sound task; Samekh and Sin are both "s" in every tradition | says by shape and dot, and the sounds |
| G8 | r23 goals[0] | Tet vs Tav is a shape task only (same sound with dagesh; Ashkenazi Tav without dagesh is "s") | notes this |
| G9 | r25 goals[1] | "doubled letter": Israeli/Sephardi do not say a doubled consonant (niqqud.json, dagesh note) | notes this |
| G10 | r28 goals[0] | Latin spelling is the Israeli/Sephardi style only | notes the Ashkenazi respelling differs |
| G11 | r34 goals[0], goals[1] | "Hashem" appears in no lesson word; no abbreviation word is in the lesson | Hashem dropped from the goal; abbreviation goal marked as having no example word yet |
| G12 | r35 goals[0] | "10 unpointed words" but the lesson lists 3 (שלום, שבת, ברוך) and no steps | "the unpointed familiar words here" |

### Open findings (not changed)

| # | where | issue | proposed fix |
|---|---|---|---|
| X1 H | r32 קָדְשׁוֹ (kamatz katan example) | `respellAll` gives israeli "kadesho", ashkenazi "kodesho". The lesson teaches that this kamatz sounds "o" and the shva after it is silent, so the respelling contradicts its own lesson (חָכְמָה in the same lesson comes out "chokhmah", correct). | `src/pronunciation/transliterate.js` rule for kamatz katan before a shva-closed consonant when the next consonant is shin; engine owner. Native review of the expected reading. |
| X2 H | r29 וּבְכָל "and with all" | respelled "uvekhal" / "uvekhol"; in V'ahavta (the use r29 targets) the kamatz is read "o" (r32 shows כָּל as "kol"). Engine cannot know without the maqaf. | Native review; consider a dictionary override or a gloss note. |
| X3 M | r45 and r30 שְׁמֵהּ | respelled "shemeh" (Ashkenazi "shemeih") with a sounded shva; reading aloud of the Aramaic phrase is commonly "sh'mei". Unverified. | Native review. |
| X4 M | r43 נֶאְדָּר | respelled "nedar" (alef dropped); other words show alef as an apostrophe (ya'er). Inconsistent. | Native review of the intended reading; engine rule. |
| X5 M | r09 רֹאשׁ, r21 אֱלֹהִים, r40 אֹהָלֶיךָ | cholam without vav appears before it is taught (r03 teaches Vav with the dot above). | Add a line to a goal or a hint when the lesson owner allows. |
| X6 M | r12 goals[0] | "final Nun from Vav": no r12 word contains Vav. Practice is by shape only. | Accept, or add a Vav word from the repo. |
| X7 M | r34 title and words | title says "Final-letter and gershayim / abbreviation marks"; words are only יהוה and אדני (unpointed). Respell of אדני is "dny" (consonants only; unpointed words cannot be respelled). Nothing teaches gershayim. | Add abbreviation examples from verified repo data; native review. |
| X7b M | r35 | lesson has 3 words, no steps; any count of words promised elsewhere (docs, UI) is unverified. | Data lane. |
| X8 L | r46 עוֹלָם gloss "the world" | the word has no article; r19 glosses the same word "world; forever". Not changed: the word is mapped by index in `word-vocab-map.json`. | Gloss "world". |
| X9 L | r41 בּוֹרֵא gloss "creator" | participle, usually glossed "who creates"; "creator" is the common English blessing translation. | Native review. |
| X10 L | r14 goals[1], r09 "Dalet (later)" style | "lane 3 drills" is internal wording shown to the learner. | Reword when the lesson owner allows. |
| X11 L | r42 goals[0] | "opening of the Amidah": the words are the Avot blessing, the first blessing (not the opening line). | Reword to "the first blessing (Avot)". |
| X12 L | r36 goals, r22, r26, r28 | Words listed are a subset of the prayer lines (the Name is not in the word lists). Goals refer to the prayer lines, which exist for those lessons. Fine; noted. | None. |
| X13 L | generated files `docs/review/out/06-lessons.*`, `book/out/alef-book.html` | still show the old goal wording (not regenerated here). | Regenerate by their owners. |

### Native reviewer additions

Every r09 to r51 pointed word and gloss above (all unreviewed by a person); the Aramaic Kaddish words (r30, r45); the unpointed sample (r34, r35).

## What looked fine

- Letter and vowel ids used by r01 to r08 (shin, bet, tav, lamed, mem-final, vav, yod, alef, he; kamatz, patach, shin-dot, dagesh, cholam, chirik, tzere) all exist in letters.json, consonants.json and niqqud.json.
- Word choices only use letters and vowels taught at or before their lesson (checked r01 to r08).
- Letter-name questions: one correct name, distractors are other letters (look-alikes first); only the final/base pair (Q5) is arguable.
- On-ramp checks (`בָ` vs `ב`; `שָׁ` vs `בָ`): one correct answer each, no tradition dependence.
- Confusable-letter tips and the mnemonic shape and sound statements for the nine letters agree with the letter data.
- First-day word list (שָׁלוֹם, שָׁם, מָה) matches the Priestly Blessing source claim (שָׁלוֹם is the last word of Numbers 6:26).
