// H3 cram sessions sized to the minutes available, H4 leech detection, H5 mastery states. Pure: callers pass cards and `now`.
import { cardRetrievability } from '../curriculum/srs.js';
import { decodeLog } from './sched-state.js';

// ---------- H5 mastery states (Aleph's own rule, stated on the page) ----------
export const KNOWN_DAYS = 7, MASTERED_DAYS = 30;
export const STATES = Object.freeze([['new', 'New'], ['learning', 'Learning'], ['known', 'Known'], ['mastered', 'Mastered']]);
/** new: never answered; learning: missed last time or lasts under 7 days; known: 7 to 29 days; mastered: 30 days or more. */
export function masteryOf(c) {
  if (!c || c.state === 'new' || c.lastReview == null) return 'new';
  if (c.state === 'relearning' || !(c.stability >= KNOWN_DAYS)) return 'learning';
  return c.stability >= MASTERED_DAYS ? 'mastered' : 'known';
}
/** Card id -> {kind, label}: "letter:bet" -> {kind:'letter', label:'bet'}; ids without a kind prefix keep the card's own kind. */
export function cardLabel(c) {
  const id = String(c?.id ?? ''), i = id.indexOf(':');
  return i > 0 ? { kind: c.kind || id.slice(0, i), label: id.slice(i + 1) } : { kind: c?.kind || 'card', label: id };
}

// ---------- H4 leeches ----------
export const LEECH_MISSES = 5;
/** Times a card was answered Again: the larger of its lapse count and the Again answers in its log (the log is newer and short). */
export const missesOf = (c) => Math.max(Number(c?.lapses) || 0, decodeLog(c).filter((r) => r.rating === 1).length);
export const isLeech = (c) => missesOf(c) >= LEECH_MISSES;

// ---------- H3 cram ----------
export const DEFAULT_SECONDS = 12; // used until the learner's own pace is known; labelled an estimate on the page
export const PACE_KEY = 'review.pace', PACE_MIN = 20;
/** Seconds per card: the learner's measured average once PACE_MIN cards were timed, otherwise the estimate. */
export function paceOf(p) { return p && p.n >= PACE_MIN && p.avg > 0 ? { seconds: p.avg, measured: true, n: p.n } : { seconds: DEFAULT_SECONDS, measured: false, n: p?.n || 0 }; }
/** Add one timed card (seconds, clamped 2..120 so a card left open over lunch does not count) to the running average. */
export function addPace(p, seconds) {
  const s = Math.min(120, Math.max(2, Number(seconds) || 0)), n = (p?.n || 0) + 1;
  return { n, avg: ((p?.avg || 0) * (n - 1) + s) / n };
}
/**
 * Card ids for a session of `minutes`: due cards first (most overdue first), then weak cards not yet due (leeches, then the lowest
 * chance of recall under 85%). Size = minutes * 60 / seconds per card, at least 1.
 * @returns {{ids:string[], size:number, due:number, weak:number}}
 */
export function cramQueue(cards, now, minutes, seconds = DEFAULT_SECONDS) {
  const list = Object.values(cards || {}).filter((c) => c && c.id && c.state !== 'new' && c.lastReview != null);
  const size = Math.max(1, Math.floor((minutes * 60) / seconds));
  const due = list.filter((c) => c.due <= now).sort((a, b) => a.due - b.due || String(a.id).localeCompare(String(b.id)));
  const weak = list.filter((c) => c.due > now).map((c) => ({ c, r: cardRetrievability(c, now), leech: isLeech(c) }))
    .filter((x) => x.leech || x.r < 0.85).sort((a, b) => (b.leech - a.leech) || a.r - b.r || String(a.c.id).localeCompare(String(b.c.id))).map((x) => x.c);
  const ids = [...due, ...weak].slice(0, size).map((c) => c.id);
  return { ids, size, due: Math.min(due.length, size), weak: Math.max(0, ids.length - Math.min(due.length, size)) };
}
