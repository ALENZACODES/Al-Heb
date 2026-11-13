// Guards the 12 Nov 2026 lemma-field fixes (words.json and the packs/index/theme copies).
// Sources and holds are recorded on the entries; neighbouring records are not rewritten.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const words = read('data/vocab/words.json').words;
const byId = new Map(words.map((w) => [w.id, w]));
const index = read('data/vocab/index.json');
const indexCol = (name) => index.fields.indexOf(name);
const indexRow = (id) => index.rows.find((r) => r[0] === id);

function packWord(pack, id) {
  const doc = read(`data/vocab/packs/${pack}.json`);
  return (doc.words || []).find((w) => w.id === id);
}

test('הָרֶה (h377d1fb1): plural is הָרוֹת, not the mountain plural הָרִים, and the verb-form example is held', () => {
  const w = byId.get('h377d1fb1');
  assert.equal(w.he, 'הָרֶה');
  assert.equal(w.en, 'pregnant');
  assert.equal(w.forms.plural, 'הָרוֹת');
  assert.equal(w.example, null);
  assert.equal(packWord('read-describing-words-1', 'h377d1fb1').forms.plural, 'הָרוֹת');
  assert.equal(packWord('read-describing-words-1', 'h377d1fb1').example, null);
  const theme = read('data/vocab/themes/describing-words-set01.json').words.find((x) => x.id === 'h377d1fb1');
  assert.equal(theme.forms.plural, 'הָרוֹת');
});

test('נוֹצְרִי (h3bb19e3d): alt no longer calls it a resident of Nazareth', () => {
  const w = byId.get('h3bb19e3d');
  assert.deepEqual(w.alt, ['Nazarene']);
  assert.equal(w.en, 'Christian');
  assert.ok(!JSON.stringify(w.alt).includes('resident of Nazareth'));
  const en = indexRow('h3bb19e3d')[indexCol('en')];
  assert.equal(en, 'Christian; Nazarene');
  assert.ok(!en.includes('resident of Nazareth'));
  assert.deepEqual(packWord('religion-prayer-3', 'h3bb19e3d').alt, ['Nazarene']);
});

test('אַרְסֵנָל (hcaa91987): pointing, gender and plural are kept and cited', () => {
  const w = byId.get('hcaa91987');
  assert.equal(w.he, 'אַרְסֵנָל');
  assert.equal(w.gender, 'm');
  assert.equal(w.forms.plural, 'אַרְסֵנָלִים');
  assert.equal(w.source.lemmaReview.issue, 'verified');
  assert.match(w.source.lemmaReview.note, /Wiktionary/);
  assert.match(w.source.lemmaReview.note, /Morfix/);
});

test('וְשִׁנַּנְתָּם (paa7b1166): POS is the attested finite verb form, with source', () => {
  const w = byId.get('paa7b1166');
  assert.equal(w.pos, 'verb');
  assert.equal(w.binyan, "pi'el");
  assert.equal(w.root, 'ש־נ־ן');
  assert.match(w.enNote, /perfect consecutive/);
  assert.match(w.enNote, /H8150/);
  assert.equal(indexRow('paa7b1166')[indexCol('pos')], 'verb');
  const pack = packWord('survival-lesson-read-1', 'paa7b1166');
  assert.equal(pack.pos, 'verb');
  assert.equal(pack.root, 'ש־נ־ן');
});

test('מִיץ (h1f02450d): existing root is kept and the dispute is recorded', () => {
  const w = byId.get('h1f02450d');
  assert.equal(w.root, 'מ־ו־ץ');
  assert.equal(w.source.lemmaReview.issue, 'root-dispute');
  assert.match(w.source.lemmaReview.note, /Pealim/);
  assert.match(w.source.lemmaReview.note, /Balashon/);
  assert.equal(packWord('food-drink-2', 'h1f02450d').root, 'מ־ו־ץ');
});

test('פּוֹרְנוֹ (hc030e659): gender is kept and cited as masculine', () => {
  const w = byId.get('hc030e659');
  assert.equal(w.gender, 'm');
  assert.equal(w.source.lemmaReview.issue, 'verified');
  assert.match(w.source.lemmaReview.note, /Wiktionary/);
  assert.equal(packWord('general-things-9', 'hc030e659').gender, 'm');
});
