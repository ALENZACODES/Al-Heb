import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAudio, hebrewSynthesisVoice } from '../src/audio/player.js';
import { speak, speechFallbackMessage } from '../src/games/engine.js';
import * as prefix from '../src/games/prefixblast.view.js';
import { Doc, El } from './wordtrace.fakedom.js';

class FakeAudio {
  static fail = false;
  constructor(url) { this.url = url; }
  play() {
    queueMicrotask(() => (FakeAudio.fail ? this.onerror?.() : this.onended?.()));
    return FakeAudio.reject ? Promise.reject(new Error('network')) : Promise.resolve();
  }
  pause() {}
}
class Utt { constructor(t) { this.text = t; } }
function speech(voices) {
  const s = { spoken: [], getVoices: () => voices, speak(u) { s.spoken.push(u); queueMicrotask(() => u.onend?.()); }, cancel() {} };
  return s;
}
const row = (status = 'recorded') => ({ path: 'audio/m/israeli/letter/bet.mp3', voice: 'm', tradition: 'israeli', kind: 'letter', id: 'bet', text: 'ב', status, source: 'x' });

test('an empty voice list and a Dutch list are not Hebrew', () => {
  assert.equal(hebrewSynthesisVoice({ getVoices: () => [] }), null);
  assert.equal(hebrewSynthesisVoice({ getVoices: () => [{ lang: 'nl-NL' }, { lang: 'en-US' }, { lang: 'ar' }] }), null);
  assert.equal(hebrewSynthesisVoice({ getVoices: () => [{ lang: 'nl-NL' }, { lang: 'he-IL' }] }).lang, 'he-IL');
});

test('a 404 clip and a rejected network play never call a non-Hebrew voice', async () => {
  for (const voices of [[], [{ lang: 'nl-NL' }, { lang: 'en-GB' }]]) {
    FakeAudio.fail = true; FakeAudio.reject = false;
    const synth = speech(voices);
    const audio = createAudio({ settings: { voice: 'm', congregation: 'israeli' }, manifest: [row()], AudioCtor: FakeAudio, speech: synth, UtteranceCtor: Utt });
    const heard = await speak({ audio }, 'ב', { kind: 'letter', id: 'bet' });
    assert.equal(heard.spoken, false);
    assert.equal(synth.spoken.length, 0);
    assert.match(heard.message, /will not speak another language|could not be reached/);
  }
  FakeAudio.fail = false; FakeAudio.reject = true;
  const synth = speech([{ lang: 'ar' }]);
  const audio = createAudio({ settings: { voice: 'm', congregation: 'israeli' }, manifest: [row()], AudioCtor: FakeAudio, speech: synth, UtteranceCtor: Utt });
  const heard = await speak({ audio }, 'ב', { kind: 'letter', id: 'bet' });
  assert.equal(heard.source === 'file' && heard.ok === false || heard.spoken === false || synth.spoken.length === 0, true);
  assert.equal(synth.spoken.length, 0);
});

test('a Hebrew device voice is used only after the clip fails, and the words stay usable without one', async () => {
  FakeAudio.fail = true; FakeAudio.reject = false;
  const synth = speech([{ lang: 'he-IL', name: 'Hebrew' }, { lang: 'nl-NL' }]);
  const audio = createAudio({ settings: { voice: 'm', congregation: 'israeli' }, manifest: [row()], AudioCtor: FakeAudio, speech: synth, UtteranceCtor: Utt });
  const heard = await speak({ audio }, 'ב', { kind: 'letter', id: 'bet' });
  assert.equal(heard.source, 'tts-fallback');
  assert.equal(synth.spoken.length, 1);
  assert.equal(synth.spoken[0].voice.lang, 'he-IL');
  const notes = [];
  const silent = await speak({ audio: { play: async () => { throw new Error('offline'); } } }, 'ב', { kind: 'letter', id: 'bet', onStatus: (m) => notes.push(m) });
  assert.equal(silent.spoken, false);
  assert.match(notes[0], /Nothing was spoken in another language/);
  const plain = await speak({}, 'הַבַּיִת');
  assert.equal(plain.spoken, false);
  assert.match(speechFallbackMessage(plain), /words stay on screen/);
});

test('prefix blast stays playable when the phrase has no clip and no Hebrew voice', async () => {
  const doc = new Doc(); globalThis.document = doc;
  El.prototype.append = function (...nodes) { for (const n of nodes) this.appendChild(typeof n === 'object' ? n : doc.createTextNode(String(n))); };
  El.prototype.replaceChildren = function (...nodes) { this.textContent = ''; this.append(...nodes); };
  Object.defineProperty(El.prototype, 'isConnected', { configurable: true, get: () => true });
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  const root = doc.createElement('main');
  const stops = [];
  const audio = { play: async () => { throw new Error('should not play a guessed phrase'); }, stop() { stops.push('stop'); } };
  const stop = prefix.mount(root, { images: { resolve: () => null }, audio });
  for (let n = 0; n < 200 && !root.querySelector('.prefix-bubble'); n++) await new Promise((r) => setTimeout(r, 5));
  assert.ok(root.querySelector('.prefix-bubble'));
  const bubbles = [...root.querySelectorAll('.prefix-bubble')];
  for (const b of bubbles) b.click();
  await new Promise((r) => setTimeout(r, 30));
  assert.match(root.querySelector('[data-speech=prefix]').textContent, /words stay on screen/);
  assert.ok(root.querySelector('.prefix-bubble') || root.querySelector('.game-results'));
  stop();
  assert.deepEqual(stops, ['stop']);
  assert.equal(readFileSync(new URL('../src/games/engine.js', import.meta.url), 'utf8').includes('clip-index.js'), false);
});
