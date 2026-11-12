// Audio lane (12 Nov): pure helpers behind the playback bar, queues, compare, readiness, drills, read-along and audio packs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAudio, clipPlaybackRate, CLIP_RATES, ACCENT_SOURCES } from '../src/audio/player.js';
import * as C from '../src/audiolab/core.js';
import { ENUMS as ALLOWED } from '../src/shell/settings.js';

const row = (voice, tradition, kind, id, extra = {}) => ({ path: `audio/${voice}/${tradition}/${kind}/${id}.mp3`, voice, tradition, kind, id, text: 'שָׁלוֹם', status: 'tts', source: 'paid-cloud', ...extra });

test('A2: clip speeds 1, 0.8, 0.7 and 0.6 exist; anything else is normal speed', () => {
  assert.equal(clipPlaybackRate('normal'), 1);
  assert.equal(clipPlaybackRate('slow-0.8'), 0.8);
  assert.equal(clipPlaybackRate('slow'), 0.7);
  assert.equal(clipPlaybackRate('slow-0.6'), 0.6);
  assert.equal(clipPlaybackRate(0.6), 0.6);
  assert.equal(clipPlaybackRate(0.5), 1);
  assert.equal(clipPlaybackRate('toString'), 1, 'prototype keys are not speeds');
  assert.deepEqual(Object.values(CLIP_RATES).sort(), [0.6, 0.7, 0.8, 1]);
  for (const c of C.RATE_CHOICES) assert.ok(ALLOWED.clipRate.includes(c.value), `setting allows ${c.value}`);
});

test('A2: the player plays a file at the chosen slow speed with pitch kept, and can change speed while it plays', async () => {
  const made = [];
  class El { constructor(u) { this.src = u; made.push(this); } play() { setTimeout(() => this.onended?.(), 5); return Promise.resolve(); } pause() {} }
  const settings = { voice: 'f', congregation: 'israeli', clipRate: 'slow-0.6' };
  const audio = createAudio({ settings, manifest: [row('f', 'israeli', 'word', 'x')], AudioCtor: El, speech: null, UtteranceCtor: null });
  const p = audio.play('word', 'x');
  assert.equal(made[0].playbackRate, 0.6);
  assert.equal(made[0].preservesPitch, true);
  assert.equal(audio.nowPlaying().kind, 'file');
  assert.equal(audio.nowPlaying().media, made[0]);
  assert.equal(audio.setClipRate('slow-0.8'), 0.8);
  assert.equal(made[0].playbackRate, 0.8);
  await p;
  assert.equal(audio.nowPlaying(), null);
  assert.equal(audio.setClipRate('normal'), null, 'nothing playing: nothing to change');
});

test('A1: progress and time text come from the media element; unknown length gives null', () => {
  assert.equal(C.fmtTime(7.9), '0:07');
  assert.equal(C.fmtTime(65), '1:05');
  assert.equal(C.fmtTime(NaN), '');
  assert.deepEqual(C.progressOf({ currentTime: 3, duration: 6 }), { fraction: 0.5, text: '0:03 / 0:06' });
  assert.equal(C.progressOf({ currentTime: 0, duration: NaN }), null);
  assert.equal(C.progressOf({ currentTime: 0, duration: Infinity }), null);
  assert.ok(C.QUIET_SRC.test('audio/music/bed.mp3') && !C.QUIET_SRC.test('audio/f/israeli/book/book1-p01.mp3'));
});

test('A7: readiness counts what the player would really play, and the line says only the counts', () => {
  const manifest = [row('f', 'israeli', 'line', 'a'), row('f', 'israeli', 'line', 'b'), { ...row('f', 'israeli', 'line', 'c'), status: 'missing' }, row('f', 'israeli', 'line', 'd')];
  const audio = createAudio({ settings: { voice: 'f', congregation: 'israeli' }, manifest, AudioCtor: class {}, speech: null, UtteranceCtor: null, held: ['audio/f/israeli/line/d.mp3'] });
  const r = C.readiness(audio, ['a', 'b', 'c', 'd'].map((id) => ({ kind: 'line', id })));
  assert.deepEqual(r, { total: 4, clip: 2, device: 0, held: 1, coming: 1, checking: 0 });
  assert.equal(C.readinessLine(r, 'lines'), '2 of 4 lines have audio. 1 is held for review. 1 has audio coming.');
  assert.equal(C.readinessLine({ total: 3, clip: 3, device: 0, held: 0, coming: 0, checking: 0 }, 'words'), '3 of 3 words have audio.');
  assert.equal(C.readinessLine({ total: 3, clip: 0, device: 0, held: 0, coming: 0, checking: 3 }, 'words'), 'Checking which words have audio…');
  assert.equal(C.readinessLine({ total: 0 }), '');
  const pages = [{ audio: { f: 'x.mp3' } }, { audioHeld: true, audio: { f: 'y.mp3' } }, {}];
  assert.deepEqual(C.bookReadiness(pages, 'f'), { total: 3, clip: 1, device: 0, held: 1, coming: 1, checking: 0 });
});

test('A5: compare labels follow the manifest: own clip, same reading as Israeli, plays the Israeli clip, audio coming', () => {
  const manifest = [
    row('f', 'israeli', 'line', 'l1'),
    row('f', 'sephardi', 'line', 'l1', { status: 'synthetic-unreviewed', source: ACCENT_SOURCES.sameReading }),
    row('f', 'ashkenazi', 'line', 'l1', { status: 'plays-israeli', plays: 'audio/f/israeli/line/l1.mp3' }),
    { ...row('f', 'israeli', 'line', 'l2'), status: 'missing' },
  ];
  const audio = createAudio({ settings: { voice: 'f', congregation: 'israeli' }, manifest, AudioCtor: class {}, speech: null, UtteranceCtor: null });
  const st = (t, id) => C.compareState(t, audio.status('line', id, { tradition: t }));
  assert.equal(st('israeli', 'l1').state, 'own');
  assert.equal(st('sephardi', 'l1').state, 'same');
  assert.match(st('sephardi', 'l1').label, /same reading as Israeli/);
  assert.equal(st('ashkenazi', 'l1').state, 'israeli');
  assert.match(st('ashkenazi', 'l1').label, /Plays the Israeli clip/);
  assert.equal(st('israeli', 'l2').state, 'none');
  assert.equal(st('israeli', 'l2').label, 'Audio coming');
  assert.equal(C.compareState('israeli', { source: 'none', held: true }).state, 'held');
});

test('A2: step mode words and ids; no syllable split is invented', () => {
  assert.deepEqual(C.lineWords('בָּרוּךְ אַתָּה ה׳'), ['בָּרוּךְ', 'אַתָּה', 'ה׳']);
  assert.deepEqual(C.wordIds('shema-1', 2), ['shema-1-w1', 'shema-1-w2']);
  assert.equal(C.syllableSplit({ he: 'שָׁלוֹם' }), null);
  assert.deepEqual(C.syllableSplit({ syllables: ['שָׁ', 'לוֹם'] }), ['שָׁ', 'לוֹם']);
  assert.match(C.NO_SYLLABLES, /No syllable split/);
  assert.equal(C.isNameish('יְהוָה'), true);
  assert.equal(C.isNameish('שָׁלוֹם'), false);
});

test('A8: estimated timings share the clip length by word length and cover it exactly', () => {
  const t = C.estimateWordTimings(['גָּדוֹל!', 'קָטָן!'], 3.5);
  assert.equal(t.length, 2);
  assert.equal(t[0].start, 0);
  assert.ok(Math.abs(t[1].end - 3.5) < 1e-9);
  assert.ok(t[0].end > 0 && t[0].end < 3.5);
  assert.equal(C.wordAt(t, 0.1), 0);
  assert.equal(C.wordAt(t, 3.4), 1);
  assert.equal(C.wordAt(t, 9), -1);
  assert.deepEqual(C.estimateWordTimings(['א'], NaN), [{ start: 0, end: 0 }]);
});

test('A3: a gap question needs every word clip, never gaps the divine name, and offers four distinct words', () => {
  const line = { id: 'x', he: 'בָּרוּךְ אַתָּה יְהוָה אֱלֹהֵינוּ' };
  const pool = ['מֶלֶךְ', 'הָעוֹלָם', 'שָׁלוֹם', 'יְהוָה', 'מֶלֶךְ', 'תּוֹרָה'];
  for (let s = 1; s < 40; s++) {
    const q = C.gapQuestion(line, () => true, pool, C.makeRng(s));
    assert.ok(q);
    assert.notEqual(q.words[q.gap], 'יְהוָה');
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.ok(q.options.includes(q.answer));
    assert.ok(!q.options.some((o) => C.isNameish(o)));
  }
  assert.equal(C.gapQuestion(line, (id) => id !== 'x-w2', pool, C.makeRng(1)), null, 'a missing word clip: no question');
  assert.equal(C.gapQuestion({ id: 'y', he: 'שָׁלוֹם עֲלֵיכֶם' }, () => true, pool), null, 'two words: too short');
});

test('A4: dictation items come from the typing drills and never include the divine name', () => {
  const data = JSON.parse(readFileSync(new URL('../data/typing/drills.json', import.meta.url), 'utf8'));
  const words = C.dictationItems(data, 'words'), lines = C.dictationItems(data, 'lines');
  assert.ok(words.length > 50);
  assert.ok(lines.length > 0);
  assert.ok(lines.length < data.lines.length, 'lines with the name are left out');
  for (const it of [...words, ...lines]) { assert.ok(!C.isNameish(it.pointed)); assert.ok(it.he && it.pointed); }
});

test('A10: pack clip lists come from the plan (held never), book pages, and lesson word ids', () => {
  const manifest = [row('f', 'israeli', 'word', 'r01-w1'), row('f', 'israeli', 'word', 'r01-w2')];
  const audio = createAudio({ settings: { voice: 'f', congregation: 'israeli' }, manifest, AudioCtor: class {}, speech: null, UtteranceCtor: null, held: ['audio/f/israeli/word/r01-w2.mp3'] });
  assert.deepEqual(C.clipPaths(audio, [{ kind: 'word', id: 'r01-w1' }, { kind: 'word', id: 'r01-w2' }, { kind: 'word', id: 'r01-w1' }]), ['audio/f/israeli/word/r01-w1.mp3']);
  assert.deepEqual(C.bookClipPaths([{ audio: { f: 'a.mp3', m: 'b.mp3' } }, { audioHeld: true, audio: { f: 'c.mp3' } }], 'f'), ['a.mp3']);
  const lessons = JSON.parse(readFileSync(new URL('../data/curriculum/lessons.json', import.meta.url), 'utf8')).lessons;
  const sets = C.lessonSets(lessons);
  assert.ok(sets.length >= 2);
  assert.equal(sets[0].items[0].id, `${lessons.find((l) => l.words?.length).id}-w1`);
  assert.equal(C.fmtBytes(2048), '2 KB');
  assert.equal(C.fmtBytes(3 * 1048576), '3.0 MB');
});
