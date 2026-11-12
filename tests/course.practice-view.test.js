// C3/C7 view: the set plays in the quick-check player and writes the review cards (fake DOM).
import { test } from "node:test";
import assert from "node:assert/strict";
import { waitFor } from "./helpers/waitfor.js";
class N {
  constructor(t) { this.tag = t; this.children = []; this.attrs = {}; this.listeners = {}; this.nodeType = 1; this.className = ""; this.hidden = false; this.disabled = false; this.parent = null; }
  setAttribute(k, v) { this.attrs[k] = v; if (k === "hidden") this.hidden = true; if (k === "disabled") this.disabled = true; }
  removeAttribute(k) { delete this.attrs[k]; if (k === "hidden") this.hidden = false; if (k === "disabled") this.disabled = false; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { const n = x != null && x.nodeType ? x : { nodeType: 3, data: String(x) }; this.children.push(n); n.parent = this; } }
  replaceChildren(...c) { this.children = []; this.append(...c); }
  remove() { if (this.parent?.children) this.parent.children = this.parent.children.filter((x) => x !== this); }
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v) }]; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.hidden ? "" : c.text)).join(""); }
  find(p, o = []) { if (p(this)) o.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(p, o); return o; }
  querySelector() { return null; }
  async click() { if (this.disabled) return; for (const f of this.listeners.click || []) await f({ currentTarget: this, target: this, preventDefault() {} }); }
  focus() {}
}
globalThis.document = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }), addEventListener() {}, removeEventListener() {}, getElementById: () => null, head: new N("head"), activeElement: null };
const memStore = (init = {}) => { const m = { ...init }; return { get: (k) => m[k], set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); }, m }; };
const { newCard, review } = await import("../src/curriculum/srs.js");
const { mount } = await import("../src/coursemap/practice.view.js");

test("mixed review: empty state without history; with history it plays and updates only existing cards", async () => {
  let root = new N("div"); let off = mount(root, { store: memStore(), settings: { get: () => undefined }, query: {} });
  await waitFor(() => root.find((n) => n.attrs["data-empty"] !== undefined).length);
  assert.match(root.text, /Not enough review history yet/); off();
  const t0 = Date.now() - 6 * 86400000, cards = {};
  for (const id of ["letter:shin", "letter:bet", "word:r01:1"]) cards[id] = review(newCard({ id, now: t0 }), 1, t0);
  const store = memStore({ "srs.cards": cards, "curriculum.progress": { completed: { r01: t0 } } });
  root = new N("div"); off = mount(root, { store, settings: { get: () => undefined }, query: {} });
  await waitFor(() => root.find((n) => n.attrs["data-ex"]).length);
  for (let g = 0; g < 30 && !/Set Finished/.test(root.text); g++) {
    const opt = root.find((n) => n.tag === "button" && n.attrs["data-n"] === "1")[0];
    if (opt && !opt.disabled) await opt.click();
    const next = root.find((n) => n.attrs["data-act"] === "next" && !n.hidden)[0]; if (next) await next.click();
    await new Promise((r) => setTimeout(r, 0));
  }
  await waitFor(() => /Set Finished/.test(root.text));
  assert.match(root.text, /\(measured\)/); assert.match(root.text, /3 review cards updated/);
  assert.deepEqual(Object.keys(store.m["srs.cards"]).sort(), ["letter:bet", "letter:shin", "word:r01:1"]);
  for (const c of Object.values(store.m["srs.cards"])) assert.equal(c.reps, 2, "each card got one more review");
  off();
});

test("daily set: shows its plan (due, new item, game round)", async () => {
  const t0 = Date.now() - 6 * 86400000, cards = { "letter:shin": review(newCard({ id: "letter:shin", now: t0 }), 3, t0) };
  const root = new N("div"); const off = mount(root, { store: memStore({ "srs.cards": cards, "curriculum.progress": { completed: { r01: t0 } } }), settings: { get: () => undefined }, query: { set: "daily" } });
  await waitFor(() => root.find((n) => n.attrs["data-ex"]).length);
  assert.match(root.text, /Daily Five-Minute Set/); assert.match(root.text, /due review card/); assert.match(root.text, /One new item from r02/); assert.match(root.text, /One game round: Spot It/);
  off();
});
