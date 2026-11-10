import test from 'node:test';
import assert from 'node:assert/strict';
import { passingItem, visibleItems, visiblePages, failingKeySet, dueCardCount, paintDueBadge, progressFraction } from '../src/curriculum/practical-progress.js';
import { showRimon, signalRimon } from '../src/shell/rimon-events.js';
import fs from 'node:fs';

test('items listed as failing the Google Cloud check are hidden; passing items stay visible', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const results = { failing_keys: ['pu-cafe|b'] };
  assert.equal(passingItem('pu-cafe', items[0], results), true);
  assert.equal(passingItem('pu-cafe', items[1], results), false);
  assert.deepEqual(visibleItems('pu-cafe', items, results).map((i) => i.id), ['a', 'c']);
  const unit = { id: 'pu-cafe', pages: [{ id: 'p1', items }, { id: 'p2', items: [items[1]] }] };
  const pages = visiblePages(unit, results);
  assert.equal(pages.length, 1);
  assert.equal(pages[0].id, 'p1');
  assert.equal(failingKeySet(results).has('pu-cafe|b'), true);
  // no report yet: show everything
  assert.equal(visibleItems('pu-cafe', items, null).length, 3);
});

test('the Practical view has no learner-facing native-review badge', () => {
  const src = fs.readFileSync(new URL('../src/curriculum/practical.view.js', import.meta.url), 'utf8');
  assert.equal(/Needs native review/.test(src), false);
  assert.equal(/data-native-review/.test(src), false);
});

test('showRimon is the page-complete hook and dispatches alef:rimon', () => {
  const events = [];
  const doc = { dispatchEvent(ev) { events.push(ev); return true; } };
  const prev = globalThis.document;
  globalThis.document = doc;
  try {
    showRimon('highfive', { from: 'practical' });
    signalRimon('bounce');
  } finally {
    globalThis.document = prev;
  }
  assert.equal(events.length, 2);
  assert.equal(events[0].type, 'alef:rimon');
  assert.equal(events[0].detail.action, 'highfive');
  assert.equal(events[0].detail.from, 'practical');
});

test('due badge is painted on Practical nav links and progress is a 0–1 fraction', () => {
  assert.equal(progressFraction(2, 4), 0.5);
  assert.equal(progressFraction(0, 0), 0);
  assert.equal(dueCardCount({ cards: {} }), 0);
  const doc = {
    els: [],
    querySelectorAll() { return this.els; },
    createElement(name) { return { name, className: '', textContent: '', setAttribute() {}, }; },
  };
  const a = { querySelectorAll() { return []; }, appendChild(el) { this.badge = el; } };
  doc.els = [a];
  paintDueBadge(doc, 3);
  assert.equal(a.badge.className, 'alef-nav-due');
  assert.equal(a.badge.textContent, '3 due');
});
