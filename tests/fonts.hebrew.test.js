// Hebrew rendering guards found by docs/qa/HEBREW-RENDER-QA.md: only the faces the CSS references ship, each has font-display, files are
// woff2 on disk and inside the precache, and pointed-Hebrew line boxes leave room for the vowel marks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fontsCss = readFileSync(join(root, 'assets/css/fonts.css'), 'utf8');
const faces = [...fontsCss.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);

test('fonts.css declares exactly Heebo, Frank Ruhl Libre and Gveret Levin, local woff2, font-display swap', () => {
  const names = faces.map((f) => f.match(/font-family:\s*"([^"]+)"/)[1]).sort();
  assert.deepEqual(names, ['Frank Ruhl Libre', 'Gveret Levin', 'Heebo']);
  for (const f of faces) {
    assert.match(f, /font-display:\s*swap/);
    const url = f.match(/url\("([^"]+)"\)/)[1];
    assert.ok(!/^(https?:)?\/\//.test(url), 'font must be a local file: ' + url);
    assert.ok(existsSync(join(root, 'assets/css', url)), 'missing ' + url);
  }
});

test('the three woff2 files are in the precache and together stay under 200 KB', () => {
  const manifest = readFileSync(join(root, 'precache-manifest.js'), 'utf8');
  let total = 0;
  for (const f of faces) {
    const rel = 'assets/fonts/web/' + f.match(/web\/([^"]+)"/)[1];
    assert.ok(manifest.includes(`"${rel}"`), rel + ' not precached');
    total += statSync(join(root, rel)).size;
  }
  assert.ok(total < 200 * 1024, `fonts are ${total} B`);
});

test('every Hebrew font stack ends in a generic family so a failed webfont still renders', () => {
  const app = readFileSync(join(root, 'assets/css/app.css'), 'utf8');
  for (const v of ['--font-ui', '--font-he', '--font-he-cursive']) assert.match(app, new RegExp(`${v}:[^;]*(sans-serif|serif|cursive);`));
});

test('first-day big pointed word: line-height 1.25 or more (1.1 let the marks hang below the line box)', () => {
  const css = readFileSync(join(root, 'assets/css/learn.css'), 'utf8');
  const m = css.match(/\.alef-firstday \.fd-big\.alef-huge\s*\{[^}]*line-height:\s*([\d.]+)/);
  assert.ok(m && parseFloat(m[1]) >= 1.25, 'line-height ' + (m && m[1]));
});
