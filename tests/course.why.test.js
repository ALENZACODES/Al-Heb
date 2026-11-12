// C4: a wrong answer says why, from the lesson's own data (letter records, look-alike hints, the words' own glosses).
import { test } from "node:test";
import assert from "node:assert/strict";
const S = await import("../src/curriculum/exercises.session.js");
const { lessons, byId } = await import("../src/curriculum/lessons.js");
const { loadContent } = await import("../src/curriculum/content.js");
const I = await import("../src/curriculum/intermediate.view.js").catch(() => null);
const c = await loadContent();
const wordPool = lessons.filter((l) => !/^I-\d{2}$/.test(l.id)).flatMap((l) => l.words);

test("every wrong option of every letter and word question in the read and Israel lessons has a reason, the right option none", () => {
  let n = 0;
  for (const l of lessons.filter((x) => !/^I-\d{2}$/.test(x.id))) {
    for (const q of S.buildChoiceQuestions(l, { ...c, wordPool }, { tradition: "sephardi" })) {
      assert.equal(q.optionWhy.length, q.options.length, q.id);
      q.options.forEach((o, i) => {
        if (i === q.answerIndex) assert.equal(q.optionWhy[i], "", q.id);
        else { assert.match(q.optionWhy[i], /^You picked /, q.id); n++; }
      });
    }
  }
  assert.ok(n > 300, `${n} reasons`);
});

test("a reason names only what the data says: the picked letter, its sound, and a look-alike rule that names both letters", () => {
  const q = S.buildChoiceQuestions(byId.r03, { ...c, wordPool }, { tradition: "sephardi" }).find((x) => x.id === "r03-q-sound-mem-final");
  assert.ok(q);
  for (const [i, t] of q.optionWhy.entries()) {
    if (!t) continue;
    const pid = [...c.letters.keys()].find((k) => c.letters.get(k).he === q.options[i].text);
    assert.ok(t.includes(c.letters.get(pid).name));
    const set = c.confusables.sets.find((s) => s.letters.includes(pid) && s.letters.includes("mem-final"));
    if (set) assert.ok(t.includes(set.hint), "the shared look-alike hint is the rule");
  }
});

test("the letter-name reason does not repeat the tip already shown", () => {
  const q = S.buildChoiceQuestions(byId.r03, { ...c, wordPool }, { tradition: "sephardi" }).find((x) => x.kind === "letter-name" && /Tip:/.test(x.why));
  for (const t of q.optionWhy) if (t) { const tip = q.why.split("Tip: ")[1]; assert.ok(!t.includes(tip), t); }
});

test("word reasons use the distractor's own Hebrew from the lesson data", () => {
  const q = S.buildChoiceQuestions(byId.r05, { ...c, wordPool }, { tradition: "sephardi" }).find((x) => x.kind === "word-meaning");
  q.optionWhy.forEach((t, i) => { if (!t) return; const w = wordPool.find((p) => p.en === q.options[i].text); assert.ok(t.includes(w.he)); });
});

test("the quick check shows the reason on a miss only; intermediate types without a line now have one from their data", async () => {
  const { readFileSync } = await import("node:fs");
  assert.match(readFileSync(new URL("../src/curriculum/exercises.ui.js", import.meta.url), "utf8"), /ok \? "" : q\.optionWhy\?\.\[i\]/);
  if (!I) return;
  assert.equal(I.whyLine({ type: "recall", he: "שְׁמַע", en: "hear, listen" }, { words: [] }, "sephardi"), 'שְׁמַע means "hear, listen".');
  assert.match(I.whyLine({ type: "gender", m: "חוֹלֶה", f: "חוֹלָה", en: "a sick person" }, { words: [] }, "sephardi"), /masculine form and חוֹלָה the feminine form/);
  assert.equal(I.whyLine({ type: "dialogue" }, { words: [] }, "sephardi"), "", "no rule text, no invented line");
});
