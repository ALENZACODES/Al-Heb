// Stage 2: rank every entry of data/vocab/words.json by how often it occurs in the project's own
// Hebrew text (corpus registry and phrasebook, service orders, curriculum lesson text).
//
//   node tools/vocab/frequency.mjs            writes data/vocab/frequency.json
//   node tools/vocab/frequency.mjs --dry      prints the summary only
//
// Also exports the sentence-pool loader used by review_pack.mjs and theme_packs.mjs, so every
// stage reads exactly the same set of source strings. Nothing here writes to words.json.
//
// What counts as "the pool" (every Hebrew string is taken verbatim; nothing is composed):
//   corpus      data/corpus/registry.json        entries[].he, split on newlines (one line = one unit)
//               data/corpus/phrasebook.json      entries[].he
//               data/corpus/torah-service-guide.json  sections[].hebrewName
//   service     data/service/orders.json         holds no Hebrew itself; each order item references a
//                                                registry id, so the referenced registry text is counted
//                                                once per order item under the "service" channel
//   curriculum  data/curriculum/lessons.json     lessons[].words[].he and lessons[].prayerLines (registry ids)
//               data/curriculum/dialogues.json   dialogues[].lines[].he
//               data/curriculum/gender-pairs.json pairs[].forms.*.he and paradigms (every he string)
//               data/curriculum/prompts.json     morning/evening/shabbatEve/holidays.*[].he
//               data/curriculum/loanwords.json   groups[].words[].he
//
// Matching: tokens are compared after removing cantillation, vowel points, maqaf and punctuation
// (NFC). A word matches a token when the token equals its unpointed headword or one of its listed
// forms (plural, feminine, present, future, infinitive). A "clitic" match is the same after removing
// one or two leading prefix letters (ו ה ב ל מ ש כ) from the token, if at least 3 letters remain.
// Multi-word entries match as a token sequence. Because frequency is counted per spelling, homographs
// share counts (as in the main ranking); the sameSpelling situation is flagged in the review sheets,
// not resolved here.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const POOL_FILES = {
  corpus: ['data/corpus/registry.json', 'data/corpus/phrasebook.json', 'data/corpus/torah-service-guide.json'],
  service: ['data/service/orders.json'],
  curriculum: ['data/curriculum/lessons.json', 'data/curriculum/dialogues.json', 'data/curriculum/gender-pairs.json', 'data/curriculum/prompts.json', 'data/curriculum/loanwords.json'],
};

const TAAMIM = /[֑-ֽֿ֯׀ׅׄ]/g;
const NIQQUD = /[ְ-ׇּׁׂ]/g;
const PUNCT = /[־׃׆.,!?;:"“”„()\[\]{}\-–—…׃\/]/g;
export const HEBREW_LETTER = /[א-ת]/;
export const PREFIX_LETTERS = ['ו', 'ה', 'ב', 'ל', 'מ', 'ש', 'כ'];

/** Pointed/cantillated Hebrew -> plain consonantal text (keeps geresh/gershayim, spaces). */
export function plain(s) {
  return s.normalize('NFC').replace(TAAMIM, '').replace(NIQQUD, '').replace(PUNCT, ' ').replace(/\s+/g, ' ').trim();
}

export function tokenize(s) {
  return plain(s).split(' ').map((t) => t.replace(/^['"׳״]+|['"׳״]+$/g, '')).filter((t) => HEBREW_LETTER.test(t));
}

function pushUnit(pool, channel, file, ref, text, en) {
  if (typeof text !== 'string' || !HEBREW_LETTER.test(text)) return;
  for (const line of text.split('\n')) {
    const he = line.trim();
    if (!he || !HEBREW_LETTER.test(he)) continue;
    pool.push({ channel, file, ref, he, en: typeof en === 'string' ? en : null, tokens: tokenize(he) });
  }
}

/**
 * Every Hebrew unit the project owns, verbatim. Returns [{channel, file, ref, he, en, tokens}].
 * Registry lines referenced by service orders and lesson prayerLines are counted again under
 * their own channel (the text is the same string, so the test for "verbatim" still holds).
 */
export function loadSentencePool(root = ROOT) {
  const rj = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  const pool = [];

  const registry = rj('data/corpus/registry.json');
  const regById = new Map();
  const pushRegistry = (reg, channel, file, ref) => {
    const heLines = reg.he.split('\n');
    const enLines = typeof reg.english === 'string' ? reg.english.split('\n') : [];
    heLines.forEach((line, i) => pushUnit(pool, channel, file, ref, line, enLines.length === heLines.length ? enLines[i] : (heLines.length === 1 ? reg.english : null)));
  };
  for (const e of registry.entries) { regById.set(e.id, e); pushRegistry(e, 'corpus', 'data/corpus/registry.json', e.id); }
  for (const e of rj('data/corpus/phrasebook.json').entries) pushUnit(pool, 'corpus', 'data/corpus/phrasebook.json', e.id, e.he, e.en);
  for (const s of rj('data/corpus/torah-service-guide.json').sections || []) pushUnit(pool, 'corpus', 'data/corpus/torah-service-guide.json', s.id || s.title, s.hebrewName, s.title);

  const orders = rj('data/service/orders.json');
  for (const [orderId, order] of Object.entries(orders.orders || {})) {
    for (const item of order.items || []) {
      const reg = regById.get(item.id);
      if (reg) pushRegistry(reg, 'service', 'data/service/orders.json', `${orderId}/${item.id}`);
    }
  }

  const lessons = rj('data/curriculum/lessons.json');
  for (const l of lessons.lessons) {
    for (const w of l.words || []) pushUnit(pool, 'curriculum', 'data/curriculum/lessons.json', `${l.id}/words`, w.he, w.en);
    for (const id of l.prayerLines || []) {
      const reg = regById.get(id);
      if (reg) pushRegistry(reg, 'curriculum', 'data/curriculum/lessons.json', `${l.id}/prayerLines/${id}`);
    }
  }
  for (const d of rj('data/curriculum/dialogues.json').dialogues) for (const ln of d.lines || []) pushUnit(pool, 'curriculum', 'data/curriculum/dialogues.json', ln.id || d.id, ln.he, ln.en);
  const gp = rj('data/curriculum/gender-pairs.json');
  for (const p of gp.pairs || []) for (const [g, f] of Object.entries(p.forms || {})) pushUnit(pool, 'curriculum', 'data/curriculum/gender-pairs.json', `${p.id}/${g}`, f && f.he, p.en);
  const walkHe = (x, ref) => {
    if (Array.isArray(x)) x.forEach((y, i) => walkHe(y, `${ref}[${i}]`));
    else if (x && typeof x === 'object') {
      if (typeof x.he === 'string') pushUnit(pool, 'curriculum', 'data/curriculum/gender-pairs.json', x.id ? `paradigm/${x.id}` : ref, x.he, typeof x.en === 'string' ? x.en : null);
      for (const [k, v] of Object.entries(x)) if (k !== 'he') walkHe(v, `${ref}.${k}`);
    }
  };
  walkHe(gp.paradigms || [], 'paradigms');
  const prompts = rj('data/curriculum/prompts.json');
  for (const key of ['morning', 'evening', 'shabbatEve']) for (const p of prompts[key] || []) pushUnit(pool, 'curriculum', 'data/curriculum/prompts.json', p.id || key, p.he, p.en);
  for (const [h, list] of Object.entries(prompts.holidays || {})) for (const p of list || []) pushUnit(pool, 'curriculum', 'data/curriculum/prompts.json', p.id || h, p.he, p.en);
  for (const g of rj('data/curriculum/loanwords.json').groups || []) for (const w of g.words || []) pushUnit(pool, 'curriculum', 'data/curriculum/loanwords.json', w.id || g.id, w.he, w.gloss);

  return pool;
}

/** All surface spellings (unpointed, as token sequences) under which a words.json entry may appear. */
export function surfaceForms(w) {
  const out = new Set();
  const add = (s) => { if (typeof s === 'string') { const t = tokenize(s); if (t.length) out.add(t.join(' ')); } };
  add(w.he);
  add(w.heUnpointed);
  const walk = (x) => { if (typeof x === 'string') add(x); else if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') Object.values(x).forEach(walk); };
  walk(w.forms);
  return [...out];
}

// The remainder must keep at least 3 letters: with 2 the stripping invents matches (מלך -> לך).
export function stripClitics(tok) {
  const out = [];
  if (tok.length >= 4 && PREFIX_LETTERS.includes(tok[0])) {
    out.push(tok.slice(1));
    if (tok.length >= 5 && PREFIX_LETTERS.includes(tok[1]) && tok[0] === 'ו') out.push(tok.slice(2));
    if (tok.length >= 5 && tok[1] === 'ה' && tok[0] !== 'ו') out.push(tok.slice(2));
  }
  return out;
}

/**
 * Count occurrences of every entry in the pool.
 * Returns Map id -> {exact, clitic, byChannel:{corpus,service,curriculum}, units:[{i: poolIndex, kind}]}
 */
export function countOccurrences(words, pool) {
  const byForm = new Map(); // single-token form -> Set(id)
  const multi = []; // {id, tokens[]}
  for (const w of words) {
    for (const f of surfaceForms(w)) {
      const toks = f.split(' ');
      if (toks.length === 1) { if (!byForm.has(f)) byForm.set(f, new Set()); byForm.get(f).add(w.id); }
      else multi.push({ id: w.id, tokens: toks });
    }
  }
  const res = new Map();
  const get = (id) => { if (!res.has(id)) res.set(id, { exact: 0, clitic: 0, byChannel: { corpus: 0, service: 0, curriculum: 0 }, units: [] }); return res.get(id); };
  const hit = (id, kind, unitIdx, channel) => {
    const r = get(id); r[kind]++; r.byChannel[channel]++;
    const last = r.units[r.units.length - 1];
    if (!last || last.i !== unitIdx) r.units.push({ i: unitIdx, kind });
  };
  pool.forEach((u, ui) => {
    for (const tok of u.tokens) {
      const ids = byForm.get(tok);
      if (ids) for (const id of ids) hit(id, 'exact', ui, u.channel);
      for (const s of stripClitics(tok)) {
        const ids2 = byForm.get(s);
        if (ids2) for (const id of ids2) if (!ids || !ids.has(id)) hit(id, 'clitic', ui, u.channel);
      }
    }
    if (u.tokens.length >= 2) {
      const joined = ' ' + u.tokens.join(' ') + ' ';
      for (const m of multi) {
        const needle = ' ' + m.tokens.join(' ') + ' ';
        let i = joined.indexOf(needle);
        while (i !== -1) { hit(m.id, 'exact', ui, u.channel); i = joined.indexOf(needle, i + 1); }
      }
    }
  });
  return res;
}

/** Deterministic rank: total occurrences desc, then words.json frequencyRank asc (null last), then id. */
export function rankEntries(words, counts) {
  const rows = words.map((w) => {
    const c = counts.get(w.id) || { exact: 0, clitic: 0, byChannel: { corpus: 0, service: 0, curriculum: 0 }, units: [] };
    return { id: w.id, he: w.he, heUnpointed: w.heUnpointed, pos: w.pos, total: c.exact + c.clitic, exact: c.exact, clitic: c.clitic, byChannel: c.byChannel, units: c.units.length, baseRank: w.frequencyRank };
  });
  rows.sort((a, b) => b.total - a.total || (a.baseRank ?? 1e9) - (b.baseRank ?? 1e9) || (a.id < b.id ? -1 : 1));
  rows.forEach((r, i) => { r.corpusRank = i + 1; });
  return rows;
}

export function buildFrequency(root = ROOT) {
  const words = JSON.parse(fs.readFileSync(path.join(root, 'data/vocab/words.json'), 'utf8')).words;
  const pool = loadSentencePool(root);
  const counts = countOccurrences(words, pool);
  const ranked = rankEntries(words, counts);
  const attested = ranked.filter((r) => r.total > 0).length;
  const poolStats = { units: pool.length, tokens: pool.reduce((a, u) => a + u.tokens.length, 0), byChannel: {} };
  for (const u of pool) poolStats.byChannel[u.channel] = (poolStats.byChannel[u.channel] || 0) + 1;
  return {
    schema: 'alef-vocab-frequency/1',
    generated: new Date().toISOString().slice(0, 10),
    note: 'Occurrence counts of each words.json entry in the project\'s own Hebrew text (see POOL_FILES in tools/vocab/frequency.mjs). Counted per spelling: homographs share counts. corpusRank is a tie-broken order, not a measure of general Hebrew frequency; entries with total 0 are ordered by the main frequencyRank. Not written back to words.json.',
    method: { files: POOL_FILES, match: 'unpointed token equality against the headword or a listed form; clitic = same after removing 1-2 leading prefix letters (ו ה ב ל מ ש כ) when at least 3 letters remain; multi-word entries match as a token sequence', tieBreak: ['total desc', 'words.json frequencyRank asc (null last)', 'id'] },
    pool: poolStats,
    counts: { entries: ranked.length, attested, unattested: ranked.length - attested },
    entries: ranked.map(({ id, he, pos, total, exact, clitic, byChannel, units, baseRank, corpusRank }) => ({ id, he, pos, corpusRank, total, exact, clitic, byChannel, units, baseRank })),
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = buildFrequency();
  const dry = process.argv.includes('--dry');
  if (!dry) fs.writeFileSync(path.join(ROOT, 'data/vocab/frequency.json'), JSON.stringify(out) + '\n');
  const top = out.entries.slice(0, 10).map((e) => `${e.he}(${e.total})`).join(' ');
  console.log(`frequency: ${out.pool.units} pool units, ${out.pool.tokens} tokens (${Object.entries(out.pool.byChannel).map(([k, v]) => `${k} ${v}`).join(', ')})`);
  console.log(`entries ${out.counts.entries}: attested ${out.counts.attested}, unattested ${out.counts.unattested}`);
  console.log(`top 10: ${top}`);
  if (!dry) console.log('wrote data/vocab/frequency.json');
}
