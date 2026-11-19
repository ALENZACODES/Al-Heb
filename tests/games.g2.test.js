// Words by topic (src/games/g2-*): core rules, every word in the data checked against the app's own sources, the
// divine-name rule, catalogue and routes, and every level of every game played in the fake DOM until the results card.
// Logic and wiring checks only; the Hebrew still needs a native speaker's review (see the notes in data/games/g2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Doc, El } from './wordtrace.fakedom.js';
import { matchRoute, tierOf, ROUTES } from '../src/shell/router.js';
import { NAV_EN } from '../src/shell/nav.strings.js';
import { SECTION_ROUTES, PREVIEW_HIDDEN } from '../src/shell/nav-model.js';
import { STORE_KEYS } from '../src/shell/privacy.view.js';
import { VIEW_FILES } from '../src/shell/views.generated.js';
import { ARCADE_GAMES, HANUKKAH_GAMES } from '../src/games/arcade.catalog.js';
import { G2_GAMES, G2_IDS } from '../src/games/g2-catalog.js';
import { findName } from '../src/shell/names.js';
import { seededRandom } from '../src/games/arcade.model.js';
import { BANK } from '../src/games/tugowar.bank.js';
import {
  indexData, pickTopics, deck, oddSet, endingOf, predictedGender, breaksRule, genderPool, lineupItems, cycle, stepIn, mixOf, chainValue,
  oppositeMap, dominoHand, cluesFor, clueBoard, trailPath, adjacent, pickGroups, letters, hiveWord, oneStep, changedAt, ladderDistractors,
  letterQuestion, CLOSE,
} from '../src/games/g2-core.js';
import { nextG2 } from '../src/games/g2-ui.js';
import { popWord } from '../src/games/g2-popup.view.js';
import { lineFor } from '../src/games/g2-lineup.view.js';
import { deal, hasPair } from '../src/games/g2-snap.view.js';
import { endingDeck } from '../src/games/g2-endings.view.js';
import { dayQuestion, stepWords } from '../src/games/g2-dayafter.view.js';
import { trailBoard } from '../src/games/g2-trail.view.js';
import { judgePick } from '../src/games/g2-fourgroups.view.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const json = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
const WORDS = json('data/games/g2/words.json'), SETS = json('data/games/g2/sets.json');
const D = indexData(WORDS, SETS.sets);
const V5 = new Map(json('data/vocab/vocab5000.json').entries.map((e) => [e.id, e]));
const WL = new Map(json('data/vocab/words.json').words.map((w) => [w.id, w]));
const FIRST = new Map(json('data/games/firstwords.json').words.map((w) => [w.id, w]));
const POINTED = /[ְ-ׇּׁׂ]/;
const HEB = /[א-ת]/;
const BAD_TAGS = ['needs-check', 'rare-sense', 'form', 'biblical'];
const BAD_REASONS = /^(pointing and gloss not native-reviewed|added|register|rank lowered|noun without gender|verb without)/;

/** Every copied word is checked against the file its id points to. */
function checkCopy(w, where) {
  assert.ok(w && w.he && w.en, `${where}: a word record`);
  assert.match(w.he, POINTED, `${where}: ${w.he} is pointed`);
  if (w.id.startsWith('v')) {
    const e = V5.get(w.id);
    assert.ok(e, `${where}: ${w.id} is in data/vocab/vocab5000.json`);
    assert.equal(e.pointed, w.he, `${where}: ${w.he} copied unchanged from vocab5000`);
    assert.ok(e.gloss.toLowerCase().includes(w.en.toLowerCase()), `${where}: "${w.en}" is part of the gloss "${e.gloss}"`);
    assert.ok(!e.needsPointing && !(e.tags || []).some((t) => BAD_TAGS.includes(t)), `${where}: ${w.he} is not a flagged entry`);
  } else if (w.id.startsWith('book:')) {
    assert.ok(readFileSync(root + w.id.slice(5), 'utf8').includes(w.he), `${where}: ${w.he} copied from ${w.id.slice(5)}`);
  } else {
    const s = WL.get(w.id);
    assert.ok(s && s.he === w.he, `${where}: ${w.he} copied unchanged from data/vocab/words.json`);
    assert.ok(s.en.toLowerCase().includes(w.en.toLowerCase()) || FIRST.get(w.id)?.en.toLowerCase().includes(w.en.toLowerCase()), `${where}: "${w.en}" is part of its gloss`);
  }
  if (w.w) {
    const s = WL.get(w.w);
    assert.ok(s && s.he === w.he, `${where}: word-list twin ${w.w} has the same pointed form`);
    assert.ok(!(s.flags?.reasons || []).some((r) => BAD_REASONS.test(r)), `${where}: ${w.he} word-list twin is not an unreviewed addition`);
    if (w.tr !== undefined) assert.equal(w.tr, s.translit, `${where}: transliteration copied`);
    if (w.g !== undefined) assert.equal(w.g, s.gender, `${where}: gender copied`);
  } else assert.ok(w.tr === undefined && w.g === undefined, `${where}: tr and g only come with a word-list twin`);
}

// ---------- core rules ----------
test('endings and gender: -ah and -t endings, the rule of thumb and its rule-breakers', () => {
  assert.equal(endingOf('עוּגָה'), 'ah'); assert.equal(endingOf('דֶּלֶת'), 't'); assert.equal(endingOf('חָזֶה'), 'none'); assert.equal(endingOf('יָד'), 'none');
  assert.equal(predictedGender('מִטָּה'), 'f'); assert.equal(predictedGender('כֶּלֶב'), 'm');
  assert.ok(breaksRule({ he: 'יָד', g: 'f' })); assert.ok(!breaksRule({ he: 'עוּגָה', g: 'f' })); assert.ok(!breaksRule({ he: 'מוֹרֶה', g: 'm' }));
  const pool = genderPool(D);
  assert.ok(pool.length >= 150);
  for (const he of SETS.sets.genderSkip) assert.ok(!pool.some((w) => w.he === he), `${he} left out of the gender games`);
  assert.ok(pool.filter(breaksRule).length >= 10, 'enough rule-breakers for level 4');
  const d = endingDeck(D, 12, 0.5, seededRandom(3));
  assert.equal(d.length, 12); assert.equal(d.filter(breaksRule).length, 6);
});

test('cycles: the week and the year wrap round; line-ups resolve to words; day questions count right', () => {
  const days = cycle(D, 'days'), months = cycle(D, 'months');
  assert.equal(days.length, 7); assert.equal(months.length, 12); assert.equal(cycle(D, 'seasons').length, 4);
  assert.equal(stepIn(days, 6, 1).en, 'Sunday'); assert.equal(stepIn(days, 0, -1).en, 'Shabbat'); assert.equal(stepIn(months, 11, 2).en, 'February');
  assert.deepEqual(days.map((w) => w.en), ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbat']);
  for (const lu of SETS.sets.lineups) { const items = lineupItems(D, lu); assert.ok(items.length >= 3 && items.every(Boolean), lu.id); }
  const part = lineFor(D, 'months-part', seededRandom(5));
  assert.equal(part.items.length, 6);
  for (let i = 1; i < 6; i++) assert.equal(months.indexOf(part.items[i]), (months.indexOf(part.items[i - 1]) + 1) % 12);
  for (let s = 0; s < 40; s++) {
    const q = dayQuestion(D, ['days', 'months', 'seasons', 'times'], [1, -1, 2, -2, 3], seededRandom(s));
    assert.equal(q.answer, q.list[(q.list.indexOf(q.from) + q.k + q.list.length * 3) % q.list.length]);
  }
  assert.equal(stepWords(1, 'day'), 'the day after'); assert.equal(stepWords(-2, 'month'), '2 months before');
});

test('paint, chains and opposites', () => {
  assert.equal(mixOf(D, 'צָהֹב', 'אָדֹם'), 'כָּתֹם'); assert.equal(mixOf(D, 'אָדֹם', 'צָהֹב'), 'כָּתֹם'); assert.equal(mixOf(D, 'אָדֹם', 'אָדֹם'), null);
  for (const [a, b, c] of SETS.sets.mixes) for (const x of [a, b, c]) assert.equal(D.word(x)?.topic, 'colours', x);
  for (const he of D.items('colours').map((w) => w.he)) assert.ok(SETS.sets.swatch[he], `swatch for ${he}`);
  for (const [thing, col] of SETS.sets.colourOf) { assert.ok(D.word(thing), thing); assert.equal(D.word(col)?.topic, 'colours'); }
  assert.equal(chainValue(1), 2); assert.equal(chainValue(4), 20); assert.equal(chainValue(6), 42);
  const pairs = SETS.sets.opposites, m = oppositeMap(pairs);
  for (let s = 0; s < 30; s++) {
    const open = pairs[s % pairs.length].a.he;
    const hand = dominoHand(pairs, open, 5, seededRandom(s), s % 2 === 0);
    assert.equal(hand.length, 5);
    const right = hand.filter((t) => t.match >= 0);
    assert.equal(right.length, 1);
    assert.equal(right[0].halves[right[0].match].he, m.get(open).opp.he);
    for (const t of hand) t.halves.forEach((h, i) => { if (t.match !== i) assert.notEqual(h.he, m.get(open).opp.he); });
  }
});

test('letters: hive words, ladder steps and distractors, letter-and-topic questions', () => {
  assert.equal(letters('מִטְבָּח'), 'מטבח'); assert.equal(letters('שָׁלוֹם'), 'שלומ');
  assert.ok(oneStep('מֶלַח', 'מִלָּה')); assert.ok(!oneStep('מֶלַח', 'חֹרֶף')); assert.equal(changedAt('מֶלַח', 'מִלָּה'), 2);
  const h = SETS.sets.hives[0];
  const w = h.words[0];
  assert.equal(hiveWord(h, letters(w.he)), w); assert.equal(hiveWord(h, 'אאא'), null);
  const all = Object.values(SETS.sets.ladders).flat();
  for (const lad of all) {
    for (let i = 0; i + 1 < lad.length; i++) {
      const wrong = ladderDistractors(all.flat(), lad, lad[i], 4, seededRandom(i), i % 2 === 0);
      assert.ok(wrong.length >= 2, 'enough wrong rungs');
      for (const x of wrong) assert.ok(!oneStep(lad[i].he, x.he), `${x.he} is not one step from ${lad[i].he}`);
    }
  }
  for (let s = 0; s < 60; s++) {
    const where = s % 2 ? 'end' : 'start';
    const q = letterQuestion(D, 5, seededRandom(s), where);
    assert.ok(q, 'a question');
    const at = (x) => (where === 'end' ? letters(x.he).slice(-1) : letters(x.he)[0]);
    assert.equal(q.options.filter((x) => x.topic === q.topic && at(x) === q.letter).length, 1, 'exactly one option fits both');
    assert.equal(q.options.length, 5);
  }
});

test('boards: odd sets, decks, snaps, trails, groups and clues', () => {
  for (let s = 0; s < 30; s++) {
    const rnd = seededRandom(s);
    const o = oddSet(D, 6, rnd, s % 2 === 0);
    assert.equal(o.words.length, 6); assert.equal(o.words.filter((w) => w.topic !== o.main).length, 1); assert.notEqual(o.odd.topic, o.main);
    const ids = pickTopics(D, 4, rnd, true);
    assert.equal(new Set(ids).size, 4); assert.ok(CLOSE.some(([a, b]) => ids.includes(a) && ids.includes(b)));
    const dk = deck(D, ids, 14, rnd);
    assert.equal(dk.length, 14); assert.ok(dk.every((w) => ids.includes(w.topic)));
    const dl = deal(D, ids, 3, rnd);
    assert.equal(dl.length, 3); assert.equal(new Set(dl.map((w) => w.he)).size, 3); assert.equal(typeof hasPair(dl), 'boolean');
    const path = trailPath(5, 6, rnd);
    assert.equal(path[0][1], 0); assert.equal(path[path.length - 1][1], 5);
    for (let i = 1; i < path.length; i++) assert.ok(adjacent(path[i - 1], path[i]));
    assert.equal(new Set(path.map((p) => p.join())).size, path.length);
    const b = trailBoard(D, 'animals', 5, 6, 3, rnd);
    for (const [r, c] of b.path) assert.equal(b.cells[r][c].topic, 'animals');
    const g = pickGroups(D, 4, 4, rnd, true);
    assert.equal(g.length, 4); assert.ok(g.every((x) => x.words.length === 4 && x.words.every((w) => w.topic === x.topic)));
    assert.equal(judgePick(g[0].words, 4), 'right'); assert.equal(judgePick([...g[0].words.slice(0, 3), g[1].words[0]], 4), 'one-away');
    for (const meaning of [true, false]) {
      const cb = clueBoard(D, 12, rnd, { meaning });
      assert.ok(cb.cards.includes(cb.target)); assert.ok(cb.cards.length >= 9);
      const left = cb.cards.filter((w) => cb.clues.every((c) => c.fits(w)));
      assert.deepEqual(left, [cb.target], 'all the clues together settle it');
    }
    const t = cluesFor(D, D.word('כֶּלֶב'));
    assert.equal(t[0].kind, 'topic'); assert.equal(t[t.length - 1].kind, 'meaning');
    assert.ok(popWord(D, 'food', ['animals'], rnd));
  }
});

// ---------- data against the app's sources ----------
test('topic words: copied from the word lists; pointed; one topic each; enough per topic', () => {
  assert.deepEqual(Object.keys(WORDS.topics), ['food', 'home', 'body', 'family', 'colours', 'animals', 'clothes', 'weather', 'school', 'work', 'places', 'travel']);
  const seen = new Set();
  for (const [id, t] of Object.entries(WORDS.topics)) {
    assert.ok(t.items.length >= 11, `${id} has enough words`);
    checkCopy(t.label, `${id} label`);
    for (const w of t.items) { checkCopy(w, id); assert.ok(!seen.has(w.he), `${w.he} is in one topic only`); seen.add(w.he); assert.ok(!w.he.includes(' ')); }
  }
  for (const w of SETS.sets.extra) checkCopy(w, 'extra');
  assert.ok(WORDS.note && WORDS.review && SETS.note && SETS.review);
});

test('sets: every word they name exists; opposites are the Tug-of-War bank rows unchanged; ladders and hives follow their rules', () => {
  const S = SETS.sets;
  const known = (he, where) => assert.ok(D.word(he), `${where}: ${he}`);
  S.genderSkip.forEach((he) => known(he, 'genderSkip'));
  S.family.forEach((x) => { known(x.he, 'family'); assert.equal(D.word(x.he).topic, 'family'); assert.ok(x.label && x.rel); });
  [...S.body.face, ...S.body.figure].forEach((x) => { known(x.he, 'body'); assert.equal(D.word(x.he).topic, 'body'); assert.ok(x.x >= 0 && x.x <= 100 && x.y >= 0 && x.y <= 100); });
  const clueWords = S.places.flatMap((p) => { known(p.place, 'place'); p.clues.forEach((c) => known(c, `clue for ${p.place}`)); return p.clues; });
  assert.equal(new Set(clueWords).size, clueWords.length, 'each clue points to one place only');
  for (const lu of S.lineups) if (Array.isArray(lu.items)) lu.items.forEach((he) => known(he, lu.id));
  const bank = new Map(BANK.map((r) => [r[0], r]));
  const used = new Set();
  for (const p of S.opposites) {
    const r = bank.get(p.key);
    assert.ok(r, p.key);
    assert.deepEqual([p.a.he, p.a.tr, p.a.en, p.b.he, p.b.tr, p.b.en], [r[1], r[2], r[3], r[4], r[5], r[6]], `${p.key} copied unchanged`);
    for (const he of [p.a.he, p.b.he]) { assert.ok(!used.has(he), `${he} in one pair only`); used.add(he); assert.match(he, POINTED); }
  }
  assert.ok(S.opposites.length >= 20);
  const ladders = Object.values(S.ladders).flat();
  assert.ok(ladders.length >= 30);
  for (const lad of ladders) {
    assert.ok(lad.length >= 4);
    lad.forEach((w, i) => { checkCopy(w, 'ladder'); if (i) assert.ok(oneStep(lad[i - 1].he, w.he), `${lad[i - 1].he} → ${w.he}`); });
  }
  assert.ok(S.hives.length >= 12);
  for (const h of S.hives) {
    assert.equal(h.letters.length, 7); assert.ok(h.letters.includes(h.centre));
    assert.ok(h.words.length >= 5);
    for (const w of h.words) {
      checkCopy(w, 'hive');
      assert.ok([...letters(w.he)].every((c) => h.letters.includes(c)), `${w.he} uses only the hive letters`);
      assert.ok(letters(w.he).includes(h.centre) && letters(w.he).length >= 3);
    }
  }
});

test('the divine name: no spelling of it anywhere in the g2 data or code', () => {
  for (const f of readdirSync(`${root}data/games/g2`)) assert.equal(findName(readFileSync(`${root}data/games/g2/${f}`, 'utf8')).filter((w) => w.kind !== 'abbrev').length, 0, f);
  for (const w of D.byHe.values()) assert.doesNotMatch(w.en, /\b(god|lord)\b/i, w.he);
});

// ---------- catalogue, routes and file rules ----------
test('catalogue: twenty g2 games, levels 2 to 4, routes, labels, hub-only, privacy and triage rows, view list, on-demand files', () => {
  assert.equal(G2_GAMES.length, 20); assert.deepEqual(G2_IDS, G2_GAMES.map((g) => g.id));
  for (const band of ['beginner', 'intermediate', 'upper']) assert.ok(G2_GAMES.filter((g) => g.band === band).length >= 5, band);
  const listed = new Set(STORE_KEYS.map((r) => r[0]));
  const triage = readFileSync(`${root}docs/v0/PREVIEW-TRIAGE.md`, 'utf8');
  const manifest = readFileSync(`${root}precache-manifest.js`, 'utf8');
  const onDemand = JSON.parse(manifest.match(/ALEF_ON_DEMAND = (\[[\s\S]*?\]);/)[1]);
  const heSources = new Set([...V5.values()].map((e) => e.pointed).concat([...WL.values()].map((w) => w.he), [...D.byHe.keys()]));
  const otherTitles = new Set(ROUTES.filter((r) => !r.name.startsWith('g2-')).map((r) => r.title));
  for (const g of G2_GAMES) {
    assert.match(g.id, /^g2-[a-z]+$/);
    assert.ok(g.level >= 2 && g.level <= 4, g.id);
    assert.ok(!ARCADE_GAMES.some((x) => x.id === g.id) && !HANUKKAH_GAMES.some((x) => x.id === g.id), 'kept out of the arcade rotation');
    assert.ok(existsSync(`${root}src/games/${g.id}.view.js`));
    const { route } = matchRoute('#/' + g.id);
    assert.equal(route?.module, `../games/${g.id}.view.js`); assert.equal(route.title, g.title); assert.equal(tierOf(route), 'preview');
    assert.equal(NAV_EN['nav.route.' + g.id], g.title);
    assert.ok(SECTION_ROUTES.learn.includes(g.id) && PREVIEW_HIDDEN.has(g.id), 'learn section, hub-only');
    assert.ok(listed.has(`games.${g.id}.v1`));
    assert.match(triage, new RegExp('^\\| `' + g.id + '` \\| hide \\|', 'm'));
    assert.ok(VIEW_FILES.includes(`games/${g.id}.view.js`));
    assert.ok(onDemand.includes(`src/games/${g.id}.view.js`));
    assert.match(g.titleHe, POINTED); assert.ok(heSources.has(g.titleHe), `${g.titleHe} comes from the app's word lists`);
    assert.match(g.title, /^[A-Z0-9][^ ]*( (?:and|or|of|the|to|in|[A-Z0-9][^ ]*))*$/, `Title Case: ${g.title}`);
    assert.ok(!otherTitles.has(g.title), `${g.title} is not another page's name`);
    assert.ok(g.tag && g.art && !/\b(letter|word|text)s? (on|in) the picture/i.test(g.art));
  }
  for (const f of ['src/games/g2-core.js', 'src/games/g2-ui.js', 'src/games/g2-catalog.js', 'data/games/g2/words.json', 'data/games/g2/sets.json']) assert.ok(onDemand.includes(f), f);
  assert.equal(nextG2('g2-firstletter').id, 'g2-sortrush'); assert.equal(nextG2('g2-sortrush').id, 'g2-oddone');
});

test('g2 files stay self-contained: only arcade, tg, g2 and shell imports; no made-up voice; no written divine name', () => {
  const files = readdirSync(`${root}src/games`).filter((f) => f.startsWith('g2-'));
  assert.equal(files.length, 23);
  for (const f of files) {
    const src = readFileSync(`${root}src/games/${f}`, 'utf8');
    for (const [, spec] of src.matchAll(/from '([^']+)'/g)) assert.match(spec, /^(\.\/(tg-core|tg-ui|g2-[a-z]+|arcade|arcade\.model)\.js|\.\.\/shell\/[a-z.-]+\.js)$/, `${f} imports ${spec}`);
    assert.doesNotMatch(src, /speechSynthesis|SpeechSynthesisUtterance/, `${f} never makes up a voice`);
    assert.doesNotMatch(src, /יְהוָה|יהוה/, `${f} has no written divine name`);
    assert.doesNotMatch(src, new RegExp('\\b(' + ['AI','Chat'+'GPT','Cla'+'ude','G'+'PT'].join('|') + ')\\b'), `${f}: outside-tool name`);
  }
});

test('games hub: one g2 section, loading the catalogue on demand', async () => {
  const doc = new Doc(); globalThis.document = doc;
  El.prototype.append = function (...nodes) { for (const n of nodes) if (n != null) this.appendChild(typeof n === 'object' ? n : doc.createTextNode(String(n))); };
  El.prototype.replaceChildren = function (...nodes) { this.textContent = ''; this.append(...nodes); };
  const { g2Section } = await import('../src/games/games.view.js');
  const s = g2Section();
  for (let i = 0; i < 50 && s.querySelectorAll('a').length < 20; i++) await new Promise((r) => setImmediate(r));
  const links = s.querySelectorAll('a').map((a) => a.getAttribute('href'));
  assert.deepEqual(links.slice().sort(), G2_IDS.map((id) => '#/' + id).sort());
  assert.match(s.textContent, /Word Games by Topic/);
});

// ---------- every level of every game, played in the fake DOM ----------
function environment() {
  const doc = new Doc(); globalThis.document = doc;
  El.prototype.append = function (...nodes) { for (const n of nodes) if (n != null) this.appendChild(typeof n === 'object' ? n : doc.createTextNode(String(n))); };
  El.prototype.prepend = function (...nodes) { for (const n of nodes.reverse()) if (n != null) this.insertBefore(typeof n === 'object' ? n : doc.createTextNode(String(n)), this.childNodes[0]); };
  El.prototype.replaceChildren = function (...nodes) { this.textContent = ''; this.append(...nodes); };
  El.prototype.remove = function () { this.parentNode?.removeChild(this); };
  El.prototype.closest = function () { return null; };
  Object.defineProperty(El.prototype, 'classList', { configurable: true, get() {
    const el = this; const list = () => (el.className || '').split(/\s+/).filter(Boolean);
    return { add: (...c) => { el.className = [...new Set([...list(), ...c])].join(' '); }, remove: (...c) => { el.className = list().filter((x) => !c.includes(x)).join(' '); }, contains: (c) => list().includes(c), toggle: (c, on) => { const has = list().includes(c); const want = on === undefined ? !has : !!on; el.className = want ? [...new Set([...list(), c])].join(' ') : list().filter((x) => x !== c).join(' '); } };
  } });
  Object.defineProperty(El.prototype, 'isConnected', { configurable: true, get: () => true });
  const listeners = new Map();
  globalThis.window = { addEventListener: (k, f) => listeners.set(k, f), removeEventListener: (k, f) => { if (listeners.get(k) === f) listeners.delete(k); } };
  globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {};
  return { root: doc.createElement('main'), listeners };
}
const fetchFn = async (url) => { const p = String(url).startsWith('file:') ? fileURLToPath(url) : String(url); return { ok: existsSync(p), status: existsSync(p) ? 200 : 404, json: async () => JSON.parse(readFileSync(p, 'utf8')) }; };
const settings = { get: (k) => (k === 'soundEffects' ? false : undefined) };
const realTimeout = globalThis.setTimeout;
const turn = () => new Promise((r) => setImmediate(r));
const spaced = (n) => (n.nodeType === 3 ? n.data : (n.childNodes || []).map(spaced).join(' '));
const enabled = (el) => el.querySelectorAll('button').filter((b) => !b.disabled && b.getAttribute('disabled') === null);
const heOf = (el) => el?.querySelector('.g2-he')?.textContent || '';
const byText = (bs, t) => bs.find((b) => b.textContent.trim() === t);

/**
 * A player who knows the answers, for the games where random tapping cannot finish or score: it plays the right move
 * most of the time and a random one otherwise. Returns true when it pressed something.
 */
const SOLVERS = {
  'g2-chain'(board, rnd) {
    const bs = enabled(board.querySelector('.arc-choices') || board);
    const big = board.querySelector('.g2-big');
    if (!bs.length || !big || rnd() < 0.3) return false;
    const he = heOf(big);
    const want = he ? D.word(he)?.en : [...D.byHe.values()].find((w) => `"${w.en}"` === big.textContent.trim())?.he;
    const b = bs.find((x) => x.textContent.trim() === want);
    if (b) b.click();
    return !!b;
  },
  'g2-fourgroups'(board) {
    const words = board.querySelector('.g2-grid');
    const bs = enabled(board), check = byText(bs, 'Check');
    if (check) { check.click(); return true; }
    const cells = words.querySelectorAll('button');
    const on = cells.filter((b) => b.className.includes('is-on'));
    const topic = on.length ? D.word(heOf(on[0])).topic : null;
    const pick = cells.find((b) => !b.className.includes('is-on') && (!topic || D.word(heOf(b)).topic === topic));
    if (pick) pick.click();
    return !!pick;
  },
  'g2-hive'(board, rnd) {
    const tiles = board.querySelector('.g2-hive').querySelectorAll('button');
    const set = tiles.map((b) => b.textContent).sort().join('');
    const h = SETS.sets.hives.find((x) => x.letters.slice().sort().join('') === set);
    const found = board.querySelector('.g2-found').textContent;
    const w = h.words.find((x) => !found.includes(x.he));
    if (!w) return false;
    for (const c of letters(w.he)) tiles.find((b) => b.textContent === c).click();
    byText(enabled(board), 'Enter').click();
    return true;
  },
};

async function play(id, level, maxClicks = 30000) {
  const mod = await import(`../src/games/${id}.view.js`);
  const env = environment();
  const mem = new Map([[`games.${id}.v1`, { unlocked: 5 }]]); const store = { get: (k) => mem.get(k), set: (k, v) => mem.set(k, v) };
  globalThis.setTimeout = (fn, ms, ...a) => realTimeout(fn, Math.min(ms || 0, 1), ...a); // the get-ready count and round pauses run fast
  try {
    const stop = await mod.mount(env.root, { store, settings, fetchFn, images: { resolve: () => null }, audio: null, route: { query: { level: String(level) } } });
    for (let i = 0; i < 400 && !env.root.querySelector('.arc-start'); i++) await turn();
    env.root.querySelector('.arc-start').click();
    const board = env.root.querySelector('.arc-board');
    let ready = false;
    for (let i = 0; i < 3000 && !ready; i++) { await turn(); ready = enabled(board).length > 0; }
    assert.ok(ready, `${id} level ${level}: the board has something to press (its data loaded)`);
    const rnd = seededRandom(level * 31 + id.length);
    let clicks = 0, best = 0, text = '';
    const hudScore = () => Number((env.root.querySelector('.arc-hud-item')?.textContent || '').replace(/\D+/g, '')) || 0;
    while (clicks < maxClicks && !env.root.querySelector('.arc-results-card')) {
      if (!(SOLVERS[id]?.(board, rnd))) { const bs = enabled(board); if (bs.length) bs[Math.floor(rnd() * bs.length)].click(); }
      clicks++; best = Math.max(best, hudScore());
      if (clicks % 25 === 1) text += spaced(board);
      await turn();
    }
    const card = env.root.querySelector('.arc-results-card');
    const next = card?.querySelectorAll('a').find((a) => a.textContent.startsWith('Next:'))?.getAttribute('href');
    text += spaced(board);
    stop();
    assert.ok(!env.listeners.has('keydown'), 'key handler removed on unmount');
    return { finished: !!card, score: best, text, clicks, next, rec: mem.get(`games.${id}.v1`) };
  } finally { globalThis.setTimeout = realTimeout; }
}

test('timed games: the fuse burns out, unsnapped cards move on and pantry words hide by themselves (frames driven by hand)', async () => {
  for (const [id, level, expect] of [['g2-sortrush', 5, /Too slow/], ['g2-snap', 5, /Gone by|That was a pair/], ['g2-popup', 1, null]]) {
    const mod = await import(`../src/games/${id}.view.js`);
    const env = environment();
    const frames = [];
    globalThis.requestAnimationFrame = (f) => { frames.push(f); return frames.length; };
    const realNow = Date.now;
    globalThis.setTimeout = (fn, ms, ...a) => realTimeout(fn, Math.min(ms || 0, 1), ...a);
    try {
      const mem = new Map([[`games.${id}.v1`, { unlocked: 5 }]]);
      const stop = await mod.mount(env.root, { store: { get: (k) => mem.get(k), set: (k, v) => mem.set(k, v) }, settings, fetchFn, audio: null, route: { query: { level: String(level) } } });
      for (let i = 0; i < 400 && !env.root.querySelector('.arc-start'); i++) await turn();
      env.root.querySelector('.arc-start').click();
      const board = env.root.querySelector('.arc-board');
      for (let i = 0; i < 3000 && !(enabled(board).length && HEB.test(spaced(board)) && frames.length); i++) await turn(); // data loaded, loop running
      const before = spaced(board);
      Date.now = () => realNow() + 10000; // past the get-ready count
      let t = 0;
      let status = ''; // every status line seen (the count-in may still write "Go!" over the last one)
      for (let k = 0; k < 120; k++) { const f = frames.splice(0); t += 100; for (const fn of f) fn(t); await turn(); status += env.root.querySelector('.arc-status').textContent + ' | '; }
      if (expect) assert.match(status, expect, `${id}: ${status}`);
      else assert.notEqual(spaced(board), before, 'the pantry words changed on their own');
      stop();
    } finally { Date.now = realNow; globalThis.setTimeout = realTimeout; globalThis.requestAnimationFrame = () => 0; }
  }
});

for (const g of G2_GAMES) {
  test(`${g.id}: every level loads its data and plays through to the results card`, async () => {
    for (let level = 1; level <= 5; level++) {
      const r = await play(g.id, level);
      assert.ok(r.finished, `${g.id} level ${level} finished (${r.clicks} taps)`);
      assert.ok(r.score > 0, `${g.id} level ${level}: at least one right answer scored`);
      assert.ok(r.rec?.levels?.[level]?.plays === 1, 'best score saved for the level');
      assert.equal(r.next, '#/' + nextG2(g.id).id, 'the results card hands on to the next word game');
      assert.ok(HEB.test(r.text), `${g.id} level ${level} shows Hebrew`);
      assert.equal(findName(r.text).filter((w) => w.kind !== 'abbrev').length, 0, `${g.id} level ${level} never shows the written name`);
    }
  });
}
