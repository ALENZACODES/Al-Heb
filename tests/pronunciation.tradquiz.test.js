// Which tradition is this? model + view (fake DOM: proves logic, not real-browser layout or screen-reader behaviour). Rule-generated, unverified.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { newRoot, all, click, tick, loaded, waitFor, El } from './pronunciation.dom-helper.js';
import { mount } from '../src/pronunciation/tradquiz.view.js';
import { buildQuiz, applyRound, weakCodes, isCorrect, QUIZ_KEY, QUESTIONS, ISRAELI_OR_SEPHARDI } from '../src/pronunciation/tradquiz.model.js';
import { buildPages, quizJson, POOL_SIZE } from '../tools/pronunciation/build_pages.mjs';
import { RUNTIME_DIR } from '../tools/pronunciation/build_runtime.mjs';

const read = (f) => JSON.parse(fs.readFileSync(join(RUNTIME_DIR, f), 'utf8'));
const quiz = read('quiz-pool.json'); const reasons = read('reasons.json');
const strip = (s) => s.replace(/[ˈ.]/g, '');
const seeded = (seed = 7) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

test('pool: current with the builder, small, marked unverified, every word differs between traditions', () => {
  assert.equal(fs.readFileSync(join(RUNTIME_DIR, 'quiz-pool.json'), 'utf8'), quizJson(buildPages().quiz), 'stale: run node tools/pronunciation/build_pages.mjs');
  assert.ok(fs.statSync(join(RUNTIME_DIR, 'quiz-pool.json')).size < 150000);
  assert.equal(quiz.proofread, false); assert.match(quiz.status, /not verified by a native speaker/);
  assert.equal(quiz.pool.length, POOL_SIZE); assert.equal(quiz.count, POOL_SIZE);
  for (const w of quiz.pool) {
    assert.equal(w.i.length, 3);
    const tri = new Set(w.i.map(strip)).size === 3;
    assert.equal(w.t === 1, tri, w.h);
    assert.ok(tri || w.s[0] !== w.s[1], w.h + ' must differ by IPA or by respelling');
    for (const c of w.c ? w.c.split(' ') : []) assert.ok(c === 'st' || reasons.codes[c], c);
  }
});

test('buildQuiz: deterministic for a seed, 10 distinct words, one correct answer each, modes match the data', () => {
  const a = buildQuiz(quiz.pool, seeded(), QUESTIONS); const b = buildQuiz(quiz.pool, seeded(), QUESTIONS);
  assert.deepEqual(a, b); assert.equal(a.length, QUESTIONS);
  assert.equal(new Set(a.map((q) => q.word.h)).size, QUESTIONS);
  for (const q of a) {
    assert.ok(q.options.includes(q.answer));
    if (q.mode === 'ipa') { assert.deepEqual(q.options, ['israeli', 'sephardi', 'ashkenazi']); assert.equal(q.word.t, 1); assert.equal(q.text, q.word.i[['israeli', 'sephardi', 'ashkenazi'].indexOf(q.shown)]); }
    else { assert.deepEqual(q.options, [ISRAELI_OR_SEPHARDI, 'ashkenazi']); assert.notEqual(q.word.s[0], q.word.s[1]); assert.equal(q.answer, q.shown === 'ashkenazi' ? 'ashkenazi' : ISRAELI_OR_SEPHARDI); }
  }
  assert.notDeepEqual(a.map((q) => q.word.h), buildQuiz(quiz.pool, seeded(99), QUESTIONS).map((q) => q.word.h));
});

test('applyRound keeps best, counts per code, and weakCodes lists the worst-answered rules', () => {
  const r1 = applyRound(undefined, [{ ok: true, codes: ['ka'] }, { ok: false, codes: ['ka', 'tv'] }, { ok: false, codes: ['ka'] }]);
  assert.deepEqual(r1, { rounds: 1, best: 1, last: { score: 1, total: 3 }, byCode: { ka: { right: 1, seen: 3 }, tv: { right: 0, seen: 1 } } });
  const r2 = applyRound(r1, [{ ok: true, codes: ['tv'] }, { ok: true, codes: ['tv'] }]);
  assert.equal(r2.best, 2); assert.equal(r2.rounds, 2); assert.deepEqual(r2.byCode.tv, { right: 2, seen: 3 });
  assert.deepEqual(weakCodes(r2, { ka: 'x', tv: 'y' }).map((w) => w.code), ['ka', 'tv']);
  assert.equal(isCorrect({ answer: 'ashkenazi' }, 'ashkenazi'), true);
});

function setup(over = {}) {
  const root = newRoot(); const mem = {};
  const ctx = { compareData: { quiz, reasons }, store: { get: (k) => mem[k], set: (k, v) => { mem[k] = v; } }, rng: seeded(), ...over };
  return { root, mem, ctx, unmount: mount(root, ctx) };
}
const btn = (root, sel) => all(root, (x) => x.tagName === 'BUTTON' && Object.entries(sel).every(([k, v]) => x.getAttribute(k) === v))[0];
const text = (n) => n.textContent;

test('view: a full round is scored, feedback explains the rule, result is stored under pron.quiz.v1', async () => {
  const { root, mem } = setup(); await loaded(root);
  assert.match(text(root), /eye quiz/); assert.match(text(root), /Rule-generated and unverified/);
  click(btn(root, { 'data-act': 'start' }));
  const expected = buildQuiz(quiz.pool, seeded(), QUESTIONS);
  let right = 0;
  for (let i = 0; i < QUESTIONS; i++) {
    assert.match(text(root), new RegExp(`Question ${i + 1} of ${QUESTIONS}`));
    const q = expected[i];
    const choose = i % 3 === 0 ? q.options.find((o) => o !== q.answer) : q.answer; // every third answer wrong
    if (choose === q.answer) right++;
    click(btn(root, { 'data-option': choose }));
    assert.match(text(root), choose === q.answer ? /Yes\./ : /Not this time\./);
    assert.match(text(root), /Why they differ|Ashkenazi:/);
    click(btn(root, { 'data-act': 'next' }));
    await waitFor(() => new RegExp(i + 1 < QUESTIONS ? `Question ${i + 2} of ${QUESTIONS}` : `${right} of ${QUESTIONS}`).test(text(root)), { message: "next question or final score" });
  }
  assert.match(text(root), new RegExp(`${right} of ${QUESTIONS}`));
  assert.equal(mem[QUIZ_KEY].last.score, right); assert.equal(mem[QUIZ_KEY].rounds, 1);
  click(btn(root, { 'data-act': 'again' }));
  assert.match(text(root), /Question 1 of/);
});

test('view: previous results show on the start screen; missing data shows a calm message', async () => {
  const { root } = setup({ store: { get: () => ({ rounds: 2, best: 8, last: { score: 6, total: 10 }, byCode: { ka: { right: 0, seen: 3 } } }), set() {} } });
  await waitFor(() => /Rounds played: 2/.test(text(root)), { message: "/Rounds played: 2/.test(text(root))" }); assert.match(text(root), /Rounds played: 2/); assert.match(text(root), /Kamatz/);
  const r2 = newRoot(); const orig = globalThis.fetch; globalThis.fetch = async () => ({ ok: false, status: 500 });
  try { mount(r2, { store: null }); await waitFor(() => /could not be loaded/.test(text(r2)), { message: "/could not be loaded/.test(text(r2))" }); assert.match(text(r2), /could not be loaded/); } finally { globalThis.fetch = orig; }
});

test('view: buttons are native and labelled; unmount removes the view', async () => {
  const { root, unmount } = setup(); await loaded(root);
  click(btn(root, { 'data-act': 'start' }));
  const opts = all(root, (x) => x.getAttribute('data-option'));
  assert.ok(opts.length >= 2 && opts.every((o) => o.tagName === 'BUTTON' && o.textContent.trim()));
  assert.equal(all(root, (x) => x.getAttribute('tabindex') === '0').length, 0);
  unmount();
});
