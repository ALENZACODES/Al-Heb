// docs/voices/recording-script-{israeli,sephardi,ashkenazi}.csv
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { buildScripts, chooseIds, OUT_DIR, COLUMNS, COUNT, csvName } from '../tools/pronunciation/recording_script.mjs';
import { TRADITIONS } from '../tools/pronunciation/build_variants.mjs';

const s = buildScripts();
function parse(text) { // minimal RFC 4180 parser
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c; }
  return rows;
}

test('one CSV per tradition, 1,000 rows each, files on disk current', () => {
  assert.equal(s.count, COUNT);
  for (const t of TRADITIONS) {
    const text = s.files[csvName(t)];
    assert.equal(fs.readFileSync(join(OUT_DIR, csvName(t)), 'utf8'), text, `${csvName(t)} stale: run node tools/pronunciation/recording_script.mjs`);
    const rows = parse(text);
    assert.deepEqual(rows[0], COLUMNS);
    assert.equal(rows.length - 1, COUNT);
    rows.slice(1).forEach((r, i) => { assert.equal(r.length, COLUMNS.length); assert.equal(Number(r[0]), i + 1); assert.ok(r[2] && r[3] && r[4].includes('ˈ'), r[1]); });
  }
});

test('same words, same order, in every tradition; order follows frequency.json corpusRank', () => {
  const cols = TRADITIONS.map((t) => parse(s.files[csvName(t)]).slice(1).map((r) => r[1]));
  assert.deepEqual(cols[0], cols[1]); assert.deepEqual(cols[0], cols[2]);
  const { rank } = chooseIds();
  for (let i = 1; i < cols[0].length; i++) assert.ok(rank.get(cols[0][i - 1]).rank <= rank.get(cols[0][i]).rank);
  assert.equal(new Set(cols[0]).size, COUNT);
});

test('the variant to read aloud differs by tradition where the rules say so', () => {
  const by = Object.fromEntries(TRADITIONS.map((t) => [t, new Map(parse(s.files[csvName(t)]).slice(1).map((r) => [r[2], r]))]));
  const he = 'בָּרוּךְ';
  if (by.israeli.has(he)) { assert.equal(by.ashkenazi.get(he)[3], 'borukh'); assert.equal(by.israeli.get(he)[3], 'barukh'); assert.equal(by.sephardi.get(he)[4], 'ba.ˈrux'); }
  const ipas = TRADITIONS.map((t) => parse(s.files[csvName(t)]).slice(1).map((r) => r[4]));
  assert.ok(ipas[0].some((x, i) => x !== ipas[2][i]) && ipas[0].some((x, i) => x !== ipas[1][i]));
});
