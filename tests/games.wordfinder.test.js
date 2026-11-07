import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { N, memStore, tick } from './torahread.fakedom.js';
import { matchRoute } from '../src/shell/router.js';
import { GAMES, LEVEL_BY_GAME } from '../src/games/games.view.js';
import { assertWordBank, recordFound, nextRound, choiceWords, STORE_KEY } from '../src/games/wordfinder.model.js';
import { mount } from '../src/games/wordfinder.view.js';

const bankData = JSON.parse(readFileSync(new URL('../data/games/firstwords.json', import.meta.url), 'utf8'));
const indexData = JSON.parse(readFileSync(new URL('../data/vocab/index.json', import.meta.url), 'utf8'));
const bank = assertWordBank(bankData);

test('Word Finder: 240 distinct sourced pointed Hebrew words, first 24 truly easy', () => {
  assert.equal(bank.length, 240);
  assert.equal(new Set(bank.map((w) => w.id)).size, 240);
  assert.equal(new Set(bank.map((w) => w.he)).size, 240);
  assert.ok(bankData.status.includes('native-educator review'));
  const sourceById = new Map(indexData.rows.map((row) => [row[0], row]));
  for (const w of bank) {
    const src = sourceById.get(w.id);
    assert.ok(src, 'word id exists in source: ' + w.id);
    assert.equal(w.he, src[1], 'copied pointed Hebrew: ' + w.id);
    assert.equal(w.translit, src[11], 'copied pronunciation guide: ' + w.id);
    assert.match(w.he, /[\u05B0-\u05C7]/u);
    assert.ok(w.en.length && w.use.length && w.theme.length);
  }
  assert.deepEqual(bank.slice(0, 5).map((w) => w.en),
    ['hello / peace', 'yes', 'no / not', 'thank you', 'please / you\'re welcome']);
});

test('Word Finder: five new words per gentle round, then review without resetting all progress', () => {
  let progress = { found: [] };
  const first = nextRound(bank, progress);
  assert.equal(first.length, 5);
  assert.deepEqual(first.map((w) => w.id), bank.slice(0, 5).map((w) => w.id));
  for (const w of first) progress = recordFound(progress, w.id, bank);
  assert.equal(progress.found.length, 5);
  assert.equal(nextRound(bank, progress)[0].id, bank[5].id);
  for (let i = 5; i < 24; i++) progress = recordFound(progress, bank[i].id, bank);
  const review = nextRound(bank, progress, 'first', 5, () => 0);
  assert.equal(review.length, 5);
  assert.ok(review.every((w) => progress.found.includes(w.id)));
  assert.equal(nextRound(bank, progress, 'all')[0].id, bank[24].id);
  assert.equal(nextRound(bank, progress, 'Food & drinks').length, 5);
  const duplicate = recordFound(progress, bank[0].id, bank);
  assert.equal(duplicate.found.length, progress.found.length);
});

test('Word Finder: three distinct choices, only one target and no made-up alternatives', () => {
  const allIds = new Set(bank.map((w) => w.id));
  for (const word of bank) {
    for (const rng of [() => 0, () => .55, () => .999]) {
      const choices = choiceWords(bank, word, 3, rng);
      assert.equal(choices.length, 3);
      assert.equal(new Set(choices.map((w) => w.id)).size, 3);
      assert.equal(choices.filter((w) => w.id === word.id).length, 1);
      assert.ok(choices.every((w) => allIds.has(w.id)));
    }
  }
});

test('Every existing game has a suggested skill level 1–9 without reclassifying as certified', () => {
  assert.equal(GAMES.length, 25);
  assert.equal(Object.keys(LEVEL_BY_GAME).length, 26);
  assert.equal(LEVEL_BY_GAME.wordfinder, 1);
  for (const [id] of GAMES) assert.ok(LEVEL_BY_GAME[id] >= 1 && LEVEL_BY_GAME[id] <= 9);
  assert.deepEqual([...new Set(Object.values(LEVEL_BY_GAME))].sort((a, b) => a - b), [1,2,3,4,5,6,7,8,9]);
  const route = matchRoute('#/wordfinder').route;
  assert.equal(route?.title, 'Hebrew Word Finder — Level 1');
  assert.equal(route?.module, '../games/wordfinder.view.js');
  assert.equal(route?.tier, 'preview');
});

test('Day-0 view loads a lesson, asks a three-card find question, and saves only a found word', async () => {
  const root = new N('div');
  const store = memStore();
  const ctx = {
    store,
    settings: { get: () => false },
    fetchFn: async () => ({ ok: true, json: async () => bankData }),
    audio: { play: async () => ({ source: 'none', reason: 'no-clip' }) },
  };
  const unmount = mount(root, ctx);
  await tick(40);
  assert.ok(root.querySelector('.wf-word-card'), 'first word visible');
  assert.match(root.textContent, /Never heard Hebrew before/);
  assert.equal(store.get(STORE_KEY), undefined, 'no progress granted for merely viewing');
  await root.querySelector('button.wf-next').click();
  const buttons = root.queryAll('button.wf-choice');
  assert.equal(buttons.length, 3);
  const wrong = buttons.find((b) => !b.textContent.includes(bank[0].he));
  assert.ok(wrong);
  await wrong.click();
  assert.equal(store.get(STORE_KEY), undefined, 'wrong tap is not counted as found');
  const correct = root.queryAll('button.wf-choice').find((b) => b.textContent.includes(bank[0].he));
  assert.ok(correct);
  await correct.click();
  assert.deepEqual(store.get(STORE_KEY).found, [bank[0].id]);
  assert.match(root.textContent, /You found it/);
  await root.querySelector('button.wf-next').click();
  assert.ok(root.querySelector('.wf-word-card'), 'next learn card appears');
  unmount();
});
