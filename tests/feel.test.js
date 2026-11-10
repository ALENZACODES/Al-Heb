import test from "node:test";
import assert from "node:assert/strict";
import { waitFor } from "./helpers/waitfor.js";

// Fake DOM in the style of the other curriculum view tests (strict replaceChildren, hidden/disabled tracking).
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
  async click() { if (this.disabled) return; for (const f of this.listeners.click || []) await f({ currentTarget: this, target: this, preventDefault() {} }); }
  focus() {}
}
const keyHandlers = [];
globalThis.document = { createElement: (t) => new Node_(t), createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: undefined }), activeElement: null,
  addEventListener: (t, f) => { if (t === "keydown") keyHandlers.push(f); }, removeEventListener: (t, f) => { const i = keyHandlers.indexOf(f); if (i >= 0) keyHandlers.splice(i, 1); } };
const key = async (k) => { for (const f of [...keyHandlers]) await f({ key: k, target: { tagName: "BODY" } }); };
const memStore = (init = {}) => { const m = { ...init }; return { get: (k) => m[k], set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); }, m }; };

const S = await import("../src/curriculum/exercises.session.js");
const UI = await import("../src/curriculum/exercises.ui.js");
const actions = await import("../src/curriculum/actions.js");
const A = await import("../src/curriculum/intermediate-adapter.js");
const { lessons, byId } = await import("../src/curriculum/lessons.js");
const { loadContent } = await import("../src/curriculum/content.js");
const content = await loadContent();
const inter = lessons.filter((l) => A.isIntermediateId(l.id)), basic = lessons.filter((l) => !A.isIntermediateId(l.id));
const wordPool = basic.flatMap((l) => l.words);
const by = (root, pred) => root.find((n) => n.tag === "button" && pred(n));

// ------------------------------------------------------------------------------------------------ variety
test("variety: no two exercises of the same type back to back wherever that is avoidable (all 50 lessons)", () => {
  let before = 0, after = 0;
  for (const l of inter) {
    const seq = S.sequenceExercises(l.exercises);
    assert.deepEqual(seq.map((e) => e.id).sort(), l.exercises.map((e) => e.id).sort(), `${l.id}: same exercises`);
    before += S.backToBack(l.exercises); after += S.backToBack(seq);
    const counts = {}; for (const e of l.exercises) counts[e.type] = (counts[e.type] || 0) + 1;
    if (Math.max(...Object.values(counts)) <= Math.ceil(l.exercises.length / 2)) assert.equal(S.backToBack(seq), 0, `${l.id} avoidable repeat`);
  }
  assert.ok(before > 0 && after < before / 4, `repeats ${before} -> ${after}`);
  assert.ok(new Set(inter.flatMap((l) => l.exercises.map((e) => e.type))).size === 10, "all ten types are in the course");
});

// ------------------------------------------------------------------------------------------------ session semantics
test("session: a miss comes back once at the end, first attempt is what counts, progress never exceeds 100%", () => {
  const s = S.createSession([{ id: "a" }, { id: "b" }, { id: "c" }]);
  assert.equal(s.current().id, "a"); s.answer(true);
  assert.equal(s.answer(false).requeued, true);            // b missed
  assert.equal(s.current().id, "c"); s.answer(true);
  assert.equal(s.current().id, "b"); assert.ok(s.isRetry());
  assert.deepEqual(s.progress(), { resolved: 3, total: 4, fraction: 0.75 });
  s.answer(true);                                           // retry right: not counted as a first-attempt hit
  assert.ok(s.done());
  const st = s.stats();
  assert.deepEqual([st.answered, st.right, st.missed, st.retried, st.retriedRight], [3, 2, ["b"], 1, 1]);
  assert.equal(st.accuracy, 2 / 3); assert.equal(s.progress().fraction, 1);
  const w = S.createSession([{ id: "x" }]); w.answer(false); w.answer(false); assert.ok(w.done()); assert.deepEqual(w.stats().missed, ["x"]); // one retry only
});
test("session: skip is penalty-free, comes back once, a second skip drops it ungraded; undo reverts without trace", () => {
  const s = S.createSession([{ id: "a" }, { id: "b" }]);
  s.skip(); assert.equal(s.current().id, "b"); assert.deepEqual(s.firstResults(), {});
  s.answer(true); assert.equal(s.current().id, "a");
  assert.deepEqual(s.skip(), { dropped: true });
  assert.ok(s.done()); assert.deepEqual(s.skippedIds(), ["a"]); assert.equal(s.stats().answered, 1); assert.equal(s.stats().accuracy, 1);
  const u = S.createSession([{ id: "a" }, { id: "b" }]);
  u.answer(false); assert.equal(u.progress().total, 3);
  assert.equal(u.undo(), true);
  assert.deepEqual([u.current().id, u.firstResults(), u.progress().total, u.progress().resolved], ["a", {}, 2, 0]);
  assert.equal(u.undo(), false, "only the last answer can be undone");
});

// ------------------------------------------------------------------------------------------------ position bias
test("no answer-position bias: produce answers spread over the slots (all lessons), and the data itself is always slot 0", () => {
  const all = inter.flatMap((l) => l.exercises.filter((e) => e.type === "produce"));
  assert.ok(all.length > 100 && all.every((e) => e.answer === 0), "source data puts the answer first, so the player must shuffle");
  const pos = [0, 0, 0];
  for (const e of all) {
    const o = S.fairProduceOptions(e);
    assert.equal(o.filter((x) => x.correct).length, 1); assert.equal(new Set(o.map((x) => A.heKey(x.text))).size, o.length);
    pos[o.findIndex((x) => x.correct)]++;
  }
  for (const c of pos) assert.ok(c / all.length > 0.28 && c / all.length < 0.40, `slots ${pos}`);
  // stable for the same exercise, and quick-check questions are spread too
  assert.deepEqual(S.fairProduceOptions(all[0]), S.fairProduceOptions(all[0]));
  const slots = [0, 0, 0];
  for (let seed = 1; seed <= 300; seed++) for (const q of S.buildChoiceQuestions(byId.r01, { ...content, wordPool }, { seed })) slots[q.answerIndex]++;
  const tot = slots.reduce((a, b) => a + b, 0); for (const c of slots) assert.ok(c / tot > 0.28 && c / tot < 0.40, `quiz slots ${slots}`);
});

// ------------------------------------------------------------------------------------------------ distractor quality (seeded)
test("distractors: unique, never the answer, look-alikes preferred, and sound questions never offer a same-sound letter", () => {
  const letters = content.letters, conf = content.confusables;
  let lookalikeSeen = 0, tried = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const rand = (() => { const r = S.hashSeed("d" + seed); let a = r; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })();
    for (const id of letters.keys()) {
      const d = S.letterDistractors(id, letters, conf, rand, { n: 2 });
      assert.equal(d.length, 2); assert.ok(!d.includes(id)); assert.equal(new Set(d).size, 2);
      const inSet = conf.sets.some((s) => s.letters.includes(id) && s.letters.some((x) => x !== id && letters.has(x)));
      if (inSet) { tried++; if (d.some((x) => conf.sets.some((s) => s.letters.includes(id) && s.letters.includes(x)))) lookalikeSeen++; }
      const ds = S.letterDistractors(id, letters, conf, rand, { n: 2, bySound: true });
      for (const x of ds) assert.notEqual(letters.get(x).sound.en, letters.get(id).sound.en, `${id} vs ${x} share a sound`);
    }
  }
  assert.equal(lookalikeSeen, tried, "every letter that has look-alikes gets at least one among its distractors");
});
test("every quick-check question in the course passes the audit; no option is also correct (same name / same meaning)", () => {
  let n = 0;
  for (const l of basic) {
    for (const seed of [1, 7, 42]) {
      const qs = S.buildChoiceQuestions(l, { ...content, wordPool }, { seed });
      for (const q of qs) {
        n++; assert.deepEqual(S.auditQuestion(q), [], `${l.id} ${q.id}`);
        const right = q.options[q.answerIndex].text.toLowerCase();
        assert.equal(q.options.filter((o) => o.text.toLowerCase() === right).length, 1);
        if (q.kind === "word-meaning") { const w = l.words.find((x) => x.he === q.promptHe); const mine = new Set(l.words.map((x) => x.en.toLowerCase())); q.options.forEach((o, i) => { if (i !== q.answerIndex) assert.ok(!mine.has(o.text.toLowerCase()), `${l.id}: distractor "${o.text}" is a meaning taught in this lesson`); }); assert.ok(w); }
        assert.ok(q.why && q.why.length > 5);
      }
    }
  }
  assert.ok(n > 200, `${n} questions audited`);
  assert.ok(basic.every((l) => !l.letters.length && !l.words.length || S.buildChoiceQuestions(l, { ...content, wordPool }).length > 0), "every lesson with letters or words has a quick check");
  assert.equal(S.auditQuestion({ options: [{ text: "a" }, { text: "A" }], answerIndex: 0 }).length, 1, "audit flags duplicates");
});
test("produce exercises in the data: no distractor equals the answer after normalising pointing marks and punctuation", () => {
  for (const l of inter) for (const e of l.exercises) if (e.type === "produce") {
    const keys = e.options.map(A.heKey); assert.equal(new Set(keys).size, keys.length, e.id);
    assert.ok(e.options.length >= 3, e.id);
  }
});

// ------------------------------------------------------------------------------------------------ feel hooks
test("haptics and sound are opt-in, and haptics stay off under prefers-reduced-motion", () => {
  const calls = [], sfx = [];
  const win = (reduce) => ({ matchMedia: () => ({ matches: reduce }), navigator: { vibrate: (p) => calls.push(p) } });
  const ctx = (o) => ({ settings: { get: (k) => o[k] }, sfx: { play: (n) => sfx.push(n) } });
  assert.deepEqual(S.fireFeedback(ctx({}), true, win(false)), { haptic: false, sound: false }, "off by default");
  assert.deepEqual(S.fireFeedback(ctx({ haptics: true, soundEffects: true }), false, win(false)), { haptic: true, sound: true });
  assert.deepEqual(calls, [[30, 40, 30]]); assert.deepEqual(sfx, ["wrong"]);
  assert.deepEqual(S.fireFeedback(ctx({ haptics: true }), true, win(true)), { haptic: false, sound: false }, "reduced motion: no vibration");
  assert.doesNotThrow(() => S.fireFeedback({ settings: { get() { throw new Error("x"); } } }, true, {}));
});
test("copy is encouraging without gushing: short, no exclamation marks, no 'Complete' wording on a miss", () => {
  for (const c of [true, false]) for (const retry of [true, false]) for (let n = 0; n < 5; n++) { const t = S.feedbackText(c, { retry, streak: 5, n }); assert.ok(t.length < 60 && !/!/.test(t), t); }
  for (const a of [null, 0, 0.5, 0.8, 1]) assert.ok(!/!/.test(S.closingLine(a, 2)));
  assert.equal(S.fmtDuration(125000), "2:05");
});

// ------------------------------------------------------------------------------------------------ the quick-check player (fake DOM)
const lessonCtx = (store, extra = {}) => ({ store, t: (k) => k, settings: { get: (k) => ({ congregation: "sephardi" }[k]) }, ...extra });
test("quick check player: bar, per-answer feedback with the right answer and why, Enter continues, misses come back, summary has a next button", async () => {
  const l = byId.r01, qs = S.buildChoiceQuestions(l, { ...content, wordPool });
  const host = new Node_("div"); let fin = null; const ctx = lessonCtx(memStore());
  let t = 1000; const off = UI.mountQuiz(host, { questions: qs, ctx, now: () => (t += 1000), onFinish: (r) => { fin = r; } });
  const bar = () => host.find((n) => n.attrs.role === "progressbar")[0];
  assert.equal(bar().attrs["aria-valuenow"], "0");
  const q1 = qs[0];
  // wrong answer: shows the right one, the reason, marks both buttons, offers Undo, no Continue until answered
  assert.ok(by(host, (b) => b.attrs["data-act"] === "next")[0].hidden);
  const wrongI = q1.options.findIndex((_, i) => i !== q1.answerIndex);
  await by(host, (b) => b.attrs["data-n"] === String(wrongI + 1))[0].click();
  assert.match(host.text, /Not quite\. The answer is /); assert.ok(host.text.includes(q1.options[q1.answerIndex].text));
  assert.ok(host.text.includes(q1.why));
  assert.equal(by(host, (b) => b.attrs["data-state"] === "right").length, 1); assert.equal(by(host, (b) => b.attrs["data-state"] === "wrong").length, 1);
  assert.equal(host.find((n) => n.attrs["data-result"])[0].attrs["data-result"], "wrong");
  // undo restores a fresh question (no penalty), then answer wrong again and continue with Enter
  await by(host, (b) => b.attrs["data-act"] === "undo")[0].click();
  assert.equal(by(host, (b) => b.attrs["data-state"]).length, 0); assert.equal(bar().attrs["aria-valuenow"], "0");
  await by(host, (b) => b.attrs["data-n"] === String(wrongI + 1))[0].click();
  const total0 = qs.length; await key("Enter");
  assert.match(host.text, new RegExp(`Question 2 of ${total0 + 1}`), "the miss added one repeat to the total");
  // the rest right, then the repeat; finish
  for (let g = 0; g < 40 && !fin; g++) {
    const cur = host.find((n) => n.attrs["data-ex"])[0]; const q = qs.find((x) => x.id === cur.attrs["data-ex"]);
    await by(host, (b) => b.attrs["data-n"] === String((q.answerIndex) + 1))[0].click();
    await key("Enter");
  }
  assert.ok(fin, "finished"); assert.equal(fin.stats.answered, qs.length); assert.deepEqual(fin.stats.missed, [q1.id]);
  assert.equal(fin.stats.retried, 1); assert.equal(fin.stats.retriedRight, 1); assert.ok(fin.ms >= 1000);
  const sum = new Node_("div"); sum.append(UI.summaryNode({ stats: fin.stats, ms: fin.ms, countText: "x", goodLabels: ["a"], missedLabels: ["b"], skippedN: 0, cardsUpdated: 2, nextHref: "#/learn?lesson=r02" }));
  assert.match(sum.text, /Accuracy/); assert.match(sum.text, /Time/); assert.match(sum.text, /To review:/); assert.match(sum.text, /2 review cards updated/);
  assert.equal(sum.find((n) => n.tag === "a")[0].attrs.href, "#/learn?lesson=r02", "next is the first/primary action");
  off();
});
test("quick check player: Continue, Undo and Skip live in the sticky action bar, and after an answer the explanation (the last line above the bar) is scrolled into view", async () => {
  const qs = S.buildChoiceQuestions(byId.r01, { ...content, wordPool }).slice(0, 2);
  const host = new Node_("div"); const off = UI.mountQuiz(host, { questions: qs, ctx: lessonCtx(memStore()), onFinish: () => {} });
  const bar = host.find((n) => /\balef-actionbar\b/.test(n.className))[0];
  assert.ok(bar, "action bar present");
  assert.deepEqual(bar.find((n) => n.attrs["data-act"]).map((n) => n.attrs["data-act"]), ["next", "undo", "skip"], "DOM (tab) order: Continue, Undo, Skip");
  const optBtns = by(host, (b) => b.tag === "button" && b.attrs["data-n"]);
  assert.ok(optBtns.length >= 2 && optBtns.every((b) => (b.listeners.focus || []).length === 1), "every option re-scrolls itself on keyboard focus (the browser's own focus scroll leaves it under the bar)");
  const scrolled = []; const orig = Node_.prototype.scrollIntoView; Node_.prototype.scrollIntoView = function (o) { scrolled.push({ cls: this.className, block: o?.block }); };
  try { await by(host, (b) => b.attrs["data-n"] === "1")[0].click(); } finally { Node_.prototype.scrollIntoView = orig; }
  assert.equal(scrolled.length, 1, "one scroll call (a second would cancel the smooth scroll of the first)");
  assert.match(scrolled[0].cls, /alef-why/); assert.equal(scrolled[0].block, "nearest");
  off();
});
test("quick check player: number keys answer, S skips (nothing recorded), and a dropped item is reported, not graded", async () => {
  const qs = S.buildChoiceQuestions(byId.r01, { ...content, wordPool }).slice(0, 2);
  const host = new Node_("div"); let fin; const off = UI.mountQuiz(host, { questions: qs, ctx: lessonCtx(memStore()), onFinish: (r) => { fin = r; } });
  await key("s"); await key("s"); await key("1"); await key("s");   // skip first, skip second, answer 1st again via key... then skip it twice
  for (let g = 0; g < 10 && !fin; g++) { if (by(host, (b) => b.attrs["data-act"] === "next" && !b.hidden)[0]) await key("Enter"); else await key("s"); }
  assert.ok(fin); assert.ok(fin.stats.skipped.length >= 1 || fin.stats.answered >= 1);
  assert.equal(new Set([...Object.keys(fin.results), ...fin.stats.skipped]).size, qs.length, "every question is either answered or reported as skipped");
  off();
});

// ------------------------------------------------------------------------------------------------ lesson page + SRS
const { mountLesson } = await import("../src/curriculum/lesson.view.js");
test("a lesson without exercises cannot be completed by a tap; the quick check completes it and feeds the SRS (misses lapse, hits review)", async () => {
  const store = memStore(); const ctx = lessonCtx(store, { query: { lesson: "r01" } });
  const root = new Node_("div"); const off = mountLesson(root, ctx, "r01");
  await waitFor(() => by(root, (b) => b.attrs.id === "alef-quick-start")[0]);
  assert.doesNotMatch(root.text, /Mark lesson complete/);
  assert.equal(store.m["curriculum.progress"], undefined);
  await by(root, (b) => b.attrs.id === "alef-quick-start")[0].click();
  assert.equal(store.m["curriculum.progress"], undefined, "starting is not completing");
  // answer everything wrong on the first pass, right on the retry
  const qs = S.buildChoiceQuestions(byId.r01, { ...content, wordPool }, { seed: 1 + lessons.findIndex((l) => l.id === "r01") });
  const first = new Set();
  for (let g = 0; g < 80 && !/Lesson complete/.test(root.text); g++) {
    const cont = by(root, (b) => b.attrs["data-act"] === "next" && !b.hidden)[0]; if (cont) { await cont.click(); continue; }
    const cur = root.find((n) => n.attrs["data-ex"])[0]; const q = qs.find((x) => x.id === cur.attrs["data-ex"]);
    const retry = first.has(q.id); first.add(q.id);
    const pick = retry ? q.answerIndex : q.options.findIndex((_, i) => i !== q.answerIndex);
    await by(root, (b) => b.attrs["data-n"] === String(pick + 1))[0].click();
  }
  await waitFor(() => store.m["curriculum.progress"]?.completed?.r01);
  assert.match(root.text, /0 of \d+ right first time/); assert.match(root.text, /To review:/); assert.match(root.text, /Next lesson/);
  const cards = store.m["srs.cards"]; const lapsed = Object.values(cards).filter((c) => c.lapses > 0);
  assert.ok(lapsed.length >= 1, "first-attempt misses lapse their cards");
  assert.ok(store.m.streak.count >= 1);
  off();
});
test("beginner lesson: tapping Start brings the quiz card up and moves focus to its heading without a second scroll", async () => {
  const store = memStore(); const ctx = lessonCtx(store, { query: { lesson: "r01" } });
  const root = new Node_("div");
  Node_.prototype.querySelector = function (sel) { const f = sel.startsWith("#") ? (n) => n.attrs.id === sel.slice(1) : (n) => new RegExp("\\b" + sel.slice(1) + "\\b").test(n.className); return this.find(f)[0] ?? null; };
  const scrolled = [], focused = [];
  const origS = Node_.prototype.scrollIntoView, origF = Node_.prototype.focus;
  Node_.prototype.scrollIntoView = function (o) { scrolled.push({ cls: this.className, o }); };
  Node_.prototype.focus = function (o) { focused.push({ id: this.attrs.id, o }); };
  const off = mountLesson(root, ctx, "r01");
  try {
    await waitFor(() => by(root, (b) => b.attrs.id === "alef-quick-start")[0]);
    scrolled.length = 0; focused.length = 0;
    await by(root, (b) => b.attrs.id === "alef-quick-start")[0].click();
    assert.equal(scrolled.length, 1, "one scroll call");
    assert.match(scrolled[0].cls, /alef-ex-card/); assert.equal(scrolled[0].o.block, "start");
    assert.ok(!("behavior" in scrolled[0].o), "no forced behaviour: CSS scroll-behavior decides, and it is auto under reduced motion");
    const f = focused.filter((x) => x.id === "alef-q-title");
    assert.equal(f.length, 1, "the question heading takes focus"); assert.deepEqual(f[0].o, { preventScroll: true });
  } finally { Node_.prototype.scrollIntoView = origS; Node_.prototype.focus = origF; delete Node_.prototype.querySelector; off(); }
  const { readFileSync } = await import("node:fs");
  assert.match(readFileSync(new URL("../assets/css/app.css", import.meta.url), "utf8"), /prefers-reduced-motion: reduce\)[^\n]*scroll-behavior: auto !important/);
});
test("saveQuickCheck refuses to complete with no questions or no answers", async () => {
  const store = memStore(); const ctx = lessonCtx(store);
  assert.equal((await actions.saveQuickCheck(ctx, byId.r01, [], {})).completed, false);
  assert.equal((await actions.saveQuickCheck(ctx, byId.r01, [{ id: "q" }], {})).completed, false);
  assert.equal(store.m["curriculum.progress"], undefined);
});

// ------------------------------------------------------------------------------------------------ intermediate player: SRS wiring, undo, retry, skip
const V = await import("../src/curriculum/intermediate.view.js");
const section = (root) => root.find((n) => n.attrs["data-ex"])[0];
const idOf = (root, id) => root.find((n) => n.attrs.id === id)[0];
async function openLesson(store, id, ctxExtra = {}) {
  const root = new Node_("div"); const off = V.mount(root, lessonCtx(store, { query: { id }, audio: { play: async () => ({ source: "file" }), status: () => ({ source: "file" }) }, ...ctxExtra }));
  await waitFor(() => idOf(root, "alef-int-start")); await idOf(root, "alef-int-start").click(); await waitFor(() => section(root)); return { root, off };
}
test("intermediate player: progress bar, why-line, undo costs nothing in the SRS, a miss is repeated, summary applies the SRS (applyOutcomesToCards path)", async () => {
  const l = inter.find((x) => x.exercises.some((e) => e.type === "produce")), store = memStore();
  const { root, off } = await openLesson(store, l.id);
  assert.equal(idOf(root, "alef-int-start"), undefined); // started
  const pb = root.find((n) => n.attrs.role === "progressbar")[0]; assert.ok(pb);
  const total = l.exercises.length;
  // answer the first produce exercise wrong, undo, check nothing was stored or lapsed
  let guard = 0; while (section(root).attrs["data-type"] !== "produce" && guard++ < 40) {
    const sec = section(root); const ex = l.exercises.find((e) => e.id === sec.attrs["data-ex"]);
    if (["recall", "respond", "gender", "dialogue", "fade"].includes(ex.type)) { await by(sec, (b) => b.text === "Show answer")[0].click(); await by(sec, (b) => b.attrs["data-rating"] === "4")[0].click(); }
    else if (ex.type === "order") { for (const t of A.orderTokens(ex)) await by(sec, (b) => !b.disabled && A.heKey(b.text) === A.heKey(t) && b.attrs["data-i"] !== undefined)[0].click(); await by(sec, (b) => b.text === "Check")[0].click(); }
    else if (ex.type === "spot") await by(sec, (b) => A.heKey(b.text) === A.heKey(ex.target))[0].click();
    else if (ex.type === "register") await by(sec, (b) => b.attrs["data-register"] === ex.answer)[0].click();
    else if (ex.type === "match") { for (const p of ex.pairs) { const g = sec.find((n) => n.attrs.role === "group" && n.attrs["aria-label"] === p.he)[0]; await by(g, (b) => b.text === p.en)[0].click(); } await by(sec, (b) => b.text === "Check")[0].click(); }
    await waitFor(() => !idOf(root, "alef-int-next").hidden); await idOf(root, "alef-int-next").click();
    await waitFor(() => section(root) || /finished/.test(root.text));
  }
  if (section(root)?.attrs["data-type"] === "produce") {
    const ex = l.exercises.find((e) => e.id === section(root).attrs["data-ex"]), sec = section(root);
    await by(sec, (b) => b.text === ex.options.find((_, i) => i !== ex.answer))[0].click();
    assert.match(root.text, /Not quite\. The answer is /); assert.ok(root.text.includes(" is the Hebrew for \"" + ex.en + "\""), "why-line");
    assert.equal(section(root).attrs["data-result"], "wrong");
    const before = JSON.stringify(store.m["srs.cards"] || {});
    await by(root, (b) => b.attrs["data-act"] === "undo")[0].click();
    await waitFor(() => !section(root).attrs["data-result"]);
    assert.equal(JSON.stringify(store.m["srs.cards"] || {}), before, "undo leaves the SRS untouched");
    assert.equal(store.m["intermediate.v1"].lessons[l.id].results[ex.id], undefined, "undo removes the stored result");
    // wrong again -> Next -> card lapses -> the same exercise returns once at the end
    await by(section(root), (b) => b.text === ex.options.find((_, i) => i !== ex.answer))[0].click();
    assert.match(root.text, /once more at the end/);
    await idOf(root, "alef-int-next").click();
    await waitFor(() => Object.keys(store.m["srs.cards"] || {}).some((k) => k.startsWith("word:" + l.id + ":") || k.startsWith("line:")));
    assert.ok(Object.values(store.m["srs.cards"]).some((c) => c.reps >= 1), "the miss was reviewed (as Again) through applyOutcomesToCards");
  }
  assert.ok(Number(pb.attrs["aria-valuenow"]) >= 0 && total > 0);
  off();
});
test("intermediate player: Skip records nothing; the lesson is not completed while exercises are unanswered", async () => {
  const l = inter[0], store = memStore(); const { root, off } = await openLesson(store, l.id);
  const first = section(root).attrs["data-ex"];
  await by(root, (b) => b.attrs["data-act"] === "skip")[0].click();
  await waitFor(() => section(root).attrs["data-ex"] !== first);
  assert.equal(store.m["intermediate.v1"], undefined, "a skip stores nothing"); assert.equal(store.m["srs.cards"], undefined);
  assert.equal(store.m["curriculum.progress"], undefined);
  off();
});
