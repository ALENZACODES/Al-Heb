// @ts-check
// Study reminder settings card (#/reminders). mount(root, ctx) => unmount, like src/sprint/.
// Shows: time, weekdays, Shabbat quiet toggle, permission button, "Send a test notification", and an honest status line.
// Prefs are stored under "notify.prefs" (src/shell/notify.js normalizePrefs). The timer only runs while this app is open,
// and the card says so. Tests inject ctx.notify (the notify module surface) and ctx.now.
import { el, storeGet, storeSet } from "../curriculum/dom.js";
import * as defaultNotify from "./notify.js";

const CSS = `
.alef-notify{max-inline-size:36rem;margin-inline:auto;overflow-wrap:anywhere}
.alef-notify *{box-sizing:border-box;max-inline-size:100%}
.alef-notify .nt-card{border:1px solid var(--border,#999);border-radius:12px;padding:1rem;background:var(--card,#fff);margin-block:1rem}
.alef-notify label{display:block;font-weight:600;margin-block:.75rem .25rem}
.alef-notify input[type=time]{font:inherit;min-block-size:var(--tap,48px);padding:.4rem .6rem;border:2px solid var(--border,#999);border-radius:8px;background:var(--card,#fff);color:inherit}
.alef-notify .nt-days{display:flex;flex-wrap:wrap;gap:.5rem;margin-block:.5rem}
.alef-notify .nt-days label{display:inline-flex;align-items:center;gap:.3rem;min-block-size:var(--tap,48px);padding:.2rem .6rem;border:2px solid var(--border,#999);border-radius:999px;margin:0;font-weight:500}
.alef-notify .nt-row{display:grid;gap:.5rem;margin-block:.75rem}
.alef-notify button.btn{min-block-size:var(--tap,48px);inline-size:100%;white-space:normal;text-align:center}
.alef-notify .nt-check{display:flex;align-items:center;gap:.5rem;font-weight:500}
.alef-notify .muted{color:var(--muted,#555);font-size:.9rem}
`;
function injectStyle() {
  try { if (!document.head || document.getElementById?.("alef-notify-style")) return; const s = document.createElement("style"); s.id = "alef-notify-style"; s.textContent = CSS; document.head.append(s); } catch { /* optional */ }
}
const focusNode = (n) => { try { n?.focus?.(); } catch { /* ignore */ } };
const pad2 = (n) => String(n).padStart(2, "0");
const fmtWhen = (d) => { try { return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(d); } catch { return d.toString(); } };

/** Focus the heading only if nothing else has focus yet: this runs after async loading, and must not pull focus back from a keyboard user who already moved on. */
function focusHeadingIfIdle(h1) {
  try { const a = globalThis.document?.activeElement; if (!a || a === globalThis.document.body || a === h1 || a.id === "main") h1?.focus?.(); } catch { /* ignore */ }
}
/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  injectStyle();
  /** @type {typeof defaultNotify} */
  const notify = ctx?.notify || defaultNotify;
  const now = ctx?.now || (() => new Date());
  const { NOTIFY_PREFS_KEY, DAY_NAMES } = notify;

  const wrap = el("section", { class: "alef-notify", "aria-labelledby": "view-title" });
  const h1 = el("h1", { id: "view-title", tabindex: "-1" }, "Study reminders");
  const body = el("div", { class: "nt-body" });
  const status = el("p", { class: "nt-status", role: "status", "aria-live": "polite" });
  wrap.append(h1, body, status);
  root.append(wrap);

  let alive = true, prefs = notify.normalizePrefs(null), loc = null, schedule = null;
  const say = (t) => { status.textContent = t; };
  const save = () => storeSet(ctx, NOTIFY_PREFS_KEY, prefs);

  // The schedule lives in notify.js (module state), so it keeps running after this card is unmounted.
  async function arm() {
    schedule = await notify.armFromPrefs(ctx, { now });
    renderNext();
  }

  function supportLine() {
    const st = notify.status();
    if (!st.supported) {
      if (st.ios && !st.standalone) return "This browser cannot show notifications here. On an iPhone or iPad, add ALEF to the Home Screen first (Share, then Add to Home Screen), then open it from there.";
      return "This browser does not support notifications. The calendar screen can export reminders to your phone's calendar instead.";
    }
    if (st.permission === "denied") return "Notifications are blocked for this site in the browser's settings. Allow them there, then come back.";
    if (st.permission !== "granted") return "Notifications are not allowed yet. Tap \"Allow notifications\" below.";
    return "Reminders fire only while ALEF is open in this browser (an open tab, or the installed app in the foreground). Nothing can wake it when it is closed; for that, import the calendar's reminder file into your phone's calendar.";
  }

  function render() {
    if (!alive) return;
    const st = notify.status();
    const canUse = st.supported && st.permission === "granted";

    const time = el("input", { type: "time", id: "nt-time", name: "time", value: `${pad2(prefs.hour)}:${pad2(prefs.minute)}`, step: "60",
      onchange: async (e) => {
        const m = /^(\d{2}):(\d{2})$/.exec(e.target.value || "");
        if (!m) { e.target.setAttribute("aria-invalid", "true"); return; }
        e.target.removeAttribute("aria-invalid");
        prefs = notify.normalizePrefs({ ...prefs, hour: Number(m[1]), minute: Number(m[2]) }); await save(); await arm();
      } });

    const days = el("div", { class: "nt-days", role: "group", "aria-label": "Days of the week" });
    DAY_NAMES.forEach((name, i) => {
      const id = `nt-day-${i}`;
      const cb = el("input", { type: "checkbox", id, name: "day", value: String(i), checked: prefs.days.includes(i) ? true : null,
        onchange: async (e) => {
          const set = new Set(prefs.days); if (e.target.checked) set.add(i); else set.delete(i);
          prefs = notify.normalizePrefs({ ...prefs, days: [...set] }); await save(); await arm();
          if (!prefs.days.length) say("No days chosen, so no reminder will be sent.");
        } });
      days.append(el("label", { for: id }, cb, name));
    });

    const quiet = el("input", { type: "checkbox", id: "nt-quiet", checked: prefs.shabbatQuiet ? true : null,
      onchange: async (e) => { prefs = notify.normalizePrefs({ ...prefs, shabbatQuiet: e.target.checked }); await save(); await arm(); } });
    const yt = el("input", { type: "checkbox", id: "nt-yomtov", checked: prefs.yomTovQuiet ? true : null,
      onchange: async (e) => { prefs = notify.normalizePrefs({ ...prefs, yomTovQuiet: e.target.checked }); await save(); await arm(); } });
    const quietNote = loc
      ? `Quiet from candle lighting to havdalah in ${loc.name} (${loc.candleMinutes} minutes before Friday sunset, until ${loc.havdalah?.mode === "minutes" ? `${loc.havdalah.minutes} minutes after Saturday sunset` : `the sun is ${loc.havdalah?.degrees ?? 8.5} degrees below the horizon on Saturday`}). Change the city on the Calendar screen.`
      : "No city is set, so Shabbat quiet hours cannot be computed. Pick a city on the Calendar screen; until then reminders are not held back on Shabbat.";

    const enable = el("input", { type: "checkbox", id: "nt-enabled", checked: prefs.enabled ? true : null, disabled: canUse ? null : true,
      onchange: async (e) => { prefs = notify.normalizePrefs({ ...prefs, enabled: e.target.checked }); await save(); await arm(); say(prefs.enabled ? "Reminders on, while ALEF is open." : "Reminders off."); } });

    const permBtn = el("button", { type: "button", class: "btn", id: "nt-allow", disabled: st.supported && st.permission === "default" ? null : true, onclick: async () => {
      const p = await notify.requestPermission();
      if (p === "granted") { prefs = notify.normalizePrefs({ ...prefs, enabled: true }); await save(); say("Notifications allowed. Reminders are on while ALEF is open."); }
      else say(p === "denied" ? "The browser refused. Notifications stay off." : `Notifications not enabled (permission: ${p}).`);
      await arm(); render();
    } }, "Allow notifications");

    const testBtn = el("button", { type: "button", class: "btn secondary", id: "nt-test", disabled: canUse ? null : true, onclick: async () => {
      const r = await notify.showNow("ALEF test reminder", "This is what a study reminder looks like.", { route: "#/reminders", tag: "alef-test" });
      say(r.ok ? "Test notification sent. If you did not see it, check the system's notification settings for this browser." : `Could not show a notification (${r.reason}).`);
    } }, "Send a test notification");

    body.replaceChildren(
      el("p", {}, "One short nudge a day at the time you choose. Pick the days too."),
      el("div", { class: "nt-card" },
        el("p", { class: "muted", id: "nt-support" }, supportLine()),
        el("div", { class: "nt-row" }, permBtn),
        el("label", { class: "nt-check", for: "nt-enabled" }, enable, "Remind me to study"),
        el("label", { for: "nt-time" }, "Time"), time,
        el("p", { class: "muted" }, "Days"), days,
        el("label", { class: "nt-check", for: "nt-quiet" }, quiet, "Keep Shabbat quiet"),
        el("p", { class: "muted", id: "nt-quiet-note" }, quietNote),
        el("label", { class: "nt-check", for: "nt-yomtov" }, yt, "Keep festivals quiet"),
        el("p", { class: "muted", id: "nt-yomtov-note" }, `Also quiet on Rosh Hashanah, Yom Kippur, the first day of Sukkot, Shemini Atzeret, the first and last days of Pesach, and Shavuot, from the evening before until nightfall. Days follow the observance chosen on the Calendar screen (${loc?.observance === "traditional" ? "traditional, two days where that applies" : loc?.observance === "israel" ? "Israel" : "Reform, one day"}). Chol HaMoed, Hanukkah, Purim and fast days are not quiet.`),
        el("p", { class: "muted", id: "nt-next" }),
        el("div", { class: "nt-row" }, testBtn)),
      el("p", { class: "muted" }, "Prayer-time, candle-lighting and holiday reminders live on the Calendar screen; this card is only the daily study nudge."),
    );
    renderNext();
  }

  function renderNext() {
    const n = body.querySelector?.("#nt-next"); if (!n) return;
    if (!prefs.enabled) { n.textContent = "Reminders are off."; return; }
    const st = notify.status();
    if (!st.supported || st.permission !== "granted") { n.textContent = "Reminders will start once notifications are allowed."; return; }
    const next = schedule?.ok ? schedule.next : null;
    n.textContent = next ? `Next reminder: ${fmtWhen(next)} (if ALEF is still open then).` : (prefs.days.length ? "No reminder in the next two weeks (every chosen time falls in quiet hours)." : "No days chosen.");
  }

  async function init() {
    prefs = notify.normalizePrefs(await storeGet(ctx, NOTIFY_PREFS_KEY, null));
    loc = await notify.resolveQuietLocation(ctx);
    if (!alive) return;
    await arm(); render();
    focusHeadingIfIdle(h1);
  }

  init();
  return () => { alive = false; }; // the schedule is deliberately left running
}
