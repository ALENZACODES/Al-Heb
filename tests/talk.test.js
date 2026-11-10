import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectDirection, hasHebrew, holdsDivineName, hasLatinName, normalizeForCompare,
  pushHistory, resolveBackendUrl, stripNikkud, swapDirection, translationMatchScore,
  wordErrorRate, loadSettings,
} from '../src/talk/talk.model.js';

test('stripNikkud removes vowel points and leaves letters', () => {
  assert.equal(stripNikkud('שָׁלוֹם'), 'שלום');
  assert.equal(stripNikkud('hello'), 'hello');
});

test('detectDirection Auto picks English or Hebrew by script', () => {
  assert.equal(detectDirection('Good morning'), 'en-he');
  assert.equal(detectDirection('בוקר טוב'), 'he-en');
  assert.equal(detectDirection(''), null);
  assert.equal(detectDirection('...'), null);
});

test('swapDirection flips a fixed pair and leaves Auto as Auto', () => {
  assert.equal(swapDirection('en-he'), 'he-en');
  assert.equal(swapDirection('he-en'), 'en-he');
  assert.equal(swapDirection('auto'), 'auto');
});

test('hasHebrew detects Hebrew letters', () => {
  assert.equal(hasHebrew('שלום'), true);
  assert.equal(hasHebrew('hello'), false);
});

test('holds the four-letter Name and Latin spellings; everyday words pass', () => {
  assert.equal(holdsDivineName('יהוה'), true);
  assert.equal(holdsDivineName('ויהוה'), true);
  assert.equal(hasLatinName('the name YHWH appears'), true);
  assert.equal(holdsDivineName('שבת שלום'), false);
  assert.equal(holdsDivineName('Good morning'), false);
});

test('wordErrorRate is 0 on a match and counts substitutions', () => {
  assert.equal(wordErrorRate('Good morning', 'good morning'), 0);
  assert.equal(wordErrorRate('a b c', 'a b c'), 0);
  assert.ok(wordErrorRate('a b c', 'a x c') > 0);
  assert.equal(wordErrorRate('שׁלום לך', 'שלום לך'), 0);
});

test('translationMatchScore ties Google Translate on an exact match after normalize', () => {
  assert.equal(translationMatchScore('How much does this cost?', 'how much does this cost'), 1);
  assert.equal(translationMatchScore('שלום', 'שָׁלוֹם'), 1);
  assert.ok(translationMatchScore('hello there', 'hello') < 1);
});

test('resolveBackendUrl accepts http(s) and rejects empty or odd schemes', () => {
  assert.equal(resolveBackendUrl({ envUrl: 'https://translator.example/api/' }), 'https://translator.example/api');
  assert.equal(resolveBackendUrl({}), '');
  assert.equal(resolveBackendUrl({ envUrl: 'javascript:alert(1)' }), '');
});

test('history keeps the newest first and caps the list', () => {
  const a = { id: '1', ts: 1, direction: 'en-he', source: 'Hi', translation: 'שלום' };
  const b = { id: '2', ts: 2, direction: 'he-en', source: 'שלום', translation: 'Hello' };
  const out = pushHistory([a], b, 2);
  assert.equal(out[0].id, '2');
  assert.equal(out.length, 2);
  const capped = pushHistory(out, { id: '3', ts: 3, direction: 'auto', source: 'x', translation: 'y' }, 2);
  assert.equal(capped.length, 2);
  assert.equal(capped[0].id, '3');
});

test('voice-keep defaults off and only turns on when explicitly saved', () => {
  const d = loadSettings({});
  assert.equal(d.voiceKeep, false);
  assert.equal(loadSettings({ voiceKeep: true }).voiceKeep, true);
  assert.equal(loadSettings({ voiceKeep: 'yes' }).voiceKeep, false);
});
