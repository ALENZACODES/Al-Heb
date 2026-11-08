import test from 'node:test';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createImageResolver, img } from '../src/img/resolve.js';
import { ROUTES } from '../src/shell/router.js';
import { wordReviewCue } from '../src/img/cue.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const bare = (s) => String(s || '').normalize('NFC').replace(/[\u0591-\u05C7]/g, '');
const HE = /[\u0590-\u05FF]/;

const index = json('data/img/index.json');
const approvals = json('data/images/approvals.json');
const book = json('data/images/word-cues.json');
const words = json('data/vocab/words.json').words;
const v5 = [500, 1000, 2000, 5000].flatMap((t) => json(`data/vocab/packs/vocab5k-tier-${t}.json`).entries);
const byId = new Map();
for (const w of words) byId.set(w.id, { he: w.he, gloss: w.en, pos: w.pos });
for (const e of v5) byId.set(e.id, { he: e.pointed || e.lemma, gloss: e.gloss, pos: e.pos });

const R = createImageResolver({ index, approvals, wordCues: book });
const plain = createImageResolver({ index, approvals });
const held = [
  ...readdirSync(join(root, 'assets/chatgpt-overnight/game/hold')).filter((f) => f.endsWith('.png')).map((f) => f.replace(/\.png$/, '')),
  'GAME_scenes_composite_03', 'GAME_scenes_composite_04', 'GAME_scenes_composite_05', 'GAME_minute_one_celebration_10_ref',
];

function h(tag, attrs = {}, ...kids) {
  const text = kids.map((k) => (typeof k === 'string' ? k : k?.text || '')).join('');
  return { tag, attrs, kids, text };
}

test('reviewed cues hit the approved asset, and an unmapped word stays text', () => {
  const eye = book.cues.v8d4641ea;
  assert.equal(plain.resolve('word', 'v8d4641ea'), null);
  const hit = R.resolve('word', 'v8d4641ea');
  assert.equal(hit.id, eye.asset);
  assert.equal(hit.approved, true);
  assert.equal(hit.alt, 'A single eye.');
  assert.equal(HE.test(hit.alt), false);
  const entry = { id: 'v8d4641ea', pointed: 'עַיִן', lemma: 'עין' };
  const cue = wordReviewCue(h, (hh, spec) => img(hh, { R, ...spec }), entry, { n: 1, total: 4 });
  assert.equal(cue.mode, 'picture');
  const joined = cue.nodes.map((n) => n.text).join(' ');
  assert.equal(joined.includes(entry.pointed), false);
  assert.equal(joined.includes(entry.lemma), false);
  const image = cue.nodes.find((n) => n.tag === 'img');
  assert.equal(image.attrs.loading, 'lazy');
  assert.equal(image.attrs.alt, 'A single eye.');
  assert.match(image.attrs.src, /^assets\/img\/gen\/VOC_body_02\.\d+\.webp$/);

  const miss = { id: 'v279bb5ac', pointed: 'אֵת', lemma: 'את' };
  assert.equal(R.resolve('word', miss.id), null);
  const text = wordReviewCue(h, (hh, spec) => img(hh, { R, ...spec }), miss, { n: 2, total: 4 });
  assert.equal(text.mode, 'text');
  assert.equal(text.nodes.some((n) => n.tag === 'img'), false);
  assert.match(text.nodes.map((n) => n.text).join(''), /Say what it means/);
});

test('every cue matches its vocabulary entry, one picture per word, and rejected lookalikes stay unmapped', () => {
  const byAsset = new Map();
  assert.ok(Object.keys(book.cues).length >= 60);
  for (const [id, cue] of Object.entries(book.cues)) {
    const entry = byId.get(id);
    assert.ok(entry, id);
    assert.equal(cue.he, entry.he, id);
    assert.equal(cue.gloss, entry.gloss, id);
    assert.equal(cue.pos, entry.pos, id);
    assert.equal(HE.test(cue.alt), false, cue.alt);
    const hit = R.resolve('word', id);
    assert.equal(hit?.id, cue.asset, id);
    assert.equal(hit.alt, cue.alt);
    assert.equal(approvals.approvals[cue.asset]?.status, 'approved', cue.asset);
    const group = byAsset.get(cue.asset) || [];
    group.push(bare(cue.he));
    byAsset.set(cue.asset, group);
  }
  for (const [asset, forms] of byAsset) assert.equal(new Set(forms).size, 1, asset);
  for (const row of book.rejected) {
    for (const id of [row.wordId, ...(row.also || [])]) {
      const hit = R.resolve('word', id);
      assert.notEqual(hit?.id, row.asset, `${id} must not use ${row.asset}`);
      if (!book.cues[id]) assert.equal(hit, null, id);
    }
  }
  for (const gap of book.gaps) assert.equal([...byAsset.keys()].includes(gap.asset), false, gap.asset);
});

test('held stills are not cues, and the cue file stays out of the install precache', () => {
  const raw = read('data/images/word-cues.json');
  assert.ok(held.length >= 12);
  for (const id of held) assert.equal(raw.includes(id), false, id);
  const pre = JSON.parse(read('precache-manifest.js').match(/self\.ALEF_PRECACHE = (\[[\s\S]*?\]);/)[1]);
  assert.equal(pre.includes('data/images/word-cues.json'), false);
  assert.equal(pre.some(p => p.startsWith('assets/img/gen/')), false);
});

test('pinball and prefix blast use the new backgrounds and the six noun cues stay distinct', () => {
  const table = R.resolve('id', 'GAME_pinball_table');
  const stage = R.resolve('id', 'GAME_prefix_blast_stage');
  assert.equal(table?.approved, true);
  assert.equal(stage?.approved, true);
  assert.equal(HE.test(table.alt), false);
  assert.equal(HE.test(stage.alt), false);
  const day = R.resolve('word', 'h50cf3648');
  const world = R.resolve('word', 'ha39cf3c9');
  const earth = R.resolve('word', 'h2d90f840');
  const king = R.resolve('word', 'h58d8d8fe');
  assert.equal(day.id, 'GAME_prefix_day');
  assert.equal(world.id, 'GAME_prefix_world');
  assert.equal(earth.id, 'GAME_prefix_earth');
  assert.notEqual(world.id, earth.id);
  assert.equal(king.id, 'GAME_prefix_king');
  assert.equal(HE.test(king.alt), false);
  assert.match(king.alt, /throne/i);
  assert.equal(R.resolve('word', 'h86027352').id, 'VOC_colours_09');
  for (const path of ['/pinball', '/prefixblast', '/memorypalace', '/vowelcatcher', '/tugowar']) {
    const route = ROUTES.find(r => r.pattern === path);
    assert.ok(route, path);
    assert.equal(route.tier, 'preview', path + ' remains visibly labelled as preview');
    assert.equal(route.owner, 'games');
  }
});

test('lesson review still shows a word picture only after the answer is revealed', () => {
  const src = read('src/curriculum/review.view.js');
  const revealAt = src.indexOf('function reveal()');
  const picAt = src.indexOf('kind: "word", id: d.vocabId');
  assert.ok(revealAt > 0 && picAt > revealAt);
});
