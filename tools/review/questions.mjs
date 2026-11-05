// Reviewer questions that come from this session's notes (docs/review/LETTERS-CONTENT-CHECK.md,
// docs/sensitivity/OPEN.md, docs/pronunciation/DOUBLING-POLICY.md). Each is a question for a person, not a finding:
// nothing here was checked by a native speaker or by clergy. No Hebrew is written here; Hebrew comes from the data files.

import { readFileSync } from 'node:fs';

/** Memory-chain hooks are never typed in this file: they are read from data/letters/memory-chain.json (tests/review.questions.hooks.test.js guards this). */
export function loadChain() {
  return JSON.parse(readFileSync(new URL('../../data/letters/memory-chain.json', import.meta.url), 'utf8'));
}

/** Hook word per chain id, from a chain object. Throws if an id is missing so a question can never quote a stale or blank hook. */
export function hooksOf(chain) {
  const h = Object.fromEntries(chain.letters.map((l) => [l.id, l.sound && l.sound.hook]));
  return (id) => { if (!h[id]) throw new Error(`memory-chain.json has no hook for ${id}`); return h[id]; };
}

/** The chain-dependent questions, built from a chain object: { chet, general: [[id, text], ...] }. */
export function chainQuestions(chain) {
  const H = hooksOf(chain);
  return {
    chet: `TRADITION CLAIM: the memory-chain hook for chet is "${H('chet')}" (ch said the Scottish way); that suits Israeli and Ashkenazi [x], while Sephardi is pharyngeal [ħ]. The sound line shown in this row may carry an older anchor; compare it with the chain hook. Is the chain hook a good anchor, given a beginner may not know the word?`,
    general: [
      ['chain-words', 'WORD CHOICES CHANGED for picturability (all from the vocabulary data, rank 1500 or lower): tet now uses the word for telephone, qof the word for line (the kite string; the monkey word is rank 1706), vav the word for hook (the letter name; the rose is rank 1694), tav the word for baby, nun-final the word for stone, pe-final the word for nose, chet the word for milk. Is each a natural beginner word, and is any too rare, too abstract or too odd to picture?'],
      ['chain-finals', 'The five final forms cannot start a word, so each chain uses a word that ENDS with the letter and reuses the base letter hook for the sound. Is that clear for a beginner, or should finals be taught only through the base letter?'],
      ['chain-hooks', `Hook sounds: tsadi uses the ts inside ${H('tsadi')} (no common English word starts with ts); resh uses ${H('resh')} only as a spelling cue because no English r is the Hebrew sound; chet uses ${H('chet')} and final kaf uses ${H('kaf-final')}; final tsadi uses ${H('tsadi-final')}; alef and ayin use vowel-only hooks (${H('alef')}, ${H('ayin')}). Which hooks would you change?`],
      ['chain-traditions', 'The per-tradition lines are copied from consonants.json (chet and ayin differ for Sephardi; resh differs everywhere; tav without a dot is s for Ashkenazi). Is each line fair for the tradition you teach?'],
      ['chain-pictures', 'Pictures: nun is the one letter that uses a cat, and nun has a candle in a jar; gimel keeps the grumpy camel. Does the cat interfere, is the candle and cat pairing acceptable for children, and does the camel read as a stereotype?'],
      ['chain-hook-collisions', `Hook words that may collide for a listener: chet (${H('chet')}) against he (${H('he')}); final kaf (${H('kaf-final')}) against kaf (${H('kaf')}) and chet, which share its sound; final pe (${H('pe-final')}) against pe (${H('pe')}); resh (${H('resh')}) is not the Hebrew r in any tradition. Which of these hooks would confuse a beginner you teach, and what plain English word would you use instead?`],
    ],
  };
}

const CHAIN_Q = chainQuestions(loadChain());

/** Mnemonic hooks replaced on 2026-11-04 (LETTERS-CONTENT-CHECK.md, "Hook replacements"), keyed by mnemonics.json id. */
export const HOOK_QUESTIONS = {
  zayin: 'HOOK CHANGED, needs-native-review: the dagger/weapon hook was replaced by a zipper pull (alt: an upright Z). Is the new hook fine for adults and children, and is the old worry (the name zayin is also vulgar slang in Israeli speech) a reason to say anything else about the name?',
  nun: 'HOOK CHANGED, needs-native-review: the kneeling-nun picture was replaced by a cat curled in a box (alt: a nest in the corner). Is the new picture acceptable and does it fit the shape?',
  'nun-final': 'HOOK CHANGED, needs-native-review: now a nail standing upright (alt: the cat stretched out). Same questions as nun.',
  sin: 'HOOK CHANGED, needs-native-review: "sinister"/snake replaced by a sun in the upper left corner (alt: Sat/Sit). The older Lithuanian Ashkenazi habit of reading sin and shin alike as s is only noted in the data. Is the new hook acceptable?',
  shin: 'Shin story and caption were edited to match the new sin hook. Check that nothing now misleads (the reason line mentions shin on mezuzah cases: keep, hedge or drop?).',
  qof: 'HOOK CHANGED, needs-native-review: "kooky monkey" replaced by a kite with its string below the line (alt: key). The sound line now says some Mizrahi communities use a deeper [q]. Is that claim fair, and is the kite hook acceptable?',
  tsadi: 'HOOK CHANGED, needs-native-review: tsetse fly replaced by a sitting cat with pointed ears (alt: a slice of pizza). No common English word starts with ts, so the hook uses the ts in "cats" and "pizza". Is that a workable anchor? The sound line says some traditional Sephardi communities say s: correct? Also: the link to tsaddik and the name meaning stay hedged: keep?',
  'tsadi-final': 'HOOK CHANGED, needs-native-review: the alt story is now a cat on a long pole (main story, the tree, kept). Check as for tsadi.',
  tav: 'TRADITION CLAIM: the hook says "T for Tav" (Israeli). With an Ashkenazi setting an undotted tav is s (Shabbos); the anchor word has a dagesh so it is still true, the framing is not. Add a note, or leave Israeli-only?',
  ayin: 'TRADITION CLAIM: story and anchor say ayin is silent like alef; the Sephardi record has a pharyngeal [ʕ]. Hedge the story, or keep the Israeli-only hook? Also check the ayin|tsadi tip (stroke direction) is visible on a printed glyph.',
  alef: 'TRADITION CLAIM (minor): "tiny pause in uh-oh" is Israeli/Sephardi; the Ashkenazi record has plain silent. Acceptable?',
  chet: CHAIN_Q.chet,
  resh: 'TRADITION CLAIM: "growl from the back of the throat, French-style r" is Israeli only (Sephardi: alveolar trill/tap; Ashkenazi by region). Keep, or add a line?',
  'kaf-final': 'WORDING: "kh only at the end of a word" is slightly too strong (a dagesh can occur in rare words). Soften?',
  'pe-final': 'WORDING: "f" at the end of a word is slightly too strong (a dagesh can occur in rare words). Soften? Also: the stored Hebrew name of pe is written without a dagesh; usually written with one. Which is right?',
  gimel: 'Flag only: camel hooks can read as a regional stereotype. Keep grumpy camel?',
};

/** Mnemonic-area questions that are not about one letter (LETTERS-CONTENT-CHECK.md sections C, D, E, F). */
export const LETTER_GENERAL_QUESTIONS = [
  ['q-hard-words', 'English hook words that are not simple (none changed): tsetse, kernel, bungalow, sinister, lolling, pursed, kooky, trident, acrobat, stilt, cloak, mattress, tubing, Latin. Which should be replaced? (tsetse and kooky were already replaced for tsadi and qof, see their rows.)'],
  ['q-confusables', 'Confusable pairs: confusables.json and interference.json were paraphrased from English learner sites, not an Israeli teacher. Is the ayin|tsadi stroke-direction tip enough on its own? Should mem vs final nun in handwriting and ayin vs alef have a tip?'],
  ['q-letter-names', 'Letter-name spelling: the app uses Chet, Qof, Tsadi, Alef and "Final Kaf/Mem/Nun/Pe/Tsadi"; the speaking drills and rules page still say "Het", the workbook and first-day pages say "Kaf sofit" etc. Which should learners see, one scheme everywhere? Also "tz" in word respellings (tzipor, eretz) against "ts" in the letter name and sound lines: keep the split?'],
  ['q-name-hebrew', 'Hebrew letter names stored as conventional spellings, not checked against an Academy list (for example the name of pe written without a dagesh, tet, chet, yod, tsadi, lamed). Please check each spelling.'],
  ['q-zayin-name', 'Is the letter name zayin acceptable in a general-audience hook at all, given the slang meaning noted in the check document?'],
];

/** Memory-chain questions (data/letters/memory-chain.json, built by tools/letters/build_memory_chain.mjs). Questions for a person, not findings; no Hebrew here. */
export const CHAIN_GENERAL_QUESTIONS = CHAIN_Q.general;

/** Pack 03 (vocabulary) sensitivity questions from docs/sensitivity/OPEN.md. */
export const VOCAB_QUESTIONS = [
  ['goy', 'Sensitive sense, left unchanged: the word goy is glossed "gentile (a non-Jewish person), goy" with no register note in the source. Keep it in the first 500? Wording? Who decides when it is offensive? Its example sentence is among the new examples checked in the rows marked vocab-example. (docs/sensitivity/OPEN.md)'],
  ['hide-vs-trim', 'Policy question: words with an everyday sense and a sexual or crude alternative sense were trimmed (the alt sense removed, the word kept visible); two words were hidden whole (a slur-adjacent particle and a mild curse). Would you rather hide or trim the other way round? The word lists are in docs/sensitivity/OPEN.md (its rank numbers were written before basics were inserted and may be off by a few places).'],
  ['left-visible', 'Left visible for your call: violence words that are ordinary or biblical (kill, murder, slaughter, weapon, bomb, curse, cursed); sexual or body terms with a biblical sense (lust, nakedness with alt "genitalia, pudenda", prostitute, breast, commit adultery, male pagan prostitute, rape, pagan goddess); and the examples "Kill me, somebody!", "How the hell should I know?", "He tried to commit suicide.", "Tom thought it was a bomb.", "She has large breasts.", "...considered heretics". Which should be hidden or reworded for a general audience and for children?'],
  ['not-scanned', 'Not scanned: Hebrew-side senses a keyword list cannot see, examples in other languages, and ranks over 1500. If you notice a sense or example in the rows that a learner or child should not meet, mark it unsure and say why.'],
];

/** Pack 04 (prayer lines) divine-name questions from docs/sensitivity/OPEN.md. */
export const CORPUS_QUESTIONS = [
  ['divine-prefixed', 'Prefixed forms of the divine name are still passed to audio targets as written (72 manifest targets: gadlu, gadlu-w2, kiddush-zachor, kiddush-zachor-l3, kiddush-zachor-w13, ashrei-144-15, ashrei-144-15-w7, havdalah-opening, havdalah-opening-w20, in every voice and tradition) and appear in the recording scripts. What is the standard spoken form for each prefixed form, so recorders and the browser voice are told the right word? (No substitute was invented.)'],
  ['divine-maqaf', 'Maqaf-joined forms (for example the word for "glory of" + the name) are not detected by the code that swaps the bare name for Adonai. List the forms that occur in the prayer lines below and what is said for each.'],
  ['divine-respell', 'Learner respellings "laivah / laiveh" in the pronunciation lookups, the SSML phoneme text for the four prefixed records, and the Jehovah-style pointing in source text are open. Which forms should the app print, and should any respelling of the name be shown at all?'],
];

/** Pack 05 (pronunciation) questions from docs/pronunciation/DOUBLING-POLICY.md. */
export const PRON_QUESTIONS = [
  ['doubling-israeli', 'POLICY: the doubling dagesh (dagesh chazak) is written as one letter in every respelling (sider, ishah, chayim, atah, shabat; not sidder, ishshah, chayyim, attah, shabbat). For Israeli speech the data says gemination is absent. Do you agree for everyday speech?'],
  ['doubling-sephardi', 'POLICY, needs-native-review: the repo sources do not say whether Sephardi/Mizrahi liturgical reading keeps real doubling in careful reading. Single letter was chosen because it claims no sound the data cannot support. Do the communities you know double? Which?'],
  ['doubling-ashkenazi', 'POLICY, needs-native-review: the Ashkenazi columns also write doubling as one letter; the common understanding that European Ashkenazi reading does not double was not checked. Is that right for the tradition you teach?'],
  ['clitic-stress', 'The seven bound prefixes (le-, be-, mi-, she-, ha-, ve-, de- written with a maqaf) now resolve in the Compare lookup, but their IPA marks the single syllable as stressed, which is wrong for a clitic. What should the respelling and IPA show?'],
  ['ipa-shva', '23 stored IPA values in ranks 1-500 were replaced by the builder output. Several are careful-reading forms where everyday speech drops a shva (for example the word for "like/as" is ke.ˈmo against everyday kmo). Which form should the Israeli column show: careful or everyday?'],
  ['ipa-segolate', 'Stress: the segolate words for "way" and "seed" were given first-syllable stress inside the IPA tool from own knowledge, other stored stress marks were ignored. Please check the stress of the 23 replaced entries (list in data/vocab/corrections.json, entries added by tools/vocab/ipa_rule_corrections.mjs).'],
];

/** Pack 03 questions from docs/review/HEBREW-LINT-BASELINE.md (known string problems, rank above 1000, not in the rows below). */
export const LINT_QUESTIONS = [
  ['lint-baseline', 'Known Hebrew string problems, not fixed, none of them in the first 1000 words: five vocabulary records have a vowel-mark combination the lint flags (ids h448338e7 "to plaster", heb3f471a Micah 3:10 example as received, h1da16296 plural, h9167dfb6 plural, h654755af plural) and one has a source example with an abbreviation (id h48fc3422, text as received); copies of h448338e7 sit in the frequency, index, vocab5000, tier-pack, variants, syllables and SSML files. Please give the correct pointed form for each, or say the source form is acceptable. (docs/review/HEBREW-LINT-BASELINE.md; the records moved 15 positions when six vocabulary records were added earlier).)'],
];

/** Pack 07 (festivals and calendar) questions: reminder default from docs/review/ENGAGEMENT-CHECK.md. */
export const CALENDAR_QUESTIONS = [
  ['erev-reminder-1400', 'Default, not a Hebrew text: in observant mode there is no morning reminder on Shabbat or Yom Tov, and one reminder is sent on the eve at the earlier of the chosen time and 14:00 (a setting on the Morning screen, default 14:00). Is 14:00 a sensible default for the eve of Shabbat and of festivals across the year, including winter Fridays when candle lighting is early? What time would you suggest? Read in source, not run in a browser; nothing here has been checked against a real user.'],
];
