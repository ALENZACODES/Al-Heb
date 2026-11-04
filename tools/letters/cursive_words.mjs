#!/usr/bin/env node
// Cursive (ktav yad) word workbook, A4 + US Letter: all 27 letter forms (22 letters + 5 finals) in alphabet order, each with its cursive
// stroke-order box (data/letters/letters.json, DRAFT), a cursive letter tracing row and up to 3 word-tracing rows. Words come from the
// existing vocabulary only (phrasebook + lesson words via book/content.mjs vocabFor: words that start with the letter, or end with it for
// a final form). Handwriting is normally unpointed, so the traced word is the bare cursive form; the pointed print form, transliteration and
// gloss sit in the row header as the reading reference.
//
// Usage: node tools/letters/cursive_words.mjs [--html-only]
// Output: docs/workbook/alef-cursive-words-<a4|letter>.pdf (+ html/), copied to assets/workbook/, merged into assets/workbook/manifest.json.
import { fileURLToPath } from 'node:url';
import { traceStrip, PAPERS, SCRIPTS } from './workbook.mjs';
import { readJson, esc, strokeCell, baseCss, wrapHtml, buildEditions, letterLabel, letterTier, bigTier, NIQQUD_RE } from './firstday_pages.mjs';
import { wordPool, vocabFor } from '../../book/content.mjs';

export const CURSIVE_DRAFT = 'DRAFT: cursive stroke order not reviewed by a native writer; words from the course data, not teacher-checked.';

/** Pure model: one block per letter form, in letters.json order. */
export function buildCursiveModel() {
  const letters = readJson('data/letters/letters.json');
  const pool = wordPool();
  return letters.map((l, i) => {
    const words = vocabFor(l.id, pool).map((w) => ({ he: w.he, bare: w.he.replace(NIQQUD_RE, ''), en: w.en, translit: w.translit, source: w.source, curated: w.curated }));
    return { id: l.id, number: i + 1, name: letterLabel(l), glyph: l.he, sound: l.sound.en || l.sound.ipa, ipa: l.sound.ipa, strokes: l.cursive.strokes.length, quality: l.cursive.quality, rec: l, words };
  });
}

function wordRow(w, j) {
  const n = 4; const len = w.bare.length; const size = Math.min(60, Math.round(210 / (len * 0.5 + 0.5)));
  const strip = traceStrip({ cells: [w.bare], n, family: SCRIPTS.cursive.family, tierOf: bigTier, size, base: 58, height: 76 });
  return `<div class="row wrow" data-cursive-word="${esc(w.bare)}"><div class="rh"><span class="box"></span><span class="num">${j + 1}</span><span class="he print ref">${esc(w.he)}</span><span class="nm"><i>${esc(w.translit)}</i>${w.curated ? '' : '*'} &middot; ${esc(w.en)}</span></div>${strip}</div>`;
}

function letterBlock(b) {
  const strip = traceStrip({ cells: [b.glyph], family: SCRIPTS.cursive.family, tierOf: letterTier, size: 48, base: 58, height: 80 });
  return `<div class="lblock" data-cursive-letter="${esc(b.id)}"><div class="lhead">${strokeCell(b.rec, 'cursive')}<span class="he print gl">${esc(b.glyph)}</span><span class="he cursive gl">${esc(b.glyph)}</span><div class="ltxt"><b>${b.number}. ${esc(b.name)}</b> &middot; ${esc(b.sound)} /${esc(b.ipa)}/<br/><span class="small">${b.strokes} cursive stroke${b.strokes > 1 ? 's' : ''} (${esc(b.quality)}); print form on the left, handwritten form on the right.</span>${b.words.length ? '' : '<br/><span class="small">No pointed word for this form in the course data yet.</span>'}</div></div>
<div class="row" data-cursive-letter-row="${esc(b.id)}"><div class="rh"><span class="box" aria-label="tick when done"></span><span class="nm">Write the letter</span><span class="ipa">/${esc(b.ipa)}/</span></div>${strip}</div>${b.words.map(wordRow).join('')}</div>`;
}

/** Full HTML + page kinds. Two letter blocks per page. @param {'a4'|'letter'} paperId */
export function buildCursiveHtml(paperId) {
  const paper = PAPERS[paperId]; const model = buildCursiveModel();
  const css = baseCss(paper) + `
.lblock{break-inside:avoid;margin-bottom:4mm;padding-top:1mm;border-top:.3mm solid #000}
.lhead{display:flex;align-items:center;gap:4mm;height:27mm;margin-bottom:1mm}.lhead svg.so{width:25mm;height:25mm;flex:none}
.gl{font-size:30pt;line-height:1;min-width:14mm;text-align:center}.ltxt{font-size:9.5pt;line-height:1.3}
.row{height:21.5mm}.row.wrow{height:19.5mm}.ref{font-size:14pt;min-width:22mm;text-align:right;line-height:1}
.rh .nm i{color:#333}
`;
  const pages = [];
  pages.push({ kind: 'front', title: 'Start here', fields: true, body: `<h1>Write Hebrew by hand: cursive words</h1>
<p>Israelis write by hand in <b>ktav yad</b> (cursive), which looks different from the printed letters you read. This workbook gives every one of the 27 letter forms (22 letters and 5 final forms) a handwriting row and up to three real words to copy, in alphabet order.</p>
<h2>How to use it</h2><ol><li>Look at the stroke box: the numbered circle is where a stroke starts, the arrowhead where it ends.</li>
<li>Trace the letter row from the <b>right</b>: solid, then grey, then dotted, then write it alone.</li>
<li>Each word row shows the pointed printed word (how you read it), its sound and meaning, then the handwritten word to trace. Handwriting is usually written <b>without</b> vowel signs, so the traced word has none.</li>
<li>Tick the box when you can write the word without looking.</li></ol>
<div class="notice"><b>${esc(CURSIVE_DRAFT)}</b> Cursive shapes come from the font Gveret Levin (SIL OFL 1.1); real handwriting joins and varies. Words marked * have a machine-made transliteration (Israeli, siddur style) that no native speaker has checked. ${model.filter((b) => !b.words.length).length ? `Letter forms with no word in the course data yet: ${model.filter((b) => !b.words.length).map((b) => b.name).join(', ')}.` : 'Every letter form has at least one word.'}</div>
<h2>Contents</h2><p class="small">${model.map((b) => `${b.number}. ${esc(b.name)} (${b.words.length})`).join(' &middot; ')}</p>` });
  for (let i = 0; i < model.length; i += 2) {
    const pair = model.slice(i, i + 2);
    pages.push({ kind: 'letters', title: pair.map((b) => b.name).join(' and '), fields: true, body: pair.map(letterBlock).join('') });
  }
  const html = wrapHtml({ title: `ALEF cursive words workbook (${paper.label})`, css, pages, set: 'Cursive words', draft: CURSIVE_DRAFT });
  return { html, pages: pages.map((p) => p.kind), pageCount: pages.length, model };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await buildEditions({ builder: buildCursiveHtml, name: 'alef-cursive-words', kind: 'cursive-words', label: 'Cursive words', htmlOnly: process.argv.includes('--html-only') });
}
