// J6 keyboard shortcuts page: every listed shortcut is backed by code that implements it; "?" opens the page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SHORTCUTS } from '../src/platform/shortcuts.js';

test('every shortcut on the page is found in the code that makes it work', () => {
  assert.ok(SHORTCUTS.length >= 10);
  for (const s of SHORTCUTS) {
    if (s.native) { assert.equal(s.proof, undefined); continue; }
    const src = readFileSync(new URL('../' + s.file, import.meta.url), 'utf8');
    assert.ok(src.includes(s.proof), `${s.where} ${s.keys}: "${s.proof}" not found in ${s.file}`);
  }
});

test('rows that follow the setting really check it; "always" rows are the ones that do not', () => {
  const follows = { 'src/curriculum/exercises.ui.js': /onKeys\(/, 'src/curriculum/review.view.js': /shortcutsOn\(ctx\)/, 'src/curriculum/fade.view.js': /onKeys\(/, 'src/app.js': /shortcutsOn\(\{ settings \}\)/ };
  for (const s of SHORTCUTS.filter((x) => !x.always)) {
    assert.ok(follows[s.file], `${s.file} is listed as following the setting`);
    assert.match(readFileSync(new URL('../' + s.file, import.meta.url), 'utf8'), follows[s.file]);
  }
});

test('the page renders the table with the current setting', async () => {
  const { N, tick } = await import('./torahread.fakedom.js');
  const V = await import('../src/platform/shortcuts.view.js');
  const root = new N('main'); V.mount(root, { settings: { get: (k) => (k === 'keyShortcuts' ? false : undefined) } }); await tick(1);
  assert.match(root.textContent, /Single-key shortcuts are off on this device/);
  assert.equal(root.queryAll('tbody').flatMap((b) => b.queryAll('tr')).length, SHORTCUTS.length);
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /e\.key === '\?'[\s\S]{0,400}location\.hash = '#\/shortcuts'/);
});
