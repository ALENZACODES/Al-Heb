// The companion's still layer (src/shell/rimon.js showStill / clearPose) and the speech bubble's line(), on a fake DOM.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument, createStore, ev, flush } from './rimon.fakedom.js';

async function withCompanion(fn, { store = createStore() } = {}) {
  const saved = { Image: globalThis.Image, add: globalThis.addEventListener, remove: globalThis.removeEventListener, w: globalThis.innerWidth, h: globalThis.innerHeight };
  globalThis.Image = class { set src(v) { queueMicrotask(() => this.onload?.()); } };
  globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
  globalThis.innerWidth = 1024; globalThis.innerHeight = 768;
  const { mountRimon } = await import('../src/shell/rimon.js');
  const doc = createDocument();
  const r = mountRimon({ store, doc });
  try { await r.ready; await fn({ r, doc, store, host: r.element, still: r.element.querySelector('.rimon-still') }); }
  finally { r.destroy(); Object.assign(globalThis, { Image: saved.Image, addEventListener: saved.add, removeEventListener: saved.remove, innerWidth: saved.w, innerHeight: saved.h }); }
}

test('a page still dresses Rimon for the screen; a pose covers it for a moment and then gives it back', async () => {
  await withCompanion(async ({ r, host, still }) => {
    assert.ok(still, 'the still layer exists'); assert.equal(still.hidden, true);
    assert.equal(still.getAttribute('aria-hidden'), 'true');
    r.showStill('data/images/rimon/rimon-135.webp');
    assert.equal(still.hidden, false); assert.ok(host.classList.contains('rimon-has-still'));
    assert.equal(r.pageStill, 'data/images/rimon/rimon-135.webp');
    r.showStill('data/images/rimon/rimon-018.webp', { ms: 40 });
    assert.match(still.src, /rimon-018/);
    await flush(70);
    assert.match(still.src, /rimon-135/, 'back to the page still');
    r.showStill('data/images/rimon/rimon-076.webp', { ms: 5000 }); r.clearPose();
    assert.match(still.src, /rimon-135/, 'activity ends a long pose at once');
    r.showStill(null);
    assert.equal(still.hidden, true); assert.ok(!host.classList.contains('rimon-has-still'));
  });
});

test('a new screen clears the page still; a hidden Rimon refuses stills', async () => {
  await withCompanion(async ({ r, doc, still }) => {
    r.showStill('data/images/rimon/rimon-152.webp');
    doc.dispatchEvent(ev('alef:ready'));
    assert.equal(still.hidden, true); assert.equal(r.pageStill, null);
  });
  await withCompanion(async ({ r, still }) => {
    assert.equal(r.showStill('data/images/rimon/rimon-018.webp', { ms: 1000 }), false);
    assert.equal(still.hidden, true);
  }, { store: createStore({ 'rimon.dismissed': true }) });
});

test('a reaction steps out of the page still so the move is seen, then the still returns', async () => {
  await withCompanion(async ({ r, still }) => {
    r.showStill('data/images/rimon/rimon-135.webp');
    await r.play('bounce');
    assert.equal(still.hidden, true, 'the bounce animation shows');
    await r.play('blink');
    assert.equal(still.hidden, true);
  });
});

test('a still line goes into the speech bubble with its Hebrew; English-only lines work too', async () => {
  await withCompanion(async ({ r, doc }) => {
    r.showStill('data/images/rimon/rimon-098.webp', { ms: 1000, line: { en: 'Shanah tovah! A sweet new year.', he: 'שָׁנָה טוֹבָה!' } });
    const bubble = doc.querySelector('.rimon-bubble');
    assert.match(bubble.textContent, /Shanah tovah/);
    assert.match(bubble.textContent, /שָׁנָה טוֹבָה/);
    r.showStill(null, { ms: 10, line: { en: 'Just English.' } });
    assert.match(bubble.textContent, /Just English\./);
  });
});
