/**
 * Morning route (#/morning) and reusable streak widgets. ALL COPY IS DRAFT: John decides final wording and art.
 * mount(root, ctx) -> unmount. ctx: { store, settings, audio?, now?() }. No network except two same-origin JSON files.
 */
import { el, heText } from "../curriculum/dom.js";
import { createMorningModel } from "./model.js";
import { verseFor, modehAniFor, modehAniClip, checkVerses, VERSES_URL } from "./verses.js";
import { morningItems, TITLE } from "./plan.js";
import { notificationSupport, requestNotificationPermission, scheduleLocalNotifications } from "../curriculum/reminders.notify.js";
import { clock } from "../curriculum/streak.js";

export const MORNING_CSS = `
.mrn { display: grid; gap: 1rem; } .mrn * { min-inline-size: 0; overflow-wrap: anywhere; }
.mrn section { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: .75rem 1rem; }
.mrn .mrn-he { font-size: 1.6rem; line-height: 1.7; } .mrn .mrn-ref { color: var(--muted, inherit); font-size: .9rem; }
.mrn-streak { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; }
.mrn-flame { inline-size: 2rem; block-size: 2rem; } .mrn-count { font-size: 2rem; font-weight: 700; }
.mrn-ring { inline-size: 3.2rem; block-size: 3.2rem; transform: rotate(-90deg); }
.mrn-ring circle { fill: none; stroke-width: 4; } .mrn-ring .bg { stroke: var(--border, #ccc); } .mrn-ring .fg { stroke: currentColor; stroke-linecap: round; }
.mrn-strip { display: flex; gap: .4rem; list-style: none; padding: 0; margin: .5rem 0 0; }
.mrn-strip li { text-align: center; min-inline-size: 2.2rem; } .mrn-strip .g { display: block; font-size: 1.2rem; }
.mrn-banner { border: 1px solid var(--border); border-radius: var(--radius); padding: .5rem .8rem; }
.mrn-flag { font-size: .85rem; font-style: italic; }
`;
function ensureCss() { if (typeof document !== "undefined" && !document.getElementById("alef-mrn-style")) document.head.append(el("style", { id: "alef-mrn-style" }, MORNING_CSS)); }

const svgNS = "http://www.w3.org/2000/svg";
function svg(tag, attrs = {}, ...kids) { const n = document.createElementNS(svgNS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); for (const c of kids) n.append(c); return n; }
const flame = () => svg("svg", { class: "mrn-flame", viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" }, svg("path", { fill: "currentColor", d: "M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3-1-4 0-7 1-10z" }));
function ring(sec, goal) {
  const r = 20, c = 2 * Math.PI * r, frac = Math.min(1, sec / goal);
  return svg("svg", { class: "mrn-ring", viewBox: "0 0 48 48", "aria-hidden": "true", focusable: "false" },
    svg("circle", { class: "bg", cx: 24, cy: 24, r }), svg("circle", { class: "fg", cx: 24, cy: 24, r, "stroke-dasharray": `${(c * frac).toFixed(1)} ${c.toFixed(1)}` }));
}
const GLYPH = { done: ["✓", "done"], frozen: ["❄", "resting (Shabbat or festival)"], today: ["·", "today, not yet done"], open: ["·", "no activity"] };
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Flame + count + progress ring + "3:20 of 5:00 today" + 7-day strip + break/rest messages. Returns a node; call again to refresh. */
export function streakPanel(model) {
  const p = model.project(), strip = model.strip();
  const sec = Math.min(p.todaySeconds, p.goal);
  const label = p.activeToday ? "Today is done" : p.restToday ? "Resting today" : `${clock(sec)} of ${clock(p.goal)} today`;
  const msg = p.restToday ? "Your streak rests when you do. Shabbat and festival days never break an ALEF streak. (draft)"
    : p.broken ? "New streak starts today. One day at a time. (draft)" : null;
  return el("div", { class: "mrn-streak", role: "group", "aria-label": "Streak" },
    flame(), el("span", { class: "mrn-count", "aria-label": `${p.count} day streak` }, String(p.count)), el("span", {}, p.count === 1 ? "day" : "days"),
    ring(sec, p.goal), el("span", { role: "status" }, label),
    el("ul", { class: "mrn-strip", "aria-label": "Last 7 days" }, ...strip.map((d) => {
      const [g, name] = GLYPH[d.state];
      return el("li", { "aria-label": `${DAY[d.weekday]}: ${name}` }, el("span", { class: "g", "aria-hidden": "true" }, g), DAY[d.weekday]);
    })),
    msg ? el("p", { class: "mrn-flag" }, msg) : null);
}
/** Evening rescue banner node, or null. Marks the evening as shown so it appears once. */
export function rescueBanner(model) {
  const r = model.rescue();
  if (!r.banner) return null;
  model.markRescueShown();
  return el("div", { class: "mrn-banner", role: "status" }, r.text, " ", el("a", { class: "btn", href: "#/learn?review=1" }, "Start a review"), " ", el("span", { class: "mrn-flag" }, "(draft)"));
}

async function getJson(path) { const res = await fetch(new URL(path, import.meta.url)); if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`); return res.json(); }

export async function mount(root, ctx) {
  ensureCss();
  const now = () => (typeof ctx.now === "function" ? ctx.now() : new Date());
  const model = createMorningModel(ctx.store, now);
  const wrap = el("div", { class: "mrn" });
  root.replaceChildren(el("h1", { id: "view-title", tabindex: "-1" }, TITLE), wrap);
  let verses = [], registry = [], problem = null;
  try { verses = await getJson("../../data/morning-verses.json"); } catch (e) { problem = String(e.message || e); }
  try { registry = (await getJson("../../data/corpus/registry.json")).entries || []; } catch { /* Modeh Ani block is skipped */ }
  if (verses.length && checkVerses(verses).length) { problem = "morning verses failed validation"; verses = []; }
  let translit = null; // optional lane-3 engine; the block simply omits the line if it is absent
  try { const m = await import("../pronunciation/transliterate.js"); if (typeof m.transliterate === "function") translit = m.transliterate; } catch { /* absent */ }
  let timers = { cancel() {} };
  const render = () => {
    const prefs = model.prefs(), voice = ctx.settings && ctx.settings.get ? ctx.settings.get("voice") : "m";
    const v = verses.length ? verseFor(verses, now()) : null;
    const modeh = modehAniFor(registry, voice), clip = modeh && modehAniClip(ctx.audio);
    const settings = settingsForm(model, ctx, () => { schedule(); render(); });
    wrap.replaceChildren(
      el("p", { class: "mrn-flag", role: "note" }, "Draft wording and layout; final text to be approved."),
      v ? el("section", { "aria-labelledby": "mrn-vh" }, el("h2", { id: "mrn-vh" }, "Today's verse"), heText(v.hebrew, "mrn-he"), el("p", { lang: "en" }, v.english_jps1917), el("p", { class: "mrn-ref" }, v.source_ref, " (JPS 1917)"))
        : el("section", {}, el("p", {}, problem ? "Today's verse is unavailable right now." : "Loading...")),
      modeh ? el("section", { "aria-labelledby": "mrn-mh" }, el("h2", { id: "mrn-mh" }, "Modeh Ani"), heText(modeh.he, "mrn-he"), translitLine(translit, modeh.he, ctx), el("p", {}, modeh.english),
        modeh.needsCheck ? el("p", { class: "mrn-flag" }, "The feminine form is derived and not yet checked by a Hebrew educator.") : null,
        clip ? el("button", { type: "button", class: "btn", onclick: () => ctx.audio.play("line", "modeh-ani-1") }, "Play") : null) : null,
      el("section", { "aria-labelledby": "mrn-sh" }, el("h2", { id: "mrn-sh" }, "Your streak"), streakPanel(model)),
      settings);
    model.markSeen();
  };
  function schedule() {
    timers.cancel();
    const prefs = model.prefs(); if (!prefs.on || !verses.length) return;
    const N = globalThis.Notification;
    const Tap = N ? class extends N { constructor(t, o) { super(t, o); this.onclick = () => { try { globalThis.focus(); globalThis.location.hash = "#/morning"; } catch { /* ignore */ } }; } } : undefined;
    const d = now(), iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    timers = scheduleLocalNotifications(morningItems(iso, 2, prefs, verses, { observant: model.observant(), mode: model.mode() }), { now: d, Notification: Tap });
  }
  render(); schedule();
  return () => timers.cancel();
}

function translitLine(fn, he, ctx) {
  if (!fn) return null;
  try { const tr = fn(he, { scheme: "siddur", tradition: (ctx.settings && ctx.settings.get && ctx.settings.get("congregation")) || "sephardi" }); return tr ? el("p", { class: "mrn-ref", lang: "en" }, tr) : null; } catch { return null; }
}

function settingsForm(model, ctx, changed) {
  const prefs = model.prefs(), sup = notificationSupport();
  const on = el("input", { type: "checkbox", id: "mrn-on", checked: prefs.on ? "" : null, onchange: (e) => { model.setPrefs({ on: e.target.checked }); changed(); } });
  const time = el("input", { type: "time", id: "mrn-time", value: prefs.time, onchange: (e) => { model.setPrefs({ time: e.target.value }); changed(); } });
  const obs = el("input", { type: "checkbox", id: "mrn-obs", checked: model.observant() ? "" : null, onchange: (e) => { model.setPrefs({ observant: e.target.checked }); changed(); } });
  const frz = el("input", { type: "checkbox", id: "mrn-frz", checked: model.freeze() ? "" : null, onchange: (e) => { model.setPrefs({ freeze: e.target.checked }); changed(); } });
  const res = el("input", { type: "time", id: "mrn-res", value: prefs.rescueTime, onchange: (e) => { model.setPrefs({ rescueTime: e.target.value }); changed(); } });
  const status = el("p", { role: "status", class: "mrn-flag" }, sup.supported ? (sup.permission === "denied" ? "Notifications are blocked; you will see a banner when you open ALEF instead." : "") : "This browser has no notifications; you will see a banner when you open ALEF instead.");
  return el("section", { "aria-labelledby": "mrn-set" }, el("h2", { id: "mrn-set" }, "Reminder and streak settings"),
    el("p", { class: "small" }, "Reminders fire only while ALEF is open; there is no server. (draft)"),
    el("p", {}, el("label", {}, on, " Morning reminder"), " ", el("label", {}, "at ", time)),
    sup.supported && sup.permission === "default" ? el("button", { type: "button", class: "btn secondary", onclick: async () => { const r = await requestNotificationPermission(); status.textContent = r === "granted" ? "Notifications on while ALEF is open." : "No notifications; the in-app banner will be used."; changed(); } }, "Allow notifications") : null,
    status,
    el("p", {}, el("label", {}, obs, " Observant mode: no reminders on Shabbat or festivals; a reminder before sundown on the eve instead")),
    el("p", {}, el("label", {}, frz, " Streak rests on Shabbat and festival days")),
    el("p", { class: "small" }, "Your streak rests when you do. Shabbat and festival days never break an ALEF streak. Reddit and Duolingo do not do this. (draft)"),
    el("p", {}, el("label", {}, "Evening nudge at ", res)));
}
