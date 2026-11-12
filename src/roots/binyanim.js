// The seven verb patterns (binyanim) as a taught system (lane 3, 12 Nov, points plan #15b). Pure logic over data/roots/verbs.json and
// data/roots/families.json; no DOM. One page per pattern: its name, its usual meaning shift (the textbook summaries the Roots page
// already used, flagged for review), the pattern signs the verb games already teach, the letters counted over the forms the data
// holds, example verbs, and pairs of verbs listed under the same family letters in two patterns. Nothing is conjugated by rule:
// every Hebrew form shown is copied from the data. A drill shows one form from the data and asks which pattern it is.
import { rng, shuffled } from '../curriculum/spotit.js';
import { BINYAN, binyanName } from './model.js';

/** The seven patterns taught here, in the usual textbook order. (Hitpu'al, with 2 verbs in the data, is left out of the system.) */
export const SEVEN = Object.freeze(["pa'al", "nif'al", "pi'el", "pu'al", "hif'il", "huf'al", "hitpa'el"]);
/**
 * Pattern signs, word for word as the verb games (src/games/g3-core.js BINYANIM) already teach them, so the two never disagree
 * (tests/roots.binyanim.test.js checks this). Pu'al and Huf'al have no written sign in the app yet: their pages show only the
 * letters counted over the data's own forms, and say so.
 */
export const SIGNS = Object.freeze({
  "pa'al": 'the plainest shape: three letters, no added letter in front of the dictionary form',
  "nif'al": 'the dictionary form starts with נ',
  "pi'el": 'the present starts with מ and the future with י, both with a quick vowel',
  "hif'il": 'the dictionary form starts with ה, the present with מ, often with a י before the last letter',
  "hitpa'el": 'the dictionary form starts with הת, the present with מת (before ס, ש, צ or ז the ת moves in one letter)',
});
export const NO_SIGN = 'No pattern sign is written for this pattern yet. The letters below are counted from the forms the word list holds.';
export const REVIEW_NOTE = 'The meaning shifts and signs are the usual textbook summaries, and no Hebrew teacher has checked them here. Every Hebrew form on this page is copied from the word list; none is made by a rule.';

const FORM_ORDER = ['dictionary', 'present', 'future', 'infinitive'];
/** Short names for the forms, for sentences (the verb table keeps the longer FORM_LABELS). */
export const FORM_SHORT = Object.freeze({ dictionary: 'dictionary form (he did)', present: 'present', future: 'future', infinitive: 'infinitive (to …)' });
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const formOf = (v, k) => (k === 'dictionary' ? v.he : v.forms?.[k]) || null;
const bare = (s) => String(s || '').replace(/[֑-ׇ]/g, '').replace(/[^א-ת]/g, '');
const finalToBase = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const lead = (s, n) => [...bare(s)].slice(0, n).map((c) => finalToBase[c] || c).join('');

/** Most common one- and two-letter openings of each listed form in one pattern, counted over the data (not a rule). */
export function observe(verbs, key) {
  const vs = verbs.filter((v) => v.binyan === key);
  const out = [];
  for (const k of FORM_ORDER) {
    const forms = vs.map((v) => formOf(v, k)).filter(Boolean);
    if (!forms.length) continue;
    const top = (n) => { const c = new Map(); for (const f of forms) { const p = lead(f, n); if (p.length === n) c.set(p, (c.get(p) || 0) + 1); } return [...c].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0] || ['', 0]; };
    const [p2, c2] = top(2), [p1, c1] = top(1);
    const pick = c2 / forms.length >= 0.6 ? { letters: p2, count: c2 } : c1 / forms.length >= 0.6 ? { letters: p1, count: c1 } : null;
    out.push({ key: k, label: cap(FORM_SHORT[k]), total: forms.length, ...(pick || { letters: null, count: 0 }) });
  }
  return out;
}
/** One plain sentence per observation. */
export const MIN_OBSERVED = 5;
const fmt = (n) => (Number(n) || 0).toLocaleString('en-US');
export const observationText = (o) => (o.total < MIN_OBSERVED
  ? `${o.label}: only ${o.total} listed, too few to count.`
  : o.letters
    ? `${o.label}: ${fmt(o.count)} of the ${fmt(o.total)} listed forms start with ${[...o.letters].join(' ')}.`
    : `${o.label}: no single opening letter covers most of the ${fmt(o.total)} listed forms.`);

/** Example verbs in one pattern: most frequent first, rows a reviewer has not flagged first. */
export function examples(verbs, key, n = 8) {
  const vs = verbs.filter((v) => v.binyan === key);
  return [...vs.filter((v) => !v.needsReview), ...vs.filter((v) => v.needsReview)].slice(0, n);
}

/**
 * Meaning shift shown by the data: verbs in this pattern next to a verb listed under the same family letters in another pattern.
 * Rule-checked groups and their checked words first. [{ letters, here, other, checked }]
 */
export function pairs(families, key, n = 6) {
  const out = [];
  const fams = [...families.filter((f) => f.ruleChecked), ...families.filter((f) => !f.ruleChecked)];
  for (const f of fams) {
    if (out.length >= n) break;
    const ok = (w) => w.pos === 'verb' && w.binyan && (!f.ruleChecked || (f.checkedIds || []).includes(w.id));
    const here = f.words.find((w) => ok(w) && w.binyan === key);
    const other = here && f.words.find((w) => ok(w) && w.binyan !== key && SEVEN.includes(w.binyan));
    if (here && other) out.push({ letters: f.root, here, other, checked: !!f.ruleChecked, verified: !!f.verified });
  }
  return out;
}

/** Everything one pattern page shows. counts = rootsCoverage().byBinyan[key] (src/lib/counts.js), total = rootsCoverage().verbs. */
export function binyanPage(key, verbs, families, counts, total) {
  return { key, name: binyanName(key), gist: BINYAN[key]?.gist || '', sign: SIGNS[key] || null, observations: observe(verbs, key),
    examples: examples(verbs, key), pairs: pairs(families, key),
    countLine: counts ? `The word list has ${fmt(counts.verbs)} of its ${fmt(total)} verbs in ${binyanName(key)}; ${fmt(counts.explorer)} of those ${fmt(counts.verbs)} can be opened on this page.` : '' };
}

/**
 * Drill: one form from the data, pick its pattern (one of the seven). A form spelled the same in two patterns anywhere in the data
 * is never asked. @returns {{id,he,formKey,formLabel,verb,options:{id,binyan,label}[],answer,explain}[]}
 */
export function binyanDrill(verbs, { seed = 1, count = 8 } = {}) {
  const rand = rng(seed);
  const seen = new Map();
  for (const v of verbs) for (const k of FORM_ORDER) { const f = formOf(v, k); if (f) { if (!seen.has(f)) seen.set(f, new Set()); seen.get(f).add(v.binyan); } }
  const pool = shuffled(verbs.filter((v) => SEVEN.includes(v.binyan) && !v.needsReview), rand);
  // spread the questions over the patterns: walk them in turn
  const byB = new Map(SEVEN.map((b) => [b, pool.filter((v) => v.binyan === b)]));
  const qs = [], used = new Set();
  for (let round = 0; qs.length < count && round < 40; round++) {
    for (const b of shuffled(SEVEN, rand)) {
      if (qs.length >= count) break;
      const v = byB.get(b).shift();
      if (!v) continue;
      const keys = shuffled(FORM_ORDER.filter((k) => formOf(v, k)), rand);
      const k = keys.find((x) => seen.get(formOf(v, x)).size === 1 && !used.has(formOf(v, x)));
      if (!k) continue;
      const he = formOf(v, k); used.add(he);
      const opts = shuffled([b, ...shuffled(SEVEN.filter((x) => x !== b), rand).slice(0, 3)], rand).map((x, i) => ({ id: 'o' + i, binyan: x, label: binyanName(x) }));
      qs.push({ id: 'b' + (qs.length + 1), he, formKey: k, formLabel: FORM_SHORT[k], verb: { id: v.id, he: v.he, translit: v.translit, en: v.en }, options: opts,
        answer: opts.find((o) => o.binyan === b).id, explain: `The word list gives ${he} as the ${FORM_SHORT[k]} of ${v.he} (${v.translit}: ${v.en}), in ${binyanName(b)}.` });
    }
  }
  return qs;
}
