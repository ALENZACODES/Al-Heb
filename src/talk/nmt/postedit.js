// @ts-check
// Talk translation pack: what is done to a line before and after the model. Pure functions: no DOM, no network, no storage.
import { isNameWord, hasLatinName, stripNikkud } from '../talk.model.js';

/** How the four-letter Name is shown wherever it would appear. It is never spelled out and never read aloud. */
export const NAME_SHOWN = 'ה׳';
const LATIN_NAME = /\b(?:yhwh|yhvh|yahweh|yahveh|yahwe|jehovah|yehovah|yehova|yehwah)\b/gi;
const HE_WORD = /[א-ת֑-ׇ]+/g;

/**
 * Text with the four-letter Name replaced by ה׳ (a prefix such as ל or ב is kept: לה׳).
 * @param {string} text
 * @returns {string}
 */
export function maskName(text) {
  let s = String(text || '').replace(HE_WORD, (w) => {
    if (!isNameWord(w)) return w;
    const c = stripNikkud(w).replace(/[^א-ת]/g, '');
    const at = c.indexOf('יהוה');
    return (at > 0 ? c.slice(0, at) : '') + NAME_SHOWN;
  });
  if (hasLatinName(s)) s = s.replace(LATIN_NAME, NAME_SHOWN);
  return s;
}

/** True when a line shows the Name (spelled or as ה׳ / ה'), so it must not be handed to a voice. */
export function showsName(text) {
  const s = String(text || '');
  if (hasLatinName(s)) return true;
  if (/(?:^|[\s"(־-])[ובלמכשה]{0,3}ה[׳'](?=$|[\s.,!?;:")־-])/.test(s)) return true;
  const re = new RegExp(HE_WORD.source, 'g');
  let m;
  while ((m = re.exec(s))) if (isNameWord(m[0])) return true;
  return false;
}

/**
 * Applies the term list of data/talk/terms.json: when the source line holds a listed word and the model wrote one of the
 * listed wrong renderings, the right word is put in its place.
 * @param {string} out @param {string} source @param {'he-en'|'en-he'} direction
 * @param {{terms?:{he:string[], en:string, wrong:string[]}[], termsEnHe?:{en:string[], he:string, wrong:string[]}[]}|null} [terms]
 */
export function applyTerms(out, source, direction, terms) {
  if (!terms) return out;
  let s = out;
  if (direction === 'he-en') {
    const src = ' ' + stripNikkud(source).replace(/[^א-ת\s]/g, ' ').replace(/\s+/g, ' ') + ' ';
    for (const t of terms.terms || []) {
      if (!t.he.some((w) => new RegExp(`\\s[ובלמכשה]{0,2}${w}\\s`).test(src))) continue;
      for (const wrong of t.wrong) {
        const re = new RegExp(`\\b${wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (re.test(s)) { s = s.replace(re, t.en); break; }
      }
    }
  } else {
    const src = ' ' + source.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ') + ' ';
    for (const t of terms.termsEnHe || []) {
      if (!t.en.some((w) => src.includes(` ${w} `))) continue;
      for (const wrong of t.wrong) { if (s.includes(wrong)) { s = s.replace(wrong, t.he); break; } }
    }
  }
  return s;
}

/**
 * A model line made ready to show: stray subtitle dashes and quotes dropped, the Name shown as ה׳.
 * @param {string} out @param {string} source @param {'he-en'|'en-he'} direction @param {any} [terms]
 */
export function finishLine(out, source, direction, terms) {
  let s = String(out || '').replace(/^\s*[-–—]\s*/, '').replace(/^"+|"+$/g, '').replace(/\s+/g, ' ').trim();
  s = applyTerms(s, source, direction, terms);
  s = matchEnding(s, source);
  if (direction === 'he-en' && s) { s = sentenceCase(s, source, terms?.commonEnglish); s = s[0].toUpperCase() + s.slice(1); }
  return maskName(s);
}

const ENDS = /[.!?…]["”')\]]*$/;
/**
 * The model closes most lines with a full stop, also a bare word or a two-word phrase ("very good" came back as "טוב מאוד.").
 * When the line as typed has no closing mark, a single full stop the model added is taken off again. A question mark, an
 * exclamation mark and "..." are left alone: they carry meaning the reader wants.
 * @param {string} out @param {string} source
 */
export function matchEnding(out, source) {
  const src = String(source || '').trim();
  if (!out || ENDS.test(src)) return out;
  return /[^.]\.$/.test(out) ? out.slice(0, -1).trimEnd() : out;
}

/**
 * Hebrew has no capital letters, and for a short phrase with no closing mark the model often answers in headline capitals
 * ("מסובך מאוד" came back as "Very Complicated"). Words after the first are put back in lower case when `common` says they
 * are ordinary English words; a word it does not know (a name, a place, a holiday) keeps its capital, and so does "I".
 * Nothing is changed when the line as typed has a closing mark, or when no word list was given.
 * @param {string} out @param {string} source @param {((word:string)=>boolean)|null|undefined} common
 */
export function sentenceCase(out, source, common) {
  if (!out || typeof common !== 'function' || ENDS.test(String(source || '').trim())) return out;
  const words = out.split(' ');
  if (words.length < 2 || words.length > 6) return out;
  const capped = (w) => /^(?:I|[A-Z][a-z']+)[,;:]?$/.test(w);
  if (!words.every(capped)) return out; // a real sentence has lower-case words in it: leave it
  return words.map((w, i) => (i > 0 && w !== 'I' && !/^I'/.test(w) && common(w.replace(/[,;:]$/, '').toLowerCase()) ? w.toLowerCase() : w)).join(' ');
}
