import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { waitFor } from "./helpers/waitfor.js";

// Link audit for the intermediate path: every link that leads to an intermediate lesson or a grammar topic must match a route whose
// module exists, land on real content, offer a way back and (for lessons) a next step, and the routes must be labelled preview.
class N {
  constructor(tag) { this.tag = tag; this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.nodeType = 1; this.className = ""; this.hidden = false; this.disabled = false; }
  setAttribute(k, v) { this.attrs[k] = v; if (k === "hidden") this.hidden = true; if (k === "disabled") this.disabled = true; }
  removeAttribute(k) { delete this.attrs[k]; if (k === "hidden") this.hidden = false; if (k === "disabled") this.disabled = false; }
  getAttribute(k) { return this.attrs[k] ?? null; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { const n = x != null && x.nodeType ? x : { nodeType: 3, data: String(x), parent: undefined }; this.children.push(n); if (n.parent !== undefined) n.parent = this; } }
  replaceChildren(...c) { this.children = []; this.append(...c); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v), parent: undefined }]; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.hidden ? "" : c.text)).join(""); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  querySelector() { return null; }
  async click() { if (this.disabled) return; for (const f of this.listeners.click || []) await f({ currentTarget: this, target: this, preventDefault() {} }); }
  focus() {}
}
const doc = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: undefined }), addEventListener() {}, removeEventListener() {} };
globalThis.document = doc;

const J = (f) => JSON.parse(readFileSync(new URL("../" + f, import.meta.url), "utf8"));
const memStore = () => { const m = {}; return { get: (k) => m[k], set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); }, m }; };
const audio = { play: async () => ({ source: "file" }), status: () => ({ source: "file", entryStatus: "recorded" }) };
const ctxFor = (query = {}, extra = {}) => ({ store: memStore(), query, t: (k) => k, settings: { get: (k) => ({ congregation: "sephardi", voice: "f" }[k]) }, audio, ...extra });
const hrefs = (root) => root.find((n) => n.tag === "a" && n.attrs.href).map((n) => n.attrs.href);

const Rt = await import("../src/shell/router.js");
const V = await import("../src/curriculum/intermediate.view.js");
const { byId } = await import("../src/curriculum/lessons.js");
const G = await import("../src/grammar/grammar.view.js");
const { TOPIC_IDS } = await import("../src/grammar/model.js");
const ids = V.listIntermediate().map((l) => l.id);
const gdata = { words: J("data/vocab/words.json").words, registry: J("data/corpus/registry.json").entries, notes: J("data/grammar/notes.json") };

test("routes: list, lesson, grammar and topic match, their modules exist and are in the generated view list, and all are labelled preview", () => {
  const files = [...readFileSync(new URL("../src/shell/views.generated.js", import.meta.url), "utf8").matchAll(/"([\w./-]+\.view\.js)"/g)].map((m) => m[1]);
  const have = Rt.availableRoutes(files);
  const check = (hash, name, q) => {
    const m = Rt.matchRoute(hash);
    assert.equal(m.route?.name, name, hash);
    for (const [k, v] of Object.entries(q || {})) assert.equal(m.query[k], v, hash);
    assert.ok(existsSync(new URL("../src/shell/" + m.route.module, import.meta.url)), `${hash}: module file`);
    assert.ok(have.has(name), `${name} usable in this build`);
    assert.ok(Rt.isPreview(m.route), `${name} is a preview route (banner shown)`);
  };
  check("#/intermediate", "intermediate");
  check("#/grammar", "grammar");
  for (const id of ids) check(`#/intermediate/${id}`, "intermediatelesson", { id });
  for (const t of TOPIC_IDS) check(`#/grammar/${t}`, "grammartopic", { topic: t });
  assert.equal(ids.length, 50);
});

test("list page: every link resolves to a lesson route with a real lesson; all 50 are linked", async () => {
  const root = new N("div"); V.mount(root, ctxFor());
  await waitFor(() => root.find((n) => n.attrs["data-lesson"]).length);
  const seen = new Set();
  for (const h of hrefs(root)) {
    const m = Rt.matchRoute(h);
    assert.equal(m.route?.name, "intermediatelesson", h);
    assert.ok(byId[m.query.id] && ids.includes(m.query.id), `${h}: real lesson`);
    seen.add(m.query.id);
  }
  assert.deepEqual([...seen].sort(), [...ids].sort());
});

test("every lesson page: real content, a way back to the list, a start button, the draft notice; skipping through ends on a summary with a next step", async () => {
  for (const [i, id] of ids.entries()) {
    const root = new N("div"); V.mount(root, ctxFor({ id }));
    await waitFor(() => root.find((n) => n.attrs.id === "alef-int-start").length || /not found|Could not/.test(root.text));
    assert.ok(!/not found|Could not/.test(root.text), id);
    const start = root.find((n) => n.attrs.id === "alef-int-start")[0];
    assert.ok(start && !start.disabled, `${id}: start enabled`);
    assert.match(root.text, /Draft\./, `${id}: labelled draft`);
    assert.ok(hrefs(root).includes("#/intermediate"), `${id}: way back to the list`);
    assert.ok(byId[id].words.length && byId[id].exercises.length, `${id}: has words and exercises`);
    // Skipping every exercise reaches the round summary without recording anything.
    await start.click();
    for (let guard = 0; guard < 200 && !/Round finished|Lesson finished/.test(root.text); guard++) {
      const skip = root.find((n) => n.attrs["data-act"] === "skip" && !n.hidden)[0];
      assert.ok(skip, `${id}: skip available`);
      const before = root.text;
      await skip.click();
      await waitFor(() => root.text !== before || /Round finished/.test(root.text));
    }
    assert.match(root.text, /Round finished/, id);
    const hs = hrefs(root);
    assert.ok(hs.includes("#/intermediate"), `${id}: summary links back to the list`);
    if (i < ids.length - 1) assert.ok(hs.includes(`#/intermediate/${ids[i + 1]}`), `${id}: next lesson link`);
    else assert.ok(!hs.some((h) => /^#\/intermediate\/I-/.test(h)), "last lesson has no next link");
    assert.equal(root.find((n) => n.tag === "a" && /^#\/intermediate\/I-\d+$/.test(n.attrs.href || "")).every((n) => ids.includes(n.attrs.href.split("/").pop())), true);
  }
});

test("grammar: list links resolve to the six topics, each topic has real examples and a way back, bad topic has a way back", async () => {
  const root = new N("div"); G.mount(root, ctxFor({}, { grammarData: gdata }));
  await waitFor(() => root.find((n) => n.tag === "a").length);
  const hs = hrefs(root).filter((h) => h !== "#/grammar");
  assert.deepEqual(hs.map((h) => Rt.matchRoute(h).query.topic).sort(), [...TOPIC_IDS].sort());
  for (const t of TOPIC_IDS) {
    const r = new N("div"); G.mount(r, ctxFor({ topic: t }, { grammarData: gdata }));
    await waitFor(() => r.find((n) => n.attrs.id === "gr-start").length);
    assert.equal(r.find((n) => n.tag === "li" && /id: /.test(n.text)).length, 6, `${t}: six examples`);
    assert.ok(hrefs(r).includes("#/grammar"), `${t}: way back`);
    assert.match(r.text, /Draft|draft|unreviewed/i, `${t}: labelled draft`);
  }
  const bad = new N("div"); G.mount(bad, ctxFor({ topic: "nope" }, { grammarData: gdata }));
  await waitFor(() => /no grammar topic/.test(bad.text));
  assert.ok(hrefs(bad).includes("#/grammar"));
});

test("Learn and Today: an I-xx lesson link opens the learn route, which offers the intermediate player (only when that route exists)", async () => {
  const { buildToday } = await import("../src/home/today.js");
  const { lessons } = await import("../src/curriculum/lessons.js");
  const done = lessons.filter((l) => !/^I-/.test(l.id)).map((l) => l.id);
  const t = buildToday({ completedIds: done, lessons, goal: "read", hasRoute: () => true });
  const card = t.lessons[0];
  assert.equal(card.id, "I-01", "after the beginner path the Today card points at I-01");
  const m = Rt.matchRoute(card.href);
  assert.equal(m.route.name, "learn");
  assert.equal(m.query.lesson, "I-01");
  assert.equal(Rt.matchRoute(t.primary.href).query.lesson, "I-01");
  const L = await import("../src/curriculum/learn.view.js");
  const withRoute = new N("div"); L.mount(withRoute, ctxFor(m.query, { hasRoute: (n) => n === "intermediatelesson" }));
  await waitFor(() => hrefs(withRoute).includes("#/intermediate/I-01"));
  const target = Rt.matchRoute("#/intermediate/I-01");
  assert.equal(target.route.name, "intermediatelesson");
  const without = new N("div"); L.mount(without, ctxFor(m.query, { hasRoute: () => false }));
  await waitFor(() => without.text.length > 0);
  assert.ok(!hrefs(without).some((h) => h.startsWith("#/intermediate")));
  const map = new N("div"); L.mount(map, ctxFor({}, { hasRoute: () => true }));
  await waitFor(() => hrefs(map).includes("#/intermediate"));
});
