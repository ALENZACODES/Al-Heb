// Read Your Own Text (#/import): paste any Hebrew and read it with the app's dictionary beside it. Pure logic: no DOM, no network.
//
// What it does with a pasted text: splits it into lines and words, looks each word up in the app's own dictionary
// (data/vocab/index.json, the same list the vocabulary pages and the Camera Translator use), and sorts the words into
// "words you have met", "words you don't know yet" and "not in the dictionary".
// What it does not do: it does not translate sentences, and it does not guess. A word found only after taking off a prefix
// letter or an ending says so. The text stays in the page: nothing is sent anywhere and nothing is saved unless the learner marks a word.
// The four-letter name is shown as ה׳, is never looked up and is never played.
import { findName, NAME_ABBREV } from '../shell/names.js';

export const STORE_KEY = 'importer.v1';
/** Longest text read at once (characters). Longer text is cut at a line end, and the screen says so. */
export const MAX_CHARS = 12000;
export const PRIVACY_NOTE = 'Your text stays on this device. It is read in the page, sent nowhere, and gone when you leave this screen.';
export const LIMITS_NOTE = 'Each word is looked up by its letters in Aleph\'s dictionary. A Hebrew spelling can be more than one word, so check the meaning against the sentence. Whole sentences are not translated here.';

const MARKS = /[֑-ֽֿ-ׇ]/g;
const HEB = /[א-ת]/;
/** Letters only: points and cantillation off, quote marks and maqaf out. */
export const bare = (s) => String(s ?? '').normalize('NFC').replace(MARKS, '').replace(/[־׳״"'`‎‏]/g, '');
/** One attached letter that can stand in front of a word, with its usual meaning. */
export const PREFIXES = Object.freeze({ 'ו': 'and', 'ה': 'the', 'ב': 'in', 'כ': 'like', 'ל': 'to', 'מ': 'from', 'ש': 'that' });

export const defaultState = () => ({ v: 1, known: {} });
export function normalizeState(raw) {
  const s = defaultState();
  if (raw && typeof raw === 'object' && raw.known && typeof raw.known === 'object') for (const id of Object.keys(raw.known).slice(0, 20000)) if (raw.known[id]) s.known[id] = 1;
  return s;
}
export const markKnown = (state, id, yes = true) => { const known = { ...state.known }; if (yes) known[id] = 1; else delete known[id]; return { ...state, known }; };

/** The dictionary as a lookup by unpointed spelling. index = data/vocab/index.json ({fields, rows}). */
export function createLookup(index) {
  const f = index?.fields || []; const at = (n) => f.indexOf(n);
  const [iId, iHe, iKey, iEn, iPos, iLevel, iRank, iLesson, iTr] = ['id', 'he', 'heUnpointed', 'en', 'pos', 'level', 'frequencyRank', 'unlockLesson', 'translit'].map(at);
  const by = new Map();
  for (const r of index?.rows || []) {
    const key = bare(r[iKey] ?? '').trim();
    if (!key || key.includes(' ')) continue;
    const list = by.get(key) || [];
    list.push({ id: r[iId], he: r[iHe], en: String(r[iEn] ?? ''), pos: r[iPos] || '', level: r[iLevel] || '', rank: Number.isFinite(r[iRank]) ? r[iRank] : Infinity, lesson: r[iLesson] || '', translit: r[iTr] || '' });
    by.set(key, list);
  }
  for (const list of by.values()) list.sort((a, b) => a.rank - b.rank);
  const get = (key) => by.get(key) || [];
  /**
   * @returns {{how:'dictionary'|'prefix'|'ending'|'unknown', senses:any[], prefix?:{letter:string, meaning:string}, note?:string}}
   *   'prefix' and 'ending' are possibilities, and the screen labels them as such.
   */
  function find(word) {
    const key = bare(word);
    const exact = get(key);
    if (exact.length) return { how: 'dictionary', senses: exact.slice(0, 3) };
    const n = [...key].length;
    // one or two prefix letters (and the, in the, ...)
    for (const cut of [1, 2]) {
      const head = key.slice(0, cut), rest = key.slice(cut);
      if ([...rest].length < 2 || ![...head].every((c) => PREFIXES[c])) continue;
      const found = get(rest);
      if (found.length) return { how: 'prefix', prefix: { letter: head, meaning: [...head].map((c) => PREFIXES[c]).join(' + ') }, senses: found.slice(0, 3) };
    }
    if (n >= 4) {
      const tries = [];
      if (key.endsWith('ים')) tries.push([key.slice(0, -2), 'a plural'], [`${key.slice(0, -2)}ה`, 'a plural']);
      if (key.endsWith('ות')) tries.push([`${key.slice(0, -2)}ה`, 'a plural'], [key.slice(0, -2), 'a plural']);
      if (key.endsWith('ת') && !key.endsWith('ות')) tries.push([`${key.slice(0, -1)}ה`, 'a joined form']);
      for (const [stem, note] of tries) { const found = get(stem); if (found.length) return { how: 'ending', note, senses: found.slice(0, 3) }; }
    }
    return { how: 'unknown', senses: [] };
  }
  return { size: by.size, find };
}

/** Cuts a pasted text to what is read at once. @returns {{text:string, cut:boolean}} */
export function clip(raw) {
  const text = String(raw ?? '').replace(/\r\n?/g, '\n').normalize('NFC');
  if (text.length <= MAX_CHARS) return { text, cut: false };
  const at = text.lastIndexOf('\n', MAX_CHARS);
  return { text: text.slice(0, at > MAX_CHARS * 0.5 ? at : MAX_CHARS), cut: true };
}

/**
 * The reader view of a text.
 * @returns {{lines:{parts:{t:'word'|'name'|'other', text:string, shown:string, key?:string, i?:number}[]}[], words:any[], cut:boolean, hebrewWords:number}}
 *   parts keep everything that was pasted, in order; a 'word' part points at words[i] (one entry per different spelling).
 */
export function readText(raw, lookup) {
  const { text, cut } = clip(raw);
  const words = []; const byKey = new Map(); let hebrewWords = 0;
  const lines = text.split('\n').map((line) => {
    const names = findName(line).filter((w) => w.kind !== 'abbrev');
    const isName = (index) => names.some((w) => index >= w.index && index < w.index + w.word.length);
    const parts = [];
    const re = /[֑-ׇא-ת׳״]+(?:["'][֑-ׇא-ת]+)?|[^֑-ׇא-ת׳״]+/g;
    let m;
    while ((m = re.exec(line))) {
      const chunk = m[0];
      if (!HEB.test(chunk)) { parts.push({ t: 'other', text: chunk, shown: chunk }); continue; }
      // a maqaf joins words in print; each side is read on its own
      let offset = 0;
      for (const piece of chunk.split(/(־)/)) {
        const index = m.index + offset; offset += piece.length;
        if (piece === '־' || !HEB.test(piece)) { if (piece) parts.push({ t: 'other', text: piece, shown: piece }); continue; }
        if (isName(index)) { parts.push({ t: 'name', text: piece, shown: NAME_ABBREV }); continue; }
        const key = bare(piece);
        hebrewWords++;
        let i = byKey.get(key);
        if (i === undefined) { i = words.length; byKey.set(key, i); words.push({ key, written: piece, count: 0, ...(lookup ? lookup.find(piece) : { how: 'unknown', senses: [] }) }); }
        words[i].count++;
        parts.push({ t: 'word', text: piece, shown: piece, key, i });
      }
    }
    return { parts };
  });
  return { lines, words, cut, hebrewWords };
}

/**
 * The three lists under the text.
 * @param {any[]} words from readText @param {{completed?:Record<string,any>, known?:Record<string,any>}} [who] completed = lesson ids done
 * @returns {{met:any[], fresh:any[], unlisted:any[], coverage:number}} met: words from lessons done or marked known; fresh: in the
 *   dictionary but not met; unlisted: not in the dictionary. coverage: share of the text's Hebrew words that are met (by count).
 */
export function vocabulary(words, who = {}) {
  const done = who.completed || {}, known = who.known || {};
  const isMet = (w) => w.senses.some((s) => known[s.id] || (s.lesson && done[s.lesson]));
  const met = [], fresh = [], unlisted = [];
  let total = 0, metCount = 0;
  for (const w of words) {
    total += w.count;
    if (w.how === 'unknown') unlisted.push(w);
    else if (isMet(w)) { met.push(w); metCount += w.count; }
    else fresh.push(w);
  }
  // most useful first: how often it is in this text, then how common the word is in Hebrew
  const order = (a, b) => b.count - a.count || (a.senses[0]?.rank ?? Infinity) - (b.senses[0]?.rank ?? Infinity);
  return { met: met.sort(order), fresh: fresh.sort(order), unlisted: unlisted.sort((a, b) => b.count - a.count), coverage: total ? metCount / total : 0 };
}

/** How a word was found, in plain words. */
export function howLine(w) {
  if (w.how === 'dictionary') return '';
  if (w.how === 'prefix') return `Possibly ${[...w.prefix.letter].join(' + ')} (${w.prefix.meaning}) in front of this word.`;
  if (w.how === 'ending') return `Possibly ${w.note} of this word.`;
  return 'Not in the dictionary.';
}

/** One line that sums the text up. */
export function summaryLine(read, v) {
  if (!read.hebrewWords) return 'There is no Hebrew in that text.';
  const pct = Math.round(v.coverage * 100);
  return `${read.hebrewWords} Hebrew word${read.hebrewWords === 1 ? '' : 's'}, ${read.words.length} different. You have met ${v.met.length} of them (${pct}% of the text). ${v.fresh.length} to learn, ${v.unlisted.length} not in the dictionary.`;
}
