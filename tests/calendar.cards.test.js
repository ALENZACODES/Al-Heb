import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { prayerCard, PRAYER_CARDS, PRAYER_STATUS, PRAYER_DISCLAIMER } from "../src/curriculum/calendar.prayer.js";
import * as C from "../src/curriculum/calendar.js";

const read = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const registry = read("../data/corpus/registry.json").entries;
const prompts = read("../data/curriculum/prompts.json");
const ws = (s) => s.replace(/\s+/g, " ").replace(/׃/g, "").trim();

test("cards are labelled as a draft and pools have the intended sizes", () => {
  assert.equal(PRAYER_STATUS, "draft-not-clergy-reviewed");
  assert.match(PRAYER_CARDS.note, /NOT reviewed by clergy/);
  assert.equal(PRAYER_CARDS.morning.length, 23);
  assert.equal(PRAYER_CARDS.evening.length, 23);
  assert.ok(PRAYER_CARDS.fridayEvening.length >= 4 && PRAYER_CARDS.saturdayEvening.length >= 2);
  assert.match(PRAYER_DISCLAIMER, /not reviewed/);
});

test("every Hebrew phrase is a verbatim slice of its registry entry and is pointed", () => {
  const byId = new Map(registry.map((e) => [e.id, e]));
  for (const pool of ["morning", "evening", "fridayEvening", "saturdayEvening"]) for (const c of PRAYER_CARDS[pool]) {
    const e = byId.get(c.registryId);
    assert.ok(e, `${c.id}: registry id ${c.registryId}`);
    assert.ok(ws(e.he).includes(ws(c.piece)), `${c.id}: ${c.piece} not in ${c.registryId}`);
    assert.ok(/[ְ-ׇ]/.test(c.piece), `${c.id}: not pointed`);
    assert.ok(/^[֐-׿\s]+$/.test(c.piece), `${c.id}: non-Hebrew characters`);
    assert.ok(c.piece.split(/\s+/).length <= 9, `${c.id}: not one short line`);
    assert.ok(c.gloss && c.text && c.text.length < 240, c.id);
    assert.ok(!/[^\x00-\x7F]/.test(c.text + c.gloss.replace(/[…]/g, "")), `${c.id}: text/gloss should be plain ASCII English`);
  }
});

test("ids unique, reflections unique, no emoji or em dash", () => {
  const all = ["morning", "evening", "fridayEvening", "saturdayEvening"].flatMap((p) => PRAYER_CARDS[p]);
  assert.equal(new Set(all.map((c) => c.id)).size, all.length);
  assert.equal(new Set(all.map((c) => c.text)).size, all.length);
  for (const c of all) assert.ok(!/[—–\u{1F300}-\u{1FAFF}]/u.test(c.text), c.id);
});

test("rotation: 23 consecutive days give 23 different morning cards; same weekday does not repeat within 3 cycles", () => {
  const start = { y: 2026, m: 11, d: 4 };
  const ids = Array.from({ length: 23 }, (_, i) => prayerCard(C.addDays(start, i), "morning").id);
  assert.equal(new Set(ids).size, 23);
  const wed = new Set();
  for (let i = 0; i < 23; i++) wed.add(prayerCard(C.addDays(start, 7 * i), "morning").id);
  assert.equal(wed.size, 23);
  assert.deepEqual(prayerCard(start, "morning"), prayerCard(start, "morning")); // deterministic
});

test("Friday evening and Saturday evening use their own pools; other evenings the normal pool", () => {
  assert.equal(prayerCard({ y: 2026, m: 11, d: 6 }, "evening").pool, "fridayEvening");
  assert.equal(prayerCard({ y: 2026, m: 11, d: 7 }, "evening").pool, "saturdayEvening");
  assert.equal(prayerCard({ y: 2026, m: 11, d: 8 }, "evening").pool, "evening");
  assert.equal(prayerCard({ y: 2026, m: 11, d: 6 }, "morning").pool, "morning");
  const fri = new Set([0, 7, 14, 21].map((n) => prayerCard(C.addDays({ y: 2026, m: 11, d: 6 }, n), "evening").id));
  assert.equal(fri.size, 4);
});

test("Modeh Ani switches to the feminine form for voice f, consistent with prompts.json heFemale", () => {
  const modeh = PRAYER_CARDS.morning.find((c) => c.id === "m01");
  assert.match(modeh.piece, /^מוֹדֶה אֲנִי/);
  const f = prompts.morning.find((p) => p.heFemale)?.heFemale;
  assert.ok(f.startsWith("מוֹדָה אֲנִי"));
  // find a date whose morning card is m01
  let g = { y: 2026, m: 11, d: 4 };
  while (prayerCard(g, "morning").id !== "m01") g = C.addDays(g, 1);
  assert.match(prayerCard(g, "morning", { voice: "m" }).he, /^מוֹדֶה אֲנִי/);
  assert.match(prayerCard(g, "morning", { voice: "f" }).he, /^מוֹדָה אֲנִי/);
  assert.ok(ws(f).startsWith(ws(prayerCard(g, "morning", { voice: "f" }).he)));
});

test("card exposes registry provenance and the draft flag", () => {
  const c = prayerCard({ y: 2026, m: 11, d: 4 }, "morning");
  assert.equal(c.draft, true);
  assert.ok(["verified", "transcribed-needs-check"].includes(c.registryStatus));
  assert.ok(c.registryRef);
});
