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
/** The Dictionary's word packs (the same four tier files the Dictionary page loads), hidden records left out as the page does. */
export const DICT_TIERS = Object.freeze([500, 1000, 2000, 5000]);
const isHiddenRec = (r) => { const f = r && r.flags; return Array.isArray(f) ? f.includes('hidden') : !!(f && typeof f === 'object' && f.hidden === true); };
export function readDictionary() {
  return DICT_TIERS.flatMap((t) => JSON.parse(readFileSync(root + `data/vocab/packs/vocab5k-tier-${t}.json`, 'utf8')).entries).filter((e) => !isHiddenRec(e));
}
export const DICT_LINK_RULE = 'A Dictionary entry is linked to a word-list row only when its pointed spelling and part of speech are exactly the same as one word-list row (or as several rows that all list the same letters). Unpointed look-alikes are never linked: they are often different words.';
/**
 * data/roots/dict-links.json (lane 3, 12 Nov, points plan #15): for each Dictionary entry that matches a word-list row exactly,
 * the family letters that row lists, the size of that letter family (0 when no other row shares them), and the explorer verb id
 * when the verb's forms can be opened on the Roots page. Nothing is guessed: a letter set is copied from the word list.
 * rows: [dictionaryId, letters|null, familySize, verbId|null]
 */
export function dictLinks(words, dict, built = build(words)) {
  const ok = words.filter((w) => w.kind === 'word' && !(w.flags && w.flags.hidden));
  const famSize = new Map(built.families.families.map((f) => [f.root, f.size]));
  const verbIds = new Set(built.verbs.verbs.map((v) => v.id));
  const byKey = new Map();
  for (const w of ok) { const k = w.he + '\u0000' + w.pos; if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(w); }
  const rows = [];
  let ambiguous = 0;
  for (const e of dict) {
    if (!e.pointed) continue;
    const m = byKey.get(e.pointed + '\u0000' + e.pos);
    if (!m) continue;
    const roots = new Set(m.map((w) => w.root || null));
    const verbs = m.filter((w) => verbIds.has(w.id));
    const letters = roots.size === 1 ? [...roots][0] : null;
    if (roots.size > 1) ambiguous++;
    const verb = verbs.length === 1 ? verbs[0].id : null;
    if (!letters && !verb) continue;
    rows.push([e.id, letters, letters ? famSize.get(letters) || 0 : 0, verb]);
  }
  rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const withLetters = rows.filter((r) => r[1]);
  return { schema: 1, source: ['data/vocab/words.json', 'data/vocab/packs/vocab5k-tier-*.json'], rule: DICT_LINK_RULE,
    note: 'Family letters are copied from the word list (its dictionary source). No root here is confirmed by a Hebrew reader (data/roots/verified.json), so the app says the words share letters, not a root.',
    counts: { dictionary: dict.length, withLetters: withLetters.length, inFamily: withLetters.filter((r) => r[2] >= 2).length, alone: withLetters.filter((r) => r[2] < 2).length, verbs: rows.filter((r) => r[3]).length, ambiguous },
    rows };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const words = JSON.parse(readFileSync(root + 'data/vocab/words.json', 'utf8')).words;
  const b = build(words);
  const files = { 'data/roots/families.json': b.families, 'data/roots/verbs.json': b.verbs, 'data/roots/dict-links.json': dictLinks(words, readDictionary(), b) };
  for (const k of b.skipped) console.log('skipped (conflicting marks):', k.id, k.field, k.value, k.used ? '-> ' + k.used : '(left out)');
  let stale = false;
  for (const [p, v] of Object.entries(files)) {
    const text = JSON.stringify(v) + '\n';
    if (process.argv.includes('--check')) { let cur = ''; try { cur = readFileSync(root + p, 'utf8'); } catch {} if (cur !== text) { console.error(p + ' is stale'); stale = true; } }
    else { writeFileSync(root + p, text); console.log('wrote', p, text.length, 'bytes'); }
  }
  if (stale) process.exit(1);
}
