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
async function make({ congregation = 'sephardi', voice = 'm', audio, stored, loadJson, query, rawStored = false } = {}) {
  const root = new N('div'); const store = memStore();
  // The full-Torah home is the route's default screen now; the study tests open the study screen explicitly.
  store.m['torahreader.v1'] = rawStored ? stored : { screen: 'study', ...(stored || {}) };
  const clock = fakeClock(); const calls = [];
  const a = audio === 'rec' ? { has: () => true, play: async (k, i, o) => { calls.push([k, i, o]); return { source: 'file', entryStatus: 'recorded' }; } } : audio;
  const ctx = { store, settings: { get: (k) => (k === 'congregation' ? congregation : k === 'voice' ? voice : undefined) }, audio: a, clock, loadJson, query };
  const un = mount(root, ctx); await un.ready;
  return { root, store, ctx, clock, calls, un };
}
const words = (root) => root.queryAll('.trd-w');
const status = (root) => root.queryAll('.trd-status')[0].textContent;
const sel = (root, s) => root.queryAll(s)[0];

test('Torah native recording starts in the tap without waiting for shared audio and supports speed and stop', async () => {
  const loadJson = async rel => rel === 'data/audio/manifest-torah.json'
    ? [{ kind: 'torah-chapter-en', id: 'torah-en-genesis-1', voice: 'm', tradition: 'english', status: 'tts', path: 'audio/test.mp3' }]
    : JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
  let shared = 0, starts = 0, pauses = 0;
  const { root } = await make({ stored: { screen: 'chapter', audioLang: 'en' }, query: { book: 'genesis', chapter: '1' }, loadJson,
    audio: { stop() {}, play() { shared++; return new Promise(() => {}); } } });
  const media = sel(root, 'audio');
  assert.equal(media.getAttribute('src'), 'audio/test.mp3');
  media.play = () => { starts++; return Promise.resolve(); }; media.pause = () => pauses++;
  const clicked = sel(root, '.trd-play-chapter').click();
  assert.equal(starts, 1); assert.equal(shared, 0); await clicked;
  assert.equal(media.muted, false); assert.equal(media.volume, 1);
  await sel(root, '[data-recording-rate="1.25"]').click(); assert.equal(media.playbackRate, 1.25);
  await sel(root, '.trd-stop-chapter').click(); assert.ok(pauses > 0);
});

test('mounts: title, draft notice, Hebrew buttons are lang=he dir=rtl, tabs are toggle buttons, unmount returns', async () => {
  const { root, un } = await make();
  assert.equal(sel(root, 'h1').textContent, 'Torah reader: Priestly Blessing and Shema');
  assert.ok(root.textContent.includes(NOTICE));
  assert.match(NOTICE, /not checked by a cantor/);
  const w = words(root);
  assert.equal(w.length, 35);
  for (const b of w) { assert.equal(b.tag, 'button'); assert.equal(b.attrs.lang, 'he'); assert.equal(b.attrs.dir, 'rtl'); assert.match(b.attrs['aria-label'], /word \d+ of 35/); }
  const tabs = root.queryAll('.trd-tab'); assert.equal(tabs.length, 5); // Torah home + the two passages + the legend (top bar and the controls copy)
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
  await btn(rec.root, /^Hear it$/).click(); await waitFor(() => rec.calls.length >= 1 && /Playing this word: Recorded by a human reader/.test(status(rec.root)), { message: "rec.calls.length >= 1 && /Playing this word: Recorded by a human reader/.test(status(rec.root))" });
  assert.deepEqual(rec.calls[0].slice(0, 2), ['word', 'shema-vahavta-w1']);
  assert.equal(rec.calls[0][2].text, 'שְׁמַע');
  assert.match(status(rec.root), /Playing this word: Recorded by a human reader/);
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
    [{ has: () => true, play: async () => ({ source: 'file', entryStatus: 'tts' }) }, /Synthetic voice \(Israeli only\), not a recorded teacher/],
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
  assert.match(LEGEND_NOTICE, /does not describe or play any melody/);
  assert.match(t, /Reference, not a chanting teacher/);
  assert.equal((t.match(/not a chanting teacher/gi) || []).length, 1, 'the legend notice says it once');
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

test('the selected word details open inside the verse of that word, and large letters are drawn for Deuteronomy 6:4 only', async () => {
  const { root, un } = await make({ stored: { passage: 'shema' } });
  const w = words(root);
  assert.equal(root.queryAll('.trd-lg').length, 2);
  assert.equal(root.queryAll('.trd-lgnote').length, 1);
  await tick(); await w[7].click(); await tick();
  const slots = root.queryAll('.trd-slot');
  assert.equal(slots.filter((s) => s.children.length).length, 1);
  assert.ok(slots[1].children.length === 1);
  assert.equal(root.queryAll('#trd-detail').length, 1);
  un();
});

test('secondary controls (toggles, text size, pace, Read with me, legend button) are in a closed details; verses are outside it', async () => {
  const { root } = await make();
  const ctl = root.queryAll('details.trd-ctl')[0];
  assert.ok(ctl && ctl.attrs.open === undefined);
  for (const q of ['.trd-toggle', '.trd-size', '.trd-speed', '.trd-run', '[data-view="legend"]']) assert.ok(ctl.queryAll(q).length >= 1, q);
  assert.equal(ctl.queryAll('.trd-verse').length, 0);
  assert.equal(root.queryAll('.trd-verse').length, 6);
});

test('text size: stored, applied as a scale on the wrapper, survives remount; word buttons keep a 44px tap size in the CSS', async () => {
  const { root, store } = await make();
  assert.match(root.queryAll('.alef-trd')[0].attrs.style, /--trd-scale:1$/);
  await sel(root, '[data-size="largest"]').click();
  assert.equal(store.m['torahreader.v1'].size, 'largest');
  assert.match(root.queryAll('.alef-trd')[0].attrs.style, /--trd-scale:1\.7$/);
  assert.equal(sel(root, '[data-size="largest"]').attrs['aria-pressed'], 'true');
  const again = await make({ stored: store.m['torahreader.v1'] });
  assert.match(again.root.queryAll('.alef-trd')[0].attrs.style, /--trd-scale:1\.7$/);
  const css = fs.readFileSync(new URL('../src/torahreader/torahreader.view.js', import.meta.url), 'utf8');
  assert.match(css, /\.trd-w\{[^}]*min-inline-size:max\(44px/);
  assert.match(css, /button\{min-block-size:max\(44px/);
});

// ---------- full Torah (Lane J pilot: Genesis) ----------
const rows = (root) => root.queryAll('.trd-row');

test('Torah home screen: five books, 54 portions, week card, study entries, labels', async () => {
  const { root } = await make({ rawStored: true, stored: undefined });
  await sel(root, '[data-screen="home"]').click();
  assert.equal(sel(root, 'h1').textContent, 'Torah reader');
  const books = root.queryAll('.trd-book');
  assert.equal(books.length, 5);
  assert.ok(sel(root, '[data-book-open="genesis"]'), 'Genesis is openable');
  for (const b of ['exodus', 'leviticus', 'numbers', 'deuteronomy']) assert.ok(sel(root, `[data-book-open="${b}"]`), `${b} is openable`);
  assert.doesNotMatch(root.textContent, /Coming soon/);
  assert.equal(root.queryAll('.trd-portion').length, 54);
  assert.ok(root.queryAll('.trd-week').length === 1 && /parasha/.test(root.queryAll('.trd-week')[0].textContent));
  assert.ok(root.textContent.includes('Read in Israeli Hebrew.'));
  assert.match(root.textContent, /JPS 1917/);
  assert.match(root.textContent, /not a chant/);
  assert.match(root.textContent, /Draft, not checked by a rabbi or Hebrew teacher/);
  assert.ok(sel(root, '[data-continue="1"]'), 'a Continue card is offered');
});

test('chapter view: Genesis 1 renders 31 side-by-side rows, toggles work, next chapter navigates', async () => {
  const { root, store } = await make({ rawStored: true, stored: undefined, query: { book: 'genesis', chapter: '1' } });
  assert.equal(sel(root, 'h1').textContent, 'Genesis 1');
  assert.equal(rows(root).length, 31);
  const first = rows(root)[0];
  assert.match(first.queryAll('.trd-hebrew')[0].textContent, /בְּרֵאשִׁ/);
  assert.equal(first.queryAll('.trd-en')[0].textContent, 'In the beginning God created the heaven and the earth.');
  assert.equal(root.queryAll('[data-pronunciation-verse]').length, 31, 'every verse has the pronunciation guide by default');
  await sel(root, '[data-toggle="showPronunciation"]').click();
  assert.equal(root.queryAll('[data-pronunciation-verse]').length, 0);
  assert.equal(store.m['torahreader.v1'].showPronunciation, false);
  await sel(root, '[data-toggle="showPronunciation"]').click();
  assert.equal(root.queryAll('[data-pronunciation-verse]').length, 31);
  assert.equal(root.queryAll('.trd-next-ch').length, 1);
  assert.equal(root.queryAll('.trd-prev-ch').length, 0);
  // English toggle hides the English column
  await sel(root, '[data-toggle="showEnglish"]').click();
  assert.equal(root.queryAll('.trd-en').length, 0);
  assert.equal(store.m['torahreader.v1'].showEnglish, false);
  await sel(root, '[data-toggle="showEnglish"]').click();
  assert.equal(root.queryAll('.trd-en').length, 31);
  // cantillation toggle switches he/heTrope
  const withTrope = rows(root)[0].queryAll('.trd-hebrew')[0].textContent;
  assert.match(withTrope, /[֑-֯]/);
  await sel(root, '[data-toggle="showTrope"]').click();
  assert.doesNotMatch(rows(root)[0].queryAll('.trd-hebrew')[0].textContent, /[֑-֯]/);
  // computed transliteration aid, labelled as computed
  await sel(root, '[data-translit="1"]').click();
  assert.equal(rows(root)[0].queryAll('[data-pronunciation-verse]').length, 0, 'individual verse can hide its guide');
  await sel(root, '[data-translit="1"]').click();
  assert.equal(rows(root)[0].queryAll('[data-pronunciation-verse]').length, 1);
  assert.match(root.queryAll('.trd-translit')[0].textContent, /computed from the vowel points/);
  // next chapter
  await sel(root, '.trd-next-ch').click(); await tick();
  assert.equal(sel(root, 'h1').textContent, 'Genesis 2');
  assert.equal(rows(root).length, 25);
  assert.equal(store.m['torahreader.v1'].chapter, 2);
});

test('deep link: book + chapter + verse lands on the chapter with the verse marked', async () => {
  const { root } = await make({ rawStored: true, stored: undefined, query: { book: 'genesis', chapter: '1', verse: '3' } });
  const marked = root.queryAll('.trd-target');
  assert.equal(marked.length, 1);
  assert.equal(marked[0].attrs['data-torah-verse'], '3');
  assert.equal(marked[0].attrs['aria-current'], 'true');
});

test('portion view clips the chapter to the portion range (Bereshit ends at Genesis 6:8)', async () => {
  const { root } = await make({ rawStored: true, stored: { screen: 'chapter', book: 'genesis', chapter: 6, portionId: 'bereshit' } });
  assert.equal(rows(root).length, 8);
  assert.match(root.queryAll('.trd-portion-banner')[0].textContent, /verses 1–8/);
  await sel(root, '.trd-portion-exit').click();
  assert.equal(rows(root).length, 22, 'leaving the portion shows the whole chapter');
  const ch2 = await make({ rawStored: true, stored: { screen: 'chapter', book: 'genesis', chapter: 2, portionId: 'bereshit' } });
  assert.deepEqual(ch2.root.queryAll('.trd-aliyah').map((a) => a.attrs['data-aliyah']), ['2', '3'], 'aliyah starts inside the chapter are marked (2:4 and 2:20)');
});

test('chapter audio is hidden while durations and clips do not exist yet (silent degradation)', async () => {
  const { root } = await make({ rawStored: true, stored: undefined, query: { book: 'genesis', chapter: '1' }, audio: 'rec' });
  assert.equal(root.queryAll('.trd-play-chapter').length, 0);
  assert.equal(root.queryAll('.trd-hear-verse').length, 0);
  assert.equal(rows(root).length, 31, 'the chapter is fully usable as text');
});

test('chapter audio appears when durations and manifest entries exist; verse and chapter play use the Torah ids', async () => {
  const manifest = [
    { kind: 'line', id: 'torah-genesis-1-1', voice: 'm', tradition: 'israeli', status: 'tts' },
    { kind: 'torah-chapter', id: 'torah-genesis-1', voice: 'm', tradition: 'israeli', status: 'tts' },
  ];
  const loadJson = async (rel) => {
    if (rel === 'data/audio/manifest-torah.json') return manifest;
    const j = JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
    if (rel === 'data/corpus/torah/genesis/01.json') for (const v of j.verses) v.durMs = { m: 1000, f: 1000 };
    return j;
  };
  const { root, calls } = await make({ rawStored: true, stored: undefined, query: { book: 'genesis', chapter: '1' }, audio: 'rec', loadJson });
  const hear = root.queryAll('.trd-hear-verse');
  assert.equal(hear.length, 1, 'only the verse with a manifest entry gets a Hear button');
  await hear[0].click(); await tick();
  assert.deepEqual(calls[0].slice(0, 2), ['line', 'torah-genesis-1-1']);
  assert.equal(calls[0][2].tradition, 'israeli');
  const play = sel(root, '.trd-play-chapter');
  assert.ok(play, 'chapter play is offered when durations and the chapter entry exist');
  await play.click(); await tick();
  assert.ok(calls.some((c) => c[0] === 'torah-chapter' && c[1] === 'torah-genesis-1'), 'chapter play uses kind torah-chapter, id torah-genesis-1');
});

test('English chapter-only audio plays for either voice without invented verse timers', async () => {
  for (const voice of ['m', 'f']) {
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    const calls = [];
    const loadJson = async rel => rel === 'data/audio/manifest-torah.json'
      ? [{ kind: 'torah-chapter-en', id: 'torah-en-genesis-1', voice, tradition: 'english', status: 'tts', timing: 'chapter-only' }]
      : JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
    const { root, clock } = await make({ voice, rawStored: true, stored: { screen: 'chapter', audioLang: 'en' }, query: { book: 'genesis', chapter: '1' }, loadJson,
      audio: { play: (...args) => { calls.push(args); return pending; }, stop() {} } });
    assert.ok(sel(root, '.trd-play-chapter'));
    const playing = sel(root, '.trd-play-chapter').click();
    await tick();
    assert.equal(calls[0][0], 'torah-chapter-en');
    assert.equal(calls[0][1], 'torah-en-genesis-1');
    assert.equal(calls[0][2].tradition, 'english');
    assert.equal(clock.timers.size, 0, 'no estimated verse timer');
    assert.equal(root.queryAll('.trd-playing').length, 0, 'no false verse highlighting');
    release({source:'file',entryStatus:'tts'});
    await playing;
    await sel(root, '[data-audiolang="he"]').click();
    assert.equal(root.queryAll('.trd-play-chapter').length, 0, 'English availability does not imply Hebrew availability');
  }
});

test('phone finger guide preserves source words and follows touch, keyboard and pacing controls', async () => {
  const { root, clock, un } = await make({ query: { book: 'genesis', chapter: '1' } });
  const original = root.queryAll('.trd-hebrew').map((p) => p.textContent);
  await sel(root, '.trd-finger-toggle').click();
  assert.deepEqual(root.queryAll('.trd-hebrew').map((p) => p.textContent), original, 'spacing, niqqud and trope remain unchanged');
  const ws = root.queryAll('.trd-finger-word');
  assert.ok(ws.length > 100); assert.equal(sel(root, '.trd-finger-toggle').attrs['aria-pressed'], 'true');
  assert.match(sel(root, '.trd-finger-position').textContent, new RegExp(`Word 1 of ${ws.length}`));
  assert.equal(sel(root, '.trd-hebrew').attrs.dir, 'rtl');
  const box = sel(root, '.trd-chapter-verses');
  await box.fire('pointerdown', { target: ws[2], pointerId: 7, isPrimary: true, button: 0 });
  await box.fire('pointermove', { target: ws[6], pointerId: 7 });
  assert.equal(ws[6].attrs['aria-current'], 'true'); assert.equal(ws[2].attrs['aria-current'], 'false');
  await box.fire('pointerup', { pointerId: 7 });
  await box.fire('pointermove', { target: ws[8], pointerId: 7 });
  assert.equal(ws[6].attrs['aria-current'], 'true', 'lifting finger ends tracking');
  await ws[6].fire('keydown', { key: 'ArrowLeft' });
  assert.equal(ws[7].attrs['aria-current'], 'true', 'left arrow advances in RTL reading order');
  await sel(root, '.trd-finger-run').click(); assert.equal(clock.timers.size, 1);
  const duration = () => [...clock.timers.values()][0].ms;
  const normal = duration(); await sel(root, '.trd-finger-slower').click(); assert.ok(duration() > normal);
  await sel(root, '.trd-finger-faster').click(); assert.equal(duration(), normal);
  clock.fire(); assert.equal(ws[8].attrs['aria-current'], 'true');
  await box.fire('pointerdown', { target: ws[1], pointerId: 8, button: 0 });
  assert.equal(clock.timers.size, 0, 'finger takes over from automatic movement');
  await box.fire('pointercancel', { pointerId: 8 });
  await box.fire('pointermove', { target: ws[3], pointerId: 8 });
  assert.equal(ws[1].attrs['aria-current'], 'true');
  await sel(root, '.trd-finger-run').click(); un(); assert.equal(clock.timers.size, 0);
});

test('finger guide stops on navigation and can be switched off for normal scrolling', async () => {
  const { root, clock } = await make({ query: { book: 'genesis', chapter: '1' } });
  await sel(root, '.trd-finger-toggle').click();
  await sel(root, '.trd-finger-next').click();
  await sel(root, '.trd-finger-run').click();
  await sel(root, '.trd-next-ch').click(); await tick();
  assert.equal(clock.timers.size, 0); assert.equal(root.queryAll('.trd-finger-word')[0].attrs['aria-current'], 'true');
  assert.match(sel(root, '.trd-finger-position').textContent, new RegExp(`Word 1 of ${root.queryAll('.trd-finger-word').length}`));
  const text = sel(root, '.trd-hebrew').textContent;
  await sel(root, '.trd-finger-toggle').click();
  assert.equal(root.queryAll('.trd-finger-word').length, 0);
  assert.equal(root.queryAll('.trd-finger-on').length, 0);
  assert.equal(sel(root, '.trd-hebrew').textContent, text);
});

test('English chapter Stop and navigation invalidate late audio status and stop the actual player', async () => {
  const loadJson = async rel => rel === 'data/audio/manifest-torah.json'
    ? [{ kind: 'torah-chapter-en', id: 'torah-en-genesis-1', voice: 'm', tradition: 'english', status: 'tts' }]
    : JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
  let release, stops = 0;
  const { root } = await make({ stored: { screen: 'chapter', audioLang: 'en' }, query: { book: 'genesis', chapter: '1' }, loadJson,
    audio: { play: () => new Promise(resolve => { release = resolve; }), stop: () => { stops++; } } });
  let playing = sel(root, '.trd-play-chapter').click(); await tick();
  await sel(root, '.trd-stop-chapter').click();
  release({source:'file',entryStatus:'tts',stopped:true}); await playing;
  assert.equal(status(root), 'Chapter audio stopped.'); assert.ok(stops > 0);
  playing = sel(root, '.trd-play-chapter').click(); await tick();
  release({source:'file',entryStatus:'tts',ended:true}); await playing;
  assert.match(status(root), /Genesis 1 English reading finished/); assert.match(status(root), /Synthetic English voice/);
  assert.doesNotMatch(status(root), /Israeli|Playing/);
  playing = sel(root, '.trd-play-chapter').click(); await tick();
  const before = stops; await sel(root, '.trd-next-ch').click(); await tick();
  const afterNavigation = status(root); assert.ok(stops > before, 'navigation stops actual audio');
  release({source:'file',entryStatus:'tts',ended:true}); await playing;
  assert.equal(status(root), afterNavigation, 'old chapter completion cannot change the new chapter status');
});

test('chapter recording speed changes live player rate and is passed to subsequent playback', async () => {
  const rates = [], calls = [];
  const loadJson = async rel => rel === 'data/audio/manifest-torah.json'
    ? [{ kind: 'torah-chapter-en', id: 'torah-en-genesis-1', voice: 'm', tradition: 'english', status: 'tts' }]
    : JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
  const { root } = await make({ stored: { screen: 'chapter', audioLang: 'en' }, query: { book: 'genesis', chapter: '1' }, loadJson,
    audio: { setPlaybackRate: r => rates.push(r), play: async (...args) => { calls.push(args); return { source: 'file', entryStatus: 'tts', ended: true }; }, stop() {} } });
  await sel(root, '[data-recording-rate="0.75"]').click();
  assert.deepEqual(rates, [0.75]); assert.equal(sel(root, '[data-recording-rate="0.75"]').attrs['aria-pressed'], 'true');
  await sel(root, '.trd-play-chapter').click(); assert.equal(calls[0][2].rate, 0.75);
  await sel(root, '[data-recording-rate="1.25"]').click();
  assert.deepEqual(rates, [0.75, 1.25]); assert.equal(sel(root, '[data-recording-rate="0.75"]').attrs['aria-pressed'], 'false');
  await sel(root, '.trd-play-chapter').click(); assert.equal(calls[1][2].rate, 1.25);
  assert.equal(sel(root, '[data-recording-rate="1.25"]').attrs['aria-pressed'], 'true');
});

test('finger guide preserves standalone punctuation without counting it as Hebrew words', async () => {
  const { createFingerGuide } = await import('../src/torahreader/finger-follow.js');
  const guide = createFingerGuide({ clock: fakeClock() });
  await guide.controls().querySelector('.trd-finger-toggle').click();
  guide.begin('punctuation-fixture');
  const line = new N('p'), source = 'בְּרֵאשִׁית ׀ בָּרָא ׃';
  line.append(...guide.text(source, 1)); guide.bind(line);
  assert.equal(line.textContent, source);
  assert.equal(line.queryAll('.trd-finger-word').length, 2);
  assert.deepEqual(line.queryAll('.trd-finger-word').map(w => w.textContent), ['בְּרֵאשִׁית', 'בָּרָא']);
});

test('chapter Ari/Noa toggle uses the global voice setting and refreshes exact-voice availability', async () => {
  let voice = 'm', stops = 0; const heard = [], changes = [];
  const loadJson = async rel => rel === 'data/audio/manifest-torah.json'
    ? [
        { kind: 'torah-chapter-en', id: 'torah-en-genesis-1', voice: 'f', tradition: 'english', status: 'tts' },
        { kind: 'torah-chapter', id: 'torah-genesis-1', voice: 'm', tradition: 'israeli', status: 'tts' },
      ] : JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
  const { root, ctx } = await make({ stored: { screen: 'chapter', audioLang: 'en' }, query: { book: 'genesis', chapter: '1' }, loadJson,
    audio: { stop: () => stops++, play: async (kind, id, opts) => { heard.push({ kind, voice, opts }); return { source: 'file', entryStatus: 'tts', ended: true }; } } });
  ctx.settings.get = key => key === 'voice' ? voice : 'israeli';
  ctx.settings.set = patch => { changes.push(patch); voice = patch.voice; return []; };
  assert.ok(sel(root, '[data-chapter-voice="f"]'), 'other voice remains reachable when selected voice has no English file');
  assert.equal(root.queryAll('.trd-play-chapter').length, 0);
  await sel(root, '[data-chapter-voice="f"]').click();
  assert.deepEqual(changes, [{ voice: 'f' }]); assert.ok(stops > 0);
  assert.equal(sel(root, '[data-chapter-voice="f"]').attrs['aria-pressed'], 'true');
  await sel(root, '.trd-play-chapter').click(); assert.equal(heard[0].voice, 'f'); assert.equal(heard[0].kind, 'torah-chapter-en');
  assert.equal(heard[0].opts.voice, undefined, 'player follows global setting rather than a local override');
  await sel(root, '[data-audiolang="he"]').click(); assert.equal(root.queryAll('.trd-play-chapter').length, 0);
  await sel(root, '[data-chapter-voice="m"]').click();
  assert.ok(sel(root, '.trd-play-chapter'));
  await sel(root, '.trd-play-chapter').click(); assert.equal(heard[1].voice, 'm'); assert.equal(heard[1].kind, 'torah-chapter');
});
