#!/usr/bin/env node
// Single source of truth for assets/workbook/manifest.json (+ docs/workbook/index.html), built from the PDFs on disk, so no workbook tool
// has to be re-run just to repair the manifest.
//   core entries  : docs/workbook/manifest.json (written by tools/letters/workbook.mjs; has exactly the alef-workbook-* files)
//   extra entries : docs/workbook/extras-manifest.json (sidecar written by firstday_pages.mjs buildEditions for every extra set)
// For each entry the PDF must exist in docs/workbook/; it is copied to assets/workbook/ when missing or different, `bytes` is its size on disk
// and `pages` is checked against the PDF's own page count. Entries whose PDF is absent are dropped (and reported).
// Usage: node tools/letters/workbook_manifest.mjs
import { readFileSync, writeFileSync, existsSync, statSync, copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOCS = join(root, 'docs', 'workbook'); const ASSETS = join(root, 'assets', 'workbook');
const readJson = (p, d) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : d);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const SET_ORDER = ['firstday', 'cursive-words', 'niqqud', 'readaloud', 'flashcards', 'flashcards-light', 'flashcards-letters', 'memory-chain', 'answer-key'];
const SET_TITLE = { firstday: 'First 10 minutes', 'cursive-words': 'Cursive words (27 letter forms)', niqqud: 'Vowel signs (niqqud)', readaloud: 'Read-aloud practice (Siddur phrases)', flashcards: 'Vocabulary flashcards (5,000 words, cut-out cards)', 'flashcards-light': 'Vocabulary flashcards, lighter variant (first 1,000 words)', 'flashcards-letters': 'Letter flashcards (27 cut-out cards, memory chain)', 'memory-chain': 'Memory chain poster (one page, 27 letters)', 'answer-key': 'Teacher answer key' };

/** Count pages in a PDF without a PDF library: /Type /Page objects (not /Pages). */
export const pdfPageCount = (file) => (readFileSync(file).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;

/** Add/replace entries in the extras sidecar (called by every extra-set tool). */
export function recordExtras(entries) {
  const p = join(DOCS, 'extras-manifest.json'); mkdirSync(DOCS, { recursive: true });
  const cur = readJson(p, { files: [] }); const ids = new Set(entries.map((e) => e.id));
  const files = cur.files.filter((f) => !ids.has(f.id)).concat(entries.map(({ bytes, html, ...e }) => e));
  writeFileSync(p, JSON.stringify({ files }, null, 1));
}

export function buildIndexHtml(m) {
  const kb = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB');
  const label = (f) => (f.kind ? f.script : `${f.script === 'print' ? 'Print letters' : 'Cursive letters'}${f.mnemonics ? ', with memory hooks' : ''}`);
  const sets = [['workbook', 'Letter workbook (print and cursive, with or without memory hooks)', (f) => !f.kind]].concat(SET_ORDER.map((k) => [k, SET_TITLE[k], (f) => f.kind === k]));
  const rows = sets.map(([id, title, pick]) => { const fs = m.files.filter(pick); return fs.length ? `<h2 id="${id}">${esc(title)}</h2><table><thead><tr><th>File</th><th>Edition</th><th>Paper</th><th>Pages</th><th>Size</th></tr></thead><tbody>${fs.map((f) => `<tr><td><a href="${esc(f.pdf)}">${esc(f.pdf)}</a></td><td>${esc(label(f))}</td><td>${esc(f.paper)}</td><td>${f.pages}</td><td>${kb(f.bytes)}</td></tr>`).join('')}</tbody></table>` : ''; }).join('');
  const total = m.files.reduce((a, f) => a + f.bytes, 0);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Aleph printable workbooks</title><style>body{font-family:system-ui,sans-serif;max-width:52em;margin:2em auto;padding:0 1em;color:#111}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ccc;padding:.35em .5em;text-align:left}th{font-size:.85em}.notice{border:2px solid #000;padding:.6em .9em;margin:1em 0}</style></head><body>
<h1>Aleph printable workbooks</h1><p>${m.files.length} PDF files (${kb(total)} in all), A4 and US Letter. Print at 100% ("Actual size"), single-sided. This list mirrors assets/workbook/manifest.json and is rebuilt by tools/letters/workbook_manifest.mjs.</p>
<div class="notice"><b>${esc(m.status)}.</b> Every set is a draft: stroke order, pointing, example words and transliterations have not been reviewed by a Hebrew teacher, and nothing has been tested with learners. Fonts: ${esc(m.fonts)}.</div>${rows}
<p><small>HTML sources are in html/. Each PDF carries only an Author field in its metadata (book/pdf_tools.py scrub).</small></p></body></html>`;
}

export function mergeAll({ quiet = false } = {}) {
  mkdirSync(ASSETS, { recursive: true });
  const core = readJson(join(DOCS, 'manifest.json'), { files: [] });
  const extras = readJson(join(DOCS, 'extras-manifest.json'), { files: [] }).files;
  const ordered = extras.slice().sort((a, b) => SET_ORDER.indexOf(a.kind) - SET_ORDER.indexOf(b.kind) || a.id.localeCompare(b.id));
  const files = []; const problems = [];
  for (const e of core.files.map(({ html, ...x }) => x).concat(ordered)) {
    const src = join(DOCS, e.pdf);
    if (!existsSync(src)) { problems.push(`missing PDF ${e.pdf}: entry dropped`); continue; }
    const dst = join(ASSETS, e.pdf);
    if (!existsSync(dst) || statSync(dst).size !== statSync(src).size || !readFileSync(dst).equals(readFileSync(src))) copyFileSync(src, dst);
    const pages = pdfPageCount(src);
    if (pages !== e.pages) problems.push(`${e.pdf}: manifest says ${e.pages} pages, PDF has ${pages}; using the PDF`);
    files.push({ ...e, pages, bytes: statSync(dst).size });
  }
  const m = { generated: new Date().toISOString().slice(0, 10), status: core.status || 'DRAFT: not reviewed by a native teacher', fonts: core.fonts || 'Frank Ruhl Libre, Gveret Levin (SIL OFL 1.1)', files };
  writeFileSync(join(ASSETS, 'manifest.json'), JSON.stringify(m, null, 1));
  writeFileSync(join(DOCS, 'index.html'), buildIndexHtml(m));
  if (!quiet) { for (const p of problems) console.warn('WARN', p); console.log(`manifest: ${files.length} PDFs, ${(files.reduce((a, f) => a + f.bytes, 0) / 1048576).toFixed(1)} MB total`); }
  return { manifest: m, problems };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) mergeAll();
