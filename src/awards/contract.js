// The caller chooses `source` and `trust`. This function only compares those strings to two literals.
// It does not identify the caller. A match is not proof that an assessment engine produced the event.
// Accepted events are data on this device. This module does not send them anywhere.
//
// Call acceptAssessmentEvent with one checked item result. withEvidence (in record.js)
// is the only way that result is stored, and only after this function accepts it.
// This module does not read lesson completion, and it does not grant a badge or a certificate.
//
// Accepted event, every field required:
//   kind: 'assessment.item'
//   rubricId: 'beginner-white-v1'
//   itemId: a proposed checklist id such as 'letter:shin' or 'word:r04:3'
//   correct: boolean. false is stored as a miss. It does not satisfy the item.
//   trust: 'objective'
//   source: 'assessment-engine'
//   evidenceId: idempotency key, 8 to 80 characters, [A-Za-z0-9._:-]
//   at: finite timestamp in milliseconds, greater than 0
// Any of these keys rejects the whole event: completed, lessonComplete, selfMarked, win, xp, passed.
//
// Rejected sources include curriculum.progress, completeLesson, saveQuickCheck, the Mark complete
// control, letters.progress, timedread.v1, speak.v1, firstday.progress, firstday.ladder, loops.v1,
// visits, and logins. A bare { completed: true } is not an event.

import { RUBRIC_ID } from './rubric.js';

export const TRUSTED_TRUST = 'objective';
export const TRUSTED_SOURCE = 'assessment-engine';
export const EVENT_KIND = 'assessment.item';

export const REJECTED_SOURCES = Object.freeze([
  'curriculum.progress',
  'completeLesson',
  'saveQuickCheck',
  'mark-complete',
  'letters.progress',
  'timedread.v1',
  'speak.v1',
  'firstday.progress',
  'firstday.ladder',
  'loops.v1',
  'self',
  'self-marked',
  'self-reported',
  'legacy',
  'xp',
  'visit',
  'login',
]);

const FORBIDDEN = new Set(['completed', 'lessonComplete', 'selfMarked', 'win', 'xp', 'passed']);
const ITEM_ID = /^[a-z][a-z0-9:-]{0,80}$/;
const EVIDENCE_ID = /^[A-Za-z0-9._:-]{8,80}$/;

/**
 * Validate one assessment event. Never writes. Never treats a completion flag as evidence.
 * @param {any} event
 * @returns {{accepted:true, evidence:object}|{accepted:false, reason:string}}
 */
export function acceptAssessmentEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) return { accepted: false, reason: 'not-an-event' };
  for (const key of Object.keys(event)) {
    if (FORBIDDEN.has(key)) return { accepted: false, reason: 'completion-flag' };
  }
  if (event.kind !== EVENT_KIND) return { accepted: false, reason: 'kind' };
  if (event.rubricId !== RUBRIC_ID) return { accepted: false, reason: 'rubric' };
  if (typeof event.itemId !== 'string' || !ITEM_ID.test(event.itemId)) return { accepted: false, reason: 'item' };
  if (typeof event.correct !== 'boolean') return { accepted: false, reason: 'correct' };
  if (event.trust !== TRUSTED_TRUST) return { accepted: false, reason: 'trust' };
  if (event.source !== TRUSTED_SOURCE) return { accepted: false, reason: 'source' };
  if (typeof event.evidenceId !== 'string' || !EVIDENCE_ID.test(event.evidenceId)) return { accepted: false, reason: 'evidence-id' };
  if (!Number.isFinite(event.at) || event.at <= 0) return { accepted: false, reason: 'time' };
  return {
    accepted: true,
    evidence: {
      kind: EVENT_KIND,
      rubricId: RUBRIC_ID,
      itemId: event.itemId,
      correct: event.correct,
      trust: TRUSTED_TRUST,
      source: TRUSTED_SOURCE,
      evidenceId: event.evidenceId,
      at: event.at,
    },
  };
}

/** True only for an accepted objective correct answer on this item. A wrong answer does not satisfy it. */
export function itemSatisfied(evidence, itemId) {
  return (evidence || []).some((e) => e
    && e.itemId === itemId
    && e.correct === true
    && e.trust === TRUSTED_TRUST
    && e.source === TRUSTED_SOURCE
    && e.kind === EVENT_KIND);
}
