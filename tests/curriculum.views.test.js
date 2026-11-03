import test from "node:test";
import assert from "node:assert/strict";

// Minimal fake DOM: enough for createElement/createTextNode/append/replaceChildren/remove/click/getAttribute.
// This checks view logic, NOT real browser rendering.
class Node_ {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.nodeType = 1; this.className = ""; }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { this.children.push(x); if (x && x.parent !== undefined) x.parent = this; } }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(""); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  async click() { for (const f of this.listeners.click || []) await f({}); }
}
globalThis.document = {
  createElement: (t) => new Node_(t),
  createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: undefined }),
};
const tick = () => new Promise((r) => setTimeout(r, 5));
const memStore = (init = {}) => { const m = { ...init }; return { get: async (k) => m[k], set: async (k, v) => { m[k] = v; }, m }; };

const { mount: mountLearn } = await import("../src/curriculum/learn.view.js");
const { mount: mountCal } = await import("../src/curriculum/calendar.view.js");

test("learn view: lists read lessons, locks unmet prerequisites, shows due count, marks complete", async () => {
  const root = new Node_("div");
  const store = memStore({ "srs.cards": { a: { id: "a", due: 0, state: "review", stability: 1, lastReview: 0 }, b: { id: "b", due: 1, state: "review", stability: 1, lastReview: 0 } } });
  const routed = [];
  const unmount = mountLearn(root, { store, route: (p) => routed.push(p), t: (k) => k, settings: {} });
  await tick();
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
  // complete lesson r01 -> r02 becomes available, progress persisted
  const mark = items[0].find((n) => n.tag === "button" && /Mark/.test(n.attrs["aria-label"] || ""))[0];
  await mark.click(); await tick();
  assert.ok(store.m["curriculum.progress"].completed.r01);
  const items2 = root.find((n) => n.tag === "li" && n.attrs["data-lesson"]);
  assert.match(items2[1].className, /alef-lesson-available/);
  assert.match(items2[0].className, /alef-lesson-done/);
  // start navigates
  await items2[1].find((n) => n.tag === "button")[0].click();
  assert.deepEqual(routed, ["/learn/r02"]);
  // tab switch
  await root.find((n) => n.attrs.id === "alef-tab-israel")[0].click(); await tick();
  assert.ok(root.find((n) => n.tag === "li" && /^il/.test(n.attrs["data-lesson"] || "")).length >= 15);
  unmount();
});

test("learn view works with no store (graceful)", async () => {
  const root = new Node_("div");
  const unmount = mountLearn(root, {});
  await tick();
  assert.ok(root.find((n) => n.tag === "li").length > 0);
  unmount();
});

test("calendar view: candle lighting with location, next holidays, prompt (locked Modeh Ani handled)", async () => {
  const root = new Node_("div");
  const ctx = { store: memStore(), settings: { location: { lat: 43.65, lon: -79.38, tz: "America/Toronto" } }, t: (k) => k, now: () => new Date(Date.UTC(2026, 10, 3, 15, 0)) };
  const unmount = mountCal(root, ctx);
  await tick();
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
  await tick();
  assert.match(root.text, /Set your location/);
  assert.match(root.text, /Evening prompt/);
  unmount();
});
