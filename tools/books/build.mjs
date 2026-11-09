#!/usr/bin/env node
// Build the little books 6 to 62 from tools/books/source/books-6-62.txt.
// Writes data/books/bookN.json, updates data/books/index.json, and writes the
// docs under docs/books/ (compendium, image prompt CSV, recording script CSV).
// Usage: node tools/books/build.mjs [--check]   (--check: exit 1 if outputs differ)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = resolve(ROOT, 'tools/books/source/books-6-62.txt');
const CHECK = process.argv.includes('--check');
const BAND_LEVEL = { A: 'Beginner 1', B: 'Beginner 2', C: 'Beginner 3' };
const BAND_WORDS = { A: '2 to 3 words a page', B: '3 to 5 words a page', C: '4 to 6 words a page, sometimes two short sentences' };

const pad = (n) => String(n).padStart(2, '0');
const books = [];
let cur = null;
for (const raw of readFileSync(SRC, 'utf8').split('\n')) {
  const line = raw.trim();
  if (!line || line.startsWith('#') && !line.startsWith('##')) continue;
  if (line.startsWith('## ')) {
    const [id, titleHe, titleTranslit, titleEn, band] = line.slice(3).split('|').map((s) => s.trim());
    cur = { id, titleHe, titleTranslit, titleEn, band, pages: [] };
    books.push(cur);
    continue;
  }
  const parts = line.split('|').map((s) => s.trim());
  if (parts.length !== 4) throw new Error(`bad page line in ${cur?.id}: ${line}`);
  const [he, translit, en, illustration] = parts;
  const n = cur.pages.length + 1;
  const num = cur.id.replace('book', '');
  cur.pages.push({
    n, he, translit, en,
    img: `assets/books/${cur.id}/BOOK${num}_p${pad(n)}.jpg`,
    audio: { f: `audio/f/israeli/book/${cur.id}-p${pad(n)}.mp3`, m: `audio/m/israeli/book/${cur.id}-p${pad(n)}.mp3` },
    illustration,
    hasImg: false, hasAudio: false,
  });
}
for (const b of books) if (b.pages.length !== 12) throw new Error(`${b.id} has ${b.pages.length} pages, expected 12`);

let changed = 0;
function out(rel, text) {
  const p = resolve(ROOT, rel);
  if (existsSync(p) && readFileSync(p, 'utf8') === text) return;
  changed++;
  if (CHECK) { console.error(`stale: ${rel}`); return; }
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, text);
}

// Per-book JSON. hasImg / hasAudio are set from the files that exist on disk, so the
// view can show "Pictures coming" until the pictures and voices are actually pushed.
for (const b of books) {
  for (const p of b.pages) {
    p.hasImg = existsSync(resolve(ROOT, p.img));
    p.hasAudio = existsSync(resolve(ROOT, p.audio.f)) && existsSync(resolve(ROOT, p.audio.m));
  }
  const json = { id: b.id, titleHe: b.titleHe, titleTranslit: b.titleTranslit, titleEn: b.titleEn, level: BAND_LEVEL[b.band], pages: b.pages };
  out(`data/books/${b.id}.json`, JSON.stringify(json, null, 1) + '\n');
}

// index.json: keep books 1 to 5 as they are, replace or append 6 to 62.
const indexPath = resolve(ROOT, 'data/books/index.json');
const index = JSON.parse(readFileSync(indexPath, 'utf8'));
const kept = index.books.filter((e) => !books.some((b) => b.id === e.id));
for (const b of books) {
  const pictured = b.pages.filter((p) => p.hasImg).length;
  const voiced = b.pages.filter((p) => p.hasAudio).length;
  kept.push({
    id: b.id, titleHe: b.titleHe, titleTranslit: b.titleTranslit, titleEn: b.titleEn,
    level: BAND_LEVEL[b.band], pageCount: 12,
    hasImages: pictured === 12, hasAudio: voiced === 12, picturedPages: pictured, audioPages: voiced,
  });
}
kept.sort((a, b) => Number(a.id.replace('book', '')) - Number(b.id.replace('book', '')));
out('data/books/index.json', JSON.stringify({ ...index, books: kept }, null, 1) + '\n');

// Compendium: every page in Hebrew, phonetic English and English.
const md = [];
md.push('# Aleph little books 6 to 62');
md.push('');
md.push('57 original beginner readers for adult learners: 12 pages each, one short sentence a page, adult subjects (coffee, work, the bank, a first date, a night shift, moving house). Hebrew with vowel points, a phonetic English line and a translation for every page. Generated from `tools/books/source/books-6-62.txt` by `node tools/books/build.mjs`; edit the source, not this file.');
md.push('');
md.push('**Draft.** No native speaker, teacher or cantor has reviewed the Hebrew, the vowel points or the transliteration. The stories are original; none is a translation of an existing book.');
md.push('');
md.push('| # | Hebrew title | Phonetic | English | Level |');
md.push('| --- | --- | --- | --- | --- |');
for (const b of books) md.push(`| ${b.id.replace('book', '')} | ${b.titleHe} | ${b.titleTranslit} | ${b.titleEn} | ${BAND_LEVEL[b.band]} (${BAND_WORDS[b.band]}) |`);
md.push('');
for (const b of books) {
  md.push(`## ${b.id.replace('book', '')}. ${b.titleHe} · ${b.titleTranslit} · ${b.titleEn}`);
  md.push('');
  md.push(`Level: ${BAND_LEVEL[b.band]}. Pictures: \`assets/books/${b.id}/\`. Voices: \`audio/{m,f}/israeli/book/${b.id}-pNN.mp3\`.`);
  md.push('');
  md.push('| Page | Hebrew | Phonetic | English |');
  md.push('| --- | --- | --- | --- |');
  for (const p of b.pages) md.push(`| ${p.n} | ${p.he} | ${p.translit} | ${p.en} |`);
  md.push('');
}
out('docs/books/BOOKS-6-62.md', md.join('\n'));

// Image prompt CSV for the picture run: one row per page, with the exact output path.
const csvq = (s) => `"${String(s).replace(/"/g, '""')}"`;
const img = [['book', 'page', 'output_path', 'title_en', 'scene', 'hebrew_on_page', 'english_on_page'].join(',')];
for (const b of books) for (const p of b.pages) img.push([b.id, p.n, p.img, b.titleEn, p.illustration, p.he, p.en].map(csvq).join(','));
out('docs/books/image-prompts-6-62.csv', img.join('\n') + '\n');

// Recording script CSV: one row per page per voice, with the exact output path.
const rec = [['clip_id', 'voice', 'output_path', 'hebrew', 'phonetic', 'english', 'book_title_he'].join(',')];
for (const b of books) for (const p of b.pages) for (const v of ['m', 'f']) {
  rec.push([`${b.id}-p${pad(p.n)}`, v === 'm' ? 'man (Ari)' : 'woman (Noa)', p.audio[v], p.he, p.translit, p.en, b.titleHe].map(csvq).join(','));
}
out('docs/books/recording-script-6-62.csv', rec.join('\n') + '\n');

const pages = books.length * 12;
if (CHECK) {
  if (changed) { console.error(`${changed} generated file(s) out of date; run node tools/books/build.mjs`); process.exit(1); }
  console.log(`books 6-62 outputs current: ${books.length} books, ${pages} pages`);
} else {
  console.log(`built ${books.length} books, ${pages} pages; ${changed} file(s) written`);
}
