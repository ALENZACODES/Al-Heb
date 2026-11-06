/** Minute One — build אבא (t1039u). Pure helpers; no DOM. */
export const STORE_KEY = 'firstwin.v1';

export function normalize(rec) {
  if (!rec || typeof rec !== 'object') return { v: 1, done: false, saved: false, personalised: false };
  return {
    v: 1,
    done: !!rec.done,
    saved: !!rec.saved,
    personalised: !!rec.personalised,
    builtAt: typeof rec.builtAt === 'string' ? rec.builtAt : null,
    seconds: Number.isFinite(rec.seconds) ? rec.seconds : null,
    accuracy: Number.isFinite(rec.accuracy) ? rec.accuracy : null,
    wordId: rec.wordId || 'abba',
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

export function finishRecord({ seconds, correctBeats, totalBeats, nowISO }) {
  return {
    v: 1,
    done: true,
    saved: false,
    personalised: false,
    builtAt: nowISO,
    seconds: Math.max(0, Math.round(seconds)),
    accuracy: accuracyOf(correctBeats, totalBeats),
    wordId: 'abba',
  };
}
