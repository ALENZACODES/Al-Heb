import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATUS_LABELS } from '../src/shell/audio-labels.js';
import { TEXT_RE, PROVENANCE_RE } from '../tools/meta/text.mjs';
import {
  TRACKS, TRACK_IDS, DEPTH_LADDER, SANCTUARY_GATE, NO_AUDIO, SESSION_NOTE, EMPTY_NOTE, SPOKEN_MARKS,
  identityTrack, itemsFromSets, completedTurnCount, computeDepth, isSpokenMark, buildSession,
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
const DAY = '2026-11-05';

function pinned(tier, extra = {}) {
  return {
    tier, lastRevealDay: DAY, today: DAY,
    turns: 80, spoken: 80, days: 21, byTrack: { table: 2, street: 2 },
    ...extra,
  };
}
function session(overrides = {}) {
  return buildSession({ seed: 'alef', items: catalog, ...overrides });
}
function flagsOn(obj) {
  for (const [k, v] of Object.entries(obj)) assert.equal(v, true, k);
}

test('preview ladder: hear-say-done first, then rhythm, street, spark, quests, sanctuary, scenes', () => {
  assert.deepEqual(TRACK_IDS, ['table', 'street', 'sanctuary']);
  assert.deepEqual(DEPTH_LADDER.map((s) => [s.tier, s.turns, s.spoken, s.days, [...s.add]]), [
    [0, 0, 0, 0, []],
    [1, 3, 0, 2, ['rhythm']],
    [2, 9, 0, 3, ['secondTrack', 'compare']],
    [3, 0, 18, 5, ['spark']],
    [4, 0, 27, 7, ['quests', 'boss']],
    [5, 0, 40, 10, ['thirdTrack']],
    [6, 0, 80, 21, ['scenes', 'arena']],
  ]);
  assert.deepEqual(SANCTUARY_GATE, { spoken: 60, days: 14, needs: ['table', 'street'] });
  assert.deepEqual([...SPOKEN_MARKS], ['Said it', 'With help']);
  assert.equal(isSpokenMark('Said it'), true);
  assert.equal(isSpokenMark('With help'), true);
  assert.equal(isSpokenMark('with-help'), true);
  assert.equal(isSpokenMark('Heard only'), false);
  assert.equal(isSpokenMark(''), false);
});

test('turn count: dates and clock readings stay at zero', () => {
  assert.equal(completedTurnCount(0), 0);
  assert.equal(completedTurnCount(-3), 0);
  assert.equal(completedTurnCount(2.9), 2);
  assert.equal(completedTurnCount('2026-11-05'), 0);
  assert.equal(completedTurnCount('6'), 0);
  assert.equal(completedTurnCount(Number.NaN), 0);
  assert.equal(completedTurnCount(Number.POSITIVE_INFINITY), 0);
  assert.equal(completedTurnCount(1_700_000_000_000), 0);
  assert.equal(completedTurnCount(new Date('2026-11-05')), 0);
});

test('computeDepth: both the practice count and the distinct days, one reveal a day, tier stays up', () => {
  const none = computeDepth();
  assert.equal(none.tier, 0);
  assert.deepEqual(none.features, { hear: true, say: true, done: true });
  assert.deepEqual(none.tracks, ['table']);
  assert.equal(none.lastRevealDay, null);
  flagsOn(none.features);

  assert.equal(computeDepth({ turns: 3, days: 1, today: DAY }).tier, 0);
  assert.equal(computeDepth({ turns: 2, days: 2, today: DAY }).tier, 0);
  const rhythm = computeDepth({ turns: 3, days: 2, today: DAY });
  assert.equal(rhythm.tier, 1);
  assert.equal(rhythm.features.rhythm, true);
  assert.equal('compare' in rhythm.features, false);
  assert.equal('secondTrack' in rhythm.features, false);
  assert.equal(rhythm.lastRevealDay, DAY);
  assert.deepEqual(computeDepth({ turns: 3, days: ['2026-11-04', '2026-11-04', '2026-11-05'], today: DAY }).tier, 1);

  const sameDay = computeDepth({ turns: 80, spoken: 80, days: 21, byTrack: { table: 2, street: 2 }, tier: 1, lastRevealDay: DAY, today: DAY });
  assert.equal(sameDay.tier, 1);
  assert.equal('spark' in sameDay.features, false);

  const street = computeDepth({ turns: 9, days: 3, tier: 1, lastRevealDay: '2026-11-04', today: DAY });
  assert.equal(street.tier, 2);
  assert.equal(street.features.secondTrack, true);
  assert.equal(street.features.compare, true);
  assert.deepEqual(street.tracks, ['table', 'street']);
  assert.equal(computeDepth({ turns: 9, days: 2, tier: 1, lastRevealDay: '2026-11-04', today: DAY }).tier, 1);

  const heardOnly = computeDepth({ turns: 40, spoken: 10, days: 10, tier: 2, lastRevealDay: '2026-11-04', today: DAY });
  assert.equal(heardOnly.tier, 2);
  assert.equal('spark' in heardOnly.features, false);
  const spark = computeDepth({ turns: 18, spoken: 18, days: 5, tier: 2, lastRevealDay: '2026-11-04', today: DAY });
  assert.equal(spark.tier, 3);
  assert.equal(spark.features.spark, true);
  assert.equal('quests' in spark.features, false);

  const quests = computeDepth({ spoken: 27, days: 7, tier: 3, lastRevealDay: '2026-11-04', today: DAY });
  assert.equal(quests.tier, 4);
  assert.equal(quests.features.quests, true);
  assert.equal(quests.features.boss, true);
  assert.equal('thirdTrack' in quests.features, false);

  const third = computeDepth({ spoken: 40, days: 10, byTrack: { table: 2, street: 2 }, tier: 4, lastRevealDay: '2026-11-04', today: DAY });
  assert.equal(third.tier, 5);
  assert.equal(third.features.thirdTrack, true);
  assert.equal('sanctuary' in third.features, false);
  assert.deepEqual(third.tracks, ['table', 'street']);
  const quietStreet = computeDepth({ spoken: 60, days: 14, byTrack: { table: 3, street: 0 }, tier: 5, lastRevealDay: DAY, today: DAY });
  assert.equal('sanctuary' in quietStreet.features, false);
  const sanctuary = computeDepth({ spoken: 60, days: 14, byTrack: { table: 3, street: 2 }, tier: 5, lastRevealDay: DAY, today: DAY });
  assert.equal(sanctuary.tier, 5);
  assert.equal(sanctuary.features.sanctuary, true);
  assert.deepEqual(sanctuary.tracks, ['table', 'street', 'sanctuary']);
  assert.equal('scenes' in sanctuary.features, false);

  const scenes = computeDepth({ spoken: 80, days: 21, byTrack: { table: 1, street: 1 }, tier: 5, lastRevealDay: '2026-11-04', today: DAY });
  assert.equal(scenes.tier, 6);
  assert.equal(scenes.features.scenes, true);
  assert.equal(scenes.features.arena, true);
  assert.equal(scenes.features.sanctuary, true);
  flagsOn(scenes.features);

  const binge = computeDepth({ turns: 80, spoken: 80, days: 21, byTrack: { table: 4, street: 4 }, today: DAY });
  assert.equal(binge.tier, 1);
  assert.deepEqual(Object.keys(binge.features), ['hear', 'say', 'done', 'rhythm']);

  let tier = 0;
  let last = null;
  const rich = { turns: 80, spoken: 80, days: 21, byTrack: { table: 2, street: 2 } };
  for (let d = 1; d <= 8; d++) {
    const today = `2026-11-${String(d).padStart(2, '0')}`;
    const got = computeDepth({ ...rich, tier, lastRevealDay: last, today });
    assert.ok(got.tier === tier || got.tier === tier + 1);
    assert.ok(got.tier >= tier);
    tier = got.tier;
    last = got.lastRevealDay;
  }
  assert.equal(tier, 6);

  const kept = computeDepth({ turns: 0, spoken: 0, days: 0, tier: 4, lastRevealDay: '2026-11-01', today: DAY });
  assert.equal(kept.tier, 4);
  assert.equal(kept.features.quests, true);
  assert.equal(kept.features.boss, true);
  assert.equal('scenes' in kept.features, false);
  assert.equal(kept.lastRevealDay, '2026-11-01');
  const keptSanctuary = computeDepth({ tier: 5, sanctuary: true, lastRevealDay: DAY, today: DAY });
  assert.equal(keptSanctuary.features.sanctuary, true);
  assert.equal(computeDepth({ turns: 80, spoken: 80, days: 21, today: new Date(DAY) }).tier, 0);
  assert.equal(computeDepth({ turns: 9, days: Date.now(), today: DAY }).tier, 0);
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

test('tier 0 is one table turn: Hear, Say, Done, and no later flags', () => {
  const s = session();
  assert.equal(s.kind, 'speak-dss');
  assert.equal(s.preview, true);
  assert.equal(s.tier, 0);
  assert.equal(s.sessionSize, 1);
  assert.equal(s.turnCount, 1);
  assert.equal(s.items.length, 1);
  assert.equal(s.items[0].track, 'table');
  assert.deepEqual(s.tracks, ['table']);
  assert.deepEqual(s.mix, { table: 1 });
  assert.deepEqual(s.features, { hear: true, say: true, done: true });
  assert.deepEqual(s.ui, { hear: true, say: true, done: true });
  assert.equal(s.lastRevealDay, null);
  assert.equal(s.note, SESSION_NOTE);
  assert.equal(s.note, 'Hear it, say it, then done.');
  assert.equal('rhythm' in s.ui, false);
  assert.equal('spark' in s.features, false);
  assert.ok(!schoolIds.has(s.items[0].id));
  const keys = ['kind', 'preview', 'seed', 'tier', 'tracks', 'sessionSize', 'turnCount', 'items', 'mix', 'features', 'ui', 'lastRevealDay', 'note'];
  assert.deepEqual(Object.keys(s), keys);
  flagsOn(s.ui);
});

test('the same seed rebuilds the same session; another seed can choose other lines', () => {
  const stats = pinned(6);
  const a = session({ seed: 'same', stats });
  const b = session({ seed: 'same', stats, items: catalog.slice().reverse() });
  const c = buildSession({ seed: 'same', stats, items: catalog });
  assert.deepEqual(a, b);
  assert.deepEqual(a, c);
  assert.deepEqual(buildSession({ seed: 7, items: catalog }), buildSession({ seed: '7', items: catalog }));
  const ids = new Set();
  for (let n = 0; n < 12; n++) {
    const once = session({ seed: `s${n}`, stats });
    const twice = session({ seed: `s${n}`, stats });
    assert.deepEqual(once, twice);
    ids.add(once.items.map((it) => it.id).join('|'));
  }
  assert.ok(ids.size > 1, 'seeds should not all pick the same three lines');
});

test('open tracks mix one line each, and a new tier can change the line', () => {
  const first = session({ seed: 'journey' });
  const again = session({ seed: 'journey', stats: pinned(0) });
  assert.equal(first.tier, 0);
  assert.equal(again.tier, 0);
  assert.equal(first.items.length, 1);
  assert.equal(again.items[0].id, first.items[0].id);
  const nextTier = session({ seed: 'journey', stats: pinned(1) });
  assert.equal(nextTier.tier, 1);
  assert.equal(nextTier.items.length, 1);
  assert.equal(nextTier.items[0].track, 'table');
  const street = session({ seed: 'journey', stats: pinned(2) });
  assert.deepEqual(street.mix, { table: 1, street: 1 });
  assert.deepEqual(street.tracks, ['table', 'street']);
  assert.equal(street.ui.compare, true);
  assert.equal('spark' in street.ui, false);
  assert.equal('sanctuary' in street.features, false);
  const wide = session({ seed: 'journey', stats: pinned(6) });
  assert.equal(wide.turnCount, 3);
  assert.deepEqual(wide.mix, { table: 1, street: 1, sanctuary: 1 });
  assert.equal(new Set(wide.items.map((it) => it.track)).size, 3);
  assert.equal(wide.ui.scenes, true);
  assert.equal(wide.ui.arena, true);
  const orders = new Set();
  for (let n = 0; n < 24; n++) orders.add(session({ seed: `o${n}`, stats: pinned(6) }).items.map((it) => it.track).join(','));
  assert.ok(orders.size > 1, 'the track order should vary with the seed');
  const held = session({ seed: 'journey', stats: pinned(5, { spoken: 40, days: 10 }) });
  assert.equal(held.tier, 5);
  assert.deepEqual(held.tracks, ['table', 'street']);
  assert.equal(held.turnCount, 2);
});

test('feature flags on the session are present only when open', () => {
  const early = session({ stats: pinned(2) });
  assert.equal(early.features.rhythm, true);
  assert.equal(early.features.compare, true);
  assert.equal('spark' in early.features, false);
  assert.equal('spark' in early.ui, false);
  assert.equal('secondTrack' in early.ui, false);
  const spark = session({ stats: pinned(3) });
  assert.equal(spark.features.spark, true);
  assert.equal(spark.ui.spark, true);
  assert.equal('quests' in spark.ui, false);
  assert.equal(spark.turnCount, 2);
  const boss = session({ stats: pinned(4) });
  assert.equal(boss.ui.quests, true);
  assert.equal(boss.ui.boss, true);
  assert.equal('scenes' in boss.ui, false);
  assert.equal(boss.turnCount, 2);
  const top = session({ stats: pinned(6) });
  flagsOn(top.features);
  flagsOn(top.ui);
  assert.equal('odds' in top, false);
  assert.equal('pity' in top, false);
  assert.equal('cap' in top, false);
  assert.equal('rank' in top, false);
  for (const it of top.items) {
    assert.equal('score' in it, false);
    assert.equal('grade' in it, false);
    assert.equal('rank' in it, false);
  }
});

test('a line already said waits behind a new one, and a phrase leads a speak turn', () => {
  const word = { ...food.items[0], set: food.id, theme: food.theme, pack: food.pack, sourceTrack: food.track, kind: 'word' };
  const phrase = { ...food.items[1], set: food.id, theme: food.theme, pack: food.pack, sourceTrack: food.track, kind: 'phrase' };
  const picked = buildSession({ seed: 'p', items: [word, phrase] });
  assert.equal(picked.items[0].id, String(phrase.id));
  const again = buildSession({ seed: 'p', items: [word, phrase], recentIds: [phrase.id] });
  assert.equal(again.items[0].id, String(word.id));
  const first = session({ seed: 'recall' });
  const next = session({ seed: 'recall', recentIds: [first.items[0].id] });
  assert.notEqual(next.items[0].id, first.items[0].id);
  const allIds = catalog.filter((it) => identityTrack(it) === 'table').map((it) => it.id);
  const still = session({ seed: 'recall', recentIds: allIds });
  assert.equal(still.turnCount, 1);
  const street = session({ seed: 'phrase-street', stats: pinned(2) });
  assert.equal(street.items.find((it) => it.track === 'street').kind, 'phrase');
});

test('missing catalog audio uses the shared missing line; an id is unchecked and uncounted', () => {
  assert.equal(NO_AUDIO, 'No audio yet');
  assert.equal(NO_AUDIO, STATUS_LABELS.missing);
  const he = food.items[0].he;
  const quiet = buildSession({
    seed: 1,
    items: [{ id: 'quiet', he, translit: 'x', en: 'x', kind: 'word', theme: 'food-drink', audioId: null }],
  });
  assert.equal(quiet.items[0].audioId, null);
  assert.equal(quiet.items[0].audioState, 'none');
  assert.equal(quiet.items[0].hearLabel, 'No audio yet');
  const named = buildSession({
    seed: 1,
    items: [{ id: 'named', he, kind: 'word', theme: 'food-drink', audioId: food.items[0].audioId }],
  });
  assert.equal(named.items[0].audioId, food.items[0].audioId);
  assert.equal(named.items[0].audioState, 'unchecked');
  assert.equal(named.items[0].hearLabel, null);
  const wide = session({ stats: pinned(6) });
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
  const early = buildSession({ seed: 'empty', items: streetOnly });
  assert.deepEqual(early.items, []);
  assert.equal(early.turnCount, 0);
  assert.equal(early.note, EMPTY_NOTE);
  assert.equal(early.tier, 0);
  assert.deepEqual(early.ui, { hear: true, say: true, done: true });
  const none = buildSession();
  assert.equal(none.turnCount, 0);
  assert.equal(none.note, EMPTY_NOTE);
  assert.doesNotThrow(() => buildSession(null));
  assert.doesNotThrow(() => buildSession({ items: [null, 1, { he: '' }, { id: '', he: food.items[0].he }], stats: { turns: 'yesterday', today: 5 } }));
  const lone = buildSession({ seed: 1, items: [{ id: 'name', he: '\u05D9\u05D4\u05D5\u05D4', track: 'table' }] });
  assert.equal(lone.items.length, 0);
  const before = catalog.map((it) => it.id);
  session({ stats: pinned(6), recentIds: before.slice(0, 3) });
  assert.deepEqual(catalog.map((it) => it.id), before);
  const noSanctuary = buildSession({ seed: 'empty', items: streetOnly, stats: pinned(2) });
  assert.ok(noSanctuary.items.every((it) => it.track === 'street'));
  assert.equal('sanctuary' in noSanctuary.features, false);
});

test('later tracks stay closed until their tier, and school items never enter', () => {
  const start = session();
  const ids = new Set(catalog.filter((it) => identityTrack(it) === 'table').map((it) => String(it.id)));
  assert.ok(ids.has(start.items[0].id));
  const top = session({ stats: pinned(6) });
  assert.equal(top.tier, 6);
  assert.ok(top.items.every((it) => !schoolIds.has(it.id)));
  assert.equal(top.turnCount, 3);
  const clock = session({ stats: { turns: 80, spoken: 80, days: 21, today: DAY } });
  assert.equal(clock.tier, 1);
  assert.equal(clock.turnCount, 1);
  assert.deepEqual(clock.tracks, ['table']);
});

test('learner-facing lines stay short and carry no counts, scores, or tool names', () => {
  const lines = [SESSION_NOTE, EMPTY_NOTE, NO_AUDIO, ...SPOKEN_MARKS, ...TRACKS.flatMap((t) => [t.label, t.blurb])];
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
