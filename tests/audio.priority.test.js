// Next-clips priority list: files are current, every row is a real missing Israeli man-voice manifest entry with the manifest's own Hebrew,
// nothing excluded by rule is listed, and the scoring rule behaves as documented (tested on small hand-made data as well as the real data).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseCsv } from '../tools/record-kit/lib.mjs';
import { loadManifestFull } from '../tools/audio/manifest_io.mjs';
import { HUMAN_ONLY_GROUPS } from '../tools/audio/coverage.mjs';
import {
  OUT_CSV, OUT_EXCLUDED, BATCH_DIR, ROW_COLS, GENERATOR_COLS, LISTING_COLS, TIERS, DEFAULT_TOP, DEFAULT_BATCH, POS_MAX, FREQ_MAX,
  HELD_BACK_IDS, loadData, compute, build, listingFromReturned, parseCsvText, exclusionReasons,
} from '../tools/audio/priority.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const rows = parseCsv(read(OUT_CSV));
const manifest = loadManifestFull(root);
const byKey = new Map(manifest.filter((e) => e.tradition === 'israeli' && e.voice === 'm').map((e) => [`${e.kind}|${e.id}`, e]));

test('priority.mjs --check says the CSV files are current', () => {
  const r = spawnSync(process.execPath, [path.join(root, 'tools/audio/priority.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});
test('the list has the stated columns and ranks 1..500 with unique ids', () => {
  assert.deepEqual(Object.keys(rows[0]), ROW_COLS);
  assert.equal(rows.length, DEFAULT_TOP);
  assert.deepEqual(rows.map((r) => Number(r.rank)), Array.from({ length: DEFAULT_TOP }, (_, i) => i + 1));
  assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
});
test('every row is a missing Israeli man-voice word entry and its Hebrew is the manifest text, byte for byte', () => {
  for (const r of rows) {
    const e = byKey.get(`word|${r.id}`);
    assert.ok(e, `not in manifest: ${r.id}`);
    assert.equal(e.status, 'missing', r.id);
    assert.equal(r.pointed_hebrew, e.text, r.id);
    assert.match(r.pointed_hebrew, /[ְ-ּ]/, `no vowel points: ${r.id}`);
    assert.ok(!e.aliasOf && !e.optional, r.id);
    assert.ok(r.already_have === 'no' || r.already_have.startsWith('no (same text has a clip under '), r.id);
  }
});
test('nothing human-only, held back, Priestly Blessing or flagged is listed', () => {
  for (const r of rows) {
    const e = byKey.get(`word|${r.id}`);
    assert.ok(!HUMAN_ONLY_GROUPS.has(e.group), r.id);
    assert.ok(!HELD_BACK_IDS.has(r.id), r.id);
    assert.ok(!r.id.startsWith('bless-priestly'), r.id);
  }
  assert.ok(HELD_BACK_IDS.has('hf1da5ea6'));
  const data = loadData(root);
  const { rows: all, excluded } = compute(data);
  assert.ok(!all.some((r) => r.id === 'hf1da5ea6'));
  assert.ok(excluded.some((r) => r.id === 'hf1da5ea6'));
  const ex = parseCsv(read(OUT_EXCLUDED));
  assert.equal(ex.length, excluded.length);
  assert.ok(ex.every((r) => r.reasons), 'every excluded row says why');
  assert.deepEqual(new Set(ex.map((r) => r.id)).size, ex.length);
  // an excluded id is never also ranked
  const ranked = new Set(all.map((r) => r.id));
  for (const r of ex) assert.ok(!ranked.has(r.id), r.id);
});
test('scores are non-increasing down the list and the tier bands do not overlap', () => {
  const base = Object.fromEntries(TIERS.map((t) => [t.id, t.base]));
  assert.ok(POS_MAX + FREQ_MAX < 100, 'bonuses must stay inside the 100-point gap between tiers');
  for (let i = 0; i < rows.length; i++) {
    const s = Number(rows[i].score); const b = base[rows[i].tier];
    assert.ok(s >= b && s <= b + POS_MAX + FREQ_MAX, `${rows[i].id}: score ${s} outside tier ${rows[i].tier}`);
    if (i) assert.ok(s <= Number(rows[i - 1].score), `${rows[i].id} outranks the row above`);
  }
});
test('first-day and v0 lesson words come before everything else in the real list', () => {
  const tiers = rows.map((r) => r.tier);
  assert.equal(tiers[0], 'T1');
  const lastT2 = tiers.lastIndexOf('T2'); const firstT3 = tiers.indexOf('T3');
  assert.ok(lastT2 < firstT3);
  assert.ok(rows.slice(0, 5).some((r) => r.id === 'r01-w1'), 'the first-day word of r01 is near the top');
});
test('the batch files match the generator manifest header and the ranked slices, with no Hebrew of their own', () => {
  const files = fs.readdirSync(path.join(root, BATCH_DIR)).filter((f) => /^batch-\d+\.csv$/.test(f)).sort();
  assert.equal(files.length, Math.ceil(DEFAULT_TOP / DEFAULT_BATCH));
  const seen = [];
  files.forEach((f, n) => {
    const text = read(`${BATCH_DIR}/${f}`);
    assert.equal(text.split('\n')[0], GENERATOR_COLS.join(','));
    const part = parseCsv(text);
    assert.ok(part.length <= DEFAULT_BATCH);
    for (const r of part) {
      for (const c of GENERATOR_COLS.slice(2)) assert.equal(r[c], '', `${f} ${r.id}: ${c} is for the generator to fill`);
      const src = rows.find((x) => x.id === r.id);
      assert.equal(r.he, src.pointed_hebrew); assert.equal(Number(src.batch), n + 1);
      seen.push(r.id);
    }
  });
  assert.deepEqual(seen, rows.map((r) => r.id));
});
test('output is deterministic (two builds give identical files)', () => {
  const d = loadData(root);
  assert.deepEqual(build(d).files, build(d).files);
});

// ---- the rule on small hand-made data (the Hebrew in these fixtures is read from the manifest, not typed here) ----
const txt = (id) => byKey.get(`word|${id}`).text;
const SHAV = txt('r01-w1'), SHALOM = txt('r05-w1'), ET = txt('r11-w1'), BAYIT = txt('r02-w2'), SEFER = txt('r07-w4'), DELET = txt('r09-w1'), ESH = txt('hf1da5ea6');
const YEVARECHECHA = txt('bless-priestly-1-w1'), BARE = txt('r03-w1').replace(/[\u05B0-\u05C7]/g, ''), YEAR = txt('r12-w2'), MORE = txt('r10-w1'), DAY = txt('r08-w1'), KEN = txt('il01-w5'), LEHEM = txt('r40-w1'), YAD = txt('r12-w3');
const E = (id, text, extra = {}) => ({ path: `audio/m/israeli/word/${id}.mp3`, voice: 'm', tradition: 'israeli', kind: 'word', id, text, status: 'missing', source: 'none', group: 'lesson-word', ...extra });
const tiny = (over = {}) => ({
  manifest: [
    E('r01-w1', SHAV), E('r05-w1', SHALOM), E('r11-w1', ET), E('hdeck0001', BAYIT, { group: 'vocab-word' }), E('hfreq0001', SEFER, { group: 'vocab-word' }),
    E('hnone0001', DELET, { group: 'vocab-word' }), E('hf1da5ea6', ESH, { group: 'vocab-word' }), E('bless-priestly-1-w1', YEVARECHECHA, { group: 'prayer-word' }),
    E('hbare0001', BARE, { group: 'vocab-word' }), E('hflag0001', YEAR, { group: 'vocab-word' }), E('hhide0001', MORE, { group: 'vocab-word' }),
    E('hold0001', DAY, { group: 'vocab-word', status: 'synthetic-unreviewed' }),
    { ...E('shin', YAD), kind: 'letter', group: 'letter' }, E('il01-w1', KEN, { vocabId: 'hlink0001' }), E('hlink0001', KEN, { group: 'vocab-word' }),
  ],
  firstday: [{ he: SHAV, ref: 'onramp step shav' }],
  lessons: [{ id: 'r01', words: [{ he: SHAV }] }, { id: 'r05', words: [{ he: SHALOM }] }, { id: 'r11', words: [{ he: ET }] }, { id: 'il01', words: [{ he: KEN }] }],
  deck: [{ pos: 1, id: 'hdeck0001', he: BAYIT }],
  freq: [{ id: 'hfreq0001', he: SEFER, total: 5, corpusRank: 1 }, { id: 'x', he: LEHEM, total: 3, corpusRank: 2 }],
  vocab: [{ id: 'hflag0001', he: YEAR, en: 'year', flags: { reasons: ['pointing and gloss not native-reviewed'] } }, { id: 'hhide0001', he: MORE, en: 'more', flags: { hidden: true, reasons: [] } }],
  soundwords: { flagLegend: { 'possible-segolate': { hard: true }, 'final-stress-assumed': { hard: false } }, items: [{ kind: 'word', id: 'hnone0001', confidence: 'low', flags: ['possible-segolate'] }] },
  exceptions: {},
  ...over,
});
test('tiny data: tiers follow the rule, exclusions fire, existing clips are not ranked', () => {
  const { rows: r, excluded } = compute(tiny());
  const tier = Object.fromEntries(r.map((x) => [x.id, x.tier]));
  assert.equal(tier['r01-w1'], 'T1'); assert.equal(tier['r05-w1'], 'T2'); assert.equal(tier['r11-w1'], 'T3');
  assert.equal(tier['hdeck0001'], 'T5'); assert.equal(tier['hfreq0001'], 'T6');
  for (const gone of ['hnone0001', 'hf1da5ea6', 'bless-priestly-1-w1', 'hbare0001', 'hflag0001', 'hhide0001', 'hold0001', 'shin']) assert.ok(!(gone in tier), gone);
  const why = Object.fromEntries(excluded.map((x) => [x.id, x.reasons]));
  assert.match(why['hnone0001'], /possible-segolate/); assert.match(why['hf1da5ea6'], /held back/); assert.match(why['bless-priestly-1-w1'], /Priestly/);
  assert.match(why['hbare0001'], /unpointed/); assert.match(why['hflag0001'], /not native-reviewed/); assert.match(why['hhide0001'], /hidden/);
  assert.deepEqual(r.map((x) => x.rank), r.map((_, i) => i + 1));
  for (let i = 1; i < r.length; i++) assert.ok(r[i].score <= r[i - 1].score);
});
test('tiny data: a vocabulary id shares the lesson context of the lesson word that links to it; a same-text copy keeps its own context', () => {
  const { rows: r } = compute(tiny());
  const by = Object.fromEntries(r.map((x) => [x.id, x]));
  assert.equal(by['hlink0001'].tier, 'T3'); assert.equal(by['il01-w1'].tier, 'T3');
  const d = tiny(); d.manifest.push(E('r09-w9', SHAV)); d.lessons.push({ id: 'r09', words: [] });
  const c = compute(d).rows.find((x) => x.id === 'r09-w9');
  assert.ok(c.tier !== 'T1', 'a copy with no context of its own does not inherit the first-day tier');
  assert.equal(c.same_text_as, 'r01-w1');
});
test('tiny data: Priestly Blessing and held-back ids are excluded by id even when everything else about them is fine', () => {
  const e = E('bless-priestly-2', YEVARECHECHA, { kind: 'line', group: 'prayer-line' });
  const ctx = { soundwords: new Map(), flagLegend: {}, vocabById: new Map(), openForms: new Set() };
  assert.match(exclusionReasons(e, ctx).join(), /Priestly/);
  assert.deepEqual(exclusionReasons(E('r01-w1', SHAV), ctx), []);
});
test('ingest listing: a returned generator manifest becomes file,id,voice,tradition,kind,text', () => {
  const csv = `${GENERATOR_COLS.join(',')}\nr01-w1,${SHAV},a.txt,,,pass,pass,pass,False,ok,r01-w1-abc.wav,deadbeef,r01-w1-abc.mp3,cafe\nhx,${ESH},a.txt,,,,,,,,,,,\n`;
  const l = listingFromReturned(csv);
  assert.equal(l.count, 1); assert.deepEqual(l.skipped, ['hx']);
  const out = parseCsvText(l.csv);
  assert.deepEqual(Object.keys(out[0]), LISTING_COLS);
  assert.deepEqual(out[0], { file: 'r01-w1-abc.wav', id: 'r01-w1', voice: 'm', tradition: 'israeli', kind: 'word', text: SHAV });
});
