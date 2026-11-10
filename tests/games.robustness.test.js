import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dealTugPairs, PAIRS } from '../src/games/tugowar.view.js';
import { pinballKeyCommand } from '../src/games/pinball.view.js';
import * as prefix from '../src/games/prefixblast.view.js';
import * as palace from '../src/games/memorypalace.view.js';
import { createImageResolver } from '../src/img/resolve.js';
import { Doc, El } from './wordtrace.fakedom.js';

const json = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));

function environment() {
  const doc = new Doc();
  globalThis.document = doc;
  El.prototype.append = function (...nodes) { for (const n of nodes) this.appendChild(typeof n === 'object' ? n : doc.createTextNode(String(n))); };
  El.prototype.prepend = function (...nodes) { for (const n of nodes.reverse()) this.insertBefore(typeof n === 'object' ? n : doc.createTextNode(String(n)), this.firstChild); };
  El.prototype.replaceChildren = function (...nodes) { this.textContent = ''; this.append(...nodes); };
  Object.defineProperty(El.prototype, 'isConnected', { configurable: true, get: () => true });
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  return doc.createElement('main');
}
const flush = async (f) => {
  for (let n = 0; n < 200 && !f(); n++) await new Promise((r) => setTimeout(r, 5));
  assert.ok(f(), 'view became ready');
};
const button = (root, text) => root.querySelectorAll('button').find((b) => b.textContent === text);

test('a tug deal uses ten distinct pairs from the whole list', () => {
  const dealt = dealTugPairs(PAIRS, 10, () => 0);
  assert.equal(dealt.length, 10);
  assert.equal(new Set(dealt).size, 10);
  const late = PAIRS[PAIRS.length - 1];
  const found = dealTugPairs(PAIRS, 12, () => 0.99);
  assert.ok(found.includes(late));
  assert.equal(dealTugPairs(PAIRS, 12).length, 12);
});

test('pinball arrows still aim when a button has focus; space on a button is not a second launch', () => {
  assert.equal(pinballKeyCommand('ArrowLeft', 'BUTTON'), 'aim-left');
  assert.equal(pinballKeyCommand('ArrowRight', 'H1'), 'aim-right');
  assert.equal(pinballKeyCommand(' ', 'BUTTON'), null);
  assert.equal(pinballKeyCommand(' ', 'H1'), 'launch');
  assert.equal(pinballKeyCommand('ArrowLeft', 'INPUT'), null);
  assert.equal(pinballKeyCommand('Enter', 'DIV'), null);
});

test('a repeated wrong prefix does not drain the score again', async () => {
  const root = environment();
  const deck = prefix.buildPrefixDeck({ words: json('data/vocab/words.json').words, registry: json('data/corpus/registry.json').entries });
  const stop = prefix.mount(root, { images: { resolve: () => null } });
  await flush(() => root.querySelector('.prefix-bubble'));
  const first = () => {
    const prompt = root.querySelector('.prefix-pedestal');
    const he = prompt.querySelector('[lang=he]').textContent;
    const meaning = prompt.querySelector('p').textContent.slice(6);
    return deck.find((r) => r.baseHe === he && r.meaning === meaning);
  };
  const rec = first();
  root.querySelectorAll('.prefix-bubble').find((b) => b.querySelector('[lang=he]').textContent === rec.prefix).click();
  assert.match(root.querySelector('[role=status]').textContent, /Score 10/);
  const next = first();
  const wrong = root.querySelectorAll('.prefix-bubble').find((b) => b.querySelector('[lang=he]').textContent !== next.prefix);
  wrong.click();
  wrong.click();
  root.querySelectorAll('.prefix-bubble').find((b) => b.querySelector('[lang=he]').textContent === next.prefix).click();
  assert.match(root.querySelector('[role=status]').textContent, /Score 17/);
  assert.equal(wrong.disabled, true);
  stop();
});

test('recall stations do not announce the letter name, and a repeat miss is not scored again', async () => {
  const root = environment();
  const letters = json('data/letters/letters.json');
  const R = createImageResolver({
    index: json('data/img/index.json'),
    approvals: json('data/images/approvals.json'),
  });
  const stop = palace.mount(root, { images: R });
  await flush(() => root.querySelector('.palace-station'));
  for (const b of root.querySelectorAll('.palace-station')) b.click();
  button(root, 'Walk the route').click();
  for (let n = 0; n < 5; n++) (button(root, 'Next stop') || button(root, 'Begin recall')).click();
  for (const b of root.querySelectorAll('.palace-station')) {
    assert.equal(b.getAttribute('aria-label'), 'Picture station');
    assert.equal(b.querySelector('img').getAttribute('alt'), '');
  }
  const stations = palace.buildStations(letters, R);
  const he = root.querySelector('[role=status]').querySelector('[lang=he]').textContent;
  const ids = stations.filter((s) => s.he === he).map((s) => s.id);
  const wrong = [...root.querySelectorAll('.palace-station')].find((b) => !ids.includes(b.getAttribute('data-img-id')));
  const wrongId = wrong.getAttribute('data-img-id');
  wrong.click();
  const again = [...root.querySelectorAll('.palace-station')].find((b) => b.getAttribute('data-img-id') === wrongId);
  again.click();
  assert.match(root.querySelector('[role=status]').textContent, /already tried/);
  assert.ok(again.hasAttribute('disabled'));
  stop();
});
