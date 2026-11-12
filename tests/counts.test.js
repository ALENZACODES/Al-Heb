// src/lib/counts.js: the one counts module (C-05), the same-screen rule on Home (C-03), the counts ledger (M-01), the streak
// restore rule (M-14), plurals (S-02), the one header counter group (S-12) and the generated totals and build stamp (M-10, S-09).
import './retention/_helpers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { T, streakRec } from './retention/_helpers.js';
import * as C from '../src/lib/counts.js';
import { TOTALS, BUILD } from '../src/lib/counts.generated.js';
import { check, computeTotals, stampHtml, buildMeta } from '../tools/counts/build-counts.mjs';
import { defaults } from '../src/retention/state.js';
import { goalProgress, todayXp } from '../src/retention/xp.js';
import { questView, questProgress, ensureQuests } from '../src/retention/quests.js';
import { PRICES } from '../src/retention/gems.js';
import { streakStatus, repairStreak, weekDots } from '../src/retention/streak.js';
import { statModel, walletModel } from '../src/shell/statbar.js';
import { weekModel } from '../src/shell/weekstrip.js';
import { count, plural } from '../src/shell/plural.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const NOW = T('2026-11-11T15:00'); // a Wednesday
const today = C.dayKey(NOW);
const ret = (o = {}) => Object.assign(defaults(T('2026-11-01T10:00'), 'install-1'), o);

// ---------- XP today and the goal ----------
test('xpGoal: XP today against the daily XP goal, with the one sentence every screen uses', () => {
  const r = ret({ goal: 20, xp: { total: 22, days: { [today]: 22 }, recentIds: [], capDay: null, capReview: 0, capGame: 0 } });
  const p = C.xpGoal(r, NOW);
  assert.deepEqual([p.xp, p.goal, p.done, p.pct], [22, 20, true, 100]);
  assert.equal(p.text, 'Goal reached: 22 of 20 XP today.');
  assert.equal(C.xpGoal(ret(), NOW).text, '0 of 20 XP today.');
  assert.equal(C.xpGoalOf({ goal: 25 }), 20, 'an unknown goal falls back to 20');
  assert.equal(C.xpToday(null, NOW), 0);
});

test('C-03: the Home goal ring and the "Earn N XP" quest read the same value, even for XP earned before quests opened', () => {
  // The audit's screen: goal reached at 22 of 20 while the quest, which only counted XP after it existed, said 10 of 20.
  let r = ret({ goal: 20, lessonsFinished: 4, xp: { total: 22, days: { [today]: 22 }, recentIds: [], capDay: null, capReview: 0, capGame: 0 } });
  r = ensureQuests(r, NOW);
  r.quests.items = [{ id: 'xp', n: 20, p: 10, paid: false }, { id: 'review', n: 5, p: 0, paid: false }, { id: 'combo', n: 8, p: 0, paid: false }];
  const live = { xpToday: todayXp(r, NOW), lessonsToday: 2 };
  const ring = goalProgress(r, NOW), quest = questView(r, NOW, { live }).items.find((q) => q.id === 'xp');
  assert.equal(ring.xp, 22); assert.equal(quest.p, Math.min(quest.n, ring.xp), 'the quest shows the ring value, capped at its target');
  assert.equal(quest.done, ring.done, 'goal reached and quest done agree');
  // settling the quest pays it once, from the same value
  const out = questProgress(r, {}, NOW, { live });
  assert.deepEqual(out.done, ['Earn 20 XP']);
  assert.equal(questProgress(out.rec, {}, NOW, { live }).done.length, 0, 'never paid twice');
  // the lesson quest reads lessons finished today, the number Progress shows
  out.rec.quests.items[1] = { id: 'lesson', n: 2, p: 1, paid: false };
  assert.equal(questView(out.rec, NOW, { live }).items[1].p, 2);
});

test('the Home goal ring and its text come from one xpGoal call; the reward card draws the final total once', () => {
  const ui = read('src/retention/ui.js');
  assert.match(ui, /p = xpGoal\(rec\)/); assert.match(ui, /'ret-goal-text'[^)]*\}, p\.text\)/); assert.match(ui, /RING_C \* \(1 - p\.fraction\)/);
  assert.doesNotMatch(ui, /countUp\(/, 'no count-up race between two renderings of one number');
  assert.match(read('src/retention/boot.js'), /live: live\(\)/, 'the quest card is drawn with the live counts');
});

// ---------- minutes ----------
test('minutes today: the header ring and the Learn card ring are the same numbers', () => {
  const s = streakRec({ count: 3, best: 3, last: today, todayDate: today, todaySeconds: 14 * 60 + 10, doneDates: [today] });
  const m = C.minutesGoal(s, 5, NOW), bar = statModel({ streak: s, dailyGoal: 5, now: NOW });
  assert.deepEqual([m.min, m.goal, m.met], [14, 5, true]);
  assert.deepEqual([bar.todayMin, bar.goalMin], [m.min, m.goal]);
  assert.equal(C.minutesGoal(null, 7, NOW).goal, 5);
  const learn = read('src/curriculum/learn.view.js');
  assert.match(learn, /minutesGoal\(st\?\.rawStreak/, 'Learn reads the raw streak record through counts.js (the projected streak has no seconds)');
});

// ---------- lessons, reviews ----------
test('lessons finished, lessons today, and lesson totals with labelled scopes', () => {
  const done = { r01: T('2026-11-09T10:00'), r02: T('2026-11-11T09:00'), r03: new Date(T('2026-11-11T11:00')).toISOString() };
  assert.equal(C.lessonsFinished(done), 3); assert.equal(C.lessonsFinishedToday(done, NOW), 2);
  assert.deepEqual(C.LESSONS, TOTALS.lessons);
  assert.equal(C.LESSONS.all, C.LESSONS.reading + C.LESSONS.israel);
  assert.ok(C.LESSONS.core < C.LESSONS.reading);
  assert.match(C.lessonScopeLine('reading', 4), new RegExp(`^4 of ${C.LESSONS.reading} lessons on the reading track \\(${C.LESSONS.all} lessons in the whole course\\)$`));
  for (const k of ['core', 'reading', 'israel', 'all', 'pathMilestones', 'badges', 'activityPoints']) assert.ok(C.SCOPE[k], k);
});

test('reviews due counts what "Review now" reviews; review cards this week is one floor for Progress and the Daily page', () => {
  const cards = { a: { id: 'a', due: NOW - 1, lastReview: T('2026-11-10T09:00') }, b: { id: 'b', due: NOW + 1e6, lastReview: T('2026-11-01T09:00') }, c: { id: 'c', due: NOW - 5 } };
  const vocab = { 'vocab:x': { id: 'vocab:x', due: NOW - 1, lastReview: T('2026-11-11T08:00') } };
  assert.equal(C.reviewsDue(cards, NOW), 2); assert.equal(C.wordsDue(vocab, NOW), 1);
  assert.equal(C.reviewCardsThisWeek(cards, vocab, NOW), 2);
  assert.equal(C.reviewedToday(vocab, NOW), 1);
  for (const f of ['src/shell/home.view.js', 'src/curriculum/learn.view.js', 'src/progress/progress.view.js']) assert.match(read(f), /reviewsDue\(/, f);
  assert.match(read('src/progress/weekly.js'), /reviewCardsThisWeek\(/);
  assert.match(read('preview/loops/daily.view.js'), /reviewCardsThisWeek\(/);
});

// ---------- streak, week dots, restore ----------
test('week dots: Home, the Morning Verse and Progress share one model (free Friday rest, freezes)', () => {
  const s = streakRec({ count: 2, best: 2, last: '2026-11-10', doneDates: ['2026-11-09', '2026-11-10'] });
  const r = ret({ freezes: { held: 0, used: ['2026-11-05'], evaluatedThrough: null, unseen: false } });
  const days = C.weekDays(s, r, NOW);
  assert.equal(days.length, 7); assert.equal(days[6].date, today);
  const by = Object.fromEntries(days.map((d) => [d.date, d.state]));
  assert.equal(by['2026-11-07'], 'rest', 'Saturday'); assert.equal(by['2026-11-06'], 'rest', 'Friday is a free rest day');
  assert.equal(by['2026-11-05'], 'freeze'); assert.equal(by['2026-11-10'], 'done'); assert.equal(by[today], 'today');
  assert.deepEqual(weekDots(s, r, NOW).map((d) => d.state), days.map((d) => d.state), 'retention strip = counts');
  const strip = weekModel(s, NOW, undefined, r).map((d) => d.state);
  assert.deepEqual(strip, days.map((d) => (['freeze', 'travel', 'rest'].includes(d.state) ? 'frozen' : d.state)), 'header/Progress strip = counts');
  assert.match(read('src/morning/model.js'), /weekDays\(/, 'Morning Verse dots read counts.js');
});

test('M-14: a streak restore is free everywhere and offered only while the streak is broken, naming the right streak', () => {
  assert.equal(PRICES.repairPerDay, 0);
  const until = NOW + 24 * 3600000;
  const broken = streakRec({ count: 2, best: 2, last: '2026-11-08', doneDates: ['2026-11-07', '2026-11-08'] });
  const r = ret({ repair: { days: ['2026-11-09', '2026-11-10'], prev: 2, last: '2026-11-08', until } });
  const offer = C.repairOffer(r, broken, NOW);
  assert.ok(offer); assert.equal(offer.prev, 2); assert.equal(offer.text, 'Bring back your 2-day streak (free)');
  // a new 1-day chain already runs: no "repair your 2-day streak" on a 1-day streak
  const running = streakRec({ count: 1, best: 2, last: today, doneDates: [today] });
  assert.equal(C.repairOffer(r, running, NOW), null);
  assert.equal(streakStatus(running, r, NOW).repair, null);
  assert.ok(streakStatus(broken, r, NOW).repair);
  // restoring costs nothing and leaves no gem ledger line
  const out = repairStreak(broken, r, NOW);
  assert.equal(out.ok, true); assert.equal(out.rec.gems.balance, r.gems.balance); assert.equal(out.rec.gems.ledger.length, r.gems.ledger.length);
  assert.doesNotMatch(read('src/retention/ui.js'), /Repair your \$\{/);
  assert.match(read('src/retention/shop.view.js'), /'Free'/);
  assert.match(read('preview/loops/daily.view.js'), /repairOffer\(c\.retention, c\.streak, t\)/, 'the Daily page offers the same restore');
});

// ---------- header ----------
test('S-12 / S-02: one header group holds streak, minutes, gems and hearts; the league bar no longer repeats the streak', () => {
  const w = walletModel({ retention: ret({ lessonsFinished: 4, gems: { balance: 1, ledger: [], paidMilestones: [], goalPaidDay: null } }), now: NOW });
  assert.deepEqual([w.show, w.gems, w.heartsOn, w.hearts], [true, 1, true, 5]);
  assert.equal(w.gemsLabel, '1 gem. Open the shop.');
  assert.equal(walletModel({ retention: null, now: NOW }).show, false, 'nothing earned: no gems chip yet');
  const sb = read('src/shell/statbar.js'), ui = read('src/retention/ui.js');
  for (const id of ['stat-streak', 'stat-goal', 'stat-gems', 'stat-hearts']) assert.match(sb, new RegExp(`id: '${id}'`));
  assert.doesNotMatch(ui, /ret-chip ret-flame|ret-chip ret-gems|ret-chip ret-hearts/, 'no second streak, gems or hearts chip in the header');
  // hearts after the timed refill, the same rule as src/retention/hearts.js
  assert.equal(C.heartsOf(ret({ lessonsFinished: 4, hearts: { enabled: null, n: 2, lastRefillAt: NOW - 8.5 * 3600000, lost: [], refillProgress: 0, refillRight: 0 } }), NOW).n, 4);
});

test('S-02: plurals come from one helper', () => {
  assert.deepEqual([count(1, 'page'), count(2, 'page'), count(1, 'badge'), count(0, 'gem'), plural(1, 'day')], ['1 page', '2 pages', '1 badge', '0 gems', 'day']);
  assert.equal(C.streakText(1), '1-day streak'); assert.equal(C.daysText(1), '1 day'); assert.equal(C.gemsText(3), '3 gems');
  assert.match(read('src/shell/workbook.view.js'), /count\(f\.pages, 'page'\)/);
  assert.match(read('src/games/arcade.js'), /count\(a\.totalBadges \|\| 0, 'badge'\)/);
  assert.doesNotMatch(read('src/timedread/timedread.view.js'), /Practise/);
});

// ---------- generated totals, audio figures and build stamp ----------
test('M-01 / M-10: the generated totals match the served data, and summary.json reconciles with the manifests', async () => {
  assert.equal(await check(), true, 'src/lib/counts.generated.js is stale: run node tools/counts/build-counts.mjs');
  const fresh = await computeTotals();
  assert.deepEqual(fresh, TOTALS);
  const idx = JSON.parse(read('data/books/index.json'));
  assert.equal(C.BOOKS, (idx.books || idx).length, 'Home strip and Books page: one book count');
  assert.equal(C.DICTIONARY.entries, C.DICTIONARY.words + C.DICTIONARY.forms);
  assert.ok(C.DICTIONARY.addable <= C.DICTIONARY.words);
  assert.equal(C.dictionaryTitle(), `Dictionary (${C.fmt(C.DICTIONARY.words)} words)`);
  const summary = JSON.parse(read('data/audio/summary.json'));
  assert.equal(C.audioReconciles(summary), true, `summary.json total ${summary.total}/tts ${summary.tts} vs manifests ${C.AUDIO_CATALOGUE.total}/${C.AUDIO_CATALOGUE.synthetic}: run node tools/audio/summary.mjs`);
  assert.equal(Object.values(C.AUDIO_CATALOGUE.files).reduce((a, f) => a + f.entries, 0), C.AUDIO_CATALOGUE.total);
});

test('no hard-coded totals left where the ledger found them', () => {
  assert.doesNotMatch(read('src/shell/showcase.js'), /62 story books|240 first words|240 gentle/);
  assert.doesNotMatch(read('src/shell/i18n.js'), /5,000 words/);
  assert.doesNotMatch(read('src/vocab/vocab.view.js'), /'All 5,000 words'/);
  assert.doesNotMatch(read('src/awards/eligibility.js'), /All five story books/);
  assert.doesNotMatch(read('src/games/wordfinder.view.js'), /\b240\b/);
  assert.match(C.bookFinisherScope(), new RegExp(`any 5 of the ${C.BOOKS} little books on the shelf`));
});

test('S-09: the build stamp is on About and in the served HTML', () => {
  assert.match(BUILD.version, /^\d+\.\d+\.\d+$/); assert.match(BUILD.builtAt, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
  assert.equal(BUILD.version, JSON.parse(read('package.json')).version);
  assert.ok(read('index.html').includes(buildMeta(BUILD)), 'index.html carries <meta name="alef-build"> for this build');
  assert.match(C.buildStamp(), /^Version \d+\.\d+\.\d+, built \d{4}-\d\d-\d\d \d\d:\d\d UTC$/);
  assert.match(read('src/shell/about.view.js'), /buildStamp\(\)/);
  assert.equal(stampHtml('<head>\n  <meta charset="utf-8">\n</head>', { version: '1.2.3', builtAt: 'X' }), '<head>\n  <meta charset="utf-8">\n  <meta name="alef-build" content="1.2.3 X">\n</head>');
  // lane1112-2: the release flag is read once (it also runs the asset check before the stamp moves)
  assert.match(read('tools/build-precache.mjs'), /const release = process\.argv\.includes\('--stamp'\);[\s\S]*writeCounts\(\{ force: release \}\)/, 'the precache build regenerates the counts; the stamp moves on --stamp or a changed total, so a plain rebuild is reproducible');
});

// ---------- routing ----------
test('C-05: every surface reads its numbers through src/lib/counts.js', () => {
  const surfaces = ['src/shell/home.view.js', 'src/home/today.js', 'src/curriculum/learn.view.js', 'src/progress/progress.view.js', 'src/progress/model.js',
    'src/progress/weekly.js', 'src/coursemap/syllabus.view.js', 'src/shell/backup-reminder.js', 'src/shell/about.view.js', 'src/vocab/vocab.view.js',
    'src/awards/gallery.view.js', 'src/awards/eligibility.js', 'preview/loops/daily.view.js', 'src/retention/shop.view.js', 'src/retention/league.view.js',
    'src/shell/showcase.js', 'src/shell/statbar.js', 'src/retention/ui.js', 'src/retention/xp.js', 'src/retention/streak.js', 'src/retention/boot.js',
    'src/morning/model.js', 'src/shell/weekstrip.js', 'src/classtrack/classtrack.view.js', 'src/shell/i18n.js', 'src/home/builder.js', 'src/games/wordfinder.view.js',
    'src/roots/roots.view.js', 'preview/loops/points.js', 'preview/loops/stats.js'];
  for (const f of surfaces) assert.match(read(f), /lib\/counts\.js['"]/, f);
  assert.match(read('src/lib/counts.js'), /from '\.\/counts\.generated\.js'/);
});

// ---------- M-01 leftovers: the Roots page and the Daily calendar ----------
test('M-01: the Roots page numbers are counts.js rootsCoverage(), equal to a fresh count of its data files', async () => {
  const fam = JSON.parse(read('data/roots/families.json')), verbs = JSON.parse(read('data/roots/verbs.json')).verbs;
  const r = C.rootsCoverage();
  for (const k of ['verbs', 'verbsWithRoot', 'verbsWithBinyan', 'familiesOf2Plus', 'familiesOf3Plus', 'familiesRuleChecked', 'familiesVerified']) assert.equal(r[k], fam.coverage[k], k);
  assert.equal(r.explorer, verbs.length);
  assert.equal(r.explorerWithRoot, verbs.filter((v) => v.root).length);
  const { coverageText } = await import('../src/roots/model.js');
  assert.equal(coverageText(r), coverageText(fam.coverage, verbs), 'counts.js and the data files give the same sentence');
  assert.doesNotMatch(read('src/roots/roots.view.js'), /coverageText\(fam\.coverage/);
});

test('M-01: activity points (the Daily calendar) are counted once, in counts.js, and say they are not XP', async () => {
  assert.equal(C.activityPoints({ lessons: ['r01', 'r02', 'r01'], r: 30, t: 1, s: 9 }), 2 * 10 + 20 + 5 + 5);
  assert.equal(C.activityPoints(null), 0);
  assert.deepEqual([0, 1, 4, 5, 19, 20, 99].map((p) => C.activityLevel(p, 20)), [0, 1, 1, 2, 2, 3, 3]);
  assert.equal(C.activityText(1), '1 activity point'); assert.equal(C.activityText(12), '12 activity points');
  const P = await import('../preview/loops/points.js'), S = await import('../preview/loops/stats.js');
  const day = { lessons: ['r01'], r: 7, t: 2, s: 1 };
  assert.equal(P.dayPoints(day), C.activityPoints(day));
  assert.equal(P.WEIGHTS, C.ACTIVITY.weights); assert.equal(P.CAPS, C.ACTIVITY.caps); assert.equal(P.PRACTICE_POINTS, C.ACTIVITY.practicePoints);
  assert.equal(S.level(7, 20), C.activityLevel(7, 20));
  assert.doesNotMatch(read('preview/loops/points.js'), /lesson: 10, review: 1/, 'no second copy of the weights');
  assert.match(C.SCOPE.activityPoints, /XP is counted separately/);
  const daily = read('preview/loops/daily.view.js');
  assert.match(daily, /activityText\(c\.points\)/);
  assert.doesNotMatch(daily, /\$\{c\.points\} points`/);
});
