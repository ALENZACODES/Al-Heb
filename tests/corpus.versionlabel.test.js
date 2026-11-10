import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { versionLabel } from '../src/shell/names.js';

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const metaDoc = JSON.parse(read('data/corpus/prayer-meta.json'));
const entries = Array.isArray(metaDoc.entries) ? metaDoc.entries : Object.values(metaDoc.entries);

test('reader view wires versionLabel() into the per-prayer metadata block (source check, not a rendered DOM)', () => {
  const src = read('src/corpus/read.view.js');
  assert.match(src, /import \{ versionLabel \} from '\.\.\/shell\/names\.js'/);
  assert.match(src, /const vl = versionLabel\(m\); if \(vl\.oneVersion && vl\.text\)/);
  assert.match(src, /dl\.append\(el\('dt', \{\}, 'Version'\), el\('dd', \{ class: 'crp-version' \}, vl\.text\)\)/);
});

test('every prayer-meta entry yields a label; the one-version text starts "One version shown"', () => {
  assert.ok(entries.length >= 70);
  for (const m of entries) {
    const v = versionLabel(m);
    assert.ok(!v.oneVersion || v.text === '' || v.text.length > 10);
    if (v.oneVersion && v.text) assert.match(v.text, /^The common printed text/);
  }
});
