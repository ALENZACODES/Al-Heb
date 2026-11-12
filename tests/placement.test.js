import test from "node:test";
import assert from "node:assert/strict";
const { loadPlacementData } = await import("../src/placement/loader.js");
const M = await import("../src/placement/model.js");
const { P } = { P: await loadPlacementData() };
const { config, data } = P;
const items = M.buildItems(data, config);
const lessonIds = new Set(data.lessons.map((l) => l.id));

test("config is marked draft and unreviewed", () => { assert.match(config.status, /draft/); assert.match(config.note, /untested guess/); });
test("23 items (lane 6 added 3 unpointed words), correct mix per category", () => {
  assert.equal(items.length, Object.values(config.counts).reduce((a, b) => a + b, 0));
  assert.equal(items.length, 23);
  for (const c of M.CATEGORIES) assert.equal(items.filter((i) => i.cat === c).length, config.counts[c], c);
});
test("every item has one correct option among distinct options, and a real curriculum lesson", () => {
  for (const i of items) {
    assert.equal(i.options.filter((o) => o.correct).length, 1, i.id);
    assert.equal(new Set(i.options.map((o) => o.label)).size, i.options.length, i.id);
    assert.ok(i.options.length >= 2 && i.he, i.id);
    assert.ok(lessonIds.has(i.lesson), i.id + " -> " + i.lesson);
  }
  assert.ok(items.every((x, k) => k === 0 || items[k - 1].rank <= x.rank), "easiest first");
});
test("Hebrew in items comes verbatim from repo data", () => {
  const pool = new Set([...data.letters.map((x) => x.he), ...data.niqqud.map((r) => r.shape), ...data.words.map((w) => w.he), ...data.registry.map((e) => e.he)]);
  for (const i of items) assert.ok(pool.has(i.he) || (i.cat === "unpointed" && pool.has(i.pointed) && M.unpoint(i.pointed) === i.he), i.id);
});
test("stop rule: stops on misses in window, not before minAsked, and at the end", () => {
  const a = (c) => ({ id: "x", correct: c });
  assert.equal(M.shouldStop([a(false), a(false), a(false)], 20, config.stop), false);
  assert.equal(M.shouldStop([a(true), a(true), a(false), a(false), a(true), a(false)], 20, config.stop), true);
  assert.equal(M.shouldStop(Array(20).fill(a(true)), 20, config.stop), true);
  assert.equal(M.nextItem(items, [], config.stop), items[0]);
});
test("recommendation always exists in the real curriculum, for many simulated learners", () => {
  const rng = M.seeded(5);
  for (let t = 0; t < 300; t++) {
    const skill = rng(); const answers = [];
    while (true) { const it = M.nextItem(items, answers, config.stop); if (!it) break; answers.push({ id: it.id, correct: rng() < (it.rank / 50 < skill ? 0.95 : 0.1) }); }
    const r = M.recommend(items, answers, config, data.lessons);
    assert.ok(lessonIds.has(r.lesson), r.lesson); assert.equal(r.draft, true);
  }
  assert.equal(M.recommend(items, [], config, data.lessons).lesson, config.firstLesson);
  const allWrong = items.slice(0, 6).map((i) => ({ id: i.id, correct: false }));
  assert.equal(M.recommend(items, allWrong, config, data.lessons).lesson, items[0].lesson);
  const perfect = M.recommend(items, items.map((i) => ({ id: i.id, correct: true })), config, data.lessons);
  assert.ok(lessonIds.has(perfect.lesson));
});
test("a lone slip is forgiven; a confirmed miss is not", () => {
  const lone = items.slice(0, 8).map((i, k) => ({ id: i.id, correct: k !== 2 }));
  const r1 = M.recommend(items, lone, config, data.lessons);
  assert.match(r1.reason, /no confirmed miss/);
  const r2 = M.recommend(items, items.slice(0, 5).map((i, k) => ({ id: i.id, correct: k < 2 })), config, data.lessons);
  assert.equal(r2.lesson, items[2].lesson);
});
test("config lesson references exist", () => {
  for (const v of [...Object.values(config.lessonCaps), ...Object.values(config.phraseLevelLesson), config.firstLesson]) assert.ok(lessonIds.has(v), v);
  assert.equal(config.storeKey, M.STORE_KEY); assert.equal(M.STORE_KEY, "placement.v1");
});

// View smoke test with a minimal fake DOM (logic only; NOT real-browser rendering, layout or accessibility).
class N {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.className = ""; this.hidden = false; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { this.children.push(...c); }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v) }]; }
  remove() {} focus() {}
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(""); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  click() { for (const f of this.listeners.click || []) f({}); }
}
globalThis.document = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }) };
const flush = () => new Promise((r) => setTimeout(r, 0));
const waitFor = async (f) => { for (let i = 0; i < 200; i++) { const v = f(); if (v) return v; await flush(); } throw new Error("timeout"); };
const find = (root, pred) => root.find(pred)[0];

test("view: mounts, flags draft, runs to a result, saves placement.v1, unmounts", async () => {
  const { mount, DRAFT_NOTE } = await import("../src/placement/placement.view.js");
  const m = {}; const store = { get: (k) => m[k], set: (k, v) => { m[k] = v; } };
  const root = new N("div");
  const played = [];
  const un = mount(root, { store, placementData: P, audio: { play: async (k, i) => { played.push([k, i]); return { ok: true }; } }, clock: { now: () => 1 } });
  const start = await waitFor(() => find(root, (n) => n.attrs.id === "placement-start"));
  assert.match(root.text, /Draft, unreviewed/); assert.ok(DRAFT_NOTE.includes("untested guesses"));
  start.click();
  for (let guard = 0; guard < 25 && !find(root, (n) => n.attrs.id === "placement-go"); guard++) {
    const he = find(root, (n) => n.attrs.lang === "he").text;
    const item = items.find((i) => i.he === he);
    const right = item.options.find((o) => o.correct).label;
    find(root, (n) => n.tag === "button" && n.text === right).click();
    find(root, (n) => n.attrs.id === "placement-next").click();
    await flush();
  }
  const go = await waitFor(() => find(root, (n) => n.attrs.id === "placement-go"));
  assert.match(go.attrs.href, /^#\/learn\?lesson=/);
  assert.ok(lessonIds.has(go.attrs.href.split("=")[1]));
  assert.equal(m["placement.v1"].draft, true);
  assert.equal(m["placement.v1"].answers.length, items.length);
  assert.equal(m["placement.v1"].result.applied, true, "lane 6: the result is applied (sticks)");
  un();
});

test("openStart: a locked recommendation resolves to an open lesson; an open one is kept; done ones are skipped", () => {
  const read = data.lessons.filter((l) => l.track === "read");
  const locked = read.find((l) => l.prerequisites.length && l.id !== read[0].id);
  const r = M.openStart(data.lessons, [], locked.id);
  assert.equal(r.id, read[0].id); assert.equal(r.locked, true); assert.equal(r.wanted, locked.id);
  assert.equal(M.openStart(data.lessons, [], read[0].id).locked, false);
  const afterFirst = M.openStart(data.lessons, [read[0].id], read[0].id);
  assert.notEqual(afterFirst.id, read[0].id);
  // for every lesson a learner could be recommended, the target is always unlocked given the completed set
  for (const l of read) for (const done of [[], [read[0].id], read.slice(0, 5).map((x) => x.id)]) {
    const o = M.openStart(data.lessons, done, l.id), t = data.lessons.find((x) => x.id === o.id);
    assert.ok(t.prerequisites.every((p) => done.includes(p)), `${l.id} -> ${o.id} with ${done.length} done`);
  }
});
