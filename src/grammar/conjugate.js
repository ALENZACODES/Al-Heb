// @ts-check
// Conjugation tables built by rule (idea O1) and the "what is this verb?" lookup (O10). Pure: no DOM, no network.
//
// The word list holds four forms of a verb: the dictionary form (he did), the present, the future (he will) and the infinitive.
// For a REGULAR verb of four patterns (pa'al, pi'el, hif'il, hitpa'el) every other form follows from those by the textbook
// rules, and this file writes them out. It is deliberately narrow:
//   - Only verbs whose three root letters are all "strong" are handled. A guttural (א ה ח ע), a first letter י or נ, a middle
//     ו or י, a last letter ה א נ or ת, a doubled letter, and a few pattern-specific cases are left alone: their forms bend in
//     ways these rules do not cover.
//   - Before a table is given, the rules must rebuild every form the word list already holds for that verb, mark for mark.
//     If one differs, no table is given. So a verb that only looks regular is not guessed at.
// The result is still rule-made Hebrew that no teacher has read. The screen says so (TABLE_NOTE).

const SHVA = 'ְ', HIRIQ = 'ִ', TSERE = 'ֵ', SEGOL = 'ֶ', PATAH = 'ַ', QAMATS = 'ָ', HOLAM = 'ֹ', QUBUTS = 'ֻ';
const HATAF_PATAH = 'ֲ';
const DAGESH = 'ּ', SHIN_DOT = 'ׁ', SIN_DOT = 'ׂ';
const VOWELS = new Set([SHVA, 'ֱ', HATAF_PATAH, 'ֳ', HIRIQ, TSERE, SEGOL, PATAH, QAMATS, HOLAM, 'ֺ', QUBUTS, 'ׇ']);
const BEGADKEFAT = 'בגדכפת';
const GUTTURAL = 'אהחע';
const FINAL = { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' };
const MEDIAL = Object.fromEntries(Object.entries(FINAL).map(([m, f]) => [f, m]));

export const PATTERNS = Object.freeze(["pa'al", "pi'el", "hif'il", "hitpa'el"]);
export const TABLE_NOTE = 'These forms were built by rule from the forms in the word list. They follow the regular pattern, and no Hebrew teacher has checked them yet.';
export const NO_TABLE = Object.freeze({
  pattern: 'Aleph builds full tables only for regular verbs of four patterns so far (pa\'al, pi\'el, hif\'il, hitpa\'el). This verb has another pattern.',
  weak: 'One of this verb\'s root letters bends the regular pattern, so Aleph does not build its full table yet. The forms in the word list are shown above.',
  shape: 'This verb does not have the regular shape of its pattern, so Aleph does not build its full table yet. The forms in the word list are shown above.',
  mismatch: 'The regular rules do not give the forms the word list holds for this verb, so Aleph does not guess the rest.',
});

export const PERSONS = Object.freeze({
  '1s': { en: 'I', he: 'אֲנִי' }, '2ms': { en: 'you (to a man)', he: 'אַתָּה' }, '2fs': { en: 'you (to a woman)', he: 'אַתְּ' },
  '3ms': { en: 'he', he: 'הוּא' }, '3fs': { en: 'she', he: 'הִיא' }, '1p': { en: 'we', he: 'אֲנַחְנוּ' },
  '2mp': { en: 'you (to men, or a mixed group)', he: 'אַתֶּם' }, '2fp': { en: 'you (to women)', he: 'אַתֶּן' }, '3p': { en: 'they', he: 'הֵם / הֵן' },
  '2p': { en: 'you (to more than one)', he: 'אַתֶּם / אַתֶּן' },
  ms: { en: 'one man', he: 'יָחִיד' }, fs: { en: 'one woman', he: 'יְחִידָה' }, mp: { en: 'men, or a mixed group', he: 'רַבִּים' }, fp: { en: 'women', he: 'רַבּוֹת' },
  p: { en: 'more than one', he: 'רַבִּים' },
});
export const TENSES = Object.freeze([
  { key: 'past', title: 'Past', order: ['1s', '2ms', '2fs', '3ms', '3fs', '1p', '2mp', '2fp', '3p'] },
  { key: 'present', title: 'Present', order: ['ms', 'fs', 'mp', 'fp'] },
  { key: 'future', title: 'Future', order: ['1s', '2ms', '2fs', '3ms', '3fs', '1p', '2p', '3p'] },
  { key: 'command', title: 'Command', order: ['ms', 'fs', 'p'] },
]);
export const FUTURE_PLURAL_NOTE = 'Everyday Hebrew uses one future form for "you" (more than one) and one for "they", for men and women alike. That is the form shown.';

/** @typedef {{l:string, dot:string, dag:boolean, v:string}} Cluster letter (medial form), shin or sin dot, dagesh, vowel */

/** A pointed word as letters with their marks. Final letters are turned into their ordinary form. @param {string} word @returns {Cluster[]} */
export function clustersOf(word) {
  /** @type {Cluster[]} */ const out = [];
  for (const ch of String(word ?? '').normalize('NFC')) {
    if (ch >= 'א' && ch <= 'ת') { out.push({ l: MEDIAL[ch] || ch, dot: '', dag: false, v: '' }); continue; }
    const c = out[out.length - 1];
    if (!c) continue;
    if (ch === DAGESH) c.dag = true;
    else if (ch === SHIN_DOT || ch === SIN_DOT) c.dot = ch;
    else if (VOWELS.has(ch)) c.v += ch;
  }
  return out;
}

/** Letters with marks back to a word: mark order is dot, dagesh, vowel; the last letter takes its final form (and a final khaf its shva). */
function spell(cs) {
  return cs.map((c, i) => {
    const last = i === cs.length - 1;
    const letter = last && FINAL[c.l] ? FINAL[c.l] : c.l;
    const v = last && c.l === 'כ' && !c.v ? SHVA : c.v;
    return letter + c.dot + (c.dag ? DAGESH : '') + v;
  }).join('');
}

/** One comparison form of a pointed word: every letter with its marks in one order, a final khaf's shva not counted. */
export const canon = (w) => spell(clustersOf(w));
/** The bare letters of a word (no marks), with final letters in their ordinary form. */
export const bare = (w) => clustersOf(w).map((c) => c.l).join('');

// ---- building forms
/** A root letter in a form. d: 'f' = dagesh always, 'l' = dagesh when the letter is one of בגדכפת, '' = none. */
const R = (r, v = '', d = '') => ({ l: r.l, dot: r.dot, dag: d === 'f' || (d === 'l' && BEGADKEFAT.includes(r.l)), v });
/** A fixed letter. */
const X = (l, v = '', dag = false) => ({ l, dot: '', dag, v });
const T = (v) => X('ת', v, true); // the suffix tav always carries a dagesh after a closed syllable

/** The six endings that follow a stem ending in a closed syllable (stem ends with the last root letter + shva). */
const closedPast = (stem) => ({
  '1s': spell([...stem, T(HIRIQ), X('י')]), '2ms': spell([...stem, T(QAMATS)]), '2fs': spell([...stem, T(SHVA)]),
  '1p': spell([...stem, X('נ'), X('ו', '', true)]), '2mp': spell([...stem, T(SEGOL), X('מ')]), '2fp': spell([...stem, T(SEGOL), X('נ')]),
});
const SHURUK = () => X('ו', '', true);
const HOLAM_VAV = () => X('ו', HOLAM);

/** @type {Record<string, (r:Cluster[], theme:string)=>{parts:Record<string,string>, table:any}>} */
const BUILD = {
  "pa'al": ([a, b, c], theme) => {
    const o = theme === HOLAM;
    const fut = (p, pv) => spell([X(p, pv, p === 'ת'), R(a, SHVA), R(b, theme, 'l'), R(c)]);
    const futLong = (p, end) => spell([X(p, HIRIQ, p === 'ת'), R(a, SHVA), R(b, SHVA, 'l'), R(c, end === 'i' ? HIRIQ : ''), end === 'i' ? X('י') : SHURUK()]);
    return {
      parts: { dictionary: spell([R(a, QAMATS, 'l'), R(b, PATAH), R(c)]), present: spell([R(a, '', 'l'), HOLAM_VAV(), R(b, TSERE), R(c)]), future: fut('י', HIRIQ), infinitive: spell([X('ל', HIRIQ), R(a, SHVA), R(b, HOLAM, 'l'), R(c)]) },
      table: {
        past: { '3ms': spell([R(a, QAMATS, 'l'), R(b, PATAH), R(c)]), '3fs': spell([R(a, QAMATS, 'l'), R(b, SHVA), R(c, QAMATS), X('ה')]), '3p': spell([R(a, QAMATS, 'l'), R(b, SHVA), R(c), SHURUK()]),
          ...closedPast([R(a, QAMATS, 'l'), R(b, PATAH), R(c, SHVA)]),
          // the two long endings pull the stress forward, and the first vowel shrinks to a shva
          '2mp': spell([R(a, SHVA, 'l'), R(b, PATAH), R(c, SHVA), T(SEGOL), X('מ')]), '2fp': spell([R(a, SHVA, 'l'), R(b, PATAH), R(c, SHVA), T(SEGOL), X('נ')]) },
        present: { ms: spell([R(a, '', 'l'), HOLAM_VAV(), R(b, TSERE), R(c)]), fs: spell([R(a, '', 'l'), HOLAM_VAV(), R(b, SEGOL), R(c, SEGOL), X('ת')]),
          mp: spell([R(a, '', 'l'), HOLAM_VAV(), R(b, SHVA), R(c, HIRIQ), X('י'), X('מ')]), fp: spell([R(a, '', 'l'), HOLAM_VAV(), R(b, SHVA), R(c), HOLAM_VAV(), X('ת')]) },
        future: { '1s': fut('א', SEGOL), '2ms': fut('ת', HIRIQ), '2fs': futLong('ת', 'i'), '3ms': fut('י', HIRIQ), '3fs': fut('ת', HIRIQ), '1p': fut('נ', HIRIQ), '2p': futLong('ת', 'u'), '3p': futLong('י', 'u') },
        command: { ms: spell([R(a, SHVA, 'l'), R(b, o ? HOLAM : PATAH), R(c)]), fs: spell([R(a, HIRIQ, 'l'), R(b, SHVA), R(c, HIRIQ), X('י')]), p: spell([R(a, HIRIQ, 'l'), R(b, SHVA), R(c), SHURUK()]) },
      },
    };
  },
  "pi'el": ([a, b, c]) => {
    const fut = (p, pv) => spell([X(p, pv, p === 'ת'), R(a, PATAH), R(b, TSERE, 'f'), R(c)]);
    const futLong = (p, end) => spell([X(p, SHVA, p === 'ת'), R(a, PATAH), R(b, SHVA, 'f'), R(c, end === 'i' ? HIRIQ : ''), end === 'i' ? X('י') : SHURUK()]);
    const pres = (tail) => spell([X('מ', SHVA), R(a, PATAH), ...tail]);
    return {
      parts: { dictionary: spell([R(a, HIRIQ, 'l'), R(b, TSERE, 'f'), R(c)]), present: pres([R(b, TSERE, 'f'), R(c)]), future: fut('י', SHVA), infinitive: spell([X('ל', SHVA), R(a, PATAH), R(b, TSERE, 'f'), R(c)]) },
      table: {
        past: { '3ms': spell([R(a, HIRIQ, 'l'), R(b, TSERE, 'f'), R(c)]), '3fs': spell([R(a, HIRIQ, 'l'), R(b, SHVA, 'f'), R(c, QAMATS), X('ה')]), '3p': spell([R(a, HIRIQ, 'l'), R(b, SHVA, 'f'), R(c), SHURUK()]),
          ...closedPast([R(a, HIRIQ, 'l'), R(b, PATAH, 'f'), R(c, SHVA)]) },
        present: { ms: pres([R(b, TSERE, 'f'), R(c)]), fs: pres([R(b, SEGOL, 'f'), R(c, SEGOL), X('ת')]), mp: pres([R(b, SHVA, 'f'), R(c, HIRIQ), X('י'), X('מ')]), fp: pres([R(b, SHVA, 'f'), R(c), HOLAM_VAV(), X('ת')]) },
        future: { '1s': fut('א', HATAF_PATAH), '2ms': fut('ת', SHVA), '2fs': futLong('ת', 'i'), '3ms': fut('י', SHVA), '3fs': fut('ת', SHVA), '1p': fut('נ', SHVA), '2p': futLong('ת', 'u'), '3p': futLong('י', 'u') },
        command: { ms: spell([R(a, PATAH, 'l'), R(b, TSERE, 'f'), R(c)]), fs: spell([R(a, PATAH, 'l'), R(b, SHVA, 'f'), R(c, HIRIQ), X('י')]), p: spell([R(a, PATAH, 'l'), R(b, SHVA, 'f'), R(c), SHURUK()]) },
      },
    };
  },
  "hif'il": ([a, b, c]) => {
    const long = (p, pv, tail = []) => spell([X(p, pv, p === 'ת'), R(a, SHVA), R(b, HIRIQ, 'l'), X('י'), R(c, tail.length && tail[0] === 'i' ? HIRIQ : tail[0] === 'a' ? QAMATS : ''), ...(tail[0] === 'i' ? [X('י')] : tail[0] === 'a' ? [X('ה')] : tail[0] === 'u' ? [SHURUK()] : tail[0] === 'im' ? [] : [])]);
    const pres = (end) => spell([X('מ', PATAH), R(a, SHVA), R(b, HIRIQ, 'l'), X('י'), ...(end === 'ms' ? [R(c)] : end === 'fs' ? [R(c, QAMATS), X('ה')] : end === 'mp' ? [R(c, HIRIQ), X('י'), X('מ')] : [R(c), HOLAM_VAV(), X('ת')])]);
    return {
      parts: { dictionary: long('ה', HIRIQ), present: pres('ms'), future: long('י', PATAH), infinitive: spell([X('ל', SHVA), X('ה', PATAH), R(a, SHVA), R(b, HIRIQ, 'l'), X('י'), R(c)]) },
      table: {
        past: { '3ms': long('ה', HIRIQ), '3fs': long('ה', HIRIQ, ['a']), '3p': long('ה', HIRIQ, ['u']), ...closedPast([X('ה', HIRIQ), R(a, SHVA), R(b, PATAH, 'l'), R(c, SHVA)]) },
        present: { ms: pres('ms'), fs: pres('fs'), mp: pres('mp'), fp: pres('fp') },
        future: { '1s': long('א', PATAH), '2ms': long('ת', PATAH), '2fs': long('ת', PATAH, ['i']), '3ms': long('י', PATAH), '3fs': long('ת', PATAH), '1p': long('נ', PATAH), '2p': long('ת', PATAH, ['u']), '3p': long('י', PATAH, ['u']) },
        command: { ms: spell([X('ה', PATAH), R(a, SHVA), R(b, TSERE, 'l'), R(c)]), fs: long('ה', PATAH, ['i']), p: long('ה', PATAH, ['u']) },
      },
    };
  },
  "hitpa'el": ([a, b, c]) => {
    const stem = (p, pv, kind) => spell([X(p, pv, p === 'ת'), X('ת', SHVA), R(a, PATAH, 'l'),
      ...(kind === 'base' ? [R(b, TSERE, 'f'), R(c)] : kind === 'a' ? [R(b, SHVA, 'f'), R(c, QAMATS), X('ה')] : kind === 'u' ? [R(b, SHVA, 'f'), R(c), SHURUK()] : kind === 'i' ? [R(b, SHVA, 'f'), R(c, HIRIQ), X('י')]
        : kind === 'fs' ? [R(b, SEGOL, 'f'), R(c, SEGOL), X('ת')] : kind === 'mp' ? [R(b, SHVA, 'f'), R(c, HIRIQ), X('י'), X('מ')] : [R(b, SHVA, 'f'), R(c), HOLAM_VAV(), X('ת')])]);
    return {
      parts: { dictionary: stem('ה', HIRIQ, 'base'), present: stem('מ', HIRIQ, 'base'), future: stem('י', HIRIQ, 'base'), infinitive: spell([X('ל', SHVA), X('ה', HIRIQ), X('ת', SHVA), R(a, PATAH, 'l'), R(b, TSERE, 'f'), R(c)]) },
      table: {
        past: { '3ms': stem('ה', HIRIQ, 'base'), '3fs': stem('ה', HIRIQ, 'a'), '3p': stem('ה', HIRIQ, 'u'), ...closedPast([X('ה', HIRIQ), X('ת', SHVA), R(a, PATAH, 'l'), R(b, PATAH, 'f'), R(c, SHVA)]) },
        present: { ms: stem('מ', HIRIQ, 'base'), fs: stem('מ', HIRIQ, 'fs'), mp: stem('מ', HIRIQ, 'mp'), fp: stem('מ', HIRIQ, 'fp') },
        future: { '1s': stem('א', SEGOL, 'base'), '2ms': stem('ת', HIRIQ, 'base'), '2fs': stem('ת', HIRIQ, 'i'), '3ms': stem('י', HIRIQ, 'base'), '3fs': stem('ת', HIRIQ, 'base'), '1p': stem('נ', HIRIQ, 'base'), '2p': stem('ת', HIRIQ, 'u'), '3p': stem('י', HIRIQ, 'u') },
        command: { ms: stem('ה', HIRIQ, 'base'), fs: stem('ה', HIRIQ, 'i'), p: stem('ה', HIRIQ, 'u') },
      },
    };
  },
};

/** Where the three root letters sit in the dictionary form of each pattern, and what the letters around them must be. */
function rootOf(binyan, he) {
  const c = clustersOf(he);
  const is = (k, l, v) => c[k] && c[k].l === l && c[k].v === v;
  if (binyan === "pa'al") return c.length === 3 && c[0].v === QAMATS && c[1].v === PATAH ? [c[0], c[1], c[2]] : null;
  if (binyan === "pi'el") return c.length === 3 && c[0].v === HIRIQ && c[1].v === TSERE && c[1].dag ? [c[0], c[1], c[2]] : null;
  if (binyan === "hif'il") return c.length === 5 && is(0, 'ה', HIRIQ) && c[1].v === SHVA && c[2].v === HIRIQ && is(3, 'י', '') ? [c[1], c[2], c[4]] : null;
  if (binyan === "hitpa'el") return c.length === 5 && is(0, 'ה', HIRIQ) && is(1, 'ת', SHVA) && c[2].v === PATAH && c[3].v === TSERE && c[3].dag ? [c[2], c[3], c[4]] : null;
  return null;
}

/** True when one of the root letters bends the regular pattern. */
function isWeak(binyan, [a, b, c]) {
  if ([a, b, c].some((r) => GUTTURAL.includes(r.l))) return true;
  if ('וי'.includes(b.l) || 'האנת'.includes(c.l) || b.l === c.l && b.dot === c.dot) return true;
  if ((binyan === "pa'al" || binyan === "hif'il") && 'ינ'.includes(a.l)) return true;
  if ((binyan === "pi'el" || binyan === "hitpa'el") && b.l === 'ר') return true;
  if (binyan === "hitpa'el" && 'סשזצדטת'.includes(a.l)) return true;
  if (binyan === "hif'il" && a.l === 'ו') return true;
  return false;
}

/**
 * The full table of one verb, or the reason there is none.
 * @param {{id?:string, he:string, binyan?:string|null, forms?:Record<string,string>}} verb a row of data/roots/verbs.json
 * @returns {{ok:true, binyan:string, root:string, table:Record<string, Record<string,string>>, infinitive:string|null, checked:string[]} | {ok:false, why:keyof typeof NO_TABLE}}
 */
export function conjugate(verb) {
  const binyan = String(verb?.binyan || '');
  if (!BUILD[binyan]) return { ok: false, why: 'pattern' };
  const r = rootOf(binyan, verb.he);
  if (!r) return { ok: false, why: 'shape' };
  if (isWeak(binyan, r)) return { ok: false, why: 'weak' };
  const forms = verb.forms || {};
  let theme = '';
  if (binyan === "pa'al") {
    const f = clustersOf(forms.future || '');
    theme = f.length === 4 ? f[2].v : '';
    if (theme !== HOLAM && theme !== PATAH) return { ok: false, why: forms.future ? 'shape' : 'mismatch' };
  }
  const built = BUILD[binyan](r.map((x) => ({ l: x.l, dot: x.dot, dag: false, v: '' })), theme);
  // the gate: the rules must rebuild every form the word list holds for this verb
  const have = { dictionary: verb.he, present: forms.present, future: forms.future, infinitive: forms.infinitive };
  const checked = [];
  for (const k of ['dictionary', 'present', 'future', 'infinitive']) {
    if (!have[k]) continue;
    if (canon(have[k]) !== canon(built.parts[k])) return { ok: false, why: 'mismatch' };
    checked.push(k);
  }
  if (!checked.includes('present') || !checked.includes('future')) return { ok: false, why: 'mismatch' };
  return { ok: true, binyan, root: r.map((x) => x.l).join('־'), table: built.table, infinitive: forms.infinitive || null, checked };
}

/** Every cell of a table as a flat list, in reading order. */
export function cells(result) {
  if (!result?.ok) return [];
  return TENSES.flatMap((t) => t.order.map((p) => ({ tense: t.key, tenseTitle: t.title, person: p, he: result.table[t.key][p] })));
}

// ---- O10: what is this verb?
/** @type {WeakMap<object, Map<string, {verb:any, tense:string, person:string, he:string}[]>>} */
const indexes = new WeakMap();

/** Bare letters -> every place those letters appear: the forms the word list holds and, for regular verbs, the built forms. */
export function formIndex(verbs) {
  let idx = indexes.get(verbs);
  if (idx) return idx;
  idx = new Map();
  const add = (he, verb, tense, person) => { const k = bare(he); if (!k) return; const list = idx.get(k) || []; if (!list.some((x) => x.verb === verb && x.he === he)) list.push({ verb, tense, person, he }); idx.set(k, list); };
  for (const v of verbs) {
    const r = conjugate(v);
    if (r.ok) for (const c of cells(r)) add(c.he, v, c.tense, c.person);
    add(v.he, v, 'past', '3ms');
    for (const [k, he] of Object.entries(v.forms || {})) if (he) add(he, v, k === 'infinitive' ? 'infinitive' : k, k === 'present' ? 'ms' : k === 'future' ? '3ms' : '');
  }
  indexes.set(verbs, idx);
  return idx;
}

/**
 * Typed Hebrew (with or without vowel marks) -> the verbs it can be a form of.
 * @param {string} text @param {any[]} verbs rows of data/roots/verbs.json
 * @returns {{verb:any, matches:{tense:string, person:string, he:string}[], exact:boolean}[]} exact: the typed marks match a form
 */
export function analyze(text, verbs) {
  const typed = String(text ?? '').trim();
  const key = bare(typed);
  if (!key) return [];
  const hits = formIndex(verbs).get(key) || [];
  const pointed = /[ְ-ׇ]/.test(typed) ? canon(typed) : '';
  /** @type {Map<any, {verb:any, matches:any[], exact:boolean}>} */
  const by = new Map();
  for (const h of hits) {
    if (pointed && canon(h.he) !== pointed) continue;
    const row = by.get(h.verb) || { verb: h.verb, matches: [], exact: !!pointed };
    row.matches.push({ tense: h.tense, person: h.person, he: h.he });
    by.set(h.verb, row);
  }
  return [...by.values()].sort((a, b) => (a.verb.rank || 99999) - (b.verb.rank || 99999));
}

/** One line saying what a matched form is, in plain words. */
export function describeMatch(m) {
  if (m.tense === 'infinitive') return 'the "to ..." form';
  const t = TENSES.find((x) => x.key === m.tense);
  const who = PERSONS[m.person] ? PERSONS[m.person].en : '';
  return `${t ? t.title.toLowerCase() : m.tense}${who ? `, ${who}` : ''}`;
}

/** How many verbs of a list get a full table, by pattern and by the reason for the rest. */
export function coverage(verbs) {
  const out = { total: verbs.length, built: 0, byPattern: /** @type {Record<string, number>} */ ({}), why: /** @type {Record<string, number>} */ ({}) };
  for (const v of verbs) { const r = conjugate(v); if (r.ok) { out.built++; out.byPattern[r.binyan] = (out.byPattern[r.binyan] || 0) + 1; } else out.why[r.why] = (out.why[r.why] || 0) + 1; }
  return out;
}
