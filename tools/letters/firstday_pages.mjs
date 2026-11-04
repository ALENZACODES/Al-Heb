#!/usr/bin/env node
// Printable "First 10 minutes" pages (A4 + US Letter PDFs): the 5 letters, 2 vowel signs and 3 words of data/firstday/first10.json as
// tracing rows (print and cursive, stroke data from data/letters/letters.json, the same data the main workbook uses), the three words large
// with niqqud, and the 20-step pointed -> unpointed ladder of data/firstday/ladder.json as 4 stages with an answer key.
//
// Usage: node tools/letters/firstday_pages.mjs [--html-only]
// Output: docs/workbook/alef-firstday-<a4|letter>.pdf (+ html/ sources), copied to assets/workbook/, entries merged into
//         assets/workbook/manifest.json (see docs/workbook/FIRSTDAY-PAGES.md). docs/workbook/manifest.json is NOT touched: it belongs to workbook.mjs.
// Dev tooling: Playwright (Chromium) for the PDF step only; buildFirstDayModel()/buildFirstDayHtml() are pure and unit-tested.
// Every PDF is scrubbed by book/pdf_tools.py scrub (Author "John Khan" only). Shared helpers (page CSS, PDF rendering, manifest merge) are
// exported for tools/letters/cursive_words.mjs and tools/letters/niqqud_workbook.mjs.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, statSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { traceStrip, PAPERS, SCRIPTS } from './workbook.mjs';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const readJson = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const NIQQUD_RE = /[֑-ׇ]/g;
export const DRAFT = 'DRAFT: not reviewed by a Hebrew teacher; Israeli pronunciation only; not tested with learners.';
export const FONTS_NOTE = 'Fonts: Frank Ruhl Libre (print) / Gveret Levin (cursive), SIL OFL 1.1.';

const SOFIT = { 'kaf-final': 'Kaf sofit', 'mem-final': 'Mem sofit', 'nun-final': 'Nun sofit', 'pe-final': 'Pe sofit', 'tsadi-final': 'Tsadi sofit' };
export const letterLabel = (l) => SOFIT[l.id] || l.name;

// ---------------------------------------------------------------- shared SVG / page pieces
/** Stroke-order box (numbered start circle, arrowhead at the end of each stroke) from letters.json stroke data. */
export function strokeCell(letter, script) {
  const b = letter[script];
  const parts = [`<rect x="3" y="3" width="994" height="994" fill="#fff" stroke="#888" stroke-width="5"/>`];
  if (b.outline) parts.push(`<path d="${b.outline}" fill="#e6e6e6"/>`);
  b.strokes.forEach((s, i) => {
    const m = s.median; const e = m[m.length - 1];
    let k = m.length - 1; while (k > 0 && Math.hypot(m[k][0] - e[0], m[k][1] - e[1]) < 45) k--;
    const a = Math.atan2(e[1] - m[k][1], e[0] - m[k][0]); const L = 55;
    const p1 = [e[0] - L * Math.cos(a - 0.5), e[1] - L * Math.sin(a - 0.5)], p2 = [e[0] - L * Math.cos(a + 0.5), e[1] - L * Math.sin(a + 0.5)];
    parts.push(`<path d="${s.path}" fill="none" stroke="#111" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`);
    parts.push(`<polygon points="${e[0]},${e[1]} ${p1[0].toFixed(0)},${p1[1].toFixed(0)} ${p2[0].toFixed(0)},${p2[1].toFixed(0)}" fill="#111"/>`);
    parts.push(`<circle cx="${m[0][0]}" cy="${m[0][1]}" r="38" fill="#fff" stroke="#111" stroke-width="8"/><text x="${m[0][0]}" y="${m[0][1] + 18}" text-anchor="middle" font-size="52" font-weight="bold" font-family="sans-serif">${i + 1}</text>`);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" class="so" role="img" aria-label="${esc(letter.name)} stroke order (${script})">${parts.join('')}</svg>`;
}

export const letterTier = (i) => (i === 0 ? 'solid' : i <= 5 ? 'grey' : i <= 11 ? 'dotted' : 'blank');
/** A few big cells: solid, grey, dotted, then blank. */
export const bigTier = (i) => (i === 0 ? 'solid' : i === 1 ? 'grey' : i === 2 ? 'dotted' : 'blank');

/** Common CSS for every extra workbook (same page geometry as tools/letters/workbook.mjs so the sets print alike). */
export function baseCss(paper) {
  return `
@font-face{font-family:WB-Print;src:url("../../../assets/fonts/${SCRIPTS.print.file}")}
@font-face{font-family:WB-Cursive;src:url("../../../assets/fonts/${SCRIPTS.cursive.file}")}
@page{size:${paper.css};margin:0}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,"Helvetica Neue",Arial,sans-serif;color:#000;background:#fff}
.page{width:${paper.w}mm;height:${paper.h - 0.6}mm;padding:11mm 14mm 9mm;page-break-after:always;overflow:hidden;position:relative}
.page:last-child{page-break-after:auto}
.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:.4mm solid #000;padding-bottom:1.5mm;margin-bottom:3mm;font-size:9pt}
.hd b{font-size:11pt}.hd .fields{display:flex;gap:6mm}.hd .fields span{display:inline-block;min-width:26mm;border-bottom:.3mm solid #000;text-align:left}
.ft{position:absolute;left:14mm;right:14mm;bottom:5mm;font-size:6.5pt;color:#444;display:flex;justify-content:space-between;gap:4mm}.ft span:last-child{white-space:nowrap}
.row{height:21.5mm;break-inside:avoid}
.rh{display:flex;align-items:center;gap:2.2mm;height:5.6mm;font-size:9.5pt;direction:ltr}
.box{width:4mm;height:4mm;border:.4mm solid #000;display:inline-block;flex:none}
.num{font-weight:bold;min-width:6mm}.g{color:#444;font-size:8.5pt}.ipa{margin-left:auto;color:#444;font-size:8pt}
.hint{margin-left:2mm;font-size:6.8pt;line-height:1.15;color:#333;max-width:125mm}
.strip{display:block;width:100%;height:auto}
h1{font-size:22pt;margin:0 0 2mm}h2{font-size:13pt;margin:3.5mm 0 1.5mm}h3{font-size:10.5pt;margin:3mm 0 1mm}p,li{font-size:9.5pt;line-height:1.35;margin:1.2mm 0}
.notice{border:.5mm solid #000;padding:2.5mm 3mm;margin:3mm 0;font-size:9pt}
.he{direction:rtl;unicode-bidi:isolate}.print{font-family:WB-Print}.cursive{font-family:WB-Cursive}
.so-grid{display:grid;gap:3mm;direction:rtl;margin:2mm 0 3mm}
.so-cell{direction:ltr;text-align:center;font-size:8pt}.so-cell svg{width:100%;height:auto;aspect-ratio:1/1;display:block}.so-cell .he{font-size:16pt;display:block;line-height:1.1}
.small{font-size:7.5pt;color:#444}
`;
}

export function pageShell({ title, body, n, total, fields = true, set = 'workbook', draft = DRAFT }) {
  return `<section class="page" data-page="${n}"><div class="hd"><span><b>ALEF</b> &middot; ${esc(set)} &middot; ${esc(title)}</span>${fields ? '<span class="fields">No. <span>&nbsp;</span> Date <span>&nbsp;</span></span>' : ''}</div>${body}<div class="ft"><span>${esc(draft)} ${esc(FONTS_NOTE)}</span><span>${n} / ${total}</span></div></section>`;
}

export function wrapHtml({ title, css, pages, set, draft }) {
  const total = pages.length;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${pages.map((p, i) => pageShell({ title: p.title, body: p.body, n: i + 1, total, fields: p.fields, set, draft })).join('')}</body></html>`;
}

// ---------------------------------------------------------------- First 10 minutes: model
/** Pure data model: letters (with stroke data for both scripts), vowels, words and ladder stages. */
export function buildFirstDayModel() {
  const f = readJson('data/firstday/first10.json');
  const ladder = readJson('data/firstday/ladder.json');
  const letters = readJson('data/letters/letters.json');
  const byId = Object.fromEntries(letters.map((l) => [l.id, l]));
  const rows = [];
  f.letters.forEach((L, i) => {
    const rec = byId[L.id]; if (!rec) throw new Error('first10 letter not in letters.json: ' + L.id);
    rows.push({ id: L.id, label: letterLabel(rec), glyph: L.he, sound: L.sound, ipa: rec.sound.ipa, rec, number: String(i + 1), final: false });
    if (L.finalForm) { // the final form is needed to write two of the three words (shalom, sham end in mem sofit)
      const fr = byId[L.id + '-final']; if (!fr) throw new Error('no final form record for ' + L.id);
      rows.push({ id: fr.id, label: letterLabel(fr) + ' (at the end of a word)', glyph: L.finalForm, sound: L.sound, ipa: fr.sound.ipa, rec: fr, number: (i + 1) + 'b', final: true });
    }
  });
  const vowels = f.vowels.map((v) => ({ ...v, cells: v.id === 'holam-male' ? ['לוֹ', 'שׁוֹ', 'מוֹ'] : ['מָ', 'שָׁ', 'לָ', 'הָ'] }));
  const words = f.words.map((w) => ({ ...w, letterLabels: w.letters.map((id) => letterLabel(byId[id])) }));
  const stages = ladder.stages.map((id, i) => ({ id, index: i + 1, label: STAGE_LABEL[id] || id, steps: ladder.steps.filter((s) => s.stage === id) }));
  if (stages.reduce((a, s) => a + s.steps.length, 0) !== ladder.steps.length) throw new Error('ladder steps outside the 4 stages');
  return { goal: f.goal, steps: f.steps, reviewNote: f.reviewNote, honestyNote: f.honestyNote, rows, vowels, words, stages, ladderNote: ladder.reviewNote, passRule: ladder.passRule, stepCount: ladder.steps.length };
}
export const STAGE_LABEL = { pointed: 'Fully pointed', 'first-letter-pointed': 'First letter pointed', 'unpointed-with-hint': 'Unpointed, with a hint', unpointed: 'Unpointed, no hint' };

// ---------------------------------------------------------------- First 10 minutes: HTML
function letterRow(r, script) {
  const S = SCRIPTS[script];
  return `<div class="row" data-fd-letter="${esc(r.id)}" data-script="${script}"><div class="rh"><span class="box" aria-label="tick when done"></span><span class="num">${esc(r.number)}</span><span class="nm">${esc(r.label)}</span><span class="hint">${esc(r.sound)}</span><span class="ipa">/${esc(r.ipa)}/</span></div>${traceStrip({ cells: [r.glyph], family: S.family, tierOf: letterTier, size: script === 'print' ? 62 : 48, base: 58, height: 80 })}</div>`;
}
function vowelRow(v) {
  return `<div class="row" data-fd-vowel="${esc(v.id)}" style="height:23mm"><div class="rh" style="height:auto;min-height:6mm"><span class="box"></span><span class="nm"><b>${esc(v.sound)}</b> &middot; ${esc(v.id)}</span><span class="hint">${esc(v.note)}</span></div>${traceStrip({ cells: v.cells, n: 16, family: 'WB-Print', tierOf: (i) => (i < v.cells.length ? 'solid' : i < 2 * v.cells.length ? 'grey' : i < 3 * v.cells.length ? 'dotted' : 'blank'), size: 58, base: 60, height: 84 })}</div>`;
}
function wordBlock(w, i) {
  const cells = [0, 1, 2, 3].map((k) => (bigTier(k) === 'blank' ? '' : `<text x="${1000 - (k + 0.5) * 250}" y="70" text-anchor="middle" font-family="WB-Print" font-size="72" direction="rtl" ${bigTier(k) === 'solid' ? 'fill="#000"' : bigTier(k) === 'grey' ? 'fill="#b4b4b4"' : 'fill="none" stroke="#444" stroke-width="0.8" stroke-dasharray="1.1 1.9"'}>${esc(w.he)}</text>`)).join('');
  return `<div class="word" data-fd-word="${esc(w.id)}"><div class="wl"><span class="he print big">${esc(w.he)}</span><div class="wt"><b>${i + 1}. ${esc(w.sound)}</b> = ${esc(w.gloss)}<br/><span class="small">Letters, right to left: ${esc(w.letterLabels.join(', '))}. ${esc(w.source)}.</span><br/><span class="small">Without the vowel signs it is written <span class="he print">${esc(w.bare)}</span>.</span></div></div>
<svg class="strip" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 96"><line x1="0" y1="70" x2="1000" y2="70" stroke="#7a8" stroke-width="0.8"/>${cells}</svg></div>`;
}
function ladderRows(stage) {
  return stage.steps.map((s) => `<div class="lrow" data-ladder-step="${s.n}"><span class="box" aria-label="read it"></span><span class="num">${s.n}</span><span class="he print lw">${esc(s.shown)}</span><span class="gl">${esc(s.gloss)}</span></div>`).join('');
}

/** Full HTML + page kinds. @param {'a4'|'letter'} paperId */
export function buildFirstDayHtml(paperId) {
  const paper = PAPERS[paperId]; const m = buildFirstDayModel();
  const css = baseCss(paper) + `
.row{height:21.5mm}.big{font-size:34pt;line-height:1}
.word{height:46mm;break-inside:avoid;margin-bottom:1mm}.wl{display:flex;gap:5mm;align-items:center;height:20mm}.wt{font-size:9.5pt;line-height:1.3}
.steps{font-size:9.5pt;border-collapse:collapse;width:100%}.steps td{border-bottom:.2mm solid #999;padding:1.2mm 1.5mm;vertical-align:top}.steps td:first-child{width:12mm;color:#444}
.chart{display:grid;grid-template-columns:repeat(6,1fr);gap:2mm;direction:rtl;margin-top:2mm}
.chart div{border:.3mm solid #000;text-align:center;padding:1mm 0;direction:ltr}.chart .he{font-size:20pt;line-height:1.1;display:block}.chart small{font-size:6.5pt;display:block}
.lrow{display:flex;align-items:center;gap:3mm;height:13.2mm;border-bottom:.2mm dotted #999;direction:ltr}.lw{font-size:24pt;min-width:34mm;text-align:right;line-height:1}.gl{font-size:9pt;color:#222}.gl i{color:#555;font-size:7.5pt}
.key{border:.3mm solid #000;padding:2mm 3mm;margin-top:3mm;font-size:8.5pt;display:grid;grid-template-columns:repeat(4,1fr);gap:1mm 3mm}.key .he{font-size:13pt}
`;
  const pages = [];
  const minutes = m.steps.reduce((a, s) => a + s.minutes, 0);
  const chart = m.rows.map((r) => `<div><span class="he print">${esc(r.glyph)}</span><small>${esc(r.label)}: ${esc(r.sound.split(' ')[0])}</small></div>`).join('');
  pages.push({ kind: 'front', title: 'Start here', fields: true, body: `<h1>Your first 10 minutes of Hebrew</h1>
<p><b>Goal:</b> ${esc(m.goal)}</p>
<p>Hebrew is written and read from <b>right to left</b>. On every practice row the black model is at the <b>right</b>; trace it, then keep writing to the left as the letters fade from grey, to dotted, to empty.</p>
<h2>The plan (${minutes} minutes)</h2><table class="steps">${m.steps.map((s) => `<tr><td>${s.minutes} min</td><td><b>${esc(s.title)}.</b> ${esc(s.body || (s.items ? s.items.join(', ') : s.word ? 'word: ' + s.word : s.words ? s.words.join(' / ') : ''))}</td></tr>`).join('')}</table>
<h2>The ${m.rows.length} letter shapes you need</h2><div class="chart">${chart}</div>
<div class="notice"><b>${esc(m.reviewNote)}</b> ${esc(m.honestyNote)}</div>
<p class="small">Pages: letters in print (page 2) and in cursive handwriting (page 3), the two vowel signs and three words (page 4), then the 20-step ladder from fully pointed words to unpointed words (pages 5 and 6).</p>` });

  for (const script of ['print', 'cursive']) {
    const cells = m.rows.map((r) => `<div class="so-cell"><span class="he ${script}">${esc(r.glyph)}</span><b>${esc(r.label.replace(/ \(.*\)$/, ''))}</b>${strokeCell(r.rec, script)}<span>${r.rec[script].strokes.length} stroke${r.rec[script].strokes.length > 1 ? 's' : ''}</span></div>`).join('');
    pages.push({ kind: 'letters-' + script, title: `Five letters: ${SCRIPTS[script].label}`, fields: true, body: `<p>${script === 'print' ? 'Printed letters, as in books and prayer books.' : 'Israeli handwriting (ktav yad), as people write by hand. Shapes come from the font Gveret Levin; real handwriting varies.'} Numbered circle = where a stroke starts, arrowhead = where it ends. <b>Draft stroke order, not teacher-reviewed.</b></p><div class="so-grid" style="grid-template-columns:repeat(${m.rows.length},1fr)">${cells}</div>${m.rows.map((r) => letterRow(r, script)).join('')}` });
  }

  pages.push({ kind: 'vowels-words', title: 'Two vowel signs, three words', fields: true, body: `<p>A vowel sign sits under (or, for the vav-with-dot, next to) the letter. Trace the pairs, then the words. Models use the print font so the marks are clear.</p>${m.vowels.map(vowelRow).join('')}<h2>Read and write three words</h2>${m.words.map(wordBlock).join('')}` });

  const stageHtml = (st) => `<h2>Stage ${st.index}: ${esc(st.label)} <span class="small">(steps ${st.steps[0].n}-${st.steps[st.steps.length - 1].n})${st.id === 'unpointed-with-hint' ? '. Stuck? Look at the key below; a word read after the hint does not count as read unpointed' : ''}</span></h2>${ladderRows(st)}`;
  const key = (sts) => `<div class="key">${sts.flatMap((st) => st.steps).map((s) => `<span><b>${s.n}</b> <span class="he print">${esc(s.word)}</span> ${esc(s.gloss)}</span>`).join('')}</div>`;
  pages.push({ kind: 'ladder', title: 'Ladder, stages 1-2', fields: true, body: `<p>Read each word aloud, then tick it. Stage 1 words use only the letters above; from step 4 on, other letters and signs appear (follow the gloss and the key). ${esc(m.passRule)}</p>${m.stages.slice(0, 2).map(stageHtml).join('')}` });
  pages.push({ kind: 'ladder', title: 'Ladder, stages 3-4', fields: true, body: `<p>Now the vowel signs are gone, as in a newspaper or a street sign. Try each word from its letters and meaning; peek at the key only for stage 3 words.</p>${m.stages.slice(2).map(stageHtml).join('')}<h3>Key: all ${m.stepCount} words with their vowel signs</h3>${key(m.stages)}<p class="small">${esc(m.ladderNote)}</p>` });

  const html = wrapHtml({ title: `ALEF first 10 minutes (${paper.label})`, css, pages, set: 'First 10 minutes', draft: DRAFT });
  return { html, pages: pages.map((p) => p.kind), pageCount: pages.length, model: m };
}

// ---------------------------------------------------------------- shared build steps
export function loadChromium() {
  const require = createRequire(import.meta.url);
  try { return require('playwright').chromium; } catch { try { return require('/usr/lib/node_modules/playwright').chromium; } catch { return require('/opt/npm-tools/node_modules/playwright').chromium; } }
}
/** Render html -> pdf (CSS page size), scrub metadata to Author only, copy to assets/workbook. Returns bytes. */
export async function renderPdf(browser, htmlPath, pdfPath) {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
  await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: false });
  await page.close();
  const r = spawnSync('python3', [join(root, 'book/pdf_tools.py'), 'scrub', pdfPath], { stdio: 'inherit' }); // author-only metadata
  if (r.status !== 0) throw new Error('pdf metadata scrub failed for ' + pdfPath);
  copyFileSync(pdfPath, join(root, 'assets', 'workbook', pdfPath.split('/').pop()));
  return statSync(pdfPath).size;
}
/** Merge entries into assets/workbook/manifest.json (replace same ids, keep everything else, byte sizes re-read from disk). */
export function mergeAssetManifest(entries) {
  const p = join(root, 'assets', 'workbook', 'manifest.json');
  const m = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : { generated: '', status: 'DRAFT', fonts: 'Frank Ruhl Libre, Gveret Levin (SIL OFL 1.1)', files: [] };
  const ids = new Set(entries.map((e) => e.id));
  const keep = m.files.filter((f) => !ids.has(f.id));
  const files = keep.concat(entries.map((e) => ({ ...e, bytes: statSync(join(root, 'assets', 'workbook', e.pdf)).size })));
  writeFileSync(p, JSON.stringify({ ...m, files }, null, 1));
  return files;
}
/** docs/workbook/index.html: one page listing every PDF in assets/workbook/manifest.json (main workbooks + these sets), with page and byte counts. */
export function writeIndexPage() {
  const p = join(root, 'assets', 'workbook', 'manifest.json'); if (!existsSync(p)) return null;
  const m = JSON.parse(readFileSync(p, 'utf8'));
  const SETS = [['workbook', 'Letter workbook (print and cursive, with or without memory hooks)', (f) => !f.kind], ['firstday', 'First 10 minutes', (f) => f.kind === 'firstday'], ['cursive-words', 'Cursive words (27 letter forms)', (f) => f.kind === 'cursive-words'], ['niqqud', 'Vowel signs (niqqud)', (f) => f.kind === 'niqqud']];
  const kb = (b) => (b ? Math.round(b / 1024) + ' KB' : '?');
  const label = (f) => f.kind ? f.script : `${f.script === 'print' ? 'Print letters' : 'Cursive letters'}${f.mnemonics ? ', with memory hooks' : ''}`;
  const rows = SETS.map(([id, title, pick]) => { const fs = m.files.filter(pick); return fs.length ? `<h2 id="${id}">${esc(title)}</h2><table><thead><tr><th>File</th><th>Edition</th><th>Paper</th><th>Pages</th><th>Size</th></tr></thead><tbody>${fs.map((f) => `<tr><td><a href="${esc(f.pdf)}">${esc(f.pdf)}</a></td><td>${esc(label(f))}</td><td>${esc(f.paper)}</td><td>${f.pages}</td><td>${kb(f.bytes)}</td></tr>`).join('')}</tbody></table>` : ''; }).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>ALEF printable workbooks</title><style>body{font-family:system-ui,sans-serif;max-width:52em;margin:2em auto;padding:0 1em;color:#111}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ccc;padding:.35em .5em;text-align:left}th{font-size:.85em}.notice{border:2px solid #000;padding:.6em .9em;margin:1em 0}</style></head><body>
<h1>ALEF printable workbooks</h1><p>${m.files.length} PDF files, A4 and US Letter. Print at 100% ("Actual size"), single-sided. Generated ${esc(m.generated)} by tools/letters/workbook.mjs, firstday_pages.mjs, cursive_words.mjs and niqqud_workbook.mjs; this list mirrors assets/workbook/manifest.json.</p>
<div class="notice"><b>${esc(m.status)}.</b> Every set is a draft: stroke order, pointing and example words have not been reviewed by a Hebrew teacher, and nothing has been tested with learners. Pronunciation is Israeli. Fonts: ${esc(m.fonts)}.</div>${rows}
<p><small>Sources (HTML) for every PDF are in html/. Each PDF carries only an Author field in its metadata (book/pdf_tools.py scrub).</small></p></body></html>`;
  writeFileSync(join(root, 'docs', 'workbook', 'index.html'), html);
  return html;
}
/** Build one edition set: builder(paperId) -> {html, pages, pageCount}; returns manifest entries. */
export async function buildEditions({ builder, name, kind, label, htmlOnly, extra = {} }) {
  const outDir = join(root, 'docs', 'workbook'); const htmlDir = join(outDir, 'html');
  mkdirSync(htmlDir, { recursive: true }); mkdirSync(join(root, 'assets', 'workbook'), { recursive: true });
  const browser = htmlOnly ? null : await loadChromium().launch();
  const entries = [];
  for (const paperId of Object.keys(PAPERS)) {
    const { html, pages, pageCount } = builder(paperId);
    const id = `${name}-${paperId}`; const hp = join(htmlDir, id + '.html'); writeFileSync(hp, html);
    const entry = { id, kind, script: label, mnemonics: false, paper: PAPERS[paperId].label, pages: pageCount, pageKinds: pages, pdf: id + '.pdf', ...extra };
    if (browser) entry.bytes = await renderPdf(browser, hp, join(outDir, id + '.pdf'));
    entries.push(entry);
    console.log(id, pageCount + ' pages', entry.bytes ? Math.round(entry.bytes / 1024) + ' KB' : '(html only)');
  }
  if (browser) { await browser.close(); mergeAssetManifest(entries); writeIndexPage(); }
  return entries;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await buildEditions({ builder: buildFirstDayHtml, name: 'alef-firstday', kind: 'firstday', label: 'First 10 minutes', htmlOnly: process.argv.includes('--html-only') });
}
