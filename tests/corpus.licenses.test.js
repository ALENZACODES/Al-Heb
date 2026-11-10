import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLicenses } from '../src/corpus/tools/build-licenses.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('docs/corpus/LICENSES.md equals the build-licenses.mjs output (no hand edits)', () => {
  const onDisk = fs.readFileSync(path.join(ROOT, 'docs/corpus/LICENSES.md'), 'utf8');
  assert.equal(onDisk, buildLicenses(ROOT), 'run: node src/corpus/tools/build-licenses.mjs');
});

test('re-sourced records are described from the registry, not from literals', () => {
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/corpus/registry.json'), 'utf8'));
  const md = buildLicenses(ROOT);
  for (const e of reg.entries.filter((x) => x.resourced))
    assert.ok(md.includes(`| \`${e.id}\` |`) && md.includes(`re-sourced ${e.resourced.on} from ${e.resourced.from}`), e.id);
});
