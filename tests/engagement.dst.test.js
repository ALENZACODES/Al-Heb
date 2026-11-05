/**
 * Engagement / streak day boundaries across daylight-saving changes, with a controlled (fake) clock.
 * Zones: America/Toronto (changes on 2026-03-08 spring forward, 2026-11-01 fall back) and Asia/Jerusalem
 * (changes on Friday 2026-03-27 spring forward, Sunday 2026-10-25 fall back; NO change on the two Toronto dates).
 * Covers: day keys, accrued seconds, midnight crossing, no phantom gap on a 23 h / 25 h day, Shabbat rest day next to
 * the change, and the reminder/rescue planners (a wall-clock time that does not exist or occurs twice).
 * Node re-reads process.env.TZ at runtime, so each test switches zone itself and restores it.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createEngagement } from "../src/morning/engage.js";
import { createMorningModel } from "../src/morning/model.js";
import * as S from "../src/curriculum/streak.js";
import * as P from "../src/morning/plan.js";
import { scheduleLocalNotifications } from "../src/curriculum/reminders.notify.js";
import { nextOccurrence } from "../src/shell/notify.js";

const withTZ = (tz, fn) => { const old = process.env.TZ; process.env.TZ = tz; try { return fn(); } finally { if (old === undefined) delete process.env.TZ; else process.env.TZ = old; } };
const at = (iso, h = 12, mi = 0, s = 0) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d, h, mi, s).getTime(); };
const fakeStore = (init = {}) => { const m = new Map(Object.entries(init)); return { get: (k, f) => (m.has(k) ? structuredClone(m.get(k)) : f), set: (k, v) => void m.set(k, structuredClone(v)) }; };
const v2 = (o) => ({ v: 2, count: 0, best: 0, last: null, ...o });
const offset = (iso, h) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d, h).getTimezoneOffset(); };

function device({ record, prefs, cal } = {}) {
  const store = fakeStore({ ...(record ? { streak: record } : {}), ...(prefs ? { "morning.prefs": prefs } : {}), ...(cal ? { "calendar.prefs": cal } : {}) });
  let clockT = 0;
  const model = createMorningModel(store, () => new Date(clockT));
  const eng = createEngagement(model.io, { extraRest: () => model.extraRest() });
  return {
    store, model, eng,
    open(t) { clockT = t; model.syncRecord(); eng.resume(t); },
    study(t, sec) { clockT = t; eng.setRoute(true, t); for (let i = 1; i <= sec; i++) { clockT = t + i * 1000; if (i % 20 === 0) eng.interact(clockT); eng.tick(clockT); } eng.setRoute(false, clockT); return clockT; },
    shown(t) { clockT = t; return model.project(); },
    rec() { return store.get("streak"); },
  };
}

const CASES = [
  { tz: "America/Toronto", date: "2026-03-08", kind: "spring", hoursInDay: 23 },
  { tz: "America/Toronto", date: "2026-11-01", kind: "fall", hoursInDay: 25 },
  { tz: "Asia/Jerusalem", date: "2026-03-27", kind: "spring", hoursInDay: 23 },
  { tz: "Asia/Jerusalem", date: "2026-10-25", kind: "fall", hoursInDay: 25 },
];

test("zone sanity: the four real transitions exist, and Jerusalem has none on the two Toronto dates", () => {
  for (const c of CASES) withTZ(c.tz, () => {
    const len = (at(S.addDaysISO(c.date, 1), 0) - at(c.date, 0)) / 3600000;
    assert.equal(len, c.hoursInDay, `${c.tz} ${c.date}`);
  });
  withTZ("Asia/Jerusalem", () => { for (const d of ["2026-03-08", "2026-11-01"]) assert.equal((at(S.addDaysISO(d, 1), 0) - at(d, 0)) / 3600000, 24, d); });
  withTZ("America/Toronto", () => { assert.equal(offset("2026-03-07", 12), 300); assert.equal(offset("2026-03-09", 12), 240); assert.equal(offset("2026-10-31", 12), 240); assert.equal(offset("2026-11-02", 12), 300); });
});

for (const c of CASES) {
  test(`${c.tz} ${c.date} (${c.kind}): five consecutive study days around the change count 5, keys stay consecutive`, () => withTZ(c.tz, () => {
    const d = device();
    let t = at(S.addDaysISO(c.date, -2), 12);
    d.open(t);
    for (let i = 0; i < 5; i++) {
      const day = S.addDaysISO(c.date, -2 + i);
      t = at(day, 12); d.open(t);
      const end = d.study(t, 300);
      assert.equal(S.dayKey(end), day);
      assert.equal(d.shown(end).activeToday, true, day);
    }
    const p = d.shown(at(S.addDaysISO(c.date, 2), 23, 0));
    assert.equal(p.count, 5); assert.equal(p.broken, false);
    assert.deepEqual(d.rec().doneDates, [-2, -1, 0, 1, 2].map((n) => S.addDaysISO(c.date, n)));
  }));

  test(`${c.tz} ${c.date}: elapsed engaged seconds are real seconds on the ${c.hoursInDay} h day (2 h of study from 00:30 = 7200 s, day key unchanged)`, () => withTZ(c.tz, () => {
    const d = device();
    const t0 = at(c.date, 0, 30); d.open(t0);
    const end = d.study(t0, 7200);
    assert.equal(S.dayKey(end), c.date);
    assert.equal(d.eng.seconds(), 7200);
    assert.equal(d.rec().todaySeconds, 7200);
    assert.equal(d.rec().todayDate, c.date);
  }));

  test(`${c.tz} ${c.date}: no phantom gap — done on the change day, opened 5 minutes after the next midnight, streak intact`, () => withTZ(c.tz, () => {
    const prev = S.addDaysISO(c.date, -1), next = S.addDaysISO(c.date, 1);
    const rec = v2({ count: 3, best: 3, last: c.date, doneDates: [S.addDaysISO(c.date, -2), prev, c.date] });
    const p = S.projectStreak(rec, at(next, 0, 5));
    assert.equal(p.count, 3); assert.equal(p.broken, false);
    // done the day BEFORE, nothing on the change day, opened after the next midnight: exactly one missed day -> broken (not a 23/25 h artefact)
    const q = S.projectStreak(v2({ count: 3, best: 3, last: prev }), at(next, 0, 5));
    assert.equal(q.count, 0); assert.equal(q.broken, true); assert.equal(q.best, 3);
    // done the day before, opened late on the change day itself: still alive
    assert.equal(S.projectStreak(v2({ count: 3, best: 3, last: prev }), at(c.date, 23, 59)).count, 3);
  }));

  test(`${c.tz} ${c.date}: crossing local midnight into the change day banks nothing across it`, () => withTZ(c.tz, () => {
    const prev = S.addDaysISO(c.date, -1);
    const d = device();
    const t0 = at(prev, 23, 58); d.open(t0);
    const end = d.study(t0, 240); // 23:58 -> 00:02 wall clock (the change itself is at 02:00/03:00, after this)
    assert.equal(S.dayKey(end), c.date);
    assert.ok(d.eng.seconds() >= 118 && d.eng.seconds() <= 122, `seconds on the new day: ${d.eng.seconds()}`);
    assert.notEqual(d.shown(end).activeToday, true);
  }));

  test(`${c.tz} ${c.date}: a wall-clock reminder at 02:30 yields exactly one notification that day and never two in a row`, () => withTZ(c.tz, () => {
    const prefs = P.normalizePrefs({ on: true, time: "02:30" });
    const items = P.morningItems(S.addDaysISO(c.date, -1), 3, prefs, [], { observant: false });
    assert.equal(items.length, 3);
    const fired = [];
    const N = class { constructor(t) { fired.push(t); } }; N.permission = "granted";
    const timers = [];
    const r = scheduleLocalNotifications(items, { now: new Date(at(S.addDaysISO(c.date, -1), 0, 0)), horizonMs: 5 * 86400000, Notification: N, setTimer: (fn, delay) => { timers.push(delay); return timers.length; }, clearTimer() {} });
    assert.equal(r.count, 3);
    for (let i = 1; i < timers.length; i++) assert.ok(timers[i] > timers[i - 1], "strictly increasing fire times");
    // the gap between consecutive 02:30 reminders is 24 h on ordinary neighbours; the change day shifts it by the DST hour, not by a day
    const gaps = timers.slice(1).map((x, i) => (x - timers[i]) / 3600000);
    assert.ok(gaps.every((g) => g >= 22 && g <= 26), `gaps ${gaps}`);
    // the nextOccurrence planner (study reminder) also lands once per local day
    const a = nextOccurrence({ hour: 2, minute: 30, days: [0, 1, 2, 3, 4, 5, 6] }, new Date(at(S.addDaysISO(c.date, -1), 12)));
    const b = nextOccurrence({ hour: 2, minute: 30, days: [0, 1, 2, 3, 4, 5, 6] }, a);
    assert.equal(S.dayKey(a), c.date); assert.equal(S.dayKey(b), S.addDaysISO(c.date, 1));
    assert.ok(b > a);
  }));

  test(`${c.tz} ${c.date}: evening rescue and morning card key off wall-clock time on the change day`, () => withTZ(c.tz, () => {
    const prev = S.addDaysISO(c.date, -1);
    const rec = v2({ count: 4, best: 4, last: prev });
    const prefs = P.normalizePrefs({ on: true, time: "07:00", rescueTime: "20:00" });
    assert.equal(P.rescueState(at(c.date, 19, 59), rec, prefs, { observant: false }).banner, false);
    assert.equal(P.rescueState(at(c.date, 20, 0), rec, prefs, { observant: false }).banner, true);
    assert.equal(P.morningPresent(at(c.date, 6, 59), prefs, { observant: false }), false);
    assert.equal(P.morningPresent(at(c.date, 7, 0), prefs, { observant: false }), true);
  }));
}

test("Shabbat rest day beside the change: Toronto Fri 6 Mar done, Sat 7 Mar rest, Sun 8 Mar (spring forward) done -> streak 2, no break", () => withTZ("America/Toronto", () => {
  const d = device({ record: v2({ count: 1, best: 1, last: "2026-03-06", doneDates: ["2026-03-06"], freeze: true }), prefs: { observant: true } });
  assert.equal(d.shown(at("2026-03-07", 12)).restToday, true);
  assert.equal(d.shown(at("2026-03-07", 12)).count, 1);
  const t = at("2026-03-08", 9); d.open(t); const end = d.study(t, 300);
  assert.equal(d.shown(end).count, 2);
}));
test("Shabbat rest day beside the change: Toronto Fri 30 Oct done, Sat 31 Oct rest, Sun 1 Nov (fall back) done -> 2", () => withTZ("America/Toronto", () => {
  const d = device({ record: v2({ count: 1, best: 1, last: "2026-10-30", doneDates: ["2026-10-30"], freeze: true }), prefs: { observant: true } });
  const t = at("2026-11-01", 9); d.open(t); const end = d.study(t, 300);
  assert.equal(d.shown(end).count, 2);
}));
test("Jerusalem: Thu 26 + Fri 27 Mar (spring forward, 23 h Friday) done, Sat 28 rest, Sun 29 done -> 3 with rest mode on; with it off the Saturday is a missed day", () => withTZ("Asia/Jerusalem", () => {
  const base = { count: 2, best: 2, last: "2026-03-27", doneDates: ["2026-03-26", "2026-03-27"] };
  const on = device({ record: v2({ ...base, freeze: true }), prefs: { observant: true }, cal: { observance: "israel" } });
  const t = at("2026-03-29", 9); on.open(t); const end = on.study(t, 300);
  assert.equal(on.shown(end).count, 3);
  const off = device({ record: v2({ ...base, freeze: false }), prefs: { observant: false, freeze: false } });
  assert.equal(off.shown(at("2026-03-29", 9)).broken, true);
}));
test("Jerusalem: Fri 23 Oct done, Sat 24 rest, Sun 25 Oct (fall back, 25 h) done -> 2", () => withTZ("Asia/Jerusalem", () => {
  const d = device({ record: v2({ count: 1, best: 1, last: "2026-10-23", doneDates: ["2026-10-23"], freeze: true }), prefs: { observant: true }, cal: { observance: "israel" } });
  assert.equal(d.shown(at("2026-10-24", 12)).restKind, "shabbat");
  const t = at("2026-10-25", 9); d.open(t); const end = d.study(t, 300);
  assert.equal(d.shown(end).count, 2);
}));

test("observant reminders: no ping on Shabbat, one erev ping on Friday, in both zones, on the days beside each change", () => {
  for (const [tz, fri, sat] of [["America/Toronto", "2026-03-06", "2026-03-07"], ["Asia/Jerusalem", "2026-03-27", "2026-03-28"]]) withTZ(tz, () => {
    const prefs = P.normalizePrefs({ on: true, time: "07:00" });
    const f = P.reminderOn(fri, prefs, { observant: true }), s = P.reminderOn(sat, prefs, { observant: true });
    assert.equal(f.why, "erev"); assert.equal(f.time, "07:00");
    assert.equal(s.fire, false); assert.equal(s.why, "rest-day");
  });
});

test("never-on-load: notification permission is requested only from a button handler (source check)", async () => {
  const fs = await import("node:fs");
  const read = (f) => fs.readFileSync(f, "utf8");
  // The two helper modules define the call; every other file that calls it must do so inside an onclick handler.
  const callers = [];
  for (const f of ["src/shell/notify.view.js", "src/morning/morning.view.js", "src/morning/boot.js", "src/shell/boot-hooks.js", "src/app.js"]) {
    const lines = read(f).split("\n");
    lines.forEach((ln, i) => { if (/\brequestPermission\(|requestNotificationPermission\(/.test(ln)) callers.push({ f, n: i + 1, ctx: lines.slice(Math.max(0, i - 3), i + 1).join("\n") }); });
  }
  assert.ok(callers.length >= 2, "expected the two button handlers");
  for (const c of callers) assert.match(c.ctx, /onclick/, `${c.f}:${c.n} is not in an onclick handler`);
  for (const f of ["src/app.js", "src/morning/boot.js", "src/shell/boot-hooks.js"]) assert.ok(!/requestPermission/.test(read(f)), f);
});
