// The pose checker: its own fixtures, the real draft folder, exit codes and the committed report.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkModel, loadModel, parseD, parseSvg, selfTest, EXPECTED_TOTALS, DEFAULT_DIR } from '../tools/anim/check_poses.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const tool = root + 'tools/anim/check_poses.mjs';

test('built-in self-test passes', () => {
  const log = console.log; console.log = () => {};
  let r; try { r = selfTest(); } finally { console.log = log; }
  assert.equal(r.bad, 0);
});

test('real draft folder: no problems against the contract totals', () => {
  const res = checkModel(loadModel(DEFAULT_DIR), { expectTotals: EXPECTED_TOTALS });
  assert.deepEqual(res.errors.slice(0, 5), []);
  assert.equal(res.stats.files, 764);
  assert.equal(res.stats.items, 142);
});

test('parseD: whole numbers and M/L/C/Z only', () => {
  assert.equal(parseD('M 1 2 L 3 4 Z').length, 3);
  assert.throws(() => parseD('M 1 2 Q 3 4 5 6'));
  assert.throws(() => parseD('M 1.5 2 Z'));
  assert.throws(() => parseD('L 1 2 Z'));
  assert.throws(() => parseD('M 1 2 L 3'));
});

test('parseSvg finds title, desc, paths', () => {
  const p = parseSvg('<svg xmlns="x"><title>T</title><desc>D. E.</desc><path id="p1" d="M 0 0 Z"/></svg>');
  assert.equal(p.title, 'T'); assert.equal(p.paths[0].id, 'p1');
});

test('CLI: exit 0 on the real folder, exit 1 on a broken copy, exit 2 on usage errors', () => {
  const ok = spawnSync(process.execPath, [tool], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  const dir = mkdtempSync(path.join(tmpdir(), 'poses-'));
  try {
    mkdirSync(dir + '/batch-001');
    writeFileSync(dir + '/batch-001/a-k1.svg', '<svg><script>1</script></svg>');
    writeFileSync(dir + '/batch-001.json', JSON.stringify({ count: 1, short: true, status: 'DRAFT, not reviewed', files: [{ file: 'a-k1.svg', phase: 'B', item: 'a', pose: 1, time_ms: 0, easing: 'ease-in-out', paths: 0, commands_per_path: [], title: 't', doubt: 'n/a' }] }));
    const bad = spawnSync(process.execPath, [tool, dir], { encoding: 'utf8' });
    assert.equal(bad.status, 1);
    assert.match(bad.stdout, /forbidden element <script>/);
    assert.equal(spawnSync(process.execPath, [tool, '--nope'], { encoding: 'utf8' }).status, 2);
    assert.equal(spawnSync(process.execPath, [tool, dir + '/missing'], { encoding: 'utf8' }).status, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the committed report says PASS and states it is a structure check', () => {
  const r = readFileSync(root + 'docs/anim/CHECK-REPORT.md', 'utf8');
  assert.match(r, /structure check only/i);
  assert.match(r, /764/);
});
