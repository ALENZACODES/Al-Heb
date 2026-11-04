import test from "node:test";
import assert from "node:assert/strict";
import { waitFor } from "./helpers/waitfor.js";
const until = (n, re) => waitFor(() => re.test(n.text), { message: `text ${re} never appeared` });

// Same minimal fake DOM as curriculum.learnflow.test.js: checks view logic, not browser rendering.
class Node_ {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.nodeType = 1; this.className = ""; this.hidden = false; }
  setAttribute(k, v) { this.attrs[k] = v; if (k === "hidden") this.hidden = true; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { this.children.push(x); if (x && x.parent !== undefined) x.parent = this; } }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v), parent: undefined }]; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.hidden ? "" : c.text)).join(""); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  async click() { for (const f of this.listeners.click || []) await f({ currentTarget: this }); }
}
globalThis.document = { createElement: (t) => new Node_(t), createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: undefined }), addEventListener() {}, removeEventListener() {} };
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const memStore = (init = {}) => { const m = { ...init }; return { get: (k) => m[k], set: (k, v) => { m[k] = v; }, m }; };
const ctxFor = (store, query) => ({ store, query, route() {}, t: (k) => k, settings: { get: (k) => ({ congregation: "sephardi" }[k]) },
  audio: { play: async () => ({ source: "tts-fallback" }) } });
const btn = (root, re) => root.find((n) => n.tag === "button" && re.test((n.attrs["aria-label"] || "") + n.text))[0];

const { lessons, byId } = await import("../src/curriculum/lessons.js");
const { loanwordGroups, loanwordMeta, taughtThrough, decodableWords } = await import("../src/curriculum/loanwords.js");
const { cellsOf, lettersOf, marksOf } = await import("../src/curriculum/hebrew.js");
const { buildSpotIt, scoreSpotIt } = await import("../src/curriculum/spotit.js");
const { newHintSession, hintFor, dismissHint, hintKinds, errorKindForCard } = await import("../src/curriculum/hints.js");
const { buildCheckpoint, gradeCheckpoint, applyCheckpointToCards, lapseLetters, eligibleSets, stageFor } = await import("../src/curriculum/checkpoint.js");
const { dialogues } = await import("../src/curriculum/dialogues.js");
const { loadContent } = await import("../src/curriculum/content.js");
const { mount } = await import("../src/curriculum/learn.view.js");
const { loadJSON } = await import("../src/curriculum/data.js");
const confusables = await loadJSON("data/letters/confusables.json");

const HEB = /^[֐-׿ \-?!.,']+$/;

// ---------- loanwords
test("loanwords: draft flags set, every word pointed Hebrew, lettersUsed/marksUsed derived correctly", () => {
  assert.equal(loanwordMeta.proofread, false); assert.equal(loanwordMeta.needsNativeReview, true);
  const ids = new Set();
  for (const g of loanwordGroups) {
    assert.equal(g.proofread, false); assert.ok(byId[g.unlockAfter]?.track === "read", g.id);
    for (const w of g.words) {
      assert.ok(!ids.has(w.id)); ids.add(w.id);
      assert.equal(w.proofread, false);
      assert.match(w.he, /^[֐-׿]+$/, w.id);
      assert.ok(/[ְ-ׇ]/.test(w.he), `${w.id} must be pointed`);
      assert.ok(w.gloss && w.translit);
      assert.deepEqual([...w.lettersUsed].sort(), [...lettersOf(w.he)].sort(), w.id);
      assert.deepEqual([...w.marksUsed].sort(), [...marksOf(w.he)].sort(), w.id);
      assert.equal(w.plain, w.he.replace(/[ְ-ׇ]/g, ""));
    }
  }
  assert.ok(loanwordGroups.flatMap((g) => g.words).length >= 20);
});

test("loanwords: no word appears before its letters and vowel signs are taught", () => {
  for (const g of loanwordGroups) {
    const t = taughtThrough(g.unlockAfter);
    for (const w of g.words) {
      for (const l of w.lettersUsed) assert.ok(t.letters.has(l), `${w.id} ${w.he}: letter ${l} not taught by ${g.unlockAfter}`);
      for (const m of w.marksUsed) assert.ok(t.vowels.has(m), `${w.id} ${w.he}: mark ${m} not taught by ${g.unlockAfter}`);
    }
    assert.equal(decodableWords(g.words, g.unlockAfter).length, g.words.length);
  }
  // and a word really is filtered out when the lesson is too early
  assert.ok(decodableWords(loanwordGroups[2].words, "r01").length === 0);
});

// ---------- Spot It
const poolWords = lessons.filter((l) => l.track === "read" && lessons.indexOf(l) <= lessons.findIndex((x) => x.id === "r24")).flatMap((l) => l.words.map((w) => w.he));
const allLetters = new Set(lessons.flatMap((l) => l.letters));

test("spotit builder: hit count equals the true count, decoys are never hits, deterministic with a seed", () => {
  const m = buildSpotIt({ targetId: "bet", words: poolWords, taught: allLetters, confusables, seed: 7 });
  assert.ok(m && m.lines.length === 4);
  for (const i of m.hitIndices) assert.equal(m.cells[i].base, "bet");
  const trueCount = m.cells.filter((c) => c.base === "bet").length;
  assert.equal(m.hitIndices.length, trueCount);
  assert.ok(m.hitIndices.length >= 4, "at least one hit per line");
  for (const i of m.decoyIndices) { assert.notEqual(m.cells[i].base, "bet"); assert.ok(["kaf", "pe"].includes(m.cells[i].base)); assert.ok(!m.hitIndices.includes(i)); }
  assert.deepEqual(buildSpotIt({ targetId: "bet", words: poolWords, taught: allLetters, confusables, seed: 7 }), m);
  assert.notDeepEqual(buildSpotIt({ targetId: "bet", words: poolWords, taught: allLetters, confusables, seed: 8 }).cells.map((c) => c.text), m.cells.map((c) => c.text));
});

test("spotit builder: only taught letters, null when the target never occurs", () => {
  const taught = new Set(["shin", "bet", "tav", "lamed", "mem-final", "vav"]);
  const m = buildSpotIt({ targetId: "bet", words: poolWords, taught, confusables, seed: 2 });
  assert.ok(m.cells.every((c) => taught.has(c.base)));
  assert.equal(buildSpotIt({ targetId: "qof", words: poolWords, taught, confusables }), null);
  assert.equal(buildSpotIt({ targetId: "bet", words: [], taught, confusables }), null);
});

test("spotit scoring: hits, misses, decoy taps feed pair errors", () => {
  const m = buildSpotIt({ targetId: "bet", words: poolWords, taught: allLetters, confusables, seed: 3 });
  const perfect = scoreSpotIt(m, m.hitIndices);
  assert.equal(perfect.hits, perfect.total); assert.equal(perfect.accuracy, 1); assert.deepEqual(perfect.pairErrors, {});
  if (m.decoyIndices.length) {
    const d = m.decoyIndices[0], s = scoreSpotIt(m, [...m.hitIndices.slice(1), d]);
    assert.equal(s.missed.length, 1); assert.deepEqual(s.decoyTaps, [d]);
    const other = m.cells[d].base; assert.equal(s.pairErrors[["bet", other].sort().join("|")], 1); assert.equal(s.fooledBy[other], 1);
    assert.ok(s.accuracy < 1);
  }
  assert.equal(scoreSpotIt(m, []).hits, 0);
});

// ---------- hints
test("hints: library covers every error kind the drills produce, each under 140 characters", () => {
  for (const k of hintKinds) { assert.ok(k.hint.length < 140, k.errorKind); assert.ok(k.example.length > 10); }
  const kinds = new Set(hintKinds.map((k) => k.errorKind));
  for (const card of [{ kind: "letter", key: "bet" }, { kind: "letter", key: "alef" }, { kind: "letter", key: "tav" }, { kind: "letter", key: "kaf-final" }, { kind: "letter", key: "lamed" }, { kind: "vowel", key: "kamatz" }, { kind: "word", key: "w" }]) {
    const e = errorKindForCard(card, confusables);
    if (e) assert.ok(kinds.has(e.kind), JSON.stringify(card));
  }
  for (const k of ["confusable-pair", "wrong-vowel", "direction-slip"]) assert.ok(kinds.has(k));
  assert.equal(errorKindForCard({ kind: "letter", key: "bet" }, confusables).kind, "confusable-pair");
});

test("hints: never on a correct answer, once per kind, escalates once, suppression sticks", () => {
  const s = newHintSession();
  assert.equal(hintFor(s, { kind: "wrong-vowel", correct: true }), null);
  assert.deepEqual(s.misses, {}, "a correct answer is not counted as a miss");
  const a = hintFor(s, { kind: "wrong-vowel" }); assert.equal(a.level, 1);
  const b = hintFor(s, { kind: "wrong-vowel" }); assert.equal(b.level, 2); assert.notEqual(a.text, b.text);
  assert.equal(hintFor(s, { kind: "wrong-vowel" }), null);
  assert.equal(hintFor(s, { kind: "nope" }), null);
  const s2 = newHintSession(); const saved = dismissHint(s2, "direction-slip");
  assert.deepEqual(saved, ["direction-slip"]);
  assert.equal(hintFor(s2, { kind: "direction-slip" }), null);
  assert.equal(hintFor(newHintSession(saved), { kind: "direction-slip" }), null);
});

// ---------- checkpoint
test("checkpoint draws only taught letters from the same look-alike set", () => {
  const taught = new Set(["bet", "kaf", "gimel", "nun", "dalet", "resh", "lamed"]);
  const qs = buildCheckpoint({ taught, confusables, seed: 4 });
  assert.ok(qs.length >= 5);
  for (const q of qs) {
    assert.ok(q.options.includes(q.answer));
    assert.ok(q.options.every((o) => taught.has(o)));
    const set = confusables.sets.find((s) => s.id === q.setId); assert.ok(q.options.every((o) => set.letters.includes(o)));
    assert.ok(q.options.length >= 2);
  }
  assert.ok(!qs.some((q) => q.options.includes("pe")), "pe is not taught");
  assert.deepEqual(buildCheckpoint({ taught, confusables, seed: 4 }), qs);
  assert.deepEqual(buildCheckpoint({ taught: ["bet"], confusables }), []);
  assert.ok(eligibleSets(taught, confusables).every((s) => s.letters.length >= 2));
  assert.deepEqual([8, 9, 18, 27].map(stageFor), [0, 1, 2, 3]);
});

test("checkpoint grading and SRS: wrong -> lapse, right -> good, no mutation", () => {
  const taught = ["bet", "kaf"]; const qs = buildCheckpoint({ taught, confusables, seed: 1 });
  const all = Object.fromEntries(qs.map((q) => [q.id, q.answer]));
  const g = gradeCheckpoint(qs, all); assert.ok(g.passed); assert.equal(g.right, g.total); assert.deepEqual(g.weakSets, []);
  const bad = { ...all, [qs[0].id]: "zzz" }; const gb = gradeCheckpoint(qs, bad);
  assert.equal(gb.right, gb.total - 1); assert.deepEqual(gb.wrongLetters, [qs[0].targetId]);
  assert.equal(gradeCheckpoint(qs, {}).passed, false);
  const cards = {}; const now = 1_700_000_000_000;
  const out = applyCheckpointToCards(cards, qs, bad, now);
  assert.deepEqual(cards, {}); // not mutated
  assert.equal(Object.keys(out).length, 1); // only the wrong letter got a card
  const id = `letter:${qs[0].targetId}`; assert.ok(out[id].lapses >= 1 || out[id].state === "relearning" || out[id].reps >= 1);
  assert.equal(lapseLetters({}, ["bet", "bet", "kaf"], now)["letter:bet"].reps, 1);
});

// ---------- dialogues
test("dialogues: original, pointed, with transliteration and English, tied to real Israel lessons", () => {
  assert.ok(dialogues.length >= 6);
  const topics = dialogues.map((d) => d.topic + " " + d.title).join(" ").toLowerCase();
  for (const t of ["food", "direction", "small talk", "shopping", "taxi", "hotel"]) assert.ok(topics.includes(t), t);
  const ids = new Set();
  for (const d of dialogues) {
    assert.ok(!ids.has(d.id)); ids.add(d.id);
    assert.equal(d.track, "israel"); assert.equal(d.proofread, false);
    assert.equal(byId[d.unlockAfter]?.track, "israel");
    assert.ok(d.lines.length >= 5 && d.lines.length <= 12);
    const sp = new Set(d.speakers.map((s) => s.id)); assert.equal(sp.size, 2);
    assert.ok(new Set(d.lines.map((l) => l.speaker)).size === 2, "both speakers talk");
    for (const l of d.lines) {
      assert.ok(sp.has(l.speaker)); assert.match(l.he, HEB, l.id); assert.ok(/[ְ-ׇ]/.test(l.he), `${l.id} pointed`);
      assert.ok(l.translit.length > 2 && !/[֐-׿]/.test(l.translit)); assert.ok(l.en.length > 2);
    }
  }
});

// ---------- views
test("lesson page has a 'Remember it' step from mnemonics.json and Spot It links", async () => {
  const root = new Node_("div"); const un = mount(root, ctxFor(memStore(), { lesson: "r01" })); await until(root, /Spot It: Shin/);
  assert.match(root.text, /Remember it/); assert.match(root.text, /Anchor word/); assert.match(root.text, /Spot It: Shin/);
  assert.doesNotMatch(root.text, /null|undefined/);
  un();
});

test("loanwords view: meaning hidden until revealed, 'I knew this' persists, unmount clean", async () => {
  const store = memStore(); const root = new Node_("div"); const un = mount(root, ctxFor(store, { loanwords: "lw1" })); await until(root, /Words you can already read/);
  assert.match(root.text, /Words you can already read/); assert.match(root.text, /Draft content/);
  assert.doesNotMatch(root.text, /null|undefined/);
  const shown = (re) => root.find((n) => n.tag === "div" && n.className === "alef-answer" && !n.hidden).some((n) => re.test(n.text));
  assert.equal(root.find((n) => n.className === "alef-answer" && !n.hidden).length, 0);
  await btn(root, /Show the meaning/).click();
  assert.ok(shown(/banana/));
  await btn(root, /I knew this/).click(); await waitFor(() => store.m["curriculum.loanwords"]?.["lw1-w1"], { message: "loanword knew never stored" });
  assert.equal(store.m["curriculum.loanwords"]["lw1-w1"].knew, true);
  un(); assert.equal(root.children.length, 0);
  const root2 = new Node_("div"); mount(root2, ctxFor(memStore(), { loanwords: "1" })); await until(root2, /round 1/);
  assert.match(root2.text, /round 1/);
});

test("spotit view: tap, check, result, pair stats and card lapse persisted, hint after fooled", async () => {
  const store = memStore(); const root = new Node_("div"); const un = mount(root, ctxFor(store, { spotit: "kaf", seed: "3" })); await until(root, /Tap every/);
  assert.match(root.text, /Tap every/);
  const cells = root.find((n) => n.attrs["data-i"] !== undefined);
  assert.ok(cells.length > 10);
  // tap everything: all hits plus every decoy and other letter
  for (const c of cells) await c.click();
  await btn(root, /^Check/).click(); await until(root, /look-alike fooled you/);
  assert.match(root.text, /Found \d+ of \d+/);
  assert.match(root.text, /look-alike fooled you/);
  assert.ok(store.m["curriculum.pairs"] && Object.keys(store.m["curriculum.pairs"]).length >= 1);
  assert.ok(store.m["srs.cards"]["letter:kaf"]);
  assert.ok(root.find((n) => n.attrs["data-hint-kind"] === "confusable-pair").length === 1);
  un(); assert.equal(root.children.length, 0);
  const r2 = new Node_("div"); mount(r2, ctxFor(memStore(), { spotit: "nope" })); await until(r2, /no letter/);
  assert.match(r2.text, /no letter/);
});

test("checkpoint view: needs completed lessons, then asks, grades, saves and links to Spot It", async () => {
  const empty = new Node_("div"); mount(empty, ctxFor(memStore(), { checkpoint: "1" })); await until(empty, /Nothing to check yet/);
  assert.match(empty.text, /Nothing to check yet/);
  // complete the lessons through r18 (bet, kaf, gimel, nun, dalet, resh... all taught)
  const completed = Object.fromEntries(lessons.filter((l) => l.track === "read").slice(0, 18).map((l) => [l.id, 1]));
  const store = memStore({ "curriculum.progress": { completed } });
  const root = new Node_("div"); const un = mount(root, ctxFor(store, { checkpoint: "1", seed: "2" })); await until(root, /Question 1 of/);
  assert.match(root.text, /Question 1 of/);
  let guard = 0;
  while (/Question \d+ of/.test(root.text) && guard++ < 60) {
    const optsNow = () => root.find((n) => n.tag === "button" && /alef-opt/.test(n.className) && !n.disabled);
    await waitFor(() => optsNow().length, { message: "question options never rendered" });
    const opts = optsNow();
    await opts[0].click(); await waitFor(() => btn(root, /^(Next|See results)$/), { message: "Next/See results never shown" });
    await btn(root, /^(Next|See results)$/).click();
    await waitFor(() => /of \d+ right/.test(root.text) || root.find((n) => n.tag === "button" && /alef-opt/.test(n.className) && !n.disabled).length, { message: "no next question or result" });
  }
  assert.match(root.text, /Checkpoint/); assert.match(root.text, /of \d+ right/);
  assert.ok(store.m["curriculum.checkpoints"]);
  assert.doesNotMatch(root.text, /null|undefined/);
  un();
});

test("dialogues view: list and one dialogue, toggles hide transliteration and English", async () => {
  const list = new Node_("div"); mount(list, ctxFor(memStore(), { dialogues: "1" })); await until(list, /At the cafe/);
  assert.match(list.text, /At the cafe/); assert.match(list.text, /Draft content/);
  const root = new Node_("div"); const un = mount(root, ctxFor(memStore(), { dialogue: "d-cafe" })); await until(root, /What would you like/);
  assert.match(root.text, /shalom! ma tirtsi\?/); assert.match(root.text, /What would you like/);
  await btn(root, /Transliteration/).click(); assert.doesNotMatch(root.text, /ma tirtsi/);
  await btn(root, /English/).click(); assert.doesNotMatch(root.text, /What would you like/);
  un();
  const bad = new Node_("div"); mount(bad, ctxFor(memStore(), { dialogue: "zz" })); await until(bad, /no dialogue/);
  assert.match(bad.text, /no dialogue/);
});

test("learn map links to the new features without errors", async () => {
  const root = new Node_("div"); const un = mount(root, ctxFor(memStore(), {})); await until(root, /Look-alike checkpoint/);
  assert.match(root.text, /Words you can already read/); assert.match(root.text, /Look-alike checkpoint/);
  un();
});
