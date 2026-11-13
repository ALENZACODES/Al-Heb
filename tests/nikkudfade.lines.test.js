// Whole lines on the vowel-mark fade page: the line model against the real unit file, and the view on a fake DOM (logic, not rendering).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { N, tick, btn, memStore } from './torahread.fakedom.js';
import * as M from '../src/nikkudfade/model.js';
import * as L from '../src/nikkudfade/lines.js';

const rd = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const set = rd('data/nikkudfade/reading-set.json');
const sched = rd('data/nikkudfade/schedule.json');
const unit = rd(`assets/vendor/_alef-tools/nikud@0.1.0/nikud/${L.LINE_UNIT}.json`);
const lines = L.usableLines(unit);
const NAME = 'יהוה';

test('usable lines: only the app\'s own marked lines, 3 to 8 words, every word marked, never the Name', () => {
  assert.ok(lines.length >= 100, `enough lines: ${lines.length}`);
  for (const l of lines) {
    assert.ok(L.LINE_SOURCES.includes(l.source));
    assert.ok(l.words.length >= 3 && l.words.length <= 8);
    assert.ok(!M.stripPoints(l.he).includes(NAME));
    for (const w of l.words) if (/[א-ת]/.test(w)) assert.ok(M.hasPoints(w), `marked: ${w}`);
  }
  assert.equal(new Set(lines.map((l) => l.he)).size, lines.length, 'no repeats');
});

test('lines whose marks came from the offline build are left out, even when they look fine', () => {
  const doc = { lines: [{ t: 'אבא בא הביתה', p: 'אַבָּא בָּא הַבַּיְתָה', s: 'model' }, { t: 'אַבָּא בָּא הַבַּיְתָה', p: 'אַבָּא בָּא הַבַּיְתָה', s: 'model' }, { t: 'אַבָּא בָּא הַבַּיְתָה', p: 'אַבָּא בָּא הַבַּיְתָה', s: 'checked' }, { t: 'אַבָּא בָּא', p: 'אַבָּא בָּא', s: 'checked' }, { t: 'אַבָּא בא הַבַּיְתָה', p: 'אַבָּא בא הַבַּיְתָה', s: 'book' }] };
  const got = L.usableLines(doc);
  assert.equal(got.length, 1); assert.equal(got[0].source, 'checked');
  assert.deepEqual(L.usableLines(null), []);
});

test('fading only removes marks: every shown word is the stored word or the stored word without its marks', () => {
  const index = L.wordIndex(set.items);
  for (const stage of [1, 2, 3]) {
    const st = { ...M.defaultState(), stage };
    for (const l of lines.slice(0, 120)) {
      const parts = L.fadeLine(l, st, index, { sched });
      assert.equal(parts.length, l.words.length);
      parts.forEach((p, i) => assert.ok(p.text === l.words[i] || p.text === M.stripPoints(l.words[i])));
      if (stage === 1) assert.ok(parts.every((p) => p.pointed && p.text === l.words[i0(parts, p)]));
      if (stage === 3) assert.ok(parts.every((p) => !p.pointed && !M.hasPoints(p.text)));
      assert.equal(L.fadeLine(l, st, index, { revealed: true }).map((p) => p.text).join(' '), l.he);
    }
  }
});
const i0 = (parts, p) => parts.indexOf(p);

test('stage 2: marks stay on words not yet read a few times and on look-alikes, and go once a word is known', () => {
  const plain = set.items.find((i) => !i.ambiguous && set.items.filter((x) => x.unpointed === i.unpointed).length === 1);
  const amb = set.items.find((i) => i.ambiguous);
  const line = { he: `${plain.he} ${amb.he} אַבָּא`, words: [plain.he, amb.he, 'אַבָּא'] };
  const index = L.wordIndex(set.items);
  let st = { ...M.defaultState(), stage: 2, auto: false };
  assert.deepEqual(L.fadeLine(line, st, index, { sched }).map((p) => p.why), ['new', 'ambiguous', 'new']);
  for (let i = 0; i < sched.newAfter; i++) st = M.recordRead(st, plain.id, { aided: false, now: i, sched });
  st = { ...st, stage: 2 };
  const after = L.fadeLine(line, st, index, { sched });
  assert.equal(after[0].why, 'faded'); assert.equal(after[0].text, M.stripPoints(plain.he));
  assert.equal(after[1].pointed, true); assert.equal(after[2].why, 'new');
});

test('pickLines is repeatable for a seed and never repeats a line in one go', () => {
  const a = L.pickLines(lines, { seed: 7, count: 5 }), b = L.pickLines(lines, { seed: 7, count: 5 });
  assert.deepEqual(a, b); assert.equal(new Set(a.map((l) => l.he)).size, 5);
  assert.notDeepEqual(a, L.pickLines(lines, { seed: 8, count: 5 }));
});

test('view: lines load only on the button, show the stage, reveal, and save nothing', async () => {
  const V = await import('../src/nikkudfade/nikkudfade.view.js');
  const root = new N('main'); const store = memStore();
  store.m[M.STORE_KEY] = { stage: 3, auto: false, words: {}, recent: [] };
  const un = V.mount(root, { store, nikkudfadeData: { set: { items: set.items.slice(0, 5) }, schedule: sched }, nikkudfadeLines: unit });
  await tick();
  assert.match(root.textContent, /Whole Lines/);
  assert.equal(root.queryAll('.nf-line').length, 0, 'no line before the button');
  const before = JSON.stringify(store.m[M.STORE_KEY]);
  await btn(root, /^Read Whole Lines/).click(); await tick();
  const shown = root.queryAll('.nf-line')[0].textContent;
  assert.ok(shown.split(' ').length >= 3 && !M.hasPoints(shown), 'stage 3 line has no marks');
  assert.match(root.textContent, /Line 1 of 5/);
  for (const b of root.all((n) => n.tag === 'button')) assert.match(b.attrs.style || '', /min-height:44px/);
  await btn(root, /^Show The Vowel Marks/).click(); await tick();
  const full = root.queryAll('.nf-line')[0].textContent;
  assert.ok(M.hasPoints(full)); assert.equal(M.stripPoints(full), shown);
  assert.ok(lines.some((l) => l.he === full), 'the revealed line is a stored line, unchanged');
  await btn(root, /^I Read It/).click(); await tick();
  await btn(root, /^Next Line/).click(); await tick();
  assert.match(root.textContent, /Line 2 of 5/);
  assert.equal(JSON.stringify(store.m[M.STORE_KEY]), before, 'nothing saved for lines');
  un();
});

test('view: a unit file with no usable line gives a plain message and leaves the word rounds working', async () => {
  const V = await import('../src/nikkudfade/nikkudfade.view.js');
  const root = new N('main');
  const un = V.mount(root, { store: memStore(), nikkudfadeData: { set: { items: set.items.slice(0, 5) }, schedule: sched }, nikkudfadeLines: { lines: [] } });
  await tick();
  await btn(root, /^Read Whole Lines/).click(); await tick();
  assert.match(root.textContent, /could not be loaded/);
  assert.ok(btn(root, /^I read it/), 'word round still there');
  un();
});
