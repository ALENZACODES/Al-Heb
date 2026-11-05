import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATUS_LABELS } from '../src/shell/audio-labels.js';
import { TEXT_RE, PROVENANCE_RE } from '../tools/meta/text.mjs';
import {
  TRACKS, TRACK_IDS, DEPTH_LADDER, NO_AUDIO, SESSION_NOTE, EMPTY_NOTE,
  identityTrack, itemsFromSets, completedTurnCount, depthFor, buildSession,
} from '../src/speak/dss.model.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readSet = (id) => JSON.parse(readFileSync(join(root, 'data/speak/sets', `${id}.json`), 'utf8'));

const food = readSet('speak-food-drink-1');
const foodIsrael = readSet('speak-food-drink-2');
const family = readSet('speak-people-family-1');
const home = readSet('speak-home-things-1');
const cafe = readSet('speak-survival-cafe-1');
const greetings = readSet('speak-survival-greetings-1');
const places = readSet('speak-places-travel-1');
const prayer = readSet('speak-religion-prayer-1');
const readLesson = readSet('speak-survival-lesson-read-1');
const school = readSet('speak-school-learning-1');
const science = readSet('speak-science-ideas-1');

const catalog = itemsFromSets([food, family, home, cafe, greetings, places, prayer, readLesson, school, science, foodIsrael]);
const schoolIds = new Set(itemsFromSets([school, science]).map((it) => String(it.id)));

function session(overrides = {}) {
  return buildSession({ seed: 'alef', items: catalog, ...overrides });
}

test('preview ladder: one table line first, then street, then sanctuary, then feature flags', () => {
  assert.deepEqual(TRACK_IDS, ['table', 'street', 'sanctuary']);
  assert.deepEqual(DEPTH_LADDER.map((s) => [s.level, s.minTurns, [...s.tracks], s.sessionSize, s.spark, s.quests, s.bossPhrase]), [
    ['start', 0, ['table'], 1, false, false, false],
    ['table', 1, ['table'], 1, false, false, false],
    ['street', 3, ['table', 'street'], 2, false, false, false],
    ['sanctuary', 6, ['table', 'street', 'sanctuary'], 3, false, false, false],
    ['spark', 9, ['table', 'street', 'sanctuary'], 3, true, false, false],
    ['quests', 12, ['table', 'street', 'sanctuary'], 3, true, true, false],
    ['boss', 15, ['table', 'street', 'sanctuary'], 3, true, true, true],
  ]);
  for (const s of DEPTH_LADDER) assert.ok(s.sessionSize === s.tracks.length && s.sessionSize <= 3);
});

test('turn count: dates and clock readings stay on the first session', () => {
  assert.equal(completedTurnCount(0), 0);
  assert.equal(completedTurnCount(-3), 0);
  assert.equal(completedTurnCount(2.9), 2);
  assert.equal(completedTurnCount('2026-11-05'), 0);
  assert.equal(completedTurnCount('6'), 0);
  assert.equal(completedTurnCount(Number.NaN), 0);
  assert.equal(completedTurnCount(Number.POSITIVE_INFINITY), 0);
  assert.equal(completedTurnCount(1_700_000_000_000), 0);
  assert.equal(completedTurnCount(new Date('2026-11-05')), 0);
  assert.equal(depthFor(0).depthTier, 0);
  assert.equal(depthFor(0).unlockLevel, 'start');
  assert.equal(depthFor(1).unlockLevel, 'table');
  assert.equal(depthFor(2).depthTier, 1);
  assert.equal(depthFor(3).unlockLevel, 'street');
  assert.equal(depthFor(5).unlockLevel, 'street');
  assert.equal(depthFor(6).unlockLevel, 'sanctuary');
  assert.equal(depthFor(8).features.spark, false);
  assert.equal(depthFor(9).features.spark, true);
  assert.equal(depthFor(9).features.quests, false);
  assert.equal(depthFor(12).features.quests, true);
  assert.equal(depthFor(12).features.bossPhrase, false);
  assert.equal(depthFor(15).features.bossPhrase, true);
  assert.equal(depthFor(1_700_000_000_000).unlockLevel, 'start');
  assert.deepEqual(depthFor(6).tracks, ['table', 'street', 'sanctuary']);
  assert.equal(depthFor(6).sessionSize, 3);
});

test('catalog rows land on table, street, or sanctuary, and the rest stay out', () => {
  const row = (set, item = set.items[0]) => ({ ...item, set: set.id, theme: set.theme, pack: set.pack, sourceTrack: set.track });
  assert.equal(identityTrack(row(food)), 'table');
  assert.equal(identityTrack(row(family)), 'table');
  assert.equal(identityTrack(row(home)), 'table');
  assert.equal(identityTrack(row(foodIsrael)), 'table');
  assert.equal(identityTrack(row(cafe)), 'street');
  assert.equal(identityTrack(row(greetings)), 'street');
  assert.equal(identityTrack(row(places)), 'street');
  assert.equal(identityTrack(row(prayer)), 'sanctuary');
  assert.equal(identityTrack(row(readLesson)), 'sanctuary');
  assert.equal(identityTrack(row(school)), null);
  assert.equal(identityTrack(row(science)), null);
  const he = food.items[0].he;
  assert.equal(identityTrack({ id: 'explicit', he, identity: 'sanctuary', theme: 'food-drink' }), 'sanctuary');
  assert.equal(identityTrack({ id: 'named', he, track: 'street', theme: 'food-drink' }), 'street');
  assert.equal(identityTrack({ id: 'pray', he, kind: 'prayer' }), 'sanctuary');
  assert.equal(identityTrack(null), null);
});

test('tier 0 is one table turn, with the short note and no later tracks', () => {
  const s = session({ completedTurns: 0 });
  assert.equal(s.kind, 'speak-dss');
  assert.equal(s.preview, true);
  assert.equal(s.depthTier, 0);
  assert.equal(s.unlockLevel, 'start');
  assert.equal(s.sessionSize, 1);
  assert.equal(s.turnCount, 1);
  assert.equal(s.items.length, 1);
  assert.equal(s.items[0].track, 'table');
  assert.deepEqual(s.tracks, ['table']);
  assert.deepEqual(s.mix, { table: 1 });
  assert.deepEqual(s.features, { spark: false, quests: false, bossPhrase: false });
  assert.equal(s.note, SESSION_NOTE);
  assert.equal(s.note, 'Say the line, then mark how it went.');
  assert.ok(!schoolIds.has(s.items[0].id));
  const keys = ['kind', 'preview', 'seed', 'depthTier', 'unlockLevel', 'tracks', 'sessionSize', 'turnCount', 'items', 'mix', 'features', 'note'];
  assert.deepEqual(Object.keys(s), keys);
});

test('the same seed rebuilds the same session; another seed can choose other lines', () => {
  const a = session({ seed: 'same', completedTurns: 6 });
  const b = session({ seed: 'same', completedTurns: 6, items: catalog.slice().reverse() });
  const c = buildSession({ seed: 'same', completedTurns: 6, items: catalog });
  assert.deepEqual(a, b);
  assert.deepEqual(a, c);
  assert.deepEqual(buildSession({ seed: 7, items: catalog, completedTurns: 0 }), buildSession({ seed: '7', items: catalog, completedTurns: 0 }));
  const ids = new Set();
  for (let n = 0; n < 12; n++) {
    const once = session({ seed: `s${n}`, completedTurns: 6 });
    const twice = session({ seed: `s${n}`, completedTurns: 6 });
    assert.deepEqual(once, twice);
    ids.add(once.items.map((it) => it.id).join('|'));
  }
  assert.ok(ids.size > 1, 'seeds should not all pick the same three lines');
});

test('a finished turn count changes the line, and the open tracks stay a mix', () => {
  const first = session({ seed: 'journey', completedTurns: 0 });
  const second = session({ seed: 'journey', completedTurns: 1 });
  assert.equal(first.depthTier, 0);
  assert.equal(second.unlockLevel, 'table');
  assert.equal(first.items.length, 1);
  assert.equal(second.items.length, 1);
  assert.notEqual(first.items[0].id, second.items[0].id);
  const street = session({ seed: 'journey', completedTurns: 3 });
  assert.deepEqual(street.mix, { table: 1, street: 1 });
  assert.deepEqual(street.tracks, ['table', 'street']);
  assert.ok(street.items.every((it) => it.track !== 'sanctuary'));
  const wide = session({ seed: 'journey', completedTurns: 6 });
  assert.equal(wide.turnCount, 3);
  assert.deepEqual(wide.mix, { table: 1, street: 1, sanctuary: 1 });
  assert.equal(new Set(wide.items.map((it) => it.track)).size, 3);
  const orders = new Set();
  for (let n = 0; n < 24; n++) orders.add(session({ seed: `o${n}`, completedTurns: 6 }).items.map((it) => it.track).join(','));
  assert.ok(orders.size > 1, 'the track order should vary with the seed');
});

test('feature flags open late and the session stays three lines', () => {
  const early = session({ completedTurns: 6 });
  assert.deepEqual(early.features, { spark: false, quests: false, bossPhrase: false });
  const spark = session({ completedTurns: 9 });
  const boss = session({ completedTurns: 15 });
  assert.equal(spark.features.spark, true);
  assert.equal(spark.features.quests, false);
  assert.equal(spark.turnCount, 3);
  assert.equal(boss.unlockLevel, 'boss');
  assert.deepEqual(boss.features, { spark: true, quests: true, bossPhrase: true });
  assert.equal(boss.turnCount, 3);
  assert.equal(boss.sessionSize, 3);
  assert.equal('spark' in boss, false);
  assert.equal('odds' in boss, false);
  assert.equal('pity' in boss, false);
  assert.equal('cap' in boss, false);
  assert.equal('bossPhrase' in boss, false);
  assert.equal('rank' in boss, false);
  for (const it of boss.items) {
    assert.equal('score' in it, false);
    assert.equal('grade' in it, false);
    assert.equal('rank' in it, false);
  }
});

test('a line already said waits behind a new one, and a phrase leads a speak turn', () => {
  const word = { ...food.items[0], set: food.id, theme: food.theme, pack: food.pack, sourceTrack: food.track, kind: 'word' };
  const phrase = { ...food.items[1], set: food.id, theme: food.theme, pack: food.pack, sourceTrack: food.track, kind: 'phrase' };
  const picked = buildSession({ seed: 'p', items: [word, phrase], completedTurns: 0 });
  assert.equal(picked.items[0].id, String(phrase.id));
  const again = buildSession({ seed: 'p', items: [word, phrase], completedTurns: 0, recentIds: [phrase.id] });
  assert.equal(again.items[0].id, String(word.id));
  const first = session({ seed: 'recall', completedTurns: 0 });
  const next = session({ seed: 'recall', completedTurns: 0, recentIds: [first.items[0].id] });
  assert.notEqual(next.items[0].id, first.items[0].id);
  const allIds = catalog.filter((it) => identityTrack(it) === 'table').map((it) => it.id);
  const still = session({ seed: 'recall', completedTurns: 0, recentIds: allIds });
  assert.equal(still.turnCount, 1);
  const street = session({ seed: 'phrase-street', completedTurns: 3 });
  assert.equal(street.items.find((it) => it.track === 'street').kind, 'phrase');
});

test('missing catalog audio uses the shared missing line; an id is unchecked and uncounted', () => {
  assert.equal(NO_AUDIO, 'No audio yet');
  assert.equal(NO_AUDIO, STATUS_LABELS.missing);
  const he = food.items[0].he;
  const quiet = buildSession({
    seed: 1,
    completedTurns: 0,
    items: [{ id: 'quiet', he, translit: 'x', en: 'x', kind: 'word', theme: 'food-drink', audioId: null }],
  });
  assert.equal(quiet.items[0].audioId, null);
  assert.equal(quiet.items[0].audioState, 'none');
  assert.equal(quiet.items[0].hearLabel, 'No audio yet');
  const named = buildSession({
    seed: 1,
    completedTurns: 0,
    items: [{ id: 'named', he, kind: 'word', theme: 'food-drink', audioId: food.items[0].audioId }],
  });
  assert.equal(named.items[0].audioId, food.items[0].audioId);
  assert.equal(named.items[0].audioState, 'unchecked');
  assert.equal(named.items[0].hearLabel, null);
  const wide = session({ completedTurns: 6 });
  for (const it of wide.items) {
    if (it.audioId) assert.equal(it.hearLabel, null);
    else assert.equal(it.hearLabel, NO_AUDIO);
    assert.ok(it.audioState === 'none' || it.audioState === 'unchecked');
  }
  assert.equal(JSON.stringify(wide).includes('audioCount'), false);
  assert.equal(JSON.stringify(wide).includes('imageCount'), false);
});

test('an empty table pool does not borrow a later track, and bad input stays quiet', () => {
  const streetOnly = itemsFromSets([cafe, greetings, prayer]);
  const early = buildSession({ seed: 'empty', items: streetOnly, completedTurns: 0 });
  assert.deepEqual(early.items, []);
  assert.equal(early.turnCount, 0);
  assert.equal(early.note, EMPTY_NOTE);
  assert.equal(early.depthTier, 0);
  const none = buildSession();
  assert.equal(none.turnCount, 0);
  assert.equal(none.note, EMPTY_NOTE);
  assert.doesNotThrow(() => buildSession(null));
  assert.doesNotThrow(() => buildSession({ items: [null, 1, { he: '' }, { id: '', he: food.items[0].he }], completedTurns: 'yesterday' }));
  const lone = buildSession({ seed: 1, items: [{ id: 'name', he: '\u05D9\u05D4\u05D5\u05D4', track: 'table' }] });
  assert.equal(lone.items.length, 0);
  const before = catalog.map((it) => it.id);
  session({ completedTurns: 15, recentIds: before.slice(0, 3) });
  assert.deepEqual(catalog.map((it) => it.id), before);
});

test('later tracks stay closed until their turn count, and school items never enter', () => {
  const start = session({ completedTurns: 0 });
  const ids = new Set(catalog.filter((it) => identityTrack(it) === 'table').map((it) => String(it.id)));
  assert.ok(ids.has(start.items[0].id));
  const top = session({ completedTurns: 100 });
  assert.equal(top.unlockLevel, 'boss');
  assert.ok(top.items.every((it) => !schoolIds.has(it.id)));
  assert.equal(top.turnCount, 3);
  const clock = session({ completedTurns: Date.now() });
  assert.equal(clock.unlockLevel, 'start');
  assert.equal(clock.turnCount, 1);
});

test('learner-facing lines stay short and carry no counts, scores, or tool names', () => {
  const lines = [SESSION_NOTE, EMPTY_NOTE, NO_AUDIO, ...TRACKS.flatMap((t) => [t.label, t.blurb])];
  for (const line of lines) {
    assert.equal(typeof line, 'string');
    assert.match(line, /\S/);
    assert.doesNotMatch(line, /\d/);
    assert.doesNotMatch(line, /grade|score|pronunciation|spark|quest|boss|streak|rank/i);
    assert.equal(TEXT_RE.test(line), false, line);
    assert.equal(PROVENANCE_RE.test(line), false, line);
  }
  assert.ok(SESSION_NOTE.length < 80);
  const src = readFileSync(join(root, 'src/speak/dss.model.js'), 'utf8');
  for (const [i, ln] of src.split('\n').entries()) {
    assert.equal(TEXT_RE.test(ln), false, `model line ${i + 1}`);
    assert.equal(PROVENANCE_RE.test(ln), false, `model line ${i + 1}`);
  }
  const extra = ['gr' + 'ok', 'run' + 'pod'];
  for (const w of extra) assert.equal(src.toLowerCase().includes(w), false, w);
  assert.doesNotMatch(src, /\b87\b|withClip|audioCount|imageCount|approved images|grades pronunciation|pronunciation score/i);
  assert.doesNotMatch(src, /new Date|Date\.now/);
});
