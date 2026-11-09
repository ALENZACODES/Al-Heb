import test from 'node:test';
import assert from 'node:assert/strict';
import { voiceHelpSteps, installVoiceHelp } from '../src/shell/voice-help.js';

test('voice help: steps per desktop system', () => {
  assert.match(voiceHelpSteps('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0')[0], /Microsoft Edge/);
  assert.match(voiceHelpSteps('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Safari/605')[0], /Carmit/);
});

test('voice help: shows once when Hebrew is spoken with no Hebrew voice, speech still goes through', () => {
  const spoken = []; const shown = [];
  const doc = { body: { append: (n) => shown.push(n) }, getElementById: () => null, createElement: () => ({ style: {}, setAttribute() {}, append() {}, addEventListener() {} }) };
  const win = { document: doc, localStorage: { getItem: () => null }, navigator: { userAgent: 'Windows Chrome' }, SpeechSynthesisUtterance: function () {},
    speechSynthesis: { getVoices: () => [{ lang: 'en-US' }], speak: (u) => spoken.push(u) } };
  assert.equal(installVoiceHelp(win), true);
  win.speechSynthesis.speak({ lang: 'he-IL', text: 'שלום' });
  win.speechSynthesis.speak({ lang: 'he-IL', text: 'תודה' });
  assert.equal(spoken.length, 2); assert.equal(shown.length, 1);
  const win2 = { ...win, speechSynthesis: { getVoices: () => [{ lang: 'he-IL' }], speak: () => {} } }; const before = shown.length;
  installVoiceHelp(win2); win2.speechSynthesis.speak({ lang: 'he-IL', text: 'שלום' });
  assert.equal(shown.length, before);
});
