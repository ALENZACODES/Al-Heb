/**
 * Optional local notifications (Lane 1). HONEST LIMITS:
 *  - They are scheduled with setTimeout inside the open page. If the app/tab is closed, the browser suspends the
 *    page, or the phone is locked and the page is frozen, they will NOT fire.
 *  - There is no server and no push, so nothing can wake the app in the background. For reminders that fire with the
 *    app closed, export the .ics file and import it into the phone's calendar (reminders.ics.js).
 *  - Notification permission must be requested from a user gesture (a button click); this module never asks by itself.
 * Everything is injectable (Notification, timers) so it is testable without a browser.
 */
import { itemStart, alarmTime } from "./reminders.js";

export const NOTIFY_HORIZON_MS = 24 * 3600 * 1000;

/** @returns {{supported:boolean, permission:"granted"|"denied"|"default"|"unsupported"}} */
export function notificationSupport(g = globalThis) {
  const N = g.Notification;
  if (!N) return { supported: false, permission: "unsupported" };
  return { supported: true, permission: N.permission || "default" };
}

/** Call from a click handler. Resolves to the resulting permission string. */
export async function requestNotificationPermission(g = globalThis) {
  const N = g.Notification;
  if (!N || typeof N.requestPermission !== "function") return "unsupported";
  try { return (await N.requestPermission()) || N.permission || "default"; } catch { return N.permission || "default"; }
}

/**
 * Schedule notifications for items whose alarm time falls in (now, now + horizon]. Items that are already past are
 * skipped (never fired late). Returns {count, cancel}.
 * @param {object[]} items from buildReminders().items
 * @param {{now?:Date, horizonMs?:number, Notification?:any, setTimer?:Function, clearTimer?:Function}} [opt]
 */
export function scheduleLocalNotifications(items, opt = {}) {
  const N = opt.Notification ?? globalThis.Notification;
  const set = opt.setTimer ?? globalThis.setTimeout.bind(globalThis);
  const clear = opt.clearTimer ?? globalThis.clearTimeout.bind(globalThis);
  const now = (opt.now ?? new Date()).getTime();
  const horizon = opt.horizonMs ?? NOTIFY_HORIZON_MS;
  const timers = [];
  if (!N || N.permission !== "granted") return { count: 0, cancel() {} };
  for (const it of items) {
    const at = alarmTime(it) ?? itemStart(it);
    const delay = at.getTime() - now;
    if (delay <= 0 || delay > horizon) continue;
    timers.push(set(() => {
      try { new N(it.title, { body: it.description.split("\n").filter(Boolean).slice(0, 3).join("\n"), tag: it.uid, lang: "en" }); } catch { /* some browsers need a service-worker registration; ignore */ }
    }, delay));
  }
  return { count: timers.length, cancel() { for (const t of timers) clear(t); timers.length = 0; } };
}
