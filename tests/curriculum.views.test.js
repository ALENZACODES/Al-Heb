import test from "node:test";
import assert from "node:assert/strict";

// Minimal fake DOM: enough for createElement/createTextNode/append/replaceChildren/remove/click/getAttribute.
// This checks view logic, NOT real browser rendering.
class Node_ {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.nodeType = 1; this.className = ""; this.disabled = false; }
  setAttribute(k, v) { this.attrs[k] = v; if (k === "disabled") this.disabled = true; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { this.children.push(x); if (x && x.parent !== undefined) x.parent = this; } }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  focus() { globalThis.document.activeElement = this; }
  querySelector(sel) {
    if (sel === "#view-title") return this.find((n) => n.attrs.id === "view-title")[0] || null;
    if (sel.startsWith("#")) return this.find((n) => n.attrs.id === sel.slice(1))[0] || null;
    return null;
  }
  contains(n) { if (n === this) return true; return this.find((x) => x === n).length > 0; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(""); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  async click() { for (const f of this.listeners.click || []) await f({}); }
}
const bodyEl = new Node_("body");
globalThis.document = {
  body: bodyEl,
  activeElement: bodyEl,
  createElement: (t) => new Node_(t),
  createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: undefined }),
};
import { waitFor } from "./helpers/waitfor.js";
const memStore = (init = {}) => { const m = { ...init }; return { get: async (k) => m[k], set: async (k, v) => { m[k] = v; }, m }; };

const { mount: mountLearn } = await import("../src/curriculum/learn.view.js");
const { mount: mountCal } = await import("../src/curriculum/calendar.view.js");

test("learn view: lists read lessons, locks unmet prerequisites, shows due count, marks complete", async () => {
  const root = new Node_("div");
  const store = memStore({ "srs.cards": { a: { id: "a", due: 0, state: "review", stability: 1, lastReview: 0 }, b: { id: "b", due: 1, state: "review", stability: 1, lastReview: 0 } } });
  const routed = [];
  const unmount = mountLearn(root, { store, route: (p) => routed.push(p), t: (k) => k, settings: {} });
  await waitFor(() => root.find((n) => n.tag === "li" && n.attrs["data-lesson"]).length >= 40 && /2 reviews due/.test(root.text) && /alef-lesson-available/.test(root.find((n) => n.tag === "li" && n.attrs["data-lesson"])[0].className), { message: "lesson list rendered" });
  const items = root.find((n) => n.tag === "li" && n.attrs["data-lesson"]);
  assert.ok(items.length >= 40);
  assert.equal(items[0].attrs.class, undefined);
  assert.match(items[0].className, /alef-lesson-available/);
  assert.match(items[1].className, /alef-lesson-locked/);
  const lockedBtn = items[1].find((n) => n.tag === "button")[0];
  assert.ok("disabled" in lockedBtn.attrs);
  assert.match(root.text, /2 reviews due/);
  // Hebrew element is RTL
  const he = root.find((n) => n.attrs.lang === "he")[0];
  assert.equal(he.attrs.dir, "rtl");
  // C-01: "Test out" is a real short test, not a free checkmark: it opens the test-out page and marks nothing done by itself
  const testOut = items[0].find((n) => n.tag === "button" && /alef-testout/.test(n.className || ""))[0];
  assert.ok(testOut, "an available lesson offers Test out");
  assert.doesNotMatch(testOut.attrs["aria-label"], /Mark complete without studying/);
  assert.match(testOut.attrs["aria-label"], /short test/);
  await testOut.click();
  assert.deepEqual(routed.splice(0), ["/learn?lesson=r01&testout=1"]);
  assert.equal(store.m["curriculum.progress"]?.completed?.r01, undefined, "Test out alone completes nothing");
  // finish r01 (as its quick check or test would) -> r02 becomes available
  store.m["curriculum.progress"] = { completed: { r01: Date.now() } };
  unmount();
  const root2 = new Node_("div");
  const unmount2 = mountLearn(root2, { store, route: (p) => routed.push(p), t: (k) => k, settings: {} });
  await waitFor(() => { const li = root2.find((n) => n.tag === "li" && n.attrs["data-lesson"]); return li.length >= 40 && /alef-lesson-available/.test(li[1].className) && /alef-lesson-done/.test(li[0].className); }, { message: "r01 done and the list re-rendered" });
  const items2 = root2.find((n) => n.tag === "li" && n.attrs["data-lesson"]);
  assert.match(items2[1].className, /alef-lesson-available/);
  assert.match(items2[0].className, /alef-lesson-done/);
  // start navigates
  await items2[1].find((n) => n.tag === "button")[0].click();
  assert.deepEqual(routed, ["/learn?lesson=r02"]);
  // tab switch
  await root2.find((n) => n.attrs.id === "alef-tab-israel")[0].click(); await waitFor(() => root2.find((n) => n.tag === "li" && /^il/.test(n.attrs["data-lesson"] || "")).length >= 15, { message: "Israel tab lessons" });
  assert.ok(root2.find((n) => n.tag === "li" && /^il/.test(n.attrs["data-lesson"] || "")).length >= 15);
  const levels = root2.find((n) => /\balef-level\b/.test(n.className || ""));
  assert.ok(levels.length >= 3, "israel lessons show a level chip");
  for (const n of levels) {
    assert.match(n.text, /^Stage [123]$/, `level chip should be a course-stage name, got ${JSON.stringify(n.text)}`);
  }
  unmount2();
});

test("learn view works with no store (graceful)", async () => {
  const root = new Node_("div");
  const unmount = mountLearn(root, {});
  await waitFor(() => root.find((n) => n.tag === "li").length > 0, { message: "root.find((n) => n.tag === \"li\").length > 0" });
  assert.ok(root.find((n) => n.tag === "li").length > 0);
  unmount();
});

test("calendar view: candle lighting with location, next holidays, prompt (locked Modeh Ani handled)", async () => {
  const root = new Node_("div");
  const ctx = { store: memStore(), settings: { location: { lat: 43.65, lon: -79.38, tz: "America/Toronto" } }, t: (k) => k, now: () => new Date(Date.UTC(2026, 10, 3, 15, 0)) };
  const unmount = mountCal(root, ctx);
  await waitFor(() => /Morning prompt/.test(root.text) && /Hanukkah/.test(root.text), { message: "/Morning prompt/.test(root.text) && /Hanukkah/.test(root.text)" });
  const t = root.text;
  assert.match(t, /23 Cheshvan 5787/);
  assert.match(t, /2026-11-06: 16:\d\d|2026-11-06: 17:\d\d/);
  assert.match(t, /Hanukkah/);
  assert.match(t, /Morning prompt/);
  assert.ok(root.find((n) => n.attrs.lang === "he" && n.attrs.dir === "rtl").length >= 2);
  unmount();
});

test("calendar view without location does not invent a time", async () => {
  const root = new Node_("div");
  const unmount = mountCal(root, { store: memStore(), settings: {}, now: () => new Date(2026, 10, 3, 20, 0) });
  await waitFor(() => /Evening prompt/.test(root.text), { message: "/Evening prompt/.test(root.text)" });
  assert.match(root.text, /Set your location/);
  assert.match(root.text, /Evening prompt/);
  unmount();
});
