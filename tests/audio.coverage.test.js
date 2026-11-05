import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { loadManifestFull } from '../tools/audio/manifest_io.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { computeCoverage, totals, whoIsMissing, renderWho, renderMarkdown, entryState, buildIndex, suppliers, TALENT } from '../tools/audio/coverage.mjs';

const R = fileURLToPath(new URL('..', import.meta.url));
const manifest = loadManifestFull(R);
const E = (voice, tradition, kind, id, group, extra = {}) => ({ path: `audio/${voice}/${tradition}/${kind}/${id}.mp3`, voice, tradition, kind, id, text: 'שָׁלוֹם', status: 'missing', source: 'none', group, ...extra });

test('real manifest: nothing exists, so required == missing and the report says so plainly', () => {
  const t = totals(computeCoverage(manifest));
  assert.equal(t.recorded, 0); assert.equal(t.tts, 0); assert.equal(t.viaEquivalent, 0);
  assert.equal(t.missing, t.required); assert.ok(t.required > 6000);
  assert.match(renderMarkdown(manifest), /No audio files exist in this repository\. There are no real recordings/);
});

test('required excludes optional and alias entries; they are reported separately', () => {
  const rows = computeCoverage(manifest);
  const all = manifest.filter((e) => !e.optional && !e.aliasOf).length;
  assert.equal(totals(rows).required, all);
  assert.ok(rows.some((r) => r.optionalTotal > 0)); assert.ok(rows.some((r) => r.aliasEntries > 0));
});

test('states: recorded, tts, via-alias, via-equivalent, missing', () => {
  const m = [
    E('m', 'israeli', 'word', 'a', 'lesson-word', { status: 'recorded' }),
    E('m', 'israeli', 'word', 'b', 'lesson-word', { status: 'tts' }),
    E('m', 'israeli', 'line', 'p', 'prayer-line', { status: 'recorded' }),
    E('m', 'israeli', 'prayer', 'p', 'prayer-whole', { aliasOf: 'line/p', optional: true }),
    E('m', 'israeli', 'word', 'c', 'lesson-word', { status: 'recorded' }),
    E('m', 'sephardi', 'word', 'c', 'lesson-word', { equivalentTo: ['israeli'] }),
    E('m', 'ashkenazi', 'word', 'c', 'lesson-word'),
  ];
  const ix = buildIndex(m);
  assert.deepEqual(m.map((e) => entryState(e, ix)), ['recorded', 'tts', 'recorded', 'via-alias', 'recorded', 'via-equivalent', 'missing']);
  const rows = computeCoverage(m);
  const get = (t, g) => rows.find((r) => r.tradition === t && r.group === g);
  assert.deepEqual([get('israeli', 'lesson-word').required, get('israeli', 'lesson-word').recorded, get('israeli', 'lesson-word').tts], [3, 2, 1]);
  assert.equal(get('sephardi', 'lesson-word').viaEquivalent, 1); assert.equal(get('sephardi', 'lesson-word').missing, 0);
  assert.equal(get('ashkenazi', 'lesson-word').missing, 1);
  assert.equal(get('israeli', 'prayer-whole').required, 0); assert.equal(get('israeli', 'prayer-whole').aliasEntries, 1);
});

test('who is missing what: filters by voice/tradition/group and labels the supplier honestly', () => {
  const w = whoIsMissing(manifest, { voice: 'f', tradition: 'ashkenazi', group: 'niqqud' });
  assert.equal(w.length, 15); assert.ok(w.every((e) => e.voice === 'f' && e.tradition === 'ashkenazi'));
  assert.equal(suppliers({ tradition: 'ashkenazi', group: 'lesson-word' }), 'human only');
  assert.equal(suppliers({ tradition: 'israeli', group: 'syllable' }), 'human only');
  assert.match(suppliers({ tradition: 'israeli', group: 'phrasebook' }), /TTS unvetted/);
  const txt = renderWho(manifest, { voice: 'm', tradition: 'israeli' });
  assert.match(txt, /Ari \(man\), Israeli \[m\/israeli\]: missing/); assert.ok(!/Noa/.test(txt));
  assert.equal(renderWho([], {}), 'Nothing missing for this filter.');
  assert.deepEqual(Object.keys(TALENT).length, 6);
});

test('docs/voices/coverage.md is current; CLI --who works and rejects bad flags', () => {
  assert.equal(fs.readFileSync(path.join(R, 'docs/voices/coverage.md'), 'utf8'), renderMarkdown(manifest));
  const cli = path.join(R, 'tools/audio/coverage.mjs');
  const ok = spawnSync('node', [cli, '--who', '--voice', 'f', '--tradition', 'ashkenazi'], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr); assert.match(ok.stdout, /Ashkenazi reader \(woman\)/);
  assert.equal(spawnSync('node', [cli, '--who', '--voice', 'x'], { encoding: 'utf8' }).status, 2);
  assert.equal(spawnSync('node', [cli, '--check'], { encoding: 'utf8' }).status, 0);
  const lst = spawnSync('node', [cli, '--who', '--voice', 'm', '--tradition', 'israeli', '--group', 'letter', '--list', '--limit', '2'], { encoding: 'utf8' });
  assert.match(lst.stdout, /audio\/m\/israeli\/letter\/alef\.mp3/);
});
