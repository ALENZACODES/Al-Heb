import test from "node:test";
import assert from "node:assert/strict";
import { dailyPrompt, prompts } from "../src/curriculum/prompts.js";

test("dailyPrompt is deterministic and rotates", () => {
  const a = dailyPrompt({ y: 2026, m: 11, d: 3 }, "morning"), b = dailyPrompt({ y: 2026, m: 11, d: 3 }, "morning");
  assert.deepEqual(a, b);
  const ids = new Set(); for (let d = 1; d <= 15; d++) ids.add(dailyPrompt({ y: 2026, m: 11, d }, "morning").id);
  assert.equal(ids.size, prompts.morning.length);
});

test("Friday evening gives a Shabbat prompt; holiday overrides", () => {
  assert.equal(dailyPrompt({ y: 2026, m: 11, d: 6 }, "evening").kind, "shabbatEve");
  assert.equal(dailyPrompt({ y: 2026, m: 11, d: 3 }, "evening").kind, "evening");
  assert.equal(dailyPrompt({ y: 2026, m: 12, d: 5 }, "morning", { holidayIds: ["hanukkah"] }).kind, "holiday:hanukkah");
});

test("Modeh Ani and night Shema stay locked until their lessons are done; female variant", () => {
  const find = (slot, id) => { for (let d = 1; d <= 40; d++) { const p = dailyPrompt({ y: 2026, m: 11, d: d % 28 + 1 }, slot, { completedLessons: new Set(), voice: "f" }); if (p.id === id) return p; } };
  const m = find("morning", "m01"), e = find("evening", "e01");
  assert.ok(m.locked && e.locked);
  assert.ok(m.he.startsWith("מוֹדָה"));
  let unlocked; for (let d = 1; d <= 30; d++) { const p = dailyPrompt({ y: 2026, m: 11, d }, "morning", { completedLessons: new Set(["r39"]) }); if (p.id === "m01") unlocked = p; }
  assert.equal(unlocked.locked, false);
});
