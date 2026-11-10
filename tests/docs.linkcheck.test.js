import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractLinks, checkFile, defaultFiles } from '../tools/docs/linkcheck.mjs';

test('extractLinks skips code, keeps inline and reference links', () => {
  const md = ['[a](x.md) and `[no](nope.md)`', '```', '[fenced](nope2.md)', '```', '![img](p/q.png "t")', '[ref]: r.md'].join('\n');
  assert.deepEqual(extractLinks(md).map((l) => l.target), ['x.md', 'p/q.png', 'r.md']);
});

test('checkFile flags only missing relative files', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-'));
  fs.mkdirSync(path.join(d, 'docs'));
  fs.writeFileSync(path.join(d, 'docs', 'ok.md'), 'x');
  fs.writeFileSync(path.join(d, 'README.md'),
    '[ok](docs/ok.md#sec) [root](/docs/ok.md) [gone](docs/gone.md) [web](https://example.com/x) [anchor](#top) [mail](mailto:a@b.c)');
  const bad = checkFile(path.join(d, 'README.md'), d);
  assert.deepEqual(bad.map((b) => b.target), ['docs/gone.md']);
  fs.rmSync(d, { recursive: true });
});

test('README and top-level docs have no broken relative links', () => {
  const bad = defaultFiles().flatMap((f) => checkFile(f));
  assert.deepEqual(bad, []);
});
