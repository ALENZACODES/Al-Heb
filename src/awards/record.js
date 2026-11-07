// Awards record on this device. Key awards.v1.
// Practice badges and a display name can be stored. A completion flag cannot.
// There is no account. The shared store (src/store.js) keeps this in localStorage
// when the browser allows it, or in memory when storage is blocked.

import { acceptAssessmentEvent } from './contract.js';

export const AWARDS_KEY = 'awards.v1';
export const RECORD_VERSION = 1;

/** Practice badges this record may keep. Completion and certificate ids are never kept. */
export const PRACTICE_AWARD_IDS = Object.freeze(['game-session', 'game-return']);
/** Daily/streak medallions this record may keep (src/awards/eligibility.js MILESTONE_BADGES). */
export const MILESTONE_AWARD_IDS = Object.freeze(['first-day', 'streak-3', 'streak-7', 'streak-30', 'goal-met', 'games-5']);
const PRACTICE = new Set([...PRACTICE_AWARD_IDS, ...MILESTONE_AWARD_IDS]);

export function emptyRecord() {
  return { v: RECORD_VERSION, openedAt: null, displayName: '', nameSetAt: null, awards: {}, evidence: [] };
}

/** Strip controls and cap length. The name is shown as text, never as HTML. */
export function sanitizeName(input) {
  const raw = String(input ?? '');
  const text = raw.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 80);
  return text;
}

function cleanBasis(basis) {
  if (!basis || typeof basis !== 'object' || Array.isArray(basis)) return { kind: 'game-plays', sessions: [] };
  if (basis.kind === 'streak-record') {
    return { kind: 'streak-record', best: Number.isInteger(basis.best) && basis.best > 0 ? basis.best : 0 };
  }
  if (basis.kind === 'daily-goal') {
    return { kind: 'daily-goal', goalMinutes: Number.isInteger(basis.goalMinutes) && basis.goalMinutes > 0 ? basis.goalMinutes : 5 };
  }
  if (basis.kind !== 'game-plays') return { kind: 'game-plays', sessions: [] };
  const sessions = Array.isArray(basis.sessions) ? basis.sessions : [];
  return {
    kind: 'game-plays',
    sessions: sessions.filter((s) => s && typeof s.key === 'string' && Number.isInteger(s.plays) && s.plays > 0)
      .map((s) => ({ key: s.key, plays: s.plays })),
  };
}

/**
 * Fail closed. Old, corrupt, or forged shapes become an empty record.
 * A stored certificate claim is dropped. Unknown award ids are dropped.
 * @param {any} raw
 */
export function cleanRecord(raw) {
  const notes = [];
  if (raw == null) return { record: emptyRecord(), status: 'empty', notes };
  if (typeof raw !== 'object' || Array.isArray(raw)) return { record: emptyRecord(), status: 'unreadable', notes: ['shape'] };
  if (raw.v !== RECORD_VERSION) {
    const status = raw.v == null || (typeof raw.v === 'number' && raw.v < RECORD_VERSION) ? 'old' : 'unreadable';
    return { record: emptyRecord(), status, notes: ['version'] };
  }
  const record = emptyRecord();
  if (Number.isFinite(raw.openedAt) && raw.openedAt > 0) record.openedAt = raw.openedAt;
  record.displayName = sanitizeName(raw.displayName);
  if (Number.isFinite(raw.nameSetAt) && raw.nameSetAt > 0) record.nameSetAt = raw.nameSetAt;
  const awards = raw.awards && typeof raw.awards === 'object' && !Array.isArray(raw.awards) ? raw.awards : {};
  for (const [id, val] of Object.entries(awards)) {
    if (!PRACTICE.has(id)) { notes.push('dropped-untrusted-award:' + id); continue; }
    if (!val || typeof val !== 'object' || !Number.isFinite(val.at) || val.at <= 0) { notes.push('dropped-bad-award:' + id); continue; }
    record.awards[id] = { at: val.at, basis: cleanBasis(val.basis) };
  }
  if (raw.certificate || raw.certificateEarned || raw.earnedCertificate || (raw.awards && (raw.awards['beginner-certificate'] || raw.awards['beginner-completion']))) {
    notes.push('dropped-certificate-claim');
  }
  const evidence = Array.isArray(raw.evidence) ? raw.evidence : [];
  const seen = new Set();
  for (const ev of evidence) {
    const decision = acceptAssessmentEvent(ev);
    if (!decision.accepted) { notes.push('dropped-evidence:' + decision.reason); continue; }
    if (seen.has(decision.evidence.evidenceId)) {
      const prior = record.evidence.find((e) => e.evidenceId === decision.evidence.evidenceId);
      notes.push(sameEvidence(prior, decision.evidence) ? 'duplicate-evidence' : 'evidence-conflict');
      if (prior && !sameEvidence(prior, decision.evidence)) notes.push('duplicate-evidence');
      continue;
    }
    seen.add(decision.evidence.evidenceId);
    record.evidence.push(decision.evidence);
  }
  return { record, status: 'ok', notes };
}

export function toStored(record) {
  const clean = cleanRecord(record).record;
  return {
    v: RECORD_VERSION,
    openedAt: clean.openedAt,
    displayName: clean.displayName,
    nameSetAt: clean.nameSetAt,
    awards: clean.awards,
    evidence: clean.evidence,
  };
}

/** @param {{get?: Function}|null|undefined} store */
export function readAwards(store) {
  let raw;
  try { raw = store && typeof store.get === 'function' ? store.get(AWARDS_KEY, null) : null; }
  catch { return { record: emptyRecord(), status: 'unreadable', notes: ['read-failed'] }; }
  return cleanRecord(raw);
}

/**
 * @param {{set?: Function, persistent?: boolean}|null|undefined} store
 * @param {any} record
 */
export function writeAwards(store, record) {
  const stored = toStored(record);
  try {
    if (!store || typeof store.set !== 'function') return { saved: false, persistent: false, wrote: false, reason: 'no-store' };
    const result = store.set(AWARDS_KEY, stored);
    const persistent = store.persistent !== false && result !== false;
    return { saved: true, persistent, wrote: true };
  } catch {
    return { saved: false, persistent: false, wrote: false, reason: 'storage-denied' };
  }
}

/** Store one accepted event. An identical evidenceId is a no-op. A different payload with that id is refused. */
export function withEvidence(record, event) {
  const base = cleanRecord(record).record;
  const decision = acceptAssessmentEvent(event);
  if (!decision.accepted) return { record: base, accepted: false, reason: decision.reason, duplicate: false };
  const stored = base.evidence.find((e) => e.evidenceId === decision.evidence.evidenceId);
  if (stored) {
    if (sameEvidence(stored, decision.evidence)) {
      return { record: base, accepted: true, duplicate: true, evidence: stored };
    }
    return { record: base, accepted: false, duplicate: false, reason: 'evidence-conflict', evidence: stored };
  }
  return {
    record: { ...base, evidence: [...base.evidence, decision.evidence] },
    accepted: true,
    duplicate: false,
    evidence: decision.evidence,
  };
}

function sameEvidence(a, b) {
  if (!a || !b) return false;
  return a.kind === b.kind && a.rubricId === b.rubricId && a.itemId === b.itemId && a.correct === b.correct
    && a.trust === b.trust && a.source === b.source && a.evidenceId === b.evidenceId && a.at === b.at;
}

export function withDisplayName(record, name, now) {
  const base = cleanRecord(record).record;
  const text = sanitizeName(name);
  if (text === base.displayName) return base;
  return { ...base, displayName: text, nameSetAt: text ? now : null };
}
