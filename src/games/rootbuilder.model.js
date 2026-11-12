// @ts-check
// Root Builder (D10): three root letters, build as many words of that family as you can. A word counts ONLY when its letters
// match a word the app's own data lists under that root: the root families (data/roots/families.json, built from the
// dictionary) and the verb list (data/roots/verbs.json) with each verb's stored forms. Nothing else is accepted, so a real
// Hebrew word the data does not list is not counted (the screen says so). The family lists are not reviewed by a Hebrew
// teacher (families.json verified:false). Matching ignores vowel points and final-letter shapes. Pure: no DOM.
import { seededRandom, seedFrom, pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.rootbuilder.v1';
export const MIN_ANSWERS = 4;
const FINAL = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
/** Letters only, final shapes as their base letter: the matching key. */
export const key = (s) => String(s ?? '').normalize('NFD').replace(/[֑-ׇ]/g, '').replace(/[־׳״"'`\s]/g, '').normalize('NFC').replace(/[ךםןףץ]/g, (c) => FINAL[c]);
/** The root's letters: 'כ־ו־ן' -> ['כ','ו','ן'] (shin/sin dots dropped). */
export const rootLetters = (root) => String(root || '').split('־').map((x) => x.normalize('NFD').replace(/[֑-ׇ]/g, '').normalize('NFC')).filter(Boolean);
const oneWord = (s) => typeof s === 'string' && s.trim() && !/\s/.test(s.trim());

/**
 * Build the playable rounds: one per three-letter root with at least MIN_ANSWERS different words.
 * @returns {{root:string, letters:string[], answers:{key:string, he:string, en:string, from:string}[]}[]}
 */
export function buildRounds(families, verbs = []) {
  const byRoot = new Map();
  const add = (root, he, en, from) => {
    if (!oneWord(he)) return;
    const k = key(he); if (k.length < 2) return;
    const m = byRoot.get(root) || new Map(); byRoot.set(root, m);
    if (!m.has(k)) m.set(k, { key: k, he: he.trim(), en: String(en || ''), from });
  };
  for (const f of families?.families || []) {
    if (rootLetters(f.root).length !== 3) continue;
    for (const w of f.words || []) {
      add(f.root, w.he || w.unpointed, w.en, 'dictionary');
      for (const v of Object.values(w.forms || {})) add(f.root, v, w.en ? `${w.en} (a form of ${w.he})` : '', 'dictionary form');
    }
  }
  for (const v of verbs?.verbs || []) {
    if (!v.root || rootLetters(v.root).length !== 3) continue;
    const root = [...byRoot.keys()].find((r) => key(r) === key(v.root)) || v.root;
    add(root, v.he, v.en, 'verb list');
    for (const f of Object.values(v.forms || {})) add(root, f, v.en ? `${v.en} (a form of ${v.he})` : '', 'verb form');
  }
  return [...byRoot].map(([root, m]) => ({ root, letters: rootLetters(root), answers: [...m.values()] })).filter((r) => r.answers.length >= MIN_ANSWERS)
    .sort((a, b) => a.root.localeCompare(b.root, 'he'));
}

/** The letter tiles for a round: every letter its answers use (base shapes), root letters first, then alphabetical. */
export function tilesFor(round) {
  const rootKeys = round.letters.map(key);
  const rest = [...new Set(round.answers.flatMap((a) => [...a.key]))].filter((c) => !rootKeys.includes(c)).sort((a, b) => a.localeCompare(b, 'he'));
  return [...new Set(rootKeys), ...rest];
}

/** Check a guess: 'found' (new), 'again' (already found), 'short', or 'unlisted' (not a word the data lists under this root). */
export function check(round, guess, found) {
  const k = key(guess);
  if (k.length < 2) return { result: 'short', answer: null };
  const answer = round.answers.find((a) => a.key === k) || null;
  if (!answer) return { result: 'unlisted', answer: null };
  return { result: found.has(k) ? 'again' : 'found', answer };
}

/** Stars for a finished round: the share of the listed words found. */
export function starsFor(foundCount, total) {
  const f = total ? foundCount / total : 0;
  return f >= 0.75 ? 3 : f >= 0.5 ? 2 : f >= 0.25 ? 1 : 0;
}
export const POINTS_PER_WORD = 10;

/** Rounds for a play session: a seeded pick (the day's set with ?daily=1, otherwise any). */
export const pickRounds = (rounds, n, seed = null) => pickSeeded(rounds, n, seed == null ? Math.random : seededRandom(seedFrom(String(seed))));
