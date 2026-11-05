// Touch and movement settings (lane: motor and physical): settings keys, the pure helpers, undo of a review rating, and source checks
// for pointer cancellation and automatic advancing. None of this was tested with a person who uses a switch, eye tracker, voice control or has a motor disability.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULTS, ENUMS, validate, createSettings } from '../src/shell/settings.js';
import { motorStyle, applyMotor, untimedOn, confirmOn, shortcutsOn, MOTOR_KEYS, TARGET_PX } from '../src/shell/motor.js';
import { completeLesson, rateCard, snapshotRating, restoreRating, loadState } from '../src/curriculum/actions.js';
import { lessons } from '../src/curriculum/lessons.js';

const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const memStore = () => { const m = {}; return { get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = v; }, m }; };

test('the five motor settings exist with safe defaults and validate their values', () => {
  assert.equal(DEFAULTS.targetSize, 'normal'); assert.deepEqual(ENUMS.targetSize, ['normal', 'large']);
  assert.equal(DEFAULTS.bottomActions, false); assert.equal(DEFAULTS.untimed, false); assert.equal(DEFAULTS.confirmAnswers, false);
  assert.equal(DEFAULTS.keyShortcuts, true, 'shortcuts stay on by default; the setting only lets a person turn them off');
  assert.equal(validate('targetSize', 'large').ok, true); assert.equal(validate('targetSize', 'huge').ok, false);
  for (const k of ['bottomActions', 'untimed', 'confirmAnswers', 'keyShortcuts']) { assert.equal(validate(k, true).ok, true); assert.equal(validate(k, 'yes').ok, false, k); }
  assert.deepEqual([...MOTOR_KEYS].sort(), ['bottomActions', 'confirmAnswers', 'keyShortcuts', 'targetSize', 'untimed']);
  const s = createSettings(memStore()); assert.deepEqual(s.set({ targetSize: 'large', untimed: true }), []); assert.equal(s.get('targetSize'), 'large');
});

test('large targets set --tap and a data attribute on the root; going back removes them', () => {
  const calls = { set: {}, attrs: {} };
  const root = { style: { setProperty: (k, v) => { calls.set[k] = v; }, removeProperty: (k) => { delete calls.set[k]; } }, setAttribute: (k, v) => { calls.attrs[k] = v; }, removeAttribute: (k) => { delete calls.attrs[k]; } };
  applyMotor(root, { targetSize: 'large', bottomActions: true });
  assert.equal(calls.set['--tap'], TARGET_PX.large + 'px'); assert.ok(TARGET_PX.large >= 56 && TARGET_PX.large > TARGET_PX.normal);
  assert.equal(calls.attrs['data-target-size'], 'large'); assert.equal(calls.attrs['data-bottom-actions'], '');
  applyMotor(root, { targetSize: 'normal', bottomActions: false });
  assert.deepEqual(calls.set, {}); assert.deepEqual(calls.attrs, {});
  assert.deepEqual(motorStyle({}).vars, {});
});

test('helpers read a ctx or a settings object and fail safe', () => {
  const ctx = (o) => ({ settings: { get: (k) => o[k] } });
  assert.equal(untimedOn(ctx({ untimed: true })), true); assert.equal(untimedOn(ctx({})), false); assert.equal(untimedOn(undefined), false);
  assert.equal(confirmOn(ctx({ confirmAnswers: true })), true); assert.equal(confirmOn({}), false);
  assert.equal(shortcutsOn(ctx({ keyShortcuts: false })), false); assert.equal(shortcutsOn(ctx({})), true); assert.equal(shortcutsOn(ctx({ keyShortcuts: true })), true);
});

test('undo of a review rating puts the card back exactly and leaves other cards alone', async () => {
  const store = memStore(); const ctx = { store: { get: (k) => store.get(k, undefined), set: (k, v) => store.set(k, v) } };
  await completeLesson(ctx, lessons[0], Date.now() - 3 * 864e5);
  const st0 = await loadState(ctx); const ids = Object.keys(st0.cards); assert.ok(ids.length >= 2);
  const id = ids[0], other = ids[1];
  const before = JSON.stringify(st0.cards[id]), otherBefore = JSON.stringify(st0.cards[other]);
  const snap = await snapshotRating(ctx, id);
  await rateCard(ctx, id, 1);
  assert.notEqual(JSON.stringify((await loadState(ctx)).cards[id]), before, 'the rating changed the card');
  assert.equal(await restoreRating(ctx, snap), true);
  const st1 = await loadState(ctx);
  assert.equal(JSON.stringify(st1.cards[id]), before); assert.equal(JSON.stringify(st1.cards[other]), otherBefore);
  assert.equal(await restoreRating(ctx, null), false);
});

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });
test('actions fire on release: no view runs an action on pointerdown, mousedown or touchstart (the tracing surface and passive listeners excepted)', () => {
  const allowed = new Set(['src/app.js', 'src/letters/trace.js', 'src/morning/boot.js', 'src/shell/audio.js', 'src/shell/audio-stub.js']);
  const hits = [];
  for (const f of walk(root + '/src')) {
    const rel = f.slice(root.length + 1); if (allowed.has(rel)) continue;
    const t = readFileSync(f, 'utf8');
    if (/\b(onpointerdown|onmousedown|ontouchstart)\b|addEventListener\(\s*['"](pointerdown|mousedown|touchstart)['"]/.test(t)) hits.push(rel);
  }
  assert.deepEqual(hits, []);
});

test('nothing moves on by itself after an answer: the First day quick check uses a Next question button, not a timer', () => {
  const t = readFileSync(root + '/src/firstday/firstday.view.js', 'utf8');
  assert.doesNotMatch(t, /setTimeout\(\(\) => \{ if \(alive\) \{ renderStep/);
  assert.match(t, /id: 'fd-next-q'/);
});

test('no drag, swipe or long-press is required anywhere in src', () => {
  const hits = [];
  for (const f of walk(root + '/src')) {
    const t = readFileSync(f, 'utf8'); const rel = f.slice(root.length + 1);
    if (/draggable|dragstart|ondrop|touchmove|swipe|longpress|long-press|contextmenu|dblclick/i.test(t.replace(/long-press options differs[^"]*/g, ''))) hits.push(rel);
  }
  assert.deepEqual(hits, []);
});
