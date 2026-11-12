#!/usr/bin/env node
// data/books/words.json: what the little books' difficulty labels (E1) and new-word marks (E2) need, built from the app's own data.
//   per book: running Hebrew words (tokens), different words (distinct letter spellings), and how often each spelling occurs;
//   cards: the review-card ids (lesson word cards word:<lesson>:<n>, dictionary cards vocab:<id>) whose spelling occurs in a book,
//          with that spelling, so the shelf can count the words a learner knows without loading the whole dictionary;
//   gloss: for each pointed book word the dictionary matches (the conservative pointed match of src/sprint/model.js buildIndex),
//          its English, its dictionary id and its Israeli word clip ids (from data/vocab/clip-lookup.json), for the tap card.
// Nothing here is reviewed: the dictionary is a machine-built draft (proofread:false). Words the dictionary does not match get
// no gloss, and the book page says so.
//   node tools/books/build-book-words.mjs           write the file
//   node tools/books/build-book-words.mjs --check   exit 1 when it is stale
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT = 'data/books/words.json';
const rd = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const TIERS = [500, 1000, 2000, 5000];

export async function build() {
  const { strip, tokens } = await import(pathToFileURL(path.join(ROOT, 'src/knownwords/validate.js')).href);
  const { buildIndex, pointedKey } = await import(pathToFileURL(path.join(ROOT, 'src/sprint/model.js')).href);
  const { clipKey } = await import(pathToFileURL(path.join(ROOT, 'src/vocab/clips.js')).href).catch(() => ({ clipKey: (t) => String(t).normalize('NFC') }));
  const shelf = rd('data/books/index.json').books;
  const books = {}, allKeys = new Set(), pointedTokens = new Set();
  for (const b of shelf) {
    const data = rd(`data/books/${b.id}.json`);
    const counts = {};
    let n = 0;
    for (const p of data.pages || []) for (const t of tokens(p.he)) { const k = strip(t); if (!k) continue; n++; counts[k] = (counts[k] || 0) + 1; allKeys.add(k); pointedTokens.add(pointedKey(t)); }
    books[b.id] = { words: n, unique: Object.keys(counts).length, counts };
  }
  // spellings a card may stand for: a book word itself, or a book word with one or two prefix letters taken off
  const PREFIXES = 'והבכלמש';
  const reach = new Set(allKeys);
  for (const k of allKeys) for (let i = 1; i <= 2 && k.length - i >= 2; i++) { if (![...k.slice(0, i)].every((c) => PREFIXES.includes(c))) break; reach.add(k.slice(i)); }
  const cards = {};
  const addCard = (id, he) => { const ks = String(he || '').split(/[\s־]+/).map(strip).filter((k) => k && reach.has(k)); if (ks.length) cards[id] = [...new Set([...(cards[id] || []), ...ks])]; };
  for (const l of rd('data/curriculum/lessons.json').lessons) (l.words || []).forEach((w, i) => addCard(`word:${l.id}:${i + 1}`, w.he));
  const entries = TIERS.flatMap((t) => { const j = rd(`data/vocab/packs/vocab5k-tier-${t}.json`); return j.entries || j.words || []; });
  for (const e of entries) { if (e.isForm) continue; addCard('vocab:' + e.id, e.lemma); for (const f of e.forms || []) addCard('vocab:' + e.id, f.he); }
  // gloss for the tap card
  const index = buildIndex(entries);
  let lookup = null; try { lookup = rd('data/vocab/clip-lookup.json'); } catch { lookup = null; }
  const gloss = {};
  for (const pk of [...pointedTokens].sort()) {
    const e = index.find(pk); if (!e) continue;
    const row = lookup?.clips?.[clipKey(e.pointed)] || {};
    const clip = {}; for (const v of ['f', 'm']) if (row[`${v}|israeli`]?.id && row[`${v}|israeli`].status !== 'missing') clip[v] = row[`${v}|israeli`].id;
    gloss[pk] = { id: e.id, he: e.pointed, en: e.gloss, ...(Object.keys(clip).length ? { clip } : {}) };
  }
  return { schema: 'alef-book-words/1', note: 'Built by tools/books/build-book-words.mjs from data/books, data/curriculum/lessons.json and the vocabulary list (a machine-built draft, not reviewed). Counts are of Hebrew word occurrences on the pages; matching ignores vowel points.', books, cards, gloss };
}

const text = (o) => JSON.stringify(o) + '\n';
async function main() {
  const out = await build();
  const file = path.join(ROOT, OUT);
  if (process.argv.includes('--check')) {
    const now = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (now !== text(out)) { console.error(`${OUT} is stale: run node tools/books/build-book-words.mjs`); process.exit(1); }
    console.log(`${OUT} is current`); return;
  }
  fs.writeFileSync(file, text(out));
  console.log(`${OUT}: ${Object.keys(out.books).length} books, ${Object.keys(out.cards).length} review cards, ${Object.keys(out.gloss).length} glossed words, ${fs.statSync(file).size} bytes`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
