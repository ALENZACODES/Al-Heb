import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { buildModel, buildHtml, teachingOrder, PAPERS, SCRIPTS } from '../tools/letters/workbook.mjs';

const read = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const letters = read('data/letters/letters.json');
const lessons = read('data/curriculum/lessons.json').lessons;
const count = (html, re) => (html.match(re) || []).length;

for (const script of Object.keys(SCRIPTS)) {
  test(`${script} workbook model: 27 letters in baby-step teaching order, 4 two-sound variant rows, 5 sofit rows`, () => {
    const m = buildModel(script);
    const rows = m.letterRows.filter((r) => r.kind === 'letter');
    assert.equal(rows.length, 27);
    const order = rows.map((r) => r.letterId);
    assert.deepEqual(order, teachingOrder(letters, lessons));
    // baby-step order: Shin, Bet first, then r01..r10 letter order (data/curriculum/lessons.json)
    assert.deepEqual(order.slice(0, 13), ['shin', 'bet', 'tav', 'lamed', 'mem-final', 'vav', 'yod', 'alef', 'he', 'resh', 'mem', 'kaf', 'kaf-final']);
    assert.deepEqual(order.slice().sort(), letters.map((l) => l.id).sort(), 'every letter exactly once');
    assert.notDeepEqual(order, letters.map((l) => l.id), 'no longer alphabet order');
    assert.deepEqual(m.letterRows.slice(0, 4).map((r) => r.label), ['Shin', 'Sin', 'Bet', 'Vet'], 'variant row follows its letter');
    assert.deepEqual(m.letterRows.filter((r) => r.kind === 'variant').map((r) => r.label), ['Sin', 'Vet', 'Khaf', 'Fe']);
    assert.deepEqual(rows.filter((r) => /sofit/.test(r.label)).map((r) => r.label), ['Mem sofit', 'Kaf sofit', 'Nun sofit', 'Pe sofit', 'Tsadi sofit'], 'sofit rows follow teaching order (mem-final is taught 5th, kaf-final 13th), not alphabet order');
    assert.equal(m.sections.reduce((a, s) => a + s.rows.length, 0), 31);
  });

  test(`${script} workbook model: gematria 1-400 for the 22 letters, finals 500-900 flagged as convention`, () => {
    const rows = buildModel(script).letterRows.filter((r) => r.kind === 'letter');
    const val = Object.fromEntries(rows.map((r) => [r.letterId, r]));
    const alpha = letters.map((l) => val[l.id]); // back in alphabet order, independent of the teaching order
    assert.deepEqual(alpha.slice(0, 22).map((r) => r.gematria), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400]);
    assert.ok(alpha.slice(0, 22).every((r) => !r.gematriaIsConvention));
    assert.deepEqual(alpha.slice(22).map((r) => r.gematria), [500, 600, 700, 800, 900]);
    assert.ok(alpha.slice(22).every((r) => r.gematriaIsConvention));
  });

  test(`${script} workbook model: word rows are pointed words that exist in data/curriculum/lessons.json`, () => {
    const m = buildModel(script);
    const inData = new Set(lessons.flatMap((l) => (l.words || []).map((w) => w.he + '|' + w.en)));
    assert.ok(m.wordRows.length >= 20);
    for (const w of m.wordRows) { assert.ok(inData.has(w.he + '|' + w.en), w.he); assert.match(w.he, /[ְ-ׇ]/); }
    assert.equal(m.sylRows.length, 8);
    assert.equal(m.confRows.length, script === 'cursive' ? 12 : 9);
  });

  for (const paper of Object.keys(PAPERS)) {
    test(`${script}/${paper} HTML: page structure, 27 letter rows, 4 variants, RTL-first model, notices`, () => {
      const { html, pages, pageCount } = buildHtml(script, paper);
      assert.equal(count(html, /<section class="page"/g), pageCount);
      assert.equal(pages[0], 'front');
      assert.equal(pages.filter((k) => k === 'strokeorder').length, 3, 'one stroke-order page per letter group');
      assert.equal(pages.indexOf('strokeorder'), 1);
      assert.equal(pages.indexOf('words'), 4, 'words follow the syllable page, ahead of the later letter sections');
      assert.equal(pages.indexOf('syllables'), 3, 'kamatz and first syllables right after the first nine letters (Shin, Bet first)');
      assert.equal(count(html, /data-letter-row="/g), 27);
      assert.equal(count(html, /data-variant-row="/g), 4);
      assert.equal(count(html, /data-confusable="/g), script === 'cursive' ? 12 : 9);
      assert.equal(count(html, /data-syllable="/g), 8);
      assert.ok(count(html, /data-word="/g) >= 20);
      assert.match(html, /Mem sofit \(<\/?span[^>]*>?\(?600\*|Mem sofit <span class="g">\(600\*\)/);
      assert.match(html, /DRAFT: stroke order not yet reviewed by a native teacher/);
      assert.match(html, /No\. <span>/); assert.match(html, /Date <span>/);
      assert.match(html, /3 times without looking/);
      // 27 progress-chart boxes on the front page
      assert.equal(count(html, /<span class="dots">/g), 27);
      // RTL: in each letter strip the first cell (the solid model) must be at the RIGHT end (x near 1000), repeats move left
      const strip = html.match(/data-letter-row="alef"[\s\S]*?<\/svg>/)[0];
      const xs = [...strip.matchAll(/<text x="([\d.]+)"/g)].map((m) => Number(m[1]));
      assert.ok(xs[0] > 950 && xs.every((x, i) => i === 0 || x < xs[i - 1]), 'cells run right to left: ' + xs.slice(0, 4));
      assert.match(strip, /fill="#000"/);
      assert.ok(count(strip, /fill="#b4b4b4"/g) === 5 && count(strip, /stroke-dasharray="1\.1 1\.9"/g) === 6, 'fade: 1 solid, 5 grey, 6 dotted, rest blank');
      assert.match(html, new RegExp(SCRIPTS[script].file.replace(/[[\]]/g, '\\$&')));
    });
  }
}

test('print workbook uses fewer/equal pages on A4 vs Letter is not assumed; both are within 10-16 pages', () => {
  for (const s of Object.keys(SCRIPTS)) for (const p of Object.keys(PAPERS)) { const n = buildHtml(s, p).pageCount; assert.ok(n >= 10 && n <= 16, `${s}/${p} ${n}`); }
});

test('generated PDFs (if present) match the manifest: size > 20 KB and page count equals the HTML page count', () => {
  const mpath = new URL('../docs/workbook/manifest.json', import.meta.url);
  if (!existsSync(mpath)) return; // PDFs are generated by `node tools/letters/workbook.mjs`; the HTML model tests above always run
  const m = JSON.parse(readFileSync(mpath, 'utf8'));
  assert.ok(m.files.length === 4 || m.files.length === 8, 'plain editions, plus 4 mnemonics editions when built with --mnemonics');
  for (const f of m.files) {
    const [, script, paper, mn] = f.id.match(/workbook-(\w+)-(\w+?)(-mnemonics)?$/);
    assert.equal(f.pages, buildHtml(script, paper, { mnemonics: !!mn }).pageCount, f.id);
    if (!f.pdf) continue;
    const p = new URL('../docs/workbook/' + f.pdf, import.meta.url);
    assert.ok(statSync(p).size > 20000, f.id);
    const pdf = readFileSync(p);
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length, f.pages, f.id + ' PDF page count');
    assert.ok(existsSync(new URL('../assets/workbook/' + f.pdf, import.meta.url)), 'asset copy ' + f.pdf);
  }
});

test('workbook --mnemonics: caption on every one of the 31 rows, none by default, captions have no Hebrew', () => {
  const plain = buildModel('print');
  assert.ok(plain.letterRows.every((r) => r.caption === undefined));
  assert.ok(!/class="cap"/.test(buildHtml('print', 'a4').html));
  const m = buildModel('print', { mnemonics: true });
  assert.equal(m.letterRows.length, 31);
  for (const r of m.letterRows) { assert.ok(r.caption && r.caption.length <= 60, r.label); assert.ok(!/[֐-׿]/.test(r.caption)); }
  const { html } = buildHtml('cursive', 'letter', { mnemonics: true });
  assert.equal(count(html, /class="cap"/g), 31);
  assert.match(html, /Memory hooks \(DRAFT\)/);
});
