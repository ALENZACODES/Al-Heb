/**
 * "Add to Your Calendar" panel for the Calendar screen: daily morning and bedtime prayer reminders, the Torah verse of
 * the day and the Jewish holidays, each one tap away in Google Calendar, Apple Calendar or Outlook, or as a file.
 * Choices (times) are kept on this device under the store key `calendar.quickadd`.
 */
import {
  MORNING_TIMES, BEDTIME_TIMES, DEFAULT_MORNING, DEFAULT_BEDTIME, DAILY_PRAYERS, REMOVE_STEPS, ALERT_NOTES,
  prayerFeedPath, holidayFeedPath, torahFeedPath, siteUrl, isPublicHttps, subscribeLinks, prayerReminderICS, torahDailyICS, downloadText,
} from "./calendar.quickadd.js";

export const QUICKADD_KEY = "calendar.quickadd";
const HOLIDAY_NAMES = { reform: "ALEF Jewish Holidays (Reform)", traditional: "ALEF Jewish Holidays (Traditional)", israel: "ALEF Jewish Holidays (Israel)" };
const label12 = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };

export const ADDPANEL_CSS = `
.alef-add { border: 2px solid var(--gold, #c9a227); border-radius: var(--radius, 12px); padding: .9rem 1rem; display: grid; gap: .8rem; }
.alef-add h2 { margin: 0; }
.alef-add-row { display: grid; gap: .45rem; padding-block-end: .7rem; border-block-end: 1px solid var(--border, #ddd); }
.alef-add-row:last-of-type { border-block-end: 0; }
.alef-add-row h3 { margin: 0; font-size: 1.05rem; }
.alef-add-row .he { font-size: 1.25rem; }
.alef-add-btns { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.alef-add-btns a, .alef-add-btns button { min-block-size: 44px; display: inline-flex; align-items: center; padding: .35rem .8rem; border-radius: 999px; border: 1px solid var(--border, #bbb); background: var(--card, #fff); color: inherit; font: inherit; text-decoration: none; cursor: pointer; }
.alef-add-btns a:hover, .alef-add-btns button:hover { border-color: var(--gold, #c9a227); }
.alef-add-btns a[aria-disabled=true] { opacity: .45; pointer-events: none; }
.alef-add select { min-block-size: 44px; font: inherit; padding: .2rem .5rem; inline-size: auto; max-inline-size: 12rem; margin-inline-start: .4rem; }
.alef-add label { display: inline-flex; align-items: center; }
.alef-add .small { font-size: .9rem; margin: 0; }
`;

/**
 * @param {Function} el element factory (dom.js)
 * @param {{store?:any, observance?:string, heText?:Function, now?:()=>Date, holidayFile?:()=>{text:string,count:number}|null}} opt
 * @returns {HTMLElement}
 */
export function addToCalendarPanel(el, opt = {}) {
  const now = () => (typeof opt.now === "function" ? opt.now() : new Date());
  let choice = { morning: DEFAULT_MORNING, bedtime: DEFAULT_BEDTIME };
  try { const raw = opt.store?.get?.(QUICKADD_KEY); if (raw && typeof raw === "object") choice = { morning: MORNING_TIMES.includes(raw.morning) ? raw.morning : DEFAULT_MORNING, bedtime: BEDTIME_TIMES.includes(raw.bedtime) ? raw.bedtime : DEFAULT_BEDTIME }; } catch { /* defaults */ }
  const save = () => { try { opt.store?.set?.(QUICKADD_KEY, choice); } catch { /* best effort */ } };
  const status = el("p", { class: "small", role: "status", "aria-live": "polite" }, "");
  const box = el("section", { class: "alef-add", "aria-labelledby": "alef-add-h", id: "add-to-calendar" });
  try { if (typeof document !== "undefined" && typeof document.getElementById === "function" && !document.getElementById("alef-add-style")) document.head?.append?.(el("style", { id: "alef-add-style" }, ADDPANEL_CSS)); } catch { /* styles are optional */ }

  let publicSite = false; try { publicSite = isPublicHttps(siteUrl("x")); } catch { /* no location */ }
  const appUrl = (() => { try { return siteUrl("./"); } catch { return ""; } })();

  function buttons(feedPath, name, onDownload) {
    let url = null; try { url = siteUrl(feedPath); } catch { /* no location */ }
    const l = url ? subscribeLinks(url, name) : null;
    const link = (href, text, aria, ext) => el("a", { href: publicSite && l ? href : "#", "aria-label": aria, "aria-disabled": publicSite && l ? null : "true", ...(ext ? { target: "_blank", rel: "noopener" } : {}) }, text);
    return el("div", { class: "alef-add-btns" },
      link(l?.google, "Google Calendar", `Add ${name} to Google Calendar`, true),
      link(l?.apple, "Apple Calendar", `Add ${name} to Apple Calendar on iPhone, iPad or Mac`, false),
      link(l?.outlook, "Outlook", `Add ${name} to Outlook`, true),
      el("button", { type: "button", "aria-label": `Download file: ${name}, as a calendar file`, onclick: onDownload }, "Download file"));
  }
  const timeSelect = (slot, times) => el("label", {}, "Reminder time",
    el("select", { id: `alef-add-${slot}-time`, onchange: (e) => { choice = { ...choice, [slot]: e.target.value }; save(); draw(); status.textContent = `${slot === "morning" ? "Morning" : "Bedtime"} reminder set to ${label12(e.target.value)}. Tap a calendar button to add it.`; } },
      ...times.map((t) => el("option", { value: t, selected: choice[slot] === t ? "" : null }, label12(t)))));

  function prayerRow(slot, times) {
    const p = DAILY_PRAYERS[slot], t = choice[slot];
    const dl = () => {
      const ok = downloadText(prayerReminderICS(slot, t, { appUrl, now: now() }), `aleph-${slot}-${t.replace(":", "")}.ics`);
      status.textContent = ok ? `Downloaded. Open the file to add a daily ${label12(t)} reminder to your calendar.` : "This browser could not start the download.";
    };
    return el("div", { class: "alef-add-row" },
      el("h3", {}, slot === "morning" ? "Morning Prayer Every Day (Modeh Ani)" : "Bedtime Prayer Every Night (Shema)"),
      opt.heText ? opt.heText(p.he, "he") : null,
      el("p", { class: "small" }, el("i", {}, p.tr), " ", p.en),
      timeSelect(slot, times),
      buttons(prayerFeedPath(slot, t), `${p.calName} at ${label12(t)}`, dl));
  }

  function torahRow() {
    const dl = async () => {
      try {
        const res = await fetch(siteUrl("data/torah-quotes.json"));
        const quotes = (await res.json()).quotes;
        const d = now();
        const ok = downloadText(torahDailyICS(quotes, new Date(d.getFullYear(), d.getMonth(), d.getDate()), 365, { appUrl, now: d }), "aleph-torah-verse-daily.ics");
        status.textContent = ok ? "Downloaded a year of Torah verses. Open the file to add them to your calendar." : "This browser could not start the download.";
      } catch { status.textContent = "Could not load the Torah verses. Check your connection and try again."; }
    };
    return el("div", { class: "alef-add-row" }, el("h3", {}, "Torah Verse of the Day"),
      el("p", { class: "small" }, "One verse each morning in Hebrew, how to say it, the English and a short explanation. No alert, it simply sits on your calendar."),
      buttons(torahFeedPath(), "ALEF Torah Verse of the Day", dl));
  }

  function holidayRow() {
    const obs = opt.observance || "reform";
    const dl = () => {
      const f = opt.holidayFile ? opt.holidayFile() : null;
      if (!f) { status.textContent = "Nothing to download yet."; return; }
      const ok = downloadText(f.text, "aleph-jewish-holidays.ics");
      status.textContent = ok ? `Downloaded ${f.count} events. Open the file to add them to your calendar.` : "This browser could not start the download.";
    };
    return el("div", { class: "alef-add-row" }, el("h3", {}, "Jewish Holidays and Festivals"),
      el("p", { class: "small" }, `Every holiday and Rosh Chodesh through 2028, ${obs === "traditional" ? "with traditional two-day festivals" : obs === "israel" ? "on the Israel schedule" : "on the Reform schedule"} (change this in Settings below). Download file also adds candle lighting and havdalah for your city.`),
      buttons(holidayFeedPath(obs), HOLIDAY_NAMES[obs] || HOLIDAY_NAMES.reform, dl));
  }

  function draw() {
    box.replaceChildren(
      el("h2", { id: "alef-add-h" }, "Add to Your Calendar"),
      el("p", { class: "small" }, "One tap puts these on your phone or computer calendar, so they remind you even when ALEF is closed. Each one is its own calendar, so you can remove any of them later in one step."),
      publicSite ? null : el("p", { class: "small" }, "Calendar buttons work on the live site. Here, use Download file."),
      prayerRow("morning", MORNING_TIMES), prayerRow("bedtime", BEDTIME_TIMES), torahRow(), holidayRow(), status,
      el("details", {}, el("summary", {}, "Alerts not showing?"), ...ALERT_NOTES.map((n) => el("p", { class: "small" }, n))),
      el("details", {}, el("summary", {}, "How to Take a Reminder Off"),
        el("ul", {}, ...REMOVE_STEPS.map(([who, how]) => el("li", { class: "small" }, el("strong", {}, who + ": "), how)))));
  }
  draw();
  return box;
}
