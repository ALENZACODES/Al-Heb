// Roots and verb patterns (binyanim): pure logic over data/roots/*.json (built from data/vocab/words.json by tools/roots/build.mjs).
// A family is exactly the rows that share a `root` string in the vocabulary data. Verb tables show only the forms present in the data.
// Nothing is conjugated, guessed or invented here; where the data has no form, the table says so.
import { rng, shuffled } from '../curriculum/spotit.js';

export const STORE_KEY = 'roots.v1';
/** English display names for the binyan labels used in the data. Descriptions are the usual textbook summaries: needs native review. */
export const BINYAN = Object.freeze({
  "pa'al": { name: "Pa'al", gist: 'the basic active pattern' },
  "nif'al": { name: "Nif'al", gist: 'often passive or reflexive' },
  "pi'el": { name: "Pi'el", gist: 'often intensive or causative' },
  "pu'al": { name: "Pu'al", gist: 'the passive of Pi\'el' },
  "hif'il": { name: "Hif'il", gist: 'often causative' },
  "huf'al": { name: "Huf'al", gist: 'the passive of Hif\'il' },
  "hitpa'el": { name: "Hitpa'el", gist: 'often reflexive' },
  "hitpu'al": { name: "Hitpu'al", gist: 'rare' },
});
export const binyanName = (b) => (BINYAN[b] ? BINYAN[b].name : b ? String(b) : 'not listed');
export const COMMON_BINYANIM = ["pa'al", "nif'al", "pi'el", "hif'il", "hitpa'el"];

// lane 3 (12 Nov, #5 sweep): the dictionary form IS the past "he did" form (as the verb games say), so the note no longer says the data has no past tense.
const PAST_NOTE = 'The dictionary form is the past "he did" form. The data has no other past forms, so none is shown rather than guessed.';
/** Row order of the verb table: the forms the word list holds for a verb, and nothing else. */
export const FORM_KEYS = Object.freeze(['dictionary', 'infinitive', 'present', 'future']);
export const FORM_LABELS = { dictionary: 'Dictionary form (he did)', infinitive: 'Infinitive (to …)', present: 'Present (the form listed in the data)', future: 'Future (the form listed in the data)' };

const stripRoot = (r) => String(r || '').replace(/[־־\s]/g, '').replace(/[֑-ׇ]/g, '');

/** Verb table: rows for the forms the data has, plus honest notes about what is missing. verb = row from verbs.json. */
export function verbTable(verb) {
  const forms = { ...((verb && verb.forms) || {}), dictionary: verb?.he || null };
  const rows = FORM_KEYS.filter((k) => typeof forms[k] === 'string' && forms[k]).map((k) => ({ key: k, label: FORM_LABELS[k], he: forms[k] }));
  const missing = FORM_KEYS.filter((k) => !forms[k]);
  return { id: verb?.id, he: verb?.he, translit: verb?.translit, en: verb?.en, binyan: verb?.binyan || null, root: verb?.root || null, rows, missing,
    notes: [PAST_NOTE, 'Only one form per tense is in the data: other persons, genders and plurals are not listed, and the app does not make them up.'], needsReview: !!verb?.needsReview };
}

/** Binyan order on the family page: the seven taught patterns, then any other label the data has, then verbs with none. */
export const BINYAN_ORDER = Object.freeze(["pa'al", "nif'al", "pi'el", "pu'al", "hif'il", "huf'al", "hitpa'el", "hitpu'al"]);
const binyanRank = (b) => { const i = BINYAN_ORDER.indexOf(b); return i >= 0 ? i : b ? 50 : 99; };
/** Group a family's rows by part of speech, verbs first; the verbs are grouped again by binyan (byBinyan), in the taught order. */
export function groupFamily(fam) {
  const order = ['verb', 'noun', 'adj', 'adv', 'prep', 'num'];
  const g = new Map();
  for (const w of fam.words) { if (!g.has(w.pos)) g.set(w.pos, []); g.get(w.pos).push(w); }
  return [...g].sort((a, b) => (order.indexOf(a[0]) + 99 * (order.indexOf(a[0]) < 0)) - (order.indexOf(b[0]) + 99 * (order.indexOf(b[0]) < 0))).map(([pos, words]) => {
    if (pos !== 'verb') return { pos, words };
    const by = new Map();
    for (const w of words) { const k = w.binyan || null; if (!by.has(k)) by.set(k, []); by.get(k).push(w); }
    return { pos, words, byBinyan: [...by].sort((a, b) => binyanRank(a[0]) - binyanRank(b[0])).map(([binyan, ws]) => ({ binyan, words: ws })) };
  });
}

/** Find families by root letters (with or without maqaf) or by an English/transliteration substring in any member. Empty query = first `limit`. */
export function searchFamilies(families, q, limit = 30) {
  const s = String(q || '').trim().toLowerCase();
  if (!s) return families.slice(0, limit);
  const letters = stripRoot(s);
  const heQ = /[א-ת]/.test(s);
  return families.filter((f) => (heQ ? stripRoot(f.root).includes(letters) : f.words.some((w) => w.en.toLowerCase().includes(s) || w.translit.toLowerCase().includes(s)))).slice(0, limit);
}

/**
 * Why data/roots/verbs.json is smaller than the word-list verb count in families.json `coverage`.
 * The build (tools/roots/build.mjs) keeps a verb only when it has a binyan, at least one form, and
 * either modernRank <= 5000 or a place in a root family of two or more words (any part of speech).
 */
export const EXPLORER_VERB_RULE = 'A verb can be opened on this page only when it has a pattern (binyan), at least one listed form, and either a frequency rank of 5000 or better or a place in a group of two or more words that share family letters (any part of speech). Verbs that fail that rule still count in the word-list total.';

const n0 = (x) => (Number(x) || 0).toLocaleString('en-US');
/**
 * On-screen coverage, with ONE denominator (lane 3, 12 Nov, points plan #5: the page showed 1,820, 1,655 and 1,817 as if each were
 * "the verbs"). The word-list verb total is the only total; every other verb figure is stated as a part of it. Groups of words are
 * a different unit and are named as groups. The page says "family letters", never "root", while no root is confirmed.
 * @param {any} c families.json coverage, or counts.js rootsCoverage() (which also carries the explorer totals)
 * @param {any[]|{verbs?: any[]}|null} [browsable] verb rows the page can open (only when c has no explorer totals)
 */
export function coverageText(c, browsable) {
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  const list = Array.isArray(browsable) ? browsable : (browsable && Array.isArray(browsable.verbs) ? browsable.verbs : null);
  const fromCounts = !list && Number.isFinite(c.explorer);
  const total = c.verbs;
  const parts = [`${n0(c.verbsWithBinyan)} have a verb pattern (binyan) listed`, `${n0(c.verbsWithRoot)} (${pct(c.verbsWithRoot, total)}%) have family letters listed`];
  let rest = '';
  if (list || fromCounts) {
    const shown = fromCounts ? c.explorer : list.length;
    const withRoot = fromCounts ? (c.explorerWithRoot || 0) : list.filter((v) => v && v.root).length;
    parts.push(`${n0(shown)} can be opened on this page (${n0(withRoot)} of those with family letters)`);
    const leftOut = total - shown;
    if (leftOut > 0) rest = ` The other ${n0(leftOut)} of the ${n0(total)} are not on this page. ${EXPLORER_VERB_RULE}`;
  }
  const confirmed = c.familiesVerified
    ? `A Hebrew reader has confirmed ${n0(c.familiesVerified)} groups as one root.`
    : 'A Hebrew reader has confirmed 0 groups, so this page says the words share letters and does not call any group one root.';
  return `The word list has ${n0(total)} verbs. Every verb figure here is out of those ${n0(total)}: ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}.${rest} Word groups: ${n0(c.familiesOf2Plus)} groups of two or more words share family letters, ${n0(c.familiesOf3Plus)} of them have three or more, and ${n0(c.familiesRuleChecked)} pass a stricter check made by rules. ${confirmed} Words without family letters are not grouped.`;
}

/** Prompt wording: a claim of "root" only for a verified family; otherwise a statement about the word list. */
export function relation(f, kind, a, b) {
  if (kind === 'root') return f.verified ? `Which word comes from the root ${f.root}?` : `Which word is listed under the letters ${f.root} in the word list?`;
  return f.verified ? `Same root as ${a.translit} (${a.en}), but in ${binyanName(b.binyan)}: which verb?` : `Listed under the same letters (${f.root}) as ${a.translit} (${a.en}), in ${binyanName(b.binyan)}: which verb?`;
}
/** Badge text for a family on screen. */
export const familyBadge = (f) => (f.verified ? 'Confirmed by a Hebrew reader as one root.' : f.ruleChecked ? 'Passes the word-list rule check. They share letters; a Hebrew reader has not yet confirmed them as one root.' : 'Loose: only the dictionary data links these words. They share letters, and may not share a root.');

/**
 * Drill questions, all graded against the data (objective, unlike speech): 
 *  root: "Which word comes from root R?"; binyan: "Which pattern is this verb?"; newbinyan: "Which verb has the same root as X but is in pattern Y?".
 * @returns {{id,type,prompt,options:{id,label,he?}[],answer:string,explain:string}[]}
 */
export function buildQuiz(allFamilies, verbs, { seed = 1, count = 8 } = {}) {
  // Drills use only rule-checked families, and only their rule-checked words. They say "comes from the root" only for a family a reader has verified.
  const families = allFamilies.filter((f) => f.ruleChecked).map((f) => ({ ...f, words: f.words.filter((w) => (f.checkedIds || []).includes(w.id)) })).map((f) => ({ ...f, size: f.words.length }));
  const rand = rng(seed), qs = [];
  const famOf = new Map(); for (const f of allFamilies) for (const w of f.words) famOf.set(w.id, f.root);
  const allRows = allFamilies.flatMap((f) => f.words);
  const opt = (w, i) => ({ id: 'o' + i, wordId: w.id, he: w.he, label: `${w.translit}: ${w.en}` });
  const verbFams = shuffled(families.filter((f) => new Set(f.words.filter((w) => w.pos === 'verb' && w.binyan).map((w) => w.binyan)).size >= 2), rand);
  const rootFams = shuffled(families.filter((f) => f.size >= 3), rand);
  const binVerbs = shuffled(verbs.filter((v) => v.binyan && BINYAN[v.binyan] && COMMON_BINYANIM.includes(v.binyan)), rand);
  let vi = 0, ri = 0, bi = 0;
  for (let n = 0; qs.length < count && n < count * 6; n++) {
    const kind = n % 3;
    if (kind === 0 && ri < rootFams.length) {
      const f = rootFams[ri++], right = shuffled(f.words, rand)[0];
      const decoys = shuffled(allRows.filter((w) => w.pos === right.pos && famOf.get(w.id) !== f.root), rand).slice(0, 3);
      if (decoys.length < 3) continue;
      const opts = shuffled([right, ...decoys], rand).map(opt);
      qs.push({ id: 'q' + (qs.length + 1), type: 'root', prompt: relation(f, 'root'), rootLetters: f.root, options: opts, answer: opts.find((o) => o.wordId === right.id).id, explain: `${right.he} (${right.translit}) is listed under the letters ${f.root} in the word list${f.verified ? '' : ' (not yet confirmed by a Hebrew reader)'}.` });
    } else if (kind === 1 && bi < binVerbs.length) {
      const v = binVerbs[bi++];
      const others = shuffled(COMMON_BINYANIM.filter((b) => b !== v.binyan), rand).slice(0, 3);
      const opts = shuffled([v.binyan, ...others], rand).map((b, i) => ({ id: 'o' + i, binyan: b, label: binyanName(b) }));
      qs.push({ id: 'q' + (qs.length + 1), type: 'binyan', prompt: `Which pattern is the verb ${v.translit} (${v.en}) in?`, verb: { he: v.he, translit: v.translit }, options: opts, answer: opts.find((o) => o.binyan === v.binyan).id, explain: `The data lists ${v.he} in ${binyanName(v.binyan)}.` });
    } else if (kind === 2 && vi < verbFams.length) {
      const f = verbFams[vi++];
      const vs = f.words.filter((w) => w.pos === 'verb' && w.binyan);
      const a = shuffled(vs, rand)[0], b = shuffled(vs.filter((w) => w.binyan !== a.binyan), rand)[0];
      const decoys = shuffled(verbs.filter((w) => w.binyan === b.binyan && w.root !== f.root && w.id !== b.id), rand).slice(0, 3);
      if (!b || decoys.length < 3) continue;
      const opts = shuffled([b, ...decoys], rand).map(opt);
      qs.push({ id: 'q' + (qs.length + 1), type: 'newbinyan', prompt: relation(f, 'verb', a, b), verb: { he: a.he, translit: a.translit }, options: opts, answer: opts.find((o) => o.wordId === b.id).id, explain: `${b.he} (${b.translit}) is listed under the same letters ${f.root} as ${a.he}, in ${binyanName(b.binyan)}${f.verified ? '' : '. Not yet confirmed by a Hebrew reader as one root'}.` });
    }
  }
  return qs;
}
export const gradeAnswer = (q, optionId) => ({ correct: optionId === q.answer, answer: q.answer });

export const emptyProgress = () => ({ v: 1, asked: 0, right: 0, round: 0 });
export function normalizeProgress(raw) {
  const p = emptyProgress(); if (!raw || typeof raw !== 'object') return p;
  const n = (x) => (Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);
  p.asked = n(raw.asked); p.right = Math.min(n(raw.right), p.asked); p.round = n(raw.round); return p;
}

/** Find verbs by English gloss, transliteration or Hebrew letters (pointed or not). Empty query = first `limit` (most frequent first). */
export function searchVerbs(verbs, q, limit = 20) {
  const s = String(q || '').trim().toLowerCase();
  if (!s) return verbs.slice(0, limit);
  const heQ = /[א-ת]/.test(s);
  const bare = s.replace(/[֑-ׇ]/g, '');
  return verbs.filter((v) => (heQ ? v.unpointed.includes(bare) : v.en.toLowerCase().includes(s) || v.translit.toLowerCase().includes(s))).slice(0, limit);
}
