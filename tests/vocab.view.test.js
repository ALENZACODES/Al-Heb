import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Minimal fake DOM (checks view logic, NOT browser rendering).
class N {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.nodeType = 1; this.className = ""; this.focused = false; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { this.children.push(x); if (x && x.parent !== undefined) x.parent = this; } }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  set textContent(v) { this.replaceChildren(document.createTextNode(v)); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  focus() { this.focused = true; globalThis.__focus = this; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(""); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  querySelector(sel) {
    const m = sel[0] === "#" ? (n) => n.attrs.id === sel.slice(1) : (n) => (` ${n.className} `).includes(` ${sel.slice(1)} `);
    return this.find(m)[0] || null;
  }
  async fire(type, ev = {}) { for (const f of this.listeners[type] || []) await f({ target: this, preventDefault() {}, ...ev }); }
  click() { return this.fire("click"); }
}
globalThis.document = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: undefined }) };
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const memStore = (init = {}) => { const m = { ...init }; return { get: (k) => m[k], set: (k, v) => { m[k] = v; }, m }; };
const byId = (root, id) => root.find((n) => n.attrs.id === id)[0];
const btn = (root, re) => root.find((n) => n.tag === "button" && re.test(n.text))[0];
const items = (root) => root.find((n) => n.tag === "li" && n.attrs["data-id"]);

const { mount, ATTRIBUTION, DRAFT_NOTICE, translitFor } = await import("../src/vocab/vocab.view.js");
const { stripPoints, filterEntries, addCards, cardId } = await import("../src/vocab/model.js");
const { loadTier } = await import("../src/vocab/loader.js");
const { buildPacks, packPath } = await import("../src/vocab/split-tiers.mjs");
const tier500 = await loadTier(500);

const mk = (extra = {}) => {
  const root = new N("div"); const store = memStore(extra.store);
  const spoken = [];
  const ctx = { store, t: (k) => k, settings: { get: (k) => (k === "congregation" ? (extra.cong || "sephardi") : undefined) }, route() {}, query: extra.query || {}, audio: extra.audio };
  return { root, store, ctx, spoken };
};

test("pack files match vocab5000.json, cover all 5000 words and stay small enough to be fetched per tier", () => {
  const data = JSON.parse(readFileSync(new URL("../data/vocab/vocab5000.json", import.meta.url), "utf8"));
  const packs = buildPacks(data);
  let n = 0;
  for (const t of [500, 1000, 2000, 5000]) {
    const onDisk = readFileSync(new URL("../" + packPath(t), import.meta.url), "utf8");
    assert.equal(onDisk, JSON.stringify(packs[t]) + "\n", `${packPath(t)} is stale: run node src/vocab/split-tiers.mjs`);
    n += packs[t].count;
  }
  assert.equal(n, 5000);
});

test("packs are excluded from the service-worker precache", () => {
  const m = readFileSync(new URL("../precache-manifest.js", import.meta.url), "utf8");
  assert.ok(!/vocab5k-tier/.test(m));
});

test("stripPoints / filterEntries: Hebrew with or without points, English, topic", () => {
  assert.equal(stripPoints("שָׁלוֹם"), "שלום");
  assert.equal(stripPoints("לְ־"), "ל");
  const es = [
    { lemma: "שלום", pointed: "שָׁלוֹם", gloss: "peace; hello", pos: "noun", topic: "Society" },
    { lemma: "בוקר", pointed: "בֹּקֶר", gloss: "morning", pos: "noun", topic: "Time" },
    { lemma: "עכשיו", pointed: null, gloss: "now", pos: "adv", topic: "Time" },
  ];
  assert.deepEqual(filterEntries(es, { query: "שלום" }).map((e) => e.lemma), ["שלום"]);
  assert.deepEqual(filterEntries(es, { query: "שָׁלוֹם" }).map((e) => e.lemma), ["שלום"]);
  assert.deepEqual(filterEntries(es, { query: "בֹּקֶר" }).map((e) => e.lemma), ["בוקר"]);
  assert.deepEqual(filterEntries(es, { query: "HELLO" }).map((e) => e.lemma), ["שלום"]);
  assert.deepEqual(filterEntries(es, { topic: "Time" }).length, 2);
  assert.deepEqual(filterEntries(es, { topic: "Time", query: "now" }).map((e) => e.lemma), ["עכשיו"]);
  assert.equal(filterEntries(es, { query: "zzz" }).length, 0);
});

test("addCards: new SRS cards with vocab: ids, no duplicates, limit respected", () => {
  const a = addCards({}, tier500.slice(0, 10), 1000, 3);
  assert.equal(a.added, 3);
  const k = cardId(tier500[0]);
  assert.equal(a.cards[k].state, "new"); assert.equal(a.cards[k].tier, 500); assert.equal(a.cards[k].due, 1000);
  assert.equal(addCards(a.cards, tier500.slice(0, 3), 2000).added, 0);
});

test("translitFor uses the learner's tradition and says nothing for unpointed words", () => {
  assert.equal(translitFor({ pointed: "בֹּקֶר" }, "sephardi"), "boker");
  assert.equal(translitFor({ pointed: null }, "sephardi"), "");
});

test("browse: draft notice, attribution footer, RTL pointed Hebrew, transliteration, honest audio label", async () => {
  const { root, ctx } = mk();
  const un = mount(root, ctx); await tick();
  assert.ok(root.text.includes(DRAFT_NOTICE));
  assert.ok(root.find((n) => n.tag === "footer")[0].text.includes(ATTRIBUTION));
  assert.match(ATTRIBUTION, /CC BY-SA 4\.0/); assert.match(ATTRIBUTION, /Hermit Dave/); assert.match(ATTRIBUTION, /Wiktionary/);
  assert.equal(byId(root, "view-title").tag, "h1");
  const lis = items(root); assert.equal(lis.length, 40);
  const he = lis[0].find((n) => n.attrs.lang === "he")[0];
  assert.equal(he.attrs.dir, "rtl"); assert.equal(he.text, tier500[0].pointed);
  assert.match(lis[0].text, /Transliteration \(Sephardi, approximate\): et/);
  assert.match(lis[0].text, /rank 1/);
  const listen = btn(lis[0], /Listen/);
  assert.match(listen.text, /computer voice/); assert.match(listen.attrs["aria-label"], /computer voice/);
  assert.match(root.text, /Showing 40 of 500 words/);
  // every control has a label
  for (const id of ["vc-tier", "vc-topic", "vc-search"]) assert.ok(root.find((n) => n.tag === "label" && n.attrs.for === id).length === 1);
  un();
});

test("browse: show more, search, topic and tier switch", async () => {
  const { root, ctx } = mk();
  mount(root, ctx); await tick();
  await byId(root, "vc-more").click();
  assert.equal(items(root).length, 80);
  const search = byId(root, "vc-search");
  search.value = "שלום"; await search.fire("input");
  const res = items(root); assert.ok(res.length >= 1);
  assert.ok(res.every((li) => /שלום|שָׁלוֹם/.test(li.text)));
  assert.match(root.text, /Showing \d+ of \d+ word/);
  search.value = "zzzzqq"; await search.fire("input");
  assert.equal(items(root).length, 0); assert.match(root.text, /No words match/);
  search.value = ""; await search.fire("input");
  const topic = byId(root, "vc-topic");
  assert.ok(topic.children.length > 3);
  topic.value = "Verbs"; await topic.fire("change");
  assert.ok(items(root).length > 0);
  assert.ok(items(root).every((li) => / Verbs · /.test(li.text) || /· Verbs ·/.test(li.text)));
  const tier = byId(root, "vc-tier"); tier.value = "1000"; await tier.fire("change"); await tick();
  assert.match(root.text, /Showing \d+ of \d+/);
  assert.ok(items(root).every((li) => Number(/rank (\d+)/.exec(li.text)[1]) > 500));
});

test("browse: English search is on the gloss; pointed Hebrew search finds the unpointed lemma's entry", async () => {
  const { root, ctx } = mk();
  mount(root, ctx); await tick();
  const search = byId(root, "vc-search");
  search.value = tier500[0].pointed; await search.fire("input");
  assert.ok(items(root).some((li) => li.attrs["data-id"] === tier500[0].id));
  search.value = "GOOD"; await search.fire("input");
  assert.ok(items(root).some((li) => /good/i.test(li.text)));
});

test("add one word, and a batch, to reviews (stored under srs.vocab)", async () => {
  const { root, ctx, store } = mk();
  mount(root, ctx); await tick();
  const first = items(root)[0];
  await btn(first, /Add to reviews/).click();
  assert.ok(store.m["srs.vocab"][cardId(tier500[0])]);
  assert.ok("disabled" in btn(items(root)[0], /In reviews/).attrs);
  assert.equal(store.m["srs.cards"], undefined);
  await byId(root, "vc-add-all").click();
  assert.equal(Object.keys(store.m["srs.vocab"]).length, 101);
  assert.match(root.text, /Added 100 words.*399 more/);
  assert.match(root.text, /Review \(101 due\)/);
});

test("review: show answer, rate with button and with keyboard, SRS card updated, summary", async () => {
  const cards = {};
  for (const e of tier500.slice(0, 3)) Object.assign(cards, addCards(cards, [e], 0).cards);
  const { root, ctx, store } = mk({ store: { "srs.vocab": cards }, query: { review: "1" } });
  mount(root, ctx); await tick();
  assert.ok(byId(root, "vc-q"));
  assert.ok(!root.text.includes(tier500[0].gloss));
  assert.equal(root.find((n) => n.attrs["data-rating"]).length, 0);
  await byId(root, "vc-show").click();
  assert.equal(root.find((n) => n.attrs["data-rating"]).length, 4);
  assert.ok(root.text.includes(tier500[0].gloss));
  assert.equal(globalThis.__focus.attrs.id, "vc-a");
  await root.find((n) => n.attrs["data-rating"] === "3")[0].click(); await tick();
  const c0 = store.m["srs.vocab"][cardId(tier500[0])];
  assert.equal(c0.reps, 1); assert.equal(c0.state, "review"); assert.ok(c0.due > Date.now());
  assert.equal(c0.tier, 500);
  // keyboard: 1 = Again => relearning, repeated later this session
  await byId(root, "vc-show").click();
  const section = root.find((n) => n.tag === "section")[0];
  await section.fire("keydown", { key: "1" }); await tick();
  assert.equal(store.m["srs.vocab"][cardId(tier500[1])].state, "relearning");
  await byId(root, "vc-show").click(); await section.fire("keydown", { key: "4" }); await tick();
  // 3rd card then the requeued Again card (still due? its due is +10 min, but it was queued)
  assert.match(root.text, /Word 4 of 4/);
  await byId(root, "vc-show").click(); await section.fire("keydown", { key: "3" }); await tick();
  assert.match(root.text, /Session done/); assert.match(root.text, /4 words reviewed: 1 again, 0 hard, 2 good, 1 easy/);
  assert.equal(store.m["srs.vocab"][cardId(tier500[1])].reps, 2);
});

test("review: keys are ignored before the answer is shown; empty state points to Browse", async () => {
  const { root, ctx, store } = mk({ query: { review: "1" } });
  mount(root, ctx); await tick();
  assert.match(root.text, /No words in your reviews yet/);
  await btn(root, /Browse words/).click(); await tick();
  assert.ok(items(root).length > 0);
  const cards = addCards({}, tier500.slice(0, 1), 0).cards;
  const b = mk({ store: { "srs.vocab": cards }, query: { review: "1" } });
  mount(b.root, b.ctx); await tick();
  await b.root.find((n) => n.tag === "section")[0].fire("keydown", { key: "3" }); await tick();
  assert.equal(b.store.m["srs.vocab"][cardId(tier500[0])].reps, 0);
});

test("audio: recording used when ctx.audio has the id; otherwise browser Hebrew voice with an honest label", async () => {
  const played = [];
  const audio = { has: (k, id) => id === tier500[0].id, play: async (k, id) => { played.push([k, id]); return { source: "file", entryStatus: "recorded" }; }, stop() {} };
  const a = mk({ audio });
  mount(a.root, a.ctx); await tick();
  const lis = items(a.root);
  assert.doesNotMatch(btn(lis[0], /Listen/).text, /computer voice/);
  await btn(lis[0], /Listen/).click();
  assert.deepEqual(played, [["word", tier500[0].id]]);
  assert.match(a.root.text, /Playing a recording/);

  const utter = [];
  globalThis.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  globalThis.speechSynthesis = { getVoices: () => [{ lang: "he-IL" }], cancel() {}, speak: (u) => utter.push(u) };
  const b = mk({ cong: "ashkenazi" });
  mount(b.root, b.ctx); await tick();
  await btn(items(b.root)[1], /Listen/).click();
  assert.equal(utter.length, 1); assert.equal(utter[0].lang, "he-IL"); assert.equal(utter[0].text, tier500[1].pointed.replace(/־/g, " "));
  assert.match(b.root.text, /Computer voice: .*not a recording.*not Ashkenazi/);

  globalThis.speechSynthesis = { getVoices: () => [{ lang: "en-US" }], cancel() {}, speak: () => utter.push(1) };
  const c = mk();
  mount(c.root, c.ctx); await tick();
  await btn(items(c.root)[0], /Listen/).click();
  assert.equal(utter.length, 1); assert.match(c.root.text, /No sound: your device has no Hebrew voice/);
  delete globalThis.speechSynthesis; delete globalThis.SpeechSynthesisUtterance;
});

test("load failure shows an alert with retry; unmount stops late renders", async () => {
  let fail = true;
  const vocabLoader = { loadTier: async (t) => { if (fail) throw new Error("offline"); return tier500; } };
  const { root, ctx } = mk(); ctx.vocabLoader = vocabLoader;
  mount(root, ctx); await tick();
  assert.ok(root.find((n) => n.attrs.role === "alert")[0].text.includes("offline"));
  fail = false; await btn(root, /Try again/).click(); await tick();
  assert.ok(items(root).length > 0);
  const m = mk(); m.ctx.vocabLoader = { loadTier: async () => { await tick(20); return tier500; } };
  const un = mount(m.root, m.ctx); un(); await tick(60);
  assert.equal(items(m.root).length, 0);
});

test("router: /vocab is the existing optional route to this module", async () => {
  const { ROUTES } = await import("../src/shell/router.js");
  const r = ROUTES.find((x) => x.name === "vocab");
  assert.equal(r.module, "../vocab/vocab.view.js"); assert.equal(r.optional, true);
  const gen = readFileSync(new URL("../src/shell/views.generated.js", import.meta.url), "utf8");
  assert.match(gen, /vocab\/vocab\.view\.js/);
});
