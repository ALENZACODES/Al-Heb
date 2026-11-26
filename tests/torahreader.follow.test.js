// The reading follower: estimated word timing (word-timing.js) and the finger guide following a playing verse clip.
import test from 'node:test';
import assert from 'node:assert/strict';
import { N } from './torahread.fakedom.js';
import { verseWords, wordWeight, estimateWordTimes, verseTimes, wordAt, wordAtChar } from '../src/torahreader/word-timing.js';
import { createFingerGuide, preloadTiming } from '../src/torahreader/finger-follow.js';
await preloadTiming();

function fakeClock() {
  const timers = new Map(); let id = 0;
  return { setInterval: (f, ms) => { timers.set(++id, { f, ms }); return id; }, clearInterval: (h) => { timers.delete(h); }, timers, fire: () => { for (const t of [...timers.values()]) t.f(); } };
}
const GEN_1_1 = 'בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃';

test('word weights grow with vowels; unpointed words fall back to letters', () => {
  assert.equal(verseWords('בְּרֵאשִׁית ׀ בָּרָא ׃').length, 2);
  assert.ok(wordWeight('הַשָּׁמַיִם') > wordWeight('אֵת'));
  assert.ok(wordWeight('שלום') >= 1);
  assert.equal(wordWeight('׃'), 0);
});

test('estimated times are ordered, inside the clip, and leave a pause after a pausing accent', () => {
  const w = verseWords(GEN_1_1); const t = estimateWordTimes(w);
  assert.equal(t.length, 7);
  for (let i = 0; i < t.length; i++) {
    assert.ok(t[i].start >= 0 && t[i].end <= 1 && t[i].end > t[i].start);
    if (i) assert.ok(t[i].start >= t[i - 1].end - 1e-9);
  }
  // אֱלֹהִ֑ים carries etnahta: a gap follows it; בָּרָ֣א (munah, conjunctive) runs straight on.
  assert.ok(t[3].start - t[2].end > 0.01);
  assert.ok(Math.abs(t[2].start - t[1].end) < 1e-9);
});

test('aligned times win over the estimate only when they fit the words', () => {
  const w = verseWords(GEN_1_1);
  const aligned = w.map((_, i) => [i * 100, i * 100 + 90]);
  assert.deepEqual(verseTimes(w, 5000, aligned), { times: aligned.map(([s, e]) => ({ start: s, end: e })), estimated: false });
  assert.equal(verseTimes(w, 5000, aligned.slice(1)).estimated, true);
  assert.deepEqual(verseTimes(w, null), { times: [], estimated: true });
});

test('wordAt and wordAtChar', () => {
  const times = [{ start: 0, end: 100 }, { start: 150, end: 300 }, { start: 300, end: 500 }];
  assert.deepEqual([wordAt(times, -5), wordAt(times, 50), wordAt(times, 120), wordAt(times, 300), wordAt(times, 9999)], [0, 0, 0, 2, 2]);
  assert.equal(wordAt([], 10), -1);
  assert.deepEqual([0, 4, 6].map((c) => wordAtChar('אחת שתיים שלוש', c)), [0, 1, 1]);
});

async function guideWithVerses(clock, calm = false) {
  const guide = createFingerGuide({ clock, calm: () => calm });
  await guide.controls().querySelector('.trd-finger-toggle').click();
  guide.begin('fixture');
  const box = new N('div');
  const p1 = new N('p'); p1.append(...guide.text('אַחַת שְׁתַּיִם', 1));
  const p2 = new N('p'); p2.append(...guide.text(GEN_1_1, 2));
  box.append(p1, p2); guide.bind(box);
  return { guide, box, words: () => box.queryAll('.trd-finger-word') };
}

test('the guide follows a playing file clip from its playback position, and stops when it ends', async () => {
  const clock = fakeClock(); const { guide, words } = await guideWithVerses(clock);
  let now = { ms: 0, durMs: 7000 };
  const on = guide.followVerse(2);
  on({ type: 'playing', clock: () => now });
  const ws = words();
  assert.equal(ws[2].attrs['aria-current'], 'true', 'starts on the verse\'s first word');
  assert.equal(clock.timers.size, 1);
  now = { ms: 6800, durMs: 7000 }; clock.fire();
  assert.equal(ws[8].attrs['aria-current'], 'true', 'near the end: last word of verse 2');
  now = { ms: 3500, durMs: 7000 }; clock.fire();
  const mid = ws.findIndex((w) => w.attrs['aria-current'] === 'true');
  assert.ok(mid > 2 && mid < 8, 'mid-clip lands mid-verse');
  assert.match(guide.controls().querySelector('.trd-finger-position').textContent, /following the recording \(estimated word timing\)/);
  on({ type: 'ended' });
  assert.equal(clock.timers.size, 0);
});

test('device-voice word boundaries move the guide with no estimate; a touch takes over', async () => {
  const clock = fakeClock(); const { guide, box, words } = await guideWithVerses(clock);
  const on = guide.followVerse(1);
  on({ type: 'playing', spoken: 'אחת שתיים' });
  on({ type: 'boundary', charIndex: 4, spoken: 'אחת שתיים' });
  assert.equal(words()[1].attrs['aria-current'], 'true');
  await box.fire('pointerdown', { target: words()[0], pointerId: 1, button: 0 });
  on({ type: 'boundary', charIndex: 0, spoken: 'אחת שתיים' });
  assert.equal(words()[0].attrs['aria-current'], 'true');
  on({ type: 'boundary', charIndex: 4, spoken: 'אחת שתיים' });
  assert.equal(words()[0].attrs['aria-current'], 'true', 'after a touch the clip no longer moves the guide');
});

test('Follow the recording can be switched off, and calm mode never follows', async () => {
  const clock = fakeClock(); const { guide, words } = await guideWithVerses(clock);
  const controls = guide.controls();
  const btn = controls.querySelector('.trd-finger-follow');
  assert.equal(btn.attrs['aria-pressed'], 'true');
  await btn.click();
  guide.followVerse(2)({ type: 'playing', clock: () => ({ ms: 0, durMs: 1000 }) });
  assert.equal(clock.timers.size, 0); assert.notEqual(words()[2].attrs['aria-current'], 'true');
  const calmClock = fakeClock(); const calm = await guideWithVerses(calmClock, true);
  calm.guide.followVerse(2)({ type: 'playing', clock: () => ({ ms: 0, durMs: 1000 }) });
  assert.equal(calmClock.timers.size, 0);
});
