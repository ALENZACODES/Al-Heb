// Hebrew text helpers (pure, no dependencies). Lane 6.
// Ranges: Hebrew block U+0590-05FF. Cantillation (ta'amim) U+0591-05AF.
// Points (niqqud) U+05B0-05BD, 05BF, 05C1, 05C2, 05C4, 05C5, 05C7.
// Punctuation kept by the strippers: maqaf U+05BE, paseq U+05C0, sof pasuq U+05C3, nun hafukha U+05C6.

export const FINAL_TO_BASE = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
export const MAQAF = '־';

const TAAMIM_RE = /[֑-֯]/g;
// points = 05B0-05BD, 05BF, 05C1-05C2, 05C4-05C5, 05C7 (keeps maqaf 05BE, paseq 05C0, sof pasuq 05C3)
const POINTS_RE = /[ְ-ׇֽֿׁׂׅׄ]/g;
const LETTER_RE = /[א-ת]/;
const LETTERS_G = /[א-ת]/g;

export function stripTaamim(s) { return String(s ?? '').replace(TAAMIM_RE, ''); }
export function stripNiqqud(s) { return String(s ?? '').replace(POINTS_RE, ''); }
/** Strip both ta'amim and niqqud (keeps maqaf/paseq/sof pasuq). */
export function stripMarks(s) { return stripNiqqud(stripTaamim(s)); }

export function isHebrewLetter(ch) { return ch.length > 0 && /^[א-ת]$/.test(ch); }
/** true if the string contains at least one Hebrew letter. */
export function isHebrew(s) { return LETTER_RE.test(String(s ?? '')); }
/** true if the string contains any niqqud vowel point (05B0-05BB, 05C7) */
export function isPointed(s) { return /[ְ-ׇֻ]/.test(String(s ?? '')); }

export function foldFinals(s) {
  return String(s ?? '').replace(/[ךםןףץ]/g, (c) => FINAL_TO_BASE[c]);
}

/**
 * Consonant skeleton: marks removed, final letters folded to base, everything that is not a
 * Hebrew letter dropped (spaces kept as single spaces only if keepSpaces).
 * Presentation forms (U+FB1D-FB4F) are NFC/NFKC-normalised first where possible.
 */
export function consonantSkeleton(text, { keepSpaces = false } = {}) {
  let s = String(text ?? '').normalize('NFKD'); // decomposes FB2A.. shin presentation forms
  s = stripMarks(s);
  s = s.replace(/[־׀׃׆]/g, ' ');
  s = foldFinals(s);
  if (keepSpaces) return s.replace(/[^א-ת ]/g, '').replace(/ +/g, ' ').trim();
  return (s.match(LETTERS_G) || []).join('');
}

/** Split on whitespace and maqaf; returns non-empty tokens (any script). */
export function tokenise(text) {
  return String(text ?? '').split(/[\s־]+/u).filter(Boolean);
}

/**
 * Unicode sanity report: counts, stray marks (a mark at start or after a non-letter),
 * duplicate vowels on one letter, non-Hebrew letters mixed in a Hebrew word.
 */
export function sanityCheck(text) {
  const s = String(text ?? '');
  const issues = [];
  let prevIsLetter = false;
  let vowelsOnLetter = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    const isLetter = cp >= 0x05D0 && cp <= 0x05EA;
    const isMark = (cp >= 0x0591 && cp <= 0x05BD) || cp === 0x05BF || cp === 0x05C1 || cp === 0x05C2 || cp === 0x05C4 || cp === 0x05C5 || cp === 0x05C7;
    if (isLetter) { prevIsLetter = true; vowelsOnLetter = 0; continue; }
    if (isMark) {
      if (!prevIsLetter) issues.push(`stray mark U+${cp.toString(16).toUpperCase()} not attached to a letter`);
      if (cp >= 0x05B0 && cp <= 0x05BB) { if (++vowelsOnLetter > 1 && cp !== 0x05B0) issues.push('more than one vowel point on a letter'); }
      continue;
    }
    prevIsLetter = false;
  }
  const hasPresentation = /[יִ-ﭏ]/.test(s);
  if (hasPresentation) issues.push('contains Hebrew presentation forms (U+FB1D-FB4F); normalise with NFKD');
  for (const t of tokenise(s)) {
    if (isHebrew(t) && /[A-Za-z0-9]/.test(t)) issues.push(`token mixes Hebrew with Latin/digits: ${t}`);
  }
  return { ok: issues.length === 0, issues, hebrew: isHebrew(s), pointed: isPointed(s) };
}
