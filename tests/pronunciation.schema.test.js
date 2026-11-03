// Lane 3: schema validation for data/pronunciation/*.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { transliterate } from '../src/pronunciation/transliterate.js';

const load = (f) => JSON.parse(fs.readFileSync(new URL(`../data/pronunciation/${f}.json`, import.meta.url), 'utf8'));
const niqqud = load('niqqud');
const consonants = load('consonants');
const drills = load('drills');
const easy = load('easy');

const TRADS = ['israeli', 'sephardi', 'ashkenazi'];
const VOWEL_IDS = ['kamatz', 'patach', 'tzere', 'segol', 'chirik', 'cholam', 'kubutz', 'shuruk', 'shva', 'chataf-patach', 'chataf-segol', 'chataf-kamatz', 'dagesh', 'shin-dot', 'sin-dot'];
const LETTER_IDS = ['alef', 'bet', 'gimel', 'dalet', 'he', 'vav', 'zayin', 'chet', 'tet', 'yod', 'kaf', 'lamed', 'mem', 'nun', 'samekh', 'ayin', 'pe', 'tsadi', 'qof', 'resh', 'shin', 'tav', 'kaf-final', 'mem-final', 'nun-final', 'pe-final', 'tsadi-final'];

const inHebrewBlock = (s) => [...s].every((c) => c >= '֐' && c <= '׿');
const cpsOf = (s) => [...s].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;

test('niqqud.json has exactly the 15 contract ids', () => {
  assert.deepEqual(niqqud.records.map((r) => r.id).sort(), [...VOWEL_IDS].sort());
});

test('every niqqud record has ipa and english for all three traditions (+ american_synagogue)', () => {
  for (const r of niqqud.records) {
    for (const t of TRADS) {
      assert.ok(nonEmpty(r.ipa?.[t]), `${r.id}.ipa.${t}`);
      assert.ok(nonEmpty(r.english?.[t]), `${r.id}.english.${t}`);
    }
    assert.ok(nonEmpty(r.english.american_synagogue), `${r.id}.english.american_synagogue`);
    assert.ok(nonEmpty(r.position) && nonEmpty(r.notes) && nonEmpty(r.name));
    assert.ok(r.sources.length > 0 && r.sources.every((s) => s.url.startsWith('https://')), `${r.id} sources`);
    assert.equal(typeof r.verified.ipa, 'boolean');
    assert.equal(r.verified.english, false, 'english approximations are lane-3 inferences');
  }
});

test('shapes and codepoints are real Hebrew-block characters and agree with each other', () => {
  for (const r of niqqud.records) {
    assert.ok(inHebrewBlock(r.shape), `${r.id} shape`);
    assert.deepEqual(r.shapeCodepoints, cpsOf(r.shape), `${r.id} shapeCodepoints`);
    assert.ok(r.codepoints.length >= 1);
    for (const cp of r.codepoints) {
      const n = parseInt(cp.slice(2), 16);
      assert.ok(n >= 0x590 && n <= 0x5ff, `${r.id} ${cp}`);
      assert.ok(r.shape.includes(String.fromCodePoint(n)), `${r.id} shape contains ${cp}`);
    }
    assert.ok(inHebrewBlock(r.example.he), `${r.id} example`);
    assert.ok(nonEmpty(r.example.gloss));
    for (const v of r.variants ?? []) {
      assert.ok(inHebrewBlock(v.shape), `${r.id}/${v.id} shape`);
      for (const cp of v.codepoints) assert.ok(v.shape.includes(String.fromCodePoint(parseInt(cp.slice(2), 16))), `${v.id} ${cp}`);
      if (v.ipa) for (const t of TRADS) assert.ok(nonEmpty(v.ipa[t]), `${v.id}.ipa.${t}`);
    }
  }
});

test('cholam and kamatz carry their variants', () => {
  const ids = (id) => niqqud.records.find((r) => r.id === id).variants.map((v) => v.id);
  assert.deepEqual(ids('cholam'), ['cholam-chaser', 'cholam-malei']);
  assert.ok(ids('kamatz').includes('kamatz-katan'));
  const kk = niqqud.records.find((r) => r.id === 'kamatz').variants.find((v) => v.id === 'kamatz-katan');
  assert.deepEqual(kk.codepoints, ['U+05C7']);
  assert.equal(kk.verified, false);
});

test('niqqud example words transliterate to a non-empty string in every tradition', () => {
  for (const r of niqqud.records) for (const t of TRADS) assert.ok(transliterate(r.example.he, { tradition: t }).length > 0, `${r.id} ${t}`);
});

test('consonants.json has all 27 letter ids with ipa/english per tradition', () => {
  assert.deepEqual(Object.keys(consonants.letters).sort(), [...LETTER_IDS].sort());
  for (const [id, l] of Object.entries(consonants.letters)) {
    assert.equal(l.id, id);
    assert.ok(inHebrewBlock(l.he));
    assert.equal(typeof l.verified, 'boolean');
    if (!l.verified) assert.ok(nonEmpty(l.unverifiedReason), `${id} needs unverifiedReason`);
    for (const t of TRADS) { assert.ok(nonEmpty(l.ipa[t]), `${id}.ipa.${t}`); assert.ok(nonEmpty(l.english[t]), `${id}.english.${t}`); }
  }
});

test('sound-changing letters are flagged and the features list covers the required items', () => {
  for (const id of ['bet', 'kaf', 'pe', 'shin', 'tav', 'chet', 'ayin', 'resh']) assert.equal(consonants.letters[id].changesSound, true, id);
  assert.deepEqual(consonants.features.map((f) => f.id).sort(), ['ayin', 'bet-vet', 'chet-khaf-merger', 'dagesh-kal-vs-chazak', 'kaf-khaf', 'pe-fe', 'shin-sin', 'tav-ashkenazi-s', 'uvular-resh']);
  for (const f of consonants.features) for (const id of f.letters) assert.ok(consonants.letters[id], `${f.id} -> ${id}`);
  assert.match(consonants.letters.tav.ipa.ashkenazi, /\[s\]/);
  assert.match(consonants.letters.resh.ipa.israeli, /ʁ/);
  for (const id of ['bet', 'kaf', 'pe', 'shin', 'tav']) assert.equal(consonants.letters[id].variants.length, 2);
});

test('transliterate.js consonant values agree with consonants.json for the sound-changing letters', () => {
  assert.equal(transliterate('בּ'), 'b'); assert.equal(transliterate('ב'), 'v');
  assert.equal(transliterate('כּ'), 'k'); assert.equal(transliterate('כ'), 'kh');
  assert.equal(transliterate('פּ'), 'p'); assert.equal(transliterate('פ'), 'f');
  assert.equal(transliterate('שׁ'), 'sh'); assert.equal(transliterate('שׂ'), 's');
  assert.equal(transliterate('ת', { tradition: 'ashkenazi' }), 's');
  assert.equal(transliterate('תּ', { tradition: 'ashkenazi' }), 't');
  assert.equal(transliterate('ת'), 't');
});

test('drills.json: six ranked drills, flagged unverified items, sources on verified ones', () => {
  assert.deepEqual(drills.drills.map((d) => d.id), ['resh', 'pure-vowels', 'milra-stress', 'shva-clusters', 'no-pharyngeals', 'stops-aspiration']);
  drills.drills.forEach((d, i) => {
    assert.equal(d.rank, i + 1);
    assert.ok(nonEmpty(d.listenFor) && nonEmpty(d.tryThis) && nonEmpty(d.marker));
    assert.ok(d.examples.length >= 3);
    for (const e of d.examples) assert.ok(inHebrewBlock(e.he) && nonEmpty(e.translit) && nonEmpty(e.gloss));
    assert.equal(typeof d.verified, 'boolean');
    if (d.verified) assert.ok(d.sources.length > 0, `${d.id} sources`);
    else assert.ok(nonEmpty(d.unverifiedReason));
  });
  const asp = drills.drills.find((d) => d.id === 'stops-aspiration');
  assert.equal(asp.verified, false);
  const extras = drills.drills.flatMap((d) => d.unverifiedExtras ?? []);
  assert.ok(extras.length >= 2 && extras.every((x) => x.verified === false));
});

test('drills.json: exactly five switch cards, in order', () => {
  assert.deepEqual(drills.switchCards.map((c) => c.id), ['kamatz', 'cholam', 'tzere', 'tav', 'stress']);
  drills.switchCards.forEach((c, i) => { assert.equal(c.order, i + 1); assert.ok(nonEmpty(c.rule) && c.sources.length > 0); });
  assert.ok(nonEmpty(drills.switchConsistency.text));
});

test('drills.json: same-word pairs reference real switch ids and carry both spellings', () => {
  const switchIds = new Set(drills.switchCards.map((c) => c.id));
  assert.ok(drills.pairs.length >= 8);
  for (const p of drills.pairs) {
    assert.ok(inHebrewBlock(p.he));
    assert.ok(nonEmpty(p.israeli) && nonEmpty(p.ashkenazi) && p.israeli !== p.ashkenazi);
    for (const s of p.switches) assert.ok(switchIds.has(s), `${p.id} -> ${s}`);
    assert.ok(p.sources.length > 0);
  }
  for (const id of ['shabbat', 'brit', 'adonai', 'yitgadal']) assert.ok(drills.pairs.some((p) => p.id === id), id);
});

test('easy.json: every displayed fact has a source link', () => {
  assert.ok(easy.facts.length >= 5);
  for (const f of easy.facts) { assert.ok(nonEmpty(f.text)); assert.ok(f.source.url.startsWith('https://')); }
  const ids = easy.facts.map((f) => f.id);
  for (const id of ['five-vowels', 'twenty-seven', 'no-capitals']) assert.ok(ids.includes(id), id);
});
