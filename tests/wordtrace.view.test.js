import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { install, newRoot, all, sel, tick, drag } from './wordtrace.fakedom.js';
import { waitFor } from './helpers/waitfor.js';

const doc = install();
const { mount } = await import('../src/wordtrace/wordtrace.view.js');
const rd = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const bank = rd('data/wordtrace/words.json');
const letters = rd('data/letters/letters.json');
const byId = Object.fromEntries(letters.map(l => [l.id, l]));
const BA = bank.words.find(w => w.plain === 'בא' && w.level === 'two').he;       // bet alef, 2 letters
const SHALOM = bank.words.find(w => w.plain === 'שלום' && w.level === 'prayer').he;

function mkStore(init = {}) { const m = { ...init }; return { m, get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = v; } }; }
const traced = (...ids) => ({ 'letters.progress': Object.fromEntries(ids.map(id => [id, { print: { completions: 1, perfect: 0, bestMistakes: 1, last: 'x' }, cursive: { completions: 1, perfect: 0, bestMistakes: 1, last: 'x' } }])) });
async function open(opts = {}) {
  const root = newRoot(doc); const store = opts.store || mkStore(traced('alef', 'bet'));
  const played = [];
  const ctx = { store, t: k => k, letters, wordtrace: bank, query: opts.query || {}, settings: { script: opts.script || 'print' }, audio: opts.audio || { has: () => false, play: (k, id) => played.push([k, id]) } };
  const unmount = mount(root, ctx);
  await waitFor(() => root.children.length > 0 && !/Loading words/.test(root.textContent), { message: "word trace view finished loading" });
  return { root, store, unmount, played };
}
const btn = (root, act) => sel(root, `[data-act=${act}]`);
const strip = (root) => sel(root, '[data-role=strip]');
const cells = (root) => all(strip(root), n => n.getAttribute('data-index') !== null && n.className === 'cell');
const svgOf = (cell) => all(cell, n => n.tagName === 'svg')[0];
function traceCell(cell, id, script = 'print') { for (const s of byId[id][script].strokes) drag(svgOf(cell), s.median); }
const txt = (n) => n.textContent;

test('hear-the-word uses the shared audio button: file clip plays, device voice is labelled, no voice says No audio yet', async () => {
  const calls = [];
  const mkAudio = (src) => ({ status: () => ({ source: src, reason: 'x' }), play: async (k, id, o) => { calls.push([k, id, o && o.text]); return { source: src }; } });
  const clip = await open({ query: { word: BA, level: 'two' }, audio: mkAudio('file') });
  const b = sel(clip.root, '[data-audio=word\\/r07-w2]') || all(clip.root, n => n.getAttribute('data-audio') === 'word/r07-w2')[0];
  assert.ok(b); assert.equal(b.getAttribute('data-audio-state'), 'file'); await b.dispatch('click');
  await waitFor(() => calls.length === 1, { message: 'play called' }); assert.deepEqual(calls[0].slice(0, 2), ['word', 'r07-w2']); clip.unmount();
  const dev = await open({ query: { word: BA, level: 'two' }, audio: mkAudio('tts-fallback') });
  const d = all(dev.root, n => n.getAttribute('data-audio') === 'word/r07-w2')[0];
  assert.equal(d.getAttribute('data-audio-state'), 'device'); assert.match(d.getAttribute('aria-label'), /Device voice, not a recorded teacher; Israeli-style only/); dev.unmount();
  const none = await open({ query: { word: BA, level: 'two' }, audio: mkAudio('none') });
  assert.equal(all(none.root, n => n.getAttribute('data-audio') === 'word/r07-w2').length, 0);
  assert.match(none.root.textContent, /No audio yet/); none.unmount();
});

test('empty state: with no traced letters there are no words and the screen says so honestly', async () => {
  const { root, unmount } = await open({ store: mkStore() });
  assert.ok(sel(root, '[data-role=empty]'));
  assert.match(txt(sel(root, '[data-role=summary]')), /0 words/);
  assert.doesNotMatch(root.textContent, /Wiktionary contributors/); // credits live once, on #/credits
  assert.equal(btn(root, 'next-word'), null);
  assert.ok(sel(root, '.notice'), 'draft notice present');
  assert.match(txt(sel(root, '.notice')), /DRAFT/);
  unmount();
});

test('"include letters I have not traced" lists words for any letters', async () => {
  const { root, unmount } = await open({ store: mkStore() });
  const cb = sel(root, '[data-act=any-letters]'); cb.checked = true; cb.dispatch('change', { target: cb });
  assert.equal(sel(root, '[data-role=empty]'), null);
  assert.ok(all(root, n => n.getAttribute('data-word') !== null).length > 0);
  unmount();
});

test('pick screen only offers words made of traced letters', async () => {
  const { root, unmount } = await open({ query: { level: 'two' } });
  const offered = all(root, n => n.getAttribute('data-word') !== null).map(n => n.getAttribute('data-word'));
  assert.ok(offered.includes(BA));
  for (const he of offered) { const w = bank.words.find(x => x.he === he); assert.ok(w.letters.every(id => ['alef', 'bet'].includes(id)), he); }
  unmount();
});

test('trace screen: RTL strip in reading order, one cell per letter, first cell active, others inert', async () => {
  const { root, unmount } = await open({ query: { word: BA, level: 'two' } });
  const st = strip(root);
  assert.equal(st.getAttribute('dir'), 'rtl'); assert.equal(st.getAttribute('lang'), 'he');
  const cs = cells(root);
  assert.equal(cs.length, 2);
  assert.match(cs[0].getAttribute('aria-label'), /Letter 1 of 2: Bet/);
  assert.match(cs[1].getAttribute('aria-label'), /Letter 2 of 2: Alef/);
  assert.equal(cs[0].getAttribute('data-active'), 'true'); assert.equal(cs[1].getAttribute('data-active'), 'false');
  assert.equal(svgOf(cs[0]).style.pointerEvents, 'auto'); assert.equal(svgOf(cs[1]).style.pointerEvents, 'none');
  assert.equal(svgOf(cs[0]).getAttribute('data-guide'), 'solid');
  const target = sel(root, '[data-role=target]'); assert.equal(target.getAttribute('dir'), 'rtl'); assert.equal(target.getAttribute('lang'), 'he'); assert.equal(txt(target), BA);
  assert.ok(btn(root, 'replay') && btn(root, 'hint') && btn(root, 'skip-vowels'));
  unmount();
});

test('real pointer strokes through createTracer advance cell by cell; a clean round fades the guide solid -> dotted -> blank', async () => {
  const { root, unmount } = await open({ query: { word: BA, level: 'two' } });
  const guides = [];
  for (let round = 0; round < 3; round++) {
    const cs = cells(root);
    guides.push(svgOf(cs[0]).getAttribute('data-guide'));
    traceCell(cs[0], 'bet'); assert.equal(cs[0].getAttribute('data-done'), 'true'); assert.equal(cs[1].getAttribute('data-active'), 'true');
    traceCell(cs[1], 'alef');
    assert.ok(sel(root, '[data-role=round-done]'), 'round ' + round);
    if (round < 2) btn(root, 'next-round').click(); else assert.ok(btn(root, 'to-vowels'), 'blank clean round -> vowels');
  }
  assert.deepEqual(guides, ['solid', 'dotted', 'blank']);
  unmount();
});

test('a stroke aimed at an inactive cell is ignored; a wrong stroke is a mistake, not progress', async () => {
  const { root, unmount } = await open({ query: { word: BA, level: 'two' } });
  const cs = cells(root);
  drag(svgOf(cs[1]), byId.alef.print.strokes[0].median);
  assert.equal(cs[1].getAttribute('data-done'), 'false');
  const bad = [[100, 900], [300, 920], [500, 900]];
  drag(svgOf(cs[0]), bad);
  assert.equal(cs[0].getAttribute('data-done'), 'false');
  assert.ok(txt(sel(root, '.feedback')).length > 0);
  unmount();
});

test('repeated wrong strokes make the round "missed": the same guide repeats and the word is added to the retrace list', async () => {
  const store = mkStore(traced('alef', 'bet'));
  const { root, unmount } = await open({ store, query: { word: BA, level: 'two' } });
  const bad = [[100, 900], [300, 920], [500, 900]];
  let cs = cells(root);
  // 4 misses on the first stroke => tracer shows the stroke (forced) and moves on
  for (let i = 0; i < 4; i++) drag(svgOf(cs[0]), bad);
  for (const s of byId.bet.print.strokes.slice(1)) drag(svgOf(cs[0]), s.median);
  assert.equal(cs[0].getAttribute('data-done'), 'true');
  traceCell(cs[1], 'alef');
  assert.match(txt(btn(root, 'next-round')), /same guide/i);
  btn(root, 'skip-vowels') ; // skip tracing rounds -> vowel step (word has vowels)
  const vowels = btn(root, 'to-vowels'); assert.ok(vowels);
  vowels.click();
  assert.ok(sel(root, '[data-role=nq-strip]'));
  btn(root, 'reveal').click(); btn(root, 'finish').click(); await waitFor(() => sel(root, '[data-role=result]'), { message: "result panel" });
  const res = sel(root, '[data-role=result]');
  assert.equal(res.getAttribute('data-rating'), '1');
  assert.ok(store.m['wordtrace.cards']['wordtrace:print:' + BA], 'SRS card created for the missed word');
  assert.ok(sel(root, '[data-role=srs]'));
  assert.equal(store.m['wordtrace.progress'].print[BA].missed, 1);
  unmount();
});

test('step ("show me") mode: buttons alone complete the round, it is flagged assisted, and the guide does not advance', async () => {
  const { root, unmount } = await open({ query: { word: BA, level: 'two', mode: 'step' } });
  assert.ok(btn(root, 'step'));
  const need = byId.bet.print.strokes.length + byId.alef.print.strokes.length;
  for (let i = 0; i < need; i++) btn(root, 'step').click();
  assert.ok(sel(root, '[data-role=round-done]'));
  assert.equal(cells(root).filter(c => c.getAttribute('data-done') === 'true').length, 2);
  assert.match(txt(btn(root, 'next-round')), /same guide/i);
  assert.match(txt(sel(root, '.feedback')), /stroke buttons/);
  unmount();
});

test('niqqud step: tray + tap places marks, check scores per cell, wrong cell is flagged with what was expected', async () => {
  const store = mkStore(traced('alef', 'bet'));
  const { root, unmount } = await open({ store, query: { word: BA, level: 'two' } });
  btn(root, 'skip-vowels').click();
  const nq = sel(root, '[data-role=nq-strip]'); assert.ok(nq); assert.equal(nq.getAttribute('dir'), 'rtl');
  const tray = all(root, n => n.getAttribute('data-mark') !== null).map(n => n.getAttribute('data-mark'));
  assert.ok(tray.includes('kamatz') && tray.includes('dagesh'));
  // tap a cell before choosing a mark -> a prompt, nothing placed
  sel(root, '.nq-cell[data-index="0"]').click();
  assert.match(txt(sel(root, '.feedback')), /Choose a mark/);
  // wrong: patach on bet; kamatz on alef
  const pick = (m) => sel(root, `[data-mark=${m}]`).click();
  const cell = (i) => sel(root, `.nq-cell[data-index="${i}"]`);
  const patachInTray = tray.includes('patach');
  if (patachInTray) { pick('patach'); cell(0).click(); }
  pick('kamatz'); cell(1).click();
  btn(root, 'check').click();
  assert.ok(sel(root, '[data-role=nq-detail]'), 'wrong cells are listed in text, not only by colour');
  assert.equal(cell(0).getAttribute('data-state'), 'bad'); assert.equal(cell(1).getAttribute('data-state'), 'bad');
  assert.match(cell(0).getAttribute('aria-label'), /expected/);
  // fix: clear and place correctly (kamatz + dagesh on bet), check again, then finish
  btn(root, 'clear').click();
  cell(0).click(); /* kamatz is still the selected mark */ pick('dagesh'); cell(0).click();
  btn(root, 'check').click();
  assert.match(txt(sel(root, '.feedback')), /All the vowel marks are right/);
  btn(root, 'finish').click(); await waitFor(() => sel(root, '[data-role=result]'), { message: "result panel" });
  // first check was imperfect, so the word is not a clean 3 even though the retry was right; skipping tracing also caps it at 2
  assert.equal(sel(root, '[data-role=result]').getAttribute('data-rating'), '1');
  unmount();
});

test('sofit: a word ending in a final letter labels that cell and explains the rule', async () => {
  const { root, unmount } = await open({ store: mkStore(traced('shin', 'lamed', 'vav', 'mem')), query: { word: SHALOM, level: 'prayer' } });
  const cs = cells(root);
  assert.equal(cs.length, 4);
  assert.match(cs[3].getAttribute('aria-label'), /Final Mem, final form/);
  assert.ok(sel(root, '[data-role=sofit]'));
  assert.equal(strip(root).getAttribute('style').includes('repeat(2'), true, '4 letters use a 2x2 grid on a phone');
  unmount();
});

test('cursive: shows the honest "joins not modelled" note and traces cursive stroke data; print does not show it', async () => {
  const c = await open({ script: 'cursive', query: { word: BA, level: 'two', script: 'cursive' } });
  const note = sel(c.root, '[data-note=joins]');
  assert.ok(note); assert.match(txt(note), /NOT modelled/); assert.match(txt(note), /ktav yad/);
  assert.equal(svgOf(cells(c.root)[0]).getAttribute('aria-label'), 'Tracing area for Bet');
  traceCell(cells(c.root)[0], 'bet', 'cursive'); assert.equal(cells(c.root)[0].getAttribute('data-done'), 'true');
  c.unmount();
  const p = await open({ query: { word: BA, level: 'two' } });
  assert.equal(sel(p.root, '[data-note=joins]'), null);
  p.unmount();
});

test('a due retrace word is offered first; unknown ?word falls back to the pick screen; unmount empties the root', async () => {
  const id = 'wordtrace:print:' + BA;
  const store = mkStore({ ...traced('alef', 'bet'), 'wordtrace.cards': { [id]: { id, kind: 'wordtrace', state: 'relearning', stability: 0.1, difficulty: 5, reps: 1, lapses: 1, lastReview: 0, due: 1 } } });
  const a = await open({ store, query: { level: 'two' } });
  const first = all(a.root, n => n.getAttribute('data-word') !== null)[0];
  assert.equal(first.getAttribute('data-word'), BA);
  assert.match(txt(sel(a.root, '[data-role=summary]')), /to retrace today/);
  a.unmount(); assert.equal(a.root.childNodes.length, 0);
  const b = await open({ query: { word: 'nope', level: 'two' } });
  assert.ok(sel(b.root, '[data-role=summary]')); b.unmount();
});

test('load failure shows an alert, not a blank screen', async () => {
  const root = newRoot(doc);
  const unmount = mount(root, { t: k => k, letters: null, wordtrace: Promise.reject(new Error('nope')) });
  await waitFor(() => sel(root, '[role=alert]') || all(root, n => n.getAttribute('role') === 'alert').length, { message: "load-failure alert" });
  assert.ok(sel(root, '[role=alert]') || all(root, n => n.getAttribute('role') === 'alert').length);
  unmount();
});
