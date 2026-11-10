import test from 'node:test';
import assert from 'node:assert/strict';
import { watchForUpdate } from '../src/shell/update-notice.js';

function setup(controlled = true) {
  const sw = new EventTarget(); sw.controller = controlled ? {} : null;
  const reg = new EventTarget(); reg.waiting = null;
  const messages = [], actions = []; let reloads = 0;
  const stop = watchForUpdate(sw, reg, (act) => actions.push(act), () => reloads++);
  const wait = () => {
    reg.installing = new EventTarget();
    reg.dispatchEvent(new Event('updatefound'));
    reg.waiting = { postMessage: (m) => messages.push(m) };
    reg.installing.dispatchEvent(new Event('statechange'));
  };
  const change = () => { reg.waiting = null; sw.controller = {}; sw.dispatchEvent(new Event('controllerchange')); };
  return { sw, reg, actions, messages, wait, change, stop, reloads: () => reloads };
}

test('waiting update activates only on user action, then reloads once after controller change', () => {
  const x = setup(); x.wait();
  assert.equal(x.actions.length, 1);
  assert.equal(x.messages.length, 0); assert.equal(x.reloads(), 0);
  x.actions[0](); x.actions[0]();
  assert.deepEqual(x.messages, [{ type: 'SKIP_WAITING' }]);
  assert.equal(x.reloads(), 0);
  x.change(); x.change(); assert.equal(x.reloads(), 1);
});
test('first installation is silent and does not force activation', () => {
  const x = setup(false); x.wait(); x.change();
  assert.equal(x.actions.length, 0); assert.equal(x.reloads(), 0);
  assert.equal(x.messages.length, 0);
});
test('activation in another tab offers manual reload without interruption', () => {
  const x = setup(); x.change();
  assert.equal(x.actions.length, 1); assert.equal(x.reloads(), 0);
  x.actions[0](); assert.equal(x.reloads(), 1); assert.equal(x.messages.length, 0);
});
test('already-waiting update is discovered on startup', () => {
  const sw = new EventTarget(); sw.controller = {};
  const reg = new EventTarget(); reg.waiting = {};
  let offers = 0;
  watchForUpdate(sw, reg, () => offers++, () => {});
  assert.equal(offers, 1);
});
test('cleanup removes update discovery listeners', () => {
  const x = setup(); x.stop(); x.wait(); x.change();
  assert.equal(x.actions.length, 0); assert.equal(x.reloads(), 0);
});
test('another tab can activate between notice and click', () => {
  const x = setup(); x.wait(); x.change(); x.actions[0]();
  assert.equal(x.actions.length, 1); assert.equal(x.reloads(), 1);
  assert.equal(x.messages.length, 0);
});
test('multiple-tab refusal disarms reload and permits a deliberate retry', () => {
  const x = setup(); x.wait(); x.actions[0]();
  const event = new Event('message'); event.data = { type: 'UPDATE_BLOCKED', reason: 'other-tabs' };
  x.sw.dispatchEvent(event);
  assert.equal(x.actions.length, 2); assert.equal(x.reloads(), 0);
  x.actions[1](); assert.equal(x.messages.length, 2);
  x.change(); assert.equal(x.reloads(), 1);
});
