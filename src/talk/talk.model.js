// @ts-check
// Pure helpers for the Talk screen. No DOM, no network, no storage.

const NIKKUD = /[\u0591-\u05C7]/g;
const HEB_LETTER = /[א-ת]/;
const LAT_WORD = /[A-Za-z]/;

export const NAME_SKELETON = 'יהוה';
/** Store keys (written through the app store, so backups include them). Text only: no sound is ever stored. */
export const HISTORY_KEY = 'talk.history';
export const SETTINGS_KEY = 'talk.settings';
export const MAX_HISTORY = 60;

/** @param {string} s */
export function stripNikkud(s) {
  return String(s || '').replace(NIKKUD, '');
}

/** @param {string} s */
export function hasHebrew(s) {
  return HEB_LETTER.test(String(s || ''));
}

/** @param {string} s */
export function hasLatin(s) {
  return LAT_WORD.test(String(s || ''));
}

/**
 * Guess script direction when Auto is on.
 * @param {string} s
 * @returns {'en-he'|'he-en'|null}
 */
export function detectDirection(s) {
  const t = String(s || '').trim();
  if (!t) return null;
  const he = (t.match(/[א-ת]/g) || []).length;
  const la = (t.match(/[A-Za-z]/g) || []).length;
  if (he === 0 && la === 0) return null;
  if (he > la) return 'he-en';
  if (la > he) return 'en-he';
  return null;
}

/** Latin spellings of the four-letter Name — never spoken or casually translated. */
export const hasLatinName = (s) =>
  /\b(?:yhwh|yhvh|yahweh|yahveh|yahwe|jehovah|yehovah|yehova|yehwah)\b/i.test(String(s || ''));

const consonants = (s) => [...String(s)].filter((c) => HEB_LETTER.test(c)).join('');

/** @param {string} word */
export function isNameWord(word) {
  const c = consonants(word);
  if (c === NAME_SKELETON) return true;
  if (c === 'יי' && /^[א-ת֑-ׇ]+$/.test(word)) return true;
  return /^[ובלמכשה]{1,3}יהוה$/.test(c);
}

/** True when Hebrew text contains the four-letter Name (or a common abbrev). */
export function holdsDivineName(text) {
  if (hasLatinName(text)) return true;
  const re = /[א-ת֑-ׇ]+/g;
  let m;
  const s = String(text || '');
  while ((m = re.exec(s))) {
    if (isNameWord(m[0])) return true;
  }
  return false;
}

/**
 * @typedef {{id:string, ts:number, direction:string, source:string, translation:string, detected?:string, held?:boolean}} HistoryItem
 * @param {HistoryItem[]} items
 * @param {HistoryItem} item
 */
export function pushHistory(items, item, max = MAX_HISTORY) {
  const next = [item, ...items.filter((x) => x.id !== item.id)];
  return next.slice(0, max);
}

/** Word-level WER (casefold, strip punctuation and nikkud). */
export function wordErrorRate(reference, hypothesis) {
  const tok = (s) => stripNikkud(String(s || ''))
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const ref = tok(reference);
  const hyp = tok(hypothesis);
  if (!ref.length) return hyp.length ? 1 : 0;
  const d = levenshtein(ref, hyp);
  return d / ref.length;
}

/** @param {string[]} a @param {string[]} b */
export function levenshtein(a, b) {
  const n = a.length, m = b.length;
  const row = new Array(m + 1);
  for (let j = 0; j <= m; j++) row[j] = j;
  for (let i = 1; i <= n; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= m; j++) {
      const cur = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = cur;
    }
  }
  return row[m];
}

/** Normalize for translation comparison (punctuation, case, nikkud, whitespace). */
export function normalizeForCompare(s) {
  return stripNikkud(String(s || ''))
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Score a translation against a reference line: an exact match after normalizing is 1,
 * otherwise 1 minus the word error rate against the reference (never below 0).
 */
export function translationMatchScore(alef, reference) {
  const a = normalizeForCompare(alef);
  const g = normalizeForCompare(reference);
  if (a === g) return 1;
  return Math.max(0, 1 - wordErrorRate(g, a));
}

export function swapDirection(dir) {
  if (dir === 'en-he') return 'he-en';
  if (dir === 'he-en') return 'en-he';
  return 'auto';
}

export function uid() {
  return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Settings as stored. `speaker` picks the Hebrew "I" forms (a man says צריך, a woman צריכה); '' shows the man's form with the other beside it.
 * @param {any} [saved]
 * @returns {{direction:'auto'|'en-he'|'he-en', faceToFace:boolean, nikkud:boolean, autoSpeak:boolean, speaker:''|'m'|'f'}}
 */
export function loadSettings(saved = {}) {
  const s = saved && typeof saved === 'object' ? saved : {};
  return {
    direction: s.direction === 'en-he' || s.direction === 'he-en' ? s.direction : 'auto',
    faceToFace: !!s.faceToFace,
    nikkud: !!s.nikkud,
    autoSpeak: s.autoSpeak !== false,
    speaker: s.speaker === 'm' || s.speaker === 'f' ? s.speaker : '',
  };
}

/** History as stored: a list of plain text items, newest first; anything else is dropped. */
export function loadHistory(saved, max = MAX_HISTORY) {
  if (!Array.isArray(saved)) return [];
  return saved.filter((x) => x && typeof x.id === 'string' && typeof x.source === 'string' && typeof x.translation === 'string').slice(0, max);
}
