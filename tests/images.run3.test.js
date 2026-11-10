import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, loadRun3, run3Alt, tropeKey, vocabKey, vocabIndex, HEAD, FIRST, LAST, PER_COMMAND, MAX_ALT, SIZES } from '../tools/images/build_run3.mjs';
import { matchRun3 } from '../tools/images/match_run3.mjs';
import { wrongAspect } from '../tools/images/match_blockj.mjs';
import { buildAltText } from '../tools/images/alt_text.mjs';
import { plan, readRows } from '../tools/images/append_manifest_rows.mjs';
import { render as renderRunbook, run3 as runbookRun3 } from '../tools/images/build_runbook.mjs';
import { STEM_RE } from '../tools/images/ingest_lib.mjs';
import { TEXT_RE } from '../tools/meta/text.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const B = build();
const BLOCKS = ['I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'];
// the repo's own tracked-text scan patterns, plus the bare two-letter abbreviation for artificial intelligence
const TOOL_NAMES = new RegExp(`${TEXT_RE.source}|\\bAI\\b`, 'i');
const HEBREW = /[֐-׿]/;

test('run 3: exactly 1000 rows, unique ids and files, safe stems, ten per command, blocks I..R', () => {
  assert.equal(B.rows.length, 1000);
  assert.equal(new Set(B.rows.map((r) => r.id)).size, 1000);
  assert.equal(new Set(B.rows.map((r) => r.file)).size, 1000);
  const per = {};
  for (const r of B.rows) {
    assert.match(r.id, STEM_RE); assert.equal(r.file, `${r.id}.png`);
    assert.ok(BLOCKS.includes(r.block), r.id); assert.ok(r.command >= FIRST && r.command <= LAST, r.id);
    assert.ok(r.slot >= 1 && r.slot <= PER_COMMAND, r.id); assert.equal(r.status, 'pending');
    per[r.command] = (per[r.command] ?? 0) + 1;
  }
  assert.equal(Object.keys(per).length, 100);
  for (let c = FIRST; c <= LAST; c++) assert.equal(per[c], PER_COMMAND, `command ${c}`);
  for (const b of BLOCKS) assert.equal(B.rows.filter((r) => r.block === b).length, 100, `block ${b}`);
  B.rows.forEach((r, i) => { if (i % PER_COMMAND) assert.equal(r.command, B.rows[i - 1].command); assert.equal(r.slot, (i % PER_COMMAND) + 1); });
});

test('run 3: file names follow the commands (TROPE_<name>_mnemonic/card, PREFIX_01..10)', () => {
  const trope = B.rows.filter((r) => r.command <= 152);
  assert.equal(trope.length, 30);
  for (const r of trope) assert.match(r.id, r.slot % 2 ? /^TROPE_[a-z_]+_mnemonic$/ : /^TROPE_[a-z_]+_card$/);
  assert.ok(trope.some((r) => r.id === 'TROPE_sof_pasuk_card'));
  for (const r of B.rows.filter((r) => r.command > 152)) assert.equal(r.id, `${r.id.replace(/_\d\d$/, '')}_${String(r.slot).padStart(2, '0')}`);
  for (const [c, p] of [[153, 'TROPE_hand'], [155, 'CRAFT_bimah'], [160, 'STORY_creation'], [170, 'NUM_teens'], [177, 'OPP_one'], [186, 'VERB_eat_all'], [199, 'HERO_week'], [209, 'PLACE_seasons'], [219, 'GRAM_link'], [229, 'TALK_lost'], [239, 'CTX_shul'], [240, 'MAS_states'], [249, 'FINALE_set']]) {
    assert.deepEqual(B.rows.filter((r) => r.command === c).map((r) => r.id), Array.from({ length: 10 }, (_, i) => `${p}_${String(i + 1).padStart(2, '0')}`), String(c));
  }
});

test('run 3: aspects are 1:1 or 1792x1024 as the sheet says, sizes match', () => {
  const wide = (r) => r.aspect === '1792x1024';
  for (const r of B.rows) {
    assert.ok(r.aspect in SIZES, r.id);
    assert.deepEqual([r.width, r.height], SIZES[r.aspect], r.id);
  }
  for (const b of ['J', 'M', 'N', 'P', 'Q']) assert.ok(B.rows.filter((r) => r.block === b).every(wide), b);
  for (const c of [155, 158, 241, 245, 246, 247, 249]) assert.ok(B.rows.filter((r) => r.command === c).every(wide), String(c));
  for (const c of [150, 153, 154, 170, 173, 180, 188, 240, 242, 243, 244, 248]) assert.ok(B.rows.filter((r) => r.command === c).every((r) => !wide(r)), String(c));
  const by = Object.fromEntries(B.rows.map((r) => [r.id, r]));
  assert.ok(wide(by.NUM_months1_01) && wide(by.NUM_months1_06) && !wide(by.NUM_months1_07));
  assert.ok(wide(by.NUM_shapes_09) && wide(by.GRAM_place_10) && wide(by.GRAM_compare_07) && !wide(by.GRAM_compare_08));
});

test('run 3: alt is plain English without Hebrew, prompt carries the command text and the no-text rule', () => {
  for (const r of B.rows) {
    assert.ok(r.alt.length > 10 && r.alt.length <= MAX_ALT, r.id);
    assert.doesNotMatch(r.alt, HEBREW, r.id); assert.doesNotMatch(r.prompt, HEBREW, r.id);
    assert.match(r.prompt, new RegExp(`^Command ${r.command} \\(`), r.id);
    assert.match(r.prompt, new RegExp(`Image ${r.slot} of 10: `), r.id);
    assert.match(r.prompt, /No text of any kind anywhere in the image\.$/, r.id);
    assert.ok(r.kind && r.set, r.id);
  }
  assert.equal(new Set(B.rows.map((r) => r.prompt)).size, 1000);
  assert.equal(new Set(B.rows.map((r) => r.alt)).size, 1000);
});

test('run 3: every key exists in its source data; trope and vocab lookups behave', () => {
  const trope = new Set(json('data/corpus/trope/table.json').prose.map((t) => t.id));
  const registry = new Set(json('data/corpus/registry.json').entries.map((e) => e.id));
  const festivals = new Set(Object.keys(json('data/festivals/links.json').festivals));
  const vocab = new Set(json('data/vocab/words.json').words.map((w) => w.id));
  let n = 0;
  for (const r of B.rows) {
    if (!r.key) continue;
    n++;
    if (r.command <= 152) assert.ok(trope.has(r.key), `${r.id} ${r.key}`);
    else if (r.command === 170 || r.command === 171) assert.ok(vocab.has(r.key), `${r.id} ${r.key}`);
    else assert.ok(registry.has(r.key) || festivals.has(r.key), `${r.id} ${r.key}`);
  }
  assert.ok(n >= 50 && n < 200, String(n));
  assert.equal(B.rows.filter((r) => r.command <= 152 && !r.key).length, 2, 'only the two Telisha rows stay unkeyed');
  assert.equal(tropeKey('Sof Pasuk'), 'sof-pasuk'); assert.equal(tropeKey('Mahapakh'), 'mahpach'); assert.equal(tropeKey('Segolta'), 'segol'); assert.equal(tropeKey('Telisha'), '');
  const idx = vocabIndex();
  assert.equal(vocabKey('Eleven lemons', idx), 'h77944f4c'); assert.equal(vocabKey('nineteen grapes on a bunch', idx), '');
  assert.equal(B.rows.find((r) => r.id === 'HERO_morning_01').key, 'modeh-ani-1');
  assert.equal(B.rows.find((r) => r.id === 'CTX_party_08').key, 'hanukkah');
});

test('run 3: csv on disk is current, has the manifest columns, and no tool names in any run 3 file', () => {
  assert.equal(read('data/images/run3.csv').replaceAll('\r\n', '\n'), B.csv, 'run3.csv is stale: run node tools/images/build_run3.mjs');
  const rows = loadRun3();
  assert.equal(rows.length, 1000);
  assert.deepEqual(Object.keys(rows[0]), HEAD);
  for (const f of ['data/images/run3.csv', 'docs/images/RUN3.md', 'tools/images/run3-source.md', 'tools/images/build_run3.mjs', 'tools/images/match_run3.mjs', 'tests/images.run3.test.js']) {
    assert.doesNotMatch(read(f), TOOL_NAMES, f);
  }
  assert.match(read('tools/images/run3-source.md'), /^150\. \*\*Trope set 1/m);
  assert.match(read('docs/images/RUN3.md'), /match_run3\.mjs/);
});

test('run 3: rows can be appended to manifest.csv (idempotent) and carry alt text in the generated manifest', () => {
  const src = readRows(join(ROOT, 'data/images/run3.csv'));
  const existing = readRows(join(ROOT, 'data/images/manifest.csv'));
  const taken = new Set(['data/images/manifest.csv', 'data/images/next1000.csv', 'data/images/block-j.csv', 'data/images/inter-pending.csv'].flatMap((f) => readRows(join(ROOT, f)).map((r) => r.file.replace(/\.png$/i, ''))));
  for (const r of B.rows) assert.ok(!taken.has(r.id) || existing.some((e) => e.file === r.file && e.command === String(r.command)), `${r.id} collides with an earlier list`);
  const p = plan(existing, src);
  assert.equal(p.invalid.length, 0);
  assert.equal(p.append.length + p.present.length, 1000);
  assert.equal(plan(existing.concat(p.append), src).append.length, 0);
  const alt = buildAltText({ images: {} }, [], [], loadRun3());
  assert.equal(Object.keys(alt).length, 1000);
  assert.equal(alt.TROPE_etnachta_mnemonic, B.rows[0].alt);
  assert.equal(run3Alt({ id: 'X', kind: 'hero', set: 'Amidah heroes I', alt: '' }), 'Flat illustration (hero) from the set Amidah heroes I.');
  const man = json('data/images/generated-manifest.json');
  for (const r of B.rows.slice(0, 50)) assert.equal(man.altText[r.id], r.alt, `${r.id}: run node tools/images/alt_text.mjs`);
});

test('run 3: matcher reports missing, extra, duplicates, variants and wrong aspect per command', () => {
  const rows = loadRun3();
  const names = ['TROPE_etnachta_mnemonic.png', 'trope_etnachta_card.PNG', 'CRAFT_bimah_01.png', 'CRAFT_bimah_01 (1).png', 'CRAFT_bimah_02.png', 'craft_bimah_02.png', 'exec-abc.png', 'notes.txt'];
  const r = matchRun3(names, rows);
  assert.equal(r.matched.length, 4);
  assert.deepEqual(r.caseFixed.map((c) => c.id), ['TROPE_etnachta_card', 'CRAFT_bimah_02']);
  assert.deepEqual(r.variants.map((v) => v.file), ['CRAFT_bimah_01 (1).png']);
  assert.equal(r.duplicates.length, 1);
  assert.deepEqual(r.unmatched, ['exec-abc.png']); assert.deepEqual(r.ignored, ['notes.txt']);
  assert.equal(r.missing.length, 996);
  const c150 = r.perCommand.find((p) => p.command === 150), c155 = r.perCommand.find((p) => p.command === 155);
  assert.deepEqual([c150.present, c150.total, c155.present, c155.total, r.perCommand.length], [2, 10, 2, 10, 100]);
  const sizes = new Map([['TROPE_etnachta_mnemonic.png', [1024, 1024]], ['CRAFT_bimah_01.png', [1024, 1024]], ['CRAFT_bimah_02.png', [1792, 1024]]]);
  const bad = wrongAspect(r.matched, sizes, rows);
  assert.deepEqual(bad.map((b) => b.id), ['CRAFT_bimah_01']);
});

test('run 3: runbook step 5 is present and RUNBOOK.md is current', () => {
  const R = runbookRun3();
  assert.deepEqual(R, { rows: 1000, commands: 100 });
  const md = read('docs/images/RUNBOOK.md');
  assert.equal(md, renderRunbook(), 'RUNBOOK.md is stale: run node tools/images/build_runbook.mjs');
  assert.match(md, /\| 5 \| `tools\/images\/run3-source\.md`/);
  assert.match(md, /match_run3\.mjs/);
  assert.doesNotMatch(md, TOOL_NAMES);
});
