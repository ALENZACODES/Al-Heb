import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { N, tick, btn, memStore } from './torahread.fakedom.js';
import { waitFor } from './helpers/waitfor.js';
const table = JSON.parse(fs.readFileSync(new URL('../data/corpus/trope/table.json', import.meta.url), 'utf8'));
const { mount, NOTICE, LEGEND_NOTICE, PACE_NOTE } = await import('../src/torahreader/torahreader.view.js');

const TROPE_RE = /[֑-ֽ֯׀]/;
const NIQQUD_RE = /[ְ-ׇּׁׂ]/;

function fakeClock() {
  const timers = new Map(); let id = 0;
  return { setInterval: (f, ms) => { timers.set(++id, { f, ms }); return id; }, clearInterval: (h) => { timers.delete(h); }, timers, fire: (n = 1) => { for (let i = 0; i < n; i++) for (const t of [...timers.values()]) t.f(); } };
}
async function make({ congregation = 'sephardi', audio, stored, loadJson } = {}) {
  const root = new N('div'); const store = memStore(); if (stored) store.m['torahreader.v1'] = stored;
  const clock = fakeClock(); const calls = [];
  const a = audio === 'rec' ? { has: () => true, play: async (k, i, o) => { calls.push([k, i, o]); return { source: 'file', entryStatus: 'recorded' }; } } : audio;
  const ctx = { store, settings: { get: (k) => (k === 'congregation' ? congregation : undefined) }, audio: a, clock, loadJson };
  const un = mount(root, ctx); await un.ready;
  return { root, store, ctx, clock, calls, un };
}
const words = (root) => root.queryAll('.trd-w');
const status = (root) => root.queryAll('.trd-status')[0].textContent;
const sel = (root, s) => root.queryAll(s)[0];

test('mounts: title, draft notice, Hebrew buttons are lang=he dir=rtl, tabs are toggle buttons, unmount returns', async () => {
  const { root, un } = await make();
  assert.equal(sel(root, 'h1').textContent, 'Torah reader: Priestly Blessing and Shema');
  assert.ok(root.textContent.includes(NOTICE));
  assert.match(NOTICE, /not checked by a cantor/);
  const w = words(root);
  assert.equal(w.length, 35);
  for (const b of w) { assert.equal(b.tag, 'button'); assert.equal(b.attrs.lang, 'he'); assert.equal(b.attrs.dir, 'rtl'); assert.match(b.attrs['aria-label'], /word \d+ of 35/); }
  const tabs = root.queryAll('.trd-tab'); assert.equal(tabs.length, 3);
  for (const t of tabs) assert.ok(['true', 'false'].includes(t.attrs['aria-pressed']));
  assert.equal(root.queryAll('.trd-verse').length, 6);
  assert.match(root.queryAll('.trd-vlabel')[0].textContent, /Numbers 6:22 \(narrative, not part of the blessing\)/);
  assert.doesNotMatch(root.queryAll('.trd-vlabel')[3].textContent, /narrative/);
  assert.equal(typeof un, 'function'); un();
});

test('switching to the Shema shows its 42 words; passage is stored; remount restores it', async () => {
  const { root, store } = await make();
  await sel(root, '[data-passage="shema"]').click();
  assert.equal(words(root).length, 42);
  assert.equal(root.queryAll('.trd-verse').length, 6);
  assert.equal(store.m['torahreader.v1'].passage, 'shema');
  const again = await make({ stored: store.m['torahreader.v1'] });
  assert.equal(words(again.root).length, 42);
  assert.equal(sel(again.root, '[data-passage="shema"]').attrs['aria-pressed'], 'true');
});

test('show/hide cantillation and vowel points, stored under torahreader.v1', async () => {
  const { root, store } = await make();
  const text = () => words(root).map((w) => w.textContent).join(' ');
  assert.match(text(), TROPE_RE); assert.match(text(), NIQQUD_RE);
  await sel(root, '[data-toggle="showTrope"]').click();
  assert.doesNotMatch(text(), TROPE_RE); assert.match(text(), NIQQUD_RE);
  assert.equal(sel(root, '[data-toggle="showTrope"]').attrs['aria-pressed'], 'false');
  assert.match(status(root), /Cantillation marks hidden/);
  await sel(root, '[data-toggle="showNiqqud"]').click();
  assert.doesNotMatch(text(), NIQQUD_RE); assert.doesNotMatch(text(), TROPE_RE);
  assert.match(text(), /[א-ת]/);
  assert.deepEqual({ t: store.m['torahreader.v1'].showTrope, n: store.m['torahreader.v1'].showNiqqud }, { t: false, n: false });
  await sel(root, '[data-toggle="showTrope"]').click();
  assert.match(text(), TROPE_RE); assert.doesNotMatch(text(), NIQQUD_RE);
  // hidden points: a tap still shows the word pointed
  await words(root)[0].click();
  assert.match(sel(root, '#trd-detail').textContent, /[ְ-ּ]/);
});

test('verse end sign is printed once per verse, outside the word buttons', async () => {
  const { root } = await make();
  assert.equal(root.queryAll('.trd-stop').length, 6);
  assert.ok(words(root).every((w) => !w.textContent.includes('׃')));
});

test('tap a word: transliteration follows the tradition, mark name follows the naming system, gloss shown where one exists', async () => {
  for (const [cong, translit, name] of [['ashkenazi', /adonoy/, /Tipcha \(Ashkenazi name\)/], ['sephardi', /adonai/, /Tarcha \(Sephardi name\)/]]) {
    const { root } = await make({ congregation: cong });
    await sel(root, '[data-passage="shema"]').click();
    await words(root)[2].click();            // יְהוָה, verse 4, word 3: mercha
    // verse 4 tokens: שמע ישראל יהוה אלהינו יהוה אחד ; word index 3 (אֱלֹהֵינוּ) has tipcha
    await words(root)[3].click();
    const d = sel(root, '#trd-detail').textContent;
    assert.match(d, name);
    assert.match(d, /Literal gloss: our-God/);
    assert.match(d, new RegExp(`${cong} tradition`));
    await words(root)[2].click();
    assert.match(sel(root, '#trd-detail').textContent, translit);
    assert.equal(words(root)[2].className.includes('trd-sel'), true);
  }
  const { root } = await make();
  await words(root)[0].click();           // Numbers 6:22 first word: no registry gloss
  assert.match(sel(root, '#trd-detail').textContent, /No literal gloss is stored/);
});

test('audio: registry ids for registry verses, text-only ids for the framing verses, honest status messages', async () => {
  const rec = await make({ audio: 'rec' });
  await sel(rec.root, '[data-passage="shema"]').click();
  await words(rec.root)[0].click();
  await btn(rec.root, /^Hear it$/).click(); await waitFor(() => rec.calls.length >= 1 && /Playing this word: a recording/.test(status(rec.root)), { message: "rec.calls.length >= 1 && /Playing this word: a recording/.test(status(rec.root))" });
  assert.deepEqual(rec.calls[0].slice(0, 2), ['word', 'shema-vahavta-w1']);
  assert.equal(rec.calls[0][2].text, 'שְׁמַע');
  assert.match(status(rec.root), /Playing this word: a recording/);
  await btn(rec.root, /^Hear Deuteronomy 6:5$/).click(); await waitFor(() => rec.calls.length >= 2, { message: "rec.calls.length >= 2" });
  assert.deepEqual(rec.calls[1].slice(0, 2), ['line', 'shema-vahavta-l2']);

  const b = await make({ audio: 'rec' });
  await b.root.queryAll('[data-verse="24"] .trd-w')[0].click();      // first word of Numbers 6:24
  await btn(b.root, /^Hear it$/).click(); await waitFor(() => b.calls.length >= 1, { message: "b.calls.length >= 1" });
  assert.equal(b.calls[0][1], 'bless-priestly-1-w1');
  await btn(b.root, /^Hear Numbers 6:25$/).click(); await waitFor(() => b.calls.length >= 2, { message: "b.calls.length >= 2" });
  assert.deepEqual(b.calls.at(-1).slice(0, 2), ['line', 'bless-priestly-2']);
  await btn(b.root, /^Hear Numbers 6:22$/).click(); await waitFor(() => b.calls.length >= 3, { message: "b.calls.length >= 3" });
  assert.match(b.calls.at(-1)[1], /^torahreader-priestly-blessing-22$/);
  
  for (const [audio, re] of [
    [undefined, /No audio for this word: this build has no audio player/],
    [{ has: () => false, play: async () => ({ source: 'none', reason: 'unknown-item' }) }, /No audio for this word \(unknown-item\)/],
    [{ has: () => false, play: async () => ({ source: 'tts-fallback' }) }, /browser voice: a computer voice, not a person/],
    [{ has: () => true, play: async () => ({ source: 'file', entryStatus: 'tts' }) }, /pre-rendered computer voice, not a human recording/],
    [{ has: () => true, play: async () => { throw new Error('boom'); } }, /Audio error for this word: boom/],
  ]) {
    const m = await make({ audio });
    await words(m.root)[0].click();
    await btn(m.root, /^Hear it$/).click(); await waitFor(() => re.test(status(m.root)), { message: "status line for this audio outcome" });
    assert.match(status(m.root), re);
  }
});

test('divine name is sent to audio as Adonai, shown as the Leningrad spelling', async () => {
  const { root, calls } = await make({ audio: 'rec' });
  await words(root)[1].click();              // יְהוָה in Numbers 6:22
  assert.match(words(root)[1].textContent, /^יְהוָה|יְהו/);
  await btn(root, /^Hear it$/).click(); await waitFor(() => calls.length >= 1, { message: "calls.length >= 1" });
  assert.equal(calls[0][2].text, 'אֲדֹנָי');
});

test('Read with me: highlight steps at the chosen pace, pause/resume, end of passage, no audio-sync claim', async () => {
  const { root, clock, store } = await make();
  assert.match(root.textContent, /not synchronised with any audio/);
  assert.equal(PACE_NOTE.includes('not synchronised'), true);
  const run = sel(root, '.trd-run');
  assert.equal(run.textContent, 'Read with me');
  await run.click();
  assert.equal(clock.timers.size, 1);
  assert.equal([...clock.timers.values()][0].ms, 1500);
  const cur = () => words(root).findIndex((w) => w.className.includes('trd-cur'));
  assert.equal(cur(), 0);
  assert.equal(words(root)[0].attrs['aria-current'], 'true');
  clock.fire(3);
  assert.equal(cur(), 3);
  assert.equal(words(root).filter((w) => w.attrs['aria-current'] === 'true').length, 1);
  assert.match(status(root), /Word 4 of 35: /);
  assert.equal(run.textContent, 'Pause');
  await run.click();
  assert.equal(clock.timers.size, 0);
  assert.match(status(root), /Paused at word 4 of 35/);
  assert.equal(run.textContent, 'Resume reading with me');
  await sel(root, '.trd-next').click(); assert.equal(cur(), 4);
  await sel(root, '.trd-prev').click(); await sel(root, '.trd-prev').click(); assert.equal(cur(), 2);
  // speed: slow
  await sel(root, '[data-speed="slow"]').click();
  assert.equal(store.m['torahreader.v1'].speed, 'slow');
  await sel(root, '.trd-run').click();
  assert.equal([...clock.timers.values()][0].ms, 2400);
  // changing the pace while running restarts the timer at the new pace
  await sel(root, '[data-speed="fast"]').click();
  assert.equal(clock.timers.size, 1); assert.equal([...clock.timers.values()][0].ms, 900);
  clock.fire(100);
  assert.equal(clock.timers.size, 0);
  assert.match(status(root), /Reached the end of the passage after 35 words/);
  assert.equal(cur(), 34);
});

test('Read with me does not start from a stale word after switching passage; unmount clears the timer', async () => {
  const { root, clock, un } = await make();
  await sel(root, '.trd-run').click(); clock.fire(2);
  await sel(root, '[data-passage="shema"]').click();
  assert.equal(clock.timers.size, 0);
  assert.equal(words(root).findIndex((w) => w.className.includes('trd-cur')), -1);
  await sel(root, '.trd-run').click();
  assert.equal(clock.timers.size, 1);
  un();
  assert.equal(clock.timers.size, 0);
});

test('keyboard: arrow keys follow right-to-left reading order, Home/End, roving tabindex; every control is a native button', async () => {
  const { root } = await make();
  const w = words(root);
  assert.equal(w.filter((b) => b.attrs.tabindex === '0').length, 1);
  assert.equal(w[0].attrs.tabindex, '0');
  let prevented = 0;
  await w[0].fire('keydown', { key: 'ArrowLeft', preventDefault() { prevented++; } });
  assert.equal(globalThis.__focus, w[1]); assert.equal(w[1].attrs.tabindex, '0'); assert.equal(w[0].attrs.tabindex, '-1');
  await w[1].fire('keydown', { key: 'ArrowRight', preventDefault() { prevented++; } });
  assert.equal(globalThis.__focus, w[0]);
  await w[0].fire('keydown', { key: 'End', preventDefault() { prevented++; } });
  assert.equal(globalThis.__focus, w[34]);
  await w[34].fire('keydown', { key: 'Home', preventDefault() { prevented++; } });
  assert.equal(globalThis.__focus, w[0]);
  assert.equal(prevented, 4);
  await w[0].fire('keydown', { key: 'ArrowRight', preventDefault() { prevented++; } });   // before the first word: nothing
  assert.equal(prevented, 4);
  await w[3].fire('keydown', { key: 'a', preventDefault() { prevented++; } });
  assert.equal(prevented, 4);
  for (const n of root.queryAll('[onclick]')) assert.equal(n.tag, 'button');
  assert.ok(root.queryAll('button').every((b) => b.attrs.type === 'button'));
});

test('trope legend: reference-only notice, both naming systems, class and level, counts, filter', async () => {
  const { root, clock } = await make();
  await sel(root, '.trd-run').click();
  await sel(root, '[data-view="legend"]').click();
  assert.equal(clock.timers.size, 0, 'leaving the reader stops the timer');
  assert.equal(sel(root, '[data-view="legend"]').attrs['aria-pressed'], 'true');
  const t = root.textContent;
  assert.ok(t.includes(LEGEND_NOTICE));
  assert.match(LEGEND_NOTICE, /not a chanting teacher/);
  assert.match(t, /Reference, not a chanting teacher/);
  const tables = root.queryAll('table'); assert.equal(tables.length, 3);
  const rows = root.queryAll('tbody tr');
  assert.equal(rows.length, table.prose.length);
  const tip = rows.find((r) => r.attrs['data-id'] === 'tipcha').textContent;
  assert.match(tip, /Tipcha/); assert.match(tip, /Tarcha/); assert.match(tip, /טפחא/); assert.match(tip, /U\+0596/); assert.match(tip, /level 2/); assert.match(tip, /pauses \(disjunctive\)/);
  assert.match(rows.find((r) => r.attrs['data-id'] === 'munach').textContent, /joins to the next word/);
  for (const th of root.queryAll('th')) assert.ok(th.attrs.scope === 'col' || th.attrs.scope === 'row');
  assert.ok(root.queryAll('caption').length === 3);
  await sel(root, '.trd-only').click();
  const filtered = root.queryAll('tbody tr');
  assert.ok(filtered.length < table.prose.length && filtered.length >= 14);
  assert.ok(filtered.every((r) => !/\b0$/.test(r.children.at(-1).textContent)));
  assert.ok(!filtered.some((r) => r.attrs['data-id'] === 'shalshelet'));
  // back to a passage
  await sel(root, '[data-passage="shema"]').click();
  assert.equal(words(root).length, 42);
});

test('data failure is reported, not hidden', async () => {
  const { root } = await make({ loadJson: async (rel) => { throw new Error('HTTP 404 ' + rel); } });
  const err = sel(root, '.trd-error');
  assert.equal(err.attrs.role, 'alert');
  assert.match(err.textContent, /could not be loaded/);
});

test('bad stored state is ignored', async () => {
  const { root } = await make({ stored: { passage: 'zzz', speed: 99, showTrope: 'x' } });
  assert.equal(words(root).length, 35);
  assert.match(sel(root, '[data-toggle="showTrope"]').attrs['aria-pressed'], /true/);
});
