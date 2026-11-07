// What may be shown as earned. Practice badges come from saved game sessions.
// The beginner certificate uses the shipped review flag, which is not reviewed,
// so certificateDecision does not issue. evaluateProposedCertificate is the pure
// rule a later review can call. It does not read completion flags and it does not write.

import { itemSatisfied } from './contract.js';
import { observeGames, observeStreak } from './observe.js';
import { CRITERIA_REVIEWED, REVIEW_STATUS, RUBRIC_ID, deriveBeginnerRubric } from './rubric.js';
import { cleanRecord, readAwards, toStored, writeAwards } from './record.js';
import { lessons as shippedLessons, belts as shippedBelts } from '../curriculum/lessons.js';

/** Ids of the shipped white-belt proposal. Not a reviewed standard. A shorter or edited list is not this candidate. */
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
    requirement: 'Finish one practice game on this device so the game saves a play count. This records a session, not a lesson and not a winning score. Opening Awards does not count.',
    lockedText: 'Locked. Finish one practice game: Antonym Tug-of-War, Vowel Catcher, Hebrew Pinball, Prefix Blast, or Memory Palace. A visit to this page does not count.',
  },
  {
    id: 'game-return',
    category: 'practice',
    name: 'Returned to a practice game',
    requirement: 'The same practice game has a saved play count of at least 2. This is a return to a game, not a sign-in and not a lesson completion. Two different games, once each, do not count.',
    lockedText: 'Locked. Play the same practice game again until its saved play count is at least 2.',
  },
]);

export const COMPLETION_BADGE = Object.freeze({
  id: 'beginner-completion',
  category: 'completion',
  name: 'Beginner checklist',
});

/**
 * Daily and streak medallions. Every fact comes from a record the app itself
 * keeps: the streak engine's completed days and engaged seconds (store key
 * "streak"), the learner's daily goal, and the same saved game plays the
 * practice badges use. Thresholds read the LONGEST streak, so an earned
 * medallion never un-earns when a later streak is shorter. Activity, not
 * mastery — the same honesty rule as the practice badges.
 */
export const MILESTONE_BADGES = Object.freeze([
  {
    id: 'first-day',
    category: 'milestones',
    name: 'First study day',
    requirement: 'The streak record shows a completed study day on this device: a day with at least 5 engaged minutes, counted by the streak engine.',
    lockedText: 'Locked. Finish a study day: 5 engaged minutes makes the day count. Home shows the streak.',
  },
  {
    id: 'streak-3',
    category: 'milestones',
    name: 'Three days running',
    requirement: 'Your longest streak on this device reached 3 days. Shabbat and festival days are frozen by the streak engine and do not break the chain.',
    lockedText: 'Locked. Build a streak of 3 counted days. Rest days the streak engine freezes do not break it.',
  },
  {
    id: 'streak-7',
    category: 'milestones',
    name: 'A full week',
    requirement: 'Your longest streak on this device reached 7 days, with frozen rest days not breaking the chain.',
    lockedText: 'Locked. Build a streak of 7 counted days.',
  },
  {
    id: 'streak-30',
    category: 'milestones',
    name: 'A full month',
    requirement: 'Your longest streak on this device reached 30 days, with frozen rest days not breaking the chain.',
    lockedText: 'Locked. Build a streak of 30 counted days.',
  },
  {
    id: 'goal-met',
    category: 'milestones',
    name: 'Daily goal met',
    requirement: 'Engaged study time in one day reached your daily goal (the minutes goal set on Home; 5 minutes if you have not set one). Stamped on the day it is reached.',
    lockedText: 'Locked. Reach your daily goal of engaged minutes in a single day.',
  },
  {
    id: 'games-5',
    category: 'milestones',
    name: 'All five practice games',
    requirement: 'Each of the five practice games Awards watches (Antonym Tug-of-War, Vowel Catcher, Hebrew Pinball, Prefix Blast, Memory Palace) has a saved play on this device.',
    lockedText: 'Locked. Play each of the five practice games at least once: Tug-of-War, Vowel Catcher, Pinball, Prefix Blast, and Memory Palace.',
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
    requirement: `${finish.label} is a locked finish on the beginner checklist. It is not earned. A visit or a practice game does not unlock it. No reviewed assessment is in place.`,
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
 * Add milestone medallions that the streak record, the daily goal and the
 * saved game plays support. Existing award times stay. `facts` comes from
 * observeStreak + observeGames (read-only); thresholds use the longest
 * streak so an earned medallion never un-earns.
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
  if ((f.best || 0) >= 3) grant('streak-3', { kind: 'streak-record', best: f.best });
  if ((f.best || 0) >= 7) grant('streak-7', { kind: 'streak-record', best: f.best });
  if ((f.best || 0) >= 30) grant('streak-30', { kind: 'streak-record', best: f.best });
  if (f.goalMet) grant('goal-met', { kind: 'daily-goal', goalMinutes: f.goalMinutes || 5 });
  const sessions = (games && games.sessions) || [];
  if (sessions.length >= 5) grant('games-5', { kind: 'game-plays', sessions: sessions.map((s) => ({ key: s.key, plays: s.plays, code: s.code })) });
  return { record: { ...base, awards }, newly };
}

/**
 * Pure certificate rule. Does not write. The page does not call this to issue.
 * `confirmed` must be the boolean true. Omitted, null, and false do not issue.
 * `items` must be the shipped white-belt candidate, in order, with no holes and no substitutions.
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
  if (pass) return { state: 'recorded', text: 'Objective correct answer recorded. The criteria are still awaiting review, so this does not earn a certificate.' };
  if (fail) return { state: 'not-correct', text: 'An objective answer was recorded as not correct. That does not earn this item. Evidence missing for a pass.' };
  return { state: 'missing', text: 'Evidence missing.' };
}

export function completionText(decision) {
  const n = decision ? decision.satisfied : 0;
  const need = decision ? decision.required : 0;
  if (decision && decision.required > 0 && decision.satisfied === decision.required) {
    return `Locked. Objective answers are recorded for all ${need} proposed items. The criteria are still awaiting review, so this badge stays locked and no certificate is issued. Visits and lesson ticks do not unlock it.`;
  }
  return `Locked. Objective answers recorded: ${n} of ${need}. The proposed checklist is awaiting review, so this badge stays locked. Visits, games, lesson ticks, and self-marked reading do not unlock it.`;
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
    return `Earned. Activity, not mastery. Engaged study time in one day reached your daily goal of ${basis.goalMinutes || 5} minutes on this device.`;
  }
  if (badge.id === 'games-5') {
    return 'Earned. Activity, not mastery. All five practice games have a saved play on this device.';
  }
  if (badge.id === 'first-day') {
    return 'Earned. Activity, not mastery. A completed study day is recorded on this device by the streak engine.';
  }
  if (Number.isInteger(basis.best)) {
    return `Earned. Activity, not mastery. Your longest recorded streak reached ${basis.best} days on this device. Frozen rest days did not break it.`;
  }
  return 'Earned. Activity, not mastery. The streak record on this device supports this medallion. Frozen rest days did not break the chain.';
}

function earnedDetail(badge, record, games) {
  const live = (games && games.sessions ? games.sessions : []).map((s) => `${s.title} ${s.plays}`).join(', ');
  const tail = live ? ` Saved play counts now: ${live}.` : '';
  if (badge.id === 'game-return') {
    return `Earned. Activity, not mastery. The same practice game has been saved more than once on this device. This is not a lesson result.${tail}`;
  }
  return `Earned. Activity, not mastery. A practice game on this device saved a play. That records the session, not a lesson and not a winning score.${tail}`;
}

/**
 * Read, maybe add practice badges, stamp the first opening of Awards. Does not grant a certificate.
 * If the write fails, previously stored awards stay and new ones are not marked earned.
 */
export function settleAwards(store, rubric, now) {
  const loaded = readAwards(store);
  const games = observeGames(store);
  const streak = observeStreak(store, now);
  const plannedPractice = planPractice(loaded.record, games, now);
  const planned = planMilestones(plannedPractice.record, streak, games, now);
  planned.newly = [...plannedPractice.newly, ...planned.newly];
  let next = planned.record;
  if (!next.openedAt) next = { ...next, openedAt: now };
  const changed = !sameRecord(loaded.record, next);
  const save = changed ? writeAwards(store, next) : { saved: true, persistent: store?.persistent !== false, wrote: false };
  const record = save.saved ? (changed ? next : loaded.record) : loaded.record;
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
