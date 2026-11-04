# Intermediate content check: lessons I-01 to I-50 and the six grammar topics

Status: DRAFT. Nothing here was checked by a native or fluent reader. "Verified" means a script or a read-through of the data agreed with another file in the repo; it does not mean the Hebrew was proofread.

## What was actually checked

- Hebrew lint (`lintString` from `tools/hebrew-lint/lint.mjs`) over every string in `data/curriculum/lessons-intermediate/I-01..I-50.json`: 0 definite findings; 6 style findings, all the ASCII hyphen in the Rav-Kav word in I-11 (rav-kav is written with a hyphen on purpose in modern prose).
- Stored respellings (`words[].pronunciation`) against the live engine `respellAll` for every word of every lesson: 0 differences. Israeli equals Sephardi wherever both are stored.
- Structure of all 752 exercises: unique ids, `produce` answer index in range, no duplicate options, no distractor with the same consonants as the answer, `match` pairs with no duplicate side, `register` answer is one of the options, `spot` target present in the registry line, divine-name Latin spellings (none in any lesson).
- Every pointed token used in a lesson was compared with the pointed forms in `data/corpus/registry.json` and `data/vocab/words.json` where the same consonants occur.
- Quiz ambiguity heuristic: for each `produce` item, whether a distractor's lesson gloss shares a content word with the prompt.
- Grammar: the six notes in `data/grammar/notes.json` were read against the generated examples and questions (`buildTopics`, `buildQuestions` run in Node); the ten construct chains were printed from the registry and match their glosses.
- Divine-name and profanity: `tools/sensitivity/audit.mjs` convention read; word lists and all exercises of the army, dating, news and emergency lessons (I-18, I-38, I-46, I-47) read in full; a grep for common English profanity found nothing.
- Not done: no audio, no browser run, no native review, no read-through of every sentence of every lesson (the lessons were read as word lists plus the exercises named below, not line by line).

After the edits below: `node tools/curriculum/integrity.mjs` has 0 FAIL, and the intermediate, view, adapter, links, hebrew-lint and grammar test files pass (47/47). `scan --text` passes.

## Fixed (mechanical, the only edits made)

| # | where | change |
|---|---|---|
| X1 | `I-38.json` I-38-e13, mirrored in `data/curriculum/lessons.json` (same entry) | English prompt "what time?" changed to "when?". The answer is מָתַי, which is "when?" (the lesson's own word gloss); "what time" is a different Hebrew question. |

The review packs under `docs/review/packs` and `docs/review/out` were not regenerated (build step not run); they still show the old gloss until the next pack build.

## Findings

Needs native = needs a Hebrew teacher or Israeli native reader to decide. "Dev" = a code or data-pipeline fix, no Hebrew judgement.

### A. Real defect, not content: spot and fade show the wrong line (Dev)

| Finding | File | Proposed fix | Needs native |
|---|---|---|---|
| The data and `tests/curriculum.intermediate.test.js` use a 1-based `lineIndex` (default 1; the test does `lines[li - 1]`). The player uses it 0-based: `lineText = ls[ex.lineIndex ?? 0]` and the audio id `-l${lineIndex + 1}`. For every spot/fade with `lineIndex` >= 1 the learner is shown the next line (or the first line again when the index runs past the end), so the spot target is often not on screen. Emulating the player rule over the data: 19 spot items have the target missing from the displayed line (I-03-e18, I-04-e07, I-05-e14, I-07-e05, I-09-e03/e07/e15, I-27-e09/e16, I-28-e14, I-30-e12, I-31-e10, I-33-e11/e12, I-34-e05, I-35-e02/e03/e07/e09); 6 fade items with a `lineIndex` (I-04-e05, I-09-e02/e05/e11/e13, I-10-e09) show the wrong line or the first line (I-09-e13 and I-10-e09 have an index past the end). This was found by running the player's rule in a script, not in a browser. I briefly edited the data to 0-based, then reverted it when the test showed the data is the 1-based side; the data is unchanged. | `src/curriculum/intermediate.view.js` lines 164-165 | `const lineText = (r, ex) => { const ls = r.he.split("\n"); return ls[(ex.lineIndex ?? 1) - 1] ?? ls[0]; };` and `` `${r.id}-l${ex.lineIndex ?? 1}` `` for the audio id. No data change. Not applied: source is outside this lane. | no |

### B. Pronunciation and respelling

| Finding | File | Proposed fix | Needs native |
|---|---|---|---|
| The engine reads a sheva after a closed first syllable in loanwords as a full vowel, and the stored Israeli lines copy it: אִינְטֶרְנֶט "ineternet" (I-16, I-49), סִיסְמָה "sisemah" (I-16, I-49), אֶסְפְּרֶסוֹ "espereso" (I-13), פְּרוֹפֶסוֹר "perofesor" (I-37), פְּרוֹפִיל "perofil" (I-49), סוֹלְלָה "solelah" (I-16), יַאלְלָה "yalelah" (I-18), אַנְטִיבְּיוֹטִיקָה "antibeyotikah" (I-14). Likely the Israeli readings are closer to internet, sisma, espreso, profesor, profil, solela, yalla, antibiotika. | I-13, I-14, I-16, I-18, I-37, I-49 | Add overrides in the pronunciation layer, then regenerate the stored lines (the stored line must keep equal to the engine). | yes, to confirm the intended reading |
| The 30 Israel-track lessons (I-11 to I-25, I-36 to I-50) store only `israeli`; sephardi and ashkenazi come from the engine at run time (`pronLine` falls back to `respell`). The view says "Pronunciation lines are the Israeli form" for the track, so this is by design. Recorded so a reviewer does not read it as missing data. | all of the above | none | no |
| Divine name in the 8 phrase-length lesson words (I-07 x5, I-26, I-33, I-34) is respelled "adonai" / Ashkenazi "adonoy" in all three traditions, consistent with `docs/sensitivity/CONVENTIONS.md`. The known audio-manifest issue (bare-name clip targets for i-07-w4/w5/w8/w9, i-26-w6, i-33-w2, i-34-w9) is already listed there and in `tools/sensitivity/allowlist.json`; not re-checked here. | `data/audio/manifest*.json` | per the audio lane | clergy (already open) |

### C. Pointing inconsistent inside the course or against the sources

| Finding | File | Proposed fix | Needs native |
|---|---|---|---|
| "surely, of course": five exercises use בְּטַח (shva) and I-38-e09 uses בֶּטַח (segol, the form in `words.json`): I-12-e14, I-13-e06, I-13-e16, I-23-e02, I-35-e14 vs I-38-e09. | those exercises | Pick one pointing course-wide (the vocabulary file has בֶּטַח). | yes |
| "pharmacy": the word item is בֵּית מֶרְקַחַת (the form used in the vocabulary file) but I-14-e01 uses בֵּית הַמִּרְקַחַת. | I-14 | Make the exercise agree with the word item, or the reverse, after a reader decides. | yes |
| Adon Olam: I-09 word and I-09-e10 have אִישַׁן (patach) where the registry line has אִישָׁן (kamatz); the word גּוֹאֲלִי carries a dagesh in the gimel that the registry text does not. Changing the pointing also changes the stored Ashkenazi respelling (ishan vs ishon) and the audio id, so it was not edited. | I-09 | Align with the registry once a reader confirms. | yes (cantor or teacher) |
| Divine-name lesson words that copy source pointing (I-07 `יָּהּ` with dagesh vs `יָהּ` in the corpus) are source-faithful; no action. | I-07 | none | no |

### D. Glosses and examples

| Finding | File | Proposed fix | Needs native |
|---|---|---|---|
| I-38 note says boyfriend/girlfriend "are not in any source file", yet the word glosses are "friend; boyfriend" and "friend; girlfriend". Other lessons (I-37, I-49, the I-38 match) say "friend (m)" / "friend (f)". | I-38 words חָבֵר, חֲבֵרָה | Use "friend (m)" / "friend (f)" in the word glosses, or drop the claim from the note. | yes |
| Same Hebrew, different gloss across lessons (23 words). Most are harmless context shifts (סְלִיחָה "forgiveness, pardon" in I-28 vs "sorry" in I-50; תּוֹר three wordings; חֹדֶשׁ "a month" vs "month"). Worth aligning: שַׁבָּת שָׁלוֹם is a plain "Shabbat shalom" in I-05/I-19 but "Shabbat greeting (Friday to Saturday)" in I-50; הוֹדָעָה "message" vs "message, notice". List is reproducible by grouping `words[]` by `he`. | I-05, I-19, I-50, I-16, I-36, I-49 | Choose one gloss per word; keep context notes in `note`. | no |
| 38 `match` glosses are shorter than the lesson's word gloss (for example "candle" vs "candle, lamp"; "his great name" vs "his great name (Aramaic)"). Grading is by Hebrew so nothing breaks; the match screen simply drops the qualifier. | I-04, I-05, I-10, I-18, I-20, I-26, I-28, I-30 and others | none needed | no |
| 51 `fade` English lines differ from the registry English; 29 of them are deliberate abridgements ending in an ellipsis (long Aleinu, Vayehi Binsoa, Kedushat HaYom, Hanerot Halalu lines), the rest are re-wordings of the JPS 1917 text ("my Lord" for "O Lord", "heights" for "high places"). The Hebrew shown is the whole line, so the abridged English can read as if the line were short. | I-06, I-08, I-26, I-27, I-32, I-33 and others | Add "(first part)" or show the full registry English for long lines. | no |
| Nearly all `respond` and `dialogue` Hebrew uses masculine forms (אֲנִי צָרִיךְ, רוֹצֶה, לֹא יוֹדֵעַ). Only 31 `gender` items give the feminine. Not wrong, but a female learner practises male forms for most lines. | I-11 to I-25, I-36 to I-50 | A short note on the first Israel lesson, or a feminine variant in `answer`. | no |
| I-46 "אָבַד לִי = I lost": literally "it was lost to me"; with a feminine object it must agree (אָבְדָה לִי). The lesson only uses masculine objects (הַדַּרְכּוֹן, הַטֶּלֶפוֹן). | I-46 | Gloss as "I lost (it was lost to me)" or add a note. | yes |
| I-12 מְזֻמָּן "cash": everyday Hebrew uses the plural מְזֻמָּנִים for cash. | I-12, I-43 | Reader to decide. | yes |

### E. Quiz ambiguity

| Finding | File | Proposed fix | Needs native |
|---|---|---|---|
| I-34-e07, prompt "in peace": the answer is בַּשָּׁלוֹם but the distractor לְשָׁלוֹם is glossed "to peace, in peace" in the same lesson, so a learner who reads the gloss can defend either. | I-34 | Change the distractor, or the word gloss to "to peace (as in go in peace)". | yes |
| I-17-e12, prompt "a big apartment": a distractor is the bare word דִּירָה "apartment", a weak distractor rather than an ambiguity. | I-17 | Replace with another noun phrase. | no |
| `register` items offer formal / neutral / casual / slang, but "casual" is never the answer in the 25 items and overlaps both neutral and slang. Several labels are judgement calls: בְּטַח neutral (I-13-e16), מָה נִשְׁמָע neutral (I-25-e10) vs מָה הַמַּצָּב slang (I-18-e05) and מָה קוֹרֶה slang, בְּעֶזְרַת הַשֵּׁם neutral inside the army-slang lesson (I-18-e14), סְלִיחָה neutral (I-28-e10). | I-12 to I-50 register items | Drop "casual" or define the four labels on screen; reader to confirm each label. | yes |
| Six `spot` items have the target word twice in the line (I-05-e04, I-05-e14, I-06-e09, I-08-e05, I-26-e03, I-32-e11). The grader compares the Hebrew key, so either occurrence is accepted; no defect, noted for completeness. | as listed | none | no |

### F. Grammar topics (`data/grammar/notes.json`, `src/grammar/model.js`)

| Finding | File | Proposed fix | Needs native |
|---|---|---|---|
| Verified true against the examples: ha- takes a dagesh or lengthens before aleph, ayin, resh (he and chet "usually"); me- hiriq and she- segol; the first noun of a construct chain cannot take the article; plural first nouns end in -ei; the ten construct chains in `CONSTRUCT_SPEC` print as the right two or three words with matching glosses; the opening-formula order (blessed, you, the Name, our God, king of the world) matches the registry. | | | no |
| Prefix note says the prefixes "change little" and the word keeps its form. Overstated: ve- becomes u- before a labial or sheva, be-/le- become bi-/li- before a sheva and ba-/la- before a hataf, and with the article they merge (ba-, la-, ha-). | notes.json "prefixes" | Add one sentence naming these exceptions. | yes |
| Generated prefix meanings are the lemma gloss plus the prefix, which reads wrongly for inflected forms: שֶׁעָשָׂה "that to do", שֶׁנָּתַן "that to give", לְעוֹלָם "to world", בְּיוֹם "in day". | `src/grammar/model.js` (`analysePrefix`) | Show the prefix meaning and the base gloss separately ("she- (that) + עָשָׂה (did)") rather than one English phrase. | yes |
| Plurals: יָדוֹת is shown as the plural of יָד glossed "arm"; the usual plural of "hand" is יָדַיִם. The count (m -im 1,457; f -ot 736; exceptions 204) is from a program-built list, as the note says. | vocab data via `classifyPlural` | Suppress or annotate this pair. | yes |
| Roots: אִשָּׁה and נָשִׁים are grouped under א־נ־שׁ with אֱנוֹשִׁי and אָנוּשׁ; dictionaries differ on the root of אִשָּׁה. מָצוּי glossed "regular". The `meaning` field of each root family repeats the root letters, not a meaning. | `words.json` root field; `rootFamilies` | Drop the אִשָּׁה family or label it "traditional grouping". | yes |
| Article example gloss: הָאֱלֹהִים shown as "the god" (the word also means "God"). Registry English for the Shema line is upper-case ("HEAR, O ISRAEL") and is shown as is in the openings topic. | model output | Use the lesson gloss "God"; sentence-case the registry English at display time. | no |
| No intermediate lesson makes a binyan claim. The grammar claims in lesson text were checked: I-09 "hayah, hoveh, yihyeh" is past, present, future (true); I-13 and I-14 notes (present tense, infinitive) match the Hebrew used. | | | no |

### G. Sensitivity

| Finding | File | Proposed fix | Needs native |
|---|---|---|---|
| No profanity in the intermediate lessons. I-18 (army slang) uses only mild slang from the sources; I-38 contains no flirting phrases (its note says so); I-46 and I-47 are neutral vocabulary (war, elections, police) with no side taken. | | | no |
| The player does not call `uiEnglish` (grep count 0 in `src/curriculum/intermediate.view.js`), so the `writeGodAsGd` setting does not apply to lesson glosses that say "God" or "the LORD" (I-01 to I-10, I-26 to I-35, I-50). | `src/curriculum/intermediate.view.js` | Wrap rendered English in `uiEnglish(ctx, ...)`. | no |
| בְּעֶזְרַת הַשֵּׁם ("God willing", I-18, I-50) uses "Hashem"; allowed by convention 3 because the vocabulary data uses it. | | none | no |

## Left alone on purpose

- Lessons with uncommitted edits from another lane (I-08, I-16, I-19, I-20, I-21, I-22, I-24, I-29, I-30, I-31, I-36, I-45, I-49, I-50) were read but not edited. Their findings above are the same classes as the other lessons; the spot/fade line-index defect in I-30 and I-31 is covered by A.
- No Hebrew text was changed or invented. No commit, no precache build.
