import { reactRimon } from '../shell/rimon-events.js';
// What may be shown as earned. Practice badges come from saved game sessions.
// The beginner certificate uses the shipped review flag, which is not reviewed,
// so certificateDecision does not issue. evaluateProposedCertificate is the pure
// rule a later review can call. It does not read completion flags and it does not write.

import { itemSatisfied } from './contract.js';
import { observeBadgeEvidence, observeGames, observeStreak } from './observe.js';
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
  requirement: `Your longest streak on this device reached ${days} days. Shabbat and festival days are frozen by the streak engine and do not break the chain.`,
  lockedText: `Locked. Build a streak of ${days} counted days. Rest days the streak engine freezes do not break it.`,
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
    requirement: 'The streak record shows a completed study day on this device: a day with at least 5 engaged minutes, counted by the streak engine.',
    lockedText: 'Locked. Finish a study day: 5 engaged minutes makes the day count. Home shows the streak.',
  },
  {
    id: 'goal-met',
    category: 'milestones',
    section: 'mastery',
    name: 'Daily Goal',
    requirement: 'Engaged study time in one day reached your daily goal (the minutes goal set on Home; 5 minutes if you have not set one). Stamped on the day it is reached.',
    lockedText: 'Locked. Reach your daily goal of engaged minutes in a single day.',
  },
  {
    id: 'games-5',
    category: 'milestones',
    section: 'mastery',
    name: 'Gamer',
    requirement: 'Each of the five practice games Awards watches (Antonym Tug-of-War, Vowel Catcher, Hebrew Pinball, Prefix Blast, Memory Palace) has a saved play on this device.',
    lockedText: 'Locked. Play each of the five practice games at least once: Tug-of-War, Vowel Catcher, Pinball, Prefix Blast, and Memory Palace.',
  },
  {
    id: 'yolo',
    category: 'milestones',
    section: 'mastery',
    name: 'YOLO',
    requirement: 'A game on this device has a saved record of exactly one finished session, and that first session earned three stars. The trace exists only until a second session is saved, so this is read from the one moment the record can prove it.',
    lockedText: 'Locked. Finish a game on your first-ever try at it and earn three stars. Only the first saved session can prove it.',
  },
  {
    id: 'cafe-master',
    category: 'milestones',
    section: 'mastery',
    name: 'Cafe Master',
    requirement: 'The café dialogue (At the cafe) is recorded as finished on this device.',
    lockedText: 'Locked. The dialogue pages do not yet record a finished dialogue, so this medallion cannot be earned yet. Reading a dialogue does not count.',
  },
  {
    id: 'market-master',
    category: 'milestones',
    section: 'mastery',
    name: 'Market Master',
    requirement: 'The Market Bargains game (Barter at the Shuk) has a saved finished session on this device: its full market set played to the end card.',
    lockedText: 'Locked. Finish the Market Bargains game once, all the way to its end card.',
  },
  {
    id: 'letter-master',
    category: 'milestones',
    section: 'mastery',
    name: 'Letter Master',
    requirement: 'Your review deck holds a card for each of the 27 letters the lessons teach, including the five final forms. A card appears when a lesson or checkpoint brings that letter into your deck.',
    lockedText: 'Locked. Bring all 27 letters into your review deck by working through the lessons.',
  },
  {
    id: 'word-collector',
    category: 'milestones',
    section: 'mastery',
    name: 'Word Collector',
    requirement: 'Your review decks hold 500 word cards between them: lesson word cards and vocabulary cards you added. A card means the word is in your deck for review, not that it is mastered.',
    lockedText: 'Locked. Grow your review decks to 500 word cards.',
  },
  {
    id: 'prayer-voice',
    category: 'milestones',
    section: 'mastery',
    name: 'Prayer Voice',
    requirement: 'The opening prayer on the home screen was played and heard 10 times on this device. Only a play that actually starts is counted; a failed play never counts.',
    lockedText: 'Locked. Use Listen on the opening prayer and hear 10 prayers.',
  },
  {
    id: 'cantorial-fan',
    category: 'milestones',
    section: 'mastery',
    name: 'Cantorial Fan',
    requirement: 'Five different historic recordings on the Sacred Listen shelf are recorded as played on this device.',
    lockedText: 'Locked. The Sacred Listen shelf does not yet record which recordings were played, so this medallion cannot be earned yet. The shelf still plays everything.',
  },
  {
    id: 'book-finisher',
    category: 'milestones',
    section: 'mastery',
    name: 'Book Finisher',
    requirement: 'All five story books are recorded as read to their last page on this device.',
    lockedText: 'Locked. Read all five story books to their last page. The reader records each book you finish.',
  },
  {
    id: 'early-bird',
    category: 'milestones',
    section: 'mastery',
    name: 'Early Bird',
    requirement: 'A counted study day on this device began before 8 in the morning: the day-start stamp (the first app opening of that day) is before 8:00 and the streak engine counts that day as completed.',
    lockedText: 'Locked. Start a study day before 8 AM and finish it: 5 engaged minutes makes the day count.',
  },
  {
    id: 'night-owl',
    category: 'milestones',
    section: 'mastery',
    name: 'Night Owl',
    requirement: 'A counted study day on this device began after 10 at night: the day-start stamp (the first app opening of that day) is 22:00 or later and the streak engine counts that day as completed.',
    lockedText: 'Locked. Start a study day at 10 PM or later and finish it: 5 engaged minutes makes the day count.',
  },
  {
    id: 'root-digger',
    category: 'milestones',
    section: 'mastery',
    name: 'Root Digger',
    requirement: 'The Root Tree game has a saved finished session on this device: its full root practice set played to the end card.',
    lockedText: 'Locked. Finish the Root Tree game once, all the way to its end card.',
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
    requirement: `${finish.label} opens once Aleph has a proper reading check, which is still being built. Visits and practice games do not count toward it.`,
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
  if (f.booksAllFive) grant('book-finisher', { kind: 'books-finished', count: f.booksFinished || 5 });
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
  return `Locked. Answers so far: ${n} of ${need}. This badge opens once Aleph has a proper reading check, which is still being built. Visits, games, lesson ticks and self-marked reading do not count toward it.`;
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
  if (badge.id === 'yolo') {
    return 'Earned. Activity, not mastery. One game on this device shows exactly one saved session, and that first session earned three stars.';
  }
  if (badge.id === 'cafe-master') {
    return 'Earned. Activity, not mastery. The café dialogue is recorded as finished on this device.';
  }
  if (badge.id === 'market-master') {
    return 'Earned. Activity, not mastery. The Market Bargains game has a saved finished session on this device.';
  }
  if (badge.id === 'root-digger') {
    return 'Earned. Activity, not mastery. The Root Tree game has a saved finished session on this device.';
  }
  if (badge.id === 'letter-master') {
    return `Earned. Activity, not mastery. Your review deck holds cards for ${basis.count || 27} letters on this device.`;
  }
  if (badge.id === 'word-collector') {
    return `Earned. Activity, not mastery. Your review decks hold ${basis.count || 500} word cards on this device.`;
  }
  if (badge.id === 'prayer-voice') {
    return `Earned. Activity, not mastery. The opening prayer was played and heard ${basis.count || 10} times on this device.`;
  }
  if (badge.id === 'cantorial-fan') {
    return `Earned. Activity, not mastery. ${basis.count || 5} different historic recordings are recorded as played on this device.`;
  }
  if (badge.id === 'book-finisher') {
    return 'Earned. Activity, not mastery. All five story books are recorded as read to their last page on this device.';
  }
  if (badge.id === 'early-bird' || badge.id === 'night-owl') {
    const when = Number.isInteger(basis.hour) && basis.hour >= 0 ? ` at ${basis.hour}:00 or within that hour` : '';
    return `Earned. Activity, not mastery. A counted study day on this device began${when} (day-start stamp ${basis.date || ''}).`.replace('  ', ' ');
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
