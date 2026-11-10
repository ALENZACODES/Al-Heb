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

const PAST_NOTE = 'The vocabulary data has no past tense. It is not shown rather than guessed.';
export const FORM_LABELS = { infinitive: 'Infinitive', present: 'Present (the form listed in the data)', future: 'Future (the form listed in the data)' };

const stripRoot = (r) => String(r || '').replace(/[־־\s]/g, '').replace(/[֑-ׇ]/g, '');

/** Verb table: rows for the forms the data has, plus honest notes about what is missing. verb = row from verbs.json. */
export function verbTable(verb) {
  const forms = (verb && verb.forms) || {};
  const rows = ['infinitive', 'present', 'future'].filter((k) => typeof forms[k] === 'string' && forms[k]).map((k) => ({ key: k, label: FORM_LABELS[k], he: forms[k] }));
  const missing = ['infinitive', 'present', 'future'].filter((k) => !forms[k]);
  return { id: verb?.id, he: verb?.he, translit: verb?.translit, en: verb?.en, binyan: verb?.binyan || null, root: verb?.root || null, rows, missing,
    notes: [PAST_NOTE, 'Only one form per tense is in the data: other persons, genders and plurals are not listed.'], needsReview: !!verb?.needsReview };
}

/** Group a family's rows by part of speech, verbs first. */
export function groupFamily(fam) {
  const order = ['verb', 'noun', 'adj', 'adv', 'prep', 'num'];
  const g = new Map();
  for (const w of fam.words) { if (!g.has(w.pos)) g.set(w.pos, []); g.get(w.pos).push(w); }
  return [...g].sort((a, b) => (order.indexOf(a[0]) + 99 * (order.indexOf(a[0]) < 0)) - (order.indexOf(b[0]) + 99 * (order.indexOf(b[0]) < 0))).map(([pos, words]) => ({ pos, words }));
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
export const EXPLORER_VERB_RULE = 'A verb is listed in the explorer only when it has a pattern (binyan), at least one listed form, and either a frequency rank of 5000 or better or a place in a root family of two or more words (any part of speech). Verbs that fail that rule stay in the word-list totals and are not browsable in the explorer.';

/**
 * On-screen coverage. The word-list totals stay labelled as the word list. When the browsable verb
 * rows are passed (the verbs.json list the explorer actually opens), their count is stated separately.
 * @param {any} c families.json coverage
 * @param {any[]|{verbs?: any[]}|null} [browsable] verb rows the page can open
 */
export function coverageText(c, browsable) {
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  const list = Array.isArray(browsable) ? browsable : (browsable && Array.isArray(browsable.verbs) ? browsable.verbs : null);
  const wordList = `Roots are listed for ${c.verbsWithRoot} of ${c.verbs} verbs in the word list (${pct(c.verbsWithRoot, c.verbs)}%).`;
  let explorer = '';
  if (list) {
    const shown = list.length;
    const withRoot = list.filter((v) => v && v.root).length;
    const leftOut = Number.isFinite(c.verbs) ? c.verbs - shown : null;
    explorer = leftOut > 0
      ? ` This explorer shows ${withRoot} of ${shown} verbs you can open here (${leftOut} word-list verbs are not in this explorer).`
      : ` This explorer shows the same ${shown} verbs (${withRoot} with a root listed).`;
  }
  return `${wordList}${explorer} ${EXPLORER_VERB_RULE} A verb pattern is listed for ${c.verbsWithBinyan} verbs in the word list. ${c.familiesOf2Plus} groups of two or more words share root letters, and ${c.familiesOf3Plus} groups have three or more. ${c.familiesRuleChecked} groups pass a stricter check made by rules. A Hebrew reader has confirmed ${c.familiesVerified} groups. Verbs without a root are not grouped.`;
}

/** Prompt wording: a claim of "root" only for a verified family; otherwise a statement about the word list. */
export function relation(f, kind, a, b) {
  if (kind === 'root') return f.verified ? `Which word comes from the root ${f.root}?` : `Which word is listed under the letters ${f.root} in the word list?`;
  return f.verified ? `Same root as ${a.translit} (${a.en}), but in ${binyanName(b.binyan)}: which verb?` : `Listed under the same letters (${f.root}) as ${a.translit} (${a.en}), in ${binyanName(b.binyan)}: which verb?`;
}
/** Badge text for a family on screen. */
export const familyBadge = (f) => (f.verified ? 'Confirmed by a Hebrew reader as one root.' : f.ruleChecked ? 'Passes the word-list rule check. Not yet confirmed by a Hebrew reader.' : 'Loose: only the dictionary data links these words. They share letters, and may not share a root.');

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
