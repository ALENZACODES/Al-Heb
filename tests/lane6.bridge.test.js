// Lane 6 (12 Nov 2026, round 2): unvocalized bridge, points plan #16. Model on the real data, and the view on a minimal fake DOM
// (logic only: not real-browser rendering, layout or accessibility).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const json = (rel) => JSON.parse(readFileSync(new URL(rel, root), 'utf8'));
const B = await import('../src/bridge/model.js');
const { FADE_LEVELS } = await import('../src/curriculum/fade.js');
const { findName } = await import('../src/shell/names.js');
const shelf = json('data/books/index.json');
const readingSet = json('data/nikkudfade/reading-set.json');
const signs = json('data/camera/sign-glossary.json');
const scenarios = json('data/israel/scenarios.json');
const registry = json('data/corpus/registry.json');
const rawName = (s) => findName(String(s)).some((w) => w.kind !== 'abbrev');

test('ladder: the four Fade-Out stages, then vowel marks off, transliteration off, both off', () => {
  assert.deepEqual(B.LADDER.map((s) => s.level), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(B.LADDER.slice(0, 4).map((s) => s.name), FADE_LEVELS.map((l) => l.name));
  assert.deepEqual(B.BRIDGE_STAGES.map((s) => s.id), ['vowels-off', 'translit-off', 'both-off']);
  assert.deepEqual(B.BRIDGE_STAGES.map((s) => [s.vowels, s.translit]), [[false, true], [true, false], [false, false]]);
});

test('present: marks come off in code only; transliteration follows the stage; nothing is added', () => {
  const page = json('data/books/book1.json').pages[1];
  const s4 = B.present(4, page), s5 = B.present(5, page), s6 = B.present(6, page);
  assert.equal(s4.he, B.stripPoints(page.he)); assert.equal(s4.translit, page.translit);
  assert.equal(s5.he, page.he); assert.equal(s5.translit, null);
  assert.equal(s6.he, B.stripPoints(page.he)); assert.equal(s6.translit, null);
  assert.equal(s4.pointed, page.he);
  assert.ok(!/[֑-ׇֽֿׁׂׅׄ]/.test(s6.he));
  // every book page at every stage: the shown text is the page text, unchanged or with only marks removed
  for (const b of shelf.books) for (const p of json(`data/books/${b.id}.json`).pages) for (const lv of [4, 5, 6]) {
    const x = B.present(lv, p);
    assert.equal(B.stripPoints(x.he), B.stripPoints(B.showName(p.he)), `${b.id} p${p.n}`);
    assert.ok(!rawName(x.he), `${b.id} p${p.n}: the four-letter name is shown as ה׳`);
  }
});

test('the divine name is shown as ה׳ at every stage', () => {
  const line = registry.entries.find((e) => e.id === 'shema-1');
  for (const lv of [4, 5, 6]) { const x = B.present(lv, { he: line.he, translit: '' }); assert.ok(x.he.includes('ה׳')); assert.ok(!rawName(x.he)); }
});

test('per-text level: only a read at the saved stage moves it; 6 read unaided finishes the text; never below 4', () => {
  assert.deepEqual(B.nextBridgeLevel(4, 4, true), { level: 5, moved: true, finished: false });
  assert.deepEqual(B.nextBridgeLevel(5, 4, true), { level: 5, moved: false, finished: false });
  assert.deepEqual(B.nextBridgeLevel(4, 4, false), { level: 4, moved: false, finished: false });
  assert.deepEqual(B.nextBridgeLevel(6, 6, false), { level: 5, moved: true, finished: false });
  assert.deepEqual(B.nextBridgeLevel(6, 6, true), { level: 6, moved: false, finished: true });
  let st = B.normalizeState(null);
  st = B.recordText(st, 'book:book1', 4, true, 10).state;
  st = B.recordText(st, 'book:book2', 4, false, 11).state;
  assert.equal(B.levelOf(st, 'book:book1'), 5); assert.equal(B.levelOf(st, 'book:book2'), 4); assert.equal(B.levelOf(st, 'line:x'), 4);
  st = B.recordText(B.recordText(st, 'book:book1', 5, true, 12).state, 'book:book1', 6, true, 13).state;
  assert.equal(B.isDone(st, 'book:book1'), true); assert.equal(st.texts['book:book1'].doneAt, 13); assert.equal(st.texts['book:book1'].unaided, 3);
  const back = B.normalizeState(JSON.parse(JSON.stringify(st)));
  assert.deepEqual(back, st);
  assert.deepEqual(B.normalizeState({ texts: { a: { level: 9 }, b: 'x' }, words: { w: { seen: 2, firstTry: 5 } } }), { v: 1, texts: { a: { level: 4, done: false, doneAt: 0, tries: 0, unaided: 0 } }, words: { w: { seen: 2, firstTry: 2 } }, modern: {} });
});

test('book shelf: books read with vowels come first (finished, then started), then the rest in shelf order; all 63 listed', () => {
  const { shelfOrder } = { shelfOrder: (b) => b };
  const rec = { book7: { lastPage: 3 }, book2: { lastPage: 11, reachedEndAt: 5, finishedAt: 6 }, book9: { lastPage: 2, finishedAt: 9 } };
  const rows = B.bookShelf(shelfOrder(shelf.books), rec, B.normalizeState(null));
  assert.equal(rows.length, 63);
  assert.deepEqual(rows.slice(0, 3).map((r) => r.id), ['book9', 'book2', 'book7']);
  assert.deepEqual(rows.slice(0, 3).map((r) => r.readWithVowels), ['finished', 'finished', 'started']);
  assert.ok(rows.slice(3).every((r) => r.readWithVowels === null));
  assert.equal(new Set(rows.map((r) => r.id)).size, 63);
});

test('prayer lines: the Fade-out lines, the ones with a Fade-out card first', () => {
  const rows = B.prayerLines(registry.entries, { 'line:shema-1': { fadeLevel: 2 }, 'line:hamotzi': { fadeLevel: 3 } });
  assert.ok(rows.length >= 20);
  assert.deepEqual(rows.slice(0, 2).map((r) => r.id), ['hamotzi', 'shema-1']);
  for (const r of rows) assert.equal(registry.entries.find((e) => e.id === r.id).he, r.he);
});

test('word drill: no look-alikes, unique unpointed spellings, one right meaning, first-try scoring', () => {
  const words = B.drillWords(readingSet);
  assert.ok(words.length >= 100, `${words.length} words`);
  const spell = new Map(); for (const i of readingSet.items) spell.set(B.stripPoints(i.he), (spell.get(B.stripPoints(i.he)) || 0) + 1);
  for (const w of words) { assert.equal(w.ambiguous, false); assert.equal(spell.get(B.stripPoints(w.he)), 1, w.id); }
  const q = B.wordQuestion(words[0], words, 3);
  assert.equal(q.shown, B.stripPoints(words[0].he)); assert.equal(q.pointed, words[0].he);
  assert.equal(q.options.filter((o) => o.correct).length, 1); assert.equal(new Set(q.options.map((o) => o.label)).size, 4);
  let st = B.normalizeState(null);
  st = B.recordWord(st, 'a', true); st = B.recordWord(st, 'a', false); st = B.recordWord(st, 'b', true);
  assert.deepEqual(B.wordSummary(st), { words: 2, seen: 3, firstTry: 2, rate: 67 });
  const pick = B.pickWords(words, st, { size: 8, seed: 5 });
  assert.equal(pick.length, 8); assert.deepEqual(B.pickWords(words, st, { size: 8, seed: 5 }), pick);
});

test('modern shelf: signs as spelled on the sign, messages with marks removed in code, nothing invented, no divine name', () => {
  const items = B.modernShelf({ signs, scenarios });
  const s = items.filter((i) => i.kind === 'sign'), m = items.filter((i) => i.kind === 'message');
  assert.ok(s.length >= 100 && m.length >= 20, `${s.length} signs, ${m.length} messages`);
  for (const i of s) { const e = signs.entries.find((x) => x.he === i.shown); assert.ok(e && e.pointed === i.pointed, i.id); assert.equal(i.spelling, 'as-written'); }
  const lines = scenarios.scenarios.flatMap((x) => [x.other, ...(x.options || [])]).filter(Boolean).map((l) => l.he);
  for (const i of m) { assert.ok(lines.includes(i.pointed), i.id); assert.equal(i.shown, B.stripPoints(i.pointed)); assert.equal(i.spelling, 'marks-removed'); }
  assert.ok(items.every((i) => !rawName(i.pointed)));
  assert.equal(new Set(items.map((i) => i.id)).size, items.length);
  const st = B.recordModern(B.recordModern(B.normalizeState(null), s[0].id, true), s[0].id, false);
  assert.deepEqual(st.modern[s[0].id], { seen: 2, firstTry: 1 });
});

test('copy: Title Case title, no outside-tool wording, the spelling caveat is said', async () => {
  const V = await import('../src/bridge/bridge.view.js');
  assert.equal(V.TITLE, 'Reading Without Vowels');
  const src = readFileSync(new URL('src/bridge/bridge.view.js', root), 'utf8') + readFileSync(new URL('src/bridge/model.js', root), 'utf8');
  assert.ok(!new RegExp('\\b(' + ['AI','G'+'PT','Cla'+'ude','L'+'LM','machine learning'].join('|') + ')\\b').test(src));
  assert.match(B.SPELLING_NOTE, /does not add letters/);
});

// ---------- view on a minimal fake DOM ----------
class N {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.className = ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); } removeAttribute(k) { delete this.attrs[k]; } getAttribute(k) { return this.attrs[k] ?? null; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { this.children.push(...c); }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v) }]; }
  get textContent() { return this.text; }
  remove() {} focus() {}
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(''); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  async click() { for (const f of this.listeners.click || []) await f({ target: this }); }
}
globalThis.document = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }) };
const flush = () => new Promise((r) => setTimeout(r, 0));
const waitFor = async (f) => { for (let i = 0; i < 300; i++) { const v = f(); if (v) return v; await flush(); } throw new Error('timeout'); };
const find = (r, pred) => r.find(pred)[0];
const byText = (r, t) => find(r, (n) => n.tag === 'button' && n.text === t);
const load = async (rel) => json(rel);
const mkCtx = (query, m = {}) => ({ query, store: { get: (k) => m[k], set: (k, v) => { m[k] = v; } }, bridgeLoad: load, settings: { get: () => 'sephardi' } });

test('view: hub lists the ladder and the four shelves', async () => {
  const { mount } = await import('../src/bridge/bridge.view.js');
  const r = new N('div'); const un = mount(r, mkCtx({}));
  await waitFor(() => /Modern texts shelf/.test(r.text));
  for (const h of ['#/bridge/books', '#/bridge/lines', '#/bridge/words', '#/bridge/modern']) assert.ok(find(r, (n) => n.attrs.href === h), h);
  assert.match(r.text, /Vowel marks off/); assert.match(r.text, /Both off/); assert.match(r.text, /Draft/);
  un();
});

test('view: a book read unaided at its saved stage moves to the next stage; help makes it a read with help', async () => {
  const { mount } = await import('../src/bridge/bridge.view.js');
  const m = {};
  let r = new N('div'); let un = mount(r, mkCtx({ sec: 'book', id: 'book1' }, m));
  await waitFor(() => byText(r, 'I read it all'));
  const book1 = json('data/books/book1.json');
  assert.ok(r.text.includes(B.stripPoints(book1.pages[0].he)), 'stage 4 shows the page without marks');
  assert.ok(r.text.includes(book1.pages[0].translit), 'stage 4 keeps the transliteration');
  await byText(r, 'I read it all').click(); await flush();
  assert.equal(m['bridge.v1'].texts['book:book1'].level, 5);
  un();
  r = new N('div'); un = mount(r, mkCtx({ sec: 'book', id: 'book1' }, m));
  await waitFor(() => byText(r, 'I read it all'));
  assert.ok(!r.text.includes(book1.pages[0].translit), 'stage 5 hides the transliteration');
  await find(r, (n) => n.tag === 'button' && n.text === 'Show transliteration').click();
  assert.ok(r.text.includes(book1.pages[0].translit));
  await byText(r, 'I read it all').click(); await flush();
  assert.equal(m['bridge.v1'].texts['book:book1'].level, 4, 'help shown: a read with help goes back one stage');
  un();
});

test('view: books shelf puts a book read with vowels first', async () => {
  const { mount } = await import('../src/bridge/bridge.view.js');
  const r = new N('div'); const un = mount(r, mkCtx({ sec: 'books' }, { 'books.v1': { book30: { lastPage: 4, finishedAt: 7 } } }));
  await waitFor(() => find(r, (n) => n.attrs['data-book']));
  assert.equal(find(r, (n) => n.attrs['data-book']).attrs['data-book'], 'book30');
  assert.match(r.text, /You have read 1 of 63 books with vowels/);
  un();
});

test('view: word drill scores first try, and opening the vowelled form is not a first try', async () => {
  const { mount } = await import('../src/bridge/bridge.view.js');
  const m = {};
  const r = new N('div'); const un = mount(r, mkCtx({ sec: 'words' }, m));
  await waitFor(() => find(r, (n) => n.attrs['data-option']));
  const words = B.drillWords(readingSet);
  const answer = async () => {
    const shown = find(r, (n) => n.attrs.lang === 'he').text;
    const w = words.find((x) => B.stripPoints(x.he) === shown || x.he === shown);
    await find(r, (n) => n.attrs['data-option'] === w.id).click(); await flush();
    return w;
  };
  const w1 = await answer();
  assert.deepEqual(m['bridge.v1'].words[w1.id], { seen: 1, firstTry: 1 });
  await find(r, (n) => n.attrs.id === 'br-next').click(); await flush();
  await find(r, (n) => n.attrs.id === 'br-reveal').click();
  const w2 = await answer();
  assert.deepEqual(m['bridge.v1'].words[w2.id], { seen: 1, firstTry: 0 });
  un();
});

test('view: modern shelf shows a sign without marks, help one tap away, and saves a read', async () => {
  const { mount } = await import('../src/bridge/bridge.view.js');
  const m = {};
  const r = new N('div'); const un = mount(r, mkCtx({ sec: 'modern' }, m));
  await waitFor(() => find(r, (n) => n.attrs['data-id']));
  const first = find(r, (n) => n.attrs['data-id']);
  await first.click();
  const it = B.modernShelf({ signs, scenarios }).find((i) => i.id === first.attrs['data-id']);
  assert.ok(byText(r, 'Show vowel marks') && byText(r, 'Show transliteration'));
  await byText(r, 'I read it').click(); await flush();
  assert.deepEqual(m['bridge.v1'].modern[it.id], { seen: 1, firstTry: 1 });
  await byText(r, 'Messages').click();
  await find(r, (n) => n.attrs['data-id']?.startsWith('msg:')).click();
  assert.match(r.text, /does not add letters/);
  un();
});

test('view: a prayer line opens at stage 4 with the name shown as ה׳; Fade-out link for stages 0 to 3', async () => {
  const { mount } = await import('../src/bridge/bridge.view.js');
  const r = new N('div'); const un = mount(r, mkCtx({ sec: 'line', id: 'shema-1' }));
  await waitFor(() => byText(r, 'I read it all'));
  assert.ok(r.text.includes('ה׳') && !rawName(r.text));
  assert.ok(find(r, (n) => n.attrs.href === '#/learn?fade=shema-1'));
  un();
});
