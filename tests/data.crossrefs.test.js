// Cross-file reference checks that no single data test covers: ids named in one data file must exist in the file that owns them.
// Read-only. Counts are not pinned here; only "every reference resolves" and "no duplicate ids".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const dups = (a) => { const s = new Set(); const d = new Set(); for (const x of a) (s.has(x) ? d.add(x) : s.add(x)); return [...d]; };

const words = rd('data/vocab/words.json').words;
const vids = new Set(words.map((w) => w.id));
const lessons = rd('data/curriculum/lessons.json').lessons;
const lessonIds = new Set(lessons.map((l) => l.id));
const letters = new Set(rd('data/letters/letters.json').map((l) => l.id));
const vowels = new Set(rd('data/pronunciation/niqqud.json').records.map((r) => r.id));
const registry = rd('data/corpus/registry.json').entries;
const regIds = new Set(registry.map((e) => e.id));
const phrase = new Set(rd('data/corpus/phrasebook.json').entries.map((e) => e.id));

test('vocab: ids are unique and words.json, index.json and the pack files agree', () => {
  assert.deepEqual(dups(words.map((w) => w.id)), []);
  const idx = new Set(rd('data/vocab/index.json').rows.map((r) => r[0]));
  assert.deepEqual([...vids].filter((i) => !idx.has(i)), []);
  assert.deepEqual([...idx].filter((i) => !vids.has(i)), []);
  const inPacks = [];
  for (const f of readdirSync(join(ROOT, 'data/vocab/packs')).filter((n) => n.endsWith('.json'))) for (const w of rd(`data/vocab/packs/${f}`).words ?? []) inPacks.push(w.id);
  assert.deepEqual(inPacks.filter((i) => !vids.has(i)), []);
  assert.deepEqual(rd('data/vocab/deck-order.json').entries.map((e) => (typeof e === 'string' ? e : e.id)).filter((i) => !vids.has(i)), []);
});

test('lessons: ids unique; prerequisites, letters, vowels, prayer lines and word steps all resolve', () => {
  assert.deepEqual(dups(lessons.map((l) => l.id)), []);
  const bad = [];
  for (const l of lessons) {
    for (const p of l.prerequisites || []) if (!lessonIds.has(p)) bad.push(`${l.id} prerequisite ${p}`);
    for (const x of l.letters || []) if (!letters.has(x)) bad.push(`${l.id} letter ${x}`);
    for (const x of l.vowels || []) if (!vowels.has(x)) bad.push(`${l.id} vowel ${x}`);
    for (const pl of l.prayerLines || []) { const id = typeof pl === 'string' ? pl : pl.id || pl.line; if (id && !regIds.has(id)) bad.push(`${l.id} prayer line ${id}`); }
    (l.words || []).forEach((w, i) => { if (!w.he || !w.en) bad.push(`${l.id} word ${i + 1} lacks he or en`); if (w.vocabId && !vids.has(w.vocabId)) bad.push(`${l.id} word ${i + 1} vocabId`); });
    for (const s of l.steps || []) if (s.kind === 'word' && !(l.words || [])[s.word - 1]) bad.push(`${s.id} word index`);
  }
  assert.deepEqual(bad, []);
});

test('intermediate lesson files match their copy in lessons.json', () => {
  for (const f of readdirSync(join(ROOT, 'data/curriculum/lessons-intermediate')).filter((n) => /^I-\d+\.json$/.test(n))) {
    const il = rd(`data/curriculum/lessons-intermediate/${f}`);
    const l = lessons.find((x) => x.id === il.id);
    assert.ok(l, `${il.id} is in lessons.json`);
    assert.deepEqual(il.words, l.words, `${il.id} words`);
  }
});

test('word-vocab-map: every key is a real lesson word and every value a real vocab id', () => {
  const bad = [];
  for (const [k, v] of Object.entries(rd('data/curriculum/word-vocab-map.json').map)) {
    const [lid, wi] = k.split(':'); const l = lessons.find((x) => x.id === lid);
    if (!l || !(l.words || [])[wi - 1]) bad.push(k);
    if (!vids.has(v)) bad.push(`${k} -> ${v}`);
  }
  assert.deepEqual(bad, []);
});

test('corpus: registry ids unique with text and source, prayer-meta covers exactly the registry, readers point at registry ids', () => {
  assert.deepEqual(dups(registry.map((e) => e.id)), []);
  for (const e of registry) for (const f of ['he', 'english', 'ref', 'title', 'category', 'source', 'license']) assert.ok(e[f], `${e.id} has ${f}`);
  const meta = Object.keys(rd('data/corpus/prayer-meta.json').entries);
  assert.deepEqual(meta.filter((i) => !regIds.has(i)), []);
  assert.deepEqual([...regIds].filter((i) => !meta.includes(i)), []);
  for (const f of readdirSync(join(ROOT, 'data/corpus/reader'))) for (const id of rd(`data/corpus/reader/${f}`).registryIds) assert.ok(regIds.has(id), `${f} -> ${id}`);
});

test('audio manifests: no duplicate path, canonical path shape, and every id maps to an owning item', () => {
  const all = [rd('data/audio/manifest.json'), rd('data/audio/manifest-kind-word.json'), ...['ashkenazi', 'israeli', 'sephardi'].map((t) => rd(`data/audio/manifest-words-${t}.json`))].flat();
  assert.deepEqual(dups(all.map((a) => a.path)), []);
  const kid = new Set(all.map((a) => `${a.kind}/${a.id}`));
  const lessonWord = new Set(); for (const l of lessons) (l.words || []).forEach((w, i) => lessonWord.add(`${l.id.toLowerCase()}-w${i + 1}`));
  const base = (id) => id.replace(/-(m|f)$/, '');
  const dialogueLines = new Set(rd('data/curriculum/dialogues.json').dialogues.flatMap((d) => d.lines.map((l) => l.id)));
  const g = rd('data/curriculum/gender-pairs.json'); const genderIds = new Set([...g.pairs, ...g.paradigms].map((p) => p.id));
  const retired = new Map(rd('data/audio/retired-vocabulary.json').map((e) => [e.id, e]));
  for (const [id, row] of retired) { assert.ok(!vids.has(id), id); assert.ok(row.reason && row.he); }
  const bad = [];
  for (const a of all) {
    const at = `${a.kind}/${a.id}`;
    if (!a.text) bad.push(`${at} no text`);
    if (a.path !== `audio/${a.voice}/${a.tradition}/${a.kind}/${a.id}.mp3`) bad.push(`${at} path`);
    if (a.vocabId && !vids.has(a.vocabId)) bad.push(`${at} vocabId`);
    if (a.aliasOf && !kid.has(a.aliasOf)) bad.push(`${at} aliasOf`);
    if (a.kind === 'vowel' && !vowels.has(a.id)) bad.push(`${at} vowel`);
    if (a.kind === 'letter' && !a.group.startsWith('letter')) bad.push(`${at} group`);
    if (a.kind === 'letter' && a.group === 'letter' && !letters.has(a.id)) bad.push(`${at} letter id`);
    if (a.group === 'dialogue-line') { if (!dialogueLines.has(a.id)) bad.push(`${at} dialogue line`); }
    else if (a.kind === 'line' || a.kind === 'prayer') { const b0 = a.id.replace(/-l\d+$/, ''); if (!(regIds.has(a.id) || regIds.has(b0) || phrase.has(a.id) || phrase.has(base(a.id)))) bad.push(`${at} line id`); }
    if (a.group === 'gender-pair' && !genderIds.has(a.id.replace(/-[mf]$/, ''))) bad.push(`${at} gender pair`);
    if (a.group === 'gender-paradigm' && !genderIds.has(a.id.replace(/-[mf][mf]$/, ''))) bad.push(`${at} gender paradigm`);
    if (a.kind === 'word') {
      if (a.group === 'lesson-word' && !lessonWord.has(a.id)) bad.push(`${at} lesson word`);
      if (/^vocab-/.test(a.group) && !vids.has(a.id) && retired.get(a.id)?.he !== a.text) bad.push(`${at} vocab id`);
      if (a.group === 'phrasebook' && !(phrase.has(a.id) || phrase.has(base(a.id)))) bad.push(`${at} phrasebook id`);
      if (a.group === 'prayer-word' && !regIds.has(a.id.replace(/-w\d+$/, ''))) bad.push(`${at} prayer word`);
    }
  }
  assert.deepEqual(bad.slice(0, 20), []);
  for (const l of lessonWord) assert.ok(kid.has(`word/${l}`), `lesson word ${l} has a clip slot`);
});

test('letters and pictures: memory-chain words are real vocab records and every picture and art-map file exists', () => {
  const chain = rd('data/letters/memory-chain.json').letters;
  for (const m of chain) {
    assert.ok(letters.has(m.id), m.id);
    assert.ok(existsSync(join(ROOT, m.picture.svg)), `${m.id} svg`);
    const w = words.find((x) => x.id === m.word.vocabId);
    assert.ok(w, `${m.id} vocabId`);
    assert.equal(w.he, m.word.he, `${m.id} word matches its vocab record`);
  }
  const map = rd('data/letters/art-concept-map.json').letters;
  assert.deepEqual(map.map((l) => l.id).sort(), chain.map((m) => m.id).sort());
  for (const l of map) for (const v of Object.values(l.files || {})) if (v && typeof v === 'object' && v.path) assert.equal(v.exists, existsSync(join(ROOT, v.path)), `${l.id} ${v.path}`);
});

test('image manifests: no duplicate file inside a queue; every intermediate image slot has a prompt row', () => {
  const stems = (f) => readFileSync(join(ROOT, 'data/images', f), 'utf8').split('\n').slice(1).filter(Boolean).map((l) => l.split(',')[0].replace(/\.png$/, ''));
  const all = new Set();
  for (const f of ['manifest.csv', 'next1000.csv', 'inter-pending.csv', 'block-j.csv', 'run3.csv']) { const s = stems(f); assert.deepEqual(dups(s), [], f); s.forEach((x) => all.add(x)); }
  const missing = [];
  for (const l of rd('data/curriculum/intermediate-image-slots.json').lessons) { assert.ok(lessonIds.has(l.lesson), l.lesson); for (const s of l.slots) if (![...all].some((k) => k.startsWith(s.id))) missing.push(s.id); }
  assert.deepEqual(missing, []);
});

test('routes: every route module and needs file exists; the precache lists do not overlap and list only existing files', async () => {
  const { ROUTES } = await import(pathToFileURL(join(ROOT, 'src/shell/router.js')).href);
  const pm = readFileSync(join(ROOT, 'precache-manifest.js'), 'utf8');
  const grab = (n) => new Set(JSON.parse(pm.match(new RegExp(`${n} = (\\[[\\s\\S]*?\\n\\])`))[1]));
  const pre = grab('ALEF_PRECACHE'); const od = grab('ALEF_ON_DEMAND');
  assert.deepEqual([...pre].filter((f) => od.has(f)), []);
  assert.deepEqual([...pre, ...od].filter((f) => !existsSync(join(ROOT, f))), []);
  const bad = [];
  for (const r of ROUTES) {
    if (!existsSync(resolve(ROOT, 'src/shell', r.module))) bad.push(`${r.name} module ${r.module}`);
    if (r.needs && !existsSync(resolve(ROOT, 'src', r.needs))) bad.push(`${r.name} needs ${r.needs}`);
  }
  assert.deepEqual(bad, []);
});
