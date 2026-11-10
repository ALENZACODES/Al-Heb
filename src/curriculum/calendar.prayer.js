/**
 * Morning and evening prayer card (Lane 1). One short original reflection per day plus a one-line Hebrew phrase
 * sliced verbatim from a data/corpus/registry.json entry. DRAFT: the reflections are not reviewed by clergy.
 * Rotation is deterministic by day number: pools are 23 long (coprime to 7, so a card does not fall on the same
 * weekday every cycle). Friday evening and Saturday evening (Havdalah) have their own small pools.
 */
import { loadJSON } from "./data.js";
import { toRD, weekday } from "./calendar.js";

const cards = await loadJSON("data/calendar/prayer-cards.json");
const registry = await loadJSON("data/corpus/registry.json");
const regById = new Map(registry.entries.map((e) => [e.id, e]));

export const PRAYER_CARDS = cards;
export const PRAYER_STATUS = cards.status; // "draft-not-clergy-reviewed"
export const PRAYER_DISCLAIMER = "Draft reflection written for ALEF; not reviewed by a rabbi or clergy. The Hebrew line is copied from the app's text registry.";

/**
 * @param {{y,m,d}} g local civil date
 * @param {"morning"|"evening"} slot
 * @param {{voice?:"m"|"f"}} [opt] voice "f" switches Modeh Ani to the feminine form
 * @returns {{id,slot,pool,text,he,gloss,registryId,registryRef,registryStatus,draft:true,disclaimer}}
 */
export function prayerCard(g, slot, opt = {}) {
  const dow = weekday(g);
  let pool = slot === "morning" ? "morning" : "evening";
  let idx = toRD(g);
  if (slot === "evening" && dow === 5) { pool = "fridayEvening"; idx = Math.floor(toRD(g) / 7); }
  else if (slot === "evening" && dow === 6) { pool = "saturdayEvening"; idx = Math.floor(toRD(g) / 7); }
  const list = cards[pool];
  const c = list[idx % list.length];
  const reg = regById.get(c.registryId);
  let he = c.piece;
  const fv = cards.femaleVariants?.[c.id];
  if (fv && opt.voice === "f") he = he.replace(fv.from, fv.to);
  return {
    id: c.id, slot, pool, text: c.text, he, gloss: c.gloss, registryId: c.registryId,
    registryRef: reg?.ref ?? null, registryStatus: reg?.status ?? "unknown", draft: true, disclaimer: PRAYER_DISCLAIMER,
  };
}
