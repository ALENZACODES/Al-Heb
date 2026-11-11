// @ts-check
// Talk: stored lines first, the translation pack for everything else. No DOM, no storage.
//   1. A line that holds the four-letter Name is held, as before.
//   2. A stored line or a sentence pattern answers at once (checked wording, right gender and number forms).
//   3. Any other line goes to the translation pack when it is on the device, one sentence at a time.
//   4. Without the pack the stored-line answer stands (a close line, a single word, a word-by-word gist or a refusal),
//      and the result says which pack would answer it, so the screen can offer the download.
import { finishLine } from './nmt/postedit.js';
import { sentences } from './nmt/sentences.js';
import { plainMoney, keepShekels, keepUnits, settleNumbers, maskNumbers, unmaskNumbers } from './nmt/numbers.js';
import { stripNikkud } from './talk.model.js';

/** Methods of the phrase engine that are trusted over the model. */
export const FAST_PATH = new Set(['phrase', 'pattern']);
/**
 * A stored line, or a sentence frame filled from the checked word table, answers at once. A frame filled with a dictionary
 * word (the engine marks it low confidence: "Check it before you rely on it") is not trusted over the pack: on 23 such
 * lines of the back test the pack was closer to the person's translation on 16 and further on 5, and the frame answers
 * had plain mistakes ("I want a rise" for rum, a singular for "camels"). Without the pack it still stands, with its warning.
 */
const trusted = (r) => r.ok && FAST_PATH.has(r.method) && !(r.method === 'pattern' && r.confidence === 'low');
export const MODEL_NOTE_HE = 'Translated on this device by the language pack, not from a checked line. Hebrew “I” and “you” forms come out as said by and to a man unless the line says otherwise.';
export const MODEL_NOTE_EN = 'Translated on this device by the language pack, not from a checked line.';

/**
 * @param {any} engine the phrase engine (src/talk/engine.js)
 * @param {{ready:(direction:string)=>boolean, translate:(direction:string, text:string)=>Promise<string>}|null} pack
 * @param {string} text
 * @param {{direction?:string, speaker?:string, terms?:any}} [opts]
 */
export async function translateLine(engine, pack, text, opts = {}) {
  const r = engine.translate(text, opts);
  if (r.held || trusted(r)) return r;
  const direction = r.direction;
  const terms = withCommonEnglish(opts.terms, engine);
  if (r.ok && r.method === 'word') return secondOpinion(r, pack, terms);
  if (!pack || !pack.ready(direction)) return { ...r, needsPack: direction };
  let got;
  try { got = await packAnswer(engine, pack, r, opts, terms); } catch { return { ...r, packFailed: true }; }
  const out = got.text;
  if (!out) return r;
  // a warning about this very line comes before the note every pack line carries, so it is read
  const note = [got.unsure ? CHECK_NUMBERS : '', leftOver(out, direction), direction === 'en-he' ? MODEL_NOTE_HE : MODEL_NOTE_EN].filter(Boolean).join(' ');
  return { ok: true, direction, source: r.source, translation: out, method: 'model', confidence: got.unsure ? 'low' : 'medium', note, suggestions: [] };
}

/**
 * The pack's answer for a line. The pack was made from single sentences: given two in one line it runs them together or, in
 * the back test, left one out in 24 of 53 such lines ("Don't cry. Everything will be OK." came back as "Everything's gonna be
 * okay."). So a line of several sentences is translated one sentence at a time and put back together in order. A sentence
 * the stored lines hold is taken from them, as it would be on its own. A line of one sentence takes the old path unchanged.
 * @returns {Promise<{text:string, unsure:boolean}>} unsure: a number in the answer could not be matched to the line
 */
async function packAnswer(engine, pack, r, opts, terms) {
  const wordsFor = typeof engine.numberWords === 'function' ? (n) => { const w = engine.numberWords(n); return [...w.en, ...w.he]; } : undefined;
  const whole = () => packSentence(pack, r.direction, r.source, terms, wordsFor);
  const parts = sentences(r.source);
  if (parts.length < 2) return whole();
  const out = []; let unsure = false;
  for (const part of parts) {
    const own = engine.translate(part, { ...opts, direction: r.direction });
    if (!own.held && trusted(own)) { out.push(closed(own.translation, part)); continue; }
    const t = await packSentence(pack, r.direction, part, terms, wordsFor);
    if (!t.text) return whole();
    out.push(t.text); unsure = unsure || t.unsure;
  }
  return { text: out.join(' '), unsure };
}

export const CHECK_NUMBERS = 'Check the numbers and units against what you typed: the language pack may have changed one.';

/**
 * One sentence through the pack, with its numbers, money and units kept as typed (src/talk/nmt/numbers.js): the answer's
 * numbers are compared with the line's, a changed one is put back, and when they still do not match the sentence is
 * translated once more with stand-in numbers. If that does not settle it either, the pack's own answer is shown, marked so
 * the screen says to check the numbers and units.
 */
async function packSentence(pack, direction, text, terms, wordsFor) {
  const typed = plainMoney(text, direction);
  const finish = (raw) => keepUnits(keepShekels(finishLine(raw, text, direction, terms), text, direction), text, direction);
  const first = settleNumbers(finish(await pack.translate(direction, typed)), typed, { wordsFor });
  if (first.state !== 'unsure' || !first.text) return { text: first.text, unsure: false };
  const masked = maskNumbers(typed);
  if (masked) {
    let again = null;
    try { again = unmaskNumbers(finish(await pack.translate(direction, masked.text)), masked); } catch { again = null; }
    if (again) { const second = settleNumbers(again, typed, { wordsFor }); if (second.state !== 'unsure') return { text: second.text, unsure: false }; }
  }
  return { text: first.text, unsure: true };
}

/** A stored line is kept without its full stop; inside a longer line it takes the closing mark of the sentence it answers. */
function closed(translation, part) {
  const t = String(translation || '').trim();
  if (!t || /[.!?…]["'”’)\]]*$/u.test(t)) return t;
  const mark = (/([.!?…])["'”’)\]]*$/u.exec(String(part).trim()) || ['', '.'])[1];
  return t + mark;
}

export const LEFT_IN_ENGLISH = 'Part of the line came out in English letters: the language pack did not turn it into Hebrew.';
export const LEFT_IN_HEBREW = 'Part of the line came out in Hebrew letters: the language pack did not turn it into English.';
/** A word the pack could not translate is copied across as it stands ("a slam dunk" came back as "טריקה dunk"). The screen says so. */
function leftOver(out, direction) {
  if (direction === 'en-he') return /[A-Za-z]{2,}/.test(out) ? LEFT_IN_ENGLISH : '';
  return /[\u05D0-\u05EA]{2,}/.test(out) ? LEFT_IN_HEBREW : '';
}

export const SECOND_LABEL = 'Language pack';
export const SECOND_NOTE = 'The language pack gives another word, shown under it.';
const sameWord = (a, b) => stripNikkud(String(a || '')).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '') === stripNikkud(String(b || '')).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/**
 * One dictionary word is the least sure answer the stored lines give: a word has several senses and the dictionary shows one
 * ("complex" came back as the noun for a group of buildings). When the pack is on the device its word is asked for as well
 * and, when it differs, shown under the dictionary word as another choice. The dictionary word stays first: it is the one
 * with vowel points and a recording. Without the pack, or when both agree, the answer is unchanged.
 */
async function secondOpinion(r, pack, terms) {
  if (!pack || !pack.ready(r.direction)) return r;
  let alt = '';
  try { alt = finishLine(await pack.translate(r.direction, r.source), r.source, r.direction, terms); } catch { return r; }
  if (!alt || sameWord(alt, r.translation) || (r.variants || []).some((v) => sameWord(v.text, alt))) return r;
  return { ...r, variants: [...(r.variants || []), { label: SECOND_LABEL, text: alt }], note: [r.note, SECOND_NOTE].filter(Boolean).join(' ') };
}

/** The term list with a test for "is this an ordinary English word" taken from the dictionary, when the engine has one loaded. */
function withCommonEnglish(terms, engine) {
  if (!engine || typeof engine.knowsEnglish !== 'function') return terms;
  return { ...(terms || {}), commonEnglish: (w) => engine.knowsEnglish(w) };
}
