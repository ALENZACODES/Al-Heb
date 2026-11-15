// A key written twice in an object literal is legal JavaScript, but only the last value is used, so the first one is dead
// text that can mislead whoever edits it (nav.route.games once read 'Games' in one place and 'All the games' in another).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const keysIn = (src, re) => { const seen = new Map(); let m; while ((m = re.exec(src))) seen.set(m[1], (seen.get(m[1]) || 0) + 1); return [...seen].filter(([, n]) => n > 1).map(([k]) => k); };

test('nav strings: every nav.route key is written once', () => {
  const src = readFileSync(new URL('../src/shell/nav.strings.js', import.meta.url), 'utf8');
  assert.deepEqual(keysIn(src, /'(nav\.[\w.-]+)'\s*:/g), []);
});

test('ui.js MEDAL_FOR: every route is listed once', () => {
  const src = readFileSync(new URL('../src/shell/ui.js', import.meta.url), 'utf8');
  const start = src.indexOf('MEDAL_FOR = Object.freeze({'); const end = src.indexOf('});', start);
  assert.ok(start > 0 && end > start, 'MEDAL_FOR found');
  assert.deepEqual(keysIn(src.slice(start, end), /(?:^|[\s,{])'?([\w-]+)'?\s*:\s*\[/g), []);
});
