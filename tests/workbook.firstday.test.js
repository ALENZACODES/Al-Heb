import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { buildFirstDayModel, buildFirstDayHtml } from '../tools/letters/firstday_pages.mjs';
import { buildCursiveModel, buildCursiveHtml } from '../tools/letters/cursive_words.mjs';
import { buildNiqqudModel, buildNiqqudHtml, PER_SIGN, signMatcher } from '../tools/letters/niqqud_workbook.mjs';
import { firstDayChapter, firstDayModel, FIRSTDAY_ID } from '../book/firstday/section.mjs';
import { PAPERS } from '../tools/letters/workbook.mjs';
import { wordPool } from '../book/content.mjs';

const read = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const first10 = read('data/firstday/first10.json');
const ladder = read('data/firstday/ladder.json');
const count = (html, re) => (html.match(re) || []).length;
const NIQQUD = /[ְ-ׇ]/;

test('first-day model: 5 letters (+ mem sofit), 2 vowels, 3 words and the 20 ladder steps in 4 stages, all from data/firstday', () => {
  const m = buildFirstDayModel();
  assert.deepEqual(m.rows.filter((r) => !r.final).map((r) => r.id), first10.letters.map((l) => l.id));
  assert.deepEqual(m.rows.filter((r) => r.final).map((r) => r.id), ['mem-final']);
  assert.deepEqual(m.rows.map((r) => r.number), ['1', '2', '3', '4', '4b', '5']);
  for (const r of m.rows) { assert.ok(r.rec.print.strokes.length >= 1 && r.rec.cursive.strokes.length >= 1, r.id); assert.ok(r.ipa); }
  assert.deepEqual(m.vowels.map((v) => v.id), first10.vowels.map((v) => v.id));
  assert.deepEqual(m.words.map((w) => w.he), first10.words.map((w) => w.he));
  for (const w of m.words) { assert.match(w.he, NIQQUD); assert.equal(w.he.replace(/[֑-ׇ]/g, ''), w.bare); }
  assert.deepEqual(m.stages.map((s) => s.id), ladder.stages);
  assert.equal(m.stages.reduce((a, s) => a + s.steps.length, 0), 20);
  assert.deepEqual(m.stages.map((s) => s.steps.length), [6, 6, 6, 2]);
  for (const s of m.stages.slice(2).flatMap((st) => st.steps)) assert.ok(!NIQQUD.test(s.shown), 'unpointed stages show bare words: ' + s.n);
});

for (const paper of Object.keys(PAPERS)) {
  test(`first-day ${paper} HTML: 6 pages, print + cursive tracing rows, 3 big words, 20 ladder rows, draft notice, RTL strips`, () => {
    const { html, pages, pageCount } = buildFirstDayHtml(paper);
    assert.equal(pageCount, 6);
    assert.deepEqual(pages, ['front', 'letters-print', 'letters-cursive', 'vowels-words', 'ladder', 'ladder']);
    assert.equal(count(html, /<section class="page"/g), 6);
    assert.equal(count(html, /data-fd-letter="[^"]+" data-script="print"/g), 6);
    assert.equal(count(html, /data-fd-letter="[^"]+" data-script="cursive"/g), 6);
    assert.equal(count(html, /data-fd-vowel="/g), 2);
    assert.equal(count(html, /data-fd-word="/g), 3);
    assert.equal(count(html, /data-ladder-step="/g), 20);
    assert.equal(count(html, /aria-label="[^"]+ stroke order \(print\)"/g), 6);
    assert.equal(count(html, /aria-label="[^"]+ stroke order \(cursive\)"/g), 6);
    assert.ok(html.includes(first10.words[0].he) && html.includes(ladder.steps[19].shown));
    assert.match(html, /DRAFT: not reviewed by a Hebrew teacher/);
    assert.match(html, new RegExp(`size:${PAPERS[paper].css}`));
    assert.ok(!/\bAI\b/.test(html), 'no AI mentions');
    const strip = html.match(/data-fd-letter="shin" data-script="print"[\s\S]*?<\/svg>/)[0];
    const xs = [...strip.matchAll(/<text x="([\d.]+)"/g)].map((m) => Number(m[1]));
    assert.ok(xs[0] > 950 && xs.every((x, i) => i === 0 || x < xs[i - 1]), 'model at the right, repeats leftward');
    assert.match(strip, /font-family="WB-Print"/);
    assert.match(html.match(/data-fd-letter="shin" data-script="cursive"[\s\S]*?<\/svg>/)[0], /font-family="WB-Cursive"/);
  });
}

test('book chapter: first-day section with letters, vowels, words and the ladder; hooked into the book build', async () => {
  const m = firstDayModel();
  assert.equal(m.letters.length, 5); assert.equal(m.stages.length, 4);
  const sec = firstDayChapter({ 'letter-shin': 42 });
  assert.match(sec, new RegExp(`id="${FIRSTDAY_ID}"`));
  assert.match(sec, /DRAFT[^<]*not reviewed by a Hebrew teacher/);
  assert.match(sec, /\(p\. 42\)/);
  assert.equal(count(sec, /<tr><td>\d+<\/td><td class="he"/g), 20);
  for (const w of first10.words) assert.ok(sec.includes(w.he), w.id);
  const { buildHtml, parseArgs } = await import('../book/build.mjs');
  const html = buildHtml(parseArgs(['--no-qr']));
  assert.equal(count(html, new RegExp(`id="${FIRSTDAY_ID}"`, 'g')), 1);
  assert.match(html, new RegExp(`<li><a href="#${FIRSTDAY_ID}"`), 'contents line');
  assert.ok(html.indexOf(`id="${FIRSTDAY_ID}"`) < html.indexOf('id="ch-trad"'), 'chapter sits before the traditions page');
});

// ---- Stage 2: cursive words ----
const letters = read('data/letters/letters.json');
test('cursive words model: 27 letter forms in alphabet order, every word from the pool, starts/ends with the letter, bare form traced', () => {
  const m = buildCursiveModel();
  assert.deepEqual(m.map((b) => b.id), letters.map((l) => l.id));
  const pool = new Set(wordPool().map((w) => w.he));
  const FINAL = { 'kaf-final': 'ך', 'mem-final': 'ם', 'nun-final': 'ן', 'pe-final': 'ף', 'tsadi-final': 'ץ' };
  let total = 0;
  for (const b of m) {
    assert.ok(b.words.length <= 3 && b.strokes >= 1, b.id);
    total += b.words.length;
    for (const w of b.words) {
      assert.ok(pool.has(w.he), w.he); assert.match(w.he, NIQQUD); assert.ok(!NIQQUD.test(w.bare));
      if (FINAL[b.id]) assert.ok(w.bare.endsWith(FINAL[b.id]), `${b.id} ${w.bare}`); else assert.ok(w.bare.startsWith(b.glyph), `${b.id} ${w.bare}`);
      assert.ok(w.en && w.translit);
    }
  }
  assert.ok(total >= 70, 'words: ' + total);
  assert.ok(m.every((b) => b.words.length >= 1), 'every letter form has at least one word in the data');
});
for (const paper of Object.keys(PAPERS)) {
  test(`cursive words ${paper} HTML: front + 14 letter pages, 27 stroke boxes and letter rows, cursive strips, print reference, draft`, () => {
    const { html, pages, pageCount } = buildCursiveHtml(paper);
    assert.equal(pageCount, 15); assert.equal(pages[0], 'front'); assert.equal(pages.filter((k) => k === 'letters').length, 14);
    assert.equal(count(html, /data-cursive-letter="/g), 27);
    assert.equal(count(html, /data-cursive-letter-row="/g), 27);
    assert.equal(count(html, /stroke order \(cursive\)"/g), 27);
    assert.equal(count(html, /data-cursive-word="/g), buildCursiveModel().reduce((a, b) => a + b.words.length, 0));
    const row = html.match(/data-cursive-word="[^"]+"[\s\S]*?<\/svg>/)[0];
    assert.match(row, /font-family="WB-Cursive"/); assert.match(row, /class="he print ref"/);
    assert.match(html, /DRAFT: cursive stroke order not reviewed/);
    assert.ok(!/\bAI\b/.test(html));
  });
}

// ---- Stage 3: niqqud ----
const niq = read('data/pronunciation/niqqud.json').records;
test('niqqud model: every record of niqqud.json, 6 example words each that really contain the sign, from existing vocab only', () => {
  const m = buildNiqqudModel();
  assert.deepEqual(m.sections.map((s) => s.id), niq.map((r) => r.id));
  const src = read('data/curriculum/lessons.json').lessons.flatMap((l) => (l.words || []).map((w) => w.he)).concat(read('data/corpus/phrasebook.json').entries.map((e) => e.he), read('data/vocab/vocab5000.json').entries.map((e) => e.pointed));
  const known = new Set(src.filter(Boolean).map((h) => h.replace(/[?!.,׃\s]+$/g, '')));
  for (const s of m.sections) {
    assert.equal(s.words.length, PER_SIGN, s.id);
    const re = signMatcher(niq.find((r) => r.id === s.id));
    const bares = new Set();
    for (const w of s.words) {
      assert.match(w.he, re, `${s.id}: ${w.he}`); assert.ok(known.has(w.he), `${s.id}: ${w.he} not in course data`); assert.ok(w.en && w.translit);
      const bare = w.he.replace(/[֑-ׇ]/g, ''); assert.ok(!bares.has(bare), 'one spelling per sign'); bares.add(bare);
    }
    assert.ok(s.cells.length >= 1 && s.sound);
  }
  assert.ok(m.sections.find((s) => s.id === 'dagesh').words.every((w) => !/^וּ/.test(w.he)));
});
for (const paper of Object.keys(PAPERS)) {
  test(`niqqud ${paper} HTML: front + one page per sign, 6 word rows each, print strips, contents page numbers, draft`, () => {
    const { html, pages, pageCount } = buildNiqqudHtml(paper);
    assert.equal(pageCount, niq.length + 1); assert.deepEqual(pages.slice(1), niq.map(() => 'sign'));
    assert.equal(count(html, /data-niqqud="/g), niq.length);
    assert.equal(count(html, /data-niqqud-word="/g), niq.length * PER_SIGN);
    assert.match(html, /<td>page 2<\/td>/); assert.match(html, new RegExp(`<td>page ${niq.length + 1}</td>`));
    assert.match(html, /DRAFT: not reviewed by a Hebrew teacher; Israeli values only/);
    assert.ok(!/\bAI\b/.test(html));
  });
}

// ---- Stage 4: manifest, index page, PDFs ----
const BUILDERS = { firstday: (p) => buildFirstDayHtml(p), 'cursive-words': (p) => buildCursiveHtml(p), niqqud: (p) => buildNiqqudHtml(p) };
test('generated PDFs (if present): listed in assets/workbook/manifest.json with the real byte size, page count, docs copy, scrubbed metadata; index page lists them', () => {
  const mpath = new URL('../assets/workbook/manifest.json', import.meta.url);
  if (!existsSync(mpath)) return;
  const m = JSON.parse(readFileSync(mpath, 'utf8'));
  const mine = m.files.filter((f) => BUILDERS[f.kind]);
  if (!mine.length) return; // built by: node tools/letters/firstday_pages.mjs, cursive_words.mjs, niqqud_workbook.mjs
  assert.equal(mine.length, 6, 'three sets, A4 + Letter each');
  const ipath = new URL('../docs/workbook/index.html', import.meta.url);
  const index = existsSync(ipath) ? readFileSync(ipath, 'utf8') : '';
  for (const f of mine) {
    const [, paper] = f.id.match(/-(a4|letter)$/);
    assert.equal(f.pages, BUILDERS[f.kind](paper).pageCount, f.id);
    if (index) assert.ok(index.includes(`href="${f.pdf}"`), 'index page lists ' + f.pdf);
    const p = new URL('../assets/workbook/' + f.pdf, import.meta.url);
    assert.equal(statSync(p).size, f.bytes, f.id + ' bytes');
    const pdf = readFileSync(p);
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length, f.pages, f.id + ' PDF page count');
    assert.ok(existsSync(new URL('../docs/workbook/' + f.pdf, import.meta.url)), 'docs copy ' + f.pdf);
    const info = pdf.toString('latin1');
    assert.ok(!/\/Producer|\/Creator|\/CreationDate/.test(info), 'scrubbed metadata: ' + f.id);
    assert.match(info, /\/Author \(John Khan\)/);
  }
});
