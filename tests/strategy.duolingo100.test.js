// Checks docs/strategy/duolingo-100.csv: exactly 100 unique ids P001-P100, required columns, valid enums,
// and that every cited evidence path exists (required for every row marked "done").
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const COLS = ['id', 'group', 'duolingo_gap_or_strength', 'source_ids', 'alef_move', 'alef_has_it_now', 'status', 'evidence_path', 'effort', 'owner', 'beaten_when', 'risk_note'];
const STATUS = ['done', 'partial', 'planned', 'not started', 'blocked-on-human'];

function parseCSV(text) {
  const rows = []; let row = [], f = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else inQ = false; } else f += c; }
    else if (c === '"') inQ = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

const [header, ...body] = parseCSV(readFileSync(join(ROOT, 'docs/strategy/duolingo-100.csv'), 'utf8'));
const recs = body.map((r) => Object.fromEntries(COLS.map((c, i) => [c, r[i]])));

test('header has the required columns in order', () => assert.deepEqual(header, COLS));
test('exactly 100 rows with unique ids P001-P100', () => {
  assert.equal(recs.length, 100);
  const ids = recs.map((r) => r.id);
  assert.equal(new Set(ids).size, 100);
  ids.forEach((id, i) => assert.equal(id, 'P' + String(i + 1).padStart(3, '0')));
});
test('every row has all columns filled and valid enums', () => {
  for (const r of recs) {
    for (const c of COLS) assert.ok(r[c] && r[c].trim(), `${r.id} empty ${c}`);
    assert.ok(STATUS.includes(r.status), `${r.id} status ${r.status}`);
    assert.ok(['S', 'M', 'L'].includes(r.effort), `${r.id} effort`);
    assert.ok(['claude', 'john', 'reviewer', 'recording'].includes(r.owner), `${r.id} owner`);
    assert.match(r.source_ids, /^(none|S\d+(;S\d+)*)$/, `${r.id} source_ids`);
  }
});
test('every evidence path exists (mandatory for done rows)', () => {
  for (const r of recs) {
    for (const p of r.evidence_path.split(';')) {
      if (r.status === 'done') assert.ok(existsSync(join(ROOT, p)), `${r.id} done but missing ${p}`);
      else assert.ok(existsSync(join(ROOT, p)), `${r.id} evidence path missing ${p}`);
    }
  }
});
