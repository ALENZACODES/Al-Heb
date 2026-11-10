// Written Practical pages shown in the live #/practical view (src/curriculum/practical-written.js and the view).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { newRoot, all, loaded, click, byText } from "./pronunciation.dom-helper.js";
import { applyWritten, livePage, reviewItems, writtenByUnit, writtenPageCounts, WRITTEN_URL } from "../src/curriculum/practical-written.js";

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const written = read(WRITTEN_URL);
const index = read("data/curriculum/practical/index.json");
const unitOf = (id) => read(index.units.find((u) => u.id === id).file);

test("a fully written unit shows exactly its written pages, in order", () => {
  for (const id of written.completeUnits) {
    const u = applyWritten(unitOf(id), written);
    assert.deepEqual(u.pages.map((p) => p.id), writtenByUnit(written).get(id).map((p) => p.id), id);
    assert.ok(u.pages.every((p) => p.grammar === null || p.grammar.point), id);
  }
  const counts = writtenPageCounts(index, written);
  assert.equal(counts["pu-introducing"], 5);
  assert.equal(counts["pu-family"], index.units.find((u) => u.id === "pu-family").pageCount, "unwritten units keep their draft count");
});

test("units without written pages are unchanged", () => {
  const cafe = unitOf("pu-family");
  assert.equal(applyWritten(cafe, written), cafe);
});

test("held items never reach the learner: politeness-21 and its grammar point are dropped", () => {
  const p05 = written.pages.find((p) => p.id === "pu-politeness-p05");
  assert.ok(p05.items.some((it) => it.id === "politeness-21" && it.heldForJohn));
  const live = livePage(p05);
  assert.ok(!live.items.some((it) => it.id === "politeness-21"));
  assert.equal(live.grammar, null);
  assert.ok(!JSON.stringify(live).includes("הַשֵּׁם"), "no held Hebrew left anywhere on the live page");
  const u = applyWritten(unitOf("pu-politeness"), written);
  assert.ok(!JSON.stringify(u.pages).includes("politeness-21"));
  assert.ok(!u.items.some((it) => it.id === "politeness-21"));
});

test("review items come from earlier written pages", () => {
  const p = written.pages.find((x) => x.id === "pu-greetings-p03");
  assert.deepEqual(reviewItems(p, written).map((it) => it.id), p.reviewOf);
});

test("the view renders a written page: can-do line, grammar point, form tags, speaking prompts, pick-the-meaning", async () => {
  const root = newRoot();
  globalThis.document = root.ownerDocument;
  const store = new Map();
  const ctx = { params: { id: "pu-greetings", page: "pu-greetings-p03" }, query: {},
    store: { get: async (k) => store.get(k), set: async (k, v) => store.set(k, v) }, settings: {} };
  const V = await import("../src/curriculum/practical.view.js");
  const un = V.mount(root, ctx);
  await loaded(root, () => /Grammar:/.test(root.textContent));
  const text = root.textContent;
  assert.match(text, /Ask how someone is, to a man or to a woman\./);
  assert.match(text, /Grammar: Your: an ending that changes for a man or a woman/);
  assert.ok(all(root, (x) => x.getAttribute("data-form") === "woman").length >= 1, "woman tag shown");
  assert.ok(all(root, (x) => x.getAttribute("data-speak") === "greetings-11-f").length === 1, "speaking prompt for Dana");
  assert.ok(all(root, (x) => x.getAttribute("data-listen-round")).length >= 3);
  assert.doesNotMatch(text, /Google Cloud|clip ids|machine-built/);
  const show = byText(root, /Show the line/);
  click(show);
  assert.equal(show.hidden, true, "the button hides once the line is shown");
  if (typeof un === "function") un();
});

test("with 'I do not use audio' on, the pick-the-meaning round is left out and reading stays", async () => {
  const root = newRoot();
  globalThis.document = root.ownerDocument;
  const store = new Map();
  const ctx = { params: { id: "pu-greetings", page: "pu-greetings-p03" }, query: {},
    store: { get: async (k) => store.get(k), set: async (k, v) => store.set(k, v) },
    settings: { get: (k) => (k === "audioFree" ? true : undefined) } };
  const V = await import("../src/curriculum/practical.view.js");
  const un = V.mount(root, ctx);
  await loaded(root, () => /Grammar:/.test(root.textContent));
  assert.equal(all(root, (x) => x.getAttribute("data-listen-round")).length, 0);
  assert.match(root.textContent, /מַה שְׁלוֹמֵךְ\?/);
  if (typeof un === "function") un();
});

test("draft pages never show learners notes about data files, item ids or sources", async () => {
  const { cleanNote, DRAFT_TEXT } = await import("../src/curriculum/practical.view.js");
  assert.equal(cleanNote("This page uses only Hebrew already stored in data/corpus/phrasebook.json. First line: שָׁלוֹם."), "");
  assert.equal(cleanNote("Wants use רוֹצֶה / רוֹצָה. These notes only name forms already in the sources."), "Wants use רוֹצֶה / רוֹצָה.");
  for (const row of index.units) {
    const u = read(row.file);
    for (const n of [u.grammarNote, ...u.pages.map((p) => p.grammarNote)]) {
      assert.doesNotMatch(cleanNote(n), /data\/|\.json|phrasebook|[a-z]+-\d{2}\b/i, `${row.id}: ${cleanNote(n).slice(0, 80)}`);
    }
  }
  assert.doesNotMatch(DRAFT_TEXT, /track|125|lesson track/);
});

test("the committed hide list keeps failed clips off learner pages, even without the untracked check results", async () => {
  const hidden = read("data/curriculum/practical/hidden-items.json");
  const { withHidden, visibleItems } = await import("../src/curriculum/practical-progress.js");
  assert.equal(hidden.items.length, hidden.count);
  for (const h of hidden.items) {
    const u = read(index.units.find((x) => x.id === h.unit).file);
    const ids = new Set([...(u.items || []), ...u.pages.flatMap((p) => p.items)].map((it) => it.id));
    assert.ok(ids.has(h.item), `${h.key} is a real item`);
  }
  const results = withHidden(null, hidden);
  const g = applyWritten(unitOf("pu-greetings"), written);
  const p04 = g.pages.find((p) => p.id === "pu-greetings-p04");
  assert.ok(p04.items.some((it) => it.id === "greetings-17"));
  assert.ok(!visibleItems("pu-greetings", p04.items, results).some((it) => it.id === "greetings-17"));
  // Pages written after the hide list existed (cafe onward) use no item whose clip failed, in any unit.
  const hiddenIds = new Set(hidden.items.map((h) => h.item));
  const after = written.pages.slice(written.pages.findIndex((x) => x.id === "pu-cafe-p01"));
  for (const p of after) for (const it of p.items) assert.ok(!hiddenIds.has(it.id), `${p.id} uses hidden ${it.id}`);
});

test("a hidden item's speaking prompt is left out of the rendered page", async () => {
  const root = newRoot();
  globalThis.document = root.ownerDocument;
  const store = new Map();
  const ctx = { params: { id: "pu-numbers", page: "pu-numbers-p04" }, query: {},
    store: { get: async (k) => store.get(k), set: async (k, v) => store.set(k, v) }, settings: {} };
  const V = await import("../src/curriculum/practical.view.js");
  const un = V.mount(root, ctx);
  await loaded(root, () => /Grammar:/.test(root.textContent));
  assert.equal(all(root, (x) => x.getAttribute("data-speak") === "numbers-16").length, 0, "numbers-16 failed the clip check");
  assert.equal(all(root, (x) => x.getAttribute("data-speak") === "numbers-17").length, 1);
  if (typeof un === "function") un();
});
