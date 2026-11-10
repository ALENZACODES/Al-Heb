// The morph checker (tools/anim/morph_check.mjs): geometry helpers, start-shift logic, its own fixtures, and invariants on the real draft folders.
// It does not judge how a frame looks; nothing here replaces a designer's review.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  flatten, crossings, areaCentroid, rotatePath, bestShifts, shiftCosts, chooseShifts, fitAffine, applyAffine, frameTimes, analyse, passes, verdict,
  runAll, verifyV2b, sheetSvg, overviewSvg, tableMarkdown, selfTest, LETTER_ORDER, DEFAULTS, STEPS,
} from '../tools/anim/morph_check.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const tool = root + 'tools/anim/morph_check.mjs';
const V2B = path.join(root, 'docs/drafts/animation-poses-v2b');

const P = (d, t) => ({ time_ms: t, easing: 'linear', paths: [{ id: 'p1', d, fill: 'none', stroke: '#000', 'stroke-width': '6', opacity: 1 }] });
const seven = (a, b) => [P(a, 0), P(b, 400), ...[800, 1300, 1800, 2200, 2600].map((t) => P(b, t))];
const L6 = [[0, 0], [40, 0], [40, 10], [10, 10], [10, 40], [0, 40]];
const mk = (pts) => 'M ' + pts[0].join(' ') + pts.slice(1).map((q) => ' L ' + q.join(' ')).join('') + ' Z';
const turned = L6.map((q) => [40 - q[0], 40 - q[1]]);
const shifted1 = turned.map((_, i) => turned[(i + 1) % 6]);

test('built-in self-test passes', () => {
  const log = console.log; console.log = () => {};
  let r; try { r = selfTest(); } finally { console.log = log; }
  assert.equal(r.bad, 0, r.out.filter((x) => !x.ok).map((x) => x.name).join('; '));
});

test('CLI --self-test exits 0 and prints a summary', () => {
  const r = spawnSync(process.execPath, [tool, '--self-test'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /all \d+ self-test checks passed/);
});

test('CLI rejects an unknown flag with exit 2', () => {
  const r = spawnSync(process.execPath, [tool, '--nope'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
});

test('crossings: simple polygon 0, bow tie 1, collapsed 0, touching corners not counted', () => {
  assert.equal(crossings(flatten('M 0 0 L 10 0 L 10 10 L 0 10 Z')), 0);
  assert.equal(crossings(flatten('M 0 0 L 10 10 L 10 0 L 0 10 Z')), 1);
  assert.equal(crossings(flatten('M 3 3 L 3 3 L 3 3 Z')), 0);
  assert.equal(crossings(flatten('M 0 0 L 10 0 L 5 5 L 10 10 L 0 10 L 5 5 Z')), 0, 'two corners meeting at one point is a touch, not a crossing');
});

test('crossings between sub-paths are counted (a counter poking through the outline)', () => {
  const ring = 'M 0 0 L 40 0 L 40 40 L 0 40 Z M 10 10 L 10 30 L 30 30 L 30 10 Z';
  const poke = 'M 0 0 L 40 0 L 40 40 L 0 40 Z M 10 10 L 10 30 L 50 30 L 50 10 Z';
  assert.equal(crossings(flatten(ring)), 0);
  assert.equal(crossings(flatten(poke)), 2);
});

test('areaCentroid: signed area, hole subtracts, centroid of a square, no NaN when collapsed', () => {
  assert.equal(Math.abs(areaCentroid(flatten('M 0 0 L 10 0 L 10 10 L 0 10 Z')).area), 100);
  assert.equal(Math.abs(areaCentroid(flatten('M 0 0 L 10 0 L 10 10 L 0 10 Z M 2 2 L 2 8 L 8 8 L 8 2 Z')).area), 64);
  const c = areaCentroid(flatten('M 0 0 L 10 0 L 10 10 L 0 10 Z'));
  assert.deepEqual([c.cx, c.cy], [5, 5]);
  const z = areaCentroid(flatten('M 4 4 L 4 4 L 4 4 Z'));
  assert.ok(Number.isFinite(z.cx) && Number.isFinite(z.cy));
});

test('flatten handles C curves and several sub-paths', () => {
  const subs = flatten('M 0 0 C 0 10 10 10 10 0 Z M 20 20 L 30 20 L 30 30 Z');
  assert.equal(subs.length, 2);
  assert.equal(subs[0].length, 9);
  assert.equal(subs[1].length, 3);
});

test('rotatePath keeps points, command letters and winding; rejects curves', () => {
  const sq = 'M 0 0 L 10 0 L 10 10 L 0 10 Z';
  const r = rotatePath(sq, [1]);
  assert.equal(r, 'M 10 0 L 10 10 L 0 10 L 0 0 Z');
  assert.equal(areaCentroid(flatten(r)).area, areaCentroid(flatten(sq)).area);
  assert.throws(() => rotatePath('M 0 0 C 1 1 2 2 3 3 Z', [0]));
  assert.equal(rotatePath(sq, [4]), sq);
  assert.equal(rotatePath(sq, [-4]), sq);
});

test('bestShifts and shiftCosts agree and undo a rotation per sub-path', () => {
  const two = 'M 0 0 L 40 0 L 40 40 L 0 40 Z M 10 10 L 10 30 L 30 30 L 30 10 Z';
  const rot = rotatePath(two, [1, 3]);
  const s = bestShifts(rot, two);
  assert.deepEqual(s, [3, 1]);
  const c = shiftCosts(rot, two);
  assert.equal(c[0][3], 0);
  assert.equal(c[1][1], 0);
  assert.throws(() => bestShifts('M 0 0 L 1 0 L 1 1 Z', two));
});

test('frameTimes: 12 steps per transition, 73 frames for 7 poses, ends on the last pose time', () => {
  const ft = frameTimes(seven('M 0 0 L 1 1 Z', 'M 0 0 L 1 1 Z'));
  assert.equal(STEPS, 12);
  assert.equal(ft.length, 73);
  assert.equal(ft[0].t, 0);
  assert.equal(ft.at(-1).t, 2600);
  assert.equal(ft.filter((f) => f.tr === 1).length, 13);
});

test('analyse: a turn started one point late adds crossings the key poses lack; the aligned start does not', () => {
  const bad = analyse(seven(mk(L6), mk(shifted1)));
  const good = analyse(seven(mk(L6), mk(turned)));
  assert.equal(bad.keyX[1], 0);
  assert.ok(bad.t1.addedX >= 1);
  assert.equal(good.t1.addedX, 0);
});

test('passes / verdict: ok, twists when a shifted C passes, needs redraw when both fail', () => {
  const good = analyse(seven(mk(L6), mk(turned)));
  const bad = analyse(seven(mk(L6), mk(shifted1)));
  assert.ok(passes(good, good));
  assert.ok(!passes(good, bad));
  assert.equal(verdict(good, good), 'ok');
  assert.equal(verdict(good, bad, good), 'twists');
  assert.equal(verdict(good, bad, bad), 'needs redraw');
  assert.equal(verdict(good, bad), 'twists');
});

test('chooseShifts never returns a start that is worse than the unshifted one', () => {
  const poses = seven(mk(shifted1), mk(turned));
  const base = analyse(poses);
  const ch = chooseShifts(poses);
  const moved = poses.map((p, i) => (i ? p : { ...p, paths: [{ ...p.paths[0], d: rotatePath(p.paths[0].d, ch.shifts) }] }));
  const after = analyse(moved);
  assert.ok(after.t1.maxX <= base.t1.maxX);
  assert.ok(after.rms12 <= base.rms12);
  assert.equal(ch.shifts[0], 5);
});

test('fitAffine recovers a known map and applyAffine uses it', () => {
  const P0 = [[0, 0], [10, 0], [0, 10], [10, 10], [5, 3]];
  const m = [0.5, 0.1, 7, -0.2, 0.9, 3];
  const Q = P0.map((p) => applyAffine(m, p));
  const got = fitAffine(P0, Q);
  got.forEach((v, i) => assert.ok(Math.abs(v - m[i]) < 1e-6, `coef ${i}: ${v}`));
});

test('sheetSvg draws one row per variant with 13 cells and no script or image elements', () => {
  const svg = sheetSvg('x', [{ name: 'A', poses: seven(mk(L6), mk(turned)) }, { name: 'B', poses: seven(mk(L6), mk(shifted1)) }]);
  assert.equal((svg.match(/<rect width="84" height="84"/g) || []).length, 26);
  assert.ok(!/<script|<image|<foreignObject|<a /.test(svg));
  assert.match(svg, /no designer has reviewed this/i);
});

// ---- the real draft folders -------------------------------------------------------------------
let rows;
const load = () => (rows ||= runAll({ v2b: V2B }));

test('real folders: 27 letters, original structure valid, v2 differs from the original only in p1', () => {
  const r = load();
  assert.equal(r.length, 27);
  assert.deepEqual(r.map((x) => x.item), LETTER_ORDER);
  for (const x of r) {
    assert.equal(x.structure, 'ok', x.item);
    assert.deepEqual(x.notes, [], `${x.item}: ${x.notes.join('; ')}`);
  }
});

test('real folders: variant A is not touched by v2 (A and B share poses 2..7)', () => {
  for (const x of load()) {
    for (let k = 1; k < 7; k++) assert.deepEqual(x._A[k], x._B[k], `${x.item} pose ${k + 1}`);
    assert.deepEqual(x._A[0].paths.slice(1), x._B[0].paths.slice(1), `${x.item} k1 paths p2..`);
  }
});

test('real folders: v2b is a pure cyclic start shift of v2 (same commands, ids, point sets, winding)', () => {
  assert.deepEqual(verifyV2b(DEFAULTS.v2, V2B), []);
});

test('real folders: v2b is never worse than v2 on first-transition crossings, and never farther from k2', () => {
  for (const x of load()) {
    assert.ok(x.C.t1.maxX <= x.B.t1.maxX, `${x.item} crossings`);
    assert.ok(x.C.rms12 <= x.B.rms12 + 1e-9, `${x.item} rms`);
    assert.ok(x.C.t1.areaJump <= x.B.t1.areaJump + 1e-9, `${x.item} area jump`);
  }
});

test('real folders: tableMarkdown has one line per letter and a verdict that is one of the three words', () => {
  const t = tableMarkdown(load()).split('\n');
  assert.equal(t.length, 27 + 2);
  for (const x of load()) assert.ok(['ok', 'twists', 'needs redraw'].includes(x.verdictB), x.item);
});

test('real folders: overview sheet source lists the 8 columns', () => {
  const svg = overviewSvg(load().slice(0, 3));
  for (const label of ['old k1', 'v2 k1', 'k2', 'k7']) assert.ok(svg.includes(`>${label}<`), label);
});

test('real folders: v2b folder holds exactly the 27 k1 files', () => {
  const files = readdirSync(V2B).filter((f) => f.endsWith('.svg')).sort();
  assert.deepEqual(files, LETTER_ORDER.map((i) => `${i}-k1.svg`).sort());
  for (const f of files) assert.ok(!/script|<image|foreignObject/.test(readFileSync(path.join(V2B, f), 'utf8')), f);
});
