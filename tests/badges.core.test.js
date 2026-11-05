import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'preview/loops/badges.catalog.json'), 'utf8'));
const B = await import('../preview/loops/badges.js');
const { clean, cleanBadges, mergeDay } = await import('../preview/loops/store.js');
const { rhythm } = await import('../preview/loops/rhythm.js');
const { addDaysISO } = await import('../src/curriculum/streak.js');

const T = '2026-11-10';
const ev = (facts, rec = null, today = T) => B.evaluate({ catalog, facts, rec, today });
const get = (res, id) => res.badges.earned[id] || {};

test('catalogue: every badge has three ascending levels, three earn texts, a hint and a known family and glyph', () => {
  const fams = new Set(catalog.families.map((f) => f.id)), ids = new Set();
  assert.deepEqual(catalog.levelNames, ['First', 'Steady', 'Deep']);
  for (const b of catalog.badges) {
    assert.ok(!ids.has(b.id), b.id); ids.add(b.id); assert.ok(fams.has(b.family), b.id);
    assert.equal(b.levels.length, 3); assert.ok(b.levels[0] < b.levels[1] && b.levels[1] < b.levels[2], b.id);
    assert.equal(b.earn.length, 3); for (const t of b.earn) assert.ok(t.length > 10 && /\.$/.test(t), b.id);
    assert.ok(b.hint && b.unit && b.signal && b.glyph, b.id);
  }
  assert.ok(catalog.badges.filter((b) => b.hidden).length >= 3);
  const mins = catalog.tiers.map((t) => t.min); assert.equal(mins[0], 0); assert.deepEqual([...mins].sort((a, b) => a - b), mins);
  assert.deepEqual(catalog.tiers.map((t) => t.name), ['Newcomer', 'Reader', 'Regular', 'Scribe', 'Sage']);
});
test('catalogue: the thresholds asked for are present', () => {
  const lv = (id) => catalog.badges.find((b) => b.id === id).levels;
  assert.deepEqual([...lv('rhythm-start'), ...lv('rhythm-long')], [3, 7, 14, 30, 100, 365]);
  assert.deepEqual(lv('letters-base'), [5, 10, 22]); assert.equal(lv('letters-finals')[2], 5);
  assert.deepEqual([...lv('words-known'), lv('words-many')[0]], [25, 100, 500, 1000]);
  assert.deepEqual(lv('review-cards'), [100, 500, 2000]); assert.deepEqual(lv('minutes'), [60, 300, 1000]);
});

test('thresholds: boundary values for every badge (one below, exact, one above the next)', () => {
  for (const b of catalog.badges) for (let i = 0; i < 3; i++) {
    const below = ev({ [b.signal]: b.levels[i] - 1 }), at = ev({ [b.signal]: b.levels[i] });
    assert.equal(Object.keys(get(below, b.id)).length, i, `${b.id} just below level ${i + 1}`);
    assert.equal(Object.keys(get(at, b.id)).length, i + 1, `${b.id} at level ${i + 1}`);
    assert.equal(Object.keys(get(ev({ [b.signal]: 1e9 }), b.id)).length, 3);
  }
  assert.deepEqual(ev({}).newly, [], 'zero facts earn nothing');
  assert.equal(B.levelFor([3, 7, 14], 6), 1); assert.equal(B.levelFor([3, 7, 14], 7), 2); assert.equal(B.levelFor([3, 7, 14], 14), 3);
});
test('idempotent: evaluating the same facts twice returns nothing new and the same record', () => {
  const facts = { rhythmBest: 8, words: 120, lettersBase: 22, lettersFinal: 5 };
  const a = ev(facts); assert.ok(a.newly.length >= 7);
  const b = B.evaluate({ catalog, facts, rec: { badges: a.badges }, today: addDaysISO(T, 3) });
  assert.deepEqual(b.newly, []); assert.deepEqual(b.badges.earned, a.badges.earned, 'dates are kept, not re-dated');
});
test('no loss: lower facts later never remove or change a badge, or the tier', () => {
  const a = ev({ rhythmBest: 30, words: 600, timedReads: 12 }, { days: { [T]: { lessons: Array.from({ length: 1 }, (_, i) => 'x' + i) } }, badges: { tier: 3 } });
  const b = B.evaluate({ catalog, facts: {}, rec: { badges: a.badges }, today: addDaysISO(T, 40) });
  assert.deepEqual(b.badges.earned, a.badges.earned); assert.equal(b.badges.tier, 3); assert.deepEqual(b.newly, []);
  assert.equal(B.shownTier(catalog, 0, 3).tier.name, 'Scribe', 'the shown tier never drops below the best reached');
});
test('earned dates: a level earned later is dated when it is earned', () => {
  const a = ev({ words: 30 }); const b = B.evaluate({ catalog, facts: { words: 120 }, rec: { badges: a.badges }, today: '2026-12-01' });
  assert.equal(get(b, 'words-known')[1], T); assert.equal(get(b, 'words-known')[2], '2026-12-01'); assert.deepEqual(b.newly, [{ id: 'words-known', level: 2 }]);
});

test('rhythm: a rest day never breaks the Rhythm badges (banked rest days and declared rest)', () => {
  // five practice days, then one day off covered by the banked rest day, then two more
  const p = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-07', '2026-11-08'];
  const rh = rhythm({ practice: p, today: '2026-11-08' }); assert.equal(rh.count, 7, 'the rest day is bridged');
  const facts = B.factsFrom({ snap: {}, rec: null, rhythm: rh, practice: p });
  assert.equal(facts.rhythmBest, 7);
  assert.equal(Object.keys(get(ev(facts), 'rhythm-start')).length, 2, 'Steady (7) earned across the rest day');
  // a declared rest day (Shabbat) in the middle
  const rh2 = rhythm({ practice: ['2026-11-01', '2026-11-02', '2026-11-04'], cover: ['2026-11-03'], today: '2026-11-04' });
  assert.equal(B.factsFrom({ snap: {}, rec: null, rhythm: rh2 }).rhythmBest, 3);
  assert.equal(Object.keys(get(ev(B.factsFrom({ snap: {}, rec: null, rhythm: rh2 })), 'rhythm-start')).length, 1);
  // after a long gap the rhythm restarts, and the badge already earned stays
  const a = ev({ rhythmBest: 7 }); const rh3 = rhythm({ practice: [...p, '2026-12-30'], today: '2026-12-30' }); assert.equal(rh3.count, 1);
  const b = B.evaluate({ catalog, facts: B.factsFrom({ snap: {}, rec: null, rhythm: rh3 }), rec: { badges: a.badges }, today: '2026-12-30' });
  assert.equal(Object.keys(get(b, 'rhythm-start')).length, 2);
});

test('facts: letters, words, reads, tries, traditions, reviews and minutes are counted from stored records', () => {
  const at = Date.parse('2026-11-09T10:00:00');
  const card = (reps) => ({ state: 'review', reps, lapses: 0, lastReview: at });
  const snap = {
    cards: { 'letter:alef': card(2), 'letter:bet': card(1), 'letter:kaf-final': card(3), 'letter:mem-final': card(2), 'word:shalom': card(5) },
    vocab: { 'vocab:boker': card(2) },
    timedRead: { v: 1, reads: [{ textId: 'shema-vahavta', lineId: 'shema-vahavta', words: 30, ms: 20000, stumbled: 0, stumbledIdx: [], at }, { textId: 'shema-vahavta', lineId: 'shema-vahavta', words: 30, ms: 20000, stumbled: 0, stumbledIdx: [], at }, { textId: 'shema-1', lineId: 'shema-1', words: 6, ms: 5000, stumbled: 0, stumbledIdx: [], at }] },
    speak: { v: 1, attempts: [{ at, kind: 'pair', outcome: 'match', tradition: 'israeli' }, { at, kind: 'say', outcome: 'miss' }, { at, kind: 'pair', outcome: 'miss', tradition: 'ashkenazi' }, { at, kind: 'read', outcome: 'match', tradition: 'bogus' }] },
  };
  const rec = clean({ days: { '2026-11-09': { m: 20, r: 3 }, '2026-11-08': { m: 40 } }, badges: { offlineDays: ['2026-11-01', '2026-11-02'] } });
  const f = B.factsFrom({ snap, rec });
  assert.equal(f.lettersBase, 1); assert.equal(f.lettersFinal, 2); assert.equal(f.words, 2);
  assert.equal(f.timedReads, 3); assert.equal(f.readTexts, 2); assert.equal(f.shemaReads, 2);
  assert.equal(f.listenTries, 2); assert.equal(f.speakTries, 2); assert.equal(f.traditions, 2);
  assert.equal(f.reviews, 15);
  assert.equal(f.minutes, 60); assert.equal(f.offlineDays, 2); assert.equal(f.longDays, 2);
  assert.doesNotThrow(() => B.factsFrom({ snap: null, rec: null })); assert.doesNotThrow(() => B.factsFrom({ snap: { cards: 5, speak: 'x', timedRead: [] }, rec: {} }));
});
test('facts: comebacks count a return after a week or more, and goal days use 20 points', () => {
  const rec = clean({ days: { '2026-10-01': { lessons: ['a'] }, '2026-10-02': { lessons: ['a', 'b'] }, '2026-10-20': { lessons: ['a'] }, '2026-10-21': { lessons: ['c'] } } });
  const f = B.factsFrom({ snap: {}, rec }); assert.equal(f.comebacks, 1); assert.equal(f.goalDays, 1);
  assert.equal(B.factsFrom({ snap: {}, rec: clean({ days: { '2026-10-01': { lessons: ['a'] }, '2026-10-08': { lessons: ['a'] } } }) }).comebacks, 0, '6 days off is not yet a comeback');
});

test('tiers: thresholds on lifetime points, boundaries, only ever up', () => {
  const at = (p) => B.tierFor(catalog, p).tier.name;
  assert.equal(at(0), 'Newcomer'); assert.equal(at(99), 'Newcomer'); assert.equal(at(100), 'Reader'); assert.equal(at(499), 'Reader'); assert.equal(at(500), 'Regular'); assert.equal(at(2000), 'Scribe'); assert.equal(at(5999), 'Scribe'); assert.equal(at(6000), 'Sage'); assert.equal(at(1e7), 'Sage');
  assert.equal(B.tierFor(catalog, 6000).next, null); assert.equal(B.tierFor(catalog, 90).toNext, 10);
  const rec = clean({ days: { [T]: { lessons: Array.from({ length: 10 }, (_, i) => 'l' + i) } } }); // 100 points
  const r = B.evaluate({ catalog, facts: {}, rec, today: T }); assert.equal(r.badges.tier, 1); assert.equal(r.tierUp.name, 'Reader');
  assert.equal(B.evaluate({ catalog, facts: {}, rec: { ...rec, badges: r.badges }, today: T }).tierUp, null);
});
test('lifetime points survive old days being folded into a base total', () => {
  const days = { '2026-01-05': { lessons: ['a', 'b'] }, '2026-11-09': { lessons: ['c'] } };
  const base = B.foldBase(days, null, T); assert.equal(base.total, 20); assert.equal(base.through, '2026-01-05');
  assert.deepEqual(B.foldBase(days, base, T), base, 'folding twice changes nothing');
  assert.equal(B.lifetimePoints(days, base), 30); assert.equal(B.lifetimePoints({ '2026-11-09': days['2026-11-09'] }, base), 30, 'the old day can be dropped from the record');
});

test('storage: badge state is migration-safe and survives the other record helpers', () => {
  assert.deepEqual(clean(null).badges, { earned: {}, announced: [], base: { through: '', total: 0 }, offlineDays: [], tier: 0 });
  assert.deepEqual(clean({ v: 1, goal: 30, days: {} }).badges.earned, {}, 'a record from before badges reads as empty');
  const junk = cleanBadges({ earned: { 'words-known': { 1: '2026-11-01', 2: 'nope', 9: '2026-11-02' }, 'BAD ID': { 1: '2026-11-01' }, 'x': 5 }, announced: ['words-known:1', 'bad', 7], base: { through: 'x', total: -4 }, offlineDays: ['2026-11-01', 'q'], tier: 99 });
  assert.deepEqual(junk.earned, { 'words-known': { 1: '2026-11-01' } }); assert.deepEqual(junk.announced, ['words-known:1']); assert.equal(junk.base.total, 0); assert.deepEqual(junk.offlineDays, ['2026-11-01']); assert.equal(junk.tier, 9);
  const rec = { badges: { earned: { 'words-known': { 1: '2026-11-01' } } } };
  assert.deepEqual(mergeDay(rec, T, { r: 3 }).badges.earned, rec.badges.earned, 'merging a day keeps badges');
  assert.deepEqual(clean({ badges: { earned: { 'old-badge-id': { 3: '2026-05-05' } } } }).badges.earned, { 'old-badge-id': { 3: '2026-05-05' } }, 'ids a newer catalogue no longer lists are kept');
});

test('shelf: earned and next are described gently; hidden badges show only once earned; text summary is plain', () => {
  const r = ev({ rhythmBest: 8, comebacks: 0 }); const rows = B.shelf(catalog, r.badges, { rhythmBest: 8 });
  const rs = rows.find((x) => x.id === 'rhythm-start');
  assert.equal(rs.level, 2); assert.equal(rs.levelName, 'Steady'); assert.equal(rs.threshold, 7); assert.equal(rs.next.text, 'Next: Deep at 14 days. You are at 8.');
  assert.equal(rows.find((x) => x.id === 'rhythm-long').next.text, 'Next: First at 30 days. You are at 8.');
  assert.equal(rows.find((x) => x.id === 'quiet-return').level, 0);
  assert.equal(B.shelf(catalog, ev({ rhythmBest: 400 }).badges, {}).find((x) => x.id === 'rhythm-long').next, null);
  const txt = B.shelfText(catalog, r.badges, 120);
  assert.match(txt, /^My Hebrew course badges\nTier: Reader\n- Rhythm: finding it: Steady \(7\)/); assert.doesNotMatch(txt, /Welcome back/);
  assert.match(B.shelfText(catalog, null, 0), /No badges yet/);
});

test('plan: calm mode and reduced motion give no motion; sound only when on and not quiet; announcement is one polite sentence set', () => {
  const newly = [{ id: 'words-known', level: 1 }];
  const p = B.badgePlan({ newly, catalog, quiet: false }); assert.equal(p.motion, 'fade'); assert.equal(p.sound, null);
  assert.match(p.announce, /^New badge: Words you know, First\. You answered 25 words/);
  assert.equal(B.badgePlan({ newly, catalog, quiet: true, soundOn: true }).motion, 'none');
  assert.equal(B.badgePlan({ newly, catalog, quiet: true, soundOn: true }).sound, null);
  assert.equal(B.badgePlan({ newly, catalog, quiet: false, soundOn: true }).sound, 'done');
  assert.equal(B.badgePlan({ newly: [], catalog, quiet: false, soundOn: true }).sound, null);
  assert.match(B.badgePlan({ newly: [], catalog, quiet: false, tierUp: B.tierAt(catalog, 1) }).announce, /Your tier is now Reader/);
});

test('wording: a threshold of one uses the singular unit', () => {
  assert.equal(B.unitFor(1, 'final forms'), 'final form'); assert.equal(B.unitFor(1, 'tries'), 'try'); assert.equal(B.unitFor(1, 'timed reads'), 'timed read'); assert.equal(B.unitFor(5, 'tries'), 'tries');
  assert.equal(B.shelf(catalog, null, {}).find((x) => x.id === 'letters-finals').next.text, 'Next: First at 1 final form. You are at 0.');
});
