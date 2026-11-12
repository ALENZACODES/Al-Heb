import { TG_GAMES } from '../src/games/tg-catalog.js';
// Hanukkah games: dreidel rules, candle order, data validity (pointed Hebrew), routes and catalogue, and every game
// mounting and playing a little in the fake DOM. Logic and wiring checks only; the Hebrew flagged for review in the
// data files is not claimed correct here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Doc, El } from './wordtrace.fakedom.js';
import { createDreidelGame, applyFace, spinFace, heyShare, heyExplain, fairIndex, describe, currentPlayer, activePlayers, FACES } from '../src/games/hanukkah-dreidel.js';
import { placementOrder, lightingOrder, createLighting, VISUAL_ORDER, SHAMASH } from '../src/games/hanukkah-candles.js';
import { HANUKKAH_GAMES, ARCADE_GAMES } from '../src/games/arcade.catalog.js';
import { nextGame } from '../src/games/arcade.js';
import { matchRoute, tierOf, ROUTES } from '../src/shell/router.js';
import { STORE_KEYS } from '../src/shell/privacy.view.js';
import { NAV_EN } from '../src/shell/nav.strings.js';
import { SECTION_ROUTES, PREVIEW_HIDDEN } from '../src/shell/nav-model.js';
import { VIEW_FILES } from '../src/shell/views.generated.js';
import { distance, clueFor } from '../src/games/hanukkah-gelthunt.view.js';
import { createDeck, points } from '../src/games/hanukkah-party.js';
import { scramble, isSolved, slide, neighbours } from '../src/games/hanukkah-slide.view.js';
import { solved, baseOf } from '../src/games/hanukkah-saveflame.view.js';
import { jumble } from '../src/games/hanukkah-jumble.view.js';
import { numberChoices } from '../src/games/hanukkah-count.view.js';
import { buildPairs } from '../src/games/hanukkah-pairs.view.js';
import { PICTURES, regionsOf, assignLetters } from '../src/games/hanukkah-colour.view.js';
import { rms } from '../src/games/hanukkah-candles.view.js';
import { clusters, isPointed } from '../src/games/hanukkah-shell.js';
import { seededRandom } from '../src/games/arcade.model.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const json = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
const W = json('data/games/hanukkah/words.json');
const D = json('data/games/hanukkah/dreidel.json');
const C = json('data/games/hanukkah/candles.json');
const players = [{ id: 'you', name: 'You', human: true }, { id: 'rimon', name: 'Rimon' }, { id: 'ari', name: 'Ari' }, { id: 'noa', name: 'Noa' }];
const total = (g) => g.pot + g.players.reduce((s, p) => s + p.gelt, 0);

// ---------------- dreidel rules ----------------
test('dreidel: equal start, everyone antes one, turn order starts with the first player', () => {
  const g = createDreidelGame({ players, start: 10 });
  assert.deepEqual(g.players.map((p) => p.gelt), [9, 9, 9, 9]);
  assert.equal(g.pot, 4); assert.equal(currentPlayer(g).id, 'you'); assert.equal(total(g), 40);
  assert.equal(g.log[0].type, 'ante'); assert.deepEqual(g.log[0].paid, ['you', 'rimon', 'ari', 'noa']);
});

test('dreidel: Nun does nothing and passes the turn', () => {
  const g = createDreidelGame({ players, start: 10 });
  const ev = applyFace(g, 'nun');
  assert.equal(ev.rule, 'none'); assert.equal(ev.took, 0); assert.equal(ev.put, 0);
  assert.equal(g.pot, 4); assert.equal(g.players[0].gelt, 9); assert.equal(currentPlayer(g).id, 'rimon');
});

test('dreidel: Gimel takes the whole pot, then the empty pot makes everyone ante again', () => {
  const g = createDreidelGame({ players, start: 10 });
  const ev = applyFace(g, 'gimel');
  assert.equal(ev.took, 4); assert.equal(ev.potBefore, 4);
  assert.deepEqual(ev.reAnte, ['you', 'rimon', 'ari', 'noa']);
  assert.equal(g.players[0].gelt, 9 + 4 - 1); assert.equal(g.pot, 4); assert.equal(total(g), 40);
});

test('dreidel: Hey takes half, rounding up an odd pot (5 gives 3; 1 gives 1), and the screen line shows the rounding', () => {
  assert.equal(heyShare(4), 2); assert.equal(heyShare(5), 3); assert.equal(heyShare(1), 1); assert.equal(heyShare(0), 0); assert.equal(heyShare(7), 4);
  assert.match(heyExplain(5), /2½\. Round up: take 3/); assert.match(heyExplain(6), /Half of 6 is 3\. Take 3/);
  const g = createDreidelGame({ players, start: 10 });
  applyFace(g, 'shin'); // you put one in: pot 5
  assert.equal(g.pot, 5);
  const ev = applyFace(g, 'hey'); // rimon takes 3 of 5
  assert.equal(ev.took, 3); assert.equal(g.players[1].gelt, 12); assert.equal(g.pot, 2); assert.equal(ev.reAnte, null);
  assert.equal(total(g), 40);
});

test('dreidel: Hey that leaves one piece re-antes; Shin and Pe put one in', () => {
  const g = createDreidelGame({ players: players.slice(0, 2), start: 10 }); // pot 2
  const ev = applyFace(g, 'hey'); // take 1, pot 1 -> re-ante
  assert.equal(ev.took, 1); assert.deepEqual(ev.reAnte, ['you', 'rimon']); assert.equal(g.pot, 3);
  const s = applyFace(g, 'shin');
  assert.equal(s.rule, 'put'); assert.equal(s.put, 1); assert.equal(g.pot, 4);
  const p = applyFace(g, 'pe');
  assert.equal(p.rule, 'put'); assert.equal(g.pot, 5);
  assert.equal(total(g), 20);
});

test('dreidel: a player with no gelt left is out, is skipped, and the last player with gelt wins', () => {
  const g = createDreidelGame({ players: players.slice(0, 3), start: 2 }); // each 1, pot 3
  let ev = applyFace(g, 'shin'); // you pay your last piece: out
  assert.deepEqual(ev.out, ['you']); assert.equal(g.players[0].out, true);
  assert.equal(currentPlayer(g).id, 'rimon');
  ev = applyFace(g, 'nun'); assert.equal(currentPlayer(g).id, 'ari', 'you are skipped');
  ev = applyFace(g, 'shin'); // ari pays last piece: out, rimon alone
  assert.ok(ev.out.includes('ari')); assert.equal(ev.over, true); assert.deepEqual(ev.winners, ['rimon']);
  assert.equal(activePlayers(g).length, 1);
  assert.throws(() => applyFace(g, 'nun'), /over/);
});

test('dreidel: a short game ends after maxSpins and the most gelt wins (ties shared)', () => {
  const g = createDreidelGame({ players: players.slice(0, 2), start: 5, maxSpins: 2 });
  applyFace(g, 'nun'); const ev = applyFace(g, 'nun');
  assert.equal(ev.over, true); assert.deepEqual(ev.winners.sort(), ['rimon', 'you']);
  const h = createDreidelGame({ players: players.slice(0, 2), start: 5, maxSpins: 1 });
  assert.deepEqual(applyFace(h, 'gimel').winners, ['you']);
});

test('dreidel: long random games always conserve the gelt and end with a winner', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const rnd = seededRandom(seed);
    const g = createDreidelGame({ players, start: 1 + (seed % 9) + 1, variant: seed % 2 ? 'israel' : 'diaspora' });
    let n = 0;
    while (!g.over && n < 5000) { applyFace(g, spinFace(g.variant, rnd)); n++; assert.equal(total(g), g.start * 4); assert.ok(g.pot >= 0); assert.ok(g.players.every((p) => p.gelt >= 0)); }
    assert.ok(g.over, 'game ended ' + seed); assert.equal(g.winners.length, 1);
  }
});

test('dreidel: the spin is fair (each face about a quarter of 40,000 spins) and fairIndex stays in range', () => {
  const counts = { nun: 0, gimel: 0, hey: 0, shin: 0 };
  for (let i = 0; i < 40000; i++) counts[spinFace('diaspora')]++;
  for (const k of Object.keys(counts)) assert.ok(Math.abs(counts[k] - 10000) < 600, `${k}: ${counts[k]}`);
  for (let i = 0; i < 1000; i++) { const x = fairIndex(4); assert.ok(x >= 0 && x < 4 && Number.isInteger(x)); }
  assert.equal(fairIndex(4, () => 0.999999), 3); assert.equal(fairIndex(4, () => 0), 0);
  assert.deepEqual([...FACES.israel], ['nun', 'gimel', 'hey', 'pe']);
  const israeli = new Set(); for (let i = 0; i < 400; i++) israeli.add(spinFace('israel'));
  assert.ok(israeli.has('pe') && !israeli.has('shin'));
});

test('dreidel: the result sentence names the letter, the rule and any re-ante', () => {
  const g = createDreidelGame({ players, start: 10 });
  const ev = applyFace(g, 'gimel');
  const line = describe(ev, { you: 'You' }, { gimel: { he: 'ג', name: 'Gimel' } });
  assert.match(line, /You spun ג Gimel\. Takes the whole pot: 4\./); assert.match(line, /everyone puts one in/);
});

// ---------------- candle order ----------------
test('candles: placed right to left (holder 1 is right-most), lit shamash first then newest (left-most) first', () => {
  assert.deepEqual(placementOrder(1), [1]);
  assert.deepEqual(placementOrder(3), [1, 2, 3]);
  assert.deepEqual(lightingOrder(1), [SHAMASH, 1]);
  assert.deepEqual(lightingOrder(3), [SHAMASH, 3, 2, 1]);
  assert.deepEqual(lightingOrder(8), [SHAMASH, 8, 7, 6, 5, 4, 3, 2, 1]);
  assert.deepEqual(placementOrder(12), placementOrder(8)); assert.deepEqual(placementOrder(0), [1]);
  // on screen holder 8 is left-most and holder 1 right-most, shamash in the middle
  assert.equal(VISUAL_ORDER[0], 8); assert.equal(VISUAL_ORDER.at(-1), 1); assert.equal(VISUAL_ORDER[4], SHAMASH);
});

test('candles: the step checker refuses out-of-order taps and accepts the right order to the end', () => {
  const L = createLighting(3);
  assert.equal(L.phase, 'place'); assert.equal(L.expected, 1);
  assert.equal(L.tap(3).ok, false); assert.equal(L.tap(3).reason, 'place-order');
  assert.equal(L.tap(SHAMASH).reason, 'shamash-stays');
  for (const t of [1, 2, 3]) assert.equal(L.tap(t).ok, true);
  assert.equal(L.phase, 'light'); assert.equal(L.expected, SHAMASH);
  assert.equal(L.tap(1).reason, 'light-order');
  assert.equal(L.tap(SHAMASH).ok, true);
  assert.equal(L.tap(1).ok, false, 'oldest candle is not first');
  for (const t of [3, 2]) assert.equal(L.tap(t).ok, true);
  const last = L.tap(1); assert.equal(last.ok, true); assert.equal(last.done, true); assert.equal(L.phase, 'done');
  assert.deepEqual([...L.lit].sort(), [1, 2, 3, SHAMASH].sort());
});

// ---------------- data ----------------
const HEB = /^[א-ת֑-ׇ׳״ ,.?!׃־'"/]+$/;
test('data: every Hanukkah word is pointed Hebrew with a transliteration and an English gloss; vocab entries match words.json', () => {
  const vocab = new Map(json('data/vocab/words.json').words.map((w) => [w.id, w]));
  const phrasebook = new Map(); (function walk(o) { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (typeof o.id === 'string' && o.he) phrasebook.set(o.id, o); Object.values(o).forEach(walk); } })(json('data/corpus/phrasebook.json'));
  const keys = new Set();
  for (const w of W.words) {
    assert.ok(!keys.has(w.key), 'unique key ' + w.key); keys.add(w.key);
    assert.match(w.he, HEB, w.key); assert.ok(isPointed(w.he), 'pointed: ' + w.key + ' ' + w.he);
    assert.ok(w.translit && w.en, w.key);
    for (const cl of clusters(w.he)) assert.ok(cl.length >= 1);
    if (w.id) {
      const v = vocab.get(w.id); assert.ok(v, 'vocab id ' + w.id);
      if (w.src === 'vocab') { assert.equal(w.he, v.he, w.key); assert.equal(w.translit, v.translit, w.key); }
      else assert.equal(w.he.normalize('NFC'), v.he.normalize('NFC'), w.key);
    } else if (String(w.src).startsWith('phrasebook:')) assert.equal(w.he, phrasebook.get(w.src.slice(11))?.he, 'same as the phrasebook: ' + w.key);
    else assert.ok(w.review && w.review.length > 10, 'a word in neither words.json nor the phrasebook carries a review note: ' + w.key);
  }
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) assert.ok(W.words.some((w) => w.key === 'num' + n && w.n === n));
  for (const k of ['sevivon', 'levivot', 'sufganiyot', 'chanukiya', 'makabim', 'nes', 'gadol', 'haya', 'sham', 'po', 'cham', 'kar']) assert.ok(keys.has(k), k);
  assert.equal(W.words.find((w) => w.key === 'sevivon').he, 'סְבִיבוֹן');
  assert.equal(W.words.find((w) => w.key === 'chanukiya').he, 'חֲנֻכִּיָּה');
});

test('data: cards point at real words with forbidden lists; hot-or-cold bands are ordered, pointed and cover every distance', () => {
  const keys = new Set(W.words.map((w) => w.key));
  assert.ok(W.cards.length >= 20);
  for (const c of W.cards) { assert.ok(keys.has(c.key), c.key); assert.ok(c.forbidden.length >= 3, c.key); }
  const maxes = W.clues.map((c) => c.max);
  assert.deepEqual(maxes, [...maxes].sort((a, b) => a - b));
  for (const c of W.clues) { assert.ok(isPointed(c.he), c.he); assert.match(c.he, HEB); }
  for (let d = 1; d <= 12; d++) assert.ok(clueFor(d, W.clues.filter((x) => x.max > 0)));
  assert.equal(clueFor(1, W.clues).he, 'חַם מְאוֹד'); assert.equal(clueFor(9, W.clues).he, 'קַר מְאוֹד');
});

test('data: dreidel letters, the phrase in both forms, and the Israeli Pe note', () => {
  assert.deepEqual(D.faces.diaspora, ['nun', 'gimel', 'hey', 'shin']); assert.deepEqual(D.faces.israel, ['nun', 'gimel', 'hey', 'pe']);
  assert.equal(D.phrase.diaspora.he, 'נֵס גָּדוֹל הָיָה שָׁם'); assert.equal(D.phrase.israel.he, 'נֵס גָּדוֹל הָיָה פֹּה');
  const byKey = new Map(W.words.map((w) => [w.key, w]));
  for (const v of ['diaspora', 'israel']) {
    const ph = D.phrase[v];
    assert.equal(ph.words.map((k) => byKey.get(k).he).join(' '), ph.he, v);
    ph.words.forEach((k, i) => assert.equal([...byKey.get(k).he][0], D.letters[D.faces[v][i]].he, 'first letter is on the dreidel: ' + k));
  }
  const letters = new Map(json('data/letters/letters.json').map((l) => [l.id, l]));
  for (const [face, l] of Object.entries(D.letters)) {
    assert.ok(letters.has(l.letterId), face); assert.equal(letters.get(l.letterId).he, l.he, face);
    assert.ok(isPointed(l.nameHe), l.nameHe); assert.ok(byKey.has(l.word), l.word);
    assert.ok(['none', 'all', 'half', 'put'].includes(l.rule));
  }
  assert.match(D.israelNote, /פ/); assert.match(D.houseRules.join(' '), /round up/i);
});

test('data: blessings are text with the divine Name as ה׳, never spelled out, each matching the registry text', () => {
  const reg = json('data/corpus/registry.json');
  const items = Array.isArray(reg) ? reg : Object.values(reg).find(Array.isArray);
  const byId = new Map(items.map((x) => [x.id, x]));
  assert.equal(C.blessings.length, 3);
  for (const b of C.blessings) {
    assert.ok(b.he.includes('ה׳'), b.id); assert.ok(!/יְהוָה|יהוה|יְהֹוָה/.test(b.he), b.id);
    assert.ok(isPointed(b.he)); assert.ok(b.en && b.name);
    assert.equal(b.he, byId.get(b.id).he.replace('יְהוָה', 'ה׳'), 'same text as the registry: ' + b.id);
  }
  assert.match(C.afterNote, /burn down on their own/);
  assert.ok(!/audio|mp3/.test(readFileSync(root + 'src/games/hanukkah-candles.view.js', 'utf8').match(/function showBlessings[\s\S]*?\n {2}}\n/)[0]), 'the blessings panel plays nothing');
});

// ---------------- routes and catalogue ----------------
test('catalogue and routes: every Hanukkah game has a view file, a preview route, a label, a section, a privacy row, a triage row and a level', () => {
  assert.equal(HANUKKAH_GAMES.length, 13);
  assert.equal(new Set(HANUKKAH_GAMES.map((g) => g.id)).size, 13);
  assert.equal(ARCADE_GAMES.length, 30 + TG_GAMES.length, 'the arcade rotation is the thirty games plus the Torah and Hebrew games; Hanukkah games stay in their own list');
  assert.ok(!HANUKKAH_GAMES.some((g) => ARCADE_GAMES.some((a) => a.id === g.id)));
  const listed = new Set(STORE_KEYS.map((r) => r[0]));
  const learn = new Set(SECTION_ROUTES.learn);
  const triage = readFileSync(root + 'docs/v0/PREVIEW-TRIAGE.md', 'utf8');
  for (const g of HANUKKAH_GAMES) {
    assert.match(g.id, /^hanukkah-[a-z0-9]+$/);
    assert.ok(existsSync(`${root}src/games/${g.id}.view.js`), g.id);
    const { route } = matchRoute('#/' + g.id);
    assert.equal(route?.name, g.id); assert.equal(route.module, `../games/${g.id}.view.js`); assert.equal(tierOf(route), 'preview'); assert.equal(route.owner, 'games');
    assert.equal(route.title, g.title);
    assert.equal(NAV_EN['nav.route.' + g.id], g.title);
    assert.ok(learn.has(g.id) && PREVIEW_HIDDEN.has(g.id), 'section and hub-only ' + g.id);
    assert.ok(listed.has(`games.${g.id}.v1`), 'privacy row ' + g.id);
    assert.ok(VIEW_FILES.includes(`games/${g.id}.view.js`), 'generated view list ' + g.id);
    assert.match(triage, new RegExp('^\\| `' + g.id + '` \\| hide \\|', 'm'));
    assert.ok(g.level >= 1 && g.level <= 5 && g.title && g.titleHe && g.tag);
    assert.ok(isPointed(g.titleHe), g.titleHe);
    // Title Case: every word of four letters or more starts with a capital
    for (const word of g.title.split(/[\s,-]+/)) if (word.length >= 4) assert.match(word, /^[A-Z]/, g.title);
  }
  const lvl = Object.fromEntries(HANUKKAH_GAMES.map((g) => [g.id, g.level]));
  assert.equal(lvl['hanukkah-dreidel1'], 1); assert.equal(lvl['hanukkah-dreidel2'], 2);
  assert.equal(ROUTES.filter((r) => r.name.startsWith('hanukkah-')).length, 13);
  assert.equal(nextGame('hanukkah-dreidel1').id, 'hanukkah-dreidel2'); assert.equal(nextGame(HANUKKAH_GAMES.at(-1).id).id, HANUKKAH_GAMES[0].id);
  assert.equal(nextGame('letterchomp').id, ARCADE_GAMES[1].id, 'arcade hand-off unchanged');
  assert.match(readFileSync(root + 'src/shell/privacy.view.js', 'utf8'), /Candle Blow-Out game[^']*nothing else: no sound is recorded, saved or sent/);
});

test('hub: one Hanukkah section links every Hanukkah game', async () => {
  environment();
  const { hanukkahSection } = await import('../src/games/games.view.js');
  const s = hanukkahSection();
  const links = s.querySelectorAll('a').map((a) => a.getAttribute('href'));
  assert.deepEqual(links, HANUKKAH_GAMES.map((g) => '#/' + g.id));
  assert.match(s.querySelector('h2').textContent, /^Hanukkah Games/);
});

// ---------------- pure helpers of the word games ----------------
test('word-game helpers: gelt distance, party deck and points, slide puzzle, hangman, jumble, counting, pairs, colouring, loudness', () => {
  assert.equal(distance([0, 0], [[2, 1], [0, 3]]), 3); assert.equal(distance([1, 1], []), Infinity);
  const deck = createDeck([1, 2, 3], seededRandom(2)); const seen = [deck.next(), deck.next(), deck.next()];
  assert.deepEqual([...seen].sort(), [1, 2, 3]); assert.ok([1, 2, 3].includes(deck.next()));
  assert.equal(points('forbidden', 'mistake'), -1); assert.equal(points('charades', 'mistake'), 0); assert.equal(points('charades', 'hebrew'), 2); assert.equal(points('charades', 'got'), 1);
  for (let s = 1; s < 40; s++) {
    const tiles = [...'סביבון'].slice(0, 5).map((ch, home) => ({ ch, home }));
    const b = scramble(tiles, 2, 3, 20, seededRandom(s));
    assert.equal(isSolved(b), false); assert.equal(b.filter((x) => x === null).length, 1);
  }
  const b = [{ home: 0 }, { home: 1 }, null, { home: 2 }]; // 2x2, gap at 2
  assert.equal(slide(b, 1, 2, 2), false, 'diagonal does not slide'); assert.equal(slide(b, 3, 2, 2), true); assert.equal(isSolved(b), true);
  assert.deepEqual(neighbours(0, 2, 3).sort(), [1, 3]);
  assert.equal(baseOf('ם'), 'מ'); assert.equal(solved('שָׁלוֹם', new Set(['ש', 'ל', 'ו', 'מ'])), true); assert.equal(solved('נֵר', new Set(['נ'])), false);
  for (let s = 1; s < 30; s++) { const j = jumble([...'שמן'], seededRandom(s)); assert.notEqual(j.join(''), 'שמן'); assert.deepEqual([...j].sort(), [...'שמן'].sort()); }
  for (let s = 1; s < 30; s++) { const o = numberChoices(3, 8, 4, seededRandom(s)); assert.equal(o.length, 4); assert.ok(o.includes(3)); assert.equal(new Set(o).size, 4); }
  const pairs = buildPairs(W.words.slice(0, 10), 4, seededRandom(1)); assert.equal(pairs.length, 8);
  for (let i = 0; i < 4; i++) assert.equal(pairs.filter((c) => c.pair === i).length, 2);
  for (const pic of Object.values(PICTURES)) { const r = regionsOf(pic); assert.ok(r.length >= 3 && r.length <= 4); assert.ok(pic.rows.every((row) => row.length === pic.rows[0].length)); for (const look of [false, true]) { const L = assignLetters(r, look, seededRandom(3)); assert.equal(new Set(Object.values(L)).size, r.length); } }
  assert.equal(rms(new Uint8Array(64).fill(128)), 0); assert.ok(rms(Uint8Array.from({ length: 64 }, (_, i) => (i % 2 ? 255 : 0))) > 0.9);
});

// ---------------- every game mounts and plays a little ----------------
function environment() {
  const doc = new Doc(); globalThis.document = doc;
  El.prototype.append = function (...nodes) { for (const n of nodes) if (n != null) this.appendChild(typeof n === 'object' ? n : doc.createTextNode(String(n))); };
  El.prototype.prepend = function (...nodes) { for (const n of nodes.reverse()) if (n != null) this.insertBefore(typeof n === 'object' ? n : doc.createTextNode(String(n)), this.childNodes[0] || null); };
  El.prototype.replaceChildren = function (...nodes) { this.textContent = ''; this.append(...nodes); };
  El.prototype.remove = function () { this.parentNode?.removeChild(this); };
  El.prototype.closest = function () { return null; };
  Object.defineProperty(El.prototype, 'lastChild', { configurable: true, get() { return this.childNodes[this.childNodes.length - 1] || null; } });
  Object.defineProperty(El.prototype, 'classList', { configurable: true, get() {
    const el = this; const list = () => (el.className || '').split(/\s+/).filter(Boolean);
    return { add: (...c) => { el.className = [...new Set([...list(), ...c])].join(' '); }, remove: (...c) => { el.className = list().filter((x) => !c.includes(x)).join(' '); }, contains: (c) => list().includes(c), toggle: (c, on) => { const has = list().includes(c); const want = on === undefined ? !has : !!on; el.className = want ? [...new Set([...list(), c])].join(' ') : list().filter((x) => x !== c).join(' '); } };
  } });
  Object.defineProperty(El.prototype, 'isConnected', { configurable: true, get: () => true });
  const listeners = new Map(), frames = new Map(); let frameId = 0;
  globalThis.window = { addEventListener: (k, f) => listeners.set(k, f), removeEventListener: (k, f) => { if (listeners.get(k) === f) listeners.delete(k); } };
  globalThis.requestAnimationFrame = (f) => { frames.set(++frameId, f); return frameId; };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  return { root: doc.createElement('main'), listeners };
}
const fetchFn = async (url) => { const p = String(url).startsWith('file:') ? fileURLToPath(url) : String(url); return { ok: existsSync(p), status: existsSync(p) ? 200 : 404, json: async () => JSON.parse(readFileSync(p, 'utf8')) }; };
const calm = { get: (k) => (k === 'calmMode' ? true : k === 'soundEffects' ? false : undefined) };
const wait = async (f, n = 400) => { for (let i = 0; i < n && !f(); i++) await new Promise((r) => setTimeout(r, 5)); assert.ok(f(), 'condition reached'); };
const buttons = (el) => el.querySelectorAll('button').filter((b) => !b.disabled && b.getAttribute('disabled') === null);
const byText = (el, re) => buttons(el).find((b) => re.test(b.textContent));
const newCtx = () => { const mem = new Map(); return { mem, ctx: { store: { get: (k) => mem.get(k), set: (k, v) => mem.set(k, v) }, settings: calm, fetchFn, images: { resolve: () => null }, audio: null, route: { query: {} } } }; };

for (const g of HANUKKAH_GAMES.filter((x) => x.kind === 'arcade')) {
  test(`${g.id}: mounts in the arcade shell, starts level 1, draws a board, answers a tap, unmounts cleanly`, async () => {
    const mod = await import(`../src/games/${g.id}.view.js`);
    assert.equal(mod.STORE_KEY, `games.${g.id}.v1`);
    const env = environment(); const { ctx } = newCtx();
    const stop = await mod.mount(env.root, ctx);
    await wait(() => env.root.querySelector('.arc-start'));
    assert.ok(env.root.querySelector('h1').textContent.startsWith(g.title));
    assert.equal(env.root.querySelectorAll('.arc-level').length, 5);
    env.root.querySelector('.arc-start').click();
    const board = env.root.querySelector('.arc-board');
    await wait(() => buttons(board).length > 0);
    assert.ok(env.listeners.has('keydown'));
    buttons(board)[0].click(); // any first tap must not throw
    assert.ok(env.root.querySelector('.arc-status').textContent.length > 0);
    stop();
    assert.ok(!env.listeners.has('keydown'), 'key handler removed');
  });
}

test('hanukkah-dreidel1: a full short game plays to the end, saves the best score and offers the next game', async () => {
  const mod = await import('../src/games/hanukkah-dreidel1.view.js');
  const env = environment(); const { ctx, mem } = newCtx();
  const stop = await mod.mount(env.root, ctx);
  await wait(() => byText(env.root, /Start the Game/));
  assert.match(env.root.textContent, /נֵס גָּדוֹל הָיָה שָׁם/); assert.match(env.root.textContent, /פ/);
  byText(env.root, /Start the Game/).click();
  for (let i = 0; i < 40 && !env.root.querySelector('.game-results'); i++) {
    const b = byText(env.root, /^Spin$|^Next Turn/); assert.ok(b, 'a spin button each turn'); b.click();
    assert.match(env.root.textContent, /Rule:/);
  }
  assert.ok(env.root.querySelector('.game-results'), 'game ended within 16 spins');
  assert.equal(mem.get('games.hanukkah-dreidel1.v1').plays, 1);
  assert.ok(env.root.querySelectorAll('a').some((a) => a.getAttribute('href') === '#/hanukkah-dreidel2'));
  stop();
});

test('hanukkah-dreidel2: the learner names the letter and the rule before the gelt moves; the Israeli dreidel can be chosen', async () => {
  const mod = await import('../src/games/hanukkah-dreidel2.view.js');
  const env = environment(); const { ctx } = newCtx();
  const stop = await mod.mount(env.root, ctx);
  await wait(() => byText(env.root, /Start the Game/));
  const israel = env.root.querySelectorAll('input').find((x) => x.getAttribute('value') === 'israel');
  israel.dispatch('change');
  assert.match(env.root.textContent, /נֵס גָּדוֹל הָיָה פֹּה/);
  byText(env.root, /Start the Game/).click();
  byText(env.root, /^Spin$/).click();
  await wait(() => byText(env.root, /^(Nun|Gimel|Hey|Pe)$/));
  const potBefore = env.root.querySelector('.hk-pot').textContent;
  byText(env.root, /^(Nun|Gimel|Hey|Pe)$/).click();
  await wait(() => byText(env.root, /^(Nothing|Take all|Take half|Put one in)$/));
  assert.equal(env.root.querySelector('.hk-pot').textContent, potBefore, 'nothing moved before the rule was chosen');
  assert.ok(!buttons(env.root).some((b) => /^Shin$/.test(b.textContent)), 'Israeli dreidel has no Shin');
  byText(env.root, /^(Nothing|Take all|Take half|Put one in)$/).click();
  await wait(() => byText(env.root, /^Next Turn/));
  assert.match(env.root.textContent, /Rule:/);
  stop();
});

test('hanukkah-candles: night 2 needs right-to-left placing, shamash, blessings (text, ה׳), newest first; tap blow finishes', async () => {
  const mod = await import('../src/games/hanukkah-candles.view.js');
  const env = environment(); const { ctx, mem } = newCtx();
  const stop = await mod.mount(env.root, ctx);
  await wait(() => byText(env.root, /^Night 2$/));
  byText(env.root, /^Night 2$/).click();
  const holder = (t) => env.root.querySelector(`[data-holder="${t}"]`);
  holder(2).click(); assert.match(env.root.querySelector('.arc-status').textContent, /from the right/);
  holder(1).click(); holder(2).click();
  holder(1).click(); assert.match(env.root.querySelector('.arc-status').textContent, /shamash first/);
  holder('shamash').click();
  assert.match(env.root.textContent, /The Blessings/); assert.match(env.root.textContent, /ה׳/); assert.ok(!/שֶׁהֶחֱיָינוּ/.test(env.root.textContent), 'Shehecheyanu is the first night only');
  byText(env.root, /I Have Read Them/).click();
  holder(1).click(); assert.match(env.root.querySelector('.arc-status').textContent, /newest candle first/);
  holder(2).click(); holder(1).click();
  assert.match(env.root.textContent, /All the Lights Are Lit/);
  for (let i = 0; i < 3; i++) byText(env.root, /^Blow \(Tap\)$/)?.click();
  assert.ok(env.root.querySelector('.game-results'));
  assert.equal(mem.get('games.hanukkah-candles.v1').lastStars, 1, 'three slips cost stars');
  stop();
});

for (const id of ['hanukkah-charades', 'hanukkah-forbidden']) {
  test(`${id}: teams, pass the phone, card with Hebrew, transliteration and English, scoring, end of game`, async () => {
    const mod = await import(`../src/games/${id}.view.js`);
    const env = environment(); const { ctx, mem } = newCtx();
    const stop = await mod.mount(env.root, ctx);
    await wait(() => byText(env.root, /Start the Party/));
    assert.equal(env.root.querySelector('select').querySelectorAll('option').find((o) => o.getAttribute('selected') !== null).getAttribute('value'), '0', 'calm mode starts with no timer');
    env.root.querySelectorAll('select')[1].value = '2';
    byText(env.root, /Start the Party/).click();
    for (let t = 0; t < 4; t++) {
      assert.match(env.root.textContent, /Pass the Phone to Team (Ari|Noa)/);
      byText(env.root, /Show the Card/).click();
      const card = env.root.querySelector('.hk-cardface');
      assert.ok(card.querySelector('[lang="he"]')); assert.match(card.textContent, /·/);
      if (id === 'hanukkah-forbidden') { assert.ok(card.querySelector('.hk-forbid')); byText(env.root, /Mistake/).click(); }
      byText(env.root, /Said in Hebrew/).click();
      byText(env.root, /^End Turn$/).click();
    }
    assert.ok(env.root.querySelector('.game-results'));
    assert.match(env.root.textContent, /Team Ari: \d+/);
    assert.equal(mem.get(`games.${id}.v1`).plays, 1);
    stop();
  });
}

for (const g of HANUKKAH_GAMES.filter((x) => x.kind === 'arcade')) {
  test(`${g.id}: all five levels build a board and survive 80 random taps`, async () => {
    const mod = await import(`../src/games/${g.id}.view.js`);
    for (let level = 1; level <= 5; level++) {
      const env = environment(); const { ctx, mem } = newCtx();
      mem.set(`games.${g.id}.v1`, { unlocked: 5 });
      ctx.route = { query: { level: String(level) } };
      const stop = await mod.mount(env.root, ctx);
      await wait(() => env.root.querySelector('.arc-start'));
      env.root.querySelector('.arc-start').click();
      const board = env.root.querySelector('.arc-board');
      await wait(() => buttons(board).length > 0);
      assert.doesNotMatch(env.root.querySelector('.arc-status').textContent, /could not|No word of the right length/, `${g.id} level ${level}`);
      const rnd = seededRandom(level * 7);
      for (let i = 0; i < 80; i++) {
        const live = buttons(board); if (!live.length) break;
        live[Math.floor(rnd() * live.length)].click();
        if (i % 10 === 0) await new Promise((r) => setTimeout(r, 1));
      }
      stop();
    }
  });
}
