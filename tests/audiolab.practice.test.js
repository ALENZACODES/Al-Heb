// Listening Practice (#/listen-practice): line tools (A2 step + speed, A5 compare, A7 readiness), fill the gap (A3), dictation (A4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDocument, flush } from './rimon.fakedom.js';
import { createAudio } from '../src/audio/player.js';
import { ROUTES } from '../src/shell/router.js';
import { SECTION_ROUTES } from '../src/shell/nav-model.js';
import { NAV_EN } from '../src/shell/nav.strings.js';
import { makeRng } from '../src/audiolab/core.js';

const json = (rel) => JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const registry = json('data/corpus/registry.json');
const keyboard = json('data/letters/keyboard-si1452.json');
const doc = createDocument(); globalThis.document = doc;
const { mount, singleLines } = await import('../src/audiolab/practice.view.js');

const row = (kind, id, text = 'א', tradition = 'israeli', extra = {}) => ({ path: `audio/f/${tradition}/${kind}/${id}.mp3`, voice: 'f', tradition, kind, id, text, status: 'tts', source: 'paid-cloud', ...extra });
class El { constructor(u) { this.src = u; } play() { setTimeout(() => this.onended?.(), 1); return Promise.resolve(); } pause() {} }
const settings = () => { const s = { clipRate: 'normal' }; return { get: (k) => s[k], set: (o) => Object.assign(s, o), s }; };
const words = (he) => he.split(/\s+/).filter((w) => /[א-ת]/.test(w));
const allText = (n) => n.textContent;

test('the route is registered, lazy, in the Speak section, with a name', () => {
  const r = ROUTES.find((x) => x.name === 'listen-practice');
  assert.equal(r.pattern, '/listen-practice');
  assert.equal(r.module, '../audiolab/practice.view.js');
  assert.ok(SECTION_ROUTES.speak.includes('listen-practice'));
  assert.equal(NAV_EN['nav.route.listen-practice'], 'Listening Practice');
});

test('Line Tools: the divine name shows as ה׳, words step one by one, no syllable split is invented, three traditions labelled', async () => {
  const line = singleLines(registry).find((l) => l.id === 'bless-priestly-1');
  const ws = words(line.he);
  const manifest = [row('line', line.id), row('line', line.id, 'א', 'ashkenazi', { status: 'plays-israeli' }), ...ws.slice(0, 2).map((w, i) => row('word', `${line.id}-w${i + 1}`))];
  const audio = createAudio({ settings: { voice: 'f', congregation: 'israeli' }, manifest, AudioCtor: El, speech: null, UtteranceCtor: null });
  const root = doc.createElement('div');
  const off = mount(root, { audio, settings: settings(), query: { tab: 'line', line: line.id }, practiceData: { registry } });
  await flush(5);
  const text = allText(root);
  assert.ok(!text.includes('יְהוָה'), 'the name is never spelled out');
  assert.ok(text.includes('ה׳'));
  assert.match(text, /No syllable split exists for this line yet/);
  assert.match(text, /2 of 3 words have audio\. 1 has audio coming\./);
  const cmp = root.querySelectorAll('.al-cmp-play');
  assert.equal(cmp.length, 3);
  const states = root.querySelector('.al-cmp-list').querySelectorAll('li').map((li) => li.getAttribute('data-state'));
  assert.deepEqual(states, ['own', 'israeli', 'israeli'], 'no Sephardi row and an Ashkenazi plays-israeli row: both say they play the Israeli clip');
  assert.match(root.querySelector('.al-cmp-list').textContent, /Plays the Israeli clip \(no Sephardi clip yet\)/);
  const step = root.querySelector('#lp-step');
  step.dispatchEvent({ type: 'click' });
  await flush(10);
  assert.equal(root.querySelectorAll('.al-word')[0].getAttribute('data-on'), '1');
  assert.equal(root.querySelectorAll('[data-rate]').length, 4);
  off();
});

test('Fill The Gap: a line whose word clips all exist; four options; the right one is marked right', async () => {
  const lines = singleLines(registry).filter((l) => words(l.he).length >= 3);
  const manifest = lines.flatMap((l) => [row('line', l.id), ...words(l.he).map((w, i) => row('word', `${l.id}-w${i + 1}`))]);
  const audio = createAudio({ settings: { voice: 'f', congregation: 'israeli' }, manifest, AudioCtor: El, speech: null, UtteranceCtor: null });
  const root = doc.createElement('div');
  const off = mount(root, { audio, settings: settings(), query: { tab: 'gap' }, practiceData: { registry }, rng: makeRng(7) });
  await flush(20);
  const opts = root.querySelector('.al-opts').querySelectorAll('button');
  assert.equal(opts.length, 4);
  assert.ok(root.querySelector('.al-gap'));
  assert.match(allText(root), /played from its word clips/);
  opts.find((b) => b.getAttribute('data-correct') === '1').dispatchEvent({ type: 'click' });
  assert.match(allText(root.querySelector('#lp-gap-out')), /Right\./);
  assert.ok(root.querySelector('#lp-gap-whole'));
  off();
});

test('Fill The Gap with no word clips says so instead of a dead drill', async () => {
  const audio = createAudio({ settings: { voice: 'f', congregation: 'israeli' }, manifest: [], AudioCtor: El, speech: null, UtteranceCtor: null });
  const root = doc.createElement('div');
  mount(root, { audio, settings: settings(), query: { tab: 'gap' }, practiceData: { registry }, rng: makeRng(1) });
  await flush(20);
  assert.ok(root.querySelector('#lp-gap-none'));
  assert.match(allText(root), /Audio coming/);
});

test('Dictation: hear, type on the on-screen Hebrew keyboard, machine-checked against the known letters', async () => {
  const drills = { words: [{ id: 'hw1', he: 'שלום', pointed: 'שָׁלוֹם', en: 'peace' }], lines: [] };
  const audio = createAudio({ settings: { voice: 'f', congregation: 'israeli' }, manifest: [row('word', 'hw1', 'שָׁלוֹם')], AudioCtor: El, speech: null, UtteranceCtor: null });
  const root = doc.createElement('div');
  mount(root, { audio, settings: settings(), query: { tab: 'dictation' }, practiceData: { registry, drills, keyboard }, rng: makeRng(3) });
  await flush(20);
  const keys = root.querySelector('.al-kb').querySelectorAll('button');
  assert.ok(keys.length >= 27, 'letters plus space and delete');
  for (const ch of 'שלום') keys.find((k) => k.textContent === ch).dispatchEvent({ type: 'click' });
  assert.equal(root.querySelector('#lp-dict-input').value, 'שלום');
  root.querySelector('#lp-dict-check').dispatchEvent({ type: 'click' });
  assert.match(allText(root.querySelector('#lp-dict-out')), /Right: every letter matches/);
  assert.match(allText(root), /Checked by machine/);
  assert.ok(!/score|grade[ds]?\b(?! )/i.test(allText(root).replace('it is not a grade', '')), 'no score or grade claims');
});

test('"I do not use audio": Listening Practice says it is for sound and points to written practice; queues and counts are not drawn', async () => {
  const root = doc.createElement('div');
  const quiet = { get: (k) => (k === 'audioFree' ? true : undefined), set() {} };
  mount(root, { audio: null, settings: quiet, query: {}, practiceData: { registry } });
  assert.ok(root.querySelector('#lp-audio-free'));
  assert.equal(root.querySelectorAll('button').length, 0);
  const { mountQueue, readinessNote, traditionCompare } = await import('../src/audiolab/ui.js');
  assert.equal(mountQueue({ settings: quiet }, [{ kind: 'word', id: 'x', label: 'x' }]).node.hasAttribute('hidden'), true);
  assert.equal(readinessNote({ settings: quiet }, []).hasAttribute('hidden'), true);
  assert.equal(traditionCompare({ settings: quiet }, { kind: 'line', id: 'x' }).hasAttribute('hidden'), true);
});
