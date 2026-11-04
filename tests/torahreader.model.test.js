import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  STORE_KEY, DEFAULT_STATE, SPEEDS, normaliseState, speedMs, stripNiqqud, spokenText, flatten, display, audioIndex, tropeById, tropeName, legend, markGlyph, stepIndex,
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
  assert.deepEqual(normaliseState({ passage: 'shema', view: 'legend', showTrope: false, showNiqqud: false, speed: 'fast' }), { v: 1, passage: 'shema', view: 'legend', showTrope: false, showNiqqud: false, speed: 'fast' });
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
