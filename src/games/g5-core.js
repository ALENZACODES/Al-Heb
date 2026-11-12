// Holiday, Shabbat and prayer games (g5-*): shared pure logic. No DOM here, so every rule is unit tested in Node.
// The games read data/games/g5/*.json (records copied from the app's own data) and the Torah text at run time.
// Nothing Hebrew is typed here; the divine name is handled by tg-core's showName (shown as ה׳, never voiced).
import { BOOKS, shuffle } from './tg-core.js';

export { showName, hasName, NAME_SHOWN, loadData, loadVerse, tokens, excerpt, shuffle, options, bare, BOOKS, refText } from './tg-core.js';

/** Load one of this lane's data files. */
export const g5Data = (name) => `data/games/g5/${name}.json`;

/** Display form of a quoted slice: the trailing sof pasuq or paseq is dropped (the data keeps the exact copy). */
export const clean = (he) => String(he ?? '').replace(/[\s׀׃]+$/u, '');
/** Drop n leading letters with their points (a verse word such as וּשְׂעֹרָה named without its "and"). */
export function stripPrefix(he, n = 1) {
  let s = String(he ?? '');
  for (let i = 0; i < n; i++) s = s.replace(/^[א-ת][֑-ׇ]*/u, '');
  return s;
}
/** English without its trailing bracket ("rest (the greeting)" -> "rest"). */
export const shortEn = (s) => String(s ?? '').replace(/\s*\(.*$/, '');

// ---- Shofar Echo ----
/** A sequence of call ids of length n from the allowed calls, never the same call three times running. */
export function callSequence(n, allowed, rnd = Math.random) {
  const out = [];
  while (out.length < n) {
    const c = allowed[Math.floor(rnd() * allowed.length)];
    if (out.length >= 2 && out[out.length - 1] === c && out[out.length - 2] === c) continue;
    out.push(c);
  }
  return out;
}
/** How many taps so far match the sequence (stops at the first wrong one). */
export function echoProgress(seq, taps) {
  let i = 0;
  while (i < taps.length && i < seq.length && taps[i] === seq[i]) i++;
  return i;
}
/** Text picture of a call's beats, for the screen and for screen readers. */
export const BEAT_MARK = Object.freeze({ long: '━━━━━━', mid: '━━', short: '•', xlong: '━━━━━━━━━━━━' });
export const BEAT_WORD = Object.freeze({ long: 'one long blast', mid: 'a broken blast', short: 'a short note', xlong: 'one very long blast' });
export function beatPicture(beats) { return beats.map((b) => BEAT_MARK[b] || '?').join(beats[0] === 'short' ? ' ' : '  '); }

// ---- Sukkah Builder ----
/** Rules broken by a finished sukkah: picks is { stepId: optionId }. */
export function brokenRules(steps, picks) {
  const out = [];
  for (const s of steps) {
    const o = s.options.find((x) => x.id === picks[s.id]);
    if (o && !o.ok && !out.includes(o.rule)) out.push(o.rule);
  }
  return out;
}
/** A random sukkah for inspection: with ok=true every pick is allowed; otherwise exactly one step breaks a rule. */
export function randomSukkah(steps, ok, rnd = Math.random) {
  const bad = ok ? -1 : Math.floor(rnd() * steps.length);
  const picks = {};
  steps.forEach((s, i) => {
    const pool = s.options.filter((o) => (i === bad ? !o.ok : o.ok));
    picks[s.id] = pool[Math.floor(rnd() * pool.length)].id;
  });
  return picks;
}

// ---- Roll the Scroll ----
/** Every chapter of the Torah in order: [{ book, chapter }] (187 in all). */
export const CHAPTERS = Object.freeze(BOOKS.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => Object.freeze({ book: b.id, chapter: i + 1 }))));
export const chapterIndex = (book, chapter) => CHAPTERS.findIndex((c) => c.book === book && c.chapter === chapter);
/** One roll: the position after moving by step chapters, stopping at either end of the scroll. */
export const roll = (pos, step) => Math.max(0, Math.min(CHAPTERS.length - 1, pos + step));
/** Fewest rolls (steps of 1 or 10 either way, stopping at the ends) from one position to another. */
export function fewestRolls(from, to, steps = [1, -1, 10, -10]) {
  if (from === to) return 0;
  const seen = new Map([[from, 0]]), queue = [from];
  while (queue.length) {
    const p = queue.shift();
    for (const s of steps) {
      const q = roll(p, s);
      if (seen.has(q)) continue;
      seen.set(q, seen.get(p) + 1);
      if (q === to) return seen.get(q);
      queue.push(q);
    }
  }
  return Infinity;
}

// ---- Seven Species, Grogger, Fireworks ----
/** A deal of n cards from targets and decoys with about `share` of them targets (at least one of each when possible). */
export function deal(targets, decoys, n, share = 0.5, rnd = Math.random) {
  const t = Math.max(1, Math.min(n - (decoys.length ? 1 : 0), Math.round(n * share)));
  const pick = (pool, k) => { const out = []; while (out.length < k && pool.length) out.push(...shuffle(pool, rnd).slice(0, k - out.length)); return out; };
  return shuffle([...pick(targets, t).map((x) => ({ ...x, target: true })), ...pick(decoys, n - t).map((x) => ({ ...x, target: false }))], rnd);
}

// ---- Mishloach Manot ----
/** Reasons a basket does not meet an order: { kinds, sweet, fruit, noDairy, exactly } -> list of short English reasons. */
export function basketProblems(items, order = {}) {
  const kinds = new Set(items.map((x) => x.he)).size;
  const out = [];
  if (kinds < (order.kinds || 2)) out.push(`It needs at least ${order.kinds || 2} kinds of food.`);
  if (order.exactly && items.length !== order.exactly) out.push(`This friend asked for exactly ${order.exactly} things.`);
  if (order.sweet && !items.some((x) => x.group === 'sweet')) out.push('This friend asked for something sweet.');
  if (order.fruit && !items.some((x) => x.group === 'fruit')) out.push('This friend asked for some fruit.');
  if (order.noDairy && items.some((x) => x.group === 'dairy')) out.push('This friend does not eat dairy.');
  if (order.noNuts && items.some((x) => x.group === 'nuts')) out.push('This friend cannot have nuts.');
  return out;
}

// ---- Seder Steps ----
/** k distinct gap positions in a list of n, sorted. */
export function gaps(n, k, rnd = Math.random) { return shuffle([...Array(n).keys()], rnd).slice(0, Math.min(k, n)).sort((a, b) => a - b); }

// ---- Count to Shavuot ----
/** Day n of the forty-nine as whole weeks and days. */
export const weeksDays = (n) => ({ weeks: Math.floor(n / 7), days: n % 7 });
export const dayOf = (weeks, days) => weeks * 7 + days;
/** Plain English: "23 days, which is 3 weeks and 2 days". */
export function countLine(n) {
  const { weeks, days } = weeksDays(n);
  const p = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
  if (!weeks) return p(n, 'day');
  return `${p(n, 'day')}, which is ${p(weeks, 'week')}${days ? ` and ${p(days, 'day')}` : ''}`;
}

// ---- Siddur Mend ----
/** Positions after k random swaps of an n-word line, never the line already in order (n >= 2). */
export function scramble(n, k, rnd = Math.random, same = (i, j) => i === j) {
  for (let tries = 0; tries < 50; tries++) {
    const p = [...Array(n).keys()];
    for (let s = 0; s < k; s++) {
      const i = Math.floor(rnd() * n); let j = Math.floor(rnd() * (n - 1)); if (j >= i) j++;
      [p[i], p[j]] = [p[j], p[i]];
    }
    if (!p.every((x, i) => same(x, i))) return p;
  }
  const p = [...Array(n).keys()]; [p[0], p[n - 1]] = [p[n - 1], p[0]]; return p;
}
/** How many places hold the right word (words compared by text, so a repeated word fits either of its places). */
export const placed = (line, order) => order.filter((w, i) => line[w] === line[i]).length;
/** Fewest swaps to mend the line (words compared by text; exact for lines without repeats, an upper bound otherwise). */
export function fewestSwaps(line, order) {
  const cur = order.map((w) => line[w]);
  let swaps = 0;
  for (let i = 0; i < cur.length; i++) {
    if (cur[i] === line[i]) continue;
    let j = cur.findIndex((x, k) => k > i && x === line[i] && cur[k] !== line[k] && line[k] === cur[i]);
    if (j < 0) j = cur.findIndex((x, k) => k > i && x === line[i] && cur[k] !== line[k]);
    [cur[i], cur[j]] = [cur[j], cur[i]]; swaps++;
  }
  return swaps;
}

// ---- Blessing Match ----
/** n pairs from a pool with distinct `he` and distinct `key` (the occasion), shuffled. */
export function pairs(pool, n, rnd = Math.random, key = (x) => x.title) {
  const seenHe = new Set(), seenKey = new Set(), out = [];
  for (const x of shuffle(pool, rnd)) {
    if (out.length >= n) break;
    if (seenHe.has(x.he) || seenKey.has(key(x))) continue;
    seenHe.add(x.he); seenKey.add(key(x)); out.push(x);
  }
  return out;
}

/** The next game in this lane's catalogue (wraps), for the results card. */
export function nextIn(list, id) {
  const i = list.findIndex((g) => g.id === id);
  return i < 0 ? null : list[(i + 1) % list.length];
}
