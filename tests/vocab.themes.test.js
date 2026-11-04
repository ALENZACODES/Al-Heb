// Stage 3: theme packs. The key rule: no Hebrew in a theme pack was composed. Every word record
// is a projection of words.json and every example line exists verbatim in data/corpus,
// data/service or data/curriculum. This test rebuilds that string set on its own (a plain walk of
// the JSON files, independent of the builder's pool loader) so the builder cannot cheat.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const { ROOT } = await import('../tools/vocab/frequency.mjs');
const { buildThemes, allocateSets, THEME_COUNT, THEME_SIZE, THEME_DIR } = await import('../tools/vocab/theme_packs.mjs');

const words = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/vocab/words.json'), 'utf8')).words;
const byId = new Map(words.map((w) => [w.id, w]));
const HEB = /[א-ת]/;

function allHebrewStrings() {
  const set = new Set();
  const walk = (x) => {
    if (typeof x === 'string') { if (HEB.test(x)) x.split('\n').forEach((l) => { const t = l.trim(); if (t) set.add(t); }); }
    else if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === 'object') Object.values(x).forEach(walk);
  };
  for (const dir of ['data/corpus', 'data/service', 'data/curriculum']) {
    for (const f of fs.readdirSync(path.join(ROOT, dir))) if (f.endsWith('.json')) walk(JSON.parse(fs.readFileSync(path.join(ROOT, dir, f), 'utf8')));
  }
  return set;
}

const themeDir = path.join(ROOT, THEME_DIR);
const files = fs.readdirSync(themeDir).filter((f) => f.endsWith('.json') && f !== 'index.json').sort();
const themes = files.map((f) => JSON.parse(fs.readFileSync(path.join(themeDir, f), 'utf8')));
const index = JSON.parse(fs.readFileSync(path.join(themeDir, 'index.json'), 'utf8'));

test('exactly 40 theme packs of about 125 words, index agrees', () => {
  assert.equal(themes.length, THEME_COUNT);
  assert.equal(index.count, THEME_COUNT);
  assert.equal(index.themes.length, THEME_COUNT);
  for (const t of themes) {
    assert.equal(t.schema, 'alef-vocab-theme/1');
    assert.ok(t.size >= 40 && t.size <= THEME_SIZE, `${t.id}: ${t.size}`);
    assert.equal(t.words.length, t.size);
    const ix = index.themes.find((x) => x.id === t.id);
    assert.ok(ix && ix.size === t.size && ix.file === `${t.id}.json`);
    assert.ok(words.some((w) => w.topic === t.topic));
    assert.match(t.title, /, set \d+ of \d+$/);
  }
  const full = themes.filter((t) => t.size === THEME_SIZE).length;
  assert.ok(full >= 30, `${full} packs are full; small topics may be smaller`);
  assert.ok(index.counts.words >= 4500, 'about 5,000 words in total');
  assert.equal(index.counts.words, themes.reduce((a, t) => a + t.size, 0));
});

test('every word is a projection of its words.json record and appears in one pack only', () => {
  const seen = new Set();
  for (const t of themes) for (const w of t.words) {
    const src = byId.get(w.id);
    assert.ok(src, `${w.id} not in words.json`);
    assert.ok(!seen.has(w.id), `${w.id} in two packs`); seen.add(w.id);
    for (const k of ['he', 'heUnpointed', 'translit', 'en', 'pos', 'gender', 'frequencyRank', 'level', 'track', 'kind']) assert.equal(w[k], src[k], `${w.id}.${k}`);
    assert.deepEqual(w.forms ?? null, src.forms ?? null);
    assert.equal(src.topic, t.topic);
    assert.equal(typeof w.corpusRank, 'number');
    assert.equal(typeof w.corpusOccurrences, 'number');
    assert.ok(Array.isArray(w.flags));
    if (!w.example) assert.ok(w.flags.includes('noCorpusExample'));
    else assert.ok(!w.flags.includes('noCorpusExample'));
  }
});

test('NO invented Hebrew: every example line exists verbatim in data/corpus, data/service or data/curriculum', () => {
  const pool = allHebrewStrings();
  assert.ok(pool.size > 500);
  let n = 0;
  for (const t of themes) for (const w of t.words) {
    if (!w.example) continue;
    n++;
    assert.equal(typeof w.example.he, 'string');
    assert.ok(pool.has(w.example.he), `${t.id}/${w.id}: example not found verbatim: ${w.example.he}`);
    assert.ok(w.example.he.split(/\s+/).length >= 2, 'an example is a line of at least two words');
    assert.equal(w.example.senseChecked, false, 'the sense of the word in the line was not verified');
    assert.ok(['pointed', 'exact', 'clitic'].includes(w.example.match));
    assert.ok(w.example.source && typeof w.example.source.file === 'string' && /^data\/(corpus|service|curriculum)\//.test(w.example.source.file));
    assert.ok(fs.existsSync(path.join(ROOT, w.example.source.file)));
    if (w.example.en != null) assert.equal(typeof w.example.en, 'string');
  }
  assert.equal(n, index.counts.withExample);
  assert.ok(n >= 500, `${n} words carry an example`);
  assert.ok(index.counts.withoutExample > 0, 'a small corpus cannot illustrate 5,000 words; zeros are reported');
});

test('example really contains the word (its unpointed form or a listed form, possibly behind a prefix)', () => {
  const strip = (s) => s.normalize('NFC').replace(/[־׃]/g, ' ').replace(/[֑-ׇ]/g, '').replace(/[.,!?;:"“”()…׃\/]/g, ' ').replace(/\s+/g, ' ').trim();
  const forms = (w) => { const out = new Set([strip(w.heUnpointed)]); const walk = (x) => { if (typeof x === 'string') out.add(strip(x)); else if (x && typeof x === 'object') Object.values(x).forEach(walk); }; walk(w.forms); return [...out].filter(Boolean); };
  for (const t of themes) for (const w of t.words) {
    if (!w.example) continue;
    const line = ' ' + strip(w.example.he) + ' ';
    const hit = forms(w).some((f) => line.includes(' ' + f + ' ') || (w.example.match === 'clitic' && new RegExp(' [ובהלמשכ]{1,2}' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' ').test(line)));
    assert.ok(hit, `${t.id}/${w.id} ${w.he}: not in "${w.example.he}"`);
  }
});

test('shared spellings are flagged when the example matched by consonants only', () => {
  const spell = new Map(); for (const w of words) spell.set(w.heUnpointed, (spell.get(w.heUnpointed) || 0) + 1);
  for (const t of themes) for (const w of t.words) {
    if (!w.example) continue;
    const shared = spell.get(w.heUnpointed) > 1 && w.example.match !== 'pointed';
    assert.equal(w.flags.includes('exampleSpellingShared'), shared, `${w.id}`);
  }
});

test('ordering inside a topic follows corpus rank; set 1 holds the most attested words', () => {
  const byTopic = new Map();
  for (const t of themes) { if (!byTopic.has(t.topic)) byTopic.set(t.topic, []); byTopic.get(t.topic).push(t); }
  for (const [, list] of byTopic) {
    list.sort((a, b) => a.set - b.set);
    let last = 0;
    for (const t of list) for (const w of t.words) { assert.ok(w.corpusRank > last, `${t.id}`); last = w.corpusRank; }
  }
});

test('allocation: one set per topic minimum, exactly 40, extra sets fill the largest topics', () => {
  const a = allocateSets({ a: 1000, b: 100, c: 50 }, 10, 125);
  assert.deepEqual(a, { a: 8, b: 1, c: 1 });
  const b = allocateSets({ x: 10, y: 10 }, 5, 125);
  assert.deepEqual(b, { x: 1, y: 1 }, 'cannot allocate sets no topic can fill');
});

test('builder output equals the committed packs and leaves words.json untouched', () => {
  const before = fs.readFileSync(path.join(ROOT, 'data/vocab/words.json'));
  const built = buildThemes(ROOT);
  assert.equal(built.themes.length, THEME_COUNT);
  for (const t of built.themes) {
    const committed = themes.find((x) => x.id === t.id);
    assert.ok(committed, `${t.id} missing on disk; rerun tools/vocab/theme_packs.mjs`);
    assert.deepEqual(committed.words.map((w) => [w.id, w.example && w.example.he]), t.words.map((w) => [w.id, w.example && w.example.he]), `${t.id} is stale; rerun tools/vocab/theme_packs.mjs`);
  }
  assert.ok(before.equals(fs.readFileSync(path.join(ROOT, 'data/vocab/words.json'))));
});
