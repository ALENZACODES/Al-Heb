// Lane games-books, ideas D6, D7, D8, D10: Word Finder by ear and Listen and Spot (clips only, never the device voice),
// the Sixty-Second Sprint (lesson words, combo multiplier), pass-and-play Dreidel and Quiz Ladder, and Root Builder (answers
// only from the app's own root families and verb list). Logic and wiring in a fake DOM; no audio is played or judged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { environment, memStore, calm, fetchFn, wait, buttons, byText, json } from './gb.env.js';
import { buildRounds, tilesFor, check, key, rootLetters, starsFor as rbStars, MIN_ANSWERS } from '../src/games/rootbuilder.model.js';
import { lessonPool, answer, multiplier, question, MAX_MULT, MIN_WORDS } from '../src/games/sprint60.model.js';
import { climb, winnerOf, valueOf, RUNGS } from '../src/games/quizladder-duo.view.js';
import { passCast } from '../src/games/hanukkah-dreidel-ui.js';
import { seededRandom } from '../src/games/arcade.model.js';
import { SCORES_KEY } from '../src/games/scores.js';
import { matchRoute } from '../src/shell/router.js';

const fam = json('data/roots/families.json'), verbs = json('data/roots/verbs.json'), lessons = json('data/curriculum/lessons.json').lessons;
const rounds = buildRounds(fam, verbs);

test('D10: every Root Builder answer is a word the data lists under that three-letter root', () => {
  assert.ok(rounds.length > 50);
  const listed = new Map();
  for (const f of fam.families) for (const w of f.words) { const k = key(f.root); (listed.get(k) || listed.set(k, new Set()).get(k)).add(key(w.he)); for (const v of Object.values(w.forms || {})) listed.get(k).add(key(v)); }
  for (const v of verbs.verbs) if (v.root) { const k = key(v.root); (listed.get(k) || listed.set(k, new Set()).get(k)).add(key(v.he)); for (const f of Object.values(v.forms || {})) listed.get(k).add(key(f)); }
  for (const r of rounds) {
    assert.equal(r.letters.length, 3); assert.ok(r.answers.length >= MIN_ANSWERS);
    for (const a of r.answers) assert.ok(listed.get(key(r.root))?.has(a.key), `${a.he} under ${r.root}`);
    // every answer can be built from the tiles
    const tiles = new Set(tilesFor(r)); for (const a of r.answers) assert.ok([...a.key].every((c) => tiles.has(c)), a.he);
  }
  const r = rounds[0], a = r.answers[0];
  assert.equal(check(r, a.he, new Set()).result, 'found');
  assert.equal(check(r, a.key, new Set([a.key])).result, 'again');
  assert.equal(check(r, 'א', new Set()).result, 'short');
  assert.equal(check(r, 'קקקקק', new Set()).result, 'unlisted');
  assert.equal(key('שָׁלוֹם'), 'שלומ', 'points dropped, final mem as mem');
  assert.deepEqual(rootLetters('שׁ־א־ל'), ['ש', 'א', 'ל']);
  assert.deepEqual([rbStars(3, 4), rbStars(2, 4), rbStars(1, 4), rbStars(0, 4)], [3, 2, 1, 0]);
});

test('D10: Root Builder plays: tiles build a listed word, an unlisted word is refused, the round shows every listed word', async () => {
  const env = environment(); const { store, mem } = memStore();
  const mod = await import('../src/games/rootbuilder.view.js');
  const stop = mod.mount(env.root, { store, settings: calm, fetchFn });
  await wait(() => env.root.querySelector('.gb-root-letters'));
  const rootText = env.root.querySelector('.gb-root-he').textContent;
  const round = rounds.find((r) => r.letters.join(' · ') === rootText);
  const target = round.answers[0];
  for (const c of target.key) env.root.querySelectorAll('button').find((b) => b.textContent === c).click();
  byText(env.root, /Check the word/).click();
  assert.match(env.root.textContent, /Found: 1/);
  byText(env.root, /Finish and see all the words/).click();
  assert.match(env.root.textContent, new RegExp(`You found 1 of the ${round.answers.length} words`));
  assert.equal(mem.get('games.rootbuilder.v1').plays, 1);
  assert.equal(mem.get(SCORES_KEY).rootbuilder.last, 10);
  stop();
});

test('D7: the sprint pool is the learner\'s most recent lessons; the combo grows every three right and resets on a miss', () => {
  const p = lessonPool(lessons, { r01: '2026-11-01T10:00:00Z', r10: '2026-11-10T10:00:00Z', r05: '2026-11-05T10:00:00Z' });
  assert.equal(p.fromLessons[0], 'r10', 'most recent first');
  assert.ok(p.words.every((w) => ['r01', 'r05', 'r10'].includes(w.lesson) || p.filled));
  const empty = lessonPool(lessons, {});
  assert.equal(empty.filled, true); assert.ok(empty.words.length >= MIN_WORDS);
  assert.deepEqual([1, 2, 3, 4, 6, 7, 10, 30].map(multiplier), [1, 1, 1, 2, 2, 3, 4, MAX_MULT]);
  let s = null; for (let i = 0; i < 4; i++) s = answer(s, true);
  assert.equal(s.score, 10 + 10 + 10 + 20); assert.equal(s.mult, 2);
  s = answer(s, false); assert.equal(s.streak, 0); assert.equal(s.mult, 1); assert.equal(s.score, 50, 'a miss costs nothing');
  const q = question(empty.words, seededRandom(3));
  assert.ok(q.options.some((o) => o.he === q.target.he)); assert.equal(new Set(q.options.map((o) => o.en)).size, q.options.length);
});

test('D7: the sprint runs one minute on a clock, then saves the score', async () => {
  const env = environment(); const { store, mem } = memStore();
  let tick = null; const clock = { setInterval: (f) => { tick = f; return 1; }, clearInterval: () => { tick = null; } };
  const mod = await import('../src/games/sprint60.view.js');
  mod.mount(env.root, { store, settings: calm, fetchFn, clock });
  await wait(() => byText(env.root, /Start the minute/));
  byText(env.root, /Start the minute/).click();
  buttons(env.root)[0].click();
  for (let i = 0; i < 60 && tick; i++) tick();
  assert.match(env.root.textContent, /Time! \d+ points/);
  assert.equal(mem.get('games.sprint60.v1').plays, 1);
});

/** A fake player: word clips "exist" for the ids given; play() resolves as a file. */
const fakeAudio = (ids) => ({ played: [], status(kind, id) { return kind === 'word' && ids.has(id) ? { source: 'file', entryStatus: 'tts', tradition: 'israeli' } : { source: 'none' }; },
  async play(kind, id) { this.played.push(id); return { source: ids.has(id) ? 'file' : 'none' }; }, stop() {} });

test('D6: Word Finder by ear uses only words with a clip, hides the English until found, and keeps its own record', async () => {
  const words = json('data/games/firstwords.json').words;
  const withClip = new Set(words.slice(0, 12).map((w) => w.id));
  const audio = fakeAudio(withClip);
  const env = environment(); const { store, mem } = memStore();
  assert.equal(matchRoute('#/wordfinder-listen').route.query.listen, '1');
  const mod = await import('../src/games/wordfinder.view.js');
  mod.mount(env.root, { store, settings: calm, fetchFn, audio, query: { listen: '1' } });
  await wait(() => env.root.querySelector('.wf-choice'));
  assert.match(env.root.textContent, /Find the word you heard/);
  assert.doesNotMatch(env.root.querySelector('.wf-find-header').textContent, /It sounds like/);
  await wait(() => audio.played.length > 0);
  const heard = audio.played[0];
  assert.ok(withClip.has(heard));
  const target = words.find((w) => w.id === heard);
  env.root.querySelectorAll('.wf-choice').find((b) => b.textContent.includes(target.he)).click();
  assert.match(env.root.textContent, new RegExp(target.en.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')));
  assert.deepEqual(mem.get('games.wordfinder-listen.v1').found, [heard]);
  assert.equal(mem.get('games.wordfinder.v1'), undefined, 'the normal game record is untouched');
});

test('D6: Listen and Spot plays a lesson clip and the board answers; without clips it says so instead of using the device voice', async () => {
  const pool = lessonPool(lessons, {}, 80).words;
  const ids = new Set(pool.map((w) => `${w.lesson}-w${w.n}`));
  const audio = fakeAudio(ids);
  const env = environment(); const { store, mem } = memStore();
  const mod = await import('../src/games/listenspot.view.js');
  mod.mount(env.root, { store, settings: calm, fetchFn, audio });
  await wait(() => byText(env.root, /^Start$/));
  byText(env.root, /^Start$/).click();
  for (let round = 0; round < 8; round++) {
    await wait(() => audio.played.length > round);
    const id = audio.played[audio.played.length - 1];
    const w = pool.find((x) => `${x.lesson}-w${x.n}` === id);
    env.root.querySelectorAll('.gb-spot-cell').find((b) => b.textContent === w.he).click();
  }
  assert.match(env.root.textContent, /8 of 8 spotted/);
  assert.equal(mem.get('games.listenspot.v1').lastStars, 3);
  const env2 = environment();
  mod.mount(env2.root, { store, settings: calm, fetchFn, audio: fakeAudio(new Set()) });
  await wait(() => /Not enough/.test(env2.root.textContent));
});

test('D8: Quiz Ladder for Two: safe rungs, ten turns each, the higher rung wins', async () => {
  assert.deepEqual([climb(0, true), climb(4, false), climb(7, false), climb(2, false), climb(10, true)], [1, 3, 6, 0, 10]);
  assert.equal(valueOf(3), RUNGS[2]); assert.equal(winnerOf([4, 4]), -1); assert.equal(winnerOf([2, 5]), 1);
  const env = environment(); const { store, mem } = memStore();
  const mod = await import('../src/games/quizladder-duo.view.js');
  mod.mount(env.root, { store, settings: calm, fetchFn });
  await wait(() => byText(env.root, /^Start$/));
  byText(env.root, /^Start$/).click();
  for (let i = 0; i < 20; i++) { assert.match(env.root.textContent, /Player [12], your turn/); buttons(env.root.querySelector('[aria-label=Answers]'))[0].click(); }
  assert.match(env.root.textContent, /wins|tie/);
  assert.equal(mem.get('games.quizladder-duo.v1').plays, 1);
});

test('D8: Dreidel pass-and-play seats two to four named players, all human, and ends with every player\'s gelt', async () => {
  assert.deepEqual(passCast(3).map((p) => p.name), ['Player 1', 'Player 2', 'Player 3']);
  assert.ok(passCast(9).length === 4 && passCast(1).length === 2);
  const env = environment(); const { store, mem } = memStore();
  const mod = await import('../src/games/hanukkah-dreidel1.view.js');
  const stop = await mod.mount(env.root, { store, settings: calm, fetchFn, images: { resolve: () => null }, audio: null, route: { query: { players: '2' } } });
  await wait(() => byText(env.root, /Start the Game/));
  assert.match(env.root.textContent, /How many players\?/);
  byText(env.root, /Start the Game/).click();
  for (let i = 0; i < 40 && !env.root.querySelector('.game-results'); i++) {
    const b = byText(env.root, /^Player [12]: Spin$/); assert.ok(b, 'each turn names the player'); b.click();
  }
  assert.ok(env.root.querySelector('.game-results'));
  assert.match(env.root.textContent, /Player 1: \d+ gelt/); assert.match(env.root.textContent, /Player 2: \d+ gelt/);
  assert.doesNotMatch(env.root.querySelector('.game-results').textContent, /Rimon|You Win/);
  assert.equal(mem.get('games.dreidel-duo.v1').plays, 1);
  assert.equal(mem.get('games.hanukkah-dreidel1.v1'), undefined, 'the one-player record is untouched');
  stop();
});
