import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { buildReadAloudModel, buildReadAloudHtml, splitLine, TRADITIONS, WORDS_PER_PHRASE } from '../tools/letters/readaloud_sheets.mjs';
import { buildFlashcardModel, buildFlashcardHtml, CARDS_PER_PAGE } from '../tools/letters/flashcard_sheets.mjs';
import { buildKeyModel, buildKeyHtml } from '../tools/letters/answer_key.mjs';
import { plan } from '../tools/letters/build_all_workbooks.mjs';
import { pdfPageCount, SET_ORDER } from '../tools/letters/workbook_manifest.mjs';
import { PAPERS } from '../tools/letters/workbook.mjs';

const read = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const count = (s, re) => (s.match(re) || []).length;
const NIQ = /[֑-ׇ]/g;

test('read-aloud: 30 pages, text verbatim from data/corpus (no new Hebrew), 3 traditions per phrase', () => {
  const m = buildReadAloudModel(); assert.equal(m.pages.length, 30);
  const raw = read('data/corpus/registry.json'); const reg = new Map((Array.isArray(raw) ? raw : raw.entries).map((e) => [e.id, e]));
  assert.deepEqual(m.groups.map((g) => g.key), ['shema', 'priestly', 'kiddush', 'hamotzi', 'modeh', 'adon', 'einkamocha']);
  for (const g of m.groups) {
    for (const e of g.entries) {
      const mine = g.phrases.filter((p) => p.entry === e.id).map((p) => p.he);
      assert.equal(mine.join(' '), e.he.split('\n').join(' '), 'phrases rejoin to the registry text: ' + e.id);
      assert.ok(reg.has(e.id));
    }
    for (const p of g.phrases) { assert.ok(p.he.split(' ').length <= WORDS_PER_PHRASE); for (const [t] of TRADITIONS) assert.match(p.say[t], /[a-z]/); }
  }
  const sh = m.groups[0].phrases.map((p) => p.say.israeli).join(' '); assert.match(sh, /adonai/);
  assert.match(m.groups[0].phrases.map((p) => p.say.ashkenazi).join(' '), /adonoy/);
  assert.deepEqual(splitLine('a b c d e'), ['a b c', 'd e']);
});
for (const paper of Object.keys(PAPERS)) test(`read-aloud ${paper} HTML: 30 sections, phrase boxes in 3 traditions, draft notice`, () => {
  const { html, pageCount, model } = buildReadAloudHtml(paper);
  assert.equal(pageCount, 30); assert.equal(count(html, /<section class="page"/g), 30);
  const n = model.groups.reduce((a, g) => a + g.phrases.length, 0);
  assert.equal(count(html, /data-phrase="/g), n);
  for (const [t] of TRADITIONS) assert.equal(count(html, new RegExp(`data-tradition="${t}"`, 'g')), n);
  assert.match(html, /DRAFT: texts verbatim from data\/corpus/); assert.ok(!/\bAI\b/.test(html));
  assert.match(html, /Ein Keloheinu<\/b> is not yet in the course/);
});

test('flashcards: all 5,000 words once, 12 per page, grouped by data/vocab/themes with an Other group; light variant = first 1,000', () => {
  const m = buildFlashcardModel(); const v = read('data/vocab/vocab5000.json').entries;
  assert.equal(m.total, 5000); const ranks = m.groups.flatMap((g) => g.cards.map((c) => c.rank));
  assert.equal(new Set(ranks).size, 5000); assert.deepEqual([...ranks].sort((a, b) => a - b), v.map((e) => e.rank).sort((a, b) => a - b));
  for (const g of m.groups) assert.deepEqual(g.cards.map((c) => c.rank), g.cards.map((c) => c.rank).slice().sort((a, b) => a - b), 'frequency order in ' + g.key);
  assert.ok(m.groups.some((g) => g.key === 'other') && m.themed > 4000);
  const heOf = new Map(v.map((e) => [e.rank, e.pointed || e.lemma])); for (const g of m.groups) for (const c of g.cards) assert.equal(c.he, heOf.get(c.rank));
  const light = buildFlashcardModel({ limit: 1000 }); assert.equal(light.total, 1000);
  const { pageCount, html } = buildFlashcardHtml('a4', { limit: 1000 });
  assert.equal(pageCount, 1 + light.groups.reduce((a, g) => a + Math.ceil(g.cards.length / CARDS_PER_PAGE), 0));
  assert.equal(count(html, /class="card" data-rank=/g), 1000);
  for (const sec of html.split('<section class="page"').slice(2)) assert.ok(count(sec, /class="card" data-rank=/g) <= 12);
  assert.match(html, /DRAFT: pointing, glosses/);
});

test('answer key: ladder 20, 27 letters, cursive + niqqud words match the sheets; both papers build', () => {
  const k = buildKeyModel(); assert.equal(k.firstday.ladder.length, 20); assert.equal(k.letters.length, 27);
  assert.equal(k.niqqud.length, 15); assert.ok(k.niqqud.every((s) => s.words.length === 6)); assert.equal(k.cursive.length, 27);
  for (const x of k.firstday.ladder) assert.ok(x.say && x.gloss);
  for (const paper of Object.keys(PAPERS)) { const { html, pageCount } = buildKeyHtml(paper); assert.equal(count(html, /<section class="page"/g), pageCount); assert.match(html, /TEACHER COPY, DRAFT/); assert.ok(!/\bAI\b/.test(html)); }
});

test('build_all plan runs every tool; flags drop core/cards', () => {
  const names = (a) => plan(a).map((s) => s.join(' '));
  assert.equal(plan([]).length, 10); assert.match(names([])[0], /^workbook\.mjs --mnemonics/);
  assert.equal(plan(['--skip-core', '--skip-cards']).length, 6);
  assert.ok(plan(['--html-only']).every((s) => s.includes('--html-only')));
  assert.ok(names([]).some((s) => s === 'flashcard_sheets.mjs --light'));
});

test('assets/workbook manifest (if built): every PDF in docs and assets, size and page count from disk, Author-only metadata, index lists all, under 31 MB', () => {
  const p = new URL('../assets/workbook/manifest.json', import.meta.url); if (!existsSync(p)) return;
  const m = JSON.parse(readFileSync(p, 'utf8')); const kinds = new Set(m.files.map((f) => f.kind).filter(Boolean));
  if (!kinds.has('answer-key')) return; // not built with build_all_workbooks.mjs
  for (const k of kinds) assert.ok(SET_ORDER.includes(k), k);
  assert.equal(m.files.filter((f) => !f.kind).length >= 4, true);
  const diskPdfs = readdirSync(new URL('../assets/workbook/', import.meta.url)).filter((f) => f.endsWith('.pdf')).sort();
  assert.deepEqual(m.files.map((f) => f.pdf).sort(), diskPdfs, 'manifest lists exactly the PDFs on disk');
  const index = readFileSync(new URL('../docs/workbook/index.html', import.meta.url), 'utf8'); let total = 0;
  for (const f of m.files) {
    const a = new URL('../assets/workbook/' + f.pdf, import.meta.url); const d = new URL('../docs/workbook/' + f.pdf, import.meta.url);
    assert.equal(statSync(a).size, f.bytes, f.pdf); assert.equal(statSync(d).size, f.bytes, 'docs copy ' + f.pdf);
    assert.equal(pdfPageCount(a), f.pages, f.pdf);
    const txt = readFileSync(a).toString('latin1'); assert.ok(!/\/Producer|\/Creator|\/CreationDate|\/Title/.test(txt), 'scrubbed: ' + f.pdf); assert.match(txt, /\/Author \(John Khan\)/);
    assert.ok(index.includes(`href="${f.pdf}"`), 'index lists ' + f.pdf); total += f.bytes;
  }
  assert.ok(total < 31 * 1048576, 'total ' + total);
});
