// @ts-check
// The one counts module. Every number a screen shows about the learner's own progress (XP today and the daily goal, minutes
// today, lessons finished, reviews due, review cards this week, streak, week dots, gems, hearts) and every course-wide total
// (lessons by scope, books, dictionary words, first words, root verbs, audio catalogue, build stamp) is computed HERE, from the
// stored records and from src/lib/counts.generated.js (tools/counts/build-counts.mjs, run by tools/build-precache.mjs).
// Screens read these functions; they do not count for themselves. Where two numbers genuinely count different things, the
// scope label for each lives here too (SCOPE), so a page that shows both can say which is which.
// Pure apart from read(store): no DOM, no network. Imports only the core streak engine and the plural helper.
import { TOTALS, BUILD } from './counts.generated.js';
import { projectStreak, weekStrip, dayKey, addDaysISO, isRestDay, normalizeRecord } from '../curriculum/streak.js';
import { plural, count } from '../shell/plural.js';

export { TOTALS, BUILD, plural, count, dayKey };

/** Store keys the counts are read from (each written by its own module; nothing here writes). */
export const KEYS = Object.freeze({
  progress: 'curriculum.progress', cards: 'srs.cards', vocab: 'srs.vocab', streak: 'streak', dailyGoal: 'onboarding.v1.dailyGoal',
  retention: 'retention.v1', books: 'books.v1', progressState: 'progress.state', awards: 'awards.v1',
});

/** '1,234' */
export const fmt = (n) => (Number(n) || 0).toLocaleString('en-US');
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const nat = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);
const toMs = (t) => (typeof t === 'string' ? Date.parse(t) : Number(t));
const cardList = (v) => (Array.isArray(v) ? v.filter((c) => c && c.id) : Object.values(obj(v)).filter(Boolean));

// ---------- scope labels (M-01: two numbers that count different things must say so) ----------
export const SCOPE = Object.freeze({
  core: 'core lessons in the ten-week study plan',
  reading: 'lessons on the reading track',
  israel: 'lessons on the Israel track',
  all: 'lessons in the whole course',
  pathMilestones: 'path milestones on this page (badges are counted separately, on Awards)',
  badges: 'badges (medallions) on this page (the path milestones on Progress are counted separately)',
  activityPoints: 'activity points (lessons, review cards, timed reads and speaking tries); XP is counted separately on Home',
});

// ---------- XP today and the daily XP goal (one store: retention.v1) ----------
export const XP_GOALS = Object.freeze([10, 20, 30, 50]);
export const DEFAULT_XP_GOAL = 20;
/** The learner's daily XP goal. @param {any} ret retention.v1 record (raw or normalized) */
export const xpGoalOf = (ret) => (XP_GOALS.includes(obj(ret).goal) ? obj(ret).goal : DEFAULT_XP_GOAL);
/** XP earned today. @param {any} ret @param {number|Date} [now] */
export const xpToday = (ret, now = Date.now()) => nat(obj(obj(ret).xp).days?.[dayKey(now)]);
/** Today's XP against the goal: the ONE value the Home goal ring, its text, the XP quest and the Daily page show. */
export function xpGoal(ret, now = Date.now()) {
  const xp = xpToday(ret, now), goal = xpGoalOf(ret), fraction = Math.min(1, xp / goal), done = xp >= goal;
  return { xp, goal, fraction, pct: Math.round(fraction * 100), done, text: done ? `Goal reached: ${xp} of ${goal} XP today.` : `${xp} of ${goal} XP today.` };
}

// ---------- minutes today and the daily minutes goal (one store: the streak record) ----------
export const DAILY_GOALS = Object.freeze([5, 10, 15, 20, 30]);
/** Minutes goal from setup (onboarding.v1.dailyGoal); 5 when unset or unknown. */
export const normalizeDailyGoal = (v) => (DAILY_GOALS.includes(v) ? v : 5);
/** Whole minutes studied today, from the streak record (the same number the header shows). */
export function minutesToday(streakRaw, now = Date.now()) {
  try { return Math.max(0, Math.floor((projectStreak(streakRaw, now).todaySeconds || 0) / 60)); } catch { return 0; }
}
/** Minutes today against the setup goal: header ring, Learn card ring. */
export function minutesGoal(streakRaw, goalRaw, now = Date.now()) {
  const min = minutesToday(streakRaw, now), goal = normalizeDailyGoal(goalRaw);
  const pct = Math.max(0, Math.min(100, Math.round((min / goal) * 100))), met = min >= goal;
  return { min, goal, pct, met, text: `${min} of ${goal} minutes today`, short: `${min}/${goal}` };
}

// ---------- streak ----------
/** The streak as every screen shows it. @returns {{count:number, best:number, activeToday:boolean, restToday:boolean, broken:boolean}} */
export function streakNow(streakRaw, now = Date.now(), extraRest) {
  try { const p = projectStreak(streakRaw, now, extraRest); return { count: p.count || 0, best: Math.max(p.best || 0, p.count || 0), activeToday: !!p.activeToday, restToday: !!p.restToday, broken: !!p.broken }; }
  catch { return { count: 0, best: 0, activeToday: false, restToday: false, broken: false }; }
}
/** '1-day streak', '3-day streak' */
export const streakText = (n) => `${n}-day streak`;
/** '1 day', '2 days' */
export const daysText = (n) => count(n, 'day');

/** Rest days that can never break a streak: Saturday, Yom Tov, and (owner rule) Friday and the eve of Yom Tov. */
export function isFreeRestDay(iso, mode = 'reform') {
  if (isRestDay(iso, mode)) return true;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getDay() === 5 || isRestDay(addDaysISO(iso, 1), mode);
}
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/**
 * The seven days ending today, oldest first: the ONE week-dot model (Home strip, Morning Verse, header strip).
 * state: 'done' | 'freeze' (a bought freeze covered it) | 'travel' | 'rest' (Shabbat, Yom Tov, a declared or free rest day) | 'today' | 'open'.
 * @param {any} streakRaw @param {any} [ret] retention.v1 (freezes used, travel days) @param {number|Date} [now] @param {string[]} [extraRest]
 */
export function weekDays(streakRaw, ret, now = Date.now(), extraRest) {
  let strip; try { strip = weekStrip(streakRaw, now, extraRest); } catch { return []; }
  const mode = normalizeRecord(streakRaw).mode, today = dayKey(now), r = obj(ret);
  const used = Array.isArray(r.freezes?.used) ? r.freezes.used : [], travel = Array.isArray(r.travelCovered) ? r.travelCovered : [];
  return strip.map((d) => {
    let state = d.state === 'frozen' ? 'rest' : d.state;
    if (d.state !== 'done') {
      if (used.includes(d.date)) state = 'freeze';
      else if (travel.includes(d.date)) state = 'travel';
      else if (d.date !== today && isFreeRestDay(d.date, mode)) state = 'rest';
      else if (d.date === today && isRestDay(d.date, mode)) state = 'rest';
    }
    const what = { done: 'done', freeze: 'covered by a streak freeze', travel: 'travel day', rest: 'rest day', today: 'today, not done yet', open: 'no lesson' }[state];
    return { date: d.date, weekday: d.weekday, state, restKind: d.restKind || null, label: `${WEEKDAY[d.weekday]}: ${what}` };
  });
}

/**
 * Streak restore (M-14): the app is free, so a restore costs nothing anywhere, and it is offered only while the streak is
 * actually broken (today's count is 0) inside the window the day rollover opened. It names the streak it brings back.
 * @returns {{prev:number, days:string[], hoursLeft:number, text:string}|null}
 */
export function repairOffer(ret, streakRaw, now = Date.now()) {
  const p = obj(ret).repair;
  if (!p || !Array.isArray(p.days) || !p.days.length || !(nat(p.prev) >= 1) || !(Number(p.until) >= now)) return null;
  if (streakNow(streakRaw, now).count > 0) return null; // a new chain already runs: nothing is broken now
  const prev = nat(p.prev);
  return { prev, days: p.days, hoursLeft: Math.max(1, Math.ceil((Number(p.until) - now) / 3600000)), text: `Bring back your ${streakText(prev)} (free)` };
}
export const REPAIR_PRICE = 0;

// ---------- lessons ----------
/** Lessons finished (distinct lessons in curriculum.progress): Learn, Progress, Shop, League and the quests all say this number. */
export const lessonsFinished = (completed) => Object.keys(obj(completed)).length;
/** Lessons first finished today. */
export function lessonsFinishedToday(completed, now = Date.now()) {
  const today = dayKey(now);
  return Object.values(obj(completed)).filter((t) => { const n = toMs(t); return Number.isFinite(n) && n > 0 && dayKey(n) === today; }).length;
}
/** Lessons finished in one track (or 'all'). @param {any} completed @param {Array<{id:string,track:string}>} lessons */
export function lessonsDoneIn(completed, lessons, track = 'all') {
  const c = obj(completed); return (lessons || []).filter((l) => (track === 'all' || l.track === track) && c[l.id]).length;
}
/** Course lesson totals by scope, from the lesson data the app serves. */
export const LESSONS = Object.freeze({ ...TOTALS.lessons });
/** 'reading' | 'israel' from a track id ('read' | 'israel'). */
export const scopeOfTrack = (track) => (track === 'israel' ? 'israel' : 'reading');
/** '4 of 71 lessons on the reading track (125 lessons in the whole course)' */
export function lessonScopeLine(scope, done) {
  const total = LESSONS[scope] ?? LESSONS.all;
  return scope === 'all' ? `${done} of ${total} ${SCOPE.all}` : `${done} of ${total} ${SCOPE[scope]} (${LESSONS.all} ${SCOPE.all})`;
}

// ---------- reviews ----------
/** Lesson review cards due now: exactly what "Review now" (#/learn?review=1) reviews. Home, Learn and Progress show this. */
export function reviewsDue(cards, now = Date.now()) {
  const t = toMs(now); return cardList(cards).filter((c) => Number.isFinite(c.due) && c.due <= t).length;
}
/** Dictionary words due in their own review (srs.vocab), shown on the Dictionary. */
export const wordsDue = (vocab, now = Date.now()) => reviewsDue(vocab, now);
/** The local days a card was graded: its review-day history (srs.js keeps up to 8), or, for a card graded before that history
 * was kept, the day of its latest review only. A later review only adds a day, so counts built on this never drop. */
export function reviewDays(c) {
  if (Array.isArray(c?.days) && c.days.length) return c.days;
  const n = toMs(c?.lastReview); return Number.isFinite(n) && n > 0 ? [dayKey(n)] : [];
}
/** Different review cards (lesson cards and dictionary words) graded on any day of the 7 days ending today. */
export function reviewCardsThisWeek(cards, vocab, now = Date.now()) {
  const today = dayKey(now), from = addDaysISO(today, -6);
  return [...cardList(cards), ...cardList(vocab)].filter((c) => reviewDays(c).some((k) => k >= from && k <= today)).length;
}
/** Lesson cards graded today. */
export function reviewedToday(cards, now = Date.now()) {
  const today = dayKey(now); return cardList(cards).filter((c) => reviewDays(c).includes(today)).length;
}
/** Words first graded in the 7 days ending today. exact: cards that carry their first-review time; atLeast adds cards graded
 * before that was kept whose only review so far falls in the week (a floor), so the line says "at least" only when it has to. */
export function newWordsThisWeek(entries, now = Date.now()) {
  const today = dayKey(now), from = addDaysISO(today, -6), inWeek = (t) => { const n = toMs(t); if (!Number.isFinite(n) || n <= 0) return false; const k = dayKey(n); return k >= from && k <= today; };
  let exact = 0, legacy = 0;
  for (const c of entries) { if (!c) continue; if (c.firstReview != null) { if (inWeek(c.firstReview)) exact++; } else if (c.reps === 1 && inWeek(c.lastReview)) legacy++; }
  return { count: exact + legacy, atLeast: legacy > 0 };
}

// ---------- gems and hearts (retention.v1) ----------
export const HEARTS_MAX = 5, HEART_REFILL_MS = 4 * 3600 * 1000, HEARTS_UNLOCK_LESSONS = 3;
/** Hearts after the timed refill (one every 4 hours), without writing. @returns {{n:number, lastRefillAt:number}} */
export function heartsRefilled(n, lastRefillAt, now = Date.now()) {
  if (n >= HEARTS_MAX || !lastRefillAt || now <= lastRefillAt) return { n, lastRefillAt };
  const gained = Math.floor((now - lastRefillAt) / HEART_REFILL_MS);
  if (gained <= 0) return { n, lastRefillAt };
  const next = Math.min(HEARTS_MAX, n + gained);
  return { n: next, lastRefillAt: next >= HEARTS_MAX ? 0 : lastRefillAt + gained * HEART_REFILL_MS };
}
export const gemsOf = (ret) => nat(obj(obj(ret).gems).balance);
/** Hearts now, and whether hearts are in force at all (off when switched off, or before the 3rd finished lesson). */
export function heartsOf(ret, now = Date.now()) {
  const h = obj(obj(ret).hearts), r = obj(ret);
  const on = h.enabled !== false && !(h.enabled == null && nat(r.lessonsFinished) < HEARTS_UNLOCK_LESSONS);
  const n = h.n === undefined ? HEARTS_MAX : Math.min(nat(h.n), HEARTS_MAX);
  return { on, n: heartsRefilled(n, nat(h.lastRefillAt), now).n, max: HEARTS_MAX };
}
/** '1 gem', '3 gems' */
export const gemsText = (n) => count(n, 'gem');

// ---------- books, words, roots, audio, build ----------
export const BOOKS = TOTALS.books;
/** Pictured pages across the shelf (books/index.json picturedPages). */
export const BOOK_PICTURED_PAGES = TOTALS.bookPictured;
/** Books read to their last page (books.v1 places with finishedAt). */
export const booksFinished = (rec) => Object.values(obj(rec)).filter((v) => v && Number.isFinite(toMs(v.finishedAt))).length;
/** The Book Finisher badge counts the first five books (book1 to book5) of the shelf. */
export const BOOK_FINISHER_BOOKS = 5;
export const bookFinisherScope = () => `any ${BOOK_FINISHER_BOOKS} of the ${BOOKS} little books on the shelf (each read to its last page, with its story question answered)`;
/** Dictionary: entries in the list, head-words the browser shows, word forms (shown with "Show word forms"), words "Add all" can add. */
export const DICTIONARY = Object.freeze({ ...TOTALS.dictionary });
export const dictionaryTitle = () => `Dictionary (${fmt(DICTIONARY.words)} words)`;
export const FIRST_WORDS = TOTALS.firstWords;
export const BUILD_WORDS = TOTALS.buildWords;
export const ROOTS = Object.freeze({ ...TOTALS.roots });
/**
 * The Roots page numbers (M-01). One scope per number: the word list (all verbs), and the explorer (the verbs the page can open).
 * Shaped like data/roots/families.json coverage so src/roots/model.js coverageText can word it; the page never counts its own data file.
 */
export function rootsCoverage(r = ROOTS) {
  return { verbs: nat(r.verbs), verbsWithRoot: nat(r.withRoot), verbsWithBinyan: nat(r.withPattern), explorer: nat(r.explorer), explorerWithRoot: nat(r.explorerWithRoot),
    familiesOf2Plus: nat(r.familiesOf2Plus), familiesOf3Plus: nat(r.familiesOf3Plus), familiesRuleChecked: nat(r.familiesRuleChecked), familiesVerified: nat(r.familiesVerified) };
}

// ---------- activity points (the Daily page calendar and its week line; not XP) ----------
/**
 * Activity points: lessons 10, review cards 1 (up to 20 a day), timed reads 5, speaking tries 1 (up to 5 a day). Only the Daily
 * calendar, its week line, its quests and the practice-day rule count these; XP (Home, Daily goal ring) is counted separately (SCOPE).
 */
export const ACTIVITY = Object.freeze({ weights: Object.freeze({ lesson: 10, review: 1, read: 5, speak: 1 }), caps: Object.freeze({ review: 20, speak: 5 }), practicePoints: 5, goal: 20 });
/** Activity points for one day record ({lessons:string[], r, t, s}: lessons finished, review cards, timed reads, speaking tries). */
export function activityPoints(day) {
  const d = obj(day), W = ACTIVITY.weights, C = ACTIVITY.caps;
  const lessons = Array.isArray(d.lessons) ? new Set(d.lessons.filter((x) => typeof x === 'string')).size : 0;
  return lessons * W.lesson + Math.min(nat(d.r), C.review) * W.review + nat(d.t) * W.read + Math.min(nat(d.s), C.speak) * W.speak;
}
/** Calendar level 0..3: 0 none, 1 some, 2 a practice day, 3 the activity goal reached. */
export function activityLevel(points, goal = ACTIVITY.goal) {
  const p = nat(points); return p <= 0 ? 0 : p >= Math.max(1, nat(goal)) ? 3 : p >= ACTIVITY.practicePoints ? 2 : 1;
}
/** '1 activity point', '12 activity points' */
export const activityText = (n) => count(n, 'activity point');
/** The audio catalogue counted from the five served manifests at build time. */
export const AUDIO_CATALOGUE = Object.freeze({ ...TOTALS.audio });
/** True when data/audio/summary.json agrees with the served manifests (total entries and synthetic entries). */
export const audioReconciles = (summary) => !!summary && summary.total === AUDIO_CATALOGUE.total && summary.tts === AUDIO_CATALOGUE.synthetic && summary.recorded === AUDIO_CATALOGUE.recorded;
/** 'Version 0.1.0, built 2026-11-11 20:56 UTC' */
export function buildStamp(b = BUILD) {
  const at = typeof b?.builtAt === 'string' ? b.builtAt.replace('T', ' ').replace(/:\d\dZ$/, ' UTC') : 'unknown time';
  return `Version ${b?.version || '0.0.0'}, built ${at}`;
}

// ---------- everything at once ----------
/** Read every stored record the counts need. Never throws. @param {{get:Function}} store */
export function read(store) {
  const g = (k) => { try { return store?.get?.(k) ?? null; } catch { return null; } };
  const prog = obj(g(KEYS.progress)), st = obj(g(KEYS.progressState));
  return { completed: obj(prog.completed), cards: g(KEYS.cards) || {}, vocab: g(KEYS.vocab) || {}, streak: g(KEYS.streak), retention: g(KEYS.retention),
    dailyGoal: g(KEYS.dailyGoal), books: g(KEYS.books), rest: Array.isArray(st.rest) ? st.rest.filter((d) => typeof d === 'string') : [] };
}
/** Every per-learner count for `now`, from one read of the store. */
export function readCounts(store, now = Date.now()) {
  const s = read(store);
  return {
    xp: xpGoal(s.retention, now), minutes: minutesGoal(s.streak, s.dailyGoal, now), streak: streakNow(s.streak, now, s.rest),
    lessonsFinished: lessonsFinished(s.completed), lessonsToday: lessonsFinishedToday(s.completed, now),
    reviewsDue: reviewsDue(s.cards, now), wordsDue: wordsDue(s.vocab, now), reviewCardsThisWeek: reviewCardsThisWeek(s.cards, s.vocab, now), reviewedToday: reviewedToday(s.cards, now),
    gems: gemsOf(s.retention), hearts: heartsOf(s.retention, now), repair: repairOffer(s.retention, s.streak, now),
    week: weekDays(s.streak, s.retention, now, s.rest), booksFinished: booksFinished(s.books),
  };
}
