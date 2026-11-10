// Known-word validator (pure, no DOM, no network): given Hebrew text and a set of words a learner is assumed to know, report which words
// are NOT in the set. It writes no Hebrew and repairs nothing: it is the "validate" half of a validate-and-repair pipeline, so a generator
// (or a human) can be told exactly which words to replace. Matching is on the UNPOINTED spelling, so a word is only "known" if the same
// letters occur in the word list (or one of its stored forms: plural, feminine, present, future, infinitive). Hebrew attaches small
// prefixes (and, the, in, like, to, from, that) to words; with allowPrefix a word counts as "known by prefix" when removing up to two
// such letters leaves a listed word. That is a spelling rule, not grammar: it can be wrong, so those hits are reported separately.

export const LEVELS = ['A1', 'A2', 'B1', 'B2'];
export const PREFIXES = ['ו', 'ה', 'ב', 'כ', 'ל', 'מ', 'ש'];
const MARKS = /[֑-ׇ]/g; // points, cantillation, rafe etc.
/** Letters only: points, maqaf, geresh and gershayim removed. */
export function strip(s) { return String(s ?? '').normalize('NFD').replace(MARKS, '').replace(/[־׳״"'`‎‏]/g, '').normalize('NFC'); }
const WORD = /[א-ת][֑-ׇא-ת׳״"']*/g;
/** Hebrew words in a text, as written (maqaf joins are split). Non-Hebrew text is ignored. */
export function tokens(text) {
  const s = String(text ?? '').replace(/־/g, ' '); return s.match(WORD) || [];
}

/** Set of unpointed spellings from vocabulary rows up to a level (and optional frequency rank), including stored forms. */
export function knownSet(rows, { maxLevel = 'A1', maxRank = Infinity, extra = [] } = {}) {
  const top = LEVELS.indexOf(maxLevel); if (top < 0) throw new RangeError(`level must be one of ${LEVELS.join(', ')}`);
  const set = new Set(extra.map(strip));
  for (const r of rows) {
    if (r.flags && !Array.isArray(r.flags) && r.flags.hidden === true) continue; // withheld by the sensitivity lane
    const li = LEVELS.indexOf(r.level);
    if (li < 0 || li > top || (r.frequencyRank ?? 0) > maxRank) continue;
    set.add(strip(r.heUnpointed || r.he));
    for (const v of Object.values(r.forms || {})) if (typeof v === 'string') set.add(strip(v));
  }
  set.delete(''); return set;
}
/** Same set as knownSet(rows, { maxLevel }) (same members, same iteration order) from the derived index data/knownwords/index.json (see tools/knownwords/build.mjs). */
export function knownSetFromIndex(index, { maxLevel = 'A1', extra = [] } = {}) {
  const top = LEVELS.indexOf(maxLevel); if (top < 0) throw new RangeError(`level must be one of ${LEVELS.join(', ')}`);
  const first = new Map();
  for (const entries of Object.values(index?.lessons || {})) for (const [seq, li, s] of entries) if (li <= top && !(first.get(s) <= seq)) first.set(s, seq);
  const set = new Set(extra.map(strip));
  for (const [s] of [...first].sort((a, b) => a[1] - b[1])) set.add(s);
  set.delete(''); return set;
}
/** Matches one word against the set: 'exact', 'prefix' (a prefix letter or two removed) or null. */
export function matchWord(word, known, allowPrefix = true) {
  const w = strip(word); if (known.has(w)) return { how: 'exact', base: w };
  if (!allowPrefix) return null;
  for (let n = 1; n <= 2 && w.length - n >= 2; n++) {
    const head = w.slice(0, n); if (![...head].every((c) => PREFIXES.includes(c))) break;
    const rest = w.slice(n); if (known.has(rest)) return { how: 'prefix', base: rest };
  }
  return null;
}
/** @returns {{total:number, distinct:number, exact:number, prefix:number, unknown:{word:string,count:number}[], exactCoverage:number, coverage:number}} counts are of word occurrences */
export function validate(text, known, { allowPrefix = true, allow = [] } = {}) {
  const ok = new Set(allow.map(strip)), seen = new Map(); let exact = 0, prefix = 0, total = 0;
  for (const t of tokens(text)) {
    const w = strip(t); if (!w) continue; total++;
    const m = ok.has(w) ? { how: 'exact' } : matchWord(w, known, allowPrefix);
    if (m?.how === 'exact') exact++; else if (m?.how === 'prefix') prefix++;
    else seen.set(w, (seen.get(w) || 0) + 1);
  }
  const unknown = [...seen].map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, 'he'));
  return { total, distinct: new Set(tokens(text).map(strip)).size, exact, prefix, unknown, exactCoverage: total ? exact / total : 1, coverage: total ? (exact + prefix) / total : 1 };
}
/** Pass/fail gate for a pipeline. The threshold is a choice of the caller, not a claim about learning. */
export const passes = (report, threshold = 1) => report.coverage >= threshold;

function lev(a, b) {
  const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
/** Listed spellings within one edit of an unknown word of 4+ letters (a hint that it may be a variant spelling; often unrelated; NOT a replacement). */
export function similar(word, known, max = 3) {
  const w = strip(word), out = []; if (w.length < 4) return out;
  for (const k of known) { if (Math.abs(k.length - w.length) <= 1 && lev(w, k) === 1) { out.push(k); if (out.length >= max) break; } }
  return out;
}
/** Dialogue/lesson data helper: every line's Hebrew joined (reads `he` fields of {lines:[{he}]}). */
export const dialogueText = (d) => (d.lines || []).map((l) => l.he).join('\n');
