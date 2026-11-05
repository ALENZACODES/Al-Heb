import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scan, render, splice, START, END, listFiles, countsNear, diffIndex } from '../tools/docs/index.mjs';
import { checkFile } from '../tools/docs/linkcheck.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

test('scan counts nested files and takes the README heading, else the first Markdown file', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ix-'));
  fs.mkdirSync(path.join(d, 'docs', 'a', 'sub'), { recursive: true });
  fs.mkdirSync(path.join(d, 'docs', 'b'));
  fs.mkdirSync(path.join(d, 'docs', 'c'));
  fs.writeFileSync(path.join(d, 'docs', 'TOP.md'), '# Top\n');
  fs.writeFileSync(path.join(d, 'docs', 'a', 'README.md'), 'intro\n# Alpha | pipe\n');
  fs.writeFileSync(path.join(d, 'docs', 'a', 'sub', 'x.png'), 'x');
  fs.writeFileSync(path.join(d, 'docs', 'b', 'Z.md'), '# Zed\n');
  fs.writeFileSync(path.join(d, 'docs', 'b', 'A.md'), '# Aye\n');
  fs.writeFileSync(path.join(d, 'docs', 'c', 'x.png'), 'x');
  const s = scan(d);
  assert.deepEqual(s.folders.map((f) => [f.name, f.count, f.title]), [['a', 2, 'Alpha | pipe'], ['b', 2, 'Aye'], ['c', 1, '']]);
  assert.equal(s.total, 6);
  const out = render(s);
  assert.match(out, /Alpha \\\| pipe/);
  assert.match(out, /no Markdown file at the top/);
  fs.rmSync(d, { recursive: true });
});

test('splice replaces only the generated block and demands both markers', () => {
  assert.equal(splice(`x\n${START}\nold\n${END}\ny`, `${START}\nnew\n${END}`), `x\n${START}\nnew\n${END}\ny`);
  assert.throws(() => splice('no markers', 'b'));
});

test('docs/INDEX.md lists exactly the folders and top-level files on disk, with counts close to the tree', () => {
  const text = fs.readFileSync(path.join(ROOT, 'docs', 'INDEX.md'), 'utf8');
  // The folder list and the top-level file list must match the tree exactly (a new folder or file is a real change to the index).
  // Per-folder counts only need to be near, because other lanes add files all the time; `node tools/docs/index.mjs --check --exact` is the exact test.
  assert.deepEqual(diffIndex(text, scan(ROOT)), []);
});

test('countsNear: small folders get a floor, big folders a percentage, and a real jump still fails', () => {
  assert.ok(countsNear(2, 10));
  assert.ok(!countsNear(2, 32));
  assert.ok(countsNear(100, 109));
  assert.ok(!countsNear(100, 125));
});

test('diffIndex names the folder or file that drifted and the fix command', () => {
  const s = { folders: [{ name: 'a', count: 3 }], files: [{ name: 'X.md' }] };
  const good = `${START}\n| [\`a/\`](a/) | 3 | t |\n| [\`X.md\`](X.md) | h |\n${END}`;
  assert.deepEqual(diffIndex(good, s), []);
  const bad = diffIndex(good, { folders: [...s.folders, { name: 'new', count: 1 }], files: [...s.files, { name: 'Y.md' }] });
  assert.ok(bad.some((m) => m.includes('docs/new/')) && bad.some((m) => m.includes('docs/Y.md')) && bad.at(-1).includes('node tools/docs/index.mjs'));
});

test('docs/INDEX.md has no broken relative links', () => {
  assert.deepEqual(checkFile(path.join(ROOT, 'docs', 'INDEX.md')), []);
  assert.ok(listFiles(path.join(ROOT, 'docs')).length > 0);
});
