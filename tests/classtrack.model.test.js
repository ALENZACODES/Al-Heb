import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, createMemoryStorage } from '../src/store.js';
import { matchRoute } from '../src/shell/router.js';
import * as M from '../src/classtrack/model.js';

const D = await M.loadClassTrack();
const validRoute = (r) => { const p = r.startsWith('#') ? r : '#' + r; return !!matchRoute(p.split('?')[0]).route; };

test('data validates: 10 weeks, real lesson ids, corpus ids, soundgap ids, hint kinds, routes, minutes add up', () => {
  assert.deepEqual(M.validate(D, { validRoute }), []);
});

test('read-aloud texts in "read" weeks use only letters and signs taught by that week', () => {
  assert.ok(D.track.weeks.filter((w) => w.readAloud.mode === 'read').length >= 6);
  assert.deepEqual(M.validate(D).filter((x) => /not decodable/.test(x)), []);
});

test('validate catches a bad lesson id, an unknown text and an undecodable early read', () => {
  const bad = structuredClone(D); bad.track.weeks[0].lessons.push('r999'); bad.track.weeks[0].readAloud = { mode: 'read', ids: [{ id: 'aleinu-1' }] };
  bad.track.weeks[1].readAloud.ids.push({ id: 'nope' });
  const p = M.validate(bad);
  assert.ok(p.some((x) => /unknown lesson r999/.test(x)) && p.some((x) => /unknown text nope/.test(x)) && p.some((x) => /aleinu-1 not decodable/.test(x)));
});

test('every Aleph core lesson appears at most once and the plan is ordered by Aleph lesson number', () => {
  const ids = D.track.weeks.flatMap((w) => w.lessons);
  assert.equal(new Set(ids).size, ids.length);
  const read = ids.filter((i) => /^r\d+$/.test(i)).map((i) => Number(i.slice(1)));
  assert.deepEqual(read, [...read].sort((a, b) => a - b));
});

test('no copyrighted material: no field quotes a book and the note says original', () => {
  assert.match(D.track.note, /original/i);
  assert.doesNotMatch(JSON.stringify(D.track), /Motzkin|Behrman|Aleph Isn.t Tough/i);
  assert.match(D.track.status, /not-educator-reviewed/);
});

test('progress: derived from curriculum.progress, current week moves forward', async () => {
  const st = createStore({ storage: createMemoryStorage() });
  const ws = D.track.weeks;
  assert.equal(M.currentWeekIndex(ws, await M.readCompleted(st)), 0);
  st.set('curriculum.progress', { completed: Object.fromEntries(ws[0].lessons.map((i) => [i, 1])) });
  const c = await M.readCompleted(st);
  assert.deepEqual([M.weekStatus(ws[0], c).done, M.weekStatus(ws[0], c).complete], [ws[0].lessons.length, true]);
  assert.equal(M.currentWeekIndex(ws, c), 1);
  st.set('curriculum.progress', { completed: Object.fromEntries(ws.flatMap((w) => w.lessons).map((i) => [i, 1])) });
  assert.equal(M.currentWeekIndex(ws, await M.readCompleted(st)), -1);
});

test('readCompleted survives corrupt values and a throwing store', async () => {
  const st = createStore({ storage: createMemoryStorage() }); st.set('curriculum.progress', 'oops');
  assert.deepEqual(await M.readCompleted(st), {});
  assert.deepEqual(await M.readCompleted({ get() { throw new Error('x'); } }), {});
  assert.deepEqual(await M.readCompleted(undefined), {});
});

test('newInWeek partitions the alphabet taught and commonErrors reads existing data', () => {
  const all = D.track.weeks.flatMap((_, i) => M.newInWeek(D, i).letters);
  assert.equal(new Set(all).size, all.length);
  assert.ok(all.length >= 27);
  const e = M.commonErrors(D, D.track.weeks[0]);
  assert.ok(e.gaps.length >= 1 && e.kinds.length >= 1 && e.gaps.every((g) => g.trap));
});
