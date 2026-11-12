// Words by topic (g2-*): shared pure logic for twenty vocabulary games. No DOM here, so every rule is unit tested in Node.
// The words come from data/games/g2/words.json and data/games/g2/sets.json, which are copied from the app's own word lists
// (data/vocab/vocab5000.json, data/vocab/words.json, src/games/tugowar.bank.js); tests/games.g2.test.js checks every copy.
import { loadData, shuffle, options, bare, toBase, letterClusters } from './tg-core.js';

export { shuffle, options, bare, toBase, letterClusters };
export const WORDS_FILE = 'data/games/g2/words.json';
export const SETS_FILE = 'data/games/g2/sets.json';

/** Topics that are easy to mix up, for the harder levels. */
export const CLOSE = Object.freeze([['food', 'home'], ['clothes', 'body'], ['places', 'travel'], ['school', 'work'], ['family', 'work'], ['weather', 'places']]);

/** Index of the two data files: topics, sets and every word by its pointed form (topic words first, then the extra words). */
export function indexData(words, sets) {
  const topics = words?.topics || {};
  const byHe = new Map();
  for (const [topic, t] of Object.entries(topics)) for (const w of t.items || []) byHe.set(w.he, { ...w, topic });
  for (const w of sets?.extra || []) if (!byHe.has(w.he)) byHe.set(w.he, { ...w, topic: null });
  const word = (he) => byHe.get(he) || null;
  const items = (id) => (topics[id]?.items || []).map((w) => byHe.get(w.he));
  return { topics, sets: sets || {}, byHe, word, items, ids: Object.keys(topics) };
}
export async function loadAll(ctx) {
  const [w, s] = await Promise.all([loadData(ctx, WORDS_FILE), loadData(ctx, SETS_FILE)]);
  return indexData(w, s.sets);
}

/** First part of an English gloss, for small labels. */
export const shortEn = (s) => String(s ?? '').split(/[;,(/]/)[0].trim();
/** Topic id of a word, or null. */
export const topicOf = (D, w) => (typeof w === 'string' ? D.word(w)?.topic : w?.topic) || null;

/** n topic ids: random ones, or a close pair plus random others when close is set. */
export function pickTopics(D, n, rnd = Math.random, close = false) {
  if (!close) return shuffle(D.ids, rnd).slice(0, n);
  const pair = shuffle(CLOSE.filter((p) => p.every((x) => D.topics[x])), rnd)[0] || [];
  return [...pair, ...shuffle(D.ids.filter((x) => !pair.includes(x)), rnd)].slice(0, n);
}
/** A shuffled deck of n words drawn evenly from the topics. */
export function deck(D, ids, n, rnd = Math.random) {
  const piles = ids.map((id) => shuffle(D.items(id), rnd));
  const out = [];
  for (let i = 0; out.length < n && i < 99; i++) for (const p of piles) if (p[i] && out.length < n) out.push(p[i]);
  return shuffle(out, rnd);
}
/** Odd one out: size-1 words from one topic and one word from another (a close topic when close is set). */
export function oddSet(D, size, rnd = Math.random, close = false) {
  const [main, odd] = pickTopics(D, 2, rnd, close);
  const same = shuffle(D.items(main), rnd).slice(0, size - 1);
  const out = shuffle(D.items(odd), rnd)[0];
  return { main, odd: out, words: shuffle([...same, out], rnd) };
}

// ---------- endings and gender ----------
const KAMATZ = 'ָ';
/** The ending a learner can see: 'ah' (kamatz then he), 't' (tav) or 'none'. */
export function endingOf(he) {
  const cl = letterClusters(he);
  const last = cl[cl.length - 1];
  if (!last) return 'none';
  if (last.base === 'ת') return 't';
  if (last.base === 'ה' && cl.length > 1 && cl[cl.length - 2].text.includes(KAMATZ)) return 'ah';
  return 'none';
}
/** The rule of thumb: an -ah or -t ending usually means feminine, anything else usually masculine. */
export const predictedGender = (he) => (endingOf(he) === 'none' ? 'm' : 'f');
export const breaksRule = (w) => predictedGender(w.he) !== w.g;
/** Nouns with a dictionary gender that the gender games may use (single words, not on the skip list). */
export function genderPool(D) {
  const skip = new Set(D.sets.genderSkip || []);
  return [...D.byHe.values()].filter((w) => w.topic && (w.g === 'm' || w.g === 'f') && !skip.has(w.he) && !w.he.includes(' '));
}

// ---------- cycles and line-ups ----------
/** The ordered records of a line-up ('cycle:days' or a list of pointed words). */
export function lineupItems(D, lu) {
  if (typeof lu.items === 'string' && lu.items.startsWith('cycle:')) return (D.sets.cycles?.[lu.items.slice(6)] || []).map((w) => (typeof w === 'string' ? D.word(w) : w));
  return (lu.items || []).map((he) => D.word(he));
}
export const cycle = (D, id) => (D.sets.cycles?.[id] || []).map((w) => (typeof w === 'string' ? D.word(w) : w));
/** The item k steps after index i in a cycle (k may be negative); the week and the year wrap round. */
export const stepIn = (list, i, k) => list[(((i + k) % list.length) + list.length) % list.length];

// ---------- paint ----------
/** Colour made by mixing two paints (order does not matter), or null. */
export function mixOf(D, a, b) {
  const m = (D.sets.mixes || []).find(([x, y]) => (x === a && y === b) || (x === b && y === a));
  return m ? m[2] : null;
}

// ---------- push your luck ----------
/** Points for banking a chain of n links: 1 + 2 + ... + n, doubled. */
export const chainValue = (n) => n * (n + 1);

// ---------- opposites ----------
/** Every word of the opposite pairs with its opposite: Map he -> { word, opp }. */
export function oppositeMap(pairs) {
  const m = new Map();
  for (const p of pairs || []) { m.set(p.a.he, { word: p.a, opp: p.b, key: p.key }); m.set(p.b.he, { word: p.b, opp: p.a, key: p.key }); }
  return m;
}
/**
 * One domino move: the tile that answers the open end (its matching half is the open word's opposite) and distractor
 * tiles whose halves are never that opposite. flip: the matching half may sit on either side.
 */
export function dominoHand(pairs, openHe, size, rnd = Math.random, flip = false) {
  const m = oppositeMap(pairs);
  const want = m.get(openHe)?.opp;
  if (!want) return null;
  const words = [...m.values()].map((x) => x.word).filter((w) => w.he !== want.he && w.he !== openHe);
  const pool = shuffle(words, rnd);
  const next = pool.find((w) => m.get(w.he)?.opp.he !== openHe) || pool[0];
  const right = flip && rnd() < 0.5 ? { halves: [next, want], match: 1 } : { halves: [want, next], match: 0 };
  const rest = pool.filter((w) => w.he !== next.he);
  const tiles = [right];
  for (let i = 0; tiles.length < size && i + 1 < rest.length; i += 2) tiles.push({ halves: [rest[i], rest[i + 1]], match: -1 });
  return shuffle(tiles, rnd);
}

// ---------- clues ----------
const firstBase = (he) => toBase(bare(he)[0] || '');
const lastBase = (he) => toBase(bare(he).slice(-1));
/** The clues for a target among candidates, in the order they are revealed. Each clue: { kind, text, fits(word) }. */
export function cluesFor(D, target, { meaning = true, gender = true } = {}) {
  const t = D.topics[target.topic];
  const len = bare(target.he).length;
  const out = [
    { kind: 'topic', text: `It is in the topic ${t?.title || target.topic}.`, he: t?.label?.he, fits: (w) => w.topic === target.topic },
    { kind: 'length', text: `It has ${len} letters.`, fits: (w) => bare(w.he).length === len },
    { kind: 'first', text: 'It starts with the letter', he: bare(target.he)[0], fits: (w) => firstBase(w.he) === firstBase(target.he) },
  ];
  if (gender && target.g) out.push({ kind: 'gender', text: `It is a ${target.g === 'f' ? 'feminine' : 'masculine'} word.`, fits: (w) => w.g === target.g });
  out.push({ kind: 'last', text: 'It ends with the letter', he: bare(target.he).slice(-1), fits: (w) => lastBase(w.he) === lastBase(target.he) });
  if (meaning) out.push({ kind: 'meaning', text: `It means "${target.en}".`, fits: (w) => w.he === target.he });
  return out;
}
/** Candidates for one clue round: the target plus others, none of which fits every clue (so the clues always settle it). */
export function clueBoard(D, n, rnd = Math.random, opts = {}) {
  const all = shuffle([...D.byHe.values()].filter((w) => w.topic && !w.he.includes(' ')), rnd);
  const target = all[0];
  const clues = cluesFor(D, target, opts);
  const others = all.slice(1).filter((w) => !clues.every((c) => c.fits(w)));
  // keep some of the target's topic so the first clue does not settle it alone
  const sameTopic = others.filter((w) => w.topic === target.topic).slice(0, Math.ceil(n / 2));
  const rest = others.filter((w) => !sameTopic.includes(w));
  return { target, clues, cards: shuffle([target, ...sameTopic, ...rest].slice(0, n), rnd) };
}

// ---------- trail ----------
/** A path of cells from column 0 to the last column; moves go forward, up or down, never back onto the path. */
export function trailPath(rows, cols, rnd = Math.random) {
  for (let tries = 0; tries < 50; tries++) {
    let r = Math.floor(rnd() * rows), c = 0;
    const path = [[r, c]], seen = new Set([`${r},${c}`]);
    let ok = true;
    while (c < cols - 1) {
      const moves = [[r, c + 1], [r, c + 1]];
      if (r > 0) moves.push([r - 1, c]);
      if (r < rows - 1) moves.push([r + 1, c]);
      const free = moves.filter(([y, x]) => !seen.has(`${y},${x}`) && !(x === c && path.length > 1 && path[path.length - 2][1] === c));
      if (!free.length) { ok = false; break; }
      [r, c] = free[Math.floor(rnd() * free.length)];
      path.push([r, c]); seen.add(`${r},${c}`);
    }
    if (ok) return path;
  }
  return Array.from({ length: cols }, (_, c) => [0, c]);
}
export const adjacent = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

// ---------- groups ----------
/** k groups of size words, each from its own topic: [{ topic, words }]. close: include a close pair of topics. */
export function pickGroups(D, k, size, rnd = Math.random, close = false) {
  return pickTopics(D, k, rnd, close).map((topic) => ({ topic, words: shuffle(D.items(topic), rnd).slice(0, size) }));
}

// ---------- letters: hive and ladder ----------
/** Letters only, final forms as their base letter. */
export const letters = (he) => [...bare(he)].map(toBase).join('');
/** The hive word the typed letters spell, or null. */
export const hiveWord = (hive, typed) => hive.words.find((w) => letters(w.he) === letters(typed)) || null;
/** True when b differs from a in exactly one letter at the same place. */
export function oneStep(a, b) {
  const x = letters(a), y = letters(b);
  if (x.length !== y.length) return false;
  let d = 0;
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) d++;
  return d === 1;
}
/** Index of the letter that changed between two rungs, or -1. */
export function changedAt(a, b) {
  const x = letters(a), y = letters(b);
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return i;
  return -1;
}
/** Wrong rungs for a ladder step: same length, not one step from the current word, not on the ladder. */
export function ladderDistractors(all, ladder, cur, n, rnd = Math.random, close = false) {
  const on = new Set(ladder.map((w) => letters(w.he)));
  const len = letters(cur.he).length;
  let pool = all.filter((w) => letters(w.he).length === len && !on.has(letters(w.he)) && !oneStep(cur.he, w.he));
  if (close) {
    const near = pool.filter((w) => [...letters(w.he)].some((c, i) => c === letters(cur.he)[i]));
    if (near.length >= n) pool = near;
  }
  const seen = new Set();
  return shuffle(pool, rnd).filter((w) => !seen.has(letters(w.he)) && seen.add(letters(w.he))).slice(0, n);
}

// ---------- letter and topic ----------
export const startsWith = (w, ch) => letters(w.he)[0] === toBase(ch);
export const endsWith = (w, ch) => letters(w.he).slice(-1) === toBase(ch);
/**
 * A letter-and-topic question: one word fits both the topic and the letter; the distractors fit only one or neither.
 * where: 'start' or 'end'. Returns { topic, letter, answer, options } or null.
 */
export function letterQuestion(D, n, rnd = Math.random, where = 'start') {
  const at = where === 'end' ? (w) => letters(w.he).slice(-1) : (w) => letters(w.he)[0];
  const fits = (w, topic, ch) => w.topic === topic && at(w) === ch;
  const words = [...D.byHe.values()].filter((w) => w.topic && !w.he.includes(' '));
  for (const answer of shuffle(words, rnd)) {
    const topic = answer.topic, ch = at(answer);
    const sameTopic = words.filter((w) => w.topic === topic && at(w) !== ch);
    const sameLetter = words.filter((w) => w.topic !== topic && at(w) === ch);
    if (!sameTopic.length || !sameLetter.length) continue;
    const other = words.filter((w) => w.topic !== topic && at(w) !== ch);
    const picks = [...shuffle(sameTopic, rnd).slice(0, Math.ceil((n - 1) / 2)), ...shuffle(sameLetter, rnd).slice(0, Math.floor((n - 1) / 2))];
    for (const w of shuffle(other, rnd)) { if (picks.length >= n - 1) break; picks.push(w); }
    if (picks.some((w) => fits(w, topic, ch))) continue;
    // the letter as written at that place: a final form at the end of a word
    const shown = where === 'end' ? bare(answer.he).slice(-1) : bare(answer.he)[0];
    return { topic, letter: ch, shown, answer, options: shuffle([answer, ...picks.slice(0, n - 1)], rnd) };
  }
  return null;
}
