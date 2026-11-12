// J8 performance budget: tools/build-precache.mjs fails when the first install or its JavaScript is over budget.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, truncateSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { budget, computeManifest, FIRST_INSTALL_BUDGET, JS_BUDGET } from '../tools/build-precache.mjs';

test('budget flags a first install or installed JavaScript over its limit, and passes the current tree', () => {
  const dir = mkdtempSync(join(tmpdir(), 'alef-budget-'));
  try {
    writeFileSync(join(dir, 'a.js'), ''); truncateSync(join(dir, 'a.js'), JS_BUDGET + 1);
    writeFileSync(join(dir, 'b.json'), ''); truncateSync(join(dir, 'b.json'), 10);
    let r = budget({ files: ['a.js', 'b.json'] }, dir);
    assert.equal(r.ok, false); assert.equal(r.problems.length, 1); assert.match(r.problems[0], /installed JavaScript/);
    truncateSync(join(dir, 'b.json'), FIRST_INSTALL_BUDGET);
    r = budget({ files: ['a.js', 'b.json'] }, dir);
    assert.equal(r.problems.length, 2); assert.match(r.problems[0], /first install/);
    truncateSync(join(dir, 'a.js'), 5);
    assert.equal(budget({ files: ['a.js'] }, dir).ok, true);
  } finally { rmSync(dir, { recursive: true, force: true }); }
  const cur = budget(computeManifest());
  assert.ok(cur.ok, cur.problems.join('; '));
});

test('the precache build prints the sizes and exits non-zero over budget (CI runs it in the test job)', () => {
  const src = readFileSync(new URL('../tools/build-precache.mjs', import.meta.url), 'utf8');
  assert.match(src, /if \(!b\.ok\) \{ for \(const p of b\.problems\) console\.error\('budget: ' \+ p\); process\.exit\(1\); \}/);
  assert.match(readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'), /node tools\/build-precache\.mjs && git diff --exit-code precache-manifest\.js/);
});
