import test from 'node:test';
import assert from 'node:assert/strict';
import { N, memStore } from './torahread.fakedom.js'; // fake DOM: checks view logic, not browser rendering
const { mount, CALM_NOTE, PACE_NOTE } = await import('../src/torahreader/torahreader.view.js');

const fakeClock = () => { const timers = new Map(); let id = 0; return { setInterval: (f, ms) => { timers.set(++id, { f, ms }); return id; }, clearInterval: (h) => { timers.delete(h); }, timers, fire: () => { for (const t of [...timers.values()]) t.f(); } }; };
async function make(calm) {
  const root = new N('div'); const clock = fakeClock(); const store = memStore();
  store.m['torahreader.v1'] = { screen: 'study' }; // calm mode is checked on the study passage; the route opens on Torah home
  const ctx = { store, settings: { get: (k) => (k === 'calmMode' ? calm : k === 'congregation' ? 'sephardi' : undefined) }, clock };
  const un = mount(root, ctx); await un.ready; return { root, clock, un };
}
const q = (root, s) => root.queryAll(s);
const cur = (root) => q(root, '.trd-w').findIndex((w) => w.className.includes('trd-cur'));

test('calm mode: no Read with me button, no pace choice, no timer can be created, calm note replaces the pace note', async () => {
  const { root, clock, un } = await make(true);
  assert.equal(q(root, '.trd-run').length, 0);
  assert.equal(q(root, '.trd-speed').length, 0);
  assert.equal(clock.timers.size, 0);
  assert.ok(root.textContent.includes(CALM_NOTE)); assert.ok(!root.textContent.includes(PACE_NOTE));
  assert.match(CALM_NOTE, /does not move on its own/);
  assert.equal(root.all((n) => n.attrs['aria-label'] === 'Step through the words').length, 1);
  assert.equal(root.all((n) => n.attrs['aria-label'] === 'Read with me controls').length, 0);
  un();
});

test('calm mode: Next word and Previous word still move the highlight by hand, announce it, and never start a timer', async () => {
  const { root, clock, un } = await make(true);
  await q(root, '.trd-next')[0].click(); assert.equal(cur(root), 0);
  await q(root, '.trd-next')[0].click(); assert.equal(cur(root), 1);
  assert.match(q(root, '.trd-status')[0].textContent, /Word 2 of 35: /);
  assert.equal(q(root, '.trd-w')[1].attrs['aria-current'], 'true');
  await q(root, '.trd-prev')[0].click(); assert.equal(cur(root), 0);
  assert.equal(clock.timers.size, 0); clock.fire(); assert.equal(cur(root), 0, 'nothing advances on its own');
  un();
});

test('calm mode off: unchanged, Read with me and the pace buttons are there and the timer runs', async () => {
  for (const off of [false, undefined]) {
    const { root, clock, un } = await make(off);
    assert.equal(q(root, '.trd-run')[0].textContent, 'Read with me');
    assert.equal(q(root, '.trd-speed').length, 3);
    assert.ok(root.textContent.includes(PACE_NOTE)); assert.ok(!root.textContent.includes(CALM_NOTE));
    await q(root, '.trd-run')[0].click(); assert.equal(clock.timers.size, 1); clock.fire(); assert.equal(cur(root), 1);
    un();
  }
});
