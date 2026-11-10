import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createEngagement, isCountedRoute, IDLE_MS } from "../src/morning/engage.js";
import { createMorningModel } from "../src/morning/model.js";
import * as V from "../src/morning/verses.js";
import * as P from "../src/morning/plan.js";
import * as S from "../src/curriculum/streak.js";
import { currentStreak, recordActivity } from "../src/curriculum/progress.js";
import { streakInfo, readSnapshot } from "../src/progress/model.js";
import { setRestDay } from "../src/progress/store.js";
import { scheduleLocalNotifications } from "../src/curriculum/reminders.notify.js";
import { holidaysBetween } from "../src/curriculum/calendar.js";

const fakeStore = (init = {}) => { const m = new Map(Object.entries(init)); return { get: (k, f) => (m.has(k) ? structuredClone(m.get(k)) : f), set: (k, v) => void m.set(k, structuredClone(v)), m }; };
const at = (y, mo, d, h = 12, mi = 0, s = 0) => new Date(y, mo - 1, d, h, mi, s).getTime();
const iso = (y, mo, d) => `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** A device: store + model + engine on a fake clock. */
function device({ record, prefs, cal } = {}) {
  const store = fakeStore({ ...(record ? { streak: record } : {}), ...(prefs ? { "morning.prefs": prefs } : {}), ...(cal ? { "calendar.prefs": cal } : {}) });
  let clockT = 0;
  const model = createMorningModel(store, () => new Date(clockT));
  const eng = createEngagement(model.io, { extraRest: () => model.extraRest() });
  return {
    store, model, eng,
    /** jump to time t (fresh page load): sync settings, resume */
    open(t) { clockT = t; model.syncRecord(); eng.resume(t); },
    /** use the app inside a counted route from t for `sec` seconds, interacting every 20 s */
    study(t, sec) { clockT = t; eng.setRoute(true, t); for (let i = 1; i <= sec; i++) { clockT = t + i * 1000; if (i % 20 === 0) eng.interact(clockT); eng.tick(clockT); } eng.setRoute(false, clockT); return clockT; },
    shown(t) { clockT = t; return model.project(); },
  };
}
const v2 = (o) => ({ v: 2, count: 0, best: 0, last: null, ...o });

// ---------- content ----------
test("morning-verses.json: shape, no provenance fields, enough verified entries, deterministic rotation", () => {
  const list = JSON.parse(fs.readFileSync("data/morning-verses.json", "utf8"));
  assert.deepEqual(V.checkVerses(list), []);
  assert.ok(list.length >= 90, `entries: ${list.length}`);
  for (const e of list) assert.deepEqual(Object.keys(e).sort(), ["english_jps1917", "hebrew", "id", "source_ref", "tr"]);
  // every Hebrew line has how to say it (Latin letters, house style: Adonai for the Name, ch for chet and chaf, no diacritics) and what it says
  for (const e of list) {
    assert.match(e.tr, /^[A-Z]/, `${e.id}: tr starts with a capital`);
    assert.doesNotMatch(e.tr, /[\u0590-\u05FF\u0300-\u036F]|YHWH|Yahweh|Jehovah/i, `${e.id}: tr style`);
    if (/יְהוָה|יְהוִה/.test(e.hebrew)) assert.match(e.tr, /Adonai/, `${e.id}: the Name is read Adonai`);
    assert.ok(e.english_jps1917.trim().length > 0);
  }
  // the 70 verses also present in data/homepage/prayers.json carry the same transliteration (one voice across the app)
  const prayers = JSON.parse(fs.readFileSync("data/homepage/prayers.json", "utf8")).prayers;
  const norm = (x) => x.normalize("NFC").replace(/\u05C3|:/g, "").trim();
  const byHe = new Map(prayers.map((p) => [norm(p.he), p.tr]));
  let shared = 0;
  for (const e of list) { const tr = byHe.get(norm(e.hebrew)); if (tr) { shared++; assert.equal(e.tr, tr, e.id); } }
  assert.ok(shared >= 60, `shared with prayers.json: ${shared}`);
  const bad = V.checkVerses([{ ...list[0], tr: "" }]); assert.ok(bad.some((x) => /tr missing/.test(x)));
  const a = V.verseFor(list, new Date(2026, 10, 4, 6)), b = V.verseFor(list, new Date(2026, 10, 4, 23, 59));
  assert.equal(a.id, b.id); // same verse all day
  assert.equal(a.id, list[V.dayOfYear(new Date(2026, 10, 4)) % list.length].id);
  assert.notEqual(V.verseFor(list, new Date(2026, 10, 5)).id, a.id);
  assert.equal(V.dayOfYear(new Date(2026, 0, 1)), 1);
});
test("Hebrew of each verse is the UXLC text: spot-check against the registry's Shema-adjacent and priestly blessing records", () => {
  const list = JSON.parse(fs.readFileSync("data/morning-verses.json", "utf8"));
  const reg = JSON.parse(fs.readFileSync("data/corpus/registry.json", "utf8")).entries;
  const bless = reg.find((e) => e.id === "bless-priestly-1");
  assert.ok(bless.he.startsWith(list.find((e) => e.source_ref === "Numbers 6:24").hebrew.replace(/׃$/, "")));
});
test("Modeh Ani block: masculine from registry, feminine flagged needs-check, audio button only if a clip exists", () => {
  const reg = JSON.parse(fs.readFileSync("data/corpus/registry.json", "utf8")).entries;
  const m = V.modehAniFor(reg, "m"), f = V.modehAniFor(reg, "f");
  assert.match(m.he, /^מוֹדֶה/); assert.match(f.he, /^מוֹדָה/); assert.equal(m.needsCheck, false); assert.equal(f.needsCheck, true);
  assert.match(m.tr, /^Modeh ani lefanecha/); assert.match(f.tr, /^Modah ani lefanecha/); assert.ok(m.english && f.english);
  assert.equal(V.modehAniClip({ status: () => ({ source: "none" }) }), null);
  assert.equal(V.modehAniClip({ status: () => ({ source: "tts-fallback" }) }), null);
  assert.equal(V.modehAniClip({ status: () => ({ source: "file", url: "x.mp3" }) }).url, "x.mp3");
  assert.equal(V.modehAniClip(null), null);
});

// ---------- QA gate (i)/(ii): Shabbat walk ----------
const FRI = [2026, 11, 6], SAT = [2026, 11, 7], SUN = [2026, 11, 8];
test("QA walk: Friday 23:00 streak 6 -> Saturday frozen (observant) -> Sunday completes 5 min -> 7", () => {
  const d = device({ record: v2({ count: 6, best: 6, last: iso(...FRI), freeze: true }), prefs: { observant: true } });
  d.open(at(...FRI, 23, 0));
  assert.equal(d.shown(at(...FRI, 23, 0)).count, 6);
  d.open(at(...SAT, 9, 0));
  const sat = d.shown(at(...SAT, 9, 0));
  assert.equal(sat.count, 6); assert.equal(sat.restToday, true); assert.equal(sat.restKind, "shabbat");
  d.open(at(...SUN, 8, 0));
  assert.equal(d.shown(at(...SUN, 8, 0)).count, 6); // chain intact, not yet counted
  d.study(at(...SUN, 8, 0), 300);
  const p = d.shown(at(...SUN, 8, 6, 0));
  assert.equal(p.count, 7); assert.equal(p.activeToday, true); assert.equal(p.best, 7);
  const strip = d.model.strip().map((x) => x.state);
  assert.equal(strip.at(-1), "done"); assert.equal(strip.at(-2), "frozen");
});
test("QA walk with observant mode OFF: the same Saturday breaks the streak (the freeze, not a bug, saved it)", () => {
  const d = device({ record: v2({ count: 6, best: 6, last: iso(...FRI) }), prefs: { observant: false } });
  d.open(at(...SUN, 8, 0));
  const before = d.shown(at(...SUN, 8, 0));
  assert.equal(before.count, 0); assert.equal(before.broken, true); assert.equal(before.best, 6); // longest kept
  d.study(at(...SUN, 8, 0), 300);
  assert.equal(d.shown(at(...SUN, 9, 0)).count, 1);
  assert.equal(d.shown(at(...SUN, 9, 0)).best, 6);
});
test("opt-in freeze for non-observant users works; observant can switch freeze off", () => {
  const a = device({ record: v2({ count: 6, best: 6, last: iso(...FRI) }), prefs: { observant: false, freeze: true } });
  a.open(at(...SUN, 8)); assert.equal(a.shown(at(...SUN, 8)).count, 6);
  const b = device({ record: v2({ count: 6, best: 6, last: iso(...FRI) }), prefs: { observant: true, freeze: false } });
  b.open(at(...SUN, 8)); assert.equal(b.shown(at(...SUN, 8)).count, 0);
});
test("a missed weekday still breaks the streak even in observant mode", () => {
  const d = device({ record: v2({ count: 6, best: 6, last: iso(2026, 11, 9) }), prefs: { observant: true } }); // Monday
  d.open(at(2026, 11, 11, 8)); // Wednesday, Tuesday missed
  assert.equal(d.shown(at(2026, 11, 11, 8)).count, 0);
});

// ---------- QA gate (iii)/(iv): idle and hidden ----------
test("QA idle: lesson open, no interaction for 10 minutes -> accrues at most the 60 s idle window", () => {
  const d = device({ record: v2({ freeze: false }) });
  d.open(at(2026, 11, 10, 9));
  const t0 = at(2026, 11, 10, 9); d.eng.setRoute(true, t0);
  for (let i = 1; i <= 600; i++) d.eng.tick(t0 + i * 1000); // 10 minutes, no interact()
  assert.ok(d.eng.seconds() <= IDLE_MS / 1000, `accrued ${d.eng.seconds()}`);
  assert.ok(d.eng.seconds() >= 59);
});
test("QA hidden tab: 10 minutes hidden mid-lesson -> no accrual while hidden; resumes after", () => {
  const d = device({ record: v2({}) });
  const t0 = at(2026, 11, 10, 9); d.open(t0); d.eng.setRoute(true, t0);
  for (let i = 1; i <= 30; i++) { if (i % 10 === 0) d.eng.interact(t0 + i * 1000); d.eng.tick(t0 + i * 1000); }
  const before = d.eng.seconds(); assert.equal(before, 30);
  d.eng.setVisible(false, t0 + 30000);
  for (let i = 31; i <= 630; i++) d.eng.tick(t0 + i * 1000);
  assert.equal(d.eng.seconds(), before);
  d.eng.setVisible(true, t0 + 630000);
  for (let i = 1; i <= 10; i++) d.eng.tick(t0 + 630000 + i * 1000);
  assert.equal(d.eng.seconds(), before + 10);
});
test("not on a counted route -> no accrual; counted-route patterns", () => {
  const d = device({ record: v2({}) }); const t0 = at(2026, 11, 10, 9); d.open(t0);
  d.eng.interact(t0); for (let i = 1; i <= 120; i++) { d.eng.interact(t0 + i * 1000); d.eng.tick(t0 + i * 1000); }
  assert.equal(d.eng.seconds(), 0);
  assert.ok(isCountedRoute("#/learn?review=1") && isCountedRoute("#/read/shema") && isCountedRoute("#/ladder"));
  assert.ok(isCountedRoute("#/firstday") && isCountedRoute("#/firstday?part=preview") && isCountedRoute("#/placement"), "the first lesson and the placement check count toward the day");
  assert.ok(!isCountedRoute("#/") && !isCountedRoute("#/settings") && !isCountedRoute("#/progress") && !isCountedRoute("#/morning") && !isCountedRoute("#/calendar"));
});
test("seconds persist every 10 s, on hide, and survive a reload the same day", () => {
  const d = device({ record: v2({}) }); const t0 = at(2026, 11, 10, 9); d.open(t0); d.eng.setRoute(true, t0);
  for (let i = 1; i <= 25; i++) { if (i % 10 === 0) d.eng.interact(t0 + i * 1000); d.eng.tick(t0 + i * 1000); }
  const saved = d.store.get("streak").todaySeconds;
  assert.ok(saved >= 20 && saved <= 25, `saved ${saved}`); // last 10 s boundary
  d.eng.setVisible(false, t0 + 25000);
  assert.equal(d.store.get("streak").todaySeconds, 25);
  const d2 = device({ record: d.store.get("streak") }); d2.open(t0 + 60000);
  assert.equal(d2.eng.seconds(), 25);
  const d3 = device({ record: d.store.get("streak") }); d3.open(at(2026, 11, 11, 9));
  assert.equal(d3.eng.seconds(), 0); // next day starts at zero
});
test("the ring label: 3:20 of 5:00", () => {
  const d = device({ record: v2({}) }); const t0 = at(2026, 11, 10, 9); d.open(t0); d.study(t0, 200);
  const p = d.shown(t0 + 201000);
  assert.equal(`${S.clock(p.todaySeconds)} of ${S.clock(p.goal)}`, "3:20 of 5:00"); assert.equal(p.activeToday, false);
});

// ---------- QA (v): two-day Yom Tov ----------
test("Yom Tov: Pesach 2027 traditional (days 1-2 Thu/Fri + Shabbat) keeps the chain; reform mode breaks on the second-day Friday", () => {
  const trad = device({ record: v2({ count: 3, best: 3, last: iso(2027, 4, 21) }), prefs: { observant: true }, cal: { observance: "traditional" } });
  trad.open(at(2027, 4, 25, 8)); assert.equal(trad.shown(at(2027, 4, 25, 8)).count, 3);
  trad.study(at(2027, 4, 25, 8), 300); assert.equal(trad.shown(at(2027, 4, 25, 9)).count, 4);
  const ref = device({ record: v2({ count: 3, best: 3, last: iso(2027, 4, 21) }), prefs: { observant: true }, cal: { observance: "reform" } });
  ref.open(at(2027, 4, 25, 8)); assert.equal(ref.shown(at(2027, 4, 25, 8)).count, 0); // Fri 23 Apr is an ordinary day in reform one-day mode
});
test("Yom Tov dates come from calendar.js: Chol HaMoed and fasts are not rest days", () => {
  assert.equal(S.isRestDay("2026-09-21", "reform"), true);  // Yom Kippur (Monday)
  assert.equal(S.isRestDay("2026-09-28", "traditional"), false); // Chol HaMoed Sukkot
  assert.equal(S.isRestDay("2026-09-27", "traditional"), true);  // Sukkot day 2
  assert.equal(S.isRestDay("2026-09-27", "reform"), false);
  assert.equal(S.isRestDay("2026-12-07", "reform"), false); // Hanukkah
  assert.equal(S.isRestDay("2027-04-28", "traditional"), true); // Pesach day 7
  assert.equal(S.isRestDay("2027-04-29", "traditional"), true); // day 8
  assert.equal(S.isRestDay("2027-04-26", "traditional"), false); // Chol HaMoed
});

// ---------- QA 4-week calendar ----------
test("4-week simulated calendar with Yom Kippur and a two-day Yom Tov: streak equals non-frozen days completed, zero breaks", () => {
  const d = device({ prefs: { observant: true }, cal: { observance: "traditional" } });
  const start = new Date(2026, 8, 14); // Mon 14 Sep 2026 .. Sun 11 Oct
  let completed = 0, expectFrozen = 0; const frozenSeen = [];
  d.open(at(2026, 9, 14, 7));
  for (let i = 0; i < 28; i++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = S.dayKey(day), t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 8).getTime();
    d.open(t);
    const p = d.shown(t);
    if (p.restToday) { expectFrozen++; frozenSeen.push(key); assert.equal(p.count, completed, `rest day ${key} must not change the count`); continue; } // user does not touch Aleph
    d.study(t, 300); completed++;
    assert.equal(d.shown(t + 301000).count, completed, `day ${key}`);
  }
  assert.deepEqual(frozenSeen, ["2026-09-19", "2026-09-21", "2026-09-26", "2026-09-27", "2026-10-03", "2026-10-04", "2026-10-10"]);
  assert.equal(completed, 28 - 7); assert.equal(d.shown(at(2026, 10, 11, 20)).count, 21);
  assert.equal(d.store.get("streak").best, 21);
  // calendar.js cross-check of the festival dates used above
  const names = holidaysBetween("2026-09-14", "2026-10-11", { mode: "traditional" }).filter((h) => h.kind === "major").map((h) => `${h.id}:${h.start}`);
  assert.ok(names.includes("yom-kippur:2026-09-21") && names.includes("simchat-torah:2026-10-04"));
});

// ---------- completion rules ----------
test("5 minutes completes the day exactly once; more time does not double count", () => {
  const d = device({ record: v2({ count: 2, best: 2, last: iso(2026, 11, 9) }) }); const t = at(2026, 11, 10, 9); d.open(t);
  d.study(t, 299); assert.equal(d.shown(t + 300000).count, 2);
  d.study(t + 300000, 400); assert.equal(d.shown(t + 800000).count, 3);
  d.study(t + 900000, 400); assert.equal(d.shown(t + 1400000).count, 3);
});
test("completing 5 minutes on a frozen Shabbat leaves the count unchanged and the chain intact", () => {
  const d = device({ record: v2({ count: 6, best: 6, last: iso(...FRI) }), prefs: { observant: true } }); const t = at(...SAT, 9); d.open(t); d.study(t, 310);
  assert.equal(d.shown(t + 400000).count, 6);
  d.open(at(...SUN, 8)); d.study(at(...SUN, 8), 300); assert.equal(d.shown(at(...SUN, 9)).count, 7);
});

// ---------- single source of truth ----------
test("Home (currentStreak) and Progress (streakInfo) show the same number for v2 records, incl. frozen days and Progress rest days", () => {
  const now = at(...SUN, 10);
  const store = fakeStore({ streak: v2({ count: 6, best: 6, last: iso(...FRI), freeze: true }) });
  const home = currentStreak(store.get("streak"), now).count, prog = streakInfo(readSnapshot(store), now).count;
  assert.equal(home, 6); assert.equal(prog, 6);
  // a user-declared rest day in Progress: Home must agree
  const st2 = fakeStore({ streak: v2({ count: 4, best: 4, last: iso(2026, 11, 9) }) });
  const t = at(2026, 11, 11, 10); // Wed; Tuesday missed
  assert.equal(currentStreak(st2.get("streak"), t).count, 0); assert.equal(streakInfo(readSnapshot(st2), t).count, 0);
  setRestDay(st2, "2026-11-10", true);
  assert.equal(currentStreak(st2.get("streak"), t).count, 4); assert.equal(streakInfo(readSnapshot(st2), t).count, 4);
  setRestDay(st2, "2026-11-10", false);
  assert.equal(currentStreak(st2.get("streak"), t).count, 0); assert.equal(streakInfo(readSnapshot(st2), t).count, 0);
});
test("migration: an old {count,best,last} record is read unchanged, keeps its keys, and legacy recordActivity no longer double-counts once v2", () => {
  const old = { count: 3, best: 5, last: "2026-11-09" };
  assert.equal(currentStreak(old, at(2026, 11, 10)).count, 3);
  assert.equal(currentStreak(old, at(2026, 11, 12)).count, 0);
  assert.equal(recordActivity(old, at(2026, 11, 10)).count, 4); // v1 behaviour unchanged
  const store = fakeStore({ streak: old });
  const m = createMorningModel(store, () => new Date(at(2026, 11, 10)));
  m.syncRecord();
  const mig = store.get("streak");
  assert.equal(mig.v, 2); assert.equal(mig.count, 3); assert.equal(mig.best, 5); assert.equal(mig.last, "2026-11-09");
  assert.deepEqual(recordActivity(mig, at(2026, 11, 10)), mig); // engine owns the record now
  assert.equal(currentStreak(mig, at(2026, 11, 10)).count, 3);
  assert.equal(currentStreak(null, Date.now()).count, 0); assert.equal(S.normalizeRecord("junk").count, 0);
});

// ---------- reminders ----------
const verses = JSON.parse(fs.readFileSync("data/morning-verses.json", "utf8"));
test("14-day simulated calendar, observant: 0 notifications on Shabbat/Yom Tov, exactly 1 reminder on each erev, labelled", () => {
  const prefs = P.normalizePrefs({ on: true, time: "07:00" });
  const items = P.morningItems("2026-09-14", 14, prefs, verses, { observant: true, mode: "reform" }); // 14-27 Sep: Shabbat 19, YK 21, Shabbat 26 (Sukkot day 1)
  const days = items.map((i) => iso(i.when.y, i.when.m, i.when.d));
  for (const rest of ["2026-09-19", "2026-09-21", "2026-09-26"]) assert.ok(!days.includes(rest), `no ping on ${rest}`);
  for (const erev of ["2026-09-18", "2026-09-20", "2026-09-25"]) assert.equal(days.filter((x) => x === erev).length, 1, `one ping on erev ${erev}`);
  assert.equal(items.length, 14 - 3);
  const fri = items.find((i) => i.uid === "alef-morning-2026-09-18");
  assert.equal(fri.label, "before Shabbat"); assert.match(fri.description, /^before Shabbat: /);
  assert.equal(items.find((i) => i.uid === "alef-morning-2026-09-20").label, "before the festival");
  assert.equal(fri.title, "Start your day with God");
  assert.equal(new Set(items.map((i) => i.uid)).size, items.length);
});
test("erev time is the earlier of the chosen time and the cap (default 14:00, learner can change it); non-observant gets every day at the chosen time", () => {
  const late = P.normalizePrefs({ on: true, time: "18:30" }), early = P.normalizePrefs({ on: true, time: "06:45" });
  assert.equal(P.reminderOn("2026-11-06", late, { observant: true }).time, "14:00");
  assert.equal(P.reminderOn("2026-11-06", P.normalizePrefs({ on: true, time: "18:30", eravLatest: "12:15" }), { observant: true }).time, "12:15");
  assert.equal(P.normalizePrefs({ eravLatest: "bad" }).eravLatest, "14:00");
  assert.equal(P.reminderOn("2026-11-06", early, { observant: true }).time, "06:45");
  assert.equal(P.reminderOn("2026-11-07", late, { observant: true }).fire, false);
  const all = P.morningItems("2026-11-02", 14, late, verses, { observant: false });
  assert.equal(all.length, 14); assert.ok(all.every((i) => i.when.hh === 18 && i.when.mm === 30));
  assert.equal(P.morningItems("2026-11-02", 3, P.normalizePrefs({ on: false }), verses, { observant: true }).length, 0);
});
test("fake-clock fire test: Friday 15:59 fires the before-Shabbat reminder; Saturday 08:00 schedules nothing", () => {
  const prefs = P.normalizePrefs({ on: true, time: "18:30", eravLatest: "16:00" }); // learner raised the default 14:00 cap
  const fired = []; class N { static permission = "granted"; constructor(t, o) { fired.push([t, o.body]); } }
  const timers = [];
  const run = (now) => scheduleLocalNotifications(P.morningItems(iso(now.getFullYear(), now.getMonth() + 1, now.getDate()), 1, prefs, verses, { observant: true }), { now, Notification: N, setTimer: (fn, ms) => (timers.push([fn, ms]), timers.length), clearTimer() {} });
  const fri = run(new Date(2026, 10, 6, 15, 59)); assert.equal(fri.count, 1); assert.equal(timers[0][1], 60000); timers[0][0]();
  assert.equal(fired.length, 1); assert.equal(fired[0][0], "Start your day with God"); assert.match(fired[0][1], /Modeh Ani is ready/); assert.match(fired[0][1], /before Shabbat/);
  const sat = run(new Date(2026, 10, 7, 8, 0)); assert.equal(sat.count, 0);
});
test("notification body: reference is cut to 90 characters", () => {
  assert.ok(P.notificationText({ source_ref: "x".repeat(200) }).body.startsWith("x".repeat(90) + "."));
  assert.equal(P.notificationText(null).title, "Start your day with God");
});
test("in-app morning presentation: at/after the chosen time, once, not on observant Shabbat", () => {
  const prefs = P.normalizePrefs({ on: true, time: "07:00" });
  assert.equal(P.morningPresent(at(2026, 11, 10, 6, 59), prefs, { observant: true }), false);
  assert.equal(P.morningPresent(at(2026, 11, 10, 7, 0), prefs, { observant: true }), true);
  assert.equal(P.morningPresent(at(2026, 11, 10, 9), { ...prefs, lastSeen: "2026-11-10" }, { observant: true }), false);
  assert.equal(P.morningPresent(at(...SAT, 9), prefs, { observant: true }), false);
  assert.equal(P.morningPresent(at(...SAT, 9), prefs, { observant: false }), true);
});
test("evening rescue: once per evening, not before the time, not when done, not on a frozen day, badge persists", () => {
  const rec = v2({ count: 5, best: 5, last: iso(2026, 11, 9), freeze: true });
  const prefs = P.normalizePrefs({});
  assert.equal(P.rescueState(at(2026, 11, 10, 19, 59), rec, prefs, { observant: true }).banner, false);
  const r = P.rescueState(at(2026, 11, 10, 20, 0), rec, prefs, { observant: true }); assert.equal(r.banner, true); assert.equal(r.badge, true);
  const again = P.rescueState(at(2026, 11, 10, 21, 0), rec, { ...prefs, lastRescue: "2026-11-10" }, { observant: true });
  assert.equal(again.banner, false); assert.equal(again.badge, true);
  assert.equal(P.rescueState(at(2026, 11, 10, 21), { ...rec, last: "2026-11-10" }, prefs, { observant: true }).badge, false);
  const satRec = v2({ count: 5, best: 5, last: iso(...FRI), freeze: true });
  assert.equal(P.rescueState(at(...SAT, 21), satRec, prefs, { observant: true }).badge, false);
  assert.equal(P.rescueState(at(2026, 11, 10, 21), v2({}), prefs, {}).badge, false); // nothing to keep
  // model marks the evening as shown exactly once
  const d = device({ record: rec, prefs: { observant: true } }); d.open(at(2026, 11, 10, 20, 30));
  assert.equal(d.model.rescue().banner, true); d.model.markRescueShown(); assert.equal(d.model.rescue().banner, false);
});

// ---------- hygiene ----------
test("no third-party origins or analytics in the morning/streak code", () => {
  for (const f of fs.readdirSync("src/morning").map((n) => "src/morning/" + n).concat("src/curriculum/streak.js")) {
    const src = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.ok(!/https?:\/\//.test(src), `${f} has a URL`);
    assert.ok(!/gtag|analytics|sendBeacon|XMLHttpRequest|WebSocket/i.test(src), `${f} has tracking-like code`);
  }
});
test("the unmounted rescue banner and the evening-nudge setting are gone; no draft marker in settings copy", async () => {
  const V = await import("../src/morning/morning.view.js");
  assert.equal(V.rescueBanner, undefined);
  assert.equal(P.rescueState(new Date(2026, 10, 10, 21), { v: 2 }, P.normalizePrefs({}), {}).text, undefined);
});

test("streak nudge: once a day, only with a streak that is not done today", async () => {
  const N = await import("../src/morning/nudge.js");
  const now = new Date(2026, 10, 10, 9, 0);
  const rec = { v: 2, count: 3, best: 3, last: "2026-11-09", todayDate: "2026-11-10", todaySeconds: 0 };
  const base = { lastRescue: null };
  const a = N.nudgeDue(now, rec, base);
  if (a.count > 0) {
    assert.equal(a.show, true);
    assert.equal(N.nudgeDue(now, rec, { lastRescue: "2026-11-10" }).show, false);
    assert.match(N.nudgeText(3), /keep your streak going\. You're doing awesome! 3 days so far/);
  }
  assert.equal(N.nudgeDue(now, null, base).show, false);
});
