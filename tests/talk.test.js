import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  detectDirection, hasHebrew, holdsDivineName, hasLatinName, normalizeForCompare,
  pushHistory, stripNikkud, swapDirection, translationMatchScore,
  wordErrorRate, loadSettings, loadHistory, HISTORY_KEY, SETTINGS_KEY,
} from '../src/talk/talk.model.js';
import { canListen, listenOnce, listenError, LISTEN_LANG } from '../src/talk/speech.js';

const read = (rel) => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');

test('stripNikkud removes vowel points and leaves letters', () => {
  assert.equal(stripNikkud('שָׁלוֹם'), 'שלום');
  assert.equal(stripNikkud('hello'), 'hello');
});

test('detectDirection picks English or Hebrew by script', () => {
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
  assert.ok(wordErrorRate('a b c', 'a x c') > 0);
  assert.equal(wordErrorRate('שׁלום לך', 'שלום לך'), 0);
});

test('translationMatchScore is 1 on an exact match after normalizing', () => {
  assert.equal(translationMatchScore('How much does this cost?', 'how much does this cost'), 1);
  assert.equal(translationMatchScore('שלום', 'שָׁלוֹם'), 1);
  assert.ok(translationMatchScore('hello there', 'hello') < 1);
  assert.equal(normalizeForCompare('  Hello,   World! '), 'hello world');
});

test('history keeps the newest first, caps the list and drops broken items', () => {
  const a = { id: '1', ts: 1, direction: 'en-he', source: 'Hi', translation: 'שלום' };
  const b = { id: '2', ts: 2, direction: 'en-he', source: 'Bye', translation: 'להתראות' };
  assert.deepEqual(pushHistory([a], b).map((x) => x.id), ['2', '1']);
  assert.equal(pushHistory([a, b], { ...a, id: '3' }, 2).length, 2);
  assert.deepEqual(loadHistory([a, null, { id: 5 }, 'x']), [a]);
  assert.deepEqual(loadHistory('nope'), []);
});

test('settings default to reading aloud, both "I" forms, and nothing else on', () => {
  const s = loadSettings(undefined);
  assert.deepEqual(s, { direction: 'auto', faceToFace: false, nikkud: false, autoSpeak: true, speaker: '' });
  assert.equal(loadSettings({ speaker: 'f', direction: 'he-en' }).speaker, 'f');
  assert.equal(loadSettings({ speaker: 'x' }).speaker, '');
  assert.equal('voiceKeep' in s, false, 'keeping the speaker’s own voice is not a setting yet');
});

test('store keys are plain app-store keys', () => {
  assert.equal(HISTORY_KEY, 'talk.history');
  assert.equal(SETTINGS_KEY, 'talk.settings');
});

test('listening: no recognition in the browser means no listening, never a crash', () => {
  assert.equal(canListen({}), false);
  assert.equal(listenOnce({ direction: 'en-he', onFinal() {}, win: {} }), null);
  assert.equal(LISTEN_LANG['he-en'], 'he-IL');
  assert.match(listenError('not-allowed'), /type instead/);
  assert.match(listenError('language-not-supported'), /type instead/);
  assert.equal(listenError('aborted'), '');
});

test('listening: one utterance is delivered once, partial text is shown on the way', () => {
  let made = null;
  class Fake { constructor() { made = this; } start() { this.started = true; } stop() { this.onend(); } }
  const partials = []; const finals = []; let ended = 0;
  const l = listenOnce({ direction: 'he-en', win: { SpeechRecognition: Fake }, onPartial: (t) => partials.push(t), onFinal: (t) => finals.push(t), onEnd: () => { ended += 1; } });
  assert.ok(l && made.started);
  assert.equal(made.lang, 'he-IL');
  assert.equal(made.continuous, false);
  made.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'שלום' }], { isFinal: false })] });
  made.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'שלום לך' }], { isFinal: true })] });
  l.stop(); made.onend();
  assert.deepEqual(partials, ['שלום', 'שלום לך']);
  assert.deepEqual(finals, ['שלום לך']);
  assert.equal(ended, 1);
});

test('the Talk code calls no server and names no outside service', () => {
  for (const f of ['src/talk/talk.view.js', 'src/talk/talk.model.js', 'src/talk/engine.js', 'src/talk/data.js', 'src/talk/speech.js']) {
    const src = read(f);
    assert.doesNotMatch(src, /\bfetch\s*\(/, `${f} must not fetch (data comes through the shared JSON loader)`);
    assert.doesNotMatch(src, /https?:\/\//, `${f} must not hold a web address`);
    assert.doesNotMatch(src, /XMLHttpRequest|WebSocket|sendBeacon|MediaRecorder|getUserMedia/, `${f} must not open a connection or record sound`);
    assert.doesNotMatch(src, /localStorage|sessionStorage|indexedDB/, `${f} must store through the app store only`);
    assert.doesNotMatch(src, /gemini|vertex|openai|chatgpt|\bAI\b|google/i, `${f} must not name an outside tool`);
  }
});

test('the screen copy says what is true: device voice, browser listening, no own-voice claim', async () => {
  const v = await import('../src/talk/talk.view.js');
  assert.match(v.LISTEN_NOTE, /browser/);
  assert.match(v.LISTEN_NOTE, /Aleph sends nothing/);
  assert.match(v.DEVICE_VOICE, /device voice/);
  assert.match(v.VOICE_KEEP, /future feature/);
  assert.match(v.HELD_LINE, /does not speak it/);
  assert.deepEqual(Object.keys(v.METHOD_LABEL).sort(), ['close', 'model', 'pattern', 'phrase', 'word', 'words']);
});
