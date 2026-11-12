// I1 toast hygiene contract: transient feedback text is emptied after a few seconds and on every navigation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sayBriefly, clearTransient, TRANSIENT_TEXT, TRANSIENT_NODES } from '../src/shell/transient.js';

const timers = [];
const win = { setTimeout(f) { timers.push(f); return timers.length; }, clearTimeout() {} };

test('sayBriefly empties the line after its moment, unless newer text was written', () => {
  const node = { textContent: '' };
  sayBriefly(node, 'Not this time', { win });
  assert.equal(node.textContent, 'Not this time');
  timers.shift()();
  assert.equal(node.textContent, '', 'the feedback is gone after the delay');
  sayBriefly(node, 'Correct', { win });
  node.textContent = 'Streak'; // a newer line from somewhere else
  timers.shift()();
  assert.equal(node.textContent, 'Streak', 'a newer line is not erased by the older timer');
});

test('clearTransient empties every transient live region and removes toasts', () => {
  const twin = { textContent: 'Not this time' }, ret = { textContent: 'Oops, that cost a heart' };
  let removed = 0;
  const toast = { remove() { removed++; } };
  const doc = { querySelectorAll(sel) { return sel === TRANSIENT_TEXT ? [twin, ret] : sel === TRANSIENT_NODES ? [toast] : []; } };
  assert.equal(clearTransient(doc), 3);
  assert.equal(twin.textContent, '');
  assert.equal(ret.textContent, '');
  assert.equal(removed, 1);
  assert.equal(clearTransient({}), 0, 'no document: nothing thrown');
});

test('the contract is wired: lesson feedback twin, retention line and every navigation', () => {
  const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
  assert.match(TRANSIENT_TEXT, /#media-twin/, 'the lesson/game feedback twin is transient');
  assert.match(TRANSIENT_TEXT, /\.ret-live/, 'the hearts/XP spoken line is transient');
  assert.match(src('src/audio/sfx.js'), /sayBriefly\(node, text\)/, 'the twin is written through sayBriefly, never left set');
  assert.doesNotMatch(src('src/audio/sfx.js'), /node\.textContent = text;/);
  assert.match(src('src/retention/ui.js'), /sayBriefly\(live,/);
  const app = src('src/app.js');
  const i = app.indexOf('if (!quiet) clearTransient(document);'), j = app.indexOf("if (!quiet) announceTitle(live, '');");
  assert.ok(i > 0 && i < j, 'show() clears transient text at the start of every (non-quiet) navigation');
});
