import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { loadManifestFull } from '../tools/audio/manifest_io.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { renderMarkdown, renderCsv, TAKES } from '../tools/audio/recording_script.mjs';

const R = fileURLToPath(new URL('..', import.meta.url));
const manifest = loadManifestFull(R);

test('script paths match manifest paths exactly', () => {
  const md = renderMarkdown(manifest, 'israeli');
  for (const e of manifest.filter((x) => x.tradition === 'israeli' && x.voice === 'm' && !x.aliasOf && x.kind !== 'letter-lecture')) assert.ok(md.includes(`${e.tradition}/${e.kind}/${e.id}.mp3`), e.path);
  const csv = renderCsv(manifest);
  for (const e of manifest.filter((x) => x.tradition !== 'sephardi' && !x.aliasOf && x.kind !== 'letter-lecture')) assert.ok(csv.includes(`"${e.path}"`), e.path);
  assert.ok(!csv.includes('/sephardi/'));
});
test('ashkenazi script states the human-only and open dialect decision; takes defined', () => {
  const md = renderMarkdown(manifest, 'ashkenazi');
  assert.match(md, /OPEN DECISION/); assert.match(md, /human-recording task/);
  assert.ok(Object.values(TAKES).every((n) => n >= 2));
});
test('generated docs on disk are current', () => {
  for (const t of ['israeli', 'ashkenazi']) assert.equal(fs.readFileSync(path.join(R, `docs/voices/recording-script-${t}.md`), 'utf8'), renderMarkdown(manifest, t));
  assert.equal(fs.readFileSync(path.join(R, 'docs/voices/recording-script.csv'), 'utf8'), renderCsv(manifest));
});
test('docs state Google he-IL limit and no-Ashkenazi-TTS fact', () => {
  const p = fs.readFileSync(path.join(R, 'docs/voices/tts-evaluation-protocol.md'), 'utf8');
  assert.match(p, /Google[^.]*excludes|NOT available for he-IL/); assert.match(p, /No TTS provider found offers Ashkenazi/);
  assert.match(fs.readFileSync(path.join(R, 'docs/voices/buyout-contract-terms.md'), 'utf8'), /NOT legal advice/);
});
test('normalize.sh: usage error without args; processes a synthetic tone when ffmpeg exists', { skip: spawnSync('ffmpeg', ['-version']).status !== 0 }, () => {
  const sh = path.join(R, 'tools/audio/normalize.sh');
  assert.equal(spawnSync('bash', [sh]).status, 2);
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'alefn-'));
  fs.mkdirSync(path.join(t, 'in'));
  assert.equal(spawnSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=300:duration=1', path.join(t, 'in/t.wav')]).status, 0);
  const r = spawnSync('bash', [sh, path.join(t, 'in'), path.join(t, 'out')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  for (const ext of ['mp3', 'm4a', 'opus']) assert.ok(fs.statSync(path.join(t, 'out/t.' + ext)).size > 100);
});
