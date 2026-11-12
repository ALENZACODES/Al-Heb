// Holiday, Shabbat and prayer games (src/games/g5-*): core rules, every copied record checked against its source in the
// app's data, the divine-name rule, catalogue and routes, and every level of every game played in the fake DOM to the
// results card. Logic and wiring checks only: the Hebrew that carries a `review` note in data/games/g5 is not claimed correct.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Doc, El } from './wordtrace.fakedom.js';
import { matchRoute, tierOf } from '../src/shell/router.js';
import { NAV_EN } from '../src/shell/nav.strings.js';
import { SECTION_ROUTES, PREVIEW_HIDDEN } from '../src/shell/nav-model.js';
import { STORE_KEYS } from '../src/shell/privacy.view.js';
import { VIEW_FILES } from '../src/shell/views.generated.js';
import { ARCADE_GAMES, HANUKKAH_GAMES } from '../src/games/arcade.catalog.js';
import { TG_GAMES } from '../src/games/tg-catalog.js';
import { G5_GAMES, G5_IDS } from '../src/games/g5-catalog.js';
import { findName } from '../src/shell/names.js';
import { seededRandom } from '../src/games/arcade.model.js';
import {
  showName, hasName, tokens, excerpt, clean, stripPrefix, shortEn, callSequence, echoProgress, beatPicture, brokenRules, randomSukkah,
  CHAPTERS, chapterIndex, roll, fewestRolls, deal, basketProblems, gaps, weeksDays, dayOf, countLine, scramble, placed, fewestSwaps, pairs, nextIn,
} from '../src/games/g5-core.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const json = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
const g5 = (name) => json(`data/games/g5/${name}.json`);
const verse = (r) => json(`data/corpus/torah/${r.book}/${String(r.chapter).padStart(2, '0')}.json`).verses[r.verse - 1];
const POINTED = /[ְ-ׇּׁׂ]/;

// ---------- sources, for checking every copied record ----------
const WORDS = new Map(json('data/vocab/words.json').words.map((w) => [w.id, w]));
const DAYS = json('data/calendar/days.json').days;
const VOCAB = new Map(json('data/festivals/vocab.json').packs.map((p) => [p.id, p]));
const PHRASE = new Map(json('data/corpus/phrasebook.json').entries.map((e) => [e.id, e]));
const LEX = new Map(json('data/curriculum/lesson-lexicon.json').entries.map((e) => [e.id, e]));
const ART = new Map(json('data/library/articles.json').articles.map((a) => [a.id, a]));
const REG = new Map(json('data/corpus/registry.json').entries.map((e) => [e.id, e]));

/** Check one copied record against the source named in its `src`; returns the kind. */
function checkRecord(r, where) {
  const s = r.src;
  assert.ok(s?.kind, `${where}: has a source`);
  const he = r.he;
  if (s.kind === 'words') { const w = WORDS.get(s.id); assert.ok(w, `${where}: word ${s.id}`); assert.equal(he, w.he, where); assert.equal(r.en, w.en, where); }
  else if (s.kind === 'days') { const w = DAYS[s.day].words[s.i]; assert.equal(he, w.he, where); assert.equal(r.en, w.en, where); assert.equal(r.tr, w.tr, where); }
  else if (s.kind === 'days-token') assert.equal(he, tokens(DAYS[s.day].words[s.i].he)[s.t], where);
  else if (s.kind === 'vocab') { const w = VOCAB.get(s.pack).words.find((x) => x.id === s.id); assert.ok(w, where); assert.equal(he, w.he, where); assert.equal(he, WORDS.get(s.id).he, `${where}: the pack copy matches the word list`); }
  else if (s.kind === 'phrasebook') { const e = PHRASE.get(s.id); assert.equal(he, e.he, where); assert.equal(r.en, e.en, where); }
  else if (s.kind === 'lexicon') { const e = LEX.get(s.id); assert.equal(he, e.he, where); assert.equal(r.en, e.en, where); }
  else if (s.kind === 'days-name') { const x = DAYS[s.day]; assert.equal(he, x.he, where); assert.equal(r.en, x.en, where); }
  else if (s.kind === 'article-term') { const t = ART.get(s.article).terms[s.i]; assert.equal(he, t.he, where); }
  else if (s.kind === 'registry') { const e = REG.get(s.id); assert.ok(e, where); assert.equal(he, showName(excerpt(e.he, s.from, s.to)), where); }
  else if (s.kind === 'verse') { const v = verse(r.ref); assert.ok(r.to <= tokens(v.he).length, where); assert.equal(he, excerpt(v.he, r.from, r.to), where); }
  else if (s.kind === 'review') assert.ok(r.review && r.review.length > 10, `${where}: Hebrew not in the app data carries a review note`);
  else assert.fail(`${where}: unknown source ${s.kind}`);
  if (he) { assert.match(he, POINTED, `${where}: pointed`); assert.equal(hasName(he), false, `${where}: no written divine name`); }
  return s.kind;
}
/** Every object with a `src` inside a data file. */
function records(x, path = '', out = []) {
  if (Array.isArray(x)) x.forEach((y, i) => records(y, `${path}[${i}]`, out));
  else if (x && typeof x === 'object') { if (x.src) out.push([x, path]); for (const [k, v] of Object.entries(x)) if (k !== 'src') records(v, `${path}.${k}`, out); }
  return out;
}

// ---------- core rules ----------
test('display helpers: trailing sof pasuq dropped, a leading "and" stripped, English brackets cut', () => {
  assert.equal(clean('נֵר שֶׁל שַׁבָּת׃'), 'נֵר שֶׁל שַׁבָּת');
  assert.equal(stripPrefix('וּשְׂעֹרָה'), 'שְׂעֹרָה');
  assert.equal(shortEn('a good week (said after Havdalah)'), 'a good week');
});

test('shofar: sequences use only the allowed calls and never three in a row; the echo stops at the first wrong call', () => {
  for (let s = 1; s < 40; s++) {
    const q = callSequence(6, ['tekiah', 'teruah'], seededRandom(s));
    assert.equal(q.length, 6); assert.ok(q.every((c) => ['tekiah', 'teruah'].includes(c)));
    for (let i = 2; i < q.length; i++) assert.ok(!(q[i] === q[i - 1] && q[i] === q[i - 2]));
  }
  assert.equal(echoProgress(['a', 'b', 'c'], ['a', 'b']), 2);
  assert.equal(echoProgress(['a', 'b', 'c'], ['a', 'c']), 1);
  const d = g5('shofar');
  const by = Object.fromEntries(d.calls.map((c) => [c.id, c]));
  assert.equal(by.tekiah.beats.length, 1); assert.equal(by.shevarim.beats.length, 3); assert.equal(by.teruah.beats.length, 9);
  assert.match(beatPicture(by.teruah.beats), /^(• ){8}•$/);
  for (const set of d.sets) { assert.equal(set.calls[0], 'tekiah'); assert.equal(set.calls[set.calls.length - 1], 'tekiah'); for (const c of set.calls) assert.ok(by[c], c); }
});

test('sukkah: a finished sukkah breaks exactly the rules of its wrong choices; random sukkot are fine or break one rule', () => {
  const d = g5('sukkah');
  for (const st of d.steps) { assert.ok(st.options.some((o) => o.ok), st.id); for (const o of st.options) if (!o.ok) assert.ok(d.rules[o.rule], o.id); }
  assert.deepEqual(brokenRules(d.steps, { place: 'yard', walls: 'w4', roof: 'branches', cover: 'shady' }), []);
  assert.deepEqual(brokenRules(d.steps, { place: 'tree', walls: 'w1', roof: 'metal', cover: 'thin' }), ['sky', 'walls', 'schach', 'shade']);
  for (let s = 1; s < 30; s++) {
    assert.equal(brokenRules(d.steps, randomSukkah(d.steps, true, seededRandom(s))).length, 0);
    assert.equal(brokenRules(d.steps, randomSukkah(d.steps, false, seededRandom(s))).length, 1);
  }
});

test('scroll: 187 chapters in order; rolls stop at the ends; fewest rolls by breadth-first search', () => {
  assert.equal(CHAPTERS.length, 187);
  assert.deepEqual(CHAPTERS[0], { book: 'genesis', chapter: 1 }); assert.deepEqual(CHAPTERS[186], { book: 'deuteronomy', chapter: 34 });
  assert.equal(chapterIndex('exodus', 1), 50);
  assert.equal(roll(0, -10), 0); assert.equal(roll(186, 10), 186);
  assert.equal(fewestRolls(5, 5), 0); assert.equal(fewestRolls(0, 11), 2); assert.equal(fewestRolls(0, 9), 2); assert.equal(fewestRolls(186, 0), 19);
  for (const t of g5('scroll').targets) { const v = verse(t); assert.ok(v && v.n === t.verse, `${t.book} ${t.chapter}:${t.verse}`); assert.ok(chapterIndex(t.book, t.chapter) >= 0); }
});

test('deal, gaps, pairs, the omer count and the basket rule', () => {
  const c = deal([{ id: 't' }], [{ id: 'a' }, { id: 'b' }], 10, 0.3, seededRandom(3));
  assert.equal(c.length, 10); assert.equal(c.filter((x) => x.target).length, 3);
  const g = gaps(15, 5, seededRandom(2)); assert.equal(new Set(g).size, 5); assert.deepEqual(g, [...g].sort((a, b) => a - b));
  assert.deepEqual(weeksDays(23), { weeks: 3, days: 2 }); assert.equal(dayOf(7, 0), 49);
  assert.equal(countLine(5), '5 days'); assert.equal(countLine(14), '14 days, which is 2 weeks'); assert.equal(countLine(9), '9 days, which is 1 week and 2 days');
  const cake = { he: 'א', group: 'sweet' }, apple = { he: 'ב', group: 'fruit' }, cheese = { he: 'ג', group: 'dairy' };
  assert.equal(basketProblems([cake]).length, 1);
  assert.deepEqual(basketProblems([cake, apple], { sweet: true, fruit: true }), []);
  assert.equal(basketProblems([cake, cake], {}).length, 1, 'two of the same food is one kind');
  assert.equal(basketProblems([cake, cheese], { noDairy: true }).length, 1);
  assert.equal(basketProblems([cake, apple], { exactly: 3 }).length, 1);
  const p = pairs([{ he: 'a', title: '1' }, { he: 'a', title: '2' }, { he: 'b', title: '1' }, { he: 'c', title: '3' }], 3, seededRandom(1));
  assert.equal(new Set(p.map((x) => x.he)).size, p.length); assert.equal(new Set(p.map((x) => x.title)).size, p.length);
});

test('siddur mend: a scramble is never the line itself; placed counts by text; fewest swaps is exact without repeats', () => {
  const line = ['א', 'ב', 'ג', 'ד', 'ה'];
  for (let s = 1; s < 40; s++) {
    const o = scramble(5, 2, seededRandom(s));
    assert.notDeepEqual(o, [0, 1, 2, 3, 4]); assert.deepEqual([...o].sort(), [0, 1, 2, 3, 4]);
    assert.ok(fewestSwaps(line, o) <= 2 && fewestSwaps(line, o) >= 1);
  }
  assert.equal(placed(line, [1, 0, 2, 3, 4]), 3);
  assert.equal(fewestSwaps(line, [1, 2, 0, 3, 4]), 2);
  const rep = ['x', 'y', 'x'];
  assert.equal(placed(rep, [2, 1, 0]), 3, 'repeated words fit either of their places');
  assert.notDeepEqual(scramble(3, 1, seededRandom(1), (w, i) => rep[w] === rep[i]).map((w) => rep[w]), rep);
});

// ---------- data against the app's sources ----------
test('every g5 data file has a schema and note, and every copied record matches its source', () => {
  const files = readdirSync(`${root}data/games/g5`);
  assert.equal(files.length, 16);
  const kinds = new Map();
  for (const f of files) {
    const d = g5(f.replace(/\.json$/, ''));
    assert.ok(d.schema && d.note, f);
    const raw = readFileSync(`${root}data/games/g5/${f}`, 'utf8');
    assert.equal(findName(raw).filter((w) => w.kind !== 'abbrev').length, 0, `${f}: no written divine name in the game data`);
    for (const [r, path] of records(d)) { const k = checkRecord(r, f + path); kinds.set(k, (kinds.get(k) || 0) + 1); }
  }
  assert.ok(kinds.get('words') > 30 && kinds.get('days') > 30 && kinds.get('registry') > 40 && kinds.get('verse') > 15, JSON.stringify([...kinds]));
});

test('verses: every slice the games show is a word slice of the app\'s Torah text; readings name the reference they cite', () => {
  for (const s of g5('species').species) { const v = verse(s.phrase.ref); assert.equal(excerpt(v.he, s.phrase.from, s.phrase.to), s.phrase.he); }
  const lv = verse({ book: 'leviticus', chapter: 23, verse: 40 });
  assert.equal(hasName(excerpt(lv.he, 4, 12)), false, 'the four-species summary line holds no divine name');
  for (const s of g5('sevenspecies').species) assert.ok(stripPrefix(s.phrase?.he || s.he, 0).length > 1);
  assert.equal(stripPrefix(g5('sevenspecies').species.find((s) => s.id === 'barley').he, 1), 'שְׂעֹרָה');
  for (const it of g5('readings').items) {
    assert.ok(it.reading.includes(it.cite), it.day);
    assert.ok(DAYS[it.day].readings.includes(it.reading), it.day);
    assert.ok(verse(it.ref), it.day);
  }
  const days = new Set(g5('greetings').scenes.map((s) => s.day));
  for (const d of days) assert.ok(DAYS[d], d);
  const tgYear = new Map(json('data/games/tg/holidays.json').year.map((y) => [y.id, y.date]));
  for (const s of g5('greetings').scenes) if (tgYear.has(s.day)) assert.equal(s.when, tgYear.get(s.day), s.day);
});

test('prayers: orders copied from the service guide; every card is a word slice of its registry entry', () => {
  const p = g5('prayers'), guide = new Map(json('data/corpus/torah-service-guide.json').otherOccasions.map((o) => [o.id, o]));
  assert.deepEqual(p.orders['shabbat-evening'], guide.get('shabbat-evening').prayers);
  assert.deepEqual(p.orders.havdalah, guide.get('havdalah').prayers);
  assert.deepEqual(p.evening.map((c) => c.id), p.orders['shabbat-evening']);
  assert.deepEqual(p.havdalah.map((c) => c.id), p.orders.havdalah);
  const s = g5('siddur');
  assert.ok(s.lines.length >= 15);
  for (const l of s.lines) { assert.equal(l.src.from, 0); assert.match(REG.get(l.id).he.split(/\s+/)[l.src.to - 1], /׃$/, `${l.id} ends at its first sof pasuq`); }
  const f = tokens(s.formula.he).length;
  for (const b of s.blessings) {
    assert.ok(tokens(showName(REG.get(b.id).he)).slice(0, f).join(' ') === s.formula.he, `${b.id} opens with the formula`);
    assert.equal(b.title, REG.get(b.id).title);
    assert.ok(b.src.to > b.tells, `${b.id}: the words shown include the word that tells it apart`);
  }
  assert.equal(new Set(s.blessings.map((b) => b.he)).size, s.blessings.length, 'no two blessings show the same words');
});

test('seder, Purim, Shabbat and the rest: shapes the games rely on', () => {
  const sd = g5('seder');
  assert.equal(sd.steps.length, 15); assert.equal(sd.plate.length, 6);
  assert.equal(new Set(sd.plate.map((x) => x.slot)).size, 6);
  assert.equal(sd.questions.items.length, 4);
  for (const c of sd.questions.clues) assert.ok(sd.questions.items.some((q) => q.id === c.q));
  const pu = g5('purim');
  assert.equal(pu.haman.he, 'הָמָן');
  for (const w of [...pu.stream, ...pu.lookalikes]) assert.notEqual(w.he, pu.haman.he);
  for (const g of ['sweet', 'fruit', 'dairy', 'bread', 'nuts']) assert.ok(pu.foods.some((x) => x.group === g), g);
  const sh = g5('shabbat');
  assert.deepEqual(sh.friday.map((x) => [x.id, x.need]), [['candles', 2], ['challah', 2], ['cup', 1]]);
  assert.ok(sh.decoys.every((x) => !sh.friday.some((y) => y.he === x.he)));
  assert.equal(g5('sevenspecies').species.length, 7); assert.equal(g5('species').species.length, 4);
  assert.ok(g5('kippur').words.length >= 10);
});

// ---------- catalogue, routes and file rules ----------
test('catalogue: twenty games, levels 2 to 5, bands, routes, labels, sections, hidden from the More sheet, privacy and triage rows', () => {
  assert.equal(G5_GAMES.length, 20);
  assert.deepEqual(G5_IDS, G5_GAMES.map((g) => g.id));
  assert.equal(new Set(G5_IDS).size, 20);
  const listed = new Set(STORE_KEYS.map((r) => r[0])), inSection = new Set(Object.values(SECTION_ROUTES).flat());
  const triage = readFileSync(root + 'docs/v0/PREVIEW-TRIAGE.md', 'utf8');
  const sources = new Set([...Object.values(DAYS).flatMap((d) => [d.he, ...d.words.map((w) => w.he)]), ...[...WORDS.values()].map((w) => w.he),
    ...[...PHRASE.values()].map((e) => e.he), ...[...ART.values()].flatMap((a) => a.terms.map((t) => t.he)), ...TG_GAMES.map((g) => g.titleHe)]);
  for (const g of G5_GAMES) {
    assert.match(g.id, /^g5-[a-z]+$/);
    assert.ok(g.level >= 2 && g.level <= 5, g.id);
    assert.equal(g.band, g.level === 2 ? 'beginner' : g.level === 3 ? 'intermediate' : 'advanced', g.id);
    assert.ok(!ARCADE_GAMES.some((x) => x.id === g.id) && !HANUKKAH_GAMES.some((x) => x.id === g.id), 'kept out of the arcade rotation');
    assert.ok(existsSync(`${root}src/games/${g.id}.view.js`)); assert.ok(VIEW_FILES.includes(`games/${g.id}.view.js`), g.id);
    const { route } = matchRoute('#/' + g.id);
    assert.equal(route?.module, `../games/${g.id}.view.js`); assert.equal(route.title, g.title); assert.equal(tierOf(route), 'preview');
    assert.equal(NAV_EN['nav.route.' + g.id], g.title);
    assert.ok(inSection.has(g.id)); assert.ok(PREVIEW_HIDDEN.has(g.id)); assert.ok(listed.has(`games.${g.id}.v1`));
    assert.match(triage, new RegExp('^\\| `' + g.id + '` \\| hide \\|', 'm'));
    assert.match(g.titleHe, POINTED); assert.ok(sources.has(g.titleHe), `${g.id}: Hebrew title copied from the app's data`);
    assert.match(g.title, /^[A-Z0-9][^ ]*( (?:and|or|of|the|to|in|[A-Z0-9][^ ]*))*$/, `Title Case: ${g.title}`);
    assert.ok(g.tag && g.art, g.id);
    const view = readFileSync(`${root}src/games/${g.id}.view.js`, 'utf8');
    assert.ok(view.includes(`id: '${g.id}', title: '${g.title.replace(/'/g, "\\'")}', titleHe: '${g.titleHe}'`), `${g.id}: the game's own title matches the catalogue`);
    assert.ok(view.includes(`STORE_KEY = 'games.${g.id}.v1'`), `${g.id}: store key`);
  }
  for (let l = 2; l <= 5; l++) assert.ok(G5_GAMES.filter((g) => g.level === l).length >= 3, `level ${l}`);
  for (let i = 1; i < G5_GAMES.length; i++) assert.ok(G5_GAMES[i].level >= G5_GAMES[i - 1].level, 'catalogue in level order');
  assert.equal(nextIn(G5_GAMES, G5_IDS[19]).id, G5_IDS[0]);
});

test('g5 files: only engine, arcade, shell, tg and g5 imports; no made-up voice; no written divine name; on demand, not installed', () => {
  const files = readdirSync(`${root}src/games`).filter((f) => f.startsWith('g5-'));
  assert.equal(files.length, 23);
  const manifest = readFileSync(root + 'precache-manifest.js', 'utf8');
  const onDemand = manifest.slice(manifest.indexOf('self.ALEF_ON_DEMAND'));
  const installed = manifest.slice(0, manifest.indexOf('self.ALEF_ON_DEMAND'));
  for (const f of files) {
    const src = readFileSync(`${root}src/games/${f}`, 'utf8');
    for (const [, spec] of src.matchAll(/from '([^']+)'/g)) assert.match(spec, /^(\.\/(g5-[a-z-]+|tg-core|tg-ui|arcade|arcade\.model|engine)\.js|\.\.\/shell\/[a-z.-]+\.js)$/, `${f} imports ${spec}`);
    assert.doesNotMatch(src, /speechSynthesis|SpeechSynthesisUtterance|new Audio\(/, `${f} never makes up a voice`);
    assert.doesNotMatch(src, /יְהוָה|יהוה/, `${f} has no written divine name`);
    assert.ok(onDemand.includes(`"src/games/${f}"`) && !installed.includes(`"src/games/${f}"`), `${f} on demand`);
  }
  for (const f of readdirSync(`${root}data/games/g5`)) assert.ok(onDemand.includes(`"data/games/g5/${f}"`) && !installed.includes(`"data/games/g5/${f}"`), `${f} on demand`);
  const hub = readFileSync(root + 'src/games/games.view.js', 'utf8');
  assert.match(hub, /import\('\.\/g5-catalog\.js'\)/, 'the hub loads the lane catalogue on demand');
  assert.doesNotMatch(hub, /^import .*g5-catalog/m, 'no static import of the lane catalogue in the hub');
});

test('games hub: one section for the lane, filled from the catalogue loaded on demand', async () => {
  const env = environment();
  const { g5Section } = await import('../src/games/games.view.js');
  const sec = g5Section();
  assert.match(sec.querySelector('h2').textContent, /Holidays, Shabbat and Prayer/);
  for (let i = 0; i < 50 && !sec.querySelectorAll('a').length; i++) await turn();
  const links = sec.querySelectorAll('a').map((a) => a.getAttribute('href'));
  assert.deepEqual(links, G5_IDS.map((id) => '#/' + id));
  assert.ok(env.root);
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

async function play(id, level, maxClicks = 30000) {
  const mod = await import(`../src/games/${id}.view.js`);
  const env = environment();
  const mem = new Map([[`games.${id}.v1`, { unlocked: 5 }]]); const store = { get: (k) => mem.get(k), set: (k, v) => mem.set(k, v) };
  globalThis.setTimeout = (fn, ms, ...a) => realTimeout(fn, Math.min(ms || 0, 1), ...a);
  const realRandom = Math.random; Math.random = seededRandom(level * 7919 + id.length * 31 + Number(process.env.G5_SEED || 0)); // the same boards on every run
  try {
    const stop = await mod.mount(env.root, { store, settings, fetchFn, images: { resolve: () => null }, audio: null, route: { query: { level: String(level) } } });
    for (let i = 0; i < 400 && !env.root.querySelector('.arc-start'); i++) await turn();
    env.root.querySelector('.arc-start').click();
    const board = env.root.querySelector('.arc-board');
    let ready = false;
    for (let i = 0; i < 3000 && !ready; i++) { await turn(); ready = enabled(board).length > 0; }
    assert.ok(ready, `${id} level ${level}: the board has something to press (its data loaded)`);
    const rnd = seededRandom(level * 31 + id.length);
    let clicks = 0, best = 0, texts = '';
    const hudScore = () => Number((env.root.querySelector('.arc-hud-item')?.textContent || '').replace(/\D+/g, '')) || 0;
    while (clicks < maxClicks && !env.root.querySelector('.arc-results-card')) {
      const bs = enabled(board);
      if (bs.length) { bs[Math.floor(rnd() * bs.length)].click(); clicks++; best = Math.max(best, hudScore()); if (clicks % 25 === 1) texts += ' ' + spaced(board); }
      await turn();
    }
    const finished = !!env.root.querySelector('.arc-results-card');
    const next = env.root.querySelectorAll('a').find((a) => /^Next: /.test(a.textContent));
    texts += ' ' + spaced(board);
    stop();
    assert.ok(!env.listeners.has('keydown'), 'key handler removed on unmount');
    return { finished, score: best, text: texts, clicks, rec: mem.get(`games.${id}.v1`), next: next?.getAttribute('href') };
  } finally { globalThis.setTimeout = realTimeout; Math.random = realRandom; }
}

const ONLY = process.env.G5_ONLY ? process.env.G5_ONLY.split(',') : null;
for (const g of G5_GAMES) {
  if (ONLY && !ONLY.includes(g.id)) continue;
  test(`${g.id}: every level loads its data and plays through to the results card`, async () => {
    for (let level = 1; level <= 5; level++) {
      const r = await play(g.id, level);
      assert.ok(r.finished, `${g.id} level ${level} finished (${r.clicks} taps)`);
      assert.ok(r.score > 0, `${g.id} level ${level}: at least one right answer scored`);
      assert.ok(r.rec?.levels?.[level]?.plays === 1, 'best score saved for the level');
      assert.equal(findName(r.text).filter((w) => w.kind !== 'abbrev').length, 0, `${g.id} level ${level} never shows the written name`);
      assert.equal(r.next, '#/' + nextIn(G5_GAMES, g.id).id, 'the results card hands on to the next holiday game');
    }
  });
}
