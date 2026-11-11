// Accessibility hub (/accessibility): route registration, one control per accessibility setting, "Start here" presets, links from
// Settings / the More sheet / first run, settings persistence + validation + backup round trip. Fake DOM, no browser (fast tier).
// A passing test shows the wiring and the settings logic; it says nothing about how the screen feels with a screen reader or switch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { N, memStore } from './torahread.fakedom.js';
import { ROUTES } from '../src/shell/router.js';
import { en } from '../src/shell/i18n.js';
import '../src/shell/nav.strings.js';
import { DEFAULTS, ENUMS, validate, createSettings } from '../src/shell/settings.js';
import { CONTROLS, GROUPS, PRESETS, NOT_A11Y, uncovered, visibleGroups, planPreset, applyPreset } from '../src/shell/a11y.model.js';
import { renderMenu } from '../src/shell/menu.js';
import { createStore, createMemoryStorage } from '../src/store.js';
import { STORE_KEYS } from '../src/shell/privacy.view.js';
import { mount } from '../src/shell/a11y.view.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const ALL = new Set(ROUTES.map((r) => r.name));
const settingsOver = (init = {}) => { const st = memStore(); st.m.settings = init; return createSettings(st); };

test('the accessibility route exists, is a preview route (not in v0), and its view file exists', () => {
  const r = ROUTES.find((x) => x.name === 'accessibility');
  assert.ok(r); assert.equal(r.pattern, '/accessibility'); assert.equal(r.tier, 'preview');
  assert.ok(existsSync(join(root, 'src/shell/a11y.view.js')));
  assert.ok(en['nav.accessibility']);
  assert.ok(!/`accessibility`/.test(read('docs/v0/SCOPE.md').split('## What a preview route gets')[0]), 'not listed as a v0 route');
  assert.equal(ROUTES.filter((x) => x.tier === 'v0').length, 29, 'v0 stays at 29 routes (24 + Little books, the Read and Speak doors and Practical, promoted 2026-11-10; Curriculum, 2026-11-11)');
});

test('every setting in settings.js has a control here or is listed as not an accessibility setting; no stale entries', () => {
  assert.deepEqual(uncovered(), [], 'add a control (or a NOT_A11Y entry) in src/shell/a11y.model.js');
  for (const c of CONTROLS) {
    assert.ok(c.key in DEFAULTS, `control for unknown setting ${c.key}`);
    assert.ok(GROUPS.some((g) => g.id === c.group), c.key + ' group');
    assert.ok(c.label && c.help && c.help.length < 220, c.key + ' label and one short help sentence');
    if (c.type === 'enum') assert.deepEqual(Object.keys(c.options).sort(), [...ENUMS[c.key]].sort(), `${c.key}: one option per allowed value`);
    else assert.equal(typeof DEFAULTS[c.key], 'boolean', c.key);
  }
  for (const k of NOT_A11Y) assert.ok(k in DEFAULTS, 'stale NOT_A11Y entry ' + k);
  assert.equal(new Set(CONTROLS.map((c) => c.key)).size, CONTROLS.length);
});

test('presets: every key they set exists and is valid; each button names what it changed and undo restores it', () => {
  assert.equal(PRESETS.length, 5);
  assert.deepEqual(PRESETS.map((p) => p.label), ["I can't hear audio", "I can't see the screen well", 'Colours are hard to tell apart', 'Tapping and dragging is hard', 'I want a calmer, simpler app']);
  for (const p of PRESETS) {
    assert.ok(Object.keys(p.set).length, p.id + ' sets something');
    for (const [k, v] of Object.entries(p.set)) { assert.ok(CONTROLS.some((c) => c.key === k), `${p.id}: no control for ${k}`); assert.equal(validate(k, v).ok, true, `${p.id}: ${k}=${v}`); }
    const s = settingsOver();
    const before = s.all();
    const r = applyPreset(p, s);
    assert.equal(r.rejected.length, 0);
    for (const [k, v] of Object.entries(p.set)) assert.equal(s.get(k), v, `${p.id} set ${k}`);
    for (const c of planPreset(p, before).changes) assert.ok(r.message.includes(c.label), `${p.id} message names "${c.label}"`);
    assert.match(r.message, /undo/i);
    s.set(r.undo);
    assert.deepEqual(s.all(), before, p.id + ' undo restores every setting');
  }
});

test('a preset on settings that already match changes nothing and says so; a key missing from this build is reported, not faked', () => {
  const p = PRESETS[0]; const s = settingsOver(p.set);
  const r = applyPreset(p, s);
  assert.deepEqual(r.changed, []); assert.match(r.message, /Already set/);
  const fake = { id: 'x', label: 'x', set: { noSuchSetting: true } };
  const r2 = applyPreset(fake, settingsOver());
  assert.deepEqual(r2.changed, []); assert.match(r2.message, /no setting for that yet/);
});

test('the screen: one section per non-empty group, a control per key, five Start here buttons, statement, and presets update the controls', async () => {
  const doc = globalThis.document; const rootEl = new N('main');
  const s = settingsOver();
  mount(rootEl, { settings: s, t: (k) => k });
  assert.ok(rootEl.querySelector('#view-title'));
  const presetBtns = rootEl.queryAll('button').filter((b) => b.getAttribute('data-preset'));
  assert.equal(presetBtns.length, 5);
  for (const g of visibleGroups()) assert.ok(rootEl.querySelector('#a-g-' + g.id), g.id);
  for (const c of CONTROLS) {
    if (c.type === 'bool') assert.ok(rootEl.querySelector('#a-' + c.key), c.key);
    else for (const v of Object.keys(c.options)) assert.ok(rootEl.querySelector(`#a-${c.key}-${v}`), `${c.key}/${v}`);
  }
  assert.ok(rootEl.querySelector('#a11y-statement'));
  const status = rootEl.querySelector('#a11y-status');
  assert.equal(status.getAttribute('role'), 'status');
  await presetBtns.find((b) => b.getAttribute('data-preset') === 'touch').click();
  assert.equal(s.get('targetSize'), 'large');
  assert.match(status.textContent, /Changed:/); assert.match(status.textContent, /Size of buttons and fields \(Large\)/);
  assert.equal(rootEl.querySelector('#a11y-undo').hidden, false, 'Undo is offered');
  assert.ok(rootEl.querySelector('#a-targetSize-large').getAttribute('checked') !== null, 'controls redraw with the new value');
  await rootEl.querySelector('#a11y-undo').click();
  assert.equal(s.get('targetSize'), 'normal');
  void doc;
});

test('a control change saves through settings (checkbox and radio)', async () => {
  const rootEl = new N('main'); const s = settingsOver();
  mount(rootEl, { settings: s, t: (k) => k });
  await rootEl.querySelector('#a-calmMode').fire('change', { target: { checked: true } });
  assert.equal(s.get('calmMode'), true);
  await rootEl.querySelector('#a-textSize-larger').fire('change');
  assert.equal(s.get('textSize'), 'larger');
});

test('links: the More sheet has a quick row under Settings, Settings and first run link to the screen, first run keeps its flow', () => {
  const list = new N('ul');
  renderMenu(list, { routes: ROUTES, available: ALL, current: 'home' });
  const quick = list.children.filter((c) => c.nodeType === 1 && c.getAttribute('data-quick'));
  assert.deepEqual(quick.map((c) => c.getAttribute('data-quick')), ['settings', 'accessibility']);
  assert.equal(quick[1].queryAll('a')[0].getAttribute('href'), '#/accessibility');
  assert.match(read('src/shell/settings.view.js'), /href: '#\/accessibility'/);
  assert.match(read('src/onboarding/firstrun.view.js'), /href: '#\/accessibility'/);
});

test('settings persist, are validated, and travel in a backup (store key "settings")', () => {
  const storage = createMemoryStorage();
  const store = createStore({ storage });
  const s = createSettings(store);
  const patch = {};
  for (const c of CONTROLS) patch[c.key] = c.type === 'enum' ? ENUMS[c.key][ENUMS[c.key].length - 1] : !DEFAULTS[c.key];
  assert.deepEqual(s.set(patch), [], 'every control value is accepted');
  assert.deepEqual(createSettings(store).all(), s.all(), 'a fresh settings object reads the same values back');
  const backup = store.exportJSON();
  const other = createStore({ storage: createMemoryStorage() });
  const res = other.importData(backup, { mode: 'replace' });
  assert.equal(res.ok, true);
  const restored = createSettings(other);
  for (const c of CONTROLS) assert.equal(restored.get(c.key), patch[c.key], c.key + ' survives backup and restore');
  // validation: every key rejects a value of the wrong kind, and a bad stored value falls back to the default
  for (const c of CONTROLS) {
    assert.equal(validate(c.key, { x: 1 }).ok, false, c.key + ' rejects an object');
    assert.equal(validate(c.key, c.type === 'enum' ? 'not-a-value' : 'yes').ok, false, c.key + ' rejects a bad value');
    assert.equal(validate(c.key, DEFAULTS[c.key]).ok, true, c.key + ' accepts its default');
  }
  const bad = memStore(); bad.m.settings = Object.fromEntries(CONTROLS.map((c) => [c.key, 42]));
  const fb = createSettings(bad);
  for (const c of CONTROLS) assert.equal(fb.get(c.key), DEFAULTS[c.key], c.key + ' falls back to the default');
});

test('privacy: the settings row says accessibility options are stored there, and no new store key was added for the hub', () => {
  const row = STORE_KEYS.find((r) => r[0] === 'settings');
  assert.match(row[1], /accessibility/i);
  const hub = read('src/shell/a11y.view.js') + read('src/shell/a11y.model.js');
  assert.ok(!/store\.(set|get)\(/.test(hub), 'the hub reads and writes nothing but settings');
  assert.ok(!/localStorage|sessionStorage|fetch\(/.test(hub));
});

test('docs/a11y/STATEMENT.md matches the in-app statement; it makes no conformance claim and invents no contact address', async () => {
  const { toMarkdown, STATEMENT } = await import('../src/shell/a11y.statement.js');
  assert.equal(read('docs/a11y/STATEMENT.md'), toMarkdown(), 'run: node tools/a11y/statement.mjs --write');
  const all = JSON.stringify(STATEMENT);
  assert.ok(!/@[a-z0-9-]+\.[a-z]{2,}/i.test(all) && !/https?:\/\//.test(all), 'no email address or link invented');
  assert.match(all, /does not claim to meet WCAG/);
  assert.ok(!/(conforms|compliant|fully accessible|AA compliant|meets WCAG 2)/i.test(all));
  for (const id of ['claims', 'checked', 'notested', 'gaps', 'report']) assert.ok(STATEMENT.sections.some((s) => s.id === id), id);
});
