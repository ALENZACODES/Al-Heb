// Everyday Israel games (g4-*): shared pure logic. No DOM here, so the rules are unit tested in Node.
// Hebrew comes only from data/games/g4/bank.json (each line copied from the app's own data, with its source)
// and from the app's Israel files (data/israel/*.json), loaded as they are. Nothing Hebrew is typed in this file.
import { loadData, shuffle, options, showName } from './tg-core.js';

export { shuffle, options, showName };
export const BANK_PATH = 'data/games/g4/bank.json';

/** The bank as a Map key -> item ({ key, he, en, tr?, clip?, review? }). */
export async function loadBank(ctx) {
  const d = await loadData(ctx, BANK_PATH);
  if (!d.__map) Object.defineProperty(d, '__map', { value: new Map(d.items.map((x) => [x.key, x])) });
  return d.__map;
}
/** One of the app's Israel files (etiquette, fillers, giveaways, register-ladder, scenarios). */
export const loadIsrael = (ctx, name) => loadData(ctx, `data/israel/${name}.json`);

/** Look up keys; throws on a missing key so a typo shows up in the tests, not as a blank button. */
export function pick(B, ...keys) {
  return keys.flat().map((k) => { const x = B.get(k); if (!x) throw new Error(`g4 bank has no ${k}`); return x; });
}

// ---- reading like the street does ----
const POINTS = /[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g;
/** Hebrew without vowel points or cantillation, the way signs, menus and timetables are printed. Maqaf stays. */
export const stripPoints = (he) => String(he ?? '').replace(POINTS, '');
export const isPointed = (he) => /[\u05B0-\u05BC\u05C1\u05C2\u05C7]/.test(String(he ?? ''));

// ---- clock ----
/** "It is N o'clock" for 1 to 10: the time word from the phrasebook, then the counting number from lesson il04. */
export function hourPhrase(B, n) {
  if (!Number.isInteger(n) || n < 1 || n > 10) return null;
  const [the, num] = pick(B, 't.thehour', 'nf' + n);
  return { key: 'hour' + n, n, he: `${the.he} ${num.he}`, en: `${n} o'clock`, parts: [the, num] };
}
/** Angle in degrees (0 = 12 o'clock) of the hour hand for h:mm, and of the minute hand. */
export const hourAngle = (h, m = 0) => ((h % 12) * 30 + m / 2) % 360;
export const minuteAngle = (m) => (m * 6) % 360;
/** "07:05" style. */
export const hhmm = (mins) => { const m = ((mins % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

// ---- money (Israeli notes and coins, whole shekels) ----
export const DENOMS = Object.freeze([200, 100, 50, 20, 10, 5, 2, 1]);
export const isNote = (v) => v >= 20;
/** The fewest notes and coins that make the amount (greedy works for these values). */
export function makeChange(amount) {
  const out = [];
  let left = amount;
  for (const d of DENOMS) while (left >= d) { out.push(d); left -= d; }
  return out;
}
export const total = (xs) => xs.reduce((s, x) => s + x, 0);
/** The smallest note that covers the price (what a customer hands over). */
export const noteFor = (price) => [20, 50, 100, 200].find((n) => n >= price) || 200;

// ---- opening hours ----
/** Week order used everywhere in these games: 0 Sunday ... 6 Shabbat. */
export const DAY_KEYS = Object.freeze(['day.sun', 'day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat']);
export const DAY_EN = Object.freeze(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
/**
 * A door sign: rows of { days: [from, to], open, close } in minutes after midnight, or { days, closed: true }.
 * Days not on the sign are closed.
 */
export function isOpen(sign, day, mins) {
  for (const r of sign.rows) {
    if (day < r.days[0] || day > r.days[1]) continue;
    if (r.closed) return false;
    return mins >= r.open && mins < r.close;
  }
  return false;
}

// ---- city grid ----
export const HEADINGS = Object.freeze(['N', 'E', 'S', 'W']);
const STEP = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };
/** Turning is relative to where you face: facing north, right is east. */
export const turn = (heading, side) => HEADINGS[(HEADINGS.indexOf(heading) + (side === 'right' ? 1 : 3)) % 4];
/** Walk the commands ('straight' moves one block, 'left' and 'right' turn then move one block). Returns every position. */
export function walk(start, heading, cmds, size = 5) {
  let [r, c] = start, hd = heading;
  const path = [[r, c]];
  for (const cmd of cmds) {
    if (cmd === 'left' || cmd === 'right') hd = turn(hd, cmd);
    const [dr, dc] = STEP[hd];
    r += dr; c += dc;
    if (r < 0 || c < 0 || r >= size || c >= size) return { path, end: null, heading: hd, off: true };
    path.push([r, c]);
  }
  return { path, end: [r, c], heading: hd, off: false };
}
/** A random route of n commands that stays on a size x size grid. */
export function randomRoute(n, size = 5, rnd = Math.random) {
  for (let tries = 0; tries < 200; tries++) {
    const start = [Math.floor(rnd() * size), Math.floor(rnd() * size)];
    const heading = HEADINGS[Math.floor(rnd() * 4)];
    const cmds = [];
    for (let i = 0; i < n; i++) cmds.push(i === 0 ? 'straight' : ['straight', 'left', 'right'][Math.floor(rnd() * 3)]);
    const w = walk(start, heading, cmds, size);
    const ends = w.end && (w.end[0] !== start[0] || w.end[1] !== start[1]);
    if (!w.off && ends) return { start, heading, cmds, end: w.end };
  }
  return { start: [4, 2], heading: 'N', cmds: Array(Math.min(n, 4)).fill('straight'), end: [4 - Math.min(n, 4), 2] };
}
export const CMD_KEY = Object.freeze({ straight: 'd.straight', left: 'd.left', right: 'd.right' });

// ---- small helpers ----
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
/** n distinct picks from a list. */
export const sample = (arr, n, rnd = Math.random) => shuffle(arr, rnd).slice(0, n);
