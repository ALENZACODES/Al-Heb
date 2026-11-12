// S-05 (12 Nov audit): the heart toast said "Oops, one heart" while the hearts display read 4 of 5. The toast now names the count the
// display shows at that moment (the display reads the same record: src/shell/statbar.js walletModel).
import test from 'node:test';
import assert from 'node:assert/strict';
import { retention } from '../src/retention/boot.js';
import { walletModel } from '../src/shell/statbar.js';

test('S-05: every heart toast states the hearts the bar shows right after the loss', () => {
  const data = new Map();
  const store = { get: (k) => data.get(k), set: (k, v) => { data.set(k, v); }, subscribe: () => () => {} };
  const said = [];
  const doc = { dispatchEvent: (e) => { if (e.type === 'alef:retention-say') said.push(e.detail.text); return true; }, querySelector: () => null, addEventListener() {} };
  const g = { document: doc, location: { hash: '#/learn?lesson=l01' }, setTimeout: () => 0, clearTimeout() {} };
  const api = retention({ store, settings: { get: () => undefined } }, g);
  api.update((r) => { r.hearts.enabled = true; r.lessonsFinished = 5; r.xp.total = 10; return r; });
  for (let i = 1; i <= 5; i++) {
    api.answered({ action: 'wrong', questionId: 'q' + i });
    const bar = walletModel({ retention: api.get() });
    const toast = said.at(-1);
    assert.ok(toast.includes(`${bar.hearts} of ${bar.heartsMax}`), `toast "${toast}" vs bar "${bar.heartsLabel}"`);
    assert.doesNotMatch(toast, /one heart\./i);
  }
  assert.equal(walletModel({ retention: api.get() }).hearts, 0);
  assert.match(said[0], /^Oops, that cost a heart: 4 of 5 left\./);
  assert.match(said.at(-1), /last heart \(0 of 5\)/);
});
