import test from "node:test";
import assert from "node:assert/strict";
import * as R from "../src/curriculum/reminders.js";
import * as N from "../src/curriculum/reminders.notify.js";
import * as L from "../src/curriculum/calendar.locations.js";
import * as C from "../src/curriculum/calendar.js";

const toronto = () => L.normalizePrefs({ locationId: "toronto" });
const kinds = (items) => items.reduce((m, i) => ((m[i.kind] = (m[i.kind] || 0) + 1), m), {});

test("buildReminders: 4 weeks for Toronto gives candles, havdalah, holidays and daily prayer moments", () => {
  const { items, notes } = R.buildReminders(toronto(), "2026-11-04", "2026-12-01");
  assert.deepEqual(notes, []);
  const k = kinds(items);
  assert.equal(k.candles, 4); assert.equal(k.havdalah, 4); assert.equal(k.morning, 28); assert.equal(k.evening, 28);
  assert.equal(k.holiday ?? 0, 0); // Hanukkah starts 12-05
  const c = items.find((i) => i.uid === "alef-candles-2026-11-06");
  assert.equal(C.formatTime(c.when.at, "America/Toronto"), "16:43"); // Hebcal showed 16:43 for this Friday
  assert.match(c.description, /Chayei Sara/);
  assert.match(c.description, /approximate/);
  assert.equal(c.alarmMin, 30);
  const h = items.find((i) => i.uid === "alef-havdalah-2026-11-07");
  assert.equal(C.formatTime(h.when.at, "America/Toronto"), "17:45");
  assert.ok(h.when.at > c.when.at);
});

test("sorted, unique uids, deterministic", () => {
  const a = R.buildReminders(toronto(), "2026-11-04", "2027-01-31").items;
  const b = R.buildReminders(toronto(), "2026-11-04", "2027-01-31").items;
  assert.equal(new Set(a.map((i) => i.uid)).size, a.length);
  for (let i = 1; i < a.length; i++) assert.ok(R.itemStart(a[i]) >= R.itemStart(a[i - 1]));
  assert.deepEqual(a.map((i) => i.uid), b.map((i) => i.uid));
});

test("no location: candle lighting and havdalah are skipped with a note, prayer moments remain", () => {
  const { items, notes } = R.buildReminders(L.normalizePrefs(null), "2026-11-04", "2026-11-10");
  assert.equal(kinds(items).candles, undefined);
  assert.equal(kinds(items).morning, 7);
  assert.match(notes[0], /No location/);
  // fallback location from the shell settings
  const r = R.buildReminders(L.normalizePrefs(null), "2026-11-04", "2026-11-10", { fallbackLocation: { lat: 43.65, lon: -79.38, tz: "America/Toronto" } });
  assert.equal(kinds(r.items).candles, 1);
});

test("festival eves: Friday eve of Rosh Hashanah 5788 merges with Shabbat; other eves get their own candle lighting", () => {
  const p = L.normalizePrefs({ locationId: "new-york" });
  const { items } = R.buildReminders(p, "2027-09-28", "2027-10-12");
  const fri = items.find((i) => i.uid === "alef-candles-2027-10-01");
  assert.match(fri.title, /Shabbat and Rosh Hashanah/);
  const yk = items.find((i) => i.uid === "alef-candles-2027-10-10");
  assert.match(yk.title, /Yom Kippur/);
  const tz = "America/New_York";
  assert.ok(C.formatTime(yk.when.at, tz) < "19:00" && C.formatTime(yk.when.at, tz) > "17:00");
  assert.ok(items.some((i) => i.kind === "holiday" && i.title === "Rosh Hashanah" && i.when.type === "allday"));
});

test("holiday items are all-day with a multi-day end date (Hanukkah) and a 09:00-the-day-before alarm", () => {
  const { items } = R.buildReminders(toronto(), "2026-12-01", "2026-12-31");
  const h = items.find((i) => i.kind === "holiday" && i.title === "Hanukkah");
  assert.deepEqual([h.when.y, h.when.m, h.when.d, h.when.endD], [2026, 12, 5, 12]);
  assert.equal(h.alarmMin, 900);
});

test("Rosh Chodesh only when switched on; reminder kinds can be turned off", () => {
  const off = R.buildReminders(L.normalizePrefs({ locationId: "toronto" }), "2026-11-04", "2026-12-31").items;
  assert.equal(kinds(off).roshchodesh, undefined);
  const on = R.buildReminders(L.normalizePrefs({ locationId: "toronto", remind: { roshChodesh: true } }), "2026-11-04", "2026-12-31").items;
  assert.ok(kinds(on).roshchodesh >= 2);
  const none = R.buildReminders(L.normalizePrefs({ locationId: "toronto", remind: { candles: false, havdalah: false, holidays: false, morning: false, evening: false } }), "2026-11-04", "2026-12-31");
  assert.deepEqual(none.items, []);
});

test("prayer moments use the chosen times and floating wall-clock semantics", () => {
  const p = L.normalizePrefs({ locationId: "toronto", morningTime: "06:15", eveningTime: "22:05" });
  const { items } = R.buildReminders(p, "2026-11-04", "2026-11-04");
  const m = items.find((i) => i.kind === "morning"), e = items.find((i) => i.kind === "evening");
  assert.deepEqual([m.when.type, m.when.hh, m.when.mm], ["floating", 6, 15]);
  assert.deepEqual([e.when.hh, e.when.mm], [22, 5]);
  assert.match(m.description, /Draft/);
  assert.match(m.description, /[א-ת]/);
});

test("Israeli city: candle minutes 40 in Jerusalem; Israel Torah schedule chosen automatically", () => {
  const j = L.normalizePrefs({ locationId: "jerusalem" });
  const { items } = R.buildReminders(j, "2026-11-04", "2026-11-08");
  const c = items.find((i) => i.kind === "candles");
  assert.match(c.description, /40 minutes before sunset/);
  assert.equal(c.when.at.getTime(), 1793973900000); // Hebcal snapshot value for Jerusalem 2026-11-06 (16:05 local) in data/calendar/hebcal-fixtures.json
  assert.equal(C.formatTime(c.when.at, "Asia/Jerusalem"), "16:05");
});

test("window limits: empty range, too long", () => {
  assert.deepEqual(R.buildReminders(toronto(), "2026-11-05", "2026-11-04").items, []);
  assert.throws(() => R.buildReminders(toronto(), "2026-01-01", "2027-12-31"), RangeError);
});

test("upcoming() and alarmTime()", () => {
  const { items } = R.buildReminders(toronto(), "2026-11-04", "2026-11-12");
  const now = new Date(2026, 10, 6, 12, 0); // device-local
  const up = R.upcoming(items, now, 3);
  assert.equal(up.length, 3);
  assert.ok(up.every((i) => R.itemStart(i) >= now));
  const c = items.find((i) => i.kind === "candles");
  assert.equal(R.itemStart(c) - R.alarmTime(c), 30 * 60000);
  assert.equal(R.alarmTime({ ...c, alarmMin: null }), null);
});

// ---------- notifications ----------
function fakeEnv(permission) {
  const timers = [];
  const fired = [];
  class Notif { constructor(title, opts) { fired.push([title, opts]); } }
  Notif.permission = permission;
  return { timers, fired, Notification: Notif, setTimer: (fn, ms) => (timers.push({ fn, ms }), timers.length), clearTimer: (id) => { timers[id - 1].cleared = true; } };
}

test("notifications: only with granted permission, only future items inside the horizon, honest cancel", () => {
  const { items } = R.buildReminders(toronto(), "2026-11-04", "2026-11-09", {});
  const now = new Date(2026, 10, 6, 7, 0); // device-local Friday 07:00
  const env = fakeEnv("granted");
  const r = N.scheduleLocalNotifications(items, { now, ...env });
  assert.ok(r.count >= 3);
  for (const t of env.timers) assert.ok(t.ms > 0 && t.ms <= N.NOTIFY_HORIZON_MS);
  env.timers[0].fn();
  assert.equal(env.fired.length, 1);
  assert.ok(env.fired[0][1].tag.startsWith("alef-"));
  r.cancel();
  assert.ok(env.timers.every((t) => t.cleared));
  for (const perm of ["default", "denied"]) assert.equal(N.scheduleLocalNotifications(items, { now, ...fakeEnv(perm) }).count, 0);
  assert.equal(N.scheduleLocalNotifications(items, { now, Notification: undefined, setTimer() {}, clearTimer() {} }).count, 0);
});

test("notification support and permission helpers", async () => {
  assert.deepEqual(N.notificationSupport({}), { supported: false, permission: "unsupported" });
  assert.deepEqual(N.notificationSupport({ Notification: { permission: "denied" } }), { supported: true, permission: "denied" });
  assert.equal(await N.requestNotificationPermission({}), "unsupported");
  assert.equal(await N.requestNotificationPermission({ Notification: { permission: "default", requestPermission: async () => "granted" } }), "granted");
  assert.equal(await N.requestNotificationPermission({ Notification: { permission: "default", requestPermission: async () => { throw new Error("x"); } } }), "default");
});
