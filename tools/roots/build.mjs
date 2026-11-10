// Builds data/roots/families.json and data/roots/verbs.json from data/vocab/words.json. Deterministic. Nothing is generated or guessed:
// a root family is exactly the set of vocabulary rows whose `root` field is the same string (2 or more rows). Verb tables hold only the
// `forms` the vocabulary file already has (present, future, infinitive); there is no past tense in that data and none is added here.
// Usage: node tools/roots/build.mjs [--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lintString } from '../hebrew-lint/lint.mjs';
import { rootFamilies } from '../../src/grammar/model.js'; // the stricter existing filter (letters appear in the word, gloss quality, de-duplication, 3+ words)
import { EXPLORER_VERB_RULE } from '../../src/roots/model.js';

/** True when a word-list verb is copied into data/roots/verbs.json. `inFamily` means its id is in a root family of two or more words. */
export function inExplorer(w, inFamily) {
  return !!(w && w.binyan && w.forms && (w.modernRank <= 5000 || inFamily));
}

const root = fileURLToPath(new URL('../../', import.meta.url));
// Source pointing is copied as is, EXCEPT a string with two vowels (or other conflicting marks) on one letter, which the Hebrew lint (#722) rejects.
// Such a string is never repaired or guessed: a bad form is left out, a bad headword falls back to the unpointed spelling the vocabulary file already has.
// Every skip is listed in `skipped` (and printed by the CLI) so the source row can go to a reader.
export const badMarks = (s) => typeof s === 'string' && lintString(s).some((f) => f.rule === 'conflicting-marks');
const row = (w, skipped = []) => {
  let he = w.he, forms = w.forms;
  if (badMarks(he)) { skipped.push({ id: w.id, field: 'he', value: he, used: w.heUnpointed }); he = w.heUnpointed; }
  if (forms) {
    const kept = {};
    for (const [k, v] of Object.entries(forms)) { if (badMarks(v)) skipped.push({ id: w.id, field: 'forms.' + k, value: v, used: null }); else kept[k] = v; }
    forms = Object.keys(kept).length ? kept : null;
  }
  return { id: w.id, he, unpointed: w.heUnpointed, translit: w.translit, en: w.en, pos: w.pos, binyan: w.binyan || null, level: w.level, rank: Number.isFinite(w.modernRank) ? w.modernRank : null, needsReview: !!(w.flags && w.flags.needsReview), ...(forms ? { forms } : {}) };
};
const byRank = (a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || (a.id < b.id ? -1 : 1);

export function build(words) {
  const skipped = [];
  // ruleChecked: the family (or word) also passes the grammar lane's rootFamilies(). verified: a native reader confirmed it (data/roots/verified.json, empty until then).
  const checked = new Map(rootFamilies(words).map((f) => [f.root, new Set(f.words.map((w) => w.id))]));
  const verified = new Set(JSON.parse(readFileSync(root + 'data/roots/verified.json', 'utf8')).roots);
  const ok = words.filter((w) => w.kind === 'word' && !(w.flags && w.flags.hidden));
  const groups = new Map();
  for (const w of ok) if (w.root) { if (!groups.has(w.root)) groups.set(w.root, []); groups.get(w.root).push(row(w, skipped)); }
  const families = [...groups].filter(([, v]) => v.length >= 2).map(([r, v]) => ({ root: r, size: v.length, ruleChecked: checked.has(r), verified: verified.has(r), checkedIds: checked.has(r) ? v.filter((x) => checked.get(r).has(x.id)).map((x) => x.id) : [], words: v.sort(byRank) })).sort((a, b) => b.size - a.size || (a.root < b.root ? -1 : 1));
  const verbsAll = ok.filter((w) => w.pos === 'verb');
  const inFam = new Set(families.flatMap((f) => f.words.map((x) => x.id)));
  const verbs = verbsAll.filter((w) => inExplorer(w, inFam.has(w.id))).map((w) => ({ ...row(w, skipped), root: w.root || null })).sort(byRank);
  const binyanCount = {};
  for (const w of verbsAll) if (w.binyan) binyanCount[w.binyan] = (binyanCount[w.binyan] || 0) + 1;
  const coverage = { verbs: verbsAll.length, verbsWithRoot: verbsAll.filter((w) => w.root).length, verbsWithBinyan: verbsAll.filter((w) => w.binyan).length, verbsWithForms: verbsAll.filter((w) => w.forms).length,
    rootsAll: groups.size, familiesOf2Plus: families.length, familiesOf3Plus: families.filter((f) => f.size >= 3).length, familiesRuleChecked: families.filter((f) => f.ruleChecked).length, familiesVerified: families.filter((f) => f.verified).length, binyanCount };
  const note = 'Copied from data/vocab/words.json (roots and binyan labels come from its dictionary source, not checked by a Hebrew teacher; some links are loose). Unreviewed. ' + EXPLORER_VERB_RULE;
  return { skipped, families: { schema: 1, source: 'data/vocab/words.json', note, coverage, families }, verbs: { schema: 1, source: 'data/vocab/words.json', note, formKeys: ['present', 'future', 'infinitive'], count: verbs.length, verbs } };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const b = build(JSON.parse(readFileSync(root + 'data/vocab/words.json', 'utf8')).words);
  const files = { 'data/roots/families.json': b.families, 'data/roots/verbs.json': b.verbs };
  for (const k of b.skipped) console.log('skipped (conflicting marks):', k.id, k.field, k.value, k.used ? '-> ' + k.used : '(left out)');
  let stale = false;
  for (const [p, v] of Object.entries(files)) {
    const text = JSON.stringify(v) + '\n';
    if (process.argv.includes('--check')) { let cur = ''; try { cur = readFileSync(root + p, 'utf8'); } catch {} if (cur !== text) { console.error(p + ' is stale'); stale = true; } }
    else { writeFileSync(root + p, text); console.log('wrote', p, text.length, 'bytes'); }
  }
  if (stale) process.exit(1);
}
