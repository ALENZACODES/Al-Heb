import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  dist, pathLength, resample, stripDuplicates, distToPolyline, averageDistance, cosineSimilarity,
  frechetDistance, normalizeCurve, scoreStroke, feedbackFor, createSession, MODES
} from '../src/letters/trace.js';

const letters = JSON.parse(readFileSync(new URL('../data/letters/letters.json', import.meta.url), 'utf8'));
const by = Object.fromEntries(letters.map(l => [l.id, l]));

// synthetic targets
const vertical = [[500, 240], [500, 500], [500, 740]];                    // like vav, top -> bottom
const arc = [[300, 250], [500, 250], [620, 300], [680, 400], [680, 740]];   // like resh
const noise = (pts, amp, seed = 3) => { let s = seed; const r = () => { s = (s * 16807) % 2147483647; return (s / 2147483647 - 0.5) * 2 * amp; }; return pts.map(([x, y]) => [x + r(), y + r()]); };
const dense = (pts, n = 40) => resample(pts, n);

test('geometry helpers', () => {
  assert.equal(dist([0, 0], [3, 4]), 5);
  assert.equal(pathLength([[0, 0], [10, 0], [10, 10]]), 20);
  assert.deepEqual(stripDuplicates([[1, 1], [1, 1], [2, 2], [NaN, 1]]), [[1, 1], [2, 2]]);
  const r = resample([[0, 0], [10, 0], [10, 10]], 5);
  assert.equal(r.length, 5);
  assert.deepEqual(r[0], [0, 0]); assert.deepEqual(r[2], [10, 0]); assert.deepEqual(r[4], [10, 10]);
  assert.equal(distToPolyline([5, 3], [[0, 0], [10, 0]]), 3);
  assert.equal(averageDistance([[5, 3], [5, 5]], [[0, 0], [10, 0]]), 4);
  assert.equal(cosineSimilarity([1, 0], [-1, 0]), -1);
  assert.equal(cosineSimilarity([0, 0], [1, 0]), 0);
  assert.equal(frechetDistance([[0, 0], [1, 0]], [[0, 0], [1, 0]]), 0);
  assert.ok(frechetDistance([[0, 0], [1, 0]], [[1, 0], [0, 0]]) >= 1);
  const n = normalizeCurve([[0, 0], [100, 0]]);
  assert.equal(n.length, 50);
});

test('a correct, slightly noisy trace passes at default and forgiving leniency', () => {
  const user = noise(dense(vertical), 12);
  const r = scoreStroke(vertical, user, 1);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(scoreStroke(arc, noise(dense(arc), 15), { leniency: 1.5 }).ok, true);
});

test('reversed direction fails and is reported as backwards (unless accepted)', () => {
  const user = dense(vertical).reverse();
  const r = scoreStroke(vertical, user, 1.5);
  assert.equal(r.ok, false);
  assert.equal(r.backwards, true);
  assert.ok(r.failed.includes('direction'));
  assert.equal(feedbackFor(r).key, 'trace.backwards');
  assert.equal(scoreStroke(vertical, user, { leniency: 1.5, acceptBackwardsStrokes: true }).ok, true);
});

test('a stroke far from the target fails the distance check', () => {
  const user = dense(vertical).map(([x, y]) => [x + 600, y]);
  const r = scoreStroke(vertical, user, 1.5);
  assert.equal(r.ok, false);
  assert.ok(r.failed.includes('avgDist'));
  assert.ok(r.failed.includes('startEnd'));
});

test('a straight line does not match a curved target (shape check)', () => {
  const line = dense([[300, 250], [680, 740]]);
  const r = scoreStroke(arc, line, 1);
  assert.equal(r.ok, false);
  assert.ok(r.failed.includes('shape') || r.failed.includes('avgDist'), r.failed.join());
});

test('a stub that covers only a bit of the stroke fails length', () => {
  const stub = dense([[500, 240], [500, 262]], 10);
  const r = scoreStroke(vertical, stub, 1);
  assert.equal(r.ok, false);
  assert.ok(r.failed.includes('length') || r.failed.includes('startEnd'));
});

test('too few points is rejected', () => {
  assert.deepEqual(scoreStroke(vertical, [[500, 300]], 1).failed, ['tooShort']);
  assert.equal(feedbackFor(scoreStroke(vertical, [], 1)).key, 'trace.tooShort');
  assert.throws(() => scoreStroke([[1, 1]], [[1, 1], [2, 2]], 1), RangeError);
});

test('leniency changes the outcome for the same trace', () => {
  const off = dense(vertical).map(([x, y]) => [x + 200, y]);   // consistently 200 units to the right
  assert.equal(scoreStroke(vertical, off, 0.5).ok, false);
  assert.equal(scoreStroke(vertical, off, 1).ok, false);       // 200 > 350*0.5*1
  assert.equal(scoreStroke(vertical, off, 2).ok, true);        // 200 <= 350*0.5*2
  const fb = feedbackFor(scoreStroke(vertical, off, 1));
  assert.equal(fb.key, 'trace.avgDist');
  assert.ok(MODES.forgiving.leniency > MODES.strict.leniency);
});

test('feedback maps each failing check to a distinct message key', () => {
  const keys = ['direction', 'startEnd', 'length', 'avgDist', 'shape'].map(f => feedbackFor({ ok: false, backwards: false, failed: [f] }).key);
  assert.equal(new Set(keys).size, 5);
  assert.equal(feedbackFor({ ok: true }).key, 'trace.good');
  assert.equal(feedbackFor({ ok: false, failed: ['avgDist'] }, { wrongOrder: true }).key, 'trace.order');
});

test('session: every authored stroke of every letter/script is accepted in order when traced exactly', () => {
  for (const l of letters) for (const script of ['print', 'cursive']) {
    const s = createSession(l, script, { leniency: 1 });
    let completed = false; s.on('complete', () => { completed = true; });
    for (const [i, st] of l[script].strokes.entries()) {
      const res = s.submit(st.median);
      assert.equal(res.ok, true, `${l.id} ${script} stroke ${i}: ${JSON.stringify(res.info && res.info.failed)}`);
    }
    assert.equal(completed, true, `${l.id} ${script}`);
  }
});

test('session: exactly traced strokes drawn backwards are rejected for every multi-point stroke', () => {
  let tested = 0;
  for (const l of letters) for (const script of ['print', 'cursive']) {
    const st = l[script].strokes[0];
    const len = pathLength(st.median);
    if (len < 250) continue;       // tiny yod-like ticks can be ambiguous
    const s = createSession(l, script, { leniency: 1, markStrokeCorrectAfterMisses: 0 });
    const res = s.submit(st.median.slice().reverse());
    assert.equal(res.ok, false, `${l.id} ${script} reversed first stroke should fail`);
    tested++;
  }
  assert.ok(tested > 40);
});

test('session: events, hint threshold and force-correct after N misses', () => {
  const l = by.vav;
  const s = createSession(l, 'print', { leniency: 1, showHintAfterMisses: 2, markStrokeCorrectAfterMisses: 3 });
  const seen = { mistakes: [], strokes: [], complete: 0 };
  s.on('mistake', m => seen.mistakes.push(m)); s.on('strokeResult', r => seen.strokes.push(r)); s.on('complete', () => seen.complete++);
  const bad = [[100, 100], [150, 150], [200, 200]];
  assert.equal(s.submit(bad).ok, false);
  assert.equal(seen.mistakes[0].showHint, false);
  s.submit(bad);
  assert.equal(seen.mistakes[1].showHint, true);
  const third = s.submit(bad);                    // force-correct on the 3rd miss
  assert.equal(third.ok, true); assert.equal(third.forced, true);
  assert.equal(seen.complete, 1);
  assert.equal(s.getState().done, true);
  assert.equal(s.submit(bad).ignored, true);
  s.reset();
  assert.equal(s.getState().index, 0);
});

test('session: drawing a later stroke first is flagged as an order error', () => {
  const l = by.dalet;       // stroke 1 = top bar, stroke 2 = stem
  const s = createSession(l, 'print', { leniency: 1, markStrokeCorrectAfterMisses: 0 });
  let reason = null; s.on('mistake', m => { reason = m.reason; });
  const res = s.submit(l.print.strokes[1].median);
  assert.equal(res.ok, false);
  assert.equal(reason, 'order');
});

test('createSession rejects missing script data', () => {
  assert.throws(() => createSession({ id: 'x' }, 'print'), /no print strokes/);
});
