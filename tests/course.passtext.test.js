// I7: the pass-mark text shows the real percentage computed from the threshold, never a hardcoded "about 70%".
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const P = await import("../src/curriculum/passmark.js");

test("passPercent: the share the pass mark really asks for", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 8, 10].map(P.passPercent), [100, 50, 67, 75, 80, 67, 75, 70]);
  assert.equal(P.passPercent(0), 0);
  assert.equal(P.passMarkText(4), "3 of 4 (75%)");
  assert.equal(P.passMarkText(1), "1 of 1 (100%)");
  assert.equal(P.passMarkText(0), "");
});

test("passRuleText states the computed percentage for every size", () => {
  for (let n = 1; n <= 20; n++) {
    const t = P.passRuleText(n);
    assert.match(t, new RegExp(`at least ${P.passMark(n)} of ${n} right on the first try \\(${P.passPercent(n)}%\\)`));
    assert.doesNotMatch(t, /about 70%/);
  }
});

test("no screen hardcodes 'about 70%' or a bare 80% pass mark any more", () => {
  for (const f of ["src/curriculum/lesson.view.js", "src/curriculum/exercises.ui.js", "src/curriculum/checkpoint.view.js", "src/curriculum/intermediate.view.js", "src/curriculum/passmark.js"]) {
    const s = readFileSync(new URL("../" + f, import.meta.url), "utf8");
    assert.doesNotMatch(s, /about 70%/, f);
    assert.doesNotMatch(s, /pass mark is 80%/, f);
  }
  const lv = readFileSync(new URL("../src/curriculum/lesson.view.js", import.meta.url), "utf8");
  assert.match(lv, /passPercent\(questions\.length\)/);
});
