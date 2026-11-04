/** Daily prompt selection (Lane 1). Deterministic rotation by day number; no randomness. */
import { loadJSON } from "./data.js";
import { toRD, weekday } from "./calendar.js";

const prompts = await loadJSON("data/curriculum/prompts.json");
export { prompts };

/**
 * @param {{y,m,d}} g local civil date
 * @param {"morning"|"evening"} slot
 * @param {{completedLessons?:Set<string>, voice?:"m"|"f", holidayIds?:string[]}} [opts]
 * @returns {{id,he,en,reflect,source,unlock,locked:boolean,kind:string}}
 */
export function dailyPrompt(g, slot, opts = {}) {
  const done = opts.completedLessons || new Set();
  let pool = prompts[slot];
  let kind = slot;
  if (slot === "evening" && weekday(g) === 5) { pool = prompts.shabbatEve; kind = "shabbatEve"; }
  const hol = (opts.holidayIds || []).find((id) => prompts.holidays[id]);
  if (hol) { pool = prompts.holidays[hol]; kind = `holiday:${hol}`; }
  // Locked ones are only skipped for rotation when others are available, except that the unlock-after-decoding
  // item (Modeh Ani / Shema) is *shown locked* on its rotation day so learners see what they are working toward.
  const p = pool[toRD(g) % pool.length];
  const locked = !!p.unlock && !done.has(p.unlock);
  const he = opts.voice === "f" && p.heFemale ? p.heFemale : p.he;
  return { ...p, he, locked, kind };
}
