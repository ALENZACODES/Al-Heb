// I10 + J10: the change list is generated from the git history, shown on About and on #/whats-new with a since-last-visit marker.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summary, parseLog } from '../tools/release/changelog.mjs';
import { newSince, loadChangelog, SEEN_KEY } from '../src/platform/whatsnew.js';

test('summary keeps the first sentence and cuts long subjects at a word', () => {
  assert.equal(summary('Helpful 404 (I9): suggestions from the route table; nothing is suggested when no page is close'), 'Helpful 404 (I9): suggestions from the route table.');
  const s = summary('word '.repeat(80));
  assert.ok(s.length <= 181 && s.endsWith('…'));
  assert.deepEqual(parseLog('abc\u001f2026-11-12\u001fFix the thing\nmmm\u001f2026-11-11\u001fMerge branch x\n'), [{ date: '2026-11-12', hash: 'abc', text: 'Fix the thing' }]);
});

test('the committed changelog is generated data: dated entries with real commit hashes, newest first', async () => {
  const entries = await loadChangelog();
  assert.ok(entries.length >= 10);
  const json = JSON.parse(readFileSync(new URL('../data/platform/changelog.json', import.meta.url), 'utf8'));
  assert.match(json.generatedFrom, /git log/);
  for (const e of entries) { assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/); assert.match(e.hash, /^[0-9a-f]{7,}$/); assert.ok(e.text.length > 5); }
  for (let i = 1; i < entries.length; i++) assert.ok(entries[i - 1].date >= entries[i].date, 'newest first');
});

test('new since last visit: none on a first look, the entries above the marker otherwise, all when the marker is too old', () => {
  const E = [{ hash: 'c' }, { hash: 'b' }, { hash: 'a' }];
  assert.deepEqual(newSince(E, null), []);
  assert.deepEqual(newSince(E, 'b'), [{ hash: 'c' }]);
  assert.deepEqual(newSince(E, 'c'), []);
  assert.equal(newSince(E, 'zzz').length, 3);
});

test('What\'s New page marks the newest entry seen; About shows the list without marking it', async () => {
  const { N, tick, memStore } = await import('./torahread.fakedom.js');
  const V = await import('../src/platform/whatsnew.view.js');
  const store = memStore(); const root = new N('main');
  const un = V.mount(root, { store }); await tick(80);
  const entries = await loadChangelog();
  assert.equal(store.m[SEEN_KEY], entries[0].hash);
  assert.equal(root.queryAll('h1').length, 1);
  assert.match(root.textContent, /recent changes/);
  un();
  const about = readFileSync(new URL('../src/shell/about.view.js', import.meta.url), 'utf8');
  assert.match(about, /What Changed Recently/);
  assert.match(about, /platform\/whatsnew\.js/);
  assert.doesNotMatch(readFileSync(new URL('../src/platform/whatsnew.js', import.meta.url), 'utf8').split('export async function fillAbout')[1], /store\?\.set/, 'About never moves the marker');
  assert.match(readFileSync(new URL('../package.json', import.meta.url), 'utf8'), /tools\/release\/changelog\.mjs && node tools\/build-precache\.mjs --stamp/, 'release regenerates the list before the precache hash');
});

test('the generator leaves out a subject the learner-text gate would flag', async () => {
  const { flagged } = await import('../tools/release/changelog.mjs');
  assert.equal(flagged("S-01: the gloss reads 'hi (slang)', never 'hislang'."), true);
  assert.equal(flagged('Helpful 404 (I9): suggestions from the route table.'), false);
});
