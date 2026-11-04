// data/speak/minimal-pairs.json: built only from existing vocab; audible flags agree with the rule IPA.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildPairs, minimalPairsJson, OUT, CONTRASTS, MAX_PER_CONTRAST } from '../tools/pronunciation/build_minimal_pairs.mjs';
import { TRADITIONS } from '../tools/pronunciation/build_variants.mjs';

const { out } = buildPairs();
const words = new Map(JSON.parse(fs.readFileSync(new URL('../data/vocab/words.json', import.meta.url), 'utf8')).words.map((w) => [w.id, w]));
const strip = (s) => s.replace(/[ˈ.]/g, '');

test('file on disk is current, small, and marked unverified', () => {
  assert.equal(fs.readFileSync(OUT, 'utf8'), minimalPairsJson(out), 'stale: run node tools/pronunciation/build_minimal_pairs.mjs');
  assert.ok(fs.statSync(OUT).size <= 200 * 1024);
  assert.equal(out.proofread, false); assert.match(out.note, /not verified by a native speaker/);
  assert.deepEqual(out.contrasts.map((c) => c.id), CONTRASTS.map((c) => c.id));
});

test('every pair uses existing vocab ids and text, differs, and has a per-tradition audible flag matching its IPA', () => {
  for (const c of out.contrasts) {
    assert.ok(c.pairs.length <= MAX_PER_CONTRAST && c.pairs.length <= c.available);
    for (const k of TRADITIONS) assert.ok(c.heard[k], `${c.id} heard.${k}`);
    for (const p of c.pairs) {
      for (const s of [p.a, p.b]) { const w = words.get(s.id); assert.ok(w, s.id); assert.equal(s.he, w.he.normalize('NFC')); assert.equal(s.en, w.en); assert.equal(s.ipa.length, 3); assert.equal(s.simple.length, 3); }
      assert.notEqual(p.a.id, p.b.id); assert.notEqual(p.a.he, p.b.he); assert.notEqual(p.a.is, p.b.is);
      assert.equal(p.audible.length, 3); assert.ok(p.audible.some(Boolean), 'pair must be audible in at least one tradition');
      p.audible.forEach((aud, k) => assert.equal(aud, strip(p.a.ipa[k]) !== strip(p.b.ipa[k]), `${c.id} ${p.a.id}/${p.b.id} ${TRADITIONS[k]}`));
    }
  }
});

test('tradition-specific contrasts behave as stated', () => {
  const by = Object.fromEntries(out.contrasts.map((c) => [c.id, c]));
  for (const p of by['kamatz-patach'].pairs) assert.equal(p.audible[2], true); // Ashkenazi o vs a
  for (const p of by['kamatz-patach'].pairs) assert.deepEqual(p.audible.slice(0, 2), [false, false]);
  for (const p of by['tzere-segol'].pairs) assert.deepEqual(p.audible, [false, false, true]);
  for (const p of by['alef-ayin'].pairs) assert.deepEqual(p.audible, [false, true, false]); // Sephardi glottal vs pharyngeal only
  for (const p of by['het-khaf'].pairs) assert.deepEqual(p.audible, [false, true, false]);
  for (const p of by['shin-sin'].pairs) assert.deepEqual(p.audible, [true, true, true]);
  assert.ok(by['shin-sin'].pairs.length > 0 && by['kamatz-patach'].pairs.length > 0);
});

test('deterministic', () => { assert.equal(minimalPairsJson(buildPairs().out), minimalPairsJson(out)); });
