import test from 'node:test';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { img } from '../src/img/resolve.js';
import { SCENE } from '../src/img/scenes.js';
import { SCENE_CONTEXT, wordReviewCue } from '../src/img/cue.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(join(root, rel), 'utf8');

function h(tag, attrs = {}, ...kids) {
  const text = kids.map((k) => (typeof k === 'string' ? k : k?.text || '')).join('');
  return { tag, attrs, kids, text };
}

function walkJs(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkJs(p, out);
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

const HELD = [
  ...readdirSync(join(root, 'assets/chatgpt-overnight/game/hold')).filter((f) => f.endsWith('.png')).map((f) => f.replace(/\.png$/, '')),
  'GAME_scenes_composite_03', 'GAME_scenes_composite_04', 'GAME_scenes_composite_05', 'GAME_minute_one_celebration_10_ref',
];

test('a missing image is text, not an img', () => {
  const entry = { id: 'missing-word', pointed: 'שָׁלוֹם', lemma: 'שלום' };
  const cue = wordReviewCue(h, () => null, entry, { n: 1, total: 3 });
  assert.equal(cue.mode, 'text');
  assert.equal(cue.nodes.some((n) => n.tag === 'img'), false);
  assert.match(cue.nodes.map((n) => n.text).join(''), /Say what it means/);
  assert.equal(img(h, { R: { resolve: () => null }, kind: 'word', id: entry.id }), null);
});

test('a picture cue hides the Hebrew answer and keeps a meaningful alt', () => {
  const entry = { id: 'h00000001', pointed: 'כּוֹס', lemma: 'כוס' };
  const imgFn = (hh, spec) => hh('img', { alt: 'A cup on a table.', loading: 'lazy', src: 'assets/img/gen/VOC_cup.800.webp', 'data-img-id': spec.id });
  const cue = wordReviewCue(h, imgFn, entry, { n: 2, total: 4 });
  assert.equal(cue.mode, 'picture');
  const joined = cue.nodes.map((n) => n.text).join(' ');
  assert.equal(joined.includes(entry.pointed), false);
  assert.equal(joined.includes(entry.lemma), false);
  const image = cue.nodes.find((n) => n.tag === 'img');
  assert.equal(image.attrs.alt, 'A cup on a table.');
  assert.equal(image.attrs.loading, 'lazy');
  assert.match(image.attrs.src, /^assets\/img\/gen\/.+\.webp$/);
});

test('img() is lazy, described, and absent when the resolver has nothing', () => {
  assert.equal(img(h, { R: { resolve: () => null }, kind: 'id', id: 'NOPE' }), null);
  const node = img(h, { R: { resolve: () => ({ id: 'CHAR_ari_neutral', src: 'assets/img/gen/CHAR_ari_neutral.800.webp', alt: 'Ari, facing forward.', approved: true, width: 280, height: 280 }) }, kind: 'id', id: 'CHAR_ari_neutral' });
  assert.equal(node.attrs.loading, 'lazy');
  assert.equal(node.attrs.decoding, 'async');
  assert.equal(node.attrs.alt, 'Ari, facing forward.');
  assert.equal(node.tag, 'img');
});

test('held Noa-drift stills and composites are not referenced by the app', () => {
  const files = walkJs(join(root, 'src'));
  assert.ok(HELD.length >= 12);
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const id of HELD) assert.equal(text.includes(id), false, `${file} references held id ${id}`);
  }
});

test('scene webps and held copies are not installed in the precache', () => {
  const pre = JSON.parse(read('precache-manifest.js').match(/self\.ALEF_PRECACHE = (\[[\s\S]*?\]);/)[1]);
  assert.equal(pre.some(p => p.startsWith('assets/img/gen/')), false);
  assert.equal(pre.some(p => p.startsWith('assets/chatgpt-overnight/game/hold/')), false);
  assert.equal(pre.some(p => p.includes('GAME_scenes_composite_')), false);
});

test('activity scene metadata matches its screens and Atlas uses letter-specific artwork', () => {
  assert.ok(SCENE_CONTEXT.length > 0, 'runtime scene inventory is not empty');
  for (const row of SCENE_CONTEXT) {
    const key = Object.entries(SCENE).find(([, id]) => id === row.id)?.[0];
    assert.ok(key, row.id);
    assert.match(read(row.file), new RegExp(`SCENE\\.${key}\\b`));
  }
});

test('Atlas renders the selected letter meet picture', () => {
  assert.match(read('src/letters/atlas.view.js'), /letterMeet\(h, ctx, sel\.id/);
});
