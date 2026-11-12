// Lesson completion rules from the 11 Nov 2026 audit: C-01 (pass mark, real Test out), C-02 (fixed question counter),
// C-06 (one feedback, banner leaves the DOM), S-05 (frozen reward number), S-13 (rule stated up front), M-09 (old view unmounted).
// Fake DOM in the style of the other curriculum view tests; it checks view logic, not browser rendering.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { waitFor } from "./helpers/waitfor.js";

class Node_ {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.nodeType = 1; this.className = ""; this.hidden = false; this.disabled = false; this.id = ""; }
  setAttribute(k, v) { this.attrs[k] = v; if (k === "hidden") this.hidden = true; if (k === "disabled") this.disabled = true; if (k === "id") this.id = v; }
  removeAttribute(k) { delete this.attrs[k]; if (k === "hidden") this.hidden = false; if (k === "disabled") this.disabled = false; }
  getAttribute(k) { return this.attrs[k] ?? null; }
  hasAttribute(k) { return k in this.attrs; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  removeEventListener() {}
  append(...c) { for (const x of c) { const n = x != null && x.nodeType ? x : { nodeType: 3, data: String(x), parent: null, remove() { if (this.parent) this.parent.children = this.parent.children.filter((y) => y !== this); } }; if (n.parent) n.parent.children = n.parent.children.filter((y) => y !== n); this.children.push(n); n.parent = this; } }
  prepend(...c) { const keep = this.children; this.children = []; this.append(...c); this.children.push(...keep); }
  replaceChildren(...c) { for (const k of this.children) k.parent = null; this.children = []; this.append(...c); }
  remove() { if (this.parent) { this.parent.children = this.parent.children.filter((x) => x !== this); this.parent = null; } }
  get childNodes() { return this.children; }
  get firstChild() { return this.children[0] || null; }
  insertBefore(n, ref) { n.remove?.(); const i = this.children.indexOf(ref); n.parent = this; if (i < 0) this.children.push(n); else this.children.splice(i, 0, n); }
  get parentNode() { return this.parent; }
  get classList() { const self = this; return { add: (c) => { if (!self.classList.contains(c)) self.className = `${self.className} ${c}`.trim(); }, remove: (c) => { self.className = self.className.split(/\s+/).filter((x) => x && x !== c).join(" "); }, contains: (c) => self.className.split(/\s+/).includes(c), toggle() {} }; }
  set textContent(v) { this.replaceChildren(); if (String(v)) this.append(String(v)); }
  get textContent() { return this.text; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.hidden ? "" : c.text)).join(""); }
  get offsetWidth() { return 0; }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  querySelector(sel) { const f = sel.startsWith("#") ? (n) => n.attrs.id === sel.slice(1) : (n) => new RegExp("(^|\\s)" + sel.slice(1) + "(\\s|$)").test(n.className); return this.find((n) => n !== this && f(n))[0] ?? null; }
  async click() { if (this.disabled) return; for (const f of this.listeners.click || []) await f({ currentTarget: this, target: this, preventDefault() {} }); }
  focus() {}
  scrollIntoView() {}
}
const events = [];
const keyHandlers = [];
const body = new Node_("body");
globalThis.document = {
  body, createElement: (t) => new Node_(t), createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: null }), activeElement: null,
  getElementById: (id) => body.find((n) => n.attrs.id === id || n.id === id)[0] || null,
  addEventListener: (t, f) => { if (t === "keydown") keyHandlers.push(f); }, removeEventListener: (t, f) => { const i = keyHandlers.indexOf(f); if (i >= 0) keyHandlers.splice(i, 1); },
  dispatchEvent: (e) => { events.push(e); return true; },
};
const memStore = (init = {}) => { const m = { ...init }; return { get: (k) => m[k], set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); }, m }; };
const by = (root, pred) => root.find((n) => n.tag === "button" && pred(n));

const P = await import("../src/curriculum/passmark.js");
const S = await import("../src/curriculum/exercises.session.js");
const UI = await import("../src/curriculum/exercises.ui.js");
const { mountLesson } = await import("../src/curriculum/lesson.view.js");
const { lessons, byId } = await import("../src/curriculum/lessons.js");
const { loadContent } = await import("../src/curriculum/content.js");
const content = await loadContent();
const wordPool = lessons.filter((l) => !/^I-\d{2}$/.test(l.id)).flatMap((l) => l.words);
const questionsFor = (id) => S.buildChoiceQuestions(byId[id], { ...content, wordPool }, { seed: 1 + lessons.findIndex((l) => l.id === id), tradition: "sephardi" });
const lessonCtx = (store, query = {}) => ({ store, t: (k) => k, query, settings: { get: (k) => ({ congregation: "sephardi" }[k]) } });

/** Answer the mounted quick check: `pickRight(q, isRetry)` decides each answer; returns when an end card shows. */
async function play(root, qs, pickRight) {
  const seen = new Set();
  for (let g = 0; g < 120 && !root.find((n) => /\balef-summary\b/.test(n.className)).length; g++) {
    const cont = by(root, (b) => b.attrs["data-act"] === "next" && !b.hidden)[0]; if (cont) { await cont.click(); continue; }
    const cur = root.find((n) => n.attrs["data-ex"])[0]; if (!cur) { await new Promise((r) => setTimeout(r, 5)); continue; }
    const q = qs.find((x) => x.id === cur.attrs["data-ex"]);
    const retry = seen.has(q.id); seen.add(q.id);
    const pick = pickRight(q, retry) ? q.answerIndex : q.options.findIndex((_, i) => i !== q.answerIndex);
    await by(root, (b) => b.attrs["data-n"] === String(pick + 1))[0].click();
  }
}

// ------------------------------------------------------------------------------------------------ C-01 pass mark
test("pass mark: about 70% right on the first try, rounded to the nearest question; never passes an empty check; the rule is written out", () => {
  assert.equal(P.PASS_SHARE, 0.7);
  assert.deepEqual([1, 2, 3, 4, 5, 8, 10].map(P.passMark), [1, 1, 2, 3, 4, 6, 7]);
  assert.equal(P.passMark(0), 0);
  assert.equal(P.passed(0, 3), false); assert.equal(P.passed(1, 3), false); assert.equal(P.passed(2, 3), true);
  assert.equal(P.passed(7, 10), true); assert.equal(P.passed(6, 10), false); assert.equal(P.passed(0, 0), false);
  assert.match(P.passRuleText(8), /at least 6 of 8 right on the first try \(75%\)/);
  assert.match(P.passRuleText(8), /not marked done/); assert.match(P.passRuleText(8), /review cards are still updated/);
  assert.equal(S.passMark, P.passMark, "the lesson loop re-exports the same rule");
});

test("C-01: a lesson answered 0% on the first try is NOT done: no 'Lesson complete', no celebration event (so no lesson XP or gems), no streak day; review cards still added; Try again then passes", async () => {
  events.length = 0;
  const store = memStore({ "curriculum.progress": { completed: { r01: 1, r02: 1, r03: 1 } } }); const root = new Node_("div"); const off = mountLesson(root, lessonCtx(store, { lesson: "r04" }), "r04");
  await waitFor(() => by(root, (b) => b.attrs.id === "alef-quick-start")[0]);
  const qs = S.buildChoiceQuestions(byId.r04, { ...content, wordPool }, { seed: 1 + lessons.findIndex((l) => l.id === "r04"), tradition: "sephardi" });
  // S-13: the rule and the way to the check sit at the top, before the lesson content
  const rule = root.find((n) => n.attrs.id === "alef-check-rule")[0];
  assert.ok(rule, "the rule is on the page"); assert.match(rule.text, /To pass: at least \d+ of \d+ right on the first try/);
  const ruleAt = root.children[0].children.indexOf(rule), firstSection = root.children[0].children.findIndex((n) => n.tag === "section");
  assert.ok(firstSection < 0 || ruleAt < firstSection, "the rule comes before the lesson's sections");
  const go = by(root, (b) => b.attrs.id === "alef-go-check")[0]; assert.ok(go, "a way straight to the check");
  await go.click();
  assert.equal(by(root, (b) => b.attrs.id === "alef-quick-start")[0].disabled, false, "the check is open after Go to the quick check");
  await by(root, (b) => b.attrs.id === "alef-quick-start")[0].click();
  await play(root, qs, (q, retry) => retry); // every first try wrong
  await waitFor(() => /Not passed yet/.test(root.text));
  assert.doesNotMatch(root.text, /Lesson complete/);
  assert.match(root.text, new RegExp(`0 of ${qs.length} right on the first try`));
  assert.match(root.text, /no lesson XP was given/);
  assert.equal(events.filter((e) => e.type === "alef:celebrate").length, 0, "no alef:celebrate: the retention layer pays no lesson XP or gems");
  assert.equal(store.m["curriculum.progress"].completed.r04, undefined, "not marked done, the course does not advance");
  assert.equal(store.m.streak, undefined, "no streak day");
  assert.ok(Object.keys(store.m["srs.cards"] || {}).length > 0, "review cards were still added");
  // try again, all right: now it completes and celebrates
  await by(root, (b) => b.attrs.id === "alef-try-again")[0].click();
  await play(root, qs, () => true);
  await waitFor(() => store.m["curriculum.progress"]?.completed?.r04);
  assert.match(root.text, /Lesson complete/);
  assert.equal(events.filter((e) => e.type === "alef:celebrate").length, 1);
  off();
});

test("C-01: Test out is a real short test: the lesson content is not shown, the pass mark is stated, failing completes nothing, passing completes", async () => {
  const store = memStore({ "curriculum.progress": { completed: { r01: 1 } } }); let root = new Node_("div"); let off = mountLesson(root, lessonCtx(store, { lesson: "r02", testout: "1" }), "r02");
  await waitFor(() => by(root, (b) => b.attrs.id === "alef-quick-start")[0]);
  assert.match(root.find((n) => n.tag === "h1")[0].text, /^Test out: /);
  assert.equal(root.find((n) => n.tag === "section" && /^l-/.test(n.attrs["aria-labelledby"] || "")).length, 0, "no lesson sections in a test-out");
  assert.match(root.text, /To pass: at least \d+ of \d+ right on the first try/);
  const start = by(root, (b) => b.attrs.id === "alef-quick-start")[0];
  assert.equal(start.text, "Start the test"); assert.equal(start.disabled, false, "nothing to scroll through first");
  const qs = questionsFor("r02");
  await start.click(); await play(root, qs, (q, retry) => retry);
  await waitFor(() => /Not passed yet/.test(root.text));
  assert.equal(store.m["curriculum.progress"].completed.r02, undefined, "a failed test-out marks nothing done");
  assert.equal(store.m["lesson.resume.v1"], undefined, "a test-out does not save a lesson place");
  off();
  root = new Node_("div"); off = mountLesson(root, lessonCtx(store, { lesson: "r02", testout: "1" }), "r02");
  await waitFor(() => by(root, (b) => b.attrs.id === "alef-quick-start")[0]);
  await by(root, (b) => b.attrs.id === "alef-quick-start")[0].click(); await play(root, qs, () => true);
  await waitFor(() => store.m["curriculum.progress"]?.completed?.r02);
  assert.match(root.text, /Test passed: lesson complete/);
  off();
});

test("C-01: the Learn list no longer offers 'Mark complete without studying it'", () => {
  const src = readFileSync(new URL("../src/curriculum/learn.view.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /Mark complete without studying/);
  assert.doesNotMatch(src, /completeLesson\(/, "the list never completes a lesson by itself");
  assert.match(src, /testout=1/);
});

test("C-01: the Awards disclaimer states the new rule honestly and still says it is not a reviewed certificate", async () => {
  const { EVIDENCE_SUMMARY } = await import("../src/awards/trust.js");
  assert.match(EVIDENCE_SUMMARY, /70% of its quick check, rounded to the nearest whole question, right on the first try/);
  assert.match(EVIDENCE_SUMMARY, /review is not done, so nothing on this page is a reviewed certificate/);
  assert.doesNotMatch(EVIDENCE_SUMMARY, /can be stored as complete after wrong answers/);
});

// ------------------------------------------------------------------------------------------------ C-02 fixed denominator
test("C-02: the question counter keeps the check's length; retries are counted apart; the bar runs on the fixed length", async () => {
  const s = S.createSession([{ id: "a" }, { id: "b" }, { id: "c" }]);
  s.answer(false); s.answer(false);
  let p = s.progress();
  assert.deepEqual([p.length, p.position, p.retries, p.share], [3, 2, 2, 2 / 3]);
  s.answer(true); s.answer(true); s.answer(false);
  p = s.progress(); assert.deepEqual([p.length, p.position, p.retries, p.retriesDone, p.retriesLeft, p.share], [3, 3, 2, 2, 0, 1]);
  assert.equal(S.retryText(1), "1 retry so far"); assert.equal(S.retryText(2), "2 retries so far"); assert.equal(S.retryText(0), "");

  const qs = questionsFor("r04").slice(0, 3);
  const host = new Node_("div"); const off = UI.mountQuiz(host, { questions: qs, ctx: lessonCtx(memStore()), onFinish: () => {} });
  const title = () => host.find((n) => n.attrs.id === "alef-q-title")[0]?.text;
  const bar = () => host.find((n) => n.attrs.role === "progressbar")[0];
  const titles = [];
  for (let i = 0; i < 3; i++) {
    titles.push(title());
    const q = qs.find((x) => x.id === host.find((n) => n.attrs["data-ex"])[0].attrs["data-ex"]);
    await by(host, (b) => b.attrs["data-n"] === String(q.options.findIndex((_, k) => k !== q.answerIndex) + 1))[0].click();
    await by(host, (b) => b.attrs["data-act"] === "next")[0].click();
  }
  assert.deepEqual(titles, ["Question 1 of 3", "Question 2 of 3", "Question 3 of 3"], "the denominator never moves");
  assert.equal(title(), "Try again: retry 1 of 3");
  assert.match(host.text, /3 retries so far/);
  assert.equal(bar().attrs["aria-valuenow"], "100", "all 3 questions had their first try");
  assert.match(bar().attrs["aria-valuetext"], /^3 of 3 done, 3 retries so far$/);
  off();
});

// ------------------------------------------------------------------------------------------------ C-06 one feedback, banner unmounts
test("C-06: an answer shows one verdict; the bottom band carries no second message and leaves the DOM when its flash ends", async () => {
  const B = await import("../src/shell/answer-band.js");
  const timers = []; const win = { setTimeout: (f) => { timers.push(f); return timers.length; }, clearTimeout() {}, addEventListener() {}, matchMedia: () => ({ matches: true }) };
  const qs = questionsFor("r04").slice(0, 2);
  const host = new Node_("div");
  const ctx = { ...lessonCtx(memStore()), settings: { get: (k) => ({ congregation: "sephardi" }[k]) } };
  const off = UI.mountQuiz(host, { questions: qs, ctx, onFinish: () => {} });
  const q = qs.find((x) => x.id === host.find((n) => n.attrs["data-ex"])[0].attrs["data-ex"]);
  const realSet = globalThis.setTimeout;
  await by(host, (b) => b.attrs["data-n"] === String(q.options.findIndex((_, k) => k !== q.answerIndex) + 1))[0].click();
  const band = body.find((n) => n.id === "alef-answer-band")[0];
  assert.ok(band, "the colour band flashed");
  assert.doesNotMatch(band.text, /Not quite|Keep going|Almost|Close!/, "the band repeats no verdict words");
  assert.equal(host.text.split("Not quite.").length - 1, 1, "the verdict is written once");
  // a band shown through our fake window: removed from the DOM after the flash, not just hidden
  B.removeAnswerBand(globalThis.document, globalThis);
  assert.equal(B.showAnswerBand(false, { doc: globalThis.document, win, words: false }), true);
  const band2 = body.find((n) => n.id === "alef-answer-band")[0];
  assert.ok(band2 && band2.classList.contains("is-on"));
  while (timers.length) timers.shift()();
  assert.equal(body.find((n) => n.id === "alef-answer-band").length, 0, "the band is gone from the DOM after dismissal");
  // removeAnswerBand on a page change
  B.showAnswerBand(true, { doc: globalThis.document, win });
  assert.ok(body.find((n) => n.id === "alef-answer-band")[0]);
  B.removeAnswerBand(globalThis.document, win);
  assert.equal(body.find((n) => n.id === "alef-answer-band").length, 0);
  assert.equal(globalThis.setTimeout, realSet);
  off();
});

test("C-06: Placement and Listen-and-pick write each verdict once (no second copy in the page body)", () => {
  const pl = readFileSync(new URL("../src/placement/placement.view.js", import.meta.url), "utf8");
  assert.doesNotMatch(pl, /fb\.textContent/); assert.doesNotMatch(pl, /ps-fb/);
  const li = readFileSync(new URL("../src/listen/listen.view.js", import.meta.url), "utf8");
  assert.doesNotMatch(li, /body\.append\(el\('p', \{\}, msg\)/);
  assert.doesNotMatch(li, /say\(`Done: /);
});

// ------------------------------------------------------------------------------------------------ S-05 frozen number
test("S-05: the reward panel shows the final XP number at once (no count-up racing the text)", async () => {
  const card = new Node_("div"); card.className = "alef-summary"; card.append(Object.assign(new Node_("p"), { className: "alef-celebrate-cheer" }));
  const doc = { ...globalThis.document, querySelector: (sel) => (sel === ".alef-summary" ? card : null) };
  const g = { document: doc, setTimeout: () => 0, matchMedia: () => ({ matches: false }), requestAnimationFrame: () => 0 };
  const prevDoc = globalThis.document; globalThis.document = doc;
  try {
    const { showReward } = await import("../src/retention/ui.js");
    const R = { get: () => ({ notify: { asked: true } }), calm: () => true, update() {} };
    showReward(R, { calm: false, todayBefore: 11, todayAfter: 22, goal: 20, xp: 11, parts: {}, streak: { grew: false }, quests: [], gems: 0, unlocked: [] }, g);
    assert.equal(card.find((n) => /ret-total/.test(n.className))[0].text, "22");
    assert.match(card.text, /22 of 20 XP today/);
  } finally { globalThis.document = prevDoc; }
});

// ------------------------------------------------------------------------------------------------ M-09 view unmount
test("M-09: on a route change the shell removes everything the old view left in #main (except the kept title) and the old title leaves the announcer", async () => {
  const { clearView, announceTitle } = await import("../src/shell/router.js");
  const main = new Node_("main");
  const title = new Node_("h1"); title.setAttribute("id", "view-title"); title.append("Lessons");
  const stale = new Node_("p"); stale.append("Word Search - Aleph");
  const banner = new Node_("div"); banner.append("Close! It will come back.");
  main.append(title, stale, banner);
  assert.equal(clearView(main, [title]), 2);
  assert.deepEqual(main.children, [title]);
  assert.doesNotMatch(main.text, /Word Search|Close!/);
  clearView(main); assert.equal(main.children.length, 0, "no keep list: everything goes");
  assert.equal(clearView(null), 0);

  const live = new Node_("div"); const timers = [];
  const win = { setTimeout: (f) => { timers.push(f); return timers.length; }, clearTimeout() {} };
  announceTitle(live, "Word Search - Aleph", { win });
  assert.equal(live.text, "Word Search - Aleph");
  announceTitle(live, "", { win }); // the next navigation starts
  assert.equal(live.text, "", "the previous page's title is gone at once");
  announceTitle(live, "Scramble - Aleph", { win });
  while (timers.length) timers.shift()();
  assert.equal(live.text, "", "and the new one does not linger in the page text after it was announced");

  const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(app, /clearView\(root, keep\)/, "the shell clears the old view before the new one mounts");
  assert.match(app, /announceTitle\(live, ''\)/);
});

test("C-01: a first-try miss cannot be undone into a first-try right (live finding: wrong, Undo, then the revealed answer counted)", async () => {
  const { createSession } = await import("../src/curriculum/exercises.session.js");
  const s = createSession([{ id: "a" }, { id: "b" }]);
  s.answer(false);
  assert.equal(s.canUndo(), false, "no Undo after a first-try miss");
  assert.equal(s.undo(), false);
  assert.equal(s.firstResults().a, false, "the miss stays on record");
  s.answer(true); // b, right first time
  assert.equal(s.canUndo(), true, "a slipped tap on a right answer can still be undone");
  assert.equal(s.undo(), true);
  assert.equal(s.firstResults().b, undefined);
  s.answer(true); s.answer(true); // b, then the retry of a
  assert.deepEqual(s.firstResults(), { a: false, b: true });
});
