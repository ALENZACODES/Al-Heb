import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldRecord, notePartialPlay, installPlayTracker, MIN_ACTIONS, MIN_MS } from '../src/games/playtrack.js';
import { gameState, SCORES_KEY } from '../src/games/scores.js';

test('a short or idle visit is not a play; a game that saved its own record is not counted twice', () => {
  assert.equal(shouldRecord({ actions: MIN_ACTIONS - 1, ms: MIN_MS * 2, before: null, after: null }), false);
  assert.equal(shouldRecord({ actions: MIN_ACTIONS, ms: MIN_MS - 1, before: null, after: null }), false);
  assert.equal(shouldRecord({ actions: MIN_ACTIONS, ms: MIN_MS, before: [null, null], after: [{ plays: 1 }, null] }), false);
  // a game that saved only its settings or level on opening has not recorded a play: the watcher still writes one
  assert.equal(shouldRecord({ actions: MIN_ACTIONS, ms: MIN_MS, before: [null, null], after: [{ unlocked: 1, daily: {} }, null] }), true);
  assert.equal(shouldRecord({ actions: MIN_ACTIONS, ms: MIN_MS, before: [null, null], after: [null, null] }), true);
});

test('an unfinished play shows as played everywhere, with no invented score or stars', () => {
  const out = notePartialPlay(null, {}, 'meltdown', 5);
  assert.equal(out.rec.plays, 1);
  const st = gameState(out.rec, out.ledger.meltdown);
  assert.equal(st.played, true); assert.equal(st.mastered, false); assert.equal(st.best, 0); assert.equal(st.last, null); assert.equal(st.stars, 0);
  const again = notePartialPlay({ best: 40, plays: 2, lastStars: 2 }, { meltdown: { best: 40, last: 30, lastAt: 1, plays: 2, bestStars: 2 } }, 'meltdown', 9);
  assert.deepEqual(again.rec, { best: 40, plays: 3, lastStars: 2 });
  assert.deepEqual(again.ledger.meltdown, { best: 40, last: 30, lastAt: 9, plays: 3, bestStars: 2 });
});

test('the watcher records one play on leaving a played game, and nothing for other pages', async () => {
  const data = new Map(); const store = { get: (k) => data.get(k), set: (k, v) => data.set(k, v) };
  const ls = {}; const on = (bag) => (name, fn) => { (bag[name] ||= []).push(fn); };
  const win = { location: { hash: '#/tugowar' }, addEventListener: on(ls) }; const dls = {}; const doc = { addEventListener: on(dls) };
  let t = 0; installPlayTracker({ store, isGame: (id) => id === 'tugowar', win, doc, now: () => t });
  const tap = () => dls.pointerup[0]({ target: { closest: () => ({}) } });
  for (let i = 0; i < MIN_ACTIONS; i++) tap();
  t = MIN_MS + 1; win.location.hash = '#/settings'; ls.hashchange[0]();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(data.get('games.tugowar.v1').plays, 1); assert.equal(data.get(SCORES_KEY).tugowar.plays, 1);
  for (let i = 0; i < MIN_ACTIONS; i++) tap();
  t += MIN_MS + 1; win.location.hash = '#/home'; ls.hashchange[0]();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(data.has('games.settings.v1'), false);
});

test('key presses count wherever focus is; typing in a field outside the game does not', async () => {
  const data = new Map(); const store = { get: (k) => data.get(k), set: (k, v) => data.set(k, v) };
  const ls = {}; const on = (bag) => (name, fn) => { (bag[name] ||= []).push(fn); };
  const win = { location: { hash: '#/pinball' }, addEventListener: on(ls) }; const dls = {}; const doc = { addEventListener: on(dls) };
  let t = 0; installPlayTracker({ store, isGame: (id) => id === 'pinball', win, doc, now: () => t });
  const body = { tagName: 'BODY', closest: () => null }, field = { tagName: 'INPUT', closest: () => null };
  for (let i = 0; i < MIN_ACTIONS; i++) dls.keydown[0]({ type: 'keydown', target: field });
  t = MIN_MS + 1; win.location.hash = '#/home'; ls.hashchange[0]();
  assert.equal(data.has('games.pinball.v1'), false);
  win.location.hash = '#/pinball'; ls.hashchange[0]();
  for (let i = 0; i < MIN_ACTIONS; i++) dls.keydown[0]({ type: 'keydown', target: body });
  t += MIN_MS + 1; win.location.hash = '#/home'; ls.hashchange[0]();
  assert.equal(data.get('games.pinball.v1').plays, 1);
});

test('only a sound button gets the Playing line; a game answer button that makes a sound stays quiet', async () => {
  const { isSoundControl } = await import('../src/shell/play-state.js');
  const el = (text, aria = '', cls = '') => ({ textContent: text, className: cls, getAttribute: (k) => (k === 'aria-label' ? aria : null), closest: () => null });
  for (const t of ['Listen (Noa)', '▶ Hear it', 'Kamatz, play sound', 'Replay']) assert.equal(isSoundControl(el(t)), true, t);
  assert.equal(isSoundControl(el('א', 'Aleph', 'btn letter-listen')), true);
  for (const t of ['TRUE ✓', '× NOT', 'Move left', 'ש', 'Continue']) assert.equal(isSoundControl(el(t)), false, t);
});
