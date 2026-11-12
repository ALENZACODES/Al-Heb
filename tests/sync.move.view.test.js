// Lane 4 (12 Nov): the Move to Another Device page on a fake DOM: send makes a link and a QR code, opening the link on
// another device previews and then merges (never overwrites), a locked link asks for the passphrase.
import test from 'node:test';
import assert from 'node:assert/strict';
import { install, newRoot, El, tick } from './wordtrace.fakedom.js';
import { createStore, createMemoryStorage } from '../src/store.js';

const doc = install();
const toNode = (c) => (typeof c === 'string' ? doc.createTextNode(c) : c);
El.prototype.append = function (...k) { for (const c of k) this.appendChild(toNode(c)); };
El.prototype.replaceChildren = function (...k) { for (const c of [...this.childNodes]) this.removeChild(c); this.append(...k); };
El.prototype.remove = function () { this.parentNode?.removeChild(this); };
doc.head = doc.createElement('head'); doc.getElementById = () => null; doc.body = doc.createElement('body');
let copied = '';
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async (t) => { copied = t; } } } });
let replaced = null;
Object.defineProperty(globalThis, 'location', { configurable: true, value: { href: 'https://alef-review.onrender.com/#/move', hash: '#/move?p=x' } });
Object.defineProperty(globalThis, 'history', { configurable: true, value: { replaceState: (_a, _b, u) => { replaced = u; } } });
const { mount } = await import('../src/sync/move.view.js');
const T0 = Date.UTC(2026, 10, 2, 15);
const mk = () => createStore({ storage: createMemoryStorage(), window: null });
async function until(fn, ms = 4000) { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await tick(20); } return fn(); }

test('send then receive: link and QR on one device, preview and merge on the other; nothing is removed and the address bar is cleaned', async () => {
  const phone = mk(); phone.set('curriculum.progress', { completed: { r01: T0 } }); phone.set('srs.cards', { 'letter:alef': { id: 'letter:alef', due: T0, reps: 1, lastReview: T0 } });
  const root = newRoot(doc); mount(root, { store: phone, query: {} });
  assert.match(root.querySelector('#mv-no-account').textContent, /no accounts.*own devices.*Nothing goes to a server/);
  assert.match(root.querySelector('#mv-reconnect').textContent, /import merges, never overwrites/);
  root.querySelector('#mv-make').click();
  const link = await until(() => root.querySelector('#mv-link')?.getAttribute('href'));
  assert.match(link, /^https:\/\/alef-review\.onrender\.com\/#\/move\?p=[A-Za-z0-9_-]+$/);
  const img = root.querySelector('#mv-qr')?.querySelector('img'); assert.ok(img, 'a QR code is shown for small progress');
  assert.match(img.getAttribute('src'), /^data:image\/svg\+xml/);
  root.querySelector('#mv-copy').click(); await tick(20); assert.equal(copied, link);

  const tablet = mk(); tablet.set('curriculum.progress', { completed: { r05: T0 + 5 } }); tablet.set('settings', { congregation: 'israeli' });
  const root2 = newRoot(doc); mount(root2, { store: tablet, query: { p: /p=([^&]+)/.exec(link)[1] } });
  const go = await until(() => root2.querySelector('#mv-merge'));
  assert.match(root2.querySelector('#mv-recv-out').textContent, /1 more completed lesson.*1 more review card.*Nothing is removed/);
  assert.deepEqual(Object.keys(tablet.get('curriculum.progress').completed), ['r05'], 'nothing changes before the learner agrees');
  go.click();
  assert.deepEqual(Object.keys(tablet.get('curriculum.progress').completed).sort(), ['r01', 'r05']);
  assert.ok(tablet.get('srs.cards')['letter:alef']); assert.equal(tablet.get('settings').congregation, 'israeli');
  assert.match(root2.querySelector('#mv-done').textContent, /nothing was removed/);
  assert.equal(replaced, '#/move');
});

test('a locked link asks for the passphrase; a wrong one is refused and the right one opens it', async () => {
  const phone = mk(); phone.set('curriculum.progress', { completed: { r02: T0 } });
  const root = newRoot(doc); mount(root, { store: phone, query: {} });
  root.querySelector('#mv-pass').value = 'olive branch';
  root.querySelector('#mv-make').click();
  const link = await until(() => root.querySelector('#mv-link')?.getAttribute('href'));
  const tablet = mk(); const root2 = newRoot(doc);
  mount(root2, { store: tablet, query: {} });
  root2.querySelector('#mv-paste').value = link; root2.querySelector('#mv-paste-go').click();
  const unlock = await until(() => root2.querySelector('#mv-unlock'));
  unlock.value = 'olive'; root2.querySelector('#mv-unlock-go').click();
  assert.match((await until(() => root2.querySelector('#mv-unlock-msg'))).textContent, /does not open/);
  unlock.value = 'olive branch'; root2.querySelector('#mv-unlock-go').click();
  (await until(() => root2.querySelector('#mv-merge'))).click();
  assert.deepEqual(Object.keys(tablet.get('curriculum.progress').completed), ['r02']);
});
