import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  STORE_KEY, DEFAULT_STATE, SPEEDS, normaliseState, speedMs, stripNiqqud, spokenText, flatten, display, audioIndex, tropeById, tropeName, legend, markGlyph, stepIndex, spacePaseq, largePositions, displayParts, SIZES, sizeScale, largePositionsIn, bigParts, wordPartsLarge,
} from '../src/torahreader/model.js';

const root = new URL('../', import.meta.url);
const J = (p) => JSON.parse(fs.readFileSync(new URL(p, root), 'utf8'));
const pb = J('data/corpus/reader/priestly-blessing.json');
const sh = J('data/corpus/reader/shema.json');
const table = J('data/corpus/trope/table.json');
const tropes = [J('data/corpus/trope/priestly-blessing.json'), J('data/corpus/trope/shema.json')];
const TROPE_RE = /[֑-ֽ֯׀]/;
const NIQQUD_RE = /[ְ-ׇּׁׂ]/;

test('store key and state normalisation', () => {
  assert.equal(STORE_KEY, 'torahreader.v1');
  assert.deepEqual(normaliseState(null), DEFAULT_STATE);
  assert.deepEqual(normaliseState('x'), DEFAULT_STATE);
  assert.deepEqual(normaliseState({ passage: 'shema', view: 'legend', showTrope: false, showNiqqud: false, speed: 'fast', size: 'largest' }), { v: 1, passage: 'shema', view: 'legend', showTrope: false, showNiqqud: false, speed: 'fast', size: 'largest' });
  assert.equal(normaliseState({ size: 'huge' }).size, 'normal');
  assert.ok(SIZES.length === 3 && sizeScale('normal') === 1 && sizeScale('largest') > sizeScale('large') && sizeScale('bogus') === 1);
  assert.deepEqual(normaliseState({ passage: 'nope', view: 3, showTrope: 'yes', speed: 'warp' }), DEFAULT_STATE);
  assert.ok(SPEEDS.every((s) => s.ms > 0) && speedMs('slow') > speedMs('medium') && speedMs('medium') > speedMs('fast'));
  assert.equal(speedMs('bogus'), speedMs('medium'));
});

test('stripNiqqud keeps letters, maqaf and cantillation; display follows the two switches', () => {
  const items = flatten(sh);
  const it = items[0];
  const full = display(it, { showTrope: true, showNiqqud: true });
  assert.match(full, TROPE_RE); assert.match(full, NIQQUD_RE);
  const noTrope = display(it, { showTrope: false, showNiqqud: true });
  assert.ok(!TROPE_RE.test(noTrope)); assert.match(noTrope, NIQQUD_RE);
  const noPoints = display(it, { showTrope: true, showNiqqud: false });
  assert.ok(!NIQQUD_RE.test(noPoints)); assert.match(noPoints, TROPE_RE);
  const bare = display(it, { showTrope: false, showNiqqud: false });
  assert.equal(bare, 'שמע');
  assert.equal(stripNiqqud('שָׁלוֹם־כֹּל'), 'שלום־כל');
  for (const p of [pb, sh]) for (const x of flatten(p)) {
    assert.ok(!/׃/.test(display(x, { showTrope: true, showNiqqud: true })), 'sof pasuq is printed once per verse by the view');
    assert.ok(!TROPE_RE.test(display(x, { showTrope: false, showNiqqud: true })), x.token.he);
  }
});

test('flatten: every reading token once, in order, with verse boundaries', () => {
  for (const p of [pb, sh]) {
    const f = flatten(p);
    assert.equal(f.length, p.tokenCount);
    assert.deepEqual(f.map((x) => x.n), f.map((_, i) => i));
    assert.equal(f.filter((x) => x.last).length, p.verses.length);
    assert.ok(f.every((x) => x.words.length === x.token.words.length && x.words.length >= 1));
  }
});

test('audioIndex: ids exist in the audio manifest and the manifest text is the token (divine name spoken as Adonai)', () => {
  const man = [J('data/audio/manifest.json'), J('data/audio/manifest-words-israeli.json')].flat().filter((e) => e.voice === 'm' && e.tradition === 'israeli');
  const by = new Map(man.map((e) => [`${e.kind}|${e.id}`, e]));
  let checked = 0;
  for (const p of [pb, sh]) {
    const idx = audioIndex(p);
    for (const it of flatten(p)) {
      const id = idx.words.get(`${it.verse.verse}:${it.token.t}`);
      if (!p.registryVerses.includes(it.verse.verse)) { assert.equal(id, undefined, 'framing verses have no audio id'); continue; }
      const e = by.get(`word|${id}`);
      assert.ok(e, `manifest lacks word ${id}`);
      assert.equal(e.text.replace(/׃$/, ''), spokenText(it.token.he), id);
      checked++;
    }
    for (const v of p.verses) {
      const id = idx.lines.get(v.verse);
      if (!p.registryVerses.includes(v.verse)) { assert.equal(id, undefined); continue; }
      assert.ok(by.get(`line|${id}`), `manifest lacks line ${id}`);
    }
  }
  assert.equal(checked, 15 + 42, 'every token of Num 6:24-26 and Deut 6:4-9 was checked against the manifest');
});

test('tropeById / tropeName / legend: every trope used in the reader has a table row; names follow the tradition', () => {
  const m = tropeById(table);
  for (const p of [pb, sh]) for (const x of flatten(p)) if (x.token.trope) assert.ok(m.get(x.token.trope), x.token.trope);
  assert.equal(tropeName(m.get('tipcha'), 'ashkenazi'), 'Tipcha');
  assert.equal(tropeName(m.get('tipcha'), 'sephardi'), 'Tarcha');
  assert.equal(tropeName(m.get('tipcha'), 'israeli'), 'Tarcha');
  assert.equal(tropeName(undefined, 'sephardi'), '');
  const L = legend(table, tropes);
  assert.deepEqual(L.groups.map((g) => g.id), ['disjunctive', 'conjunctive', 'other']);
  assert.equal(L.groups.flatMap((g) => g.rows).length, table.prose.length);
  assert.equal(L.counts.siluk, 12);
  assert.equal(L.counts.etnachta, 6);
  assert.ok(L.groups.flatMap((g) => g.rows).filter((r) => r.occurs > 0).length >= 14);
  assert.ok(L.groups[0].rows.every((r) => r.cls === 'disjunctive'));
  assert.match(markGlyph(m.get('tipcha')), /^◌֖$/);
});

test('stepIndex', () => {
  assert.equal(stepIndex(null, 5, 1), 0);
  assert.equal(stepIndex(null, 5, -1), 4);
  assert.equal(stepIndex(2, 5, 1), 3);
  assert.equal(stepIndex(4, 5, 1), null);
  assert.equal(stepIndex(0, 5, -1), null);
});

test('large letters: Deuteronomy 6:4 puts the large ayin on the last letter of the first word and the large dalet on the last letter of the last word', () => {
  const v = sh.verses[0];
  assert.deepEqual(v.largeLetters, ['ע', 'ד']);
  const pos = largePositions(v);
  assert.equal(pos.length, 2);
  assert.deepEqual(pos[0], { wi: 0, ln: 2 });
  assert.deepEqual(pos[1], { wi: v.words.length - 1, ln: 2 });
  assert.deepEqual(largePositions(sh.verses[1]), []);
  assert.deepEqual(largePositions(pb.verses[2]), []);
});

test('displayParts: joins back to display() and marks only the large letter (with its points and marks) as big', () => {
  const v = sh.verses[0]; const items = flatten(sh).filter((x) => x.verseIndex === 0); const pos = largePositions(v);
  for (const opts of [{ showTrope: true, showNiqqud: true }, { showTrope: false, showNiqqud: true }, { showTrope: true, showNiqqud: false }, { showTrope: false, showNiqqud: false }]) {
    for (const it of items) assert.equal(displayParts(it, opts, pos).map((p) => p.t).join(''), display(it, opts));
  }
  const big = items.flatMap((it) => displayParts(it, { showTrope: true, showNiqqud: true }, pos)).filter((p) => p.big);
  assert.equal(big.length, 2);
  assert.equal(big[0].t.replace(/[^א-ת]/g, ''), 'ע');
  assert.equal(big[1].t.replace(/[^א-ת]/g, ''), 'ד');
  assert.equal(displayParts(items[1], { showTrope: true, showNiqqud: true }, pos).some((p) => p.big), false);
});

test('largePositionsIn / wordPartsLarge work on plain word lists (used by /read and /torahread) and agree with the reader verse', () => {
  const v = sh.verses[0];
  assert.deepEqual(largePositionsIn(v.words.map((w) => w.he), v.largeLetters), largePositions(v));
  const words = 'שְׁמַע יִשְׂרָאֵל יְהוָה אֱלֹהֵינוּ יְהוָה אֶחָד'.split(' ');
  const parts = wordPartsLarge(words, ['ע', 'ד']);
  assert.equal(parts.length, words.length);
  assert.deepEqual(parts.map((p) => p.map((x) => x.t).join('')), words, 'pieces join back to the word');
  assert.deepEqual(parts[0].filter((x) => x.big).map((x) => x.t), ['ע']);
  assert.deepEqual(parts[5].filter((x) => x.big).map((x) => x.t), ['ד']);
  assert.ok(parts.slice(1, 5).every((p) => p.every((x) => !x.big)));
  assert.deepEqual(wordPartsLarge(words, []).flat().filter((x) => x.big), []);
  assert.deepEqual(bigParts('אב', new Set()), [{ t: 'אב', big: false }]);
});

test('paseq keeps the space the source has before it; displayed verse text equals the source heTrope (sof pasuq and the source space after a maqaf aside)', () => {
  assert.equal(spacePaseq('א\u05C0'), 'א \u05C0');
  assert.equal(spacePaseq('א \u05C0'), 'א \u05C0', 'already spaced: unchanged');
  let paseqs = 0;
  for (const p of [pb, sh]) {
    const items = flatten(p);
    for (const [vi, v] of p.verses.entries()) {
      const shown = items.filter((x) => x.verseIndex === vi).map((x) => display(x, { showTrope: true, showNiqqud: true })).join(' ');
      const parts = items.filter((x) => x.verseIndex === vi).map((x) => displayParts(x, { showTrope: true, showNiqqud: true }).map((q) => q.t).join('')).join(' ');
      const src = v.heTrope.replace(/׃/g, '').replace(/־ /g, '־').trim();
      assert.equal(shown, src, v.ref);
      assert.equal(parts, shown, v.ref);
      paseqs += (shown.match(/\u05C0/g) || []).length;
      assert.ok(!/[^\s]\u05C0/.test(shown), `${v.ref}: every paseq follows a space`);
    }
  }
  assert.equal(paseqs, 3, 'the three paseqs of the two passages (Deut 6:4, Num 6:25, Num 6:26) are all kept');
  assert.ok(!/\u05C0/.test(display(flatten(sh)[0], { showTrope: false, showNiqqud: true })));
});
