// Dictionary words linked to their family letters and verb forms, and the review option that groups words sharing family letters
// (lane 3, 12 Nov, points plan #15a and #15d). No root is confirmed, so the lines say "family letters".
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Minimal fake DOM (checks view logic, NOT browser rendering).
class N {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.nodeType = 1; this.className = ""; this.focused = false; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { this.children.push(x); if (x && x.parent !== undefined) x.parent = this; } }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  set textContent(v) { this.replaceChildren(document.createTextNode(v)); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  focus() { this.focused = true; globalThis.__focus = this; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(""); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  querySelector(sel) {
    const m = sel[0] === "#" ? (n) => n.attrs.id === sel.slice(1) : (n) => (` ${n.className} `).includes(` ${sel.slice(1)} `);
    return this.find(m)[0] || null;
  }
  async fire(type, ev = {}) { for (const f of this.listeners[type] || []) await f({ target: this, preventDefault() {}, ...ev }); }
  click() { return this.fire("click"); }
}
globalThis.document = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: undefined }) };
import { waitFor } from "./helpers/waitfor.js";
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const memStore = (init = {}) => { const m = { ...init }; return { get: (k) => m[k], set: (k, v) => { m[k] = v; }, m }; };
const btn = (root, re) => root.find((n) => n.tag === "button" && re.test(n.text))[0];
const items = (root) => root.find((n) => n.tag === "li" && n.attrs["data-id"]);
const { mount, GROUP_KEY } = await import("../src/vocab/vocab.view.js");
const { addCards } = await import("../src/vocab/model.js");
const { loadTier } = await import("../src/vocab/loader.js");
const { STORE_KEYS } = await import("../src/shell/privacy.view.js");
const LINKS = JSON.parse(readFileSync(new URL("../data/roots/dict-links.json", import.meta.url), "utf8"));
const tier500 = await loadTier(500);
const mk = (extra = {}) => {
  const root = new N("div"); const store = memStore(extra.store);
  const ctx = { store, t: (k) => k, settings: { get: (k) => (k === "congregation" ? "sephardi" : undefined) }, route() {}, query: extra.query || {} };
  return { root, store, ctx };
};
const linkOf = new Map(LINKS.rows.map((r) => [r[0], r]));

test("browse: a word with family letters links to its family page, and a linked verb to its forms; the line never says root", async () => {
  const fam = tier500.find((e) => !e.isForm && linkOf.get(e.id)?.[2] >= 2 && linkOf.get(e.id)?.[3]);
  assert.ok(fam, "a tier-500 verb with a family and a forms link");
  const { root, ctx } = mk(); ctx.vocabLoader = { loadTier: async () => tier500 };
  const un = mount(root, ctx);
  await waitFor(() => items(root).length > 0, { message: "words rendered" });
  // find the card (search for it so it is on the first page)
  const search = root.find((n) => n.attrs.id === "vc-search")[0]; search.value = fam.pointed; await search.fire("input"); await tick();
  const card = items(root).find((li) => li.attrs["data-id"] === fam.id); assert.ok(card);
  const line = card.find((n) => (` ${n.className || n.attrs.class || ""} `).includes(" vc-family "))[0]; assert.ok(line, "family line on the card");
  const [, letters, size, verb] = linkOf.get(fam.id);
  assert.match(line.text, new RegExp(`Family letters ${letters}: ${size} words in the word list share them`));
  const hrefs = line.find((n) => n.tag === "a").map((a) => a.attrs.href);
  assert.deepEqual(hrefs, ["#/roots?letters=" + encodeURIComponent(letters), "#/roots?verb=" + encodeURIComponent(verb)]);
  assert.doesNotMatch(line.text, /\broot\b/i);
  const none = items(root).length; assert.ok(none >= 1);
  un?.();
});

test("review: with the option on, due words that share family letters come together, with a line saying so; the option is stored", async () => {
  const fams = new Map();
  for (const e of tier500) { const l = linkOf.get(e.id); if (!e.isForm && l && l[2] >= 2) { if (!fams.has(l[1])) fams.set(l[1], []); fams.get(l[1]).push(e); } }
  const [letters, pair] = [...fams].find(([, v]) => v.length >= 2);
  const loners = tier500.filter((e) => !e.isForm && !linkOf.get(e.id)).slice(0, 2);
  const order = [pair[0], loners[0], loners[1], pair[1]]; // due order: the family's second word is due last
  let cards = addCards({}, order, Date.now() - 10 * 86400000).cards;
  order.forEach((e, i) => { cards["vocab:" + e.id].due = Date.now() - (10 - i) * 60000; });
  const { root, ctx, store } = mk({ store: { "srs.vocab": cards, [GROUP_KEY]: true }, query: { review: "1" } });
  ctx.vocabLoader = { loadTier: async () => tier500 };
  mount(root, ctx);
  await waitFor(() => root.find((n) => n.attrs.id === "vc-q").length > 0, { message: "first card" });
  const groupLine = () => root.find((n) => (` ${n.className || n.attrs.class || ""} `).includes(" vc-group-line "))[0];
  assert.match(groupLine().text, new RegExp(`Family letters ${letters}: word 1 of 2 due today that share them`));
  const box = root.find((n) => n.attrs.id === "vc-group")[0]; assert.equal(box.checked, true);
  // first card: the family's first word; second card: its relative (pulled forward), not the next due loner
  await btn(root, /Show answer/).click(); await btn(root, /^Good/).click(); await tick();
  assert.match(groupLine().text, /word 2 of 2/);
  assert.equal(root.find((n) => n.attrs.id === "vc-q")[0].text.includes(pair[1].pointed), true);
  assert.equal(store.m[GROUP_KEY], true);
  assert.ok(STORE_KEYS.some((r) => r[0] === GROUP_KEY), "the privacy table lists the option");
});

test("review: with the option off (the default) the order is the due order and no group line is shown", async () => {
  const fams = new Map();
  for (const e of tier500) { const l = linkOf.get(e.id); if (!e.isForm && l && l[2] >= 2) { if (!fams.has(l[1])) fams.set(l[1], []); fams.get(l[1]).push(e); } }
  const [, pair] = [...fams].find(([, v]) => v.length >= 2);
  const loner = tier500.find((e) => !e.isForm && !linkOf.get(e.id));
  const order = [pair[0], loner, pair[1]];
  const cards = addCards({}, order, Date.now() - 10 * 86400000).cards;
  order.forEach((e, i) => { cards["vocab:" + e.id].due = Date.now() - (10 - i) * 60000; });
  const { root, ctx } = mk({ store: { "srs.vocab": cards }, query: { review: "1" } });
  ctx.vocabLoader = { loadTier: async () => tier500 };
  mount(root, ctx);
  await waitFor(() => root.find((n) => n.attrs.id === "vc-q").length > 0, { message: "first card" });
  assert.equal(root.find((n) => (` ${n.className || n.attrs.class || ""} `).includes(" vc-group-line ")).length, 0);
  await btn(root, /Show answer/).click(); await btn(root, /^Good/).click(); await tick();
  assert.equal(root.find((n) => n.attrs.id === "vc-q")[0].text.includes(loner.pointed || loner.lemma), true, "due order kept");
});

test("review: ticking the option stores it and restarts the session grouped", async () => {
  const fams = new Map();
  for (const e of tier500) { const l = linkOf.get(e.id); if (!e.isForm && l && l[2] >= 2) { if (!fams.has(l[1])) fams.set(l[1], []); fams.get(l[1]).push(e); } }
  const [, pair] = [...fams].find(([, v]) => v.length >= 2);
  const loner = tier500.find((e) => !e.isForm && !linkOf.get(e.id));
  const order = [pair[0], loner, pair[1]];
  const cards = addCards({}, order, Date.now() - 10 * 86400000).cards;
  order.forEach((e, i) => { cards["vocab:" + e.id].due = Date.now() - (10 - i) * 60000; });
  const { root, ctx, store } = mk({ store: { "srs.vocab": cards }, query: { review: "1" } });
  ctx.vocabLoader = { loadTier: async () => tier500 };
  mount(root, ctx);
  await waitFor(() => root.find((n) => n.attrs.id === "vc-q").length > 0, { message: "first card" });
  const box = root.find((n) => n.attrs.id === "vc-group")[0]; assert.equal(box.checked, false);
  box.checked = true; await box.fire("change"); await tick(60);
  assert.equal(store.m[GROUP_KEY], true);
  await waitFor(() => root.find((n) => (` ${n.className || ""} `).includes(" vc-group-line ")).length > 0, { message: "grouped session" });
  assert.match(root.text, /word 1 of 2 due today that share them/);
});
