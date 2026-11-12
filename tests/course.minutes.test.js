// I6: minutes credited are measured active time only; a 15-second lesson no longer shows as 5 minutes.
import { test } from "node:test";
import assert from "node:assert/strict";
const S = await import("../src/curriculum/streak.js");
const C = await import("../src/lib/counts.js");
const E = await import("../src/morning/engage.js");
const NOW = new Date("2026-11-11T15:00:00").getTime(); // a Wednesday
const today = S.dayKey(NOW);

test("finishing the day by a lesson completes the streak day but adds no minutes", () => {
  let rec = S.setTodaySeconds(null, NOW, 15, 15);          // 15 measured seconds
  rec = S.completeDay(rec, NOW);                            // a lesson finished: the day counts
  const p = S.projectStreak(rec, NOW);
  assert.equal(p.activeToday, true);
  assert.ok(p.todaySeconds >= S.GOAL_SECONDS, "the streak goal is met");
  assert.equal(p.activeSeconds, 15, "the minutes are what was measured");
  assert.equal(C.minutesToday(rec, NOW), 0);
  assert.equal(C.minutesGoal(rec, 5, NOW).text, "0 of 5 minutes today");
});

test("measured time is kept, never lowered, and reset at the next day", () => {
  let rec = S.setTodaySeconds(null, NOW, 400, 400);
  rec = S.setTodaySeconds(rec, NOW, 300, 120);
  assert.equal(S.projectStreak(rec, NOW).activeSeconds, 400);
  assert.equal(C.minutesToday(rec, NOW), 6);
  const tomorrow = NOW + 86400000;
  assert.equal(S.projectStreak(rec, tomorrow).activeSeconds, 0);
  assert.equal(S.rollover(rec, tomorrow).activeSeconds, 0);
});

test("a record written before the measured field falls back to its seconds (today only)", () => {
  const old = { v: 2, count: 1, best: 1, last: today, todayDate: today, todaySeconds: 125 };
  assert.equal(S.projectStreak(old, NOW).activeSeconds, 125);
  assert.equal(S.normalizeRecord(old).activeSeconds, undefined);
});

test("the engagement timer writes measured seconds and resumes from them, not from the goal a lesson raised", () => {
  let stored = S.completeDay(S.setTodaySeconds(null, NOW, 10, 10), NOW); // lesson done after 10 s
  const io = { load: () => stored, save: (r) => { stored = r; } };
  const eng = E.createEngagement(io);
  eng.resume(NOW);
  assert.equal(eng.seconds(), 10, "resumes from 10 s, not 300 s");
  eng.setRoute(true, NOW); eng.tick(NOW + 30000); eng.flush(NOW + 30000);
  assert.equal(S.projectStreak(stored, NOW + 30000).activeSeconds, 40);
  assert.equal(C.minutesToday(stored, NOW + 30000), 0);
  eng.tick(NOW + 50000); eng.interact(NOW + 50000); eng.tick(NOW + 100000); eng.flush(NOW + 100000);
  assert.equal(C.minutesToday(stored, NOW + 100000), 1);
});

test("sync merge keeps the larger measured time of the same day", async () => {
  const { mergeStreak } = await import("../src/sync/merge.js");
  const a = { v: 2, todayDate: today, todaySeconds: 300, activeSeconds: 40 }, b = { v: 2, todayDate: today, todaySeconds: 300, activeSeconds: 90 };
  assert.equal(mergeStreak(a, b).activeSeconds, 90);
});
test("sync merge source handles activeSeconds", async () => {
  const { readFileSync } = await import("node:fs");
  assert.match(readFileSync(new URL("../src/sync/merge.js", import.meta.url), "utf8"), /out\.activeSeconds = Math\.max/);
});
