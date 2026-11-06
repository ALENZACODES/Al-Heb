// Proposed beginner rubric, assessment adapter, award record, and sample certificate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createMemoryStorage, createStore } from '../src/store.js';
import { deriveBeginnerRubric, RUBRIC_ID, REVIEW_STATUS, CRITERIA_REVIEWED } from '../src/awards/rubric.js';
import { acceptAssessmentEvent, itemSatisfied, REJECTED_SOURCES } from '../src/awards/contract.js';
import { GAME_STORE_KEYS, observeGames } from '../src/awards/observe.js';
import { AWARDS_KEY, cleanRecord, emptyRecord, readAwards, withEvidence, writeAwards } from '../src/awards/record.js';
import {
  badgeRows, certificateDecision, evaluateProposedCertificate, masterySlots, planPractice, settleAwards,
} from '../src/awards/eligibility.js';
import { TRUST_LIMITS } from '../src/awards/trust.js';
import {
  modelNeedsWatermark, PDF_PAGE, pdfLiteral, renderCertificatePdf, sampleModel,
} from '../src/awards/certificate.js';
import { ART_ACCEPTED, ART_FILES, GAME_RIMS } from '../src/awards/icons.js';

const ROOT = new URL('..', import.meta.url);
const lessons = JSON.parse(readFileSync(new URL('../data/curriculum/lessons.json', import.meta.url), 'utf8'));
const belts = JSON.parse(readFileSync(new URL('../data/curriculum/belts.json', import.meta.url), 'utf8'));
const T = Date.UTC(2026, 10, 6, 12, 0, 0);
const rubric = deriveBeginnerRubric(lessons, belts);

const mem = (init = {}) => {
  const m = { ...init };
  return { m, persistent: true, get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); return true; } };
};
const event = (over = {}) => ({
  kind: 'assessment.item', rubricId: RUBRIC_ID, itemId: 'letter:shin', correct: true,
  trust: 'objective', source: 'assessment-engine', evidenceId: 'obj-shin-0001', at: T, ...over,
});

test('proposed rubric follows the shipped white-belt lessons and is not confirmed', () => {
  assert.equal(rubric.id, RUBRIC_ID);
  assert.equal(rubric.reviewStatus, 'awaiting-review');
  assert.equal(REVIEW_STATUS, 'awaiting-review');
  assert.equal(CRITERIA_REVIEWED, false);
  assert.equal(rubric.criteriaReviewed, false);
  assert.equal(rubric.confirmed, false);
  assert.equal(rubric.issuable, false);
  assert.deepEqual(rubric.lessonIds, ['r01', 'r02', 'r03', 'r04', 'r05', 'r06', 'r07', 'r08', 'r09']);
  assert.ok(rubric.items.some((it) => it.id === 'letter:shin' && it.status === 'proposed'));
  assert.ok(rubric.items.some((it) => it.id === 'vowel:kamatz'));
  assert.ok(rubric.items.some((it) => it.kind === 'word' && it.he === 'שַׁבָּת שָׁלוֹם'));
  assert.ok(rubric.items.some((it) => it.id === 'line:bless-priestly-1'));
  assert.ok(!rubric.lessonIds.includes('r10'));
  assert.ok(rubric.items.length > 20);
  assert.match(rubric.belt.gate, /Shabbat Shalom/);
  assert.match(rubric.graphNote, /awaiting review/);
});

test('assessment adapter rejects completion flags, self-marks, legacy progress, and wrong answers do not satisfy', () => {
  assert.equal(acceptAssessmentEvent(event()).accepted, true);
  assert.equal(acceptAssessmentEvent({ completed: true, lessonId: 'r01' }).reason, 'completion-flag');
  assert.equal(acceptAssessmentEvent(event({ completed: true })).reason, 'completion-flag');
  assert.equal(acceptAssessmentEvent(event({ trust: 'self', source: 'self-marked' })).reason, 'trust');
  for (const source of ['curriculum.progress', 'saveQuickCheck', 'letters.progress', 'timedread.v1', 'speak.v1', 'firstday.progress', 'loops.v1', 'visit', 'login']) {
    assert.equal(acceptAssessmentEvent(event({ source })).reason, 'source', source);
  }
  assert.ok(REJECTED_SOURCES.includes('curriculum.progress'));
  const miss = acceptAssessmentEvent(event({ correct: false, evidenceId: 'obj-shin-miss1' }));
  assert.equal(miss.accepted, true);
  assert.equal(itemSatisfied([miss.evidence], 'letter:shin'), false);
  assert.equal(itemSatisfied([acceptAssessmentEvent(event()).evidence], 'letter:shin'), true);
  const dup = withEvidence(withEvidence(emptyRecord(), event()).record, event());
  assert.equal(dup.duplicate, true);
  assert.equal(dup.record.evidence.length, 1);
  const rejected = withEvidence(emptyRecord(), { completed: true });
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.record.evidence.length, 0);
});

test('certificate rule can pass only with reviewed criteria and objective hits, and the shipped decision cannot', () => {
  const items = rubric.items.slice(0, 2);
  const evidence = items.map((it, i) => acceptAssessmentEvent(event({ itemId: it.id, evidenceId: 'obj-item-' + i + 'xx' })).evidence);
  assert.equal(evaluateProposedCertificate({ criteriaReviewed: true, items, evidence }).issuable, true);
  assert.equal(evaluateProposedCertificate({ criteriaReviewed: true, items, evidence: evidence.map((e) => ({ ...e, correct: false })) }).issuable, false);
  assert.equal(evaluateProposedCertificate({ criteriaReviewed: false, items, evidence }).reason, 'criteria-awaiting-review');
  assert.equal(evaluateProposedCertificate({ criteriaReviewed: true, items: [], evidence }).reason, 'no-criteria');
  const full = rubric.items.map((it, i) => acceptAssessmentEvent(event({ itemId: it.id, evidenceId: ('obj-full-' + i).padEnd(8, '0') })).evidence);
  const record = { ...emptyRecord(), evidence: full };
  const flipped = { ...rubric, criteriaReviewed: true, reviewStatus: 'reviewed' };
  const decision = certificateDecision(record, flipped);
  assert.equal(decision.issuable, false);
  assert.equal(decision.reason, 'criteria-awaiting-review');
  assert.equal(decision.criteriaReviewed, false);
  assert.equal(decision.satisfied, rubric.items.length);
});

test('lesson completion, self-report, and forged certificates do not become awards', () => {
  const store = mem({
    'curriculum.progress': { completed: Object.fromEntries(rubric.lessonIds.map((id) => [id, T])) },
    'letters.progress': { shin: { print: { completions: 5 } } },
    'timedread.v1': { reads: [{ textId: 'shema-1', at: T }] },
    'speak.v1': { attempts: [{ outcome: 'said', kind: 'read' }] },
    'firstday.progress': { done: true, readWords: ['shalom'] },
    'loops.v1': { badges: { earned: { letters: { 1: '2026-11-06' } } } },
    [AWARDS_KEY]: {
      v: 1, certificateEarned: true, awards: { 'beginner-completion': { at: T }, 'mastery-foil': { at: T }, 'game-session': { at: T, basis: { kind: 'game-plays', sessions: [] } } },
      evidence: [{ completed: true }, { kind: 'assessment.item', trust: 'self', source: 'self', itemId: 'letter:shin', correct: true, evidenceId: 'self-shin-1', at: T }],
    },
  });
  const settled = settleAwards(store, rubric, T);
  assert.equal(settled.decision.issuable, false);
  assert.equal(settled.record.awards['beginner-completion'], undefined);
  assert.equal(settled.record.awards['mastery-foil'], undefined);
  assert.ok(settled.record.awards['game-session']);
  assert.equal(settled.record.evidence.length, 0);
  assert.equal(store.m[AWARDS_KEY].certificateEarned, undefined);
  const rows = badgeRows(settled.record, settled.games, settled.decision);
  assert.equal(rows.find((r) => r.id === 'beginner-completion').state, 'locked');
  assert.ok(masterySlots().every((s) => s.state === 'locked'));
  assert.deepEqual(masterySlots().map((s) => s.finish), ['matte', 'polished', 'foil']);
});

test('practice badges are idempotent activity, not mastery, and ignore bad play counts', () => {
  const store = mem({ 'games.tugowar.v1': { best: 1, plays: 1, lastStars: 0 } });
  const once = settleAwards(store, rubric, T);
  const twice = settleAwards(store, rubric, T + 5000);
  assert.equal(once.record.awards['game-session'].at, T);
  assert.equal(twice.record.awards['game-session'].at, T);
  assert.equal(twice.record.awards['game-return'], undefined);
  assert.equal(twice.newly.length, 0);
  store.m['games.tugowar.v1'] = { plays: 2, best: 3, lastStars: 0 };
  const back = settleAwards(store, rubric, T + 9000);
  assert.equal(back.record.awards['game-session'].at, T);
  assert.equal(back.record.awards['game-return'].at, T + 9000);
  assert.equal(back.decision.issuable, false);
  const odd = observeGames(mem({ 'games.pinball.v1': { plays: '2' }, 'games.prefixblast.v1': { plays: 0 }, 'games.vowelcatcher.v1': { plays: 1.5 } }));
  assert.equal(odd.anyPlay, false);
  const thrown = { get(k) { if (k === 'games.pinball.v1') throw new Error('nope'); return null; } };
  assert.deepEqual(observeGames(thrown).readErrors, ['games.pinball.v1']);
  const planned = planPractice(emptyRecord(), { anyPlay: true, returned: true, sessions: [{ key: 'games.tugowar.v1', plays: 2, code: 'tug' }] }, T);
  assert.deepEqual(Object.keys(planned.record.awards).sort(), ['game-return', 'game-session']);
});

test('old, corrupt, and unreadable storage fail closed', () => {
  assert.equal(cleanRecord({ v: 0, awards: { 'game-session': { at: T } } }).status, 'old');
  assert.deepEqual(cleanRecord({ v: 0, awards: { 'game-session': { at: T } } }).record.awards, {});
  assert.equal(cleanRecord(['nope']).status, 'unreadable');
  assert.equal(cleanRecord(null).status, 'empty');
  const backend = createMemoryStorage();
  backend.setItem('alef:' + AWARDS_KEY, '{not json');
  const store = createStore({ storage: backend });
  const loaded = readAwards(store);
  assert.equal(loaded.record.evidence.length, 0);
  assert.equal(certificateDecision(loaded.record, rubric).issuable, false);
  const denied = { get() { return null; }, set() { throw new Error('denied'); }, persistent: false };
  const refused = settleAwards(denied, rubric, T);
  assert.equal(refused.save.saved, false);
  assert.equal(refused.save.reason, 'storage-denied');
  assert.equal(refused.record.awards['game-session'], undefined);
  const keptStore = {
    persistent: false,
    get(k) {
      if (k === 'games.tugowar.v1') return { plays: 2 };
      if (k === AWARDS_KEY) return { v: 1, openedAt: T, displayName: '', awards: { 'game-session': { at: T, basis: { kind: 'game-plays', sessions: [] } } }, evidence: [] };
      return null;
    },
    set() { throw new Error('denied'); },
  };
  const kept = settleAwards(keptStore, rubric, T + 10);
  assert.equal(kept.save.saved, false);
  assert.ok(kept.record.awards['game-session']);
  assert.equal(kept.record.awards['game-return'], undefined);
  assert.equal(kept.visit, 'return');
});

test('sample PDF is landscape, watermarked, and does not turn a sample into an issued file', () => {
  assert.equal(ART_ACCEPTED, 0);
  assert.equal(ART_FILES.certificateFrame, null);
  assert.ok(PDF_PAGE.width > PDF_PAGE.height);
  assert.ok(PDF_PAGE.margin >= 36);
  const bytes = renderCertificatePdf(sampleModel({ displayName: 'Ada <script>', now: T }));
  const text = Buffer.from(bytes).toString('latin1');
  assert.match(text, /^%PDF-1\.4/);
  assert.match(text, /MediaBox \[0 0 841\.89 595\.28\]/);
  assert.match(text, /SAMPLE/);
  assert.match(text, /NOT EARNED/);
  assert.match(text, /Ada <script>/);
  assert.doesNotMatch(text, /\/JavaScript|mailto:|FMVA|\bCFI\b/);
  assert.doesNotMatch(text, /is an accredited|accredited by|university diploma/);
  const marked = renderCertificatePdf({ ...sampleModel({ now: T }), issuable: true, sample: true, displayName: 'Ada' });
  assert.match(Buffer.from(marked).toString('latin1'), /SAMPLE/);
  assert.equal(modelNeedsWatermark(sampleModel()), true);
  const issued = renderCertificatePdf({
    ...sampleModel({ displayName: 'Ada', now: T }),
    sample: false,
    issuable: true,
    kicker: 'Record',
    statement: ['This rule-test file is the issued layout seam.'],
    disclaimers: ['Kept on this device.'],
  });
  assert.doesNotMatch(Buffer.from(issued).toString('latin1'), /SAMPLE/);
  const hebrew = renderCertificatePdf(sampleModel({ displayName: 'שלום', now: T }));
  assert.match(Buffer.from(hebrew).toString('latin1'), /\?/);
  assert.equal(pdfLiteral('a(b)\\c'), '(a\\(b\\)\\\\c)');
  const hex = createHash('sha256').update(bytes).digest('hex');
  assert.equal(hex, '9a47ca4123b8a66d293c7b39668f05877985479b9aaddd34d8691869805f735e');
});

test('trust notes name real source files, and this lane does not award from them', () => {
  for (const row of TRUST_LIMITS) {
    const src = readFileSync(new URL('../' + row.path, import.meta.url), 'utf8');
    assert.match(src, new RegExp(row.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  for (const game of GAME_STORE_KEYS) {
    const src = readFileSync(new URL('../' + game.file, import.meta.url), 'utf8');
    assert.match(src, new RegExp(game.key));
    assert.ok(GAME_RIMS[game.code]);
  }
  assert.equal(GAME_STORE_KEYS.length, 5);
  const awardFiles = readdirSync(new URL('../src/awards/', import.meta.url)).filter((n) => n.endsWith('.js') && n !== 'trust.js');
  for (const name of awardFiles) {
    const src = readFileSync(join(ROOT.pathname, 'src/awards', name), 'utf8');
    assert.doesNotMatch(src, /completeLesson\s*\(|saveQuickCheck\s*\(|awardFromCompletion|grantCertificate\s*\(/);
    assert.doesNotMatch(src, /store\.get\(\s*['"]curriculum\.progress/);
  }
  const written = writeAwards(mem(), withEvidence(emptyRecord(), event()).record);
  assert.equal(written.saved, true);
});
