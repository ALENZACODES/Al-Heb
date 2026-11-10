import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });

test('every hard-coded #/read/<id> link opens a real text', () => {
  const reg = JSON.parse(readFileSync('data/corpus/registry.json', 'utf8'));
  const ids = new Set(reg.entries.map((e) => e.id));
  ids.add('priestly-blessing'); // composite passage in src/corpus/read.view.js
  const bad = [];
  for (const f of walk('src')) {
    for (const m of readFileSync(f, 'utf8').matchAll(/["'`]#\/read\/([a-z0-9-]+)["'`?]/g)) if (!ids.has(m[1])) bad.push(`${f}: ${m[1]}`);
  }
  assert.deepEqual(bad, []);
});
