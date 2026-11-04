#!/usr/bin/env node
// Renders letter silhouettes (black glyph on white, 1024x1024 PNG, glyph fitted to 78% of the square) from the OFL fonts in assets/fonts/.
//   assets/img/refs/REF_cursive_<id>.png   Gveret Levin (Israeli handwriting) - the inputs ChatGPT's Block C cursive commands ask for
//   assets/img/refs/REF_print_<id>.png     Noto Serif Hebrew (the book's print face) - print-letter references
// <id> = contract letter id with '-' -> '_' (kaf_final), exactly as listed in data/images/prompt-groups.json `inputs`.
//   node tools/images/make_cursive_refs.mjs [--out assets/img/refs] [--size 1024]
// Needs Playwright Chromium (dev tooling only; see docs/TOOLING.md). Glyph = plain letter, no niqqud.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { GLYPHS } from './overlay.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const FACES = {
  cursive: { file: 'assets/fonts/gveretlevin-GveretLevin-Regular.ttf', weight: '400' },
  print: { file: 'assets/fonts/notoserifhebrew-NotoSerifHebrew[wdth,wght].ttf', weight: '600' },
};

export async function renderRefs({ out = join(ROOT, 'assets/img/refs'), size = 1024 } = {}) {
  const require = createRequire(import.meta.url);
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent('<canvas id="c"></canvas>');
  const written = [];
  for (const [kind, face] of Object.entries(FACES)) {
    const b64 = readFileSync(join(ROOT, face.file)).toString('base64');
    await page.evaluate(async ({ b64, fam }) => { const buf = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer; const f = new FontFace(fam, buf, { weight: '100 900' }); await f.load(); document.fonts.add(f); }, { b64, fam: 'F_' + kind });
    for (const [id, glyph] of Object.entries(GLYPHS)) {
      const png = await page.evaluate(({ glyph, fam, weight, size }) => {
        const c = document.getElementById('c'); c.width = size; c.height = size;
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, size, size);
        x.textBaseline = 'alphabetic'; x.textAlign = 'left'; x.direction = 'rtl'; x.fillStyle = '#000';
        x.font = `${weight} 400px ${fam}`;
        const m = x.measureText(glyph);
        const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight, h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
        const k = (size * 0.78) / Math.max(w, h);
        x.font = `${weight} ${400 * k}px ${fam}`;
        const m2 = x.measureText(glyph);
        const gw = m2.actualBoundingBoxLeft + m2.actualBoundingBoxRight, gh = m2.actualBoundingBoxAscent + m2.actualBoundingBoxDescent;
        // textAlign left: actualBoundingBoxLeft is the distance from the origin to the ink's left edge (positive = ink starts left of origin)
        x.fillText(glyph, (size - gw) / 2 + m2.actualBoundingBoxLeft, (size - gh) / 2 + m2.actualBoundingBoxAscent);
        return c.toDataURL('image/png').split(',')[1];
      }, { glyph, fam: 'F_' + kind, weight: face.weight, size });
      const name = `REF_${kind}_${id.replace(/-/g, '_')}.png`;
      writeFileSync(join(out, name), Buffer.from(png, 'base64'));
      written.push(name);
    }
  }
  await browser.close();
  return written;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2); const o = {};
  for (let i = 0; i < a.length; i += 2) { if (a[i] === '--out') o.out = join(ROOT, a[i + 1]); else if (a[i] === '--size') o.size = +a[i + 1]; else throw new Error('unknown option ' + a[i]); }
  renderRefs(o).then((w) => console.log(`wrote ${w.length} PNGs`));
}
