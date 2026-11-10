import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore, createMemoryStorage } from '../src/store.js';
import { createProgress, PROGRESS_KEY } from '../src/letters/progress.js';
import { shapeScore, matchLetter } from '../src/letters/shapecheck.js';
import { buildWorksheet } from '../tools/letters/worksheets.mjs';

const letters = JSON.parse(readFileSync(new URL('../data/letters/letters.json', import.meta.url), 'utf8'));
const by = Object.fromEntries(letters.map(l => [l.id, l]));
const medians = (id, script) => by[id][script].strokes.map(s => s.median);
const noise = (pts, amp, seed = 7) => { let s = seed; const r = () => { s = (s * 16807) % 2147483647; return (s / 2147483647 - 0.5) * 2 * amp; }; return pts.map(([x, y]) => [x + r(), y + r()]); };

test('progress persists through the real store and survives a new store instance', () => {
  const storage = createMemoryStorage();
  const p = createProgress(createStore({ storage }));
  assert.equal(p.isCompleted('alef'), false);
  p.record('alef', 'print', { perfect: true, totalMistakes: 0 }, new Date('2026-11-03T00:00:00Z'));
  p.record('alef', 'print', { perfect: false, totalMistakes: 3 });
  p.record('bet', 'cursive', { perfect: false, totalMistakes: 2 });
  const q = createProgress(createStore({ storage }));
  assert.equal(q.isCompleted('alef', 'print'), true);
  assert.equal(q.isCompleted('alef', 'cursive'), false);
  assert.equal(q.isCompleted('alef'), true);
  assert.equal(q.get('alef').print.completions, 2);
  assert.equal(q.get('alef').print.perfect, 1);
  assert.equal(q.get('alef').print.bestMistakes, 0);
  assert.equal(q.count(), 2); assert.equal(q.count('cursive'), 1);
  assert.ok(JSON.parse(storage.getItem('alef:' + PROGRESS_KEY)).alef);
  q.reset(); assert.equal(q.count(), 0);
});

test('progress works without a store (in memory) and tolerates a broken store', () => {
  const p = createProgress(undefined); p.record('vav', 'print', { perfect: true });
  assert.equal(p.isCompleted('vav', 'print'), true);
  const bad = createProgress({ get() { throw new Error('x'); }, set() { throw new Error('y'); } });
  assert.doesNotThrow(() => bad.record('vav', 'print', {}));
});

test('shapeScore: same strokes score high even when drawn in a different ORDER and with noise', () => {
  const he = medians('he', 'print'); // 2 strokes
  const ordered = shapeScore(he.map(m => noise(m, 8)), he);
  const swapped = shapeScore(he.slice().reverse().map(m => noise(m, 8)), he);
  assert.ok(ordered > 0.85, 'ordered ' + ordered);
  assert.ok(Math.abs(ordered - swapped) < 0.05, `order independent: ${ordered} vs ${swapped}`);
});

test('shapeScore ignores size and position', () => {
  const m = medians('resh', 'print');
  const moved = m.map(s => s.map(([x, y]) => [x * 0.4 + 300, y * 0.4 + 100]));
  assert.ok(shapeScore(moved, m) > 0.95);
});

test('shapeScore: a different letter scores clearly lower', () => {
  const same = shapeScore(medians('vav', 'print'), medians('vav', 'print'));
  const diff = shapeScore(medians('samekh', 'print'), medians('vav', 'print'));
  assert.ok(same > 0.97); assert.ok(diff < same - 0.2, `${diff} vs ${same}`);
});

test('shapeScore: a backwards stroke is penalised unless ignoreDirection is set', () => {
  const m = medians('tet', 'cursive');
  const rev = [m[0].slice().reverse()].concat(m.slice(1).map(s => s.slice()));
  assert.ok(shapeScore(rev, m) < shapeScore(m, m));
  assert.ok(shapeScore(rev, m, { ignoreDirection: true }) > 0.95);
});

test('matchLetter ranks the drawn letter first for most letters (noisy, order-shuffled), per script', () => {
  for (const script of ['print', 'cursive']) {
    let top1 = 0, top3 = 0;
    for (const l of letters) {
      const drawn = l[script].strokes.map(s => noise(s.median, 10, 11)).reverse();
      const r = matchLetter(drawn, letters, script, { targetId: l.id });
      if (r.best === l.id) top1++;
      if (r.targetRank <= 3) top3++;
    }
    // pairs like vav/nun-final or kaf-final/resh are near-identical shapes, so top-1 is not expected to be perfect; this is a sanity net only.
    assert.ok(top1 >= 20, `${script} top1 ${top1}/27`);
    assert.equal(top3, 27, `${script} top3 ${top3}/27`);
  }
});

test('matchLetter: looksLikeTarget true for the right letter, false for a random scribble', () => {
  const r = matchLetter(medians('gimel', 'print').map(m => noise(m, 10)), letters, 'print', { targetId: 'gimel' });
  assert.equal(r.looksLikeTarget, true);
  const scribble = [[[100, 100], [900, 120], [120, 880], [880, 900], [500, 500]]];
  assert.equal(matchLetter(scribble, letters, 'print', { targetId: 'gimel' }).looksLikeTarget, false);
  assert.equal(shapeScore([], medians('alef', 'print')), 0);
});

test('worksheets: every letter yields an HTML page with print + cursive guides, fonts and OFL notice', () => {
  for (const l of letters) {
    const html = buildWorksheet(l);
    assert.match(html, /^<!doctype html>/);
    assert.match(html, /WS-Print/); assert.match(html, /WS-Cursive/);
    assert.match(html, /frankruhllibre/); assert.match(html, /gveretlevin/);
    assert.ok(html.includes(l.he) && html.includes('SIL Open Font License'));
    assert.equal((html.match(/stroke-dasharray="2 3"/g) || []).length >= 12, true, l.id + ' dotted boxes');
    assert.match(html, /DRAFT/);
  }
});
