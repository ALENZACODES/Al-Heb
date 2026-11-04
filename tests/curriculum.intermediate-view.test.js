import test from "node:test";
import assert from "node:assert/strict";
import { waitFor } from './helpers/waitfor.js';

// Fake DOM in the style of the other curriculum view tests (strict replaceChildren).
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
globalThis.document = { createElement: (t) => new Node_(t), createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: undefined }),
  addEventListener: (t, f) => { if (t === "keydown") keyHandlers.push(f); }, removeEventListener: (t, f) => { const i = keyHandlers.indexOf(f); if (i >= 0) keyHandlers.splice(i, 1); } };

const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));
/** Poll until pred() is truthy (the views load data asynchronously; a busy machine can be slow). */
const memStore = (init = {}) => { const m = { ...init }; return { get: (k) => m[k], set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); }, m }; };
const played = [];
const audioMock = () => ({ play: async (k, i, o) => { played.push([k, i, o]); return { source: "file" }; }, status: () => ({ source: "file", entryStatus: "recorded" }) });
const ctxFor = (store, query = {}, congregation = "ashkenazi") => ({ store, query, t: (k) => k, settings: { get: (k) => ({ congregation, voice: "f" }[k]) }, audio: audioMock() });

const V = await import("../src/curriculum/intermediate.view.js");
const A = await import("../src/curriculum/intermediate-adapter.js");
const { sequenceExercises } = await import("../src/curriculum/exercises.session.js");
/** The exercise on screen (the player reorders for variety and repeats misses, so tests follow the screen, not the data order). */
const shownEx = (root, l) => l.exercises.find((e) => e.id === section(root)?.attrs["data-ex"]);
const { byId } = await import("../src/curriculum/lessons.js");

const byText = (root, re, tag = "button") => root.find((n) => n.tag === tag && re.test(n.text));
const byId_ = (root, id) => root.find((n) => n.attrs.id === id)[0];
const section = (root) => root.find((n) => n.attrs["data-ex"])[0];
async function mountLessonAt(store, id, congregation) {
  const root = new Node_("div"); const off = V.mount(root, ctxFor(store, { id }, congregation));
  await waitFor(() => byId_(root, "alef-int-start") || /not found|Could not/.test(root.text));
  return { root, off };
}
async function start(root) { await byId_(root, "alef-int-start").click(); await waitFor(() => section(root)); }
async function next(root) {
  const before = section(root)?.attrs["data-ex"] + "|" + byId_(root, "alef-int-ex")?.text;
  await byId_(root, "alef-int-next").click();
  await waitFor(() => /Lesson finished/.test(root.text) || (section(root) && section(root).attrs["data-ex"] + "|" + byId_(root, "alef-int-ex")?.text !== before));
  await waitFor(() => !/Lesson finished/.test(root.text) || /marked as known/.test(root.text) && /review card|No review cards/.test(root.text));
}

/** Answer the exercise currently shown. `right` false picks a wrong answer where there is one. */
async function answer(root, ex, right) {
  const sec = section(root); assert.ok(sec, "exercise section shown");
  assert.equal(sec.attrs["data-type"], ex.type);
  const buttons = sec.find((n) => n.tag === "button");
  switch (ex.type) {
    case "produce": { const target = right ? ex.options[ex.answer] : ex.options.find((_, i) => i !== ex.answer); await buttons.find((b) => b.text === target).click(); break; }
    case "spot": { const toks = buttons.filter((b) => b.attrs.lang === "he"); const pick = right ? toks.find((b) => A.heKey(b.text) === A.heKey(ex.target)) : toks.find((b) => A.heKey(b.text) !== A.heKey(ex.target)); assert.ok(pick); await pick.click(); break; }
    case "register": await buttons.find((b) => b.attrs["data-register"] === (right ? ex.answer : ex.options.find((o) => o !== ex.answer))).click(); break;
    case "match": {
      for (const [i, p] of ex.pairs.entries()) {
        const group = sec.find((n) => n.attrs.role === "group" && n.attrs["aria-label"] === p.he)[0];
        const opts = group.find((n) => n.tag === "button");
        const want = right ? p.en : ex.pairs[(i + 1) % ex.pairs.length].en;
        await opts.find((b) => b.text === want).click();
      }
      await buttons.find((b) => b.text === "Check").click(); break;
    }
    case "order": {
      const pool = sec.find((n) => n.attrs["aria-label"] === "Words")[0].find((n) => n.tag === "button");
      const toks = A.orderTokens(ex); const seq = right ? toks : [...toks].reverse();
      for (const t of seq) await pool.find((b) => !b.disabled && A.heKey(b.text) === A.heKey(t)).click();
      await buttons.find((b) => b.text === "Check").click(); break;
    }
    default: { // self-rated: reveal, then rate
      await buttons.find((b) => b.text === "Show answer").click();
      await buttons.find((b) => b.attrs["data-rating"] === (right ? "4" : "1")).click();
    }
  }
  await waitFor(() => !byId_(root, "alef-int-next").hidden);
  await next(root);
}

const FIRST_OF = {};
for (const l of V.listIntermediate()) for (const e of l.exercises) FIRST_OF[e.type] ||= { lesson: l.id, ex: e };

test("list route shows all 50 lessons with the draft and native-review notices; nothing stored yet", async () => {
  const root = new Node_("div"); const store = memStore(); V.mount(root, ctxFor(store)); await waitFor(() => root.find((n) => n.attrs["data-lesson"]).length);
  assert.equal(root.find((n) => n.attrs["data-lesson"]).length, 50);
  assert.match(root.text, /0 of 50 lessons finished/);
  assert.match(root.text, /Needs native review/);
  assert.match(root.text, /not been reviewed by a native Hebrew speaker/);
  assert.equal(root.find((n) => n.tag === "h1").length, 1);
  assert.ok(root.find((n) => n.tag === "a" && n.attrs.href === "#/intermediate/I-01").length);
  assert.equal(store.m["intermediate.v1"], undefined);
});

test("unknown lesson id: not-found page with a way back", async () => {
  const { root } = await mountLessonAt(memStore(), "I-99");
  assert.match(root.text, /Lesson not found/);
  assert.ok(root.find((n) => n.attrs.href === "#/intermediate").length);
  const r2 = await mountLessonAt(memStore(), "r01"); assert.match(r2.root.text, /Lesson not found/);
});

test("lesson intro: notices, Hebrew with lang/dir, pronunciation line per word for the chosen tradition, audio with tradition and voice", async () => {
  const { root } = await mountLessonAt(memStore(), "I-01", "ashkenazi");
  const l = byId["I-01"];
  assert.match(root.text, /Needs native review/);
  assert.match(root.text, /Draft\./);
  const prons = root.find((n) => n.attrs["data-pron"]);
  assert.equal(prons.length, l.words.length);
  assert.equal(prons[0].text, l.words[0].pronunciation.ashkenazi);
  assert.notEqual(l.words[0].pronunciation.ashkenazi, l.words[0].pronunciation.sephardi);
  for (const n of root.find((x) => x.attrs.lang === "he")) assert.equal(n.attrs.dir, "rtl");
  await root.find((n) => n.attrs["data-audio"] === "word/I-01-w1")[0].click();
  assert.deepEqual(played.at(-1).slice(0, 2), ["word", "I-01-w1"]);
  assert.equal(played.at(-1)[2].tradition, "ashkenazi"); assert.equal(played.at(-1)[2].voice, "f");
  const il = await mountLessonAt(memStore(), "I-11", "ashkenazi");
  assert.equal(il.root.find((n) => n.attrs["data-pron"])[0].text, byId["I-11"].words[0].pronunciation.israeli);
  await il.root.find((n) => n.attrs["data-audio"] === "word/I-11-w1")[0].click();
  assert.equal(played.at(-1)[2].tradition, "israeli");
});

test("every one of the ten exercise types renders and grades through the view (right and wrong)", async () => {
  assert.deepEqual(Object.keys(FIRST_OF).sort(), [...A.EXERCISE_TYPES].sort());
  for (const [type, { lesson, ex }] of Object.entries(FIRST_OF)) {
    for (const right of [true, false]) {
      const l = byId[lesson], seq = sequenceExercises(l.exercises), i = seq.indexOf(ex);
      const pre = Object.fromEntries(seq.slice(0, i).map((e) => [e.id, true]));
      const store = memStore({ "intermediate.v1": { lessons: { [lesson]: { results: pre, done: null } } } });
      const { root } = await mountLessonAt(store, lesson); await start(root);
      assert.match(root.find((n) => n.attrs.id === "alef-int-ex")[0].text, new RegExp(`${V.TYPE_LABEL[type]}: ${i + 1} of ${l.exercises.length}`));
      assert.ok(byId_(root, "alef-int-next").hidden, "Next hidden until answered");
      await answer(root, ex, right);
      assert.equal(store.m["intermediate.v1"].lessons[lesson].results[ex.id], right, `${type} ${right}`);
    }
  }
});

test("a whole lesson: wrong answers lapse word cards in the SRS, store keeps results, lesson is completed; fade links to the fade screen", async () => {
  const lesson = FIRST_OF.produce.lesson, l = byId[lesson];
  const store = memStore(); const { root } = await mountLessonAt(store, lesson); await start(root);
  for (let guard = 0; !/Lesson finished/.test(root.text) && guard < 200; guard++) {
    const ex = shownEx(root, l);
    if (ex.type === "fade") assert.ok(section(root).find((n) => n.tag === "a" && n.attrs.href === `#/learn?fade=${encodeURIComponent(ex.line)}`).length);
    await answer(root, ex, false);
  }
  assert.match(root.text, /Lesson finished/);
  assert.match(root.text, new RegExp(`0 of ${l.exercises.length} marked as known`));
  assert.match(root.text, /Accuracy/); assert.match(root.text, /To review:/);
  const s = store.m["intermediate.v1"].lessons[lesson];
  assert.equal(s.score, 0); assert.equal(s.total, l.exercises.length); assert.ok(s.done);
  assert.equal(Object.keys(s.results).length, l.exercises.length);
  const cards = store.m["srs.cards"]; assert.ok(cards && Object.keys(cards).length > 0);
  assert.ok(Object.keys(cards).some((k) => k.startsWith(`word:${lesson}:`) || k.startsWith("line:")));
  assert.ok(store.m["curriculum.progress"].completed[lesson]);
  // list now shows it done
  const list = new Node_("div"); V.mount(list, ctxFor(store)); await waitFor(() => /of 50 lessons finished/.test(list.text));
  assert.match(list.text, /1 of 50 lessons finished/);
});

test("a perfect run creates no word-card lapses and resumes where the learner stopped", async () => {
  const lesson = "I-02", l = byId[lesson]; const store = memStore();
  let { root, off } = await mountLessonAt(store, lesson); await start(root);
  const seq = sequenceExercises(l.exercises);
  for (const ex of seq.slice(0, 3)) await answer(root, ex, true);
  off();
  ({ root } = await mountLessonAt(store, lesson)); assert.match(root.text, /Continue/); await start(root);
  assert.match(root.find((n) => n.attrs.id === "alef-int-ex")[0].text, new RegExp(`: 4 of ${l.exercises.length}`));
  for (const ex of seq.slice(3)) await answer(root, ex, true);
  assert.match(root.text, new RegExp(`${l.exercises.length} of ${l.exercises.length} marked as known`));
  const cards = store.m["srs.cards"] || {};
  assert.ok(!Object.keys(cards).some((k) => k.startsWith(`word:${lesson}:`) && cards[k].lapses > 0));
});

test("every intermediate lesson mounts and its first exercise renders", async () => {
  for (const l of V.listIntermediate()) {
    const { root, off } = await mountLessonAt(memStore(), l.id); await start(root);
    assert.ok(section(root), l.id); assert.equal(section(root).attrs["data-ex"], l.exercises[0].id); off();
  }
});
