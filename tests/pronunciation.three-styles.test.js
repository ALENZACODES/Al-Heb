// Claude STYLES-G-r1 test plan, part A (no cloud). Default flags only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { respell } from '../src/pronunciation/forTradition.js';
import { STYLE_FLAGS, transliterate } from '../src/pronunciation/transliterate.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/three-styles.json', import.meta.url), 'utf8'));

test('held style flags stay off by default', () => {
  assert.deepEqual(STYLE_FLAGS, { sephardiPharyngeals: false, geminateDisplay: false });
});

for (const row of fixture.rows) {
  test(`three-styles #${row.id} ${row.he}`, () => {
    assert.equal(respell(row.he, 'israeli'), row.israeli, 'israeli');
    assert.equal(respell(row.he, 'sephardi'), row.sephardi, 'sephardi');
    assert.equal(respell(row.he, 'ashkenazi'), row.ashkenazi, 'ashkenazi');
  });
}

test('אָזְנַיִם is oznayim in every tradition after the kamatz-katan fix', () => {
  for (const t of ['israeli', 'sephardi', 'ashkenazi']) {
    assert.equal(respell('אָזְנַיִם', t), 'oznayim', t);
  }
});

test('Ashkenazi uses s for tav without dagesh', () => {
  assert.equal(respell('אֱמֶת', 'ashkenazi'), 'emes');
  assert.equal(respell('שַׁבָּת', 'ashkenazi'), 'shabos');
  assert.equal(respell('אֱמֶת', 'israeli'), 'emet');
  assert.equal(respell('אֱמֶת', 'sephardi'), 'emet');
});

test('Sephardi ḥ/ʿ and doubled letters exist behind flags, default off, and are not decided here', () => {
  assert.equal(respell('לֶחֶם', 'sephardi'), 'lechem');
  assert.equal(respell('עוֹלָם', 'sephardi'), 'olam');
  assert.equal(respell('שַׁבָּת', 'ashkenazi'), 'shabos');
  assert.equal(transliterate('לֶחֶם', { scheme: 'siddur', tradition: 'sephardi', sephardiPharyngeals: true }), 'leḥem');
  assert.equal(transliterate('עוֹלָם', { scheme: 'siddur', tradition: 'sephardi', sephardiPharyngeals: true }), 'ʿolam');
  assert.equal(transliterate('שַׁבָּת', { scheme: 'siddur', tradition: 'ashkenazi', geminate: true }), 'shabbos');
  // flags off: still the default spellings
  assert.equal(transliterate('לֶחֶם', { scheme: 'siddur', tradition: 'sephardi' }), 'lechem');
  assert.equal(transliterate('שַׁבָּת', { scheme: 'siddur', tradition: 'ashkenazi' }), 'shabos');
});
