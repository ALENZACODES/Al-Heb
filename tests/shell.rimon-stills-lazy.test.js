// The big-moment Rimon loads on its first moment, not with Home (src/shell/rimon-stills-lazy.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mountRimonStillsLazy, stageOwnsHash } from '../src/shell/rimon-stills-lazy.js';
import { situationForAction, situationForHash } from '../src/shell/rimon-stills.js';

function setup(hash = '#/') {
  const doc = new EventTarget(), win = new EventTarget();
  win.location = { hash };
  const calls = { load: 0, mount: 0, shown: [] };
  let fail = false;
  const mod = { situationForAction, situationForHash, mountRimonStills: () => { calls.mount++; return { show: (s) => calls.shown.push(s), destroy() {} }; } };
  const load = async () => { calls.load++; if (fail) throw new Error('offline'); return mod; };
  const lazy = mountRimonStillsLazy({ doc, win, load });
  return { doc, win, lazy, calls, failNext: (v) => { fail = v; } };
}
const fire = (t, type, detail) => t.dispatchEvent(Object.assign(new Event(type), { detail }));

test('Home and the setup screens never fetch the big-moment Rimon', async () => {
  for (const h of ['', '#', '#/', '#/home', '#/welcome', '#/welcome/2']) assert.ok(stageOwnsHash(h), h);
  for (const h of ['#/lab', '#/books', '#/learn']) assert.ok(!stageOwnsHash(h), h);
  const s = setup('#/');
  fire(s.doc, 'alef:ready'); s.win.location.hash = '#/welcome'; fire(s.doc, 'alef:ready');
  await s.lazy.ready();
  assert.equal(s.calls.load, 0);
});

test('the first moment fetches it once and replays that moment; later moments go to the module itself', async () => {
  const s = setup('#/');
  fire(s.doc, 'alef:rimon', { action: 'highfive' });
  fire(s.doc, 'alef:rimon', { action: 'highfive' });
  await s.lazy.ready();
  assert.equal(s.calls.load, 1); assert.equal(s.calls.mount, 1);
  assert.deepEqual(s.calls.shown, [situationForAction('highfive')].filter(Boolean));
  fire(s.doc, 'alef:rimon', { action: 'highfive' });
  await s.lazy.ready();
  assert.equal(s.calls.mount, 1, 'mounted once');
});

test('opening Brain Lab fetches it and shows the Brain Lab moment', async () => {
  const s = setup('#/lab');
  fire(s.doc, 'alef:ready');
  await s.lazy.ready();
  assert.deepEqual(s.calls.shown, ['brainLab']);
});

test('a failed download is tried again on the next moment', async () => {
  const s = setup('#/');
  s.failNext(true); fire(s.win, 'offline'); await s.lazy.ready();
  assert.equal(s.calls.mount, 0);
  s.failNext(false); fire(s.win, 'online'); await s.lazy.ready();
  assert.equal(s.calls.mount, 1);
  assert.deepEqual(s.calls.shown, ['recovered']);
});

test('the app boots it through the loader, so the module is not part of the first page', () => {
  const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /from '\.\/shell\/rimon-stills\.js'/);
  assert.match(app, /mountRimonStillsLazy\(\)/);
});
