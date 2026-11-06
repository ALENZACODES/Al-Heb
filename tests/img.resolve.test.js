import test from 'node:test';
import assert from 'node:assert/strict';
import { createImageResolver, img, loadImageResolver } from '../src/img/resolve.js';
import { buildIndexFrom } from '../tools/img/build_index.mjs';

const manifest = [
  { file: 'L01_alef_print_mnemonic.png', set: 'letter_01_alef_print', width: '1024', height: '1024' },
  { file: 'L01_alef_print_ari.png', set: 'letter_01_alef_print', width: '1024', height: '1024' },
  { file: 'L21_kaf_final_cursive_mnemonic.png', set: 'letter_x', width: '1024', height: '1024' },
  { file: 'V01_kamatz_keyword.png', set: 'vowel_01_kamatz', width: '1024', height: '1024' },
  { file: 'VOC_cafe_02.png', set: 'vocab_cafe', width: '1024', height: '1024' },
  { file: 'BG_cafe.png', set: 'setup_backgrounds', width: '1792', height: '1024' },
];
const inter = [{ file: 'I-07-img1.png', set: 'intermediate_I-07', width: '1792', height: '1024' }];
const blockJ = [
  { id: 'J-0001', kind: 'word-object', set: 'j_vocab_x', key: 'h0000aaaa', width: '1024', height: '1024', alt: 'Flat illustration for the Hebrew word meaning "cup".' },
  { id: 'J-0002', kind: 'festival-scene', set: 'j_festival_purim', key: 'I-03', width: '1792', height: '1024', alt: 'A Purim table.' },
];
const altText = { 'L01_alef_print_mnemonic': 'Ox head shaped like Alef.', 'BG_cafe': 'A cafe terrace.' };
const edges = { L01_alef_print_mnemonic: [800, 1254], L01_alef_print_ari: [800], V01_kamatz_keyword: [800, 1254], VOC_cafe_02: [800, 1254], 'J-0001': [800, 1254], 'I-07-img1': [800, 1254], 'J-0002': [800, 1254], BG_cafe: [800, 1254] };
const index = JSON.parse(JSON.stringify(buildIndexFrom({ manifest, blockJ, inter, altText, edges })));
const mk = (approvals, extra = {}) => createImageResolver({ index, approvals: { approvals }, ...extra });
const all = Object.fromEntries(['L01_alef_print_mnemonic', 'L01_alef_print_ari', 'V01_kamatz_keyword', 'VOC_cafe_02', 'J-0001', 'I-07-img1', 'J-0002', 'BG_cafe'].map((k) => [k, { status: 'approved' }]));

test('unapproved images are hidden: every kind returns null', () => {
  const R = mk({});
  for (const [k, id] of [['letter', 'alef'], ['vowel', 'kamatz'], ['word', 'h0000aaaa'], ['theme', 'cafe'], ['lesson', 'I-07'], ['festival', 'purim'], ['id', 'BG_cafe']]) assert.equal(R.resolve(k, id, { slot: k === 'theme' ? 2 : undefined }), null, k);
  assert.equal(R.has('letter', 'alef'), false);
});

test('rejected is hidden too; approved shows with src, alt, aspect, dimensions', () => {
  assert.equal(mk({ L01_alef_print_mnemonic: { status: 'rejected' } }).resolve('letter', 'alef'), null);
  const r = mk(all).resolve('letter', 'alef');
  assert.equal(r.approved, true); assert.equal(r.id, 'L01_alef_print_mnemonic');
  assert.equal(r.src, 'assets/img/gen/L01_alef_print_mnemonic.800.webp');
  assert.equal(r.alt, 'Ox head shaped like Alef.'); assert.equal(r.aspect, '1:1'); assert.deepEqual([r.width, r.height], [800, 800]);
});

test('every kind resolves when approved, alt always non-empty (synthesised when the manifest has none)', () => {
  const R = mk(all);
  const got = [R.resolve('vowel', 'kamatz'), R.resolve('word', 'h0000aaaa'), R.resolve('theme', 'cafe', { slot: 2 }), R.resolve('lesson', 'I-07'), R.resolve('festival', 'purim'), R.resolve('id', 'BG_cafe')];
  for (const r of got) { assert.ok(r, 'resolved'); assert.ok(r.alt && r.alt.length > 8, r.id); }
  assert.equal(got[1].alt, 'Flat illustration for the Hebrew word meaning "cup".');
  assert.deepEqual([got[3].aspect, got[3].width, got[3].height], ['7:4', 800, 457]);
  assert.equal(R.resolve('theme', 'cafe', { slot: 1 }), null);
  assert.match(R.resolve('theme', 'cafe', { slot: 2 }).alt, /vocabulary theme cafe/);
});

test('file not ingested -> null even when approved; width picks the variant', () => {
  const R = mk({ ...all, 'L21_kaf_final_cursive_mnemonic': { status: 'approved' } });
  assert.equal(R.resolve('letter', 'kaf-final', { script: 'cursive' }), null);
  assert.equal(R.resolve('letter', 'alef', { width: 1200 }).src, 'assets/img/gen/L01_alef_print_mnemonic.1254.webp');
  assert.equal(R.resolve('letter', 'alef', { role: 'ari' }).src, 'assets/img/gen/L01_alef_print_ari.800.webp');
});

test('showUnapproved (boolean or getter) reveals with approved:false; unknown ids stay null', () => {
  let on = false; const R = mk({}, { showUnapproved: () => on });
  assert.equal(R.resolve('letter', 'alef'), null); on = true;
  assert.equal(R.resolve('letter', 'alef').approved, false);
  assert.equal(mk({}, { showUnapproved: true }).resolve('word', 'h0000aaaa').approved, false);
  assert.equal(mk(all).resolve('letter', 'nope'), null); assert.equal(mk(all).resolve('word', ''), null);
});

test('img helper: lazy attributes, no layout shift, alt from manifest, null renders nothing', () => {
  const h = (tag, attrs = {}, ...kids) => ({ tag, attrs, kids });
  const R = mk(all);
  const el = img(h, { R, kind: 'lesson', id: 'I-07', class: 'x' });
  assert.equal(el.tag, 'img');
  assert.equal(el.attrs.loading, 'lazy'); assert.equal(el.attrs.decoding, 'async');
  assert.ok(el.attrs.width > 0 && el.attrs.height > 0); assert.ok(el.attrs.alt.length > 8); assert.ok(!('data-unapproved' in el.attrs));
  assert.equal(img(h, { R: mk({}), kind: 'lesson', id: 'I-07' }), null);
  assert.equal(img(h, { R, kind: 'letter', id: 'alef', decorative: true }).attrs.alt, '');
  assert.ok('data-unapproved' in img(h, { R: mk({}, { showUnapproved: true }), kind: 'letter', id: 'alef' }).attrs);
});

test('a reviewed cue fills a word with no approved picture of its own', () => {
  const cues = { cues: { h0000aaaa: { asset: 'VOC_cafe_02', alt: 'A cup of coffee.' }, h0000bbbb: { asset: 'VOC_cafe_02', alt: 'A cup of coffee.' } } };
  const cued = mk({ VOC_cafe_02: { status: 'approved' } }, { wordCues: cues }).resolve('word', 'h0000aaaa');
  assert.equal(cued.id, 'VOC_cafe_02');
  assert.equal(cued.alt, 'A cup of coffee.');
  assert.equal(cued.approved, true);
  assert.equal(mk(all, { wordCues: cues }).resolve('word', 'h0000aaaa').id, 'J-0001');
  assert.equal(mk({ VOC_cafe_02: { status: 'approved' } }, { wordCues: cues }).resolve('word', 'missing-word'), null);
  assert.equal(mk({}, { wordCues: cues, showUnapproved: true }).resolve('word', 'h0000bbbb'), null);
});

test('loadImageResolver survives missing files: returns a resolver that yields null', async () => {
  const R = await loadImageResolver(async () => { throw new Error('offline'); });
  assert.equal(R.resolve('letter', 'alef'), null);
});
