// H10 Export my data as CSV (the JSON backup and its restore already exist: src/store.js exportJSON / importData, used by Settings,
// and #/move merges a package from another device). CSV is for reading the data in a spreadsheet; it is not an import format.
import { DECKS, cardsOf, decodeLog } from './sched-state.js';

/** One CSV cell (RFC 4180): quoted when it holds a comma, quote or line break; a leading = + - @ is prefixed with ' so a spreadsheet does not run it. */
export function cell(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export const toCSV = (rows) => rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
const iso = (ms) => (Number.isFinite(Number(ms)) && ms != null ? new Date(Number(ms)).toISOString() : '');
const dayIso = (d) => new Date(d * 86400000).toISOString().slice(0, 10);

/** Every review card: deck, id, kind, state, numbers, last and next review, and the logged answers (date:rating). */
export function cardsCSV(decks) {
  const rows = [['deck', 'card', 'kind', 'state', 'stability_days', 'difficulty', 'reviews', 'lapses', 'last_review', 'next_review', 'answer_log']];
  for (const [key, label] of DECKS) for (const c of cardsOf(decks?.[key])) {
    rows.push([label, c.id ?? '', c.kind ?? '', c.state, c.stability != null ? Number(c.stability).toFixed(3) : '', c.difficulty != null ? Number(c.difficulty).toFixed(3) : '',
      c.reps ?? '', c.lapses ?? '', iso(c.lastReview), iso(c.due), decodeLog(c).map((r) => `${dayIso(r.day)}:${r.rating}`).join(' ')]);
  }
  return toCSV(rows);
}
/** Lessons completed: id and when (curriculum.progress {completed: {id: ms}}). */
export function lessonsCSV(progress) {
  const done = progress && typeof progress.completed === 'object' ? progress.completed : {};
  return toCSV([['lesson', 'completed_at'], ...Object.entries(done).sort((a, b) => Number(a[1]) - Number(b[1])).map(([id, ms]) => [id, iso(ms) || String(ms)])]);
}
/** Every stored key with its size, for the "what is stored" table. */
export function inventory(data) {
  return Object.entries(data || {}).map(([key, v]) => ({ key, chars: JSON.stringify(v ?? null).length })).sort((a, b) => b.chars - a.chars);
}
