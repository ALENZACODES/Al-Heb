// J5 focus mode: chrome hidden, large text, one passage at a time, from books, texts and Torah chapters.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSource, loadPassages, FOCUS_CSS } from '../src/platform/focus.js';

test('sources: books, registry texts and Torah chapters; anything else is refused', async () => {
  assert.deepEqual(parseSource('torah:genesis:1'), { kind: 'torah', id: 'genesis', chapter: 1 });
  assert.equal(parseSource('torah:genesis'), null);
  assert.equal(parseSource('file:../../x'), null);
  const b = await loadPassages('book:book1');
  assert.equal(b.title, "The Monkey Who Didn't Know"); assert.ok(b.passages.length >= 10);
  const t = await loadPassages('torah:genesis:1');
  assert.equal(t.passages.length, 31); assert.equal(t.passages[0].label, 'Verse 1');
  const s = await loadPassages('text:shema-1');
  for (const p of s.passages) { assert.doesNotMatch(p.he, /יְהוָה/); assert.match(p.he, /ה׳/); }
  await assert.rejects(loadPassages('text:nope'));
  assert.match(FOCUS_CSS, /\.site-header[\s\S]*\.site-nav[\s\S]*display: none !important/);
});

test('the page shows one passage, moves with the buttons, and restores the chrome on leaving', async () => {
  const { N, tick } = await import('./torahread.fakedom.js');
  const attrs = {}; const listeners = {};
  const saved = globalThis.document;
  globalThis.document = { ...saved, documentElement: { setAttribute: (k) => { attrs[k] = true; }, removeAttribute: (k) => { delete attrs[k]; } }, head: { append() {} }, addEventListener: (t, f) => { listeners[t] = f; }, removeEventListener: (t) => { delete listeners[t]; } };
  try {
    const V = await import('../src/platform/focus.view.js');
    const root = new N('main'); const un = V.mount(root, { query: { src: 'torah:genesis:1' } }); await tick(80);
    assert.equal(attrs['data-focus-mode'], true);
    assert.match(root.textContent, /1 of 31/);
    const next = root.all((n) => n.tag === 'button' && n.textContent === 'Next')[0];
    await next.click(); assert.match(root.textContent, /2 of 31/);
    listeners.keydown({ key: 'ArrowRight', target: { tagName: 'BODY' } }); assert.match(root.textContent, /3 of 31/);
    un();
    assert.equal(attrs['data-focus-mode'], undefined); assert.equal(listeners.keydown, undefined);
  } finally { globalThis.document = saved; }
});
