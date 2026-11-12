// Grammar in Action games (src/games/g3-*, lane g3): core rules, every data record checked against the app source it was
// copied from, the divine-name rule, catalogue and routes, and every level of every game played in the fake DOM until
// it finishes. Logic and wiring checks only; the Hebrew itself still needs a teacher's review (see the data notes).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Doc, El } from './wordtrace.fakedom.js';
import { matchRoute, tierOf } from '../src/shell/router.js';
import { NAV_EN } from '../src/shell/nav.strings.js';
import { SECTION_ROUTES } from '../src/shell/nav-model.js';
import { STORE_KEYS } from '../src/shell/privacy.view.js';
import { ARCADE_GAMES, HANUKKAH_GAMES } from '../src/games/arcade.catalog.js';
import { G3_GAMES, G3_IDS, G3_BANDS } from '../src/games/g3-catalog.js';
import { findName } from '../src/shell/names.js';
import { seededRandom } from '../src/games/arcade.model.js';
import { BANK } from '../src/games/tugowar.bank.js';
import { hasName, bare } from '../src/games/tg-core.js';
import {
  wordsOf, lineOf, gloss, TENSES, formOf, tenseDeck, BINYANIM, clueOrder, cluePoints, familyLetters, letterMatches, uniqueLetters, sieveItems,
  pressChoices, allEndings, sharedPersons, looksOdd, adjFor, numberFor, formForCount, negationGap, swapped, scramble, genderDiff, brokenLine,
} from '../src/games/g3-core.js';
import { nextG3 } from '../src/games/g3-ui.js';
import { gridCells } from '../src/games/g3-grid.view.js';
import { gateQueue } from '../src/games/g3-gate.view.js';
import { chainTiles } from '../src/games/g3-chains.view.js';
import { packLines, ROLES, PACKABLE } from '../src/games/g3-packcheck.view.js';
import { mirrorItems } from '../src/games/g3-mirror.view.js';
import { negLines } from '../src/games/g3-negate.view.js';
import { lostThings, THINGS, OWNERS } from '../src/games/g3-lostfound.view.js';
import { heDecoys } from '../src/games/g3-whack.view.js';
import { swapPoints } from '../src/games/g3-swapfix.view.js';
import { streakBonus } from '../src/games/g3-decoder.view.js';
import { board } from '../src/games/g3-agree.view.js';
import { jobCard } from '../src/games/g3-repair.view.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const cache = new Map();
const json = (p) => { if (!cache.has(p)) cache.set(p, JSON.parse(readFileSync(root + p, 'utf8'))); return cache.get(p); };
const g3 = (name) => json(`data/games/g3/${name}.json`);
const POINTED = /[ְ-ׇּׁׂ]/;
const words = json('data/vocab/words.json').words, byId = new Map(words.map((w) => [w.id, w]));
const strip = (t) => t.replace(/[?,.!:;"׃]+$/g, '').replace(/^["]+/, '');
const toks = (he) => he.trim().split(/\s+/);
const atPath = (doc, path) => String(path).split('.').filter((x) => x !== '').reduce((o, k) => (o == null ? o : o[/^\d+$/.test(k) ? Number(k) : k]), doc);

/** The Hebrew a source pointer names: a word-list entry (or one of its forms), a vocab5000 form, a phrasebook word, or a word in a JSON line. */
function resolve(src) {
  if (src.file === 'data/vocab/words.json') { const w = byId.get(src.id); return src.form ? w.forms[src.form] : w.he; }
  if (src.file === 'data/vocab/vocab5000.json') { const e = json(src.file).entries.find((x) => x.id === src.id); return e.forms[src.form].pointed; }
  if (src.file === 'data/corpus/phrasebook.json' && src.id) { const e = json(src.file).entries.find((x) => x.id === src.id); const line = src.which === 'he' ? e.he : e.forms[src.which].he; return strip(toks(line)[src.word]); }
  const v = atPath(json(src.file), src.at);
  const line = typeof v === 'string' ? v : v.he;
  const t = strip(toks(line)[src.word]);
  return src.part != null ? t.split('־')[src.part] : t;
}
/** The whole line a pool pointer names, with its English. */
const lineAt = (src) => atPath(json(src.file), src.at);

// ---------- core rules ----------
test('words of a line: punctuation splits off and comes back', () => {
  const ws = wordsOf('רֶגַע, אֲנִי לֹא שׁוֹמֵעַ.');
  assert.deepEqual(ws.map((x) => x.w), ['רֶגַע', 'אֲנִי', 'לֹא', 'שׁוֹמֵעַ']);
  assert.equal(ws[0].p, ','); assert.equal(lineOf(ws), 'רֶגַע, אֲנִי לֹא שׁוֹמֵעַ.');
  assert.equal(gloss('to do (to perform an action, to accomplish a thing)'), 'to do');
  assert.equal(gloss('hello, hi; peace'), 'hello');
});

test('tenses: the deck takes the asked tenses, never a form twice, never a form shared by two tenses', () => {
  const verbs = g3('verbs').verbs;
  assert.equal(TENSES.length, 4);
  const v = verbs[0];
  assert.equal(formOf(v, 'past'), v.he); assert.equal(formOf(v, 'future'), v.forms.future);
  const deck = tenseDeck(verbs, 12, ['past', 'future'], seededRandom(3));
  assert.equal(deck.length, 12); assert.equal(new Set(deck.map((x) => x.he)).size, 12);
  for (const x of deck) { assert.ok(['past', 'future'].includes(x.tense)); assert.equal(formOf(x.verb, x.tense), x.he); }
});

test('patterns: five common binyanim, clues in order, fewer clues score more', () => {
  assert.deepEqual(BINYANIM.map((b) => b.key), ["pa'al", "nif'al", "pi'el", "hif'il", "hitpa'el"]);
  for (const b of BINYANIM) assert.doesNotMatch(b.sign, /[ְ-ׇ]/, 'hints name bare letters only, no pointed Hebrew');
  const c = clueOrder(g3('verbs').verbs[0]);
  assert.deepEqual(c.map((x) => x.kind), ['meaning', 'present', 'future', 'infinitive', 'past']);
  assert.ok(cluePoints(1) > cluePoints(2) && cluePoints(5) >= 4);
});

test('family letters: every match is found; a form is used only when the letters fit one way; the future of a yod-first family is skipped', () => {
  assert.deepEqual(familyLetters('שׁ־מ־ר'), ['ש', 'מ', 'ר']);
  assert.deepEqual(letterMatches('לִלְמֹד', ['ל', 'מ', 'ד']), [[0, 2, 3], [1, 2, 3]]);
  assert.equal(uniqueLetters('לִלְמֹד', ['ל', 'מ', 'ד']), null);
  assert.deepEqual(uniqueLetters('שׁוֹמֵר', ['ש', 'מ', 'ר']), [0, 2, 3]);
  const items = sieveItems(g3('verbs').verbs.filter((v) => v.root));
  assert.ok(items.length >= 100);
  for (const it of items) {
    assert.equal(it.pos.length, 3);
    assert.deepEqual(it.pos.map((p) => [...bare(it.he)][p].replace(/[ךםןףץ]/, (c) => ({ 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' })[c])), it.letters);
    assert.ok(!(it.key === 'future' && it.letters[0] === 'י'));
  }
});

test('pattern press: four different verbs, the answer among them, some share its letters or pattern', () => {
  const verbs = g3('verbs').verbs.filter((v) => v.root);
  for (let s = 1; s < 30; s++) {
    const v = verbs[s % verbs.length], c = pressChoices(v, verbs, 4, seededRandom(s));
    assert.equal(c.length, 4); assert.ok(c.includes(v)); assert.equal(new Set(c.map((x) => x.he)).size, 4);
    assert.ok(c.some((x) => x !== v && (x.root === v.root || x.binyan === v.binyan)));
  }
});

test('person endings: one owner per form; full rows; the grid and the gate are well formed', () => {
  const suf = g3('suffixes'), all = allEndings(suf);
  for (const p of suf.preps) { const hs = Object.values(p.forms).map((f) => f.he); assert.equal(new Set(hs).size, hs.length, p.key); }
  assert.ok(all.length >= 50);
  const shel = suf.preps.find((p) => p.key === 'shel'), le = suf.preps.find((p) => p.key === 'le');
  assert.deepEqual(sharedPersons([shel, le]), ['1sg', '2msg', '2fsg', '3msg', '3fsg', '1pl']);
  const cells = gridCells([shel, le], ['1sg', '3msg'], 0.5, seededRandom(2));
  assert.equal(cells.length, 4); assert.ok(cells.filter((c) => c.empty).length >= 2);
  const q = gateQueue(g3('verbs').verbs, () => "hitpa'el", 16, 'past', seededRandom(5));
  assert.equal(q.length, 16); assert.equal(new Set(q.map((x) => x.verb.id)).size, 16);
  for (const x of q) assert.equal(x.isIn, x.verb.binyan === "hitpa'el");
});

test('agreement, numbers and one-two-many: the form follows gender, number and kind', () => {
  const adj = g3('adjectives').adjectives[0];
  assert.equal(adjFor(adj, 'm', false), adj.ms); assert.equal(adjFor(adj, 'f', true), adj.fp);
  const nums = g3('numbers').numbers;
  assert.equal(numberFor(nums, 3, 'm'), 'שְׁלוֹשָׁה'); assert.equal(numberFor(nums, 3, 'f'), 'שָׁלוֹשׁ');
  for (const n of nums.filter((x) => x.n >= 3)) assert.ok(n.m.replace(/[ּׁׂ]/g, '').endsWith('ָה'), `${n.n}: the masculine-noun form ends in -a`);
  const sets = g3('duals').sets, day = sets.find((s) => s.key === 'day'), eye = sets.find((s) => s.key === 'eye'), glasses = sets.find((s) => s.key === 'glasses');
  assert.deepEqual([1, 2, 5].map((c) => formForCount(day, c)), ['one', 'two', 'many']);
  assert.deepEqual([1, 2, 5].map((c) => formForCount(eye, c)), ['one', 'two', 'two']);
  assert.equal(formForCount(glasses, 1), 'one');
  assert.ok(looksOdd({ he: 'לַיְלָה', plural: 'לֵילוֹת', gender: 'm' })); assert.ok(looksOdd({ he: 'כּוֹס', plural: 'כּוֹסוֹת', gender: 'f' }));
  assert.ok(!looksOdd({ he: 'סוּס', plural: 'סוּסִים', gender: 'm' }));
  const rows = board(g3('nouns').nouns, g3('adjectives').adjectives, { size: 4, odd: true }, seededRandom(4));
  assert.equal(rows.length, 4);
  for (const r of rows) assert.equal(r.form, adjFor(r.adj, r.noun.gender, r.noun.plural));
});

test('lines: gaps, swaps, genders and broken lines', () => {
  const g = negationGap('אֲנִי לֹא יוֹדֵעַ', 1);
  assert.equal(g.word, 'לֹא'); assert.equal(g.gap, 1); assert.deepEqual(g.rest.map((x) => x.w), ['אֲנִי', 'יוֹדֵעַ']);
  assert.deepEqual(swapped(['a', 'b', 'c'], 0, 2), ['c', 'b', 'a']);
  for (let s = 0; s < 20; s++) { const out = scramble(['a', 'b', 'c', 'd'], 2, seededRandom(s)); assert.notDeepEqual(out, ['a', 'b', 'c', 'd']); assert.deepEqual([...out].sort(), ['a', 'b', 'c', 'd']); }
  assert.deepEqual(genderDiff('אַתָּה מֵבִין', 'אַתְּ מְבִינָה'), [0, 1]);
  const it = { m: 'אַתָּה מֵבִין', f: 'אַתְּ מְבִינָה' };
  for (let s = 0; s < 10; s++) {
    const br = brokenLine(it, 'f', seededRandom(s));
    assert.equal(br.words.filter((w, i) => w.w !== wordsOf(it.f)[i].w).length, 1);
    assert.equal(br.words[br.at].w, br.bad); assert.equal(wordsOf(it.f)[br.at].w, br.fix);
  }
  assert.equal(swapPoints(1, 1), 14); assert.equal(swapPoints(20, 1), 4);
  assert.equal(streakBonus(1), 0); assert.equal(streakBonus(3), 4); assert.equal(streakBonus(40), 10);
  assert.equal(jobCard('addressee', 'f'), 'Ari is talking to Noa.'); assert.equal(jobCard('speaker', 'm'), 'Ari is talking.');
});

test('round builders: chains, packs, mirrors, not-words, lost things, whack decoys', () => {
  const chains = g3('chains').chains;
  for (const c of chains) {
    const t = chainTiles(c, chains, seededRandom(1));
    assert.equal(t.filter((x) => x.slot === 0).length, 1); assert.equal(t.filter((x) => x.slot === 1).length, 1);
    assert.equal(new Set(t.map((x) => x.he)).size, t.length);
    for (const x of t.filter((y) => y.slot < 0)) assert.ok(x.why);
  }
  const b = Object.fromEntries(g3('basics').words.map((w) => [w.key, w.he])), le = g3('suffixes').preps.find((p) => p.key === 'le');
  for (const role of Object.keys(ROLES)) { const L = packLines(b, le, { he: 'תִּיק' }, role); assert.equal(new Set([L.yes, L.no, L.wrongYes, L.wrongNo]).size, 4); assert.match(L.q, /\?$/); }
  const nouns = g3('nouns').nouns;
  for (const he of PACKABLE) assert.ok(nouns.some((x) => x.he === he), he);
  assert.ok(mirrorItems(g3('gender').items, { who: ['speaker'], max: 1 }).length >= 8);
  assert.ok(mirrorItems(g3('gender').items, { who: ['speaker', 'addressee'], min: 2 }).length >= 6);
  const neg = negLines(g3('sentences'), g3('gender'));
  assert.ok(neg.length >= 20);
  for (const x of neg) assert.ok(['לֹא', 'אֵין'].includes(wordsOf(x.he)[x.at].w), x.he);
  assert.equal(lostThings(g3('article').pairs).length, THINGS.length);
  assert.equal(OWNERS.length, 6);
  const dec = heDecoys(g3('verbs').verbs);
  assert.ok(dec.length >= 20);
  for (const d of dec) assert.doesNotMatch(d.he, /^ה[ֶַָ]/, 'a decoy never carries the vowels of "the"');
});

// ---------- data against the app's sources ----------
test('every g3 data file has a schema and a note, and no spelling of the divine name', () => {
  const files = readdirSync(`${root}data/games/g3`);
  assert.equal(files.length, 12);
  for (const f of files) {
    const d = g3(f.replace('.json', ''));
    assert.ok(d.schema && d.note, f);
    const raw = readFileSync(`${root}data/games/g3/${f}`, 'utf8');
    assert.equal(findName(raw).filter((w) => w.kind !== 'abbrev').length, 0, f);
  }
});

test('verbs: copied unchanged from data/roots/verbs.json, no review flag, four different forms', () => {
  const src = new Map(json('data/roots/verbs.json').verbs.map((v) => [v.id, v]));
  const verbs = g3('verbs').verbs;
  assert.ok(verbs.length >= 500);
  for (const v of verbs) {
    const s = src.get(v.id);
    assert.ok(s && !s.needsReview && s.he === v.he && s.en === v.en && s.binyan === v.binyan && s.level === v.level && s.root === v.root, v.he);
    for (const k of ['infinitive', 'present', 'future']) assert.equal(v.forms[k], s.forms[k]);
    assert.equal(new Set([v.he, ...Object.values(v.forms)]).size, 4);
  }
});

test('adjectives: the four forms are the Tug-of-War bank rows, word or opposite side', () => {
  const bank = new Map(BANK.map((r) => [r[0], r]));
  const adjs = g3('adjectives').adjectives;
  assert.ok(adjs.length >= 20);
  for (const a of adjs) {
    const col = a.side ? 4 : 1;
    assert.equal(bank.get(a.key)[col], a.ms); assert.equal(bank.get(a.key + '_f')[col], a.fs);
    assert.equal(bank.get(a.key + '_pl')[col], a.mp); assert.equal(bank.get(a.key + '_fpl')[col], a.fp);
    assert.equal(bank.get(a.key)[a.side ? 6 : 3], a.en);
  }
});

test('nouns: word-list records with gender, plural and no review flag; English is the record\'s or a marked game gloss', () => {
  const nouns = g3('nouns').nouns;
  assert.ok(nouns.length >= 80 && nouns.filter((x) => x.gender === 'f').length >= 30);
  for (const n of nouns) {
    const w = byId.get(n.id);
    assert.ok(w && w.he === n.he && w.gender === n.gender && w.forms.plural === n.plural && !w.flags.needsReview, n.he);
    if (!n.gameGloss) assert.ok(w.en.toLowerCase().includes(n.en.toLowerCase()), `${n.he}: ${n.en}`);
  }
});

test('endings: every form is the source form it names; the shel 2msg spelling is the phrasebook one', () => {
  const suf = g3('suffixes');
  for (const p of suf.preps) for (const [person, f] of Object.entries(p.forms)) {
    assert.equal(resolve(f.src), f.he, `${p.key} ${person}`);
    assert.match(f.he, POINTED);
  }
  assert.equal(suf.preps.find((p) => p.key === 'shel').forms['2msg'].he, 'שֶׁלְּךָ');
});

test('the article: every "the X" form is the word written at its source; the base is a listed noun', () => {
  const pairs = g3('article').pairs;
  assert.ok(pairs.length >= 30);
  for (const p of pairs) {
    assert.equal(resolve(p.src), p.the, p.the);
    const w = byId.get(p.base.id);
    assert.ok(w && w.he === p.base.he && w.pos === 'noun', p.base.he);
    assert.equal(bare(p.the).slice(1), bare(p.base.he), `${p.the} is ha- + ${p.base.he}`);
    assert.match(p.the, /^ה[ֶַָ]/);
  }
});

test('one, two, many: every form is copied from the place it names', () => {
  for (const s of g3('duals').sets) for (const k of ['one', 'two', 'many']) if (s[k]) assert.equal(resolve(s[k].src), s[k].he, `${s.key} ${k}`);
  for (const s of g3('duals').sets.filter((x) => x.two)) assert.match(s.two.he, /יִם$/, s.key);
});

test('numbers, question words, basics and gendered lines match the phrasebook, word list and gender pairs', () => {
  const pb = new Map(json('data/corpus/phrasebook.json').entries.map((e) => [e.id, e]));
  for (const n of g3('numbers').numbers) { const e = pb.get(n.src.id); assert.equal(e.forms.m.he, n.m); assert.equal(e.forms.f.he, n.f); }
  for (const q of g3('questions').words) assert.equal(resolve(q.src), q.he, q.he);
  for (const w of g3('basics').words) assert.equal(resolve(w.src), w.he, w.key);
  const gp = new Map(json('data/curriculum/gender-pairs.json').pairs.map((p) => [p.id, p]));
  for (const it of g3('gender').items) {
    const s = it.src.file === 'data/curriculum/gender-pairs.json' ? gp.get(it.src.id).forms : pb.get(it.src.id).forms;
    assert.equal(s.m.he, it.m); assert.equal(s.f.he, it.f);
    assert.ok(['speaker', 'addressee'].includes(it.who));
  }
});

test('lines: questions, not-word lines, word-order lines and chains are written as they are at their source', () => {
  for (const q of g3('questions').questions) { const l = lineAt(q.src); assert.equal(l.he, q.he); assert.equal(l.en, q.en); assert.match(q.he, /\?\s*$/); }
  const s = g3('sentences');
  for (const x of [...s.negation, ...s.order]) { const l = lineAt(x.src); assert.equal(l.he, x.he); assert.equal(l.en, x.en); assert.equal(hasName(x.he), false); }
  for (const x of s.negation) assert.ok(['לֹא', 'אֵין'].includes(wordsOf(x.he)[x.neg].w));
  assert.ok(s.order.length >= 60);
  for (const c of g3('chains').chains) {
    const l = lineAt(c.src), ws = toks(typeof l === 'string' ? l : l.he).map(strip);
    assert.equal(ws[c.src.word], c.head); assert.equal(ws[c.src.word + 1], c.tail);
    assert.equal(resolve(c.free.src), c.free.he);
    if (c.tailAlt) assert.equal(resolve(c.tailAlt.src), c.tailAlt.he);
  }
});

// ---------- catalogue, routes and file rules ----------
test('catalogue: twenty games, levels 3 to 5, own hub section, routes, labels, sections, privacy rows, triage rows, on-demand files', () => {
  assert.equal(G3_GAMES.length, 20);
  assert.deepEqual(G3_IDS, G3_GAMES.map((g) => g.id));
  assert.deepEqual([...new Set(G3_GAMES.map((g) => g.level))].sort(), [3, 4, 5]);
  for (const [band] of G3_BANDS) assert.ok(G3_GAMES.filter((g) => g.band === band).length >= 6, band);
  const listed = new Set(STORE_KEYS.map((r) => r[0])), inSection = new Set(Object.values(SECTION_ROUTES).flat());
  const triage = readFileSync(`${root}docs/v0/PREVIEW-TRIAGE.md`, 'utf8');
  const heSeen = new Set([...words.map((w) => w.he), ...g3('article').pairs.map((p) => p.the)]);
  globalThis.self = globalThis.self || {}; // the manifest sets self.ALEF_*
  const manifest = readFileSync(`${root}precache-manifest.js`, 'utf8');
  const onDemand = manifest.slice(manifest.indexOf('self.ALEF_ON_DEMAND')), installed = manifest.slice(0, manifest.indexOf('self.ALEF_ON_DEMAND'));
  for (const g of G3_GAMES) {
    assert.match(g.id, /^g3-[a-z]+$/);
    assert.ok(!ARCADE_GAMES.some((x) => x.id === g.id) && !HANUKKAH_GAMES.some((x) => x.id === g.id), 'kept out of the arcade rotation');
    assert.ok(existsSync(`${root}src/games/${g.id}.view.js`));
    const { route } = matchRoute('#/' + g.id);
    assert.equal(route?.module, `../games/${g.id}.view.js`); assert.equal(route.title, g.title); assert.equal(tierOf(route), 'preview');
    assert.equal(NAV_EN['nav.route.' + g.id], g.title);
    assert.ok(inSection.has(g.id)); assert.ok(listed.has(`games.${g.id}.v1`));
    assert.ok(triage.includes('| `' + g.id + '` |'), g.id);
    assert.match(g.titleHe, POINTED); assert.ok(heSeen.has(g.titleHe), `${g.titleHe} comes from the app's data`);
    assert.match(g.title, /^[A-Z0-9][^ ]*( (?:and|or|of|the|to|in|[A-Z0-9][^ ]*))*$/, `Title Case: ${g.title}`);
    assert.ok(g.art && g.tag, g.id);
    assert.ok(onDemand.includes(`"src/games/${g.id}.view.js"`) && !installed.includes(`"src/games/${g.id}.view.js"`), `${g.id} is fetched on demand`);
    assert.equal(nextG3(g.id).id, G3_IDS[(G3_IDS.indexOf(g.id) + 1) % 20]);
  }
  for (const f of readdirSync(`${root}data/games/g3`)) assert.ok(onDemand.includes(`"data/games/g3/${f}"`), f);
  for (const f of ['g3-core.js', 'g3-ui.js', 'g3-catalog.js']) assert.ok(onDemand.includes(`"src/games/${f}"`), f);
  const views = readFileSync(`${root}src/shell/views.generated.js`, 'utf8');
  for (const g of G3_GAMES) assert.ok(views.includes(`"games/${g.id}.view.js"`), g.id);
});

test('g3 files stay self-contained and honest: only arcade, tg, g3 and shell imports; no made-up voice; no written name; no "root" claim', () => {
  const files = readdirSync(`${root}src/games`).filter((f) => f.startsWith('g3-'));
  assert.equal(files.length, 23);
  for (const f of files) {
    const src = readFileSync(`${root}src/games/${f}`, 'utf8');
    for (const [, spec] of src.matchAll(/from '([^']+)'/g)) assert.match(spec, /^(\.\/(g3-[a-z-]+|tg-core|tg-ui|arcade)\.js|\.\.\/shell\/[a-z.-]+\.js)$/, `${f} imports ${spec}`);
    assert.doesNotMatch(src, /speechSynthesis|SpeechSynthesisUtterance|new Audio/, `${f} never makes up a voice`);
    assert.doesNotMatch(src, /יְהוָה|יהוה/, f);
    // learner-facing strings say "family letters": data/roots/verified.json confirms no root yet
    for (const [, s] of src.matchAll(/'([^'\n]*)'|`([^`\n]*)`/g)) if (s) assert.doesNotMatch(s, /\broots?\b/i, `${f}: ${s}`);
  }
  assert.equal(json('data/roots/verified.json').roots.length, 0, 'when roots get verified, the g3 wording can say "root"');
});

test('games hub: one Grammar in Action section that loads the catalogue on demand', async () => {
  const env = environment();
  const { g3Section } = await import('../src/games/games.view.js');
  const s = g3Section();
  for (let i = 0; i < 50 && !s.querySelectorAll('a').length; i++) await turn();
  const links = s.querySelectorAll('a').map((a) => a.getAttribute('href'));
  assert.deepEqual(links, G3_BANDS.flatMap(([band]) => G3_GAMES.filter((g) => g.band === band).map((g) => '#/' + g.id)));
  assert.match(s.querySelector('h2').textContent, /Grammar in Action/);
  void env;
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
    let clicks = 0, best = 0, idle = 0; const seen = [];
    const hudScore = () => Number((env.root.querySelector('.arc-hud-item')?.textContent || '').replace(/\D+/g, '')) || 0;
    while (clicks < maxClicks && !env.root.querySelector('.arc-results-card')) {
      const bs = enabled(board);
      if (bs.length) { idle = 0; bs[Math.floor(rnd() * bs.length)].click(); clicks++; best = Math.max(best, hudScore()); if (clicks % 5 === 0) seen.push(spaced(board)); }
      else if (++idle > 5000) break; // nothing to press and no results: a stuck board fails below
      await turn();
    }
    const card = env.root.querySelector('.arc-results-card');
    const next = card ? card.querySelectorAll('a').map((a) => a.getAttribute('href')) : [];
    const text = seen.join(' ') + ' ' + spaced(board);
    stop();
    assert.ok(!env.listeners.has('keydown'), 'key handler removed on unmount');
    return { finished: !!card, score: best, text, clicks, next, rec: mem.get(`games.${id}.v1`) };
  } finally { globalThis.setTimeout = realTimeout; }
}

for (const g of G3_GAMES) {
  test(`${g.id}: every level loads its data and plays through to the results card`, async () => {
    for (let level = 1; level <= 5; level++) {
      const r = await play(g.id, level);
      assert.ok(r.finished, `${g.id} level ${level} finished (${r.clicks} taps)`);
      assert.ok(r.score > 0, `${g.id} level ${level}: at least one right answer scored`);
      assert.ok(r.rec?.levels?.[level]?.plays === 1, 'best score saved for the level');
      assert.ok(r.next.includes('#/' + nextG3(g.id).id), 'the results card hands on to the next grammar game');
      assert.equal(findName(r.text).filter((w) => w.kind !== 'abbrev').length, 0, `${g.id} level ${level} never shows the written name`);
      assert.doesNotMatch(r.text, /\broots?\b|undefined|NaN|\[object/i, `${g.id} level ${level}: no "root" claim and no broken text`);
    }
  });
}
