// Shabbat Companion (#/shabbat, lane 5, 12 Nov, plan #10): model rules and the page in a fake DOM (view logic, not browser rendering).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { N, memStore } from './torahread.fakedom.js';
import { waitFor } from './helpers/waitfor.js';
import { loadCorpus } from '../src/corpus/corpus.js';
import { loadJSON } from '../src/curriculum/data.js';
import { loadServiceData, validateOrders } from '../src/service/model.js';
import * as C from '../src/service/companion.model.js';
import { parshaOnShabbat } from '../src/curriculum/calendar.parsha.js';
import { candleLighting, formatTime, floorToMinute } from '../src/curriculum/calendar.js';
import { findPreset } from '../src/curriculum/calendar.locations.js';
import { matchRoute, ROUTES } from '../src/shell/router.js';
import { VIEW_FILES } from '../src/shell/views.generated.js';

const S = await loadServiceData({ loadCorpus });
const comp = await loadJSON('data/service/companion.json');
const NAME = /י[֑-ׇ]*ה[֑-ׇ]*ו[֑-ׇ]*ה/; // the four-letter name, pointed or not
const { mount } = await import('../src/service/shabbat.view.js');

const settingsOf = (o = {}) => ({ get: (k) => ({ congregation: 'sephardi', ...o })[k] });
const NOW = new Date('2026-11-12T15:00:00Z'); // a Thursday
const mk = (o = {}) => {
  const root = new N('div'); const store = memStore();
  for (const [k, v] of Object.entries(o.init || {})) store.set(k, v);
  return { root, store, ctx: { store, settings: settingsOf(o.settings), audio: o.audio, query: o.query, now: () => NOW, clock: o.clock, wakeLock: o.wakeLock ?? null } };
};
const fileAudio = (has = () => true, played = []) => ({ played, status: (k, id) => ({ source: has(k, id) ? 'file' : 'none', reason: 'no-clip' }), play: (...a) => { played.push(a); return Promise.resolve({ ok: true }); } });

test('data: the companion file and the extended service orders are sound against the registry and the guide', () => {
  assert.deepEqual(C.validateCompanion(comp, S.orders, S.byId), []);
  assert.deepEqual(validateOrders(S.orders, S.byId, S.guide, S.hasGap), []);
  assert.equal(comp.review.label, C.REVIEW_LABEL);
  assert.equal(C.REVIEW_LABEL, 'Order not yet reviewed by a rabbi');
  // extended, not duplicated: the map IS the Follow-the-service order (no second copy of the order in companion.json)
  assert.equal(JSON.stringify(comp).includes('"moment"'), false);
  assert.deepEqual(comp.maps, ['friday-night', 'shabbat-morning']);
});

test('copyright: no prayerbook page numbers or text; Hebrew only by registry id', () => {
  for (const f of ['data/service/companion.json', 'src/service/companion.model.js', 'src/service/shabbat.view.js']) {
    const s = readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    assert.doesNotMatch(s, /\bp(age|g)?\.?\s*\d{1,3}\b/i, `${f}: no page numbers`);
    assert.doesNotMatch(s.replace(/\/\/.*$/gm, ''), /[ְ-ּ]/, `${f}: no pointed Hebrew typed in (it comes from the registry)`);
  }
});

test('service map: every prayer links to the app\'s own text, in order, with the name shown as ה׳', () => {
  for (const o of comp.maps) {
    const list = C.mapItems(S.orders, o, S.byId);
    assert.equal(list.length, S.orders.orders[o].items.length);
    list.forEach((it, i) => {
      assert.equal(it.n, i + 1); assert.equal(it.href, `#/read/${it.id}`); assert.ok(S.byId.has(it.id));
      assert.doesNotMatch(it.he, NAME, `${it.id}: the name is not written out`);
    });
  }
  assert.ok(C.mapItems(S.orders, 'friday-night', S.byId).find((x) => x.id === 'shema-1').he.includes('ה׳'));
});

test('parts: drills read their lines and words from the registry; clip ids follow the clip naming', () => {
  const cue = C.partOf(S.byId, { entry: 'torah-barchu', line: 1 }), resp = C.partOf(S.byId, { entry: 'torah-barchu', line: 2 });
  assert.deepEqual(cue.clip, { kind: 'line', id: 'torah-barchu-l1' }); assert.deepEqual(resp.clip, { kind: 'line', id: 'torah-barchu-l2' });
  assert.equal(resp.he, S.byId.get('torah-barchu').he.split('\n')[1].trim());
  assert.match(resp.shown, /ה׳/); assert.doesNotMatch(resp.shown, NAME); assert.doesNotMatch(resp.spoken, NAME, 'the spoken text never carries the name');
  const amen = C.partOf(S.byId, { entry: 'kaddish-1', word: 5 });
  assert.equal(amen.he, 'אָמֵן'); assert.deepEqual(amen.clip, { kind: 'word', id: 'kaddish-1-w5' });
  assert.deepEqual(C.partOf(S.byId, { entry: 'shema-1', line: 1 }).clip, { kind: 'line', id: 'shema-1' }, 'a one-line text uses its own line clip');
  assert.equal(C.partOf(S.byId, { entry: 'shema-1', word: 3 }).spoken, 'אֲדֹנָי');
  assert.equal(C.partOf(S.byId, { entry: 'nope', line: 1 }), null);
  assert.equal(C.partOf(S.byId, { entry: 'shema-1', line: 2 }), null);
});

test('fade level: median of the learner\'s word fading entries; none yet means the Settings start level', () => {
  assert.equal(C.fadeLevel({}, 'full'), 0); assert.equal(C.fadeLevel({}, 'faint'), 1);
  assert.equal(C.fadeLevel({ 'word:r01-w1': { level: 3 }, 'word:r01-w2': { level: 2 }, 'word:r01-w3': { level: 0 } }), 2);
  assert.equal(C.fadeLevel({ 'word:r01-w1': { level: 3, pinned: true } }), 0, 'a pinned word counts as shown');
  assert.equal(C.fadeLevel({ 'other:x': { level: 3 } }), 0);
});

test('this Shabbat: dates, portion and candle lighting come from the calendar\'s own functions', () => {
  const p = findPreset('new-york');
  const loc = { lat: p.lat, lon: p.lon, tz: p.tz, candleMinutes: p.candleMinutes, israel: false, name: p.name };
  const w = C.thisShabbat({ now: NOW, loc, parsha: parshaOnShabbat });
  assert.equal(w.friday, '2026-11-13'); assert.equal(w.saturday, '2026-11-14');
  assert.equal(w.portion.en, parshaOnShabbat({ y: 2026, m: 11, d: 14 }).en);
  const cl = candleLighting({ y: 2026, m: 11, d: 13 }, { lat: p.lat, lon: p.lon, offsetMinutes: p.candleMinutes });
  assert.equal(w.candles.time, formatTime(floorToMinute(cl.candles), p.tz));
  assert.equal(C.thisShabbat({ now: NOW, loc: null, parsha: parshaOnShabbat }).candles, null, 'no location: no time is made up');
  // on the Saturday itself it is still this Shabbat
  assert.equal(C.thisShabbat({ now: new Date('2026-11-14T12:00:00Z'), loc, parsha: parshaOnShabbat }).friday, '2026-11-13');
});

test('timing: early, in time, late; no clip means not scored', () => {
  assert.equal(C.timingOf(-200, true).band, 'early');
  assert.equal(C.timingOf(800, true).band, 'in-time');
  assert.equal(C.timingOf(C.IN_TIME_MS + 1, true).band, 'late');
  assert.equal(C.timingOf(500, false).band, 'unscored');
  assert.match(C.NOT_SCORED, /pronunciation is not scored/);
});

test('practise list: Friday prayers without a practice mark or a fade-out recall card', () => {
  const all = C.practiseList(S.orders, S.byId, new Set());
  assert.equal(all.length, S.orders.orders['friday-night'].items.length);
  const done = C.practisedIds({ 'line:shema-1': {}, 'word:r01-w1': {} }, C.withPractice({}, 'candle-shabbat', '2026-11-12'));
  assert.deepEqual([...done].sort(), ['candle-shabbat', 'shema-1']);
  assert.equal(C.practiseList(S.orders, S.byId, done).length, all.length - 2);
  const r = C.withHomeStep(C.withHomeStep({}, '2026-11-13', 'candles', true), '2026-11-13', 'kiddush', true);
  assert.deepEqual(r.home, { '2026-11-13': { candles: true, kiddush: true } });
  assert.deepEqual(C.withHomeStep(r, '2026-11-20', 'motzi', true).home, { '2026-11-20': { motzi: true } }, 'only this week is kept');
});

test('route: #/shabbat is a lazy optional route in the Read section, on demand, not installed', async () => {
  const m = matchRoute('#/shabbat');
  assert.equal(m.route.name, 'shabbat'); assert.equal(m.route.module, '../service/shabbat.view.js');
  assert.ok(VIEW_FILES.includes('service/shabbat.view.js'));
  const { computeManifest } = await import('../tools/build-precache.mjs');
  const man = computeManifest();
  for (const f of ['src/service/shabbat.view.js', 'src/service/companion.model.js', 'data/service/companion.json']) {
    assert.ok(man.onDemand.includes(f), `${f} on demand`); assert.ok(!man.files.includes(f), `${f} not in the first install`);
  }
  const { onDemandGroups } = await import('../src/shell/offline.js');
  assert.ok(onDemandGroups(man.onDemand).find((g) => g.id === 'od-service').urls.includes('data/service/companion.json'));
  assert.ok(ROUTES.find((r) => r.name === 'shabbat').optional);
});

test('verification: a first-time user reaches the Sh\'ma from Home in two taps (Home -> Shabbat Companion -> The Sh\'ma)', async () => {
  const { mount: mountHome } = await import('../src/shell/home.view.js');
  const { createSettings } = await import('../src/shell/settings.js');
  const { t } = await import('../src/shell/i18n.js');
  const hs = memStore();
  const home = new N('div');
  mountHome(home, { store: hs, settings: createSettings(hs), t, hasRoute: () => true, route() {}, installPrompt: { available: () => false } });
  // tap 1: the link is in the first-screen hero, not behind More
  const link = home.querySelector('.show-hero a[href="#/shabbat"]');
  assert.ok(link, 'Home hero links to the Shabbat Companion');
  assert.match(link.textContent, /Sh'ma/);
  const r = matchRoute(link.attrs.href);
  const view = await import(new URL('../src/shell/' + r.route.module, import.meta.url).href);
  const { root, ctx } = mk();
  await view.mount(root, ctx);
  // tap 2: "The Sh'ma" is on the first screen of the page
  const jump = root.querySelector('[data-jump="shema-1"]');
  assert.ok(jump); assert.equal(jump.textContent, 'The Sh\'ma');
  await jump.click();
  assert.match(root.querySelector('#sh-card-h').textContent, /The Shema/);
  const he = root.queryAll('.sh-he').map((n) => n.textContent).join(' ');
  assert.match(he, /שְׁמַע/); assert.match(he, /ה׳/); assert.doesNotMatch(he, NAME);
  assert.equal(root.querySelector('#sh-here').attrs['data-here'], 'shema-1');
});

test('follow along: one prayer at a time, big buttons and arrow keys, you-are-here marker, link to the text', async () => {
  const { root, ctx } = mk({ query: { mode: 'follow', order: 'friday-night' } });
  await mount(root, ctx);
  assert.match(root.querySelector('#sh-card-h').textContent, /Candle Blessing/);
  assert.equal(root.querySelector('#sh-prev').attrs.disabled, '');
  assert.match(root.querySelector('#sh-prev').className, /sh-big/); assert.match(root.querySelector('#sh-next').className, /sh-big/);
  await root.querySelector('#sh-card').fire('keydown', { key: 'ArrowRight' });
  assert.match(root.querySelector('#sh-card-h').textContent, /Welcoming Shabbat/);
  await root.querySelector('#sh-card').fire('keydown', { key: 'ArrowLeft' });
  assert.match(root.querySelector('#sh-card-h').textContent, /Candle Blessing/);
  await root.querySelector('#sh-next').click();
  const here = root.queryAll('[aria-current="step"]');
  assert.equal(here.length, 1); assert.match(here[0].textContent, /Welcoming Shabbat \(you are here\)/);
  assert.match(root.querySelector('#sh-here').textContent, /You are here: Welcoming Shabbat \(2 of 17\)/);
  assert.ok(root.queryAll('a').some((a) => a.attrs.href === '#/read/lecha-dodi-1'));
  for (let k = 0; k < 30; k++) await root.querySelector('#sh-next').click();
  assert.equal(root.querySelector('#sh-next').attrs.disabled, '');
  for (const n of root.all((x) => ` ${x.className} `.includes(' sh-he '))) { assert.equal(n.attrs.lang, 'he'); assert.equal(n.attrs.dir, 'rtl'); }
});

test('follow along: transliteration fades by the learner\'s fade level', async () => {
  const at = async (scaffold) => {
    const { root, ctx } = mk({ query: { mode: 'follow', order: 'friday-night', id: 'shema-1' }, init: scaffold ? { 'curriculum.scaffold': scaffold } : {} });
    await mount(root, ctx); return root;
  };
  let r = await at(null);
  assert.equal(r.queryAll('.sh-tr').length, 1); assert.doesNotMatch(r.querySelector('.sh-tr').className, /sh-faint/);
  assert.match(r.querySelector('.sh-tr').textContent, /adonai/i);
  assert.equal(r.querySelector('[data-fade]').attrs['data-fade'], '0');
  r = await at({ 'word:r01-w1': { level: 1 } });
  assert.match(r.querySelector('.sh-tr').className, /sh-faint/);
  r = await at({ 'word:r01-w1': { level: 2 } });
  assert.equal(r.queryAll('.sh-tr').length, 0);
  await r.querySelector('.sh-trtap').click();
  assert.equal(r.queryAll('.sh-tr').length, 1, 'level 2: shown on tap');
  r = await at({ 'word:r01-w1': { level: 3 } });
  assert.equal(r.queryAll('.sh-tr').length + r.queryAll('.sh-trtap').length, 0, 'level 3: hidden');
  assert.match(r.textContent, /Transliteration: Hidden/);
});

test('follow along: word-by-word audio only where a word clip exists; the name word plays the spoken substitute', async () => {
  const audio = fileAudio((k, id) => k === 'word' && /^shema-1-w[1-3]$/.test(id));
  const { root, ctx } = mk({ audio, query: { mode: 'follow', order: 'friday-night', id: 'shema-1' } });
  await mount(root, ctx);
  const words = root.queryAll('.sh-w');
  assert.deepEqual(words.map((w) => w.attrs['data-word']), ['shema-1-w1', 'shema-1-w2', 'shema-1-w3']);
  assert.equal(words[2].textContent, 'ה׳');
  await words[2].click();
  assert.equal(audio.played[0][0], 'word'); assert.equal(audio.played[0][1], 'shema-1-w3');
  assert.equal(audio.played[0][2].text, 'אֲדֹנָי');
  assert.equal(root.queryAll('.sh-wt').length, 3, 'words without a clip are plain text');
});

test('wake lock: off by default, says what it does, asks for the screen lock only when turned on, releases on off and on leaving', async () => {
  const calls = [];
  const sentinel = { released: false, release() { this.released = true; calls.push('release'); return Promise.resolve(); }, addEventListener() {} };
  const wakeLock = { request: (t) => { calls.push(`request:${t}`); return Promise.resolve(sentinel); } };
  const { root, ctx } = mk({ wakeLock, query: { mode: 'follow' } });
  const un = await mount(root, ctx);
  const b = root.querySelector('#sh-lock');
  assert.equal(b.attrs['aria-pressed'], 'false'); assert.match(b.textContent, /Off/); assert.deepEqual(calls, []);
  assert.match(root.textContent, /Keeps your screen from going dark.*uses more battery/);
  await b.click();
  assert.deepEqual(calls, ['request:screen']); assert.equal(root.querySelector('#sh-lock').attrs['aria-pressed'], 'true');
  await root.querySelector('#sh-lock').click();
  assert.deepEqual(calls, ['request:screen', 'release']);
  await root.querySelector('#sh-lock').click();
  un();
  assert.deepEqual(calls, ['request:screen', 'release', 'request:screen', 'release'], 'leaving the page releases the lock');
  const none = mk({ wakeLock: null, query: { mode: 'follow' } });
  await mount(none.root, none.ctx);
  assert.equal(none.root.querySelector('#sh-lock').attrs.disabled, '');
  assert.match(none.root.textContent, /cannot keep the screen on/);
});

test('join in: hear the leader\'s clip, tap to come in, read the response; timing and self-check only', async () => {
  let t = 1000; const audio = fileAudio((k, id) => id === 'torah-barchu-l1' || id === 'torah-barchu-l2');
  const { root, ctx, store } = mk({ audio, clock: () => t, query: { mode: 'join' } });
  await mount(root, ctx);
  assert.match(root.textContent, /Your pronunciation is not scored/);
  assert.deepEqual(root.queryAll('[data-drill]').map((b) => b.attrs['data-drill']), comp.drills.map((d) => d.id));
  await root.querySelector('[data-drill="barchu"]').click();
  assert.equal(root.querySelector('#sh-respond').attrs.disabled, '');
  await root.querySelector('#sh-cue').click();
  assert.deepEqual(audio.played[0].slice(0, 2), ['line', 'torah-barchu-l1']);
  t += 900;
  await root.querySelector('#sh-respond').click();
  assert.equal(root.querySelector('[data-timing]').attrs['data-timing'], 'in-time');
  const resp = root.queryAll('.sh-he').map((n) => n.textContent).join(' ');
  assert.match(resp, /ה׳/); assert.doesNotMatch(resp, NAME);
  await root.querySelector('[data-self="smooth"]').click();
  assert.equal(root.querySelector('[data-result]').attrs['data-result'], 'in-time/smooth');
  assert.equal(store.m[C.COMPANION_KEY].drills.barchu.band, 'in-time');
  assert.ok(store.m[C.COMPANION_KEY].practised['torah-barchu'], 'the drill counts as practice');
});

test('join in: without a clip of the leader\'s line the timing is not scored, and the Kaddish response reads Amen then the line', async () => {
  const { root, ctx } = mk({ query: { mode: 'join' } });
  await mount(root, ctx);
  await root.querySelector('[data-drill="kaddish-yehei"]').click();
  assert.match(root.textContent, /No clip of the leader's line yet/);
  await root.querySelector('#sh-cue').click();
  await root.querySelector('#sh-respond').click();
  assert.equal(root.querySelector('[data-timing]').attrs['data-timing'], 'unscored');
  const lines = root.queryAll('.sh-he').map((n) => n.textContent);
  assert.equal(lines[1], 'אָמֵן'); assert.match(lines[2], /^יְהֵא שְׁמֵהּ רַבָּא/);
});

test('this Shabbat: portion, candle lighting from the calendar location, the service order and what to practise before Friday', async () => {
  const { root, ctx, store } = mk({ init: { 'calendar.prefs': { locationId: 'new-york' }, 'srs.cards': {} } });
  await mount(root, ctx);
  assert.match(root.textContent, /Friday evening 2026-11-13/);
  assert.match(root.querySelector('[data-portion]').textContent, new RegExp(parshaOnShabbat({ y: 2026, m: 11, d: 14 }).en));
  assert.ok(root.querySelector('[data-candles]'));
  assert.equal(root.querySelector('[data-practised]').attrs['data-practised'], '0/17');
  assert.equal(root.queryAll('[data-practise]').length, 17);
  await root.querySelector('[data-practise="shema-1"]').click();
  await root.querySelector('#sh-mark').click();
  assert.ok(store.m[C.COMPANION_KEY].practised['shema-1']);
  await root.querySelector('#sh-tab-week').click();
  assert.equal(root.querySelector('[data-practised]').attrs['data-practised'], '1/17');
  assert.equal(root.querySelector('[data-practise="shema-1"]'), null);
  await root.querySelector('[data-open-map="shabbat-morning"]').click();
  assert.equal(root.queryAll('.sh-map li').length, S.orders.orders['shabbat-morning'].items.length);
  assert.match(root.querySelector('[data-review]').textContent, /Order not yet reviewed by a rabbi/);
  // no location: a link to set one, no invented time
  const n = mk(); await mount(n.root, n.ctx);
  assert.equal(n.root.querySelector('[data-candles]'), null); assert.match(n.root.textContent, /Set your location in the Calendar/);
});

test('home rituals: candle blessing, Kiddush and Motzi from the registry, with audio where clips exist and a weekly checklist', async () => {
  const audio = fileAudio((k, id) => k === 'line' && id === 'candle-shabbat');
  const { root, ctx, store } = mk({ audio, query: { mode: 'home' } });
  await mount(root, ctx);
  assert.deepEqual(root.queryAll('[data-step]').map((x) => x.attrs['data-step']), ['candles', 'kiddush', 'motzi']);
  assert.deepEqual(root.queryAll('[data-entry]').map((x) => x.attrs['data-entry']), ['candle-shabbat', 'kiddush-gen-2-1-3', 'kiddush-wine-1', 'kiddush-shabbat-eve', 'hamotzi']);
  const he = root.queryAll('.sh-he').map((n) => n.textContent).join(' ');
  assert.doesNotMatch(he, NAME); assert.match(he, /ה׳/);
  const play = root.querySelector('[data-entry="candle-shabbat"]').querySelector('button[data-audio="line/candle-shabbat"]');
  assert.ok(play); await play.click();
  assert.deepEqual(audio.played.at(-1).slice(0, 2), ['line', 'candle-shabbat']);
  assert.doesNotMatch(String(audio.played.at(-1)[2].text), NAME, 'the text handed to the player carries the spoken substitute');
  await root.querySelector('[data-done="candles"]').click();
  assert.deepEqual(store.m[C.COMPANION_KEY].home, { '2026-11-13': { candles: true } });
  assert.equal(root.querySelector('[data-done="candles"]').attrs['aria-pressed'], 'true');
});
