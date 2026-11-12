// Letters, vowels and reading sounds (g1-* games): shared pure logic. No DOM here, so every rule is unit tested in Node.
// Hebrew comes from the app's own data: letters and strokes (data/letters/letters.json), syllables (data/lab/syllables.json,
// src/games/syllables.js) and words (data/games/g1/words.json, copied from data/vocab/words.json). Only the alphabet and
// the vowel points are typed here. Sounds are the Israeli reading, as in the other syllable games.
import { toBase, FINAL_TO_BASE, BASE_TO_FINAL, ALPHABET, shuffle, letterClusters, bare } from './tg-core.js';
import { CONSONANTS } from './syllables.js';

export const PT = Object.freeze({
  SHVA: 'ְ', HIRIQ: 'ִ', TSERE: 'ֵ', SEGOL: 'ֶ', PATACH: 'ַ', KAMATZ: 'ָ', HOLAM: 'ֹ',
  KUBUTZ: 'ֻ', DAGESH: 'ּ', SHIN_DOT: 'ׁ', SIN_DOT: 'ׂ',
});
const VOWEL_POINTS = /[ְ-ׇֻ]/;
const FULL_VOWEL = /[ֱ-ׇֻ]/; // any vowel point except shva
export const hasVowel = (c) => FULL_VOWEL.test(c?.text || '');
const has = (c, mark) => !!c && c.text.includes(mark);

// ---------- strokes ----------
/** A viewBox that fits every stroke's median points, with a margin. */
export function viewBoxFor(strokes, pad = 90) {
  const pts = strokes.flatMap((s) => s.median || []);
  if (!pts.length) return '0 0 1000 1000';
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad;
  const w = Math.max(...xs) - Math.min(...xs) + pad * 2, h = Math.max(...ys) - Math.min(...ys) + pad * 2;
  const side = Math.max(w, h);
  return `${Math.round(x0 - (side - w) / 2)} ${Math.round(y0 - (side - h) / 2)} ${Math.round(side)} ${Math.round(side)}`;
}
/** 'top left', 'middle', 'bottom right' ... for a point inside a box [x0, y0, size]. */
export function zone([x, y], [x0, y0, size]) {
  const col = ['left', 'centre', 'right'][Math.min(2, Math.max(0, Math.floor(((x - x0) / size) * 3)))];
  const row = ['top', 'middle', 'bottom'][Math.min(2, Math.max(0, Math.floor(((y - y0) / size) * 3)))];
  if (row === 'middle' && col === 'centre') return 'middle';
  return row === 'middle' ? `middle ${col}` : col === 'centre' ? row : `${row} ${col}`;
}
/** Plain words for a stroke, so it can be chosen without seeing it: where it starts and where it ends. */
export function describeStroke(stroke, box) {
  const m = stroke.median || [];
  if (m.length < 2) return 'a short mark';
  const b = typeof box === 'string' ? box.split(' ').map(Number) : box;
  const a = zone(m[0], [b[0], b[1], b[2]]), z = zone(m[m.length - 1], [b[0], b[1], b[2]]);
  return a === z ? `a short mark at the ${a}` : `from the ${a} to the ${z}`;
}
/** Letters whose drawing has at least `min` strokes in the given hand ('print' or 'cursive'). */
export const strokeLetters = (letters, hand = 'print', min = 2) => (letters || []).filter((l) => (l?.[hand]?.strokes || []).length >= min && l[hand].strokes.every((s) => s.path && s.median?.length));

/** How much of a stroke drawing a reveal step shows: step 1..steps of the total path length (0 to 1). */
export function revealPortion(step, steps) { return Math.max(0, Math.min(1, step / steps)); }
/** Split a letter's strokes into what is drawn at a reveal step: whole strokes, then part of the next one. */
export function revealPlan(strokes, step, steps) {
  const total = strokes.length, upTo = revealPortion(step, steps) * total;
  return strokes.map((s, i) => Math.max(0, Math.min(1, upTo - i)));
}

// ---------- letters ----------
/** Look-alike pairs from each letter's confusableWith list (both letters must be loaded). */
export function lookalikePairs(letters) {
  const byId = new Map((letters || []).map((l) => [l.id, l])), seen = new Set(), out = [];
  for (const l of letters || []) for (const o of l.confusableWith || []) {
    const k = [l.id, o].sort().join('|');
    if (byId.has(o) && !seen.has(k)) { seen.add(k); out.push([l, byId.get(o)]); }
  }
  return out;
}
/** Sound Dash pool: the app's consonant table (syllables.js); every card reads one way. */
export const SOUND_CARDS = CONSONANTS;
/** Options for a sound: the answer plus cards with a different sound (so ט and ת never share a board). */
export function soundOptions(answer, pool, n, rnd = Math.random) {
  const out = [answer], used = new Set([answer.tr]);
  for (const c of shuffle(pool, rnd)) { if (out.length >= n) break; if (!used.has(c.tr)) { used.add(c.tr); out.push(c); } }
  return shuffle(out, rnd);
}
/** A rhythm: `len` pad indexes, no pad three times in a row. */
export function rhythm(len, pads, rnd = Math.random) {
  const out = [];
  while (out.length < len) {
    const p = Math.floor(rnd() * pads);
    if (out.length >= 2 && out[out.length - 1] === p && out[out.length - 2] === p) continue;
    out.push(p);
  }
  return out;
}
/** Alphabet train: `len` letters from `start` (wrapping), `gaps` of them missing (never the first car). dir -1 runs backwards. */
export function trainCars(start, len, gaps, rnd = Math.random, dir = 1) {
  const n = ALPHABET.length;
  const cars = Array.from({ length: len }, (_, i) => ({ he: ALPHABET[(((start + dir * i) % n) + n) % n], gap: false }));
  for (const i of shuffle(cars.map((_, i) => i).slice(1), rnd).slice(0, gaps)) cars[i].gap = true;
  return cars;
}
/** Where a letter sits in a word: 'start', 'middle' or 'end'. Final forms count as their letter. */
export function positionOf(word, letter) {
  const w = [...bare(word)].map(toBase), i = w.indexOf(toBase(letter));
  if (i < 0) return null;
  return i === 0 ? 'start' : i === w.length - 1 ? 'end' : 'middle';
}
/** Letters that appear exactly once in the word (base forms), so the question has one answer. */
export const onceLetters = (word) => { const w = [...bare(word)].map(toBase); return [...new Set(w)].filter((c) => w.filter((x) => x === c).length === 1); };

// ---------- final forms ----------
/** The word with every final letter written in its plain form (marks kept): שָׁלוֹם becomes שָׁלוֹמ. */
export const plainSpelling = (he) => [...String(he ?? '')].map((c) => FINAL_TO_BASE[c] || c).join('');
/** Indexes (letter clusters) of the final-form letters in a correct spelling. */
export const finalTargets = (he) => letterClusters(he).map((c, i) => (FINAL_TO_BASE[c.base] ? i : -1)).filter((i) => i >= 0);
/** Letters that have a final form. */
export const HAS_FINAL = Object.freeze(Object.keys(BASE_TO_FINAL));

// ---------- dots: dagesh and shin/sin ----------
/** The two sounds of each dotted letter (Israeli): with the dot, without it. */
export const DOT_SOUNDS = Object.freeze({ 'ב': ['b', 'v'], 'כ': ['k', 'kh'], 'פ': ['p', 'f'], 'ש': ['sh', 's'] });
/** The sound of a ב כ פ (or final ך ף) or ש cluster, from its dot. Null for any other letter. */
export function dotSound(c) {
  const b = toBase(c?.base);
  if (b === 'ש') return has(c, PT.SHIN_DOT) ? 'sh' : has(c, PT.SIN_DOT) ? 's' : null;
  if (!DOT_SOUNDS[b]) return null;
  return DOT_SOUNDS[b][has(c, PT.DAGESH) ? 0 : 1];
}
/** Letter clusters whose sound depends on a dot, as [index, sound]. */
export const dotItems = (he) => letterClusters(he).map((c, i) => [i, dotSound(c)]).filter(([, s]) => s);
/** A dagesh word must not hold a dotted vav (a shuruk, וּ) or a dotted he (a mappiq, הּ): those dots are left out to keep the game clear. */
export const dageshEligible = (he) => { const cs = letterClusters(he); return !cs.some((c) => (c.base === 'ו' || c.base === 'ה') && has(c, PT.DAGESH)) && cs.some((c) => has(c, PT.DAGESH)); };
/** Letters with a dagesh; with soundOnly, just the ones where the dot changes the sound (ב כ פ). */
export const dageshTargets = (he, soundOnly = false) => letterClusters(he).map((c, i) => (has(c, PT.DAGESH) && (!soundOnly || 'בכפךף'.includes(c.base)) ? i : -1)).filter((i) => i >= 0);

// ---------- vowel sounds (Israeli) ----------
export const VOWEL_MARKS = Object.freeze([
  { id: 'patach', mark: PT.PATACH, sound: 'a' }, { id: 'kamatz', mark: PT.KAMATZ, sound: 'a' },
  { id: 'segol', mark: PT.SEGOL, sound: 'e' }, { id: 'tsere', mark: PT.TSERE, sound: 'e' },
  { id: 'hiriq', mark: PT.HIRIQ, sound: 'i' }, { id: 'holam', mark: PT.HOLAM, sound: 'o' }, { id: 'kubutz', mark: PT.KUBUTZ, sound: 'u' },
]);
/** One mark per sound, the ones the syllable recordings use. */
export const MAIN_MARKS = Object.freeze(['patach', 'segol', 'hiriq', 'holam', 'kubutz'].map((id) => VOWEL_MARKS.find((v) => v.id === id)));
/** A syllable tile: consonant card + vowel mark. */
export const tile = (c, v) => ({ he: c.he + v.mark, tr: c.tr + v.sound, c, v });
/** Vowel Dominoes: a tile fits the open end when it has the same consonant or the same vowel sound. */
export const fits = (t, open) => !!t && !!open && (t.c.he === open.c.he || t.v.sound === open.v.sound);
/** A hand of tiles that is sure to hold at least one tile that fits. */
export function dealHand(open, n, marks, rnd = Math.random, cards = CONSONANTS) {
  const all = cards.flatMap((c) => marks.map((v) => tile(c, v))).filter((t) => t.he !== open.he);
  const good = shuffle(all.filter((t) => fits(t, open)), rnd)[0];
  return shuffle([good, ...shuffle(all.filter((t) => t !== good), rnd).slice(0, n - 1)], rnd);
}
/** Two ways to write one sound: the second spelling of a vowel uses a vowel letter (וֹ וּ ִי) or the twin mark (ָ ֵ). */
export const SPELLING_TWINS = Object.freeze([
  { sound: 'a', a: (c) => c + PT.PATACH, b: (c) => c + PT.KAMATZ, why: 'patach and kamatz both say a' },
  { sound: 'e', a: (c) => c + PT.SEGOL, b: (c) => c + PT.TSERE, why: 'segol and tsere both say e' },
  { sound: 'i', a: (c) => c + PT.HIRIQ, b: (c) => c + PT.HIRIQ + 'י', why: 'a yod after hiriq is a silent helper: still i' },
  { sound: 'o', a: (c) => c + PT.HOLAM, b: (c) => c + 'ו' + PT.HOLAM, why: 'holam on a vav is the same o' },
  { sound: 'u', a: (c) => c + PT.KUBUTZ, b: (c) => c + 'ו' + PT.DAGESH, why: 'kubutz and shuruk (וּ) both say u' },
]);
/** Letters that sound alike in Israeli Hebrew (data/pronunciation/consonants.json): written with the vowel each takes. */
export const LETTER_TWINS = Object.freeze([
  { sound: 's', a: 'ס', b: 'ש' + PT.SIN_DOT, why: 'samekh and sin both say s' },
  { sound: 't', a: 'ט', b: 'ת' + PT.DAGESH, why: 'tet and tav both say t' },
  { sound: 'k', a: 'ק', b: 'כ' + PT.DAGESH, why: 'qof and kaf with a dot both say k' },
  { sound: 'v', a: 'ו', b: 'ב', why: 'vav and bet without a dot both say v' },
  { sound: 'kh', a: 'ח', b: 'כ', why: 'chet and khaf both sound like the ch in Bach' },
]);
/**
 * Same Sound Pairs board: `pairs` sounds, each written two ways. Every sound on the board is different, so each tile has
 * exactly one partner. mode 'vowel' pairs two spellings of a vowel; 'letter' pairs two letters with one sound.
 */
export function pairsBoard(pairs, mode, rnd = Math.random, cards = CONSONANTS) {
  const out = [], used = new Set();
  const plain = cards.filter((c) => !['ו', 'י'].includes(c.he));
  let guard = 0;
  while (out.length < pairs * 2 && guard++ < 500) {
    const useLetter = mode === 'letter' || (mode === 'mixed' && rnd() < 0.5);
    if (useLetter) {
      const lt = LETTER_TWINS[Math.floor(rnd() * LETTER_TWINS.length)];
      const v = MAIN_MARKS[Math.floor(rnd() * MAIN_MARKS.length)];
      const key = lt.sound + v.sound;
      if (used.has(key) || (v.sound === 'o' && lt.sound === 'v') || (v.sound === 'u' && lt.sound === 'v')) continue; // וֹ וּ would read as a vowel
      used.add(key);
      out.push({ he: lt.a + v.mark, key, why: lt.why, tr: key }, { he: lt.b + v.mark, key, why: lt.why, tr: key });
    } else {
      const c = plain[Math.floor(rnd() * plain.length)], tw = SPELLING_TWINS[Math.floor(rnd() * SPELLING_TWINS.length)];
      const key = c.tr + tw.sound;
      if (used.has(key)) continue;
      used.add(key);
      out.push({ he: tw.a(c.he), key, why: tw.why, tr: key }, { he: tw.b(c.he), key, why: tw.why, tr: key });
    }
  }
  return shuffle(out, rnd);
}

// ---------- made-up words ----------
/** Syllables that may follow another: no letters whose reading changes in the middle of a word (א ה ו י ע). */
export const midOk = (s) => !['alef', 'he', 'vav', 'yod', 'ayin'].includes(s.letter);
/** Letters that may close a made-up word, with their sound. */
export const CLOSERS = Object.freeze([['ל', 'l'], ['ם', 'm'], ['ן', 'n'], ['ר', 'r'], ['ס', 's'], ['ד', 'd'], ['ג', 'g'], ['ז', 'z'], ['ט', 't']]);
/** A made-up word: n syllables from the syllable table, optionally closed by a final consonant. */
export function nonsense(syllables, n, closed, rnd = Math.random) {
  const first = syllables.filter((s) => s.letter !== 'vav'), mid = syllables.filter(midOk);
  const parts = [first[Math.floor(rnd() * first.length)]];
  while (parts.length < n) parts.push(mid[Math.floor(rnd() * mid.length)]);
  const close = closed ? CLOSERS[Math.floor(rnd() * CLOSERS.length)] : null;
  return { parts, close, he: parts.map((p) => p.he).join('') + (close ? close[0] : ''), tr: parts.map((p) => p.tr).join('') + (close ? close[1] : '') };
}
/** Wrong readings: one syllable swapped for another with the same letter or the same vowel, or read left to right. */
export function nonsenseFoils(word, syllables, n, rnd = Math.random) {
  const out = new Set();
  const tail = word.close ? word.close[1] : '';
  let guard = 0;
  while (out.size < n && guard++ < 200) {
    const i = Math.floor(rnd() * word.parts.length), p = word.parts[i];
    const swap = syllables.filter((s) => s.id !== p.id && (s.letter === p.letter || s.vowel === p.vowel) && s.tr !== p.tr && (i === 0 || midOk(s)));
    const pick = swap[Math.floor(rnd() * swap.length)];
    if (pick) out.add(word.parts.map((x, j) => (j === i ? pick.tr : x.tr)).join('') + tail);
    if (word.parts.length > 1 && rnd() < 0.25) out.add([...word.parts].reverse().map((x) => x.tr).join('') + tail);
    out.delete(word.tr);
  }
  return [...out].slice(0, n);
}

// ---------- vowel helpers (letters not said as consonants) ----------
/**
 * Indexes of letters in a pointed word that are not said as consonants: a vav carrying holam or shuruk after a letter
 * with no vowel, a yod after hiriq, tsere or segol, a final he with no point, and an alef with no vowel. Null when the
 * word has a pattern this rule set does not cover (ָיו, where a bare yod after kamatz is silent).
 */
export function helperTargets(he) {
  if (/ָיו/.test(he)) return null;
  const cl = letterClusters(he), out = [];
  cl.forEach((c, i) => {
    const prev = cl[i - 1], own = c.text.slice(1);
    if (c.base === 'ו' && (i === 0 || !VOWEL_POINTS.test(prev.text)) && (own === PT.HOLAM || own === PT.DAGESH)) out.push(i);
    else if (c.base === 'י' && i > 0 && own === '' && (has(prev, PT.HIRIQ) || has(prev, PT.TSERE) || has(prev, PT.SEGOL))) out.push(i);
    else if (c.base === 'ה' && i === cl.length - 1 && i > 0 && own === '') out.push(i);
    else if (c.base === 'א' && i > 0 && own === '') out.push(i);
  });
  return out;
}

// ---------- syllable cuts ----------
/** The word cut into syllables by letter counts (data/games/g1/words.json stores counts, not fragments). */
export function expandSyl(he, counts) {
  const cl = letterClusters(he), out = [];
  let at = 0;
  for (const n of counts || []) { out.push(cl.slice(at, at + n).map((c) => c.text).join('')); at += n; }
  return at === cl.length && out.join('') === he ? out : null;
}
/** Cut points of a syllable split: the letter indexes after which a new syllable starts. */
export function cutsOf(syl) {
  const out = [];
  let n = 0;
  for (let i = 0; i < syl.length - 1; i++) { n += letterClusters(syl[i]).length; out.push(n - 1); }
  return out;
}
/** A word fit for cutting: its split has no shva said aloud and no hurried vowel (chataf), so the cut is not in dispute. */
export const cutEligible = (w) => !!w?.syl && w.syl.length >= 2 && !/[ֱ-ֳ]/.test(w.he) && !(w.shva || []).some((s) => s[1] === 'na') && !w.shvaOpen && !/([חע]|הּ)ַ$/.test(w.he);

/** Short meaning for a card: the first gloss, without notes in brackets. */
export const shortEn = (en) => String(en || '').split(/[;,(]/)[0].trim();
/** Letters in a word (clusters with their points). */
export { letterClusters, bare, toBase, shuffle, ALPHABET as ALPHABET_LETTERS };
