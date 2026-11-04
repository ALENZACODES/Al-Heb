// Traditions lane: view tests against the minimal fake DOM in tests/pronunciation.dom-helper.js (no DOM library is
// available). They prove rendering logic, the honest "no audio yet" state, tab switching, setting changes,
// drill flow, RTL/lang attributes on Hebrew and unmount. They do NOT prove real-browser layout, contrast, focus
// order or screen-reader behaviour; the 390px screenshot in docs/traditions/shots/ was looked at separately.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { newRoot, all, buttons, byText, click, tick, loaded, waitFor } from './pronunciation.dom-helper.js';
import { mount, TABS } from '../src/traditions/traditions.view.js';
import { compareWords } from '../src/traditions/model.js';

const load = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const traditionsData = {
  sounds: load('data/traditions/sounds.json'), sources: load('data/traditions/sources.json'), guide: load('data/traditions/guide.json'),
  registry: load('data/corpus/registry.json'), prayerwords: load('data/pronunciation/prayerwords.json'),
  consonants: load('data/pronunciation/consonants.json'), niqqud: load('data/pronunciation/niqqud.json'),
};
const text = (n) => n.textContent;
const byTag = (n, tag) => all(n, (x) => x.tagName === tag.toUpperCase());

function mk(over = {}) {
  const played = [];
  const sets = [];
  const settings = { congregation: 'sephardi', set(k, v) { sets.push([k, v]); this.congregation = v; } };
  const ctx = { settings, t: (k) => k, traditionsData, audio: { has: () => false, status: () => ({ source: 'none' }), play: async (...a) => { played.push(a); return { source: 'file' }; }, playSequence: async (items) => { played.push(['seq', items]); return [{ source: 'file' }]; } }, ...over };
  return { ctx, played, sets };
}
async function open(over, opts = {}) {
  const root = newRoot();
  const m = mk(over);
  const un = mount(root, { ...m.ctx, ...(opts.ctx ?? {}) });
  await loaded(root);
  return { root, un, ...m };
}
const tabBtn = (root, label) => buttons(root).find((b) => b.textContent === label);

test('mount: title, draft notice, five tab buttons with one pressed; unmount empties root', async () => {
  const { root, un } = await open();
  assert.match(text(root), /Traditions/);
  assert.match(text(root), /Draft, unreviewed/);
  const tabs = TABS.map((t) => tabBtn(root, t.label));
  assert.ok(tabs.every(Boolean));
  assert.equal(tabs.filter((b) => b.getAttribute('aria-pressed') === 'true').length, 1);
  un();
  assert.equal(root.children.length, 0);
});

test('compare: three settings shown, current setting marked, honest "No audio yet" and no Play button', async () => {
  const { root } = await open();
  const t = text(root);
  for (const label of ['Modern Israeli', 'American synagogue (Sephardi values)', 'Ashkenazi']) assert.ok(t.includes(label), label);
  assert.match(t, /yevarekhkha adonai/);
  assert.match(t, /yevorekhkho adonoy/);
  assert.match(t, /Also exists: /);
  assert.match(t, /Yemenite/);
  assert.match(t, /No audio yet for this setting/);
  assert.ok(!buttons(root).some((b) => /^Play/.test(b.textContent)), 'no Play button without audio');
  assert.equal(all(root, (x) => /\bmine\b/.test(x.getAttribute('class') ?? '')).length, 1);
  assert.match(text(root), /your setting/);
});

test('compare: Hebrew is dir=rtl lang=he; options include all 70 texts and 10 words', async () => {
  const { root } = await open();
  const heEls = all(root, (x) => /\bhe\b|he-big|he-lines/.test(x.getAttribute('class') ?? ''));
  assert.ok(heEls.length > 0);
  for (const el of heEls) { assert.equal(el.getAttribute('dir'), 'rtl'); assert.equal(el.getAttribute('lang'), 'he'); }
  const opts = byTag(root, 'option');
  assert.equal(opts.length, 70 + 10);
  const sel = byTag(root, 'select')[0];
  assert.ok(sel.getAttribute('id'));
  assert.ok(all(root, (x) => x.tagName === 'LABEL' && x.getAttribute('for') === sel.getAttribute('id')).length === 1, 'select has a label');
});

test('compare: choose a prayer word and see hand-written respellings with stress', async () => {
  const { root } = await open();
  const sel = byTag(root, 'select')[0];
  sel.value = 'word:barukh';
  sel.dispatch('change');
  const t = text(root);
  assert.match(t, /ba-RUKH/);
  assert.match(t, /BO-rukh/);
  assert.match(t, /stress: last/);
  assert.match(t, /Engine respelling: borukh/);
});

test('compare: word list shows only differing words until "Show all words" is ticked', async () => {
  const { root } = await open();
  const sel = byTag(root, 'select')[0];
  sel.value = 'text:hamotzi'; sel.dispatch('change');
  const items = () => byTag(root, 'li').filter((li) => all(li, (x) => x.tagName === 'DL').length === 1);
  const rows = compareWords(traditionsData.registry.entries.find((e) => e.id === 'hamotzi').he);
  const nDiff = rows.filter((r) => r.differs).length;
  assert.ok(nDiff > 0 && nDiff < rows.length);
  assert.ok(text(root).includes(`${nDiff} of ${rows.length} words`));
  assert.equal(items().length, nDiff);
  const box = byTag(root, 'input').find((i) => i.getAttribute('type') === 'checkbox');
  box.checked = true; box.dispatch('change');
  assert.equal(items().length, rows.length);
});

test('compare: sound chips jump to the Sounds tab and mark that row', async () => {
  const { root } = await open();
  const sel = byTag(root, 'select')[0];
  sel.value = 'text:hamotzi'; sel.dispatch('change');
  const chip = buttons(root).find((b) => /Open sound table row: Kamatz/.test(b.getAttribute('aria-label') ?? ''));
  assert.ok(chip);
  click(chip);
  assert.equal(tabBtn(root, 'Sounds').getAttribute('aria-pressed'), 'true');
  assert.equal(all(root, (x) => x.tagName === 'TR' && /focus-row/.test(x.getAttribute('class') ?? '')).map((r) => r.getAttribute('data-sound')).join(), 'kamatz');
});

test('compare: with a real clip for one setting, only that setting gets a Play button, and it plays with the right tradition', async () => {
  const played = [];
  const audio = {
    has: (k, id, o) => o.tradition === 'ashkenazi' && k === 'line' && id === 'bless-priestly-1',
    status: (k, id, o) => (o.tradition === 'ashkenazi' && k === 'line' && id === 'bless-priestly-1' ? { source: 'file', via: 'exact' } : { source: 'none' }),
    play: async (k, id, o) => { played.push([k, id, o]); return { source: 'file' }; },
    playSequence: async () => [],
  };
  const { root } = await open({ audio });
  const plays = buttons(root).filter((b) => /^Play$/.test(b.textContent));
  assert.equal(plays.length, 1);
  assert.match(plays[0].getAttribute('aria-label'), /Ashkenazi/);
  click(plays[0]);
  await waitFor(() => played.length === 1, { message: "played.length === 1" });
  assert.deepEqual(played, [['line', 'bless-priestly-1', { tradition: 'ashkenazi' }]]);
});

test('compare: a stand-in clip is labelled as a stand-in', async () => {
  const audio = {
    has: () => true,
    status: (k, id, o) => (o.tradition === 'sephardi' ? { source: 'file', via: 'equivalent', fileTradition: 'israeli' } : { source: 'none' }),
    play: async () => ({ source: 'file' }),
  };
  const { root } = await open({ audio });
  assert.match(text(root), /stand-in recording from another setting/);
});

test('sounds tab: one row per sound, each row has a confidence badge and at least one source link; table has roles', async () => {
  const { root } = await open();
  click(tabBtn(root, 'Sounds'));
  const rows = all(root, (x) => x.tagName === 'TR' && x.getAttribute('data-sound'));
  assert.equal(rows.length, traditionsData.sounds.sounds.length);
  for (const r of rows) {
    assert.match(text(r), /confidence/);
    assert.ok(all(r, (x) => x.tagName === 'A' && /^https:/.test(x.getAttribute('href') ?? '')).length >= 1, r.getAttribute('data-sound'));
  }
  const table = byTag(root, 'table')[0];
  assert.equal(table.getAttribute('role'), 'table');
  assert.ok(all(table, (x) => x.tagName === 'TH' && x.getAttribute('scope') === 'col').length === 6);
  for (const a of all(root, (x) => x.tagName === 'A')) assert.match(a.getAttribute('rel'), /noopener/);
  assert.match(text(root), /Yemenite Hebrew/);
  assert.match(text(root), /\[s\]/, 'Ashkenazi IPA for tav from the pronunciation data');
});

test('guide tab: choosing a situation shows caveats, sources and a switch button that sets the congregation', async () => {
  const { root, sets } = await open();
  click(tabBtn(root, 'Which should I learn?'));
  assert.match(text(root), /no single right answer/i);
  const radios = byTag(root, 'input').filter((i) => i.getAttribute('type') === 'radio');
  assert.equal(radios.length, traditionsData.guide.situations.length);
  const orth = radios.find((r) => r.getAttribute('value') === 'us-orthodox');
  orth.checked = true; orth.dispatch('change');
  assert.match(text(root), /Ashkenazi pronunciation is more common/);
  assert.match(text(root), /Ask first:/);
  const sw = byText(root, /Switch the app to Ashkenazi/);
  assert.ok(sw);
  click(sw);
  assert.deepEqual(sets, [['congregation', 'ashkenazi']]);
  assert.match(text(root), /Already using Ashkenazi/);
});

test('guide tab: Israel situation and a situation with no tradition (Torah reading) render without a switch button', async () => {
  const { root } = await open();
  click(tabBtn(root, 'Which should I learn?'));
  const radios = byTag(root, 'input').filter((i) => i.getAttribute('type') === 'radio');
  const tr = radios.find((r) => r.getAttribute('value') === 'torah-reading');
  tr.checked = true; tr.dispatch('change');
  assert.match(text(root), /whatever your community uses/);
  assert.ok(!byText(root, /Switch the app to/));
});

test('hear tab with no audio: says so plainly, offers a reading drill, scores answers, explains the sound', async () => {
  const { root } = await open();
  click(tabBtn(root, 'Hear the difference'));
  assert.match(text(root), /No audio yet\. None of the Israeli, American-synagogue or Ashkenazi recordings/);
  assert.match(text(root), /Reading drill \(no sound\)/);
  assert.ok(!buttons(root).some((b) => /^Play clip/.test(b.textContent)));
  assert.match(text(root), /0 right of 0/);
  click(byText(root, /^Option A$/));
  assert.match(text(root), /1 right of 1|0 right of 1/);
  assert.match(text(root), /reading was [AB]/);
  assert.ok(byText(root, /^Next$/));
  click(byText(root, /^Next$/));
  assert.ok(byText(root, /^Option A$/) && !byText(root, /^Option A$/).getAttribute('disabled'));
});

test('hear tab with audio in two settings: listening drill, Play clip buttons call playSequence with that tradition', async () => {
  const played = [];
  const table = new Set(['israeli|line|shema-1', 'ashkenazi|line|shema-1']);
  const audio = {
    has: (k, id, o) => table.has(`${o.tradition}|${k}|${id}`),
    status: (k, id, o) => (table.has(`${o.tradition}|${k}|${id}`) ? { source: 'file', via: 'exact' } : { source: 'none' }),
    play: async () => ({ source: 'file' }),
    playSequence: async (items) => { played.push(items); return [{ source: 'file' }]; },
  };
  const { root } = await open({ audio });
  click(tabBtn(root, 'Hear the difference'));
  assert.ok(!/No audio yet\./.test(text(root)));
  const pa = byText(root, /^Play clip A$/), pb = byText(root, /^Play clip B$/);
  assert.ok(pa && pb);
  click(pa); click(pb);
  await waitFor(() => played.length === 2, { message: "played.length === 2" });
  assert.equal(played.length, 2);
  assert.deepEqual(new Set(played.map((p) => p[0].tradition)), new Set(['israeli', 'ashkenazi']));
  click(byText(root, /^Clip A$/));
  assert.match(text(root), /reading was [AB]/);
});

test('sources tab: lists every source with licence and fetch date, CC BY-SA noted, external links safe', async () => {
  const { root } = await open();
  click(tabBtn(root, 'Sources'));
  const t = text(root);
  assert.match(t, /CC BY-SA 4\.0/);
  for (const s of traditionsData.sources.sources.filter((x) => x.id !== 'own')) assert.ok(t.includes(s.title), s.id);
  assert.match(t, /Read 2026-11-03/);
});

test('query.tab opens that tab; query.text preselects a registry text', async () => {
  const { root } = await open({}, { ctx: { query: { tab: 'sounds' } } });
  assert.equal(tabBtn(root, 'Sounds').getAttribute('aria-pressed'), 'true');
  const r2 = await open({}, { ctx: { query: { text: 'shema-1' } } });
  assert.match(text(r2.root), /shema yisra'el/);
});

test('load failure shows an alert instead of a blank screen', async () => {
  const root = newRoot();
  const un = mount(root, { settings: {}, t: (k) => k, traditionsData: { ...traditionsData, sounds: undefined } });
  await waitFor(() => all(root, (x) => x.getAttribute('role') === 'alert').length === 1, { message: "all(root, (x) => x.getAttribute('role') === 'alert').length === 1" });
  // sounds.json missing from the injection falls back to fetch of a file: URL, which Node cannot do, so it rejects
  const alerts = all(root, (x) => x.getAttribute('role') === 'alert');
  assert.equal(alerts.length, 1);
  assert.match(text(alerts[0]), /Could not load the traditions data/);
  un();
});

test('works with no settings, no audio object and no t()', async () => {
  const root = newRoot();
  const un = mount(root, { traditionsData });
  await loaded(root);
  assert.match(text(root), /Modern Israeli/);
  assert.equal(all(root, (x) => /\bmine\b/.test(x.getAttribute('class') ?? '')).length, 1, 'defaults to israeli');
  un();
});

test('unmount mid-load does not throw or render', async () => {
  const root = newRoot();
  const un = mount(root, { traditionsData, settings: {} });
  un();
  await tick(30);
  assert.equal(root.children.length, 0);
});
