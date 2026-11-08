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
  MILESTONE_BADGES, STREAK_LADDER, badgeRows, certificateDecision, evaluateProposedCertificate, masterySlots, planMilestones, planPractice, settleAwards,
} from '../src/awards/eligibility.js';
import {
  EXTRA_GAME_STORE_KEYS, observeBadgeEvidence, observeFirstAttempt, observePrayerListens, observeStreak,
} from '../src/awards/observe.js';
import { MILESTONE_AWARD_IDS } from '../src/awards/record.js';
import { DAYSTART_KEY, stampDayStart } from '../src/awards/daystart.js';
import { dayKey } from '../src/curriculum/streak.js';
import { TRUST_LIMITS } from '../src/awards/trust.js';
import {
  modelNeedsWatermark, PDF_PAGE, pdfLiteral, renderCertificatePdf, sampleModel, fitName,
  certificateInitials, certificateReference, torontoDateStamp, CERT_REF_INCOMPLETE,
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
  assert.equal(dup.accepted, true);
  assert.equal(dup.evidence.correct, true);
  assert.equal(dup.record.evidence.length, 1);
  const again = withEvidence(dup.record, event());
  assert.equal(again.accepted, true);
  assert.equal(again.duplicate, true);
  assert.equal(again.record.evidence.length, 1);
  const conflict = withEvidence(dup.record, event({ correct: false, at: T + 5 }));
  assert.equal(conflict.accepted, false);
  assert.equal(conflict.duplicate, false);
  assert.equal(conflict.reason, 'evidence-conflict');
  assert.equal(conflict.record.evidence.length, 1);
  assert.equal(conflict.record.evidence[0].correct, true);
  assert.equal(conflict.evidence.correct, true);
  assert.equal(itemSatisfied(conflict.record.evidence, 'letter:shin'), true);
  const otherItem = withEvidence(dup.record, event({ itemId: 'letter:bet', evidenceId: event().evidenceId }));
  assert.equal(otherItem.accepted, false);
  assert.equal(otherItem.reason, 'evidence-conflict');
  assert.equal(otherItem.record.evidence[0].itemId, 'letter:shin');
  const rejected = withEvidence(emptyRecord(), { completed: true });
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.record.evidence.length, 0);
});

test('certificate rule rejects omitted confirmation, foreign rubrics, and non-candidate lists', () => {
  const items = rubric.items.slice(0, 2);
  const evidence = items.map((it, i) => acceptAssessmentEvent(event({ itemId: it.id, evidenceId: 'obj-item-' + i + 'xx' })).evidence);
  assert.equal(evaluateProposedCertificate({ criteriaReviewed: true, items, evidence }).issuable, false);
  assert.equal(evaluateProposedCertificate({ criteriaReviewed: true, items, evidence }).reason, 'not-canonical-candidate');
  assert.equal(evaluateProposedCertificate({ criteriaReviewed: true, confirmed: true, items, evidence }).reason, 'not-canonical-candidate');
  for (const confirmed of [undefined, null, false]) {
    const closed = evaluateProposedCertificate({ criteriaReviewed: true, confirmed, items: rubric.items, evidence: [] });
    assert.equal(closed.issuable, false, String(confirmed));
    assert.equal(closed.confirmed, false);
  }
  assert.equal(evaluateProposedCertificate({ criteriaReviewed: true, confirmed: false, items, evidence }).reason, 'not-canonical-candidate');
  assert.equal(evaluateProposedCertificate({ criteriaReviewed: false, items: rubric.items, evidence }).reason, 'criteria-awaiting-review');
  assert.equal(evaluateProposedCertificate({ criteriaReviewed: true, confirmed: true, items: [], evidence }).reason, 'no-criteria');
  const sparse = [rubric.items[0], , rubric.items[1]];
  assert.equal(evaluateProposedCertificate({ criteriaReviewed: true, confirmed: true, items: sparse, evidence }).reason, 'not-canonical-candidate');
  const foreign = [{ ...evidence[0], rubricId: 'other-rubric', itemId: rubric.items[0].id }];
  assert.equal(itemSatisfied(foreign, rubric.items[0].id), false);
  assert.equal(itemSatisfied([{ ...evidence[0], rubricId: undefined }], rubric.items[0].id), false);
  const full = rubric.items.map((it, i) => acceptAssessmentEvent(event({ itemId: it.id, evidenceId: ('obj-full-' + i).padEnd(8, '0') })).evidence);
  const hypothetical = evaluateProposedCertificate({ criteriaReviewed: true, confirmed: true, items: rubric.items, evidence: full });
  assert.equal(hypothetical.issuable, true);
  assert.equal(hypothetical.reason, 'objective-evidence');
  assert.equal(hypothetical.confirmed, true);
  const omitted = evaluateProposedCertificate({ criteriaReviewed: true, items: rubric.items, evidence: full });
  assert.equal(omitted.issuable, false);
  assert.equal(omitted.reason, 'criteria-not-confirmed');
  const record = { ...emptyRecord(), evidence: full };
  const flipped = { ...rubric, criteriaReviewed: true, reviewStatus: 'reviewed', confirmed: true };
  const decision = certificateDecision(record, flipped);
  assert.equal(decision.issuable, false);
  assert.equal(decision.reason, 'criteria-awaiting-review');
  assert.equal(decision.criteriaReviewed, false);
  assert.equal(decision.confirmed, false);
  assert.equal(decision.satisfied, rubric.items.length);
  const reviewedButUnconfirmed = evaluateProposedCertificate({ criteriaReviewed: true, confirmed: false, items: rubric.items, evidence: full });
  assert.equal(reviewedButUnconfirmed.issuable, false);
  assert.equal(reviewedButUnconfirmed.reason, 'criteria-not-confirmed');
  assert.equal(reviewedButUnconfirmed.satisfied, rubric.items.length);
});

test('same canonical ids with rewritten Hebrew, gloss, or requirements still pass the id check', () => {
  const rewritten = rubric.items.map((it) => ({ ...it, he: 'CHANGED', gloss: 'changed gloss', requirement: 'changed requirement' }));
  const evidence = rewritten.map((it, i) => acceptAssessmentEvent(event({ itemId: it.id, evidenceId: ('obj-rewrite-' + i).padEnd(8, '0') })).evidence);
  const result = evaluateProposedCertificate({ criteriaReviewed: true, confirmed: true, items: rewritten, evidence });
  assert.equal(result.issuable, true);
  assert.equal(result.reason, 'objective-evidence');
  assert.equal(certificateDecision({ ...emptyRecord(), evidence }, { ...rubric, items: rewritten, criteriaReviewed: true, confirmed: true }).issuable, false);
});

test('draft r01-r09 proposal records known bars and does not approve them', () => {
  assert.equal(rubric.confirmed, false);
  assert.equal(rubric.criteriaReviewed, false);
  assert.equal(rubric.items.length, 40);
  assert.ok(rubric.items.every((it) => it.questionId === undefined && it.status === 'proposed'));
  const r04 = lessons.lessons.find((l) => l.id === 'r04');
  const early = lessons.lessons.filter((l) => ['r01', 'r02', 'r03'].includes(l.id));
  const letters = new Set(early.flatMap((l) => l.letters || []));
  const vowels = new Set(early.flatMap((l) => l.vowels || []));
  assert.match(r04.goals.join(' '), /6 letters, 3 vowels/);
  assert.equal(letters.size, 6);
  assert.equal(vowels.size, 5);
  const shabbat = rubric.items.find((it) => it.he === 'שַׁבָּת');
  assert.equal(shabbat.id, 'word:r02:1');
  assert.deepEqual(shabbat.lessonIds, ['r02', 'r04']);
  assert.equal(rubric.items.some((it) => it.id === 'word:r04:1'), false);
  assert.equal(rubric.items.find((it) => it.he === 'שַׁבָּת שָׁלוֹם').id, 'word:r04:3');
  assert.equal(rubric.items.filter((it) => it.kind === 'line' && it.lessonIds[0] === 'r05').length, 3);
  assert.ok(rubric.items.find((it) => it.id === 'vowel:shin-dot'));
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

test('sample Cert # uses last then first initial and the Toronto preview date', () => {
  const noon = Date.UTC(2026, 10, 6, 12, 0, 0);
  assert.equal(certificateInitials('John Khan'), 'KJ');
  assert.equal(certificateInitials('Ada Learner'), 'LA');
  assert.equal(certificateInitials('Mary Ann Smith'), 'SM');
  assert.equal(certificateInitials('Élodie Renée'), 'RÉ');
  assert.equal(certificateInitials('דוד כהן'), 'כד');
  assert.equal(certificateInitials('Ada'), '');
  assert.equal(certificateInitials(''), '');
  assert.equal(certificateInitials('   '), '');
  assert.equal(certificateInitials('123 ???'), '');
  assert.equal(torontoDateStamp(noon), '20261106');
  assert.equal(torontoDateStamp(Date.UTC(2026, 10, 6, 4, 0, 0)), '20261105');
  assert.equal(torontoDateStamp(Date.UTC(2026, 10, 6, 5, 0, 0)), '20261106');
  assert.equal(torontoDateStamp(NaN), '');
  assert.equal(torontoDateStamp(undefined), '');
  assert.equal(torontoDateStamp('2026-11-06'), '');
  assert.equal(certificateReference('John Khan', noon), 'Cert # KJ-20261106');
  assert.equal(certificateReference('Ada Learner', noon), 'Cert # LA-20261106');
  assert.equal(certificateReference('Ada', noon), CERT_REF_INCOMPLETE);
  assert.equal(certificateReference('', noon), CERT_REF_INCOMPLETE);
  assert.equal(certificateReference('Ada Learner', NaN), CERT_REF_INCOMPLETE);
  assert.equal(certificateReference('Ada Learner', undefined), CERT_REF_INCOMPLETE);
  const ignored = renderCertificatePdf({
    ...sampleModel({ displayName: 'Ada Learner', now: noon }),
    certNo: 'Accreditation No. 999',
    sample: false,
    issuable: true,
  });
  const text = Buffer.from(ignored).toString('latin1');
  assert.match(text, /Cert # LA-20261106/);
  assert.match(text, /Design proof/);
  assert.equal((text.match(/\(Design proof\)/g) || []).length, 1);
  assert.doesNotMatch(text, /SAMPLE \/ NOT EARNED|Sample internal reference|Accreditation No|SAMPLE-0001/);
  const hebrew = Buffer.from(renderCertificatePdf(sampleModel({ displayName: 'דוד כהן', now: noon }))).toString('latin1');
  assert.match(hebrew, /Cert # \?\?-20261106/);
  assert.match(hebrew, /Design proof/);
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
  assert.match(text, /Design proof/);
  assert.equal((text.match(/\(Design proof\)/g) || []).length, 1);
  assert.doesNotMatch(text, /SAMPLE \/ NOT EARNED|Temporary layout|Sample internal reference/);
  assert.match(text, /FrankRuhlLibre/);
  assert.match(text, /FontFile2/);
  assert.match(text, /WinAnsiEncoding/);
  assert.doesNotMatch(text, /Times-Roman|Times-Bold|Helvetica|0\.9659|\sarc\s/);
  assert.match(text, /Ada <script>/);
  assert.match(text, /CERTIFICATE OF COMPLETION/);
  assert.match(text, /PRESENTED TO/);
  assert.match(text, /Independent learning programme/);
  assert.doesNotMatch(text, /Not an accredited qualification/);
  assert.match(text, /Beginner Hebrew Foundations/);
  assert.match(text, /ALEF is Key Foundation/);
  assert.match(text, /Cert # SA-20261106/);
  assert.doesNotMatch(text, /CE#|Accreditation No|SAMPLE-0001|continuing-education|continuing education/);
  assert.doesNotMatch(text, /FMVA|CFI|Corporate Finance/);
  assert.doesNotMatch(text, /tamper-proof|verification website|seal of office/);
  assert.doesNotMatch(text, /\/JavaScript|mailto:|FMVA|\bCFI\b/);
  assert.doesNotMatch(text, /is an accredited|accredited by|university diploma/);
  const marked = renderCertificatePdf({ ...sampleModel({ now: T }), issuable: true, sample: true, displayName: 'Ada' });
  assert.match(Buffer.from(marked).toString('latin1'), /Design proof/);
  assert.equal(modelNeedsWatermark(sampleModel()), true);
  const long = 'A'.repeat(80);
  const fitted = fitName(long, PDF_PAGE.width - 120);
  assert.equal(fitted.lines.length, 1);
  assert.ok(fitted.size >= 11);
  const longPdf = Buffer.from(renderCertificatePdf(sampleModel({ displayName: long, now: T }))).toString('latin1');
  assert.match(longPdf, /Design proof/);
  assert.doesNotMatch(longPdf, /SAMPLE \/ NOT EARNED/);
  assert.match(longPdf, /AAAA/);
  const hostile = renderCertificatePdf({
    displayName: 'Ada',
    nameEntered: true,
    sample: false,
    issuable: true,
    earned: true,
    watermark: 'EARNED',
    kicker: 'Record',
    brand: 'ALEF',
    subtitle: 'Beginner reading',
    disclaimer: 'Caller prose beside the watermark.',
    artNote: 'Temporary layout.',
    dateLabel: 'Preview date: 6 November 2026 UTC',
  });
  const hostileText = Buffer.from(hostile).toString('latin1');
  assert.match(hostileText, /Design proof/);
  assert.equal((hostileText.match(/\(Design proof\)/g) || []).length, 1);
  assert.doesNotMatch(hostileText, /\(EARNED\)|SAMPLE \/ NOT EARNED/);
  assert.equal(modelNeedsWatermark(undefined), true);
  assert.equal(modelNeedsWatermark(null), true);
  assert.equal(modelNeedsWatermark({ sample: false, issuable: true, watermark: 'EARNED' }), true);
  const hebrew = renderCertificatePdf(sampleModel({ displayName: 'שלום', now: T }));
  assert.match(Buffer.from(hebrew).toString('latin1'), /\?/);
  assert.equal(pdfLiteral('a(b)\\c'), '(a\\(b\\)\\\\c)');
  const hex = createHash('sha256').update(bytes).digest('hex');
  assert.equal(hex, '8391cf9fac1a6c7e624db7c6fe9a232fb062558d9cf7682c91467ff107bc8c63');
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

test('milestones: streak thresholds grant by the LONGEST streak and never un-earn', () => {
  const none = planMilestones(emptyRecord(), { anyDay: false, best: 0, goalMet: false, goalMinutes: 5 }, { sessions: [] }, T);
  assert.deepEqual(none.newly, []);
  const three = planMilestones(emptyRecord(), { anyDay: true, best: 3, goalMet: false, goalMinutes: 5 }, { sessions: [] }, T);
  assert.deepEqual([...three.newly].sort(), ['first-day', 'streak-2', 'streak-3']);
  assert.equal(three.record.awards['streak-3'].basis.best, 3);
  const month = planMilestones(emptyRecord(), { anyDay: true, best: 30, goalMet: true, goalMinutes: 10 }, { sessions: [] }, T);
  assert.deepEqual([...month.newly].sort(), ['first-day', 'goal-met', 'streak-14', 'streak-2', 'streak-3', 'streak-30', 'streak-4', 'streak-5', 'streak-6', 'streak-7']);
  assert.equal(month.record.awards['goal-met'].basis.goalMinutes, 10);
  const again = planMilestones(month.record, { anyDay: true, best: 1, goalMet: false, goalMinutes: 5 }, { sessions: [] }, T + 1000);
  assert.deepEqual(again.newly, []);
  assert.ok(again.record.awards['streak-30'], 'a shorter later streak does not un-earn the month medallion');
});

test('milestones: games-5 needs all five observed practice games', () => {
  const four = planMilestones(emptyRecord(), { anyDay: false, best: 0 }, { sessions: [1, 2, 3, 4].map((i) => ({ key: 'k' + i })) }, T);
  assert.deepEqual(four.newly, []);
  const five = planMilestones(emptyRecord(), { anyDay: false, best: 0 }, { sessions: [1, 2, 3, 4, 5].map((i) => ({ key: 'k' + i })) }, T);
  assert.deepEqual(five.newly, ['games-5']);
});

test('milestones: settleAwards reads the streak record and stamps the daily goal', () => {
  const store = mem({ streak: { v: 2, count: 7, best: 7, last: '2026-11-05', todayDate: dayKey(T), todaySeconds: 660, doneDates: ['2026-11-05'] } });
  const settled = settleAwards(store, rubric, T);
  for (const id of ['first-day', 'streak-3', 'streak-7', 'goal-met']) {
    assert.ok(settled.record.awards[id], id + ' earned from the streak record');
  }
  assert.equal(settled.record.awards['goal-met'].basis.goalMinutes, 5);
  const rows = badgeRows(settled.record, settled.games, settled.decision);
  const week = rows.find((r) => r.id === 'streak-7');
  assert.equal(week.state, 'earned');
  assert.match(week.detail, /longest recorded streak reached 7 days/);
  const monthRow = rows.find((r) => r.id === 'streak-30');
  assert.equal(monthRow.state, 'locked');
});

test('milestones: observeStreak honours a stored daily goal and defaults to 5', () => {
  const withGoal = observeStreak(mem({ 'onboarding.v1.dailyGoal': 20, streak: { v: 2, count: 1, best: 1, last: '2026-11-05', todayDate: dayKey(T), todaySeconds: 660 } }), T);
  assert.equal(withGoal.goalMinutes, 20);
  assert.equal(withGoal.goalMet, false);
  const noGoal = observeStreak(mem({ streak: { v: 2, count: 1, best: 1, last: '2026-11-05', todayDate: dayKey(T), todaySeconds: 660 } }), T);
  assert.equal(noGoal.goalMinutes, 5);
  assert.equal(noGoal.goalMet, true);
});

// ---------------------------------------------------------------------------
// The 25 medallions (owner's order, Nov 7 2026): streak ladder + themed set.
// ---------------------------------------------------------------------------

test('25 medallions: the catalogue and the record allowlist carry the same 25 ids', () => {
  assert.equal(MILESTONE_BADGES.length, 25);
  assert.deepEqual(STREAK_LADDER, [2, 3, 4, 5, 6, 7, 14, 30, 100, 180, 365]);
  const ids = MILESTONE_BADGES.map((b) => b.id).sort();
  assert.deepEqual(ids, [...MILESTONE_AWARD_IDS].sort());
  assert.equal(MILESTONE_BADGES.filter((b) => b.section === 'ladder').length, 11);
  assert.equal(MILESTONE_BADGES.filter((b) => b.section === 'mastery').length, 14);
  // every catalogue badge survives cleanRecord with a well-formed basis
  for (const badge of MILESTONE_BADGES) {
    const kept = cleanRecord({ v: 1, awards: { [badge.id]: { at: T, basis: { kind: 'streak-record', best: 1 } } } });
    assert.ok(kept.record.awards[badge.id], badge.id + ' is kept by cleanRecord');
  }
});

test('ladder: thresholds grant rung by rung from the LONGEST streak', () => {
  const two = planMilestones(emptyRecord(), { anyDay: true, best: 2 }, { sessions: [] }, T);
  assert.deepEqual([...two.newly].sort(), ['first-day', 'streak-2']);
  const fortnight = planMilestones(emptyRecord(), { anyDay: true, best: 14 }, { sessions: [] }, T);
  assert.deepEqual([...fortnight.newly].sort(), ['first-day', 'streak-14', 'streak-2', 'streak-3', 'streak-4', 'streak-5', 'streak-6', 'streak-7']);
  const year = planMilestones(emptyRecord(), { anyDay: true, best: 365 }, { sessions: [] }, T);
  for (const days of STREAK_LADDER) assert.ok(year.record.awards['streak-' + days], 'streak-' + days);
  const later = planMilestones(year.record, { anyDay: true, best: 1 }, { sessions: [] }, T + 1000);
  assert.deepEqual(later.newly, []);
  assert.ok(later.record.awards['streak-365'], 'a shorter later streak does not un-earn the year medallion');
});

test('prayer-voice: the veil listen counter grants at 10 heard prayers, never for failed plays', () => {
  assert.equal(observePrayerListens(mem({ 'opening-prayer:listens:v1': 9 })), 9);
  assert.equal(observePrayerListens(mem({ 'opening-prayer:listens:v1': '10' })), 10);
  assert.equal(observePrayerListens(mem({ 'opening-prayer:listens:v1': 'junk' })), 0);
  const nine = settleAwards(mem({ 'opening-prayer:listens:v1': 9 }), rubric, T);
  assert.equal(nine.record.awards['prayer-voice'], undefined);
  const ten = settleAwards(mem({ 'opening-prayer:listens:v1': 10 }), rubric, T);
  assert.ok(ten.record.awards['prayer-voice']);
  assert.deepEqual(ten.record.awards['prayer-voice'].basis, { kind: 'prayer-listens', count: 10 });
});

test('letter-master: 27 letter cards in the review deck grant; 26 do not', () => {
  const letters = ['alef', 'bet', 'gimel', 'dalet', 'he', 'vav', 'zayin', 'chet', 'tet', 'yod', 'kaf', 'kaf-final', 'lamed', 'mem', 'mem-final', 'nun', 'nun-final', 'samekh', 'ayin', 'pe', 'pe-final', 'tsadi', 'tsadi-final', 'qof', 'resh', 'shin', 'tav'];
  assert.equal(letters.length, 27);
  const deck = (n) => Object.fromEntries(letters.slice(0, n).map((l) => ['letter:' + l, { id: 'letter:' + l }]));
  const almost = settleAwards(mem({ 'srs.cards': deck(26) }), rubric, T);
  assert.equal(almost.record.awards['letter-master'], undefined);
  const all = settleAwards(mem({ 'srs.cards': deck(27) }), rubric, T);
  assert.ok(all.record.awards['letter-master']);
  assert.deepEqual(all.record.awards['letter-master'].basis, { kind: 'letters-met', count: 27 });
});

test('word-collector: lesson word cards and vocabulary cards add up to 500', () => {
  const words = (prefix, n, base) => Object.fromEntries(Array.from({ length: n }, (_, i) => [prefix + (base + i), {}]));
  const store = mem({ 'srs.cards': words('word:w', 120, 0), 'srs.vocab': words('vocab:', 379, 0) });
  assert.equal(observeBadgeEvidence(store).wordCards, 499);
  assert.equal(settleAwards(store, rubric, T).record.awards['word-collector'], undefined);
  store.m['srs.vocab']['vocab:499'] = {};
  const full = settleAwards(store, rubric, T);
  assert.ok(full.record.awards['word-collector']);
  assert.deepEqual(full.record.awards['word-collector'].basis, { kind: 'word-cards', count: 500 });
});

test('market-master and root-digger: one saved finished session of the set game grants', () => {
  const none = settleAwards(mem({ 'games.barter.v1': { plays: 0 }, 'games.roottree.v1': {} }), rubric, T);
  assert.equal(none.record.awards['market-master'], undefined);
  assert.equal(none.record.awards['root-digger'], undefined);
  const done = settleAwards(mem({ 'games.barter.v1': { plays: 1, best: 40, lastStars: 2 }, 'games.roottree.v1': { plays: 2, best: 55, lastStars: 3 } }), rubric, T);
  assert.ok(done.record.awards['market-master']);
  assert.ok(done.record.awards['root-digger']);
});

test('yolo: only a record of exactly one finished session with three stars proves a first attempt', () => {
  assert.deepEqual(observeFirstAttempt(mem({ 'games.tugowar.v1': { plays: 1, lastStars: 3 } })), { found: true, key: 'games.tugowar.v1', stars: 3 });
  assert.equal(observeFirstAttempt(mem({ 'games.tugowar.v1': { plays: 1, lastStars: 2 } })).found, false);
  assert.equal(observeFirstAttempt(mem({ 'games.tugowar.v1': { plays: 2, lastStars: 3 } })).found, false);
  assert.equal(observeFirstAttempt(mem({ 'games.tugowar.v1': { plays: 1 } })).found, false);
  const store = mem({ 'games.barter.v1': { plays: 1, best: 60, lastStars: 3 } });
  const granted = settleAwards(store, rubric, T);
  assert.ok(granted.record.awards.yolo);
  assert.deepEqual(granted.record.awards.yolo.basis, { kind: 'first-attempt', key: 'games.barter.v1', stars: 3 });
  store.m['games.barter.v1'] = { plays: 5, best: 60, lastStars: 1 };
  const later = settleAwards(store, rubric, T + 1000);
  assert.ok(later.record.awards.yolo, 'once granted, later plays do not un-earn YOLO');
});

test('honest locks: themed badges with no writer yet grant nothing from unrelated records', () => {
  const store = mem({
    'curriculum.progress': { completed: { r01: T } },
    streak: { v: 2, count: 1, best: 1, last: '2026-11-05', todayDate: dayKey(T), todaySeconds: 60 },
  });
  const settled = settleAwards(store, rubric, T);
  for (const id of ['cafe-master', 'cantorial-fan', 'book-finisher', 'early-bird', 'night-owl', 'prayer-voice', 'letter-master', 'word-collector']) {
    assert.equal(settled.record.awards[id], undefined, id + ' stays locked without its record');
  }
  const rows = badgeRows(settled.record, settled.games, settled.decision);
  assert.match(rows.find((r) => r.id === 'cafe-master').detail, /do not yet record/);
  assert.match(rows.find((r) => r.id === 'book-finisher').detail, /last page/);
  assert.match(rows.find((r) => r.id === 'cantorial-fan').detail, /does not yet record/);
});

test('future writers: when the named records land, the same readers grant without new code', () => {
  const store = mem({
    'dialogues.done.v1': { 'd-cafe': T },
    'listen.shelf.v1': { a: 1, b: 2, c: 1, d: 1, e: 3 },
    'books.finished.v1': { book1: T, book2: T, book3: T, book4: T, book5: T },
  });
  const settled = settleAwards(store, rubric, T);
  assert.ok(settled.record.awards['cafe-master']);
  assert.deepEqual(settled.record.awards['cafe-master'].basis, { kind: 'dialogue-done', id: 'd-cafe' });
  assert.ok(settled.record.awards['cantorial-fan']);
  assert.deepEqual(settled.record.awards['cantorial-fan'].basis, { kind: 'shelf-listens', count: 5 });
  assert.ok(settled.record.awards['book-finisher']);
  const twoBooks = mem({ 'books.finished.v1': { book1: T, book2: T } });
  assert.equal(settleAwards(twoBooks, rubric, T).record.awards['book-finisher'], undefined);
});

test('day-start stamp: first opening of the day is kept, and early/late counted days grant', () => {
  const store = mem();
  const morning = new Date(2026, 10, 6, 7, 15).getTime();
  const stamp = stampDayStart(store, morning);
  assert.deepEqual(stamp, { date: '2026-11-06', firstAt: morning });
  assert.deepEqual(store.m[DAYSTART_KEY], stamp);
  const again = stampDayStart(store, new Date(2026, 10, 6, 21, 40).getTime());
  assert.deepEqual(again, stamp, 'a later opening the same day does not move the stamp');
  const nextDay = stampDayStart(store, new Date(2026, 10, 7, 9, 0).getTime());
  assert.equal(nextDay.date, '2026-11-07');

  const earlyStore = mem({
    [DAYSTART_KEY]: { date: '2026-11-06', firstAt: morning },
    streak: { v: 2, count: 1, best: 1, last: '2026-11-06', todayDate: '2026-11-06', todaySeconds: 300, doneDates: ['2026-11-06'] },
  });
  const early = settleAwards(earlyStore, rubric, new Date(2026, 10, 6, 12, 0).getTime());
  assert.ok(early.record.awards['early-bird']);
  assert.equal(early.record.awards['night-owl'], undefined);

  const lateStore = mem({
    [DAYSTART_KEY]: { date: '2026-11-06', firstAt: new Date(2026, 10, 6, 22, 30).getTime() },
    streak: { v: 2, count: 1, best: 1, last: '2026-11-06', todayDate: '2026-11-06', todaySeconds: 300, doneDates: ['2026-11-06'] },
  });
  const late = settleAwards(lateStore, rubric, new Date(2026, 10, 6, 23, 0).getTime());
  assert.ok(late.record.awards['night-owl']);
  assert.equal(late.record.awards['early-bird'], undefined);

  const uncounted = mem({
    [DAYSTART_KEY]: { date: '2026-11-06', firstAt: morning },
    streak: { v: 2, count: 0, best: 0, last: null, todayDate: '2026-11-06', todaySeconds: 30 },
  });
  const noDay = settleAwards(uncounted, rubric, new Date(2026, 10, 6, 12, 0).getTime());
  assert.equal(noDay.record.awards['early-bird'], undefined, 'an early opening that never became a counted day does not grant');
});

test('record hygiene: new basis kinds are sanitised and forged ones fall back', () => {
  const kept = cleanRecord({
    v: 1,
    awards: {
      'prayer-voice': { at: T, basis: { kind: 'prayer-listens', count: 12 } },
      'yolo': { at: T, basis: { kind: 'first-attempt', key: 'games.barter.v1', stars: 3 } },
      'early-bird': { at: T, basis: { kind: 'day-start', date: '2026-11-06', hour: 7 } },
      'cafe-master': { at: T, basis: { kind: 'dialogue-done', id: 'd-restaurant' } },
      'word-collector': { at: T, basis: { kind: 'word-cards', count: -4 } },
    },
  });
  assert.deepEqual(kept.record.awards['prayer-voice'].basis, { kind: 'prayer-listens', count: 12 });
  assert.deepEqual(kept.record.awards.yolo.basis, { kind: 'first-attempt', key: 'games.barter.v1', stars: 3 });
  assert.deepEqual(kept.record.awards['early-bird'].basis, { kind: 'day-start', date: '2026-11-06', hour: 7 });
  assert.deepEqual(kept.record.awards['cafe-master'].basis, { kind: 'dialogue-done', id: '' }, 'only the café dialogue is a valid dialogue basis');
  assert.deepEqual(kept.record.awards['word-collector'].basis, { kind: 'word-cards', count: 0 });
  const forged = cleanRecord({ v: 1, awards: { 'streak-365': { at: T, basis: { kind: 'self-report', best: 365 } } } });
  assert.equal(forged.record.awards['streak-365'].basis.kind, 'game-plays', 'an unknown basis kind never survives as claimed evidence');
});

test('gallery source: medallion art comes from the resolver with the vector as fallback', () => {
  const src = readFileSync(new URL('../src/awards/gallery.view.js', import.meta.url), 'utf8');
  assert.match(src, /BADGE_/);
  assert.match(src, /data-badge-art/);
  assert.match(src, /renderMedallion/);
  assert.match(src, /Streak ladder/);
  assert.match(src, /Milestones and mastery/);
});
