// Gender drill: data built from the vocabulary file, generator rules (no silent default, no masculine first person for a woman), view (fake DOM).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { N, tick, btn, memStore } from './torahread.fakedom.js';
import * as M from '../src/genderdrill/model.js';
import { build } from '../tools/gender/build.mjs';
import { composeParadigm } from '../src/curriculum/gender.js';

const rd = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const words = JSON.parse(rd('data/vocab/words.json')).words, byId = new Map(words.map((w) => [w.id, w]));
const T = JSON.parse(rd('data/gender/templates.json')), PARS = JSON.parse(rd('data/curriculum/gender-pairs.json')).paradigms;
const opt = { paradigms: PARS };

test('templates are current (node tools/gender/build.mjs) and every Hebrew string is copied from words.json', () => {
  assert.equal(JSON.stringify(build(words), null, 1) + '\n', rd('data/gender/templates.json'));
  for (const p of T.pairs) { const w = byId.get(p.id); assert.equal(p.m.he, w.he); assert.equal(p.f.he, w.forms.feminine); assert.notEqual(p.m.he, p.f.he); assert.equal(w.gender, 'm'); }
  for (const k of Object.values(T.pronouns)) assert.equal(byId.get(k.id).he, k.he);
  for (const n of T.irregular) { const w = byId.get(n.id); assert.equal(w.he, n.he); assert.equal(w.gender, n.gender); }
  assert.ok(T.pairs.length >= 15 && T.irregular.length >= 30);
});

test('irregular list: feminine without a feminine ending, or masculine with one, by the data tag', () => {
  for (const n of T.irregular) { const ends = /[הת]$/.test(n.he.replace(/[֑-ׇ]/g, '')); assert.equal(n.gender === 'f', !ends, n.he); }
  assert.ok(T.irregular.some((n) => n.kind === 'feminine-without-feminine-ending') && T.irregular.some((n) => n.kind === 'masculine-with-feminine-ending'));
});

test('no silent default: speaker null builds nothing; normalizePrefs never invents a gender', () => {
  assert.deepEqual(M.buildDrill(T, null, opt), { needsChoice: true, items: [] });
  assert.deepEqual(M.buildDrill(T, 'x', opt), { needsChoice: true, items: [] });
  assert.equal(M.normalizePrefs(null).speaker, null); assert.equal(M.normalizePrefs({ speaker: 'zz' }).speaker, null);
  assert.equal(M.normalizePrefs(null, { iAm: 'f' }).speaker, 'f', 'an explicit earlier choice in curriculum.gender is honoured');
  assert.equal(M.normalizePrefs({ speaker: 'm' }, { iAm: 'f' }).speaker, 'm', 'gender.v1 wins');
  assert.equal(M.normalizePrefs({ speaker: 'both' }).speaker, 'both');
});

test('woman: over 60 seeds no first-person masculine form is a prompt, option or main answer', () => {
  const masc = new Set(T.pairs.map((p) => `${T.pronouns.ani.he} ${p.m.he}`));
  for (let seed = 1; seed <= 60; seed++) {
    const d = M.buildDrill(T, 'f', { seed, count: 12, ...opt });
    assert.equal(d.items.length, 12);
    for (const it of d.items) {
      for (const f of M.firstPersonForms(it)) { assert.equal(f.form, 'f'); assert.ok(!masc.has(f.he), f.he); }
      if (it.type === 'self') { assert.equal(it.main.form, 'f'); assert.equal(it.other.form, 'm'); }
      if (it.type === 'listener') { const par = PARS.find((x) => x.id === it.paradigmId); assert.deepEqual(it.options.map((o) => o.he), [composeParadigm(par, 'f', 'm').he, composeParadigm(par, 'f', 'f').he], 'speaker slot is the learner\'s own gender'); }
      assert.notEqual(it.type, 'self-both');
    }
  }
});

test('man: main forms are masculine; both: every self item shows both forms, labelled', () => {
  for (let seed = 1; seed <= 20; seed++) for (const it of M.buildDrill(T, 'm', { seed, ...opt }).items) if (it.type === 'self') assert.equal(it.main.form, 'm');
  const both = M.buildDrill(T, 'both', { seed: 3, count: 12, ...opt }).items;
  const selfs = both.filter((i) => i.type.startsWith('self'));
  assert.ok(selfs.length >= 3);
  for (const it of selfs) { assert.equal(it.type, 'self-both'); assert.ok(it.forms.m.he && it.forms.f.he && it.forms.m.he !== it.forms.f.he); }
});

test('agree items: pronoun gender decides the answer; both option forms come from the same pair', () => {
  const ag = M.buildDrill(T, 'f', { seed: 4, count: 40, ...opt }).items.filter((i) => i.type === 'agree');
  assert.ok(ag.length >= 8);
  const sawKeys = new Set();
  for (const it of ag) {
    const pair = T.pairs.find((p) => p.id === it.nounId);
    assert.deepEqual(it.options.map((o) => o.he), [pair.m.he, pair.f.he]);
    const pr = Object.entries(T.pronouns).find(([, v]) => v.he === it.pronoun.he)[0]; sawKeys.add(pr);
    assert.equal(it.answer, { atah: 'm', hu: 'm', at: 'f', hi: 'f' }[pr]);
    assert.equal(M.grade(it, it.answer).correct, true); assert.equal(M.grade(it, it.answer === 'm' ? 'f' : 'm').correct, false);
  }
  assert.ok(sawKeys.size >= 3, 'several pronouns occur');
});

test('listener items put the learner\'s own gender in the speaker slot, the listener gender decides the answer', () => {
  for (const sp of ['m', 'f']) for (let seed = 1; seed <= 30; seed++) for (const it of M.buildDrill(T, sp, { seed, count: 12, ...opt }).items.filter((i) => i.type === 'listener')) {
    assert.equal(it.options.length, 2); assert.notEqual(it.options[0].he, it.options[1].he); assert.ok(['m', 'f'].includes(it.answer));
    const par = PARS.find((x) => x.id === it.paradigmId); assert.equal(it.options.find((o) => o.id === it.answer).he, composeParadigm(par, par.parts.some((x) => x.by === 'speaker') ? sp : 'm', it.answer).he);
  }
});

test('irregular items are graded against the data tag', () => {
  const it = M.buildDrill(T, 'f', { seed: 9, count: 40, ...opt }).items.filter((i) => i.type === 'irregular');
  assert.ok(it.length >= 5);
  for (const q of it) { const w = byId.get(q.nounId); assert.equal(q.answer, w.gender); assert.match(q.explain, /dictionary data/); }
});

test('plainGloss strips gender hints and trailing senses', () => {
  assert.equal(M.plainGloss('a (male) student, pupil, disciple'), 'student'); assert.equal(M.plainGloss('child, a kid, a boy'), 'child'); assert.equal(M.plainGloss(''), '');
});

test('generator is deterministic and works without paradigms', () => {
  assert.deepEqual(M.buildDrill(T, 'f', { seed: 2, ...opt }), M.buildDrill(T, 'f', { seed: 2, ...opt }));
  const d = M.buildDrill(T, 'm', { seed: 2 }); assert.equal(d.items.length, 8); assert.ok(!d.items.some((i) => i.type === 'listener'));
});

test('view: with no stored choice nothing is drilled; choosing saves and shows only the learner\'s form', async () => {
  const V = await import('../src/genderdrill/genderdrill.view.js');
  const root = new N('main'), store = memStore();
  const un = V.mount(root, { store, genderData: { templates: T, paradigms: PARS } }); await tick();
  assert.match(root.textContent, /Draft and unreviewed/); assert.match(root.textContent, /does not guess your gender/);
  assert.ok(root.all((n) => n.tag === 'button' && n.attrs['aria-pressed'] === 'true').length === 0, 'nothing preselected');
  for (const b of root.all((n) => n.tag === 'button')) assert.match(b.attrs.style || '', /min-height:44px/);
  await btn(root, /^I am a woman/).click(); await tick();
  assert.equal(store.m[M.STORE_KEY].speaker, 'f');
  assert.match(root.textContent, /Item 1 of 8/);
  await btn(root, /^Show my form/).click(); await tick();
  const mainForm = root.queryAll('.gd-big')[0].textContent;
  const masc = T.pairs.map((p) => `${T.pronouns.ani.he} ${p.m.he}`);
  assert.ok(!masc.includes(mainForm), 'shown form is not the masculine one');
  assert.doesNotMatch(root.textContent, /The other gender says/);
  await btn(root, /^Show the other gender/).click(); await tick();
  assert.match(root.textContent, /for recognition only/);
  un();
});

test('view: choice answers are recorded and a stored choice is used on reload', async () => {
  const V = await import('../src/genderdrill/genderdrill.view.js');
  const store = memStore(); store.m[M.STORE_KEY] = { speaker: 'm', asked: 0, right: 0 };
  const root = new N('main'), un = V.mount(root, { store, genderData: { templates: T, paradigms: [] } }); await tick();
  assert.equal(root.all((n) => n.tag === 'button' && n.attrs['aria-pressed'] === 'true').length, 1);
  for (let i = 0; i < 8 && store.m[M.STORE_KEY].asked === 0; i++) {
    const answers = root.queryAll('[aria-label="Answers"] button');
    if (answers.length) { await answers[0].click(); await tick(); break; }
    const show = btn(root, /^Show my form/); if (show) { await show.click(); await tick(); }
    await btn(root, /^I said it right/).click(); await tick();
  }
  assert.equal(store.m[M.STORE_KEY].asked, 1);
  assert.equal(store.m[M.STORE_KEY].speaker, 'm');
  un();
});

test('the authored paradigms actually produce listener and speaker items (the checks above are not vacuous)', () => {
  const types = new Set(); for (let s = 1; s <= 20; s++) for (const it of M.buildDrill(T, 'f', { seed: s, count: 12, ...opt }).items) types.add(it.type);
  for (const t of ['self', 'agree', 'listener', 'irregular']) assert.ok(types.has(t), t);
});
