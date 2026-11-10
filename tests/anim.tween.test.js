// Pose tween: interpolation, easing, and the player (no autoplay, reduced motion, cancel). Fake DOM and fake frame clock; no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lerpPath, getEasing, sampleFrame, validatePoses, playPoses, parsePoseSvg, posesFromRecords, compatible, totalMs } from '../src/letters/tween.js';

const root = fileURLToPath(new URL('..', import.meta.url));

function fakeDoc() {
  const mk = (tag) => ({
    tag, attrs: {}, children: [], get firstChild() { return this.children[0] || null; },
    setAttribute(k, v) { this.attrs[k] = String(v); }, appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children.splice(this.children.indexOf(c), 1); return c; },
  });
  const host = mk('div');
  host.ownerDocument = { createElementNS: (_n, tag) => mk(tag) };
  return host;
}
function fakeClock() {
  const q = new Map(); let id = 0, cancelled = 0;
  return {
    raf: (fn) => { q.set(++id, fn); return id; }, caf: (h) => { cancelled++; q.delete(h); },
    pending: () => q.size, cancelled: () => cancelled,
    tick(ts) { const fns = [...q.values()]; q.clear(); fns.forEach((f) => f(ts)); },
  };
}
const P = (t, easing, ds, op) => ({ time_ms: t, easing, paths: ds.map((d, i) => ({ id: 'p' + (i + 1), d, fill: 'none', opacity: op?.[i] ?? 1 })) });
const poses = [
  P(0, 'ease-in-out', ['M 0 0 L 100 0 L 100 100 Z'], [0]),
  P(400, 'linear', ['M 10 0 L 100 20 L 100 100 Z'], [0.5]),
  P(1000, 'ease-out', ['M 20 40 L 100 40 L 100 100 Z'], [1]),
];

test('lerpPath: endpoints exact, midpoint, rounds to 2 decimals, rejects different commands', () => {
  const a = 'M 0 0 L 10 0 C 1 2 3 4 5 6 Z', b = 'M 10 10 L 20 0 C 3 4 5 6 7 8 Z';
  assert.equal(lerpPath(a, b, 0), a);
  assert.equal(lerpPath(a, b, 1), b);
  assert.equal(lerpPath(a, b, 0.5), 'M 5 5 L 15 0 C 2 3 4 5 6 7 Z');
  assert.equal(lerpPath('M 0 0 L 1 0 Z', 'M 0 0 L 2 0 Z', 1 / 3), 'M 0 0 L 1.33 0 Z');
  assert.equal(lerpPath(a, b, 9), b, 't clamps');
  assert.throws(() => lerpPath(a, 'M 0 0 L 1 1 Z', 0.5));
  assert.equal(compatible(a, b), true);
  assert.equal(compatible(a, 'M 0 0 L 1 1 Z'), false);
});

test('easings: fixed ends, monotonic, ease-out is front-loaded', () => {
  for (const n of ['ease-in-out', 'ease-out', 'linear']) {
    const f = getEasing(n);
    assert.equal(f(0), 0); assert.equal(f(1), 1);
    let prev = -1; for (let i = 0; i <= 100; i++) { const v = f(i / 100); assert.ok(v >= prev); prev = v; }
  }
  assert.equal(getEasing('ease-in-out')(0.5), 0.5);
  assert.ok(getEasing('ease-in-out')(0.25) < 0.25);
  assert.ok(getEasing('ease-out')(0.25) > 0.25);
  assert.equal(getEasing('nonsense'), getEasing('ease-in-out'));
});

test('sampleFrame: start, end, between, opacity moves only forward', () => {
  assert.equal(sampleFrame(poses, -5)[0].d, poses[0].paths[0].d);
  assert.equal(sampleFrame(poses, 99999)[0].d, poses[2].paths[0].d);
  const mid = sampleFrame(poses, 200)[0];
  assert.equal(mid.d, 'M 5 0 L 100 10 L 100 100 Z');
  assert.equal(mid.opacity, 0.25);
  let prev = -1;
  for (let t = 0; t <= 1000; t += 10) { const o = sampleFrame(poses, t)[0].opacity; assert.ok(o >= prev, 'opacity never goes back (no flicker)'); prev = o; }
});

test('sampleFrame: sets longer than 3000 ms are scaled down', () => {
  const long = [P(0, 'linear', ['M 0 0 Z']), P(6000, 'linear', ['M 60 0 Z'])];
  assert.equal(totalMs(long), 3000);
  assert.equal(sampleFrame(long, 1500)[0].d, 'M 30 0 Z');
  assert.equal(sampleFrame(long, 3000)[0].d, 'M 60 0 Z');
});

test('validatePoses', () => {
  assert.equal(validatePoses(poses), '');
  assert.match(validatePoses([]), /no poses/);
  assert.match(validatePoses([poses[0], { ...poses[1], time_ms: 0 }]), /increasing/);
  assert.match(validatePoses([poses[0], P(5, 'x', ['M 0 0 L 1 1 Z'])]), /commands/);
  assert.match(validatePoses([poses[0], P(5, 'x', ['M 0 0 L 100 0 L 100 100 Z', 'M 0 0 Z'])]), /path count/);
});

test('importing the module starts nothing (no autoplay)', async () => {
  let called = 0;
  const saved = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = () => { called++; return 1; };
  try { await import('../src/letters/tween.js?fresh=' + Math.random()); } finally { globalThis.requestAnimationFrame = saved; }
  assert.equal(called, 0);
});

test('playPoses: nothing is requested until it is called, then it plays to the last pose and stops', async () => {
  const host = fakeDoc(), clock = fakeClock();
  assert.equal(clock.pending(), 0);
  let done = 0;
  const c = playPoses(host, poses, { reduced: false, raf: clock.raf, caf: clock.caf, onDone: () => done++ });
  assert.equal(c.state, 'playing');
  const path = host.children[0].children[0];
  assert.equal(path.attrs.d, poses[0].paths[0].d, 'starts on the first pose');
  assert.equal(clock.pending(), 1);
  clock.tick(1000); clock.tick(1200);
  assert.equal(path.attrs.d, 'M 5 0 L 100 10 L 100 100 Z');
  clock.tick(1400 + 5000); // a very late frame jumps to the end; no replay
  assert.equal(await c.done, 'finished');
  assert.equal(path.attrs.d, poses[2].paths[0].d);
  assert.equal(path.attrs.opacity, '1');
  assert.equal(clock.pending(), 0, 'no further frames after the end (no loop)');
  assert.equal(done, 1);
  assert.equal(host.children[0].attrs['aria-hidden'], 'true');
});

test('reduced motion and data-calm: last pose at once, no frame requested', async () => {
  for (const mode of ['option', 'calm-host']) {
    const host = fakeDoc(), clock = fakeClock();
    if (mode === 'calm-host') host.closest = (sel) => (sel === '[data-calm]' ? {} : null);
    const c = playPoses(host, poses, mode === 'option' ? { reduced: true, raf: clock.raf, caf: clock.caf } : { raf: clock.raf, caf: clock.caf });
    assert.equal(clock.pending(), 0, mode);
    assert.equal(host.children[0].children[0].attrs.d, poses[2].paths[0].d, mode);
    assert.equal(host.children[0].children[0].attrs.opacity, '1');
    assert.equal(await c.done, 'still');
    assert.equal(c.reducedMotion, true);
  }
});

test('reduced motion is read from prefers-reduced-motion when no option is given', () => {
  const host = fakeDoc(), clock = fakeClock();
  const saved = globalThis.matchMedia;
  globalThis.matchMedia = (q) => ({ matches: /reduce/.test(q) });
  try { playPoses(host, poses, { raf: clock.raf, caf: clock.caf }); } finally { globalThis.matchMedia = saved; }
  assert.equal(clock.pending(), 0);
  assert.equal(host.children[0].children[0].attrs.d, poses[2].paths[0].d);
});

test('cancel stops cleanly; a second play on the same host cancels the first', async () => {
  const host = fakeDoc(), clock = fakeClock();
  const a = playPoses(host, poses, { reduced: false, raf: clock.raf, caf: clock.caf });
  clock.tick(0);
  a.cancel();
  assert.equal(await a.done, 'cancelled');
  assert.equal(clock.pending(), 0);
  a.cancel(); // safe twice
  const b = playPoses(host, poses, { reduced: false, raf: clock.raf, caf: clock.caf });
  const c = playPoses(host, poses, { reduced: false, raf: clock.raf, caf: clock.caf });
  assert.equal(await b.done, 'cancelled');
  assert.equal(c.state, 'playing');
  assert.equal(host.children.length, 1, 'one svg only');
  c.finish();
  assert.equal(await c.done, 'finished');
  assert.equal(host.children[0].children[0].attrs.d, poses[2].paths[0].d);
  assert.equal(clock.pending(), 0);
});

test('bad pose sets do not throw: last pose shown still', async () => {
  const host = fakeDoc(), clock = fakeClock();
  const bad = [poses[0], P(5, 'x', ['M 0 0 L 1 1 Z'])];
  const c = playPoses(host, bad, { reduced: false, raf: clock.raf, caf: clock.caf });
  assert.equal(await c.done, 'still');
  assert.ok(c.error);
  assert.equal(clock.pending(), 0);
});

test('real draft poses: parse an item and tween without errors', () => {
  const dir = root + 'docs/drafts/animation-poses/';
  const batch = JSON.parse(readFileSync(dir + 'batch-001.json', 'utf8'));
  const recs = batch.files.filter((r) => r.item === 'shin');
  assert.equal(recs.length, 7);
  const texts = Object.fromEntries(recs.map((r) => [r.file, readFileSync(dir + 'batch-001/' + r.file, 'utf8')]));
  const ps = posesFromRecords(recs, texts);
  assert.equal(validatePoses(ps), '');
  assert.equal(ps[0].paths.length, 8);
  assert.ok(parsePoseSvg(texts['shin-k1.svg']).title.length > 0);
  const f = sampleFrame(ps, 200);
  assert.equal(f.length, 8);
  assert.ok(f.every((p) => p.d.startsWith('M ') && p.d.endsWith('Z')));
});
