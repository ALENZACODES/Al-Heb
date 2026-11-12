// Torah and Hebrew games (tg-*): shared pure logic. No DOM here, so every rule is unit tested in Node.
// The games read the app's own data (Torah chapters, word list, roots, calendar days); nothing Hebrew is typed here
// except the letters of the alphabet and the divine-name abbreviation.
import { findName } from '../shell/names.js';

/** How the four-letter name is shown in every tg game. It is never voiced. */
export const NAME_SHOWN = 'ה׳';
const HEB_LETTER = /[א-ת]/;
const TRAIL = /[׀׃׆]+$/;

/**
 * Display text with every written form of the four-letter name shown as ה׳: the bare name, the name inside a
 * maqaf compound, and prefixed forms (the prefix letters keep their points, then ה׳). The two-yod abbreviation is
 * not the name and stays as written. Trailing paseq or sof pasuq stay.
 */
export function showName(he) {
  const s = String(he ?? '');
  let out = '', last = 0;
  for (const w of findName(s)) {
    if (w.kind === 'abbrev') continue;
    let head = '';
    if (w.kind === 'prefixed') {
      let seen = 0, cut = w.word.length;
      for (let i = 0; i < w.word.length; i++) if (HEB_LETTER.test(w.word[i]) && seen++ === w.prefix.length) { cut = i; break; }
      head = w.word.slice(0, cut);
    }
    const tail = (TRAIL.exec(w.word) || [''])[0];
    out += s.slice(last, w.index) + head + NAME_SHOWN + tail;
    last = w.index + w.word.length;
  }
  return out + s.slice(last);
}
/** True when the text holds the four-letter name in any written form (not the abbreviation). */
export const hasName = (he) => findName(String(he ?? '')).some((w) => w.kind !== 'abbrev');

/** The five books with their chapter counts (data/corpus/torah/index.json). */
export const BOOKS = Object.freeze([
  { id: 'genesis', en: 'Genesis', chapters: 50 }, { id: 'exodus', en: 'Exodus', chapters: 40 }, { id: 'leviticus', en: 'Leviticus', chapters: 27 },
  { id: 'numbers', en: 'Numbers', chapters: 36 }, { id: 'deuteronomy', en: 'Deuteronomy', chapters: 34 },
]);
export const bookEn = (id) => BOOKS.find((b) => b.id === id)?.en || id;
export const refText = (r) => `${bookEn(r.book)} ${r.chapter}:${r.verse}`;

// ---- data loading (fetch through ctx.fetchFn when a test gives one) ----
const cache = new Map();
/** URL of a repo file, relative to the site root. */
export const dataUrl = (rel) => new URL('../../' + rel, import.meta.url);
export async function loadData(ctx, rel) {
  if (cache.has(rel)) return cache.get(rel);
  const f = ctx?.fetchFn || ctx?.fetch || globalThis.fetch;
  const p = (async () => {
    const res = await f(dataUrl(rel));
    if (!res?.ok) throw new Error(`could not load ${rel}: HTTP ${res?.status}`);
    return res.json();
  })();
  cache.set(rel, p);
  p.catch(() => cache.delete(rel));
  return p;
}
export const chapterPath = (book, n) => `data/corpus/torah/${book}/${String(n).padStart(2, '0')}.json`;
export const loadChapter = (ctx, book, n) => loadData(ctx, chapterPath(book, n));
/** One verse object { n, he, heTrope, en } from the app's Torah text. */
export async function loadVerse(ctx, ref) {
  const ch = await loadChapter(ctx, ref.book, ref.chapter);
  const v = ch?.verses?.[ref.verse - 1];
  if (!v || v.n !== ref.verse) throw new Error(`verse not found: ${refText(ref)}`);
  return v;
}

// ---- words and letters ----
/** Words of a verse as written: split on spaces only, so a maqaf compound stays one word. */
export const tokens = (he) => String(he ?? '').trim().split(/\s+/).filter(Boolean);
/** An exact quote: words [from, to) of the verse, joined as they stand. */
export const excerpt = (he, from, to) => tokens(he).slice(from, to).join(' ');
const MARK = /[֑-ׇֽֿׁׂׅׄ]/;
/** Letters with the points and marks that sit on them: [{ base, text }]. Maqaf, sof pasuq and paseq are not letters. */
export function letterClusters(word) {
  const out = [];
  for (const ch of String(word ?? '')) {
    if (HEB_LETTER.test(ch)) out.push({ base: ch, text: ch });
    else if (MARK.test(ch) && out.length) out[out.length - 1].text += ch;
  }
  return out;
}
export const FINAL_TO_BASE = Object.freeze({ 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' });
export const BASE_TO_FINAL = Object.freeze({ 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' });
export const toBase = (ch) => FINAL_TO_BASE[ch] || ch;
/** Letters only, no points, no maqaf. */
export const bare = (he) => [...String(he ?? '')].filter((c) => HEB_LETTER.test(c)).join('');
export const ALPHABET = Object.freeze([...'אבגדהוזחטיכלמנסעפצקרשת']);

// ---- letter values (gematria) ----
export const LETTER_VALUES = Object.freeze(Object.fromEntries([...'אבגדהוזחטיכלמנסעפצקרשת'].map((c, i) => [c, i < 10 ? i + 1 : i < 19 ? (i - 8) * 10 : (i - 17) * 100])));
/** Standard value of a letter; a final form counts as its base letter. */
export const letterValue = (ch) => LETTER_VALUES[toBase(ch)] || 0;
export const wordValue = (he) => [...bare(he)].reduce((s, c) => s + letterValue(c), 0);
/**
 * The traditional way to write 1 to 999 in letters: largest values first; 15 and 16 are written טו and טז
 * (nine plus six, nine plus seven) so the letters do not spell part of the divine name.
 */
export function numeralLetters(n) {
  if (!Number.isInteger(n) || n < 1 || n > 999) return '';
  let rest = n, out = '';
  for (const [v, c] of [[400, 'ת'], [300, 'ש'], [200, 'ר'], [100, 'ק']]) while (rest >= v) { out += c; rest -= v; }
  if (rest === 15) return out + 'טו';
  if (rest === 16) return out + 'טז';
  const tens = Math.floor(rest / 10), ones = rest % 10;
  if (tens) out += 'יכלמנסעפצ'[tens - 1];
  if (ones) out += 'אבגדהוזחט'[ones - 1];
  return out;
}
/** With the marks: geresh after a single letter, gershayim before the last of several. */
export function numeralWritten(n) {
  const s = numeralLetters(n);
  if (!s) return '';
  return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1);
}
/** Numbers left out of the build-a-number level because a community may write them another way (unsettled spellings). */
export const NUMERAL_SKIP = Object.freeze(new Set([270, 272, 274, 275, 298, 304, 344]));

// ---- five-guess word game ----
/** Marks for one guess against the answer, letter by letter (final forms match their base): hit, near or miss. */
export function scoreGuess(guess, answer) {
  const g = [...guess].map(toBase), a = [...answer].map(toBase);
  const marks = g.map(() => 'miss');
  const left = new Map();
  g.forEach((c, i) => { if (c === a[i]) marks[i] = 'hit'; else left.set(a[i], (left.get(a[i]) || 0) + 1); });
  g.forEach((c, i) => { if (marks[i] !== 'hit' && left.get(c) > 0) { marks[i] = 'near'; left.set(c, left.get(c) - 1); } });
  return marks;
}
/** The guess as it should be written: a final-form letter at the end of the word. */
export const withFinal = (letters) => { const a = [...letters].map(toBase); if (a.length && BASE_TO_FINAL[a[a.length - 1]]) a[a.length - 1] = BASE_TO_FINAL[a[a.length - 1]]; return a.join(''); };
/** Better of two marks for the on-screen key colours. */
export const betterMark = (a, b) => (['hit', 'near', 'miss'].indexOf(a) <= ['hit', 'near', 'miss'].indexOf(b) ? a : b) || a || b;

// ---- shared letters (word families) ----
/** The family's three letters from a root string such as "כ־ו־ן", base forms. */
export const rootLetters = (root) => String(root ?? '').split(/[־\-\s]/).map((x) => toBase(bare(x))).filter(Boolean);
/** Positions in the word that spell the family letters in order (first match), or null. */
export function rootPositions(word, letters) {
  const w = [...bare(word)].map(toBase), pos = [];
  let j = 0;
  for (let i = 0; i < w.length && j < letters.length; i++) if (w[i] === letters[j]) { pos.push(i); j++; }
  return j === letters.length ? pos : null;
}
/** True when the tapped positions spell the family letters, in order. */
export function tappedSpellsRoot(word, letters, taps) {
  const w = [...bare(word)].map(toBase);
  if (taps.length !== letters.length) return false;
  return taps.every((p, i) => w[p] === letters[i] && (i === 0 || p > taps[i - 1]));
}

// ---- trope ----
/** Indexes of the words that carry a mark (a single character), in a verse with trope. */
export const wordsWithMark = (heTrope, mark) => tokens(heTrope).map((w, i) => (w.includes(mark) ? i : -1)).filter((i) => i >= 0);

// ---- ordering ----
/** Shuffle with the round's random source (the daily challenge passes a seeded one). */
export function shuffle(arr, rnd = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** n distinct options: the answer plus distractors, shuffled. key(x) decides when two options are the same. */
export function options(answer, pool, n, rnd = Math.random, key = (x) => x) {
  const seen = new Set([key(answer)]), out = [answer];
  for (const x of shuffle(pool, rnd)) { if (out.length >= n) break; if (!seen.has(key(x))) { seen.add(key(x)); out.push(x); } }
  return shuffle(out, rnd);
}
