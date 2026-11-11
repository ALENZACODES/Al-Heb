// @ts-check
// Talk: a typed or heard line cut into its sentences. No DOM, no storage.
//
// The language pack was made from single sentences. Given two in one line it runs them together or leaves one out
// (back test, 53 two-sentence lines: one sentence was dropped in 24). So src/talk/hybrid.js hands the pack one sentence at a
// time. A cut is made only where it is safe: after ".", "!", "?" or "…" when the next part starts like a sentence (a capital,
// a Hebrew letter, a digit or an opening quote). A line that is not cut is translated whole, exactly as before.

/** Short forms that end in a full stop without ending a sentence. */
const SHORT_FORMS = new Set(['mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'mt', 'jr', 'sr', 'vs', 'etc']);
const STARTS_A_SENTENCE = /^["'“‘(\[¿¡]*[\p{Lu}\p{Lo}\p{N}]/u;

/**
 * @param {string} text
 * @returns {string[]} the sentences in order, each with its closing mark; one item when the line is a single sentence
 */
export function sentences(text) {
  const t = String(text || '').trim();
  /** @type {string[]} */ const out = [];
  let start = 0;
  const re = /([.!?…]+)["'”’)\]]*\s+/gu;
  let m;
  while ((m = re.exec(t))) {
    const end = m.index + m[0].length;
    const next = t.slice(end);
    if (!next) break;
    if (!STARTS_A_SENTENCE.test(next)) continue;
    if (m[1] === '.') {
      const before = t.slice(start, m.index);
      if (/^\s*\d+\s*$/.test(before)) continue;                                   // "1. Bread": a list number
      const word = (/(\S+)$/u.exec(before) || ['', ''])[1].replace(/^["'“‘(\[]+/u, '');
      const low = word.toLowerCase();
      if (SHORT_FORMS.has(low)) continue;                                         // "Dr. Cohen"
      if (low === 'no' && /^\d/.test(next)) continue;                             // "No. 5"
      if (/^\p{L}$/u.test(word)) continue;                                        // an initial: "J. Smith", "א. כהן"
      if (/^(?:\p{L}\.)+\p{L}$/u.test(word)) continue;                            // "U.S. Army", "5 p.m. Sunday", "ת.ד. 12"
    }
    out.push(t.slice(start, end).trim());
    start = end;
  }
  const last = t.slice(start).trim();
  if (last) out.push(last);
  return out;
}
