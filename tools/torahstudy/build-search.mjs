#!/usr/bin/env node
// data/torahstudy/search.json: the Torah search index (E5). Every verse of the app's Torah text (data/corpus/torah, the Leningrad
// Codex via UXLC) as letters only: vowel points and cantillation removed, maqaf as a space, final letters kept as written.
// Shape: { schema, books: [{ id, en, chapters: [[verse text, ...], ...] }] }. Fetched only when Torah Search opens.
//   node tools/torahstudy/build-search.mjs           write the file
//   node tools/torahstudy/build-search.mjs --check   exit 1 when it is stale
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT = 'data/torahstudy/search.json';
const rd = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
/** Letters and single spaces only. */
export const lettersOnly = (he) => String(he || '').normalize('NFD').replace(/[֑-ׇ]/g, (c) => (c === '־' ? ' ' : '')).replace(/[^א-ת ]/g, '').replace(/\s+/g, ' ').trim();

export function build() {
  const index = rd('data/corpus/torah/index.json');
  const books = index.books.map((b) => ({ id: b.id, en: b.en, chapters: Array.from({ length: b.chapters }, (_, i) => {
    const f = `data/corpus/torah/${b.id}/${String(i + 1).padStart(2, '0')}.json`;
    return fs.existsSync(path.join(ROOT, f)) ? rd(f).verses.map((v) => lettersOnly(v.he)) : [];
  }) }));
  return { schema: 'alef-torah-search/1', source: 'data/corpus/torah (Leningrad Codex, UXLC). Letters only; built by tools/torahstudy/build-search.mjs.', books };
}
const text = (o) => JSON.stringify(o) + '\n';
function main() {
  const out = build(), file = path.join(ROOT, OUT);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text(out)) { console.error(`${OUT} is stale: run node tools/torahstudy/build-search.mjs`); process.exit(1); }
    console.log(`${OUT} is current`); return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text(out));
  const verses = out.books.reduce((a, b) => a + b.chapters.reduce((x, c) => x + c.length, 0), 0);
  console.log(`${OUT}: ${verses} verses, ${fs.statSync(file).size} bytes`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
