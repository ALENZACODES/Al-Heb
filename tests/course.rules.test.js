// I8 one hearts page, H8 one streak rule, I6 minutes rule, I7 pass table: every line is built from the enforced constants,
// and the Shop and the Daily page read their lines from the same module.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const R = await import("../src/coursemap/rules.js");
const H = await import("../src/retention/hearts.js");
const { PRICES } = await import("../src/retention/gems.js");
const { STREAK } = await import("../src/retention/streak.js");
const read = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");

test("hearts rules follow the constants (change a constant, the text follows)", () => {
  const t = R.heartRules().join(" ");
  assert.match(t, new RegExp(`up to ${H.HEARTS.max} hearts`));
  assert.match(t, new RegExp(`every ${H.HEARTS.refillMs / 3600000} hours`));
  assert.match(t, new RegExp(`${PRICES.hearts} gems`));
  const alt = R.heartRules({ ...H.HEARTS, max: 3, refillMs: 3600000, unlockLessons: 1, roundCards: 7 }, { ...PRICES, hearts: 10 }).join(" ");
  assert.match(alt, /up to 3 hearts/); assert.match(alt, /every 1 hour\b/); assert.match(alt, /1st finished lesson/); assert.match(alt, /Every 7 review cards/); assert.match(alt, /10 gems/);
});

test("hearts are enforced identically in every lesson type the page names", () => {
  for (const h of ["#/learn?lesson=r05", "#/learn?lesson=r06", "#/learn?lesson=r06&quick=1", "#/learn?lesson=r06&testout=1", "#/learn?lesson=il01", "#/intermediate/I-01"]) assert.ok(H.isLessonHash(h), h);
  for (const h of ["#/learn?lesson=r06&review=1", "#/learn?review=1", "#/intermediate", "#/mixed-review", "#/five-minutes", "#/checkpoints", "#/learn"]) assert.ok(!H.isLessonHash(h), h);
  const boot = read("src/retention/boot.js");
  assert.match(boot, /detail\.retry \|\| !isLessonHash\(hash\)/, "a heart is only ever taken on a lesson route");
  assert.match(read("src/curriculum/intermediate.view.js"), /signalRimon\(correct \? "correct" : "wrong", \{ source: "lesson", questionId: ex\.id, retry \}\)/, "intermediate lessons send the same answer event as the quick check");
  assert.match(read("src/curriculum/exercises.ui.js"), /signalRimon\(ok \? 'correct' : 'wrong', \{ source: 'lesson', questionId: q\.id, retry \}\)/);
});

test("a wrong first answer costs one heart once per question, a retry is free (same function for every lesson type)", () => {
  const rec = { hearts: { enabled: true, n: 5, lastRefillAt: 0, lost: [], refillProgress: 0, refillRight: 0 }, lessonsFinished: 5 };
  const a = H.loseHeart(rec, "#/intermediate/I-01|x", 1000); assert.equal(a.left, 4);
  const b = H.loseHeart(a.rec, "#/intermediate/I-01|x", 2000); assert.equal(b.lost, false);
  assert.ok(H.heartsOn(rec, { hash: "#/intermediate/I-01" })); assert.ok(H.heartsOn(rec, { hash: "#/learn?lesson=r05" }));
});

test("streak rules follow the constants, and bring-back says the same price in the Shop and the Daily page", () => {
  const t = R.streakRules().join(" ");
  assert.match(t, /pass one lesson, or study for 5 minutes/);
  assert.match(t, new RegExp(`freeze costs ${PRICES.freeze} gems`));
  assert.match(t, new RegExp(`within ${STREAK.repairWindowHours} hours`));
  assert.match(t, PRICES.repairPerDay === 0 ? /bring it back for free/ : /gems per missed day/);
  assert.match(R.streakRules(STREAK, { ...PRICES, repairPerDay: 50 }).join(" "), /for 50 gems per missed day/);
  const shop = read("src/retention/shop.view.js"), daily = read("preview/loops/daily.view.js");
  for (const s of [shop, daily]) assert.match(s, /from '\.\.\/(\.\.\/src\/)?coursemap\/rules\.js'/);
  assert.match(shop, /streakShort\(\)/); assert.match(daily, /streakShort\(\)/);
  assert.doesNotMatch(shop, /Streak freeze: covers one missed day by itself/, "no second copy of the rule");
  assert.doesNotMatch(daily, /brought back for free for two days/);
});

test("minutes and pass-mark sections", () => {
  assert.match(R.minuteRules().join(" "), /adds no minutes/);
  assert.match(R.minuteRules(120000).join(" "), /last 2 minutes/);
  const p = R.passRules();
  assert.deepEqual(p.table.slice(0, 4), [{ n: 1, need: 1, pct: 100 }, { n: 2, need: 1, pct: 50 }, { n: 3, need: 2, pct: 67 }, { n: 4, need: 3, pct: 75 }]);
  assert.deepEqual(R.allRules().map((s) => s.id), ["hearts", "streak", "minutes", "pass"]);
});

test("#/app-rules is a lazy route and its page is on demand", async () => {
  const { ROUTES } = await import("../src/shell/router.js");
  const r = ROUTES.find((x) => x.name === "app-rules");
  assert.equal(r.pattern, "/app-rules"); assert.equal(r.module, "../coursemap/rules.view.js");
  const { isOnDemand } = await import("../tools/build-precache.mjs");
  assert.ok(isOnDemand("src/coursemap/rules.view.js") && isOnDemand("src/coursemap/rules.js"));
});

test("rules page renders every section with its lines (fake DOM)", async () => {
  class N { constructor(t) { this.tag = t; this.children = []; this.attrs = {}; this.nodeType = 1; } setAttribute(k, v) { this.attrs[k] = v; } append(...c) { for (const x of c) if (x != null) this.children.push(x.nodeType ? x : { nodeType: 3, data: String(x) }); } replaceChildren(...c) { this.children = []; this.append(...c); } remove() {} addEventListener() {} get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(""); } }
  const prev = globalThis.document; globalThis.document = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }), getElementById: () => null };
  try {
    const { mount } = await import("../src/coursemap/rules.view.js");
    const root = new N("div"); const off = mount(root, { query: { section: "hearts" } });
    for (const s of R.allRules()) for (const l of s.lines) assert.ok(root.text.includes(l), l);
    assert.match(root.text, /3 of 4/); off();
  } finally { globalThis.document = prev; }
});
