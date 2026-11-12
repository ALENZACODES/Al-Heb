// Gender and form consistency sweep (lane 3, 12 Nov, points plan #9). Automated: every gendered table in the app's own data is
// checked against itself and against the word list's own tags. It checks that the app does not contradict itself; it does not
// check that the Hebrew is right (that needs a Hebrew reader). Known, flagged leftovers are listed by id so a new one fails.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const json = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const bare = (s) => String(s || '').replace(/[֑-ׇ]/g, '');
const pointed = (s) => /[ְ-ׇּׁׂ]/.test(String(s || ''));
const words = json('data/vocab/words.json').words;
const byId = new Map(words.map((w) => [w.id, w]));
const byHe = new Map();
for (const w of words) { if (!byHe.has(w.he)) byHe.set(w.he, []); byHe.get(w.he).push(w); }
const verbs = json('data/roots/verbs.json').verbs;
const dictionary = [500, 1000, 2000, 5000].flatMap((t) => json(`data/vocab/packs/vocab5k-tier-${t}.json`).entries);

/** Feminine nouns whose own "feminine" field is a different spelling or pointing of the headword. The word list itself cannot say which
 * spelling is right, so they are flagged for the owner, not changed. */
const FLAGGED_FEMININE_VARIANTS = Object.freeze(['h3f9179f2', 'h276ad340', 'h830e5cac']);

test('word list: a feminine noun\'s own feminine form is the headword (3 spelling variants flagged for the owner, none changed)', () => {
  const off = words.filter((w) => w.pos === 'noun' && w.gender === 'f' && w.forms?.feminine && w.forms.feminine !== w.he).map((w) => w.id).sort();
  assert.deepEqual(off, [...FLAGGED_FEMININE_VARIANTS].sort());
  const same = words.filter((w) => w.pos === 'noun' && w.gender === 'f' && w.forms?.feminine === w.he).length;
  assert.ok(same > 1000, `the rule holds for the rest (${same} rows)`);
});

test('word list: a masculine row\'s feminine form is a different form, and no row that spells it is tagged masculine', () => {
  for (const w of words.filter((x) => x.gender === 'm' && x.forms?.feminine)) {
    assert.notEqual(w.forms.feminine, w.he, w.id);
    for (const o of byHe.get(w.forms.feminine) || []) if (o.pos === w.pos) assert.notEqual(o.gender, 'm', `${w.he} lists ${o.he} as its feminine, but ${o.id} tags it masculine`);
  }
  for (const w of words.filter((x) => x.pos === 'adj' && x.forms?.feminine)) assert.notEqual(w.forms.feminine, w.he, w.id);
});

test('word list: a plural equal to its singular is only on a word the list tags plural, or one shaped like a pair (-ayim)', () => {
  for (const w of words.filter((x) => x.forms?.plural && x.forms.plural === x.he)) assert.ok(w.number === 'pl' || /ים$/.test(bare(w.he)), `${w.id} ${w.he}`);
});

test('gender templates: every pair is complete, distinct, and matches the word list\'s own masculine row and its feminine form', () => {
  const T = json('data/gender/templates.json');
  assert.ok(T.pairs.length > 0);
  for (const p of T.pairs) {
    const w = byId.get(p.id);
    assert.ok(p.m?.he && p.f?.he, p.id); assert.notEqual(p.m.he, p.f.he, p.id);
    assert.equal(w.gender, 'm', `${p.id}: the masculine side comes from a masculine row`);
    assert.equal(p.m.he, w.he, p.id); assert.equal(p.f.he, w.forms.feminine, p.id);
  }
  for (const it of T.irregular) assert.equal(byId.get(it.id).gender, it.gender, `${it.id} is listed under the gender the word list gives it`);
  for (const [k, g] of [['atah', 'm'], ['at', 'f'], ['hu', 'm'], ['hi', 'f']]) assert.ok(T.pronouns[k]?.he, `${k} (${g}) pronoun present`);
  assert.notEqual(T.pronouns.atah.he, T.pronouns.at.he); assert.notEqual(T.pronouns.hu.he, T.pronouns.hi.he);
});

test('gender pairs and paradigms (lessons): both forms present, distinct and pointed', () => {
  const GP = json('data/curriculum/gender-pairs.json');
  for (const p of GP.pairs) { assert.ok(p.forms.m?.he && p.forms.f?.he, p.id); assert.notEqual(p.forms.m.he, p.forms.f.he, p.id); assert.ok(pointed(p.forms.m.he) && pointed(p.forms.f.he), p.id); }
  for (const par of GP.paradigms) for (const part of par.parts.filter((x) => x.by)) { assert.ok(part.m?.he && part.f?.he, par.id); assert.notEqual(part.m.he, part.f.he, par.id); }
  for (const g of json('data/games/g3/gender.json').items) { assert.ok(g.m && g.f, g.id); assert.notEqual(g.m, g.f, g.id); }
});

test('adjectives: four forms each, all different, endings in the usual places (ms, fs, mp -im, fp -ot)', () => {
  const A = json('data/games/g3/adjectives.json').adjectives;
  assert.ok(A.length >= 20);
  for (const a of A) {
    const f = [a.ms, a.fs, a.mp, a.fp]; assert.ok(f.every(Boolean), a.en); assert.equal(new Set(f).size, 4, a.en);
    assert.match(bare(a.mp), /ים$/, a.en); assert.match(bare(a.fp), /ות$/, a.en); assert.match(bare(a.fs), /[הת]$/, a.en);
    for (const w of byHe.get(a.ms) || []) if (w.pos === 'adj' && w.forms?.feminine) assert.equal(w.forms.feminine, a.fs, `${a.en}: the word list and the game agree on the feminine`);
  }
});

test('numbers 1 to 10: both genders, distinct, and the word list tags each one under the gender the counting table gives it', () => {
  const N = json('data/games/g3/numbers.json').numbers;
  assert.deepEqual(N.map((n) => n.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const m = new Set(N.map((n) => n.m)), f = new Set(N.map((n) => n.f));
  for (const n of N) assert.notEqual(n.m, n.f, n.n);
  for (const w of words) { if (w.gender === 'f') assert.ok(!m.has(w.he), `${w.id} ${w.he} is a masculine-counting form tagged feminine`); if (w.gender === 'm') assert.ok(!f.has(w.he), `${w.id} ${w.he} is a feminine-counting form tagged masculine`); }
  for (const e of dictionary) for (const x of e.forms || []) if (x.label === 'f' && m.has(e.pointed)) assert.ok(f.has(x.pointed || x.he), `${e.pointed}: the dictionary's feminine form agrees with the counting table`);
});

test('nouns in the games keep the word list\'s gender and plural', () => {
  for (const n of json('data/games/g3/nouns.json').nouns) { const w = byId.get(n.id); assert.equal(n.gender, w.gender, n.he); assert.equal(n.plural, w.forms.plural, n.he); }
});

test('dictionary person forms: a masculine/feminine pair (2msg/2fsg, 3msg/3fsg, 2mpl/2fpl, 3mpl/3fpl) differs whenever both are pointed', () => {
  const PAIRS = [['2msg', '2fsg'], ['3msg', '3fsg'], ['2mpl', '2fpl'], ['3mpl', '3fpl']];
  const sameUnpointed = [];
  for (const e of dictionary) {
    const fs = e.forms || [];
    for (const [a, b] of PAIRS) for (const x of fs.filter((y) => y.label === a)) for (const y of fs.filter((z) => z.label === b)) {
      const p = x.pointed || x.he, q = y.pointed || y.he;
      if (pointed(p) && pointed(q)) assert.notEqual(p, q, `${e.pointed} ${a}/${b}`);
      else if (p === q) sameUnpointed.push(`${e.id}:${a}`);
    }
  }
  // Unpointed spellings such as לך are the same for both genders, which is right for unpointed text: listed, not failed.
  assert.deepEqual(sameUnpointed.sort(), ['v07eb242e:2msg', 'v2f871570:2msg', 'v2f871570:2msg', 'v32e7afd6:2msg', 'v9473e338:2msg'].sort(), 'only the known unpointed spellings');
});

test('verbs: the present form never equals a feminine form from the app\'s gendered sentences (it is the masculine one)', () => {
  const fem = new Set(), masc = new Set();
  const split = (m, f) => { const a = m.split(/\s+/), b = f.split(/\s+/); if (a.length === b.length) a.forEach((x, i) => { if (x !== b[i]) { masc.add(x.replace(/[.,?!]$/, '')); fem.add(b[i].replace(/[.,?!]$/, '')); } }); };
  const GP = json('data/curriculum/gender-pairs.json');
  for (const p of GP.pairs) split(p.forms.m.he, p.forms.f.he);
  for (const par of GP.paradigms) for (const part of par.parts.filter((x) => x.by)) { masc.add(part.m.he); fem.add(part.f.he); }
  for (const g of json('data/games/g3/gender.json').items) split(g.m, g.f);
  const present = new Set(verbs.map((v) => v.forms?.present).filter(Boolean));
  assert.deepEqual([...fem].filter((x) => present.has(x)), []);
  assert.ok([...masc].filter((x) => present.has(x)).length >= 10, 'the check is not vacuous: many masculine forms are verb presents');
});
