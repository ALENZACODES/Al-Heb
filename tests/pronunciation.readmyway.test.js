// Read it my way: converter view (fake DOM). Rule-generated, unverified.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { newRoot, all, click, tick, loaded, waitFor, El } from './pronunciation.dom-helper.js';
import { mount, READ_KEY } from '../src/pronunciation/readmyway.view.js';
import { shardFile } from '../src/pronunciation/compare.model.js';
import { RUNTIME_DIR } from '../tools/pronunciation/build_runtime.mjs';

El.prototype.removeAttribute ??= function (k) { delete this.attrs[k]; };
const read = (f) => JSON.parse(fs.readFileSync(join(RUNTIME_DIR, f), 'utf8'));
const index = read('index.json'); const reasons = read('reasons.json');
const shards = Object.fromEntries(Array.from({ length: index.shards }, (_, i) => [shardFile(i), read(shardFile(i))]));
const compareData = { index, reasons, shards };
function setup(over = {}) {
  const root = newRoot(); const mem = {}; let printed = 0; const set = [];
  const ctx = { compareData, settings: { congregation: 'ashkenazi', set: (k, v) => set.push([k, v]) }, store: { get: (k) => mem[k], set: (k, v) => { mem[k] = v; } }, print: () => { printed++; }, ...over };
  return { root, mem, set, ctx, printed: () => printed, unmount: mount(root, ctx) };
}
const byTag = (root, t) => all(root, (x) => x.tagName === t);
const text = (n) => n.textContent;
const run = async (root, value) => {
  const status = all(root, (x) => x.getAttribute('role') === 'status')[0];
  status.replaceChildren(); // the view always ends a conversion by writing its status line, so wait for that
  byTag(root, 'TEXTAREA')[0].value = value; byTag(root, 'FORM')[0].dispatch('submit');
  await waitFor(() => text(status) !== '', { message: 'conversion never finished (status line stayed empty)' });
};

test('converts known words into the chosen tradition (default from settings), with respelling, IPA and stress', async () => {
  const { root, mem } = setup(); await loaded(root);
  await run(root, 'שַׁבָּת תּוֹרָה');
  const rows = all(root, (x) => x.tagName === 'TR' && x.children.some((c) => c.tagName === 'TD'));
  assert.equal(rows.length, 2);
  assert.match(text(rows[0]), /shabos/); assert.match(text(rows[0]), /ʃa\.bɔs/); assert.match(text(rows[1]), /toyreh/);
  assert.ok(all(rows[0], (x) => x.tagName === 'STRONG').length === 1);
  assert.match(text(root), /Ashkenazi respelling/); assert.doesNotMatch(text(root), /Israeli respelling/);
  assert.deepEqual(mem[READ_KEY], { text: 'שַׁבָּת תּוֹרָה', tradition: 'ashkenazi' });
});

test('changing the tradition re-renders and writes the congregation setting; "also show the other two" adds columns', async () => {
  const { root, set } = setup(); await loaded(root);
  await run(root, 'שַׁבָּת');
  const sel = byTag(root, 'SELECT')[0]; sel.value = 'israeli'; sel.dispatch('change'); await waitFor(() => set.length > 0, { message: 'congregation setting never written' });
  assert.deepEqual(set, [['congregation', 'israeli']]);
  const sheetOf = () => text(all(root, (x) => (x.getAttribute('class') || '').includes('rmw-sheet'))[0]);
  await waitFor(() => /shabat/.test(sheetOf()), { message: 'sheet never re-rendered in the Israeli tradition' });
  assert.match(sheetOf(), /shabat/); assert.doesNotMatch(sheetOf(), /shabos/);
  const box = byTag(root, 'INPUT').find((x) => x.getAttribute('type') === 'checkbox'); box.checked = true; box.dispatch('change'); await waitFor(() => /Sephardi respelling/.test(text(root)), { message: 'extra columns never rendered' });
  assert.match(sheetOf(), /Israeli respelling/); assert.match(sheetOf(), /Sephardi respelling/); assert.match(sheetOf(), /shabos/);
});

test('unknown and unpointed words are flagged, not guessed; known words are still converted', async () => {
  const { root } = setup(); await loaded(root);
  await run(root, 'שַׁבָּת שלום אֲבַרַקְדַבְרָא');
  assert.match(text(root), /Not in the table, left out: שלום, אֲבַרַקְדַבְרָא/); assert.match(text(root), /need vowel points/);
  assert.equal(all(root, (x) => x.tagName === 'TR' && x.children.some((c) => c.tagName === 'TD')).length, 1);
  await run(root, 'zzz'); assert.match(text(root), /Paste some pointed Hebrew first/);
  await run(root, 'שלום'); assert.match(text(root), /None of these words are in the table/);
});

test('printable sheet: print button enabled only with results and calls print; inline print CSS shows only the sheet; the notice is on the sheet', async () => {
  const { root, printed } = setup(); await loaded(root);
  const pb = all(root, (x) => x.getAttribute('data-act') === 'print')[0];
  assert.equal(pb.getAttribute('disabled'), '');
  await run(root, 'שַׁבָּת'); assert.equal(pb.getAttribute('disabled'), null);
  click(pb); assert.equal(printed(), 1);
  const css = text(byTag(root, 'STYLE')[0]);
  assert.match(css, /@media print/); assert.match(css, /\.rmw-sheet/); assert.match(css, /rmw-noprint\{display:none\}/);
  const sheet = all(root, (x) => (x.getAttribute('class') || '').includes('rmw-sheet'))[0];
  assert.match(text(sheet), /each tradition says/);
  assert.ok(byTag(sheet, 'TH').every((th) => th.getAttribute('scope')));
});

test('multi-line input, saved text restored on next mount, accessibility basics', async () => {
  const a = setup(); await loaded(a.root);
  await run(a.root, 'שַׁבָּת\nתּוֹרָה');
  assert.equal(all(a.root, (x) => x.tagName === 'TR' && x.children.some((c) => c.tagName === 'TD')).length, 2);
  const b = setup({ store: { get: () => a.mem[READ_KEY], set() {} } }); await waitFor(() => /toyreh/.test(text(b.root)), { message: 'saved text never restored' });
  assert.match(text(b.root), /toyreh/);
  const ta = byTag(a.root, 'TEXTAREA')[0];
  assert.equal(all(a.root, (x) => x.tagName === 'LABEL' && x.getAttribute('for') === ta.getAttribute('id')).length, 1);
  assert.equal(ta.getAttribute('lang'), 'he'); assert.equal(ta.getAttribute('dir'), 'rtl');
  a.unmount();
});
