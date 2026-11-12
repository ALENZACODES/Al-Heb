// Letters, vowels and reading sounds (src/games/g1-*): core rules, data checked against the app's own sources, the
// divine-name rule, catalogue and routes, and every level of every game played in the fake DOM until it finishes.
// Logic and wiring checks only; the Hebrew itself still needs a teacher's review (see the data note and the report).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Doc, El } from './wordtrace.fakedom.js';
import { findName } from '../src/shell/names.js';
import { seededRandom } from '../src/games/arcade.model.js';
import { G1_GAMES, G1_IDS, G1_BANDS } from '../src/games/g1-catalog.js';
import { matchRoute, tierOf } from '../src/shell/router.js';
import { NAV_EN } from '../src/shell/nav.strings.js';
import { SECTION_ROUTES, PREVIEW_HIDDEN } from '../src/shell/nav-model.js';
import { STORE_KEYS } from '../src/shell/privacy.view.js';
import { VIEW_FILES } from '../src/shell/views.generated.js';
import { ARCADE_GAMES, HANUKKAH_GAMES } from '../src/games/arcade.catalog.js';
import { TG_GAMES } from '../src/games/tg-catalog.js';
import { chipsFor } from '../src/pronunciation/syllables.js';
import { agreedShvas, syllablesOf, pickWords } from '../tools/games/build-g1.mjs';
import { CONSONANTS } from '../src/games/syllables.js';
import * as G from '../src/games/g1-core.js';
import { pool as strokePool } from '../src/games/g1-strokeorder.view.js';
import { revealChoices, revealPoints } from '../src/games/g1-reveal.view.js';
import { boardLetters } from '../src/games/g1-script.view.js';
import { duelPairs, speedBonus } from '../src/games/g1-duel.view.js';
import { raceLine } from '../src/games/g1-sounddash.view.js';
import { padLetters } from '../src/games/g1-rhythm.view.js';
import { questions as whereQuestions, SOUND_ONLY } from '../src/games/g1-whereis.view.js';
import { finalPool } from '../src/games/g1-finalswitch.view.js';
import { syllableItem, wordItems } from '../src/games/g1-sounddots.view.js';
import { fitsRule } from '../src/games/g1-vowelchain.view.js';
import { blendChoices } from '../src/games/g1-blend.view.js';
import { question as nonsenseQuestion } from '../src/games/g1-nonsense.view.js';
import { dageshWords } from '../src/games/g1-dagesh.view.js';
import { makeRiver, reachable } from '../src/games/g1-riverhop.view.js';
import { shvaQuestions, placeOf, WHY } from '../src/games/g1-shva.view.js';
import { helperWords, helperKind, KIND_SAY } from '../src/games/g1-helpers.view.js';
import { cutWords } from '../src/games/g1-syllablecut.view.js';
import { readingChoices } from '../src/games/g1-flashread.view.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const json = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
const POINTED = /[\u05B0-\u05BC\u05C1\u05C2\u05C7]/;
const letters = json('data/letters/letters.json');
const syllables = json('data/lab/syllables.json').syllables;
const g1 = json('data/games/g1/words.json');
const W = g1.words.map((w) => ({ ...w, syl: G.expandSyl(w.he, w.syl) || undefined })); // as loadWords gives them to the games
const src = json('data/vocab/words.json').words;
const byId = new Map(src.map((w) => [w.id, w]));
const arcadeLetters = letters.map((l) => ({ id: l.id, he: l.he, name: l.name, nameHe: l.nameHe, sound: l.sound?.en || '', confusableWith: l.confusableWith || [], isFinal: /-final$/.test(l.id) }));
const cl = (he) => G.letterClusters(he);

// ---------- data against the app's sources ----------
test('words: every record is copied unchanged from data/vocab/words.json, unreviewed words are never used, and the build is reproducible', () => {
  assert.equal(g1.schema, 'alef-g1-words/1'); assert.ok(g1.note.includes('Review'));
  assert.equal(g1.count, W.length); assert.ok(W.length >= 500);
  for (const w of W) {
    const s = byId.get(w.id);
    assert.ok(s, w.id);
    assert.equal(w.he, s.he); assert.equal(w.en, s.en); assert.equal(w.translit, s.translit);
    assert.equal(s.flags.needsReview, false, w.he); assert.ok(['A1', 'A2'].includes(s.level));
    assert.match(w.he, POINTED);
    assert.equal(findName(w.he).length, 0); assert.doesNotMatch(w.en, /\b(god|lord|deity|idol)\b/i);
  }
  assert.equal(new Set(W.map((w) => w.he)).size, W.length, 'one record per spelling');
  assert.deepEqual(pickWords(src), g1.words, 'node tools/games/build-g1.mjs gives the same file');
});

test('words: syllables and shva verdicts are what the app\'s own engines say today', () => {
  for (const w of W) {
    const raw = g1.words.find((x) => x.id === w.id).syl;
    if (raw) { assert.ok(raw.every((n) => Number.isInteger(n) && n > 0)); assert.ok(w.syl, w.he); }
    if (w.syl) { assert.deepEqual(w.syl, syllablesOf(w.he), w.he); assert.equal(w.syl.join(''), w.he); assert.deepEqual(w.syl, chipsFor(w.he).syllables.map((x) => x.he)); }
    const a = agreedShvas(w.he);
    assert.deepEqual(w.shva || [], a.all ? a.agreed : [], w.he);
    for (const [i] of w.shva || []) assert.ok(cl(w.he)[i].text.includes('\u05B0'), `${w.he}: a shva at ${i}`);
  }
  assert.ok(W.filter((w) => w.shva?.length).length >= 100);
});

test('catalogue Hebrew titles are words from the app\'s word list, pointed as there', () => {
  const all = new Set(src.map((w) => w.he));
  for (const g of G1_GAMES) { assert.ok(all.has(g.titleHe), `${g.id}: ${g.titleHe}`); assert.match(g.titleHe, POINTED); }
  assert.ok(all.has('אוֹת'), 'hub heading word');
});

test('letters and syllables: strokes, look-alikes and the sound table come from the app data', () => {
  assert.equal(letters.length, 27);
  assert.ok(G.strokeLetters(letters, 'print', 2).length >= 15);
  assert.ok(G.strokeLetters(letters, 'cursive', 1).length === 27);
  const pairs = G.lookalikePairs(arcadeLetters);
  assert.ok(pairs.length >= 10);
  for (const [a, b] of pairs) assert.ok(a.confusableWith.includes(b.id) || b.confusableWith.includes(a.id));
  assert.equal(G.SOUND_CARDS, CONSONANTS);
  assert.equal(syllables.length, 110);
  const con = json('data/pronunciation/consonants.json').letters;
  // the dot pairs and the sound twins, against the Israeli column of the consonant table
  assert.match(con.bet.ipa.israeli, /\[b\] with dagesh, \[v\] without/); assert.match(con.kaf.ipa.israeli, /\[k\] with dagesh, \[χ\] without/);
  assert.match(con.pe.ipa.israeli, /\[p\] with dagesh, \[f\] without/); assert.match(con.shin.ipa.israeli, /\[ʃ\] with right dot, \[s\] with left dot/);
  assert.equal(con.samekh.ipa.israeli, '[s]'); assert.equal(con.tet.ipa.israeli, '[t]'); assert.equal(con.tav.ipa.israeli, '[t]');
  assert.equal(con.qof.ipa.israeli, '[k]'); assert.equal(con.vav.ipa.israeli.slice(0, 3), '[v]'); assert.match(con.chet.ipa.israeli, /^\[χ\]/);
  assert.equal(G.LETTER_TWINS.length, 5);
  const niq = new Map(json('data/pronunciation/niqqud.json').records.map((r) => [r.id, r]));
  const ID = { patach: 'patach', kamatz: 'kamatz', segol: 'segol', tsere: 'tzere', hiriq: 'chirik', holam: 'cholam', kubutz: 'kubutz' };
  for (const v of G.VOWEL_MARKS) {
    const r = niq.get(ID[v.id]);
    assert.equal(r.codepoints[0], 'U+' + v.mark.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'), v.id);
    assert.equal(r.ipa.israeli.replace(/[\[\]\u031E]/g, ''), v.sound, v.id);
  }
  assert.equal(niq.get('shuruk').ipa.israeli, niq.get('kubutz').ipa.israeli);
});

// ---------- core rules ----------
test('strokes: view boxes, plain-words directions and the reveal plan', () => {
  const bet = letters.find((l) => l.id === 'bet');
  const box = G.viewBoxFor(bet.print.strokes);
  assert.equal(box.split(' ').length, 4);
  assert.equal(G.describeStroke(bet.print.strokes[0], box), 'from the top left to the bottom right');
  assert.equal(G.describeStroke(bet.print.strokes[1], box), 'from the bottom right to the bottom left');
  assert.deepEqual(G.revealPlan([1, 2, 3], 1, 3), [1, 0, 0]);
  assert.deepEqual(G.revealPlan([1, 2], 1, 4), [0.5, 0]);
  assert.deepEqual(G.revealPlan([1, 2], 4, 4), [1, 1]);
  assert.ok(revealPoints(1, 4) > revealPoints(4, 4));
  const p = strokePool(letters, { hand: 'print', max: 2, finals: false });
  assert.ok(p.length >= 10 && p.every(({ letter }) => letter.print.strokes.length === 2 && !/-final$/.test(letter.id)));
  const ch = revealChoices(letters.find((l) => l.id === 'dalet'), letters, 4, seededRandom(2));
  assert.equal(ch.length, 4); assert.ok(ch.some((l) => l.id === 'dalet') && ch.some((l) => l.id === 'resh'));
  const set = boardLetters(letters, { pairs: 4, set: 'alike' }, seededRandom(3));
  assert.equal(set.length, 4); assert.equal(new Set(set.map((l) => l.id)).size, 4);
});

test('letters: duels, sound options never share a sound, rhythms, trains and positions', () => {
  assert.ok(duelPairs(arcadeLetters, 'sound').every(([a, b]) => a.sound !== b.sound));
  assert.equal(speedBonus(500), 5); assert.equal(speedBonus(9000), 0);
  for (let k = 0; k < 50; k++) {
    const ans = CONSONANTS[k % CONSONANTS.length], o = G.soundOptions(ans, CONSONANTS, 8, seededRandom(k));
    assert.equal(o.length, 8); assert.equal(new Set(o.map((c) => c.tr)).size, 8); assert.ok(o.includes(ans));
  }
  assert.match(raceLine(3, 2), /you lead/);
  const r = G.rhythm(30, 2, seededRandom(1));
  for (let i = 2; i < r.length; i++) assert.ok(!(r[i] === r[i - 1] && r[i] === r[i - 2]));
  assert.equal(padLetters(arcadeLetters, 6, true, seededRandom(4)).length, 6);
  const t = G.trainCars(20, 5, 2, seededRandom(1));
  assert.deepEqual(t.map((c) => c.he).join(''), 'שתאבג'); assert.equal(t.filter((c) => c.gap).length, 2); assert.equal(t[0].gap, false);
  assert.deepEqual(G.trainCars(1, 3, 0, seededRandom(1), -1).map((c) => c.he).join(''), 'באת');
  assert.equal(G.positionOf('שָׁלוֹם', 'ש'), 'start'); assert.equal(G.positionOf('שָׁלוֹם', 'ו'), 'middle'); assert.equal(G.positionOf('שָׁלוֹם', 'מ'), 'end');
  assert.deepEqual(G.onceLetters('אַבָּא').sort(), ['ב']);
  const qs = whereQuestions(W, { ask: 'sound', maxLen: 5, count: 10 }, seededRandom(2));
  assert.equal(qs.length, 10);
  for (const q of qs) { assert.ok(SOUND_ONLY[q.letter]); assert.equal(q.spot, G.positionOf(q.word.he, q.letter)); }
});

test('final forms and dots', () => {
  assert.equal(G.plainSpelling('שָׁלוֹם'), 'שָׁלוֹמ'); assert.deepEqual(G.finalTargets('שָׁלוֹם'), [3]); assert.deepEqual(G.finalTargets('מִכְתָּב'), []);
  const fp = finalPool(W);
  assert.ok(fp.ends.length >= 50 && fp.middles.length >= 50);
  for (const w of fp.middles) assert.equal(G.finalTargets(w.he).length, 0);
  assert.deepEqual(G.dotItems('שִׂמְחָה'), [[0, 's']]); assert.deepEqual(G.dotItems('כֶּלֶב'), [[0, 'k'], [2, 'v']]); assert.deepEqual(G.dotItems('סוֹף'), [[2, 'f']]);
  for (let k = 0; k < 20; k++) { const q = syllableItem('ש', seededRandom(k)); assert.equal(G.dotSound(cl(q.he)[0]), q.sound); }
  for (const q of wordItems(W, 30, seededRandom(5))) assert.equal(G.dotSound(cl(q.he)[q.at]), q.sound);
  assert.equal(G.dageshEligible('שׁוּק'), false); assert.equal(G.dageshEligible('גָּבֹהַּ'), false); assert.equal(G.dageshEligible('בַּיִת'), true);
  assert.deepEqual(G.dageshTargets('כַּפִּית'), [0, 1]); assert.deepEqual(G.dageshTargets('אִמָּא', true), []);
  for (const w of dageshWords(W, { maxLen: 7, max: 3 })) assert.ok(!cl(w.he).some((c) => 'וה'.includes(c.base) && c.text.includes('\u05BC')) && G.dageshTargets(w.he).length >= 1);
});

test('vowels: dominoes, same-sound boards (one partner per tile), blends and made-up words', () => {
  const t = (c, v) => G.tile(CONSONANTS.find((x) => x.he === c), G.VOWEL_MARKS.find((x) => x.id === v));
  assert.ok(G.fits(t('ל', 'patach'), t('ל', 'segol'))); assert.ok(G.fits(t('ל', 'patach'), t('מ', 'kamatz'))); assert.ok(!G.fits(t('ל', 'patach'), t('מ', 'segol')));
  assert.ok(!fitsRule(t('ל', 'patach'), t('ל', 'segol'), 'vowel'));
  for (let k = 0; k < 30; k++) { const open = t('ר', 'holam'), hand = G.dealHand(open, 5, G.MAIN_MARKS, seededRandom(k)); assert.equal(hand.length, 5); assert.ok(hand.some((x) => G.fits(x, open))); }
  for (const mode of ['vowel', 'letter', 'mixed']) for (let k = 0; k < 30; k++) {
    const b = G.pairsBoard(6, mode, seededRandom(k));
    assert.equal(b.length, 12);
    const keys = new Map(); for (const x of b) keys.set(x.key, (keys.get(x.key) || 0) + 1);
    assert.ok([...keys.values()].every((n) => n === 2), 'every sound written exactly twice');
    for (const x of b) assert.match(x.he, POINTED);
  }
  const w = W.find((x) => x.syl?.length === 2);
  const bc = blendChoices(w, W, 4, true, seededRandom(1));
  assert.equal(bc.length, 4); assert.equal(new Set(bc.map((x) => x.he)).size, 4); assert.ok(bc.every((x) => x.syl.length === 2));
  for (let k = 0; k < 60; k++) {
    const q = nonsenseQuestion(syllables, { syl: 2 + (k % 2), closed: k % 3 ? 1 : 0, choices: 4 }, seededRandom(k));
    assert.ok(q); assert.equal(new Set(q.options).size, 4); assert.ok(q.options.includes(q.word.tr));
    assert.ok(q.word.parts.slice(1).every(G.midOk)); assert.ok(q.word.parts[0].letter !== 'vav');
    assert.equal(q.word.he, q.word.parts.map((p) => p.he).join('') + (q.word.close ? q.word.close[0] : ''));
  }
  const rv = makeRiver(syllables, 6, 4, true, seededRandom(9));
  rv.path.forEach((c, r) => { assert.equal(rv.grid[r].length, 4); assert.equal(new Set(rv.grid[r].map((s) => s.tr)).size, 4); if (r) assert.ok(reachable(rv.path[r - 1], c)); });
});

test('reading: shva questions, helpers, syllable cuts and readings', () => {
  const qs = shvaQuestions(W, ['start', 'middle', 'end'], 12, seededRandom(3));
  assert.equal(qs.length, 12);
  for (const q of qs) {
    assert.equal(q.place, placeOf(q.word.he, q.at)); assert.ok(WHY[q.place]);
    assert.equal(q.said, q.place === 'start', `${q.word.he}: start is said, middle and end are silent in the settled cases`);
  }
  assert.deepEqual(G.helperTargets('שָׁלוֹם'), [2]); assert.deepEqual(G.helperTargets('תּוֹדָה'), [1, 3]); assert.deepEqual(G.helperTargets('מְכוֹנִית'), [2, 4]);
  assert.deepEqual(G.helperTargets('רֹאשׁ'), [1]); assert.deepEqual(G.helperTargets('מִצְוֹת'), []); assert.deepEqual(G.helperTargets('אוּלַי'), [1]);
  assert.deepEqual(G.helperTargets('חַיִּים'), [2]); assert.deepEqual(G.helperTargets('עַכְשָׁו'), []); assert.equal(G.helperTargets('אֵלָיו'), null);
  for (const k of Object.keys(KIND_SAY)) assert.ok(KIND_SAY[k]);
  const hw = helperWords(W, { kinds: ['vav-o', 'vav-u'], none: false, count: 8 }, seededRandom(1));
  assert.equal(hw.length, 8);
  for (const w of hw) assert.ok(G.helperTargets(w.he).every((i) => helperKind(cl(w.he)[i]).startsWith('vav')));
  assert.deepEqual(G.cutsOf(['שָׁ', 'לוֹם']), [0]); assert.deepEqual(G.cutsOf(['מִשְׁ', 'פָּ', 'חָה']), [1, 2]);
  for (const w of cutWords(W, { syl: [2, 3], maxLen: 7 })) { assert.ok(G.cutEligible(w)); assert.doesNotMatch(w.he, /[\u05B1-\u05B3]/); assert.ok(!(w.shva || []).some((s) => s[1] === 'na')); }
  assert.equal(G.cutEligible({ he: 'הִצְבִּיעַ', syl: ['הִצְ', 'בִּי', 'עַ'] }), false, 'a furtive patach is not cut');
  const rc = readingChoices(W[5], W, 5, seededRandom(2));
  assert.equal(rc.length, 5); assert.equal(new Set(rc.map((x) => x.translit)).size, 5);
});

// ---------- catalogue, routes and file rules ----------
test('catalogue: twenty g1 games, mostly levels 1 and 2, routes, labels, hub section, privacy and triage rows', () => {
  assert.equal(G1_GAMES.length, 20); assert.deepEqual(G1_IDS, G1_GAMES.map((g) => g.id));
  assert.ok(G1_GAMES.every((g) => g.level >= 1 && g.level <= 3)); assert.ok(G1_GAMES.filter((g) => g.level <= 2).length >= 15);
  const bands = new Set(G1_BANDS.map(([b]) => b));
  const listed = new Set(STORE_KEYS.map((r) => r[0])), inSection = new Set(SECTION_ROUTES.learn);
  const triage = readFileSync(root + 'docs/v0/PREVIEW-TRIAGE.md', 'utf8');
  for (const g of G1_GAMES) {
    assert.match(g.id, /^g1-[a-z]+$/); assert.ok(bands.has(g.band), g.id);
    assert.ok(!ARCADE_GAMES.some((x) => x.id === g.id) && !HANUKKAH_GAMES.some((x) => x.id === g.id), 'kept out of the arcade rotation');
    assert.ok(existsSync(`${root}src/games/${g.id}.view.js`)); assert.ok(VIEW_FILES.includes(`games/${g.id}.view.js`));
    const { route } = matchRoute('#/' + g.id);
    assert.equal(route?.module, `../games/${g.id}.view.js`); assert.equal(route.title, g.title); assert.equal(tierOf(route), 'preview');
    assert.equal(NAV_EN['nav.route.' + g.id], g.title);
    assert.ok(inSection.has(g.id)); assert.ok(PREVIEW_HIDDEN.has(g.id)); assert.ok(listed.has(`games.${g.id}.v1`));
    assert.ok(triage.includes(`| \`${g.id}\` | hide |`), `${g.id} triage row`);
    assert.match(g.title, /^[A-Z0-9][^ ]*( (?:and|or|of|the|to|in|[A-Z0-9][^ ]*))*$/, `Title Case: ${g.title}`);
    assert.ok(g.tag.length > 10 && g.art.length > 20);
    const view = readFileSync(`${root}src/games/${g.id}.view.js`, 'utf8');
    assert.ok(view.includes(`id: '${g.id}', title: '${g.title.replace(/'/g, "\\'")}', titleHe: '${g.titleHe}'`), `${g.id}: the view's own title matches the catalogue`);
    assert.ok(view.includes(`STORE_KEY = 'games.${g.id}.v1'`));
  }
  const titles = new Set([...ARCADE_GAMES, ...HANUKKAH_GAMES, ...TG_GAMES].map((g) => g.title));
  assert.ok(G1_GAMES.every((g) => !titles.has(g.title)), 'no title clashes with an existing game');
  const hub = readFileSync(root + 'src/games/games.view.js', 'utf8');
  assert.match(hub, /import\('\.\/g1-catalog\.js'\)/, 'the hub loads the g1 catalogue lazily');
  assert.doesNotMatch(hub, /from '\.\/g1-catalog\.js'/);
  const manifest = readFileSync(root + 'precache-manifest.js', 'utf8');
  const onDemand = manifest.slice(manifest.indexOf('ALEF_ON_DEMAND')), installed = manifest.slice(0, manifest.indexOf('ALEF_ON_DEMAND'));
  for (const f of [...readdirSync(root + 'src/games').filter((x) => x.startsWith('g1-')).map((x) => 'src/games/' + x), 'data/games/g1/words.json']) {
    assert.ok(onDemand.includes(`"${f}"`), `${f} is on demand`); assert.ok(!installed.includes(`"${f}"`), `${f} is not installed`);
  }
});

test('g1 files stay self-contained: only engine, arcade, shell, tg, pronunciation-free imports; no made-up voice; no written divine name', () => {
  const files = readdirSync(`${root}src/games`).filter((f) => f.startsWith('g1-'));
  assert.equal(files.length, 23);
  for (const f of files) {
    const text = readFileSync(`${root}src/games/${f}`, 'utf8');
    for (const [, spec] of text.matchAll(/from '([^']+)'/g)) assert.match(spec, /^(\.\/(g1-[a-z-]+|tg-core|tg-ui|arcade|engine|syllables)\.js|\.\.\/shell\/[a-z.-]+\.js)$/, `${f} imports ${spec}`);
    assert.doesNotMatch(text, /speechSynthesis|SpeechSynthesisUtterance/, `${f} never makes up a voice`);
    assert.equal(findName(text).filter((w) => w.kind !== 'abbrev').length, 0, `${f} has no written divine name`);
    assert.doesNotMatch(text, /\b(AI|ChatGPT|Claude|GPT)\b/, `${f}: no mention of AI tools`);
  }
  const raw = readFileSync(`${root}data/games/g1/words.json`, 'utf8');
  assert.equal(findName(raw).filter((w) => w.kind !== 'abbrev').length, 0);
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

export async function play(id, level, maxClicks = 40000) {
  const mod = await import(`../src/games/${id}.view.js`);
  const env = environment();
  const mem = new Map([[`games.${id}.v1`, { unlocked: 5 }]]); const store = { get: (k) => mem.get(k), set: (k, v) => mem.set(k, v) };
  globalThis.setTimeout = (fn, ms, ...a) => realTimeout(fn, Math.min(ms || 0, 1), ...a);
  try {
    const stop = await mod.mount(env.root, { store, settings, fetchFn, images: { resolve: () => null }, audio: null, route: { query: { level: String(level) } } });
    for (let i = 0; i < 400 && !env.root.querySelector('.arc-start'); i++) await turn();
    env.root.querySelector('.arc-start').click();
    const board = env.root.querySelector('.arc-board');
    let ready = false;
    for (let i = 0; i < 3000 && !ready; i++) { await turn(); ready = enabled(board).length > 0; }
    assert.ok(ready, `${id} level ${level}: the board has something to press (its data loaded)`);
    const rnd = seededRandom(level * 31 + id.length);
    let clicks = 0, best = 0, idle = 0;
    const hudScore = () => Number((env.root.querySelector('.arc-hud-item')?.textContent || '').replace(/\D+/g, '')) || 0;
    const texts = [];
    while (clicks < maxClicks && !env.root.querySelector('.arc-results-card') && idle < 5000) {
      const bs = enabled(board);
      if (bs.length) { idle = 0; bs[Math.floor(rnd() * bs.length)].click(); clicks++; best = Math.max(best, hudScore()); if (clicks % 25 === 1) texts.push(spaced(board)); } else idle++;
      await turn();
    }
    const finished = !!env.root.querySelector('.arc-results-card');
    texts.push(spaced(board));
    stop();
    assert.ok(!env.listeners.has('keydown'), 'key handler removed on unmount');
    return { finished, score: best, text: texts.join('\n'), clicks, rec: mem.get(`games.${id}.v1`) };
  } finally { globalThis.setTimeout = realTimeout; }
}

const only = process.env.G1_ONLY ? process.env.G1_ONLY.split(',') : null;
for (const g of G1_GAMES) {
  if (only && !only.includes(g.id)) continue;
  if (!existsSync(`${root}src/games/${g.id}.view.js`)) continue;
  test(`${g.id}: every level loads its data and plays through to the results card`, async () => {
    for (let level = 1; level <= 5; level++) {
      // a random tapper can miss every time on a short board; it gets up to three rounds to land one right answer
      let r = await play(g.id, level);
      for (let k = 0; k < 2 && r.finished && !r.score; k++) r = await play(g.id, level);
      assert.ok(r.finished, `${g.id} level ${level} finished (${r.clicks} taps)`);
      assert.ok(r.score > 0, `${g.id} level ${level}: at least one right answer scored`);
      assert.ok(r.rec?.levels?.[level]?.plays === 1, 'best score saved for the level');
      assert.equal(findName(r.text).filter((w) => w.kind !== 'abbrev').length, 0, `${g.id} level ${level} never shows the written name`);
    }
  });
}
