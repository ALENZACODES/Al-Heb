import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const DATA = JSON.parse(readFileSync(new URL('../data/homepage/prayers.json', import.meta.url), 'utf8'));
const KEY = 'alef:opening-prayer:listens:v1';
let instance = 0;

function element() {
  const handlers = new Map();
  return {
    dataset: {}, hidden: true, removed: false, textContent: '',
    classList: { add() {} },
    setAttribute() {},
    addEventListener(type, callback) { handlers.set(type, callback); },
    fire(type) { handlers.get(type)?.({ type, stopPropagation() {} }); },
    remove() { this.removed = true; }
  };
}

async function prepare({ play = 'resolve' } = {}) {
  const names = [
    'alef-prayer-veil', 'alef-prayer-he', 'alef-prayer-tr',
    'alef-prayer-en', 'alef-prayer-listen', 'alef-prayer-audio-note',
    'alef-prayer-audio-prompt', 'alef-prayer-close', 'alef-prayer-noshow'
  ];
  const nodes = new Map(names.map(id => [id, element()]));
  const local = new Map([['alef:opening-prayer:seen:v1', '1']]);
  const originals = {
    document: globalThis.document, localStorage: globalThis.localStorage,
    Audio: globalThis.Audio, fetch: globalThis.fetch
  };
  let media;
  let resolvePlay;
  globalThis.document = {
    body: { dataset: { ready: '1' } },
    getElementById: id => nodes.get(id) || null,
    addEventListener() {}, removeEventListener() {}
  };
  globalThis.localStorage = {
    getItem: key => local.get(key) ?? null,
    setItem: (key, value) => void local.set(key, String(value))
  };
  globalThis.Audio = class FakeAudio {
    constructor() { media = this; this.src = ''; this.paused = false; }
    getAttribute(name) { return name === 'src' ? this.src : null; }
    removeAttribute(name) { if (name === 'src') this.src = ''; }
    pause() { this.paused = true; }
    load() {}
    play() {
      this.paused = false;
      if (play === 'reject') return Promise.reject(Object.assign(new Error('unsupported'), { name: 'NotSupportedError' }));
      if (play === 'pending') return new Promise(resolve => { resolvePlay = resolve; });
      return Promise.resolve();
    }
  };
  globalThis.fetch = async () => ({ ok: true, json: async () => DATA });
  try {
    await import('../src/shell/prayer-veil.js?completion-case=' + (++instance));
    await new Promise(resolve => setImmediate(resolve));
  } catch (err) {
    Object.assign(globalThis, originals);
    throw err;
  }
  const close = () => nodes.get('alef-prayer-close').fire('click');
  return {
    local, nodes, media: () => media, resolvePlay: () => resolvePlay?.(),
    close,
    restore() { close(); Object.assign(globalThis, originals); }
  };
}

test('a resolved play and an early pause earn no prayer completion; ended earns one only', async () => {
  const h = await prepare();
  try {
    assert.ok(h.media(), 'bank selected a clip to play');
    assert.equal(h.local.get(KEY), undefined, 'play() resolving is not completion');
    h.nodes.get('alef-prayer-listen').fire('click'); // Pause
    assert.equal(h.local.get(KEY), undefined);
    h.nodes.get('alef-prayer-listen').fire('click'); // Resume
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.local.get(KEY), undefined);
    h.media().onended();
    assert.equal(h.local.get(KEY), '1');
    h.media().onended(); // duplicate media event cannot award twice
    assert.equal(h.local.get(KEY), '1');
  } finally { h.restore(); }
});

test('an early close prevents a late play() resolution from earning credit', async () => {
  const h = await prepare({ play: 'pending' });
  try {
    assert.ok(h.media());
    h.close();
    h.resolvePlay();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.local.get(KEY), undefined);
    assert.equal(h.nodes.get('alef-prayer-veil').removed, true);
  } finally { h.restore(); }
});

test('unsupported media never awards a prayer completion', async () => {
  const h = await prepare({ play: 'reject' });
  try {
    assert.equal(h.local.get(KEY), undefined);
    assert.equal(h.nodes.get('alef-prayer-listen').hidden, true);
  } finally { h.restore(); }
});
