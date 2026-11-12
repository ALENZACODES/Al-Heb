// Everyday Israel games (src/games/g4-*): core rules, the bank checked line by line against the app's own sources,
// the divine-name rule, catalogue and routes, and every level of every game played in the fake DOM until it finishes.
// Logic and wiring checks only; the Hebrew itself still needs a native speaker's review (see the bank's review notes).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Doc, El } from './wordtrace.fakedom.js';
import { findName } from '../src/shell/names.js';
import { seededRandom } from '../src/games/arcade.model.js';
import { G4_GAMES, G4_IDS } from '../src/games/g4-catalog.js';
import { matchRoute, tierOf } from '../src/shell/router.js';
import { NAV_EN } from '../src/shell/nav.strings.js';
import { SECTION_ROUTES, PREVIEW_HIDDEN } from '../src/shell/nav-model.js';
import { STORE_KEYS } from '../src/shell/privacy.view.js';
import { ARCADE_GAMES } from '../src/games/arcade.catalog.js';
import { stripPoints, isPointed, hourPhrase, hourAngle, minuteAngle, hhmm, makeChange, total, noteFor, DENOMS, isOpen, turn as turnTo, walk, randomRoute, DAY_KEYS } from '../src/games/g4-core.js';
import { MOMENTS, GREETINGS, deckFor, wrongFor, wrongPool } from '../src/games/g4-greetings.view.js';
import { hoursFor } from '../src/games/g4-clock.view.js';
import { NEEDS as SIGN_NEEDS, CLASH as SIGN_CLASH, WALL, street } from '../src/games/g4-signs.view.js';
import { makeOrder as cafeOrder } from '../src/games/g4-cafe.view.js';
import { GOODS as KIOSK, makeSale } from '../src/games/g4-change.view.js';
import { STOPS, makeRide, ringResult } from '../src/games/g4-bell.view.js';
import { NEEDS as WEATHER_NEEDS, ITEMS as WEATHER_ITEMS, packList, forecast } from '../src/games/g4-weather.view.js';
import { gapped, rivals, GAP } from '../src/games/g4-slang.view.js';
import { TOPPINGS, makeOrder as pitaOrder, tapResult } from '../src/games/g4-falafel.view.js';
import { PLACES as BOARD_PLACES, makeBoard, goodRows, deadlineFor } from '../src/games/g4-busboard.view.js';
import { SIGNS, moment, nextOpening } from '../src/games/g4-hours.view.js';
import { GOODS as SHUK, MOVES, haggle, points } from '../src/games/g4-shuk.view.js';
import { MENU, allowed, fits, makeDiner } from '../src/games/g4-menu.view.js';
import { PLACES as GRID_PLACES, stepsTo, goodDirection } from '../src/games/g4-grid.view.js';
import { DIGIT_KEYS, makeNumber, groups } from '../src/games/g4-phone.view.js';
import { replies } from '../src/games/g4-tone.view.js';
import { ERRANDS, feasible, makeWeek, place } from '../src/games/g4-week.view.js';
import { pair, contextOf } from '../src/games/g4-tourist.view.js';
import { SERVICES, CASES, CLASH as HELP_CLASH, rivalsOf, sayRivals } from '../src/games/g4-emergency.view.js';
import { COMPLAINTS, TIMES, WHEN, slotOk } from '../src/games/g4-pharmacy.view.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const json = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
export const BANK = json('data/games/g4/bank.json');
export const bankMap = new Map(BANK.items.map((x) => [x.key, x]));


// ---------- the bank: every Hebrew line copied from the app's own data ----------
const pb = new Map(json('data/corpus/phrasebook.json').entries.map((e) => [e.id, e]));
const lessons = new Map(json('data/curriculum/lessons.json').lessons.map((l) => [l.id, l]));
const dlg = new Map(json('data/curriculum/dialogues.json').dialogues.flatMap((d) => d.lines.map((l) => [l.id, l])));
const words = new Map(json('data/vocab/words.json').words.map((w) => [w.id, w]));
const v5 = new Map(json('data/vocab/vocab5000.json').entries.map((w) => [w.id, w]));
const days = json('data/calendar/days.json').days;
const ladder = new Map(json('data/israel/register-ladder.json').pairs.map((p) => [p.id, p]));
const scen = new Map(json('data/israel/scenarios.json').scenarios.map((x) => [x.id, x]));
/** The source record's Hebrew (and transliteration) for a bank src reference. */
function source(src) {
  const [kind, ...rest] = src.split(':');
  if (kind === 'phrasebook') { const e = pb.get(rest[0]); return { he: e.he, tr: e.translit }; }
  if (kind === 'lessons') { const w = lessons.get(rest[0]).words[Number(rest[1])]; return { he: w.he, tr: w.translit }; }
  if (kind === 'dialogues') { const l = dlg.get(rest[0]); return { he: l.he, tr: l.translit }; }
  if (kind === 'words') { const w = words.get(rest[0]); return { he: w.he, tr: w.translit }; }
  if (kind === 'vocab5000') return { he: v5.get(rest[0]).pointed };
  if (kind === 'days') return { he: days[rest[0]].he, tr: days[rest[0]].tr };
  if (kind === 'ladder') { const x = ladder.get(rest[0])[rest[1]]; return { he: x.he, tr: x.translit }; }
  if (kind === 'scenario') { const sc = scen.get(rest[0]); const x = rest[1] === 'other' ? sc.other : sc.options.find((o) => o.role === rest[1]); return { he: x.he, tr: x.translit }; }
  throw new Error('unknown source ' + src);
}
const POINTED = /[ְ-ׇּׁׂ]/;

test('bank: every line is an exact copy of its source (whole, a word slice, or two entries joined), pointed, with an English gloss', () => {
  assert.ok(BANK.schema && BANK.note && BANK.items.length > 250);
  const keys = new Set();
  for (const it of BANK.items) {
    assert.ok(!keys.has(it.key), `duplicate key ${it.key}`); keys.add(it.key);
    assert.ok(it.he && it.en, it.key);
    assert.match(it.he, POINTED, `${it.key} is pointed`);
    if (it.parts) { assert.equal(it.he, it.parts.map((p) => source(p).he).join(it.join), it.key); assert.ok(it.review, `${it.key}: joined lines carry a review note`); continue; }
    const src = source(it.src);
    const want = it.slice ? src.he.split(' ').slice(...it.slice).join(' ') : src.he;
    assert.equal(it.he, want, `${it.key} copies ${it.src}`);
    if (it.tr && !it.slice) assert.equal(it.tr, src.tr, `${it.key} transliteration copied`);
  }
});

test('bank: recorded clips point at practical items with the same Hebrew (word ids are words.json ids); nothing is synthesised', () => {
  const clipMap = json('data/curriculum/practical/clip-map.json').items;
  const practical = new Map();
  for (const f of readdirSync(root + 'data/curriculum/practical').filter((x) => /^pu-.*\.json$/.test(x))) for (const it of json('data/curriculum/practical/' + f).items) practical.set(it.id, it.he);
  const clipItem = new Map(Object.values(clipMap).map((v) => [`${v.kind}:${v.clipId}`, v.itemId]));
  let n = 0;
  for (const it of BANK.items.filter((x) => x.clip)) {
    n += 1;
    if (it.src.startsWith('words:')) { assert.equal(it.clip.id, it.src.slice(6)); continue; }
    const item = clipItem.get(`${it.clip.kind}:${it.clip.id}`);
    assert.ok(item, `${it.key}: ${it.clip.id} is in the clip map`);
    assert.equal(practical.get(item), it.he, `${it.key}: the clip ${it.clip.id} says the same Hebrew`);
  }
  assert.ok(n > 100);
  for (const f of readdirSync(root + 'src/games').filter((x) => x.startsWith('g4-'))) assert.doesNotMatch(readFileSync(root + 'src/games/' + f, 'utf8'), /speechSynthesis|SpeechSynthesisUtterance|new Audio\(/, `${f} plays only existing clips`);
});

test('divine name: none in the bank, the Israel files the games read, or the g4 code; showName is applied to all shown Hebrew', () => {
  for (const p of ['data/games/g4/bank.json', 'data/israel/fillers.json', 'data/israel/scenarios.json', 'data/israel/giveaways.json']) assert.equal(findName(readFileSync(root + p, 'utf8')).filter((w) => w.kind !== 'abbrev').length, 0, p);
  for (const f of readdirSync(root + 'src/games').filter((x) => x.startsWith('g4-'))) {
    const src = readFileSync(root + 'src/games/' + f, 'utf8');
    assert.doesNotMatch(src, /יְהוָה|יהוה/, f);
    for (const [, spec] of src.matchAll(/from '([^']+)'/g)) assert.match(spec, /^(\.\/(g4-[a-z-]+|tg-core|tg-ui|arcade|engine)\.js|\.\.\/shell\/[a-z.-]+\.js)$/, `${f} imports ${spec}`);
  }
  const ui = readFileSync(root + 'src/games/g4-ui.js', 'utf8');
  assert.match(ui, /showName\(plain \? stripPoints\(item\.he\) : item\.he\)/);
});

test('catalogue: twenty games, levels 2 to 5, Title Case, titleHe from the bank, routes, labels, sections, privacy and triage rows, hub-only', () => {
  assert.equal(G4_GAMES.length, 20);
  assert.deepEqual(G4_IDS, G4_GAMES.map((g) => g.id));
  const doc = readFileSync(root + 'docs/v0/PREVIEW-TRIAGE.md', 'utf8');
  const heSet = new Set(BANK.items.map((x) => x.he));
  const listed = new Set(STORE_KEYS.map((r) => r[0])), inSection = new Set(Object.values(SECTION_ROUTES).flat());
  for (const level of [2, 3, 4, 5]) assert.ok(G4_GAMES.filter((g) => g.level === level).length >= 4, `level ${level}`);
  for (const g of G4_GAMES) {
    assert.match(g.id, /^g4-[a-z]+$/);
    assert.ok(g.level >= 2 && g.level <= 5 && ['beginner', 'intermediate', 'advanced'].includes(g.band) && g.tag && g.art, g.id);
    assert.ok(!ARCADE_GAMES.some((x) => x.id === g.id), `${g.id} stays out of ARCADE_GAMES`);
    assert.ok(heSet.has(g.titleHe), `${g.id} titleHe is a bank line`);
    const { route } = matchRoute('#/' + g.id);
    assert.equal(route?.module, `../games/${g.id}.view.js`); assert.equal(route.title, g.title); assert.equal(tierOf(route), 'preview');
    assert.equal(NAV_EN['nav.route.' + g.id], g.title);
    assert.ok(inSection.has(g.id) && PREVIEW_HIDDEN.has(g.id), g.id);
    assert.ok(listed.has(`games.${g.id}.v1`));
    assert.match(doc, new RegExp('^\\| `' + g.id + '` \\| hide \\|', 'm'));
    assert.match(g.title, /^[A-Z0-9][^ ]*( (?:and|or|of|the|to|in|for|[A-Z0-9][^ ]*))*$/, `Title Case: ${g.title}`);
    assert.ok(existsSync(`${root}src/games/${g.id}.view.js`));
  }
  const pre = readFileSync(root + 'precache-manifest.js', 'utf8');
  const onDemand = pre.slice(pre.indexOf('self.ALEF_ON_DEMAND'));
  for (const f of [...readdirSync(root + 'src/games').filter((x) => x.startsWith('g4-')).map((x) => 'src/games/' + x), 'data/games/g4/bank.json']) assert.ok(onDemand.includes(`"${f}"`), `${f} is on demand, not installed`);
  const views = readFileSync(root + 'src/shell/views.generated.js', 'utf8');
  for (const g of G4_GAMES) assert.ok(views.includes(`"games/${g.id}.view.js"`));
});

test('hub: one Everyday Israel section links every g4 game once the catalogue loads; its Hebrew word is in the lessons', async () => {
  environment();
  const { g4Section } = await import('../src/games/games.view.js');
  const s = g4Section();
  for (let i = 0; i < 50 && !s.querySelector('a'); i++) await turn();
  assert.deepEqual(s.querySelectorAll('a').map((a) => a.getAttribute('href')), G4_GAMES.map((g) => '#/' + g.id));
  assert.match(s.querySelector('h2').textContent, /^Everyday Israel/);
  assert.ok(readFileSync(root + 'data/curriculum/lessons.json', 'utf8').includes('"he": "יִשְׂרָאֵל"'));
});

// ---------- core rules ----------
test('core: street text without points, clock angles and times, change, opening hours, turning and walking', () => {
  assert.equal(stripPoints('בֵּית מֶרְקַחַת'), 'בית מרקחת'); assert.equal(stripPoints('רַב-קַו'), 'רב-קו');
  assert.ok(isPointed('שָׁלוֹם') && !isPointed('שלום'));
  const B = bankMap;
  assert.equal(hourPhrase(B, 3).he, B.get('t.three').he, 'the hour phrase for 3 is the phrasebook line exactly');
  assert.equal(hourPhrase(B, 7).he, B.get('t.seven').he, 'the hour phrase for 7 is lesson I-19\'s line exactly');
  assert.equal(hourPhrase(B, 11), null); assert.equal(hourPhrase(B, 0), null);
  assert.equal(hourAngle(3), 90); assert.equal(hourAngle(6, 30), 195); assert.equal(minuteAngle(15), 90); assert.equal(hhmm(17 * 60 + 5), '17:05'); assert.equal(hhmm(-10), '23:50');
  for (let a = 1; a < 400; a++) { const c = makeChange(a); assert.equal(total(c), a); assert.ok(c.every((x) => DENOMS.includes(x))); }
  assert.deepEqual(makeChange(88), [50, 20, 10, 5, 2, 1]); assert.equal(noteFor(19), 20); assert.equal(noteFor(21), 50);
  const sign = { rows: [{ days: [0, 4], open: 480, close: 1140 }, { days: [5, 5], open: 480, close: 840 }, { days: [6, 6], closed: true }] };
  assert.ok(isOpen(sign, 2, 600) && !isOpen(sign, 2, 1140) && isOpen(sign, 5, 839) && !isOpen(sign, 5, 840) && !isOpen(sign, 6, 600));
  assert.equal(turnTo('N', 'right'), 'E'); assert.equal(turnTo('N', 'left'), 'W'); assert.equal(turnTo('W', 'right'), 'N');
  assert.deepEqual(walk([2, 2], 'N', ['straight', 'right', 'right']).end, [2, 3]);
  assert.equal(walk([0, 0], 'N', ['straight']).off, true);
  const rnd = seededRandom(9);
  for (let i = 0; i < 200; i++) { const r = randomRoute(4, 5, rnd); assert.deepEqual(walk(r.start, r.heading, r.cmds).end, r.end); }
  assert.equal(DAY_KEYS.length, 7);
});

test('greetings, clock, signs, café: moments never offer a greeting that also fits; streets never hold two answers', () => {
  for (let level = 1; level <= 5; level++) {
    const d = deckFor(level, seededRandom(level)); assert.equal(d.length, 10);
    for (const m of d) { assert.ok(m.from <= level); const w = wrongFor(m); assert.ok(w.length >= 5, m.en); assert.ok(wrongPool(m, level, 5).length >= 5); assert.ok(!w.includes(m.key) && !(m.also || []).some((k) => w.includes(k))); }
  }
  for (const k of GREETINGS) assert.ok(bankMap.has(k), k);
  assert.ok(hoursFor(5, seededRandom(1)).every((h) => h >= 1 && h <= 5));
  for (const k of WALL) assert.ok(bankMap.has(k), k);
  for (const need of SIGN_NEEDS) for (let i = 0; i < 20; i++) {
    const st = street(need, 12, seededRandom(i)); assert.equal(st.length, 12); assert.equal(new Set(st).size, 12); assert.ok(st.includes(need.key));
    const clash = SIGN_CLASH.filter((g) => g.includes(need.key)).flat();
    assert.ok(st.filter((k) => clash.includes(k)).length <= 1, need.en);
  }
  for (let i = 0; i < 50; i++) {
    const o = cafeOrder(seededRandom(i), { table: i % 2 === 1, tone: true });
    for (const t of o.turns) { assert.ok(bankMap.has(t.want)); if (t.them) assert.ok(bankMap.has(t.them)); }
    if (o.who === 'noa') assert.ok(o.turns.every((t) => !t.stiff), 'Noa is never offered the masculine stiff line');
  }
});

test('change, bell, weather, fillers, falafel: sales owe change, rings judge early and late, packing follows the forecast', () => {
  for (const k of Object.keys(KIOSK)) assert.ok(bankMap.has(k));
  for (let i = 0; i < 100; i++) { const s = makeSale(1 + (i % 3), seededRandom(i), 20); assert.ok(s.paid > s.price && s.change === s.paid - s.price); }
  for (const k of STOPS) assert.ok(bankMap.has(k));
  const ride = makeRide(6, seededRandom(3)); assert.ok(ride.target >= 1 && ride.target < 6);
  assert.equal(ringResult(ride, ride.target), 'right'); assert.equal(ringResult(ride, ride.target - 1), 'early'); assert.equal(ringResult(ride, ride.target + 1), 'late');
  for (const k of [...Object.keys(WEATHER_NEEDS), ...WEATHER_ITEMS]) assert.ok(bankMap.has(k), k);
  assert.deepEqual(packList([['w.rain', 'w.cold']]).sort(), ['w.coat', 'w.sweater']);
  for (let i = 0; i < 30; i++) for (const d of forecast(3, 2, seededRandom(i))) assert.ok(Number.isInteger(d.temp) && d.weather.length <= 2);
  const fill = json('data/israel/fillers.json').fillers;
  for (const f of fill) { const g = gapped(f); assert.ok(g && g.includes(GAP), f.id); assert.equal(g.replace(GAP, f.he), f.example.he); assert.ok(rivals(f, fill).length >= 4, f.id); }
  for (const k of TOPPINGS) assert.ok(bankMap.has(k));
  const o = pitaOrder(3, true, seededRandom(2));
  assert.equal(o.want.length, 3); assert.ok(o.not && !o.want.includes(o.not));
  assert.equal(tapResult(o, [], o.not), 'without'); assert.equal(tapResult(o, [], o.want[0]), 'add'); assert.equal(tapResult(o, [o.want[0]], o.want[0]), 'again');
});

test('board, hours, shuk, menu, grid, phone: departures, doors, the seller, diners, directions and digits follow their rules', () => {
  for (const k of BOARD_PLACES) assert.ok(bankMap.has(k));
  for (let i = 0; i < 50; i++) {
    const b = makeBoard(7, 3, 600, seededRandom(i));
    assert.equal(b.rows.filter((r) => r.dest === b.target).length, 3);
    assert.ok(goodRows(b, 600).length === 3);
    const dl = deadlineFor(b.rows.filter((r) => r.dest === b.target).slice(1));
    assert.ok(goodRows(b, 600, dl).length >= 1);
  }
  for (const s of SIGNS) {
    assert.ok(bankMap.has(s.key));
    for (let i = 0; i < 40; i++) { const m = moment(s, seededRandom(i)); assert.ok(m.day >= 0 && m.day <= 6); }
    assert.equal(isOpen(s, 6, 600), false, `${s.key} is shut on Shabbat`);
    const nx = nextOpening(s, 6, 600); assert.equal(nx.day, 0, 'after Shabbat it opens on Sunday');
  }
  for (const k of [...Object.keys(SHUK), ...Object.values(MOVES).flatMap((m) => m.keys)]) assert.ok(bankMap.has(k), k);
  let st = { asked: false, price: 50, start: 50, floor: 28, patience: 3, tasted: false, qty: 1, two: false };
  assert.equal(haggle(st, 'bit').state.patience, 2, 'pushing before asking costs patience');
  st = haggle(st, 'ask').state; st = haggle(st, 'bit').state; assert.equal(st.price, 45);
  assert.ok(haggle(st, 'rude').done && !haggle(st, 'rude').bought);
  assert.ok(points({ ...st, price: 30 }, true) > points(st, true)); assert.equal(points(st, false), 0);
  for (const k of Object.keys(MENU)) assert.ok(bankMap.has(k));
  assert.ok(!allowed('f.chicken', 'veg') && !allowed('f.cake', 'vegan') && allowed('f.hummus', 'vegan'));
  for (let l = 1; l <= 5; l++) for (let i = 0; i < 20; i++) {
    const d = makeDiner(l, seededRandom(i * 7 + l));
    assert.ok(Object.keys(MENU).some((k) => MENU[k].course === 'main' && fits(k, d.diet, d.budget, d.courses.slice(1))), 'every diner can be served');
  }
  for (const k of GRID_PLACES) assert.ok(bankMap.has(k));
  assert.equal(stepsTo([2, 2], 'N', [2, 2]), 0); assert.equal(stepsTo([2, 2], 'N', [0, 2]), 2);
  assert.ok(goodDirection([2, 2], 'N', [0, 2], 'straight') && !goodDirection([2, 2], 'N', [0, 2], 'left'));
  for (const k of DIGIT_KEYS) assert.ok(bankMap.has(k));
  const mob = makeNumber('mobile', seededRandom(1)); assert.equal(mob.length, 10); assert.deepEqual(mob.slice(0, 2), [0, 5]);
  assert.deepEqual(groups(mob).map((g) => g.length), [3, 3, 4]); assert.equal(makeNumber('local', seededRandom(2)).length, 7);
});

test('tone, week, tourist, emergency, pill box: forms by speaker, solvable weeks, honest pairs, no overlapping answers', () => {
  const sc = json('data/israel/scenarios.json').scenarios;
  for (const s of sc) for (const g of ['m', 'f']) {
    const r = replies(s, g, { genderTrap: true });
    assert.equal(r.filter((x) => x.role === 'natural').length, 1);
    for (const x of r.filter((y) => !y.wrongForm)) { const o = s.options.find((y) => y.role === x.role); assert.equal(x.he, o.forms?.[g]?.he || o.he); }
  }
  for (const e of ERRANDS) assert.ok(bankMap.has(e.key), e.key);
  assert.ok(ERRANDS.find((e) => e.id === 'dinner').days.join() === '5' && !ERRANDS.find((e) => e.id === 'bus').days.includes(6) && !ERRANDS.find((e) => e.id === 'bank').days.includes(5));
  for (let i = 0; i < 60; i++) {
    const w = makeWeek(6, 1, 1, seededRandom(i));
    assert.ok(feasible(w.errands, Array(7).fill(0), w.cap, w.blocked));
    const load = Array(7).fill(0);
    for (let j = 0; j < w.errands.length; j++) { const d = [0, 1, 2, 3, 4, 5, 6].find((x) => place(w, load, j, x) === 'ok'); assert.ok(d !== undefined, 'a good day always exists'); load[d] += 1; }
  }
  const give = json('data/israel/giveaways.json').items;
  for (const it of give) { const p = pair(it, seededRandom(1)); assert.equal(p.filter((x) => x.local).length, 1); if (['sound', 'stress'].includes(it.category)) assert.equal(contextOf(it), ''); }
  for (const k of [...SERVICES, ...CASES.flatMap((c) => [c.key, c.say])]) assert.ok(bankMap.has(k), k);
  for (const c of CASES) {
    const r = rivalsOf(c); assert.ok(r.length >= 3, c.en); assert.ok(!HELP_CLASH.some((g) => g.includes(c.who) && r.some((x) => g.includes(x))));
    assert.ok(sayRivals(c).length >= 3 && !sayRivals(c).includes(c.say), c.en);
  }
  for (const k of [...COMPLAINTS.map((c) => c.key), ...TIMES, ...WHEN]) assert.ok(bankMap.has(k));
  const twice = { for: 'ph.fever', times: 2, when: 'ph.after' };
  assert.ok(slotOk(twice, [], 'ph.after', 't.morning', true) && !slotOk(twice, [], 'ph.before', 't.morning', true) && !slotOk(twice, [], 'ph.after', 't.noon', true));
  assert.ok(!slotOk(twice, [{ when: 'ph.after', time: 't.morning' }, { when: 'ph.after', time: 't.evening' }], 'ph.after', 't.noon', true));
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

export async function play(id, level, maxClicks = 20000) {
  const mod = await import(`../src/games/${id}.view.js`);
  const env = environment();
  const mem = new Map([[`games.${id}.v1`, { unlocked: 5 }]]); const store = { get: (k) => mem.get(k), set: (k, v) => mem.set(k, v) };
  globalThis.setTimeout = (fn, ms, ...a) => realTimeout(fn, Math.min(ms || 0, 1), ...a);
  const realRandom = Math.random;
  Math.random = seededRandom(level * 101 + id.length * 7); // the same boards every run, so a failure can be replayed
  try {
    const stop = await mod.mount(env.root, { store, settings, fetchFn, images: { resolve: () => null }, audio: null, route: { query: { level: String(level) } } });
    for (let i = 0; i < 400 && !env.root.querySelector('.arc-start'); i++) await turn();
    env.root.querySelector('.arc-start').click();
    const board = env.root.querySelector('.arc-board');
    let ready = false;
    const w0 = Date.now(); // some boards wait for the get-ready count (about 3 seconds) before anything can be pressed
    while (!ready && Date.now() - w0 < 6000) { await turn(); ready = enabled(board).length > 0; }
    assert.ok(ready, `${id} level ${level}: the board has something to press (its data loaded)`);
    const rnd = seededRandom(level * 31 + id.length);
    let clicks = 0, best = 0, texts = '';
    const hudScore = () => Number((env.root.querySelector('.arc-hud-item')?.textContent || '').replace(/\D+/g, '')) || 0;
    const t0 = Date.now();
    while (clicks < maxClicks && !env.root.querySelector('.arc-results-card') && Date.now() - t0 < 30000) {
      const bs = enabled(board);
      if (bs.length) { bs[Math.floor(rnd() * bs.length)].click(); clicks++; best = Math.max(best, hudScore()); if (clicks % 25 === 0) texts += ' ' + spaced(board); }
      await turn();
    }
    const finished = !!env.root.querySelector('.arc-results-card');
    const next = env.root.querySelector('.arc-results-card') ? [...env.root.querySelector('.arc-results-card').querySelectorAll('a')].find((a) => /^Next:/.test(a.textContent)) : null;
    texts += ' ' + spaced(board);
    stop();
    assert.ok(!env.listeners.has('keydown'), 'key handler removed on unmount');
    return { finished, score: best, text: texts, clicks, rec: mem.get(`games.${id}.v1`), next: next?.getAttribute('href') };
  } finally { globalThis.setTimeout = realTimeout; Math.random = realRandom; }
}

const only = process.env.G4_ONLY ? process.env.G4_ONLY.split(',') : null;
for (const g of G4_GAMES) {
  if (!existsSync(`${root}src/games/${g.id}.view.js`) || (only && !only.includes(g.id))) continue;
  test(`${g.id}: every level loads its data and plays through to the results card`, async () => {
    for (let level = 1; level <= 5; level++) {
      const r = await play(g.id, level);
      assert.ok(r.finished, `${g.id} level ${level} finished (${r.clicks} taps)`);
      assert.ok(r.score > 0, `${g.id} level ${level}: at least one right answer scored`);
      assert.ok(r.rec?.levels?.[level]?.plays === 1, 'best score saved for the level');
      assert.equal(findName(r.text).filter((w) => w.kind !== 'abbrev').length, 0, `${g.id} level ${level} never shows the written name`);
      const i = G4_GAMES.indexOf(g);
      assert.equal(r.next, '#/' + G4_GAMES[(i + 1) % G4_GAMES.length].id, 'the results card hands on to the next Everyday Israel game');
    }
  });
}
