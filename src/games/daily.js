// @ts-check
// Daily seeded challenge (D3). One arcade game a day (gameOfTheDay over the arcade list, seeded from the date), the same board for
// everyone who plays it at the same level that day (src/games/arcade.js seeds the board from the game, the date and the level).
// Only the FIRST finished daily round of today's game counts as the day's score; later rounds that day are practice.
// The shareable score is a line of text and a picture made on this device (src/games/sharecard.js); nothing is sent anywhere.
// Pure: no DOM, no clock (the day is passed in).
import { ARCADE_IDS, ARCADE_GAMES } from './arcade.catalog.js';
import { gameOfTheDay, dayKey } from './arcade.model.js';

export const DAILY_KEY = 'games.daily.v1';
const KEEP_DAYS = 120;
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const nat = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);

/** Today's daily game id (the same rotation the games hub card shows). */
export const dailyGameId = (day = dayKey()) => gameOfTheDay(ARCADE_IDS, day);
export const dailyGame = (day = dayKey()) => ARCADE_GAMES.find((g) => g.id === dailyGameId(day)) || null;

/**
 * A finished daily round. Counts only when it is today's game and the day has no score yet.
 * @returns {{record:any, counted:boolean, reason:'counted'|'already'|'other-game', entry:any}}
 */
export function noteDaily(prev, { day, id, level, score, stars, at = 0 }) {
  const rec = { ...obj(prev) };
  const want = dailyGameId(day);
  if (id !== want) return { record: rec, counted: false, reason: 'other-game', entry: rec[day] || null };
  if (rec[day]) return { record: rec, counted: false, reason: 'already', entry: rec[day] };
  rec[day] = { id, level: Math.max(1, nat(level)), score: nat(score), stars: Math.min(3, nat(stars)), at: Number(at) || 0 };
  const days = Object.keys(rec).sort();
  for (const d of days.slice(0, Math.max(0, days.length - KEEP_DAYS))) delete rec[d];
  return { record: rec, counted: true, reason: 'counted', entry: rec[day] };
}

/** Days in a row, ending today or yesterday, with a counted daily score. */
export function dailyRun(rec, day = dayKey()) {
  const r = obj(rec);
  const prevDay = (d) => { const [y, m, dd] = d.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, dd) - 86400000); return t.toISOString().slice(0, 10); };
  let d = r[day] ? day : prevDay(day), n = 0;
  while (r[d]) { n++; d = prevDay(d); }
  return n;
}

const STAR_TEXT = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
/** The text a learner can copy and share. Names the day, game, level, score and stars; nothing else. */
export function shareText({ day, title, level, score, stars }) {
  return `Aleph daily challenge, ${day}: ${title}, level ${level}. ${score} points ${STAR_TEXT(Math.min(3, nat(stars)))}. Same board for everyone at this level today.`;
}
