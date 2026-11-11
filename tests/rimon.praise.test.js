import test from 'node:test';
import assert from 'node:assert/strict';
import { PRAISE, praiseLine, formFor } from '../src/shell/rimon-praise.js';
import { createSpeechSchedule, MESSAGES } from '../src/shell/rimon-speech.js';

test('Rimon praise: 12 lines in three groups, each fully pointed in all three forms, with pronunciation', () => {
  assert.deepEqual(Object.keys(PRAISE), ['praise', 'encourage', 'nudge']);
  assert.equal(Object.values(PRAISE).flat().length, 12);
  for (const l of Object.values(PRAISE).flat()) {
    for (const k of ['m', 'f', 'pl']) {
      assert.match(l.he[k], /[א-ת]/); assert.match(l.he[k], /[ְ-ּ]/, `${l.en} ${k} is pointed`);
      assert.ok(l.say[k].length > 3);
    }
  }
});

test('Rimon praise: the learner form is used, and nothing falls back to masculine when gender is unset or both', () => {
  assert.equal(formFor('m'), 'm'); assert.equal(formFor('f'), 'f');
  assert.equal(formFor(null), 'pl'); assert.equal(formFor('both'), 'pl'); assert.equal(formFor(undefined), 'pl');
  assert.equal(praiseLine('encourage', 2, 'f').he, 'אַתְּ יְכוֹלָה!');
  assert.equal(praiseLine('encourage', 2, 'm').he, 'אַתָּה יָכוֹל!');
  assert.equal(praiseLine('encourage', 2, null).he, 'אַתֶּם יְכוֹלִים!');
  for (const l of Object.values(PRAISE).flat()) assert.doesNotMatch(l.he.pl, /אַתָּה|אַתְּ /, 'plural form has no singular you');
});

test('Rimon schedule with praise: alternates his lines with praise and encouragement; nudges after a sad face', () => {
  const praise = (g, n) => praiseLine(g, n, 'f');
  const s = createSpeechSchedule({ praise }); s.tick(0);
  const said = [];
  for (let t = 300000; t <= 1200000; t += 300000) { s.activity(t); said.push(s.tick(t)); }
  assert.equal(said[0], MESSAGES.keep);
  assert.equal(said[1].en, PRAISE.praise[0].en);
  assert.equal(said[2], MESSAGES.great);
  assert.equal(said[3].en, PRAISE.encourage[0].en);
  s.reaction('sad'); s.activity(1500000);
  assert.equal(s.tick(1500000).en, PRAISE.nudge[0].en);
});
