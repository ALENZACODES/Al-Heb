// together lane (R2 household profiles, R3 guest mode): slots on one device, no accounts, no sync.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, createMemoryStorage } from '../src/store.js';
import { REG_KEY, readReg, switchTo, bootProfiles, parked, GUEST, GUEST_HOURS } from '../src/shell/profile-slots.js';
import { household, addProfile, renameProfile, removeProfile, useProfile, startGuest, finishGuest, summaries, slotStore, myName, MAX_PROFILES } from '../src/together/household.js';

const T = new Date('2026-11-11T10:00:00').getTime(); // a Wednesday
const keys = (s) => { const out = []; for (let i = 0; i < s.length; i++) out.push(s.key(i)); return out.sort(); };
/** A device with one learner who has done some work, the way the app saves it. */
function device() {
  const s = createMemoryStorage();
  const store = createStore({ storage: s, window: null });
  store.set('curriculum.progress', { completed: { r01: T - 86400000, r02: T - 3600000 } });
  store.set('settings', { voice: 'f', calmMode: false });
  store.set('retention.v1', { xp: { days: { '2026-11-10': 20, '2026-11-11': 15, '2026-11-01': 99 } } });
  store.set('install.v1', { at: 1 });
  return { s, store };
}

test('before anyone adds a profile there is one learner and nothing extra is stored; starting the app changes nothing', () => {
  const { s } = device();
  const before = keys(s);
  bootProfiles(s, {});
  assert.deepEqual(keys(s), before);
  assert.equal(s.getItem(REG_KEY), null);
  assert.deepEqual(household(s).list.map((p) => [p.id, p.name, p.active]), [['p1', 'Learner 1', true]]);
  assert.equal(myName(s), '', 'no name is shown to friends until a household exists');
});

test('each profile has its own progress, streak and settings: switching moves one learner out and the other in, and back again', () => {
  const { s } = device();
  const mine = { progress: s.getItem('alef:curriculum.progress'), settings: s.getItem('alef:settings') };
  const add = addProfile('  Dana  ', s, T);
  assert.equal(add.ok, true); assert.equal(add.id, 'p2');
  assert.equal(s.getItem('alef:curriculum.progress'), mine.progress, 'adding a profile does not switch to it');
  assert.equal(useProfile('p2', s).ok, true);
  assert.equal(s.getItem('alef:curriculum.progress'), null, 'the new profile starts empty');
  assert.equal(s.getItem('alef:settings'), null);
  assert.equal(s.getItem(parked('p1') + 'curriculum.progress'), mine.progress, 'the first learner is set aside whole');
  assert.ok(s.getItem('alef:install.v1'), 'what describes the device stays where it is');
  assert.ok(s.getItem('alef:__meta') !== undefined);
  // Dana learns; the app writes through its ordinary store
  const dana = createStore({ storage: s, window: null });
  dana.set('curriculum.progress', { completed: { r01: T } }); dana.set('settings', { voice: 'm', calmMode: true });
  assert.equal(useProfile('p1', s).ok, true);
  assert.equal(s.getItem('alef:curriculum.progress'), mine.progress); assert.equal(s.getItem('alef:settings'), mine.settings);
  assert.deepEqual(JSON.parse(s.getItem(parked('p2') + 'settings')), { voice: 'm', calmMode: true });
  assert.equal(readReg(s).active, 'p1'); assert.equal(readReg(s).pending, undefined);
  assert.equal(myName(s), 'Learner 1');
});

test('a switch that is cut short is finished when the app next starts, in either half', () => {
  for (const phase of ['park', 'unpark']) {
    const { s } = device();
    addProfile('Dana', s, T); useProfile('p2', s);
    createStore({ storage: s, window: null }).set('curriculum.progress', { completed: { r09: T } });
    // going back to p1, stopped part-way: one of Dana's keys already moved out, the rest not; or p1 only half moved in
    const reg = readReg(s);
    reg.pending = { from: 'p2', to: 'p1', phase }; s.setItem(REG_KEY, JSON.stringify(reg));
    if (phase === 'unpark') { for (const k of keys(s).filter((x) => x.startsWith('alef:') && !/__meta|install/.test(x))) { s.setItem(parked('p2') + k.slice(5), s.getItem(k)); s.removeItem(k); } s.setItem('alef:settings', s.getItem(parked('p1') + 'settings')); s.removeItem(parked('p1') + 'settings'); }
    bootProfiles(s, {});
    assert.equal(readReg(s).active, 'p1', phase); assert.equal(readReg(s).pending, undefined);
    assert.deepEqual(Object.keys(JSON.parse(s.getItem('alef:curriculum.progress')).completed), ['r01', 'r02'], phase);
    assert.deepEqual(JSON.parse(s.getItem(parked('p2') + 'curriculum.progress')), { completed: { r09: T } }, phase);
    assert.ok(!keys(s).some((k) => k.startsWith(parked('p1'))), 'nothing of the learner in use is left in a slot');
  }
});

test('names: trimmed, at most 20 characters, no two alike; at most six profiles; the Name is shown as ה׳', () => {
  const { s } = device();
  assert.equal(addProfile('', s).ok, false);
  assert.equal(addProfile('   ', s).error, 'Type a name.');
  assert.equal(addProfile('learner 1', s).error, 'Someone on this device already has that name.');
  assert.equal(addProfile('A'.repeat(40), s).ok, true);
  assert.equal(household(s).list[1].name.length, 20);
  assert.equal(renameProfile('p1', 'Avi‮\u0000', s).ok, true);
  assert.equal(household(s).list[0].name, 'Avi');
  assert.equal(renameProfile('p2', 'avi', s).ok, false);
  addProfile('יהוה', s);
  assert.equal(household(s).list[2].name, 'ה׳');
  for (const n of ['C', 'D', 'E']) assert.equal(addProfile(n, s).ok, true);
  assert.equal(household(s).list.length, MAX_PROFILES); assert.equal(household(s).full, true);
  assert.match(addProfile('G', s).error, /up to 6 profiles/);
});

test('deleting: never the profile in use; a deleted profile leaves nothing behind and nobody else is touched', () => {
  const { s } = device();
  addProfile('Dana', s, T); useProfile('p2', s);
  createStore({ storage: s, window: null }).set('streak', { days: ['2026-11-11'] });
  assert.match(removeProfile('p2', s).error, /Switch to another profile first/);
  assert.equal(useProfile('p1', s).ok, true);
  assert.equal(removeProfile('p2', s).ok, true);
  assert.ok(!keys(s).some((k) => k.startsWith('alefp:')));
  assert.deepEqual(household(s).list.map((p) => p.id), ['p1']);
  assert.ok(s.getItem('alef:curriculum.progress'));
  assert.equal(removeProfile('p9', s).ok, false);
});

test('guest mode: lessons and games save as usual during the session, and ending it keeps nothing and brings the learner back untouched', () => {
  const { s } = device();
  const before = Object.fromEntries(keys(s).map((k) => [k, s.getItem(k)]));
  assert.equal(startGuest(s, T).ok, true);
  assert.equal(household(s).guest, true);
  assert.equal(s.getItem('alef:curriculum.progress'), null, 'the guest starts with nothing');
  const guest = createStore({ storage: s, window: null });
  guest.set('curriculum.progress', { completed: { r01: T } }); guest.set('games.scores.v1', { letterchomp: { best: 50 } });
  assert.match(startGuest(s, T).error, /already open/);
  assert.match(useProfile('p1', s).error, /End the guest session first/);
  assert.equal(myName(s), '', 'a guest has no name');
  const end = finishGuest(s);
  assert.equal(end.ok, true); assert.equal(end.kept, false);
  const after = Object.fromEntries(keys(s).filter((k) => k !== REG_KEY).map((k) => [k, s.getItem(k)]));
  assert.deepEqual(after, before, 'every saved value of the learner is exactly as it was, and nothing of the guest remains');
  assert.equal(readReg(s).active, 'p1'); assert.equal(readReg(s).guest, undefined);
});

test('guest mode: the guest can choose to keep it, as a new profile; a session left open for 12 hours is ended at the next start', () => {
  const { s } = device();
  startGuest(s, T);
  createStore({ storage: s, window: null }).set('curriculum.progress', { completed: { r01: T, r02: T, r03: T } });
  assert.equal(finishGuest(s, { keepAs: 'Learner 1' }).ok, false, 'the name must be free');
  const kept = finishGuest(s, { keepAs: 'Noam' }, T);
  assert.equal(kept.ok, true); assert.equal(kept.kept, true);
  assert.equal(readReg(s).active, kept.id);
  assert.equal(Object.keys(JSON.parse(s.getItem('alef:curriculum.progress')).completed).length, 3, 'what the guest did is now that profile');
  assert.ok(s.getItem(parked('p1') + 'curriculum.progress'), 'the first learner is still set aside, untouched');
  // a session nobody ended
  const d2 = device();
  startGuest(d2.s, Date.now() - (GUEST_HOURS + 1) * 3600000);
  createStore({ storage: d2.s, window: null }).set('settings', { voice: 'm' });
  bootProfiles(d2.s, {});
  assert.equal(readReg(d2.s).active, 'p1');
  assert.deepEqual(JSON.parse(d2.s.getItem('alef:settings')), { voice: 'f', calmMode: false });
  const d3 = device(); startGuest(d3.s, Date.now() - 3600000); bootProfiles(d3.s, {});
  assert.equal(readReg(d3.s).active, GUEST, 'a fresh session is left alone');
});

test('at start: a guest session shows a marker that links to Profiles, and another tab switching learner reloads this one', () => {
  const { s } = device();
  startGuest(s, Date.now());
  const made = []; let onStorage = null; let reloads = 0;
  const g = { addEventListener: (t, f) => { if (t === 'storage') onStorage = f; }, location: { reload: () => reloads++ },
    document: { body: { append: (el) => made.push(el) }, createElement: () => ({ attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } }) } };
  bootProfiles(s, g);
  assert.equal(made.length, 1); assert.equal(made[0].href, '#/profiles'); assert.equal(made[0].textContent, 'Guest session. Tap to end or keep.');
  onStorage({ key: 'alef:settings' }); assert.equal(reloads, 0);
  onStorage({ key: REG_KEY }); assert.equal(reloads, 1);
  finishGuest(s); const made2 = [];
  bootProfiles(s, { ...g, document: { ...g.document, body: { append: (el) => made2.push(el) } } });
  assert.equal(made2.length, 0, 'no marker outside a guest session');
});

test('what each learner has done is read from their own saved data: lessons, lessons and XP this week, never estimated', () => {
  const { s } = device();
  addProfile('Dana', s, T); useProfile('p2', s);
  const dana = createStore({ storage: s, window: null });
  dana.set('curriculum.progress', { completed: { r01: T - 20 * 86400000 } });
  dana.set('retention.v1', { xp: { days: { '2026-11-09': 50 } } });
  const rows = summaries(s, T);
  const by = Object.fromEntries(rows.map((r) => [r.name, r]));
  assert.deepEqual([by['Learner 1'].lessons, by['Learner 1'].lessonsWeek, by['Learner 1'].xpWeek, by['Learner 1'].active], [2, 2, 35, false]);
  assert.deepEqual([by.Dana.lessons, by.Dana.lessonsWeek, by.Dana.xpWeek, by.Dana.active], [1, 0, 50, true]);
  assert.equal(by['Learner 1'].lastLesson.id, 'r02');
  assert.equal(slotStore('p1', s).get('settings').voice, 'f');
  assert.equal(slotStore('p2', s).get('nothing', 'fallback'), 'fallback');
  addProfile('Eli', s, T);
  assert.deepEqual(summaries(s, T).find((r) => r.name === 'Eli').lessons, 0);
});

test('the app\'s own store runs the start-up check, and the two installed files of the lane stay small', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/store.js', import.meta.url), 'utf8');
  assert.ok(src.indexOf('bootProfiles();') < src.indexOf('export const store = createStore();'), 'a cut-short switch is finished before saved data is first read');
  assert.ok(readFileSync(new URL('../src/shell/profile-slots.js', import.meta.url)).length < 6000);
  assert.equal(switchTo('p1', createMemoryStorage()).active, 'p1', 'switching to the learner already in use does nothing');
});
