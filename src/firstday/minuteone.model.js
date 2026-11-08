/**
 * Minute One: pure helpers, no DOM.
 *  - the first-run record (firstwin.v1: motivation, level, minutes, promise date) and the finish beats, unchanged;
 *  - the word builder (2026-11-07): a letter tray with the whole alef-bet, matching against data/firstday/buildable-words.json,
 *    hints for a dead end, progressive unlocking of letters, and the "words built" tally under firstday.builder.v1.
 *
 * Matching rule: the tray has no vowel marks, so a word is recognised by its LETTERS ONLY (the pointed form is then shown and
 * spoken). Final letters are folded to their base letter on both sides, so a learner who places mem at the end of שלום still
 * builds the word; the screen writes the final form for them and says so.
 */
export const STORE_KEY = 'firstwin.v1';
export const BUILDER_KEY = 'firstday.builder.v1';
export const WORDS_URL = 'data/firstday/buildable-words.json';

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

/** Place by letter id matching word.letters[i] (the guided first build). */
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

export function finishRecord({ seconds, correctBeats, totalBeats, nowISO, motivation, level, minutes, promiseDate, wordId }) {
  return {
    v: 2,
    done: true,
    saved: false,
    personalised: false,
    builtAt: nowISO,
    seconds: Math.max(0, Math.round(seconds)),
    accuracy: accuracyOf(correctBeats, totalBeats),
    wordId: wordId || 'abba',
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

// ---------------------------------------------------------------------------------------------------------------------------
// Word builder
// ---------------------------------------------------------------------------------------------------------------------------

/** The 22 letters in alef-bet order (ids are the letter clip ids under audio/{m,f}/israeli/letter/), with the final forms. */
export const ALEF_BET = Object.freeze([
  { id: 'alef', he: 'א', name: 'Alef' }, { id: 'bet', he: 'ב', name: 'Bet' }, { id: 'gimel', he: 'ג', name: 'Gimel' },
  { id: 'dalet', he: 'ד', name: 'Dalet' }, { id: 'he', he: 'ה', name: 'He' }, { id: 'vav', he: 'ו', name: 'Vav' },
  { id: 'zayin', he: 'ז', name: 'Zayin' }, { id: 'chet', he: 'ח', name: 'Chet' }, { id: 'tet', he: 'ט', name: 'Tet' },
  { id: 'yod', he: 'י', name: 'Yod' }, { id: 'kaf', he: 'כ', name: 'Kaf', final: 'ך', finalId: 'kaf-final' },
  { id: 'lamed', he: 'ל', name: 'Lamed' }, { id: 'mem', he: 'מ', name: 'Mem', final: 'ם', finalId: 'mem-final' },
  { id: 'nun', he: 'נ', name: 'Nun', final: 'ן', finalId: 'nun-final' }, { id: 'samekh', he: 'ס', name: 'Samekh' },
  { id: 'ayin', he: 'ע', name: 'Ayin' }, { id: 'pe', he: 'פ', name: 'Pe', final: 'ף', finalId: 'pe-final' },
  { id: 'tsadi', he: 'צ', name: 'Tsadi', final: 'ץ', finalId: 'tsadi-final' }, { id: 'qof', he: 'ק', name: 'Qof' },
  { id: 'resh', he: 'ר', name: 'Resh' }, { id: 'shin', he: 'ש', name: 'Shin' }, { id: 'tav', he: 'ת', name: 'Tav' },
].map(Object.freeze));
export const FINAL_TO_BASE = Object.freeze({ 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' });
export const BASE_TO_FINAL = Object.freeze({ 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' });
const LETTER_BY_HE = new Map(ALEF_BET.flatMap((l) => [[l.he, l], ...(l.final ? [[l.final, l]] : [])]));

/** Letters only: every point and accent removed. */
export const bareOf = (s) => String(s || '').normalize('NFC').replace(/[֑-ׇ]/g, '');
/** Final letters folded to their base form (matching ignores the final/non-final distinction). */
export const foldFinals = (s) => String(s || '').replace(/[ךםןףץ]/g, (c) => FINAL_TO_BASE[c]);
/** The letter record for a glyph (base or final), or null for anything else. */
export const letterFor = (ch) => LETTER_BY_HE.get(ch) || null;

/**
 * The letters as Hebrew writes them: the last letter takes its final form, any final letter placed earlier goes back to its base form.
 * Returns {text, finalFixed}: finalFixed is the base letter that was written as a final (for the one-line note), else null.
 */
export function writtenForm(letters) {
  const arr = Array.from(letters || []).map((c) => FINAL_TO_BASE[c] || c);
  if (!arr.length) return { text: '', finalFixed: null };
  const last = arr[arr.length - 1];
  const fin = BASE_TO_FINAL[last];
  const placedLast = Array.from(letters)[arr.length - 1];
  if (fin) arr[arr.length - 1] = fin;
  return { text: arr.join(''), finalFixed: fin && placedLast !== fin ? last : null };
}

/**
 * Index the word list for matching and hints.
 *  byKey: folded bare spelling -> word; prefixes: folded proper prefixes of every word -> the best word (lowest level, then list order)
 *  that continues it. Words are expected in list order (level, then frequency).
 */
export function makeIndex(words) {
  const byKey = new Map(), prefixes = new Map();
  for (const w of words || []) {
    if (!w || !w.bare) continue;
    const key = foldFinals(w.bare);
    if (!byKey.has(key)) byKey.set(key, { ...w, key });
    for (let i = 1; i < key.length; i++) {
      const p = key.slice(0, i);
      if (!prefixes.has(p)) prefixes.set(p, byKey.get(key));
    }
  }
  return { byKey, prefixes, size: byKey.size, words: [...byKey.values()] };
}

/**
 * Judge what is on the slots.
 *  match: the word spelled (letters only), or null. extendable: some longer word starts like this (so a match is not fired early).
 *  hint: for a dead end, the nearest real word that starts with the same letters (longest shared prefix); for a live prefix, the
 *  word it is heading toward; stem: how many placed letters that hint shares. Empty slots: nothing.
 */
export function evaluate(index, letters) {
  const key = foldFinals(Array.from(letters || []).join(''));
  if (!key) return { key, match: null, extendable: false, deadEnd: false, hint: null, stem: 0 };
  const match = index.byKey.get(key) || null;
  const extendable = index.prefixes.has(key);
  if (match || extendable) return { key, match, extendable, deadEnd: false, hint: extendable ? index.prefixes.get(key) : null, stem: key.length };
  for (let i = key.length - 1; i >= 1; i--) {
    const p = key.slice(0, i);
    const hint = index.byKey.get(p) || index.prefixes.get(p) || null;
    if (hint) return { key, match: null, extendable: false, deadEnd: true, hint, stem: i };
  }
  return { key, match: null, extendable: false, deadEnd: true, hint: null, stem: 0 };
}

/** Starter words, in the order they are suggested on the first visit (3 to 4 letters each, every one with a clip for both voices). */
export const STARTER_BARE = Object.freeze(['אבא', 'אמא', 'שלום', 'טוב', 'מים', 'ספר', 'ילד', 'לחם', 'בית', 'תודה']);
/** Letters by how often they occur in the buildable words (the order more letters are unlocked in). */
export const UNLOCK_ORDER = Object.freeze(['י', 'ה', 'ר', 'ו', 'ל', 'א', 'מ', 'ש', 'ב', 'ח', 'ע', 'ת', 'נ', 'ד', 'ק', 'פ', 'כ', 'ס', 'ג', 'צ', 'ט', 'ז']);
/** Each word built opens UNLOCK_STEP more letters; from FULL_AT words on, the whole alef-bet and the final forms. */
export const UNLOCK_STEP = 3, FULL_AT = 6;

const lettersOf = (words) => { const s = new Set(); for (const w of words || []) for (const c of foldFinals(w?.bare || '')) s.add(c); return s; };
/** The letters opened by progress alone: those of every word already built plus UNLOCK_STEP per word built, in UNLOCK_ORDER. */
export function progressLetters(count, builtWords) {
  const set = lettersOf(builtWords);
  let extra = Math.max(0, count) * UNLOCK_STEP;
  for (const c of UNLOCK_ORDER) { if (extra <= 0) break; if (!set.has(c)) { set.add(c); extra--; } }
  return set;
}

/**
 * Words to suggest next: unbuilt starters first (STARTER_BARE order, 3 to 4 letters), then unbuilt words in list order whose
 * level fits the learner (level <= 1 + floor(count / 5)) and whose letters are already open; if that runs short, list order.
 */
export function suggestions(index, rec, n = 3) {
  const r = normalizeBuilder(rec);
  const built = new Set(r.words);
  const open = progressLetters(r.count, index.words.filter((w) => built.has(w.id)));
  const out = [];
  for (const b of STARTER_BARE) {
    const w = index.byKey.get(foldFinals(b));
    if (w && !built.has(w.id) && out.length < n) out.push(w);
  }
  const maxLevel = Math.min(5, 1 + Math.floor(r.count / 5));
  const fits = (w) => [...foldFinals(w.bare)].every((c) => open.has(c));
  for (const pass of [true, false]) {
    for (const w of index.words) {
      if (out.length >= n) break;
      if (built.has(w.id) || out.includes(w) || (w.level || 1) > maxLevel || (pass && !fits(w))) continue;
      out.push(w);
    }
  }
  return out;
}

/**
 * Which base letters the tray shows: the letters of the words suggested now (so a suggestion can always be built), of the words
 * already built, and UNLOCK_STEP more per word built; from FULL_AT words on, or when the learner asks for all letters, the whole
 * alef-bet. Returned in alef-bet order.
 */
export function unlockedLetters(rec, index, suggested, showAll = false) {
  const r = normalizeBuilder(rec);
  const all = ALEF_BET.map((l) => l.he);
  if (showAll || r.count >= FULL_AT) return all;
  const built = new Set(r.words);
  const set = progressLetters(r.count, index.words.filter((w) => built.has(w.id)));
  for (const c of lettersOf(suggested)) set.add(c);
  return all.filter((c) => set.has(c));
}

/** Final forms are offered as tiles once the whole alef-bet is open (before that the screen writes them for the learner). */
export const finalsShown = (rec, showAll = false) => showAll || normalizeBuilder(rec).count >= FULL_AT;

/** The saved tally: words built on this device (ids, unique), when the last one was built. */
export function normalizeBuilder(rec) {
  const ids = Array.isArray(rec?.words) ? rec.words.filter((x) => typeof x === 'string') : [];
  return { v: 1, words: [...new Set(ids)], count: new Set(ids).size, lastAt: typeof rec?.lastAt === 'string' ? rec.lastAt : null, builds: Number.isFinite(rec?.builds) ? rec.builds : new Set(ids).size };
}
/** Count a built word. `builds` counts every build (repeats included); `count` is distinct words. */
export function recordBuilt(rec, word, nowISO) {
  const r = normalizeBuilder(rec);
  const words = r.words.includes(word.id) ? r.words : [...r.words, word.id];
  return { v: 1, words, count: words.length, lastAt: nowISO, builds: r.builds + 1 };
}
export function tallyLine(rec) {
  const r = normalizeBuilder(rec);
  if (!r.count) return 'No words built yet.';
  return r.count === 1 ? '1 word built.' : `${r.count} words built.`;
}

/** Keyboard: a Hebrew letter key places that letter; Backspace removes the last; Enter checks. Anything else is ignored. */
export function keyAction(key) {
  if (key === 'Backspace' || key === 'Delete') return { type: 'remove' };
  if (key === 'Enter') return { type: 'check' };
  if (key === 'Escape') return { type: 'clear' };
  if (typeof key === 'string' && key.length === 1 && letterFor(key)) return { type: 'place', he: FINAL_TO_BASE[key] || key };
  return null;
}
