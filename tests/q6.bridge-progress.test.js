// Q6, reading ladder progression: stage progress, what opens the next stage, the record of what was done, and the stage line on
// reading screens. Model on plain state, view on a minimal fake DOM (logic only: not layout or real-browser behaviour).
import test from 'node:test';
import assert from 'node:assert/strict';

const B = await import('../src/bridge/model.js');
const P = await import('../src/bridge/progress.js');

/** A state in which `n` texts were each read without help `times` times at their own level, starting from stage 4. */
function reads(n, times, base = B.normalizeState(null), now = 1000, prefix = 'book:b') {
  let st = base;
  for (let i = 0; i < n; i++) for (let k = 0; k < times; k++) { const id = `${prefix}${i}`; st = P.stampStages(B.recordText(st, id, B.levelOf(st, id), true, now).state, now).state; }
  return st;
}

test('a new learner is on stage 4, with stages 5 and 6 closed and nothing in the record', () => {
  const p = P.ladderProgress(B.normalizeState(null));
  assert.equal(p.current, 4); assert.equal(p.complete, false);
  assert.deepEqual(p.stages.map((s) => [s.level, s.open, s.passed, s.reads, s.need]), [[4, true, false, 0, 5], [5, false, false, 0, 5], [6, false, false, 0, 5]]);
  assert.deepEqual(P.proof(B.normalizeState(null)), []);
  assert.match(P.chipText(B.normalizeState(null)), /^Reading ladder: stage 4 of 6, Vowel marks off\. 0 of 5 texts read without help\.$/);
});

test('five different texts read without help at a stage open the next one; four do not; one text read five times does not', () => {
  const four = reads(4, 1);
  assert.deepEqual([P.ladderProgress(four).current, P.ladderProgress(four).stages[0].reads, P.ladderProgress(four).stages[1].open], [4, 4, false]);
  let same = B.normalizeState(null);
  for (let k = 0; k < 5; k++) same = P.stampStages(B.recordText(same, 'book:x', 4, true, 5).state, 5).state; // only the first read is at its saved stage
  assert.equal(P.ladderProgress(same).stages[0].reads, 1);
  const five = reads(5, 1, B.normalizeState(null), 1_800_000_000_000);
  const p = P.ladderProgress(five);
  assert.deepEqual([p.current, p.stages[0].passed, p.stages[0].passedAt, p.stages[1].open, p.stages[2].open], [5, true, 1_800_000_000_000, true, false]);
  assert.match(P.chipText(five), /stage 5 of 6, Transliteration off\. 0 of 5/);
});

test('a read with help does not count, and sends that text back a stage without taking back a passed stage', () => {
  let st = reads(5, 1, B.normalizeState(null), 77);
  assert.equal(P.ladderProgress(st).stages[0].passed, true);
  for (let i = 0; i < 5; i++) st = P.stampStages(B.recordText(st, `book:b${i}`, 5, false, 99).state, 99).state; // every text slips back to 4
  assert.equal(P.textsPast(st, 4).length, 0);
  const p = P.ladderProgress(st);
  assert.deepEqual([p.stages[0].passed, p.stages[0].passedAt, p.current, p.stages[1].open], [true, 77, 5, true], 'what was earned stays earned, with its day');
});

test('the ladder is climbed in order, and finishing stage 6 completes it', () => {
  // five texts taken all the way: 4 -> 5 -> 6 -> done
  const st = reads(5, 3, B.normalizeState(null), 1_800_000_000_000);
  const p = P.ladderProgress(st);
  assert.equal(p.complete, true); assert.equal(p.current, 6); assert.ok(p.completeAt > 0);
  assert.match(P.chipText(st), /all three reading stages done/);
  const rec = P.proof(st, (id) => `Text ${id}`);
  assert.deepEqual(rec.map((r) => r.level), [4, 5, 6]);
  assert.match(rec[2].line, /^Stage 6, Both off: 5 texts read without help\. Passed on /);
  assert.deepEqual(rec[0].texts.slice(0, 2), ['Text book:b0', 'Text book:b1']);
  // an old record with texts far along but no dates still counts in order, and gets its dates on the next save
  const old = B.normalizeState({ texts: Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`line:l${i}`, { level: 6, done: true, tries: 3, unaided: 3 }])) });
  assert.equal(P.ladderProgress(old).complete, true);
  const stamped = P.stampStages(old, 42);
  assert.deepEqual(stamped.opened, [4, 5, 6]); assert.deepEqual(stamped.state.stages, { 4: 42, 5: 42, 6: 42 });
  assert.deepEqual(P.stampStages(stamped.state, 43).opened, [], 'a stage is stamped once');
});

test('a closed stage cannot be chosen, but a text is never locked out of its own saved stage', () => {
  const st = reads(1, 1); // one text now at stage 5; the learner is still on stage 4
  assert.equal(P.stageOpen(st, 4, 'book:new'), true);
  assert.equal(P.stageOpen(st, 5, 'book:new'), false);
  assert.equal(P.stageOpen(st, 5, 'book:b0'), true, 'its own level is 5');
  assert.equal(P.stageOpen(st, 6, 'book:b0'), false);
  assert.equal(P.lockedReason(st, 5, 'book:new'), 'Opens after 4 more texts read without help at stage 4, Vowel marks off.');
  assert.equal(P.lockedReason(st, 4, 'book:new'), '');
  assert.match(P.lockedReason(st, 6, 'book:new'), /stage 4/);
});

test('saved state keeps the stage dates through storage, and drops junk', () => {
  const st = reads(5, 1, B.normalizeState(null), 123456);
  assert.deepEqual(B.normalizeState(JSON.parse(JSON.stringify(st))), st);
  assert.deepEqual(B.normalizeState({ stages: { 4: -1, 5: 'x', 6: 9.7, 9: 5 } }).stages, { 6: 9 });
  assert.deepEqual(P.recallCounts({ 'line:a': { fadeLevel: 3 }, 'line:b': { fadeLevel: 1 }, 'word:c': { fadeLevel: 3 }, 'line:d': {} }), [2, 2, 1, 1]);
});

// ---- the screens --------------------------------------------------------------------------------------------------
class N {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.className = ''; this.style = {}; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { this.children.push(...c.flat().filter((x) => x != null).map((x) => (typeof x === 'object' ? x : { nodeType: 3, data: String(x) }))); }
  replaceChildren(...c) { this.children = []; this.append(...c); }
  remove() {}
  focus() {}
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v) }]; }
  get textContent() { return this.text; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(''); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  click() { for (const f of this.listeners.click || []) f({ preventDefault() {} }); if (this.onclick) this.onclick({ preventDefault() {} }); }
}
globalThis.document = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }), head: new N('head'), getElementById: () => null };
const flush = () => new Promise((r) => setTimeout(r, 0));
const waitFor = async (f) => { for (let i = 0; i < 200; i++) { const v = f(); if (v) return v; await flush(); } throw new Error('timed out'); };
function fakeCtx(saved, query = {}) {
  const data = new Map(Object.entries(saved));
  return { query, store: { get: async (k) => data.get(k) ?? null, set: async (k, v) => { data.set(k, v); } }, data,
    bridgeLoad: async (rel) => {
      if (rel === 'data/books/index.json') return { books: [{ id: 'b0', titleEn: 'The Red Door', pageCount: 2, level: 1 }, { id: 'b9', titleEn: 'Ninth', pageCount: 2, level: 1 }] };
      if (rel === 'data/corpus/registry.json') return { entries: [] };
      if (/^data\/books\//.test(rel)) return { id: rel.slice(11, -5), titleEn: 'A Book', pages: [{ he: 'שָׁלוֹם', translit: 'shalom', en: 'peace' }, { he: 'בַּיִת', translit: 'bayit', en: 'house' }] };
      return {};
    } };
}

test('hub: shows the stage, the rule, each stage with its state, and the record once a stage is passed', async () => {
  const V = await import('../src/bridge/bridge.view.js');
  const root = new N('div');
  V.mount(root, fakeCtx({ 'bridge.v1': reads(5, 1, B.normalizeState(null), 1_800_000_000_000) }));
  await waitFor(() => root.find((n) => n.attrs.id === 'br-stage-line').length);
  assert.match(root.text, /Reading ladder: stage 5 of 6, Transliteration off\. 0 of 5 texts read without help\./);
  assert.match(root.text, /Read 5 different texts at a stage without help and the next stage opens/);
  assert.deepEqual(root.find((n) => n.attrs['data-stage-row']).map((n) => n.attrs['data-state']), ['done', 'open', 'closed']);
  assert.match(root.find((n) => n.attrs.id === 'br-proof')[0].text, /Stage 4, Vowel marks off: 5 texts read without help\. Passed on .*Book: The Red Door/s);
  assert.match(root.text, /your own marks: the app does not hear you read/);
  assert.equal(root.find((n) => n.attrs['aria-current'] === 'step')[0].attrs['data-stage'], '5');
  // a new learner: nothing passed, no record shown
  const fresh = new N('div');
  V.mount(fresh, fakeCtx({}));
  await waitFor(() => fresh.find((n) => n.attrs.id === 'br-stage-line').length);
  assert.equal(fresh.find((n) => n.attrs.id === 'br-proof').length, 0);
  assert.deepEqual(fresh.find((n) => n.attrs['data-stage-row']).map((n) => n.attrs['data-state']), ['open', 'closed', 'closed']);
});

test('a text page: closed stages say why instead of opening; the fifth read without help opens the next stage and says so', async () => {
  const V = await import('../src/bridge/bridge.view.js');
  const ctx = fakeCtx({ 'bridge.v1': reads(4, 1) }, { sec: 'book', id: 'b9' });
  const root = new N('div');
  V.mount(root, ctx);
  await waitFor(() => root.find((n) => n.attrs.id === 'br-read').length);
  const locked = root.find((n) => n.attrs['data-locked']);
  assert.deepEqual(locked.map((n) => n.attrs['data-locked']), ['5', '6']);
  locked[0].click();
  assert.match(root.text, /Opens after 1 more text read without help at stage 4, Vowel marks off\./);
  assert.match(root.find((n) => n.attrs.id === 'br-chip')[0].text, /stage 4 of 6.*4 of 5 texts/);
  root.find((n) => n.attrs.id === 'br-read')[0].click();
  await waitFor(() => /You have passed stage 4: stage 5 is now open for every text\./.test(root.text));
  const saved = ctx.data.get('bridge.v1');
  assert.ok(saved.stages[4] > 0); assert.equal(saved.texts['book:b9'].level, 5);
  assert.deepEqual(root.find((n) => n.attrs['data-locked']).map((n) => n.attrs['data-locked']), ['6'], 'stage 5 can now be chosen');
});

test('the stage line can be added to any reading screen, links to the ladder, and never breaks the screen', async () => {
  const C = await import('../src/bridge/chip.js');
  const root = new N('div');
  const node = await C.attachChip(root, fakeCtx({ 'bridge.v1': reads(5, 1) }));
  assert.equal(root.children.at(-1), node);
  assert.match(node.text, /^Reading ladder: stage 5 of 6, Transliteration off\. 0 of 5 texts read without help\. Reading ladder$/);
  assert.equal(node.find((n) => n.tag === 'a')[0].attrs.href, '#/bridge');
  assert.equal(await C.attachChip(null, fakeCtx({})), null);
  const broken = await C.attachChip(new N('div'), { store: { get: async () => { throw new Error('no store'); } } });
  assert.ok(broken === null || /stage 4 of 6/.test(broken.text), 'a store that cannot be read gives the starting stage or no line, never an error');
  // every reading screen asks for it, and only on demand
  const { readFileSync } = await import('node:fs');
  for (const f of ['books/book.view.js', 'corpus/read.view.js', 'readlab/readlab.view.js', 'torahreader/torahreader.view.js', 'nikkudfade/nikkudfade.view.js', 'shell/read-hub.view.js']) {
    assert.match(readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8'), /import\('\.\.\/bridge\/chip\.js'\)\.then\(\(m\) => m\.attachChip\(root, ctx\)\)/, f);
  }
});

test('copy: plain words, nothing that reads as machine-made, and the self-graded line is always there', () => {
  const st = reads(5, 3);
  const all = [P.SELF_GRADED, P.chipText(st), P.chipText(B.normalizeState(null)), P.lockedReason(reads(1, 1), 5, 'x'), ...P.proof(st).map((r) => r.line)].join(' ');
  assert.doesNotMatch(all, /\b(AI|model|algorithm|neural|unlock(ed)? achievement)\b/i);
  assert.match(P.SELF_GRADED, /does not hear you/);
});
