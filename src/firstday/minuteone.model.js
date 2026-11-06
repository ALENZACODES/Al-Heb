/** Minute One — build אבא (t1040u research fold). Pure helpers; no DOM. */
export const STORE_KEY = 'firstwin.v1';

export function normalize(rec) {
  if (!rec || typeof rec !== 'object') return {
    v: 2, done: false, saved: false, personalised: false,
    motivation: null, level: null, minutes: null, promiseDate: null,
  };
  return {
    v: 2,
    done: !!rec.done,
    saved: !!rec.saved,
    personalised: !!rec.personalised,
    builtAt: typeof rec.builtAt === 'string' ? rec.builtAt : null,
    seconds: Number.isFinite(rec.seconds) ? rec.seconds : null,
    accuracy: Number.isFinite(rec.accuracy) ? rec.accuracy : null,
    wordId: rec.wordId || 'abba',
    motivation: typeof rec.motivation === 'string' ? rec.motivation : null,
    level: typeof rec.level === 'string' ? rec.level : null,
    minutes: Number.isFinite(rec.minutes) ? rec.minutes : null,
    promiseDate: typeof rec.promiseDate === 'string' ? rec.promiseDate : null,
  };
}

/** Next expected tray letter index into word.letters */
export function nextSlot(placed, letters) {
  return placed.length;
}

export function canPlace(placed, letters, glyph) {
  const i = placed.length;
  if (i >= letters.length) return false;
  return letters[i] === glyph || /* allow matching by he */ false;
}

/** Place by letter id matching word.letters[i] */
export function place(placed, wordLetters, trayId) {
  const i = placed.length;
  if (i >= wordLetters.length) return { ok: false, placed };
  if (wordLetters[i] !== trayId) return { ok: false, placed };
  return { ok: true, placed: [...placed, trayId] };
}

export function isComplete(placed, wordLetters) {
  return placed.length === wordLetters.length && placed.every((id, i) => id === wordLetters[i]);
}

export function accuracyOf(correctBeats, totalBeats) {
  const t = Math.max(1, totalBeats | 0);
  const c = Math.max(0, Math.min(t, correctBeats | 0));
  return Math.round((100 * c) / t);
}

export function finishRecord({ seconds, correctBeats, totalBeats, nowISO, motivation, level, minutes, promiseDate }) {
  return {
    v: 2,
    done: true,
    saved: false,
    personalised: false,
    builtAt: nowISO,
    seconds: Math.max(0, Math.round(seconds)),
    accuracy: accuracyOf(correctBeats, totalBeats),
    wordId: 'abba',
    motivation: motivation || null,
    level: level || null,
    minutes: Number.isFinite(minutes) ? minutes : null,
    promiseDate: promiseDate || null,
  };
}

/** Busuu-style live date: daysOut from now (local calendar day). */
export function promiseDateISO(daysOut, now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + Math.max(1, daysOut | 0));
  return d.toISOString().slice(0, 10);
}

export function formatPromiseDate(iso) {
  if (!iso || typeof iso !== 'string') return '—';
  const [y, m, day] = iso.split('-').map(Number);
  if (!y || !m || !day) return iso;
  const d = new Date(y, m - 1, day);
  try {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

/** Build promise line from motivation + commitment. */
export function promiseLine(motivation, commitment, dateLabel) {
  const target = (motivation && motivation.promiseTarget) || 'decode the Shema unaided';
  const mins = (commitment && commitment.minutes) || 5;
  return `At ${mins} min a day, you will ${target} by ${dateLabel}.`;
}

/** Ordered celebrate beats — words LARGE first; one haptic on streak/reveal only. */
export const FINISH_BEATS = Object.freeze([
  'gratitude',
  'wordsLarge',
  'accuracyTime',
  'streakReveal', // ← sole haptic
  'shareCard',
  'nextOpen', // Zeigarnik / siyum: open next (אמא) in same breath
  'save',
  'personalise',
]);
