import test from "node:test";
import assert from "node:assert/strict";

// Minimal fake DOM (checks view logic, NOT real browser rendering; see docs/israel/README.md for the real-browser check).
class Node_ {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.nodeType = 1; this.className = ""; }
  setAttribute(k, v) { this.attrs[k] = v; if (k === "class") this.className = v; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { this.children.push(x); if (x && x.parent !== undefined) x.parent = this; } }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  focus() { globalThis.__focused = this; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(""); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  async click() { for (const f of this.listeners.click || []) await f({}); }
}
globalThis.document = { createElement: (t) => new Node_(t), createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: undefined }) };
import { waitFor } from "./helpers/waitfor.js";
const ready = (root) => waitFor(() => /Capital letters/.test(root.text) && root.find((n) => n.tag === "h1").length === 1, { message: "israel view never finished rendering" });
const memStore = (init = {}) => { const m = { ...init }; return { get: async (k) => m[k], set: async (k, v) => { m[k] = v; }, m }; };
const { mount } = await import("../src/israel/israel.view.js");
const mountSec = async (sec, extra = {}) => { const root = new Node_("div"); const store = memStore(); const un = mount(root, { store, query: { sec, ...extra }, settings: {}, t: (k) => k }); await ready(root); return { root, store, un }; };
const btnsWith = (root, attr) => root.find((n) => n.tag === "button" && n.attrs[attr] !== undefined);

test("every section shows the draft + no-audio notice, an h1, and RTL Hebrew", async () => {
  for (const sec of ["", "ladder", "fillers", "giveaways", "say", "etiquette"]) {
    const { root, un } = await mountSec(sec);
    assert.match(root.text, /stressed syllable/, sec);
    assert.equal(root.find((n) => n.tag === "h1").length, 1, sec);
    if (sec && sec !== "etiquette") { const he = root.find((n) => n.attrs.lang === "he"); assert.ok(he.length >= 3, sec); assert.ok(he.every((n) => n.attrs.dir === "rtl")); }
    un();
  }
});

test("no audio: every line says 'No audio yet' and there is no play button", async () => {
  const { root } = await mountSec("ladder");
  assert.ok(root.find((n) => n.className === "il-noaudio").length >= 100);
  assert.equal(root.find((n) => n.tag === "button" && /^Play/.test(n.text)).length, 0);
});

test("audio hook: a play button appears only when the player reports a file", async () => {
  const root = new Node_("div"); let played = null;
  const audio = { status: (k, id) => ({ source: id === "il-lad-hello-textbook" ? "file" : "none" }), play: async (k, id) => { played = id; } };
  const un = mount(root, { store: memStore(), audio, query: { sec: "ladder" }, settings: {} }); await ready(root);
  const plays = root.find((n) => n.tag === "button" && /Play$/.test(n.text));
  assert.equal(plays.length, 1); await plays[0].click(); assert.equal(played, "il-lad-hello-textbook"); un();
});

test("device voice: with no clip but a he-IL voice, a line gets a device-labelled button that speaks the shown Hebrew", async () => {
  const { createAudio } = await import("../src/audio/player.js");
  class Utt { constructor(t) { this.text = t; } }
  const said = []; const speech = { getVoices: () => [{ lang: "he-IL" }], speak(u) { said.push(u.text); queueMicrotask(() => u.onend?.()); }, cancel() {} };
  const audio = createAudio({ settings: { voice: "m", congregation: "israeli" }, manifest: [], AudioCtor: class {}, speech, UtteranceCtor: Utt });
  const root = new Node_("div"); const un = mount(root, { store: memStore(), audio, query: { sec: "ladder" }, settings: {} }); await ready(root);
  const plays = root.find((n) => n.tag === "button" && /Play$/.test(n.text));
  assert.ok(plays.length >= 100); assert.match(plays[0].attrs["aria-label"], /Israeli voice/);
  assert.ok(!/sephardi|ashkenazi/i.test(plays[0].attrs["aria-label"]));
  await plays[0].click(); assert.equal(said.length, 1); assert.match(said[0], /[\u05d0-\u05ea]/); un();
});

test("ladder: gender controls switch the displayed form", async () => {
  const { root } = await mountSec("ladder");
  const card = () => root.find((n) => n.attrs["data-pair"] === "lad-hows-it-going")[0];
  const everyText = () => card().text;
  assert.match(everyText(), /shlomCHA/);
  const toWoman = root.find((n) => n.tag === "button" && n.attrs["data-v"] === "f" && /woman/i.test(n.text));
  // "I am talking to" is the second group; click its woman button
  await toWoman[1].click(); await waitFor(() => /shloMECH/.test(everyText()), { message: "/shloMECH/.test(everyText())" });
  assert.match(everyText(), /shloMECH/);
});

test("ladder: low-confidence items show a visible 'verify' marker", async () => {
  const { root } = await mountSec("ladder");
  assert.match(root.text, /Confidence: low \(verify before use\)/);
});

test("giveaways: answering a drill records stats and an SRS card", async () => {
  const { root, store } = await mountSec("giveaways");
  const first = root.find((n) => n.attrs["data-giveaway"] === "gv-noun-adj")[0];
  const wrong = first.find((n) => n.attrs["data-opt"] === "b")[0];
  await wrong.click(); await waitFor(() => /Not quite/.test(first.text) && store.m["israel.cards"]?.["israel:giveaway:gv-noun-adj"], { message: "/Not quite/.test(first.text) && store.m[\"israel.cards\"]?.[\"israel:giveaway:gv-noun-adj\"]" });
  assert.match(first.text, /Not quite/);
  assert.equal(store.m["israel.stats"].giveaways["gv-noun-adj"].total, 1);
  assert.ok(store.m["israel.cards"]["israel:giveaway:gv-noun-adj"]);
  assert.ok(first.find((n) => n.tag === "button" && n.disabled === true).length >= 3);
});

test("say it: pick through a full round, see explanations, score is saved with SRS cards", async () => {
  const { root, store } = await mountSec("say", { seed: "5" });
  for (let i = 0; i < 8; i++) {
    const opts = btnsWith(root, "data-role");
    assert.equal(opts.length, 3);
    // always pick the natural one on even rounds, the stiff one on odd rounds
    const want = i % 2 === 0 ? "natural" : "stiff";
    await opts.find((b) => b.attrs["data-role"] === want).click(); await waitFor(() => (i % 2 === 0 ? /Natural\. / : /Correct Hebrew, but stiff/).test(root.text) && root.find((n) => n.attrs.id === "il-next").length > 0, { message: "(i % 2 === 0 ? /Natural\\. / : /Correct Hebrew, but stiff/).test(root.text) && root.find((n) => n.attrs.id === \"il-next\").length > 0" });
    assert.match(root.text, i % 2 === 0 ? /Natural\. / : /Correct Hebrew, but stiff/);
    assert.match(root.text, /Different register: /); // explanations for all three are shown
    const next = root.find((n) => n.attrs.id === "il-next")[0]; assert.ok(next); assert.equal(globalThis.__focused, next, "focus moves to Next");
    await next.click(); await waitFor(() => i === 7 ? /natural \(/.test(root.text) : btnsWith(root, "data-role").length === 3, { message: "next question or final score" });
  }
  assert.match(root.text, /4 of 8 natural \(50%\)/);
  assert.equal(Object.keys(store.m["israel.cards"]).length, 8);
  assert.equal(store.m["israel.stats"].sessions.length, 1);
});

test("say it: a second pick on the same question is ignored", async () => {
  const { root, store } = await mountSec("say", { seed: "9" });
  const opts = btnsWith(root, "data-role");
  await opts[0].click(); await opts[1].click(); await waitFor(() => root.find((n) => n.attrs.id === "il-next").length > 0, { message: "root.find((n) => n.attrs.id === \"il-next\").length > 0" });
  const next = root.find((n) => n.attrs.id === "il-next")[0];
  for (let i = 0; i < 7; i++) { await next.click(); await waitFor(() => btnsWith(root, "data-role").length > 0, { message: "next question options" }); const o = btnsWith(root, "data-role"); await o[0].click(); await waitFor(() => root.find((n) => n.attrs.id === "il-next").length > 0, { message: "root.find((n) => n.attrs.id === \"il-next\").length > 0" }); }
  await root.find((n) => n.attrs.id === "il-next")[0].click(); await waitFor(() => / of 8 natural/.test(root.text), { message: "/ of 8 natural/.test(root.text)" });
  assert.match(root.text, / of 8 natural/);
});

test("every interactive control is a real button or link with a name", async () => {
  for (const sec of ["ladder", "giveaways", "say"]) {
    const { root } = await mountSec(sec);
    for (const b of root.find((n) => n.tag === "button")) assert.ok(b.text.trim() || b.attrs["aria-label"], sec + " unnamed button");
    assert.equal(root.find((n) => n.attrs.onclick !== undefined).length, 0);
  }
});

test("unmount removes the view; unknown section falls back to the overview", async () => {
  const { root, un } = await mountSec("nonsense");
  assert.match(root.text, /Register ladder/); un(); assert.equal(root.children.length, 0);
});

test("shared learner gender: unset or both shows both forms on speaker lines (never masculine by default); m or f shows one form; the control writes the setting", async () => {
  const run = async (gender) => {
    const root = new Node_("div"); const store = memStore(); const set = [];
    const settings = { get: (k) => (k === "gender" ? gender : undefined), set: (p) => { set.push(p); return []; } };
    const un = mount(root, { store, query: { sec: "ladder" }, settings, t: (k) => k }); await ready(root); return { root, set, un };
  };
  for (const g of [null, "both"]) { const { root, un } = await run(g); assert.match(root.text, /Forms for a man or a woman speaking/, String(g)); assert.doesNotMatch(root.text, /Form for a man speaking/, String(g)); assert.match(root.text, /If you are a woman:/); un(); }
  const m = await run("m"); assert.match(m.root.text, /Form for a man speaking/); assert.doesNotMatch(m.root.text, /If you are a woman:/); m.un();
  const f = await run("f"); assert.match(f.root.text, /Form for a woman speaking/); assert.doesNotMatch(f.root.text, /Forms for a man or a woman/); 
  const both = btnsWith(f.root, "data-v").find((b) => b.getAttribute("data-v") === "both"); assert.ok(both, "Show both forms control exists"); await both.click();
  assert.deepEqual(f.set.at(-1), { gender: "both" }); f.un();
});
