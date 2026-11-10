// @ts-check
// Pure helpers for the Talk (live translator) screen. No DOM, no network.

const NIKKUD = /[\u0591-\u05C7]/g;
const HEB_LETTER = /[א-ת]/;
const LAT_WORD = /[A-Za-z]/;

export const NAME_SKELETON = 'יהוה';
export const HISTORY_KEY = 'alef.talk.history.v1';
export const SETTINGS_KEY = 'alef.talk.settings.v1';
/** Experimental Gemini Live / native-audio speech-to-speech (off by default). */
export const VOICE_KEEP_DEFAULT = false;
export const URL_KEY = 'alefTranslatorUrl';
export const MAX_HISTORY = 80;

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
 * Resolve the translator backend URL. Empty means the screen must fail closed (no backend).
 * @param {{envUrl?:string, storageUrl?:string, metaUrl?:string, queryUrl?:string}} [opts]
 */
export function resolveBackendUrl(opts = {}) {
  const raw = opts.queryUrl || opts.storageUrl || opts.metaUrl || opts.envUrl || '';
  const s = String(raw).trim().replace(/\/$/, '');
  if (!s) return '';
  try {
    const u = new URL(s, 'https://example.invalid');
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return s;
  } catch {
    return '';
  }
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
 * Compare ALEF translation to a Google Translate reference.
 * exact match = 1, otherwise 1 - word WER against the reference (floored at 0).
 */
export function translationMatchScore(alef, google) {
  const a = normalizeForCompare(alef);
  const g = normalizeForCompare(google);
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
 * @param {object} [saved]
 * @returns {{direction:string, faceToFace:boolean, nikkud:boolean, autoSpeak:boolean, voiceKeep:boolean}}
 */
export function loadSettings(saved = {}) {
  return {
    direction: saved.direction === 'en-he' || saved.direction === 'he-en' ? saved.direction : 'auto',
    faceToFace: !!saved.faceToFace,
    nikkud: !!saved.nikkud,
    autoSpeak: saved.autoSpeak !== false,
    voiceKeep: saved.voiceKeep === true, // off unless explicitly enabled
  };
}
