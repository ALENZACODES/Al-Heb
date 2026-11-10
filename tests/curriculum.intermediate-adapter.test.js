import test from "node:test";
import assert from "node:assert/strict";
import { lessons, byId } from "../src/curriculum/lessons.js";
import * as A from "../src/curriculum/intermediate-adapter.js";

const inter = lessons.filter((l) => A.isIntermediateId(l.id));

test("every intermediate exercise has a known type and grades without throwing", () => {
  assert.equal(inter.length, 50);
  for (const l of inter) {
    const exs = A.exercisesOf(l.id);
    assert.ok(exs.length >= 12 && exs.length <= 20, `${l.id} has ${exs.length}`);
    for (const e of exs) {
      assert.ok(A.EXERCISE_TYPES.includes(e.type), `${e.id} type ${e.type}`);
      assert.doesNotThrow(() => A.gradeExercise(e, undefined), e.id);
    }
  }
});

test("right responses are graded correct, wrong ones are not", () => {
  let seen = new Set();
  for (const l of inter) for (const e of l.exercises) {
    seen.add(e.type);
    if (e.type === "produce") {
      assert.equal(A.gradeExercise(e, e.options[e.answer]).correct, true, e.id);
      const wrong = e.options.find((_, i) => i !== e.answer);
      assert.equal(A.gradeExercise(e, wrong).correct, false, e.id);
      const opts = A.produceOptions(e, 3);
      assert.equal(opts.length, e.options.length);
      assert.equal(opts.filter((o) => o.correct).length, 1);
    } else if (e.type === "match") {
      assert.equal(A.gradeExercise(e, Object.fromEntries(e.pairs.map((p) => [p.he, p.en]))).correct, true, e.id);
      assert.equal(A.gradeExercise(e, {}).correct, false, e.id);
      const c = A.matchColumns(e, 2);
      assert.deepEqual([...c.right].sort(), e.pairs.map((p) => p.en).sort());
    } else if (e.type === "order") {
      const right = A.orderTokens(e);
      assert.equal(A.gradeExercise(e, right).correct, true, e.id);
      const pz = A.orderPuzzle(e, 5);
      assert.deepEqual([...pz].sort(), [...right].sort());
      if (new Set(right.map(A.heKey)).size > 1) assert.notDeepEqual(pz, right, e.id);
    } else if (e.type === "spot") {
      assert.equal(A.gradeExercise(e, e.target).correct, true, e.id);
      assert.equal(A.gradeExercise(e, "x").correct, false, e.id);
    } else if (e.type === "register") {
      assert.equal(A.gradeExercise(e, e.answer).correct, true, e.id);
      assert.equal(A.gradeExercise(e, "nope").correct, false, e.id);
    } else {
      assert.deepEqual(A.gradeExercise(e, 4), { correct: true, selfRated: true }, e.id);
      assert.equal(A.gradeExercise(e, 1).correct, false, e.id);
    }
  }
  for (const t of A.EXERCISE_TYPES) assert.ok(seen.has(t) || t === "gender" || t === "dialogue", `type ${t} unused`);
});

test("fade exercises route to the fade view and map to line cards", () => {
  const l = byId["I-01"];
  const f = l.exercises.find((e) => e.type === "fade");
  assert.equal(A.exerciseRoute(f), `#/learn?fade=${encodeURIComponent(f.line)}`);
  assert.equal(A.exerciseRoute(l.exercises.find((e) => e.type === "order")), null);
  const out = A.outcomesFor(l, [{ id: f.id, correct: true }, { id: "missing", correct: true }]);
  assert.deepEqual(out, [{ id: `line:${f.line}`, kind: "prayerLine", good: true, create: true }]);
});

test("word outcomes use the lesson word index", () => {
  for (const l of inter) {
    const e = l.exercises.find((x) => x.type === "produce" && l.words.some((w) => A.heKey(w.he) === A.heKey(x.options[x.answer])));
    if (!e) continue;
    const [o] = A.outcomesFor(l, [{ id: e.id, correct: false }]);
    assert.match(o.id, new RegExp(`^word:${l.id}:\\d+$`));
    assert.equal(o.good, false);
    return;
  }
});
