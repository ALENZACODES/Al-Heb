#!/usr/bin/env node
// Lesson sentences that use a word from the grammar tables: writes data/grammar/examples.json.
//   node tools/grammar/examples.mjs           rewrite the file
//   node tools/grammar/examples.mjs --check   exit 1 if the file is out of date
// Nothing is written or changed in a sentence: each is copied whole, with its English, from the lesson data,
// and only when it holds the table word with exactly the same vowel marks.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TABS, tablesFor, sameMarks } from '../../src/grammar/tables.js';

const ROOT = new URL('../../', import.meta.url);
const rd = (rel) => JSON.parse(readFileSync(new URL(rel, ROOT), 'utf8'));
const OUT = 'data/grammar/examples.json';
export const SOURCES = ['data/curriculum/lessons.json', 'data/curriculum/dialogues.json', 'data/curriculum/lessons-intermediate/', 'data/curriculum/practical/'];
export const PER_WORD = 2, MIN_WORDS = 3, MAX_WORDS = 9;
const NAME = 'יהוה';
const bare = (s) => s.replace(/[֑-ׇ]/g, '');
const wordsOf = (he) => he.replace(/[^א-תְ-ׇּׁׂ\s־]/g, '').split(/[\s־]+/).filter(Boolean);

function sentences() {
  const out = new Map();
  const walk = (o, from) => {
    if (Array.isArray(o)) { for (const x of o) walk(x, from); return; }
    if (!o || typeof o !== 'object') return;
    if (typeof o.he === 'string' && typeof o.en === 'string' && /[ְ-ּ]/.test(o.he) && !/[֑-֯]/.test(o.he) && !bare(o.he).includes(NAME) && !/\.\.\.|\u2026|_/.test(o.he + o.en)) {
      const w = wordsOf(o.he);
      if (w.length >= MIN_WORDS && w.length <= MAX_WORDS && !out.has(o.he)) out.set(o.he, { he: o.he, en: o.en.trim(), from, words: w.map(sameMarks) });
    }
    for (const v of Object.values(o)) walk(v, from);
  };
  for (const src of SOURCES) {
    if (src.endsWith('/')) { for (const f of readdirSync(new URL(src, ROOT)).filter((x) => x.endsWith('.json')).sort()) walk(rd(src + f), src + f); }
    else if (existsSync(new URL(src, ROOT))) walk(rd(src), src);
  }
  return [...out.values()];
}

/** Single words the tables show (joined phrases are split into their words). */
export function tableWords(d) {
  const set = new Set();
  for (const [tab] of TABS) for (const t of tablesFor(d, tab)) for (const row of t.rows) for (const c of row.cells) if (c.he) for (const w of wordsOf(c.he)) set.add(w);
  return [...set].sort();
}

export function build() {
  const d = rd('data/grammar/tables.json');
  const all = sentences().sort((a, b) => a.words.length - b.words.length || (a.he < b.he ? -1 : a.he > b.he ? 1 : 0));
  const words = {}; const used = new Map();
  for (const w of tableWords(d)) {
    const key = sameMarks(w);
    const hits = all.filter((s) => s.words.includes(key)).sort((a, b) => (used.get(a.he) || 0) - (used.get(b.he) || 0) || a.words.length - b.words.length).slice(0, PER_WORD);
    if (!hits.length) continue;
    for (const h of hits) used.set(h.he, (used.get(h.he) || 0) + 1);
    words[w] = hits.map((h) => ({ he: h.he, en: h.en }));
  }
  return { schema: 'alef-grammar-examples/1', note: 'Made by tools/grammar/examples.mjs. Sentences are copied whole from the lesson data; do not edit by hand.', sources: SOURCES, words };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = JSON.stringify(build(), null, 1) + '\n';
  const path = new URL(OUT, ROOT);
  if (process.argv.includes('--check')) { if (!existsSync(path) || readFileSync(path, 'utf8') !== text) { console.error(`${OUT} is out of date: run node tools/grammar/examples.mjs`); process.exit(1); } console.log(`${OUT} is up to date`); }
  else { writeFileSync(path, text); const b = JSON.parse(text); console.log(`${OUT}: ${Object.keys(b.words).length} table words with a lesson sentence, ${text.length} bytes`); }
}
