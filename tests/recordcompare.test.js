// Record-and-compare speaking practice: pair selection from the minimal-pair data, honest unscored wording, view with fake recorder (no microphone is used).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { N, tick, btn, memStore } from './torahread.fakedom.js';
import * as M from '../src/recordcompare/model.js';

const DATA = JSON.parse(readFileSync(new URL('../data/speak/minimal-pairs.json', import.meta.url), 'utf8'));

test('listPairs offers only pairs the data marks audible in that tradition, with that tradition\'s respelling', () => {
  for (const [i, t] of DATA.traditions.entries()) {
    const list = M.listPairs(DATA, t);
    const expect = DATA.contrasts.flatMap((c) => c.pairs).filter((p) => p.audible[i] === true).length;
    assert.equal(list.length, expect, t);
    for (const p of list) assert.notEqual(p.a.he, p.b.he);
  }
  const sin = M.listPairs(DATA, 'ashkenazi', 'shin-sin')[0];
  const src = DATA.contrasts.find((c) => c.id === 'shin-sin').pairs.find((p) => `${p.a.id}|${p.b.id}` === sin.key);
  assert.equal(sin.a.respelling, src.a.simple[2]); assert.equal(sin.a.he, src.a.he);
  assert.deepEqual(M.listPairs(DATA, 'klingon'), []);
});

test('kamatz-patach pairs exist only where the data says they are audible (ashkenazi), not israeli', () => {
  assert.equal(M.listPairs(DATA, 'israeli', 'kamatz-patach').length, 0);
  assert.ok(M.listPairs(DATA, 'ashkenazi', 'kamatz-patach').length > 0);
  assert.ok(M.contrastsFor(DATA, 'israeli').every((c) => c.count > 0));
});

test('state: only counts of self-reports are kept; junk is normalised; invalid answers ignored', () => {
  let s = M.emptyState();
  s = M.recordAnswer(s, 'a|b', 'yes'); s = M.recordAnswer(s, 'a|b', 'no'); s = M.recordAnswer(s, 'c|d', 'unsure');
  assert.deepEqual(s.answers, { yes: 1, unsure: 1, no: 1 }); assert.equal(s.pairs['a|b'].tries, 2);
  assert.equal(M.recordAnswer(s, 'a|b', 'perfect'), s);
  assert.deepEqual(M.normalizeState(JSON.parse(JSON.stringify(s))), s);
  assert.deepEqual(M.normalizeState({ pairs: 'x', answers: { yes: -4 } }), M.emptyState());
  assert.ok(!JSON.stringify(s).match(/blob:|url|audio/i), 'nothing audio-like is stored');
});

test('pickPairs prefers least-practised, deterministic; summary is a report not a score', () => {
  const list = M.listPairs(DATA, 'ashkenazi'); let s = M.emptyState();
  for (const p of list.slice(0, 10)) s = M.recordAnswer(s, p.key, 'yes');
  const a = M.pickPairs(list, s, { size: 6, seed: 2 }), b = M.pickPairs(list, s, { size: 6, seed: 2 });
  assert.deepEqual(a, b); assert.ok(a.every((p) => !s.pairs[p.key]));
  assert.match(M.summaryText(s), /your own reports, not a measurement/); assert.match(M.summaryText(M.emptyState()), /No practice/);
  assert.doesNotMatch(M.summaryText(s) + M.HONESTY + M.PRIVACY, /accuracy|% correct|score of|you scored/i);
  assert.match(M.HONESTY, /does not judge your pronunciation/); assert.match(M.PRIVACY, /not saved/);
});

test('describeError gives plain text for each recorder error code', () => {
  for (const c of ['unsupported', 'not-allowed', 'audio-capture', 'start-failed', 'stop-failed', 'no-data', 'weird']) assert.ok(M.describeError(c).length > 10);
});

const fakeRecorder = (supported = true, fail = null) => {
  const log = []; let on = false, n = 0;
  return { log, supported, disposed: 0, async start() { if (fail) return { ok: false, error: fail }; on = true; log.push('start'); return { ok: true }; }, async stop() { if (!on) return { ok: false, error: 'not-recording' }; on = false; n += 1; log.push('stop'); return { ok: true, url: 'blob:fake' + n, ms: 1200 }; }, dispose() { this.disposed += 1; on = false; }, get recording() { return on; } };
};
const mk = (over = {}) => {
  const played = []; const spoken = [];
  const rec = over.recorder || fakeRecorder();
  return { rec, played, spoken, ctx: { store: over.store || memStore(), recordCompare: { data: DATA, tradition: 'ashkenazi', recorder: rec, speaker: { supported: true, speak: async (t) => { spoken.push(t); return { ok: true }; }, cancel() {} }, makeAudio: (u) => ({ play: async () => { played.push(u); }, pause() {} }), setTimeout: () => 0, clearTimeout() {} } } };
};

test('view: honesty and privacy text, labelled 44px controls, no score wording', async () => {
  const V = await import('../src/recordcompare/recordcompare.view.js');
  const root = new N('main'), { ctx } = mk(); const un = V.mount(root, ctx); await tick();
  assert.match(root.textContent, /does not judge your pronunciation/); assert.match(root.textContent, /not saved/); assert.match(root.textContent, /Draft and unreviewed/);
  assert.doesNotMatch(root.textContent, /accuracy|% correct|you scored|score of|\d%/i);
  for (const b of root.all((n) => n.tag === 'button')) assert.match(b.attrs.style || '', /min-height:44px/);
  assert.ok(root.queryAll('[role="group"]').every((g) => g.attrs['aria-label'])); un();
});

test('view: record A and B, play back, report; only the self-report count is stored', async () => {
  const V = await import('../src/recordcompare/recordcompare.view.js');
  const root = new N('main'), m = mk(); const un = V.mount(root, m.ctx); await tick();
  assert.equal(btn(root, /^Hear A/) !== undefined, true);
  await btn(root, /^Hear A/).click(); assert.equal(m.spoken.length, 1);
  assert.equal(btn(root, /^Play my A/), undefined);
  assert.ok(!root.all((n) => n.tag === 'button' && /^(Yes|No|Not sure)/.test(n.textContent)).length, 'cannot answer before recording both');
  await btn(root, /^Record A/).click(); await tick();
  assert.ok(btn(root, /^Record B/).attrs.disabled !== undefined, 'one recording at a time');
  await btn(root, /^Stop recording A/).click(); await tick();
  await btn(root, /^Play my A/).click(); assert.deepEqual(m.played, ['blob:fake1']);
  await btn(root, /^Record B/).click(); await tick(); await btn(root, /^Stop recording B/).click(); await tick();
  await btn(root, /^Yes, I could hear/).click(); await tick();
  const saved = m.ctx.store.m[M.STORE_KEY];
  assert.equal(saved.answers.yes, 1); assert.ok(!JSON.stringify(saved).includes('blob:'));
  await btn(root, /^Next pair/).click(); await tick();
  assert.match(root.textContent, /Pair 2 of/); assert.equal(btn(root, /^Play my A/), undefined, 'takes are dropped for the next pair');
  assert.ok(m.rec.disposed >= 1);
  un(); assert.ok(m.rec.disposed >= 2);
});

test('view: microphone refused shows the reason; no recorder support still allows listening and reporting', async () => {
  const V = await import('../src/recordcompare/recordcompare.view.js');
  let root = new N('main'), m = mk({ recorder: fakeRecorder(true, 'not-allowed') }); let un = V.mount(root, m.ctx); await tick();
  await btn(root, /^Record A/).click(); await tick();
  assert.match(root.queryAll('[role="status"]')[0].textContent, /microphone was blocked/); un();
  root = new N('main'); m = mk({ recorder: fakeRecorder(false) }); un = V.mount(root, m.ctx); await tick();
  assert.equal(btn(root, /^Record /), undefined); assert.match(root.textContent, /cannot record/);
  assert.match(root.textContent, /Hear A and B. Could you hear a difference/);
  await btn(root, /^Not sure/).click(); await tick(); assert.equal(m.ctx.store.m[M.STORE_KEY].answers.unsure, 1); un();
});

test('view: switching reading style changes the pairs offered; empty selection says so', async () => {
  const V = await import('../src/recordcompare/recordcompare.view.js');
  const root = new N('main'), m = mk(); const un = V.mount(root, m.ctx); await tick();
  await btn(root, /^Israeli$/).click(); await tick();
  assert.equal(btn(root, /^Kamatz/), undefined, 'kamatz/patach is not audible in the Israeli style');
  await btn(root, /^Ashkenazi$/).click(); await tick();
  assert.ok(btn(root, /^Kamatz/)); await btn(root, /^Kamatz/).click(); await tick();
  assert.match(root.textContent, /Pair 1 of 6/); un();
});
test('M-12: the page says why it gives no score, and the reason holds for the shipped pairs', async () => {
  const V = await import('../src/recordcompare/recordcompare.view.js');
  const root = new N('main'), { ctx } = mk(); const un = V.mount(root, ctx); await tick();
  assert.match(root.textContent, /Why there is no score here/); assert.match(root.textContent, /Say it page/);
  un();
  // "in most of these pairs both words have the same letters": letters-only, as a recognizer writes them.
  const { normalizeHe } = await import('../src/speak/model.js');
  const all = DATA.contrasts.flatMap((c) => c.pairs);
  const same = all.filter((p) => normalizeHe(p.a.he) === normalizeHe(p.b.he)).length;
  assert.ok(same * 2 > all.length, `${same} of ${all.length} pairs share their letters`);
  const other = new Set(DATA.contrasts.filter((c) => c.pairs.some((p) => normalizeHe(p.a.he) !== normalizeHe(p.b.he))).map((c) => c.id));
  assert.deepEqual([...other].sort(), ['alef-ayin', 'het-khaf'], 'the rest differ only in letters a recognizer guesses by word frequency');
});
