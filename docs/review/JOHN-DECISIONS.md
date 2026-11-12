# Decisions for John: the Name, the default rite, and "goy"

Three matters are held for you. This round did **not** change the way the app writes or voices the divine Name, did **not** pick a default rite, and did **not** retouch the `גּוֹי` / `גּוֹיָה` vocabulary cards or the Psalm 117 line in Hallel. Options and a recommendation are below so you can choose without a meeting in the middle of the night.

Date: 10 November 2026, America/Toronto.

## 1. The divine Name

**What the app does now.** Corpus Hebrew is stored pointed. A normaliser rewrites the siddur spelling with a holam on the first he (`יְהֹוָה`) to the Leningrad form (`יְהוָה`) so the whole corpus is one spelling; readers are told to say "Adonai". A speech rule is tested so that a written Tetragrammaton is not sent to the speech engine as those four letters. Lesson `r34` shows the unpointed spellings `יהוה` and `אדני` as a reading skill. This is already a theological and halakhic choice, even if it was made as an engineering consistency rule.

**Option A — Keep the current print, say "Adonai".** Learners see the four pointed letters in the Leningrad form, as in a printed Tanakh and in many Orthodox and Conservative siddurim. Speech stays "Adonai". Closest to the sources we actually fetched.

**Option B — Keep the letters in the source snapshot, print a stand-in in the learner UI.** Show `ה'`, `יי`, or "Hashem" in lessons, exercises, and captions; keep `יְהוָה` only in the fetched snapshot and in a "show the verse as written" control. Common for a phone app, and it avoids casual typing or screenshotting of the Name.

**Option C — Print a siddur convention such as `יְיָ` or two yods in learner-facing text,** and still say "Adonai". Familiar in some Ashkenazi books; a little less clear for a first-year reader.

**Recommendation: B for anything the learner taps, types, or is asked to assemble; A for a clearly labelled "as written in the verse" view.** That respects both source fidelity and the reality that this is a phone product. Do not ship Option A in writing exercises without a rabbi's explicit okay. I have not built B or C.

## 2. Default rite (nusach)

**What the app does now.** The corpus is mixed and labelled: Metsudah Ashkenaz, Torat Emet Sefard (including the new weekday festival Kiddush), Edot HaMizrach (Shaliehsaboo) for some Hanukkah and Havdalah lines, UXLC for Tanakh verses. Registry records carry `nusach` where they come from a siddur. The project also marks records `traditionNeutral: true`, which is a stretch given the mix — the honest part is the per-record label, not the claim of neutrality.

**Option A — Ship mixed and labelled.** Every line already says which book it came from. A teacher can tell a student "your siddur may differ". Fastest path to launch, and it matches what we can legally source.

**Option B — Pick one default rite and treat the others as variants.** For a North American launch, Ashkenaz is the usual default; the festival Kiddush we actually sourced is Sefard weekday form, which is very close in the inserts and the close. Choosing a default means some lines would need a second sourced variant before we could claim "the app is Ashkenaz" or "the app is Sefard".

**Option C — A user setting for nusach,** with a default of "show the sourced line and name the book". This is the right product goal. It is not built.

**Recommendation: A for launch, with C on the roadmap.** Do not rewrite Sefard lines into Ashkenaz (or the reverse) from memory. If you want a named default for marketing ("an Ashkenaz path"), say so and we can source the missing variants next, still without inventing text.

## 3. "Goy"

**What the app does now.** Hallel, Psalm 117 (`hallel-117`, used in `I-07`) has `הַלְלוּ אֶת־יְהוָה כָּל־גּוֹיִם`, with the learner gloss "praise the LORD, all nations". That is the biblical sense (the nations). Separately, the vocabulary list has `ה3b32dc48` `גּוֹי` glossed "gentile (a non-Jewish person), goy" and `h6be823dc` `גּוֹיָה` "female goy". Those cards are everyday/slang-adjacent, not the psalm.

**Option A — Keep the psalm as "nations"; change the vocab cards** so the English leads with "nation" and "a non-Jew", and does not use "goy" as the head gloss. Optionally add a short usage note that the slang can sound harsh.

**Option B — Leave the vocab cards as they are.** Some learners will want the word they actually hear. Some rabbis and many users will wince.

**Option C — Keep the psalm as "nations"; hide or defer the `גּוֹי` / `גּוֹיָה` cards** from default decks and theme packs until you have a wording you like. The records can stay in `words.json` with a flag, the way a few slang items are already hidden pending review.

**Recommendation: A plus C.** Never let Psalm 117 be read as a slur (the lesson already says "nations" — keep that). For the dictionary cards, do not lead with "goy", and do not put those cards in a first-year deck. I have not changed the cards or the psalm; this is a wording and packing choice for you.

## What I will not do until you pick

- I will not rewrite, hide, or respell the Name in the corpus or in `r34`.
- I will not collapse the mixed rite into a single unsourced "standard" text.
- I will not edit the `גּוֹי` / `גּוֹיָה` glosses or drop them from a pack.

Your note on any of the three is enough to unlock the next change. A rabbi's mark on `docs/review/RABBI-REVIEW-CHECKLIST.md` is even better, but it is not required for you to choose.

## Also on file (still held)

Lane C's lesson-integrity read added clergy questions 28 to 32 in `docs/sensitivity/REVIEW-FOR-CLERGY.md` (El as a practice word; practice audio for Elohim / Adonai / Yah; English house style; Ken yehi ratzon; Rabotai / Chaverai). Those name questions were **not** applied. See also `docs/review/LESSON-INTEGRITY-2026-11-10.md`. The Yom Kippur greeting `גְּמַר חֲתִימָה טוֹבָה` is already in I-28 and I-50 via the curated lesson lexicon, which that report had still listed as missing.

## Decided 12 November 2026 (after the six-lane coder-100 build)

1. **Voice journal on the device: approved.** The Speaking Studio keeps the learner's own recordings in the browser's IndexedDB on the device (`src/voice/journal.js`, the only IndexedDB use). Nothing is sent anywhere; the Privacy page says so, and "Delete all my data" removes the journal.
2. **Browser transcription check: approved as built.** The optional "the machine heard X" check uses the browser's own speech recognizer, labelled a machine guess, not a grade. The page says that some browsers (Chrome, for example) may send the audio to the browser's maker; Aleph itself sends nothing.
3. **CI gates: approved.** The dead-button check (`tools/deploy/check-buttons.mjs`) and the accessibility check (`tools/deploy/check-a11y.mjs`) stay as steps in `.github/workflows/ci.yml`, as well as in `npm test`.
