import test from 'node:test';
import assert from 'node:assert/strict';
import { waitFor } from './helpers/waitfor.js';
import { N, memStore } from './torahread.fakedom.js'; // fake DOM: checks view logic, not browser rendering or a screen reader
const { mount } = await import('../src/shell/home.view.js');
const { createSettings } = await import('../src/shell/settings.js');
const { t } = await import('../src/shell/i18n.js');

const mk = () => {
  const root = new N('div'); const store = memStore();
  const settings = createSettings(memStore());
  return { root, store, ctx: { store, settings, t, hasRoute: () => true, route() {}, installPrompt: { available: () => false } } };
};

test('daily goal: a polite status region exists before any press, is empty, and sits outside the redrawn Today card', async () => {
  const { root, ctx } = mk(); const un = mount(root, ctx); await waitFor(() => root.querySelector('#today-goal'));
  const s = root.querySelector('#today-goal-status');
  assert.ok(s, 'status node present'); assert.equal(s.attrs.role, 'status'); assert.equal(s.attrs['aria-live'], 'polite');
  assert.equal(s.textContent, '', 'nothing is announced on load');
  assert.equal(root.querySelector('#home-today').queryAll('#today-goal-status').length, 0, 'not inside the card that is replaced on each press');
  un();
});

test('daily goal: pressing a goal sets the status text, keeps the same node, and still moves focus to the pressed button', async () => {
  const { root, store, ctx } = mk(); const un = mount(root, ctx); await waitFor(() => root.querySelector('#today-goal'));
  const node = root.querySelector('#today-goal-status');
  await root.querySelector('[data-goal="15"]').click();
  await waitFor(() => node.textContent !== '', { message: 'announcement' });
  assert.equal(node.textContent, 'Daily goal: 15 minutes.');
  assert.equal(root.querySelector('#today-goal-status'), node, 'same live node survives the redraw');
  assert.equal(root.querySelector('[data-goal="15"]').attrs['aria-pressed'], 'true');
  assert.equal(globalThis.__focus?.attrs?.['data-goal'], '15', 'focus is on the new 15 button');
  await root.querySelector('[data-goal="30"]').click();
  assert.equal(node.textContent, 'Daily goal: 30 minutes.');
  assert.doesNotMatch(node.textContent, /saved/i, 'makes no claim about saving (the write is best effort)');
  un();
});

test('daily goal: a store that throws still announces the choice and does not break the press', async () => {
  const { root, ctx } = mk(); const un = mount(root, ctx); await waitFor(() => root.querySelector('#today-goal'));
  ctx.store.set = () => { throw new Error('quota'); };
  await root.querySelector('[data-goal="10"]').click();
  assert.equal(root.querySelector('#today-goal-status').textContent, 'Daily goal: 10 minutes.');
  un();
});

test('daily goal: the goal box stays open across the redraw, so the pressed button is visible and can keep focus', async () => {
  const { root, ctx } = mk(); const un = mount(root, ctx); await waitFor(() => root.querySelector('#today-goal'));
  root.querySelector('#today-goal-box').open = true; // the learner opened the box to reach the buttons
  await root.querySelector('[data-goal="20"]').click();
  assert.equal(root.querySelector('#today-goal-box').open, true);
  un();
});
