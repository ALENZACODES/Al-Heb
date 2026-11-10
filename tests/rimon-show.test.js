import { test } from 'node:test';
import assert from 'node:assert/strict';
import { showRimon, rimonSlot, rimonCandidates, registerRimonProvider, SITUATIONS } from '../src/shell/rimon-show.js';
import { showAnswerBand, bandWord } from '../src/shell/answer-band.js';

function fakeDoc() {
  const mk = (tag) => {
    const n = { tagName: tag.toUpperCase(), children: [], dataset: {}, attrs: {}, listeners: {}, hidden: false, className: '', textContent: '', offsetWidth: 1,
      classList: { set: new Set(), add(c) { this.set.add(c); }, remove(c) { this.set.delete(c); }, contains(c) { return this.set.has(c); } },
      setAttribute(k, v) { this.attrs[k] = v; }, append(...k) { for (const c of k) { c.parent = n; n.children.push(c); } }, replaceChildren(...k) { n.children = []; n.append(...k); },
      addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }, remove() { if (n.parent) n.parent.children = n.parent.children.filter((c) => c !== n); n.removed = true; },
      fire(t) { for (const f of this.listeners[t] || []) f(); } };
    return n;
  };
  const body = mk('body');
  return { body, createElement: mk, getElementById(id) { return body.children.find((c) => c.id === id) || null; }, querySelector() { return null; } };
}
const win = { matchMedia: () => ({ matches: false }), setTimeout: () => 0, clearTimeout() {} };

test('every situation maps to on-demand webp stills', () => {
  assert.ok(Object.keys(SITUATIONS).length >= 20);
  for (const k of Object.keys(SITUATIONS)) for (const u of rimonCandidates(k, { rotate: false })) assert.match(u, /^data\/images\/rimon\/rimon-\d{3}\.webp$/);
});
test('unknown situation, missing DOM or settings off: nothing shown, no throw', () => {
  assert.equal(showRimon('nope', { doc: fakeDoc(), win }), null);
  assert.equal(showRimon('correct', { doc: {}, win }), null);
  assert.equal(showRimon('correct', { doc: fakeDoc(), win, settings: { get: (k) => k === 'rimonOff' } }), null);
  assert.doesNotThrow(() => showRimon('correct', { doc: { createElement() { throw new Error('x'); }, body: {} } }));
});
test('fail-safe: walks fallbacks on error, removes itself when none load', () => {
  const doc = fakeDoc();
  const img = showRimon('offline', { doc, win });
  assert.ok(img); assert.equal(img.hidden, true, 'hidden until a still loads');
  const spot = doc.body.children[0];
  img.fire('error'); img.fire('error'); img.fire('error');
  assert.equal(spot.removed, true);
});
test('a loaded still becomes visible; reduced motion drops the burst', () => {
  const doc = fakeDoc();
  const img = showRimon('correct', { doc, win }); img.fire('load');
  assert.equal(img.hidden, false); assert.ok(img.classList.contains('alef-rimon-burst'));
  const calm = showRimon('correct', { doc, win: { ...win, matchMedia: () => ({ matches: true }) } });
  assert.equal(calm.classList.contains('alef-rimon-burst'), false);
  assert.equal(showRimon('shabbat', { doc, win }).classList.contains('alef-rimon-burst'), false, 'no burst on Shabbat');
});
test('slot and provider hooks', () => {
  const doc = fakeDoc();
  const slot = rimonSlot('welcome', { doc, win });
  assert.equal(slot.dataset.rimonSlot, 'welcome'); assert.equal(slot.children.length, 1);
  const off = registerRimonProvider((s) => (s === 'welcome' ? ['x/custom.webp'] : null));
  assert.deepEqual(rimonCandidates('welcome'), ['x/custom.webp']);
  off();
  assert.notDeepEqual(rimonCandidates('welcome'), ['x/custom.webp']);
});
test('answer band: colour class, words rotate, never throws', () => {
  const doc = fakeDoc();
  assert.equal(showAnswerBand(true, { doc, win }), true);
  const band = doc.getElementById('alef-answer-band') || doc.body.children.find((c) => c.className.includes('alef-answer-band'));
  assert.ok(band.className.includes('is-ok'));
  showAnswerBand(false, { doc, win });
  assert.ok(band.className.includes('is-no'));
  assert.notEqual(bandWord(true, 0), bandWord(true, 1));
  assert.equal(showAnswerBand(true, { doc: null }), false);
});
