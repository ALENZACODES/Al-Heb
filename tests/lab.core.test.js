import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GAMES, SKILLS, MAX_LEVEL, dailyWorkout, step, trialPoints, startLevel, summarize, recordSession, emptyState, readState,
  workoutProgress, workoutStreak, skillScore, overallScore, comparison, seeded, consonants, hasPattern, gematriaPuzzle, choices, lineWords,
} from '../src/lab/lab.core.js';
import { DRILLS, _test } from '../src/lab/lab.games.js';
import { HOLIDAY_DEFS } from '../src/curriculum/calendar.js';

const json = (p) => JSON.parse(readFileSync(p, 'utf8'));

test('ten drills, every skill has at least one, every drill has code', () => {
  assert.equal(GAMES.length, 10);
  for (const s of SKILLS) assert.ok(GAMES.some((g) => g.skill === s.id), s.id);
  for (const g of GAMES) assert.equal(typeof DRILLS[g.id]?.trial, 'function', g.id);
});

test('daily workout: three drills, three different skills, same all day, changes across days', () => {
  const a = dailyWorkout('2026-11-09'), b = dailyWorkout('2026-11-09');
  assert.deepEqual(a, b); assert.equal(a.length, 3);
  assert.equal(new Set(a.map((id) => GAMES.find((g) => g.id === id).skill)).size, 3);
  const week = new Set(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'].map((d) => dailyWorkout(d).join()));
  assert.ok(week.size > 1);
});

test('staircase: two right goes up, a miss goes down, bounded', () => {
  let s = { level: 1, streak: 0 };
  s = step(s, true); assert.equal(s.level, 1); s = step(s, true); assert.equal(s.level, 2);
  s = step(s, false); assert.equal(s.level, 1); s = step(s, false); assert.equal(s.level, 1);
  assert.equal(step({ level: MAX_LEVEL, streak: 1 }, true).level, MAX_LEVEL);
});

test('points: misses are zero; faster and higher levels earn more', () => {
  assert.equal(trialPoints(false, 5, 100, 1000), 0);
  assert.ok(trialPoints(true, 5, 300, 1000) > trialPoints(true, 5, 1900, 1000));
  assert.ok(trialPoints(true, 6, 1000, 1000) > trialPoints(true, 5, 1000, 1000));
});

test('sessions are recorded, best kept, start level one below the last top level, workout and streak tracked', () => {
  const sum = summarize([{ ok: true, ms: 800, level: 3, pts: 35 }, { ok: false, ms: 900, level: 4, pts: 0 }, { ok: true, ms: 600, level: 3, pts: 36 }]);
  assert.deepEqual([sum.score, sum.accuracy, sum.maxLevel, sum.avgMs], [71, 67, 4, 700]);
  let st = recordSession(emptyState(), 'hunt', sum, '2026-11-08');
  assert.equal(st.games.hunt.best, 71); assert.equal(startLevel(st.games.hunt), 3);
  st = recordSession(st, 'hunt', { ...sum, score: 50 }, '2026-11-08'); assert.equal(st.games.hunt.best, 71); assert.equal(st.games.hunt.plays, 2);
  const plan = dailyWorkout('2026-11-09', st);
  for (const id of plan) st = recordSession(st, id, sum, '2026-11-09');
  assert.equal(workoutProgress(st, '2026-11-09', plan).complete, true);
  assert.equal(workoutStreak(st, '2026-11-09', () => plan), 1);
  assert.deepEqual(readState(null), emptyState());
});

test('skill scores compare only with your own games; null before any play', () => {
  assert.equal(skillScore(emptyState(), 'speed'), null); assert.equal(overallScore(emptyState()), null);
  const st = recordSession(emptyState(), 'gematria', { score: 120, accuracy: 80, maxLevel: 4, avgMs: 900 }, '2026-11-09');
  assert.equal(skillScore(st, 'problem'), 120); assert.equal(overallScore(st), 120);
  assert.match(comparison([], { score: 10 }), /First game/); assert.match(comparison([{ s: 5 }], { score: 10 }), /5 points more/);
});

test('letter pattern: finals fold, vowels ignored, order matters', () => {
  assert.equal(consonants('שָׁלוֹם'), 'שלומ');
  assert.ok(hasPattern('מִכְתָּב', 'כתב')); assert.ok(!hasPattern('בָּתִּים', 'כתב')); assert.ok(!hasPattern('בָּכָת', 'כתב'));
  assert.ok(hasPattern('כּוֹתֶבֶת', 'כ־ת־ב'));
});

test('gematria puzzles always hold a solution drawn from the tiles', () => {
  const letters = json('data/letters/letters.json');
  for (let lv = 1; lv <= MAX_LEVEL; lv++) for (let i = 0; i < 30; i++) {
    const p = gematriaPuzzle(letters, lv, seeded(lv * 100 + i));
    assert.equal(p.solution.reduce((a, l) => a + l.gematria, 0), p.target);
    for (const l of p.solution) assert.ok(p.tiles.includes(l));
    assert.ok(p.tiles.every((l) => !/-final$/.test(l.id)), 'no final forms (they carry no extra value here)');
  }
});

test('choices: right answer once, no duplicates', () => {
  const c = choices(3, [1, 2, 3, 4, 5], 4, seeded(1));
  assert.equal(c.length, 4); assert.equal(c.filter((x) => x === 3).length, 1); assert.equal(new Set(c).size, 4);
});

test('data: syllables come from recorded clips in both voices; numbers come from the dictionary with their word ids', () => {
  const syl = json('data/lab/syllables.json').syllables;
  const man = json('data/audio/manifest.json');
  const has = (v, id) => man.some((x) => x.kind === 'syllable' && x.tradition === 'israeli' && x.voice === v && x.id === id && x.status !== 'missing');
  assert.ok(syl.length >= 100);
  for (const s of syl) { assert.ok(has('m', s.id) && has('f', s.id), s.id); assert.ok(s.tr && s.he); }
  const nums = json('data/lab/numbers.json').numbers;
  const vocab = json('data/vocab/themes/time-numbers-set01.json').words;
  for (const n of nums) { const w = vocab.find((x) => x.id === n.id); assert.ok(w, n.id); assert.equal(w.he, n.he); }
  assert.deepEqual(nums.map((n) => n.value), [...nums.map((n) => n.value)].sort((a, b) => a - b));
});

test('rule switch items: dots and final forms labelled correctly', () => {
  for (const it of _test.SWITCH_ITEMS) {
    assert.equal(it.dot, it.he.includes('ּ'), it.he);
    assert.equal(it.fin, /[ךםןףץ]/.test(it.he), it.he);
  }
});

test('calendar puzzle uses the app holiday table; Hebrew dates read as numerals', () => {
  const yk = HOLIDAY_DEFS.find((d) => d.id === 'yom-kippur');
  assert.equal(_test.dateEn(yk), '10 Tishrei'); assert.equal(_test.dateHe(yk), 'י׳ תִּשְׁרֵי');
  const purim = HOLIDAY_DEFS.find((d) => d.id === 'purim'); assert.equal(_test.dateEn(purim), '14 Adar');
  assert.equal(_test.shortName({ en: 'Pesach (Passover)' }), 'Pesach');
});

test('prayer lines split into words; maqaf words stay whole', () => {
  assert.deepEqual(lineWords('מַה־טֹּבוּ אֹהָלֶיךָ יַעֲקֹב׃'), ['מַה־טֹּבוּ', 'אֹהָלֶיךָ', 'יַעֲקֹב']);
});

test('number recordings: each linked clip says exactly the same Hebrew, in both voices', () => {
  const words = json('data/audio/manifest-kind-word.json');
  for (const n of json('data/lab/numbers.json').numbers.filter((x) => x.clip)) {
    for (const v of ['m', 'f']) assert.ok(words.some((r) => r.id === n.clip && r.voice === v && r.tradition === 'israeli' && r.status !== 'missing' && r.text === n.he), `${n.value} ${v}`);
  }
});
