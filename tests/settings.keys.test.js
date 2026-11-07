// Settings keys added for the feel hooks and the G-d spelling: defaults, validation, persistence, and one Settings row each.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, validate, createSettings } from '../src/shell/settings.js';
import { uiEnglish } from '../src/shell/names.js';
import { hapticsOn, soundOn } from '../src/curriculum/exercises.session.js';

const memStore = () => { const m = {}; return { get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = v; }, m }; };

test('new boolean keys exist with false defaults and accept only booleans', () => {
  // soundEffects is the exception: ON by default since Nov 7 2026 (owner decision — silent games read as broken).
  assert.equal(DEFAULTS.soundEffects, true, 'soundEffects defaults on');
  for (const k of ['writeGodAsGd', 'haptics', 'soundEffects', 'showUnapprovedImages']) {
    if (k !== 'soundEffects') assert.equal(DEFAULTS[k], false, k);
    assert.deepEqual(validate(k, true), { ok: true, value: true });
    assert.deepEqual(validate(k, false), { ok: true, value: false });
    assert.equal(validate(k, 'true').ok, false, k + ' rejects a string');
    assert.equal(validate(k, 1).ok, false, k + ' rejects a number');
  }
});

test('they persist through the store and come back on reload; bad stored values fall back to the default', () => {
  const store = memStore();
  const s = createSettings(store);
  assert.deepEqual(s.set({ haptics: true, soundEffects: true, writeGodAsGd: true }), []);
  assert.equal(createSettings(store).get('haptics'), true);
  store.m.settings = { ...store.m.settings, haptics: 'yes' };
  assert.equal(createSettings(store).get('haptics'), false);
  assert.equal(createSettings(store).get('writeGodAsGd'), true);
});

test('the exercise-feel hooks read exactly these key names', () => {
  const ctx = (v) => ({ settings: createSettings(memStore()), sfx: { play() {} }, ...v });
  const win = { navigator: { vibrate() {} }, matchMedia: () => ({ matches: false }) };
  const c = ctx({});
  assert.equal(hapticsOn(c, win), false); assert.equal(soundOn(c), true); // soundEffects defaults on (Nov 7 2026)
  c.settings.set({ haptics: true, soundEffects: true });
  assert.equal(hapticsOn(c, win), true); assert.equal(soundOn(c), true);
});

test('uiEnglish writes G-d only when the setting is on, and leaves text alone without a ctx', () => {
  const s = createSettings(memStore());
  assert.equal(uiEnglish({ settings: s }, 'Start your day with God'), 'Start your day with God');
  s.set({ writeGodAsGd: true });
  assert.equal(uiEnglish({ settings: s }, 'Start your day with God'), 'Start your day with G-d');
  assert.equal(uiEnglish(null, 'God'), 'God');
});

test('Settings screen renders one checkbox row per new key, showUnapprovedImages under Advanced, and saves on change', async () => {
  class N {
    constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.ls = {}; this.className = ''; this.hidden = false; }
    setAttribute(k, v) { this.attrs[k] = String(v); } removeAttribute(k) { delete this.attrs[k]; }
    addEventListener(t, f) { (this.ls[t] ||= []).push(f); }
    append(...c) { for (const x of c) this.children.push(typeof x === 'string' ? { tag: '#text', data: x, children: [] } : x); }
    replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
    set textContent(v) { this.replaceChildren(String(v)); }
    get text() { return this.children.map((c) => (c.tag === '#text' ? c.data : c.text)).join(''); }
    find(p, out = []) { if (p(this)) out.push(this); for (const c of this.children) if (c.find) c.find(p, out); return out; }
    querySelector(sel) { return this.find((n) => n.attrs.id === sel.slice(1))[0] || null; }
    focus() {}
  }
  globalThis.document = { createElement: (t) => new N(t), body: new N('body') };
  const { mount } = await import('../src/shell/settings.view.js');
  const store = Object.assign(memStore(), { persistent: true, exportJSON: () => '{}', previewImport: () => ({ ok: false, error: 'x' }), importData: () => ({ ok: false, error: 'x' }), status: () => ({ persistent: true, reason: null }) });
  const settings = createSettings(store);
  const root = new N('div');
  mount(root, { settings, store, t: (k) => k });
  for (const k of ['writeGodAsGd', 'haptics', 'soundEffects', 'showUnapprovedImages']) {
    const box = root.querySelector('#s-' + k);
    assert.ok(box && box.attrs.type === 'checkbox', k + ' row exists');
    if (k === 'soundEffects') assert.ok('checked' in box.attrs, 'soundEffects starts checked (defaults on)');
    else assert.equal(box.attrs.checked, undefined, k + ' starts unchecked');
    for (const f of box.ls.change) f({ target: { checked: true } });
    assert.equal(settings.get(k), true, k + ' saved');
  }
  const adv = root.find((n) => n.tag === 'fieldset' && n.children[0]?.text === 'Advanced')[0];
  assert.ok(adv, 'Advanced section');
  assert.ok(adv.find((n) => n.attrs.id === 's-showUnapprovedImages').length === 1, 'showUnapprovedImages is in Advanced');
});
