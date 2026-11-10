// Tradition plumbing: forTradition helpers, first-run choice reaching settings.congregation for all three options,
// and the settings write contract. Fake DOM for the onboarding view (proves logic, not browser rendering).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { N, memStore } from './torahread.fakedom.js';
import { waitFor } from './helpers/waitfor.js';
import * as FT from '../src/pronunciation/forTradition.js';
import * as SH from '../src/shell/tradition.js';
import { createSettings, ENUMS, DEFAULTS } from '../src/shell/settings.js';
import { PRONUNCIATIONS, STORE_KEY } from '../src/onboarding/model.js';
import { loadOnboardingData } from '../src/onboarding/loader.js';
import { mount } from '../src/onboarding/firstrun.view.js';

const json = (f) => JSON.parse(fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'));
const realSettings = (init = {}) => { const s = memStore(); s.m.settings = { ...init }; return createSettings(s); };

test('shell/tradition.js re-exports the same helpers', () => {
  for (const k of Object.keys(FT)) assert.equal(SH[k], FT[k], k);
});

test('normalize / congregationOf: bad values fall back to the app default, both settings shapes work', () => {
  assert.deepEqual([...FT.TRADITIONS], ENUMS.congregation.slice().sort((a, b) => FT.TRADITIONS.indexOf(a) - FT.TRADITIONS.indexOf(b)));
  assert.equal(FT.DEFAULT_TRADITION, DEFAULTS.congregation);
  assert.equal(FT.normalize('ashkenazi'), 'ashkenazi'); assert.equal(FT.normalize('klingon'), 'sephardi'); assert.equal(FT.normalize(undefined, 'israeli'), 'israeli');
  assert.equal(FT.congregationOf({ congregation: 'israeli' }), 'israeli');
  assert.equal(FT.congregationOf({ get: (k) => (k === 'congregation' ? 'ashkenazi' : undefined) }), 'ashkenazi');
  assert.equal(FT.congregationOf(null), 'sephardi'); assert.equal(FT.congregationOf({ congregation: 'x' }), 'sephardi');
});

test('contract: the real settings.set takes a patch object; set("congregation", v) changes nothing (the bug setCongregation avoids)', () => {
  const s = realSettings({ congregation: 'sephardi' });
  const rej = s.set('congregation', 'ashkenazi'); // wrong call shape
  assert.ok(rej.length > 0); assert.equal(s.congregation, 'sephardi');
  for (const t of FT.TRADITIONS) { assert.equal(FT.setCongregation(s, t), true); assert.equal(s.congregation, t); assert.equal(s.get('congregation'), t); }
  assert.equal(FT.setCongregation(s, 'bogus'), false); assert.equal(s.congregation, 'ashkenazi'); // last valid write kept
  assert.equal(FT.setCongregation(null, 'israeli'), false);
});

test('setCongregation serves older (key, value) doubles and plain objects', () => {
  const calls = []; const d = { congregation: 'x', set(k, v) { calls.push([k, v]); this.congregation = v; } };
  assert.equal(FT.setCongregation(d, 'ashkenazi'), true); assert.deepEqual(calls, [['congregation', 'ashkenazi']]);
  const plain = {}; assert.equal(FT.setCongregation(plain, 'israeli'), true); assert.equal(plain.congregation, 'israeli');
});

test('settings persist and validate every congregation value; a stored bad value is dropped', () => {
  for (const t of ENUMS.congregation) {
    const st = memStore(); const a = createSettings(st); a.set({ congregation: t });
    assert.equal(createSettings(st).congregation, t, 'reloaded from store');
  }
  const st = memStore(); st.m.settings = { congregation: 'bogus' };
  assert.equal(createSettings(st).congregation, 'sephardi');
});

test('respell: Ashkenazi differs from Israeli on kamatz / tav / holam; Israeli and Sephardi are identical (stated, not hidden)', () => {
  const w = 'שַׁבָּת'; const r = FT.respellAll('בָּרוּךְ אַתָּה יְהוָה שַׁבָּת');
  assert.equal(FT.respell(w, 'ashkenazi'), 'shabos'); assert.equal(FT.respell(w, 'israeli'), 'shabat');
  assert.match(r.ashkenazi, /^borukh atoh /); assert.match(r.israeli, /^barukh atah /);
  assert.equal(r.sameIsraeliSephardi, true); assert.equal(r.differs, true);
  assert.equal(FT.respell('', 'israeli'), ''); assert.equal(FT.respell('שלום', 'nonsense'), FT.respell('שלום', 'sephardi'));
});

test('vowelSound / letterSound read the tradition from the pronunciation data', () => {
  const niq = json('data/pronunciation/niqqud.json').records.find((r) => r.id === 'kamatz');
  assert.match(FT.vowelSound(niq, 'ashkenazi').en, /^aw as in saw/); assert.equal(FT.vowelSound(niq, 'ashkenazi').ipa, '[ɔ]');
  assert.match(FT.vowelSound(niq, 'israeli').en, /father/); assert.ok(FT.vowelSound(niq, 'sephardi').en);
  assert.equal(FT.vowelSound(null, 'israeli').en, '');
  const tav = json('data/pronunciation/consonants.json').letters.tav;
  assert.equal(FT.letterSound(tav, 'ashkenazi', { dagesh: false }).en, 's');
  assert.equal(FT.letterSound(tav, 'ashkenazi', { dagesh: true }).en, 't');
  assert.equal(FT.letterSound(tav, 'sephardi', { dagesh: false }).en, 't');
  assert.equal(FT.letterSound(tav, 'israeli').en, 't'); assert.equal(FT.letterSound(tav, 'ashkenazi').changes, true);
  assert.match(FT.letterSound(tav, 'ashkenazi').en, /Shabbos/);
  assert.deepEqual(FT.letterSound(undefined, 'israeli', { fallbackEn: 't as in top' }), { en: 't as in top', ipa: '', changes: false });
});

test('audioNote never claims a non-Israeli voice', () => {
  assert.match(FT.audioNote('israeli'), /reads it in Israeli Hebrew/);
  for (const t of ['ashkenazi']) { const n = FT.audioNote(t); assert.match(n, /Israeli Hebrew/); assert.match(n, /Ashkenazi way to say it is written in English letters/); assert.doesNotMatch(n, /Ashkenazi (voice|recording)/); }
  // the Sephardi setting plays Israeli sound by rule (owner decision 2026-11-07): the note says so and claims no Sephardi voice
  const sep = FT.audioNote('sephardi'); assert.match(sep, /in Israeli Hebrew\. The Sephardi way to say it is written in English letters/); assert.doesNotMatch(sep, /Sephardi voice|Sephardi recording exists/);
  assert.equal(FT.audioNote('ashkenazi', { hasRecording: true }), '');
  assert.equal(FT.israeliOnly(), 'israeli');
});

// ---------- first-run: which tradition do you pray with? ----------
const D = await loadOnboardingData();
const mk = (settingsInit = {}) => {
  const root = new N('div'); const store = memStore();
  store.m[STORE_KEY] = { v: 1, letters: 'none', start: '/firstday', askedAt: 'x', denomination: null, minutesPerDay: null, step: 'congregation' };
  const sstore = memStore(); sstore.m.settings = { ...settingsInit };
  const settings = createSettings(sstore);
  const ctx = { store, settings, t: (k) => k, route: () => {}, hasRoute: () => true, onboardingData: D, clock: { now: () => 1_800_000_000_000 } };
  return { root, settings, sstore, ctx };
};
const ready = (root) => waitFor(() => root.querySelector('#ob-form-congregation'), { message: 'stage 2 never rendered' });
const pick = async (root, value) => {
  const i = root.queryAll(`input[name="pron"][value="${value}"]`)[0]; assert.ok(i, value);
  for (const o of root.queryAll('input[name="pron"]')) o.checked = o === i; await i.fire('change');
};

test('first run offers exactly the three settings values', () => {
  assert.deepEqual(PRONUNCIATIONS.map((p) => p.id).sort(), [...ENUMS.congregation].sort());
});

for (const t of ['israeli', 'sephardi', 'ashkenazi']) {
  test(`first run: choosing ${t} reaches settings.congregation and survives a reload`, async () => {
    const start = t === 'ashkenazi' ? 'israeli' : 'ashkenazi'; // start from a different value so a no-op cannot pass
    const { root, settings, sstore, ctx } = mk({ congregation: start });
    mount(root, ctx); await ready(root);
    await pick(root, t);
    await root.querySelector('#ob-form-congregation').fire('submit');
    assert.equal(settings.get('congregation'), t); assert.equal(settings.congregation, t);
    assert.equal(createSettings(sstore).congregation, t, 'persisted in the settings store');
  });
}

test('first run: Skip keeps the existing value (default sephardi when never set)', async () => {
  const { root, settings, ctx } = mk();
  mount(root, ctx); await ready(root);
  await root.querySelector('#ob-congregation-skip').click();
  assert.equal(settings.congregation, 'sephardi');
});

// ---------- write-contract guard ----------
test('no pronunciation file calls settings.set("congregation", ...) with the wrong shape', () => {
  const bad = /settings\??\.set\(\s*['"]congregation['"]/;
  for (const f of fs.readdirSync(new URL('../src/pronunciation/', import.meta.url))) {
    if (!f.endsWith('.js') || f === 'forTradition.js') continue;
    const src = fs.readFileSync(new URL('../src/pronunciation/' + f, import.meta.url), 'utf8');
    assert.ok(!bad.test(src), `${f} uses the old (key, value) call; use setCongregation()`);
  }
});

test('audioSupport: never promises recorded or non-Israeli sound that does not exist', () => {
  assert.equal(FT.audioSupport('israeli').supported, 'device');
  // Sephardi plays the Israeli clips by rule (owner decision 2026-11-07), so the Israeli device voice is no mismatch for it
  const sep = FT.audioSupport('sephardi');
  assert.equal(sep.supported, 'device'); assert.match(sep.line, /Israeli Hebrew\. The Sephardi way to say it is written in English letters/);
  for (const t of ['ashkenazi']) {
    const s = FT.audioSupport(t);
    assert.equal(s.supported, 'none'); assert.equal(s.deviceVoice, false); assert.match(s.line, /English letters/);
    assert.equal(FT.audioSupport(t, { browserVoiceAnyway: true }).supported, 'device-mismatch');
    assert.match(FT.audioSupport(t, { browserVoiceAnyway: true }).line, /will not sound/);
  }
  assert.equal(FT.audioSupport('ashkenazi', { audioFree: true }).supported, 'off');
  assert.equal(FT.audioSupport('israeli', { recorded: 3 }).supported, 'recorded');
  assert.doesNotMatch(FT.audioSupport('israeli').line, /recorded teacher|human/i);
});
