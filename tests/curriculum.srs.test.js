import test from "node:test";
import assert from "node:assert/strict";
import { newCard, review, due, interleave, retrievability, intervalFor, FACTOR, DECAY, MS_DAY, cardRetrievability } from "../src/curriculum/srs.js";

const T0 = Date.UTC(2026, 0, 1);

test("forgetting curve constants and R(S,S)=0.9", () => {
  assert.equal(FACTOR, 19 / 81);
  assert.equal(DECAY, -0.5);
  assert.ok(Math.abs(retrievability(5, 5) - 0.9) < 1e-12);
  assert.equal(retrievability(0, 3), 1);
  assert.ok(Math.abs(intervalFor(7, 0.9) - 7) < 1e-9);
});

test("retrievability decreases with time", () => {
  assert.ok(retrievability(1, 5) > retrievability(10, 5));
});

test("stability grows monotonically on repeated Good reviews at due time", () => {
  let c = review(newCard({ id: "alef" }), 3, T0);
  let prev = c.stability, now = T0;
  for (let i = 0; i < 8; i++) {
    now = c.due;
    c = review(c, 3, now);
    assert.ok(c.stability > prev, `step ${i}: ${c.stability} > ${prev}`);
    prev = c.stability;
  }
  assert.equal(c.lapses, 0);
});

test("Easy grows more than Good, Good more than Hard; all >= old stability", () => {
  const base = review(newCard(), 3, T0);
  const now = base.due;
  const h = review(base, 2, now).stability, g = review(base, 3, now).stability, e = review(base, 4, now).stability;
  assert.ok(base.stability <= h && h < g && g < e);
});

test("lapse: stability drops, lapses increment, due in minutes, difficulty rises", () => {
  let c = review(newCard(), 3, T0);
  c = review(c, 3, c.due);
  const before = c;
  const l = review(before, 1, before.due);
  assert.ok(l.stability < before.stability);
  assert.equal(l.lapses, before.lapses + 1);
  assert.equal(l.state, "relearning");
  assert.equal(l.due - before.due, 10 * 60 * 1000);
  assert.ok(l.difficulty > before.difficulty);
});

test("first-ever Again is not counted as a lapse; first rating sets different stabilities", () => {
  const a = review(newCard(), 1, T0), g = review(newCard(), 3, T0), e = review(newCard(), 4, T0);
  assert.equal(a.lapses, 0);
  assert.ok(a.stability < g.stability && g.stability < e.stability);
});

test("difficulty stays inside [1,10]", () => {
  let c = review(newCard(), 4, T0);
  for (let i = 0; i < 30; i++) c = review(c, 4, c.due);
  assert.ok(c.difficulty >= 1);
  let d = review(newCard(), 1, T0);
  for (let i = 0; i < 30; i++) d = review(d, 1, d.due);
  assert.ok(d.difficulty <= 10);
});

test("review does not mutate input and is deterministic", () => {
  const c = newCard({ id: "x" });
  const snapshot = JSON.stringify(c);
  const a = review(c, 3, T0), b = review(c, 3, T0);
  assert.equal(JSON.stringify(c), snapshot);
  assert.deepEqual(a, b);
  const a2 = review(a, 2, a.due + MS_DAY), b2 = review(b, 2, b.due + MS_DAY);
  assert.deepEqual(a2, b2);
});

test("rejects bad rating", () => {
  assert.throws(() => review(newCard(), 5, T0), RangeError);
  assert.throws(() => review(newCard(), 0, T0), RangeError);
});

test("due(): filters to due cards, most overdue first, tie-break by id, input untouched", () => {
  const mk = (id, dueAt) => ({ ...newCard({ id }), due: dueAt });
  const cards = [mk("c", T0 + 5), mk("a", T0 + 1), mk("b", T0 + 1), mk("late", T0 + 10 * MS_DAY)];
  const copy = JSON.stringify(cards);
  const out = due(cards, T0 + 100);
  assert.deepEqual(out.map((c) => c.id), ["a", "b", "c"]);
  assert.equal(JSON.stringify(cards), copy);
  assert.deepEqual(due(cards, T0 - 1), []);
});

test("cardRetrievability is 0 for new cards", () => {
  assert.equal(cardRetrievability(newCard(), T0), 0);
});

test("interleave: permutation, no adjacent duplicates, confusables placed adjacent", () => {
  const items = ["bet", "bet", "kaf", "kaf", "dalet", "resh", "gimel", "nun"].map((id, i) => ({ id, n: i }));
  const conf = { bet: ["kaf"], kaf: ["bet"], dalet: ["resh"], resh: ["dalet"], gimel: ["nun"], nun: ["gimel"] };
  const out = interleave(items, conf);
  assert.equal(out.length, items.length);
  assert.deepEqual(out.map((x) => x.n).sort((a, b) => a - b), items.map((x) => x.n));
  for (let i = 1; i < out.length; i++) assert.notEqual(out[i].id, out[i - 1].id);
  let confPairs = 0;
  for (let i = 1; i < out.length; i++) if ((conf[out[i - 1].id] || []).includes(out[i].id)) confPairs++;
  assert.ok(confPairs >= 5, `confusable adjacent pairs: ${confPairs}`);
  // function form works too and is deterministic
  const out2 = interleave(items, (id) => conf[id] || []);
  assert.deepEqual(out2, out);
});
