// Practical units for the Israel track (data/curriculum/israel-units.json, src/curriculum/israel-units*.js).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const data = JSON.parse(fs.readFileSync(new URL("../data/curriculum/israel-units.json", import.meta.url), "utf8"));
const lessons = JSON.parse(fs.readFileSync(new URL("../data/curriculum/lessons.json", import.meta.url), "utf8")).lessons;
const byId = Object.fromEntries(lessons.map((l) => [l.id, l]));
const U = await import("../src/curriculum/israel-units.js");

/** Every Hebrew string a lesson shows: its words and the Hebrew fields of its exercises. */
function hebrewOf(l) {
  const out = new Set(l.words.map((w) => w.he));
  const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { if (["he", "m", "f"].includes(k) && typeof v === "string") out.add(v); else if (k === "options" && Array.isArray(v)) v.forEach((x) => out.add(x)); else walk(v); } };
  walk(l.exercises || []);
  return out;
}

test("every Israel-track lesson sits in exactly one unit, and no synagogue lesson does", () => {
  const israel = lessons.filter((l) => l.track === "israel").map((l) => l.id).sort();
  const placed = data.units.flatMap((u) => U.lessonsOf(u));
  assert.equal(new Set(placed).size, placed.length, "a lesson is in two units");
  assert.deepEqual(placed.slice().sort(), israel);
  for (const u of data.units) {
    assert.ok(u.core.every((id) => /^il\d{2}$/.test(id)), `${u.id}: core lessons are the beginner il lessons`);
    assert.ok(u.more.every((id) => /^I-\d{2}$/.test(id)), `${u.id}: go-further lessons are B1 lessons`);
  }
});

test("no invented Hebrew: every grammar example is a verbatim line of that unit's own lessons", () => {
  for (const u of data.units) {
    const own = new Set(U.lessonsOf(u).flatMap((id) => [...hebrewOf(byId[id])]));
    assert.ok(u.grammar.length >= 1, u.id);
    for (const g of u.grammar) for (const x of g.examples) assert.ok(own.has(x.he), `${u.id}: ${x.he} is not in ${U.lessonsOf(u).join(", ")}`);
  }
});

test("titles are Title Case and every unit says what the learner will be able to do", () => {
  for (const u of data.units) {
    assert.ok(u.can.length > 20, u.id);
    for (const w of u.title.split(/[\s:,]+/)) if (!/^(and|a|the|to|of|by|for|in|on)$/.test(w)) assert.match(w, /^[A-Z0-9]/, `${u.id}: ${u.title}`);
  }
});

test("spaced unit review: locked until the core is done, then 1, 3, 7, 14 and 30 days apart", () => {
  const u = data.units.find((x) => x.id === "u04"), DAY = 86400000, t0 = Date.UTC(2026, 10, 10);
  assert.equal(U.reviewDue(u, {}, {}, t0).state, "locked");
  const done = { il06: t0 - 5 * DAY, il07: t0 };
  let log = {};
  assert.equal(U.reviewDue(u, done, log, t0).state, "waiting");
  assert.equal(U.reviewDue(u, done, log, t0 + DAY).state, "due");
  let now = t0 + DAY;
  for (const gap of [3, 7, 14, 30]) {
    log = U.recordReview(log, u.id, now);
    assert.equal(U.reviewDue(u, done, log, now + (gap - 1) * DAY).state, "waiting");
    now += gap * DAY;
    assert.equal(U.reviewDue(u, done, log, now).state, "due");
  }
  log = U.recordReview(log, u.id, now);
  assert.equal(U.reviewDue(u, done, log, now + 365 * DAY).state, "complete");
});

test("listening drill: the right meaning is among three different options, and the clip is the word's own", () => {
  for (const u of data.units) {
    const items = U.reviewItems(u, byId), qs = U.listeningRound(items, 6, 7);
    assert.ok(qs.length >= 3, `${u.id}: ${qs.length} questions`);
    for (const q of qs) {
      assert.equal(new Set(q.options).size, 3);
      const it = items.find((x) => x.audioId === q.audioId);
      assert.equal(q.options[q.answer], it.en);
      assert.match(q.audioId, /^(il\d{2}|I-\d{2})-w\d+$/);
    }
  }
});

test("speaking drill: every Hebrew line comes from the unit's lessons", () => {
  for (const u of data.units) {
    const own = new Set(U.lessonsOf(u).flatMap((id) => [...hebrewOf(byId[id])]));
    const ds = U.speakingDrills(u, byId);
    assert.ok(ds.length >= 3, u.id);
    for (const d of ds) assert.ok(own.has(d.he), `${u.id}: ${d.he}`);
  }
});

test("routes: old #/israel-units paths stay registered and map into the live Practical course", async () => {
  const { ROUTES } = await import("../src/shell/router.js");
  const r = ROUTES.filter((x) => x.module === "../curriculum/israel-units.view.js");
  assert.deepEqual(r.map((x) => x.pattern), ["/israel-units", "/israel-units/:id"]);
  assert.ok(r.every((x) => x.tier === "preview"));
  const { PREVIEW_HIDDEN } = await import("../src/shell/nav-model.js");
  assert.ok(PREVIEW_HIDDEN.has("israelunits"), "the duplicate course is hidden from the Preview nav");
  assert.equal(U.practicalHref(), "#/practical");
  assert.equal(U.practicalHref("u04"), "#/practical/pu-cafe");
  assert.equal(U.practicalHref("u08"), "#/practical/pu-verbs-now");
  assert.equal(U.practicalHref("unknown"), "#/practical");
  assert.equal(U.lessonHref("il06"), "#/learn?lesson=il06");
  assert.equal(U.lessonHref("I-13"), "#/intermediate/I-13");
});

// ---- the view on a fake DOM (same style as the other curriculum view tests)
class N { constructor(t) { this.tag = t; this.children = []; this.attrs = {}; this.listeners = {}; this.nodeType = 1; this.hidden = false; this.disabled = false; }
  setAttribute(k, v) { this.attrs[k] = v; if (k === "hidden") this.hidden = true; if (k === "disabled") this.disabled = true; }
  removeAttribute(k) { delete this.attrs[k]; if (k === "hidden") this.hidden = false; }
  getAttribute(k) { return this.attrs[k]; } addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) this.children.push(x != null && x.nodeType ? x : { nodeType: 3, data: String(x) }); }
  after(x) {} replaceChildren(...c) { this.children = []; this.append(...c); } remove() {} focus() {}
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v) }]; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.hidden ? "" : c.text)).join(""); }
  find(p, o = []) { if (p(this)) o.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(p, o); return o; }
  async click() { for (const f of this.listeners.click || []) await f({ currentTarget: this, target: this, preventDefault() {} }); } }
globalThis.document ||= { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }), addEventListener() {}, removeEventListener() {} };
const wait = async (pred) => { for (let i = 0; i < 200 && !pred(); i++) await new Promise((r) => setTimeout(r, 5)); assert.ok(pred()); };
const ctxWith = (m, query = {}) => ({ query, t: (k) => k, store: { get: (k) => m[k], set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); } }, settings: { get: () => undefined }, audio: { play: async () => ({ source: "file" }), status: () => ({ source: "file", entryStatus: "tts" }) } });

test("view: old routes redirect into Practical and leave a working link (no dead page)", async () => {
  const V = await import("../src/curriculum/israel-units.view.js");
  const went = [];
  const root = new N("main");
  V.mount(root, { ...ctxWith({}), route: (p) => went.push(p) });
  const link = root.find((n) => n.attrs["data-redirect"])[0];
  assert.ok(link, "list route shows a Practical link");
  assert.equal(link.attrs.href, "#/practical");
  assert.deepEqual(went, ["/practical"]);
  assert.match(root.text, /Practical/);

  const went2 = [];
  const root2 = new N("main");
  V.mount(root2, { ...ctxWith({}, { id: "u04" }), route: (p) => went2.push(p) });
  const link2 = root2.find((n) => n.attrs["data-redirect"])[0];
  assert.equal(link2.attrs.href, "#/practical/pu-cafe");
  assert.deepEqual(went2, ["/practical/pu-cafe"]);
  assert.equal(root2.find((n) => n.attrs["data-drill"]).length, 0, "the old preview drills are gone");
});
