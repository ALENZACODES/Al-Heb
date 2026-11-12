// Speaking Studio (#/speak-studio, CODER-100 G1 G2 G3 G5 G6 G8 G9 G10): model rules and the page in a fake DOM with a fake recorder,
// recognizer, decoder and journal (view logic, not browser audio or microphone behaviour).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { N, memStore } from './torahread.fakedom.js';
import { waitFor } from './helpers/waitfor.js';
import * as V from '../src/voice/voice.model.js';
import { memoryJournal, openJournal } from '../src/voice/journal.js';
import { matchRoute } from '../src/shell/router.js';

const { mount } = await import('../src/voice/voice.view.js');
const NAME = /י[֑-ׇ]*ה[֑-ׇ]*ו[֑-ׇ]*ה/;
const T0 = new Date(2026, 10, 12, 10, 0).getTime(); // Thursday 12 Nov 2026, local time
const DAY = 86400000;

test('G3: ratings are kept per axis, 1-3 only; by-week averages; nothing without a rating', () => {
  let s = V.normalizeState(null);
  s = V.addRating(s, 'shema-1', T0, { vowels: 2, stress: 3, fluency: 9 });
  assert.deepEqual(s.ratings[0], { line: 'shema-1', at: T0, vowels: 2, stress: 3, fluency: null });
  assert.equal(V.addRating(s, 'x', T0, {}).ratings.length, 1, 'an empty rating is not saved');
  s = V.addRating(s, 'hamotzi', T0 + DAY, { vowels: 1 });
  const wk = V.ratingsByWeek(s);
  assert.equal(wk.length, 1); assert.equal(wk[0].week, '2026-11-09'); assert.equal(wk[0].vowels, 1.5); assert.equal(wk[0].stress, 3);
  assert.match(V.SELF_LABEL, /Self-assessment/);
});

test('G6: the gym picks lines from the learner\'s own ratings, weakest axis first, leaves out all-3 lines', () => {
  assert.deepEqual(V.gymSet(V.normalizeState(null), [{ key: 'a' }]), []);
  let s = V.normalizeState(null);
  s = V.addRating(s, 'a', T0, { vowels: 3, stress: 1, fluency: 3 });
  s = V.addRating(s, 'b', T0, { vowels: 3, stress: 2, fluency: 3 });
  s = V.addRating(s, 'c', T0, { vowels: 3, stress: 3, fluency: 3 });
  assert.equal(V.weakestAxis(s).id, 'stress');
  const g = V.gymSet(s, [{ key: 'c' }, { key: 'b' }, { key: 'a' }, { key: 'z' }]);
  assert.deepEqual(g.map((x) => x.key), ['a', 'b']);
  assert.match(g[0].why, /Stress: you rated it 1/);
});

test('G2: the silent turn is the clip length times the gap, within bounds', () => {
  assert.equal(V.turnMs(2000, 1.5), 3000);
  assert.equal(V.turnMs(200, 1), V.MIN_TURN_MS);
  assert.equal(V.turnMs(60000, 2), V.MAX_TURN_MS);
  assert.equal(V.turnMs(2000, 7), 2000, 'unknown factor: 1x');
});

test('G1: waveform peaks are scaled maxima; silence stays flat', () => {
  const p = V.peaks(Float32Array.from([0, 0.5, -1, 0.25]), 2);
  assert.deepEqual(p, [0.5, 1]);
  assert.deepEqual(V.peaks(new Float32Array(10), 5), [0, 0, 0, 0, 0]);
  assert.equal(V.peaks(null, 3).length, 3);
});

test('G5: the machine sentence is a guess, never a verdict', () => {
  assert.equal(V.machineSentence('שמע ישראל', 'שמע ישראל'), 'The machine heard: שמע ישראל. The line is: שמע ישראל. A machine guess, not a grade.');
  assert.doesNotMatch(V.machineSentence('x', 'y') + V.MACHINE_NOTE, /score|correct|right|wrong/i);
});

test('G8: fluency by week is median words per minute and self-reported stumbles per 100 words, not accuracy', () => {
  const reads = [{ at: T0, words: 10, ms: 10000, stumbled: 1 }, { at: T0 + DAY, words: 10, ms: 5000, stumbled: 0 }, { at: T0 + 7 * DAY, words: 20, ms: 60000, stumbled: 2 }];
  const w = V.fluencyByWeek(reads);
  assert.deepEqual(w.map((x) => x.week), ['2026-11-09', '2026-11-16']);
  assert.equal(w[0].wpm, 90); assert.equal(w[0].stumblesPer100, 5); assert.equal(w[1].wpm, 20);
  assert.match(V.FLUENCY_NOTE, /not pronunciation accuracy/);
});

test('G9: speaking days from the studio and from Say it recordings; streak tolerates no take yet today; weekly goal', () => {
  let s = V.addRecordingDay(V.normalizeState(null), V.dayKey(T0 - DAY));
  s = V.addRecordingDay(s, V.dayKey(T0 - 2 * DAY));
  const days = V.speakingDays(s, [{ mode: 'record', at: T0 - 3 * DAY }, { mode: 'asr', at: T0 - 4 * DAY }]);
  assert.equal(V.speakingStreak(days, V.dayKey(T0)), 3);
  days.add(V.dayKey(T0));
  assert.equal(V.speakingStreak(days, V.dayKey(T0)), 4);
  const g = V.weekGoal(days, V.dayKey(T0), 3);
  assert.equal(g.days, 4); assert.equal(g.done, true);
  assert.equal(V.setGoal(s, 9).goal, V.DEFAULT_GOAL);
});

test('G10: journal series is oldest first with week numbers; passages most recent first; memory and no-IndexedDB journals', async () => {
  const e = [{ id: 2, line: 'a', at: T0 + 8 * DAY }, { id: 1, line: 'a', at: T0 }, { id: 3, line: 'b', at: T0 + DAY }];
  assert.deepEqual(V.journalSeries(e, 'a').map((x) => [x.id, x.week]), [[1, 1], [2, 2]]);
  assert.deepEqual(V.journalPassages(e).map((p) => [p.line, p.takes]), [['a', 2], ['b', 1]]);
  const j = memoryJournal();
  assert.equal((await j.add({ line: 'a', at: T0, blob: { type: 'audio/webm' } })).ok, true);
  assert.equal((await j.list()).length, 1);
  const none = openJournal({ indexedDB: null });
  assert.equal(none.supported, false); assert.deepEqual(await none.list(), []);
});

// ---------- the page ----------
const fakeRecorder = () => ({ supported: true, start: async () => ({ ok: true }), stop: async () => ({ ok: true, url: 'blob:mine', ms: 2400, blob: { type: 'audio/webm' } }), dispose() {} });
const fakeRecognizer = (alts) => ({ supported: true, listen: async () => ({ ok: !!alts.length, alternatives: alts, error: alts.length ? undefined : 'no-speech' }), stop() {} });
const fileAudio = (played = []) => ({ played, status: (k, id) => ({ source: 'file', url: `audio/${k}/${id}.mp3` }), play: async (...a) => { played.push(a); return { ok: true }; }, stop() {} });
const mk = (o = {}) => {
  const root = new N('div'); const store = memStore();
  for (const [k, v] of Object.entries(o.init || {})) store.set(k, v);
  const timers = [];
  const voiceStudio = { recorder: o.recorder ?? fakeRecorder(), recognizer: o.recognizer ?? fakeRecognizer(['שמע ישראל']), journal: o.journal ?? memoryJournal(),
    decode: async (src) => (src ? Float32Array.from([0, 0.5, 1, 0.25]) : null), makeAudio: () => ({ play: async () => {}, pause() {} }),
    setTimeout: (f, ms) => { timers.push(ms); f(); return 1; }, clearTimeout() {}, clock: () => T0 };
  return { root, store, timers, ctx: { store, settings: { get: (k) => ({ congregation: 'sephardi' })[k] }, audio: o.audio ?? fileAudio(), query: o.query || {}, voiceStudio } };
};

test('page: route; record, waveforms side by side, self-rating saved, machine guess labelled, journal keep', async () => {
  assert.equal(matchRoute('#/speak-studio').route.name, 'speak-studio');
  const { root, ctx, store } = mk({ query: { order: 'shabbat-morning' } });
  const un = await mount(root, ctx);
  await waitFor(() => root.querySelector('#vs-rec'));
  assert.doesNotMatch(root.textContent, NAME);
  await root.querySelector('#vs-rec').click();
  assert.equal(root.querySelector('#vs-rec').attrs['aria-pressed'], 'true');
  await root.querySelector('#vs-rec').click();
  await waitFor(() => root.queryAll('[data-wave]').length === 2);
  assert.deepEqual(root.queryAll('[data-wave]').map((n) => n.attrs['data-wave']), ['Model clip', 'Your recording']);
  assert.equal(Object.values(store.m['voice.v1'].days)[0], 1, 'a speaking day is counted');
  assert.match(root.textContent, /Self-assessment: your own rating, not a score/);
  assert.ok(root.querySelector('#vs-save-rating').attrs.disabled !== undefined);
  await root.querySelector('[data-rate="vowels:2"]').click();
  await root.querySelector('[data-rate="stress:1"]').click();
  await root.querySelector('#vs-save-rating').click();
  assert.deepEqual(store.m['voice.v1'].ratings[0], { line: 'mah-tovu-1', at: T0, vowels: 2, stress: 1, fluency: null });
  await root.querySelector('#vs-keep').click();
  assert.equal((await ctx.voiceStudio.journal.list()).length, 1);
  await root.querySelector('#vs-machine').click();
  const out = root.querySelector('[data-machine]').textContent;
  assert.match(out, /^The machine heard: שמע ישראל\. The line is: .+\. A machine guess, not a grade\.$/);
  assert.doesNotMatch(root.textContent, /\bscore[sd]? (of|is)\b|\bgrade[sd]?:/i);
  un();
});

test('page: no recognizer means no machine check and nothing sent elsewhere; no recorder says so', async () => {
  const { root, ctx } = mk({ recognizer: { supported: false, listen: async () => ({ ok: false }) }, recorder: { supported: false } });
  await mount(root, ctx);
  await waitFor(() => root.querySelector('[data-machine-none]'));
  assert.match(root.textContent, /no speech recognizer, so there is no machine guess/);
  assert.match(root.textContent, /cannot record from the microphone/);
});

test('page: shadowing plays the model, waits a turn of clip length x gap, then plays the model again', async () => {
  const played = [];
  const { root, ctx, timers } = mk({ audio: fileAudio(played), query: { tab: 'shadow' } });
  let t = T0; ctx.voiceStudio.clock = () => (t += 1000); // each clock read is one second later: the model "lasts" one second
  await mount(root, ctx);
  await waitFor(() => root.querySelector('#vs-shadow-go'));
  await root.querySelector('[data-gap="2"]').click();
  await root.querySelector('[data-rounds="1"]').click();
  await root.querySelector('#vs-shadow-go').click();
  await waitFor(() => played.length === 2 && root.querySelector('#vs-shadow-go'));
  assert.deepEqual(timers, [2000]);
  assert.equal(played[0][1], 'candle-shabbat');
});

test('page: gym, fluency, speaking days and journal tabs', async () => {
  const j = memoryJournal();
  await j.add({ line: 'shema-1', title: 'The Shema (line 1)', at: T0 - 8 * DAY, ms: 2000, blob: { type: 'audio/webm' } });
  await j.add({ line: 'shema-1', title: 'The Shema (line 1)', at: T0, ms: 1800, blob: { type: 'audio/webm' } });
  const init = {
    'voice.v1': { v: 1, ratings: [{ line: 'shema-1', at: T0, vowels: 3, stress: 3, fluency: 1 }], days: { [V.dayKey(T0)]: 1 }, goal: 2 },
    'timedread.v1': { v: 1, reads: [{ textId: 'shema-1', words: 6, ms: 6000, stumbled: 1, at: T0 }] },
  };
  const { root, ctx, store } = mk({ init, journal: j, query: { tab: 'gym' } });
  await mount(root, ctx);
  await waitFor(() => root.querySelector('[data-weak]'));
  assert.equal(root.querySelector('[data-weak]').attrs['data-weak'], 'fluency');
  assert.ok(root.querySelector('[data-gym="shema-1"]'));
  await root.querySelector('#vs-tab-fluency').click();
  assert.match(root.textContent, /not pronunciation accuracy/);
  assert.ok(root.querySelector('[data-week="2026-11-09"]'));
  await root.querySelector('#vs-tab-streak').click();
  assert.equal(root.querySelector('[data-speak-streak]').attrs['data-speak-streak'], '1');
  assert.equal(root.querySelector('[data-week-goal]').attrs['data-week-goal'], '1/2');
  await root.querySelector('[data-goal="5"]').click();
  assert.equal(store.m['voice.v1'].goal, 5);
  await root.querySelector('#vs-tab-journal').click();
  await waitFor(() => root.queryAll('[data-take]').length === 2);
  assert.match(root.querySelector('.vs-journal').textContent, /week 1.*week 2/);
  await root.querySelector('[data-delete="1"]').click();
  await waitFor(() => root.queryAll('[data-take]').length === 1);
});

test('files: no pointed Hebrew typed in, no four-letter name, no network but the app\'s own clip files', () => {
  for (const f of ['src/voice/voice.model.js', 'src/voice/voice.view.js', 'src/voice/journal.js']) {
    const s = readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    assert.doesNotMatch(s.replace(/\/\/.*$/gm, ''), /[ְ-ּ]/, f);
    assert.doesNotMatch(s, NAME, f);
    assert.doesNotMatch(s, /https?:\/\/(?!www\.w3\.org\/2000\/svg)/, `${f}: no outside URL`);
  }
});
