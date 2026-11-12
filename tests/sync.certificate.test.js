// Lane 4 (12 Nov): the learner's own Certificate of Lessons Completed. It states exactly what it certifies (lessons
// completed under the pass rule, each with its first-try score and date, from the learner's own records), carries the
// record in a link that recomputes it, and says plainly what it cannot prove. No "verified", "accredited" or "endorsed".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { install, newRoot, El, tick } from './wordtrace.fakedom.js';
import { createStore, createMemoryStorage } from '../src/store.js';
import { buildRecord, readRecord, evaluate, recordCode, recordFromCode, recordLink, dateText, COPY } from '../src/sync/certificate.js';
import { withCheck, CHECKS_KEY, PASS_SHARE } from '../src/curriculum/passmark.js';
import { saveQuickCheck } from '../src/curriculum/actions.js';
import { byId } from '../src/curriculum/lessons.js';
import { summaryById } from '../src/curriculum/lessons-index.js';
import { pack } from '../src/sync/transfer.js';
import { EVIDENCE_SUMMARY } from '../src/awards/trust.js';

const T0 = Date.UTC(2026, 10, 2, 15), DAY = 864e5;
const doc = install();
const toNode = (c) => (typeof c === 'string' ? doc.createTextNode(c) : c);
El.prototype.append = function (...k) { for (const c of k) this.appendChild(toNode(c)); };
El.prototype.replaceChildren = function (...k) { for (const c of [...this.childNodes]) this.removeChild(c); this.append(...k); };
El.prototype.prepend = function (...k) { for (const c of k.reverse()) this.insertBefore(toNode(c), this.childNodes[0] || null); };
doc.head = doc.createElement('head'); doc.getElementById = () => null; doc.body = doc.createElement('body');

test('withCheck keeps the earliest pass and the newest 10 attempts', () => {
  let m = withCheck(undefined, 'r01', 1, 4, 10);
  assert.deepEqual(m.r01, { pass: null, tries: [{ at: 10, right: 1, of: 4 }] });
  m = withCheck(m, 'r01', 3, 4, 20); m = withCheck(m, 'r01', 4, 4, 30);
  assert.deepEqual(m.r01.pass, { at: 20, right: 3, of: 4 });
  for (let i = 0; i < 12; i++) m = withCheck(m, 'r01', 0, 4, 100 + i);
  assert.equal(m.r01.tries.length, 10); assert.deepEqual(m.r01.pass, { at: 20, right: 3, of: 4 });
});

test('a quick check writes its first-try score with the lesson, passed or not', async () => {
  const s = createStore({ storage: createMemoryStorage(), window: null });
  const qs = [{ id: 'a', cardId: 'word:r01:0', cardKind: 'word' }, { id: 'b', cardId: 'word:r01:1', cardKind: 'word' }, { id: 'c', cardId: 'word:r01:2', cardKind: 'word' }];
  await saveQuickCheck({ store: s }, byId.r01, qs, { a: true, b: false, c: false }, T0);
  assert.deepEqual(s.get(CHECKS_KEY).r01, { pass: null, tries: [{ at: T0, right: 1, of: 3 }] });
  assert.equal(s.get('curriculum.progress'), undefined);
  await saveQuickCheck({ store: s }, byId.r01, qs, { a: true, b: true, c: false }, T0 + 60e3);
  assert.deepEqual(s.get(CHECKS_KEY).r01.pass, { at: T0 + 60e3, right: 2, of: 3 });
  assert.equal(s.get('curriculum.progress').completed.r01, T0 + 60e3);
});

const progress = { completed: { r01: T0, r02: T0 + DAY, r03: T0 + 2 * DAY } };
const checks = { r01: { pass: { at: T0, right: 3, of: 4 }, tries: [] }, r02: { pass: { at: T0 + DAY, right: 7, of: 10 }, tries: [] } }; // r03 finished before scores were kept

test('the record lists every completed lesson with its first-try score and date; a lesson with no kept score is listed but not counted', () => {
  const rec = buildRecord({ progress, checks, name: 'Dana <b>Levi</b>', now: T0 + 3 * DAY });
  assert.equal(rec.name, 'Dana bLevi/b'); assert.equal(rec.share, PASS_SHARE);
  assert.deepEqual(rec.lessons.map((r) => r[0]), ['r01', 'r02', 'r03']);
  const ev = evaluate(rec, summaryById);
  assert.equal(ev.meets, 2); assert.equal(ev.unscored, 1); assert.equal(ev.problems, 0);
  assert.equal(ev.right, 10); assert.equal(ev.of, 14); assert.equal(ev.firstTryPct, 71);
  assert.deepEqual(ev.rows.map((r) => r.status), ['meets', 'meets', 'unscored']);
  assert.equal(ev.rows[1].need, 7); assert.equal(ev.rows[0].title, summaryById.r01.title);
  assert.equal(dateText(T0), '2 November 2026');
});

test('the link carries the record and the page recomputes it: an edited score that misses the rule is shown as not counted', async () => {
  const rec = buildRecord({ progress, checks, name: 'Dana', now: T0 });
  const code = await recordCode(rec);
  assert.deepEqual(await recordFromCode(code), readRecord(JSON.parse(JSON.stringify(rec))));
  assert.equal(recordLink('https://alef-review.onrender.com/#/awards', code), `https://alef-review.onrender.com/#/certificate?r=${code}`);
  const edited = JSON.parse(JSON.stringify(rec)); edited.lessons[1][2] = 5; // 5 of 10 cannot pass
  edited.lessons.push(['zz9', T0, 9, 9, T0]); edited.lessons.push(['r04', T0, 11, 10, T0]);
  const ev = evaluate(readRecord(edited), summaryById);
  assert.deepEqual(ev.rows.map((r) => r.status), ['meets', 'below', 'unscored', 'unknown-lesson', 'impossible']);
  assert.equal(ev.meets, 1); assert.equal(ev.problems, 3);
  assert.equal(readRecord({ kind: 'other' }), null);
  assert.equal(evaluate(readRecord({ ...rec, share: 0.5 }), summaryById).ruleChanged, true);
});

test('wording: says what it certifies and what it cannot prove; no verified, accredited or endorsed; matches the Awards limits', () => {
  const words = [COPY.title, COPY.what('Dana'), COPY.limits, COPY.unscored, COPY.link, COPY.checking].join(' ');
  const view = readFileSync(new URL('../src/sync/certificate.view.js', import.meta.url), 'utf8');
  for (const t of [words, view]) assert.ok(!/verif|accredit|endorse|official|guarantee/i.test(t), 'no overclaiming words');
  assert.match(COPY.what(''), /at least 70% of the lesson's quick check right on the first try/);
  assert.match(COPY.what(''), /first-try score/); assert.match(COPY.what(''), /own records/);
  assert.match(COPY.limits, /no server and no signature/); assert.match(COPY.limits, /not a proctored assessment/); assert.match(COPY.limits, /A teacher can check the rule and each lesson/);
  // the same limit the Awards page states about the pass mark
  assert.match(EVIDENCE_SUMMARY, /have not been reviewed by a qualified Hebrew teacher/); assert.match(COPY.limits, /have not been reviewed by a qualified Hebrew teacher/);
  const gallery = readFileSync(new URL('../src/awards/gallery.view.js', import.meta.url), 'utf8');
  assert.match(gallery, /#\/certificate/); assert.match(gallery, /self-issued from your own records, not reviewed/);
});

test('the page prints only the sheet', () => {
  const view = readFileSync(new URL('../src/sync/certificate.view.js', import.meta.url), 'utf8');
  assert.match(view, /@media print\{[^]*body \*\{visibility:hidden!important\}[^]*\.lc-sheet,\.lc-sheet \*\{visibility:visible!important\}[^]*\.lc-noprint\{display:none!important\}/);
  assert.match(view, /class: 'lc-row lc-noprint'/);
});

test('view: the learner\'s own record shows the table, the limits and a link that reopens the same record', async () => {
  const s = createStore({ storage: createMemoryStorage(), window: null });
  s.set('curriculum.progress', progress); s.set(CHECKS_KEY, checks); s.set('awards.v1', { displayName: 'Dana' });
  const { mount } = await import('../src/sync/certificate.view.js');
  const root = newRoot(doc); mount(root, { store: s, query: {} });
  assert.equal(root.querySelector('#view-title').textContent, 'Certificate of Lessons Completed');
  assert.equal(root.querySelectorAll('tr[data-status="meets"]').length, 2);
  assert.equal(root.querySelectorAll('tr[data-status="unscored"]').length, 1);
  assert.match(root.querySelector('#lc-summary').textContent, /2 lessons meet the pass rule, with 10 of 14 quick-check questions right on the first try/);
  assert.match(root.querySelector('#lc-limits').textContent, /cannot prove/);
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async () => {} } } });
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { href: 'https://alef-review.onrender.com/#/certificate' } });
  const nameIn = root.querySelector('#lc-name-input'); assert.equal(nameIn.getAttribute('value'), 'Dana', 'the Awards name is offered');
  nameIn.value = 'Dana'; nameIn.dispatch('input'); // the fake DOM has no value reflection
  root.querySelector('#lc-copy').click(); await tick(50);
  const href = root.querySelector('#lc-link-a').getAttribute('href');
  const code = /[?&]r=([A-Za-z0-9_-]+)/.exec(href)[1];
  const root2 = newRoot(doc); mount(root2, { store: createStore({ storage: createMemoryStorage(), window: null }), query: { r: code } });
  await tick(50);
  assert.match(root2.querySelector('#lc-checking').textContent, /worked out every pass again/);
  assert.equal(root2.querySelectorAll('tr[data-status="meets"]').length, 2);
  assert.equal(root2.querySelector('#lc-name').textContent, 'Dana');
  const root3 = newRoot(doc); mount(root3, { store: s, query: { r: (await pack({ nope: 1 })).code } }); await tick(50);
  assert.ok(root3.querySelector('#lc-bad'));
});

test('a refused write of the check score undoes the whole pass: no done mark, cards and streak as before', async () => {
  const m = {}; const s = { get: (k) => (k in m ? JSON.parse(JSON.stringify(m[k])) : undefined), set: (k, v) => { if (k === CHECKS_KEY) throw new Error('refused'); m[k] = JSON.parse(JSON.stringify(v)); }, remove: (k) => { delete m[k]; } };
  const qs = [{ id: 'a', cardId: 'word:r01:0', cardKind: 'word' }];
  await assert.rejects(() => saveQuickCheck({ store: s }, byId.r01, qs, { a: true }, T0));
  assert.deepEqual(Object.keys(m), [], 'everything written in the batch was rolled back');
});
