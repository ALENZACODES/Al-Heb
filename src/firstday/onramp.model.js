// On-ramp model (DRAFT, unreviewed): pure functions for the five baby steps in data/firstday/onramp.json. No DOM, no clock.
// Progress lives in the existing store key firstday.progress (PROGRESS_KEY in ./model.js), extended in place:
//   { v:2, part:'onramp'|'preview', step, wins:[stepId], answers:{questionId:boolean}, next:{n,title}|null,
//     readWords:[], checkCorrect, done, previewStep }            (readWords/checkCorrect/previewStep belong to the preview flow)
// A record without v (written before this file) is read as a preview-flow position so nobody loses their place.
import { bare } from './model.js';

export const ONRAMP_V = 2;
export const MAX_CHECK = 2;

export const emptyOnramp = () => ({ v: ONRAMP_V, part: 'onramp', step: 0, wins: [], answers: {}, next: null, readWords: [], checkCorrect: null, done: false, previewStep: 0 });

/** Read a stored record of either shape. Legacy {step>0|done} means the learner was inside the old flow: keep them there. */
export function migrateProgress(saved) {
  const e = emptyOnramp();
  if (!saved || typeof saved !== 'object') return e;
  if (saved.v === ONRAMP_V) return { ...e, ...saved, wins: Array.isArray(saved.wins) ? saved.wins : [], answers: saved.answers && typeof saved.answers === 'object' ? saved.answers : {} };
  const legacyStep = Number.isInteger(saved.step) ? saved.step : 0;
  const inOld = legacyStep > 0 || saved.done === true;
  return { ...e, part: inOld ? 'preview' : 'onramp', previewStep: legacyStep, readWords: Array.isArray(saved.readWords) ? saved.readWords : [], checkCorrect: saved.checkCorrect ?? null, done: saved.done === true };
}

export const stepIndex = (data, p) => Math.max(0, Math.min(data.steps.length, Number(p.step) || 0));
export const isWon = (p, stepId) => p.wins.includes(stepId);
export const onrampDone = (data, p) => data.steps.every((s) => isWon(p, s.id));

/** Record a win: the step's check was answered (right or wrong: nothing is lost) and the learner pressed Next. */
export function winStep(p, data, stepId) {
  const i = data.steps.findIndex((s) => s.id === stepId);
  if (i < 0) return p;
  const wins = isWon(p, stepId) ? p.wins : [...p.wins, stepId];
  const step = Math.min(i + 1, data.steps.length);
  const nxt = data.steps[step];
  const done = data.steps.every((s) => wins.includes(s.id));
  return { ...p, wins, step, done: p.done || done, next: nxt ? { n: step + 1, title: nxt.title, minutes: nxt.minutes } : null };
}
export const recordAnswer = (p, qid, good) => ({ ...p, answers: { ...p.answers, [qid]: !!good } });

/** Questions of one step: at most `check.max` (never more than MAX_CHECK). `lessonQuestions` are the lesson's own quick-check questions. */
export function stepQuestions(step, lessonQuestions = []) {
  const c = step.check || {};
  const max = Math.min(MAX_CHECK, Number.isInteger(c.max) ? c.max : MAX_CHECK);
  if (c.from === 'pick') {
    const options = (c.options || []).map((o) => ({ text: o.he, he: true }));
    return [{ id: `onramp-q-${step.id}`, kind: 'pick', prompt: c.prompt, options, answerIndex: Math.max(0, (c.options || []).findIndex((o) => o.right)), why: '' }].slice(0, max);
  }
  return lessonQuestions.filter((q) => q.cardId === c.cardId).slice(0, max);
}

/** Letter ids of a Hebrew string restricted to the on-ramp's own letters (shin/bet); null when another letter appears. */
const LETTER_ID = { 'ש': 'shin', 'ב': 'bet' };
export const onrampLetterIds = (he) => { const out = []; for (const ch of bare(he)) { if (!LETTER_ID[ch]) return null; out.push(LETTER_ID[ch]); } return out; };

/**
 * Integrity: one thing per step, letters taught before they are read, checks at most 2 questions, the bound lesson teaches exactly
 * these letters and owns the word, and every Hebrew string is one of the lesson's / letters file's strings (no new Hebrew).
 * @returns {string[]} problems (empty = ok)
 */
export function checkOnramp(data, { lesson, letters, vowels } = {}) {
  const problems = [];
  if (!Array.isArray(data.steps) || data.steps.length !== 5) problems.push('expected 5 steps');
  const taught = new Set(), ids = new Set();
  for (const s of data.steps || []) {
    if (ids.has(s.id)) problems.push(`${s.id}: duplicate id`); ids.add(s.id);
    if (!(s.minutes > 0 && s.minutes <= 2)) problems.push(`${s.id}: a baby step is at most 2 minutes`);
    if (!s.title || !s.action || !s.win) problems.push(`${s.id}: needs title, action and win`);
    const max = s.check?.max;
    if (!(Number.isInteger(max) && max >= 1 && max <= MAX_CHECK)) problems.push(`${s.id}: check.max must be 1..${MAX_CHECK}`);
    if (s.kind === 'letter') {
      if (!s.letter) problems.push(`${s.id}: letter step without a letter`);
      else if (letters && !letters.get(s.letter)) problems.push(`${s.id}: unknown letter ${s.letter}`);
      else taught.add(s.letter);
    } else {
      const used = onrampLetterIds(s.he);
      if (!used) problems.push(`${s.id}: ${s.he} uses a letter outside shin/bet`);
      else used.forEach((l) => { if (!taught.has(l)) problems.push(`${s.id}: letter ${l} not yet taught`); });
      if (s.kind === 'vowel' && vowels && vowels.get(s.vowel)?.shape !== s.he) problems.push(`${s.id}: he must equal the niqqud shape of ${s.vowel}`);
    }
    if (s.check?.from === 'pick') {
      const opts = s.check.options || [];
      if (opts.filter((o) => o.right).length !== 1) problems.push(`${s.id}: pick check needs exactly one right option`);
      if (new Set(opts.map((o) => o.he)).size !== opts.length) problems.push(`${s.id}: duplicate options`);
    }
  }
  if (lesson) {
    const lessonLetters = [...lesson.letters].sort().join(','), stepLetters = [...taught].sort().join(',');
    if (lessonLetters !== stepLetters) problems.push(`lesson ${lesson.id} teaches [${lessonLetters}] but the steps teach [${stepLetters}]`);
    const w = (data.steps || []).find((s) => s.kind === 'word');
    if (w && !lesson.words.some((x) => x.he === w.he && x.en === w.en)) problems.push(`word ${w.he} is not a word of lesson ${lesson.id}`);
  } else if (data.lesson) problems.push(`lesson ${data.lesson} not found`);
  return problems;
}

export const totalMinutes = (data) => (data.steps || []).reduce((a, s) => a + (s.minutes || 0), 0);
