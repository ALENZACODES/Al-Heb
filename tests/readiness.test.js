import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readinessLines, loadReadinessFacts, readinessNode, READINESS_TITLE } from '../src/shell/readiness.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const summary = JSON.parse(read('data/audio/summary.json'));
const approvals = JSON.parse(read('data/images/approvals.json'));

test('with the shipped data: audio not ready, content unreviewed, no pictures approved; nothing claims to be finished', () => {
  const lines = readinessLines({ audio: summary, imagesApproved: Object.keys(approvals.approvals).length });
  const by = Object.fromEntries(lines.map((l) => [l.id, l]));
  assert.equal(summary.recorded, 0, 'when clips are recorded, update the expectations below');
  assert.equal(summary.total, 24906, 'the planned total moved: update this expectation from data/audio/summary.json');
  assert.match(by.audio.text, /^Audio: not ready\. /);
  assert.match(by.audio.text, new RegExp(`${summary.tts.toLocaleString('en-US')} of ${summary.total.toLocaleString('en-US')} planned clips exist, and none is a person recording`));
  assert.match(by.audio.text, /no recorded teacher/); assert.match(by.audio.text, /synthetic voice, unreviewed by native speakers/);
  assert.doesNotMatch(by.audio.text, /audio available|native-recorded|recorded by a native/i);
  assert.match(by.review.text, /unreviewed draft/);
  assert.match(by.images.text, /none approved yet/);
  for (const l of lines) assert.doesNotMatch(l.text, /\b(complete|finished|fully reviewed|native-checked|ready to use)\b/i, l.id);
  assert.equal(lines.filter((l) => l.ready).map((l) => l.id).join(), 'data', 'only the local-data line is a plain fact that is "ready"');
});
test('the review line stays true: docs/review/STATUS.md still says 0 rows reviewed', () => {
  assert.match(read('docs/review/STATUS.md'), /\*\*Reviewed: 0 of \d+ rows\.\*\*/, 'review has started: update the review line in src/shell/readiness.js');
});
test('unknown facts are said as unknown, never guessed', () => {
  const lines = readinessLines({});
  assert.match(lines.find((l) => l.id === 'audio').text, /could not be checked right now/);
  assert.match(lines.find((l) => l.id === 'images').text, /could not be checked right now/);
});
test('loader reads both files; a failed fetch gives nulls', async () => {
  const files = { 'data/audio/summary.json': summary, 'data/images/approvals.json': approvals };
  const f = await loadReadinessFacts(async (u) => ({ ok: true, json: async () => files[u] }));
  assert.equal(f.audio.total, summary.total); assert.equal(f.imagesApproved, 0);
  const g = await loadReadinessFacts(async () => { throw new Error('offline'); });
  assert.deepEqual(g, { audio: null, imagesApproved: null });
});
test('block: collapsed by default, titled, one item per line', () => {
  const h = (tag, attrs = {}, ...kids) => ({ tag, attrs, kids, replaceChildren(...k) { this.kids = k; } });
  const n = readinessNode(h, { facts: { audio: summary, imagesApproved: 0 } });
  assert.equal(n.tag, 'details'); assert.equal(n.attrs.open, null);
  assert.equal(n.kids[0].kids[0].kids[0], READINESS_TITLE);
  const ul = n.kids.find((k) => k.tag === 'ul'); assert.equal(ul.kids.length, readinessLines({}).length);
  assert.equal(readinessNode(h, { open: true, facts: {} }).attrs.open, '');
});
