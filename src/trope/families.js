// Trope families, signs in real verses, and phrase-by-phrase practice (lane 6, points plan #13). Pure: no DOM, no network.
// Sign ids, names and code points come only from data/corpus/trope/table.json; the words come only from the Torah text's own
// cantillation (data/corpus/torah/<book>/<nn>.json, field heTrope). Nothing here names a mark the table does not name, and no melody
// is described or made: the app has no melody recordings.
import { hasName } from '../games/tg-core.js';

export const TROPE_NOTE = 'Trope names from the app’s table; not reviewed.';
export const NO_MELODY = 'melody audio not recorded yet';
export const PRACTICE_KEY = 'trope.practice.v1';

const SILUK_METEG = 0x5bd, PASEQ = 0x5c0, SOF_PASUQ = 0x5c3, MUNACH = 0x5a3;

/** The table's strength groups (its own note: 1 emperor, 2 king, 3 duke, 4 count), then the conjunctive marks. */
export const GROUPS = Object.freeze([
  { id: 'level-1', level: 1, title: 'Level 1: Emperors', help: 'The strongest stops. They end a verse or its first half.' },
  { id: 'level-2', level: 2, title: 'Level 2: Kings', help: 'Strong stops inside each half of a verse.' },
  { id: 'level-3', level: 3, title: 'Level 3: Dukes', help: 'Weaker stops inside a king’s phrase.' },
  { id: 'level-4', level: 4, title: 'Level 4: Counts', help: 'The weakest stops.' },
  { id: 'servants', cls: 'conjunctive', title: 'Servants: the joining marks', help: 'These do not stop the phrase; they lead into the next stop.' },
]);

/** The name a learner sees, for one naming system ('ashkenazi' or 'sephardi'). */
export const signName = (row, system) => (!row ? '' : system === 'ashkenazi' ? row.ashkenazi : row.sephardi);
export const signHe = (row, system) => (!row ? '' : system === 'ashkenazi' ? row.ashkenaziHe : row.sephardiHe);

/** Lessons: one per group, each with its signs in table order. */
export function families(table) {
  const rows = (table?.prose || []).filter((r) => r && (r.cls === 'disjunctive' || r.cls === 'conjunctive'));
  return GROUPS.map((g) => ({ ...g, signs: rows.filter((r) => (g.cls ? r.cls === g.cls : r.cls === 'disjunctive' && r.level === g.level)) })).filter((g) => g.signs.length);
}

/** code point -> table row, for the marks that a single code point names (siluk/meteg and legarmeh/paseq are read by position). */
export function codeMap(table) {
  const m = new Map();
  for (const r of table?.prose || []) {
    if (!r || (r.cls !== 'disjunctive' && r.cls !== 'conjunctive')) continue;
    if (r.cp === SILUK_METEG || r.cp === PASEQ || m.has(r.cp)) continue;
    m.set(r.cp, r);
  }
  return m;
}
export const rowsById = (table) => new Map((table?.prose || []).map((r) => [r.id, r]));

/**
 * A verse's heTrope as reading tokens: [{ text, marks: [id], disjunctive: bool }]. A lone paseq is folded into the word before it.
 * Siluk = the meteg-shaped mark on the verse's last word; legarmeh = munach on a word followed by a paseq. Code points the table
 * does not list are left unnamed (never guessed).
 */
export function verseTokens(heTrope, table, cmap = codeMap(table), byId = rowsById(table)) {
  const raw = String(heTrope || '').split(/\s+/).filter(Boolean);
  const toks = [];
  for (const t of raw) {
    if (t === '׀' && toks.length) { toks[toks.length - 1].paseq = true; continue; }
    toks.push({ text: t, paseq: t.includes('׀') });
  }
  return toks.map((tk, i) => {
    const ids = [];
    const last = i === toks.length - 1;
    for (const ch of tk.text) {
      const cp = ch.codePointAt(0);
      if (cp === SILUK_METEG) { if (last && byId.has('siluk') && !ids.includes('siluk')) ids.push('siluk'); continue; }
      if (cp === MUNACH && tk.paseq && byId.has('legarmeh')) { if (!ids.includes('legarmeh')) ids.push('legarmeh'); continue; }
      const r = cmap.get(cp);
      if (r && !ids.includes(r.id)) ids.push(r.id);
    }
    const disjunctive = ids.some((id) => byId.get(id)?.cls === 'disjunctive') || last;
    return { text: tk.paseq && !tk.text.includes('׀') ? tk.text + ' ׀' : tk.text, marks: ids, disjunctive, name: hasName(tk.text) };
  });
}

/** Phrases of a verse: each ends at a word with a stopping (disjunctive) mark, and the verse end always ends one. */
export function phrases(tokens) {
  const out = []; let cur = [];
  for (const t of tokens) { cur.push(t); if (t.disjunctive) { out.push(cur); cur = []; } }
  if (cur.length) out.push(cur);
  return out;
}

/** Up to `max` example words per sign id from loaded chapters (a word with the four-letter name is skipped). */
export function collectExamples(chapters, table, wanted, max = 3, found = new Map()) {
  const cmap = codeMap(table), byId = rowsById(table), want = new Set(wanted);
  for (const ch of chapters || []) for (const v of ch?.verses || []) {
    const toks = verseTokens(v.heTrope, table, cmap, byId);
    for (const t of toks) for (const id of t.marks) {
      if (!want.has(id) || t.name) continue;
      const list = found.get(id) || [];
      if (list.length >= max) continue;
      list.push({ text: t.text.replace(/׃/g, ''), ref: `${ch.ref}:${v.n}`, book: ch.book, chapter: ch.chapter, verse: v.n });
      found.set(id, list);
    }
  }
  return found;
}

/** Every chapter of the Torah in order, from the index: [{book, chapter}]. */
export function allChapters(index) {
  return (index?.books || []).flatMap((b) => (b.chapterVerses || []).map((_, i) => ({ book: b.id, chapter: i + 1 })));
}

/** Verses of a range [{book, chapter, verse}] in reading order, from the index's chapter lengths. from/to = {book, chapter, verse}. */
export function versesInRange(index, from, to) {
  const out = []; let on = false;
  for (const b of index?.books || []) (b.chapterVerses || []).forEach((n, ci) => {
    for (let v = 1; v <= n; v++) {
      const here = { book: b.id, chapter: ci + 1, verse: v };
      if (!on && b.id === from.book && ci + 1 === from.chapter && v === from.verse) on = true;
      if (on) out.push(here);
      if (on && b.id === to.book && ci + 1 === to.chapter && v === to.verse) { on = false; return; }
    }
  });
  return out;
}

/** The practice units of a portion: its aliyot when the index has them, otherwise its chapters. */
export function practiceUnits(index, portion) {
  if (!portion) return [];
  if (Array.isArray(portion.aliyot) && portion.aliyot.length) return portion.aliyot.map((a) => ({ id: `aliyah-${a.n}`, label: `Aliyah ${a.n}`, from: a.from, to: a.to }));
  const verses = versesInRange(index, portion.from, portion.to), by = new Map();
  for (const v of verses) { const k = `${v.book}-${v.chapter}`; if (!by.has(k)) by.set(k, []); by.get(k).push(v); }
  return [...by.values()].map((vs) => ({ id: `chapter-${vs[0].book}-${vs[0].chapter}`, label: `Chapter ${vs[0].chapter}`, from: vs[0], to: vs[vs.length - 1] }));
}

/** Flat phrase list for a run of verses: [{ref, book, chapter, verse, n (phrase index in the verse), of, tokens}]. verseText(book, chapter, verse) -> heTrope. */
export function phraseSteps(verses, verseText, table) {
  const cmap = codeMap(table), byId = rowsById(table), out = [];
  for (const v of verses) {
    const ht = verseText(v.book, v.chapter, v.verse);
    if (!ht) continue;
    const ps = phrases(verseTokens(ht, table, cmap, byId));
    ps.forEach((tokens, n) => out.push({ ...v, n, of: ps.length, tokens }));
  }
  return out;
}

export function normalisePractice(raw) {
  const s = { v: 1, parsha: null, unit: null, step: 0 };
  if (!raw || typeof raw !== 'object') return s;
  if (typeof raw.parsha === 'string') s.parsha = raw.parsha.slice(0, 40);
  if (typeof raw.unit === 'string') s.unit = raw.unit.slice(0, 60);
  if (Number.isInteger(raw.step) && raw.step >= 0) s.step = raw.step;
  return s;
}
