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
  badgeRows, certificateDecision, evaluateProposedCertificate, masterySlots, planMilestones, planPractice, settleAwards,
} from '../src/awards/eligibility.js';
import { observeStreak } from '../src/awards/observe.js';
import { dayKey } from '../src/curriculum/streak.js';
import { TRUST_LIMITS } from '../src/awards/trust.js';
import {
  modelNeedsWatermark, PDF_PAGE, pdfLiteral, renderCertificatePdf, sampleModel, fitName,
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
  assert.equal((text.match(/\(SAMPLE \/ NOT EARNED\)/g) || []).length, 2);
  assert.match(text, /Times-Roman/);
  assert.match(text, /Times-Bold/);
  assert.match(text, /WinAnsiEncoding/);
  assert.doesNotMatch(text, /Helvetica|0\.9659|\sarc\s/);
  assert.match(text, /Ada <script>/);
  assert.match(text, /Certificate of Completion/);
  assert.match(text, /Temporary layout/);
  assert.match(text, /Not an accredited qualification/);
  assert.match(text, /Beginner Hebrew Foundations/);
  assert.match(text, /ALEF is Key Foundation/);
  assert.match(text, /Certificate No\. SAMPLE-0001/);
  assert.match(text, /Sample internal reference/);
  assert.doesNotMatch(text, /CE#|Accreditation No|continuing-education|continuing education/);
  assert.doesNotMatch(text, /FMVA|CFI|Corporate Finance/);
  assert.doesNotMatch(text, /tamper-proof|verification website|seal of office/);
  assert.doesNotMatch(text, /\/JavaScript|mailto:|FMVA|\bCFI\b/);
  assert.doesNotMatch(text, /is an accredited|accredited by|university diploma/);
  const marked = renderCertificatePdf({ ...sampleModel({ now: T }), issuable: true, sample: true, displayName: 'Ada' });
  assert.match(Buffer.from(marked).toString('latin1'), /SAMPLE/);
  assert.equal(modelNeedsWatermark(sampleModel()), true);
  const long = 'A'.repeat(80);
  const fitted = fitName(long, PDF_PAGE.width - 120);
  assert.equal(fitted.lines.length, 1);
  assert.ok(fitted.size >= 11);
  const longPdf = Buffer.from(renderCertificatePdf(sampleModel({ displayName: long, now: T }))).toString('latin1');
  assert.match(longPdf, /SAMPLE \/ NOT EARNED/);
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
  assert.match(hostileText, /SAMPLE \/ NOT EARNED/);
  assert.doesNotMatch(hostileText, /\(EARNED\)/);
  assert.equal(modelNeedsWatermark(undefined), true);
  assert.equal(modelNeedsWatermark(null), true);
  assert.equal(modelNeedsWatermark({ sample: false, issuable: true, watermark: 'EARNED' }), true);
  const hebrew = renderCertificatePdf(sampleModel({ displayName: 'שלום', now: T }));
  assert.match(Buffer.from(hebrew).toString('latin1'), /\?/);
  assert.equal(pdfLiteral('a(b)\\c'), '(a\\(b\\)\\\\c)');
  const hex = createHash('sha256').update(bytes).digest('hex');
  assert.equal(hex, '85b71190f034f104fc9b2b3930f2d604cc9bc0ed69d93597b29446d397904833');
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
  assert.deepEqual([...three.newly].sort(), ['first-day', 'streak-3']);
  assert.equal(three.record.awards['streak-3'].basis.best, 3);
  const month = planMilestones(emptyRecord(), { anyDay: true, best: 30, goalMet: true, goalMinutes: 10 }, { sessions: [] }, T);
  assert.deepEqual([...month.newly].sort(), ['first-day', 'goal-met', 'streak-3', 'streak-30', 'streak-7']);
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
