/**
 * Per-word transliteration fading (concept gr-fsi-01), pure logic.
 * Stored per word card under SCAFFOLD_KEY: { [cardId]: { level:0-3, pinned:boolean, advancedOn:"YYYY-MM-DD"|null } }.
 * level 0 = Latin letters shown, 1 = shown faintly, 2 = shown on tap, 3 = hidden. A higher level means LESS help.
 * The level follows that word's SRS stability, not the lesson number, and is updated only by review outcomes:
 *   - rating 1 (Again): one step back toward more help (level - 1, not below 0)
 *   - rating 2 (Hard): unchanged
 *   - rating 3/4 (Good/Easy): at most ONE step toward less help, at most once per calendar day, and only when the card's
 *     stability has reached the threshold for the next level (MIN_STABILITY, hand-chosen, not fitted to data).
 * A pinned word always shows the full transliteration (effective level 0) but its stored level keeps evolving.
 */
import { dayKey } from "./progress.js";

export const SCAFFOLD_KEY = "curriculum.scaffold";
export const MAX_LEVEL = 3;
/** Stability (days) a card needs before its transliteration may fade to this level. */
export const MIN_STABILITY = [0, 2.5, 6, 14];
export const LEVEL_NAMES = ["Shown", "Faint", "On tap", "Hidden"];

/** A fresh word starts at level 0 ("full") or 1 ("faint") depending on the setting `scaffoldStart`. */
export const startLevel = (start) => (start === "faint" ? 1 : 0);

/** Highest level whose stability threshold is met. */
export function levelForStability(stability) {
  let lv = 0;
  for (let i = 1; i <= MAX_LEVEL; i++) if (stability >= MIN_STABILITY[i]) lv = i;
  return lv;
}

/**
 * @param {{level:number,pinned:boolean,advancedOn:string|null}|undefined} entry
 * @param {{rating:1|2|3|4, stability:number, now:number|Date, start?:"full"|"faint"}} o
 */
export function nextScaffold(entry, { rating, stability, now, start = "full" }) {
  const cur = { level: startLevel(start), pinned: false, advancedOn: null, ...(entry || {}) };
  cur.level = Math.max(0, Math.min(MAX_LEVEL, cur.level));
  const today = dayKey(now);
  if (rating === 1) return { ...cur, level: Math.max(0, cur.level - 1) };
  if (rating >= 3 && cur.level < MAX_LEVEL && cur.advancedOn !== today && levelForStability(stability) > cur.level) {
    return { ...cur, level: cur.level + 1, advancedOn: today };
  }
  return cur;
}

/** The level to DISPLAY for an entry (pinned => 0). */
export const effectiveLevel = (entry, start = "full") => (entry?.pinned ? 0 : Math.max(0, Math.min(MAX_LEVEL, entry?.level ?? startLevel(start))));
