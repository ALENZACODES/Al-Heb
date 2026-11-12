// C6: one combined course ring with the two paths labelled; both paths use the same pass rule.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const R = await import("../src/coursemap/ring.js");
const { LESSONS } = await import("../src/lib/counts.js");
const read = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");

test("ring model: one total, two labelled parts, angles add up", () => {
  const m = R.ringModel({ read: { done: 10, total: LESSONS.reading }, israel: { done: 5, total: LESSONS.israel } });
  assert.equal(m.total, LESSONS.all); assert.equal(m.done, 15);
  assert.equal(m.text, `15 of ${LESSONS.all} lessons done: 10 of ${LESSONS.reading} on the reading path and 5 of ${LESSONS.israel} on the Israel path.`);
  assert.ok(Math.abs(m.readDeg - (10 / LESSONS.all) * 360) < 0.1 && Math.abs(m.israelDeg - (5 / LESSONS.all) * 360) < 0.1);
  assert.equal(R.ringModel(null).total, 0);
});

test("ring node: an image with the full sentence as its name, and a legend naming both paths", () => {
  const mk = (t, a = {}, ...k) => ({ t, a, k: k.flat().filter((x) => x != null) });
  const n = R.courseRing(mk, { read: { done: 1, total: 71 }, israel: { done: 0, total: 54 } });
  const flat = (x) => (typeof x === "string" ? x : [x.a?.["aria-label"] || "", ...(x.k || []).map(flat)].join(" "));
  const t = flat(n);
  assert.match(t, /1 of 125 lessons done/); assert.match(t, /Reading path: 1 of 71/); assert.match(t, /Israel path: 0 of 54/);
});

test("Progress shows the ring; the Israel path gets the same completion rule as the reading path", () => {
  assert.match(read("src/progress/progress.view.js"), /import\('\.\.\/coursemap\/ring\.js'\)\.then\(\(m\) => ringSlot\.replaceChildren\(m\.courseRing\(h, cnt\)\)\)/);
  // il lessons go through the lesson page (saveQuickCheck, pass mark); I- lessons on the Israel track through the intermediate page (passedCheck)
  assert.match(read("src/curriculum/lesson.view.js"), /saveQuickCheck\(/);
  assert.match(read("src/curriculum/intermediate.view.js"), /const pass = all && passedCheck\(right, exs\.length\)/);
  assert.match(read("src/curriculum/actions.js"), /const ok = passedCheck\(right, of\);/);
});
