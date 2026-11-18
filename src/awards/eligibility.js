import { reactRimon } from '../shell/rimon-events.js';
import { bookFinisherScope } from '../lib/counts.js';
// What may be shown as earned. Practice badges come from saved game sessions.
// The beginner certificate uses the shipped review flag, which is not reviewed,
// so certificateDecision does not issue. evaluateProposedCertificate is the pure
// rule a later review can call. It does not read completion flags and it does not write.

import { itemSatisfied } from './contract.js';
import { observeBadgeEvidence, observeGames, observeStreak, BOOK_FINISHER_TARGET, BOOK_SHELF_COUNT } from './observe.js';
import { CRITERIA_REVIEWED, REVIEW_STATUS, RUBRIC_ID, deriveBeginnerRubric } from './rubric.js';
import { cleanRecord, readAwards, toStored, writeAwards } from './record.js';
import { lessons as shippedLessons, belts as shippedBelts } from '../curriculum/lessons.js';

/** Ids of the shipped beginner proposal (White belt · P0 and Yellow belt · P1). Not a reviewed standard. A shorter or edited list is not this candidate. */
export const CANONICAL_CANDIDATE_IDS = Object.freeze(
  deriveBeginnerRubric({ lessons: shippedLessons }, shippedBelts).items.map((it) => it.id),
);

function isCanonicalCandidate(items) {
  if (!Array.isArray(items) || items.length !== CANONICAL_CANDIDATE_IDS.length) return false;
  for (let i = 0; i < items.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(items, i)) return false;
    const it = items[i];
    if (!it || it.id !== CANONICAL_CANDIDATE_IDS[i]) return false;
  }
  return true;
}

export const PRACTICE_BADGES = Object.freeze([
  {
    id: 'game-session',
    category: 'practice',
    name: 'Practice game session',
    requirement: 'Finish a practice game.',
    lockedText: 'Locked. Try Antonym Tug-of-War, Vowel Catcher, Hebrew Pinball, Prefix Blast or Memory Palace.',
  },
  {
    id: 'game-return',
    category: 'practice',
    name: 'Returned to a practice game',
    requirement: 'Play the same practice game a second time.',
    lockedText: 'Locked. Go back to a game you have played and finish it again.',
  },
]);

export const COMPLETION_BADGE = Object.freeze({
  id: 'beginner-completion',
  category: 'completion',
  name: 'Beginner checklist',
});

/**
 * The 25 medallions: an eleven-step streak ladder plus the milestone and
 * mastery set. Every fact comes from a record the app itself keeps — the
 * streak engine's completed days (store key "streak"), the daily goal, the
 * saved game plays, the review-deck cards, the opening-prayer listen count,
 * and the day-start stamp. Thresholds read the LONGEST streak and the best
 * totals, so an earned medallion never un-earns. A badge whose evidence the
 * app cannot observe yet keeps a locked requirement that says exactly what
 * record is missing; its planner grant below reads a store key that no view
 * writes today, so it cannot grant until that writer lands. Activity, not
 * mastery — the same honesty rule as the practice medallions.
 */
export const STREAK_LADDER = Object.freeze([2, 3, 4, 5, 6, 7, 14, 30, 100, 180, 365]);

const ladderBadge = (days, name, art) => ({
  id: 'streak-' + days,
  category: 'milestones',
  section: 'ladder',
  name,
  art,
  requirement: `Reach a ${days}-day streak.`,
  lockedText: `Locked. Study for at least 5 minutes a day, ${days} days in a row.`,
});

export const MILESTONE_BADGES = Object.freeze([
  ladderBadge(2, 'Day Two', 'a sprout with two leaves'),
  ladderBadge(3, 'Day Three', 'a seedling with three leaves'),
  ladderBadge(4, 'Day Four', 'a young branch with four leaves'),
  ladderBadge(5, 'Day Five', 'a branch with five leaves and one bud'),
  ladderBadge(6, 'Day Six', 'a leafy shoot with six leaves'),
  ladderBadge(7, 'One Week', 'an olive branch'),
  ladderBadge(14, 'Two Weeks', 'a small olive tree'),
  ladderBadge(30, 'One Month', 'a ripe pomegranate'),
  ladderBadge(100, 'Hundred Days', 'a full olive tree'),
  ladderBadge(180, 'Half Year', 'a crown over an olive branch'),
  ladderBadge(365, 'One Year', 'the Tree of Life'),
  {
    id: 'first-day',
    category: 'milestones',
    section: 'mastery',
    name: 'First Steps',
    requirement: 'Finish your first study day.',
    lockedText: 'Locked. Study for 5 minutes in one day.',
  },
  {
    id: 'goal-met',
    category: 'milestones',
    section: 'mastery',
    name: 'Daily Goal',
    requirement: 'Reach your daily goal.',
    lockedText: 'Locked. Study for your daily goal in one day. The goal is 5 minutes unless you change it on Home.',
  },
  {
    id: 'games-5',
    category: 'milestones',
    section: 'mastery',
    name: 'Gamer',
    requirement: 'Play all five practice games.',
    lockedText: 'Locked. Play Antonym Tug-of-War, Vowel Catcher, Hebrew Pinball, Prefix Blast and Memory Palace at least once each.',
  },
  {
    id: 'yolo',
    category: 'milestones',
    section: 'mastery',
    name: 'YOLO',
    requirement: 'Earn three stars the first time you finish a game.',
    lockedText: 'Locked. Pick a game you have not played yet and go for three stars.',
  },
  {
    id: 'cafe-master',
    category: 'milestones',
    section: 'mastery',
    name: 'Cafe Master',
    requirement: 'Finish the café dialogue, At the Café.',
    lockedText: 'Locked. This badge cannot be earned yet.',
  },
  {
    id: 'market-master',
    category: 'milestones',
    section: 'mastery',
    name: 'Market Master',
    requirement: 'Finish the Market Bargains game, Barter at the Shuk.',
    lockedText: 'Locked. Play Market Bargains all the way to the end.',
  },
  {
    id: 'letter-master',
    category: 'milestones',
    section: 'mastery',
    name: 'Letter Master',
    requirement: 'Collect all 27 letters, including the five final forms, in your review deck.',
    lockedText: 'Locked. Keep going with the lessons. Each new letter joins your review deck.',
  },
  {
    id: 'word-collector',
    category: 'milestones',
    section: 'mastery',
    name: 'Word Collector',
    requirement: 'Collect 500 word cards in your review decks.',
    lockedText: 'Locked. Add words through your lessons and vocabulary practice.',
  },
  {
    id: 'prayer-voice',
    category: 'milestones',
    section: 'mastery',
    name: 'Prayer Voice',
    requirement: 'Listen to the opening prayer on Home 10 times.',
    lockedText: 'Locked. Tap Listen on the opening prayer on Home.',
  },
  {
    id: 'cantorial-fan',
    category: 'milestones',
    section: 'mastery',
    name: 'Cantorial Fan',
    requirement: 'Play five different recordings on the Sacred Listen shelf.',
    lockedText: 'Locked. This badge cannot be earned yet.',
  },
  {
    id: 'book-finisher',
    category: 'milestones',
    section: 'mastery',
    name: 'Book Finisher',
    requirement: `Finish ${bookFinisherScope()}.`,
    lockedText: 'Locked. Read a little book to its last page and answer its story question.',
  },
  {
    id: 'early-bird',
    category: 'milestones',
    section: 'mastery',
    name: 'Early Bird',
    requirement: 'Start your study day before 8 AM.',
    lockedText: 'Locked. Open Aleph before 8 AM, then study for 5 minutes that day.',
  },
  {
    id: 'night-owl',
    category: 'milestones',
    section: 'mastery',
    name: 'Night Owl',
    requirement: 'Start your study day at 10 PM or later.',
    lockedText: 'Locked. Make your first visit of the day at 10 PM or later, then study for 5 minutes.',
  },
  {
    id: 'root-digger',
    category: 'milestones',
    section: 'mastery',
    name: 'Root Digger',
    requirement: 'Finish the Root Tree game.',
    lockedText: 'Locked. Play Root Tree all the way to the end.',
  },
]);

/** Layout slots only. Nothing in this lane sets one of these to earned. */
export const MASTERY_FINISHES = Object.freeze([
  { id: 'matte', label: 'Matte' },
  { id: 'polished', label: 'Polished' },
  { id: 'foil', label: 'Foil' },
]);

export function masterySlots() {
  return MASTERY_FINISHES.map((finish) => ({
    id: 'mastery-' + finish.id,
    finish: finish.id,
    label: finish.label,
    state: 'locked',
    stateText: 'Locked',
    category: 'mastery-layout',
    requirement: `The ${finish.label.toLowerCase()} finish is not open yet.`,
  }));
}

function sameRecord(a, b) {
  return JSON.stringify(toStored(a)) === JSON.stringify(toStored(b));
}

/**
 * Add practice badges that the game records support. Existing award times stay.
 * Never adds the completion badge.
 */
export function planPractice(record, games, now) {
  const base = cleanRecord(record).record;
  const awards = { ...base.awards };
  const newly = [];
  const want = [];
  if (games && games.anyPlay) want.push('game-session');
  if (games && games.returned) want.push('game-return');
  const sessions = (games && games.sessions ? games.sessions : []).map((s) => ({ key: s.key, plays: s.plays, code: s.code }));
  for (const id of want) {
    if (!awards[id]) {
      awards[id] = { at: now, basis: { kind: 'game-plays', sessions } };
      newly.push(id);
    }
  }
  return { record: { ...base, awards }, newly };
}

/**
 * Add medallions that the observed records support. Existing award times
 * stay. `facts` comes from observeStreak + observeBadgeEvidence (read-only);
 * thresholds use the longest streak and best totals so an earned medallion
 * never un-earns. Grants for records no view writes yet (dialogue finishes,
 * shelf plays, finished books) read as no-evidence until those writers land.
 */
export function planMilestones(record, facts, games, now) {
  const base = cleanRecord(record).record;
  const awards = { ...base.awards };
  const newly = [];
  const grant = (id, basis) => {
    if (!awards[id]) { awards[id] = { at: now, basis }; newly.push(id); }
  };
  const f = facts || {};
  if (f.anyDay) grant('first-day', { kind: 'streak-record', best: f.best || 0 });
  for (const days of STREAK_LADDER) {
    if ((f.best || 0) >= days) grant('streak-' + days, { kind: 'streak-record', best: f.best });
  }
  if (f.goalMet) grant('goal-met', { kind: 'daily-goal', goalMinutes: f.goalMinutes || 5 });
  const sessions = (games && games.sessions) || [];
  if (sessions.length >= 5) grant('games-5', { kind: 'game-plays', sessions: sessions.map((s) => ({ key: s.key, plays: s.plays, code: s.code })) });
  if (f.firstAttempt) grant('yolo', { kind: 'first-attempt', key: f.firstAttempt.key, stars: f.firstAttempt.stars });
  if (f.cafeDone) grant('cafe-master', { kind: 'dialogue-done', id: 'd-cafe' });
  if ((f.barterPlays || 0) >= 1) grant('market-master', { kind: 'game-plays', sessions: [{ key: 'games.barter.v1', plays: f.barterPlays }] });
  if ((f.rootPlays || 0) >= 1) grant('root-digger', { kind: 'game-plays', sessions: [{ key: 'games.roottree.v1', plays: f.rootPlays }] });
  if ((f.lettersMet || 0) >= 27) grant('letter-master', { kind: 'letters-met', count: f.lettersMet });
  if ((f.wordCards || 0) >= 500) grant('word-collector', { kind: 'word-cards', count: f.wordCards });
  if ((f.prayerListens || 0) >= 10) grant('prayer-voice', { kind: 'prayer-listens', count: f.prayerListens });
  if ((f.shelfDistinct || 0) >= 5) grant('cantorial-fan', { kind: 'shelf-listens', count: f.shelfDistinct });
  if (f.booksAllFive) grant('book-finisher', { kind: 'books-finished', count: f.booksFinished || BOOK_FINISHER_TARGET });
  const stamp = f.dayStart;
  if (stamp && typeof stamp.date === 'string' && Number.isFinite(stamp.firstAt)) {
    const dayCounted = (Array.isArray(f.doneDates) && f.doneDates.includes(stamp.date)) || f.last === stamp.date;
    if (dayCounted) {
      const hour = new Date(stamp.firstAt).getHours();
      if (hour < 8) grant('early-bird', { kind: 'day-start', date: stamp.date, hour });
      if (hour >= 22) grant('night-owl', { kind: 'day-start', date: stamp.date, hour });
    }
  }
  return { record: { ...base, awards }, newly };
}

/**
 * Pure certificate rule. Does not write. The page does not call this to issue.
 * `confirmed` must be the boolean true. Omitted, null, and false do not issue.
 * `items` must be the shipped beginner candidate (White belt · P0 and Yellow belt · P1), in order, with no holes and no substitutions.
 * A shorter, empty, or rewritten list is not that candidate. `CRITERIA_REVIEWED` stays false,
 * and `certificateDecision` always passes `confirmed: false`, so this does not unlock issuance.
 */
export function evaluateProposedCertificate({ criteriaReviewed, confirmed, items, evidence }) {
  const required = Array.isArray(items) ? items : [];
  const ev = Array.isArray(evidence) ? evidence : [];
  const satisfied = required.filter((it) => it && itemSatisfied(ev, it.id));
  const missing = required.filter((it) => it && !itemSatisfied(ev, it.id));
  const base = { satisfied: satisfied.length, required: required.length, missingIds: missing.map((it) => it && it.id).filter(Boolean) };
  const confirmedOk = confirmed === true;
  if (!required.length) return { issuable: false, confirmed: confirmedOk, reason: 'no-criteria', ...base };
  if (!isCanonicalCandidate(items)) return { issuable: false, confirmed: confirmedOk, reason: 'not-canonical-candidate', ...base };
  if (criteriaReviewed !== true) return { issuable: false, confirmed: confirmedOk, reason: 'criteria-awaiting-review', ...base };
  if (missing.length) return { issuable: false, confirmed: confirmedOk, reason: 'evidence-missing', ...base };
  if (!confirmedOk) return { issuable: false, confirmed: false, reason: 'criteria-not-confirmed', ...base };
  return { issuable: true, confirmed: true, reason: 'objective-evidence', ...base };
}

/**
 * Certificate decision for the page. The review flag is the shipped constant, not an argument
 * and not a field in the learner record. `confirmed` stays false: criteria are not approved.
 * A false confirmed value cannot be issuable, including if a caller treats the review constant as true.
 */
export function certificateDecision(record, rubric) {
  const items = Array.isArray(rubric?.items) ? rubric.items : [];
  const evidence = cleanRecord(record).record.evidence;
  const shipped = CRITERIA_REVIEWED === true && REVIEW_STATUS === 'reviewed';
  const decision = evaluateProposedCertificate({ criteriaReviewed: shipped, confirmed: false, items, evidence });
  const issuable = decision.issuable === true && decision.confirmed === true;
  return {
    ...decision,
    issuable,
    reason: issuable ? decision.reason : (decision.reason === 'objective-evidence' ? 'criteria-not-confirmed' : decision.reason),
    reviewStatus: REVIEW_STATUS,
    criteriaReviewed: CRITERIA_REVIEWED,
    confirmed: false,
    localOnly: true,
  };
}

export function evidenceLabel(item, evidence) {
  const rows = (evidence || []).filter((e) => e && e.itemId === item.id);
  const pass = rows.some((e) => e.correct === true && e.trust === 'objective' && e.rubricId === RUBRIC_ID);
  const fail = rows.some((e) => e.correct === false && e.rubricId === RUBRIC_ID);
  if (pass) return { state: 'recorded', text: 'Done.' };
  if (fail) return { state: 'not-correct', text: 'Not yet. The last answer was not correct.' };
  return { state: 'missing', text: 'Not yet.' };
}

export function completionText(decision) {
  const n = decision ? decision.satisfied : 0;
  const need = decision ? decision.required : 0;
  if (decision && decision.required > 0 && decision.satisfied === decision.required) {
    return `Locked. All ${need} checklist skills are done, but this badge is not open yet.`;
  }
  return `Locked. Checklist skills done: ${n} of ${need}. This badge is not open yet.`;
}

export function badgeRows(record, games, decision) {
  const clean = cleanRecord(record).record;
  const practice = PRACTICE_BADGES.map((badge) => {
    const earned = !!clean.awards[badge.id];
    return {
      ...badge,
      state: earned ? 'earned' : 'locked',
      stateText: earned ? 'Earned' : 'Locked',
      detail: earned ? earnedDetail(badge, clean, games) : badge.lockedText,
    };
  });
  const milestones = MILESTONE_BADGES.map((badge) => {
    const earned = !!clean.awards[badge.id];
    return {
      ...badge,
      state: earned ? 'earned' : 'locked',
      stateText: earned ? 'Earned' : 'Locked',
      detail: earned ? earnedMilestoneDetail(badge, clean) : badge.lockedText,
    };
  });
  return [...practice, ...milestones, {
    ...COMPLETION_BADGE,
    state: 'locked',
    stateText: 'Locked',
    requirement: completionText(decision),
    detail: completionText(decision),
  }];
}

function earnedMilestoneDetail(badge, record) {
  const basis = (record.awards[badge.id] || {}).basis || {};
  if (badge.id === 'goal-met') {
    return `Earned. You reached your daily goal of ${basis.goalMinutes || 5} minutes.`;
  }
  if (badge.id === 'games-5') {
    return 'Earned. You played all five practice games.';
  }
  if (badge.id === 'first-day') {
    return 'Earned. You finished your first study day.';
  }
  if (badge.id === 'yolo') {
    return 'Earned. Three stars on your first try.';
  }
  if (badge.id === 'cafe-master') {
    return 'Earned. You finished the café dialogue.';
  }
  if (badge.id === 'market-master') {
    return 'Earned. You finished Market Bargains.';
  }
  if (badge.id === 'root-digger') {
    return 'Earned. You finished Root Tree.';
  }
  if (badge.id === 'letter-master') {
    return `Earned. Your review deck holds all ${basis.count || 27} letters.`;
  }
  if (badge.id === 'word-collector') {
    return `Earned. Your review decks hold ${basis.count || 500} word cards.`;
  }
  if (badge.id === 'prayer-voice') {
    return `Earned. You listened to the opening prayer ${basis.count || 10} times.`;
  }
  if (badge.id === 'cantorial-fan') {
    return `Earned. You played ${basis.count || 5} different recordings.`;
  }
  if (badge.id === 'book-finisher') {
    return `Earned. You finished ${basis.count || BOOK_FINISHER_TARGET} of the ${BOOK_SHELF_COUNT} little books.`;
  }
  if (badge.id === 'early-bird' || badge.id === 'night-owl') {
    const when = Number.isInteger(basis.hour) && basis.hour >= 0 ? ` between ${basis.hour}:00 and ${basis.hour + 1}:00` : '';
    return `Earned. Your study day began${when}${basis.date ? ` on ${basis.date}` : ''}.`;
  }
  if (Number.isInteger(basis.best)) {
    return `Earned. Your longest streak reached ${basis.best} days.`;
  }
  return 'Earned. Your streak reached this step.';
}

function earnedDetail(badge, record, games) {
  const live = (games && games.sessions ? games.sessions : []).map((s) => `${s.title} ${s.plays}`).join(', ');
  const tail = live ? ` Games played: ${live}.` : '';
  if (badge.id === 'game-return') {
    return `Earned. You came back to a practice game.${tail}`;
  }
  return `Earned. You finished a practice game.${tail}`;
}

/**
 * Read, maybe add practice badges, stamp the first opening of Awards. Does not grant a certificate.
 * If the write fails, previously stored awards stay and new ones are not marked earned.
 */
export function settleAwards(store, rubric, now) {
  const loaded = readAwards(store);
  const games = observeGames(store);
  const streak = observeStreak(store, now);
  const facts = { ...streak, ...observeBadgeEvidence(store) };
  const plannedPractice = planPractice(loaded.record, games, now);
  const planned = planMilestones(plannedPractice.record, facts, games, now);
  planned.newly = [...plannedPractice.newly, ...planned.newly];
  let next = planned.record;
  if (!next.openedAt) next = { ...next, openedAt: now };
  const changed = !sameRecord(loaded.record, next);
  const save = changed ? writeAwards(store, next) : { saved: true, persistent: store?.persistent !== false, wrote: false };
  const record = save.saved ? (changed ? next : loaded.record) : loaded.record;
  if (save.saved && planned.newly.length) reactRimon('stretch');
  const decision = certificateDecision(record, rubric);
  return {
    loaded,
    record,
    games,
    decision,
    save,
    rubric,
    newly: save.saved ? planned.newly : [],
    unsaved: save.saved ? [] : planned.newly,
    visit: loaded.record.openedAt ? 'return' : 'first',
  };
}
