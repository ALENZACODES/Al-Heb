// M-03 (12 Nov audit): "Perfect" is awarded only for a round with no wrong answer or guess, in every arcade game.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { applyResult, BADGES, isPerfect, mistakesLine } from '../src/games/arcade.model.js';

test('M-03: two wrong guesses on a solved round do not earn Perfect; a clean round does', () => {
  const won = { level: 1, score: 78, par: 60, misses: 0, timeMs: 1000 };
  assert.ok(!applyResult(null, { ...won, slips: 2 }).newBadges.includes('perfect'));
  assert.ok(applyResult(null, { ...won, slips: 0 }).newBadges.includes('perfect'));
  assert.ok(!applyResult(null, { ...won, misses: 1 }).newBadges.includes('perfect'));
  assert.equal(isPerfect({ misses: 0 }), true, 'old callers without slips still work');
});

test('M-03: the badge and the results line say what is measured', () => {
  assert.equal(BADGES.perfect, 'Perfect: a round with no wrong answers or guesses');
  assert.match(mistakesLine({ misses: 0, slips: 2 }, 30), /^2 mistakes \(wrong answers and guesses\)/);
  assert.match(mistakesLine({ misses: 0, slips: 0 }, 30), /^No mistakes, not even a wrong guess/);
});

test('M-03: Six Tries counts every wrong guess (A.slip) and a failed word (A.miss)', () => {
  const src = readFileSync(new URL('../src/games/tg-wordguess.view.js', import.meta.url), 'utf8');
  assert.match(src, /A\.slip\(\)/);
  const arc = readFileSync(new URL('../src/games/arcade.js', import.meta.url), 'utf8');
  assert.match(arc, /applyResult\(record, \{ level, score, par, misses, slips,/);
  assert.match(arc, /score = 0; misses = 0; slips = 0;/);
});

// Every place a game penalises a wrong move must count it (A.miss, A.slip, or the shared grade() that calls A.miss).
// Lines that penalise something that is not a wrong answer are listed with the reason.
const NOT_A_WRONG_ANSWER = {
  'g1-flashread.view.js': ['flash();', 'Show Again costs a point; it is a request, not an answer'],
  'g1-blend.view.js': ['showCards();', 'Show Again costs a point; it is a request, not an answer'],
  'g1-vowelchain.view.js': ['You drew', 'drawing a tile costs a point; it is not an answer'],
  'hanukkah-gelthunt.view.js': ['looks > n', 'extra looks cost a point; not an answer'],
  'scramble.view.js': ['hints++', 'a hint costs points; not an answer'],
  'hanukkah-slide.view.js': ['!slide(board', 'a tile that cannot slide does not move; not an answer'],
  'g2-hive.view.js': ['not in this hive', 'a word not in the list is refused, as in Six Tries; it is not counted as a guess'],
  'tg-wordguess.view.js': ['is not in the word list', 'a word not in the list is refused and costs no try; real wrong guesses call A.slip'],
  'meltdown.view.js': ['Melted.', 'the -5 for a melted word follows A.miss() on the same wrong letter'],
};
test('M-03: every arcade wrong-move penalty is counted, or listed with a reason', () => {
  const dir = new URL('../src/games/', import.meta.url);
  const bad = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.js') && !x.startsWith('arcade'))) {
    const lines = readFileSync(new URL(f, dir), 'utf8').split('\n');
    lines.forEach((l, i) => {
      if (!/sfx\('(miss|error_soft|error)'\)|addScore\(-/.test(l)) return;
      if (/grade\(A, (ok|true)/.test(l) && !/addScore\(-/.test(l)) return;
      const near = lines.slice(i, i + 7).join('\n');
      if (/A\.(miss|slip)\(\)|grade\(A, false/.test(near) || /tg-ui\.js/.test(f) && /A\.miss\(\)/.test(l)) return;
      const ok = NOT_A_WRONG_ANSWER[f]; if (ok && l.includes(ok[0])) return;
      bad.push(`${f}:${i + 1}: ${l.trim().slice(0, 120)}`);
    });
  }
  assert.deepEqual(bad, []);
});
