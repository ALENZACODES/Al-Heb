import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Minimal fake DOM (view logic only, not real rendering).
class Node_ {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.nodeType = 1; this.className = ""; }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { this.children.push(x); if (x && x.parent !== undefined) x.parent = this; } }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(""); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
}
globalThis.document = { createElement: (t) => new Node_(t), createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: undefined }) };
import { waitFor } from "./helpers/waitfor.js";

const { buildPath, STAGES } = await import("../tools/curriculum/build_path.mjs");
const { pathProgress, titleCase, lessonHref, pageKey } = await import("../src/curriculum/path.model.js");
const { mount } = await import("../src/curriculum/path.view.js");
const { ROUTES } = await import("../src/shell/router.js");
const onDisk = readFileSync(new URL("../data/curriculum/path.json", import.meta.url), "utf8");
const path = JSON.parse(onDisk);
const lessons = JSON.parse(readFileSync(new URL("../data/curriculum/lessons-index.json", import.meta.url), "utf8")).lessons;
const index = JSON.parse(readFileSync(new URL("../data/curriculum/practical/index.json", import.meta.url), "utf8"));

test("path.json is what the builder makes from the current lesson and Practical data", async () => {
  assert.equal(onDisk, JSON.stringify(await buildPath(), null, 1) + "\n", "run node tools/curriculum/build_path.mjs");
});

test("every lesson and every Practical unit is on the path exactly once, in five stages", () => {
  assert.equal(path.stages.length, STAGES.length);
  const placed = path.stages.flatMap((s) => [...s.read, ...s.speak].map((l) => l.id));
  assert.deepEqual([...placed].sort(), lessons.map((l) => l.id).sort());
  assert.equal(new Set(placed).size, placed.length);
  const units = path.stages.flatMap((s) => s.units.map((u) => u.id));
  assert.deepEqual([...units].sort(), index.units.map((u) => u.id).sort());
  assert.equal(path.totals.lessons, lessons.length);
  assert.equal(path.totals.pages, path.stages.reduce((n, s) => n + s.units.reduce((m, u) => m + u.pages.length, 0), 0));
  assert.ok(path.totals.pages >= 200, "the 200 written pages are all there");
  for (const s of path.stages) for (const u of s.units) assert.ok(u.pages.length > 0, `${u.id} has pages`);
});

test("no lesson comes before a lesson it needs", () => {
  const order = new Map(path.stages.flatMap((s) => [...s.read, ...s.speak]).map((l, i) => [l.id, i]));
  const stageOf = new Map(path.stages.flatMap((s) => [...s.read, ...s.speak].map((l) => [l.id, s.n])));
  for (const l of lessons) for (const need of l.prerequisites) {
    assert.ok(stageOf.get(need) <= stageOf.get(l.id), `${need} is in an earlier or the same stage as ${l.id}`);
    if (stageOf.get(need) === stageOf.get(l.id)) assert.ok(order.get(need) < order.get(l.id), `${need} is listed before ${l.id}`);
  }
});

test("progress model: counts, the current stage and what comes next", () => {
  const fresh = pathProgress(path);
  assert.equal(fresh.current, 0);
  assert.equal(fresh.lessonsDone, 0);
  assert.equal(fresh.nextRead.lesson.id, path.stages[0].read[0].id);
  assert.equal(fresh.nextSpeak.lesson.id, path.stages[0].speak[0].id);
  assert.equal(fresh.nextPage.number, 1);
  // finish all of stage 1
  const s1 = path.stages[0];
  const lessonsDone = new Set([...s1.read, ...s1.speak].map((l) => l.id));
  const pagesDone = new Set(s1.units.flatMap((u) => u.pages.map((p) => pageKey(u.id, p.id))));
  const p = pathProgress(path, lessonsDone, pagesDone);
  assert.equal(p.current, 1);
  assert.ok(p.stages[0].complete);
  assert.equal(p.nextRead.stage.n, 2);
  assert.equal(p.nextPage.stage.n, 2);
  assert.equal(p.lessonsDone, lessonsDone.size);
  assert.equal(p.pagesDone, pagesDone.size);
  // a learner who skipped ahead is led back to the first gap
  const skipped = pathProgress(path, new Set([s1.read[2].id]), new Set());
  assert.equal(skipped.nextRead.lesson.id, s1.read[0].id);
  // everything done
  const all = pathProgress(path, new Set(lessons.map((l) => l.id)), new Set(path.stages.flatMap((s) => s.units.flatMap((u) => u.pages.map((pg) => pageKey(u.id, pg.id))))));
  assert.ok(all.allDone);
  assert.equal(all.nextRead, null);
  assert.equal(all.nextPage, null);
});

test("headings are Title Case and lesson links go to the right player", () => {
  assert.equal(titleCase("Shabbat and the year"), "Shabbat and the Year");
  assert.equal(titleCase("First words"), "First Words");
  assert.equal(titleCase("Living in Israel"), "Living in Israel");
  assert.equal(lessonHref({ id: "r01" }), "#/learn?lesson=r01");
  assert.equal(lessonHref({ id: "I-12", intermediate: true }), "#/intermediate/I-12");
  assert.equal(lessonHref({ id: "I-12", intermediate: true }, false), "#/learn?lesson=I-12");
});

test("every link on the path points at a route the app has", () => {
  const has = (name) => ROUTES.some((r) => r.name === name);
  for (const n of ["curriculum", "learn", "intermediatelesson", "practicalunit", "practicalpage", "placement", "classtrack"]) assert.ok(has(n), n);
  const r = ROUTES.find((x) => x.name === "curriculum");
  assert.equal(r.pattern, "/curriculum");
  assert.equal(r.group, "learn");
});

test("view: shows the stages, what is next and what is done, and writes nothing", async () => {
  const root = new Node_("div");
  const s1 = path.stages[0];
  const writes = [];
  const store = { get: async (k) => (k === "curriculum.progress" ? { completed: { [s1.read[0].id]: 1 } } : k === "practical.progress" ? { completed: { [pageKey(s1.units[0].id, s1.units[0].pages[0].id)]: true } } : undefined),
    set: async (k) => { writes.push(k); } };
  const unmount = mount(root, { store, pathData: path, hasRoute: () => true });
  await waitFor(() => root.find((n) => n.attrs["data-stage"]).length === path.stages.length);
  const text = root.text;
  assert.match(text, /Curriculum/);
  assert.match(text, /Next Up/);
  assert.match(text, new RegExp(`Lessons: 1 of ${lessons.length}`));
  assert.match(text, new RegExp(`Practical pages: 1 of ${path.totals.pages}`));
  assert.match(text, /Stage 1: First Words/);
  assert.match(text, /Stage 5: Shabbat and the Year/);
  assert.match(text, /You are here\./);
  // the next reading lesson is the second one, and the next Practical page is page 2 of the first unit
  const next = root.find((n) => n.className === "btn alef-path-next-link");
  assert.equal(next.length, 3);
  assert.equal(next[0].attrs.href, lessonHref(s1.read[1]));
  assert.equal(next[2].attrs.href, `#/practical/${s1.units[0].id}/${s1.units[0].pages[1].id}`);
  // every lesson and page is linked once
  assert.equal(root.find((n) => n.attrs["data-lesson"]).length, lessons.length);
  assert.equal(root.find((n) => n.tag === "a" && n.className.startsWith("alef-path-page")).length, path.totals.pages);
  assert.equal(root.find((n) => n.className === "alef-path-item is-done").length, 1);
  assert.equal(root.find((n) => n.className === "alef-path-page is-done").length, 1);
  // only the current stage is open
  const open = root.find((n) => n.tag === "details" && n.attrs.open !== undefined);
  assert.equal(open.length, 3);
  assert.deepEqual(writes, []);
  unmount();
});

test("view: a path that cannot be loaded says so and offers the lesson list", async () => {
  const root = new Node_("div");
  mount(root, { pathData: { broken: true } });
  await waitFor(() => /could not be loaded/.test(root.text));
  assert.ok(root.find((n) => n.attrs.href === "#/learn").length);
});
