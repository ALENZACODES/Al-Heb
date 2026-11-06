import test from 'node:test';
import assert from 'node:assert/strict';
import { PAIRS, STORE_KEY, mount as mountTug } from '../src/games/tugowar.view.js';
import { BASKET_MAX, BASKET_MIN, BASKET_STEP, basketPosition, mount as mountCatcher } from '../src/games/vowelcatcher.view.js';
import { Doc, El } from './wordtrace.fakedom.js';

function environment() {
  const doc = new Doc();
  globalThis.document = doc;
  El.prototype.append = function (...nodes) { for (const n of nodes) this.appendChild(typeof n === 'object' ? n : doc.createTextNode(String(n))); };
  El.prototype.prepend = function (...nodes) { for (const n of nodes.reverse()) this.insertBefore(typeof n === 'object' ? n : doc.createTextNode(String(n)), this.firstChild); };
  El.prototype.replaceChildren = function (...nodes) { this.textContent = ''; this.append(...nodes); };
  Object.defineProperty(El.prototype, 'isConnected', { configurable: true, get: () => true });
  const listeners = [];
  globalThis.window = {
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.document.addEventListener = (type, fn) => listeners.push([type, fn]);
  El.prototype.contains = function (node) {
    let p = node;
    while (p) { if (p === this) return true; p = p.parentNode; }
    return false;
  };
  globalThis.document.removeEventListener = () => {};
  let frame = null;
  globalThis.requestAnimationFrame = (fn) => { frame = fn; return 1; };
  globalThis.cancelAnimationFrame = () => { frame = null; };
  return { root: doc.createElement('main'), listeners, step: (ts = 1000) => { const fn = frame; frame = null; if (fn) fn(ts); } };
}
function memoryStore() {
  const data = new Map();
  return { get: (k) => data.get(k), set: (k, v) => data.set(k, v) };
}
const flush = async (f) => {
  for (let n = 0; n < 40 && !f(); n++) await new Promise((r) => setTimeout(r, 20));
  assert.ok(f(), 'view became ready');
};

test('a tug win then Play again starts at score 0 and keeps the saved best', async () => {
  const { root } = environment();
  const store = memoryStore();
  const stop = mountTug(root, { images: { resolve: () => null }, store });
  await flush(() => root.querySelector('.game-choice'));
  assert.match(root.querySelector('.game-status').textContent, /Score 0 · Streak 0/);
  for (let n = 0; n < 12 && !root.querySelector('.game-results'); n++) {
    const he = root.querySelector('.game-prompt').querySelector('[lang=he]').textContent;
    const pair = PAIRS.find((p) => p[0] === he);
    const choice = [...root.querySelectorAll('.game-choice')].find((b) => b.querySelector('[lang=he]').textContent === pair[3]);
    choice.click();
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.ok(root.querySelector('.game-results'));
  const kept = store.get(STORE_KEY);
  assert.ok(kept.best > 0);
  assert.equal(kept.plays, 1);
  [...root.querySelectorAll('button')].find((b) => b.textContent === 'Play again').click();
  const again = root.querySelector('.game-status').textContent;
  assert.match(again, /Round 1 of 10/);
  assert.match(again, /Score 0 · Streak 0/);
  const he = root.querySelector('.game-prompt').querySelector('[lang=he]').textContent;
  const pair = PAIRS.find((p) => p[0] === he);
  [...root.querySelectorAll('.game-choice')].find((b) => b.querySelector('[lang=he]').textContent === pair[3]).click();
  await new Promise((r) => setTimeout(r, 500));
  assert.match(root.querySelector('.game-status').textContent, /Score 10 · Streak 1/);
  assert.equal(store.get(STORE_KEY).best, kept.best);
  assert.equal(store.get(STORE_KEY).plays, 1);
  stop();
  const back = environment();
  mountTug(back.root, { images: { resolve: () => null }, store });
  await flush(() => back.root.querySelector('.game-choice'));
  assert.match(back.root.querySelector('.game-status').textContent, /Score 0 · Streak 0/);
  assert.equal(store.get(STORE_KEY).best, kept.best);
});

test('vowel catcher keeps the basket decorative and exposes focusable controls', async () => {
  globalThis.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  const { root, step } = environment();
  const stop = mountCatcher(root, { fetchFn: async (url) => {
    const { readFileSync } = await import('node:fs');
    return { ok: true, json: async () => JSON.parse(readFileSync(new URL('../' + url, import.meta.url), 'utf8')) };
  } });
  await flush(() => /Target \d+ of /.test(root.textContent));
  step(1000);
  const basket = root.querySelector('.catcher-basket');
  const board = root.querySelector('.game-board');
  const sky = root.querySelector('.catcher-sky');
  assert.equal(basket.getAttribute('aria-hidden'), 'true');
  assert.equal(board.getAttribute('aria-hidden'), null);
  assert.equal(sky.getAttribute('aria-hidden'), null);
  assert.equal(sky.getAttribute('role'), 'group');
  const pause = [...root.querySelectorAll('button')].find((b) => b.textContent === 'Pause');
  const place = root.querySelector('input.catcher-place');
  assert.ok(pause);
  assert.equal(place.getAttribute('aria-label'), 'Basket position');
  place.value = '20';
  place.dispatch('input', { target: place });
  assert.match(place.getAttribute('aria-valuetext'), /20/);
  pause.click();
  assert.equal(pause.getAttribute('aria-pressed'), 'true');
  assert.match(root.textContent, /Reduced motion is on/);
  await new Promise((r) => setTimeout(r, 30));
  const star = root.querySelector('button.catcher-star');
  assert.ok(star, 'a still mark is a button when reduced motion is on');
  assert.equal(star.getAttribute('aria-hidden'), null);
  assert.match(star.getAttribute('aria-label'), /^Catch /);
  stop();
});

test('basket stops include 4 and 96, and pointer, arrows, and the slider share one value', async () => {
  assert.equal(basketPosition(4), BASKET_MIN);
  assert.equal(basketPosition(96), BASKET_MAX);
  assert.equal(basketPosition(50), 50);
  assert.equal(basketPosition(58), 58);
  assert.equal(basketPosition(70), 70);
  assert.equal((BASKET_MAX - BASKET_MIN) % BASKET_STEP, 0);
  let x = BASKET_MIN;
  while (x < BASKET_MAX) x += BASKET_STEP;
  assert.equal(x, BASKET_MAX);
  globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  const { root, listeners } = environment();
  const stop = mountCatcher(root, { images: { resolve: () => null }, fetchFn: async () => ({ ok: false }) });
  const place = root.querySelector('input.catcher-place');
  const basket = root.querySelector('.catcher-basket');
  assert.equal(place.getAttribute('min'), '4');
  assert.equal(place.getAttribute('max'), '96');
  assert.equal(place.getAttribute('step'), '2');
  assert.equal(place.value, '50');
  assert.equal(basket.style.insetInlineStart, '50%');
  const sky = root.querySelector('.catcher-sky');
  sky.dispatch('pointerdown', { clientX: 700, pointerId: 1 });
  assert.equal(place.value, '70');
  assert.equal(place.getAttribute('aria-valuenow'), '70');
  assert.equal(basket.style.insetInlineStart, '70%');
  const pause = [...root.querySelectorAll('button')].find((b) => b.textContent === 'Pause');
  const onKey = listeners.find(([type]) => type === 'keydown')[1];
  onKey({ key: 'ArrowRight', target: pause, preventDefault() {} });
  assert.equal(place.value, '72');
  assert.equal(basket.style.insetInlineStart, '72%');
  place.value = '96';
  place.dispatch('input', { target: place });
  assert.equal(place.value, '96');
  assert.equal(basket.style.insetInlineStart, '96%');
  place.value = '4';
  place.dispatch('input', { target: place });
  assert.equal(place.value, '4');
  assert.equal(basket.style.insetInlineStart, '4%');
  onKey({ key: 'ArrowLeft', target: pause, preventDefault() {} });
  assert.equal(place.value, '4');
  stop();
});
