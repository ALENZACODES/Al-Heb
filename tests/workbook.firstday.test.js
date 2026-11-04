import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { buildFirstDayModel, buildFirstDayHtml } from '../tools/letters/firstday_pages.mjs';
import { firstDayChapter, firstDayModel, FIRSTDAY_ID } from '../book/firstday/section.mjs';
import { PAPERS } from '../tools/letters/workbook.mjs';

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

test('generated first-day PDFs (if present): listed in assets/workbook/manifest.json with the real byte size and page count', () => {
  const mpath = new URL('../assets/workbook/manifest.json', import.meta.url);
  if (!existsSync(mpath)) return;
  const m = JSON.parse(readFileSync(mpath, 'utf8'));
  const mine = m.files.filter((f) => f.kind === 'firstday');
  if (!mine.length) return; // built by: node tools/letters/firstday_pages.mjs
  assert.equal(mine.length, 2);
  for (const f of mine) {
    const [, paper] = f.id.match(/firstday-(\w+)$/);
    assert.equal(f.pages, buildFirstDayHtml(paper).pageCount, f.id);
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
