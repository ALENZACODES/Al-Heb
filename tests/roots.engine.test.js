// Roots and binyanim engine (lane 3, 12 Nov, points plan #5 and #15): one denominator for the Roots page, Dictionary words linked to
// their family letters, the seven patterns as pages with a drill, the verb-forms table (only forms the data holds, clips where they
// exist), and family grouping in the Dictionary review. The roots rule: no root is confirmed (data/roots/verified.json), so nothing
// here may say two words share a root.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { N, tick, btn, memStore } from './torahread.fakedom.js';
import * as M from '../src/roots/model.js';
import * as B from '../src/roots/binyanim.js';
import * as L from '../src/roots/links.js';
import { build, dictLinks, readDictionary } from '../tools/roots/build.mjs';
import { BINYANIM as G3_BINYANIM } from '../src/games/g3-core.js';
import { rootsCoverage, TOTALS } from '../src/lib/counts.js';

const rd = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const words = JSON.parse(rd('data/vocab/words.json')).words;
const FAM = JSON.parse(rd('data/roots/families.json')), VERBS = JSON.parse(rd('data/roots/verbs.json')), LINKS = JSON.parse(rd('data/roots/dict-links.json'));
const dict = readDictionary();
const byId = new Map(words.map((w) => [w.id, w]));
const ROOT_CLAIM = /(share|shares|sharing) (a|the|one) root|comes? from the root|same root/i;
const fmt = (n) => n.toLocaleString('en-US');

// ---------- #5 one denominator ----------
test('#5: every verb figure on the Roots page is stated out of the one word-list total, and every number comes from counts.js', () => {
  const c = rootsCoverage(), text = M.coverageText(c);
  assert.equal(c.verbs, FAM.coverage.verbs);
  const verbFigures = [...text.matchAll(/([\d,]+) (?:verbs|have|can be opened|of those|\(\d+%\))/g)].map((m) => m[1]);
  assert.ok(verbFigures.length >= 3);
  // the only "N verbs" total is the word-list total; the others are parts of it, said as such
  assert.deepEqual([...text.matchAll(/([\d,]+) verbs\b/g)].map((m) => m[1]), [fmt(c.verbs)]);
  assert.match(text, new RegExp(`Every verb figure here is out of those ${fmt(c.verbs)}: ${fmt(c.verbsWithBinyan)} have a verb pattern \\(binyan\\) listed, ${fmt(c.verbsWithRoot)} \\(\\d+%\\) have family letters listed and ${fmt(c.explorer)} can be opened on this page`));
  assert.match(text, new RegExp(`The other ${fmt(c.verbs - c.explorer)} of the ${fmt(c.verbs)} are not on this page`));
  assert.match(text, /Word groups: /, 'groups of words are named as groups, a different unit');
  assert.doesNotMatch(text, ROOT_CLAIM); assert.doesNotMatch(text, /Roots are listed/);
  assert.match(text, /confirmed 0 groups, so this page says the words share letters and does not call any group one root/);
  // per-pattern counts add up to the same totals
  const sum = (k) => Object.values(c.byBinyan).reduce((a, v) => a + v[k], 0);
  assert.equal(sum('verbs'), c.verbsWithBinyan); assert.equal(sum('explorer'), c.explorer);
  for (const [b, v] of Object.entries(c.byBinyan)) { assert.equal(v.verbs, FAM.coverage.binyanCount[b]); assert.equal(v.explorer, VERBS.verbs.filter((x) => x.binyan === b).length); }
});

test('#5 sweep: the verb table no longer says "no past tense" while it shows the dictionary (he did) form; the grammar note says letters', async () => {
  const v = VERBS.verbs.find((x) => x.forms.present);
  const t = M.verbTable(v);
  assert.equal(t.rows[0].key, 'dictionary'); assert.equal(t.rows[0].he, v.he);
  assert.ok(!t.notes.some((n) => /no past tense/i.test(n)));
  const G = await import('../src/grammar/model.js');
  const data = { words, registry: JSON.parse(rd('data/corpus/registry.json')).entries || JSON.parse(rd('data/corpus/registry.json')), notes: JSON.parse(rd('data/grammar/notes.json')) };
  const topics = G.buildTopics(data);
  for (const it of topics.roots.items) assert.match(it.note, /^family letters /);
  for (let s = 1; s <= 10; s++) for (const q of G.buildQuestions(topics.roots, G.seededRng(s))) { assert.doesNotMatch(q.prompt + q.explain, ROOT_CLAIM); assert.match(q.prompt, /family letters/); }
  assert.doesNotMatch(data.notes.topics.roots.explanation, /share a recorded root|the root it belongs to/);
});

// ---------- #15a Dictionary words linked to their family ----------
test('#15a: dict-links.json is current and every link is an exact spelling and part-of-speech match (no unpointed look-alikes)', () => {
  assert.equal(JSON.stringify(dictLinks(words, dict, build(words))) + '\n', rd('data/roots/dict-links.json'), 'run node tools/roots/build.mjs');
  const ok = words.filter((w) => w.kind === 'word' && !(w.flags && w.flags.hidden));
  const dictById = new Map(dict.map((e) => [e.id, e]));
  const famSize = new Map(FAM.families.map((f) => [f.root, f.size]));
  const verbIds = new Set(VERBS.verbs.map((v) => v.id));
  for (const [id, letters, size, verb] of LINKS.rows) {
    const e = dictById.get(id); assert.ok(e && e.pointed, id);
    const m = ok.filter((w) => w.he === e.pointed && w.pos === e.pos); assert.ok(m.length, id);
    if (letters) { assert.ok(m.every((w) => w.root === letters), id); assert.equal(size, famSize.get(letters) || 0, id); }
    if (verb) { assert.ok(verbIds.has(verb) && m.some((w) => w.id === verb), id); }
  }
  // completeness: every Dictionary entry with an exact match that lists letters is linked
  const linked = new Set(LINKS.rows.filter((r) => r[1]).map((r) => r[0]));
  for (const e of dict) {
    const m = e.pointed ? ok.filter((w) => w.he === e.pointed && w.pos === e.pos) : [];
    const roots = new Set(m.map((w) => w.root || null));
    if (m.length && roots.size === 1 && [...roots][0]) assert.ok(linked.has(e.id), e.id);
  }
});

test('#15a: counts (counts.js) - Dictionary words with family letters, how many open a family page, how many verbs open their forms', () => {
  const c = rootsCoverage().dictLinks, k = LINKS.counts;
  assert.deepEqual(TOTALS.roots.dictLinks, k);
  assert.equal(c.withLetters, LINKS.rows.filter((r) => r[1]).length);
  assert.equal(c.inFamily, LINKS.rows.filter((r) => r[1] && r[2] >= 2).length);
  assert.equal(c.inFamily + c.alone, c.withLetters);
  assert.equal(c.verbs, LINKS.rows.filter((r) => r[3]).length);
  assert.equal(k.dictionary, dict.length);
  // the figures this lane reports
  assert.deepEqual({ withLetters: c.withLetters, inFamily: c.inFamily, alone: c.alone, verbs: c.verbs }, { withLetters: 1381, inFamily: 833, alone: 548, verbs: 1516 });
});

test('#15a: link lines say family letters, never root; a lone word says no other word shares the letters', () => {
  const m = L.indexLinks(LINKS);
  const fam = [...m.values()].find((l) => l.size >= 2), alone = [...m.values()].find((l) => l.letters && l.size < 2);
  assert.match(L.linkText(fam), new RegExp(`^Family letters ${fam.letters}: ${fam.size} words in the word list share them\\.$`));
  assert.match(L.linkText(alone), /no other word in the word list is listed under them/);
  assert.equal(L.linkText(null), '');
  for (const l of m.values()) assert.doesNotMatch(L.linkText(l), /\broot\b/i);
  assert.equal(L.familyHref('כ־ת־ב'), '#/roots?letters=' + encodeURIComponent('כ־ת־ב'));
  assert.equal(L.hasFamily(alone), false); assert.equal(L.hasFamily(fam), true);
});

// ---------- #15b the seven patterns ----------
test('#15b: seven pattern pages; signs are the verb games\' own words; every example and pair comes from the data', () => {
  assert.deepEqual(B.SEVEN, ["pa'al", "nif'al", "pi'el", "pu'al", "hif'il", "huf'al", "hitpa'el"]);
  for (const g of G3_BINYANIM) assert.equal(B.SIGNS[g.key], g.sign, `${g.key}: the Roots page and the games teach the same sign`);
  assert.equal(B.SIGNS["pu'al"], undefined); assert.equal(B.SIGNS["huf'al"], undefined);
  const c = rootsCoverage();
  for (const b of B.SEVEN) {
    const p = B.binyanPage(b, VERBS.verbs, FAM.families, c.byBinyan[b], c.verbs);
    assert.ok(p.gist && p.name);
    assert.match(p.countLine, new RegExp(`has ${fmt(c.byBinyan[b].verbs)} of its ${fmt(c.verbs)} verbs`));
    assert.ok(p.examples.length >= 5 && p.examples.every((v) => v.binyan === b), b);
    for (const x of p.pairs) {
      assert.equal(x.here.binyan, b); assert.notEqual(x.other.binyan, b);
      assert.equal(byId.get(x.here.id).root, x.letters); assert.equal(byId.get(x.other.id).root, x.letters);
    }
    const dictObs = p.observations.find((o) => o.key === 'dictionary');
    assert.equal(dictObs.total, c.byBinyan[b].explorer, 'observations count the same verbs the page counts');
    for (const o of p.observations) { const t = B.observationText(o); assert.doesNotMatch(t, ROOT_CLAIM); if (o.letters) assert.ok(o.count <= o.total && o.count / o.total >= 0.6); }
  }
  // spot check the counted letters against the data itself
  const nif = B.observe(VERBS.verbs, "nif'al").find((o) => o.key === 'dictionary');
  assert.equal(nif.letters, 'נ'); assert.equal(nif.count, VERBS.verbs.filter((v) => v.binyan === "nif'al" && v.he.replace(/[֑-ׇ]/g, '').startsWith('נ')).length);
  assert.match(B.observationText({ label: 'Infinitive', total: 1, letters: 'לק', count: 1 }), /too few to count/);
});

test('#15b: pattern drill - every form is copied from the data for that verb, never ambiguous between patterns, graded against the label', () => {
  const formsOf = (v) => [v.he, ...Object.values(v.forms || {})];
  const patternsOfForm = new Map();
  for (const v of VERBS.verbs) for (const f of formsOf(v)) { if (!patternsOfForm.has(f)) patternsOfForm.set(f, new Set()); patternsOfForm.get(f).add(v.binyan); }
  const seenPatterns = new Set();
  assert.deepEqual(B.binyanDrill(VERBS.verbs, { seed: 4 }), B.binyanDrill(VERBS.verbs, { seed: 4 }));
  for (let seed = 1; seed <= 30; seed++) {
    const qs = B.binyanDrill(VERBS.verbs, { seed });
    assert.equal(qs.length, 8);
    for (const q of qs) {
      const v = VERBS.verbs.find((x) => x.id === q.verb.id);
      assert.ok(formsOf(v).includes(q.he), 'the form is in the data');
      assert.equal(q.he, q.formKey === 'dictionary' ? v.he : v.forms[q.formKey]);
      assert.equal(patternsOfForm.get(q.he).size, 1);
      assert.equal(q.options.length, 4); assert.equal(new Set(q.options.map((o) => o.binyan)).size, 4);
      const right = q.options.find((o) => o.id === q.answer); assert.equal(right.binyan, v.binyan); seenPatterns.add(v.binyan);
      assert.ok(q.options.every((o) => B.SEVEN.includes(o.binyan)));
      assert.equal(M.gradeAnswer(q, q.answer).correct, true);
      assert.equal(v.needsReview, false);
    }
  }
  assert.deepEqual([...seenPatterns].sort(), [...B.SEVEN].sort(), 'all seven patterns are drilled');
});

// ---------- #15c verb forms (the conjugator shows only what the data holds) ----------
test('#15c: the verb table covers every verb on the page with only its listed forms; no form is made by a rule', () => {
  let all4 = 0, rows = 0;
  for (const v of VERBS.verbs) {
    const t = M.verbTable(v);
    const listed = new Map([['dictionary', v.he], ...Object.entries(v.forms || {})]);
    for (const r of t.rows) { assert.equal(r.he, listed.get(r.key), `${v.id} ${r.key}`); rows++; }
    assert.equal(t.rows.length, listed.size);
    if (t.rows.length === 4) all4++;
  }
  assert.equal(VERBS.verbs.length, rootsCoverage().explorer);
  assert.ok(all4 > 1500, `${all4} verbs have all four listed forms`);
  assert.ok(rows > 6000);
});

// ---------- views ----------
const data = { families: { coverage: FAM.coverage, families: FAM.families }, verbs: { verbs: VERBS.verbs } };
const text = (n) => n.textContent;

test('view: ?letters= opens that family, verbs grouped by pattern, and the page never claims a shared root', async () => {
  const V = await import('../src/roots/roots.view.js');
  const f = FAM.families.find((x) => new Set(x.words.filter((w) => w.pos === 'verb' && w.binyan).map((w) => w.binyan)).size >= 2);
  const root = new N('main');
  const un = V.mount(root, { store: memStore(), rootsData: data, query: { letters: f.root } }); await tick();
  const h2 = root.querySelector('#rt-family'); assert.ok(h2); assert.match(text(h2), new RegExp(`Letters ${f.root}`));
  assert.match(text(root), /Verbs, by Pattern/);
  const h4 = root.queryAll('h4').map(text);
  const pats = [...new Set(f.words.filter((w) => w.pos === 'verb').map((w) => (w.binyan ? M.binyanName(w.binyan) : 'Pattern Not Listed')))];
  assert.deepEqual([...h4].sort(), pats.sort());
  assert.doesNotMatch(text(root), ROOT_CLAIM);
  un();
  const r2 = new N('main');
  const un2 = V.mount(r2, { store: memStore(), rootsData: data, query: { letters: 'ק־ק־ק' } }); await tick();
  assert.match(text(r2), /No other word in the word list is listed under the letters/);
  un2();
});

test('view: ?verb= opens the verb table with a Listen button only for forms that have a clip', async () => {
  const V = await import('../src/roots/roots.view.js');
  const v = VERBS.verbs.find((x) => x.forms.present && x.forms.future && x.forms.infinitive);
  const clip = { id: 'dict-test', kind: 'word', path: 'audio/f/israeli/dictionary/dict-test.mp3', status: 'tts', source: '', voice: 'f', tradition: 'israeli' };
  const clipLookup = { clips: { [v.he]: { 'f|israeli': clip } } };
  const played = [];
  const audio = { status: () => ({ source: 'file', path: clip.path, id: clip.id, voice: 'f', tradition: 'israeli' }), play: async (k, id, o) => { played.push([k, id, o]); return { source: 'file' }; }, stop() {} };
  const root = new N('main');
  const un = V.mount(root, { store: memStore(), rootsData: data, query: { verb: v.id }, audio, clipLookup, settings: { get: (k) => (k === 'voice' ? 'f' : k === 'congregation' ? 'israeli' : undefined) } }); await tick(80);
  const trs = root.queryAll('tbody tr');
  assert.deepEqual(trs.map((r) => r.attrs['data-form']), ['dictionary', 'infinitive', 'present', 'future']);
  assert.match(text(root), new RegExp(V.VERB_FORMS_NOTE.slice(0, 40)));
  const listens = root.all((n) => n.tag === 'button' && /^Listen/.test(n.attrs['aria-label'] || ''));
  assert.equal(listens.length, 1, 'only the dictionary form has a clip in this lookup');
  assert.equal(root.all((n) => /No clip for this form/.test(n.textContent) && n.tag === 'span').length, 3);
  await listens[0].click(); await tick();
  assert.deepEqual(played.map((p) => p[1]), ['dict-test']);
  assert.match(text(root), /Family letters:/); assert.doesNotMatch(text(root), /Root:/);
  un();
});

test('view: Seven patterns lists seven pages; a page shows sign, counted letters, examples; the pattern drill records answers', async () => {
  const V = await import('../src/roots/roots.view.js');
  const root = new N('main'); const store = memStore();
  const un = V.mount(root, { store, rootsData: data }); await tick();
  await btn(root, /^Seven patterns$/).click(); await tick();
  const opens = root.all((n) => n.tag === 'button' && /^Open the /.test(n.attrs['aria-label'] || ''));
  assert.equal(opens.length, 7);
  await opens[2].click(); await tick();
  assert.match(text(root), /Pi'el/); assert.match(text(root), /Pattern sign: the present starts with מ/);
  assert.match(text(root), /Letters Counted Over the Word List/); assert.match(text(root), /Example Verbs/);
  assert.match(text(root), new RegExp(`has ${fmt(rootsCoverage().byBinyan["pi'el"].verbs)} of its ${fmt(rootsCoverage().verbs)} verbs`));
  await btn(root, /^Pattern drill$/).click(); await tick();
  assert.match(text(root), /Question 1 of 8/); assert.match(text(root), /Which pattern is this/);
  const opts = root.queryAll('[aria-label="Answers"] button'); assert.equal(opts.length, 4);
  await opts[0].click(); await tick();
  assert.equal(store.m[M.STORE_KEY].asked, 1);
  assert.match(text(root), /Right\.|Not this one\./);
  un();
  // ?mode=binyanim&b= deep link, and a pattern with no written sign says so
  const r2 = new N('main');
  const un2 = V.mount(r2, { store: memStore(), rootsData: data, query: { mode: 'binyanim', b: "pu'al" } }); await tick();
  assert.match(text(r2), /Pu'al/); assert.ok(text(r2).includes(B.NO_SIGN));
  un2();
});

// ---------- #15d family grouping in review ----------
test('#15d: groupByFamily keeps exactly the due cards, puts words sharing family letters together, keeps due order otherwise', () => {
  const m = L.indexLinks(LINKS);
  const famRows = LINKS.rows.filter((r) => r[2] >= 2);
  const letters = famRows[0][1], same = famRows.filter((r) => r[1] === letters).map((r) => r[0]);
  assert.ok(same.length >= 2);
  const other = LINKS.rows.find((r) => r[1] && r[1] !== letters && r[2] >= 2)[0], lone = dict.find((e) => !m.has(e.id)).id;
  const cards = [same[0], other, lone, same[1]].map((id, i) => ({ id: 'vocab:' + id, due: i }));
  const g = L.groupByFamily(cards, m, (c) => c.id.slice(6));
  assert.deepEqual(g.cards.map((c) => c.id.slice(6)), [same[0], same[1], other, lone]);
  assert.deepEqual(new Set(g.cards), new Set(cards));
  assert.deepEqual(g.groupOf.get('vocab:' + same[1]), { letters, n: 2, i: 2 });
  assert.equal(g.groupOf.has('vocab:' + other), false, 'a group of one in this session gets no group line');
});
