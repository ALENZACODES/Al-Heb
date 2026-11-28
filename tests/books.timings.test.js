// Measured read-along timings (25 Nov 2026 critique, item 13; tools/books/build_timings.py): one [start, end] per word as the reader
// splits the page, in order, inside the clip; the reader uses them and says when it falls back to the estimate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const j = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));

test('timings match the page words, run forward and never overlap', () => {
  let clips = 0;
  for (const f of readdirSync(new URL('data/books/timings/', root))) {
    const id = f.replace(/\.json$/, ''); const t = j(`data/books/timings/${f}`); const book = j(`data/books/${id}.json`);
    assert.equal(t.v, 1);
    for (const [n, voices] of Object.entries(t.pages)) {
      const p = book.pages.find((x) => String(x.n) === n); assert.ok(p, `${id} p${n}`);
      const words = String(p.he).split(/\s+/).filter(Boolean);
      for (const [v, rows] of Object.entries(voices)) {
        assert.ok(v === 'f' || v === 'm'); assert.equal(rows.length, words.length, `${id} p${n} ${v}`); clips++;
        rows.forEach(([s, e], i) => { assert.ok(s >= 0 && e > s, `${id} p${n} ${v} w${i}`); if (i) assert.ok(s >= rows[i - 1][1] - 1e-9); });
      }
    }
  }
  assert.ok(clips > 1000, `${clips} measured clips`);
});

test('the reader prefers measured timings and names which kind it shows', () => {
  const v = readFileSync(new URL('src/books/book.view.js', root), 'utf8');
  assert.match(v, /data\/books\/timings\/\$\{id\}\.json/); assert.match(v, /MEASURED_NOTE : ESTIMATED_NOTE/);
});
