// Divine-name handling helpers (pure functions, no DOM, no store). See docs/sensitivity/CONVENTIONS.md.
// Convention (a working default for review by clergy, not a ruling):
//   - Hebrew text is shown exactly as in the source text (display mode 'source').
//   - Anything SPOKEN (audio targets, speech synthesis, "say it" prompts) uses the conventional spoken
//     substitute for the four-letter name; transliteration in learning aids writes it as "Adonai".
//   - The four-letter name is never offered as a vocabulary item to pronounce.
//   - English UI text may optionally write the English word as "G-d" (setting suggestion: writeGodAsGd, default false).

/** The Hebrew consonant skeleton of the four-letter name. */
export const NAME_SKELETON = 'יהוה';
/** The conventional spoken substitute, pointed (the same form the audio manifest and the Torah reader use). */
export const SPOKEN_NAME = 'אֲדֹנָי';
/** Common written substitute in Hebrew text (he + geresh). */
export const NAME_ABBREV = 'ה׳';
/** Transliteration substitute used in learning aids. */
export const TRANSLIT_SUBSTITUTE = 'Adonai';

const MARKS = '[\\u0591-\\u05C7]*';
const HEB_LETTER = /[א-ת]/;
/** Single-letter prefixes that may attach to the name (and, be, to, from, like, that, the). */
const PREFIX_LETTERS = 'ובלמכשה';
const consonants = (s) => [...String(s)].filter((c) => HEB_LETTER.test(c)).join('');

/** Hebrew words (maximal runs of letters and points) in a string: [{word, index}]. */
function hebrewWords(text) {
  const out = [];
  const re = /[א-ת֑-ׇ]+/g;
  let m;
  while ((m = re.exec(String(text)))) out.push({ word: m[0], index: m.index });
  return out;
}

/**
 * Classify one Hebrew word.
 * @returns {null | {kind:'exact'|'prefixed'|'abbrev', prefix:string}}
 *   exact: the name alone (pointed or not); prefixed: one to three prefix letters + the name; abbrev: the two-yod abbreviation.
 */
export function classifyNameWord(word) {
  const c = consonants(word);
  if (c === NAME_SKELETON) return { kind: 'exact', prefix: '' };
  if (c === 'יי' && /^[א-ת֑-ׇ]+$/.test(word)) return { kind: 'abbrev', prefix: '' };
  const m = new RegExp(`^([${PREFIX_LETTERS}]{1,3})${NAME_SKELETON}$`).exec(c);
  if (m) return { kind: 'prefixed', prefix: m[1] };
  return null;
}
export const isNameWord = (word) => classifyNameWord(word) !== null;

/** Every occurrence of the name (or a prefixed form) in a Hebrew string: [{word, index, kind, prefix}]. */
export function findName(text) {
  const out = [];
  for (const w of hebrewWords(text)) { const k = classifyNameWord(w.word); if (k) out.push({ ...w, ...k }); }
  return out;
}

/** True when a Latin-script string spells the four-letter name (Yahweh, Yehovah, Jehovah, YHWH ...). */
export const hasLatinName = (s) => /\b(?:yhwh|yhvh|yahweh|yahveh|yahwe|jehovah|yehovah|yehova|yehwah)\b/i.test(String(s));

/**
 * Text for speech (audio targets, speechSynthesis). Whole-word occurrences of the name become the spoken substitute.
 * Prefixed forms (for example with a lamed or bet) are NOT rewritten, because the right pointing is a liturgical
 * question for clergy; use findName(text) and treat any 'prefixed' hit as needs-review.
 */
export function speechText(he) {
  const s = String(he);
  let out = '', last = 0;
  for (const w of findName(s)) {
    if (w.kind !== 'exact') continue;
    out += s.slice(last, w.index) + SPOKEN_NAME;
    last = w.index + w.word.length;
  }
  return out + s.slice(last);
}

/**
 * Hebrew text for display. mode 'source' (default) returns it unchanged; 'abbrev' writes whole-word occurrences as he+geresh.
 * Prefixed forms are left as in the source in both modes.
 */
export function displayHebrew(he, mode = 'source') {
  if (mode !== 'abbrev') return String(he);
  const s = String(he);
  let out = '', last = 0;
  for (const w of findName(s)) {
    if (w.kind !== 'exact') continue;
    out += s.slice(last, w.index) + NAME_ABBREV;
    last = w.index + w.word.length;
  }
  return out + s.slice(last);
}

/** Transliteration for learning aids: any Latin spelling of the four-letter name becomes "Adonai". */
export function displayTranslit(s) {
  return String(s).replace(/\b(?:yhwh|yhvh|yahweh|yahveh|yahwe|jehovah|yehovah|yehova|yehwah)\b/gi, (m) => (m[0] === m[0].toLowerCase() ? TRANSLIT_SUBSTITUTE.toLowerCase() : TRANSLIT_SUBSTITUTE));
}

/**
 * English UI text: with writeGodAsGd true, the capitalised word "God" is written "G-d" (also "God's"). Lower-case "god"/"gods"
 * (generic) and other words are untouched. Default off: it is a personal and communal custom, not a rule for everyone.
 */
export function englishGod(text, writeGodAsGd = false) {
  return writeGodAsGd ? String(text).replace(/\bGod(?=\b|'s)/g, 'G-d') : String(text);
}

/** The setting that drives englishGod (wired into src/shell/settings.js as the boolean key writeGodAsGd, default false). */
export const SETTING_SUGGESTION = Object.freeze({ key: 'writeGodAsGd', type: 'boolean', default: false, label: 'Write "G-d" in English text' });

/**
 * English UI/translation text as the learner wants it: applies englishGod() when ctx.settings.writeGodAsGd is true.
 * Views call this where they render an English title, gloss or translation line; a missing ctx or settings means "unchanged".
 */
export function uiEnglish(ctx, text) {
  return englishGod(text, ctx?.settings?.get?.('writeGodAsGd') === true);
}

/** True for a vocabulary item that would ask the learner to pronounce the four-letter name (exact or prefixed Hebrew). */
export function isNameVocabItem(item) {
  return !!item && typeof item.he === 'string' && findName(item.he).length > 0;
}

/**
 * Label for how many liturgical versions the app shows for a prayer, from a prayer-meta entry
 * (data/corpus/prayer-meta.json): { denominations:{orthodox:{use},conservative:{use},reform:{use}} }.
 * Returns { oneVersion:boolean, text:string }. This adds no liturgy; it only states what the data says.
 */
export function versionLabel(meta) {
  const d = (meta && meta.denominations) || {};
  const uses = ['orthodox', 'conservative', 'reform'].map((k) => (d[k] && d[k].use) || 'unknown');
  const varies = uses.includes('varies') || uses.includes('rarely-used');
  const unknown = uses.every((u) => u === 'unknown');
  if (varies) return { oneVersion: true, text: 'One version shown (the common printed text). Other movements or congregations vary; see the notes.' };
  if (unknown) return { oneVersion: true, text: 'One version shown. Differences between movements have not been checked.' };
  return { oneVersion: false, text: 'Same words in the movements checked (not reviewed by clergy).' };
}
