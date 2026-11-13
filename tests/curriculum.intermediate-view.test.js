import test from "node:test";
import assert from "node:assert/strict";
import { waitFor } from './helpers/waitfor.js';
import { displayHebrew } from '../src/shell/names.js';

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
  await waitFor(() => /Lesson finished|Not passed yet/.test(root.text) || (section(root) && section(root).attrs["data-ex"] + "|" + byId_(root, "alef-int-ex")?.text !== before));
  await waitFor(() => !/Lesson finished|Not passed yet/.test(root.text) || /marked as known|right on the first try/.test(root.text) && /review card|No review cards/.test(root.text));
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
        const sel = group.find((n) => n.tag === "select")[0];
        const want = right ? p.en : ex.pairs[(i + 1) % ex.pairs.length].en;
        sel.value = want;
        for (const f of sel.listeners.change || []) await f({ currentTarget: sel, target: sel });
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
      assert.match(root.find((n) => n.attrs.id === "alef-int-ex")[0].text, new RegExp(`${V.TYPE_LABEL[type]}: question ${i + 1} of ${l.exercises.length}`));
      assert.ok(byId_(root, "alef-int-next").hidden, "Next hidden until answered");
      await answer(root, ex, right);
      assert.equal(store.m["intermediate.v1"].lessons[lesson].results[ex.id], right, `${type} ${right}`);
    }
  }
});

test("the primary actions (Show answer, ratings, Check, Undo, Next) live in the sticky action bar", async () => {
  const inBar = (root, pred) => { const bar = root.find((n) => /\balef-actionbar\b/.test(n.className))[0]; assert.ok(bar, "action bar present"); return bar.find((n) => n.tag === "button" && pred(n)); };
  for (const [type, { lesson, ex }] of Object.entries(FIRST_OF)) {
    const l = byId[lesson], seq = sequenceExercises(l.exercises), i = seq.indexOf(ex);
    const store = memStore({ "intermediate.v1": { lessons: { [lesson]: { results: Object.fromEntries(seq.slice(0, i).map((e) => [e.id, true])), done: null } } } });
    const { root } = await mountLessonAt(store, lesson); await start(root);
    assert.ok(inBar(root, (b) => b.attrs.id === "alef-int-next").length === 1, `${type}: Next in the bar`);
    assert.ok(inBar(root, (b) => b.attrs["data-act"] === "skip").length === 1, `${type}: Skip in the bar`);
    if (["order", "match"].includes(type)) assert.ok(inBar(root, (b) => b.text === "Check").length === 1, `${type}: Check in the bar`);
    if (["recall", "respond", "gender", "dialogue", "fade"].includes(type)) {
      assert.ok(inBar(root, (b) => b.text === "Show answer").length === 1, `${type}: Show answer in the bar`);
      assert.equal(inBar(root, (b) => b.attrs["data-rating"]).length, 4, `${type}: four ratings in the bar`);
    }
    await answer(root, ex, true);
  }
});

test("intermediate: options re-scroll on keyboard focus, and after an answer one scroll call brings the explanation (last line above the bar) into view", async () => {
  const { root } = await mountLessonAt(memStore(), FIRST_OF.produce.lesson); await start(root);
  let sec = section(root), ex = shownEx(root, byId[FIRST_OF.produce.lesson]);
  for (let g = 0; ex.type !== "produce" && g < 30; g++) { await sec.find((n) => n.attrs["data-act"] === "skip")[0].click(); sec = section(root); ex = shownEx(root, byId[FIRST_OF.produce.lesson]); }
  assert.equal(ex.type, "produce");
  const opts = sec.find((n) => n.tag === "button" && /\balef-int-opt\b/.test(n.className));
  assert.ok(opts.length >= 2 && opts.every((b) => (b.listeners.focus || []).length === 1), "every option re-scrolls itself on keyboard focus");
  // focus handler: scrolls only for keyboard focus (:focus-visible), one tick later
  const calls = []; const fake = { matches: (q) => q === ":focus-visible", scrollIntoView: (o) => calls.push(o) };
  opts[0].listeners.focus[0]({ currentTarget: fake }); assert.equal(calls.length, 0, "deferred a tick"); await tick(10);
  assert.deepEqual(calls, [{ block: "nearest" }]);
  const mouse = { matches: () => false, scrollIntoView: () => calls.push("mouse") }; opts[0].listeners.focus[0]({ currentTarget: mouse }); await tick(10);
  assert.ok(!calls.includes("mouse"), "pointer focus does not scroll");
  const scrolled = []; const orig = Node_.prototype.scrollIntoView; Node_.prototype.scrollIntoView = function (o) { scrolled.push({ cls: this.className, block: o?.block }); };
  try { await opts.find((b) => b.text === ex.options[ex.answer]).click(); await waitFor(() => !byId_(root, "alef-int-next").hidden); } finally { Node_.prototype.scrollIntoView = orig; }
  assert.equal(scrolled.length, 1, "one scroll call (a second would cancel the smooth scroll of the first)");
  assert.match(scrolled[0].cls, /alef-why/); assert.equal(scrolled[0].block, "nearest");
});

test("learn.css pins the action bar: sticky, 44px buttons, above the tab bar, safe-area inset", async () => {
  const { readFileSync } = await import("node:fs");
  const css = readFileSync(new URL("../assets/css/learn.css", import.meta.url), "utf8");
  assert.match(css, /\.alef-actionbar\s*\{[^}]*position:\s*sticky/);
  assert.match(css, /\.alef-actionbar \.btn\s*\{[^}]*min-block-size:\s*44px/);
  assert.match(css, /@media \(max-width: 719\.98px\)\s*\{\s*\.alef-actionbar\s*\{[^}]*3\.6rem[^}]*safe-area-inset-bottom/);
  assert.match(css, /\.alef-ex-card \.alef-why[^{]*\.alef-int-opt[^{]*\{[^}]*scroll-margin-block-end/, "the explanation line and the options keep clear of the bar when scrolled into view");
  assert.match(css, /max-height:\s*480px[^{]*\{\s*\.alef-actionbar\s*\{[^}]*inset-block-end:\s*env\(safe-area-inset-bottom\)/, "short viewport (soft keyboard): the bar drops to the bottom edge");
});

test("a whole lesson answered wrong (C-01): word cards lapse in the SRS, results are kept, but the lesson is NOT completed; fade links to the fade screen", async () => {
  const lesson = FIRST_OF.produce.lesson, l = byId[lesson];
  const store = memStore(); const { root } = await mountLessonAt(store, lesson); await start(root);
  for (let guard = 0; !/Lesson finished|Not passed yet/.test(root.text) && guard < 200; guard++) {
    const ex = shownEx(root, l);
    if (ex.type === "fade") assert.ok(section(root).find((n) => n.tag === "a" && n.attrs.href === `#/learn?fade=${encodeURIComponent(ex.line)}`).length);
    await answer(root, ex, false);
  }
  assert.match(root.text, /Not passed yet — try again/);
  assert.doesNotMatch(root.text, /Lesson finished/);
  assert.match(root.text, new RegExp(`0 of ${l.exercises.length} right on the first try`));
  assert.match(root.text, /The pass mark is \d+ of \d+ right on the first try/);
  assert.match(root.text, /Accuracy/); assert.match(root.text, /To review:/);
  assert.ok(byId_(root, "alef-try-again"), "a Try again button");
  const s = store.m["intermediate.v1"].lessons[lesson];
  assert.equal(s.score, 0); assert.equal(s.total, l.exercises.length); assert.ok(!s.done, "not marked done");
  assert.equal(Object.keys(s.results).length, l.exercises.length);
  const cards = store.m["srs.cards"]; assert.ok(cards && Object.keys(cards).length > 0);
  assert.ok(Object.keys(cards).some((k) => k.startsWith(`word:${lesson}:`) || k.startsWith("line:")));
  assert.ok(!store.m["curriculum.progress"]?.completed?.[lesson], "the course does not advance");
  const list = new Node_("div"); V.mount(list, ctxFor(store)); await waitFor(() => /of 50 lessons finished/.test(list.text));
  assert.match(list.text, /0 of 50 lessons finished/);
});

test("a perfect run creates no word-card lapses and resumes where the learner stopped", async () => {
  const lesson = "I-02", l = byId[lesson]; const store = memStore();
  let { root, off } = await mountLessonAt(store, lesson); await start(root);
  const seq = sequenceExercises(l.exercises);
  for (const ex of seq.slice(0, 3)) await answer(root, ex, true);
  off();
  ({ root } = await mountLessonAt(store, lesson)); assert.match(root.text, /Continue/); await start(root);
  assert.match(root.find((n) => n.attrs.id === "alef-int-ex")[0].text, new RegExp(`: question 4 of ${l.exercises.length}`));
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

// ---- spot / fade show the line that holds their target (lineIndex is 1-based in the data), all 50 lessons
const rawText = (n) => (n.nodeType === 3 ? n.data : n.children.map(rawText).join(""));
test("spot and fade exercises show the registry line named by lineIndex (1-based) in all 50 lessons", async () => {
  const { loadContent } = await import("../src/curriculum/content.js");
  const corpus = (await loadContent()).corpus, R = V.EXERCISE_RENDERERS, ctx = ctxFor(memStore());
  let spots = 0, fades = 0;
  for (const l of V.listIntermediate()) {
    assert.equal(l.id.startsWith("I-"), true);
    for (const ex of l.exercises.filter((e) => e.type === "spot" || e.type === "fade")) {
      const r = corpus.get(ex.line); assert.ok(r, `${ex.id}: registry entry ${ex.line}`);
      const expected = r.he.split("\n")[(ex.lineIndex ?? 1) - 1]; assert.ok(expected, `${ex.id}: lineIndex in range`);
      const node = R[ex.type]({ ctx, lesson: l, note: new Node_("p"), corpus, seed: 1 }, ex, () => {});
      if (ex.type === "spot") {
        spots++;
        const shown = node.find((n) => n.tag === "button" && n.attrs.lang === "he").map((b) => b.text);
        assert.ok(shown.some((t) => A.heKey(t) === A.heKey(ex.target)), `${ex.id}: target ${ex.target} among the shown words`);
        assert.ok(A.heKey(expected).includes(A.heKey(ex.target)), `${ex.id}: target is in the expected line`);
        assert.ok(shown.every((t) => A.heKey(expected).includes(A.heKey(t))), `${ex.id}: every shown word is from the expected line`);
      } else {
        fades++;
        assert.ok(rawText(node).includes(displayHebrew(expected, 'abbrev')), `${ex.id}: fade shows line ${ex.lineIndex ?? 1}`);
        if (r.lines > 1) assert.ok(node.find((n) => n.attrs["data-audio"]).some((b) => b.attrs["data-audio"] === `line/${r.id}-l${ex.lineIndex ?? 1}`), `${ex.id}: audio id`);
      }
    }
  }
  assert.ok(spots > 0 && fades > 0);
});

test("the G-d setting reaches lesson English in the player", async () => {
  const l = byId["I-01"], ex = l.exercises.find((e) => /\bGod\b/.test(e.en || "") && e.type !== "match");
  assert.ok(ex, "an I-01 exercise with God in its English");
  const mk = (gd) => ({ ...ctxFor(memStore()), settings: { get: (k) => ({ congregation: "ashkenazi", voice: "f", writeGodAsGd: gd }[k]) } });
  const env = (c) => ({ ctx: c, lesson: l, note: new Node_("p"), corpus: new Map(), seed: 1 });
  const on = rawText(V.EXERCISE_RENDERERS[ex.type](env(mk(true)), ex, () => {})), off = rawText(V.EXERCISE_RENDERERS[ex.type](env(mk(false)), ex, () => {}));
  assert.match(on, /G-d/); assert.doesNotMatch(on, /\bGod\b/); assert.match(off, /\bGod\b/); assert.doesNotMatch(off, /G-d/);
});

test("counter stays at the lesson size when a miss is requeued; belt wording is plain on a fresh profile", async () => {
  const l = byId["I-01"];
  const { root } = await mountLessonAt(memStore(), "I-01");
  assert.match(root.text, /Finish the beginner check \(lesson r51\) first/);
  assert.doesNotMatch(root.text, /belt/i);
  await byId_(root, "alef-int-start").click();
  await waitFor(() => section(root));
  const ex = shownEx(root, l);
  await answer(root, ex, false);
  const t = () => root.find((n) => n.attrs.id === "alef-int-ex")[0].text;
  await byId_(root, "alef-int-next").click();
  await waitFor(() => /plus 1 to retry/.test(t()));
  assert.match(t(), new RegExp(`of ${l.exercises.length}, plus 1 to retry`));
  assert.doesNotMatch(t(), new RegExp(`of ${l.exercises.length + 1}`));
});
