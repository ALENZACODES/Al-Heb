#!/usr/bin/env node
// Writes one clean SVG placeholder per manifest row into assets/img/placeholders/<stem>.svg
// and refreshes assets/img/index.json (the list of REAL image files present in assets/img/).
// Placeholders MAY carry English labels (file name + "placeholder"); real images must not contain text.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const BLOCK_ACCENT = { A: '#1F3A5F', B: '#B0373B', C: '#6B7F3A', D: '#D9A441', E: '#1F3A5F', F: '#B0373B', G: '#D9A441' };

/** Pure: returns the SVG string for a manifest row. viewBox is the row's pixel size / 2 (small files, same aspect). */
export function placeholderSvg(row) {
  const W = Math.round(row.width / 2), H = Math.round(row.height / 2);
  const stem = row.file.replace(/\.png$/, '');
  const fs = Math.max(10, Math.min(22, Math.floor((W - 40) / (stem.length * 0.6))));
  const accent = BLOCK_ACCENT[row.block] || '#2B2B2B';
  const m = Math.round(Math.min(W, H) * 0.05);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="placeholder for ${esc(stem)}">
<rect width="${W}" height="${H}" fill="#F6F1E7"/>
<rect x="${m}" y="${m}" width="${W - 2 * m}" height="${H - 2 * m}" rx="14" fill="none" stroke="${accent}" stroke-width="3" stroke-dasharray="10 8"/>
<text x="${W / 2}" y="${H / 2 - 4}" text-anchor="middle" font-family="DejaVu Sans Mono, Menlo, Consolas, monospace" font-size="${fs}" fill="#2B2B2B">${esc(stem)}</text>
<text x="${W / 2}" y="${H / 2 + fs + 6}" text-anchor="middle" font-family="DejaVu Sans, Helvetica, Arial, sans-serif" font-size="${Math.max(11, fs - 2)}" letter-spacing="3" fill="${accent}">PLACEHOLDER</text>
</svg>
`;
}

export function realImageList(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => /\.(png|svg|webp|jpg)$/i.test(f)).sort();
}

export function main() {
  const data = JSON.parse(readFileSync(join(ROOT, 'data/images/prompt-groups.json'), 'utf8'));
  const dir = join(ROOT, 'assets/img/placeholders');
  mkdirSync(dir, { recursive: true });
  let n = 0;
  for (const g of data.groups) for (const r of g.rows) {
    writeFileSync(join(dir, r.file.replace(/\.png$/, '.svg')), placeholderSvg(r)); n++;
  }
  const real = realImageList(join(ROOT, 'assets/img'));
  writeFileSync(join(ROOT, 'assets/img/index.json'), JSON.stringify({ note: 'Real (non-placeholder) image files present in assets/img/. Regenerate with node tools/images/make_placeholders.mjs after images arrive.', files: real }, null, 1) + '\n');
  console.log(`wrote ${n} placeholders; ${real.length} real images indexed`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
