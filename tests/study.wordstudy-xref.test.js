// Torah and text study, ideas M1 (word-by-word study for all 54 portions) and M4 (cross-reference web). Logic and wiring in a
// fake DOM. Nothing here says the word list's meanings are right for the Torah's sense, and the screens say so themselves.
import test from 'node:test';
import assert from 'node:assert/strict';
import { environment, memStore, fetchFn, wait, json } from './gb.env.js';
import * as W from '../src/torahstudy/wordstudy.js';
import * as X from '../src/torahstudy/xref.js';
import { matchRoute } from '../src/shell/router.js';
import { ROUTE_SECTION, PARENT } from '../src/shell/nav-model.js';
import { hasName } from '../src/games/tg-core.js';

const index = json('data/corpus/torah/index.json'), searchIndex = json('data/torahstudy/search.json');
const lex = W.buildLexicon(json('data/vocab/index.json'), json('data/roots/families.json'), json('data/roots/verbs.json'));
const chapter = (book, n) => json(`data/corpus/torah/${book}/${String(n).padStart(2, '0')}.json`);
const letters = (s) => s.replace(/[^א-ת]/g, '');

test('M1: all 54 portions are listed in five books, and every one has study units that cover its whole range', () => {
  const groups = W.portionsByBook(index);
  assert.equal(groups.length, 5); assert.equal(groups.flatMap((g) => g.portions).length, 54);
  let verses = 0;
  for (const p of index.parshiyot) {
    const us = W.units(p);
    assert.ok(us.length >= 1, p.id);
    const whole = W.rangeVerses(index, p.from, p.to), parts = us.flatMap((u) => W.rangeVerses(index, u.from, u.to));
    assert.ok(whole.length > 0, p.id);
    assert.deepEqual(parts, whole, `${p.id}: the aliyot together are the portion`);
    verses += whole.length;
  }
  assert.equal(verses, index.counts.verses, 'the 54 portions are the whole Torah, each verse once');
  assert.equal(W.portionById(index, 'no-such'), null);
});

test('M1: verse words split maqaf groups, drop the verse end, and match the Torah Search word order', () => {
  const v = chapter('genesis', 1).verses[1];
  const words = W.verseWords(v.he);
  assert.ok(words.some((w) => w.joined && w.text.endsWith('־')));
  assert.ok(words.every((w) => !w.text.includes('׃')));
  assert.deepEqual(words.map((w) => W.letterKey(w.text)), searchIndex.books[0].chapters[0][1].split(' ').map(X.wkey));
});

test('M1: lookup matches the exact pointed spelling, then a properly pointed prefix, and never the Name', () => {
  assert.equal(W.pointed('בְּרֵאשִׁ֖ית'), 'בְּרֵאשִׁית');
  const exact = W.lookup(lex, 'אֶרֶץ');
  assert.equal(exact.kind, 'exact'); assert.match(exact.entries[0].en, /land/);
  const pre = W.lookup(lex, 'הַמִּזְבֵּחַ');
  assert.equal(pre.kind, 'prefix'); assert.equal(pre.prefix, 'ה'); assert.equal(pre.prefixSense, 'the'); assert.match(pre.entries[0].en, /altar/);
  const two = W.lookup(lex, 'וְהָאָרֶץ');
  assert.ok(two.kind === 'none' || two.prefix === 'וה');
  // a letter pointed unlike a prefix is part of the word: Moab is not "from" + father, Seir is not "that" + city, Caleb is not "like a heart"
  for (const w of ['מוֹאָב', 'שֵׂעִיר', 'כָּלֵב']) assert.notEqual(W.lookup(lex, w).kind, 'prefix', w);
  assert.deepEqual(W.prefixCuts('מוֹאָב'), []);
  const name = W.lookup(lex, 'יְהוָה');
  assert.equal(name.kind, 'name'); assert.equal(name.entries.length, 0); assert.equal(name.root, null);
  assert.equal(W.lookup(lex, 'לַיהוָה').kind, 'name');
  for (const k of lex.words.keys()) assert.ok(!hasName(k), 'the Name is not a vocabulary item');
  assert.equal(W.lookup(lex, 'תֹהוּ').kind, 'none');
});

test('M1: coverage is counted honestly per unit and the sentence states it', () => {
  const rows = chapter('genesis', 1).verses.map((v) => ({ he: v.he }));
  const c = W.coverage(lex, rows);
  assert.equal(c.exact + c.prefix + c.name + c.none, c.words);
  assert.ok(c.exact > 0 && c.none > 0, 'some words have a meaning and some do not: the list is partial');
  assert.match(W.coverageText(c), new RegExp(`^${c.exact + c.prefix} of the ${c.words} words here have a meaning`));
  assert.match(W.LEXICON_NOTE, /modern Hebrew list/);
});

test('M1: study state is normalised and remembers the last unit per portion', () => {
  assert.deepEqual(W.normaliseStudy('junk'), { v: 1, last: null, seen: {} });
  const s = W.markOpened(W.markOpened(null, 'noach', 3), 'bereshit', 9);
  assert.equal(s.last, 'bereshit'); assert.equal(s.seen.noach, 3);
  assert.deepEqual(W.normaliseStudy(s).seen, { noach: 3 }, 'an aliyah number outside 1 to 7 is dropped');
});

test('M1 + M2 + M4 routes: all open, sit in Read, and the portion page has the list as its parent', () => {
  for (const r of ['#/word-study', '#/word-study/bereshit', '#/word-study/noach?aliyah=3', '#/cross-references?book=genesis&chapter=1&verse=2', '#/trope/melody', '#/trope/families', '#/trope']) assert.ok(matchRoute(r).route, r);
  assert.deepEqual(matchRoute('#/word-study/noach?aliyah=3').query, { aliyah: '3', id: 'noach' });
  assert.equal(matchRoute('#/trope/melody').route.name, 'trope-melody');
  for (const n of ['word-study', 'word-study-portion', 'cross-references', 'trope-melody']) assert.equal(ROUTE_SECTION[n], 'read', n);
  assert.equal(PARENT['word-study-portion'], 'word-study');
});

test('M1 view: the list shows 54 portions; a portion page shows tappable words, the verse translation, meaning, root line and links', async () => {
  const { root } = environment();
  const mod = await import('../src/torahstudy/wordstudy.view.js');
  const m = memStore();
  mod.mount(root, { fetchFn, store: m.store, query: {} });
  await wait(() => root.querySelectorAll('a').filter((a) => /^#\/word-study\//.test(a.getAttribute('href') || '')).length >= 54);
  assert.equal(root.querySelectorAll('a').filter((a) => /^#\/word-study\/[a-z-]+$/.test(a.getAttribute('href') || '')).length, 54);
  assert.ok(root.textContent.includes(W.LEXICON_NOTE));

  const env2 = environment();
  mod.mount(env2.root, { fetchFn, store: m.store, query: { id: 'bereshit', aliyah: '2' } });
  await wait(() => env2.root.querySelectorAll('button').some((b) => b.getAttribute('data-w') === '0'));
  const r2 = env2.root;
  assert.match(r2.textContent, /Aliyah 2: Genesis 2:4 – 2:19\. 16 verses\./);
  assert.match(r2.querySelector('#ws-coverage').textContent, /^\d+ of the \d+ words here have a meaning/);
  assert.equal(m.mem.get(W.STUDY_KEY).last, 'bereshit'); assert.equal(m.mem.get(W.STUDY_KEY).seen.bereshit, 2);
  // Genesis 2:4 holds the Name: it is drawn as ה׳, and tapping it explains instead of looking it up
  const first = r2.querySelectorAll('li').find((li) => li.getAttribute('data-ref') === 'genesis:2:4');
  const btns = first.querySelectorAll('button');
  assert.ok(!letters(first.textContent).includes('יהוה'));
  const nameBtn = btns.find((b) => b.textContent === 'ה׳');
  assert.ok(nameBtn);
  nameBtn.click();
  assert.match(first.textContent, /This is the four-letter Name\. Aleph writes it ה׳ and never plays it/);
  assert.equal(nameBtn.getAttribute('aria-pressed'), 'true');
  // a word the list holds: a meaning, the root line and the cross-reference link
  const earth = btns.find((b) => W.lookup(lex, b.textContent).kind !== 'none' && b.textContent !== 'ה׳');
  earth.click();
  assert.equal(nameBtn.getAttribute('aria-pressed'), 'false');
  assert.ok(first.querySelectorAll('li').some((li) => li.getAttribute('data-entry')));
  assert.match(first.textContent, /Root: /);
  assert.ok(first.querySelectorAll('a').some((a) => /^#\/cross-references\?book=genesis&chapter=2&verse=4&k=/.test(a.getAttribute('href'))));
  assert.ok(first.querySelectorAll('a').some((a) => a.getAttribute('href') === '#/trope/melody?book=genesis&chapter=2&verse=4'));
  assert.ok(first.textContent.includes('These are the generations'), 'the verse translation is always shown');
  // a word the list does not hold says so plainly
  const none = r2.querySelectorAll('button').find((b) => b.getAttribute('data-w') && W.lookup(lex, b.textContent).kind === 'none');
  none.click();
  assert.match(r2.textContent, /Aleph’s word list has no entry for this spelling yet/);
  assert.doesNotMatch(r2.textContent, /\bAI\b|artificial|language model|machine/i);

  const env3 = environment();
  mod.mount(env3.root, { fetchFn, query: { id: 'not-a-portion' } });
  await wait(() => env3.root.querySelectorAll('p').some((p) => p.getAttribute('role') === 'alert'));
});

test('M4: the word table folds final letters and a leading "and"; occurrences include prefixed forms', () => {
  const wi = X.buildWordIndex(searchIndex);
  assert.equal(X.stemKey('וְחֹשֶׁךְ'), 'חשכ'); assert.equal(X.stemKey('ולא'), 'ולא', 'three letters are left alone');
  assert.equal(X.verseCount(wi, 'חֹשֶׁךְ'), X.verseCount(wi, 'וְחֹשֶׁךְ'));
  const occ = X.occurrences(searchIndex, 'תֹהוּ');
  assert.deepEqual(occ.refs.map(X.refLabel), ['Genesis 1:2', 'Deuteronomy 32:10']);
  assert.equal(occ.total, 2);
  assert.ok(occ.refs.every((r) => r.hits.length >= 1));
  assert.deepEqual(X.unpack(4034012), { b: 4, chapter: 34, verse: 12 });
});

test('M4: rare links list a verse\'s rare words rarest first with the other verses that share them, never the verse itself', () => {
  const wi = X.buildWordIndex(searchIndex);
  const ref = { book: 'genesis', en: 'Genesis', chapter: 1, verse: 2 };
  const links = X.rareLinks(wi, searchIndex, ref);
  assert.ok(links.length >= 3);
  for (let i = 1; i < links.length; i++) assert.ok(links[i].total >= links[i - 1].total);
  for (const l of links) {
    assert.ok(l.total <= X.RARE_MAX && l.key.length >= X.MIN_LETTERS);
    assert.ok(l.refs.every((r) => !(r.book === 'genesis' && r.chapter === 1 && r.verse === 2)));
    assert.equal(l.refs.length, l.total - 1);
  }
  const tehom = links.find((l) => l.key === 'תהומ');
  assert.ok(tehom.refs.some((r) => X.refLabel(r) === 'Genesis 7:11'));
  const rel = X.relatedVerses(links);
  assert.ok(rel.length >= 1 && rel[0].shared.length >= rel[rel.length - 1].shared.length);
  // a verse of only common words has no rare links
  assert.deepEqual(X.rareLinks(wi, searchIndex, { book: 'numbers', en: 'Numbers', chapter: 7, verse: 13 }).filter((l) => l.total > X.RARE_MAX), []);
  assert.deepEqual(X.refFromQuery(searchIndex, { book: 'nope', chapter: '999', verse: '-4' }), { book: 'genesis', en: 'Genesis', chapter: 50, verse: 1 }, 'an unknown book is Genesis; numbers are held inside the text');
  assert.deepEqual(X.refFromQuery(searchIndex, {}), { book: 'genesis', en: 'Genesis', chapter: 1, verse: 1 });
  assert.deepEqual(X.refFromQuery(searchIndex, { book: 'exodus', chapter: '20', verse: '999' }).verse, searchIndex.books[1].chapters[19].length);
});

test('M4: root links come only from the root lists, and say nothing when the lists do not hold the word', () => {
  const fam = json('data/roots/families.json'), verbs = json('data/roots/verbs.json');
  assert.equal(X.rootOf('תֹהוּ', fam, verbs), null);
  const some = fam.families.find((f) => (f.words || []).some((w) => X.verseCount(X.buildWordIndex(searchIndex), w.he) > 0));
  const word = some.words.find((w) => X.verseCount(X.buildWordIndex(searchIndex), w.he) > 0);
  const r = X.rootOf(word.he, fam, verbs);
  assert.ok(r && r.forms.length >= 1);
  const vs = X.rootVerses(searchIndex, r.forms, { book: 'genesis', chapter: 1, verse: 1 }, 5);
  assert.ok(vs.total >= 1 && vs.refs.length <= 5);
  assert.match(X.ROOT_NOTE, /some verses with the root, not all/);
});

test('M4 view: tap a word to list everywhere it appears with links that jump there; rare words and shared roots are shown', async () => {
  const { root } = environment();
  const mod = await import('../src/torahstudy/xref.view.js');
  mod.mount(root, { fetchFn, query: { book: 'genesis', chapter: '1', verse: '2', k: 'תהו' } });
  await wait(() => root.querySelector('#xr-count'));
  assert.match(root.querySelector('h1').textContent, /Cross-References: Genesis 1:2/);
  assert.match(root.querySelector('#xr-count').textContent, /^2 verses in the Torah/);
  const hrefs = root.querySelectorAll('a').map((a) => a.getAttribute('href'));
  assert.ok(hrefs.includes('#/cross-references?book=deuteronomy&chapter=32&verse=10'));
  assert.ok(hrefs.includes('#/torahreader?book=deuteronomy&chapter=32&verse=10'));
  assert.ok(hrefs.includes('#/cross-references?book=genesis&chapter=1&verse=3') && hrefs.includes('#/cross-references?book=genesis&chapter=1&verse=1'));
  assert.ok(root.querySelectorAll('li').some((li) => li.getAttribute('data-rare') === 'תהומ'));
  assert.match(root.textContent, /appears only here in the Torah/);
  assert.ok(root.textContent.includes(X.LETTERS_NOTE));
  // Deuteronomy 32:10's line is printed from the letters-only index; no four-letter Name appears anywhere on the page
  assert.ok(!letters(root.textContent).includes('יהוה'));
  const other = root.querySelectorAll('button').find((b) => b.getAttribute('data-k') === 'חשכ' || b.getAttribute('data-k') === 'וחשכ');
  other.click();
  assert.match(root.querySelector('#xr-count').textContent, /verses in the Torah/);
  root.querySelector('#xr-roots').click();
  await wait(() => /root lists/.test(root.textContent) && !/Loading the root lists/.test(root.textContent));
  assert.ok(root.textContent.includes(X.ROOT_NOTE));
});
