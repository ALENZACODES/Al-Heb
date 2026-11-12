// C1 course map, C3 mixed review, C7 daily five-minute set.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const MAP = await import("../src/coursemap/map.js");
const MX = await import("../src/coursemap/mixed.js");
const { loadJSON } = await import("../src/curriculum/data.js");
const { lessons } = await import("../src/curriculum/lessons.js");
const { loadContent } = await import("../src/curriculum/content.js");
const { newCard, review } = await import("../src/curriculum/srs.js");
const { ROUTES } = await import("../src/shell/router.js");
const { isOnDemand } = await import("../tools/build-precache.mjs");
const { LESSONS } = await import("../src/lib/counts.js");
const idx = (await loadJSON("data/curriculum/lessons-index.json")).lessons;
const content = await loadContent();

test("map: every lesson, both tracks, totals agree with the counts module; edges are the real prerequisites", () => {
  const m = MAP.courseMap(idx, {});
  assert.equal(m.total, LESSONS.all);
  assert.deepEqual(m.tracks.map((t) => [t.track, t.total]), [["read", LESSONS.reading], ["israel", LESSONS.israel]]);
  for (const n of m.nodes) {
    const l = idx.find((x) => x.id === n.id);
    assert.deepEqual(n.needs, l.prerequisites);
    for (const p of n.needs) assert.ok(m.nodes.find((x) => x.id === p).opens.includes(n.id));
    for (const p of n.needs) assert.ok(m.nodes.find((x) => x.id === p).depth < n.depth, "a prerequisite sits above");
  }
  assert.deepEqual(m.tracks.map((t) => t.here.id), ["r01", "il01"], "a new learner is at the first lesson of each path");
});

test("map: states follow completion and early unlocks; 'you are here' moves", () => {
  const m = MAP.courseMap(idx, { r01: 1, r02: 1 }, new Set(["r10"]));
  const s = (id) => m.nodes.find((n) => n.id === id);
  assert.equal(s("r01").state, "done"); assert.equal(s("r03").state, "open"); assert.equal(s("r04").state, "locked");
  assert.equal(s("r10").state, "open"); assert.equal(s("r10").early, true);
  assert.equal(m.tracks[0].here.id, "r03");
  assert.equal(MAP.lessonLink("I-03"), "#/intermediate/I-03"); assert.equal(MAP.lessonLink("r03"), "#/learn?lesson=r03");
});

test("map view: SVG escapes titles, every node links to its lesson", async () => {
  const { trackSVG } = await import("../src/coursemap/map.view.js");
  const t = MAP.courseMap([{ id: "r01", track: "read", title: 'A <b> & "c"', prerequisites: [] }, { id: "r02", track: "read", title: "B", prerequisites: ["r01"] }], {}).tracks[0];
  const svg = trackSVG(t);
  assert.ok(!svg.includes("<b>")); assert.match(svg, /&lt;b&gt; &amp; &quot;c&quot;/);
  assert.equal((svg.match(/<a href=/g) || []).length, 2); assert.equal((svg.match(/class="cm-edge"/g) || []).length, 1);
  assert.match(svg, /You are here/);
});

const T0 = Date.UTC(2026, 10, 1), NOW = T0 + 5 * 86400000;
const deck = () => {
  const cards = {};
  for (const id of ["letter:shin", "letter:bet", "word:r01:1", "vowel:kamatz", "letter:tav"]) cards[id] = review(newCard({ id, now: T0 }), id === "letter:bet" ? 1 : 3, T0);
  cards["letter:bet"] = review(cards["letter:bet"], 1, T0 + 1000);
  return cards;
};

test("mixed review: weakest reviewed cards first (lapses, then lowest recall), only cards that have a question", () => {
  const w = MX.weakestCards(deck(), NOW, 8).map((c) => c.id);
  assert.equal(w[0], "letter:bet"); assert.ok(!w.includes("vowel:kamatz"));
  assert.deepEqual(MX.weakestCards({ x: { id: "letter:x", state: "new", lastReview: null } }, NOW), [], "never-reviewed cards are not 'weak'");
  const qs = MX.questionsForCards(w, lessons, content);
  assert.deepEqual(qs.map((q) => q.cardId), w);
  for (const q of qs) assert.ok(q.options[q.answerIndex], "a real lesson question");
});

test("daily set: due cards, one new item from the next open lesson (never saved), one game round on a taught letter", () => {
  const d = MX.dailySet({ cards: deck(), completed: { r01: 1 }, lessons, content, now: NOW });
  assert.ok(d.due.length >= 1 && d.due.length <= 5);
  assert.equal(d.next.id, "r02"); assert.ok(d.fresh && d.fresh.fresh && d.fresh.from === "r02");
  assert.match(d.game.href, /^#\/spotit\//);
  const results = Object.fromEntries([...d.due, d.fresh].map((q) => [q.id, false]));
  const outs = MX.outcomesFor([...d.due, d.fresh], results);
  assert.equal(outs.length, d.due.length, "the new item is practice only"); assert.ok(outs.every((o) => o.good === false && o.create === false));
  const empty = MX.dailySet({ cards: {}, completed: {}, lessons, content, now: NOW });
  assert.equal(empty.due.length, 0); assert.equal(empty.game, null); assert.equal(empty.next.id, "r01");
});

test("routes are lazy, on demand, listed in Learn, and their time counts as study time", async () => {
  for (const [name, pattern, file] of [["course-map", "/course-map", "map.view.js"], ["mixed-review", "/mixed-review", "practice.view.js"], ["five-minutes", "/five-minutes", "practice.view.js"]]) {
    const r = ROUTES.find((x) => x.name === name); assert.equal(r.pattern, pattern); assert.equal(r.module, "../coursemap/" + file);
    assert.ok(isOnDemand("src/coursemap/" + file));
  }
  const { isCountedRoute } = await import("../src/morning/engage.js");
  assert.ok(isCountedRoute("#/mixed-review") && isCountedRoute("#/five-minutes") && isCountedRoute("#/checkpoints"));
  const v = readFileSync(new URL("../src/coursemap/practice.view.js", import.meta.url), "utf8");
  assert.doesNotMatch(v, /summaryNode|alef:celebrate/, "no lesson celebration (no XP) for a practice set");
  assert.match(v, /\(measured\)/);
});
