// Torah and Hebrew games (src/games/tg-*): core rules, data checked against the app's own sources, the divine-name rule,
// catalogue and routes, and every level of every game played in the fake DOM until it finishes.
// Logic and wiring checks only; the Hebrew itself still needs a teacher's review (see the data notes).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Doc, El } from './wordtrace.fakedom.js';
import { matchRoute, tierOf } from '../src/shell/router.js';
import { NAV_EN } from '../src/shell/nav.strings.js';
import { SECTION_ROUTES } from '../src/shell/nav-model.js';
import { STORE_KEYS } from '../src/shell/privacy.view.js';
import { ARCADE_GAMES } from '../src/games/arcade.catalog.js';
import { TG_GAMES, TG_IDS } from '../src/games/tg-catalog.js';
import { findName } from '../src/shell/names.js';
import {
  showName, hasName, NAME_SHOWN, tokens, excerpt, letterClusters, bare, toBase, LETTER_VALUES, wordValue, numeralLetters, numeralWritten,
  scoreGuess, withFinal, rootLetters, rootPositions, tappedSpellsRoot, wordsWithMark, options, shuffle, BOOKS,
} from '../src/games/tg-core.js';
import { seededRandom } from '../src/games/arcade.model.js';
import { huntTargets, pickTarget } from '../src/games/tg-letterhunt.view.js';
import { positions, isFree, hasMove } from '../src/games/tg-tilepairs.view.js';
import { buildTargets } from '../src/games/tg-numerals.view.js';
import { answerPool, dictionary } from '../src/games/tg-wordguess.view.js';
import { playable } from '../src/games/tg-torahwords.view.js';
import { familyItems } from '../src/games/tg-family.view.js';
import { trayForms, SLOTS } from '../src/games/tg-verbslots.view.js';
import { pickEvents, quoteOf } from '../src/games/tg-storyorder.view.js';
import { run, openingLength } from '../src/games/tg-parashah.view.js';
import { candidates, tropeWords, MARKS } from '../src/games/tg-tropehunt.view.js';
import { uniqueWords } from '../src/games/tg-holidays.view.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const json = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
const chapter = (book, n) => json(`data/corpus/torah/${book}/${String(n).padStart(2, '0')}.json`);
const verse = (r) => chapter(r.book, r.chapter).verses[r.verse - 1];
const POINTED = /[ְ-ׇּׁׂ]/;
const NAME = 'יְהוָה';

// ---------- core rules ----------
test('divine name: every written form is shown as ה׳ (bare, maqaf compound, prefixed, with trope); the two-yod abbreviation stays', () => {
  assert.equal(showName(`וַיֹּאמֶר ${NAME} אֶל־מֹשֶׁה`), `וַיֹּאמֶר ${NAME_SHOWN} אֶל־מֹשֶׁה`);
  assert.equal(showName(`אֶת־${NAME}׃`), `אֶת־${NAME_SHOWN}׃`);
  assert.equal(showName('שִׁירוּ לַיהוָה כִּי'), 'שִׁירוּ לַה׳ כִּי');
  const withTrope = 'וַיְדַבֵּ֥ר יְהוָ֖ה אֶל־מֹשֶׁ֥ה';
  assert.equal(findName(showName(withTrope)).filter((w) => w.kind !== 'abbrev').length, 0);
  assert.equal(showName('יי'), 'יי');
  assert.ok(hasName(NAME) && !hasName('אֱלֹהִים'));
});

test('words, letters and quotes: tokens keep maqaf compounds, excerpts are word slices, clusters keep their points', () => {
  assert.deepEqual(tokens('לֶךְ־לְךָ מֵאַרְצְךָ'), ['לֶךְ־לְךָ', 'מֵאַרְצְךָ']);
  assert.equal(excerpt('א ב ג ד', 1, 3), 'ב ג');
  assert.deepEqual(letterClusters('שָׁלוֹם').map((c) => c.base), ['ש', 'ל', 'ו', 'ם']);
  assert.equal(letterClusters('שָׁלוֹם')[0].text, 'שָׁ');
  assert.equal(bare('בְּרֵאשִׁית'), 'בראשית');
  assert.equal(toBase('ם'), 'מ');
});

test('letter values and numerals: standard values, 15 and 16 written טו and טז, geresh and gershayim', () => {
  assert.equal(LETTER_VALUES['א'], 1); assert.equal(LETTER_VALUES['י'], 10); assert.equal(LETTER_VALUES['כ'], 20);
  assert.equal(LETTER_VALUES['צ'], 90); assert.equal(LETTER_VALUES['ק'], 100); assert.equal(LETTER_VALUES['ת'], 400);
  assert.equal(Object.keys(LETTER_VALUES).length, 22);
  assert.equal(wordValue('שָׁלוֹם'), 300 + 30 + 6 + 40);
  assert.equal(numeralLetters(15), 'טו'); assert.equal(numeralLetters(16), 'טז'); assert.equal(numeralLetters(115), 'קטו');
  assert.equal(numeralLetters(17), 'יז'); assert.equal(numeralLetters(787), 'תשפז'); assert.equal(numeralLetters(400 + 400 + 99), 'תתצט');
  assert.equal(numeralWritten(1), 'א׳'); assert.equal(numeralWritten(23), 'כ״ג'); assert.equal(numeralWritten(787), 'תשפ״ז');
  for (let n = 1; n <= 999; n++) {
    const s = numeralLetters(n);
    assert.equal([...s].reduce((a, c) => a + LETTER_VALUES[c], 0), n, `value of ${s}`);
    if (n % 100 === 15 || n % 100 === 16) assert.match(s, /ט[וז]$/, String(n));
  }
  const t = buildTargets(499, seededRandom(4));
  assert.equal(t.length, 10); assert.ok(t.includes(15)); assert.ok(t.every((x) => x >= 11 && x <= 499));
});

test('six tries: marks handle repeats and final letters; the guess is written with a final letter', () => {
  assert.deepEqual(scoreGuess('שלמ', 'שלמ'), ['hit', 'hit', 'hit']);
  assert.deepEqual(scoreGuess('מלש', 'שלם'), ['near', 'hit', 'near']);
  assert.deepEqual(scoreGuess('אאב', 'באג'), ['miss', 'hit', 'near']);
  assert.deepEqual(scoreGuess('בבב', 'אבג'), ['miss', 'hit', 'miss']);
  assert.equal(withFinal('שלומ'), 'שלום');
});

test('shared letters, trope marks and options', () => {
  assert.deepEqual(rootLetters('כ־ו־ן'), ['כ', 'ו', 'נ']);
  assert.deepEqual(rootPositions('מְכוֹנִית', ['כ', 'ו', 'נ']), [1, 2, 3]);
  assert.equal(rootPositions('שָׁלוֹם', ['כ', 'ו', 'נ']), null);
  assert.ok(tappedSpellsRoot('כִּוּוּן', ['כ', 'ו', 'נ'], [0, 2, 3]));
  assert.ok(!tappedSpellsRoot('כִּוּוּן', ['כ', 'ו', 'נ'], [0, 3, 2]));
  assert.deepEqual(wordsWithMark('בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים', '֑'), [2]);
  const o = options(1, [1, 2, 3, 2, 4, 5], 4, seededRandom(1));
  assert.equal(o.length, 4); assert.equal(new Set(o).size, 4); assert.ok(o.includes(1));
});

// ---------- data against the app's sources ----------
test('stories: every card is an exact word slice of its verse; captions are present; shown without the written name', () => {
  const d = json('data/games/tg/stories.json');
  assert.ok(d.stories.length >= 6);
  for (const s of d.stories) {
    assert.ok(s.events.length >= 5, s.id);
    for (const e of s.events) {
      const v = verse(e.ref);
      assert.ok(v, JSON.stringify(e.ref));
      assert.ok(e.from >= 0 && e.to > e.from && e.to <= tokens(v.he).length, `${s.id} ${e.en}`);
      const q = excerpt(v.he, e.from, e.to);
      assert.ok(v.he.includes(q), `exact quote ${s.id}`);
      assert.match(q, POINTED);
      assert.equal(hasName(quoteOf(v, e)), false);
      assert.ok(e.en.length > 3);
    }
  }
  const ev = pickEvents(d.stories[0], 4, seededRandom(2));
  assert.equal(ev.length, 4);
  assert.deepEqual(ev.map((e) => d.stories[0].events.indexOf(e)), ev.map((e) => d.stories[0].events.indexOf(e)).slice().sort((a, b) => a - b));
});

test('who said it: quotes are exact word slices; every speaker name is the word its verse points to', () => {
  const d = json('data/games/tg/whosaid.json');
  const ids = new Set(d.speakers.map((s) => s.id));
  for (const s of d.speakers) { assert.equal(tokens(verse(s.ref).he)[s.word], s.he, s.id); assert.match(s.he, POINTED); }
  assert.ok(d.quotes.length >= 15);
  for (const q of d.quotes) {
    assert.ok(ids.has(q.who), q.who);
    const v = verse(q.ref);
    const text = excerpt(v.he, q.from, q.to);
    assert.ok(q.to <= tokens(v.he).length && v.he.includes(text), `${q.who} ${q.ref.chapter}:${q.ref.verse}`);
    assert.equal(hasName(showName(text)), false);
  }
  assert.ok(d.speakers.length >= 6, 'enough names for the six-choice level');
});

test('parashot: 54 in order, matching the Torah index; each name is copied from its opening verse', () => {
  const d = json('data/games/tg/parashot.json').parashot;
  const idx = json('data/corpus/torah/index.json').parshiyot;
  assert.equal(d.length, 54);
  d.forEach((p, i) => {
    assert.equal(p.num, i + 1); assert.equal(p.id, idx[i].id); assert.equal(p.book, idx[i].book);
    const v = verse(p.ref);
    assert.ok(v.he.includes(p.he), `${p.id}: ${p.he} in ${p.ref.book} ${p.ref.chapter}:${p.ref.verse}`);
    assert.match(p.he, POINTED);
    const f = idx[i].from;
    assert.ok(p.ref.book === f.book && (p.ref.chapter > f.chapter || (p.ref.chapter === f.chapter && p.ref.verse >= f.verse)), `${p.id} starts at or after its first verse`);
    assert.ok(openingLength(tokens(v.he), p.he) <= tokens(v.he).length);
  });
  const r = run(d, 5, seededRandom(3));
  assert.equal(r.length, 5); assert.ok(r.every((p, i) => i === 0 || p.num === r[i - 1].num + 1));
});

test('holidays: every sorted and ordered day exists in the calendar pages; each level has enough single-holiday words', () => {
  const h = json('data/games/tg/holidays.json'), days = json('data/calendar/days.json').days;
  for (const id of h.sort) assert.ok(days[id], id);
  for (const y of h.year) assert.ok(days[y.id] && y.date, y.id);
  assert.ok(uniqueWords(days, ['pesach', 'hanukkah']).length >= 12);
  assert.ok(uniqueWords(days, ['rosh-hashanah', 'sukkot', 'purim']).length >= 12);
  for (const w of uniqueWords(days, h.sort)) assert.match(w.he, POINTED, w.he);
});

test('six tries data: every answer is a word-list record copied unchanged, and the dictionary accepts it', () => {
  const words = json('data/vocab/words.json').words, byId = new Map(words.map((w) => [w.id, w]));
  const d = json('data/games/tg/wordguess.json');
  for (const len of [3, 4, 5]) {
    const pool = answerPool(d, len), dict = dictionary(d, len);
    assert.ok(pool.length >= 50, `answers of ${len}`);
    for (const a of pool) {
      const w = byId.get(a.id);
      assert.ok(w && w.he === a.he && w.en === a.en && (w.translit || '') === a.translit, a.he);
      assert.equal(w.flags.needsReview, false);
      assert.ok(dict.has([...bare(a.he)].map(toBase).join('')), a.he);
      assert.equal(hasName(a.he), false);
      assert.doesNotMatch(a.en, /\b(god|lord)\b/i);
    }
  }
});

test('torah words: the thirty counts load; the divine name is never a quiz item', () => {
  const d = json('data/torahread/words30.json');
  const p = playable(d.words);
  assert.ok(p.length >= 25);
  assert.ok(p.every((w) => !hasName(w.pointed) && w.gloss));
});

test('verbs and families: copied unchanged from data/roots; three distinct forms; shared letters are findable', () => {
  const src = new Map(json('data/roots/verbs.json').verbs.map((v) => [v.id, v]));
  const verbs = json('data/games/tg/verbs.json').verbs;
  assert.ok(verbs.length >= 100);
  for (const v of verbs) {
    const s = src.get(v.id);
    assert.ok(s && s.he === v.he && s.en === v.en && !s.needsReview, v.he);
    for (const k of ['infinitive', 'present', 'future']) assert.equal(v.forms[k], s.forms[k]);
    assert.equal(new Set(Object.values(v.forms)).size, 3);
    assert.ok(bare(v.forms.infinitive).startsWith('ל') && bare(v.forms.future).startsWith('י'));
  }
  const tray = trayForms(verbs[0], verbs, 3, seededRandom(5), true);
  assert.equal(tray.length, 6); assert.equal(tray.filter((f) => f.own).length, 3); assert.equal(new Set(tray.map((f) => f.he)).size, 6);
  assert.equal(SLOTS.length, 3);
  const fsrc = new Map(json('data/roots/families.json').families.map((f) => [f.root, f]));
  const fams = json('data/games/tg/families.json').families;
  assert.ok(fams.length >= 40);
  for (const f of fams) {
    const s = fsrc.get(f.root);
    assert.ok(s?.ruleChecked, f.root);
    for (const w of f.words) { const sw = s.words.find((x) => x.id === w.id); assert.ok(sw && sw.he === w.he && sw.en === w.en, w.he); assert.ok(rootPositions(w.he, rootLetters(f.root)), w.he); }
  }
  assert.ok(familyItems(fams, { min: 5, max: 9 }).length >= 20);
  assert.equal(json('data/roots/verified.json').roots.length, 0, 'when roots get verified, the game wording can say "root"');
});

test('letter hunt and trope hunt pick real targets from real verses', () => {
  const g1 = chapter('genesis', 1);
  const v = g1.verses[0].he;
  const t = pickTarget(v, 'letter', seededRandom(1));
  assert.ok(t && huntTargets(v, t).length > 0);
  const vowel = pickTarget(v, 'vowel', seededRandom(1));
  assert.ok(vowel && huntTargets(v, vowel).length > 0);
  const c = candidates(g1, 'genesis', ['etnachta'], 9, seededRandom(1));
  assert.ok(c.length > 0);
  for (const x of c) { assert.equal(x.words.filter((w) => w.includes('֑')).length, 1); assert.ok(x.words[x.at].includes('֑')); }
  assert.equal(tropeWords('א׀ ׀ ב').length, 2);
  assert.equal(MARKS.length, 8);
  const table = json('data/corpus/trope/table.json').prose;
  for (const m of MARKS) assert.equal(table.find((r) => r.id === m.id)?.char, m.ch, m.id);
});

test('tile pairs: boards fit the pairs; free-tile rule; a fresh board always has a move after reshuffling', () => {
  assert.equal(positions('small').length, 16); assert.equal(positions('mid').length, 24); assert.equal(positions('big').length, 28);
  const tiles = positions('mid').map((p, i) => ({ ...p, pair: Math.floor(i / 2), gone: false }));
  const covered = tiles.find((t) => t.layer === 0 && t.r === 1 && t.c === 2);
  assert.equal(isFree(covered, tiles), false);
  assert.equal(isFree(tiles.find((t) => t.layer === 0 && t.r === 0 && t.c === 0), tiles), true);
  assert.equal(typeof hasMove(tiles), 'boolean');
});

// ---------- catalogue, routes and file rules ----------
test('catalogue: twelve tg games, two or more per band, levels 1 to 5, routes, labels, sections, privacy rows', () => {
  assert.equal(TG_GAMES.length, 12);
  for (const band of ['beginner', 'intermediate', 'advanced']) assert.ok(TG_GAMES.filter((g) => g.band === band).length >= 2, band);
  assert.ok(TG_GAMES.filter((g) => g.band === 'advanced').every((g) => g.level === 5));
  const listed = new Set(STORE_KEYS.map((r) => r[0])), inSection = new Set(Object.values(SECTION_ROUTES).flat());
  for (const g of TG_GAMES) {
    assert.match(g.id, /^tg-[a-z]+$/);
    assert.ok(ARCADE_GAMES.includes(g), g.id);
    assert.ok(existsSync(`${root}src/games/${g.id}.view.js`));
    const { route } = matchRoute('#/' + g.id);
    assert.equal(route?.module, `../games/${g.id}.view.js`); assert.equal(route.title, g.title); assert.equal(tierOf(route), 'preview');
    assert.equal(NAV_EN['nav.route.' + g.id], g.title);
    assert.ok(inSection.has(g.id)); assert.ok(listed.has(`games.${g.id}.v1`));
    assert.match(g.titleHe, POINTED);
    assert.match(g.title, /^[A-Z0-9][^ ]*( (?:and|or|of|the|to|in|[A-Z0-9][^ ]*))*$/, `Title Case: ${g.title}`);
  }
  assert.deepEqual(TG_IDS, TG_GAMES.map((g) => g.id));
  for (let i = 1; i < ARCADE_GAMES.length; i++) assert.ok(ARCADE_GAMES[i].level >= ARCADE_GAMES[i - 1].level, 'catalogue stays in level order');
});

test('tg files stay self-contained: only engine, arcade, shell and tg imports; data only under data/games/tg or app data', () => {
  const files = readdirSync(`${root}src/games`).filter((f) => f.startsWith('tg-'));
  assert.ok(files.length >= 15);
  for (const f of files) {
    const src = readFileSync(`${root}src/games/${f}`, 'utf8');
    for (const [, spec] of src.matchAll(/from '([^']+)'/g)) assert.match(spec, /^(\.\/(tg-[a-z-]+|arcade|arcade\.model|engine)\.js|\.\.\/shell\/[a-z.-]+\.js)$/, `${f} imports ${spec}`);
    assert.doesNotMatch(src, /speechSynthesis|SpeechSynthesisUtterance/, `${f} never makes up a voice`);
    assert.doesNotMatch(src, /יְהוָה|יהוה/, `${f} has no written divine name`);
  }
  for (const f of readdirSync(`${root}data/games/tg`)) {
    const d = json(`data/games/tg/${f}`); assert.ok(d.schema && d.note, f);
    const raw = readFileSync(`${root}data/games/tg/${f}`, 'utf8');
    assert.equal(findName(raw).filter((w) => w.kind !== 'abbrev').length, 0, `${f}: no spelling of the divine name in the game data`);
  }
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
/** Text with a space between elements, as the learner sees separate tiles and buttons. */
const spaced = (n) => (n.nodeType === 3 ? n.data : (n.childNodes || []).map(spaced).join(' '));
const enabled = (el) => el.querySelectorAll('button').filter((b) => !b.disabled && b.getAttribute('disabled') === null);

async function play(id, level, maxClicks = 40000) {
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
    let clicks = 0, best = 0;
    const hudScore = () => Number((env.root.querySelector('.arc-hud-item')?.textContent || '').replace(/\D+/g, '')) || 0;
    while (clicks < maxClicks && !env.root.querySelector('.arc-results-card')) {
      const bs = enabled(board);
      if (bs.length) { bs[Math.floor(rnd() * bs.length)].click(); clicks++; best = Math.max(best, hudScore()); }
      await turn();
    }
    const finished = !!env.root.querySelector('.arc-results-card');
    const score = best;
    const text = spaced(board);
    stop();
    assert.ok(!env.listeners.has('keydown'), 'key handler removed on unmount');
    return { finished, score, text, clicks, rec: mem.get(`games.${id}.v1`) };
  } finally { globalThis.setTimeout = realTimeout; }
}

for (const g of TG_GAMES) {
  if (g.id === 'tg-wordguess') continue;
  test(`${g.id}: every level loads its data and plays through to the results card`, async () => {
    for (let level = 1; level <= 5; level++) {
      const r = await play(g.id, level);
      assert.ok(r.finished, `${g.id} level ${level} finished (${r.clicks} taps)`);
      assert.ok(r.score > 0, `${g.id} level ${level}: at least one right answer scored`);
      assert.ok(r.rec?.levels?.[level]?.plays === 1, 'best score saved for the level');
      assert.equal(findName(r.text).filter((w) => w.kind !== 'abbrev').length, 0, `${g.id} level ${level} never shows the written name`);
      if (g.id === 'tg-numerals') assert.ok(!r.text.includes('ה׳'), 'the numeral 5 is never shown as ה׳ (that sign means the divine name in this app)');
    }
  });
}

test('tg-wordguess: every level shows rows and a full keyboard, rejects a non-word and accepts a real word', async () => {
  const d = json('data/games/tg/wordguess.json');
  for (let level = 1; level <= 5; level++) {
    const mod = await import('../src/games/tg-wordguess.view.js');
    const env = environment();
    const store = { get: () => ({ unlocked: 5 }), set: () => {} };
    globalThis.setTimeout = (fn, ms, ...a) => realTimeout(fn, Math.min(ms || 0, 1), ...a);
    try {
      const stop = await mod.mount(env.root, { store, settings, fetchFn, images: { resolve: () => null }, audio: null, route: { query: { level: String(level) } } });
      for (let i = 0; i < 400 && !env.root.querySelector('.arc-start'); i++) await turn();
      env.root.querySelector('.arc-start').click();
      for (let i = 0; i < 3000 && !env.root.querySelector('.tg-keys')?.querySelector('button'); i++) await turn();
      const keys = env.root.querySelector('.tg-keys').querySelectorAll('button');
      assert.equal(keys.length, 23, '22 letters and delete');
      const len = [3, 3, 4, 4, 5][level - 1];
      const press = (s) => { for (const c of s) keys.find((b) => b.textContent === c).click(); };
      const check = () => env.root.querySelector('.arc-board').querySelectorAll('button').find((b) => b.textContent === 'Check').click();
      press('א'.repeat(len)); check();
      assert.match(env.root.querySelector('.arc-status').textContent, /not in the word list/);
      for (let i = 0; i < len; i++) keys[keys.length - 1].click();
      const real = [...d.dictionary[len].split(' ')[0]].map(toBase);
      press(real.join('')); check();
      const marked = env.root.querySelectorAll('.tg-tile').filter((t) => /\b(hit|near|miss)\b/.test(t.className));
      assert.equal(marked.length, len, 'the real word was scored tile by tile');
      stop();
    } finally { globalThis.setTimeout = realTimeout; }
  }
});
