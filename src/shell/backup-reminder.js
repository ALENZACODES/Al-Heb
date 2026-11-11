// @ts-check
// Progress backup reminder. Aleph keeps progress only in this browser on this device; nothing is copied anywhere automatically.
// After meaningful progress (a few finished lessons) Home shows one calm card pointing at Settings > Back up. It never says or
// implies that a backup happened on its own: the only thing that counts as a backup is the learner downloading the file.
// Pure helpers plus one small node builder (takes an `h` element factory). Store key: backup.reminder.v1
//   { lastExportAt: ISO string|null, lastExportCompleted: number, snoozeUntil: ISO string|null }
import { lessonsFinished } from '../lib/counts.js';

export const REMINDER_KEY = 'backup.reminder.v1';
/** Finished lessons before the first reminder. */
export const FIRST_AT = 3;
/** Further finished lessons since the last downloaded backup before reminding again. */
export const AGAIN_AFTER = 5;
/** "Not now" hides the card for this many days. */
export const SNOOZE_DAYS = 7;
const DAY = 86_400_000;

export const REMINDER_TITLE = 'Keep a copy of your progress';
/** Plain: where progress lives, that nothing backs it up for you, and what to do. */
export function reminderText(completed, rec) {
  const since = rec && rec.lastExportAt ? ` You have finished ${completed - (rec.lastExportCompleted || 0)} more since your last backup file.` : '';
  return `Your progress is saved only in this browser on this device. Nothing copies it anywhere for you. If the browser data is cleared or the device is lost, it is gone. Download a backup file in Settings and keep it somewhere safe.${since}`;
}

/** Normalise whatever is stored (or nothing). */
export function readRecord(v) {
  const o = v && typeof v === 'object' ? v : {};
  return {
    lastExportAt: typeof o.lastExportAt === 'string' ? o.lastExportAt : null,
    lastExportCompleted: Number.isFinite(o.lastExportCompleted) && o.lastExportCompleted >= 0 ? o.lastExportCompleted : 0,
    snoozeUntil: typeof o.snoozeUntil === 'string' ? o.snoozeUntil : null,
  };
}

/**
 * Should Home show the reminder now?
 * @param {{completed:number, record?:any, now?:number}} a
 */
export function reminderDue({ completed, record, now = Date.now() }) {
  const r = readRecord(record);
  const n = Number(completed) || 0;
  if (n < FIRST_AT) return false;
  if (r.snoozeUntil && Date.parse(r.snoozeUntil) > now) return false;
  if (!r.lastExportAt) return true;
  return n - r.lastExportCompleted >= AGAIN_AFTER;
}

/** Record that the learner downloaded a backup file (called from Settings right after the download starts). */
export function afterExport(record, completed, now = Date.now()) {
  return { ...readRecord(record), lastExportAt: new Date(now).toISOString(), lastExportCompleted: Number(completed) || 0, snoozeUntil: null };
}

/** "Not now": hide the card for SNOOZE_DAYS. */
export function snoozed(record, now = Date.now()) {
  return { ...readRecord(record), snoozeUntil: new Date(now + SNOOZE_DAYS * DAY).toISOString() };
}

/** Finished-lesson count from the curriculum progress record ({completed: {[id]: ms}}). */
export function completedCount(progress) {
  const c = progress && typeof progress === 'object' ? progress.completed : null;
  return lessonsFinished(c); // src/lib/counts.js: the lessons-finished number every screen shows
}

/**
 * The Home card. `onSnooze` is called by "Not now"; the card removes itself.
 * @param {Function} h element factory @param {{completed:number, record?:any, onSnooze?:()=>void}} o
 */
export function reminderNode(h, { completed, record, onSnooze }) {
  let card = null;
  const notNow = h('button', { type: 'button', class: 'btn secondary', id: 'backup-remind-later', onclick: () => {
    try { onSnooze && onSnooze(); } catch { /* best effort */ }
    try { if (card && typeof card.remove === 'function') card.remove(); } catch { /* ignore */ }
  } }, 'Not now');
  card = h('section', { class: 'card backup-reminder', id: 'backup-reminder', 'aria-labelledby': 'backup-reminder-h', role: 'note' },
    h('h2', { id: 'backup-reminder-h' }, REMINDER_TITLE),
    h('p', {}, reminderText(completed, readRecord(record))),
    h('div', { class: 'row' }, h('a', { class: 'btn', href: '#/settings', id: 'backup-remind-go' }, 'Go to backup in Settings'), notNow));
  return card;
}
