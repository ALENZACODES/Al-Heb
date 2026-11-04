// Accent lane, patches applied to other owners' views (docs/accents/PATCHES.md): with settings.congregation = ashkenazi
// vs israeli the rendered respelling or letter sound differs where data/pronunciation/consonants.json or the
// transliteration engine says it should. Fake DOM (view logic, not browser rendering), no network: data is read from disk.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { waitFor } from './helpers/waitfor.js';
import { createSettings } from '../src/shell/settings.js';
import { respell, letterSound } from '../src/pronunciation/forTradition.js';

// One fake element that serves every view here (atlas/trace/speak use globalThis.document, traditions uses root.ownerDocument).
class Txt { constructor(d) { this.nodeType = 3; this.data = String(d); this.parent = null; } get textContent() { return this.data; } get text() { return this.data; } }
class El {
  constructor(tag, doc) { this.tag = tag; this.tagName = tag.toUpperCase(); this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.className = ''; this.value = ''; this.checked = false; this.ownerDocument = doc; this.classList = { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false }; this.style = {}; this._text = ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; } removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ??= new Set()).add(f); } removeEventListener(t, f) { this.listeners[t]?.delete(f); }
  _norm(x) { return x == null ? null : (typeof x === 'object' && x.nodeType ? x : new Txt(x)); }
  append(...c) { for (const x of c) { const n = this._norm(x); if (!n) continue; n.parent = this; this.children.push(n); } }
  appendChild(c) { this.append(c); return c; } prepend(...c) { for (const x of c.reverse()) { const n = this._norm(x); if (n) { n.parent = this; this.children.unshift(n); } } }
  replaceChildren(...c) { this.children = []; this.append(...c); }
  replaceWith(n) { if (this.parent) { const i = this.parent.children.indexOf(this); this.parent.children[i] = n; n.parent = this.parent; } }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  contains(n) { return n === this || this.children.some((c) => c.nodeType === 1 && c.contains(n)); }
  set textContent(v) { this.children = []; this._text = String(v); } get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); } get text() { return this.textContent; }
  focus() { globalThis.__focus = this; }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  querySelector(sel) { return this.find((n) => (sel.startsWith('#') ? n.attrs.id === sel.slice(1) : sel.startsWith('.') ? String(n.attrs.class || '').split(/\s+/).includes(sel.slice(1)) : n.tag === sel))[0] || null; }
  querySelectorAll(sel) { return this.find((n) => (sel.startsWith('#') ? n.attrs.id === sel.slice(1) : sel.startsWith('.') ? String(n.attrs.class || '').split(/\s+/).includes(sel.slice(1)) : n.tag === sel)); }
  dispatch(t, ev = {}) { for (const f of [...(this.listeners[t] ?? [])]) f({ target: this, preventDefault() {}, ...ev }); }
  click() { return this.dispatch('click'); }
}
const doc = { createElement: (t) => new El(t, doc), createTextNode: (d) => new Txt(d) };
globalThis.document = doc; globalThis.window = { scrollY: 0, scrollTo() {}, requestAnimationFrame: (f) => setTimeout(f, 0) };
const newRoot = () => new El('div', doc);
const all = (n, pred) => n.find((x) => pred(x));
const buttons = (n) => all(n, (x) => x.tag === 'button');
const byText = (n, re) => buttons(n).find((b) => re.test(b.textContent));
const click = (el) => el.dispatch('click');
const byId = (root, id) => root.find((n) => n.attrs.id === id)[0];
const loaded = (root, extra = () => true) => waitFor(() => root.children.length > 0 && !/Loading/.test(root.textContent) && extra(), { message: 'view never finished loading' });

const rd = (p) => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const consonants = rd('data/pronunciation/consonants.json');
const letters = rd('data/letters/letters.json');
const lettersData = { letters, mnemonics: rd('data/letters/mnemonics.json'), confusables: rd('data/letters/confusables.json'), interference: rd('data/letters/interference.json'), consonants };
const memStore = () => { const m = {}; return { m, get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); } }; };
const settingsWith = (congregation) => { const s = createSettings(memStore()); s.set({ congregation }); return s; };
const text = (root) => all(root, (n) => n.tag === 'style').reduce((t, st) => t.replace(st.textContent, ''), root.textContent);
const TAV_ASHK = letterSound(consonants.letters.tav, 'ashkenazi').en;
const TAV_ISR = letterSound(consonants.letters.tav, 'israeli').en;

test('data: the consonants file says tav differs for Ashkenazi (the case every view test below leans on)', () => {
  assert.notEqual(TAV_ASHK, TAV_ISR);
  assert.match(TAV_ASHK, /s without dagesh/);
  assert.equal(TAV_ISR, 't');
});

// 1. traditions.view.js: the switch button writes through the real settings object and persists.
test('traditions view: "Switch the app to Ashkenazi" reaches the real settings (patch object), persists, and marks the choice', async () => {
  const { mount } = await import('../src/traditions/traditions.view.js');
  const traditionsData = { sounds: rd('data/traditions/sounds.json'), sources: rd('data/traditions/sources.json'), guide: rd('data/traditions/guide.json'), registry: rd('data/corpus/registry.json'), prayerwords: rd('data/pronunciation/prayerwords.json'), consonants, niqqud: rd('data/pronunciation/niqqud.json') };
  const store = memStore(); const settings = createSettings(store); settings.set({ congregation: 'israeli' });
  const root = newRoot();
  const un = mount(root, { settings, t: (k) => k, traditionsData, query: { tab: 'guide' }, audio: { has: () => false, status: () => ({ source: 'none' }), play: async () => ({ source: 'file' }), playSequence: async () => [{ source: 'file' }] } });
  await loaded(root);
  const sit = traditionsData.guide.situations.find((s) => s.tradition === 'ashkenazi');
  assert.ok(sit, 'guide.json has an Ashkenazi situation');
  const radio = all(root, (n) => n.tag === 'input' && n.getAttribute('value') === sit.id)[0];
  assert.ok(radio, 'situation radio'); radio.checked = true; radio.dispatch('change');
  const sw = await (async () => { for (let i = 0; i < 50; i++) { const b = byText(root, /Switch the app to Ashkenazi/); if (b) return b; await new Promise((r) => setTimeout(r, 10)); } return null; })();
  assert.ok(sw, 'switch button rendered');
  click(sw);
  assert.equal(settings.get('congregation'), 'ashkenazi', 'the real settings object accepted the write');
  assert.equal(createSettings(store).get('congregation'), 'ashkenazi', 'survives a reload from the store');
  assert.match(text(root), /Reading setting is now Ashkenazi/);
  un();
});

// 2. review.view.js describeCard: letter cards follow the tradition.
test('flashcards (review): the tav letter card answer differs for ashkenazi vs israeli', async () => {
  const { describeCard } = await import('../src/curriculum/review.view.js');
  const { loadContent } = await import('../src/curriculum/content.js');
  const c = await loadContent();
  assert.ok(c.consonants instanceof Map && c.consonants.get('tav'), 'content exposes consonants');
  const a = describeCard('letter:tav', c, 'ashkenazi'), i = describeCard('letter:tav', c, 'israeli');
  assert.equal(a.answer[1], TAV_ASHK); assert.equal(i.answer[1], TAV_ISR); assert.notEqual(a.answer[1], i.answer[1]);
  // a letter the data says does not change keeps its line in both
  assert.equal(describeCard('letter:lamed', c, 'ashkenazi').answer[1], describeCard('letter:lamed', c, 'israeli').answer[1]);
});

// 3. exercises.session.js: the quick-check feedback sentence and sound prompt follow the tradition when it is passed.
test('quick check: letter-sound questions quote the Ashkenazi tav when tradition = ashkenazi, Israeli tav otherwise', async () => {
  const { buildChoiceQuestions } = await import('../src/curriculum/exercises.session.js');
  const { loadContent } = await import('../src/curriculum/content.js');
  const { lessons } = await import('../src/curriculum/lessons.js');
  const c = await loadContent();
  const lesson = lessons.find((l) => (l.letters || []).includes('tav'));
  assert.ok(lesson, 'a lesson teaches tav');
  const q = (trad) => buildChoiceQuestions(lesson, c, { seed: 1, tradition: trad });
  const nameA = q('ashkenazi').find((x) => x.id.endsWith('-q-name-tav')), nameI = q('israeli').find((x) => x.id.endsWith('-q-name-tav'));
  assert.ok(nameA.why.includes(TAV_ASHK), nameA.why); assert.ok(nameI.why.includes('sounds like t.'), nameI.why);
  assert.notEqual(nameA.why, nameI.why);
  const sndA = q('ashkenazi').find((x) => x.id.endsWith('-q-sound-tav')), sndI = q('israeli').find((x) => x.id.endsWith('-q-sound-tav'));
  assert.ok(sndA.prompt.includes(TAV_ASHK)); assert.equal(sndI.prompt, 'Which letter sounds like: t');
  // without a tradition (how lesson.view.js calls it today) nothing changes: Israeli letters.json wording
  assert.equal(buildChoiceQuestions(lesson, c, { seed: 1 }).find((x) => x.id.endsWith('-q-sound-tav')).prompt, 'Which letter sounds like: t');
});

// 4. atlas.view.js: the tav tile's detail text follows ctx.settings.
test('letter atlas: tav detail reads the Ashkenazi sound for settings.congregation = ashkenazi and the Israeli one for israeli', async () => {
  const { mount, buildTiles } = await import('../src/letters/atlas.view.js');
  const tilesA = buildTiles(letters, lettersData.mnemonics, { consonants, tradition: 'ashkenazi' });
  const tilesI = buildTiles(letters, lettersData.mnemonics, { consonants, tradition: 'israeli' });
  assert.equal(tilesA.find((t) => t.id === 'tav').soundEn, TAV_ASHK);
  assert.equal(tilesI.find((t) => t.id === 'tav').soundEn, TAV_ISR);
  assert.equal(buildTiles(letters, lettersData.mnemonics).find((t) => t.id === 'tav').soundEn, letters.find((l) => l.id === 'tav').sound.en, 'no consonants: letters.json fallback');
  const open = async (congregation) => {
    const root = newRoot();
    const un = mount(root, { ...lettersData, settings: settingsWith(congregation), params: { id: 'tav' }, audio: { play: async () => ({ source: 'file' }) } });
    await loaded(root, () => all(root, (n) => n.getAttribute('data-detail') === 'tav').length > 0);
    const detail = all(root, (n) => n.getAttribute('data-detail') === 'tav')[0].textContent;
    un(); return detail;
  };
  const a = await open('ashkenazi'), i = await open('israeli');
  assert.notEqual(a, i);
  assert.ok(a.includes('In your setting: ' + TAV_ASHK), a.slice(0, 200));
  assert.ok(!i.includes('In your setting'), 'israeli: the memory anchor already says t');
});

// 5. trace.view.js: the letter header line follows ctx.settings.
test('trace view: the tav header shows the Ashkenazi sound for ashkenazi and the Israeli sound for israeli', async () => {
  const { mount } = await import('../src/letters/trace.view.js');
  const open = async (congregation) => {
    const root = newRoot();
    const un = mount(root, { ...lettersData, keyboard: null, settings: settingsWith(congregation), params: { id: 'tav' }, store: memStore(), audio: { play: async () => ({ source: 'file' }) } });
    await loaded(root, () => /Tav/.test(root.textContent));
    const t = text(root); un(); return t;
  };
  const a = await open('ashkenazi'), i = await open('israeli');
  assert.ok(a.includes(TAV_ASHK), 'ashkenazi header: ' + a.slice(0, 300));
  assert.ok(!i.includes(TAV_ASHK) && i.includes('/t/  t'), 'israeli header: ' + i.slice(0, 300));
});

// 6. intermediate.view.js pronLine: a word with no line for the tradition is respelled, not silently shown in Israeli.
test('intermediate pronLine: ashkenazi falls back to the engine respelling, israeli keeps its own line', async () => {
  const { pronLine } = await import('../src/curriculum/intermediate.view.js');
  const w = { he: 'שַׁבָּת', translit: 'shabbat', pronunciation: { israeli: 'sha-BAT' } };
  assert.equal(pronLine(w, 'israeli'), 'sha-BAT');
  assert.equal(pronLine(w, 'ashkenazi'), respell('שַׁבָּת', 'ashkenazi'));
  assert.notEqual(pronLine(w, 'ashkenazi'), pronLine(w, 'israeli'));
  assert.match(pronLine(w, 'ashkenazi'), /s$/, 'final tav without dagesh is s in Ashkenazi');
  assert.equal(pronLine({ he: 'שַׁבָּת', pronunciation: { israeli: 'x', ashkenazi: 'SHA-bos' } }, 'ashkenazi'), 'SHA-bos', 'an authored line wins over the engine');
  assert.equal(pronLine({ translit: 'only' }, 'ashkenazi'), 'only', 'no Hebrew: translit fallback');
});

// 7. speak.js: the say-it card uses the respelling in the learner's setting.
test('speak sets: the say-it card shows a different respelling for ashkenazi vs israeli on a word the engine respells differently', async () => {
  const L = await import('../src/speak/loader.js');
  const { mount } = await import('../src/speak/speak.js');
  const sets = await L.loadSetsIndex();
  let found = null;
  for (const s of sets) { const set = await L.loadSet(s.id); if (set.items.length && respell(set.items[0].he, 'ashkenazi') !== respell(set.items[0].he, 'israeli')) { found = { id: s.id, set }; break; } }
  assert.ok(found, 'some set opens on an item the engine respells differently in Ashkenazi');
  const setItems = Object.fromEntries(await Promise.all(sets.map(async (s) => [s.id, await L.loadSet(s.id)])));
  const data = { sets, setItems, pairs: await L.loadPairs(), traditionPairs: await L.loadTraditionPairs(), prayers: await L.loadPrayers() };
  const open = async (congregation) => {
    const root = newRoot(); const m = {};
    const un = mount(root, { store: { get: (k) => m[k], set: (k, v) => { m[k] = v; } }, clock: { now: () => 1_800_000_000_000 }, rng: () => 0.5, query: { set: found.id }, settings: settingsWith(congregation), t: (k) => k,
      speak: { data, RecognitionCtor: null, MediaRecorderCtor: null, getUserMedia: null, synth: null, UtteranceCtor: null, dayKey: (t) => new Date(t).toISOString().slice(0, 10) } });
    await waitFor(() => byId(root, 'speak-start')); byId(root, 'speak-start').click();
    await waitFor(() => byId(root, 'speak-q'));
    const sub = root.find((n) => n.attrs.lang === 'he-Latn')[0]?.textContent, aria = byId(root, 'speak-listen')?.attrs['aria-label'];
    un(); return { sub, aria };
  };
  const a = await open('ashkenazi'), i = await open('israeli'), item = found.set.items[0];
  assert.equal(a.sub, respell(item.he, 'ashkenazi')); assert.equal(i.sub, respell(item.he, 'israeli'));
  assert.notEqual(a.sub, i.sub);
  assert.ok(a.aria.includes(a.sub) && i.aria.includes(i.sub), 'the Listen label uses the same respelling');
});
