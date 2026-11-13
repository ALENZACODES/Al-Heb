import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults, normalize } from '../../src/retention/state.js';
import { markLogin, loginView, LOGIN } from '../../src/retention/recap.js';
import { T } from './_helpers.js';

const start = T('2026-11-01T10:00');
const fresh = () => defaults(start, 'install-login');

test('opening the app marks today, and a gap stays empty with no scolding', () => {
  const mon = markLogin(fresh(), T('2026-11-02T10:00'));
  assert.equal(mon.lastBootDay, '2026-11-02');
  assert.deepEqual(mon.loginDays, ['2026-11-02']);
  const later = markLogin(mon, T('2026-11-04T10:00'));
  const v = loginView(later, T('2026-11-04T10:00'));
  assert.equal(v.count, 2);
  const d2 = v.cells.find((c) => c.day === '2026-11-02');
  const d3 = v.cells.find((c) => c.day === '2026-11-03');
  const d4 = v.cells.find((c) => c.day === '2026-11-04');
  const d5 = v.cells.find((c) => c.day === '2026-11-05');
  assert.equal(d2.state, 'on');
  assert.equal(d3.state, 'gap');
  assert.equal(d4.state, 'today-on');
  assert.equal(d5.state, 'ahead');
  assert.equal(v.days, 30);
  assert.equal(v.weekday0, 0); // 1 Nov 2026 is Sunday
});

test('seven open days in the month pay 5 gems once, even when they are not consecutive', () => {
  let r = fresh();
  const days = ['2026-11-01', '2026-11-02', '2026-11-04', '2026-11-05', '2026-11-07', '2026-11-08', '2026-11-10'];
  let last = null;
  for (const d of days) {
    last = markLogin(r, T(`${d}T10:00`));
    r = last;
  }
  assert.deepEqual(last.loginJustPaid, ['d7']);
  assert.equal(last.gems.balance, LOGIN.gems7);
  assert.deepEqual(last.loginPaid['2026-11'], ['d7']);
  const again = markLogin(last, T('2026-11-10T18:00'));
  assert.equal(again.loginJustPaid, undefined);
  assert.equal(again.gems.balance, 5);
});

test('14 days pay 10 more gems, and a full month pays 20 gems on the last day if every day was opened', () => {
  let r = fresh();
  for (let i = 1; i <= 14; i++) r = markLogin(r, T(`2026-11-${String(i).padStart(2, '0')}T10:00`));
  assert.ok(r.loginPaid['2026-11'].includes('d7'));
  assert.ok(r.loginPaid['2026-11'].includes('d14'));
  assert.equal(r.gems.balance, LOGIN.gems7 + LOGIN.gems14);
  for (let i = 15; i <= 30; i++) r = markLogin(r, T(`2026-11-${String(i).padStart(2, '0')}T10:00`));
  assert.ok(r.loginPaid['2026-11'].includes('month'));
  assert.equal(r.gems.balance, LOGIN.gems7 + LOGIN.gems14 + LOGIN.gemsMonth);
  const v = loginView(r, T('2026-11-30T10:00'));
  assert.equal(v.count, 30);
  assert.equal(v.cells.every((c) => c.state === 'on' || c.state === 'today-on'), true);
});

test('a new month starts the count again, and normalize keeps only day keys', () => {
  let r = markLogin(fresh(), T('2026-11-10T10:00'));
  r.loginPaid = { '2026-11': ['d7'] };
  r = markLogin(r, T('2026-12-01T10:00'));
  assert.equal(loginView(r, T('2026-12-01T10:00')).count, 1);
  assert.deepEqual(r.loginPaid['2026-11'], ['d7']);
  assert.deepEqual(r.loginPaid['2026-12'] || [], []);
  const n = normalize({ v: 1, loginDays: ['2026-11-02', 'nope', '2026-11-04'], loginPaid: { '2026-11': ['d7', 'secret'], 'bad': ['d7'] } }, T('2026-11-10T10:00'));
  assert.deepEqual(n.loginDays, ['2026-11-02', '2026-11-04']);
  assert.deepEqual(n.loginPaid['2026-11'], ['d7']);
  assert.equal(n.loginPaid.bad, undefined);
});
