// What may be shown as earned. Practice badges come from saved game sessions.
// The beginner certificate uses the shipped review flag, which is not reviewed,
// so certificateDecision does not issue. evaluateProposedCertificate is the pure
// rule a later review can call. It does not read completion flags and it does not write.

import { itemSatisfied } from './contract.js';
import { observeGames } from './observe.js';
import { CRITERIA_REVIEWED, REVIEW_STATUS } from './rubric.js';
import { cleanRecord, readAwards, toStored, writeAwards } from './record.js';

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
 * Pure certificate rule. criteriaReviewed must be exactly true, and every item needs an
 * objective correct event. An empty item list does not pass. This function does not write.
 */
export function evaluateProposedCertificate({ criteriaReviewed, items, evidence }) {
  const required = Array.isArray(items) ? items : [];
  const ev = Array.isArray(evidence) ? evidence : [];
  const satisfied = required.filter((it) => it && itemSatisfied(ev, it.id));
  const missing = required.filter((it) => it && !itemSatisfied(ev, it.id));
  const base = { satisfied: satisfied.length, required: required.length, missingIds: missing.map((it) => it.id) };
  if (!required.length) return { issuable: false, reason: 'no-criteria', ...base };
  if (criteriaReviewed !== true) return { issuable: false, reason: 'criteria-awaiting-review', ...base };
  if (missing.length) return { issuable: false, reason: 'evidence-missing', ...base };
  return { issuable: true, reason: 'objective-evidence', ...base };
}

/**
 * Certificate decision for the page. The review flag is the shipped constant, not an argument
 * and not a field in the learner record. Passing a rubric copy with criteriaReviewed true
 * does not issue a certificate.
 */
export function certificateDecision(record, rubric) {
  const items = Array.isArray(rubric?.items) ? rubric.items : [];
  const evidence = cleanRecord(record).record.evidence;
  const shipped = CRITERIA_REVIEWED === true && REVIEW_STATUS === 'reviewed';
  const decision = evaluateProposedCertificate({ criteriaReviewed: shipped, items, evidence });
  return {
    ...decision,
    reviewStatus: REVIEW_STATUS,
    criteriaReviewed: CRITERIA_REVIEWED,
    confirmed: false,
    localOnly: true,
  };
}

export function evidenceLabel(item, evidence) {
  const rows = (evidence || []).filter((e) => e && e.itemId === item.id);
  const pass = rows.some((e) => e.correct === true && e.trust === 'objective');
  const fail = rows.some((e) => e.correct === false);
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
  return [...practice, {
    ...COMPLETION_BADGE,
    state: 'locked',
    stateText: 'Locked',
    requirement: completionText(decision),
    detail: completionText(decision),
  }];
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
  const planned = planPractice(loaded.record, games, now);
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
