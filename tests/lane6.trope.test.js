// Lane 6 (12 Nov 2026, round 2): trope families and per-aliyah practice, points plan #13 (code parts). Model on the real data,
// view on a minimal fake DOM (logic only: not real-browser rendering, layout or accessibility).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const json = (rel) => JSON.parse(readFileSync(new URL(rel, root), 'utf8'));
const F = await import('../src/trope/families.js');
const { findName } = await import('../src/shell/names.js');
const table = json('data/corpus/trope/table.json');
const index = json('data/corpus/torah/index.json');
const chapter = (b, c) => json(`data/corpus/torah/${b}/${String(c).padStart(2, '0')}.json`);
const rawName = (s) => findName(String(s)).some((w) => w.kind !== 'abbrev');

test('families: every disjunctive and conjunctive sign of the table is taught once, in the table’s strength groups', () => {
  const fams = F.families(table);
  assert.deepEqual(fams.map((f) => f.id), ['level-1', 'level-2', 'level-3', 'level-4', 'servants']);
  const taught = fams.flatMap((f) => f.signs.map((s) => s.id));
  const want = table.prose.filter((r) => r.cls === 'disjunctive' || r.cls === 'conjunctive').map((r) => r.id);
  assert.deepEqual([...taught].sort(), [...want].sort());
  assert.equal(new Set(taught).size, taught.length);
  for (const f of fams.slice(0, 4)) assert.ok(f.signs.every((s) => s.cls === 'disjunctive' && s.level === Number(f.id.slice(-1))));
  assert.ok(fams[4].signs.every((s) => s.cls === 'conjunctive'));
  assert.equal(F.TROPE_NOTE, 'Trope names from the app’s table; not reviewed.');
  assert.equal(F.NO_MELODY, 'melody audio not recorded yet');
});

test('verse tokens: marks read from the verse’s own code points; siluk on the last word; munach + paseq is legarmeh', () => {
  const g = chapter('genesis', 1);
  const t = F.verseTokens(g.verses[0].heTrope, table);
  assert.deepEqual(t.map((x) => x.marks), [['tipcha'], ['munach'], ['etnachta'], ['mercha'], ['tipcha'], ['mercha'], ['siluk']]);
  assert.deepEqual(F.phrases(t).map((p) => p.length), [1, 2, 2, 2]);
  const d = F.verseTokens(chapter('deuteronomy', 6).verses[3].heTrope, table);
  assert.ok(d.some((x) => x.text.includes('׀')), 'the paseq stays with its word');
  assert.ok(!d.some((x) => x.marks.includes('legarmeh')), 'mercha + paseq is not legarmeh');
  assert.ok(d.find((x) => x.name), 'the four-letter name is flagged');
  const leg = F.verseTokens(chapter('genesis', 1).verses[20].heTrope, table); // Genesis 1:21, the first legarmeh in the text
  assert.ok(leg.some((x) => x.marks.includes('legarmeh')));
});

test('phrases end only at a stopping mark or at the verse end, across a whole chapter', () => {
  const byId = F.rowsById(table);
  for (const v of chapter('genesis', 24).verses) {
    const ps = F.phrases(F.verseTokens(v.heTrope, table));
    assert.equal(ps.flat().length, v.heTrope.split(/\s+/).filter((w) => w !== '׀').length);
    ps.forEach((p, i) => { const last = p[p.length - 1]; assert.ok(i === ps.length - 1 || last.marks.some((id) => byId.get(id).cls === 'disjunctive'), `24:${v.n}`); });
  }
});

test('examples come from real verses, skip the divine name, and cap at max', () => {
  const ids = F.families(table).flatMap((f) => f.signs.map((s) => s.id));
  const ex = F.collectExamples([chapter('genesis', 1), chapter('genesis', 2)], table, ids, 3);
  assert.ok(ex.get('tipcha').length === 3 && ex.get('siluk').length === 3);
  for (const [, list] of ex) for (const e of list) {
    const v = chapter(e.book, e.chapter).verses.find((x) => x.n === e.verse);
    assert.ok(v.heTrope.includes(e.text), e.ref); assert.ok(!rawName(e.text));
  }
  assert.equal(ex.get('shalshelet'), undefined, 'no invented example');
  const sh = F.collectExamples([chapter('genesis', 19)], table, ['shalshelet'], 3);
  assert.equal(sh.get('shalshelet')[0].ref, 'Genesis 19:16');
});

test('practice units: aliyot from the index, verse ranges and phrase steps', () => {
  const bereshit = index.parshiyot.find((p) => p.id === 'bereshit');
  const units = F.practiceUnits(index, bereshit);
  assert.equal(units.length, 7); assert.equal(units[0].label, 'Aliyah 1');
  const vs = F.versesInRange(index, units[0].from, units[0].to);
  assert.equal(vs.length, 34); assert.deepEqual(vs[0], { book: 'genesis', chapter: 1, verse: 1 }); assert.deepEqual(vs.at(-1), { book: 'genesis', chapter: 2, verse: 3 });
  const g1 = chapter('genesis', 1), g2 = chapter('genesis', 2);
  const text = (b, c, v) => (c === 1 ? g1 : g2).verses.find((x) => x.n === v)?.heTrope;
  const steps = F.phraseSteps(vs, text, table);
  assert.ok(steps.length > 34);
  assert.deepEqual([steps[0].verse, steps[0].n, steps[0].of], [1, 0, 4]);
  // without aliyot the portion falls back to chapters
  const noAliyot = { ...bereshit, aliyot: [] };
  assert.deepEqual(F.practiceUnits(index, noAliyot).map((u) => u.label), ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5', 'Chapter 6']);
  assert.deepEqual(F.normalisePractice({ parsha: 'noach', unit: 'aliyah-2', step: 4 }), { v: 1, parsha: 'noach', unit: 'aliyah-2', step: 4 });
  assert.deepEqual(F.normalisePractice('x'), { v: 1, parsha: null, unit: null, step: 0 });
});

test('no melody is made: the code plays no tones and names no notes', () => {
  const src = readFileSync(new URL('src/trope/practice.view.js', root), 'utf8') + readFileSync(new URL('src/trope/families.js', root), 'utf8');
  assert.ok(!/AudioContext|OscillatorNode|createOscillator|speechSynthesis/.test(src));
  assert.ok(!new RegExp('\\b(' + ['AI','G'+'PT','Cla'+'ude','L'+'LM'].join('|') + ')\\b').test(src));
});

// ---------- view on a minimal fake DOM ----------
class N {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.className = ''; this.parent = null; }
  setAttribute(k, v) { this.attrs[k] = String(v); } removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { if (x && x.nodeType === 1) x.parent = this; this.children.push(x); } }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  replaceWith(n) { const p = this.parent; if (!p) return; const i = p.children.indexOf(this); n.parent = p; p.children[i] = n; }
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v) }]; }
  remove() {} focus() {}
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(''); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  async click() { for (const f of this.listeners.click || []) await f({ target: this }); }
}
globalThis.document = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }) };
const flush = () => new Promise((r) => setTimeout(r, 0));
const waitFor = async (f) => { for (let i = 0; i < 400; i++) { const v = f(); if (v) return v; await flush(); } throw new Error('timeout'); };
const find = (r, pred) => r.find(pred)[0];
const mkCtx = (query, extra = {}) => { const m = {}; return { m, query, store: { get: (k) => m[k], set: (k, v) => { m[k] = v; } }, tropeLoad: async (rel) => json(rel), settings: { get: () => 'ashkenazi' }, now: () => new Date(2026, 10, 12), ...extra }; };

test('view: the families list, then one family with the sign, its name, real examples and the melody note', async () => {
  const { mount } = await import('../src/trope/practice.view.js');
  let r = new N('div'); let c = mkCtx({}); let un = mount(r, c);
  await waitFor(() => find(r, (n) => n.attrs.href === '#/trope/families/level-1'));
  assert.match(r.text, /Trope names from the app’s table; not reviewed\./);
  un();
  r = new N('div'); c = mkCtx({ id: 'level-1' }); un = mount(r, c);
  await waitFor(() => find(r, (n) => n.attrs['data-sign'] === 'siluk'));
  const box = find(r, (n) => n.attrs['data-sign'] === 'etnachta');
  assert.match(box.text, /Etnachta/); assert.match(box.text, /Also called Atnach/); assert.match(box.text, /melody audio not recorded yet/);
  assert.match(box.text, /Genesis 1:1/);
  un();
  r = new N('div'); c = mkCtx({ id: 'level-2' }); un = mount(r, c);
  await waitFor(() => find(r, (n) => n.attrs['data-sign'] === 'shalshelet'));
  const more = find(find(r, (n) => n.attrs['data-sign'] === 'shalshelet'), (n) => n.tag === 'button' && n.text === 'Find more examples');
  assert.ok(more, 'shalshelet is not in Genesis 1 to 3, so the page offers to search further');
  await more.click(); await waitFor(() => /Genesis 19:16/.test(r.text));
  un();
});

test('view: per-aliyah practice opens on this week’s portion and steps phrase by phrase with the verse audio', async () => {
  const { mount } = await import('../src/trope/practice.view.js');
  const played = [];
  const c = mkCtx({ sec: 'aliyah' }, { audio: { play: async (k, id, o) => { played.push([k, id, o.text]); return { source: 'none', reason: 'missing' }; }, stop() {} } });
  const r = new N('div'); const un = mount(r, c);
  await waitFor(() => find(r, (n) => n.attrs.id === 'tp-next'));
  assert.match(r.text, /this week/);
  assert.match(r.text, /phrase 1 of/); assert.match(r.text, /melody audio not recorded yet/);
  const first = find(r, (n) => n.tag === 'h2').text;
  await find(r, (n) => n.attrs.id === 'tp-next').click();
  assert.notEqual(find(r, (n) => n.tag === 'h2').text, first);
  assert.equal(c.m['trope.practice.v1'].step, 1);
  await find(r, (n) => n.attrs.id === 'tp-listen').click(); await flush();
  assert.equal(played.length, 1); assert.equal(played[0][0], 'line'); assert.match(played[0][1], /^torah-/);
  assert.ok(!rawName(played[0][2]), 'the name is never sent to a voice');
  assert.ok(!rawName(find(r, (n) => n.tag === 'ol').text), 'the name is shown as ה׳');
  un();
});
