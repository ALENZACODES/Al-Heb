// Everyday words (אַבָּא, תֵּה, מוֹנִית) are spelled the same in every pronunciation style,
// and the rule never touches a word of the Torah or the prayer texts.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EVERYDAY, isEveryday } from '../src/pronunciation/everyday.js';
import { respell, respellAll } from '../src/pronunciation/forTradition.js';
import { stripTaamim } from '../src/pronunciation/hebrew.js';

test('dad, mom and grandpa read the same in Israeli, Sephardi and Ashkenazi', () => {
  assert.deepEqual(respellAll('אַבָּא'), { israeli: 'aba', sephardi: 'aba', ashkenazi: 'aba', sameIsraeliSephardi: true, differs: false });
  assert.equal(respell('אִמָּא', 'ashkenazi'), 'ima');
  assert.equal(respell('סַבָּא', 'ashkenazi'), 'saba');
  assert.equal(respell('מוֹנִית', 'ashkenazi'), 'monit');
});

test('a prefix does not hide an everyday word', () => {
  assert.equal(respell('וְאַבָּא', 'ashkenazi'), "ve'aba");
  assert.equal(respell('לְכָאן', 'ashkenazi'), 'lekhan');
  assert.equal(respell('לַמִּסְעָדָה', 'ashkenazi'), "lamis'adah");
  assert.equal(isEveryday('שְׁתֵה'), false, 'drink! is not she + tea');
});

test('traditional words keep their Ashkenazi reading', () => {
  assert.equal(respell('שַׁבָּת', 'ashkenazi'), 'shabos');
  assert.equal(respell('שָׁלוֹם', 'ashkenazi'), 'sholom');
  assert.equal(respell('בָּרוּךְ', 'ashkenazi'), 'borukh');
});

test('no everyday word appears in the Torah or prayer texts, with or without a prefix', () => {
  const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'data', 'corpus');
  const found = [];
  const words = new Set();
  const addText = (t) => {
    for (const w of stripTaamim(t).replace(/־/g, ' ').match(/[א-תְ-ׇ]+/gu) || []) words.add(w.normalize('NFC'));
  };
  const walk = (o) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) (typeof v === 'string' && /^(he|hebrew|text|line|pointed)$/.test(k) ? addText(v) : walk(v));
  };
  const visit = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) visit(p);
      else if (e.name.endsWith('.json') && e.name !== 'phrasebook.json') walk(JSON.parse(fs.readFileSync(p, 'utf8')));
    }
  };
  visit(root);
  assert.ok(words.size > 10000, `read the corpus (${words.size} words)`);
  for (const w of words) if (isEveryday(w)) found.push(w);
  assert.deepEqual(found, []);
  assert.ok(EVERYDAY.size >= 20);
});
