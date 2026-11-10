// One shared learner-gender setting: default unset, validation, one-time adoption from the three old keys, backup/restore, Settings row,
// and the two views that read it (gender drill, Israel). Fake DOM only; no browser run.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULTS, validate, createSettings, adoptLegacyGender, learnerGender, setLearnerGenderSetting } from '../src/shell/settings.js';
import { createStore, createMemoryStorage } from '../src/store.js';
import { N, tick, btn } from './torahread.fakedom.js';

const mem = (init = {}) => { const m = { ...init }; return { get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = v; }, m }; };

test('default is unset (null), and validate accepts only null, m, f, both', () => {
  assert.equal(DEFAULTS.gender, null);
  assert.equal(createSettings(mem()).get('gender'), null);
  for (const v of [null, 'm', 'f', 'both']) assert.deepEqual(validate('gender', v), { ok: true, value: v });
  for (const v of ['x', '', 'M', 1, true, undefined]) assert.equal(validate('gender', v).ok, false, String(v));
});

test('adoption from the old keys: gender.v1 wins (including both), then curriculum.gender, then israel.prefs only when f', () => {
  assert.equal(adoptLegacyGender(mem({ 'gender.v1': { speaker: 'both' }, 'curriculum.gender': { iAm: 'm' } })), 'both');
  assert.equal(adoptLegacyGender(mem({ 'curriculum.gender': { iAm: 'f' }, 'israel.prefs': { iAm: 'm' } })), 'f');
  assert.equal(adoptLegacyGender(mem({ 'israel.prefs': { iAm: 'f' } })), 'f');
  assert.equal(adoptLegacyGender(mem({ 'israel.prefs': { iAm: 'm', talkingTo: 'm' } })), null, 'an m in the Israel prefs was an untouched default, not a choice');
  assert.equal(adoptLegacyGender(mem({ 'gender.v1': { speaker: 'zz' }, 'curriculum.gender': 'junk' })), null);
  assert.equal(adoptLegacyGender(mem()), null);
});

test('createSettings adopts once, stores it, and an explicit null later is not overridden', () => {
  const store = mem({ 'curriculum.gender': { iAm: 'f' } });
  const s = createSettings(store);
  assert.equal(s.get('gender'), 'f'); assert.equal(store.m.settings.gender, 'f', 'persisted');
  assert.deepEqual(s.set({ gender: null }), []);
  assert.equal(createSettings(store).get('gender'), null, 'the learner cleared it; the old key does not bring it back');
  assert.deepEqual(s.set({ gender: 'x' }), ['gender']);
});

test('backup and restore: the choice travels in the settings key; an older backup without it is adopted from its old keys', () => {
  const a = createStore({ storage: createMemoryStorage() });
  const sa = createSettings(a); sa.set({ gender: 'both' });
  const b = createStore({ storage: createMemoryStorage() });
  const sb = createSettings(b);
  assert.equal(sb.get('gender'), null);
  const r = b.importData(a.exportJSON()); assert.ok(r.ok !== false, JSON.stringify(r));
  sb.reload(); assert.equal(sb.get('gender'), 'both');
  // old backup: settings without the key, gender drill choice in gender.v1
  const c = createStore({ storage: createMemoryStorage() });
  c.set('settings', { voice: 'm' }); c.set('gender.v1', { speaker: 'f', asked: 3, right: 2 });
  const d = createStore({ storage: createMemoryStorage() }); const sd = createSettings(d);
  assert.ok(d.importData(c.exportJSON()).ok !== false);
  sd.reload(); assert.equal(sd.get('gender'), 'f'); assert.equal(sd.get('voice'), 'm');
});

test('helpers: learnerGender reads only valid values; setLearnerGenderSetting needs a settings object', () => {
  const s = createSettings(mem());
  assert.equal(learnerGender({ settings: s }), null); assert.equal(setLearnerGenderSetting({ settings: s }, 'f'), true); assert.equal(learnerGender({ settings: s }), 'f');
  assert.equal(learnerGender({}), null); assert.equal(learnerGender({ settings: {} }), null); assert.equal(setLearnerGenderSetting({ settings: {} }, 'f'), false);
});

test('privacy table lists the setting and says where the old copies went', () => {
  const src = readFileSync(new URL('../src/shell/privacy.view.js', import.meta.url), 'utf8');
  assert.match(src, /your gender for Hebrew forms \(optional\)/); assert.match(src, /\['gender\.v1', 'Gender drill: checked-question counts/);
});

test('Settings screen has one labelled radio group with Not chosen yet preselected and a plain explanation; choosing saves', async () => {
  const { mount } = await import('../src/shell/settings.view.js');
  const settings = createSettings(mem()); const store = createStore({ storage: createMemoryStorage() });
  const root = new N('main');
  mount(root, { settings, store, t: (k) => k });
  const radios = root.all((n) => n.tag === 'input' && n.attrs.name === 'gender');
  assert.equal(radios.length, 4);
  assert.deepEqual(radios.map((r) => r.attrs.value), ['', 'm', 'f', 'both']);
  assert.match(root.textContent, /My gender, for Hebrew forms/); assert.match(root.textContent, /never assumes masculine/);
  assert.match(root.textContent, /included in your backup/);
  const pick = radios.find((r) => r.attrs.value === 'f'); for (const f of pick.listeners?.change || []) await f({ target: pick });
  assert.equal(settings.get('gender'), 'f');
});

const rd = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const T = JSON.parse(rd('data/gender/templates.json'));

test('gender drill reads the shared setting: unset drills nothing; both shows both forms; the page writes the setting', async () => {
  const V = await import('../src/genderdrill/genderdrill.view.js');
  const settings = createSettings(mem()); const store = mem();
  store.get = async (k) => store.m[k];
  const root = new N('main');
  const un = V.mount(root, { store, settings, genderData: { templates: T, paradigms: [] } }); await tick();
  assert.match(root.textContent, /does not guess your gender/);
  await btn(root, /^Show both forms/).click(); await tick();
  assert.equal(settings.get('gender'), 'both'); assert.ok(!('speaker' in (store.m['gender.v1'] || {})) || store.m['gender.v1'].speaker == null);
  assert.match(root.textContent, /If you are a man:/);
  un();
  // stored gender.v1 speaker 'm' is ignored when the shared setting exists and is unset
  const store2 = mem(); store2.get = async (k) => store2.m[k]; store2.m['gender.v1'] = { speaker: 'm', asked: 0, right: 0 };
  const root2 = new N('main');
  const un2 = V.mount(root2, { store: store2, settings: { get: () => null, set: () => [] }, genderData: { templates: T, paradigms: [] } }); await tick();
  assert.match(root2.textContent, /does not guess your gender/); un2();
});
