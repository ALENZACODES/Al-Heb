import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { generate, buildRows, topWordTexts, stripNiqqud, hours, summarize, CSV_HEADER, OUT_DIR, TOP_WORDS } from '../tools/audio/recording_needs.mjs';
import { buildSheets, esc } from '../tools/audio/recording_sheets.mjs';
import { loadManifestFull } from '../tools/audio/manifest_io.mjs';

const R = fileURLToPath(new URL('..', import.meta.url));
const g = generate(R);
const manifest = loadManifestFull(R);

test('CSV: header, one row per required clip, no optional/alias', () => {
  const lines = g.files['recordings_needed.csv'].trim().split('\n');
  assert.equal(lines[0], CSV_HEADER.join(','));
  const req = manifest.filter((e) => !e.optional && !e.aliasOf).length;
  assert.equal(lines.length - 1, req);
  assert.equal(g.rows.length, req);
});

test('every row has id, tradition, voice, text and a priority in {1,2,3,4,9}', () => {
  for (const r of g.rows) {
    assert.ok(r.id && r.tradition && r.voice && r.text_niqqud);
    assert.ok([1, 2, 3, 4, 9].includes(r.priority));
    assert.equal(r.text_he, stripNiqqud(r.text_niqqud));
  }
});

test('priority subset: 22 letters + 5 finals and vowel/syllable counts per tradition x voice', () => {
  for (const s of summarize(g.rows)) {
    assert.equal(s.byP[1], 27, `${s.tradition}-${s.voice} P1`);
    const m = manifest.filter((e) => e.tradition === s.tradition && e.voice === s.voice);
    const want = m.filter((e) => e.group === 'niqqud' || e.group === 'syllable').length;
    assert.equal(s.byP[2], want);
    assert.ok(s.byP[4] <= TOP_WORDS);
  }
});

test('P4 words are distinct per tradition x voice', () => {
  const seen = new Set();
  for (const r of g.rows.filter((x) => x.priority === 4)) {
    const k = `${r.tradition}|${r.voice}|${r.text_niqqud}`;
    assert.ok(!seen.has(k), k);
    seen.add(k);
  }
});

test('letter names never take a vocabulary transliteration (alef is not "elef")', () => {
  const a = g.rows.find((r) => r.id === 'alef' && r.kind === 'letter');
  assert.equal(a.transliteration, 'alef');
});

test('hours use the stated 120-180 lines/hour assumption', () => {
  assert.deepEqual(hours(360), { low: 2, high: 3 });
  assert.match(g.files['priority_summary.md'], /120 to 180/);
  assert.match(g.files['priority_summary.md'], /DRAFT/);
});

test('topWordTexts ranks by frequency then occurrence and caps at n', () => {
  const m = ['א', 'ב', 'ג'].flatMap((t, i) => Array.from({ length: i + 1 }, (_, k) => ({ tradition: 'x', kind: 'word', voice: 'm', id: t + k, text: t })));
  const v = new Map([['ג', { rank: 5 }]]);
  const t = topWordTexts(m, 'x', v, 2);
  assert.deepEqual([...t.texts], ['ג', 'ב']);
});

test('committed outputs are up to date', () => {
  for (const [f, c] of Object.entries(g.files)) assert.equal(fs.readFileSync(R + OUT_DIR + '/' + f, 'utf8').replace(/\r\n/g, '\n'), c, f);
});

test('sheets: escape, checkboxes, DRAFT banner, all priority rows covered once', () => {
  assert.equal(esc('<a>&"'), '&lt;a&gt;&amp;&quot;');
  const { sheets, files } = buildSheets(g.rows, 'israeli', 'f', 40);
  const want = g.rows.filter((r) => r.tradition === 'israeli' && r.voice === 'f' && r.priority < 9).length;
  assert.equal(sheets.reduce((a, s) => a + s.length, 0), want);
  assert.ok(sheets.every((s) => s.length <= 40));
  const html = files['session-01.html'];
  assert.match(html, /DRAFT/);
  assert.equal((html.match(/class="box"/g) || []).length, sheets[0].length * 2);
  assert.match(html, /lang="he" dir="rtl"/);
});

test('donor documents exist and carry the required clauses and a DRAFT marker', () => {
  for (const f of ['donor-rights-grant.md', 'donor-rights-grant.html']) {
    const t = fs.readFileSync(R + 'docs/voices/' + f, 'utf8');
    assert.match(t, /DRAFT FOR A LAWYER/);
    for (const re of [/perpetual|permanent/i, /worldwide/i, /royalt/i, /commercially sold/i, /voice cloning/i, /default is \*{0,2}NO|answer is \*{0,2}NO|<b>NO<\/b>/i, /withdraw/i, /18/, /anonymous/i, /signature/i]) assert.match(t, re, `${f} ${re}`);
  }
});
