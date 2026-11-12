import test from "node:test";
import assert from "node:assert/strict";
import { waitFor } from "./helpers/waitfor.js";

// Failure injection at every write that counts a lesson as done: the UI and the stored state must agree.
class Node_ {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.nodeType = 1; this.className = ""; this.hidden = false; this.disabled = false; }
  setAttribute(k, v) { this.attrs[k] = v; if (k === "hidden") this.hidden = true; if (k === "disabled") this.disabled = true; }
  removeAttribute(k) { delete this.attrs[k]; if (k === "hidden") this.hidden = false; if (k === "disabled") this.disabled = false; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { const n = x != null && x.nodeType ? x : { nodeType: 3, data: String(x), parent: undefined }; this.children.push(n); if (n.parent !== undefined) n.parent = this; } }
  replaceChildren(...c) { this.children = []; this.append(...c); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v), parent: undefined }]; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.hidden ? "" : c.text)).join(""); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  querySelector(sel) { return this.find((n) => sel.startsWith("#") && n.attrs.id === sel.slice(1))[0] ?? null; }
  async click() { if (this.disabled) return; for (const f of this.listeners.click || []) await f({ currentTarget: this, target: this, preventDefault() {} }); }
  focus() {}
}
globalThis.document = { createElement: (t) => new Node_(t), createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: undefined }), activeElement: null, addEventListener() {}, removeEventListener() {} };

const A = await import("../src/curriculum/actions.js");
const S = await import("../src/curriculum/exercises.session.js");
const { StoreWriteError } = await import("../src/curriculum/dom.js");
const { byId, lessons } = await import("../src/curriculum/lessons.js");
const { loadContent } = await import("../src/curriculum/content.js");
const { mountLesson } = await import("../src/curriculum/lesson.view.js");
const content = await loadContent();
const wordPool = lessons.filter((l) => !/^[a-z]\d/.test("") && !/^i/.test(l.id)).flatMap((l) => l.words);

const KEYS = ["srs.cards", "curriculum.progress", "streak"];
/** In-memory store; `bad(key)` makes set(key) throw while it returns true. */
function mkStore(init = {}) {
  const m = JSON.parse(JSON.stringify(init)); const log = []; let bad = () => false;
  return { m, log, failWhen(f) { bad = f; }, get: (k) => (k in m ? JSON.parse(JSON.stringify(m[k])) : undefined),
    set(k, v) { if (bad(k)) { log.push("FAIL " + k); throw new Error("write refused: " + k); } log.push(k); m[k] = JSON.parse(JSON.stringify(v)); },
    remove(k) { delete m[k]; log.push("remove " + k); } };
}
const lesson = byId.r01;
const qs = [{ id: "q1", cardId: "word:r01:1", cardKind: "word" }];

for (const failKey of KEYS) {
  test(`completeLesson: a refused write of ${failKey} rejects and leaves nothing half done`, async () => {
    const s = mkStore(); s.failWhen((k) => k === failKey);
    await assert.rejects(() => A.completeLesson({ store: s }, lesson, 1e12), (e) => e instanceof StoreWriteError && e.key === failKey && e.rolledBack === true);
    assert.deepEqual(s.m, {}, "no key written, so the lesson is neither marked done nor scheduled");
  });
  test(`saveQuickCheck: a refused write of ${failKey} rejects, completed is never reported, stored state is unchanged`, async () => {
    const before = { "curriculum.progress": { completed: { x01: 5 } }, streak: { count: 2, best: 2, last: "2001-09-07" } };
    const s = mkStore(before); s.failWhen((k) => k === failKey);
    await assert.rejects(() => A.saveQuickCheck({ store: s }, lesson, qs, { q1: true }, 1e12), StoreWriteError); // a pass: the full batch
    assert.deepEqual(s.m, before);
  });
}
test("a failed write after others succeeded is undone in reverse order; a later retry schedules each card once", async () => {
  const s = mkStore(); let refuse = true; s.failWhen((k) => refuse && k === "streak");
  await assert.rejects(() => A.completeLesson({ store: s }, lesson, 1e12), StoreWriteError);
  assert.deepEqual(s.log.filter((x) => !x.startsWith("FAIL")), ["srs.cards", "curriculum.progress", "remove curriculum.progress", "remove srs.cards"]);
  refuse = false;
  const r1 = await A.completeLesson({ store: s }, lesson, 2e12);
  assert.ok(r1.added > 0);
  const snap = JSON.stringify(s.m["srs.cards"]);
  const r2 = await A.completeLesson({ store: s }, lesson, 3e12); // pressing again later
  assert.equal(r2.added, 0, "no duplicate cards");
  assert.equal(JSON.stringify(s.m["srs.cards"]), snap, "cards keep their first due dates");
  assert.equal(s.m["curriculum.progress"].completed.r01, 2e12, "the first completion time is kept");
});
test("a write that cannot be undone is reported as such", async () => {
  const s = mkStore(); s.failWhen((k) => k === "streak"); const rm = s.remove; s.remove = () => { throw new Error("no"); };
  await assert.rejects(() => A.completeLesson({ store: s }, lesson, 1e12), (e) => e instanceof StoreWriteError && e.rolledBack === false);
  s.remove = rm;
});
test("a missing store is an error for the writes that count a lesson as done", async () => {
  await assert.rejects(() => A.completeLesson({}, lesson, 1e12), StoreWriteError);
  await assert.rejects(() => A.saveQuickCheck({ store: {} }, lesson, qs, { q1: true }), StoreWriteError);
  await assert.rejects(() => A.completeLesson(undefined, lesson, 1e12), StoreWriteError);
});
test("saveQuickCheck (a pass) writes cards (with the answers applied), the done mark and the streak in one batch", async () => {
  const s = mkStore();
  const r = await A.saveQuickCheck({ store: s }, lesson, qs, { q1: true }, 1e12);
  assert.deepEqual([r.completed, r.passed, r.updated], [true, true, 1]);
  assert.deepEqual(s.log, ["srs.cards", "curriculum.progress", "streak", "lesson.checks.v1"], "cards first, so a lesson is never done without its cards; the check score last, in the same batch (lane 4, certificate)");
  assert.equal(s.m["srs.cards"]["word:r01:1"].reps, 1, "the answer was applied to the saved card");
});
test("saveQuickCheck below the pass mark (C-01) writes the review cards only: no done mark, no streak day", async () => {
  const s = mkStore();
  const r = await A.saveQuickCheck({ store: s }, lesson, qs, { q1: false }, 1e12);
  assert.deepEqual([r.completed, r.passed, r.updated, r.right, r.need, r.of], [false, false, 1, 0, 1, 1]);
  assert.deepEqual(s.log, ["srs.cards", "lesson.checks.v1"], "only the cards and the attempt's score are written (lane 4: the certificate keeps attempts)");
  assert.deepEqual(s.m["lesson.checks.v1"].r01, { pass: null, tries: [{ at: 1e12, right: 0, of: 1 }] });
  assert.equal(s.m["srs.cards"]["word:r01:1"].reps, 1, "the miss was applied to the saved card (relearning, due in minutes)");
  assert.equal(s.m["curriculum.progress"], undefined); assert.equal(s.m.streak, undefined);
});
test("a store that kept the data in memory (set returns false) is not a failure: the learner is told by the storage notice", async () => {
  const m = {}; const store = { persistent: false, get: (k) => m[k], set: (k, v) => { m[k] = v; return false; } };
  const r = await A.completeLesson({ store }, lesson, 1e12);
  assert.ok(r.added > 0); assert.ok(m["curriculum.progress"].completed.r01);
});
test("the real store: a localStorage that refuses every write still completes in memory and says so", async () => {
  const { createStore } = await import("../src/store.js");
  const ls = { _m: new Map(), getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }, setItem(k, v) { if (this.refuse && k !== "__alef_probe__") { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; } this._m.set(k, v); }, removeItem(k) { this._m.delete(k); }, key(i) { return [...this._m.keys()][i] ?? null; }, get length() { return this._m.size; } };
  const store = createStore({ storage: ls, window: null }); ls.refuse = true;
  await A.completeLesson({ store }, lesson, 1e12);
  assert.equal(store.persistent, false); assert.equal(store.degradedReason, "quota");
  assert.ok(store.get("curriculum.progress").completed.r01, "kept for this visit");
  assert.ok(Object.keys(store.get("srs.cards")).length > 0);
});

// ---- the screen must agree with the store
const by = (root, pred) => root.find((n) => n.tag === "button" && pred(n));
const lessonCtx = (store) => ({ store, t: (k) => k, settings: { get: (k) => ({ congregation: "sephardi" }[k]) }, query: { lesson: "r01" } });
async function playThrough(root, retryOnly) {
  const idx = lessons.findIndex((l) => l.id === "r01");
  const all = S.buildChoiceQuestions(byId.r01, { ...content, wordPool }, { seed: 1 + idx });
  for (let g = 0; g < 120 && !/Lesson complete|not saved as complete/.test(root.text); g++) {
    const cont = by(root, (b) => b.attrs["data-act"] === "next" && !b.hidden)[0]; if (cont) { await cont.click(); continue; }
    const cur = root.find((n) => n.attrs["data-ex"])[0]; const q = all.find((x) => x.id === cur.attrs["data-ex"]);
    await by(root, (b) => b.attrs["data-n"] === String(q.answerIndex + 1))[0].click();
  }
}
test("lesson page: when the save is refused it does NOT say 'Lesson complete', shows an alert, and the retry button completes it once the store works", async () => {
  const s = mkStore(); s.failWhen((k) => k === "srs.cards");
  const root = new Node_("div"); const off = mountLesson(root, lessonCtx(s), "r01");
  await waitFor(() => by(root, (b) => b.attrs.id === "alef-quick-start")[0]);
  await by(root, (b) => b.attrs.id === "alef-quick-start")[0].click();
  await playThrough(root);
  await waitFor(() => root.find((n) => n.attrs.id === "alef-save-failed")[0]);
  assert.doesNotMatch(root.text, /Lesson complete/);
  assert.match(root.text, /not saved as complete/);
  assert.equal(root.find((n) => n.attrs.id === "alef-save-failed")[0].attrs.role, "alert");
  assert.equal(s.m["curriculum.progress"], undefined, "stored state agrees: not complete");
  s.failWhen(() => false);
  await by(root, (b) => b.attrs.id === "alef-save-retry")[0].click();
  await waitFor(() => /Lesson complete/.test(root.text));
  assert.equal(root.find((n) => n.attrs.id === "alef-save-failed").length, 0, "the notice is gone");
  assert.ok(s.m["curriculum.progress"].completed.r01 && Object.keys(s.m["srs.cards"]).length > 0 && s.m.streak.count === 1);
  off();
});
