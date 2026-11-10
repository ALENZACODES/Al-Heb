/**
 * Streak nudge: a small, friendly banner, at most once a day, when the learner has a streak going and has not studied
 * yet today. Never on a rest day (Shabbat or a festival in observant mode, or a day the learner took off).
 * The banner is in-app only. The same line goes into the daily calendar reminders (calendar.quickadd.js).
 */
import { projectStreak, dayKey, isRestDay } from "../curriculum/streak.js";
/** The encouragement line, shared with the calendar reminders (calendar.quickadd.js re-exports it). */
export const STREAK_LINE = "Please keep your streak going. You're doing awesome!";

export const NUDGE_DELAY_MS = 4000;

/** @returns {{show:boolean, count:number}} */
export function nudgeDue(now, record, prefs, { observant = false, mode = "reform", extraRest } = {}) {
  const p = projectStreak(record, now, extraRest);
  const today = dayKey(now), d = new Date(now), m = d.getHours() * 60 + d.getMinutes();
  const rest = isRestDay(today, mode) || (d.getDay() === 5 && m >= 1080); // quiet from Friday 18:00, all Saturday, and on Yom Tov, for everyone
  const show = p.count > 0 && !p.activeToday && !p.restToday && prefs.lastRescue !== today && !rest;
  return { show, count: p.count };
}

export function nudgeText(count) {
  return `${STREAK_LINE} ${count === 1 ? "1 day" : `${count} days`} so far. Five minutes today keeps it going.`;
}

/** Shows the banner. Returns the node (or null when there is no document). */
export function showNudge(doc, count, { onStudy, onLater } = {}) {
  if (!doc?.body || doc.getElementById("streak-nudge")) return null;
  const box = doc.createElement("div");
  box.id = "streak-nudge"; box.setAttribute("role", "status"); box.setAttribute("aria-live", "polite");
  box.style.cssText = "position:fixed;inset-inline:1rem;inset-block-end:5.5rem;z-index:50;max-inline-size:34rem;margin-inline:auto;padding:.8rem 1rem;border-radius:14px;background:#123d2a;color:#f5e6b8;border:2px solid #c9a227;box-shadow:0 6px 24px rgba(0,0,0,.3);display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;";
  const pic = doc.createElement("img"); pic.src = new URL("../../assets/img/gen/MASCOT_rimon.800.webp", import.meta.url).href; pic.alt = ""; pic.width = 56; pic.height = 56;
  pic.style.cssText = "inline-size:56px;block-size:56px;object-fit:contain;flex:0 0 auto;";
  const p = doc.createElement("p"); p.style.margin = "0"; p.style.flex = "1 1 14rem"; p.textContent = "Rimon says: " + nudgeText(count);
  const go = doc.createElement("a"); go.href = "#/learn"; go.textContent = "Study now"; go.className = "btn";
  go.style.cssText = "min-block-size:44px;display:inline-flex;align-items:center;padding:.3rem .9rem;border-radius:999px;background:#c9a227;color:#123d2a;font-weight:700;text-decoration:none;";
  const later = doc.createElement("button"); later.type = "button"; later.textContent = "Later";
  later.style.cssText = "min-block-size:44px;padding:.3rem .9rem;border-radius:999px;background:transparent;color:inherit;border:1px solid #c9a227;font:inherit;cursor:pointer;";
  const close = () => { box.remove(); };
  go.addEventListener("click", () => { close(); onStudy?.(); });
  later.addEventListener("click", () => { close(); onLater?.(); });
  box.append(pic, p, go, later);
  doc.body.append(box);
  return box;
}
