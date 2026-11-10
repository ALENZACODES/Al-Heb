import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, MAX_CHARS, MAX_ITEMS, COMPACT_STYLE, PEOPLE_SHORT } from '../tools/images/build_blockj.mjs';
import { NO_TEXT_ITEM } from '../tools/images/build_redo.mjs';
import { STYLE_GUIDE } from '../tools/images/spec.mjs';
import { parseCsv } from '../tools/images/build_next1000.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const B = build();
const ALLOWED = new Set(['1:1', '3:2', '2:3']);
const FORBIDDEN = /\b(text|texts|sign|signs|label|labels|caption|captions|letter|letters|writing|lettering|logo|logos)\b/i;
const NEGATIVE = [STYLE_GUIDE, COMPACT_STYLE, NO_TEXT_ITEM, PEOPLE_SHORT];
const strip = (p) => NEGATIVE.reduce((t, n) => t.split(n).join(' '), p);
const AI_NAMES = /\u0063hatgpt|openai|gpt-?\d|dall-?e|midjourney|gemini|\u0063laude|anthropic|copilot/i;

test('block J: exactly 1000 rows, unique ids and files, sequential J-NNNN', () => {
  assert.equal(B.rows.length, 1000);
  assert.equal(new Set(B.rows.map((r) => r.id)).size, 1000);
  assert.equal(new Set(B.rows.map((r) => r.file)).size, 1000);
  B.rows.forEach((r, i) => { assert.equal(r.id, `J-${String(i + 1).padStart(4, '0')}`); assert.equal(r.file, `${r.id}.png`); assert.equal(r.block, 'J'); assert.ok(r.command >= 301); });
});

test('block J: part counts add up', () => {
  const c = B.counts;
  assert.equal(c.festival, 120); assert.equal(c.lesson, 50); assert.equal(c.letter, 27); assert.equal(c.vowel, 15);
  assert.equal(c.vocab + c.festival + c.lesson + c.letter + c.vowel + c.srs, 1000);
  assert.ok(c.vocab >= 480 && c.srs >= 200);
});

test('block J: no duplicate prompts or scene cores, none repeat existing CSVs', () => {
  assert.equal(new Set(B.rows.map((r) => r.prompt)).size, 1000);
  assert.equal(new Set(B.rows.map((r) => r.core)).size, 1000);
  const existing = ['data/images/manifest.csv', 'data/images/next1000.csv', 'data/images/inter-pending.csv'].flatMap((p) => parseCsv(read(p))).map((r) => r.prompt);
  const set = new Set(existing);
  for (const r of B.rows) { assert.ok(!set.has(r.prompt), r.id); assert.ok(!existing.some((e) => e.includes(r.core)), `${r.id} repeats an existing prompt`); }
});

test('block J: aspects allowed and sizes match', () => {
  for (const r of B.rows) {
    assert.ok(ALLOWED.has(r.aspect), r.id);
    const ratio = r.width / r.height;
    // same convention as the other blocks: 3:2 is delivered as 1792x1024, 2:3 as 1024x1536
    if (r.aspect === '1:1') assert.ok(Math.abs(ratio - 1) < 0.02, r.id);
    else if (r.aspect === '3:2') assert.ok(ratio > 1.3, r.id);
    else assert.ok(ratio < 0.77, r.id);
  }
});

test('block J: forbidden words only appear in the negative clauses', () => {
  for (const r of B.rows) {
    assert.ok(r.prompt.startsWith(STYLE_GUIDE), r.id);
    assert.ok(r.prompt.includes(NO_TEXT_ITEM), r.id);
    assert.doesNotMatch(strip(r.prompt), FORBIDDEN, `${r.id}: ${strip(r.prompt)}`);
    assert.doesNotMatch(r.core, FORBIDDEN, r.id);
    assert.ok(r.alt.length > 10 && r.alt.length < 400, r.id);
  }
});

test('block J: every key exists in its source data', () => {
  const ids = new Set();
  for (const t of json('data/vocab/themes/index.json').themes) for (const w of json(`data/vocab/themes/${t.file}`).words) ids.add(w.id);
  const deck = new Set(json('data/vocab/deck-order.json').entries.map((e) => e.id));
  const lessons = new Set(json('data/curriculum/intermediate-index.json').lessons.map((l) => l.id));
  const letters = new Set(json('data/letters/letters.json').map((l) => l.id));
  const vowels = new Set(parseCsv(read('data/images/manifest.csv')).map((r) => r.set).filter((s) => /^vowel_/.test(s)));
  assert.equal(letters.size, 27); assert.equal(vowels.size, 15); assert.equal(lessons.size, 50);
  for (const r of B.rows) {
    if (r.kind === 'srs-card') assert.ok(deck.has(r.key) && ids.size, r.id);
    else if (/^word-/.test(r.kind)) assert.ok(ids.has(r.key), `${r.id} ${r.key}`);
    else if (r.kind === 'letter-alt') assert.ok(letters.has(r.key), r.id);
    else if (r.kind === 'vowel-alt') assert.ok(vowels.has(r.key), r.id);
    else assert.ok(lessons.has(r.key), `${r.id} ${r.key}`);
  }
  assert.deepEqual([...new Set(B.rows.filter((r) => r.kind === 'letter-alt').map((r) => r.key))].sort(), [...letters].sort());
  assert.deepEqual([...new Set(B.rows.filter((r) => r.kind === 'vowel-alt').map((r) => r.key))].sort(), [...vowels].sort());
  const lessonScenes = B.rows.filter((r) => r.kind === 'lesson-scene').map((r) => r.key).sort();
  assert.deepEqual(lessonScenes, [...lessons].sort());
  const wordKeys = B.rows.filter((r) => /^(word-|srs-)/.test(r.kind)).map((r) => r.key);
  assert.equal(new Set(wordKeys).size, wordKeys.length, 'a word id is used twice');
});

test('block J: paste files are current, <=20 items, <=12k chars, every row exactly once', () => {
  const dir = join(ROOT, 'docs/images/paste');
  const names = readdirSync(dir).filter((f) => /^j-\d\d\.txt$/.test(f)).sort();
  assert.deepEqual(names, B.files.map((f) => f.name));
  const seen = [];
  for (const f of B.files) {
    const t = read(`docs/images/paste/${f.name}`);
    assert.equal(t, f.text, `${f.name} is stale: run node tools/images/build_blockj.mjs`);
    assert.ok(t.length <= MAX_CHARS, f.name);
    const items = [...t.matchAll(/^\d+\. FILENAME: (J-\d{4}\.png) /gm)].map((m) => m[1]);
    assert.ok(items.length >= 1 && items.length <= MAX_ITEMS && items.length === f.rows.length, f.name);
    assert.match(t, /STYLE GUIDE v1/); assert.match(t, /NEVER put any text in any image/); assert.match(t, /Allowed aspects are ONLY 1:1, 3:2 and 2:3/);
    assert.ok(t.includes(COMPACT_STYLE));
    seen.push(...items);
  }
  assert.deepEqual(seen, B.rows.map((r) => r.file));
});

test('block J: csv, master and doc are current; no AI product names in any block J file', () => {
  assert.equal(read('data/images/block-j.csv'), B.csv);
  assert.equal(read('docs/images/paste/J-MASTER.txt'), B.master);
  assert.equal(read('docs/images/BLOCK-J.md'), B.doc);
  const rows = parseCsv(B.csv);
  assert.equal(rows.length, 1000);
  assert.deepEqual(Object.keys(rows[0]), ['id', 'file', 'block', 'command', 'set', 'slot', 'kind', 'key', 'aspect', 'width', 'height', 'status', 'alt', 'prompt']);
  const all = [B.csv, B.master, B.doc, ...B.files.map((f) => f.text), read('tools/images/spec_blockj.mjs'), read('tools/images/build_blockj.mjs')].join('\n');
  assert.doesNotMatch(all, AI_NAMES);
  assert.match(B.master, /j-01\.txt first/);
  for (const f of B.files) assert.ok(B.master.includes(f.name));
});
