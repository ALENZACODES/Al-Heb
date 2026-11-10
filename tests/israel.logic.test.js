import test from "node:test";
import assert from "node:assert/strict";
import { loadIsrael, pickScenarios, orderedOptions, gradePick, scoreSession, ensureCards, applyResults, ratingFor, cardId, dueCount, audioHook, shuffled, rng } from "../src/israel/model.js";

const data = await loadIsrael();
const sc = data.scenarios.scenarios;

test("shuffle is deterministic per seed and a permutation", () => {
  const a = shuffled([1, 2, 3, 4, 5, 6], 7), b = shuffled([1, 2, 3, 4, 5, 6], 7);
  assert.deepEqual(a, b); assert.deepEqual([...a].sort(), [1, 2, 3, 4, 5, 6]);
  assert.ok(rng(3)() >= 0 && rng(3)() < 1);
});

test("pickScenarios: right count, distinct, overdue cards come first", () => {
  const now = 1e12;
  let cards = ensureCards({}, "scenario", [sc[5].id], now - 5 * 86400000);
  const picked = pickScenarios(sc, { seed: 1, count: 8, cards, now });
  assert.equal(picked.length, 8); assert.equal(new Set(picked.map((s) => s.id)).size, 8);
  assert.ok(picked.some((s) => s.id === sc[5].id), "due scenario is included");
  // a freshly reviewed card is not forced in
  cards = applyResults({}, "scenario", [{ id: sc[5].id, picked: "natural" }], now);
  // a freshly reviewed (not due) card is ranked after unseen ones, so with a small count it is not forced in
  assert.ok(!pickScenarios(sc, { seed: 1, count: 3, cards, now }).some((s) => s.id === sc[5].id));
});

test("orderedOptions: stable per seed, natural answer not always first", () => {
  const firsts = new Set();
  for (const s of sc) { const a = orderedOptions(s, 3), b = orderedOptions(s, 3); assert.deepEqual(a.map((o) => o.index), b.map((o) => o.index)); firsts.add(a[0].role); }
  assert.ok(firsts.size >= 2, "first position varies across scenarios");
});

test("gradePick: only the natural option is correct", () => {
  const s = sc[0];
  s.options.forEach((o, i) => assert.equal(gradePick(s, i).correct, o.role === "natural"));
  assert.equal(gradePick(s, 0).natural.role, "natural");
});

test("scoreSession: counts, percentage, per-role totals, message", () => {
  const r = scoreSession([{ id: "a", picked: "natural" }, { id: "b", picked: "stiff" }, { id: "c", picked: "off" }, { id: "d", picked: "natural" }]);
  assert.deepEqual([r.total, r.right, r.pct], [4, 2, 50]);
  assert.deepEqual(r.byRole, { natural: 2, stiff: 1, off: 1 });
  assert.equal(scoreSession([]).pct, 0);
  assert.match(scoreSession([{ id: "a", picked: "stiff" }]).message, /stiff/i);
});

test("SRS hook: natural=Good, stiff=Hard, off=Again; cards persist under israel: ids; stiff/off come back before natural", () => {
  assert.deepEqual(["natural", "stiff", "off"].map(ratingFor), [3, 2, 1]);
  const t = Date.UTC(2026, 10, 3);
  const cards = applyResults({}, "scenario", [{ id: "sc-a", picked: "natural" }, { id: "sc-b", picked: "stiff" }, { id: "sc-c", picked: "off" }], t);
  assert.ok(cards[cardId("scenario", "sc-a")] && Object.keys(cards).every((k) => k.startsWith("israel:scenario:")));
  const dueIn = (id) => cards[cardId("scenario", id)].due - t;
  assert.ok(dueIn("sc-c") < dueIn("sc-b") && dueIn("sc-b") <= dueIn("sc-a"));
  assert.equal(dueCount(cards, t), 0, "first review of a new card as Again is due in 10 minutes, not now");
  assert.equal(dueCount(cards, t + 11 * 60000), 1);
  // inputs are not mutated
  const before = JSON.stringify(cards); applyResults(cards, "scenario", [{ id: "sc-a", picked: "off" }], t + 1000); assert.equal(JSON.stringify(cards), before);
});

test("audioHook: honest 'No audio yet' unless the player reports a file", () => {
  assert.equal(audioHook({}, "il-x").available, false);
  assert.match(audioHook({ audio: { has: () => false } }, "il-x").label, /No audio yet/);
  assert.equal(audioHook({ audio: { status: () => ({ source: "tts-fallback" }) } }, "il-x").available, false, "browser TTS is not claimed as audio");
  assert.equal(audioHook({ audio: { status: () => ({ source: "none" }) } }, "il-x").available, false);
  assert.equal(audioHook({ audio: { status: () => ({ source: "file" }) } }, "il-x").available, true);
  assert.equal(audioHook({ audio: { status: () => { throw new Error("x"); } } }, "il-x").available, false);
});
