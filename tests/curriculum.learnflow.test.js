import test from "node:test";
import assert from "node:assert/strict";
import { waitFor } from "./helpers/waitfor.js";
const until = (n, re) => waitFor(() => re.test(n.text), { message: `text ${re} never appeared` });

// Fake DOM (checks view logic, not browser rendering; the browser flow is covered by tools/smoke.mjs + tools/a11y).
class Node_ {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.nodeType = 1; this.className = ""; this.hidden = false; }
  setAttribute(k, v) { this.attrs[k] = v; if (k === "hidden") this.hidden = true; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { this.children.push(x); if (x && x.parent !== undefined) x.parent = this; } }
  replaceChildren(...c) { this.children = []; this.append(...c.map((x) => (x == null ? { nodeType: 3, data: String(x), parent: undefined } : x))); } // like the real DOM: null becomes the text "null"
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v), parent: undefined }]; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.hidden ? "" : c.text)).join(""); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  async click() { for (const f of this.listeners.click || []) await f({}); }
}
const docListeners = {};
globalThis.document = {
  createElement: (t) => new Node_(t),
  createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: undefined }),
  addEventListener: (t, f) => { (docListeners[t] ||= new Set()).add(f); },
  removeEventListener: (t, f) => docListeners[t]?.delete(f),
};
const key = async (k) => { for (const f of [...(docListeners.keydown || [])]) await f({ key: k, preventDefault() {}, target: { tagName: "BODY" } }); };
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const memStore = (init = {}) => { const m = { ...init }; return { get: (k) => m[k], set: (k, v) => { m[k] = v; }, m }; };
const btn = (root, re) => root.find((n) => n.tag === "button" && re.test((n.attrs["aria-label"] || "") + n.text))[0];


/** Complete a lesson through its quick check: pick the first option every time (misses are repeated once), press Continue. */
async function completeViaQuiz(root, doneRe = /Lesson complete/) {
  await btn(root, /Start quick check/).click();
  for (let g = 0; g < 80 && !doneRe.test(root.text); g++) {
    const cont = root.find((n) => n.tag === "button" && n.attrs["data-act"] === "next" && !n.hidden)[0];
    if (cont) { await cont.click(); continue; }
    const opt = root.find((n) => n.tag === "button" && n.attrs["data-n"] === "1")[0];
    if (opt) await opt.click(); else await tick(5);
  }
  await until(root, doneRe);
}

const actions = await import("../src/curriculum/actions.js");
const { mount } = await import("../src/curriculum/learn.view.js");
const { describeCard } = await import("../src/curriculum/review.view.js");
const { loadContent } = await import("../src/curriculum/content.js");

function ctxFor(store, query, extra = {}) {
  const played = [];
  return { store, query, route: () => {}, t: (k) => k, settings: { get: (k) => ({ congregation: "sephardi", goal: "read" }[k]) },
    audio: { status: () => ({ source: "tts-fallback" }), play: async (kind, id) => { played.push([kind, id]); return { source: "tts-fallback" }; } }, played, ...extra };
}

test("lesson deep link shows letters/vowels/words with audio, completes, creates cards and a streak", async () => {
  const store = memStore(); const ctx = ctxFor(store, { lesson: "r01" });
  const root = new Node_("div"); const un = mount(root, ctx); await until(root, /Draft content/);
  assert.match(root.text, /Shin and Bet/);
  assert.match(root.text, /Letters/); assert.match(root.text, /Vowels and marks/); assert.match(root.text, /Words/);
  assert.match(root.text, /Draft content/); assert.doesNotMatch(root.text, /null|undefined/);
  // audio: play the first letter -> ctx.audio.play('letter','shin') and an honest status line appears
  await btn(root, /Listen to Shin/).click(); await waitFor(() => ctx.played.at(-1)?.[1] === "shin", { message: "Shin audio never played" });
  assert.deepEqual(ctx.played.at(-1), ["letter", "shin"]);
  assert.match(root.text, /Device voice, not a recorded teacher/);
  await btn(root, /Listen to he returned/).click();
  assert.deepEqual(ctx.played.at(-1), ["word", "r01-w1"]);
  // complete
  assert.equal(btn(root, /Start quick check/).attrs.disabled, undefined);
  assert.equal(store.m["curriculum.progress"], undefined, "nothing is completed before the quick check");
  await completeViaQuiz(root); await waitFor(() => store.m["curriculum.progress"]?.completed?.r01, { message: "lesson never completed" });
  assert.ok(store.m["curriculum.progress"].completed.r01);
  assert.equal(Object.keys(store.m["srs.cards"]).length, 6);
  assert.equal(store.m.streak.count, 1);
  assert.match(root.text, /review cards? updated/); assert.match(root.text, /Accuracy/); assert.match(root.text, /Next lesson/);
  un();
});

test("locked lesson: complete is disabled and says why; unknown lesson is a clear message", async () => {
  const root = new Node_("div"); mount(root, ctxFor(memStore(), { lesson: "r02" })); await until(root, /Locked: finish/);
  assert.match(root.text, /Locked: finish/);
  assert.ok("disabled" in btn(root, /Start quick check/).attrs);
  const r2 = new Node_("div"); mount(r2, ctxFor(memStore(), { lesson: "zzz" })); await until(r2, /Lesson not found/);
  assert.match(r2.text, /Lesson not found/);
});

test("review deep link: queue from completed lesson, reveal, keyboard rating, persistence, summary", async () => {
  const store = memStore(); const ctx = ctxFor(store, { lesson: "r01" });
  const lr = new Node_("div"); mount(lr, ctx); await until(lr, /Start quick check/); lr.remove(); await actions.completeLesson(ctx, (await import("../src/curriculum/lessons.js")).byId.r01);

  const root = new Node_("div"); const ctxR = ctxFor(store, { review: "1" });
  const un = mount(root, ctxR); await until(root, /Card 1 of 6/);
  assert.match(root.text, /Card 1 of 6/);
  // rating buttons are hidden until the answer is revealed and keys are ignored before that
  await key("3"); await tick(); assert.match(root.text, /Card 1 of 6/);
  await btn(root, /Show answer/).click();
  assert.equal(root.find((n) => n.attrs["data-rating"]).length, 4);
  await key("3"); await until(root, /Card 2 of 6/);
  assert.match(root.text, /Card 2 of 6/);
  const rated = Object.values(store.m["srs.cards"]).filter((c) => c.reps === 1);
  assert.equal(rated.length, 1); assert.equal(rated[0].state, "review");
  // finish the rest with clicks: 1 Again, 2 Hard, 4 Easy mix
  for (const k of ["1", "2", "4", "3", "3"]) { await btn(root, /Show answer/).click(); await root.find((n) => n.attrs["data-rating"] === k)[0].click();
    await waitFor(() => /Show answer|Session done/.test(root.text) || root.find((n) => n.attrs["data-hint-kind"]).length, { message: "no next card, summary or hint after rating" });
    const panel = root.find((n) => n.attrs["data-hint-kind"]);
    if (k === "1") { /* a hint may follow the learner's own miss; it must be dismissible */ if (panel.length) await btn(root, /Continue/).click(); await waitFor(() => /Show answer|Session done/.test(root.text), { message: "hint never dismissed" }); }
    else assert.equal(panel.length, 0, "no hint after a non-miss rating"); }
  assert.doesNotMatch(root.text, /null|undefined/);
  assert.match(root.text, /Session done/); assert.match(root.text, /6 cards reviewed: 1 again, 1 hard, 3 good, 1 easy/);
  assert.match(root.text, /Streak: 1 day/);
  const again = Object.values(store.m["srs.cards"]).filter((c) => c.state === "relearning");
  assert.equal(again.length, 1);
  un(); assert.equal((docListeners.keydown || new Set()).size, 0, "keydown listener removed on unmount");
});

test("practice deep link creates the lesson's cards without completing it", async () => {
  const store = memStore(); const root = new Node_("div");
  mount(root, ctxFor(store, { lesson: "r01", review: "1" })); await until(root, /Card 1 of 6/);
  assert.match(root.text, /Card 1 of 6/);
  assert.equal(store.m["curriculum.progress"], undefined);
  assert.equal(Object.keys(store.m["srs.cards"]).length, 6);
});

test("empty review says nothing is due", async () => {
  const root = new Node_("div"); mount(root, ctxFor(memStore(), { review: "1" })); await until(root, /Nothing due/);
  assert.match(root.text, /Nothing due/); assert.doesNotMatch(root.text, /null|undefined/);
});

test("describeCard: letter, vowel (tradition-aware) and word cards", async () => {
  const c = await loadContent();
  const l = describeCard("letter:bet", c, "sephardi");
  assert.equal(l.he, "ב"); assert.match(l.hint, /Easily confused with/);
  const v = describeCard("vowel:kamatz", c, "ashkenazi"); assert.match(v.answer.join(" "), /aw as in saw/);
  assert.deepEqual(describeCard("word:r01:1", c, "israeli").audio, ["word", "r01-w1"]);
  assert.equal(describeCard("letter:nope", c, "israeli"), null);
});
