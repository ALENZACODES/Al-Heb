# Divine-name and denomination conventions (working defaults, NOT clergy-reviewed)

Status: draft written by this audit from what the repo does today. It records conventions and implements them with a
setting; it makes no theological ruling. Questions for a rabbi or cantor are in `REVIEW-FOR-CLERGY.md`.
Check it yourself: `node tools/sensitivity/audit.mjs` (inventory), `node --test tests/sensitivity.test.js` (gate).

## The conventions
1. Hebrew text is shown as in the source text (prayers, verses, corpus). The app does not rewrite source Hebrew.
2. Anything spoken (audio targets, speech synthesis, recorder scripts, "say it" prompts) uses the conventional spoken substitute
   for the four-letter name: Adonai (pointed form `SPOKEN_NAME` in `src/shell/names.js`, the form the audio manifest and the
   Torah reader already use). In respelling/transliteration in learning aids it is written "adonai" (Ashkenazi tradition "adonoy").
3. "Hashem" appears only where the underlying data uses it (the phrases be'ezrat hashem, berukh hashem, a Lekha Hashem title and
   source labels). The app does not introduce it elsewhere.
4. No one is asked to pronounce the four-letter name as a vocabulary item. The two recognition items (the Name, pointed and
   unpointed, `survival-lesson-read-1`) carry translit "adonai" and the note "Never pronounce the four letters as written; say Adonai".
5. The daily "Say it" card never offers the name (`src/speak/daily.js` skips the unpointed skeleton; verified by test with
   pointed and unpointed items). No speak set item contains it (tested).
6. English text: translations in data use "the LORD" (720 occurrences) and "God" (607) as in the source translations; UI strings
   in `src/` use the word God only in the Morning title ("Start your day with God"). A setting is RECOMMENDED, not forced:
   `writeGodAsGd` (boolean, default false, label `Write "G-d" in English text`). `englishGod(text, flag)` implements it.
   It is warranted because many Orthodox and some Conservative learners write it that way; it must stay off by default.
   Wiring it into settings and the views belongs to the shell lane; this lane did not edit `settings.js`.

## Helper (`src/shell/names.js`, pure functions, tested)
`classifyNameWord`, `findName`, `speechText` (bare name to Adonai; prefixed forms are NOT rewritten, see open question 2),
`displayHebrew(he, 'source'|'abbrev')` (abbrev writes he + geresh), `displayTranslit`, `englishGod`, `isNameVocabItem`,
`versionLabel(prayerMeta)` (text for "one version shown"), `SETTING_SUGGESTION`.

## What the audit found (counts from the run on 2026-11-04; re-run to refresh)
Classes: audio-target 390, vocab-item 12 (the two recognition items, counted per field and file), example-sentence 382, latin-spelling 6,
respell-as-written 12, source-hebrew 775 (shown as source, not gated).

Consistent with the conventions:
- Corpus line/word audio targets for bare occurrences are rewritten to Adonai by `tools/audio/build_manifest.mjs` (`spoken`).
- SSML for the bare name carries IPA adonaj (all three traditions); `transliterate.js` and `syllabify.js` read the bare name as adonai / adonoy.
- Book text: the name appears as Hebrew source only; the Latin form is Adonai.
- Typing drills (`data/typing/drills.json`, 24 drills) ask the learner to type the name in blessing formulas; open question 7.

Not consistent (known issues, pinned in `tools/sensitivity/allowlist.json` as status known-issue; owner lanes should fix):
1. Audio manifests (`data/audio/manifest.json`): 54 clip targets that are the bare name as written: the lesson-word clips r15-w2,
   r34-w1, i-07-w4/w5/w8/w9, i-26-w6, i-33-w2, i-34-w9 (x6 voice/tradition combos). The recording script
   (`docs/voices/recording-script*.{md,csv}`, rows r34-w1 etc.) also lists the four letters as the text to record. A recorder or TTS
   engine would be asked to say them. Use `speechText()` for these targets.
2. Prefixed forms (lamed, bet, vav, shin + the name) are not rewritten anywhere: 48 manifest targets plus 24 word clips
   (gadlu, kiddush-zachor, ashrei-144-15, havdalah-opening), 4 SSML records x 3 traditions with ph such as lajhoˈva, and learner respellings
   "laivah / laiveh" (variants `_corpus-1.json`, runtime lookups 02, 03, 06: gadlu, kiddush-zachor, ashrei). The standard spoken form
   of each needs clergy approval; this lane did not invent any Hebrew.
3. Pointing variant: the Jehovah-style pointing (cholam on the he) appears in the source snapshot (55 places) and in a smaller number of other files (counted by a one-off scan, not by the audit tool); shown as source.
4. English glosses from the vocabulary source spell the name: "Jehovah's Witnesses" example (words.json), an alt "an enemy of Yahweh or
   Israel" (tannin), plus a registry build note. Judged acceptable as glosses, flagged for review.
5. Out of lane, noted only: vocabulary entry mizdayen has the English gloss "fucking, retarded" (data/vocab/words.json): offensive; owner vocab lane.

## Denominational variation: what the app shows
Source: `data/corpus/prayer-meta.json` (70 prayers; written by a model, `clergyReviewed` false on every entry) and
`howCongregationsDiffer` in `torah-service-guide.json`. Reader view shows a "Movements" line and a "Review" line (read.view.js).
Counts of the Orthodox / Conservative / Reform "use" values: all as-written 28; varies in Conservative and Reform 7; Reform varies only 5;
all unknown 27 (no checking done); other 3. Registry Hebrew is the traditional/Orthodox wording in every case: ONE VERSION IS SHOWN.
- Amidah Avot (`avot-1`, `avot-closing`) and Mi Sheberach (`mi-sheberach-opening`): Imahot (matriarchs) added in many Conservative and Reform books; only the traditional text is shown. The gap is recorded as `g-matriarchs` in `data/corpus/gaps.json`. No matriarch text is in the app.
- Aleinu, Yigdal, Haftarah blessings after, Lecha Dodi, Vayehi Binsoa, Brich Shmei, Kedushah, Vahavta, Maoz Tzur: movements differ (omit, shorten, reword); one version shown.
- Gender: no gender-neutral or egalitarian variants are present (the phrasebook has m/f forms of everyday Hebrew only). Who is counted/called (kohanim, "bnei Yisrael", Ya'aleh forms) is not addressed.
- 27 prayers have all-unknown movement data: say "differences not checked".
`versionLabel(meta)` returns the exact UI sentence for each case. Adopt it next to the existing "Movements" row:
"One version shown (the common printed text). Other movements or congregations vary; see the notes." or "One version shown.
Differences between movements have not been checked." Unlabelled in the UI today: this lane could not edit `read.view.js`.

## Gate
`tests/sensitivity.test.js` fails on: a new occurrence (or more than max) in audio targets, vocab items, Latin spellings or
respellings not in the allowlist; a speak set or flashcard deck entry offering the name; a daily card that offers it; new English UI
text using "God" in `src`. Lower or delete an allowlist entry when its owner lane fixes the data.
