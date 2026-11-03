/**
 * Calendar / daily-prompt view (Lane 1). mount(root, ctx) -> unmount.
 * ctx.settings.location (optional): {lat, lon, tz?: IANA zone, offsetMinutes?: number}. lon is east-positive.
 * If absent, no candle-lighting time is invented; the view asks for a location instead.
 * ctx.now (optional function returning Date) is used for testing; default new Date().
 * Location permission/geolocation prompts are NOT requested here; lane 8's settings should supply coordinates.
 */
import { nextHolidays, holidaysBetween, candleLighting, formatTime, isoDate, toHebrew, HEBREW_MONTH_NAMES, DEFAULT_CANDLE_OFFSET_MIN, JERUSALEM_CANDLE_OFFSET_MIN } from "./calendar.js";
import { dailyPrompt } from "./prompts.js";
import { el, heText, tr, storeGet, PROGRESS_KEY } from "./dom.js";

export function mount(root, ctx) {
  let alive = true;
  const wrap = el("section", { class: "alef-calendar", "aria-labelledby": "alef-cal-h" });
  root.append(wrap);

  async function render() {
    const now = (ctx && typeof ctx.now === "function" ? ctx.now() : new Date());
    const loc = ctx?.settings?.location;
    const tz = loc?.tz;
    const g = tz ? zonedYMD(now, tz) : { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
    const hour = tz ? Number(formatTime(now, tz).slice(0, 2)) : now.getHours();
    const progress = await storeGet(ctx, PROGRESS_KEY, { completed: {} });
    if (!alive) return;
    const done = new Set(Object.keys(progress.completed || {}));
    const heb = toHebrew(g);
    const slot = hour >= 16 ? "evening" : "morning";
    const todayIds = holidaysBetween(isoDate(g), isoDate(g)).map((h) => h.id);
    const prompt = dailyPrompt(g, slot, { completedLessons: done, voice: ctx?.settings?.voice, holidayIds: todayIds });
    const hols = nextHolidays(isoDate(g), 3);

    const candle = loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lon)
      ? candleLighting(g, { lat: loc.lat, lon: loc.lon, offsetMinutes: loc.offsetMinutes ?? (isJerusalem(loc) ? JERUSALEM_CANDLE_OFFSET_MIN : DEFAULT_CANDLE_OFFSET_MIN) })
      : null;

    wrap.replaceChildren(
      el("h1", { id: "alef-cal-h", class: "alef-h" }, tr(ctx, "cal.title", "Calendar")),
      el("p", { class: "alef-hebdate" }, `${heb.day} ${HEBREW_MONTH_NAMES[heb.month].en} ${heb.year}`, " ", heText(HEBREW_MONTH_NAMES[heb.month].he)),
      el("h2", {}, tr(ctx, "cal.candles", "Shabbat candle lighting")),
      candle
        ? el("p", { class: "alef-candles" }, `${isoDate(candle.date)}: ${formatTime(candle.candles, tz)} ${tz || "UTC"} `,
            el("small", {}, `(sunset ${formatTime(candle.sunset, tz)}, ${loc.offsetMinutes ?? (isJerusalem(loc) ? JERUSALEM_CANDLE_OFFSET_MIN : DEFAULT_CANDLE_OFFSET_MIN)} min before; approximate, check with your community)`))
        : el("p", { class: "alef-candles" }, tr(ctx, "cal.needLocation", "Set your location in Settings to see candle-lighting times.")),
      el("h2", {}, tr(ctx, "cal.upcoming", "Coming up")),
      el("ul", { class: "alef-holidays" }, ...hols.map((h) =>
        el("li", { "data-holiday": h.id }, el("strong", {}, h.en), " ", heText(h.he), ` ${h.start}${h.end !== h.start ? " to " + h.end : ""}`,
          h.verified === "unverified" ? " (date rule unverified)" : ""))),
      el("h2", { id: "alef-prompt-h" }, slot === "morning" ? tr(ctx, "cal.morning", "Morning prompt") : tr(ctx, "cal.evening", "Evening prompt")),
      el("div", { class: "alef-prompt", role: "group", "aria-labelledby": "alef-prompt-h" },
        prompt.locked
          ? el("p", {}, tr(ctx, "cal.locked", "Unlocks after you decode this prayer in the lesson map."), ` (${prompt.unlock})`)
          : [el("p", {}, heText(prompt.he, "alef-he alef-he-large")), el("p", {}, prompt.en), el("p", { class: "alef-reflect" }, prompt.reflect),
             el("p", { class: "alef-source" }, el("small", {}, prompt.source))]));
  }
  render();
  return () => { alive = false; wrap.remove(); };
}

function isJerusalem(loc) { return Math.abs(loc.lat - 31.78) < 0.3 && Math.abs(loc.lon - 35.22) < 0.3; }
function zonedYMD(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return { y: get("year"), m: get("month"), d: get("day") };
}
