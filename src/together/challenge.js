// @ts-check
// Challenge codes (R1) and group challenges by file (R7). A short code names a game, a level and a seed. Anyone who enters
// it plays the same board on their own device; the code can also carry the sender's score, so both results cards show the
// comparison. No server, no accounts: the code is the whole message. No DOM.
import { ARCADE_GAMES } from '../games/arcade.catalog.js';
import { seededRandom, seedFrom } from '../games/arcade.model.js';

// Kept free of the other sharing code on purpose: the arcade shell loads this file with every game. Names are cleaned here in
// the plainest way; the Challenge page passes its own cleaner (src/together/share.js cleanText), which also shows the Name as ה׳.
// eslint-disable-next-line no-control-regex
const plain = (raw, max = 20) => [...String(raw ?? '').replace(/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim()].slice(0, max).join('').trim();
const nat = (v, max = 9_999_999) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0; };

export const CHALLENGES_KEY = 'games.challenges.v1';
export const GROUP_KIND = 'alef-group-challenge';
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // no I, L, O or U: nothing that reads as a digit or spells a word
const KEEP = 30, MAX_SCORE = 32 ** 4 - 1, MAX_TABLE = 40;
const enc = (n, len) => { let s = ''; for (let i = 0; i < len; i++) { s = ALPHABET[n % 32] + s; n = Math.floor(n / 32); } return s; };
const dec = (s) => [...s].reduce((a, ch) => a * 32 + ALPHABET.indexOf(ch), 0);
// Check character: a sum with odd position weights, modulo 32. An odd weight has no factor in common with 32, so any one
// wrong character changes the sum and is noticed.
const check = (body) => ALPHABET[[...body].reduce((a, ch, i) => (a + (2 * i + 1) * ALPHABET.indexOf(ch)) % 32, 7)];
/** Three characters that stand for a game. Every arcade game has its own (tests/together.challenge.test.js checks). */
export const gameTag = (id) => enc(seedFrom(`challenge-game|${id}`) % 32768, 3);
const gameOfTag = (tag, games = ARCADE_GAMES) => games.find((g) => gameTag(g.id) === tag) || null;
/** What a person may have typed: spaces and dashes dropped, capitals, and the letters people mix up read as digits. */
export const tidy = (text) => String(text || '').toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(/[^0-9A-Z]/g, '');
const pretty = (raw) => raw.replace(/(.{4})(?=.)/g, '$1-');

/** A new board for a game at a level. `rnd` is the source of the seed. */
export function newBoard(game, level, rnd = Math.random) {
  if (!ARCADE_GAMES.some((g) => g.id === game)) throw new Error('unknown game');
  return { game, level: Math.min(5, Math.max(1, Math.floor(level) || 1)), seed: Math.floor(rnd() * 32 ** 4) % 32 ** 4 };
}
/** Eight characters that name the board: game, level, seed. */
export const boardKey = (b) => gameTag(b.game) + ALPHABET[b.level] + enc(b.seed, 4);
/** The code to pass on. With `score` it also carries the sender's result. */
export function makeCode(b, score = null) {
  const body = boardKey(b) + (score == null ? '' : enc(Math.min(MAX_SCORE, nat(score)), 4));
  return pretty(body + check(body));
}
/**
 * Reads a code. @returns {{ok:true, game:string, title:string, level:number, seed:number, key:string, score:number|null}|{ok:false, error:string}}
 */
export function readCode(text) {
  const raw = tidy(text);
  if (raw.length !== 9 && raw.length !== 13) return { ok: false, error: 'A challenge code has 9 or 13 letters and digits. Check it and try again.' };
  const body = raw.slice(0, -1);
  if ([...raw].some((ch) => !ALPHABET.includes(ch)) || check(body) !== raw.slice(-1)) return { ok: false, error: 'That code has a typing mistake in it. Check it against what you were sent.' };
  const g = gameOfTag(body.slice(0, 3)), level = ALPHABET.indexOf(body[3]);
  if (!g || level < 1 || level > 5) return { ok: false, error: 'That code is for a game this copy of Aleph does not have. Both devices may need the latest Aleph.' };
  return { ok: true, game: g.id, title: g.title, level, seed: dec(body.slice(4, 8)), key: body.slice(0, 8), score: raw.length === 13 ? dec(body.slice(8, 12)) : null };
}
/** The board's random source: the same sequence on every device. */
export const challengeRandom = (b) => seededRandom(seedFrom(`${b.game}|${b.level}|${b.seed}|challenge`));
/** The address that opens the board. */
export const playHref = (b) => `#/${b.game}?challenge=${makeCode(b).replace(/-/g, '')}&level=${b.level}`;

// ---- what this device remembers about its challenges ----
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
export const emptyChallenges = () => ({ v: 1, items: {} });
const norm = (state) => { const s = { ...emptyChallenges(), ...obj(state) }; s.items = { ...obj(s.items) }; return s; };
function trim(s) {
  const keys = Object.keys(s.items).sort((a, b) => (s.items[b].at || 0) - (s.items[a].at || 0));
  for (const k of keys.slice(KEEP)) delete s.items[k];
  return s;
}
const itemOf = (s, b, now) => s.items[boardKey(b)] || { game: b.game, level: b.level, seed: b.seed, mine: null, others: [], at: now };

/** A board this device made or was sent. */
export function noteBoard(state, b, now = Date.now()) { const s = norm(state); s.items[boardKey(b)] = { ...itemOf(s, b, now), at: now }; return trim(s); }
/** Someone else's result on a board (from a code with a score, or from a group file). One result per name; the first one stands. */
export function noteOther(state, b, { name, score, at = 0 }, now = Date.now(), clean = plain) {
  const s = norm(state); const it = itemOf(s, b, now);
  const who = clean(name) || 'Your friend';
  const others = it.others.some((o) => o.name.toLowerCase() === who.toLowerCase()) ? it.others : [...it.others, { name: who, score: nat(score), at: nat(at, 9e15) }].slice(0, MAX_TABLE);
  s.items[boardKey(b)] = { ...it, others, at: now };
  return trim(s);
}
/** This device's own result. Only the first finished round on a board counts; later rounds are practice. */
export function noteMine(state, b, { score, stars = 0 }, now = Date.now()) {
  const s = norm(state); const it = itemOf(s, b, now);
  if (it.mine) return { state: s, counted: false, item: it };
  const item = { ...it, mine: { score: nat(score), stars: nat(stars, 3), at: now }, at: now };
  s.items[boardKey(b)] = item;
  return { state: trim(s), counted: true, item };
}

/** Everyone's results on one board, best first. Equal scores share a place. */
export function table(item, myName = 'You') {
  const rows = [...(item.mine ? [{ name: myName || 'You', score: item.mine.score, me: true }] : []), ...item.others.map((o) => ({ name: o.name, score: o.score, me: false }))].sort((a, b) => b.score - a.score || Number(b.me) - Number(a.me));
  let place = 0;
  return rows.map((r, i) => { if (!rows[i - 1] || rows[i - 1].score !== r.score) place = i + 1; return { ...r, place }; });
}
/** One line that compares this device's result with one other. */
export function compareLine(mine, other) {
  if (mine.score === other.score) return `A tie with ${other.name}: ${mine.score} points each.`;
  const by = Math.abs(mine.score - other.score);
  return mine.score > other.score ? `You beat ${other.name} by ${by}: ${mine.score} to ${other.score}.` : `${other.name} beat you by ${by}: ${other.score} to ${mine.score}.`;
}

// ---- R7: the table as a file that goes from device to device ----
/** The file to pass on: the board and every result this device knows, with this device's own under `myName`. */
export function groupFile(item, myName, now = Date.now(), clean = plain) {
  const results = [...(item.mine ? [{ name: clean(myName) || 'Player', score: item.mine.score, at: item.mine.at }] : []), ...item.others.map((o) => ({ name: o.name, score: o.score, at: o.at || 0 }))];
  return { app: 'alef', kind: GROUP_KIND, v: 1, code: makeCode(item), savedAt: new Date(now).toISOString(), results };
}
/**
 * Reads a group file and adds its results to what this device knows. Results under this device's own name are skipped.
 * @returns {{ok:true, state:any, board:any, added:number}|{ok:false, error:string}}
 */
export function readGroupFile(state, input, myName = '', now = Date.now(), clean = plain) {
  let f = input;
  try { if (typeof input === 'string') f = JSON.parse(input); } catch { return { ok: false, error: 'That file could not be read. Choose the challenge file you were sent.' }; }
  if (!f || f.app !== 'alef' || f.kind !== GROUP_KIND || f.v !== 1 || !Array.isArray(f.results)) return { ok: false, error: 'That is not an Aleph challenge file.' };
  const code = readCode(f.code);
  if (!code.ok) return { ok: false, error: code.error };
  let s = noteBoard(state, code, now);
  const before = s.items[code.key].others.length;
  const me = clean(myName).toLowerCase();
  for (const r of f.results.slice(0, MAX_TABLE)) {
    const name = clean(r?.name);
    if (!name || name.toLowerCase() === me) continue;
    s = noteOther(s, code, { name, score: r.score, at: r.at }, now, clean);
  }
  return { ok: true, state: s, board: code, added: s.items[code.key].others.length - before };
}
