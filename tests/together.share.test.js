// together lane: family board and Study Hall (R5, R9), buddy pairing (R4), gift a lesson (R6), local ratings (R8),
// print-and-share (R10), and the rules every one of them keeps: no server, plain text only, the Name shown as ה׳.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore, createMemoryStorage } from '../src/store.js';
import { cleanText, packObject, unpackObject, fromPasted, weekStart } from '../src/together/share.js';
import { board, getGoal, setGoal, goalProgress, activity, achievements, ago, GOAL_CHOICES } from '../src/together/hall.js';
import { BUDDIES_KEY, withMyId, mySummary, buddyCode, buddyLink, receive, removeBuddy, buddies } from '../src/together/buddy.js';
import { makeGift, giftLink, openGift } from '../src/together/gift.js';
import { rate, ratingOf, rated, moreLikeGames, nextAfterFives } from '../src/together/ratings.js';
import { lessonLink, lessonQr } from '../src/together/printshare.js';
import { ARCADE_GAMES } from '../src/games/arcade.catalog.js';
import { addProfile } from '../src/together/household.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = new Date('2026-11-11T10:00:00').getTime(); // Wednesday
const BASE = 'https://alef-review.onrender.com/';

test('text from another device is plain text: control and direction characters go, length is capped, the Name is shown as ה׳', () => {
  assert.equal(cleanText('  Dana \n\t Levi  '), 'Dana Levi');
  assert.equal(cleanText('a‮b\u0000c⁦d'), 'a b c d');
  assert.equal(cleanText('x'.repeat(99)).length, 20); assert.equal(cleanText('x'.repeat(999), 200).length, 200);
  assert.equal(cleanText('יהוה'), 'ה׳'); assert.ok(!cleanText('ברוך אתה יהוה').includes('יהוה'));
  assert.equal(cleanText(null), ''); assert.equal(cleanText(42), '42');
  const o = { k: 'alef-x', v: 1, a: 'שלום' };
  assert.deepEqual(unpackObject(packObject(o), 'alef-x'), o);
  for (const bad of ['', 'not base64!', packObject({ k: 'other', v: 1 }), packObject({ k: 'alef-x', v: 2 }), packObject([1]), 'A'.repeat(7000)]) assert.equal(unpackObject(bad, 'alef-x'), null);
  assert.equal(fromPasted(`${BASE}#/buddy?b=abc_-1&x=2`, 'b'), 'abc_-1'); assert.equal(fromPasted(' abc ', 'b'), 'abc');
  assert.equal(new Date(weekStart(T)).getDay(), 0); assert.ok(weekStart(T) <= T && T - weekStart(T) < 7 * 86400000);
});

test('family board: ranked by XP this week, then lessons this week, then streak; equal rows share a place; Calm mode ranks nobody', () => {
  const rows = [{ name: 'Dana', xpWeek: 50, lessonsWeek: 1, streak: 2 }, { name: 'Avi', xpWeek: 80, lessonsWeek: 0, streak: 0 }, { name: 'Eli', xpWeek: 50, lessonsWeek: 3, streak: 0 }, { name: 'Bea', xpWeek: 50, lessonsWeek: 1, streak: 2 }];
  assert.deepEqual(board(rows).map((r) => [r.place, r.name]), [[1, 'Avi'], [2, 'Eli'], [3, 'Bea'], [3, 'Dana']]);
  assert.deepEqual(board(rows, { calm: true }).map((r) => [r.place, r.name]), [[0, 'Avi'], [0, 'Bea'], [0, 'Dana'], [0, 'Eli']]);
  assert.deepEqual(board([]), []);
});

test('Study Hall: a weekly goal the whole house shares, what each learner did lately, and milestones from their own counts', () => {
  const s = createMemoryStorage();
  assert.equal(getGoal(s), 0);
  addProfile('Dana', s, T);
  assert.equal(setGoal(10, s), 10); assert.equal(getGoal(s), 10);
  assert.equal(setGoal(7, s), 0, 'only the offered choices'); assert.ok(GOAL_CHOICES.includes(10));
  const rows = [{ name: 'Avi', lessons: 26, lessonsWeek: 4, streak: 8, awards: 2, recent: [{ id: 'r26', at: T - 3600000 }, { id: 'r25', at: T - 2 * 86400000 }] }, { name: 'Dana', lessons: 0, lessonsWeek: 0, streak: 0, awards: 0, recent: [] }, { name: 'Eli', lessons: 1, lessonsWeek: 1, streak: 1, awards: 0, recent: [{ id: 'r01', at: T - 86400000 }] }];
  assert.deepEqual(goalProgress(rows, 10), { goal: 10, done: 5, left: 5, reached: false });
  assert.equal(goalProgress(rows, 5).reached, true); assert.equal(goalProgress(rows, 0).reached, false);
  assert.deepEqual(activity(rows).map((a) => `${a.name} ${a.id} ${ago(a.at, T)}`), ['Avi r26 today', 'Eli r01 yesterday', 'Avi r25 2 days ago']);
  assert.deepEqual(achievements(rows), [{ name: 'Avi', lines: ['25 lessons finished', '7-day streak', '2 awards'] }, { name: 'Eli', lines: ['1 lesson finished'] }]);
});

test('buddy pairing: an update carries a name, a streak and lesson counts and nothing else; the other device keeps the latest', () => {
  const a = createStore({ storage: createMemoryStorage(), window: null }), b = createStore({ storage: createMemoryStorage(), window: null });
  let seq = 0; const rnd = () => ((seq++ * 7 + 3) % 36) / 36;
  const avi = withMyId(a.get(BUDDIES_KEY), rnd), dana = withMyId(b.get(BUDDIES_KEY), () => 0.9);
  assert.match(avi.me, /^[a-z0-9]{10}$/); assert.equal(withMyId(avi).me, avi.me, 'made once');
  const up = mySummary(avi, 'Avi', { lessons: 9, lessonsWeek: 2, xpWeek: 60, streak: 6 }, T);
  assert.deepEqual(Object.keys(up).sort(), ['id', 'k', 'l', 'n', 's', 't', 'v', 'w', 'x'], 'no answers, no settings, no recordings');
  const link = buddyLink(up, BASE);
  assert.ok(link.startsWith(`${BASE}#/buddy?b=`) && link.length < 400, 'short enough for a QR code');
  const got = receive(dana, fromPasted(link, 'b'), T + 1);
  assert.equal(got.ok, true); assert.equal(got.isNew, true); assert.equal(got.buddy.name, 'Avi'); assert.equal(got.buddy.latest.streak, 6);
  // a later update with a milestone
  const up2 = mySummary(avi, 'Avi', { lessons: 10, lessonsWeek: 3, xpWeek: 90, streak: 7 }, T + 86400000);
  const got2 = receive(got.state, buddyCode(up2), T + 86400001);
  assert.deepEqual(got2.news, ['Avi has finished 10 lessons.', 'Avi is on a 7-day streak.']); assert.equal(got2.isNew, false);
  assert.equal(buddies(got2.state)[0].history.length, 2);
  // an older update does not replace a newer one; one's own update and junk are refused; a file works like a link
  assert.equal(receive(got2.state, buddyCode(up), T + 86400002).buddy.latest.lessons, 10);
  assert.match(receive(avi, buddyCode(up), T).error, /your own update/);
  assert.match(receive(dana, 'garbage', T).error, /not a buddy update/);
  assert.equal(receive(dana, JSON.parse(JSON.stringify(up)), T).ok, true);
  const odd = receive(dana, { ...up, n: 'יהוה‮' + 'z'.repeat(60), s: -5, l: 1e12 }, T);
  assert.ok(odd.buddy.name.length <= 20 && !odd.buddy.name.includes('יהוה')); assert.equal(odd.buddy.latest.streak, 0); assert.equal(odd.buddy.latest.lessons, 9999);
  assert.deepEqual(buddies(removeBuddy(got2.state, avi.me)), []);
});

test('gift a lesson: the link opens that lesson and up to three games with the note; it carries nothing about the sender\'s progress', () => {
  const lessons = [{ id: 'r01', title: 'Shin and Bet' }, { id: 'r02', title: 'Tav' }];
  const games = ARCADE_GAMES.slice(0, 5).map((g) => g.id);
  const made = makeGift({ lesson: 'r02', games: [...games, 'not-a-game'], from: '  Savta  ', note: 'Start here!\nLove, Savta' });
  assert.equal(made.ok, true);
  assert.deepEqual(Object.keys(made.gift).sort(), ['f', 'g', 'k', 'l', 'n', 'v']); assert.equal(made.gift.g.length, 3);
  const link = giftLink(made.code, BASE);
  assert.ok(link.startsWith(`${BASE}#/gift?g=`));
  const open = openGift(fromPasted(link, 'g'), lessons);
  assert.equal(open.ok, true); assert.equal(open.from, 'Savta'); assert.equal(open.note, 'Start here! Love, Savta');
  assert.deepEqual(open.steps.map((s) => [s.kind, s.href]), [['lesson', '#/learn?lesson=r02'], ...games.slice(0, 3).map((id) => ['game', `#/${id}`])]);
  assert.equal(open.steps[0].title, 'Tav');
  assert.equal(makeGift({ lesson: '' }).ok, false);
  assert.match(openGift(made.code, [lessons[0]]).error, /does not have/);
  assert.match(openGift('junk', lessons).error, /not a gift/);
  // a gift made by hand cannot point anywhere but a lesson and games of this app
  const forged = openGift({ k: 'alef-gift', v: 1, l: 'r01', g: ['settings', '../x', games[0]], f: '<img>', n: 'יהוה '.repeat(80) }, lessons);
  assert.deepEqual(forged.steps.map((s) => s.href), ['#/learn?lesson=r01', `#/${games[0]}`]);
  assert.ok(forged.note.length <= 200 && !forged.note.includes('יהוה')); assert.equal(forged.from, '<img>', 'shown as text, never as markup');
  assert.equal(openGift({ k: 'alef-gift', v: 1, l: 'javascript:alert(1)' }, lessons).ok, false);
});

test('local ratings: one to five stars per lesson, game or book; suggestions come only from five-star picks', () => {
  let s = rate(null, 'game', ARCADE_GAMES[0].id, 5, T);
  s = rate(s, 'game', ARCADE_GAMES[1].id, 2, T + 1); s = rate(s, 'lesson', 'r03', 5, T + 2); s = rate(s, 'book', 'book2', 4, T + 3);
  assert.equal(ratingOf(s, 'game', ARCADE_GAMES[0].id), 5); assert.equal(ratingOf(s, 'book', 'book9'), 0);
  assert.deepEqual(rated(s, 'game').map((r) => r.stars), [5, 2]);
  assert.equal(ratingOf(rate(s, 'game', ARCADE_GAMES[0].id, 0), 'game', ARCADE_GAMES[0].id), 0, '0 clears');
  for (const bad of [[s, 'song', 'x', 5], [s, 'game', '../x', 5], [s, 'game', 'ok', 9]]) assert.deepEqual(rate(...bad).items, s.items);
  const level = ARCADE_GAMES[0].level;
  const more = moreLikeGames(s, ARCADE_GAMES, [ARCADE_GAMES[2].id]);
  assert.ok(more.length > 0 && more.length <= 5);
  assert.ok(more.every((g) => g.level === level && g.id !== ARCADE_GAMES[0].id && g.id !== ARCADE_GAMES[1].id), 'same level as the five-star game, nothing already rated');
  assert.match(more[0].why, new RegExp(`like ${ARCADE_GAMES[0].title}, which you gave 5 stars`));
  assert.deepEqual(moreLikeGames(rate(null, 'game', ARCADE_GAMES[0].id, 4), ARCADE_GAMES), [], 'nothing is suggested without a five');
  assert.deepEqual(nextAfterFives(s, 'lesson', ['r01', 'r02', 'r03', 'r04', 'r05']), ['r04']);
  assert.deepEqual(nextAfterFives(rate(s, 'lesson', 'r04', 3), 'lesson', ['r01', 'r02', 'r03', 'r04', 'r05']), ['r05']);
  assert.deepEqual(nextAfterFives(s, 'book', ['book1', 'book2']), []);
});

test('print-and-share: the sheet\'s QR code holds a link that opens that lesson in this copy of Aleph', async () => {
  assert.equal(lessonLink('r07', BASE), `${BASE}#/learn?lesson=r07`);
  const q = lessonQr('r07', BASE);
  assert.equal(q.link, `${BASE}#/learn?lesson=r07`); assert.match(q.src, /^data:image\/svg\+xml;charset=utf-8,/);
  assert.match(decodeURIComponent(q.src.slice(q.src.indexOf(',') + 1)), /^<svg[^>]*>.*<\/svg>$/s);
  const view = readFileSync(join(root, 'src/platform/worksheet.view.js'), 'utf8');
  assert.match(view, /lessonQr\(s\.id\)/); assert.match(view, /QR code that opens this lesson in Aleph/);
  assert.match(view, /Copy the Letters/, 'the worksheet that was there is still there');
});

test('no server anywhere in the lane: no fetch to another address, no network call in a model, and nothing but the lesson and book lists is read', () => {
  const dir = join(root, 'src/together');
  for (const f of readdirSync(dir)) {
    const src = readFileSync(join(dir, f), 'utf8');
    assert.ok(!/https?:\/\/(?!alef-review\.onrender\.com)/.test(src.replace(/\/\/.*$/gm, '')), `${f} names no outside address`);
    assert.ok(!/XMLHttpRequest|WebSocket|sendBeacon|EventSource|RTCPeerConnection/.test(src), f);
    if (f !== 'data.js') assert.ok(!/\bfetch\(/.test(src), `${f} does not fetch`);
  }
  assert.ok(!/\bfetch\(|localStorage\.setItem\('alef:/.test(readFileSync(join(root, 'src/shell/profile-slots.js'), 'utf8')));
});

test('wording: plain English in everything a learner reads, no talk of how anything was made', async () => {
  const BANNED = /\b(AI|A\.I\.|artificial|machine|model|neural|LLM|GPT|algorithm|generated|smart|powered)\b/i;
  const dir = join(root, 'src/together');
  for (const f of [...readdirSync(dir).map((x) => join(dir, x)), join(root, 'src/shell/profile-slots.js'), join(root, 'src/shell/together-routes.js')]) {
    const src = readFileSync(f, 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const shown = [...src.matchAll(/'((?:[^'\\\n]|\\.){10,})'|`((?:[^`\\]|\\.){10,})`/g)].map((m) => m[1] || m[2]).filter((t) => / /.test(t) && !/^[.#[]|^\s*$|import |=>|;\s*$/.test(t));
    for (const t of shown) { assert.ok(!BANNED.test(t), `${f}: "${t}"`); assert.ok(!/[—–]/.test(t), `${f}: no dash as punctuation in "${t}"`); }
  }
});
