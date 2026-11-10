import test from 'node:test';
import assert from 'node:assert/strict';
import { REMINDER_KEY, FIRST_AT, AGAIN_AFTER, SNOOZE_DAYS, reminderDue, afterExport, snoozed, completedCount, readRecord, reminderText, reminderNode } from '../src/shell/backup-reminder.js';

const NOW = Date.parse('2027-01-15T08:00:00Z');
const DAY = 86_400_000;

test('no reminder before meaningful progress; reminder once there is some and no backup file yet', () => {
  assert.equal(REMINDER_KEY, 'backup.reminder.v1');
  assert.equal(reminderDue({ completed: 0, now: NOW }), false);
  assert.equal(reminderDue({ completed: FIRST_AT - 1, now: NOW }), false);
  assert.equal(reminderDue({ completed: FIRST_AT, now: NOW }), true);
});
test('after a downloaded backup the reminder waits for more progress', () => {
  const r = afterExport(null, 4, NOW);
  assert.equal(r.lastExportCompleted, 4); assert.equal(r.lastExportAt, new Date(NOW).toISOString());
  assert.equal(reminderDue({ completed: 4 + AGAIN_AFTER - 1, record: r, now: NOW }), false);
  assert.equal(reminderDue({ completed: 4 + AGAIN_AFTER, record: r, now: NOW }), true);
});
test('"Not now" hides it for a week, then it comes back', () => {
  const r = snoozed(null, NOW);
  assert.equal(reminderDue({ completed: 10, record: r, now: NOW + DAY }), false);
  assert.equal(reminderDue({ completed: 10, record: r, now: NOW + SNOOZE_DAYS * DAY + 1 }), true);
  assert.equal(afterExport(r, 10, NOW).snoozeUntil, null, 'a real backup clears the snooze');
});
test('bad stored values are ignored; completed count reads curriculum progress', () => {
  assert.deepEqual(readRecord('junk'), { lastExportAt: null, lastExportCompleted: 0, snoozeUntil: null });
  assert.equal(completedCount({ completed: { r01: 1, r02: 2 } }), 2);
  assert.equal(completedCount(null), 0);
});
test('wording: says where progress lives and never implies an automatic backup', () => {
  const t = reminderText(5, readRecord(null));
  assert.match(t, /only in this browser on this device/);
  assert.match(t, /Nothing copies it anywhere for you/);
  assert.doesNotMatch(t, /automatically (backed|saved)|auto-?backup|synced|in the cloud|we back up/i);
  assert.match(reminderText(9, afterExport(null, 4, NOW)), /finished 5 more since your last backup file/);
});
test('card: links to Settings; Not now calls back and removes the card', () => {
  const h = (tag, attrs = {}, ...kids) => ({ tag, attrs, kids, removed: false, remove() { this.removed = true; } });
  let snoozedCalls = 0;
  const card = reminderNode(h, { completed: 3, onSnooze: () => { snoozedCalls++; } });
  const flat = (n) => [n, ...(n.kids || []).flatMap((k) => (k && typeof k === 'object' ? flat(k) : []))];
  const nodes = flat(card);
  assert.ok(nodes.some((n) => n.tag === 'a' && n.attrs.href === '#/settings'));
  const later = nodes.find((n) => n.attrs?.id === 'backup-remind-later');
  later.attrs.onclick();
  assert.equal(snoozedCalls, 1); assert.equal(card.removed, true);
});
