import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scan, render, splice, START, END, listFiles } from '../tools/docs/index.mjs';
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
  const s = scan(ROOT);
  const listed = [...text.matchAll(/^\| \[`([^`]+)\/`\]\([^)]*\) \| (\d+) \|/gm)].map((m) => [m[1], Number(m[2])]);
  assert.deepEqual(listed.map((l) => l[0]), s.folders.map((f) => f.name), 'folder list is stale: run node tools/docs/index.mjs');
  // Other people add files all the time, so counts only need to be near; `node tools/docs/index.mjs --check` is the exact test.
  for (const [name, n] of listed) {
    const now = s.folders.find((f) => f.name === name).count;
    assert.ok(Math.abs(now - n) <= Math.max(5, Math.ceil(now * 0.1)), `${name}/ count ${n} is far from ${now}: run node tools/docs/index.mjs`);
  }
  for (const f of s.files) assert.ok(text.includes(`[\`${f.name}\`]`), `${f.name} missing from the index`);
});

test('docs/INDEX.md has no broken relative links', () => {
  assert.deepEqual(checkFile(path.join(ROOT, 'docs', 'INDEX.md')), []);
  assert.ok(listFiles(path.join(ROOT, 'docs')).length > 0);
});
