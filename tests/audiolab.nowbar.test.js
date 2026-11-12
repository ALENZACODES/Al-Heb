// A1: one playback bar on every route (src/audiolab/nowbar.js), wired at boot by src/app.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDocument } from './rimon.fakedom.js';
import { installNowBar, barLine } from '../src/audiolab/nowbar.js';

function fakeAudio() {
  const subs = new Set(); let now = null, rate = null, stopped = 0;
  return {
    onPlay(f) { subs.add(f); return () => subs.delete(f); },
    emit(ev) { for (const f of subs) f(ev); },
    nowPlaying: () => now, set now(v) { now = v; },
    setClipRate(v) { rate = v; return v; }, get rate() { return rate; },
    stop() { stopped++; }, get stopped() { return stopped; },
  };
}
const settingsStore = () => { const s = { clipRate: 'normal' }; return { get: (k) => s[k], set: (o) => Object.assign(s, o), s }; };

test('barLine wording', () => {
  assert.equal(barLine('loading', 'shalom'), 'Loading: shalom');
  assert.equal(barLine('playing', 'shalom'), 'Playing: shalom');
  assert.equal(barLine('paused', ''), 'Paused');
});

test('the bar shows what plays, its progress, pause, speed and stop, then hides when the sound ends', async () => {
  const doc = createDocument(); const win = { setInterval: () => 1, clearInterval: () => {} };
  const audio = fakeAudio(); const settings = settingsStore();
  const api = installNowBar({ audio, settings, doc, win });
  assert.ok(api && api.bar.hidden, 'hidden until something plays');
  assert.equal(installNowBar({ audio, settings, doc, win }), api, 'installed once');

  audio.emit({ phase: 'start', token: 1, what: 'Kamatz' });
  assert.equal(api.bar.hidden, false);
  assert.match(api.bar.querySelector('.nb-what').textContent, /Loading: Kamatz/);
  assert.ok(doc.body.classList.contains('alef-nowbar-on'), 'the small status pill steps aside visually');

  const media = { currentTime: 1, duration: 4, paused: false, pause() { this.paused = true; }, play() { this.paused = false; return Promise.resolve(); } };
  audio.now = { kind: 'file', media };
  audio.emit({ phase: 'playing', token: 1 });
  assert.match(api.bar.querySelector('.nb-what').textContent, /Playing: Kamatz/);
  assert.equal(api.bar.querySelector('.nb-time').textContent, '0:01 / 0:04');

  api.bar.querySelector('.nb-pause').dispatchEvent({ type: 'click' });
  assert.equal(media.paused, true);
  assert.match(api.bar.querySelector('.nb-what').textContent, /Paused/);
  api.bar.querySelector('.nb-pause').dispatchEvent({ type: 'click' });
  assert.equal(media.paused, false);

  const slow = api.bar.querySelector('[data-rate=slow-0.6]');
  api.bar.querySelector('.nb-speed').dispatchEvent({ type: 'click', target: slow });
  assert.equal(settings.s.clipRate, 'slow-0.6');
  assert.equal(audio.rate, 'slow-0.6', 'the playing clip changes speed');
  assert.equal(slow.getAttribute('aria-pressed'), 'true');

  api.bar.querySelector('.nb-stop').dispatchEvent({ type: 'click' });
  assert.equal(audio.stopped, 1);
  assert.equal(api.bar.hidden, true);

  audio.emit({ phase: 'start', token: 2, what: 'x' });
  audio.emit({ phase: 'finished', token: 2 });
  await new Promise((r) => setTimeout(r, 700));
  assert.equal(api.bar.hidden, true, 'hides after the sound finishes');
});

test('page <audio> elements (books) show in the bar; music never does', () => {
  const doc = createDocument(); const win = { setInterval: () => 1, clearInterval: () => {} };
  const api = installNowBar({ audio: null, settings: settingsStore(), doc, win });
  const music = { src: 'audio/music/bed.mp3', currentTime: 0, duration: 5, pause() {}, dataset: {} };
  doc.dispatchEvent({ type: 'playing', target: music });
  assert.equal(api.bar.hidden, true);
  const page = { src: 'audio/f/israeli/book/book1-p01.mp3', currentTime: 0, duration: 5, pause() {}, dataset: {}, getAttribute: () => 'Page 1' };
  doc.dispatchEvent({ type: 'playing', target: page });
  assert.equal(api.bar.hidden, false);
  assert.match(api.bar.querySelector('.nb-what').textContent, /Playing: Page 1/);
});

test('boot wires the bar after first paint, and the bar code stays out of the first install', async () => {
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /import\('\.\/audiolab\/nowbar\.js'\)\.then\(\(m\) => m\.installNowBar\(\{ audio, settings \}\)\)/);
  const { computeManifest } = await import('../tools/build-precache.mjs');
  const m = computeManifest(new URL('..', import.meta.url).pathname);
  assert.ok(!m.files.some((f) => f.startsWith('src/audiolab/')), 'src/audiolab/ is on demand');
  assert.ok(m.onDemand.includes('src/audiolab/nowbar.js'));
});
