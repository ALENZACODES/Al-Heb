import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATUS_LABELS, statusLabel, fileLabel } from '../src/shell/audio-labels.js';
import { describeResult, summarizeManifest } from '../src/shell/audio.js';
import { audioAccess, NO_AUDIO } from '../src/shell/audio-access.js';
import { renderMarkdown } from '../tools/audio/coverage.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('one label table: recorded / tts / missing, anything unknown is missing', () => {
  assert.deepEqual(STATUS_LABELS, { recorded: 'Recorded by a human reader', tts: 'Synthetic voice (Israeli only), not a recorded teacher', missing: 'No audio yet' });
  assert.equal(statusLabel('recorded'), STATUS_LABELS.recorded);
  assert.equal(statusLabel('tts'), STATUS_LABELS.tts);
  for (const s of ['missing', 'recorded-tts', undefined, null, '']) assert.equal(statusLabel(s), STATUS_LABELS.missing, String(s));
  assert.equal(fileLabel('tts'), STATUS_LABELS.tts); assert.equal(fileLabel('recorded'), STATUS_LABELS.recorded);
  assert.equal(summarizeManifest([{ status: 'recorded' }, { status: 'tts' }, { status: 'recorded-tts' }, {}]).missing, 2);
});

test('shell status line and access helper use the table', () => {
  assert.equal(describeResult({ source: 'file', voice: 'm', tradition: 'israeli', entryStatus: 'tts' }).text, `Sound: ${STATUS_LABELS.tts} (man, Israeli).`);
  assert.equal(describeResult({ source: 'file', voice: 'f', tradition: 'israeli', entryStatus: 'recorded' }).text, `Sound: ${STATUS_LABELS.recorded} (woman, Israeli).`);
  const audio = (entryStatus) => ({ status: () => ({ source: 'file', entryStatus }) });
  assert.equal(audioAccess(audio('tts'), 'word', 'x').label, STATUS_LABELS.tts);
  assert.equal(audioAccess(audio('recorded'), 'word', 'x').label, STATUS_LABELS.recorded);
  assert.equal(audioAccess({ status: () => ({ source: 'none', reason: 'unknown-item' }) }, 'word', 'x').label, STATUS_LABELS.missing);
  assert.equal(NO_AUDIO, STATUS_LABELS.missing);
});

test('coverage report names the same labels', () => {
  const md = renderMarkdown([{ id: 'a', kind: 'word', voice: 'm', tradition: 'israeli', status: 'tts', group: 'vocab-word', path: 'x.mp3' }]);
  for (const l of Object.values(STATUS_LABELS)) assert.ok(md.includes(l), l);
});

test('no ad-hoc status phrasings remain in src/ (everything goes through audio-labels.js)', () => {
  const stale = /pre-rendered (synthetic|computer)[- ]voice|recorded audio file|Playing a recording\.|Recorded file\.|'Recorded audio'/;
  const hits = [];
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (p.endsWith('.js') && stale.test(fs.readFileSync(p, 'utf8'))) hits.push(path.relative(ROOT, p)); } };
  walk(path.join(ROOT, 'src'));
  assert.deepEqual(hits, []);
});
