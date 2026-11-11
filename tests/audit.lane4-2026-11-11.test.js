// Full-site check of 11 November 2026, lane 4 fixes: M-02 (null text), M-04 (playing state), M-06 (book check),
// M-07 (sounds labels), M-08 (games count), S-04 (Moses voice line), S-07 (shelf numbers), S-08 (sitemap), S-11 (clip holds).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanKids, findNullText } from '../src/shell/null-guard.js';
import { storyCheck, firstSentence } from '../src/books/check.js';
import { shelfOrder, shelfNumber, resolveBookId, nextOnShelf } from '../src/books/order.js';
import { BOOK_SHELF_COUNT, BOOK_FINISHER_TARGET, observeFutureSets } from '../src/awards/observe.js';
import { playLine, controlName } from '../src/shell/play-state.js';
import { createShellAudio } from '../src/shell/audio.js';
import { buildSitemap } from '../tools/seo/build-sitemap.mjs';
import { HELD_LABEL, isHeldClip } from '../src/lab/lab.holds.js';

const J = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const index = J('data/books/index.json').books;

test('M-02: null, undefined and array children are dropped or flattened, never printed', () => {
  assert.deepEqual(cleanKids(['a', null, undefined, 'b']), ['a', 'b']);
  assert.deepEqual(cleanKids(['a', ['b', null, ['c']]]), ['a', 'b', 'c']);
  assert.deepEqual(cleanKids(['null', ' undefined ', 'ok']), ['ok']);
  const kids = ['x', 'y']; assert.equal(cleanKids(kids), kids, 'clean input is passed through untouched');
  const t = (d) => ({ nodeType: 3, data: d });
  assert.deepEqual(findNullText({ childNodes: [t('Ask Noa (1)'), t('null'), { childNodes: [t('Value: undefined')] }, t('nullable')] }), ['null', 'Value: undefined']);
});

test('M-02: Quiz Ladder says how many answers each level shows, and no view passes a bare null to replaceChildren', () => {
  const q = src('src/games/quizladder.view.js');
  assert.doesNotMatch(q, /Pick one of four answers/);
  assert.match(q, /three choices on level 1, four from level 2/);
  assert.doesNotMatch(q, /: null\);\s*$/m);
  assert.match(src('src/curriculum/calendar.addpanel.js'), /filter\(\(n\) => n != null\)/);
  assert.match(src('src/app.js'), /^import '\.\/shell\/null-guard\.js';/m);
});

test('M-06: every book has a one-question story check built from its own pages, three different options, one right', () => {
  assert.equal(firstSentence('One. Two.'), 'One.');
  for (const b of index) {
    const book = J(`data/books/${b.id}.json`);
    const c = storyCheck(book);
    assert.ok(c, `${b.id} has a check`);
    assert.equal(c.options.length, 3, b.id);
    assert.equal(c.options.filter((o) => o.correct).length, 1, b.id);
    assert.equal(new Set(c.options.map((o) => o.text)).size, 3, `${b.id} options differ`);
    const pages = new Set(book.pages.map((p) => firstSentence(p.en)));
    for (const o of c.options) assert.ok(pages.has(o.text), `${b.id}: "${o.text}" comes from the book`);
    const right = c.options.find((o) => o.correct);
    assert.equal(right.page, Math.min(...c.options.map((o) => o.page)), `${b.id}: the right answer happens first`);
    assert.deepEqual(storyCheck(book), c, 'deterministic');
  }
  const v = src('src/books/book.view.js');
  assert.match(v, /storyCheck\(book\)/);
  assert.doesNotMatch(v, /if \(page === last && !entry\.finishedAt\) entry\.finishedAt/, 'reaching the last page alone no longer finishes a book');
});

test('M-06: Book Finisher counts the real shelf and never says "All five story books"', () => {
  assert.equal(BOOK_SHELF_COUNT, index.length);
  const e = src('src/awards/eligibility.js');
  assert.doesNotMatch(e, /All five story books|all five story books/);
  const mem = (m) => ({ get: (k) => m[k] });
  assert.equal(observeFutureSets(mem({ 'books.finished.v1': { book6: 1, book11: 2, book63: 3, book1: 4 } })).booksAllFive, false);
  assert.equal(observeFutureSets(mem({ 'books.finished.v1': { book6: 1, book11: 2, book63: 3, book1: 4, book30: 5 } })).booksAllFive, BOOK_FINISHER_TARGET === 5);
});

test('S-07: shelf numbers follow the shelf; #/book/1 opens the first book on the shelf, stored ids stay as they are', () => {
  const order = shelfOrder(index);
  assert.equal(order.length, index.length);
  assert.equal(order[0].id, 'book6'); // Kafeh Kodem, first in Beginner 1
  assert.equal(order[0].titleTranslit, 'Kafeh Kodem');
  assert.equal(resolveBookId('6', index), 'book11'); // Ha-Otobus Me'acher, sixth on the shelf
  assert.equal(resolveBookId('book11', index), 'book11');
  assert.equal(resolveBookId('999', index), '');
  assert.equal(shelfNumber('book6', index), 1);
  assert.equal(nextOnShelf('book6', index).id, order[1].id);
  assert.match(src('src/books/books.view.js'), /Book \$\{numberOf\.get\(b\.id\)\}/);
});

test('S-04: the Moses book says how many pages are voiced; its manifest lists only the clips in the book data', () => {
  const b = index.find((x) => x.id === 'book63');
  const book = J('data/books/book63.json');
  const voiced = book.pages.filter((p) => p.hasAudio).length;
  assert.equal(b.audioPages, voiced);
  assert.equal(b.hasAudio, voiced === b.pageCount);
  const m = J('data/audio/manifest-book63.json');
  const listed = new Set(book.pages.filter((p) => p.hasAudio).flatMap((p) => [p.audio.f, p.audio.m]));
  assert.equal(m.length, listed.size);
  for (const e of m) assert.ok(listed.has(e.path), `${e.path} is a voiced page`);
  assert.match(src('src/books/books.view.js'), /Read aloud by Ari and Noa on \$\{b\.audioPages\} of \$\{b\.pageCount\} pages/);
});

test('M-08: the games index counts its games and levels from the catalogue', () => {
  const g = src('src/games/games.view.js');
  assert.doesNotMatch(g, /Thirty quick games|five levels each/);
  assert.match(g, /hubSummary\(items\)/);
  assert.match(g, /\$\{ARCADE_GAMES\.length\}/);
});

test('M-07: no garbled "unverified" run-on and no builder notes on the Sounds page; rule marks sit on a carrier letter', () => {
  const s = src('src/pronunciation/sounds.view.js');
  assert.doesNotMatch(s, /'unverified'/);
  assert.match(s, /\[' ', unchecked\(\)\]/);
  const drills = J('data/pronunciation/drills.json').drills;
  for (const d of drills) assert.doesNotMatch(d.listenFor, /fetched|does NOT/, d.id);
  const rules = J('data/pronunciation/runtime/rules.json').pages;
  assert.equal(rules.find((p) => p.id === 'kamatz').title, 'Kamatz (אָ)');
  assert.equal(rules.find((p) => p.id === 'holam').title, 'Holam (אֹ)');
  for (const p of rules) assert.doesNotMatch(p.title, /\(\p{Mn}+\)/u, `${p.id}: no bare vowel mark`);
});

test('M-04: one shared playing / finished / failed line, and the shell audio reports every play', async () => {
  assert.equal(playLine('playing', 'shalom'), 'Playing: shalom');
  assert.match(playLine('finished'), /^Finished\./);
  assert.match(playLine('failed', '', 'the recording did not load'), /^No sound: the recording did not load\.$/);
  assert.match(playLine('failed'), /^No sound: /);
  assert.equal(controlName({ getAttribute: (k) => (k === 'aria-label' ? 'Listen: shalom (device voice, not recorded yet)' : null), textContent: '' }), 'shalom');
  const settings = { get: (k) => ({ voice: 'f', congregation: 'israeli' })[k] };
  const mk = (result) => createShellAudio({ settings, manifest: [], createAudio: () => ({ extend() {}, status: () => ({ source: 'none' }), has: () => false, stop: () => ({}), play: async (k, id, o) => { o.onMedia?.({ type: 'playing' }); return result; }, playSequence: async () => [] }) });
  const seen = [];
  const a = mk({ source: 'file', ended: true }); a.onPlay((e) => seen.push(e.phase));
  await a.play('word', 'x');
  assert.deepEqual(seen, ['start', 'playing', 'finished']);
  const b = mk({ source: 'none', reason: 'no-hebrew-browser-voice' }); const fails = []; b.onPlay((e) => fails.push(e));
  await b.play('word', 'x');
  assert.equal(fails.at(-1).phase, 'failed');
  assert.match(fails.at(-1).why, /Hebrew voice/);
  assert.match(src('src/app.js'), /installPlayState\(\{ audio \}\)/);
});

test('S-08: sitemap.xml lists the main public pages and is what the router generates', async () => {
  const xml = src('sitemap.xml');
  assert.equal(xml, await buildSitemap(), 'stale: run node tools/seo/build-sitemap.mjs');
  const n = (xml.match(/<url>/g) || []).length;
  assert.ok(n >= 20, `${n} URLs`);
  for (const p of ['/learn', '/letters', '/books', '/games', '/synagogues', '/calendar']) assert.ok(xml.includes(`/#${p}</loc>`), p);
  assert.doesNotMatch(xml, /:id|:group|#\/settings/);
});

test('S-11: a held clip is named as held where it falls back', () => {
  assert.match(HELD_LABEL, /held back for re-recording/);
  const held = new Set(['audio/f/israeli/syllable/bet-u.mp3']);
  const ctx = (path) => ({ audio: { status: () => ({ source: 'file', path }), has: () => true } });
  assert.equal(isHeldClip(ctx('audio/f/israeli/syllable/bet-u.mp3'), held, 'syllable', 'bet-u'), true);
  assert.equal(isHeldClip(ctx('audio/f/israeli/syllable/bet-a.mp3'), held, 'syllable', 'bet-a'), false);
  assert.match(src('src/lab/lab.view.js'), /lab-held-note/);
});

test('M-13: Sound Snap takes no heart before the first tap, and the arcade Start button is there from the first paint', () => {
  const s = src('src/games/soundsnap.view.js');
  assert.match(s, /let engaged = false/);
  assert.match(s, /if \(!engaged\)/);
  const a = src('src/games/arcade.js');
  assert.ok(a.indexOf('results.replaceChildren(startBtn);') < a.indexOf('await loadWords(ctx)'), 'Start is painted before the data loads');
  assert.match(a, /pendingStart/);
});
