// Pointer state machine of createTracer (src/letters/trace.js): every path (mistake, lost release, cancel, second finger,
// reset, interrupted animation, finished letter) must return to the idle, drawable state. Fake DOM (tests/wordtrace.fakedom.js);
// the same scenarios run against real headless Chromium in tools/check/trace-repro.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { install, newRoot } from './wordtrace.fakedom.js';
import { createTracer } from '../src/letters/trace.js';

const doc = install();
const letter = JSON.parse(readFileSync(new URL('../data/letters/letters.json', import.meta.url), 'utf8')).find((l) => l.id === 'alef');
const med = letter.print.strokes.map((s) => s.median);
const bad = [[100, 900], [300, 950], [500, 980]];
const ev = (p, id = 1, extra = {}) => ({ pointerId: id, button: 0, buttons: 1, isPrimary: id === 1, clientX: p[0], clientY: p[1], ...extra });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function fresh(opts = {}) {
  const tr = createTracer(newRoot(doc), letter, 'print', { document: doc, delayBetweenStrokes: 20, ...opts });
  const svg = tr.svg, gUser = svg.children[3];
  const down = (p, id) => svg.dispatch('pointerdown', ev(p, id)), move = (p, id, extra) => svg.dispatch('pointermove', ev(p, id, extra)), up = (p, id) => svg.dispatch('pointerup', ev(p, id));
  const stroke = (pts, id = 1) => { down(pts[0], id); for (const p of pts.slice(1)) move(p, id); up(pts.at(-1), id); };
  const idle = (label) => { assert.equal(tr.drawing, false, label + ': a stroke is still in progress'); assert.equal(gUser.children.length, 0, label + ': user ink left on the surface'); };
  const drawsAgain = (label) => { const i = tr.getState().index; stroke(med[i]); assert.equal(tr.getState().index, i + 1, label + ': a correct stroke after it did not advance'); idle(label); };
  return { tr, svg, gUser, down, move, up, stroke, idle, drawsAgain };
}

test('a rejected (off-path) stroke returns to idle; the red ink is cleared and the next correct stroke advances', async () => {
  const t = fresh(); t.stroke(bad);
  assert.equal(t.tr.getState().totalMistakes, 1); assert.equal(t.tr.drawing, false);
  await sleep(600); t.idle('after the red-ink timer'); t.drawsAgain('after a mistake');
});

test('wrong stroke order is a mistake, not a stuck state', () => {
  const t = fresh(); t.stroke(med[1]); assert.equal(t.tr.getState().index, 0); t.drawsAgain('after a wrong-order stroke');
});

test('lost pointerup: an unpressed move (buttons 0) finishes the stroke instead of trailing the pointer; a new press of the same pointer drops a stale stroke', () => {
  const t = fresh();
  t.down(med[0][0]); for (const p of med[0].slice(1, -1)) t.move(p);
  t.move(med[0].at(-1), 1, { buttons: 0 }); // the release happened off-surface and was never delivered
  assert.equal(t.tr.drawing, false); assert.equal(t.tr.getState().index, 1, 'the completed stroke is scored when the button is seen up');
  // stale stroke with no release at all, then the same pointer presses again: the old ink must not be merged into the new stroke
  t.down(bad[0]); t.move(bad[1]);
  t.down(med[1][0]); for (const p of med[1].slice(1)) t.move(p); t.up(med[1].at(-1));
  assert.equal(t.tr.getState().index, 2, 'the new stroke is scored on its own'); t.idle('after a stale stroke was replaced');
});

test('pointercancel / lostpointercapture of the active pointer discards the stroke; from another pointer they are ignored', () => {
  const t = fresh();
  t.down(med[0][0]); t.move(med[0][4]); t.svg.dispatch('pointercancel', { pointerId: 1 }); t.idle('after pointercancel'); t.drawsAgain('after pointercancel');
  t.down(med[1][0]); t.move(med[1][2]); t.svg.dispatch('lostpointercapture', { pointerId: 1 }); t.idle('after lostpointercapture'); t.drawsAgain('after lostpointercapture');
  t.down(med[2][0]); for (const p of med[2].slice(1, -1)) t.move(p); t.svg.dispatch('pointercancel', { pointerId: 9 }); assert.equal(t.tr.drawing, true, 'a foreign cancel must not end the stroke'); t.up(med[2].at(-1));
  assert.equal(t.tr.getState().index, 3); assert.equal(t.tr.getState().totalMistakes, 0);
});

test('a second finger (or palm) during a stroke neither replaces it nor scores a mistake; its own up/cancel are ignored', () => {
  const t = fresh();
  t.down(med[0][0]); for (const p of med[0].slice(1, -1)) t.move(p);
  t.svg.dispatch('pointerdown', ev([900, 900], 2)); t.svg.dispatch('pointermove', ev([920, 920], 2)); t.svg.dispatch('pointerup', ev([920, 920], 2));
  t.svg.dispatch('pointerdown', ev([100, 100], 3)); t.svg.dispatch('pointercancel', { pointerId: 3 });
  t.move(med[0].at(-1)); t.up(med[0].at(-1));
  assert.equal(t.tr.getState().index, 1); assert.equal(t.tr.getState().totalMistakes, 0); t.idle('after a second finger'); t.drawsAgain('after a second finger');
});

test('document-level pointerup / pointercancel finish or discard a stroke when the surface never saw the release (capture unsupported)', () => {
  const d2 = Object.assign(Object.create(doc), { listeners: {}, addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }, removeEventListener(t, f) { this.listeners[t] = (this.listeners[t] || []).filter((x) => x !== f); }, dispatch(t, e) { for (const f of [...(this.listeners[t] || [])]) f(e); } });
  const t = fresh({ document: d2 });
  t.down(med[0][0]); for (const p of med[0].slice(1)) t.move(p);
  d2.dispatch('pointerup', ev(med[0].at(-1))); assert.equal(t.tr.getState().index, 1, 'released outside the surface: scored via the document listener'); t.idle('after a document pointerup');
  t.down(med[1][0]); t.move(med[1][2]); d2.dispatch('pointercancel', { pointerId: 1 }); t.idle('after a document pointercancel'); t.drawsAgain('after a document pointercancel');
  t.tr.destroy(); assert.deepEqual([d2.listeners.pointerup.length, d2.listeners.pointercancel.length], [0, 0], 'document listeners removed on destroy');
});

test('reset() during a stroke discards it; drawing continues from stroke 1', () => {
  const t = fresh(); t.down(med[0][0]); t.move(med[0][3]); t.tr.reset(); t.idle('after reset mid-stroke');
  t.move(med[0][6]); t.up(med[0].at(-1)); assert.equal(t.tr.getState().index, 0, 'the straddling stroke is not scored'); t.drawsAgain('after reset');
});

test('animate() settles when a stroke interrupts it, and drawing goes on', async () => {
  const t = fresh(); let settled = false; const p = t.tr.animate().then(() => { settled = true; });
  await sleep(15); t.stroke(bad); await sleep(5); assert.equal(settled, true, 'the interrupted animation promise never resolved');
  await p; t.drawsAgain('after interrupting the animation');
});

test('finished letter: drawing is refused but reported through onInputWhileDone; Start over (reset) makes it drawable again', () => {
  let told = 0; const t = fresh({ onInputWhileDone: () => told++ });
  for (const m of med) t.stroke(m); assert.equal(t.tr.getState().done, true);
  t.stroke(med[0]); assert.equal(told, 1); t.idle('after drawing on a finished letter');
  t.tr.reset(); assert.equal(t.tr.getState().done, false); t.drawsAgain('after Start over');
});

test('destroy() while a stroke is in progress leaves nothing behind and later events are harmless', () => {
  const t = fresh(); t.down(med[0][0]); t.move(med[0][2]); t.tr.destroy(); assert.equal(t.tr.drawing, false);
  t.svg.dispatch('pointerup', ev(med[0].at(-1))); // listeners removed: no throw
});
