// C10: benchmark map. The 28 IJL skills are not in the repo, so the page uses the repo's own benchmark list (the rank goals in
// belts.json) and says so; states come from this device's records only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const B = await import("../src/coursemap/benchmarks.js");
const belts = JSON.parse(readFileSync(new URL("../data/curriculum/belts.json", import.meta.url), "utf8"));
const idx = JSON.parse(readFileSync(new URL("../data/curriculum/lessons-index.json", import.meta.url), "utf8")).lessons;

test("every benchmark is a rank goal from belts.json, word for word; none is invented", () => {
  const m = B.benchmarkMap(belts, idx);
  assert.equal(m.length, belts.ranks.length);
  m.forEach((b, i) => { assert.equal(b.id, belts.ranks[i].id); assert.equal(b.gate, belts.ranks[i].gate); assert.ok(b.lessons.length > 0); });
  assert.match(B.SOURCE_NOTE, /28-skill IJL Graduate Benchmark list is not in this app/);
  assert.match(B.SOURCE_NOTE, /no skill is made up/);
});

test("the IJL list really is absent from the repo's docs and data (so the page must not claim it)", () => {
  const hay = [readFileSync(new URL("../docs/research/ijl-sarah-levine.md", import.meta.url), "utf8"), readFileSync(new URL("../docs/curriculum/class-track/SOURCES.md", import.meta.url), "utf8")].join("\n");
  assert.match(hay, /We did not identify it|cannot confirm that IJL/);
});

test("states: proven only with a passed check for every lesson; done-before when done without checks", () => {
  const ids = B.benchmarkMap(belts, idx)[0].lessons;
  const all = Object.fromEntries(ids.map((id) => [id, 1])), passes = Object.fromEntries(ids.map((id) => [id, { pass: { at: 1, right: 3, of: 4 } }]));
  assert.equal(B.benchmarkMap(belts, idx, all, passes)[0].state, "proven");
  assert.equal(B.benchmarkMap(belts, idx, all, {})[0].state, "done-before");
  assert.equal(B.benchmarkMap(belts, idx, { [ids[0]]: 1 }, {})[0].state, "started");
  assert.equal(B.benchmarkMap(belts, idx)[0].state, "open");
  assert.match(B.summary(B.benchmarkMap(belts, idx, all, passes)), /^1 of 16 proven/);
});

test("route is lazy and on demand", async () => {
  const { ROUTES } = await import("../src/shell/router.js");
  assert.equal(ROUTES.find((r) => r.name === "benchmarks").module, "../coursemap/benchmarks.view.js");
  const { isOnDemand } = await import("../tools/build-precache.mjs");
  assert.ok(isOnDemand("src/coursemap/benchmarks.view.js"));
});
