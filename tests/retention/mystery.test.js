import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults, normalize } from '../../src/retention/state.js';
import { earn } from '../../src/retention/gems.js';
import { lessonPayout, grantMysteries, mysteryView, mysteryOpen, MYSTERIES, MYSTERY_GEMS, XP } from '../../src/retention/xp.js';

const NOW = Date.parse('2026-11-13T10:00:00');
const fresh = () => defaults(NOW, 'install-mystery');

test('a sharp finished lesson counts as one perfect lesson; a partial sitting does not', () => {
  const sharp = lessonPayout(fresh(), { awardId: 'l1', accuracy: 0.9, now: NOW });
  assert.equal(sharp.rec.perfectLessons, 1);
  assert.equal(sharp.rec.lessonsFinished, 1);
  const miss = lessonPayout(fresh(), { awardId: 'l2', accuracy: 0.89, now: NOW });
  assert.equal(miss.rec.perfectLessons, 0);
  const partial = lessonPayout(fresh(), { awardId: 'l3', accuracy: 1, now: NOW, partial: true });
  assert.equal(partial.rec.perfectLessons, 0);
  assert.equal(partial.rec.lessonsFinished, 0);
});

test('Meltdown stays sealed before 10 sharp lessons, then opens and pays 10 gems once', () => {
  const item = MYSTERIES.find((x) => x.id === 'meltdown');
  assert.equal(item.href, '#/meltdown');
  assert.equal(mysteryOpen(item, { perfect: 9 }), false);
  const closed = grantMysteries(earn(fresh(), 5, 'goal', NOW), { perfect: 9, books: 0 }, NOW);
  assert.deepEqual(closed.opened, []);
  assert.equal(closed.rec.gems.balance, 5);
  assert.equal(mysteryView(closed.rec, { perfect: 9 }).items[0].open, false);
  assert.match(mysteryView(closed.rec, { perfect: 9 }).items[0].needLine, /10 sharp lessons/);
  const open = grantMysteries(earn(fresh(), 5, 'goal', NOW), { perfect: 10, books: 0 }, NOW);
  assert.deepEqual(open.opened, ['meltdown']);
  assert.equal(open.gems, MYSTERY_GEMS);
  assert.equal(open.rec.gems.balance, 15);
  assert.equal(mysteryView(open.rec, { perfect: 10 }).items[0].open, true);
  assert.equal(mysteryView(open.rec, { perfect: 10 }).items[0].title, 'Meltdown');
  const again = grantMysteries(open.rec, { perfect: 20, books: 0 }, NOW);
  assert.deepEqual(again.opened, []);
  assert.equal(again.rec.gems.balance, 15);
});

test('Songs open after the first finished little book, from the existing Songs page', () => {
  const item = MYSTERIES.find((x) => x.id === 'songs');
  assert.equal(item.href, '#/songs');
  assert.equal(mysteryOpen(item, { books: 0 }), false);
  const open = grantMysteries(fresh(), { perfect: 0, books: 1 }, NOW);
  assert.deepEqual(open.opened, ['songs']);
  assert.equal(open.gems, 10);
  assert.equal(mysteryView(open.rec, { books: 1 }).items[1].open, true);
});

test('both mysteries can open together, and normalize keeps only known finds', () => {
  const out = grantMysteries(fresh(), { perfect: 10, books: 1 }, NOW);
  assert.deepEqual(out.opened, ['meltdown', 'songs']);
  assert.equal(out.gems, 20);
  const r = normalize({ v: 1, perfectLessons: 4, mysteries: { opened: ['meltdown', 'secret', 'songs'] } }, NOW);
  assert.equal(r.perfectLessons, 4);
  assert.deepEqual(r.mysteries.opened, ['meltdown', 'songs']);
});
