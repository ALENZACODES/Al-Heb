// Roots and verb patterns: data derived from the vocabulary file, pure model, drill, view (fake DOM).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { N, tick, btn, memStore } from './torahread.fakedom.js';
import * as M from '../src/roots/model.js';
import { build, badMarks } from '../tools/roots/build.mjs';
import { rootFamilies } from '../src/grammar/model.js';

const rd = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const words = JSON.parse(rd('data/vocab/words.json')).words;
const FAM = JSON.parse(rd('data/roots/families.json')), VERBS = JSON.parse(rd('data/roots/verbs.json'));
const byId = new Map(words.map((w) => [w.id, w]));

test('data files are current: rebuild with node tools/roots/build.mjs', () => {
  const b = build(words);
  assert.equal(JSON.stringify(b.families) + '\n', rd('data/roots/families.json'));
  assert.equal(JSON.stringify(b.verbs) + '\n', rd('data/roots/verbs.json'));
});

test('a family is exactly the set of visible rows sharing a root string; none invented, none dropped', () => {
  for (const f of FAM.families) {
    assert.ok(f.words.length >= 2 && f.size === f.words.length);
    const expect = words.filter((w) => w.root === f.root && w.kind === 'word' && !(w.flags && w.flags.hidden)).map((w) => w.id).sort();
    assert.deepEqual(f.words.map((w) => w.id).sort(), expect, f.root);
    for (const w of f.words) { const src = byId.get(w.id); assert.equal(w.he, badMarks(src.he) ? src.heUnpointed : src.he); assert.equal(w.en, src.en); assert.equal(w.binyan, src.binyan || null); }
  }
  const inFam = new Set(FAM.families.flatMap((f) => f.words.map((w) => w.id)));
  assert.ok(!words.some((w) => w.root === null && inFam.has(w.id)), 'rows with root null are never in a family');
});

test('coverage numbers equal a fresh count of words.json', () => {
  const c = FAM.coverage, verbs = words.filter((w) => w.pos === 'verb');
  assert.equal(c.verbs, verbs.length); assert.equal(c.verbsWithRoot, verbs.filter((w) => w.root).length);
  assert.equal(c.verbsWithBinyan, verbs.filter((w) => w.binyan).length);
  assert.equal(c.familiesOf3Plus, FAM.families.filter((f) => f.size >= 3).length);
  assert.match(M.coverageText(c), /Roots are listed for 501 of 1820 verbs \(28%\)/);
});

test('verb rows hold only forms from the vocabulary file; verbTable never adds a past tense', () => {
  for (const v of VERBS.verbs) { assert.deepEqual(v.forms, Object.fromEntries(Object.entries(byId.get(v.id).forms).filter(([, x]) => !badMarks(x)))); assert.ok(v.binyan); }
  const v = VERBS.verbs.find((x) => x.forms.future);
  const t = M.verbTable(v);
  assert.deepEqual(t.rows.map((r) => r.he), ['infinitive', 'present', 'future'].map((k) => v.forms[k]).filter(Boolean));
  assert.ok(t.notes.some((n) => /no past tense/.test(n)));
  assert.ok(!t.rows.some((r) => /past/i.test(r.label)));
  const bare = M.verbTable({ id: 'x', he: 'x', forms: { infinitive: 'a' } });
  assert.deepEqual(bare.missing, ['present', 'future']); assert.equal(M.verbTable(null).rows.length, 0);
});

test('searchFamilies: by root letters with or without maqaf, by English, empty returns the largest first', () => {
  const f = FAM.families.find((x) => x.root.replace(/־/g, '').length === 3);
  assert.ok(M.searchFamilies(FAM.families, f.root).some((x) => x.root === f.root));
  assert.ok(M.searchFamilies(FAM.families, f.root.replace(/־/g, '')).some((x) => x.root === f.root));
  const w = f.words[0];
  assert.ok(M.searchFamilies(FAM.families, w.en.toLowerCase().slice(0, 6), 400).some((x) => x.root === f.root));
  assert.equal(M.searchFamilies(FAM.families, '').length, 30); assert.equal(M.searchFamilies(FAM.families, 'zzzzqqqq').length, 0);
  assert.equal(M.searchFamilies(FAM.families, '')[0].size, FAM.families[0].size);
});

test('searchVerbs by gloss, transliteration and unpointed Hebrew', () => {
  const v = VERBS.verbs[0];
  assert.ok(M.searchVerbs(VERBS.verbs, v.translit).some((x) => x.id === v.id));
  assert.ok(M.searchVerbs(VERBS.verbs, v.unpointed, 2000).some((x) => x.id === v.id));
  assert.ok(M.searchVerbs(VERBS.verbs, v.he, 2000).some((x) => x.id === v.id), 'pointed query is stripped');
});

test('quiz: deterministic, answers verified against the data, distractors never share the root or pattern', () => {
  const a = M.buildQuiz(FAM.families, VERBS.verbs, { seed: 5 }), b = M.buildQuiz(FAM.families, VERBS.verbs, { seed: 5 });
  assert.deepEqual(a, b); assert.equal(a.length, 8);
  assert.deepEqual(new Set(a.map((q) => q.type)), new Set(['root', 'binyan', 'newbinyan']));
  for (let seed = 1; seed <= 40; seed++) for (const q of M.buildQuiz(FAM.families, VERBS.verbs, { seed })) {
    assert.equal(q.options.length, 4); assert.equal(new Set(q.options.map((o) => o.id)).size, 4);
    const right = q.options.find((o) => o.id === q.answer); assert.ok(right);
    if (q.type === 'root') {
      const root = q.rootLetters;
      assert.equal(byId.get(right.wordId).root, root);
      for (const o of q.options) if (o !== right) assert.notEqual(byId.get(o.wordId).root, root);
    } else if (q.type === 'newbinyan') {
      const r = byId.get(right.wordId); assert.equal(r.pos, 'verb');
      for (const o of q.options) if (o !== right) { const d = byId.get(o.wordId); assert.equal(d.binyan, r.binyan); assert.notEqual(d.root, r.root); }
    } else {
      const v = words.find((w) => w.he === q.verb.he && w.translit === q.verb.translit && w.binyan); assert.equal(M.binyanName(right.binyan), M.binyanName(v.binyan));
    }
    assert.equal(M.gradeAnswer(q, q.answer).correct, true);
    assert.equal(M.gradeAnswer(q, 'nope').correct, false);
  }
});

test('normalizeProgress clamps junk', () => {
  assert.deepEqual(M.normalizeProgress({ asked: 3, right: 9, round: -1 }), { v: 1, asked: 3, right: 3, round: 0 });
  assert.deepEqual(M.normalizeProgress('x'), M.emptyProgress());
});

const data = { families: { coverage: FAM.coverage, families: FAM.families.slice(0, 40) }, verbs: { verbs: VERBS.verbs.slice(0, 400) } };
test('view: draft note, coverage, labelled 44px controls, root opens with verb table that says no past tense', async () => {
  const V = await import('../src/roots/roots.view.js');
  const root = new N('main'); const store = memStore();
  const un = V.mount(root, { store, rootsData: data }); await tick();
  assert.match(root.textContent, /Draft and unreviewed/); assert.match(root.textContent, /Roots are listed for 501 of 1820/);
  for (const b of root.all((n) => n.tag === 'button')) assert.match(b.attrs.style || '', /min-height:44px/);
  assert.ok(root.queryAll('label')[0].attrs.for === 'rt-q' && root.queryAll('#rt-q').length === 1);
  const f = data.families.families.find((x) => x.words.some((w) => w.forms));
  await btn(root, new RegExp('^' + f.root)).click(); await tick();
  assert.match(root.textContent, new RegExp(f.words.length + ' words'));
  const vb = root.all((n) => n.tag === 'button' && n.attrs['aria-label'] && /^Verb forms for/.test(n.attrs['aria-label']))[0];
  await vb.click(); await tick();
  assert.ok(root.queryAll('table').length === 1 && root.queryAll('th').length >= 3);
  assert.match(root.textContent, /no past tense/);
  un();
});

test('view: verb search and drill record answers in the store', async () => {
  const V = await import('../src/roots/roots.view.js');
  const root = new N('main'); const store = memStore();
  const un = V.mount(root, { store, rootsData: data }); await tick();
  await btn(root, /^Verb forms$/).click(); await tick();
  const first = root.all((n) => n.tag === 'button' && /^Show forms of/.test(n.attrs['aria-label'] || ''))[0];
  await first.click(); await tick();
  assert.equal(root.queryAll('table').length, 1);
  await btn(root, /^Drill$/).click(); await tick();
  assert.match(root.textContent, /Question 1 of 8/);
  const opts = root.queryAll('[aria-label="Answers"] button'); assert.equal(opts.length, 4);
  await opts[0].click(); await tick();
  assert.equal(store.m[M.STORE_KEY].asked, 1);
  assert.ok(root.all((n) => n.tag === 'button' && n.attrs.disabled !== undefined).length >= 4, 'options lock after answering');
  assert.match(root.textContent, /Right\.|Not this one\./);
  un();
});

test('rule check: every ruleChecked family is also returned by the grammar lane\'s rootFamilies(), with the same checked words; the count is reported', () => {
  const g = new Map(rootFamilies(words).map((f) => [f.root, new Set(f.words.map((w) => w.id))]));
  const checked = FAM.families.filter((f) => f.ruleChecked);
  assert.equal(checked.length, g.size); assert.equal(FAM.coverage.familiesRuleChecked, g.size);
  for (const f of checked) { assert.ok(g.has(f.root), f.root); assert.deepEqual(new Set(f.checkedIds), g.get(f.root)); }
  for (const f of FAM.families.filter((x) => !x.ruleChecked)) assert.deepEqual(f.checkedIds, []);
});

test('no prompt or heading claims a shared root for an unverified family; drills use only rule-checked words', () => {
  const ver = JSON.parse(rd('data/roots/verified.json')).roots;
  assert.deepEqual(ver, [], 'update this test with the reviewer\'s list when roots are confirmed');
  assert.equal(FAM.coverage.familiesVerified, 0);
  const checkedIds = new Set(FAM.families.filter((f) => f.ruleChecked).flatMap((f) => f.checkedIds));
  for (let seed = 1; seed <= 40; seed++) for (const q of M.buildQuiz(FAM.families, VERBS.verbs, { seed })) {
    assert.doesNotMatch(q.prompt + q.explain, /comes from the root|Same root|shares the root/i, q.prompt);
    if (q.type !== 'binyan') { assert.match(q.prompt, /letters/); assert.ok(checkedIds.has(q.options.find((o) => o.id === q.answer).wordId)); }
  }
  assert.match(M.familyBadge({ verified: false, ruleChecked: true }), /Not yet confirmed/); assert.match(M.familyBadge({ verified: false, ruleChecked: false }), /Loose/);
  assert.match(M.relation({ root: 'x', verified: true }, 'root'), /comes from the root/);
});

test('no copied form has conflicting marks; skipped ones are reported, never repaired', () => {
  const b = build(words);
  const all = [...FAM.families.flatMap((f) => f.words), ...VERBS.verbs];
  for (const w of all) { assert.ok(!badMarks(w.he), w.id); for (const x of Object.values(w.forms || {})) assert.ok(!badMarks(x), w.id); }
  assert.ok(b.skipped.some((k) => k.id === 'h448338e7' && k.field === 'he' && k.used === 'טיח'));
  assert.ok(b.skipped.some((k) => k.id === 'h9167dfb6' && k.field === 'forms.plural' && k.used === null));
  assert.ok(b.skipped.every((k) => k.used === null || k.used === byId.get(k.id).heUnpointed), 'only a spelling already in the vocabulary file is used as a stand-in');
});
