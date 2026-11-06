// Lifecycle/flow checks in the repository's fake DOM, not visual browser QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Doc, El } from './wordtrace.fakedom.js';
import { createImageResolver } from '../src/img/resolve.js';
import { matchRoute, tierOf } from '../src/shell/router.js';
import * as prefix from '../src/games/prefixblast.view.js';
import * as palace from '../src/games/memorypalace.view.js';
import * as pinball from '../src/games/pinball.view.js';
const json = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const letters = json('data/letters/letters.json');
const R = createImageResolver({ index: json('data/img/index.json'), approvals: json('data/images/approvals.json') });
const absentImages = { resolve: () => null };
const flush = async f => {
  for (let n = 0; n < 200 && !f(); n++) await new Promise(r => setTimeout(r, 5));
  assert.ok(f(), 'async view became ready');
};
function environment() {
  const doc = new Doc(); globalThis.document = doc;
  El.prototype.append = function (...nodes) { for (const n of nodes) this.appendChild(typeof n === 'object' ? n : doc.createTextNode(String(n))); };
  El.prototype.prepend = function (...nodes) { for (const n of nodes.reverse()) this.insertBefore(typeof n === 'object' ? n : doc.createTextNode(String(n)), this.firstChild); };
  El.prototype.replaceChildren = function (...nodes) { this.textContent = ''; this.append(...nodes); };
  Object.defineProperty(El.prototype, 'isConnected', { configurable: true, get: () => true });
  const listeners = new Map(), frames = new Map(); let frameId = 0, now = 0;
  globalThis.window = {
    addEventListener: (k, f) => listeners.set(k, f),
    removeEventListener: (k, f) => { if (listeners.get(k) === f) listeners.delete(k); },
  };
  globalThis.requestAnimationFrame = f => { frames.set(++frameId, f); return frameId; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  return { root: doc.createElement('main'), frames, listeners,
    step() { now += 1000 / 60; const batch = [...frames.values()]; frames.clear(); for (const f of batch) f(now); } };
}
const button = (root, text) => root.querySelectorAll('button').find(b => b.textContent === text);
test('all Wave 1 routes remain preview and load the assigned modules', () => {
  for (const name of ['prefixblast', 'memorypalace', 'pinball']) {
    const { route } = matchRoute('#/' + name);
    assert.equal(route.module, '../games/' + name + '.view.js'); assert.equal(tierOf(route), 'preview');
  }
});
test('prefix plays through without images/audio, rejects misses, and replay resets score', async () => {
  const { root } = environment();
  const deck = prefix.buildPrefixDeck({ words: json('data/vocab/words.json').words, registry: json('data/corpus/registry.json').entries });
  const stop = prefix.mount(root, { images: absentImages });
  await flush(() => root.querySelector('.prefix-bubble'));
  let count = 0;
  while (root.querySelector('.prefix-bubble')) {
    const prompt = root.querySelector('.prefix-pedestal');
    const he = prompt.querySelector('[lang=he]').textContent;
    const meaning = prompt.querySelector('p').textContent.slice(6);
    const rec = deck.find(r => r.baseHe === he && r.meaning === meaning);
    assert.ok(rec);
    const choices = root.querySelectorAll('.prefix-bubble');
    choices.find(b => b.querySelector('[lang=he]').textContent !== rec.prefix).click();
    assert.equal(root.querySelector('.prefix-pedestal'), prompt);
    choices.find(b => b.querySelector('[lang=he]').textContent === rec.prefix).click(); count++;
  }
  assert.equal(count, 10); assert.ok(root.querySelector('.game-results'));
  button(root, 'Play again').click(); assert.match(root.querySelector('[role=status]').textContent, /Score 0/);
  stop();
});
test('courtyard study, ordered route and recall reach results; missing resolver exposes no hotspots', async () => {
  const { root } = environment(); const stop = palace.mount(root, { images: R });
  await flush(() => root.querySelector('.palace-station'));
  for (const b of root.querySelectorAll('.palace-station')) b.click();
  button(root, 'Walk the route').click();
  for (let n = 0; n < 5; n++) (button(root, 'Next stop') || button(root, 'Begin recall')).click();
  const stations = palace.buildStations(letters, R);
  for (let n = 0; n < 5; n++) {
    const he = root.querySelector('[role=status]').querySelector('[lang=he]').textContent;
    const ids = stations.filter(s => s.he === he).map(s => s.id);
    root.querySelectorAll('.palace-station').find(b => ids.includes(b.getAttribute('data-img-id'))).click();
  }
  assert.ok(root.querySelector('.game-results')); stop();
  const noPictures = palace.mount(root, { images: absentImages });
  await flush(() => root.textContent.includes('No unresolved stations'));
  assert.equal(root.querySelectorAll('.palace-station').length, 0); noPictures();
});
test('DOM flippers finish eight matching shots; replay and navigation cancel physics and keys', async () => {
  const env = environment(), { root } = env;
  const stop = pinball.mount(root, { images: absentImages });
  await flush(() => root.querySelector('.pinball-bumper'));
  for (let n = 0; n < 8; n++) {
    const text = root.querySelector('[role=status]').textContent;
    const record = letters.find(l => text.startsWith('Hit ' + l.name + ' ·'));
    root.querySelectorAll('.pinball-bumper').find(b => b.textContent === record.he).click();
    button(root, 'Left flipper').click();
    for (let frame = 0; frame < 100 && root.querySelector('[role=status]').textContent.startsWith('Shot launched'); frame++) env.step();
  }
  assert.ok(root.querySelector('.game-results')); assert.equal(env.frames.size, 0);
  assert.equal(root.querySelectorAll('canvas').length, 0);
  button(root, 'Play again').click(); assert.equal(env.frames.size, 1);
  stop(); assert.equal(env.frames.size, 0); assert.equal(env.listeners.size, 0);
});
