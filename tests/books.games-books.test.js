// Lane games-books, ideas E1, E2, E4 to E10 (E3 is A8 in the audio lane): book difficulty labels from the learner's own review
// cards, new-word marks with the dictionary's English, English hideable per line in books and the Torah reader, completion
// cards, reading challenges, levels used as series, this week's parashah, Torah search by word and root, and the verse
// notebook. Logic and wiring in a fake DOM; nothing here says the Hebrew, the glosses or the calendar table are reviewed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { environment, memStore, fetchFn, wait, byText, json, src } from './gb.env.js';
import { build as buildWords } from '../tools/books/build-book-words.mjs';
import { build as buildSearch, lettersOnly } from '../tools/torahstudy/build-search.mjs';
import { knownKeys, hasGraded, bookKnown, difficultyLine, levelSeries, nextInSeries, seriesLine, lineWords, pointedKey as pk2, SERIES_NOTE } from '../src/books/extras.js';
import { pointedKey } from '../src/sprint/model.js';
import { tokens } from '../src/knownwords/validate.js';
import { periodRange, setGoal, challengeProgress, GOAL_SIZES } from '../src/books/challenge.js';
import { checkedLine } from '../src/books/card.view.js';
import { sections, weekRecord, toggleRead, setWeekGoal, weekProgress, rangeText } from '../src/torahstudy/week.js';
import { thisWeek } from '../src/torahstudy/parashah.view.js';
import { search, queryWords, rootForms, wordMatches, readerHref, refLabel } from '../src/torahstudy/search.js';
import * as NB from '../src/torahstudy/notebook.js';
import { matchRoute } from '../src/shell/router.js';
import { percentOf, booksFinishedOf } from '../src/lib/counts.js';

const words = json('data/books/words.json'), shelf = json('data/books/index.json').books;

test('E1/E2: data/books/words.json is current and its counts are the books\' own words', async () => {
  assert.deepEqual(await buildWords(), words, 'run node tools/books/build-book-words.mjs');
  for (const b of shelf) {
    const pages = json(`data/books/${b.id}.json`).pages;
    assert.equal(words.books[b.id].words, pages.flatMap((p) => tokens(p.he)).length, b.id);
    assert.equal(Object.values(words.books[b.id].counts).reduce((a, n) => a + n, 0), words.books[b.id].words);
  }
  // the page's lookup key is the same key the build used
  for (const p of json('data/books/book1.json').pages) for (const t of tokens(p.he)) assert.equal(pk2(t), pointedKey(t));
});

test('E1: the known share counts only cards last answered right, and says so when nothing is tracked yet', () => {
  const cards = words.cards;
  const someId = Object.keys(cards).find((id) => id.startsWith('word:'));
  const known = knownKeys(cards, { [someId]: { id: someId, state: 'review', reps: 1 } }, { x: { id: 'vocab:none', state: 'relearning', reps: 2 } });
  assert.ok(known.size >= 1 && cards[someId].every((k) => known.has(k)));
  assert.equal(knownKeys(cards, { [someId]: { id: someId, state: 'relearning', reps: 1 } }).size, 0, 'a card answered Again is not known');
  const k = bookKnown(words.books.book1, new Set(Object.keys(words.books.book1.counts)));
  assert.equal(k.pct, 100); assert.equal(k.knownWords, k.words);
  assert.equal(bookKnown(words.books.book1, new Set()).pct, 0);
  assert.equal(difficultyLine({ words: 55, unique: 20, pct: 40 }, true), '55 words, 20 different · you know 40% of them');
  assert.equal(difficultyLine({ words: 55, unique: 20, pct: 0 }, false), '55 words, 20 different · known words: none tracked yet');
  assert.equal(hasGraded({}, []), false); assert.equal(percentOf(1, 3), 33); assert.equal(percentOf(1, 0), 0);
});

test('E10: the level is the series: next book in the level and a finished count; the screens say there is no series field', () => {
  const b1 = shelf.filter((b) => b.level === 'Beginner 1');
  const s = levelSeries(b1[0].id, shelf);
  assert.equal(s.length, b1.length); assert.ok(s.every((b) => b.level === 'Beginner 1'));
  assert.equal(nextInSeries(s[0].id, shelf).id, s[1].id); assert.equal(nextInSeries(s.at(-1).id, shelf), null);
  assert.equal(seriesLine('Beginner 1', s.map((b) => b.id), { [s[0].id]: { finishedAt: 5 } }), `1 of ${s.length} Beginner 1 books finished`);
  assert.ok(!shelf.some((b) => 'series' in b), 'the shelf data has no series field (if one is added, use it)');
  assert.match(SERIES_NOTE, /no series of their own/);
});

test('E9: a challenge counts books finished inside its month or week only', () => {
  const now = new Date(2026, 10, 12, 12).getTime(); // Thursday 12 Nov 2026
  const [mf, mt] = periodRange('month', now); assert.equal(new Date(mf).getDate(), 1); assert.equal(new Date(mt).getMonth(), 11);
  const [wf, wt] = periodRange('week', now); assert.equal(new Date(wf).getDay(), 1); assert.equal((wt - wf) / 86400000, 7);
  const places = { book1: { finishedAt: new Date(2026, 10, 2).getTime() }, book2: { finishedAt: new Date(2026, 10, 10).getTime() }, book3: { finishedAt: new Date(2026, 9, 30).getTime() }, book4: { lastPage: 3 } };
  const month = challengeProgress(setGoal({}, 2, 'month', now), shelf, places, now);
  assert.equal(month.done, 2); assert.equal(month.met, true); assert.match(month.text, /^Challenge met: 2 of 2 books this month/);
  const week = challengeProgress(setGoal({}, 3, 'week', now), shelf, places, now);
  assert.equal(week.done, 1); assert.equal(week.left, 2); assert.deepEqual(week.finished, ['book2']);
  assert.equal(challengeProgress({}, shelf, places, now), null);
  assert.equal(setGoal({}, 99, 'year').goal.n, GOAL_SIZES[2]); assert.equal(setGoal({}, 99, 'year').goal.period, 'month');
  assert.equal(booksFinishedOf(places, ['book1', 'book4']), 1);
});

test('E8: the completion card names the book and day, and says how the finish was checked', async () => {
  assert.match(checkedLine({ checkedAt: 1 }, true), /story question answered/);
  assert.match(checkedLine({}, false), /too short for a story question/);
  assert.match(checkedLine({}, true), /before the story question was added/);
  assert.ok(matchRoute('#/book-card/book6').route);
  const env = environment();
  const { store } = memStore({ 'books.v1': { book6: { finishedAt: new Date(2026, 10, 3, 9).getTime(), checkedAt: 2 } } });
  const mod = await import('../src/books/card.view.js');
  await mod.mount(env.root, { query: { id: 'book6' }, store, fetchFn: (u) => fetchFn(new URL('../' + u, import.meta.url)) });
  assert.match(env.root.textContent, /Book Completion Card/); assert.match(env.root.textContent, /Coffee First/); assert.match(env.root.textContent, /Finished on 2026-11-03/);
  assert.match(env.root.textContent, /Nothing is sent anywhere/);
  const env2 = environment();
  await mod.mount(env2.root, { query: { id: 'book7' }, store, fetchFn: (u) => fetchFn(new URL('../' + u, import.meta.url)) });
  assert.match(env2.root.textContent, /Not Finished Yet/);
});

test('E2/E7/E8/E10: the book page marks new words, hides English per page, and links the card and the next book in the level', async () => {
  const env = environment();
  const { store, mem } = memStore({ 'books.v1': {} });
  const mod = await import('../src/books/book.view.js');
  const ctx = { params: { id: 'book6' }, store, fetchFn: (u) => fetchFn(new URL('../' + u, import.meta.url)), settings: { get: () => undefined } };
  globalThis.Audio = undefined;
  const { El } = await import('./wordtrace.fakedom.js');
  El.prototype.removeAttribute = function (k) { delete this.attrs[k]; }; El.prototype.pause = () => {}; El.prototype.load = () => {};
  await mod.mount(env.root, ctx);
  await wait(() => /words, \d+ different/.test(env.root.textContent));
  assert.match(env.root.textContent, /known words: none tracked yet/);
  byText(env.root, /^Mark new words$/).click();
  await wait(() => env.root.querySelectorAll('.book-new-word').length > 0);
  assert.equal(mem.get('books.marks.v1').on, true);
  const first = env.root.querySelectorAll('.book-new-word')[0];
  first.click();
  assert.ok(env.root.querySelector('.book-word-card'), 'a tap shows the word card');
  assert.match(env.root.querySelector('.book-word-card').textContent, /dictionary:|not in Aleph's word list yet/);
  const en = json('data/books/book6.json').pages[0].en;
  assert.ok(env.root.textContent.includes(en));
  byText(env.root, /^Hide English$/).click();
  assert.ok(!env.root.textContent.includes(en), 'this page\'s English is hidden');
  byText(env.root, /^Show English$/).click();
  assert.ok(env.root.textContent.includes(en));
  const src1 = src('src/books/book.view.js');
  assert.match(src1, /stage\.append\(extras\.line\(p\)\)/); assert.match(src1, /stage\.append\(extras\.en\(p, page\)\)/); assert.match(src1, /extras\.finished\(\)/);
  assert.match(src('src/books/extras.js'), /href: `#\/book-card\/\$\{id\}`/); assert.match(src('src/books/extras.js'), /Next in \$\{book\.level\}/);
});

test('E4: this week\'s portion comes from the calendar code; aliyot become sections; self-marked progress against a goal', async () => {
  const index = json('data/corpus/torah/index.json');
  const wk = thisWeek(new Date(2026, 10, 12), false, index);
  assert.equal(wk.iso, '2026-11-14');
  assert.ok(wk.portions.length >= 1, 'a regular Shabbat in November');
  const secs = sections(wk.portions);
  assert.equal(secs.length, wk.portions.reduce((a, p) => a + p.aliyot.length, 0));
  let rec = weekRecord(null, wk.iso); assert.equal(rec.goal, 7);
  rec = toggleRead(rec, secs[0].key, 1); rec = toggleRead(rec, secs[1].key, 2);
  rec = setWeekGoal(rec, 2);
  assert.deepEqual([weekProgress(rec, secs).done, weekProgress(rec, secs).met], [2, true]);
  assert.equal(weekRecord(rec, '2026-11-21').read && Object.keys(weekRecord(rec, '2026-11-21').read).length, 0, 'a new week starts empty');
  assert.equal(weekRecord(rec, '2026-11-21').goal, 2, 'the goal carries over');
  assert.match(rangeText(secs[0], (id) => id), /^\w+ \d+:\d+ – /);
  const env = environment(); const { store, mem } = memStore();
  const mod = await import('../src/torahstudy/parashah.view.js');
  mod.mount(env.root, { store, fetchFn, now: () => new Date(2026, 10, 12) });
  await wait(() => byText(env.root, /^I read this$/));
  byText(env.root, /^I read this$/).click();
  assert.equal(Object.keys(mem.get('torah.week.v1').read).length, 1);
  assert.ok(env.root.querySelectorAll('a').some((a) => /^#\/torahreader\?book=\w+&chapter=\d+&verse=\d+$/.test(a.getAttribute('href'))));
});

test('E5: the search index is current; word search matches whole words with prefixes; root search uses only listed forms', () => {
  const ix = json('data/torahstudy/search.json');
  assert.deepEqual(buildSearch(), ix, 'run node tools/torahstudy/build-search.mjs');
  assert.equal(ix.books.reduce((a, b) => a + b.chapters.reduce((x, c) => x + c.length, 0), 0), 5846);
  assert.equal(ix.books[0].chapters[0][0], lettersOnly(json('data/corpus/torah/genesis/01.json').verses[0].he));
  const r = search(ix, { words: queryWords('בָּרָא') });
  assert.ok(r.some((x) => x.book === 'genesis' && x.chapter === 1 && x.verse === 1));
  assert.equal(refLabel(r[0]), 'Genesis 1:1'); assert.equal(readerHref(r[0]), '#/torahreader?book=genesis&chapter=1&verse=1');
  assert.equal(wordMatches('ושמר', 'שמר'), true); assert.equal(wordMatches('ושמר', 'שמר', false), false); assert.equal(wordMatches('אשמר', 'שמר'), false, 'א is not a prefix letter');
  assert.equal(wordMatches('שלם', 'שלומ', true, true), true, 'loose spelling'); assert.equal(wordMatches('שלם', 'שלומ'), false);
  const two = search(ix, { words: queryWords('בראשית ברא') });
  assert.ok(two.every((x) => x.hits.length >= 2));
  const fam = json('data/roots/families.json'), verbs = json('data/roots/verbs.json');
  const forms = rootForms('ש־מ־ר', fam, verbs);
  assert.ok(forms.length > 0);
  assert.ok(search(ix, { anyOf: forms }).every((x) => x.hits.length > 0));
  assert.deepEqual(rootForms('קקק', fam, verbs), []);
});

test('E5/E6: the search page finds verses and saves one; the notebook keeps notes and exports text', async () => {
  const env = environment(); const { store, mem } = memStore();
  const mod = await import('../src/torahstudy/search.view.js');
  mod.mount(env.root, { store, fetchFn, query: { q: 'בָּרָא' } });
  await wait(() => env.root.querySelectorAll('li.ts-hit').length > 0, 800);
  assert.match(env.root.textContent, /\d+ verses found/);
  byText(env.root, /^Save to notebook$/).click();
  const saved = NB.items(mem.get(NB.NOTEBOOK_KEY));
  assert.equal(saved.length, 1);
  let rec = NB.setNote(mem.get(NB.NOTEBOOK_KEY), saved[0], 'my note');
  rec = NB.save(rec, saved[0]);
  assert.equal(NB.items(rec)[0].note, 'my note', 'saving again keeps the note');
  assert.match(NB.toText(rec), /Genesis \d+:\d+[\s\S]*Note: my note/);
  assert.equal(JSON.parse(NB.toJson(rec)).items.length, 1);
  assert.equal(NB.items(NB.remove(rec, saved[0])).length, 0);
  const env2 = environment();
  mem.set(NB.NOTEBOOK_KEY, rec);
  (await import('../src/torahstudy/notebook.view.js')).mount(env2.root, { store });
  assert.match(env2.root.textContent, /Verse Notebook/); assert.match(env2.root.textContent, /Export as text/);
  assert.equal(env2.root.querySelectorAll('textarea')[0].value, 'my note');
});

test('E6/E7: the Torah reader hides English per verse and saves a verse to the notebook', () => {
  const s = src('src/torahreader/torahreader.view.js');
  assert.match(s, /hiddenEnglish\.has\(v\.n\) \? null : el\('p', \{ class: 'trd-en' \}, v\.en\)/);
  assert.match(s, /class: 'trd-save-verse', onclick: \(e\) => saveVerse\(v, e\.target\)/);
  assert.match(s, /import\('\.\.\/torahstudy\/notebook\.js'\)/, 'the notebook loads on first use');
  assert.match(s, /href: '#\/parashah'/);
  for (const r of ['#/parashah', '#/torah-search', '#/verse-notebook', '#/reading-challenge']) assert.ok(matchRoute(r).route, r);
});
