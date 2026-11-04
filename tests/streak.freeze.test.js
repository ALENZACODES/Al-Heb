/**
 * P061 QA walk: Shabbat / Yom Tov streak freeze, day by day from 2026-09-01 to 2027-09-30 in America/Toronto and
 * America/Los_Angeles. The expected rest days are built here from data/calendar/hebcal-fixtures.json (Hebcal snapshot),
 * NOT from calendar.js, so the walk is an independent check of streak.js + calendar.js together.
 *
 * Node re-reads process.env.TZ at runtime (v13+), so each zone is walked in the same process by switching TZ before the
 * walk. `node --test` runs this file in its own process, so other test files are not affected.
 *
 * Written up in docs/qa/STREAK-FREEZE.md.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createEngagement } from "../src/morning/engage.js";
import { createMorningModel } from "../src/morning/model.js";
import * as S from "../src/curriculum/streak.js";

const ZONES = ["America/Toronto", "America/Los_Angeles"];
const FROM = "2026-09-01", TO = "2027-09-30";

// ---------- harness (same shape as tests/morning.test.js: store + model + engine on a fake clock) ----------
const fakeStore = (init = {}) => { const m = new Map(Object.entries(init)); return { get: (k, f) => (m.has(k) ? structuredClone(m.get(k)) : f), set: (k, v) => void m.set(k, structuredClone(v)), m }; };
const at = (iso, h = 12, mi = 0, s = 0) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d, h, mi, s).getTime(); };
const v2 = (o) => ({ v: 2, count: 0, best: 0, last: null, ...o });

function device({ record, prefs, cal, progress } = {}) {
  const store = fakeStore({ ...(record ? { streak: record } : {}), ...(prefs ? { "morning.prefs": prefs } : {}), ...(cal ? { "calendar.prefs": cal } : {}), ...(progress ? { "progress.state": progress } : {}) });
  let clockT = 0;
  const model = createMorningModel(store, () => new Date(clockT));
  const eng = createEngagement(model.io, { extraRest: () => model.extraRest() });
  return {
    store, model, eng,
    open(t) { clockT = t; model.syncRecord(); eng.resume(t); },
    /** Inside a counted route from t for `sec` seconds, one tick per second, an interaction every 20 s. Returns the end time. */
    study(t, sec) { clockT = t; eng.setRoute(true, t); for (let i = 1; i <= sec; i++) { clockT = t + i * 1000; if (i % 20 === 0) eng.interact(clockT); eng.tick(clockT); } eng.setRoute(false, clockT); return clockT; },
    shown(t) { clockT = t; return model.project(); },
    rec() { return store.get("streak"); },
  };
}

// ---------- expected rest days from the Hebcal fixture (independent of calendar.js) ----------
const FIX = JSON.parse(fs.readFileSync("data/calendar/hebcal-fixtures.json", "utf8"));
/** Days on which work is forbidden under the Reform one-day convention: RH day 1, YK, Sukkot I, Shmini Atzeret (with Simchat Torah), Pesach I and VII, Shavuot. */
const REFORM_YT = /^(Rosh Hashana \d+|Yom Kippur|Sukkot I|Shmini Atzeret|Pesach I|Pesach VII|Shavuot)$/;
/** Traditional diaspora: adds RH II, Sukkot II (= Sukkot I + 1, not in the fixture), Simchat Torah, Pesach II (= Pesach I + 1, not in the fixture), Pesach VIII, Shavuot II. */
const DIA_YT = /^(Rosh Hashana \d+|Rosh Hashana II|Yom Kippur|Sukkot I|Shmini Atzeret|Simchat Torah|Pesach I|Pesach VII|Pesach VIII|Shavuot I|Shavuot II)$/;
function fixtureYomTov(mode) {
  const out = new Set();
  const years = ["5786", "5787", "5788"];
  if (mode === "traditional") {
    for (const y of years) for (const [name, d] of FIX.holidays[`${y}-dia`]) if (DIA_YT.test(name)) { out.add(d); if (name === "Sukkot I" || name === "Pesach I") out.add(S.addDaysISO(d, 1)); }
  } else {
    for (const y of years) for (const [name, d] of FIX.holidays[`${y}-il`]) { if (REFORM_YT.test(name)) out.add(d); if (mode === "israel" && name === "Rosh Hashana II") out.add(d); }
  }
  return out;
}
const isSaturday = (iso) => new Date(iso + "T12:00:00Z").getUTCDay() === 6;
const expectedRest = (iso, mode, declared = new Set()) => isSaturday(iso) || fixtureYomTov(mode).has(iso) || declared.has(iso);
function* days(from, to) { for (let d = from; d <= to; d = S.addDaysISO(d, 1)) yield d; }
const withTZ = (tz, fn) => { const old = process.env.TZ; process.env.TZ = tz; try { return fn(); } finally { if (old === undefined) delete process.env.TZ; else process.env.TZ = old; } };

// sanity: the fixture really contains the festivals the walk relies on, and the switch of zones takes effect
test("fixture sanity: Reform Yom Tov days in the walk window and TZ switching", () => {
  const yt = [...fixtureYomTov("reform")].filter((d) => d >= FROM && d <= TO).sort();
  assert.deepEqual(yt, ["2026-09-12", "2026-09-21", "2026-09-26", "2026-10-03", "2027-04-22", "2027-04-28", "2027-06-11"]);
  const tr = [...fixtureYomTov("traditional")].filter((d) => d >= FROM && d <= TO).sort();
  assert.deepEqual(tr, ["2026-09-12", "2026-09-13", "2026-09-21", "2026-09-26", "2026-09-27", "2026-10-03", "2026-10-04", "2027-04-22", "2027-04-23", "2027-04-28", "2027-04-29", "2027-06-11", "2027-06-12"]);
  const offsets = ZONES.map((tz) => withTZ(tz, () => new Date(2027, 0, 15, 12).getTimezoneOffset()));
  assert.deepEqual(offsets, [300, 480]);
});

// ---------- Stage 1a: the full walk, user studies every non-rest day ----------
for (const tz of ZONES) for (const mode of ["reform", "traditional", "israel"]) {
  test(`walk ${FROM}..${TO} in ${tz}, mode ${mode}, freeze on: streak = completed non-rest days, zero breaks`, () => withTZ(tz, () => {
    const d = device({ prefs: { observant: true }, cal: { observance: mode } });
    d.open(at(S.addDaysISO(FROM, -1), 20));
    let completed = 0; const restSeen = [], restKinds = {};
    for (const iso of days(FROM, TO)) {
      const t = at(iso, 8);
      d.open(t);
      const p = d.shown(t);
      assert.equal(S.dayKey(t), iso, `dayKey at 08:00 local on ${iso}`);
      assert.equal(p.restToday, expectedRest(iso, mode), `${iso} restToday (fixture says ${expectedRest(iso, mode)})`);
      assert.equal(p.broken, false, `${iso} broken`);
      assert.equal(p.count, completed, `${iso} count before study`);
      if (p.restToday) { restSeen.push(iso); restKinds[p.restKind] = (restKinds[p.restKind] || 0) + 1; continue; } // the user does not open a lesson
      d.study(t, 300); completed++;
      const q = d.shown(t + 301000);
      assert.equal(q.count, completed, `${iso} count after study`); assert.equal(q.activeToday, true);
    }
    const expectRest = [...days(FROM, TO)].filter((iso) => expectedRest(iso, mode));
    assert.deepEqual(restSeen, expectRest);
    assert.equal(completed, 395 - expectRest.length);
    assert.equal(d.rec().count, completed); assert.equal(d.rec().best, completed);
    const ytOffShabbat = expectRest.filter((iso) => !isSaturday(iso)).length;
    assert.deepEqual(restKinds, { shabbat: 56, yomtov: ytOffShabbat }); // a Yom Tov that is a Saturday is reported as shabbat (reform: 4 of 7 are off Shabbat)
    // the next morning after the walk the chain still stands
    const after = S.addDaysISO(TO, 1); // 2027-10-01, Friday
    assert.equal(d.shown(at(after, 8)).count, completed);
  }));
}

// ---------- Stage 1b: an ordinary missed weekday breaks it; a Shabbat or Yom Tov does not ----------
for (const tz of ZONES) {
  test(`missed weekday breaks, missed Shabbat/Yom Tov does not (${tz})`, () => withTZ(tz, () => {
    const d = device({ prefs: { observant: true }, cal: { observance: "reform" } });
    let count = 0;
    const go = (iso) => { d.open(at(iso, 8)); d.study(at(iso, 8), 300); };
    for (const iso of days("2026-09-01", "2026-09-11")) if (!expectedRest(iso, "reform")) { go(iso); count++; }
    assert.equal(d.shown(at("2026-09-11", 9)).count, count); // Friday 11 Sep, count 10 (one Saturday skipped)
    // Sat 12 Sep = Shabbat AND Rosh Hashanah day 1; Sun 13 Sep = RH II (not a rest day in reform mode)
    assert.equal(d.shown(at("2026-09-12", 9)).restKind, "shabbat");
    assert.equal(d.shown(at("2026-09-13", 9)).restToday, false);
    assert.equal(d.shown(at("2026-09-13", 9)).count, count); // not broken yet: Sunday is still open
    // the user skips Sunday 13 Sep (an ordinary day for a one-day-Rosh-Hashanah user) -> Monday shows the break
    const mon = d.shown(at("2026-09-14", 8));
    assert.equal(mon.count, 0); assert.equal(mon.broken, true); assert.equal(mon.best, count);
    go("2026-09-14"); assert.equal(d.shown(at("2026-09-14", 9)).count, 1);
    // Tue 15 .. Sun 20: study Tue-Fri, skip Sat (Shabbat) -> Sunday still 5 (Mon-Fri)
    for (const iso of days("2026-09-15", "2026-09-18")) go(iso);
    assert.equal(d.shown(at("2026-09-20", 8)).count, 5);
    go("2026-09-20"); // Sunday 20 Sep -> 6
    // Mon 21 Sep = Yom Kippur (frozen); Tue 22 Sep shows 6 intact
    assert.equal(d.shown(at("2026-09-21", 8)).restKind, "yomtov");
    assert.equal(d.shown(at("2026-09-22", 8)).count, 6); assert.equal(d.shown(at("2026-09-22", 8)).broken, false);
    go("2026-09-22"); assert.equal(d.shown(at("2026-09-22", 9)).count, 7);
    // skip Wed 23 Sep (ordinary): Thursday is broken
    assert.equal(d.shown(at("2026-09-24", 8)).count, 0); assert.equal(d.shown(at("2026-09-24", 8)).broken, true);
    // and with freeze OFF the same Yom Kippur gap breaks the chain
    const e = device({ record: v2({ count: 6, best: 6, last: "2026-09-20" }), prefs: { observant: true, freeze: false } });
    e.open(at("2026-09-22", 8)); assert.equal(e.shown(at("2026-09-22", 8)).count, 0);
  }));
}

// ---------- Stage 1c: multi-day freezes ----------
test("Rosh Hashanah 2 days (traditional and israel modes, and a reform user who declares day 2 a rest day)", () => withTZ("America/Toronto", () => {
  for (const mode of ["traditional", "israel"]) {
    const d = device({ record: v2({ count: 10, best: 10, last: "2026-09-11" }), prefs: { observant: true }, cal: { observance: mode } });
    d.open(at("2026-09-12", 9)); // boot: pushes freeze/mode onto the record
    assert.equal(d.shown(at("2026-09-12", 9)).restKind, "shabbat", mode); // RH I on Shabbat
    assert.equal(d.shown(at("2026-09-13", 9)).restKind, "yomtov", mode); // RH II, Sunday
    d.open(at("2026-09-14", 8)); const p = d.shown(at("2026-09-14", 8));
    assert.equal(p.count, 10, mode); assert.equal(p.broken, false, mode);
    assert.deepEqual(d.rec().frozenDates, ["2026-09-12", "2026-09-13"], mode); // rollover persisted the classification
    d.study(at("2026-09-14", 8), 300); assert.equal(d.shown(at("2026-09-14", 9)).count, 11, mode);
    // strip Tue 8 .. Mon 14 (the seeded record has no doneDates, so earlier days show "open")
    assert.deepEqual(d.model.strip().map((x) => x.state), ["open", "open", "open", "open", "frozen", "frozen", "done"], mode);
  }
  // reform: day 2 is ordinary unless declared in Progress
  const r = device({ record: v2({ count: 10, best: 10, last: "2026-09-11" }), prefs: { observant: true }, cal: { observance: "reform" } });
  r.open(at("2026-09-14", 8)); assert.equal(r.shown(at("2026-09-14", 8)).count, 0);
  const r2 = device({ record: v2({ count: 10, best: 10, last: "2026-09-11" }), prefs: { observant: true }, cal: { observance: "reform" }, progress: { rest: ["2026-09-13"], goal: null } });
  r2.open(at("2026-09-14", 8)); assert.equal(r2.shown(at("2026-09-14", 8)).count, 10);
  // the same repair through streak.js directly (Progress mirrors declared rest days into frozenDates)
  const fixed = S.withDeclaredRest(v2({ count: 10, best: 10, last: "2026-09-11", freeze: true }), "2026-09-13", true);
  assert.equal(S.projectStreak(fixed, at("2026-09-14", 8)).count, 10);
}));

test("Shabbat + Yom Tov adjacent: Shavuot Fri 11 Jun 2027 + Shabbat; traditional Pesach VII-VIII + Shabbat (Wed-Thu, then Fri studied, Sat frozen); Sukkot I on Shabbat", () => withTZ("America/Los_Angeles", () => {
  // Shavuot (reform, 1 day) falls on Friday 2027-06-11; Saturday follows: two frozen days in a row, Sunday intact
  const a = device({ record: v2({ count: 3, best: 3, last: "2027-06-10" }), prefs: { observant: true }, cal: { observance: "reform" } });
  a.open(at("2027-06-11", 9));
  assert.equal(a.shown(at("2027-06-11", 9)).restKind, "yomtov"); assert.equal(a.shown(at("2027-06-12", 9)).restKind, "shabbat");
  a.open(at("2027-06-13", 8)); assert.equal(a.shown(at("2027-06-13", 8)).count, 3);
  assert.deepEqual(a.rec().frozenDates, ["2027-06-11", "2027-06-12"]);
  a.study(at("2027-06-13", 8), 300); assert.equal(a.shown(at("2027-06-13", 9)).count, 4);
  // traditional: Shavuot II is Saturday 2027-06-12 (Yom Tov on Shabbat): same outcome, reported as shabbat
  const b = device({ record: v2({ count: 3, best: 3, last: "2027-06-10" }), prefs: { observant: true }, cal: { observance: "traditional" } });
  b.open(at("2027-06-12", 9));
  assert.equal(b.shown(at("2027-06-12", 9)).restKind, "shabbat");
  b.open(at("2027-06-13", 8)); assert.equal(b.shown(at("2027-06-13", 8)).count, 3);
  // traditional Pesach VII Wed 2027-04-28, VIII Thu 04-29; Friday ordinary; Saturday Shabbat
  const c = device({ record: v2({ count: 5, best: 5, last: "2027-04-27" }), prefs: { observant: true }, cal: { observance: "traditional" } });
  c.open(at("2027-04-30", 8)); assert.equal(c.shown(at("2027-04-30", 8)).count, 5); // after two frozen days
  assert.equal(c.shown(at("2027-04-30", 8)).restToday, false); // Friday must be studied
  const cSkipFri = device({ record: v2({ count: 5, best: 5, last: "2027-04-27" }), prefs: { observant: true }, cal: { observance: "traditional" } });
  cSkipFri.open(at("2027-05-02", 8)); assert.equal(cSkipFri.shown(at("2027-05-02", 8)).count, 0); // Fri missed: Sunday broken even though Wed, Thu, Sat were frozen
  c.study(at("2027-04-30", 8), 300); c.open(at("2027-05-02", 8)); assert.equal(c.shown(at("2027-05-02", 8)).count, 6); // Fri studied, Sat frozen, Sunday intact
  // reform Pesach: only I (Thu 04-22) and VII (Wed 04-28) freeze; Chol HaMoed is ordinary
  const e = device({ record: v2({ count: 5, best: 5, last: "2027-04-21" }), prefs: { observant: true }, cal: { observance: "reform" } });
  e.open(at("2027-04-22", 9));
  assert.equal(e.shown(at("2027-04-22", 9)).restKind, "yomtov"); assert.equal(e.shown(at("2027-04-23", 9)).restToday, false);
  e.open(at("2027-04-23", 8)); assert.equal(e.shown(at("2027-04-23", 8)).count, 5);
  e.open(at("2027-04-25", 8)); assert.equal(e.shown(at("2027-04-25", 8)).count, 0); // Fri 23 missed (Sat frozen) -> Sunday broken
  // Sukkot I 2026-09-26 and Shmini Atzeret 2026-10-03 are both Saturdays in 5787: Shabbat wins the label, nothing else changes
  const f = device({ record: v2({ count: 2, best: 2, last: "2026-09-25" }), prefs: { observant: true }, cal: { observance: "reform" } });
  f.open(at("2026-09-26", 9));
  assert.equal(f.shown(at("2026-09-26", 9)).restKind, "shabbat"); assert.equal(S.restKind("2026-09-26", "reform"), "shabbat");
  f.open(at("2026-09-27", 8)); assert.equal(f.shown(at("2026-09-27", 8)).count, 2);
  // traditional Sukkot II 2026-09-27 (Sunday) and Simchat Torah 2026-10-04 (Sunday) extend the weekend freeze to two days
  const g = device({ record: v2({ count: 2, best: 2, last: "2026-09-25" }), prefs: { observant: true }, cal: { observance: "traditional" } });
  g.open(at("2026-09-27", 9));
  assert.equal(g.shown(at("2026-09-27", 9)).restKind, "yomtov");
  g.open(at("2026-09-28", 8)); assert.equal(g.shown(at("2026-09-28", 8)).count, 2);
  const h = device({ record: v2({ count: 2, best: 2, last: "2026-10-02" }), prefs: { observant: true }, cal: { observance: "traditional" } });
  h.open(at("2026-10-05", 8)); assert.equal(h.shown(at("2026-10-05", 8)).count, 2);
}));

// ---------- Stage 1d: DST and midnight ----------
for (const tz of ZONES) {
  test(`DST in ${tz}: fall back 2026-11-01 and spring forward 2027-03-14 keep the day keys and the accrued seconds right`, () => withTZ(tz, () => {
    // both zones change on the same civil dates in 2026/27 (second Sunday of March, first Sunday of November)
    assert.equal(new Date(2026, 10, 1, 12).getTimezoneOffset() - new Date(2026, 9, 31, 12).getTimezoneOffset(), 60);
    assert.equal(new Date(2027, 2, 13, 12).getTimezoneOffset() - new Date(2027, 2, 14, 12).getTimezoneOffset(), 60);
    // a 25-hour Sunday: a session that straddles the repeated 01:00-02:00 hour accrues wall-clock-independent real seconds
    const d = device({ record: v2({ count: 4, best: 4, last: "2026-10-30" }), prefs: { observant: true } }); // Fri done, Sat frozen
    const t0 = at("2026-11-01", 0, 30); // 00:30 EDT/PDT; the fall-back happens one hour later
    d.open(t0); assert.equal(d.shown(t0).count, 4);
    const end = d.study(t0, 2 * 3600); // two real hours, ending at 01:30 standard time (clock shows 01:30 again)
    assert.equal(new Date(end).getHours(), 1); assert.equal(S.dayKey(end), "2026-11-01");
    assert.equal(d.eng.seconds(), 7200); assert.equal(d.shown(end).count, 5);
    assert.equal(d.rec().todaySeconds, 7200); assert.equal(d.rec().todayDate, "2026-11-01");
    // the next days are consecutive (no phantom gap from the 25-hour day); Monday 2 Nov at 08:00 is 31 h after Sunday 01:00 DST
    d.open(at("2026-11-02", 8)); assert.equal(d.shown(at("2026-11-02", 8)).count, 5); assert.equal(d.shown(at("2026-11-02", 8)).broken, false);
    // a 23-hour Sunday: a session from 01:50 to 03:10 is 20 real minutes
    const e = device({ record: v2({ count: 4, best: 4, last: "2027-03-12" }), prefs: { observant: true } }); // Fri 12 Mar done, Sat frozen
    const s0 = at("2027-03-14", 1, 50); e.open(s0);
    const sEnd = e.study(s0, 20 * 60);
    assert.equal(new Date(sEnd).getHours(), 3); assert.equal(new Date(sEnd).getMinutes(), 10);
    assert.equal(e.eng.seconds(), 1200); assert.equal(e.shown(sEnd).count, 5);
    e.open(at("2027-03-15", 8)); assert.equal(e.shown(at("2027-03-15", 8)).count, 5);
    // a day-key walk through both changes: every local 08:00 is a different consecutive key
    let prev = "2026-10-30";
    for (const iso of days("2026-10-31", "2027-03-16")) { assert.equal(S.dayKey(at(iso, 8)), iso); assert.equal(S.addDaysISO(prev, 1), iso); prev = iso; }
  }));

  test(`midnight crossing in ${tz}: a session 23:50 -> 00:10 completes both days, banks nothing across midnight`, () => withTZ(tz, () => {
    const d = device({ record: v2({ count: 2, best: 2, last: "2026-11-09" }), prefs: { observant: true } }); // Mon done
    const t0 = at("2026-11-10", 23, 50); d.open(t0); // Tuesday
    d.study(t0, 20 * 60); // ends Wed 00:10
    // Tuesday was completed (>= 300 s) and Wednesday too (600 s after midnight)
    const w = d.shown(at("2026-11-11", 0, 10));
    assert.equal(w.count, 4); assert.equal(w.activeToday, true);
    assert.equal(d.rec().todayDate, "2026-11-11");
    assert.ok(d.rec().todaySeconds >= 590 && d.rec().todaySeconds <= 600, `Wed seconds ${d.rec().todaySeconds}`); // only the post-midnight part
    assert.deepEqual(d.rec().doneDates.slice(-2), ["2026-11-10", "2026-11-11"]);
    // Friday 23:56 -> Saturday 00:06: Friday keeps its 4 minutes (not complete). Once midnight passes Friday is a missed
    // ordinary day, so Saturday (frozen) already shows the break; the 6 post-midnight minutes do not rescue Friday.
    const f = device({ record: v2({ count: 2, best: 2, last: "2026-11-12" }), prefs: { observant: true } }); // Thu done
    const f0 = at("2026-11-13", 23, 56); f.open(f0); f.study(f0, 10 * 60);
    const sat = f.shown(at("2026-11-14", 0, 6));
    assert.equal(sat.restToday, true); assert.equal(sat.count, 0); assert.equal(sat.broken, true); assert.equal(sat.best, 2);
    assert.equal(f.rec().last, "2026-11-12"); // Friday did not reach the goal and Saturday never counts
    assert.equal(f.shown(at("2026-11-15", 8)).count, 0); // Sunday: still broken
    // the same Friday with 23:54 -> 00:04 (6 min before midnight) completes Friday at 23:59 and Saturday is a clean freeze
    const f2 = device({ record: v2({ count: 2, best: 2, last: "2026-11-12" }), prefs: { observant: true } });
    const f20 = at("2026-11-13", 23, 54); f2.open(f20); f2.study(f20, 10 * 60);
    assert.equal(f2.rec().last, "2026-11-13"); assert.equal(f2.shown(at("2026-11-14", 0, 4)).count, 3);
    assert.equal(f2.shown(at("2026-11-15", 8)).count, 3);
    // Saturday 23:55 -> Sunday 00:10: nothing for Shabbat, Sunday gets the post-midnight minutes and completes
    const g = device({ record: v2({ count: 2, best: 2, last: "2026-11-13" }), prefs: { observant: true } }); // Fri done
    const g0 = at("2026-11-14", 23, 55); g.open(g0); g.study(g0, 15 * 60);
    const sun = g.shown(at("2026-11-15", 0, 10));
    assert.equal(sun.count, 3); assert.equal(g.rec().last, "2026-11-15");
  }));
}

// Defect found by the walk (engage.js, not streak.js): the goal reached in the last seconds before midnight is not persisted.
// save() returns early until PERSIST_MS have passed since the last save even when the 5-minute goal has just been reached, and
// the midnight rollover then discards the unsaved accrual. The engine (and the ring) showed 5:00 but the day never completed.
// Marked todo until engage.js forces a save when the goal is first reached (the file header already says it does).
test("engage.js: the goal reached 0.5 s before midnight must complete the day (persist on goal, not only every 10 s)", { todo: "engage.js save() gate; see docs/qa/STREAK-FREEZE.md" }, () => withTZ("America/Toronto", () => {
  const d = device({ record: v2({ count: 2, best: 2, last: "2026-11-12" }), prefs: { observant: true } }); // Thu done
  d.open(at("2026-11-13", 23, 50));
  const t0 = at("2026-11-13", 23, 54, 59) + 500; // Friday; the 300th second ends at 23:59:59.5
  d.eng.setRoute(true, t0);
  let maxBefore = 0;
  for (let i = 1; i <= 360; i++) { const t = t0 + i * 1000; if (i % 20 === 0) d.eng.interact(t); d.eng.tick(t); if (t < at("2026-11-14")) maxBefore = d.eng.seconds(); }
  assert.equal(maxBefore, 300); // the engine (and so the ring) reached the goal on Friday
  assert.equal(d.rec().last, "2026-11-13"); // ...so Friday must be stored as complete
  assert.equal(d.shown(at("2026-11-15", 8)).count, 3);
}));

// ---------- Stage 1e: the same instant seen from two zones ----------
test("one UTC instant is Shabbat in Los Angeles and already Sunday in Toronto: each zone judges by its own local day", () => {
  const rec = v2({ count: 6, best: 6, last: "2026-09-18", freeze: true }); // Friday done
  const instant = Date.UTC(2026, 8, 20, 6, 30); // Sat 23:30 PDT = Sun 02:30 EDT
  const la = withTZ("America/Los_Angeles", () => S.projectStreak(rec, instant));
  const to = withTZ("America/Toronto", () => S.projectStreak(rec, instant));
  assert.equal(withTZ("America/Los_Angeles", () => S.dayKey(instant)), "2026-09-19");
  assert.equal(withTZ("America/Toronto", () => S.dayKey(instant)), "2026-09-20");
  assert.equal(la.restToday, true); assert.equal(la.restKind, "shabbat"); assert.equal(la.count, 6);
  assert.equal(to.restToday, false); assert.equal(to.count, 6); assert.equal(to.broken, false); // Saturday frozen, Sunday still open
});

// ---------- Stage 1f: pure-engine walk (no engagement timer) ----------
test("pure streak.js walk: completeDay/rollover agree with projectStreak on every day of the window", () => withTZ("America/Toronto", () => {
  let rec = v2({ freeze: true, mode: "reform" });
  let completed = 0;
  for (const iso of days(FROM, TO)) {
    const t = at(iso, 7, 30);
    rec = S.rollover(rec, t);
    const p = S.projectStreak(rec, t);
    assert.equal(p.count, completed, iso); assert.equal(p.broken, false, iso);
    if (expectedRest(iso, "reform")) { assert.equal(p.restToday, true, iso); continue; }
    rec = S.completeDay(rec, t); completed++;
    assert.equal(S.projectStreak(rec, t + 1000).count, completed, iso);
  }
  assert.equal(rec.count, completed); assert.equal(rec.frozenDates.length, 60); // KEEP_FROZEN cap, newest kept
  assert.equal(rec.frozenDates.at(-1), "2027-09-25");
}));
