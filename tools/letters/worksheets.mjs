#!/usr/bin/env node
// Printable tracing worksheets: one self-contained HTML (with inline SVG) per letter, print + cursive.
// Dotted guide = the letter's own font glyph drawn as a dashed outline (Frank Ruhl Libre for print, Gveret Levin for cursive; both SIL OFL 1.1),
// plus the numbered stroke starts from data/letters/letters.json (DRAFT order). Fonts are referenced by relative URL, not embedded.
// Usage: node tools/letters/worksheets.mjs [outDir=docs/letters/worksheets] [--only=alef,bet]
// Exports buildWorksheet(letter) for tests.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** One row of guide boxes. kind: 'dotted' | 'faint' | 'blank'. */
function guideRow(letter, script, kind, boxes = 6) {
  const b = letter[script];
  const size = 120, parts = [];
  const font = script === 'print' ? 'WS-Print' : 'WS-Cursive';
  for (let i = 0; i < boxes; i++) {
    const x = i * (size + 6);
    parts.push(`<rect x="${x}" y="0" width="${size}" height="${size}" fill="none" stroke="#99a" stroke-width="1"/>`);
    parts.push(`<line x1="${x}" y1="${size * 0.756}" x2="${x + size}" y2="${size * 0.756}" stroke="#ccd" stroke-dasharray="3 3"/>`);
    if (kind === 'blank') continue;
    if (kind === 'dotted' || kind === 'faint') {
      // glyph from the font as a dotted outline (stroke only, no fill)
      const dash = kind === 'dotted' ? ' stroke-dasharray="2 3"' : '';
      const col = kind === 'dotted' ? '#334' : '#bbc';
      parts.push(`<text x="${x + size / 2}" y="${size * 0.78}" text-anchor="middle" font-family="${font}" font-size="${size * 0.95}" fill="none" stroke="${col}" stroke-width="1.1"${dash} direction="rtl">${esc(letter.he)}</text>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${boxes * (size + 6)} ${size}" width="100%" role="img" aria-label="${esc(letter.name)} ${script} ${kind} row">${parts.join('')}</svg>`;
}

/** Large model box with numbered stroke order (DRAFT data) over the letter's data outline. */
function modelBox(letter, script) {
  const b = letter[script];
  const col = ['#c0392b', '#1f4e9c', '#2e8b3e', '#8e44ad', '#d35400'];
  const parts = [`<rect width="1000" height="1000" fill="#fff" stroke="#99a" stroke-width="6"/>`];
  if (b.outline) parts.push(`<path d="${b.outline}" fill="#e9e9ef"/>`);
  b.strokes.forEach((s, i) => {
    const m = s.median;
    parts.push(`<path d="${s.path}" fill="none" stroke="${col[i % col.length]}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`);
    parts.push(`<circle cx="${m[0][0]}" cy="${m[0][1]}" r="34" fill="#fff" stroke="${col[i % col.length]}" stroke-width="8"/><text x="${m[0][0]}" y="${m[0][1] + 16}" text-anchor="middle" font-size="46" font-weight="bold" font-family="sans-serif" fill="${col[i % col.length]}">${i + 1}</text>`);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="220" height="220" role="img" aria-label="${esc(letter.name)} ${script} stroke order model">${parts.join('')}</svg>`;
}

/** @param {any} letter one record of letters.json @returns {string} full HTML document */
export function buildWorksheet(letter) {
  const sec = (script, title) => `<section><h2>${title}</h2><div class="top">${modelBox(letter, script)}<div class="big ${script}" dir="rtl" lang="he">${esc(letter.he)}</div><p class="note">Numbers = stroke order (DRAFT: not yet checked by a native teacher; follow your teacher's order if different).</p></div>
${guideRow(letter, script, 'dotted')}${guideRow(letter, script, 'faint')}${guideRow(letter, script, 'blank')}</section>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Trace ${esc(letter.name)} (${esc(letter.he)})</title>
<style>
@font-face{font-family:WS-Print;src:url("../../../assets/fonts/frankruhllibre-FrankRuhlLibre[wght].ttf")}
@font-face{font-family:WS-Cursive;src:url("../../../assets/fonts/gveretlevin-GveretLevin-Regular.ttf")}
body{font-family:system-ui,sans-serif;margin:16mm;color:#111}
h1{margin:0 0 4mm}h1 span{font-size:1.4em}
section{page-break-inside:avoid;margin-bottom:8mm}
.top{display:flex;gap:10mm;align-items:center}.big{font-size:90px;line-height:1}.big.print{font-family:WS-Print,serif}.big.cursive{font-family:WS-Cursive,cursive}
.note{font-size:.8rem;color:#555;max-width:60mm}
svg{display:block;margin:2mm 0}
footer{font-size:.7rem;color:#555;margin-top:6mm}
@media print{body{margin:10mm}}
</style></head><body>
<h1>${esc(letter.name)} <span dir="rtl" lang="he">${esc(letter.he)}</span> <small dir="rtl" lang="he">${esc(letter.nameHe)}</small></h1>
<p>/${esc(letter.sound.ipa)}/ ${esc(letter.sound.en)}</p>
${sec('print', 'Print')}
${sec('cursive', 'Cursive (handwriting)')}
<footer>ALEF worksheet. Guide glyphs: Frank Ruhl Libre (print) and Gveret Levin (cursive), SIL Open Font License 1.1. Stroke data: draft, needsNativeReview.</footer>
</body></html>
`;
}

export function writeAll(outDir, only) {
  const letters = JSON.parse(readFileSync(join(root, 'data', 'letters', 'letters.json'), 'utf8'));
  mkdirSync(outDir, { recursive: true });
  const written = [];
  for (const l of letters) {
    if (only && !only.includes(l.id)) continue;
    const f = join(outDir, `${l.id}.html`); writeFileSync(f, buildWorksheet(l)); written.push(f);
  }
  return written;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const only = (args.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
  const out = args.find(a => !a.startsWith('--')) || join(root, 'docs', 'letters', 'worksheets');
  const w = writeAll(out, only.length ? only : null);
  console.log(`wrote ${w.length} worksheets to ${out}`);
}
