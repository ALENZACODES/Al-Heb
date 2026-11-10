import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const pb = JSON.parse(fs.readFileSync(new URL('data/corpus/phrasebook.json', root), 'utf8'));
const P = pb.entries;
const SITUATIONS = ['greetings', 'fillers', 'cafe', 'shop', 'taxi', 'directions', 'numbers', 'small-talk'];

test('phrasebook: at least 150 phrases, unique ids, all required situations covered', () => {
  assert.ok(P.length >= 150, 'only ' + P.length);
  assert.equal(new Set(P.map((p) => p.id)).size, P.length);
  for (const s of SITUATIONS) assert.ok(P.filter((p) => p.situation === s).length >= 8, s + ' has too few phrases');
  assert.deepEqual([...new Set(P.map((p) => p.situation))].sort(), [...pb.situations].sort());
});

test('phrasebook: required fields and enums', () => {
  for (const p of P) {
    for (const k of ['id', 'he', 'translit', 'en', 'register', 'situation', 'review', 'source', 'license']) assert.ok(typeof p[k] === 'string' && p[k].length > 0, `${p.id}: ${k}`);
    assert.equal(typeof p.notes, 'string');
    assert.ok(['formal', 'neutral', 'slang'].includes(p.register), `${p.id}: register`);
    assert.equal(typeof p.pointed, 'boolean');
    assert.ok(/native-speaker-needed/.test(p.review), p.id);
    if (p.register === 'slang') assert.ok(/slang/.test(p.review), `${p.id}: slang must be flagged for native review`);
  }
});

test('phrasebook: Hebrew is Hebrew-block only (plus space and basic punctuation), translit is Latin', () => {
  const heOk = /^[֐-׿ …?!,.\-]+$/;
  const trOk = /^[A-Za-z0-9 '\-?!,.…()]+$/;
  for (const p of P) {
    const forms = p.forms ? [p.forms.m, p.forms.f] : [];
    for (const f of [{ he: p.he, translit: p.translit }, ...forms]) {
      // ellipsis placeholders ("...") are allowed in templates like "yesh lachem ...?"
      assert.ok(heOk.test(f.he.replace(/\.\.\./g, '')), `${p.id}: Hebrew field has stray characters: ${f.he}`);
      assert.ok(trOk.test(f.translit), `${p.id}: translit: ${f.translit}`);
      assert.equal(f.he, f.he.normalize('NFC'));
    }
    assert.ok(/[א-ת]/.test(p.he), p.id);
  }
});

test('phrasebook: pointed phrases really carry vowel points; unpointed ones are flagged', () => {
  for (const p of P) {
    const hasPoints = /[ְ-ּ]/.test(p.he);
    assert.equal(hasPoints, p.pointed, `${p.id}: pointed flag ${p.pointed} vs ${hasPoints}`);
  }
});

test('phrasebook: gendered phrases give both forms, they differ, and the base form is the masculine one', () => {
  const g = P.filter((p) => p.gendered);
  assert.ok(g.length >= 25, 'gendered phrases: ' + g.length);
  for (const p of g) {
    assert.ok(p.forms.m && p.forms.f, p.id);
    assert.notEqual(p.forms.m.he, p.forms.f.he, `${p.id}: m and f forms identical`);
    assert.equal(p.forms.m.he, p.he, `${p.id}: base he must equal masculine form`);
    assert.equal(p.forms.m.translit, p.translit);
  }
  // numbers 1-10 all have feminine forms
  assert.ok(P.filter((p) => p.situation === 'numbers' && p.gendered).length >= 10);
});

test('phrasebook: slang phrases are present and flagged; known loanword slang spot check', () => {
  const slang = P.filter((p) => p.register === 'slang');
  assert.ok(slang.length >= 10);
  assert.ok(slang.some((p) => p.translit === 'sababa'));
  assert.ok(slang.some((p) => p.translit === 'yalla'));
});
