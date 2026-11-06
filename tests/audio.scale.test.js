// Scale guards for a larger audio batch. Additive only: these do not replace or relax anything in audio.manifest.test.js or record-kit.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadManifestFull } from '../tools/audio/manifest_io.mjs';
import { TRADITIONS, VOICES, KINDS } from '../tools/audio/hebrew_data.mjs';
import { parseClipPath } from '../tools/record-kit/lib.mjs';

const manifest = loadManifestFull();

test('manifest paths are unique across the core file and every shard (ingest keys a Map on path; a repeat would silently shadow an entry)', () => {
  const seen = new Map();
  for (const e of manifest) { assert.ok(!seen.has(e.path), `duplicate path ${e.path}`); seen.set(e.path, 1); }
  const lower = new Set(manifest.map((e) => e.path.toLowerCase()));
  assert.equal(lower.size, manifest.length, 'two paths differ only by case (breaks on case-insensitive disks)');
});

test('every entry path agrees with its voice, tradition, kind and id, and the record-kit path parser accepts it', () => {
  for (const e of manifest) {
    assert.ok(VOICES.includes(e.voice) && TRADITIONS.includes(e.tradition) && KINDS.includes(e.kind), e.path);
    const pc = parseClipPath(e.path.replace(/\.mp3$/, '.wav'));
    assert.ok(pc, `record-kit cannot parse ${e.path}`);
    assert.deepEqual([pc.voice, pc.tradition, pc.kind, pc.id], [e.voice, e.tradition, e.kind, e.id], e.path);
  }
});

test('ingest reads the same manifest files that build_manifest writes (a new shard must be added to both)', () => {
  const src = fs.readFileSync(new URL('../tools/record-kit/ingest.mjs', import.meta.url), 'utf8');
  const m = /manifestShards = [^\n]*\[([^\]]*)\]\.map\(\(t\) => `([^`]*)\$\{t\}\.json`\)/.exec(src);
  assert.ok(m, 'manifestShards definition not found');
  for (const t of TRADITIONS) assert.ok(src.includes("'" + t + "'"), `ingest does not list ${t}`);
  assert.ok(fs.existsSync(new URL('../data/audio/manifest.json', import.meta.url)));
});
