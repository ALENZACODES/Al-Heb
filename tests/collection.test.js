// Group S: My Collection (S1), folders as review decks (S2), favorites (S3), personal dictionary (S4), timeline (S5),
// My Hebrew (S6), interest paths (S7), saved searches (S8), a folder as a file (S9), reading shelf (S10).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import vm from 'node:vm';
import { N, tick, btn, memStore } from './torahread.fakedom.js';
import * as M from '../src/collection/model.js';
import * as D from '../src/collection/diary.js';
import { attach, pageItem, SKIP } from '../src/collection/heart.js';
import { COLLECTION_ROUTES } from '../src/shell/collection-routes.js';
import { ROUTES, matchRoute } from '../src/shell/router.js';
import { NAV_EN } from '../src/shell/nav.strings.js';
import { SECTION_ROUTES } from '../src/shell/nav-model.js';
import { STORE_KEYS } from '../src/shell/privacy.view.js';
import { isOnDemand } from '../tools/build-precache.mjs';
import { review } from '../src/curriculum/srs.js';
import { DECKS } from '../src/platform/sched-state.js';
import { dayKey } from '../src/progress/model.js';
import { findName } from '../src/shell/names.js';

// the fake DOM lacks a few things the pages use
Object.defineProperty(N.prototype, 'value', { get() { return this._value ?? (this.tag === 'textarea' ? this.textContent : this.attrs.value ?? ''); }, set(v) { this._value = String(v); }, configurable: true });
Object.defineProperty(N.prototype, 'hidden', { get() { return 'hidden' in this.attrs; }, set(v) { if (v) this.attrs.hidden = ''; else delete this.attrs.hidden; }, configurable: true });
Object.defineProperty(N.prototype, 'checked', { get() { return this._checked ?? ('checked' in this.attrs); }, set(v) { this._checked = !!v; }, configurable: true });
N.prototype.closest = function (sel) { let n = this; while (n && !(n.matches && n.matches(sel))) n = n.parent; return n || null; };

const now = new Date(2026, 10, 11, 10).getTime(), DAY = 86400000;      // a Wednesday morning, local time
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const word = { kind: 'word', title: 'שָׁלוֹם', he: 'שָׁלוֹם', en: 'hello, peace', translit: 'shalom' };
const page = { kind: 'game', title: 'Café Counter', href: '#/g4-cafe' };

test('S1 save anything once; folders are made, renamed and removed without losing what is in them', () => {
  let r = M.saveItem(null, word, now); assert.equal(r.error, null);
  r = M.saveItem(r.rec, page, now + 1);
  assert.equal(M.saveItem(r.rec, word, now + 5).rec.items.length, 2, 'saving again does not duplicate');
  const f = M.addFolder(r.rec, '  The 40 words that got me started  ', now);
  assert.equal(f.rec.folders[0].name, 'The 40 words that got me started');
  assert.equal(M.addFolder(f.rec, 'the 40 WORDS that got me started', now).id, f.id, 'same name, same folder');
  assert.equal(M.addFolder(f.rec, '   ', now).error, 'Give the folder a name.');
  let rec = M.moveItem(f.rec, r.id, f.id);
  assert.equal(M.itemsIn(rec, f.id).length, 1); assert.equal(M.counts(rec).none, 1);
  rec = M.renameFolder(rec, f.id, 'Starter words'); assert.equal(rec.folders[0].name, 'Starter words');
  rec = M.setNote(rec, M.itemId(word), 'Rimon says this every morning', now);
  assert.equal(M.saveItem(rec, word, now + 9).rec.items.find((i) => i.kind === 'word').note, 'Rimon says this every morning', 'a later save keeps the note');
  rec = M.removeFolder(rec, f.id);
  assert.equal(rec.folders.length, 0); assert.equal(rec.items.length, 2); assert.equal(rec.items.every((i) => i.folder === null), true);
  assert.equal(M.removeItem(rec, M.itemId(page)).items.length, 1);
});

test('S1 stored data is made safe: only in-app links, trimmed text, limits, unknown folders dropped', () => {
  const c = M.clean({ folders: [{ id: 'a', name: 'A' }, { id: 'a', name: 'dup' }, { id: '', name: 'x' }], items: [
    { id: 'page:1', kind: 'page', title: 'ok', href: 'javascript:alert(1)', folder: 'zzz' }, { id: 'page:2', kind: 'nope', title: 'T', href: 'https://example.com' },
    { id: 'page:3', kind: 'page', title: '', href: '#/x' }, { id: 'page:4', kind: 'page', title: 'x'.repeat(999), href: '#/games', note: 'n'.repeat(5000), savedAt: 9 }, null, 5] });
  assert.equal(c.folders.length, 1);
  assert.deepEqual(c.items.map((i) => [i.id, i.kind, i.href, i.folder]), [['page:4', 'page', '#/games', null], ['page:1', 'page', '', null], ['page:2', 'page', '', null]]);
  assert.equal(c.items[0].title.length, M.MAX.title); assert.equal(c.items[0].note.length, M.MAX.note);
  assert.equal(M.safeHref('#/book/3?page=2'), '#/book/3?page=2'); assert.equal(M.safeHref('#/x" onclick="y'), ''); assert.equal(M.safeHref('//evil'), '');
  assert.deepEqual(M.clean('junk'), { version: 1, folders: [], items: [] });
});

test('S3 the heart: one tap saves, a second tap takes it off; an item with a note or folder is never dropped by the heart', () => {
  let r = M.toggleFav(null, page, now);
  assert.equal(r.fav, true); assert.equal(M.itemsIn(r.rec, 'favorites').length, 1); assert.ok(M.isFav(r.rec, page));
  r = M.toggleFav(r.rec, page, now + 1);
  assert.equal(r.fav, false); assert.equal(r.rec.items.length, 0, 'a bare favorite leaves with its heart');
  let rec = M.setNote(M.toggleFav(null, page, now).rec, M.itemId(page), 'for Friday', now);
  r = M.toggleFav(rec, page, now + 2);
  assert.equal(r.fav, false); assert.equal(r.rec.items.length, 1, 'the note keeps it'); assert.equal(M.itemsIn(r.rec, 'favorites').length, 0);
});

test('S4 personal dictionary: add from the app dictionary, own translation and note, search, export', () => {
  const index = JSON.parse(read('data/vocab/index.json'));
  const hits = M.lookupWords(index, 'peace');
  assert.ok(hits.length >= 1 && hits.every((w) => /peace/i.test(w.en)), 'English lookup');
  const heb = M.lookupWords(index, 'שלום');
  assert.ok(heb.length >= 1 && heb[0].he.replace(/[֑-ׇ]/g, '') === 'שלום', 'Hebrew lookup, with or without points');
  assert.deepEqual(M.lookupWords(index, ''), []); assert.deepEqual(M.lookupWords({}, 'x'), []);
  assert.ok(!M.lookupWords(index, 'יהוה').some((w) => findName(w.he).length), 'the Name is not offered as a word to save');
  let rec = M.saveItem(null, heb[0], now).rec; const id = M.itemId(heb[0]);
  rec = M.setMine(M.setNote(rec, id, 'also "goodbye"; =SUM(1)', now), id, 'hi / bye', now);
  assert.equal(M.itemsIn(rec, 'words', 'goodbye').length, 1); assert.equal(M.itemsIn(rec, 'words', 'zebra').length, 0);
  const csv = M.wordsCSV(rec).split('\r\n');
  assert.equal(csv[0], 'hebrew,sounds_like,meaning,my_translation,my_note,saved');
  assert.ok(csv[1].includes('hi / bye') && csv[1].includes('"also ""goodbye""; =SUM(1)"'));
  assert.ok(M.wordsCSV(M.saveItem(null, { ...word, he: 'x', title: 'x', en: '=HYPERLINK("http://x")' }, now).rec).includes("\"'=HYPERLINK"), 'a formula is defused');
  assert.match(M.wordsText(rec), /My translation: hi \/ bye\nNote: also/);
});

test('S2 a folder becomes a review deck: cards for items with Hebrew and a meaning, same scheduler, history kept, cleared when turned off', () => {
  let rec = M.saveItem(null, word, now).rec; const f = M.addFolder(rec, 'Deck', now);
  rec = M.moveItem(M.saveItem(f.rec, page, now).rec, M.itemId(word), f.id); rec = M.moveItem(rec, M.itemId(page), f.id);
  assert.equal(M.syncDeckCards(rec, {}, now).added, 0, 'not a deck yet');
  rec = M.setDeck(rec, f.id, true);
  let s = M.syncDeckCards(rec, {}, now);
  assert.equal(s.added, 1); const id = M.cardId(M.itemId(word)); assert.equal(s.cards[id].state, 'new'); assert.equal(s.cards[id].kind, 'collection');
  assert.deepEqual(M.deckSummary(rec, s.cards, f.id, now), { items: 2, cards: 1, skipped: 1, due: 1, fresh: 1 });
  assert.equal(M.dueInFolder(rec, s.cards, f.id, now)[0].item.he, word.he);
  const cards = { ...s.cards, [id]: review(s.cards[id], 3, now) };
  assert.ok(cards[id].due > now && cards[id].reps === 1);
  assert.equal(M.dueInFolder(rec, cards, f.id, now).length, 0);
  s = M.syncDeckCards(rec, cards, now + DAY); assert.equal(s.added + s.removed, 0); assert.equal(s.cards[id].reps, 1, 'history kept');
  assert.equal(M.syncDeckCards(M.setDeck(rec, f.id, false), cards, now).removed, 1);
  assert.ok(DECKS.some(([k]) => k === M.CARDS_KEY), 'the scheduler page counts collection decks with the other decks');
  assert.ok(M.reviewable({ he: 'x', mine: 'y' }) && !M.reviewable({ he: 'x' }) && !M.reviewable({ en: 'y' }));
});

test('S9 a folder as a file: notes travel, hearts and history do not; import merges, keeps what is there, refuses anything else', () => {
  let rec = M.saveItem(null, { ...word, fav: true }, now).rec; const f = M.addFolder(rec, 'Starter words', now);
  rec = M.setNote(M.moveItem(f.rec, M.itemId(word), f.id), M.itemId(word), 'my first word', now);
  const file = JSON.parse(JSON.stringify(M.exportFolder(rec, f.id, now)));
  assert.equal(file.schema, 'alef-collection/1'); assert.equal(file.folder, 'Starter words');
  assert.deepEqual(Object.keys(file.items[0]).sort(), ['en', 'he', 'href', 'kind', 'mine', 'note', 'title', 'translit']);
  assert.equal(M.fileName('Starter words'), 'aleph-collection-starter-words.json'); assert.equal(M.exportFolder(rec, 'nope', now), null);
  const other = M.importFolder(null, file, now);
  assert.deepEqual([other.added, other.kept, other.skipped, other.error], [1, 0, 0, null]);
  assert.equal(other.rec.folders[0].name, 'Starter words'); assert.equal(other.rec.items[0].note, 'my first word'); assert.equal(other.rec.items[0].fav, false);
  const again = M.importFolder(other.rec, file, now + 5); assert.deepEqual([again.added, again.kept], [0, 1]);
  const mine = M.setNote(other.rec, M.itemId(word), 'my own note', now);
  assert.equal(M.importFolder(mine, file, now).rec.items[0].note, 'my own note', 'an import never overwrites');
  const bad = M.importFolder(null, { schema: 'alef-collection/1', folder: '<b>x</b>', items: [{ kind: 'page', title: 'T', href: 'javascript:alert(1)' }, { title: '' }, { kind: 'word', title: 'א', he: 'א', en: 'x'.repeat(9999) }] }, now);
  assert.deepEqual([bad.added, bad.skipped], [2, 1]); assert.ok(bad.rec.items.every((i) => i.href === '' && i.en.length <= M.MAX.text));
  assert.match(M.importFolder(null, { schema: 'other', items: [] }, now).error, /not an Aleph collection file/);
  assert.match(M.importFolder(null, { schema: 'alef-collection/1', items: Array.from({ length: 501 }, () => ({})) }, now).error, /more than 500/);
  assert.match(M.importFolder(null, 'text', now).error, /not an Aleph collection file/);
});

test('S8 saved searches: what a search finds when saved is "seen"; later additions are new until looked at', async () => {
  const rows = [{ href: '#/a', label: 'A' }, { href: '#/b', label: 'B' }];
  let list = M.saveSearch([], ' shabbat ', rows.map((r) => r.href), now);
  assert.equal(list[0].q, 'shabbat'); assert.equal(M.newMatches(list[0], rows).length, 0);
  const grown = [...rows, { href: '#/c', label: 'C' }];
  assert.deepEqual(M.newMatches(list[0], grown).map((r) => r.href), ['#/c']);
  list = M.markSeen(list, 'SHABBAT', grown.map((r) => r.href)); assert.equal(M.newMatches(list[0], grown).length, 0);
  assert.equal(M.saveSearch(list, 'Shabbat', [], now).length, 1, 'one entry per search');
  assert.equal(M.removeSearch(list, 'shabbat').length, 0); assert.equal(M.saveSearch([], '  ', [], now).length, 0);
  const S = await import('../src/platform/search-more.js');
  const flat = M.flatResults(S.searchAll(await S.loadIndexes(), 'shabbat'));
  assert.ok(flat.length > 0 && flat.every((r) => r.href.startsWith('#/') && r.group), 'runs on the app\'s own search');
});

test('S5 timeline: one entry per day from the device\'s records, newest first, with the learner\'s note', () => {
  let visits = D.addVisit(null, { name: 'songs', title: 'Songs', hash: '#/songs' }, now);
  visits = D.addVisit(visits, { name: 'songs', title: 'Songs', hash: '#/songs' }, now + 5);
  visits = D.addVisit(visits, { name: 'trope', title: 'Trope trainer', hash: '#/trope' }, now + 9);
  assert.equal(visits.days[dayKey(now)].length, 2, 'the same page twice in a row is one line');
  visits = D.setDayNote(visits, dayKey(now - DAY), 'Hard day, but I read a whole line.');
  const log = Math.floor(Date.UTC(2026, 10, 9) / DAY) * 10 + 3;
  const t = D.timeline({ completed: { r01: now - DAY, r02: now - DAY }, checkpoints: { c1: { at: now - 3 * DAY } }, books: { book1: { finishedAt: now } }, decks: { 'srs.cards': { a: { log: [log, log + 1, 7] } } },
    collection: { items: [{ savedAt: now }] }, visits, lessonTitle: (id) => `Lesson ${id}` });
  assert.deepEqual(t.map((e) => e.day), [dayKey(now), dayKey(now - DAY), '2026-11-09', dayKey(now - 3 * DAY)].sort().reverse());
  const today = t.find((e) => e.day === dayKey(now));
  assert.deepEqual(today.lines, ['Finished 1 little book', 'Saved 1 thing to My Collection']); assert.deepEqual(today.pages.map((p) => p.t), ['Songs', 'Trope trainer']);
  const y = t.find((e) => e.day === dayKey(now - DAY));
  assert.deepEqual(y.lines, ['Finished 2 lessons: Lesson r01; Lesson r02']); assert.equal(y.note, 'Hard day, but I read a whole line.');
  assert.deepEqual(t.find((e) => e.day === '2026-11-09').lines, ['Answered 2 review cards']);
  assert.equal(D.firstDay(t), t[t.length - 1].day);
  assert.equal(D.setDayNote(visits, dayKey(now - DAY), '  ').notes[dayKey(now - DAY)], undefined, 'an empty note is removed');
  assert.deepEqual(D.timeline({}), []);
  let many = null; for (let i = 0; i < 60; i++) many = D.addVisit(many, { name: 'p' + i, title: 'P' + i, hash: '#/p' + i }, now);
  assert.equal(many.days[dayKey(now)].length, D.MAX.perDay);
  assert.deepEqual(D.cleanVisits({ days: { bad: [1], '2026-01-01': [{ n: 'x', t: 'X', h: 'http://evil' }] }, reading: { k: { title: 'T', href: 'javascript:1' } }, notes: { nope: 'x' } }), { version: 1, days: {}, reading: {}, notes: {} });
});

test('S10 reading shelf: books carry their page, other texts their last place; finished books move to their own list', () => {
  let visits = D.addVisit(null, { name: 'book', title: 'Read a book', hash: '#/book/book2' }, now - DAY);
  visits = D.addVisit(visits, { name: 'torahreader', title: 'Torah reader', hash: '#/torahreader?book=genesis&chapter=12' }, now);
  visits = D.addVisit(visits, { name: 'songs', title: 'Songs', hash: '#/songs' }, now);
  visits = D.addVisit(visits, { name: 'torahreader', title: 'Torah reader', hash: '#/torahreader?book=genesis&chapter=13' }, now + 60);
  const shelf = D.readingShelf(visits, { book1: { lastPage: 11, finishedAt: now - 5 * DAY }, book2: { lastPage: 3 }, book9: {} }, [{ id: 'book1', title: 'The Monkey', pages: 12 }, { id: 'book2', title: 'The Well', pages: 10 }]);
  assert.deepEqual(shelf.inProgress.map((r) => [r.title, r.href, r.place]), [['Torah reader', '#/torahreader?book=genesis&chapter=13', ''], ['The Well', '#/book/book2', 'page 4 of 10']]);
  assert.deepEqual(shelf.finished.map((r) => [r.title, r.place]), [['The Monkey', 'finished']]);
  assert.equal(D.readingGroup('songs'), null); assert.equal(D.readingGroup('service'), 'Services and Prayers'); assert.equal(D.readingGroup('libraryarticle'), 'Library');
  assert.deepEqual(D.readingShelf(null, null), { inProgress: [], finished: [] });
});

test('S6 My Hebrew: every line is counted from the numbers given; the level follows reading lessons only', () => {
  const visits = [1, 2, 3].reduce((v, i) => D.addVisit(D.addVisit(v, { name: 'songs', title: 'Songs', hash: '#/songs' }, now + i * 10), { name: 'home', title: 'Home', hash: '#/home' }, now + i * 10 + 1), null);
  const p = D.profile({ lessons: { read: { done: 20, total: 71 }, israel: { done: 2, total: 54 } }, lettersKnown: 27, lettersTotal: 27, cards: { new: 5, learning: 30, mature: 12, total: 47 }, vocabStarted: 40,
    booksFinished: 3, booksStarted: 5, streak: { count: 4, best: 9 }, weak: [{ label: 'dalet / resh', detail: '3 misses', href: '#/learn?review=1' }], collection: { items: [{ title: 'Songs', href: '#/songs', fav: true }, { title: 'x', fav: false }] }, visits, daysActive: 14 });
  assert.equal(p.level, 'Building'); assert.equal(p.strongest.id, 'letters'); assert.equal(p.weakest.id, 'israel');
  assert.deepEqual([p.wordsKnown, p.wordsLearning, p.booksFinished, p.streak, p.bestStreak, p.daysActive, p.saved], [12, 30, 3, 4, 9, 14, 2]);
  assert.deepEqual(p.favorite, [{ title: 'Songs', href: '#/songs', n: 3 }], 'Home is not content'); assert.deepEqual(p.hearts, [{ title: 'Songs', href: '#/songs' }]);
  assert.deepEqual([0, 0.01, 0.3, 0.7, 1].map(D.levelOf), ['Just starting', 'Beginner', 'Building', 'Reading with help', 'Reading on your own']);
  const empty = D.profile({ lessons: { read: { done: 0, total: 71 }, israel: { done: 0, total: 54 } }, lettersKnown: 0, lettersTotal: 27, cards: { new: 0, learning: 0, mature: 0, total: 0 }, vocabStarted: 0, booksFinished: 0, booksStarted: 0, streak: { count: 0, best: 0 }, weak: [], collection: null, visits: null, daysActive: 0 });
  assert.equal(empty.level, 'Just starting'); assert.equal(empty.strongest, null);
});

test('S7 interest paths: every step is a real page in the app; a step is done when ticked or opened; putting a path away keeps the ticks', () => {
  for (const i of D.INTERESTS) for (const n of i.steps) { const r = ROUTES.find((x) => x.name === n); assert.ok(r && r.module && !r.pattern.includes(':'), `${i.id}: ${n} is not a page`); assert.ok(matchRoute('#' + r.pattern), n); }
  assert.deepEqual(D.INTERESTS.map((i) => i.id), ['cooking', 'travel', 'prayer', 'torah', 'music']);
  let rec = D.pickInterest(null, 'music', true); rec = D.pickInterest(rec, 'nonsense', true);
  assert.deepEqual(rec.picked, ['music']);
  const visits = D.addVisit(null, { name: 'songs', title: 'Songs', hash: '#/songs' }, now);
  rec = D.markStep(rec, 'music', 'trope', true, now);
  const music = D.pathsFor(rec, ROUTES, visits).find((p) => p.id === 'music');
  assert.equal(music.picked, true); assert.equal(music.done, 2); assert.equal(music.next.route, 'listen-shelf');
  assert.equal(music.steps.find((s) => s.route === 'songs').opened, true); assert.equal(music.steps.find((s) => s.route === 'trope').ticked, true);
  assert.equal(D.pathsFor(rec, ROUTES.filter((r) => r.name !== 'songs'), null).find((p) => p.id === 'music').steps.some((s) => s.route === 'songs'), false, 'a page missing from this build is left out');
  rec = D.pickInterest(rec, 'music', false); assert.deepEqual(rec.picked, []); assert.ok(rec.done['music:trope']);
  assert.equal(D.markStep(rec, 'music', 'trope', false).done['music:trope'], undefined);
});

test('S3 the Save button on a page: writes the diary line, saves on one tap, takes off on the second, and stays off pages that are not content', async () => {
  const store = memStore(); const root = new N('main'); const h1 = new N('h1'); h1.attrs.id = 'view-title'; h1.textContent = 'Café Counter'; root.append(h1);
  const route = ROUTES.find((r) => r.name === 'g4-cafe');
  const box = await attach(root, route, { store }, { hash: '#/g4-cafe', doc: document, now: () => now });
  assert.ok(box); const b = root.querySelector('[data-collection-heart]');
  assert.equal(b.attrs['aria-pressed'], 'false'); assert.match(b.attrs['aria-label'], /^Save to My Collection: Café Counter$/);
  assert.equal(store.m[D.VISITS_KEY].days[dayKey(now)][0].t, 'Café Counter');
  await b.click(); await tick(5);
  assert.equal(b.attrs['aria-pressed'], 'true'); assert.deepEqual(M.itemsIn(store.m[M.KEY], 'favorites').map((i) => [i.kind, i.title, i.href]), [['game', 'Café Counter', '#/g4-cafe']]);
  assert.equal(await attach(root, route, { store }, { hash: '#/g4-cafe', doc: document, now: () => now }), null, 'never two buttons on one page');
  await b.click(); await tick(5);
  assert.equal(b.attrs['aria-pressed'], 'false'); assert.equal(store.m[M.KEY].items.length, 0);
  for (const name of ['home', 'welcome', 'focus', 'collection', 'settings']) { assert.ok(SKIP.has(name)); assert.equal(await attach(new N('main'), { name, title: 'x', pattern: '/x' }, { store }, { doc: document }), null); }
  assert.deepEqual(pageItem(ROUTES.find((r) => r.name === 'book'), '#/book/book3', 'The Well'), { kind: 'book', title: 'The Well', href: '#/book/book3' });
  assert.equal(D.kindOfRoute(ROUTES.find((r) => r.name === 'service')), 'prayer'); assert.equal(D.kindOfRoute(ROUTES.find((r) => r.name === 'songs')), 'song');
  assert.equal(D.kindOfRoute(ROUTES.find((r) => r.name === 'torahreader')), 'verse'); assert.equal(D.kindOfRoute(ROUTES.find((r) => r.name === 'phrases')), 'page');
});

test('My Collection page: folders, moving, notes, a deck review, the dictionary box, a saved search and the notebook copy all work', async () => {
  const V = await import('../src/collection/collection.view.js');
  const store = memStore();
  store.m[M.KEY] = M.saveItem(M.saveItem(null, word, now).rec, page, now + 1).rec;
  store.m['torah.notebook.v1'] = { version: 1, items: [{ book: 'bereshit', en: 'Genesis', chapter: 1, verse: 1, he: 'בְּרֵאשִׁית', english: 'In the beginning', note: 'first verse', savedAt: now }] };
  const root = new N('main');
  const search = { loadIndexes: async () => ({}), searchAll: (ix, q) => [['Lessons', [{ href: '#/learn/r01', label: `About ${q}`, desc: '' }]]] };
  const unmount = await V.mount(root, { store }, { now: () => now, search, loadJSON: async () => ({ fields: ['id', 'he', 'heUnpointed', 'en', 'pos', 'level', 'track', 'topic', 'pack', 'frequencyRank', 'unlockLesson', 'translit'], rows: [['h1', 'תּוֹדָה', 'תודה', 'thank you', 'n', 'A1', 'both', 't', 'p', 1, 'r01', 'toda']] }) });
  assert.match(root.textContent, /Everything \(2\)/); assert.match(root.textContent, /Café Counter/);
  // new folder, move the word in, make it a deck, review it
  root.querySelector('#col-new-folder').value = 'Starter words'; await root.querySelector('[data-act="new-folder"]').click(); await tick(5);
  assert.equal(store.m[M.KEY].folders[0].name, 'Starter words');
  await btn(root, /^Everything/).click();
  const row = root.queryAll('[data-item]').find((n) => /שָׁלוֹם/.test(n.textContent));
  const sel = row.querySelector('select'); sel.value = store.m[M.KEY].folders[0].id; await sel.fire('change'); await tick(5);
  assert.equal(M.itemsIn(store.m[M.KEY], store.m[M.KEY].folders[0].id).length, 1);
  await btn(root, /^Starter words/).click();
  const deck = root.querySelector('[data-act="deck"]'); deck.checked = true; await deck.fire('change'); await tick(5);
  assert.equal(Object.keys(store.m[M.CARDS_KEY]).length, 1);
  await root.querySelector('[data-act="review"]').click();
  assert.match(root.textContent, /Deck Review: Starter words/);
  await root.querySelector('[data-act="show"]').click(); await root.querySelector('[data-rate="3"]').click(); await tick(5);
  assert.equal(Object.values(store.m[M.CARDS_KEY])[0].reps, 1); assert.match(root.textContent, /Done: 1 card answered/);
  await btn(root, /Back to the folder/).click();
  // a note
  const item = root.querySelector('[data-item]'); item.querySelector('textarea').value = 'said at the door'; await item.querySelector('[data-act="save-note"]').click(); await tick(5);
  assert.equal(store.m[M.KEY].items.find((i) => i.kind === 'word').note, 'said at the door');
  // the personal dictionary box
  await btn(root, /^My Dictionary/).click();
  root.querySelector('#col-word-q').value = 'thank'; await root.querySelector('[data-act="find-word"]').click(); await tick(5);
  await root.querySelector('[data-act="add-word"]').click(); await tick(5);
  assert.equal(M.itemsIn(store.m[M.KEY], 'words').length, 2);
  // a saved search and the notebook copy
  await btn(root, /^Everything/).click();
  root.querySelector('#col-search-q').value = 'shabbat'; await root.querySelector('[data-act="save-search"]').click(); await tick(5);
  assert.equal(store.m[M.SEARCHES_KEY][0].q, 'shabbat'); assert.deepEqual(store.m[M.SEARCHES_KEY][0].seen, ['#/learn/r01']);
  await root.querySelector('[data-act="from-notebook"]').click(); await tick(5);
  const verse = store.m[M.KEY].items.find((i) => i.kind === 'verse');
  assert.deepEqual([verse.title, verse.note, verse.href], ['Genesis 1:1', 'first verse', '#/verse-notebook']); assert.equal(store.m['torah.notebook.v1'].items.length, 1, 'the notebook is untouched');
  // remove
  await root.querySelector('[data-act="remove"]').click(); await tick(5);
  assert.equal(store.m[M.KEY].items.length, 3);
  const copy = root.textContent;
  assert.ok(!/\b(AI|algorithm|neural|machine)\b/i.test(copy)); assert.equal(findName(copy).length, 0);
  unmount();
});

test('the four other pages open on an empty device and on a used one', async () => {
  const lessons = { lessons: [{ id: 'r01', track: 'read', title: 'Shin and Bet' }, { id: 'i01', track: 'israel', title: 'Hello' }] };
  const loadJSON = async (p) => (/lessons/.test(p) ? lessons : /books/.test(p) ? { books: [{ id: 'book2', titleEn: 'The Well', pageCount: 10 }] } : null);
  const used = memStore();
  used.m['curriculum.progress'] = { completed: { r01: now - DAY } }; used.m['books.v1'] = { book2: { lastPage: 3 } };
  used.m[D.VISITS_KEY] = D.addVisit(D.addVisit(null, { name: 'songs', title: 'Songs', hash: '#/songs' }, now), { name: 'service', title: 'Follow the service', hash: '#/service' }, now);
  for (const [file, title, want] of [['shelf', 'Reading Shelf', /Continue reading.*The Well.*page 4 of 10/], ['timeline', 'My Timeline', /Finished 1 lesson: Shin and Bet/], ['myhebrew', 'My Hebrew', /Reading lessons: 1 of 1 \(100%\)/], ['paths', 'Interest Paths', /What are you interested in\?/]]) {
    const V = await import(`../src/collection/${file}.view.js`);
    for (const store of [memStore(), used]) {
      const root = new N('main'); await V.mount(root, { store }, { now: () => now, loadJSON }); await tick(5);
      assert.equal(root.querySelector('#view-title').textContent, title);
      if (store === used) assert.match(root.textContent, want, file);
      assert.ok(!/\b(AI|algorithm|neural|machine)\b/i.test(root.textContent), file);
    }
  }
  // timeline: a note is saved for the day; paths: picking an interest shows its steps, ticking one is stored
  const T = await import('../src/collection/timeline.view.js'); let root = new N('main'); await T.mount(root, { store: used }, { now: () => now, loadJSON });
  const today = root.querySelector(`[data-day="${dayKey(now)}"]`); today.querySelector('textarea').value = 'Sang along today'; await today.querySelector('[data-act="save-note"]').click(); await tick(5);
  assert.equal(used.m[D.VISITS_KEY].notes[dayKey(now)], 'Sang along today');
  const P = await import('../src/collection/paths.view.js'); root = new N('main'); await P.mount(root, { store: used }, { now: () => now });
  const pick = root.querySelector('[data-interest="music"]'); pick.checked = true; await pick.fire('change'); await tick(5);
  assert.deepEqual(used.m[D.PATHS_KEY].picked, ['music']); assert.match(root.querySelector('[data-path="music"]').textContent, /1 of 7 steps done/);
});

test('routes, labels, sections, privacy rows; all of it is fetched on demand and the first install stays under 3.95 MiB', () => {
  assert.deepEqual(COLLECTION_ROUTES.map((r) => r.name), ['collection', 'shelf', 'timeline', 'my-hebrew', 'paths']);
  for (const r of COLLECTION_ROUTES) {
    assert.equal(matchRoute('#' + r.pattern).route.name, r.name); assert.equal(NAV_EN[r.quick], r.title);
    assert.ok(SECTION_ROUTES[r.section].includes(r.name)); assert.ok(isOnDemand('src/collection/' + r.module.split('/').pop()));
    assert.ok(statSync(new URL('../src/collection/' + r.module.split('/').pop(), import.meta.url)).size > 0);
    assert.match(r.title, /^([A-Z][a-z]*)( [A-Z][a-z]*)*$/, 'Title Case');
  }
  for (const k of [M.KEY, M.CARDS_KEY, M.SEARCHES_KEY, D.VISITS_KEY, D.PATHS_KEY]) assert.ok(STORE_KEYS.some((row) => row[0] === k), `${k} is in the privacy table`);
  const self = {}; vm.runInNewContext(read('precache-manifest.js'), { self });
  assert.equal(self.ALEF_PRECACHE.filter((u) => u.startsWith('src/collection/')).join(' '), '');
  for (const f of ['model.js', 'diary.js', 'heart.js', 'shared.js']) assert.ok(self.ALEF_ON_DEMAND.includes('src/collection/' + f), f);
  const bytes = self.ALEF_PRECACHE.reduce((a, u) => a + statSync(new URL('../' + u, import.meta.url)).size, 0);
  assert.ok(bytes < 3.95 * 1048576, `first install is ${bytes} bytes`);
  assert.match(read('src/app.js'), /import\('\.\/collection\/heart\.js'\)/, 'the Save button is loaded after a page shows, not with the shell');
  for (const f of ['model.js', 'diary.js', 'heart.js', 'shared.js', 'collection.view.js', 'shelf.view.js', 'timeline.view.js', 'myhebrew.view.js', 'paths.view.js']) {
    const src = read('src/collection/' + f); const code = src.replace(/\/\/.*$/gm, '');
    assert.ok(!/https?:\/\//.test(code), `${f}: no outside address`); assert.ok(!/XMLHttpRequest|sendBeacon|WebSocket|navigator\.share|Notification|localStorage|innerHTML/.test(code), `${f}: nothing sent, no notifications, no HTML strings`);
  }
});
