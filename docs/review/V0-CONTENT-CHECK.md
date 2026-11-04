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

| # | id pattern | issue | proposed fix |
|---|---|---|---|
| Q1 H | `r01-q-sound-bet` ("b with dagesh, v without") | Distractor pool excludes only letters with the same Israeli `sound.en`. Vav ("v as in van") can appear and is also a "v" sound. | In `letterDistractors(..., bySound)` compare phonemes, not `sound.en`: drop any letter whose IPA in the learner's tradition (consonants.json) shares a phoneme with the target, in any variant (bet/vav, shin/samekh, tav/samekh/tet, mem/final mem, alef/ayin). |
| Q2 H | `r03-q-sound-vav` | Bet can appear as a distractor; Bet without dagesh is v. | Same as Q1. |
| Q3 H | `r01-q-sound-shin` | Prompt includes "s with the left dot"; Samekh (s) can appear. | Same as Q1. |
| Q4 H | `r02-q-sound-tav`, ashkenazi | Ashkenazi prompt is "s without dagesh (Shabbos), t with dagesh"; Samekh and Shin/Sin are s sounds and can appear. Under israeli/sephardi Tet is already excluded (same `sound.en`). | Same as Q1 (needs a tradition-aware phoneme check). |
| Q5 H | `r03-q-sound-mem-final` and `r03-q-name-mem-final` | Mem (מ) has an identical sound and can be offered next to Final Mem. For the name question "Mem" vs "Final Mem" for ם is arguable. | Exclude the base form of a final letter (`finalOf` in letters.json) from distractors of the final letter, both question kinds. |
| Q6 H | `r07-q-sound-alef` | "silent / a glottal stop" (Israeli, Sephardi) or "silent" (Ashkenazi): Ayin (silent) and He (silent at word end) can appear and are also silent. | Same as Q1, plus treat alef, ayin and word-final he as one "silent" class. |
| Q7 M | `r05-q-word-1` (answer "peace") | Distractor "a peaceful Sabbath (greeting)" (r04) can appear and contains the answer. | In the word-meaning distractor filter also reject pool glosses that contain the answer as a whole word, and glosses whose unpointed consonants equal the target's. |
| Q8 H | `r03-q-word-1` (answer "peace; hello") | Pool contains unpointed שלום with gloss "peace" (r35); its `he` differs from the pointed word so the `p.he !== w.he` filter lets it through. Also "hello (on the phone)", "to peace, in peace", "who makes peace", "great peace (Aramaic)" can appear. Same for `r02`/`r04` "Sabbath" vs unpointed שבת "Sabbath" (blocked for r02/r04 only because the exact gloss is in the lesson's own keys). | Compare consonant skeletons (strip U+0591-U+05C7) in the filter, and apply the whole-word gloss test from Q7. |
| Q9 M | `r08-q-word-1` (answer "God") | Pool entries "our God", "God of", "thank God (common reply)", "you are my God", "God, please heal her" and "the Name (read aloud as Adonai)" can appear: arguably also correct for אֵל. | Same whole-word gloss test. |
| Q10 M | all word-meaning questions | The distractor pool is every non-intermediate lesson word (940 entries), so a first-week learner sees glosses from far ahead ("who has kept us alive", "the lights of the fire", "pizza", "the Name (read aloud as Adonai)"). Not wrong, but the odd-one-out is trivially guessable by length or register, and some are sensitive for a day-1 learner. | Restrict the pool to words of lessons up to and including the current one plus the on-ramp words; when too few, add short single-word glosses only. Needs a pool of safe beginner glosses (data decision, not invented here). |
| Q11 L | `*-q-name-*` and `*-q-sound-*` `why` text | "This is Alef, which sounds like silent / a glottal stop ..." and "Shin ... sounds like sh with the right dot, s with the left dot" read oddly because the sound line is a description, not a sound. | Template: "Its sound: <line>" when the line is not a bare phoneme. |

### Hebrew / pronunciation consistency

| # | where | issue | proposed fix |
|---|---|---|---|
| P1 M | `data/curriculum/hints.json` kind `wrong-vowel` example | "two dots side by side under a letter (tzere) say 'ay'": Israeli/Sephardi value is "e as in bed" (niqqud.json). File is staged by another change; not edited here. | "(tzere) say 'e' as in bed ('ay' in Ashkenazi)". |
| P2 M | titles r08 "Tzere: the 'ay' vowel" (also quoted in `docs/host-kit/facilitator-guide.md:45`, PATH.md, journey fixtures) | Same issue as F5, in the title. Not changed because titles are quoted in docs and test fixtures. | "Tzere: the 'e' / 'ay' vowel" and regenerate PATH.md and fixtures together. |
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

## What looked fine

- Letter and vowel ids used by r01 to r08 (shin, bet, tav, lamed, mem-final, vav, yod, alef, he; kamatz, patach, shin-dot, dagesh, cholam, chirik, tzere) all exist in letters.json, consonants.json and niqqud.json.
- Word choices only use letters and vowels taught at or before their lesson (checked r01 to r08).
- Letter-name questions: one correct name, distractors are other letters (look-alikes first); only the final/base pair (Q5) is arguable.
- On-ramp checks (`בָ` vs `ב`; `שָׁ` vs `בָ`): one correct answer each, no tradition dependence.
- Confusable-letter tips and the mnemonic shape and sound statements for the nine letters agree with the letter data.
- First-day word list (שָׁלוֹם, שָׁם, מָה) matches the Priestly Blessing source claim (שָׁלוֹם is the last word of Numbers 6:26).
