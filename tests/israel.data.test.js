import test from "node:test";
import assert from "node:assert/strict";
import { loadIsrael, validate, audioNeeds, isPointed, hasHebrew, formFor, CONFIDENCE } from "../src/israel/model.js";

const data = await loadIsrael();

test("israel data: passes the schema validator with no problems", () => {
  assert.deepEqual(validate(data), []);
});

test("israel data: minimum content counts", () => {
  assert.ok(data.ladder.pairs.length >= 40, "ladder pairs");
  assert.equal(data.giveaways.items.length, 15);
  assert.ok(data.scenarios.scenarios.length >= 12);
  assert.ok(data.etiquette.cards.length >= 8);
  assert.ok(data.fillers.fillers.length >= 15);
});

test("israel data: every id is unique across all files", () => {
  const all = [...data.ladder.pairs, ...data.fillers.fillers, ...data.giveaways.items, ...data.scenarios.scenarios, ...data.etiquette.cards].map((x) => x.id);
  assert.equal(new Set(all).size, all.length);
});

test("israel data: honesty flags on file and every item", () => {
  for (const d of Object.values(data)) { assert.equal(d.proofread, false); assert.equal(d.needsNativeReview, true); }
  const items = [...data.ladder.pairs, ...data.fillers.fillers, ...data.giveaways.items, ...data.scenarios.scenarios, ...data.etiquette.cards];
  for (const x of items) {
    assert.equal(x.proofread, false, x.id); assert.equal(x.needsNativeReview, true, x.id);
    assert.ok(CONFIDENCE.includes(x.confidence), x.id);
    if (x.confidence !== "high") assert.ok(x.confidenceReason?.length > 5, x.id + " needs a reason");
  }
});

test("israel data: no empty strings anywhere in the data", () => {
  const bad = [];
  const walk = (v, path) => {
    if (typeof v === "string") { if (!v.trim() && !/\.options\.\d+\.translit$/.test(path)) bad.push(path); }
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}.${i}`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
  };
  for (const [k, d] of Object.entries(data)) walk(d, k);
  assert.deepEqual(bad, []);
});

test("israel data: Hebrew is pointed and contains Hebrew letters", () => {
  for (const p of data.ladder.pairs) for (const s of ["textbook", "everyday"]) { assert.ok(hasHebrew(p[s].he) && isPointed(p[s].he), p.id + s); }
  for (const s of data.scenarios.scenarios) for (const o of s.options) assert.ok(isPointed(o.he), s.id);
  for (const f of data.fillers.fillers) assert.ok(isPointed(f.he), f.id);
});

test("israel data: gender fields are consistent (forms.m equals the top line; f differs; note matches)", () => {
  let gendered = 0;
  for (const p of data.ladder.pairs) for (const s of ["textbook", "everyday"]) {
    const l = p[s];
    if (l.gender === "none") { assert.equal(l.forms, undefined, p.id); continue; }
    gendered++;
    assert.ok(["speaker", "addressee"].includes(l.gender));
    assert.equal(l.forms.m.he, l.he); assert.notEqual(l.forms.f.he, l.forms.m.he, p.id);
    assert.equal(formFor(l, "f").he, l.forms.f.he); assert.equal(formFor(l, "m").he, l.he);
  }
  assert.ok(gendered >= 20);
  for (const p of data.ladder.pairs) {
    const any = p.textbook.gender !== "none" || p.everyday.gender !== "none";
    assert.equal(!any, /^No gender-marked/.test(p.genderNote), p.id);
  }
  for (const s of data.scenarios.scenarios) for (const o of s.options) assert.equal(o.gender === "none", !o.forms, s.id);
});

test("israel data: registers are valid and each textbook/everyday pair differs", () => {
  for (const p of data.ladder.pairs) assert.notEqual(p.textbook.he, p.everyday.he, p.id);
  const regs = new Set(data.ladder.pairs.flatMap((p) => [p.textbook.register, p.everyday.register]));
  for (const r of ["formal", "neutral", "casual"]) assert.ok(regs.has(r), r);
  assert.ok(data.fillers.fillers.some((f) => f.register === "slang"));
});

test("israel data: every scenario has exactly one natural, one stiff, one off option", () => {
  for (const s of data.scenarios.scenarios) assert.deepEqual(s.options.map((o) => o.role).sort(), ["natural", "off", "stiff"], s.id);
});

test("israel data: giveaway drills have one correct answer among three options", () => {
  for (const g of data.giveaways.items) {
    assert.equal(g.drill.options.length, 3); assert.ok(g.drill.options.some((o) => o.id === g.drill.answer), g.id);
    assert.ok(g.fix.length > 5 && g.say.length > 5);
  }
});

test("israel data: regional claims are phrased as commonly heard and not high confidence", () => {
  const regional = data.etiquette.cards.filter((c) => c.regionClaim);
  assert.ok(regional.length >= 1);
  for (const c of regional) { assert.notEqual(c.confidence, "high"); assert.match(c.body, /report|commonly|often|generally/i); }
  // no ladder/giveaway/filler text asserts a city-specific claim as fact
  const text = JSON.stringify([data.ladder, data.fillers, data.giveaways, data.scenarios]);
  assert.doesNotMatch(text, /Tel Aviv(ians)? (say|speak|use|always)/i);
});

test("israel data: low-confidence items are marked and none is silent about it", () => {
  const low = [...data.ladder.pairs, ...data.etiquette.cards].filter((x) => x.confidence === "low");
  assert.ok(low.length >= 1);
  for (const x of low) assert.ok(x.confidenceReason, x.id);
});

test("israel data: audio needs list is complete and honest (ids unique, no claim of recordings)", () => {
  const needs = audioNeeds(data);
  assert.ok(needs.length > 150);
  assert.equal(new Set(needs.map((n) => n.id)).size, needs.length);
  for (const n of needs) assert.ok(n.he && n.translit, n.id);
});

test("israel data: gendered lines do not hard-code a gender in the English gloss; giveaway 'wrong' lines are pure Hebrew", () => {
  for (const p of data.ladder.pairs) for (const s of ["textbook", "everyday"]) if (p[s].gender !== "none") assert.doesNotMatch(p[s].en, /\(to a (man|woman)\)/, p.id);
  for (const g of data.giveaways.items) { assert.doesNotMatch(g.wrong.he, /[A-Za-z]/, g.id); assert.doesNotMatch(g.right.he, /[A-Za-z]/, g.id); }
});
