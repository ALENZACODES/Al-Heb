// DRAFT rules, never listened to. These tests only pin 15 hand-checked conversions (worked out by hand from the rule
// table in docs/tts/ENGLISH-RESPELLING-RULES.md) plus a few shape checks. They show the code follows the table, not that
// an English voice or reader hears the intended sound.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { respell, buildCsv, CSV_HEADER } from '../tools/tts/to_english_respelling.mjs';

const ROWS = [
  // Sephardi-style soundtext
  ['a-léf', 'ah-LEF'],
  ['sha-lóm', 'shah-LOHM'],
  ['sha-bát', 'shah-BAHT'],
  ['a-do-nái', 'ah-doh-NIGH'],
  ['gui-mél', 'ghee-MEL'],
  ['gué', 'GHEH'],
  ['ye-va-rej-já', 'yeh-vah-rech-CHAH'],
  ['ha-jesh-bón, be-va-ka-shá', 'hah-chesh-BOHN, beh-vah-kah-SHAH'],
  ['a-tsór kán', 'ah-TSOHR KAHN'],
  // Ashkenazi-style soundtext
  ['béis', 'BAYS'],
  ['shá-bos', 'SHAH-bohs'],
  ['ó-lef', 'OH-lef'],
  ['a-doi-nói', 'ah-doy-NOY'],
  ['jéis', 'CHAYS'],
  ['yóid', 'YOYD'],
];

test('15 hand-checked conversions', () => {
  assert.equal(ROWS.length, 15);
  for (const [soundtext, english] of ROWS) assert.equal(respell(soundtext), english, soundtext);
});

test('empty (unvoiced) stays empty; punctuation kept; no-caps option', () => {
  assert.equal(respell(''), '');
  assert.equal(respell('ha-o-lám.'), 'hah-oh-LAHM.');
  assert.equal(respell('a-léf', { caps: false }), 'ah-lef');
});

test('CSV has the five columns, quotes commas, copies confidence', () => {
  const csv = buildCsv([{ id: 'x', he: 'א, ב', soundtext: 'a-léf', confidence: 'high' }]);
  assert.equal(csv, CSV_HEADER + '\nx,"א, ב",a-léf,ah-LEF,high\n');
});
