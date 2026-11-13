// together lane (R1 challenge codes, R7 group challenge by file): the same seeded board on two devices, no server.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, createMemoryStorage } from '../src/store.js';
import { ARCADE_GAMES } from '../src/games/arcade.catalog.js';
import { CHALLENGES_KEY, GROUP_KIND, gameTag, newBoard, boardKey, makeCode, readCode, tidy, challengeRandom, playHref, noteBoard, noteOther, noteMine, table, compareLine, groupFile, readGroupFile } from '../src/together/challenge.js';
import { roundMode, afterRound, challengeBoard } from '../src/games/round-extras.js';
import { RATINGS_KEY, ratingOf } from '../src/together/ratings.js';
import { cleanText } from '../src/together/share.js';

const T = new Date('2026-11-11T10:00:00').getTime();
const mk = () => createStore({ storage: createMemoryStorage(), window: null });
/** Enough of the DOM helper for the results-card nodes: tag, attributes, children, text. */
const h = (tag, attrs = {}, ...kids) => ({ tag, attrs: attrs || {}, kids: kids.filter((k) => k != null), setAttribute(k, v) { this.attrs[k] = v; }, set textContent(v) { this.kids = [v]; }, get textContent() { return text(this); } });
const text = (n) => (typeof n === 'string' ? n : (n.kids || []).map(text).join(''));
const find = (nodes, pred) => { const out = []; const walk = (n) => { if (n && typeof n === 'object') { if (pred(n)) out.push(n); (n.kids || []).forEach(walk); } }; nodes.forEach(walk); return out; };

test('every arcade game has its own three-character tag, and a code round-trips: game, level, seed and (when carried) the score', () => {
  assert.equal(new Set(ARCADE_GAMES.map((g) => gameTag(g.id))).size, ARCADE_GAMES.length);
  for (const g of ARCADE_GAMES) for (const level of [1, 5]) {
    const b = newBoard(g.id, level, () => 0.123456);
    const invite = readCode(makeCode(b)), scored = readCode(makeCode(b, 1234));
    assert.deepEqual([invite.ok, invite.game, invite.level, invite.seed, invite.score], [true, g.id, level, b.seed, null], g.id);
    assert.deepEqual([scored.game, scored.level, scored.seed, scored.score, scored.key], [g.id, level, b.seed, 1234, boardKey(b)]);
  }
  const b = newBoard('letterchomp', 3, () => 0.5);
  assert.match(makeCode(b), /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]$/, 'short enough to read out: nine characters');
  assert.match(makeCode(b, 340), /^(\w{4}-){3}\w$/);
  assert.throws(() => newBoard('not-a-game', 1));
  assert.equal(newBoard('letterchomp', 99).level, 5);
});

test('a code typed by hand: lower case, spaces, and O, I and L for 0 and 1 are read; a wrong character is caught, not played', () => {
  const b = newBoard('wordsearch' in Object.fromEntries(ARCADE_GAMES.map((g) => [g.id, 1])) ? 'wordsearch' : ARCADE_GAMES[5].id, 2, () => 0.03125);
  const code = makeCode(b, 77);
  const typed = code.toLowerCase().replace(/-/g, '  ').replace(/0/g, 'o').replace(/1/g, 'l');
  assert.equal(readCode(typed).ok, true); assert.equal(readCode(typed).score, 77);
  assert.equal(tidy(' ab-c1 '), 'ABC1');
  const raw = tidy(code), ABC = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let tried = 0;
  for (let i = 0; i < raw.length; i++) for (const ch of ABC) { if (ch === raw[i]) continue; tried++; assert.equal(readCode(raw.slice(0, i) + ch + raw.slice(i + 1)).ok, false, `position ${i} changed to ${ch}`); }
  assert.equal(tried, 13 * 31, 'every possible single wrong character is noticed');
  assert.match(readCode('ABC').error, /9 or 13 letters and digits/);
  assert.match(readCode('ZZZ1-0000-0').error, /typing mistake|does not have/);
});

test('the same code gives the same board on any device: the random sequence is identical, and different for another seed or level', () => {
  const a = readCode(makeCode(newBoard('letterchomp', 2, () => 0.7))), again = readCode(makeCode(a, 55));
  const seq = (b) => { const r = challengeRandom(b); return Array.from({ length: 20 }, () => r()); };
  assert.deepEqual(seq(a), seq(again), 'with or without a score in the code');
  assert.notDeepEqual(seq(a), seq({ ...a, seed: a.seed + 1 }));
  assert.notDeepEqual(seq(a), seq({ ...a, level: 3 }));
  assert.equal(playHref(a), `#/letterchomp?challenge=${makeCode(a).replace(/-/g, '')}&level=2`);
  assert.deepEqual(Array.from({ length: 5 }, challengeBoard(a)), seq(a).slice(0, 5));
});

test('in the arcade: ?challenge=<code> fixes the level and turns the daily board off; a code for another game is ignored', () => {
  const b = newBoard('letterchomp', 4, () => 0.2); const code = makeCode(b).replace(/-/g, '');
  const m = roundMode({ route: { query: { challenge: code, daily: '1' } }, store: mk() }, 'letterchomp');
  assert.equal(m.level, 4); assert.equal(m.daily, false); assert.equal(m.challenge.seed, b.seed);
  assert.equal(roundMode({ route: { query: { challenge: code } }, store: mk() }, 'fallingletters').challenge, null);
  assert.equal(roundMode({ route: { query: { challenge: 'nonsense' } }, store: mk() }, 'letterchomp').challenge, null);
  assert.equal(roundMode({ route: { query: {} }, store: mk() }, 'letterchomp').challenge, null);
});

test('two devices: the friend\'s results card compares both scores, and the code it gives lets the sender see the comparison too', () => {
  const sender = mk(), friend = mk();
  const b = newBoard('letterchomp', 1, () => 0.4);
  sender.set(CHALLENGES_KEY, noteBoard(sender.get(CHALLENGES_KEY), b, T));
  // the sender plays first
  const mode = (store) => roundMode({ store, route: { query: { challenge: makeCode(b) } } }, 'letterchomp');
  const sent = afterRound(h, { store: sender }, { id: 'letterchomp', level: 1, score: 340, stars: 2, daily: false, tournament: false, week: 'w', challenge: mode(sender).challenge, now: T });
  const sentText = sent.map(text).join(' ');
  assert.match(sentText, /Your challenge score is in: 340 points\./);
  const code = find(sent, (n) => n.attrs.class === 'gb-challenge-code')[0].kids[0];
  assert.equal(readCode(code).score, 340);
  // the friend enters the code, then plays the same board
  const c = readCode(code);
  friend.set(CHALLENGES_KEY, noteOther(noteBoard(friend.get(CHALLENGES_KEY), c, T), c, { name: 'Dana', score: c.score, at: T }, T));
  const got = afterRound(h, { store: friend }, { id: 'letterchomp', level: 1, score: 410, stars: 3, daily: false, tournament: false, week: 'w', challenge: mode(friend).challenge, now: T + 1 });
  assert.match(got.map(text).join(' '), /You beat Dana by 70: 410 to 340\./);
  const back = readCode(find(got, (n) => n.attrs.class === 'gb-challenge-code')[0].kids[0]);
  assert.equal(back.key, c.key); assert.equal(back.score, 410);
  // the sender enters the friend's code: the comparison is on their side as well
  const s2 = noteOther(sender.get(CHALLENGES_KEY), back, { name: 'Avi', score: back.score }, T + 2);
  assert.equal(compareLine(s2.items[back.key].mine, s2.items[back.key].others[0]), 'Avi beat you by 70: 410 to 340.');
  // only the first finished round counts; another level does not count
  const again = afterRound(h, { store: friend }, { id: 'letterchomp', level: 1, score: 999, stars: 3, daily: false, tournament: false, week: 'w', challenge: mode(friend).challenge, now: T + 3 });
  assert.match(again.map(text).join(' '), /Practice round\. Your challenge score on this board is already in: 410 points\./);
  assert.equal(friend.get(CHALLENGES_KEY).items[c.key].mine.score, 410);
  const other = afterRound(h, { store: mk() }, { id: 'letterchomp', level: 3, score: 5, stars: 0, daily: false, tournament: false, week: 'w', challenge: mode(mk()).challenge, now: T });
  assert.match(other.map(text).join(' '), /The challenge is at level 1, so this one does not count/);
  assert.equal(compareLine({ score: 5 }, { name: 'Dana', score: 5 }), 'A tie with Dana: 5 points each.');
});

test('a round with no challenge shows no challenge lines; every results card lets the learner rate the game for themselves', () => {
  const store = mk();
  const nodes = afterRound(h, { store }, { id: 'letterchomp', level: 1, score: 10, stars: 1, daily: false, tournament: false, week: 'w', challenge: null, now: T });
  assert.ok(!/challenge/i.test(nodes.map(text).join(' ')));
  const stars = find(nodes, (n) => n.tag === 'button' && /gb-rate/.test(n.attrs.class || ''));
  assert.deepEqual(stars.map((b) => b.attrs['aria-label']), ['1 star', '2 stars', '3 stars', '4 stars', '5 stars']);
  stars[3].attrs.onclick();
  assert.equal(ratingOf(store.get(RATINGS_KEY), 'game', 'letterchomp'), 4);
  assert.deepEqual(stars.map((b) => b.attrs['aria-pressed']), ['true', 'true', 'true', 'true', 'false']);
  stars[3].attrs.onclick();
  assert.equal(ratingOf(store.get(RATINGS_KEY), 'game', 'letterchomp'), 0, 'pressing the same star again clears it');
});

test('group challenge by file: each player adds their result and the file carries the growing table; one result per name', () => {
  const b = newBoard('letterchomp', 2, () => 0.9);
  // Avi plays and saves the table
  let avi = noteMine(noteBoard(null, b, T), b, { score: 300, stars: 2 }, T).state;
  const f1 = groupFile(avi.items[boardKey(b)], 'Avi', T);
  assert.deepEqual([f1.app, f1.kind, f1.v, f1.results.length], ['alef', GROUP_KIND, 1, 1]);
  // Dana adds the file, plays, saves again
  const inD = readGroupFile(null, JSON.stringify(f1), 'Dana', T);
  assert.equal(inD.ok, true); assert.equal(inD.added, 1); assert.equal(inD.board.game, 'letterchomp');
  const dana = noteMine(inD.state, inD.board, { score: 450, stars: 3 }, T + 1).state;
  const f2 = groupFile(dana.items[boardKey(b)], 'Dana', T + 1);
  assert.deepEqual(f2.results.map((r) => [r.name, r.score]), [['Dana', 450], ['Avi', 300]]);
  // Eli adds it, plays; then Avi adds Eli's file: Avi's own row is not doubled
  const eli = noteMine(readGroupFile(null, f2, 'Eli', T).state, b, { score: 300, stars: 2 }, T + 2).state;
  const f3 = groupFile(eli.items[boardKey(b)], 'Eli', T + 2);
  const back = readGroupFile(avi, f3, 'Avi', T + 3);
  assert.equal(back.added, 2);
  assert.deepEqual(table(back.state.items[boardKey(b)], 'Avi').map((r) => [r.place, r.name, r.score, r.me]), [[1, 'Dana', 450, false], [2, 'Avi', 300, true], [2, 'Eli', 300, false]]);
  assert.equal(readGroupFile(back.state, f3, 'Avi', T + 4).added, 0, 'adding the same file twice changes nothing');
  // not a challenge file, a broken one, and names from outside are cleaned
  assert.match(readGroupFile(null, '{"app":"alef","kind":"alef-move"}').error, /not an Aleph challenge file/);
  assert.match(readGroupFile(null, 'not json').error, /could not be read/);
  const odd = readGroupFile(null, { ...f1, results: [{ name: '  <b>יהוה</b>‮ ' + 'x'.repeat(50), score: '12abc' }, { name: '', score: 5 }] }, 'Me', T, cleanText);
  assert.equal(odd.added, 1);
  const row = odd.state.items[boardKey(b)].others[0];
  assert.ok(row.name.length <= 20 && !row.name.includes('יהוה') && row.name.includes('ה׳'), row.name); assert.equal(row.score, 0);
});
