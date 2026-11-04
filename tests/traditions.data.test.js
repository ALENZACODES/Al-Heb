// Traditions lane: data file checks. What these prove: JSON shape, that every cited source id exists, that
// Hebrew samples are in the Hebrew block, that confidence labels are valid, and that the claims our own
// transliteration engine can check (tav, kamatz, tsere, israeli==sephardi) agree with the table. They do NOT
// prove the linguistic claims themselves; those are paraphrases of the cited pages and nobody expert has reviewed them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { transliterate } from '../src/pronunciation/transliterate.js';
import { DETECTOR_IDS, TRADITIONS } from '../src/traditions/model.js';

const load = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const sounds = load('data/traditions/sounds.json');
const sources = load('data/traditions/sources.json');
const guide = load('data/traditions/guide.json');
const consonants = load('data/pronunciation/consonants.json');
const niqqud = load('data/pronunciation/niqqud.json');
const srcIds = new Set(sources.sources.map((s) => s.id));
const inBlock = (s) => [...s].every((c) => c >= '֐' && c <= '׿');
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;

test('sources: unique ids, https URLs for web pages, fetched dates, open flag, licence note mentions CC BY-SA', () => {
  assert.equal(new Set(sources.sources.map((s) => s.id)).size, sources.sources.length);
  for (const s of sources.sources) {
    assert.ok(nonEmpty(s.title) && nonEmpty(s.licence) && nonEmpty(s.supports), s.id);
    assert.equal(typeof s.open, 'boolean', s.id);
    assert.match(s.fetched, /^\d{4}-\d{2}-\d{2}$/, s.id);
    if (!['own', 'lane3'].includes(s.id)) assert.match(s.url, /^https:\/\//, s.id);
    if (s.url.includes('wikipedia.org')) assert.match(s.licence, /CC BY-SA 4\.0/, s.id);
    if (!s.open) assert.match(s.licence, /not openly licensed/, s.id);
  }
  assert.match(sources.licenceNote, /CC BY-SA 4\.0/);
});

test('sounds: schema, confidence labels, known sources, Hebrew samples in block, non-empty cells', () => {
  assert.equal(sounds.draft, true);
  const ids = sounds.sounds.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of sounds.sounds) {
    for (const k of ['label', 'gloss', 'israeli', 'american', 'ashkenazi', 'americanBasis']) assert.ok(nonEmpty(s[k]), `${s.id}.${k}`);
    assert.ok(inBlock(s.he) && s.he.length > 0, `${s.id} he`);
    assert.ok(Object.hasOwn(sounds.confidence, s.confidence), `${s.id} confidence`);
    assert.ok(Array.isArray(s.sources) && s.sources.length >= 1, `${s.id} has sources`);
    for (const id of s.sources) assert.ok(srcIds.has(id), `${s.id} cites unknown source ${id}`);
    assert.ok(Array.isArray(s.other));
    for (const o of s.other) assert.ok(nonEmpty(o.who) && nonEmpty(o.say), `${s.id} other`);
    // a row that rests only on the project's own inference must not claim high confidence
    if (s.sources.every((x) => ['own', 'lane3'].includes(x))) assert.notEqual(s.confidence, 'high', s.id);
  }
});

test('sounds: ids line up with the detectors the screen uses, and the user-requested sounds are all present', () => {
  const ids = sounds.sounds.map((s) => s.id).sort();
  assert.deepEqual(ids, [...DETECTOR_IDS].sort());
  for (const need of ['tav-no-dagesh', 'kamatz', 'patach-kamatz', 'cholam', 'tsere', 'ayin', 'chet', 'resh', 'qof', 'stress']) assert.ok(ids.includes(need), need);
});

test('sounds: link targets exist in the read-only pronunciation data', () => {
  for (const s of sounds.sounds) {
    if (!s.link) continue;
    if (s.link.kind === 'consonant') {
      const rec = consonants.letters[s.link.id];
      assert.ok(rec, `${s.id} consonant ${s.link.id}`);
      if (s.link.variant) assert.ok(rec.variants?.some((v) => v.condition === s.link.variant), `${s.id} variant`);
    } else assert.ok(niqqud.records.some((r) => r.id === s.link.id), `${s.id} niqqud ${s.link.id}`);
  }
});

test('sounds: claims the transliteration engine can check agree (tav, kamatz, tsere; israeli and sephardi identical)', () => {
  const t = (he, tradition) => transliterate(he, { tradition });
  assert.match(t('שַׁבָּת', 'israeli'), /t$/);
  assert.match(t('שַׁבָּת', 'ashkenazi'), /s$/); // tav row: Ashkenazi s, others t
  assert.match(t('בָּרוּךְ', 'ashkenazi'), /^bo/); // kamatz row: Ashkenazi o
  assert.match(t('בָּרוּךְ', 'israeli'), /^ba/);
  assert.match(t('אָמֵן', 'ashkenazi'), /ei/); // tsere row: Ashkenazi ey
  assert.doesNotMatch(t('אָמֵן', 'israeli'), /ei/);
  for (const row of sounds.sounds) assert.equal(t(row.he, 'israeli'), t(row.he, 'sephardi'), `${row.id}: engine writes israeli and sephardi alike`);
  // IPA in the pronunciation data agrees with the table's tav claim
  const v = consonants.letters.tav.variants.find((x) => x.condition === 'without dagesh');
  assert.equal(v.ipa.ashkenazi, '[s]');
  assert.equal(v.ipa.israeli, '[t]');
});

test('sounds: alsoExists entries are marked as reference only and cite known sources', () => {
  assert.ok(sounds.alsoExists.some((a) => a.id === 'yemenite'));
  for (const a of sounds.alsoExists) {
    assert.ok(nonEmpty(a.who) && a.claims.length >= 1 && nonEmpty(a.note));
    assert.ok(Object.hasOwn(sounds.confidence, a.confidence));
    for (const id of a.sources) assert.ok(srcIds.has(id), `${a.id} -> ${id}`);
  }
  // honesty: the Yemenite entry says what was read and that ALEF teaches none of it
  const y = sounds.alsoExists.find((a) => a.id === 'yemenite');
  assert.match(y.note, /no Yemenite audio/i);
});

test('guide: schema, valid settings, sources exist, evidence caveat present, neutral tone checks', () => {
  assert.ok(guide.situations.length >= 6);
  const ids = guide.situations.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const need of ['us-reform', 'us-conservative', 'us-orthodox', 'israel-travel']) assert.ok(ids.includes(need), need);
  for (const s of guide.situations) {
    assert.ok(s.tradition === null || TRADITIONS.includes(s.tradition), s.id);
    assert.ok(nonEmpty(s.title) && nonEmpty(s.summary) && nonEmpty(s.askFirst), s.id);
    assert.ok(s.caveats.length >= 1 && s.caveats.every(nonEmpty), s.id);
    assert.ok(Object.hasOwn(sounds.confidence, s.confidence), s.id);
    for (const id of s.sources) assert.ok(srcIds.has(id), `${s.id} -> ${id}`);
    assert.doesNotMatch(JSON.stringify(s), /\b(correct|incorrect|wrong|proper|authentic)\b.*\b(pronunciation|Hebrew)\b/i, `${s.id} should not rank traditions`);
  }
  assert.match(guide.evidenceNote, /not representative/);
  assert.ok(guide.universalAdvice.some((a) => /ask/i.test(a)));
  assert.ok(guide.universalAdvice.some((a) => /varies|differ/i.test(a)));
});

test('guide: the survey percentages quoted match the figures read from the source (68/73/70/50/38 and 34/34/47/67/73)', () => {
  const t = guide.evidenceNote;
  for (const n of ['68', '73', '70', '50', '38', '34', '47', '67']) assert.ok(t.includes(n), n);
  const reform = guide.situations.find((s) => s.id === 'us-conservative');
  assert.ok(JSON.stringify(reform).includes('73%') && JSON.stringify(reform).includes('34%'));
});
