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
/** Elohim qere: the hiriq on the name's vav distinguishes this from the usual Adonai reading.
 * Genesis 15:2 translator note: https://classic.net.bible.org/passage.php?passage=Gen+15%3A2&theme=wiki
 * This checks the name's final vav-he, not a vowel on an attached prefix. */
export const spokenNameFor = (word) => /ו[\u0591-\u05C7]*\u05B4[\u0591-\u05C7]*ה/.test(word) ? 'אֱלֹהִים' : SPOKEN_NAME;
/** Common written substitute in Hebrew text (he + geresh). */
export const NAME_ABBREV = 'ה׳';
/** Transliteration substitute used in learning aids. */
export const TRANSLIT_SUBSTITUTE = 'Adonai';

const MARKS = '[\\u0591-\\u05C7]*';
const HEB_LETTER = /[א-ת]/;
/** Single-letter prefixes that may attach to the name (and, be, to, from, like, that, the). */
const PREFIX_LETTERS = 'ובלמכשה';
const consonants = (s) => [...String(s)].filter((c) => HEB_LETTER.test(c)).join('');

const MAQAF = '\u05BE';
/**
 * Hebrew words in a string: [{word, index, compound}]. A word is a maximal run of letters and points; a maqaf (U+05BE) ends a
 * word, so each part of a maqaf compound is its own word (compound true), and the maqaf itself stays in the surrounding text.
 */
function hebrewWords(text) {
  const out = [];
  const re = /[א-ת֑-ׇ]+/g;
  let m;
  while ((m = re.exec(String(text)))) {
    const run = m[0];
    if (!run.includes(MAQAF)) { out.push({ word: run, index: m.index, compound: false }); continue; }
    let at = 0;
    for (const part of run.split(MAQAF)) {
      if (part) out.push({ word: part, index: m.index + at, compound: true });
      at += part.length + 1;
    }
  }
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

/** Characters that may trail the name in the source and are kept in speech text: paseq, sof pasuq, nun hafukha. */
const TRAILING_PUNCT = /[\u05C0\u05C3\u05C6]+$/;

/**
 * Text for speech (audio targets, speechSynthesis). The ONE rule for what is spoken: the written four-letter name is never
 * sent to a voice. Every occurrence becomes the spoken substitute: the bare word, the word inside a maqaf compound
 * (for example "glory of the Name" written with a maqaf), and prefixed forms (the prefix letters and their points stay as
 * written, then the substitute). The prefix pointing is kept from the source and not re-derived; clergy review is pending
 * (docs/sensitivity/REVIEW-FOR-CLERGY.md question 2b). A hiriq-pointed name uses the Elohim qere instead
 * (Genesis 15:2, 15:8; Deuteronomy 3:24, 9:26). The two-yod abbreviation is not the name and is left as written.
 * Paseq and sof pasuq after the name are kept.
 */
export function speechText(he) {
  const s = String(he);
  let out = '', last = 0;
  for (const w of findName(s)) {
    if (w.kind === 'abbrev') continue;
    let head = '';
    if (w.kind === 'prefixed') {
      // keep the prefix letters with their points, cut where the name's first letter starts
      let seen = 0, cut = w.word.length;
      for (let i = 0; i < w.word.length; i++) {
        if (HEB_LETTER.test(w.word[i]) && seen++ === w.prefix.length) { cut = i; break; }
      }
      head = w.word.slice(0, cut);
    }
    const tail = (TRAILING_PUNCT.exec(w.word) || [''])[0];
    out += s.slice(last, w.index) + head + spokenNameFor(w.word) + tail;
    last = w.index + w.word.length;
  }
  return out + s.slice(last);
}

/**
 * Text for speech synthesis, failing closed when a written divine name (or a Latin spelling of it) cannot be
 * resolved to the spoken substitute. Callers must not speak when ok is false.
 * @returns {{ok:true, text:string}|{ok:false, reason:string, text:string}}
 */
export function speechSafeText(he) {
  const s = String(he);
  if (hasLatinName(s)) return { ok: false, reason: 'unresolved-liturgical-name', text: '' };
  const text = speechText(s);
  if (findName(text).some((h) => h.kind === 'exact' || h.kind === 'prefixed')) {
    return { ok: false, reason: 'unresolved-liturgical-name', text: '' };
  }
  return { ok: true, text };
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
    if (w.kind !== 'exact' || w.compound) continue;
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
