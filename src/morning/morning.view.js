/**
 * Morning route (#/morning) and reusable streak widgets. ALL COPY IS DRAFT: John decides final wording and art.
 * mount(root, ctx) -> unmount. ctx: { store, settings, audio?, now?() }. No network except two same-origin JSON files.
 */
import { el, heText } from "../curriculum/dom.js";
import { streakVisible } from "../shell/comfort.js";
import { createMorningModel } from "./model.js";
import { verseFor, modehAniFor, MODEH_ANI_ID, checkVerses, VERSES_URL } from "./verses.js";
import { morningItems, TITLE } from "./plan.js";
import { uiEnglish } from "../shell/names.js";
import { notificationSupport, requestNotificationPermission, scheduleLocalNotifications } from "../curriculum/reminders.notify.js";
import { clock } from "../curriculum/streak.js";
import { audioButton } from "../shell/audio-access.js";

export const MORNING_CSS = `
.mrn { display: grid; gap: 1rem; } .mrn * { min-inline-size: 0; overflow-wrap: anywhere; }
.mrn section { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: .75rem 1rem; }
.mrn .mrn-he { font-size: 1.6rem; line-height: 1.7; display: block; } .mrn .mrn-ref { color: var(--muted, inherit); font-size: .9rem; }
.mrn .mrn-tr { font-style: italic; margin: .3rem 0 .2rem; } .mrn .mrn-en { margin: .2rem 0; }
.mrn .mrn-line { display: grid; gap: .1rem; }
.mrn-streak { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; }
.mrn-flame { inline-size: 2rem; block-size: 2rem; } .mrn-count { font-size: 2rem; font-weight: 700; }
.mrn-ring { inline-size: 3.2rem; block-size: 3.2rem; transform: rotate(-90deg); }
.mrn-ring circle { fill: none; stroke-width: 4; } .mrn-ring .bg { stroke: var(--border, #ccc); } .mrn-ring .fg { stroke: currentColor; stroke-linecap: round; }
.mrn-strip { display: flex; gap: .4rem; list-style: none; padding: 0; margin: .5rem 0 0; }
.mrn-strip li { text-align: center; min-inline-size: 2.2rem; } .mrn-strip .g { display: block; font-size: 1.2rem; }
.mrn-flag { font-size: .85rem; font-style: italic; }
.mrn label { display: inline-flex; align-items: center; gap: .4rem; min-block-size: var(--tap, 48px); }
.mrn input[type=time] { min-block-size: var(--tap, 48px); min-inline-size: 8rem; padding: .4rem .6rem; font: inherit; box-sizing: border-box; }
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
  const msg = p.restToday ? "Resting today. A rest day never breaks your streak."
    : p.broken ? "New streak starts today. One day at a time." : null;
  return el("div", { class: "mrn-streak", role: "group", "aria-label": "Streak" },
    flame(), el("span", { class: "mrn-count", "aria-label": `${p.count} day streak` }, String(p.count)), el("span", {}, p.count === 1 ? "day" : "days"),
    ring(sec, p.goal), el("span", { role: "status" }, label),
    el("ul", { class: "mrn-strip", "aria-label": "Last 7 days" }, ...strip.map((d) => {
      const [g, name] = GLYPH[d.state];
      return el("li", { "aria-label": `${DAY[d.weekday]}: ${name}` }, el("span", { class: "g", "aria-hidden": "true" }, g), DAY[d.weekday]);
    })),
    msg ? el("p", { class: "mrn-flag" }, msg) : null);
}
async function getJson(path) { const res = await fetch(new URL(path, import.meta.url)); if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`); return res.json(); }

export async function mount(root, ctx) {
  ensureCss();
  const now = () => (typeof ctx.now === "function" ? ctx.now() : new Date());
  const model = createMorningModel(ctx.store, now);
  const wrap = el("div", { class: "mrn" });
  root.replaceChildren(el("h1", { id: "view-title", tabindex: "-1" }, uiEnglish(ctx, TITLE)), wrap);
  let verses = [], registry = [], problem = null;
  try { verses = await getJson("../../data/morning-verses.json"); } catch (e) { problem = String(e.message || e); }
  try { registry = (await getJson("../../data/corpus/registry.json")).entries || []; } catch { /* Modeh Ani block is skipped */ }
  if (verses.length && checkVerses(verses).length) { problem = "morning verses failed validation"; verses = []; }
  let timers = { cancel() {} };
  const render = () => {
    const prefs = model.prefs(), voice = ctx.settings && ctx.settings.get ? ctx.settings.get("voice") : "m";
    const v = verses.length ? verseFor(verses, now()) : null;
    const modeh = modehAniFor(registry, voice);
    const settings = settingsForm(model, ctx, () => { schedule(); render(); });
    wrap.replaceChildren(
      
      v ? el("section", { "aria-labelledby": "mrn-vh" }, el("h2", { id: "mrn-vh" }, "Today's verse"), hebrewLine(v.hebrew, v.tr, v.english_jps1917), el("p", { class: "mrn-ref" }, v.source_ref, " (JPS 1917)"))
        : el("section", {}, el("p", {}, problem ? "Today's verse is unavailable right now." : "Loading...")),
      modeh ? el("section", { "aria-labelledby": "mrn-mh" }, el("h2", { id: "mrn-mh" }, "Modeh Ani"), hebrewLine(modeh.he, modeh.tr, modeh.english),
        modeh.needsCheck ? el("p", { class: "mrn-flag" }, "The feminine form is derived and not yet checked by a Hebrew educator.") : null,
        audioButton(el, ctx, { kind: "line", id: MODEH_ANI_ID, text: modeh.he, label: "Play", class: "btn alef-play" })) : null,
      streakVisible(ctx) ? el("section", { "aria-labelledby": "mrn-sh" }, el("h2", { id: "mrn-sh" }, "Your streak"), streakPanel(model)) : null,
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

/** Hebrew / how to say it / what it says, the same three-line layout as the opening prayer. */
function hebrewLine(he, tr, en) {
  return el("div", { class: "mrn-line" }, heText(he, "mrn-he"), tr ? el("p", { class: "mrn-tr", lang: "he-Latn" }, tr) : null, en ? el("p", { class: "mrn-en", lang: "en" }, en) : null);
}

function settingsForm(model, ctx, changed) {
  const prefs = model.prefs(), sup = notificationSupport();
  const on = el("input", { type: "checkbox", id: "mrn-on", checked: prefs.on ? "" : null, onchange: (e) => { model.setPrefs({ on: e.target.checked }); changed(); } });
  const time = el("input", { type: "time", id: "mrn-time", value: prefs.time, onchange: (e) => { model.setPrefs({ time: e.target.value }); changed(); } });
  const obs = el("input", { type: "checkbox", id: "mrn-obs", checked: model.observant() ? "" : null, onchange: (e) => { model.setPrefs({ observant: e.target.checked }); changed(); } });
  const frz = el("input", { type: "checkbox", id: "mrn-frz", checked: model.freeze() ? "" : null, onchange: (e) => { model.setPrefs({ freeze: e.target.checked }); changed(); } });
  const erev = el("input", { type: "time", id: "mrn-erev", value: prefs.eravLatest, onchange: (e) => { model.setPrefs({ eravLatest: e.target.value }); changed(); } });
  const status = el("p", { role: "status", class: "mrn-flag" }, sup.supported ? (sup.permission === "denied" ? "Notifications are blocked; you will see a banner when you open ALEF instead." : "") : "This browser has no notifications; you will see a banner when you open ALEF instead.");
  return el("section", { "aria-labelledby": "mrn-set" }, el("h2", { id: "mrn-set" }, "Reminder and streak settings"),
    el("p", { class: "small" }, "Reminders fire only while ALEF is open; there is no server."),
    el("p", {}, el("label", {}, on, " Morning reminder"), " ", el("label", {}, "at ", time)),
    sup.supported && sup.permission === "default" ? el("button", { type: "button", class: "btn secondary", onclick: async () => { const r = await requestNotificationPermission(); status.textContent = r === "granted" ? "Notifications on while ALEF is open." : "No notifications; the in-app banner will be used."; changed(); } }, "Allow notifications") : null,
    status,
    el("p", {}, el("label", {}, obs, " Observant mode: no reminders on Shabbat or festivals; a reminder before sundown on the eve instead")),
    el("p", {}, el("label", {}, frz, " Streak rests on Shabbat and festival days")),
    el("p", { class: "small" }, model.freeze()
      ? "Shabbat and festival days are rest days: they never add to your streak and never break it. You can also take any other day as a rest day on the Progress screen."
      : "With this box off, a Saturday or festival you do not study counts as a missed day. Turn it on and those days become rest days that neither add to nor break your streak. You can also take any other day as a rest day on the Progress screen."),
    model.observant() ? el("p", {}, el("label", {}, "Latest time for the reminder on the eve of Shabbat or a festival ", erev)) : null,
    model.observant() ? el("p", { class: "small" }, "The eve reminder is sent at your chosen time or at this time, whichever is earlier. The default is early so it arrives well before candle lighting; candle lighting depends on your city and the season, so check it against your local time.") : null);
}
