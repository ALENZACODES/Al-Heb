// C5: checkpoint tests every 10 lessons: same pass rule, raise the level, open the next block early (not done), offer to re-place.
import { test } from "node:test";
import assert from "node:assert/strict";
const C = await import("../src/coursemap/checkpoints.js");
const P = await import("../src/curriculum/passmark.js");
const { lessons } = await import("../src/curriculum/lessons.js");
const { loadContent } = await import("../src/curriculum/content.js");
const { LESSONS } = await import("../src/lib/counts.js");
const content = await loadContent();
const all = C.blocks(lessons);

test("blocks cover every lesson of both paths once, in course order, ten at a time (a short tail joins the block before)", () => {
  const ids = all.flatMap((b) => b.lessons);
  assert.equal(ids.length, LESSONS.all); assert.equal(new Set(ids).size, ids.length);
  for (const b of all) assert.ok(b.lessons.length >= 5 && b.lessons.length < 15, b.id);
  assert.deepEqual(all.filter((b) => b.track === "read").map((b) => b.lessons.length), [10, 10, 10, 10, 10, 10, 11]);
  assert.deepEqual(all.filter((b) => b.track === "israel").map((b) => b.lessons.length), [10, 10, 10, 10, 14]);
});

test("every checkpoint has one question per lesson, taken from that lesson's own quick check", () => {
  for (const b of all) {
    const qs = C.checkpointQuestions(b, lessons, content);
    assert.equal(qs.length, b.lessons.length, b.id);
    for (const q of qs) assert.ok(b.lessons.includes(q.from) && q.id.startsWith(q.from + "-q-"), q.id);
  }
});

test("grading uses the lesson pass rule; tries are kept like lesson checks", () => {
  const qs = C.checkpointQuestions(all[0], lessons, content);
  const res = Object.fromEntries(qs.map((q, i) => [q.id, i < 7]));
  const g = C.grade(qs, res);
  assert.deepEqual(g, { right: 7, of: 10, need: P.passMark(10), pct: 70, passed: true });
  let saved = C.withTry({}, "read-1", { ...g, right: 3 }, 1, 1000); saved = C.withTry(saved, "read-1", g, 2, 2000);
  assert.equal(saved["read-1"].tries.length, 2); assert.equal(saved["read-1"].pass.at, 2);
  const s = C.standing(all, saved, { r01: 1 });
  assert.equal(s.read.level, 1); assert.equal(s.israel.level, 0); assert.equal(s.read.blocks[0].lessonsDone, 1);
});

test("re-placement: reading path only, only forward, written in the placement record's own shape", () => {
  const r1 = all.find((b) => b.id === "read-1"), r3 = all.find((b) => b.id === "read-3");
  assert.deepEqual(C.replaceOffer(all, r1, null, lessons), { start: "r11", from: null });
  assert.equal(C.replaceOffer(all, r1, { result: { applied: true, start: "r15" } }, lessons), null, "never moves the start back");
  assert.deepEqual(C.replaceOffer(all, r3, { result: { applied: true, start: "r15" } }, lessons), { start: "r31", from: "r15" });
  assert.equal(C.replaceOffer(all, all.find((b) => b.id === "israel-1"), null, lessons), null);
  const rec = C.replacementRecord(r3, "r31", 5);
  assert.equal(rec.result.applied, true); assert.equal(rec.result.start, "r31");
});

test("placement's own reader accepts the record: earlier read lessons are skipped over, none marked done", async () => {
  const { placedOut } = await import("../src/placement/start.js");
  const skip = placedOut(lessons, C.replacementRecord(all[0], "r11", 1));
  assert.equal(skip.length, 10); assert.equal(skip[0], "r01");
});

test("the view never completes a lesson and opens the next block with unlock.js", async () => {
  const { readFileSync } = await import("node:fs");
  const v = readFileSync(new URL("../src/coursemap/checkpoints.view.js", import.meta.url), "utf8");
  assert.doesNotMatch(v, /completeLesson|saveQuickCheck|PROGRESS_KEY|alef:celebrate/);
  assert.match(v, /unlockLesson\(ctx, id, at\)/); assert.match(v, /create: false/);
});
