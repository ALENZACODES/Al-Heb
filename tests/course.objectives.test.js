// C2 objective cards ("what you will learn" / "what you proved", tied to the pass rule) and C8 the learner's own lesson record.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const O = await import("../src/coursemap/objectives.js");
const P = await import("../src/curriculum/passmark.js");
const S = await import("../src/curriculum/exercises.session.js");
const { lessons, byId } = await import("../src/curriculum/lessons.js");
const { loadContent } = await import("../src/curriculum/content.js");
const c = await loadContent();
const wordPool = lessons.filter((l) => !/^I-\d{2}$/.test(l.id)).flatMap((l) => l.words);
const qs = S.buildChoiceQuestions(byId.r02, { ...c, wordPool }, { tradition: "sephardi" });

class N { constructor(t) { this.tag = t; this.children = []; this.attrs = {}; this.nodeType = 1; } setAttribute(k, v) { this.attrs[k] = v; } append(...k) { for (const x of k) if (x != null) this.children.push(x.nodeType ? x : { nodeType: 3, data: String(x) }); } get text() { return this.children.map((x) => (x.nodeType === 3 ? x.data : x.text)).join(" "); } }
const el = (t, a = {}, ...k) => { const n = new N(t); for (const [x, v] of Object.entries(a)) n.setAttribute(x, v); n.append(...k.flat()); return n; };

test("before: the authors' goals word for word, what the check asks, and the computed pass mark", () => {
  const o = O.objectivesBefore(byId.r02, qs);
  assert.deepEqual(o.goals, byId.r02.goals);
  assert.match(o.checks, new RegExp(`asks ${qs.length} questions`));
  assert.match(o.checks, new RegExp(`${P.passMark(qs.length)} of ${qs.length} right on the first try \\(${P.passPercent(qs.length)}%\\)`));
  const card = O.objectiveCard(el, byId.r02, qs, null);
  assert.match(card.text, /What You Will Learn/); assert.match(card.text, /draft goals/); assert.doesNotMatch(card.text, /Your record/, "no record line without history");
});

test("after: only what was asked and right on the first try; below the pass mark nothing is 'proved'", () => {
  const all = Object.fromEntries(qs.map((q) => [q.id, true]));
  const p = O.provedAfter(qs, all);
  assert.equal(p.passed, true); assert.equal(p.right, qs.length);
  for (const q of qs.filter((x) => x.kind === "word-meaning")) assert.ok(p.words.some((w) => w.startsWith(q.promptHe)));
  const card = O.provedCard(el, qs, all);
  assert.match(card.text, /What You Proved/); assert.match(card.text, /does not test every goal/);
  const none = O.provedCard(el, qs, {});
  assert.match(none.text, /Not Proved Yet/); assert.doesNotMatch(none.text, /Letters you got right/);
});

test("record: computed from the device's own tries; pass rate and median time; null without history", () => {
  assert.equal(O.lessonRecord({}, "r02"), null); assert.equal(O.recordText(null), "");
  let m = {};
  m = P.withCheck(m, "r02", 1, 4, 1, 60000); m = P.withCheck(m, "r02", 3, 4, 2, 120000); m = P.withCheck(m, "r02", 4, 4, 3, 90000); m = P.withCheck(m, "r02", 4, 4, 4);
  const r = O.lessonRecord(m, "r02");
  assert.deepEqual(r, { tries: 4, passes: 3, passRate: 75, medianMs: 90000, timed: 3 });
  assert.equal(O.recordText(r), "Your record on this device: 4 tries, 3 passed (75%). Median time for a check: 1:30 (from the 3 tries that were timed).");
  assert.equal(m.r02.tries[3].ms, undefined, "no time is invented for an untimed try");
});

test("the lesson page, the short-parts page and the intermediate page are wired (on demand) and the check time is saved", () => {
  const lv = readFileSync(new URL("../src/curriculum/lesson.view.js", import.meta.url), "utf8");
  assert.match(lv, /import\("\.\.\/coursemap\/objectives\.js"\)/); assert.match(lv, /objectiveCard\(el, lesson, questions, m\.lessonRecord\(checks, lesson\.id\)\)/);
  assert.match(lv, /provedCard\(el, questions, results\)/); assert.match(lv, /saveQuickCheck\(ctx, lesson, questions, results, Date\.now\(\), ms\)/);
  assert.match(readFileSync(new URL("../src/curriculum/lesson.parts.js", import.meta.url), "utf8"), /provedCard\(el, questions, results\)/);
  assert.match(readFileSync(new URL("../src/curriculum/intermediate.view.js", import.meta.url), "utf8"), /withCheck\(await storeGet\(ctx, CHECKS_KEY, \{\}\), lesson\.id, right, exs\.length, Date\.now\(\), Date\.now\(\) - t0\)/);
});
