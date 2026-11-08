import test from "node:test";
import assert from "node:assert/strict";

// Minimal fake DOM + fake clock (checks view logic, NOT browser rendering or the 390px layout).
class N {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.className = ""; this.value = ""; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { if (x && x.nodeType === 1) x.parent = this; this.children.push(x); } }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  set textContent(v) { this.replaceChildren(document.createTextNode(v)); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  focus() { globalThis.__focus = this; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(""); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  querySelector(sel) { return this.find((n) => n.attrs.id === sel.slice(1))[0] || null; }
  fire(type, ev = {}) { for (const f of this.listeners[type] || []) f({ target: this, preventDefault() {}, ...ev }); }
  click() { return this.fire("click"); }
}
const docListeners = {};
globalThis.document = {
  hidden: false,
  createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: null }),
  addEventListener: (t, f) => { (docListeners[t] ||= []).push(f); }, removeEventListener: (t, f) => { docListeners[t] = (docListeners[t] || []).filter((x) => x !== f); },
};
const setHidden = (h) => { document.hidden = h; for (const f of docListeners.visibilitychange || []) f(); };
const flush = () => new Promise((r) => setTimeout(r, 0));
const waitFor = async (f) => { for (let i = 0; i < 200; i++) { const v = f(); if (v) return v; await flush(); } throw new Error("timed out waiting"); };

function fakeClock(start = 1_800_000_000_000) {
  const c = { t: start, fns: [], now: () => c.t, setInterval: (f) => { c.fns.push(f); return c.fns.length; }, clearInterval: (h) => { c.fns[h - 1] = null; },
    advance(ms) { for (let s = 0; s < ms; s += 1000) { c.t += 1000; for (const f of c.fns) f?.(); } } };
  return c;
}
const memStore = (init = {}) => { const m = { ...init }; return { get: (k) => m[k], set: (k, v) => { m[k] = v; }, m }; };
const seeded = (seed = 3) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const btn = (root, re) => root.find((n) => n.tag === "button" && re.test(n.text))[0];
const byId = (root, id) => root.find((n) => n.attrs.id === id)[0];
const statusText = (root) => root.find((n) => n.attrs.role === "status")[0].text;

const { mount, UNVERIFIED } = await import("../src/sprint/sprint.view.js");
const L = await import("../src/sprint/loader.js");
const M = await import("../src/sprint/model.js");
const entries = await L.loadAllVocab();
const sprintData = { entries, registry: await L.loadRegistry(), scenarios: await L.loadScenarios() };

async function boot(extra = {}) {
  const root = new N("div"), store = memStore(extra.store), clock = fakeClock();
  const ctx = { store, clock, rng: seeded(), sprintData, settings: { get: () => "sephardi" }, query: extra.query || {}, audio: extra.audio, t: (k) => k };
  const unmount = mount(root, ctx);
  await waitFor(() => byId(root, "sprint-start"));
  return { root, store, clock, ctx, unmount };
}
/** The entry currently on screen (looked up from its pointed Hebrew). */
const shown = (root) => { const he = root.find((n) => n.attrs.lang === "he")[0].text; return entries.find((e) => e.pointed === he); };
function answerRight(root) {
  const e = shown(root);
  const o = root.find((n) => n.tag === "button" && n.attrs["data-id"] === e.id)[0];
  if (o) { o.click(); return e; }
  byId(root, "sprint-reveal").click(); byId(root, "sprint-knew").click(); return e;
}

test("start screen: destination select, unverified-vocabulary note, attribution, native controls only", async () => {
  const { root } = await boot();
  assert.ok(root.text.includes(UNVERIFIED) && /Unverified vocabulary/.test(root.text));
  assert.ok(/CC BY-SA 4.0/.test(root.text));
  const sel = byId(root, "sprint-dest");
  assert.equal(sel.tag, "select");
  assert.ok(root.find((n) => n.tag === "label" && n.attrs.for === "sprint-dest").length);
  const opts = root.find((n) => n.tag === "option");
  assert.ok(opts.some((o) => /most common/.test(o.text)) && opts.some((o) => /Priestly|Hamotzi|bread/i.test(o.text) || o.attrs.value.startsWith("prayer:")) && opts.some((o) => o.attrs.value.startsWith("israel:")));
  assert.equal(root.find((n) => n.tag === "div" && n.listeners.click).length, 0, "no click handlers on non-buttons");
});

test("a full sprint with a prayer destination: SRS cards saved, aria-live feedback, end screen counts destination words", async () => {
  const { root, store, clock } = await boot();
  byId(root, "sprint-dest").fire("change", { target: { value: "prayer:kiddush-wine-1" } });
  byId(root, "sprint-start").click();
  assert.match(root.text, /Time left 5:00/);
  const dest = (await L.loadRegistry()) && M.buildDestinations(M.buildIndex(entries), sprintData.registry, sprintData.scenarios).find((d) => d.id === "prayer:kiddush-wine-1");
  const first = answerRight(root);
  assert.equal(first.id, dest.words[0].id, "first word comes from the chosen destination");
  assert.match(statusText(root), /^Right\./);
  assert.ok(store.m["srs.vocab"]["vocab:" + first.id], "answer written to the vocab SRS store");
  assert.equal(store.m["srs.vocab"]["vocab:" + first.id].reps, 1);
  assert.ok(root.find((n) => n.tag === "button" && n.attrs.disabled !== undefined).length >= 3, "options disabled after answering");
  clock.advance(30000);
  assert.match(root.text, /Time left 4:30/);
  byId(root, "sprint-next").click();
  assert.equal(statusText(root), "");
  for (let i = 0; i < 5; i++) { answerRight(root); byId(root, "sprint-next").click(); }
  btn(root, /Finish now/).click();
  await flush();
  assert.match(root.text, /Sprint done/);
  const p = byId(root, "sprint-dest-progress").text;
  assert.match(p, /^Toward "Blessing over wine"/);
  assert.match(p, /now answered 5 of 5 recognised words correctly \(5 new this sprint\)/);
  assert.match(p, /not mastery/);
  assert.ok(root.find((n) => n.tag === "a" && n.attrs.href === "#/read/kiddush-wine-1").length, "link to read the line");
  assert.match(statusText(root), /Sprint done\. 6 of 6 right/);
  assert.equal(store.m["sprint.last"].answered, 6);
});

test("wrong answers are gentle: answer shown, word scheduled to return, no punishing language", async () => {
  const { root, store } = await boot();
  byId(root, "sprint-start").click();
  const e = shown(root);
  const wrong = root.find((n) => n.tag === "button" && n.attrs["data-id"] && n.attrs["data-id"] !== e.id)[0];
  wrong.click();
  const s = statusText(root);
  assert.match(s, /^Not yet\./); assert.ok(s.includes(e.gloss)); assert.match(s, /bring it back later/);
  assert.doesNotMatch(s, /wrong|incorrect|fail|lose|lost|penalt/i);
  assert.doesNotMatch(root.text.replace(/^.*?Word Sprint/, ""), /Incorrect|Wrong!|Failed/);
  const c = store.m["srs.vocab"]["vocab:" + e.id];
  assert.equal(c.state, "relearning");
});

test("card types rotate: pick the sound, then flip-and-self-rate", async () => {
  const e = entries.find((x) => x.rank === 5 && x.pointed && !x.isForm) || entries.find((x) => x.pointed && !x.isForm);
  const mk = (reps) => ({ [M.cardId(e)]: { id: M.cardId(e), kind: "word", state: "review", stability: 1, difficulty: 5, reps, lapses: 0, lastReview: 0, due: 0 } });
  for (const [reps, re] of [[1, /pronounced/], [2, /check the meaning/]]) {
    const { root } = await boot({ store: { "srs.vocab": mk(reps) } });
    byId(root, "sprint-start").click();
    assert.match(byId(root, "sprint-q").text, re, `reps=${reps}`);
    if (reps === 2) { assert.ok(!root.text.includes(shown(root).gloss), "meaning hidden until asked"); byId(root, "sprint-reveal").click(); assert.ok(root.text.includes(shown(root).gloss)); assert.ok(byId(root, "sprint-knew") && byId(root, "sprint-notyet")); }
  }
});

test("audio: honest 'No audio yet' when no clip, Listen button only when a clip exists", async () => {
  const none = await boot();
  byId(none.root, "sprint-start").click();
  assert.match(none.root.text, /No audio yet/); assert.equal(btn(none.root, /Listen/), undefined);
  const played = [];
  const audio = { has: (k, id) => k === "word", play: async (k, id) => { played.push(id); } };
  const some = await boot({ audio });
  byId(some.root, "sprint-start").click();
  assert.doesNotMatch(some.root.text, /No audio yet/);
  btn(some.root, /Listen/).click(); await flush();
  assert.equal(played.length, 1);
});

test("audio: with no clip and a he-IL device voice, Listen is a device-labelled button that speaks the shown word", async () => {
  const said = [];
  const audio = { status: () => ({ source: "tts-fallback" }), play: async (k, id, o) => { said.push([id, o && o.text]); return { source: "tts-fallback" }; } };
  const { root } = await boot({ audio });
  byId(root, "sprint-start").click();
  const b = btn(root, /Listen/); assert.ok(b);
  assert.match(b.attrs["aria-label"], /device voice/);
  b.click(); await flush(); assert.equal(said.length, 1); assert.ok(said[0][1] && /[\u05d0-\u05ea]/.test(said[0][1]));
});

test("timer pauses while the page is hidden and resumes", async () => {
  const { root, clock } = await boot();
  byId(root, "sprint-start").click();
  clock.advance(60000);
  setHidden(true);
  clock.advance(600000);               // ten minutes in a background tab
  setHidden(false);
  clock.advance(1000);
  assert.match(root.text, /Time left 3:59/);
  assert.ok(!/Time is up/.test(statusText(root)));
});

test("time up never cuts a question in half: finish the current word, then see results", async () => {
  const { root, clock } = await boot();
  byId(root, "sprint-start").click();
  clock.advance(300000);
  assert.match(statusText(root), /Time is up\. Finish this last word/);
  assert.match(root.text, /Time left 0:00/);
  answerRight(root);
  assert.equal(byId(root, "sprint-next").text, "See my results");
  byId(root, "sprint-next").click(); await flush();
  assert.match(root.text, /Sprint done/); assert.match(root.text, /met 1 word and got 1 of them right/);
});

test("deep link ?dest= preselects, an unknown destination falls back, unmount stops the timer", async () => {
  const a = await boot({ query: { dest: "israel:sc-bill" } });
  assert.equal(byId(a.root, "sprint-dest").value, "israel:sc-bill");
  const b = await boot({ query: { dest: "prayer:nope" } });
  assert.equal(byId(b.root, "sprint-dest").value, "top");
  byId(b.root, "sprint-start").click();
  b.unmount();
  assert.ok(b.clock.fns.every((f) => !f), "interval cleared on unmount");
});

test("nothing answered: honest end screen, no sprint.last written", async () => {
  const { root, store } = await boot();
  byId(root, "sprint-start").click();
  btn(root, /Finish now/).click(); await flush();
  assert.match(root.text, /No words this time/); assert.equal(store.m["sprint.last"], undefined);
});

test("layout guards for a 390px screen: wrapping text, no fixed widths", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/sprint/sprint.view.js", import.meta.url), "utf8");
  assert.match(src, /overflow-wrap:anywhere/); assert.match(src, /max-inline-size:100%/);
  assert.doesNotMatch(src, /[^-]width:\s*\d+px|min-width/);
});
