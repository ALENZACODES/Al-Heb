#!/usr/bin/env node
// "Memory chain" poster, A4 + US Letter: one page, 27 cells (22 letters + 5 final forms), each with the big letter, the state-B picture,
// the hook word and an example Hebrew word with its English gloss. Built to read in black and white: every cell is outlined, final forms get a
// double border, nothing is explained by colour alone; the three pronunciation traditions are in a compact footer (plus a one-line note inside a
// cell only where the traditions differ). Data: data/letters/memory-chain.json (fixture until it exists, see memory_chain_model.mjs).
// Usage: node tools/letters/memory_chain.mjs [--html-only]
// Output: docs/workbook/alef-memory-chain-<a4|letter>.pdf (+ html/), copied to assets/workbook/, PDFs scrubbed to Author "John Khan" (book/pdf_tools.py scrub).
import { fileURLToPath } from 'node:url';
import { esc, baseCss, wrapHtml, buildEditions } from './firstday_pages.mjs';
import { PAPERS } from './workbook.mjs';
import { buildChainModel, traditionLines, pictureSvg, CHAIN_DRAFT } from './memory_chain_model.mjs';

export const FIXTURE_NOTE = 'FIXTURE: the memory-chain data file is not there yet, so pictures are blank frames and hooks come from the older mnemonics file.';

/** The picture box: inline state-B svg, else a labelled empty frame (so a missing drawing is visible, not silent). */
export function pictureBox(c) {
  const s = pictureSvg(c);
  const alt = esc(c.picture.alt || c.picture.idea || c.name);
  if (s) return `<span class="pic" role="img" aria-label="${alt}">${s}</span>`;
  return `<span class="pic empty" role="img" aria-label="${alt}">picture<br/>to come</span>`;
}

export function cellHtml(c) {
  const t = traditionLines(c);
  // Long per-tradition lines do not fit a cell (they overlapped in the resh cell): the cell carries a short pointer, the text goes to the notes box.
  const tl = t.differs ? `<span class="tr">${t.short.map((x) => `<b>${x.label[0]}</b>`).join(' ')} differ: see note ${c.n}</span>` : '';
  const w = c.word || {};
  return `<div class="mc${c.final ? ' fin' : ''}" data-mc-letter="${esc(c.id)}"><span class="nm"><b>${c.n}</b> ${esc(c.name)}${c.final ? ' (final form)' : ''}</span>
<div class="top"><span class="bx he print">${esc(c.he)}</span>${pictureBox(c)}</div>
<span class="hk">${esc(c.hook)}</span>
<span class="wd"><span class="he print">${esc(w.he || '')}</span> <span class="gl">${esc(w.gloss || '')}</span></span>${tl}</div>`;
}

/** @param {'a4'|'letter'} paperId */
export function buildChainHtml(paperId, opts = {}) {
  const paper = PAPERS[paperId]; const m = buildChainModel(opts);
  const gridH = (paper.h - 0.6 - 9 - 8 - 3 - 27).toFixed(1);
  const css = baseCss(paper) + `
.page{padding:9mm 10mm 8mm}.hd{margin-bottom:2mm}
.grid{display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(6,1fr);gap:0;height:${gridH}mm;border-left:.35mm solid #000;border-top:.35mm solid #000}
.mc{border-right:.35mm solid #000;border-bottom:.35mm solid #000;padding:1.2mm 1.6mm;display:flex;flex-direction:column;gap:.6mm;overflow:hidden;min-width:0}
.mc.fin{outline:.5mm solid #000;outline-offset:-1.1mm}
.nm{font-size:6.3pt;color:#222;line-height:1}.top{display:flex;gap:1.5mm;align-items:center;flex:1;min-height:0}
.bx{flex:none;width:13mm;height:13mm;display:flex;align-items:center;justify-content:center;border:.7mm solid #000;color:#000;font-size:27pt;line-height:1;border-radius:1.2mm}
.pic{flex:1;min-width:0;height:100%;max-height:19mm;display:flex;align-items:center;justify-content:center;border:.25mm solid #000;overflow:hidden}
.pic img{width:100%;height:100%;filter:grayscale(1) contrast(1.2)}.pic.empty{font-size:6pt;color:#555;text-align:center;border-style:dashed}
.hk{font-size:8.3pt;font-weight:bold;line-height:1.1}.wd{font-size:7pt;line-height:1.15;display:flex;gap:1.2mm;align-items:baseline}.wd .he{font-size:12.5pt;line-height:1.1}.gl{color:#222}
.tr{font-size:5.4pt;line-height:1.1;color:#222;border-top:.2mm dotted #000;padding-top:.3mm}
.key{border-right:.35mm solid #000;border-bottom:.35mm solid #000;grid-column:span 3;padding:1.6mm 2.2mm;font-size:7pt;line-height:1.3}
.key b{font-size:8pt}.keyfin{display:inline-block;width:5mm;height:3mm;border:.25mm solid #000;outline:.35mm solid #000;outline-offset:-1mm;vertical-align:middle}
.notes{margin-top:1.6mm;border-top:.2mm dotted #000;padding-top:1mm;font-size:6.3pt;line-height:1.25}.notes b{font-size:6.6pt}.notes p{margin:.5mm 0 0;font-size:6.3pt;line-height:1.25}.trad{margin-top:1.8mm;border:.35mm solid #000;padding:1.3mm 2.2mm;font-size:6.6pt;line-height:1.3}.trad b{font-size:7pt}
${m.fixture ? '.fx{border:.4mm solid #000;font-size:7pt;padding:.8mm 2mm;margin-bottom:1.2mm}' : ''}
`;
  const key = `<div class="key"><b>How to read a cell.</b> Thick-framed box: the letter. Framed picture: what the letter turns into. Bold word: the hook, a sound you already know. Under it: a Hebrew word that starts with or contains the letter, and what it means. <span class="keyfin"></span> A double border marks the five final forms (sofit), used only at the end of a word. A small line with <b>I</b> <b>S</b> <b>A</b> appears only where the traditions say the letter differently.</div>`;
  const notes = m.cells.map((c) => ({ c, t: traditionLines(c, 150) })).filter((x) => x.t.differs);
  const noteHtml = notes.length ? `<div class="notes"><b>Notes where the traditions differ.</b>${notes.map(({ c, t }) => `<p><b>${c.n} ${esc(c.name)}.</b> ${t.short.map((x) => `<b>${x.label[0]}</b> ${esc(x.text)}`).join(' &middot; ')}</p>`).join('')}</div>` : '';
  const keyFull = key.replace(/<\/div>$/, noteHtml + '</div>');
  const grid = `<div class="grid">${m.cells.map(cellHtml).join('')}${keyFull}</div>`;
  const trad = `<div class="trad"><b>Three ways to say it.</b> <b>I</b> Israeli: everyday modern Hebrew (the default here). <b>S</b> Sephardi, as the app's setting: Israeli-style vowels said with English-speaking habits. <b>A</b> Ashkenazi: the traditional siddur reading, for example Shabbos for Shabbat. Pick one and keep to it. The picture hooks use the Israeli sound.</div>`;
  const body = `${m.fixture ? `<div class="fx"><b>${esc(FIXTURE_NOTE)}</b></div>` : ''}${grid}${trad}`;
  const pages = [{ kind: 'poster', title: '27 letters you will not forget', fields: false, body }];
  const html = wrapHtml({ title: `ALEF memory chain poster (${paper.label})`, css, pages, set: 'Memory chain', draft: m.fixture ? FIXTURE_NOTE : CHAIN_DRAFT, fonts: 'Fonts: Frank Ruhl Libre (SIL OFL 1.1).' });
  return { html, pages: pages.map((p) => p.kind), pageCount: 1, model: m };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await buildEditions({ builder: (p) => buildChainHtml(p), name: 'alef-memory-chain', kind: 'memory-chain', label: 'Memory chain poster (27 letters)', htmlOnly: process.argv.includes('--html-only') });
}
