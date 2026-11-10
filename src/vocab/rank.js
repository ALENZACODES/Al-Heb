// Relevance for the vocabulary search. Whole glosses, senses, Hebrew words and
// transliterations rank ahead of letters that merely sit inside another word.
// Nothing here is a special case for one English word.

/** Same mark removal as stripPoints in model.js (kept here so the two files do not import each other). */
function stripMarks(s) {
  return String(s ?? '').normalize('NFD').replace(/[֑-ׇ־]/g, '').replace(/[‎‏"'`]/g, '').normalize('NFC');
}

/** Bands. Lower is a closer match. Alias is a sourced English intent, not a stored gloss. 0-4 are exact list matches; 5-6 are letter matches. */
export const BAND = Object.freeze({
  alias: -1,
  gloss: 0,
  firstSense: 1,
  sense: 2,
  hebrew: 3,
  translit: 4,
  prefix: 5,
  substring: 6,
});
export const EXACT_MAX = BAND.translit;
/** Latin queries shorter than this do not use prefix or substring matches unless the learner asks. */
export const SHORT_LATIN = 4;
export const SHORT_HEBREW = 3;

const HEBREW_LETTERS = /[א-ת]/;

/** Case, points, punctuation and extra whitespace folded away. Not a regular expression. */
export function fold(s) {
  return stripMarks(s).toLowerCase().replace(/[^a-z0-9א-ת]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function partsOf(gloss) {
  return String(gloss ?? '').split(/[;,/]/).map(fold).filter(Boolean);
}

/**
 * Best band for one entry, or null when it does not match.
 * `translit` is the spelling already computed for the learner's tradition.
 * A query that folds to nothing (only punctuation) matches nothing.
 * @param {{gloss?:string,en?:string,lemma?:string,pointed?:string|null,he?:string,translit?:string}} entry
 * @param {string} query
 * @param {string} [translit]
 * @returns {number|null}
 */
export function matchBand(entry, query, translit = '') {
  const q = fold(query);
  if (!q) return null;
  const qHe = HEBREW_LETTERS.test(q);
  const qLat = /[a-z0-9]/.test(q);
  const glossSrc = entry.gloss ?? entry.en ?? '';
  const gloss = fold(glossSrc);
  const heb = fold(entry.pointed || entry.lemma || entry.he || '');
  const lemma = fold(entry.lemma || entry.he || '');
  const tl = fold(translit || entry.translit || '');
  let best = null;
  const keep = (band) => { if (best == null || band < best) best = band; };

  if (qLat) {
    const senses = partsOf(glossSrc);
    if (gloss === q) keep(BAND.gloss);
    if (senses[0] === q) keep(BAND.firstSense);
    else if (senses.some((p) => p === q)) keep(BAND.sense);
    if (!q.includes(' ')) {
      const tokens = gloss.split(' ').filter(Boolean);
      if (tokens.includes(q)) keep(BAND.sense);
      if (q.length >= 3 && tokens.some((w) => w.startsWith(q))) keep(BAND.prefix);
    } else if (senses.some((p) => p.startsWith(q + ' ') || p.startsWith(q))) {
      // "to be" is the start of the sense "to be late", which is related, not exact.
      if (!senses.includes(q)) keep(BAND.prefix);
    }
    if (tl && (tl === q || (!q.includes(' ') && tl.split(' ').includes(q)))) keep(BAND.translit);
    if (tl && q.length >= 3 && (tl.startsWith(q) || tl.split(' ').some((w) => w.startsWith(q)))) keep(BAND.prefix);
    if (q.length >= 2 && gloss.includes(q)) keep(BAND.substring);
    if (tl && q.length >= 3 && tl.includes(q)) keep(BAND.substring);
  }
  if (qHe) {
    if (heb === q || lemma === q) keep(BAND.hebrew);
    if (q.length >= 2 && (heb.startsWith(q) || lemma.startsWith(q))) keep(BAND.prefix);
    if (q.length >= 2 && (heb.includes(q) || lemma.includes(q))) keep(BAND.substring);
  }
  return best;
}

/** @param {Array<{rank?:number,id?:string}>} entries @param {string} query @param {(e:any)=>string} [translitOf] */
export function rankEntries(entries, query, translitOf) {
  const raw = String(query ?? '');
  const folded = fold(raw);
  if (!raw.trim()) return entries.map((entry) => ({ entry, band: null }));
  if (!folded) return [];
  const out = [];
  for (const entry of entries) {
    const band = matchBand(entry, raw, translitOf ? translitOf(entry) : (entry.translit || ''));
    if (band == null) continue;
    out.push({ entry, band });
  }
  out.sort((a, b) => a.band - b.band
    || ((a.entry.rank ?? 1e9) - (b.entry.rank ?? 1e9))
    || String(a.entry.id ?? '').localeCompare(String(b.entry.id ?? '')));
  return out;
}

export const isExactBand = (band) => band != null && band >= BAND.gloss && band <= EXACT_MAX;

/** True when prefix and substring hits are noise unless the learner asks for them. */
export function isShortQuery(query) {
  const q = fold(query);
  if (!q) return false;
  return HEBREW_LETTERS.test(q) ? [...q].length < SHORT_HEBREW : q.length < SHORT_LATIN;
}

export function keepBand(band, query, broad) {
  if (band == null || band <= EXACT_MAX) return true;
  if (broad) return true;
  return !isShortQuery(query);
}
