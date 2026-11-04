import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { waitFor } from "./helpers/waitfor.js";
import { buildWordVocabMap, buildFromRepo, OUT } from "../tools/curriculum/word_ids.mjs";
import { createImageResolver, img as imgEl } from "../src/img/resolve.js";
import { buildIndexFrom } from "../tools/img/build_index.mjs";

// Fake DOM (same shape as tests/curriculum.learnflow.test.js): null children become the text "null", like the real DOM.
class Node_ {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.nodeType = 1; this.className = ""; this.hidden = false; }
  setAttribute(k, v) { this.attrs[k] = v; if (k === "hidden") this.hidden = true; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { this.children.push(x); if (x && x.parent !== undefined) x.parent = this; } }
  replaceChildren(...c) { this.children = []; this.append(...c.map((x) => (x == null ? { nodeType: 3, data: String(x), parent: undefined } : x))); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v), parent: undefined }]; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.hidden ? "" : c.text)).join(""); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  async click() { for (const f of this.listeners.click || []) await f({}); }
}
globalThis.document = { createElement: (t) => new Node_(t), createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: undefined }), addEventListener() {}, removeEventListener() {} };
const until = (n, re) => waitFor(() => re.test(n.text), { message: `text ${re} never appeared` });
const btn = (root, re) => root.find((n) => n.tag === "button" && re.test((n.attrs["aria-label"] || "") + n.text))[0];
const memStore = () => { const m = {}; return { get: (k) => m[k], set: (k, v) => { m[k] = v; }, m }; };

const { mountReview, describeCard, loadWordVocabMap } = await import("../src/curriculum/review.view.js");
const { loadContent } = await import("../src/curriculum/content.js");

test("word_ids: exact pointed match only; missing and ambiguous forms stay unmapped", () => {
  const lessons = [{ id: "x1", words: [{ he: "שָׁלוֹם" }, { he: "שלום" }, { he: "אֵת" }, { he: "בַּיִת" }] }];
  const words = [{ id: "a", he: "שָׁלוֹם" }, { id: "b", he: "אֵת" }, { id: "c", he: "אֵת" }];
  const r = buildWordVocabMap(lessons, words);
  assert.deepEqual(r.map, { "x1:1": "a" });                       // unpointed "שלום" is not fuzzy-matched to the pointed entry
  assert.deepEqual(r.unmatched, ["x1:2", "x1:4"]);
  assert.deepEqual(r.ambiguous, [{ key: "x1:3", ids: ["b", "c"] }]);
  assert.deepEqual(r.counts, { lessonWords: 4, mapped: 1, unmatched: 2, ambiguous: 1 });
});

test("word_ids: committed data/curriculum/word-vocab-map.json is current and every id exists in words.json", () => {
  const fresh = buildFromRepo();
  const committed = JSON.parse(fs.readFileSync(new URL("../" + OUT, import.meta.url), "utf8"));
  assert.deepEqual(committed, fresh);
  const ids = new Set(JSON.parse(fs.readFileSync(new URL("../data/vocab/words.json", import.meta.url), "utf8")).words.map((w) => w.id));
  for (const id of Object.values(committed.map)) assert.ok(ids.has(id), id);
  assert.ok(committed.counts.mapped > 0);
  assert.equal(committed.counts.mapped + committed.counts.unmatched + committed.counts.ambiguous, committed.counts.lessonWords);
});

test("describeCard: vocabId only when the map has an entry", async () => {
  const c = await loadContent(); const map = await loadWordVocabMap();
  assert.equal(describeCard("word:r01:1", c, "israeli").vocabId, undefined);
  assert.equal(describeCard("word:r01:1", c, "israeli", { "r01:1": "hX" }).vocabId, "hX");
  assert.equal(describeCard("word:r01:1", c, "israeli", {}).vocabId, undefined);
  assert.equal(typeof map, "object");
});

/** Image fixture: one approved word picture for the vocab id that lesson r01's first word maps to; an unapproved one for r02's. */
function imgCtx(approvals) {
  const map = JSON.parse(fs.readFileSync(new URL("../" + OUT, import.meta.url), "utf8")).map;
  const id1 = map["r01:1"], id2 = map["r02:1"];
  assert.ok(id1 && id2, "fixture needs r01:1 and r02:1 mapped (exact match in words.json)");
  const blockJ = [
    { id: "J-TEST1", kind: "word-object", set: "j_vocab_t", key: id1, width: "1024", height: "1024", alt: "Test picture one." },
    { id: "J-TEST2", kind: "word-object", set: "j_vocab_t", key: id2, width: "1024", height: "1024", alt: "Test picture two." },
  ];
  const index = JSON.parse(JSON.stringify(buildIndexFrom({ manifest: [], blockJ, inter: [], altText: {}, edges: { "J-TEST1": [800], "J-TEST2": [800] } })));
  const R = createImageResolver({ index, approvals: { approvals } });
  return { R, img: (h, spec) => imgEl(h, { R, ...spec }) };
}
const ctxFor = (store, extra) => ({ store, route: () => {}, t: (k) => k, settings: { get: (k) => ({ congregation: "sephardi", goal: "read" }[k]) },
  audio: { status: () => ({ source: "tts-fallback" }), play: async () => ({ source: "tts-fallback" }) }, ...extra });

async function reviewLesson(lessonId, ctx) {
  const root = new Node_("div"); const un = mountReview(root, ctx, { lessonId });
  await until(root, /Card 1 of/);
  const seen = []; // one record per card: { he, before, after }
  for (let i = 0; i < 20 && !/Session done/.test(root.text); i++) {
    const before = root.find((n) => n.tag === "img").length;
    await btn(root, /Show answer/).click();
    const answer = root.find((n) => n.className === "alef-answer" || n.attrs.class === "alef-answer")[0];
    const pics = root.find((n) => n.tag === "img");
    seen.push({ before, after: pics.length, ids: pics.map((p) => p.attrs["data-img-id"]), answerText: answer?.text ?? "" });
    await root.find((n) => n.attrs["data-rating"] === "3")[0].click();
    await waitFor(() => /Show answer|Session done/.test(root.text), { message: "no next card" });
  }
  un(); return seen;
}

test("review: approved vocab picture appears on the answer side only, for the mapped word card only", async () => {
  const fx = imgCtx({ "J-TEST1": { status: "approved" } });
  assert.ok(fx.R.has("word", JSON.parse(fs.readFileSync(new URL("../" + OUT, import.meta.url), "utf8")).map["r01:1"]), "fixture approval resolves");
  const seen = await reviewLesson("r01", ctxFor(memStore(), { img: fx.img }));
  assert.ok(seen.length >= 2, "r01 review has letter and word cards");
  for (const s of seen) assert.equal(s.before, 0, "no picture before the answer is shown");
  const withPic = seen.filter((s) => s.after > 0);
  assert.equal(withPic.length, 1, "exactly one card (the mapped word) shows a picture");
  assert.deepEqual(withPic[0].ids, ["J-TEST1"]);
  for (const s of seen) assert.doesNotMatch(s.answerText, /null|undefined/);
});

test("review: unapproved or unmapped word -> no picture and no empty slot", async () => {
  const fx = imgCtx({}); // nothing approved
  for (const lesson of ["r01", "r02"]) {
    const seen = await reviewLesson(lesson, ctxFor(memStore(), { img: fx.img }));
    for (const s of seen) { assert.equal(s.after, 0, `${lesson}: no img`); assert.doesNotMatch(s.answerText, /null|undefined/); }
  }
  // no ctx.img at all (image resolver unavailable): still fine
  const seen = await reviewLesson("r01", ctxFor(memStore(), {}));
  for (const s of seen) { assert.equal(s.after, 0); assert.doesNotMatch(s.answerText, /null|undefined/); }
});
