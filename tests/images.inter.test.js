import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { build, loadSlots, slotPrompt, MAX_ITEMS, MAX_CHARS, FIRST_COMMAND } from '../tools/images/build_inter.mjs';
import { matchNames, matchFolder } from '../tools/images/match_inter.mjs';
import { render as renderRunbook, countItems } from '../tools/images/build_runbook.mjs';
import { parseCsv } from '../tools/images/build_next1000.mjs';
import { NO_TEXT_STRICT } from '../tools/images/build_redo.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PASTE = join(ROOT, 'docs/images/paste');
const BANNED = new RegExp(['\\bA' + 'I\\b', 'cla' + 'ude', 'Chat' + 'GPT'].join('|'), 'i');
const B = build();
const names = readdirSync(PASTE).filter((f) => /^inter-\d\d\.txt$/.test(f)).sort();
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

test('inter: 100 unique slots, ids follow I-NN-imgN', () => {
  const s = loadSlots();
  assert.equal(s.length, 100);
  assert.equal(new Set(s.map((x) => x.id)).size, 100);
  assert.ok(s.every((x) => /^I-\d\d-img[12]$/.test(x.id)));
});

test('inter: paste files are current, <=25 items, <12k chars, strict rules, every slot exactly once', () => {
  assert.deepEqual(names, B.files.map((f) => f.name));
  const all = names.map((f) => read(`docs/images/paste/${f}`)).join('\n');
  for (const f of B.files) {
    const t = read(`docs/images/paste/${f.name}`);
    assert.equal(t, f.text, `${f.name} is stale: run node tools/images/build_inter.mjs`);
    const n = countItems(t);
    assert.ok(n >= 1 && n <= MAX_ITEMS && n === f.rows.length, f.name);
    assert.ok(t.length <= MAX_CHARS, f.name);
    assert.match(t, /^ALEF IMAGE RUN - INTERMEDIATE \d\d/);
    assert.match(t, /STYLE GUIDE v1/);
    assert.match(t, /NEVER put any text in any image/);
    assert.ok(t.includes(NO_TEXT_STRICT));
    assert.match(t, /No identifiable or real people/);
    assert.match(t, /Allowed aspects are ONLY 1:1, 3:2 and 2:3/);
    assert.match(t, /wait for me to say "next"/);
    assert.doesNotMatch(t, /attached|^ATTACH:/im);
  }
  for (const s of B.slots) assert.equal(all.split(`FILENAME: ${s.id}.png |`).length - 1, 1, s.id);
  for (const m of all.matchAll(/SIZE: use (\S+).*?target (\d+)x(\d+)/g)) { assert.equal(m[1], '3:2'); assert.equal(`${m[2]}x${m[3]}`, '1792x1024'); }
});

test('inter: pending csv has the 100 rows in manifest layout, no clash with manifest.csv or next1000.csv', () => {
  assert.equal(read('data/images/inter-pending.csv'), B.csv);
  const rows = parseCsv(B.csv);
  assert.equal(rows.length, 100);
  assert.deepEqual(Object.keys(rows[0]), ['file', 'set', 'command', 'block', 'width', 'height', 'status', 'prompt']);
  const other = new Set([...parseCsv(read('data/images/manifest.csv')), ...parseCsv(read('data/images/next1000.csv'))].map((r) => r.file));
  for (const r of rows) {
    assert.ok(!other.has(r.file), r.file);
    assert.match(r.file, /^I-\d\d-img[12]\.png$/);
    assert.equal(r.status, 'pending'); assert.equal(r.block, 'I'); assert.equal(`${r.width}x${r.height}`, '1792x1024');
    assert.ok(+r.command >= FIRST_COMMAND && +r.command < FIRST_COMMAND + names.length);
    assert.match(r.prompt, /^STYLE GUIDE v1/); assert.match(r.prompt, /No text of any kind/); assert.match(r.prompt, /No real people/);
  }
  assert.match(slotPrompt(B.slots[0]), /never square/);
});

test('inter: matcher classifies names and a temp folder, writes nothing', () => {
  const ids = B.slots.map((s) => s.id);
  const r = matchNames(['I-01-img1.png', 'I-01-img2 (1).png', 'i-02-img1.png', 'I-02-img1.webp', 'foo.png', 'notes.txt'], ids);
  assert.deepEqual(r.matched.map((x) => x.id), ['I-01-img1', 'I-02-img1']);
  assert.deepEqual(r.variants.map((x) => x.id), ['I-01-img2']);
  assert.equal(r.caseFixed.length, 1);
  assert.deepEqual(r.duplicates.map((x) => x.id), ['I-02-img1']);
  assert.deepEqual(r.unmatched, ['foo.png']);
  assert.deepEqual(r.ignored, ['notes.txt']);
  assert.equal(r.missing.length, 98);
  const dir = mkdtempSync(join(tmpdir(), 'alef-inter-'));
  try {
    for (const id of ids) writeFileSync(join(dir, `${id}.png`), 'x');
    const full = matchFolder(dir, ids);
    assert.equal(full.matched.length, 100); assert.equal(full.missing.length, 0); assert.equal(readdirSync(dir).length, 100);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('runbook is current, orders redo, cmd, inter with disk counts, and the ingest doc exists', () => {
  const md = read('docs/images/RUNBOOK.md');
  assert.equal(md, renderRunbook(), 'RUNBOOK.md is stale: run node tools/images/build_runbook.mjs');
  assert.ok(md.indexOf('redo-01') < md.indexOf('cmd-036') && md.indexOf('cmd-036') < md.indexOf('inter-01'));
  assert.match(md, /\| 1 \|.*\| 86 \|/); assert.match(md, /\| 3 \|.*\| 100 \|/);
  assert.match(md, /match_inter\.mjs/);
  const doc = read('docs/images/INTER-INGEST.md');
  assert.match(doc, /I-01-img1\.png/); assert.match(doc, /match_inter\.mjs/); assert.match(doc, /manifest\.csv/);
  for (const f of ['RUNBOOK.md', 'INTER-INGEST.md', 'paste/inter-01.txt']) assert.doesNotMatch(read(`docs/images/${f}`), BANNED, f);
  assert.ok(existsSync(join(ROOT, 'tools/images/ingest.mjs')));
});
