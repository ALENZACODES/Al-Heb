// S-09 (12 Nov audit): long book clips were slow to start. The page's clip (learner's voice) is attached with preload="metadata" when
// the page is drawn, and once a voice plays the next page's clip in that voice is fetched quietly. Measured here with a fake DOM only:
// the live host's timing cannot be measured from this checkout.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newRoot, all, El, waitFor } from './pronunciation.dom-helper.js';
import { pageClip, nextClip } from '../src/books/book.view.js';

const pages = [
  { he: 'א', translit: 'a', en: 'one', audio: { f: 'audio/f/book/x-1.mp3', m: 'audio/m/book/x-1.mp3' } },
  { he: 'ב', translit: 'b', en: 'two', audio: { f: 'audio/f/book/x-2.mp3', m: 'audio/m/book/x-2.mp3' } },
  { he: 'ג', translit: 'g', en: 'three', audioHeld: 'review' },
];

test('S-09: pageClip and nextClip skip held pages and missing voices', () => {
  assert.equal(pageClip(pages[0], 'f'), 'audio/f/book/x-1.mp3');
  assert.equal(pageClip(pages[2], 'f'), '');
  assert.equal(nextClip(pages, 0, 'm'), 'audio/m/book/x-2.mp3');
  assert.equal(nextClip(pages, 1, 'm'), '', 'the next page is held');
  assert.equal(nextClip(pages, 2, 'm'), '', 'no next page');
});

test('S-09: the page clip is primed with preload=metadata, Listen reuses it, and playing warms the next page once', async () => {
  // the fake DOM, plus what the book view needs from a real one
  Object.assign(El.prototype, {
    removeAttribute(k) { delete this.attrs[k]; },
    get classList() { const el = this; return { add: (c) => el.setAttribute('class', ((el.getAttribute('class') || '') + ' ' + c).trim()), remove() {}, contains: () => false, toggle() {} }; },
    querySelectorAll() { return []; },
    get isConnected() { return true; },
    pause() { this.paused = true; }, load() { this.loads = (this.loads || 0) + 1; },
    play() { this.plays = (this.plays || 0) + 1; return Promise.resolve(); },
  });
  const root = newRoot();
  globalThis.document = root.ownerDocument;
  const fetched = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (u) => { fetched.push(String(u)); return { ok: true, arrayBuffer: async () => new ArrayBuffer(1) }; };
  try {
    const book = { id: 'x', titleEn: 'X', pages };
    const ctx = { params: { id: 'x' }, query: {}, settings: { get: (k) => (k === 'voice' ? 'm' : undefined) },
      store: { get: async () => null, set: async () => {} },
      fetchFn: async (u) => ({ ok: true, json: async () => (u.endsWith('index.json') ? { books: [] } : book) }) };
    const V = await import('../src/books/book.view.js');
    await V.mount(root, ctx);
    const audio = all(root, (x) => x.tagName === 'AUDIO')[0];
    assert.equal(audio.getAttribute('preload'), 'metadata');
    assert.equal(audio.getAttribute('src'), 'audio/m/book/x-1.mp3', "page 1's clip in the learner's voice (Ari) is attached at once");
    const ari = all(root, (x) => x.tagName === 'BUTTON' && /Listen \(Ari\)/.test(x.textContent))[0];
    ari.dispatch('click');
    await waitFor(() => audio.plays === 1);
    assert.equal(audio.getAttribute('src'), 'audio/m/book/x-1.mp3');
    assert.equal(fetched.length, 0, 'nothing is warmed before the voice plays');
    audio.dispatch('playing');
    audio.dispatch('playing');
    assert.deepEqual(fetched, ['audio/m/book/x-2.mp3'], 'the next page is fetched once, same voice');
    const next = all(root, (x) => x.tagName === 'BUTTON' && /Next/.test(x.textContent))[0];
    next.dispatch('click');
    assert.equal(audio.getAttribute('src'), 'audio/m/book/x-2.mp3', 'the next page primes its own clip');
    audio.dispatch('error'); // a preload error before Listen says nothing; only a requested play reports a failure
    assert.doesNotMatch(root.textContent, /did not load/);
    audio.dispatch('playing');
    assert.equal(fetched.length, 1, 'page 3 is held, so nothing more is fetched');
  } finally { globalThis.fetch = realFetch; }
});
