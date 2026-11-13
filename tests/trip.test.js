// Israel Trip (#/trip): the Trip Planner and the restaurant scene. Unit tier.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRIP_KEY, STOPS, MAX_DAYS, SCENE_LINES, heKey, israelPlaces, linesFor, normalizePlan, addDay, removeDay, toggleStop, planText, menu, line, newVisit, readOrder, heardAs, bill, checkVisit } from '../src/trip/trip.js';
import { ROUTES, matchRoute } from '../src/shell/router.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pack = JSON.parse(readFileSync(join(root, 'data/talk/pack.json'), 'utf8'));
const stored = new Set(pack.phrases.map((p) => p.he)); const nouns = new Set(pack.nouns.map((n) => n.he));
const seeded = (seed) => { let k = seed; return () => ((k = (k * 1103515245 + 12345) % 2147483648) / 2147483648); };
const NAME = 'יהוה';

test('planner data: nine places in Israel, seven kinds of stop, and every line is a stored one with no line that holds the Name', () => {
  const places = israelPlaces(pack);
  assert.equal(places.length, 9); assert.deepEqual(places[0], { he: 'ירושלים', en: 'Jerusalem' }); assert.ok(places.some((p) => p.en === 'The Dead Sea'));
  assert.equal(STOPS.length, 7);
  for (const s of STOPS) {
    const lines = linesFor(pack, s.id);
    assert.ok(lines.length >= 10, `${s.id} has ${lines.length} lines`);
    for (const l of lines) { assert.ok(stored.has(l.he), l.he); assert.ok(l.en); assert.ok(!heKey(l.he).includes(NAME)); }
  }
  assert.deepEqual(linesFor(pack, 'nowhere'), []);
});

test('a plan: days are added and removed, stops switch on and off in a fixed order, bad saved data is dropped, the text file reads well', () => {
  let p = normalizePlan(null);
  assert.deepEqual(p, { name: '', days: [], best: 0 });
  p = addDay(p, 'ירושלים'); p = addDay(p, 'תל אביב'); p = toggleStop(p, 0, 'eat'); p = toggleStop(p, 0, 'around'); p = toggleStop(p, 1, 'hotel');
  assert.deepEqual(p.days[0].stops, ['around', 'eat'], 'stops keep the order of the list, not the order pressed');
  p = toggleStop(p, 0, 'eat'); assert.deepEqual(p.days[0].stops, ['around']);
  const text = planText({ ...p, name: 'Spring In Israel' }, pack, 2);
  assert.match(text, /^Spring In Israel\n\nDay 1: Jerusalem \(ירושלים\)\n  Getting Around\n    .+  -  .+\n    .+  -  .+\n\nDay 2: Tel Aviv \(תל אביב\)\n  Hotel\n/);
  assert.equal(removeDay(p, 0).days[0].place, 'תל אביב');
  let full = p; for (let i = 0; i < MAX_DAYS + 5; i++) full = addDay(full, 'חיפה'); assert.equal(full.days.length, MAX_DAYS);
  assert.deepEqual(normalizePlan({ name: 5, days: [{ place: 'חיפה', stops: ['eat', 'eat', 'moon'] }, { stops: [] }, null], best: 'x' }), { name: '', days: [{ place: 'חיפה', stops: ['eat'] }], best: 0 });
  assert.equal(TRIP_KEY, 'trip.v1');
});

test('the menu and the scene speak only stored Hebrew', () => {
  const m = menu(pack);
  assert.equal(m.length, 18);
  for (const x of m) { assert.ok(nouns.has(x.he), x.he); assert.ok(x.price > 0 && Number.isInteger(x.price)); }
  assert.equal(new Set(m.map((x) => x.he)).size, m.length);
  for (const k of Object.keys(SCENE_LINES)) { const l = line(pack, k); assert.ok(l && stored.has(l.he), k); }
  assert.equal(line(pack, 'bill').he, 'את החשבון, בבקשה'); assert.equal(line(pack, 'mistake').en, 'There is a mistake in the bill');
});

test('a visit: three different dishes to order; a misheard dish is never one you ordered; an extra line on the bill is never yours', () => {
  let mis = 0, extra = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const v = newVisit(pack, seeded(seed));
    assert.equal(new Set(v.want).size, 3);
    if (v.heard) { mis++; assert.ok(v.want.includes(v.heard.said)); assert.ok(!v.want.includes(v.heard.heard)); }
    if (v.extra) { extra++; assert.ok(!v.want.includes(v.extra)); assert.notEqual(v.extra, v.heard?.heard); }
  }
  assert.ok(mis > 60 && mis < 280, `misheard in ${mis} of 300`); assert.ok(extra > 60 && extra < 200, `extra in ${extra} of 300`);
});

test('a typed order is read from the Hebrew, with vowel points, commas and "and" on the word all allowed', () => {
  assert.deepEqual(readOrder(pack, 'פלאפל, סלט וקפה בבקשה'), ['falafel', 'salad', 'coffee']);
  assert.deepEqual(readOrder(pack, 'אֲנִי רוֹצֶה מָרָק'), ['soup']);
  assert.deepEqual(readOrder(pack, 'מיץ תפוזים'), ['juice'], 'a longer name on the menu would be its own dish; here only juice is');
  assert.deepEqual(readOrder(pack, 'pizza please'), []); assert.deepEqual(readOrder(pack, ''), []);
});

test('checking a visit: the right order, the right answer to the waiter, the right dishes, the bill asked for, the bill judged', () => {
  const v = { want: ['falafel', 'pita', 'coffee'], heard: { said: 'pita', heard: 'pizza' }, extra: 'wine' };
  assert.deepEqual(heardAs(v, v.want), ['falafel', 'pizza', 'coffee']);
  const b = bill(pack, v, v.want); assert.equal(b.rows.length, 4); assert.equal(b.right, false); assert.equal(b.total, 24 + 6 + 14 + 34);
  const best = checkVisit(v, { order: v.want, confirmed: false, arrived: v.want, asked: 'bill', verdict: 'mistake' });
  assert.equal(best.points, 5); assert.equal(best.of, 5);
  const fooled = checkVisit(v, { order: v.want, confirmed: true, arrived: heardAs(v, v.want), asked: 'water', verdict: 'fine' });
  assert.deepEqual(fooled.checks.map((c) => [c.id, c.ok]), [['order', true], ['repeat', false], ['table', false], ['bill', false], ['total', false]]);
  const plain = { want: ['soup', 'rice', 'tea'], heard: null, extra: null };
  assert.equal(checkVisit(plain, { order: plain.want, confirmed: true, arrived: plain.want, asked: 'bill', verdict: 'fine' }).points, 5);
  assert.equal(checkVisit(plain, { order: ['soup'], confirmed: false, arrived: ['soup'], asked: 'bill', verdict: 'mistake' }).points, 1);
  assert.equal(bill(pack, plain, plain.want).right, true);
});

test('the screen: a day is planned and saved; a whole restaurant visit is played to its score', async () => {
  const { createDocument, ev, flush } = await import('./rimon.fakedom.js');
  const doc = createDocument(); globalThis.document = doc;
  const { mount, COPY } = await import('../src/trip/trip.view.js');
  const mem = {}; const store = { get: (k) => mem[k], set: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)); } };
  const host = doc.createElement('div'); doc.body.append(host);
  const press = async (n) => { n.dispatchEvent(ev('click')); await flush(10); }; const sel = (q) => host.querySelector(q);
  const unmount = await mount(host, { store, tripData: { pack }, rng: seeded(7) });
  assert.equal(sel('#tp-title').textContent, 'Israel Trip'); assert.equal(sel('#tp-empty').textContent, COPY.noDays);
  sel('#tp-place').value = 'חיפה'; await press(sel('#tp-add'));
  assert.deepEqual(mem[TRIP_KEY].days, [{ place: 'חיפה', stops: [] }]); assert.match(host.textContent, /Day 1: Haifa/);
  const box = sel('#tp-0-eat'); box.checked = true; box.dispatchEvent(ev('change')); await flush(10);
  assert.deepEqual(mem[TRIP_KEY].days[0].stops, ['eat']); assert.ok(host.textContent.includes('שולחן לשניים, בבקשה') || host.textContent.includes('קפה, בבקשה'));
  await press(sel('[data-tab=restaurant]'));
  const want = sel('#tp-want').textContent.split(', ');
  const m = menu(pack);
  for (const en of want) await press(sel(`[data-dish="${m.find((x) => x.en === en).id}"]`));
  await press(sel('#tp-send'));
  assert.match(host.textContent, /Is that what you ordered\?/);
  const repeated = host.textContent.split('Waiter: ')[1];
  const right = want.every((en) => repeated.includes(m.find((x) => x.en === en).he));
  await press(sel(right ? '[data-say=yes]' : '[data-say=no]'));
  if (!right) await press(sel('#tp-on'));
  await press(sel('[data-say=bill]'));
  const rows = sel('#tp-bill').querySelectorAll('li').length - 1;
  await press(sel(rows === 3 ? '[data-say=fine]' : '[data-say=mistake]'));
  assert.match(sel('#tp-score').textContent, /^5 of 5\. Your best: 5 of 5\./); assert.equal(mem[TRIP_KEY].best, 5); assert.equal(mem[TRIP_KEY].days.length, 1, 'the plan is untouched by the scene');
  unmount();
});

test('the route: #/trip opens Israel Trip, fetched on demand, with copy in plain words', async () => {
  assert.equal(matchRoute('/trip').route.name, 'trip'); assert.equal(ROUTES.find((x) => x.name === 'trip').title, 'Israel Trip');
  const pre = readFileSync(join(root, 'precache-manifest.js'), 'utf8');
  const installed = JSON.parse(/self\.ALEF_PRECACHE\s*=\s*(\[[\s\S]*?\]);/.exec(pre)[1]);
  assert.ok(!installed.some((f) => f.startsWith('src/trip/'))); assert.ok(pre.includes('src/trip/trip.view.js'));
  const { COPY } = await import('../src/trip/trip.view.js');
  for (const s of [...Object.values(COPY), ...STOPS.map((x) => x.label)]) assert.ok(!/\bAI\b|artificial|machine|model|algorithm/i.test(s), s);
});

test('the departures board: stored Hebrew only, one right line (the first on-time ride of the right kind to the right place), and a reason for every wrong pick', async () => {
  const { newBoard, board } = await import('../src/trip/trip.js');
  const places = new Set(israelPlaces(pack).map((p) => p.he));
  for (let seed = 1; seed <= 200; seed++) {
    const b = newBoard(pack, seeded(seed));
    assert.equal(b.rows.length, 6); assert.deepEqual(b.rows.map((r) => r.minutes), [...b.rows.map((r) => r.minutes)].sort((x, y) => x - y), 'in time order');
    const fits = b.rows.filter((r) => r.kind === b.want.kind && r.to.he === b.want.to.he && !r.late);
    const first = fits.sort((x, y) => x.minutes - y.minutes)[0];
    assert.equal(first.role, 'right'); assert.equal(b.rows.filter((r) => board(b, r.id).ok).length, 1); assert.equal(board(b, first.id).ok, true);
    for (const r of b.rows) {
      assert.ok(nouns.has(r.kindHe)); assert.ok(places.has(r.to.he)); assert.match(r.time, /^\d\d:\d\d$/); if (r.late) assert.ok(stored.has(r.lateHe));
      const res = board(b, r.id); assert.ok(res.text.length > 10);
      if (r.role === 'wrong-place') { assert.notEqual(r.to.he, b.want.to.he); assert.match(res.text, /You are on the way to /); }
    }
    assert.ok(b.rows.some((r) => r.late && r.minutes < first.minutes), 'an earlier ride of the same kind is late');
  }
  assert.equal(board(newBoard(pack, seeded(3)), 99).ok, false);
});

test('the screen: five boards are played and scored', async () => {
  const { createDocument, ev, flush } = await import('./rimon.fakedom.js');
  const doc = createDocument(); globalThis.document = doc;
  const { mount } = await import('../src/trip/trip.view.js');
  const host = doc.createElement('div'); doc.body.append(host);
  const press = async (n) => { n.dispatchEvent(ev('click')); await flush(5); };
  const unmount = await mount(host, { tripData: { pack }, rng: seeded(11), query: { part: 'station' } });
  for (let i = 0; i < 5; i++) {
    assert.match(host.querySelector('#tp-station-task').textContent, /^You have a (bus|train) ticket to /);
    await press(host.querySelector(i === 2 ? '[data-role=late]' : '[data-role=right]'));
    assert.ok(host.querySelector('#tp-station-result').textContent.length > 10);
    await press(host.querySelector('#tp-station-next'));
  }
  assert.equal(host.querySelector('#tp-station-score').textContent, '4 of 5 right.');
  unmount();
});

test('money: shekel amounts in stored Hebrew words, the fewest coins, paying and giving change', async () => {
  const T = await import('../src/trip/trip.js');
  assert.equal(T.amountHe(pack, 1), 'שקל אחד'); assert.equal(T.amountHe(pack, 2), 'שני שקלים'); assert.equal(T.amountHe(pack, 5), 'חמישה שקלים'); assert.equal(T.amountHe(pack, 15), 'חמישה עשר שקלים');
  assert.equal(T.amountHe(pack, 0), ''); assert.equal(T.amountHe(pack, 20), '');
  for (let n = 1; n <= 19; n++) { assert.ok(T.amountHe(pack, n)); const c = T.fewestCoins(n); assert.equal(c.reduce((a, b) => a + b, 0), n); assert.ok(c.length <= 5); }
  assert.deepEqual(T.fewestCoins(18), [10, 5, 2, 1]);
  for (let seed = 1; seed <= 100; seed++) { const t = T.newMoneyTask(pack, seeded(seed)); assert.ok(t.target >= 1 && t.target <= 19); assert.equal(t.target, t.kind === 'pay' ? t.price : 20 - t.price); assert.ok(t.priceHe); assert.equal(T.checkCoins(t, T.fewestCoins(t.target)).fewest, true); }
  assert.deepEqual(T.checkCoins({ target: 6 }, [2, 2, 2]), { exact: true, fewest: false, sum: 6, best: [5, 1] }); assert.equal(T.checkCoins({ target: 6 }, [5, 2]).exact, false);
});

test('the market stall: the price comes down twice and no further, a discount works once, a fair offer is taken, a silly one ends it', async () => {
  const T = await import('../src/trip/trip.js');
  for (const k of Object.keys(T.STALL_LINES)) assert.ok(stored.has(T.stallLine(pack, k).he), k);
  for (let seed = 1; seed <= 100; seed++) { const s = T.newStall(pack, seeded(seed)); assert.ok(nouns.has(s.thing.he)); assert.ok(s.floor < s.open && s.floor >= 0.55 * s.open, `${s.floor} of ${s.open}`); }
  const s0 = { ...T.newStall(pack, seeded(4)), open: 100, floor: 70, price: 100, said: '' };
  let s = T.stallMove(s0, 'expensive'); assert.equal(s.price, 90); s = T.stallMove(s, 'expensive'); assert.equal(s.price, 80);
  const walked = T.stallMove(s, 'expensive'); assert.equal(walked.over, true); assert.equal(walked.deal, false);
  let d = T.stallMove(s0, 'discount'); assert.equal(d.price, 95); d = T.stallMove(d, 'discount'); assert.equal(d.price, 95); assert.match(d.said, /No more off/);
  const fair = T.stallMove(s0, { offer: '75' }); assert.deepEqual([fair.deal, fair.paid], [true, 75]); assert.match(T.stallResult(fair), /75 shekels, 25 less/);
  const low = T.stallMove(s0, { offer: 60 }); assert.equal(low.over, false); assert.ok(low.price >= 70 && low.price < 100);
  assert.equal(T.stallMove(s0, { offer: 20 }).deal, false); assert.equal(T.stallMove(s0, { offer: 500 }).paid, 100);
  const full = T.stallMove(s0, 'take'); assert.match(T.stallResult(full), /first price/); assert.equal(T.stallMove(s0, 'leave').deal, false);
  assert.match(T.stallMove(s0, { offer: 'abc' }).said, /Name a price/); assert.equal(T.stallMove(full, 'expensive'), full, 'nothing moves after the end');
  const atFloor = T.stallMove({ ...s0, price: 70 }, 'take'); assert.match(T.stallResult(atFloor), /lowest the keeper would go/);
});

test('the screen: coins are picked and checked; a stall is bargained to a sale', async () => {
  const { createDocument, ev, flush } = await import('./rimon.fakedom.js');
  const doc = createDocument(); globalThis.document = doc;
  const { mount } = await import('../src/trip/trip.view.js'); const T = await import('../src/trip/trip.js');
  const host = doc.createElement('div'); doc.body.append(host);
  const press = async (n) => { n.dispatchEvent(ev('click')); await flush(5); };
  const unmount = await mount(host, { tripData: { pack }, rng: seeded(21), query: { part: 'money' } });
  const task = T.newMoneyTask(pack, seeded(21));
  assert.equal(host.querySelector('#tp-price').textContent, task.priceHe);
  for (const c of T.fewestCoins(task.target)) await press(host.querySelector(`[data-coin="${c}"]`));
  await press(host.querySelector('#tp-money-check'));
  assert.match(host.querySelector('#tp-money-result').textContent, /fewest coins/);
  await press(host.querySelector('[data-tab=market]'));
  await press(host.querySelector('[data-say=expensive]')); assert.match(host.querySelector('#tp-keeper').textContent, /\d+ ₪/);
  await press(host.querySelector('[data-say=take]'));
  assert.match(host.querySelector('#tp-market-result').textContent, /You paid \d+ shekels, \d+ less than the first price/);
  unmount();
});
